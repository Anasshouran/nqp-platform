"""M5-B-1 — H5: `SectorFieldScopedMixin` STATE branch عبر `state_path`.

Target: laboratory viewsets (LabSampleViewSet / SampleTestViewSet). `qs.filter(...)`
يمزج الآن `sector__in` (قرار H1′) مع `state_path__in` المطلق عندما يضبط الـ viewset
`state_path` صراحةً. STATE-only user يرى العينات المرتبطة بـ EntryPoint في ولايته.
"""
import uuid

import pytest

from apps.laboratory.models import LabSample

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user,
)


def _sample(barcode, collector, sector, entry_point):
    return LabSample.objects.create(
        sample_barcode=barcode, collector=collector,
        sector=sector, entry_point=entry_point,
    )


@pytest.mark.django_db
class TestLaboratoryH5:

    # M5-B-1: نُزعت xfail — SectorFieldScopedMixin حصلت على STATE branch
    # عبر `state_path` (entry_point__state_id) — الولاية مرئية الآن.
    def test_state_user_sees_own_state_samples(self):
        """STATE user should see samples collected in their state."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        collector = make_state_user(world_a['state'])
        sample_a = _sample(f'BAR_{uuid.uuid4().hex[:8]}', collector,
                          world_a['org_sector'], world_a['entry_point'])

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample_a.id) in ids, (
            'H5 CONFIRMED — STATE user sees 0 sample in their state '
            '(silent deny-all in laboratory SectorFieldScopedMixin).'
        )

    def test_state_user_no_cross_state_leak(self):
        """Safety assertion: STATE A never sees sector C data (pre and post fix)."""
        world_a = _build_world('A')
        world_c = _build_world('C')

        collector = make_state_user(world_a['state'])
        _sample(f'BAR_{uuid.uuid4().hex[:8]}', collector,
                world_c['org_sector'], world_c['entry_point'])

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert all(str(s.id) not in ids
                   for s in LabSample.objects.filter(sector=world_c['org_sector'])), (
            'CROSS-SCOPE LEAK in laboratory — STATE user sees sector C sample!'
        )

    def test_sector_user_still_sees_own_sector_samples(self):
        """SECTOR regression — SectorFieldScopedMixin must keep working."""
        world_a = _build_world('A')
        collector = make_sector_user(world_a['org_sector'], with_perm=('laboratory',))
        sample_a = _sample(f'BAR_{uuid.uuid4().hex[:8]}', collector,
                           world_a['org_sector'], world_a['entry_point'])

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample_a.id) in ids, (
            'SECTOR regression in laboratory — SECTOR user no longer sees own-sector sample.'
        )

    def test_plain_user_is_denied(self):
        """Fail-closed: no scope at all → deny-all, never 500."""
        world_a = _build_world('A')
        from .conftest import make_plain_user
        plain = make_plain_user(with_perm=('laboratory',))
        collector = make_state_user(world_a['state'])
        _sample(f'BAR_{uuid.uuid4().hex[:8]}', collector,
                world_a['org_sector'], world_a['entry_point'])

        client = api_client()
        client.force_authenticate(user=plain)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'Fail-safe broken in laboratory — plain user saw rows!'
        )
