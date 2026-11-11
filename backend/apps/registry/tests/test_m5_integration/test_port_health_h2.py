"""M5-A-2 — P0 / H2: `asserts_geographic_scope` omits STATE → qs.none().

Target: `CompanyPortScopedMixin` (port_health). The root cause is in
`core/utils/scoping.py: asserts_geographic_scope()` which lists
SECTOR, REGION, POINT, PORT, DEPARTMENT, STATION but NOT STATE. A STATE-only
user reports no port scope and no company scope → `qs.none()`.

The H2 business expectation (own-state data visible) is the red test;
it goes green only after FIX-1 (asserts_geographic_scope += STATE).
"""
import uuid

import pytest
from django.utils import timezone

from apps.port_health.models import SeaPort, Vessel, VesselVisit

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user,
)


def _vessel_with_visit(tag, world):
    uid = uuid.uuid4().hex[:8]
    vessel = Vessel.objects.create(
        vessel_name=f'{tag} {uid}', imo_number=f'IMO{uid[:6].upper()}', flag_state='SDN',
    )
    port = SeaPort.objects.create(
        code=f'SP_{uid[:6]}', name_ar=f'مرسى {uid[:6]}', name_en=f'Port {uid[:6]}',
        entry_point=world['entry_point'],
    )
    VesselVisit.objects.create(vessel=vessel, port=port, arrival_date=timezone.localdate())
    return vessel


@pytest.mark.django_db
class TestPortHealthH2:
    """H2 empirical checks — STATE in CompanyPortScopedMixin (port_health)."""

    def test_state_user_sees_own_state_vessels(self):
        """STATE user should see vessels bound to their entry points."""
        world_a = _build_world('A')
        vessel_a = _vessel_with_visit('A', world_a)

        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(vessel_a.id) in ids, (
            'H2 CONFIRMED — STATE user sees 0 vessels (asserts_geographic_scope omits STATE).'
        )

    def test_state_user_no_cross_state_leak(self):
        """Safety assertion: STATE A never sees STATE B rows — holds pre and post fix."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        vessel_b = _vessel_with_visit('B', world_b)

        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(vessel_b.id) not in ids, (
            'CROSS-STATE LEAK in port_health — STATE A user sees STATE B vessel!'
        )

    def test_superuser_sees_all_vessels(self):
        """Superuser path unaffected by scope changes."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        _vessel_with_visit('A', world_a)
        _vessel_with_visit('B', world_b)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        su = User.objects.create_superuser(email=f'su_{uuid.uuid4().hex[:6]}@x.com', password='x')

        client = api_client()
        client.force_authenticate(user=su)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        assert len(list_items(resp)) >= 2

    def test_sector_user_still_sees_own_sector_vessels(self):
        """SECTOR scope in CompanyPortScopedMixin must keep working (regression)."""
        world_a = _build_world('A')
        vessel_a = _vessel_with_visit('A', world_a)

        user = make_sector_user(world_a['org_sector'], with_perm=('port_health',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(vessel_a.id) in ids, (
            'SECTOR regression in port_health CompanyPortScopedMixin — '
            'SECTOR user no longer sees own-sector vessel.'
        )
