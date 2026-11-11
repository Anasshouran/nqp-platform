"""M5-B-1 — H5: `SectorFieldScopedMixin` STATE branch يجب ألا يوسّع ولا ينقص.

LabSample هو النموذج المرجعي لاستيفاء `entry_point` FK المباشر. يتحقق هذا الملف من:
  1. `state_user_sees_own_state_samples` — baseline (STATE يرى عينته).
  2. `state_user_no_cross_state_leak` — حقلية (لا تسرب عبر الولايات).
  3. `state_plus_sector_union` — H1′ محفوظ: STATE A + sector B ⇒ يرى كلتيهما.
  4. `sector_only_viewset_deny_state` — D-M5-B-1: LabEquipment (sector-only)
     تبقى محجوبة عن STATE-only user (فشل آمن).
"""
import uuid

import pytest

from apps.laboratory.models import LabEquipment, LabSample

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_state_user_with_sector,
)


def _uid():
    return uuid.uuid4().hex[:8]


def _sample(world, collector):
    return LabSample.objects.create(
        sample_barcode=f'BAR_{_uid()}',
        collector=collector,
        sector=world['org_sector'],
        entry_point=world['entry_point'],
    )


def _ids(resp):
    return {str(i['id']) for i in list_items(resp)}


@pytest.mark.django_db
class TestH5NoWidening:
    """STATE branch must not widen; union with SECTOR grant (H1′) must hold."""

    def test_state_user_sees_own_state_samples(self):
        """Baseline: STATE A user receives 200 and sees a sample from state A."""
        world_a = _build_world('A')
        user = make_state_user(world_a['state'], with_perm=('laboratory',))
        sample_a = _sample(world_a, user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        assert str(sample_a.id) in _ids(resp), (
            'STATE user cannot see own-state LabSample after M5-B-1 fix.'
        )

    def test_state_user_no_cross_state_leak(self):
        """STATE A must never see state B's LabSample."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        collector_b = make_state_user(world_b['state'], with_perm=('laboratory',))
        sample_b = _sample(world_b, collector_b)

        user = make_state_user(world_a['state'], with_perm=('laboratory',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        assert str(sample_b.id) not in _ids(resp), (
            'Cross-state leak — STATE A sees state B LabSample.'
        )

    def test_state_plus_sector_union(self):
        """H1′: STATE A + user.sector = B ⇒ يرى عينتي A وB سوياً."""
        world_a = _build_world('A')
        world_b = _build_world('B')

        collector = make_state_user(world_a['state'], with_perm=('laboratory',))
        sample_a = _sample(world_a, collector)

        sector_b_user = make_state_user(world_b['state'], with_perm=('laboratory',))
        sample_b = _sample(world_b, sector_b_user)

        user = make_state_user_with_sector(
            world_a['state'], world_b['org_sector'],
            with_perm=('laboratory', 'vector'),
        )
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = _ids(resp)
        assert str(sample_a.id) in ids, (
            'STATE A missing own sample (STATE branch regressed).'
        )
        assert str(sample_b.id) in ids, (
            'H1′ broken — sector (B) grant lost after STATE branch landed.'
        )

    def test_sector_only_viewset_deny_state(self):
        """D-M5-B-1: STATE-only user gets `[]` from LabEquipment (sector-only)."""
        world_a = _build_world('A')
        equip = LabEquipment.objects.create(
            name_ar=f'جهاز {_uid()}', sector=world_a['org_sector'],
        )

        user = make_state_user(world_a['state'], with_perm=('laboratory',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/equipment/')
        assert resp.status_code == 200
        items = list_items(resp)
        assert list(items) == [], (
            'D-M5-B-1 violated — sector-only viewset exposed STATE-only user; '
            'SectorFieldScopedMixin noticed a widening.'
        )
        # Ensure the equipment really exists (denial is explicable, not empty DB).
        assert LabEquipment.objects.filter(pk=equip.pk).exists()
