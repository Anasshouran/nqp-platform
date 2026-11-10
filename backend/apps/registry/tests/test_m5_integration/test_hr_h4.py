"""M5-B-3 — H4: HR SCOPE_LOOKUPS STATE (derive via OrgAssignment.entry_point).

`SCOPE_LOOKUPS` في `apps/hr/scoping.py` كان يعرف SECTOR/REGION/DEPARTMENT/STATION/
POINT/PORT فقط — ولاية `masterdata.State` لا تطابق أي مسار، فكان STATE-only HR user
يُحجب صامتاً. M5-B-3 أضاف `'STATE': ('entry_point__state_id',)` ووسّع
`resolve_own_org_scope_keys` تُصدر `('STATE', state_id)` لكل
`OrgAssignment` نشط يحمل `entry_point.state`. القطاع المنزلي `user.sector_id`
أيضاً يُدمج بالبقية (H1′).

الموظف يُعدّ "في ولايته" عبر `OrgAssignment.entry_point.state_id = <state>`.
التعيين بنطاق قطاع فقط لا يربط state — وهذا سلوك مقصود (state path = EP فقط).
"""
import uuid

import pytest

from apps.accounts.models import EmployeeProfile
from apps.organization.models import OrgAssignment

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user, make_plain_user,
)


def _employee(email_prefix, world, assign=True, entry_point=None):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    uid = uuid.uuid4().hex[:8]
    euser = User.objects.create_user(email=f'{email_prefix}_{uid}@x.com', password='x')
    profile = EmployeeProfile.objects.create(user=euser, employee_number=f'EMP_{uid}')
    if assign:
        OrgAssignment.objects.create(user=euser, sector=world['org_sector'],
                                      entry_point=entry_point, is_active=True)
    return euser, profile


@pytest.mark.django_db
class TestHrH4:

    # M5-B-3: نُزعت xfail — SCOPE_LOOKUPS يحوي STATE الآن مشتقاً عبر
    # `OrgAssignment.entry_point.state_id`؛ التعيين يتطلب entry_point لا sector فقط.
    def test_state_user_sees_employees_in_state_org(self):
        """STATE user should see employees under org assignments in their state."""
        world_a = _build_world('A')
        _employee('emp', world_a, entry_point=world_a['entry_point'])

        user = make_state_user(world_a['state'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert len(list_items(resp)) >= 1, (
            'H4 CONFIRMED — STATE user sees 0 employees under their state (silent deny-all).'
        )

    def test_state_user_fails_closed_no_leak(self):
        """No crash, no leak — never 500. Empty list is the current (accepted) behaviour."""
        world_a = _build_world('A')
        _employee('emp', world_a)

        user = make_state_user(world_a['state'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert list_items(resp) == []

    def test_sector_user_sees_employee_in_sector(self):
        world_a = _build_world('A')
        euser, profile = _employee('emp', world_a)

        user = make_sector_user(world_a['org_sector'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(profile.id) in ids, (
            'SECTOR regression in hr — SECTOR user no longer sees employees in own sector.'
        )

    def test_plain_user_denied(self):
        world_a = _build_world('A')
        _employee('emp', world_a)

        plain = make_plain_user(with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=plain)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert list_items(resp) == []
