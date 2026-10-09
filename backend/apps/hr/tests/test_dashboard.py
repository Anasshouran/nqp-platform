"""اختبارات المرحلة 2: لوحة الموارد البشرية والوحدات التأسيسية.

تركيز على أن **كل** رقم في اللوحة مقصوص بنطاق المستخدم:
مدير قسم لا يرى «على رأس العمل» الوطني بل عدد قسمه فقط.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.models import EmployeeTimeline, EmployeeTimelineEvent
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()

DASHBOARD_URL = '/api/v1/hr/dashboard/'
ESTABLISHMENTS_URL = '/api/v1/hr/establishments/'


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@nqp.sd', password='x',
    )


def make_profile(user, **kwargs):
    return EmployeeProfile.objects.create(
        user=user, employee_number=kwargs.pop('employee_number', f'E{uuid.uuid4().hex[:8]}'),
        **kwargs,
    )


@pytest.fixture
def sector():
    return Sector.objects.create(code='HRD', name_ar='القطاع الطبي')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='HRDD', name_ar='إدارة الموارد البشرية', sector=sector)


@pytest.fixture
def other_sector():
    return Sector.objects.create(code='VET', name_ar='القطاع البيطري')


@pytest.fixture
def other_department(other_sector):
    return Department.objects.create(code='VETD', name_ar='قسم بيطري', sector=other_sector)


@pytest.fixture
def actor():
    return make_user('hr2.actor')


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class TestHrDashboard:
    def test_requires_dashboard_permission(self, actor, department):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        assert client_for(actor).get(DASHBOARD_URL).status_code == 403

    def test_counts_are_scope_limited(self, actor, department, other_department, grant_permissions):
        """مدير قسم يرى قسمه فقط، لا القسم الآخر ولا الرقم الوطني."""
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)

        mine = make_user('hr2.mine')
        OrgAssignment.objects.create(user=mine, department=department, is_active=True)
        make_profile(mine, employment_status='ACTIVE')

        theirs = make_user('hr2.theirs')
        OrgAssignment.objects.create(user=theirs, department=other_department, is_active=True)
        make_profile(theirs, employment_status='ACTIVE')

        grant_permissions(actor, 'HRV2', ['hr_dashboard:view'],
                          scope_type='DEPARTMENT', scope_id=department.pk)
        resp = client_for(actor).get(DASHBOARD_URL)
        assert resp.status_code == 200, resp.content
        data = resp.json()['data']

        # actor + mine = 2 داخل النطاق، وليس 3 وطنياً.
        assert data['total_employees'] == 2
        assert data['active_employees'] == 2
        assert data['is_national'] is False

    def test_status_breakdown(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        for status, count in [
            (EmployeeProfile.EmploymentStatus.ACTIVE, 2),
            (EmployeeProfile.EmploymentStatus.ON_LEAVE, 1),
            (EmployeeProfile.EmploymentStatus.SUSPENDED, 1),
        ]:
            for i in range(count):
                u = make_user(f'hr2.{status.lower()}.{i}')
                OrgAssignment.objects.create(user=u, department=department, is_active=True)
                make_profile(u, employment_status=status)

        grant_permissions(actor, 'HRV2', ['hr_dashboard:view'],
                          scope_type='DEPARTMENT', scope_id=department.pk)
        data = client_for(actor).get(DASHBOARD_URL).json()['data']
        assert data['active_employees'] == 3   # actor + active×2
        assert data['on_leave'] == 1
        assert data['suspended'] == 1
        assert data['terminated'] == 0

    def test_recent_events_respect_scope(self, actor, department, other_department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)

        inside = make_user('hr2.inside')
        OrgAssignment.objects.create(user=inside, department=department, is_active=True)
        make_profile(inside, full_name_ar='داخل النطاق')

        outside = make_user('hr2.outside')
        OrgAssignment.objects.create(user=outside, department=other_department, is_active=True)
        make_profile(outside, full_name_ar='خارج النطاق')

        EmployeeTimeline.objects.create(employee=inside.profile, event=EmployeeTimelineEvent.PROMOTION)
        EmployeeTimeline.objects.create(employee=outside.profile, event=EmployeeTimelineEvent.PROMOTION)

        grant_permissions(actor, 'HRV2', ['hr_dashboard:view'],
                          scope_type='DEPARTMENT', scope_id=department.pk)
        data = client_for(actor).get(DASHBOARD_URL).json()['data']
        names = [e['employee_name'] for e in data['recent_events']]
        assert names == ['داخل النطاق']
        assert 'خارج النطاق' not in names

    def test_superuser_sees_national(self, actor, department, other_department):
        actor.is_superuser = True
        actor.save(update_fields=['is_superuser'])
        make_profile(actor)
        u = make_user('hr2.other')
        OrgAssignment.objects.create(user=u, department=other_department, is_active=True)
        make_profile(u)

        data = client_for(actor).get(DASHBOARD_URL).json()['data']
        assert data['is_national'] is True
        assert data['total_employees'] == 2

    def test_empty_scope_does_not_leak_national_counts(self, actor, department, other_department, grant_permissions):
        """نطاق لا يطابق موظفين → لا يظهر إلا صاحب النطاق نفسه.

        `resolve_own_org_scope_keys` يمنح المستخدم رؤية نفسه دائماً عبر
        تعيينه الهيكلي، فالعدد المتوقع 1 (صاحب النطاق) لا 0. المهم أنه
        لا يظهر الموظف الموجود في قسم آخر.
        """
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        u = make_user('hr2.elsewhere')
        OrgAssignment.objects.create(user=u, department=other_department, is_active=True)
        make_profile(u)

        grant_permissions(actor, 'HRV2', ['hr_dashboard:view'],
                          scope_type='DEPARTMENT', scope_id=uuid.uuid4())
        data = client_for(actor).get(DASHBOARD_URL).json()['data']
        # national total would be 2; the un-matched scope must not leak it
        assert data['total_employees'] == 1
        assert data['active_employees'] == 1


class TestHrEstablishments:
    def test_requires_permission(self, actor, department):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        assert client_for(actor).get(ESTABLISHMENTS_URL).status_code == 403

    def test_lists_only_in_scope_departments(self, actor, department, other_department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        u = make_user('hr2.peer')
        OrgAssignment.objects.create(user=u, department=other_department, is_active=True)
        make_profile(u)

        grant_permissions(actor, 'HRE2', ['hr_establishment:view'],
                          scope_type='DEPARTMENT', scope_id=department.pk)
        resp = client_for(actor).get(ESTABLISHMENTS_URL)
        assert resp.status_code == 200
        codes = {r['code'] for r in resp.json()['data']['results']}
        assert 'HRDD' in codes
        assert 'VETD' not in codes

    def test_headcount_counts_active_assignments(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        for i in range(2):
            u = make_user(f'hr2.staff{i}')
            OrgAssignment.objects.create(user=u, department=department, is_active=True)
            make_profile(u)
        # تعيين غير نشط لا يُحسب
        gone = make_user('hr2.gone')
        OrgAssignment.objects.create(user=gone, department=department, is_active=False)
        make_profile(gone)

        grant_permissions(actor, 'HRE2', ['hr_establishment:view'], scope_type='GLOBAL')
        data = client_for(actor).get(ESTABLISHMENTS_URL).json()['data']
        row = next(r for r in data['results'] if r['code'] == 'HRDD')
        assert row['headcount'] == 3  # actor + staff0 + staff1

    def test_national_sees_all(self, actor, department, other_department):
        actor.is_superuser = True
        actor.save(update_fields=['is_superuser'])
        make_profile(actor)
        u = make_user('hr2.peer')
        OrgAssignment.objects.create(user=u, department=other_department, is_active=True)
        make_profile(u)

        resp = client_for(actor).get(ESTABLISHMENTS_URL)
        assert resp.status_code == 200
        codes = {r['code'] for r in resp.json()['data']['results']}
        assert {'HRDD', 'VETD'} <= codes

    def test_is_read_only(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        grant_permissions(actor, 'HRE2W', ['hr_establishment:view', 'hr_establishment:add'],
                          scope_type='GLOBAL')
        c = client_for(actor)
        # الكتابة مرفوضة: إما 403 (لا صلاحية add) أو 405 (.READ ONLY).
        # المهم أنها لا تنجح — تعديل الوحدات يتم في وحدة `organization`.
        assert c.post(
            ESTABLISHMENTS_URL, {'code': 'X', 'name_ar': 'س'}, format='json',
        ).status_code in (403, 405)
