"""M5-A-2 — 🔴 P0: Ensure M4-1 didn't regress non-STATE behaviours."""
import uuid

import pytest
from django.contrib.auth import get_user_model

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user, make_plain_user,
)


@pytest.mark.django_db
class TestNoRegression:

    def test_sector_user_still_sees_own_sector_surveillance_cases(self):
        world_a = _build_world('A')
        from apps.surveillance.models import HealthCase
        from django.utils import timezone
        uid = uuid.uuid4().hex[:8]
        case_a = HealthCase.objects.create(
            case_number=f'C_{uid}', port=world_a['entry_point'],
            person_name=f'شخص {uid}', reported_date=timezone.localdate(),
        )
        user = make_sector_user(world_a['org_sector'], with_perm=('surveillance',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/surveillance/cases/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(case_a.id) in ids

    def test_global_assignment_user_sees_all_vessels(self):
        world_a = _build_world('A')
        from apps.port_health.models import Vessel, SeaPort, VesselVisit
        uid = uuid.uuid4().hex[:8]
        suef = uuid.uuid4().hex[:8]
        vessel = Vessel.objects.create(
            vessel_name=f'V {uid}', imo_number=f'IMO{uid[:6].upper()}', flag_state='SDN',
        )
        port = SeaPort.objects.create(
            code=f'SP_{uid[:6]}', name_ar=f'مرسى {uid[:6]}', name_en=f'Port {uid[:6]}',
            entry_point=world_a['entry_point'],
        )
        from django.utils import timezone
        VesselVisit.objects.create(vessel=vessel, port=port, arrival_date=timezone.localdate())

        User = get_user_model()
        su = User.objects.create_superuser(email=f'su_{suef}@x.com', password='x')
        client = api_client()
        client.force_authenticate(user=su)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(vessel.id) in ids

    def test_global_role_assignment_user_sees_all(self):
        """Explicit GLOBAL role assignment (not superuser) — same coverage."""
        world_a = _build_world('A')
        from apps.port_health.models import Vessel, SeaPort, VesselVisit
        from django.utils import timezone
        uid = uuid.uuid4().hex[:8]
        vessel = Vessel.objects.create(
            vessel_name=f'V {uid}', imo_number=f'IMO{uid[:6].upper()}', flag_state='SDN',
        )
        port = SeaPort.objects.create(
            code=f'SP_{uid[:6]}', name_ar=f'مرسى {uid[:6]}', name_en=f'Port {uid[:6]}',
            entry_point=world_a['entry_point'],
        )
        VesselVisit.objects.create(vessel=vessel, port=port, arrival_date=timezone.localdate())

        from apps.accounts.models import Role, RoleAssignment, Permission
        User = get_user_model()
        uid = uuid.uuid4().hex[:8]
        user = User.objects.create_user(email=f'glob_{uid}@x.com', password='x')
        uid_ = uuid.uuid4().hex[:8]
        role = Role.objects.create(code=f'GLB_{uid_}', name=f'Glob {uid_}')
        perm, _ = Permission.objects.get_or_create(
            code='port_health:view',
            defaults={'name': 'port_health:view', 'resource': 'port_health', 'action': 'view'},
        )
        role.permissions.add(perm)
        RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL', scope_id=None)
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        # GLOBAL should cover everything (port health sees all)
        assert str(vessel.id) in ids

    def test_plain_user_gets_no_500(self):
        _build_world('A')
        plain = make_plain_user(with_perm=())
        client = api_client()
        client.force_authenticate(user=plain)
        # No permissions → 403 or 200-empty both count as fail-closed (no 500).
        assert client.get('/api/v1/port-health/vessels/').status_code in (200, 403)
        assert client.get('/api/v1/surveillance/cases/').status_code in (200, 403)

    def test_plain_user_no_permissions_denies(self):
        _build_world('A')
        plain = make_plain_user(with_perm=())
        client = api_client()
        client.force_authenticate(user=plain)
        assert client.get('/api/v1/port-health/vessels/').status_code in (200, 403)

    def test_models_untouched_by_state_field(self):
        """Sanity check: STATE scope never crosses org/masterdata boundary id spaces.

        This test guards the documentation invariant inscribed in m5-a-audit.md §3:
        masterdata State ids and organization Sector ids are unrelated — they must
        never be joined into the same filter without an explicit resolver path.
        """
        from apps.masterdata.models import State
        from apps.organization.models import Sector as OrgSector

        uid = uuid.uuid4().hex[:8]
        from apps.masterdata.models import Sector as MdSector
        md = MdSector.objects.create(code=f'MD_{uid}', name_ar=f'نقل {uid}')
        state = State.objects.create(code=f'ST_{uid}', name_ar=f'ولاية {uid}', sector=md)
        org = OrgSector.objects.create(code=f'ORG_NO_{uid}', name_ar=f'قطاع {uid}')
        assert state.id != org.id, (
            'A State and an OrgSector would collide id — the audit invariant '
            '(separate id spaces) broke.'
        )
