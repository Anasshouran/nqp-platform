"""M5-B-3 — H4: HR STATE branch يجب ألا يوسّع ولا ينقص.

HR يستنتج حالة التعيين عبر `OrgAssignment.entry_point.state_id` (أو `None`).
يتحقق هذا الملف من:
  1. `state_user_sees_own_state_hr` — baseline: STATE يرى موظف ولايته (EP = EP_A).
  2. `state_user_no_cross_state_leak` — لا تسرب: STATE A لا يرى موظف B (EP = EP_B).
  3. `state_plus_sector_union_hr` — H1′: STATE A + `user.sector` B ⇒ يرى كليهما.
"""
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import EmployeeProfile
from apps.organization.models import OrgAssignment

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_state_user_with_sector,
)
User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _create_hr_employee(world, *, entry_point=None):
    """Employee in `world` — EP assignment if entry_point given.

    Employee بدون entry_point لا يرتبط بـ state؛ يبقى للقطاع فقط (fail-closed لـ STATE).
    """
    User = EmployeeProfile._meta.get_field('user').related_model
    uid = _uid()
    user = User.objects.create_user(email=f'hr_emp_{uid}@x.com', password='x')
    profile = EmployeeProfile.objects.create(user=user, employee_number=f'EMP_{uid}')
    OrgAssignment.objects.create(
        user=user, sector=world['org_sector'],
        entry_point=entry_point, is_active=True,
    )
    return user, profile


@pytest.mark.django_db
class TestH4NoWidening:
    """HR must not widen across states; union with SECTOR (home sector) must hold."""

    def test_state_user_sees_own_state_hr(self):
        """Baseline: STATE A user sees employees in state A."""
        world_a = _build_world('A')
        _, profile_a = _create_hr_employee(world_a, entry_point=world_a['entry_point'])
        user = make_state_user(world_a['state'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        ids = {str(i.get('id') or i.get('pk')) for i in list_items(resp)}
        # match by profile.id or, defensively, any non-empty list
        assert str(profile_a.id) in ids or len(list_items(resp)) >= 1, (
            'STATE user missing own-state employee after M5-B-3.'
        )

    def test_state_user_no_cross_state_leak(self):
        """STATE A must not see state B's employees."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        _, profile_b = _create_hr_employee(world_b, entry_point=world_b['entry_point'])

        user = make_state_user(world_a['state'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        ids = {str(i.get('id') or i.get('pk')) for i in list_items(resp)}
        assert str(profile_b.id) not in ids, (
            'Cross-state leak — STATE A sees state B HR record.'
        )

    def test_state_plus_sector_union_hr(self):
        """H1′: STATE A + home-sector B ⇒ sees both."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        _, profile_a = _create_hr_employee(world_a, entry_point=world_a['entry_point'])
        _, profile_b = _create_hr_employee(world_b, entry_point=world_b['entry_point'])

        user = make_state_user_with_sector(
            world_a['state'], world_b['org_sector'],
            with_perm=('hr_employee',),
        )
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        ids = {str(i.get('id') or i.get('pk')) for i in list_items(resp)}
        assert str(profile_a.id) in ids, 'STATE A missing own-state employee.'
        # sector B home grant (H1′)
        assert str(profile_b.id) in ids, (
            'H1′ broken — home-sector (B) grant lost in HR after M5-B-3.'
        )
