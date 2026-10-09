"""اختبارات صلاحيات وأدوار وحدة الموارد البشرية (المرحلة 0).

تتحقق من:
  - وجود كل موارد HR وصلاحياتها في مراجع البذر (لا صلاحيات يتيمة).
  - فصل المهام: المُدخل لا يعتمد، والمعتمد لا يُدخل.
  - أن نقطة `hr:ping` محمية بصلاحية `hr_dashboard:view` وتُرجع النطاق.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.management.commands.seed_rbac import (
    ACTIONS,
    EXTRA_ACTIONS,
    RESOURCES,
    ROLES,
    resolve_permission_codes,
)

pytestmark = pytest.mark.django_db

User = get_user_model()

HR_RESOURCES = [
    'hr_employee', 'hr_establishment', 'hr_posting', 'hr_attendance',
    'hr_leave', 'hr_training', 'hr_performance', 'hr_payroll',
    'hr_document', 'hr_dashboard',
]

APPROVAL_CODES = {
    'hr_employee:approve', 'hr_establishment:approve', 'hr_posting:approve',
    'hr_posting:reject', 'hr_attendance:approve', 'hr_leave:approve',
    'hr_leave:reject', 'hr_training:approve', 'hr_performance:approve',
    'hr_document:approve', 'hr_payroll:approve', 'hr_payroll:pay',
}


def role_def(code):
    return next(r for r in ROLES if r['code'] == code)


def granted_codes(code):
    return set(resolve_permission_codes(role_def(code)['resources']))


class TestResourceDefinitions:
    def test_all_hr_resources_declared(self):
        for resource in HR_RESOURCES:
            assert resource in RESOURCES, f'{resource} غير معرّف في RESOURCES'

    def test_special_actions_declared(self):
        assert EXTRA_ACTIONS['hr_posting']['approve']
        assert EXTRA_ACTIONS['hr_payroll']['run']
        assert EXTRA_ACTIONS['hr_payroll']['pay']
        assert EXTRA_ACTIONS['hr_posting']['reject']

    def test_every_crud_resource_has_crud_for_manager(self):
        """كل مورد أعمال يملك CRUD كاملاً؛ `hr_dashboard` قراءة/تصدير فقط."""
        codes = granted_codes('HR_MANAGER')
        for resource in HR_RESOURCES:
            if resource == 'hr_dashboard':
                assert f'{resource}:add' not in codes
                continue
            for action in ACTIONS:
                assert f'{resource}:{action}' in codes, f'{resource}:{action} مفقود من HR_MANAGER'


class TestSeparationOfDuties:
    def test_manager_has_no_approval(self):
        assert not (granted_codes('HR_MANAGER') & APPROVAL_CODES)

    def test_manager_can_run_payroll_but_not_pay(self):
        codes = granted_codes('HR_MANAGER')
        assert 'hr_payroll:run' in codes
        assert 'hr_payroll:approve' not in codes
        assert 'hr_payroll:pay' not in codes

    def test_specialist_has_no_approval_and_no_delete(self):
        codes = granted_codes('HR_SPECIALIST')
        assert not (codes & APPROVAL_CODES)
        assert 'hr_employee:delete' not in codes
        assert 'hr_employee:add' in codes

    def test_approver_approves_but_never_edits(self):
        codes = granted_codes('HR_APPROVER')
        assert 'hr_payroll:approve' in codes
        assert 'hr_payroll:pay' in codes
        assert 'hr_posting:approve' in codes
        for resource in HR_RESOURCES:
            assert f'{resource}:add' not in codes
            assert f'{resource}:edit' not in codes

    def test_approver_covers_full_approval_matrix(self):
        assert APPROVAL_CODES <= granted_codes('HR_APPROVER')


class TestSeedCommand:
    def test_seed_hr_rbac_is_idempotent(self, db):
        call_command('seed_hr_rbac')
        call_command('seed_hr_rbac')

        from apps.accounts.models import Role

        for code in ('HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER'):
            assert Role.objects.filter(code=code).exists()

    def test_seeded_roles_pass_sod_checks(self, db):
        call_command('seed_hr_rbac')
        from apps.accounts.models import Role

        manager = set(
            Role.objects.get(code='HR_MANAGER').permissions.values_list('code', flat=True)
        )
        approver = set(
            Role.objects.get(code='HR_APPROVER').permissions.values_list('code', flat=True)
        )
        assert not (manager & APPROVAL_CODES)
        assert 'hr_payroll:run' in manager
        assert APPROVAL_CODES <= approver


class TestPingEndpoint:
    URL = '/api/v1/hr/ping/'

    def test_requires_authentication(self):
        assert APIClient().get(self.URL).status_code in (401, 403)

    def test_denied_without_permission(self, grant_permissions):
        user = User.objects.create_user(username='u1', email='u1@nqp.sd', password='x')
        grant_permissions(user, 'NO_HR', ['reports:view'])
        client = APIClient()
        client.force_authenticate(user)
        assert client.get(self.URL).status_code == 403

    def test_allowed_with_dashboard_view(self, grant_permissions):
        user = User.objects.create_user(username='u2', email='u2@nqp.sd', password='x')
        grant_permissions(
            user, 'HR_VIEW', ['hr_dashboard:view'],
            scope_type='DEPARTMENT', scope_id=uuid.uuid4(),
        )
        client = APIClient()
        client.force_authenticate(user)
        resp = client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['status'] == 'success'
        assert resp.data['data']['module'] == 'hr'
        assert resp.data['data']['national_scope'] is False
        assert resp.data['data']['scope_count'] == 1

    def test_global_scope_counts_as_national(self, grant_permissions):
        user = User.objects.create_user(username='u3', email='u3@nqp.sd', password='x')
        grant_permissions(user, 'HR_VIEW_G', ['hr_dashboard:view'], scope_type='GLOBAL')
        client = APIClient()
        client.force_authenticate(user)
        resp = client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['data']['national_scope'] is True
        assert resp.data['data']['visible_employee_count'] is None

    def test_superuser_reports_national(self):
        user = User.objects.create_user(
            username='su', email='su@nqp.sd', password='x', is_superuser=True,
        )
        client = APIClient()
        client.force_authenticate(user)
        resp = client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['data']['national_scope'] is True
        assert resp.data['data']['visible_employee_count'] is None
