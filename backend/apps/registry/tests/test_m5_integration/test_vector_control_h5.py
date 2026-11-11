"""M5-A-2 — P0 / H5: `SectorFieldScopedMixin` has no STATE branch (vector_control),
and `SectorScopedMixin` (entry_point path) DOES work — regression-proof.
"""
import uuid

import pytest

from apps.vector_control.models import VectorSite, VectorUnit, VectorTeam

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user, make_plain_user,
)


@pytest.mark.django_db
class TestVectorControlH5:

    def test_state_user_sees_own_state_vector_site(self):
        """VectorSiteViewSet uses SectorScopedMixin (entry_point path) — resolver
        works for STATE since M4-1. This must stay green."""
        world_a = _build_world('A')
        site = VectorSite.objects.create(
            name_ar='موقع أ', entry_point=world_a['entry_point'],
        )
        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/sites/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(site.id) in ids, (
            'State scope via entry_point (SectorScopedMixin) broken for vector sites — '
            'M4-1 regression.'
        )

    @pytest.mark.xfail(
        reason='D-M5-B-1: VectorUnit sector-only (no entry_point FK). '
               '`SectorFieldScopedMixin` has no derivable state for it, so STATE-only '
               'users stay denied (fail-safe). Requires M6 product/schema decision.',
        strict=True,
    )
    def test_state_user_sees_own_state_vector_unit(self):
        world_a = _build_world('A')
        unit = VectorUnit.objects.create(
            code=f'U_{uuid.uuid4().hex[:6]}', name_ar='وحدة أ', sector=world_a['org_sector'],
        )
        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/units/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(unit.id) in ids, (
            'H5 CONFIRMED — STATE user sees 0 vector units (silent deny-all).'
        )

    def test_state_user_no_cross_state_leak_vector_team(self):
        world_a = _build_world('A')
        world_c = _build_world('C')
        team_c = VectorTeam.objects.create(
            code=f'T_{uuid.uuid4().hex[:6]}', name_ar='فريق ج',
            sector=world_c['org_sector'], team_type='CONTROL',
        )
        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/teams/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(team_c.id) not in ids, (
            'CROSS-SCOPE LEAK in vector_control — STATE user sees sector C team!'
        )

    def test_plain_user_denied(self):
        world_a = _build_world('A')
        VectorTeam.objects.create(
            code=f'T_{uuid.uuid4().hex[:6]}', name_ar='فريق أ',
            sector=world_a['org_sector'], team_type='CONTROL',
        )
        plain = make_plain_user(with_perm=('vector',))
        client = api_client()
        client.force_authenticate(user=plain)
        resp = client.get('/api/v1/vector-control/teams/')
        assert resp.status_code == 200
        assert list_items(resp) == []
