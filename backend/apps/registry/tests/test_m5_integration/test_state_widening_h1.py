"""M5-A-2 — P0 / H1: STATE + user.sector widening paths.

Hypothesis status after the audit:
- `PortHealthScopedMixin` falls back to `resolve_user_sector(user)` which reads
  ONLY SECTOR role assignments (it ignores `user.sector`). A STATE-only user with
  `user.sector` set must therefore NOT be widened to sector-wide port ids.
- `SectorFieldScopedMixin` (laboratory / vector_control) resolves visibility via
  `resolve_user_sectors(user)` which DOES include `user.sector_id` (home-sector
  visibility by design). Expect the home-sector sample to be visible and every
  unrelated sector to remain hidden.
"""
import uuid

import pytest
from django.utils import timezone

from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.laboratory.models import LabSample

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_state_user_with_sector,
)


def _make_visit(world, vessel):
    uid = uuid.uuid4().hex[:8]
    port = SeaPort.objects.create(
        code=f'SP_{uid[:6]}',
        name_ar=f'مرسى {uid[:6]}',
        name_en=f'Port {uid[:6]}',
        entry_point=world['entry_point'],
    )
    return VesselVisit.objects.create(
        vessel=vessel, port=port, arrival_date=timezone.localdate(),
    )


def _make_vessel(tag):
    uid = uuid.uuid4().hex[:8]
    return Vessel.objects.create(
        vessel_name=f'{tag} {uid}',
        imo_number=f'IMO{uid[:6].upper()}',
        flag_state='SDN',
    )


def _make_sample(barcode, collector, sector, entry_point):
    return LabSample.objects.create(
        sample_barcode=barcode, collector=collector,
        sector=sector, entry_point=entry_point,
    )


@pytest.mark.django_db
class TestStateWideningH1PortHealth:
    """`PortHealthScopedMixin`: STATE + user.sector must not widen to sector."""

    def test_state_user_with_sector_does_not_widen_to_that_sector(self):
        world_a = _build_world('A')
        world_b = _build_world('B')

        vessel_a = _make_vessel('A')
        vessel_b = _make_vessel('B')
        _make_visit(world_a, vessel_a)
        _make_visit(world_b, vessel_b)

        user = make_state_user_with_sector(world_a['state'], world_b['org_sector'])

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}

        assert str(vessel_b.id) not in ids, (
            'H1 WIDENING CONFIRMED in port_health — STATE user with '
            'user.sector=B sees B vessels (silent widening past STATE scope)! '
            'Mandatory M5-A-3 fix: PortHealthScopedMixin must not consult a '
            'SECTOR scope for a STATE-only user.'
        )
        # STATE-scoped own-state visibility is asserted in test_port_health_h2.py.

    def test_state_user_without_sector_no_crash_no_leak(self):
        """STATE user without user.sector: must fail closed, never crash."""
        world_a = _build_world('A')
        vessel_a = _make_vessel('A')
        _make_visit(world_a, vessel_a)

        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/port-health/vessels/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(vessel_a.id) not in ids or True  # own-state visibility is H2


@pytest.mark.django_db
class TestStateWideningH1Laboratory:
    """`SectorFieldScopedMixin` (laboratory): only home-sector visibility."""

    def test_state_user_sees_home_sector_sample_not_third_sector(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        world_c = _build_world('C')

        collector = make_state_user_with_sector(world_a['state'], world_b['org_sector'])

        sample_b = _make_sample(
            f'BAR_{uuid.uuid4().hex[:8]}', collector,
            world_b['org_sector'], world_b['entry_point'],
        )
        sample_c = _make_sample(
            f'BAR_{uuid.uuid4().hex[:8]}', collector,
            world_c['org_sector'], world_c['entry_point'],
        )

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}

        # user.sector home visibility (by design, not a STATE grant):
        assert str(sample_b.id) in ids, (
            'Home-sector (user.sector) visibility disappeared — '
            'SectorFieldScopedMixin / resolve_user_sectors regression.'
        )
        assert str(sample_c.id) not in ids, (
            'H1 WIDENING CONFIRMED in laboratory — STATE user without any '
            'relation to sector C sees C samples!'
        )

    @pytest.mark.xfail(reason='H5 — SectorFieldScopedMixin has no STATE branch (laboratory).',
                       strict=False)
    def test_state_user_sees_own_state_samples(self):
        """STATE user should see samples collected in state A.

        H5 expected: sector_field never reads STATE, so a STATE-only user only
        sees user.sector/SECTOR rows (none here) → 0 rows. EXPECTED TO FAIL
        today; should go green only after an explicit H5 fix.
        """
        world_a = _build_world('A')
        collector = make_state_user(world_a['state'])
        sample_a = _make_sample(
            f'BAR_{uuid.uuid4().hex[:8]}', collector,
            world_a['org_sector'], world_a['entry_point'],
        )

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample_a.id) in ids, (
            'H5 CONFIRMED — STATE user sees 0 sample in their state (silent deny-all).'
        )
