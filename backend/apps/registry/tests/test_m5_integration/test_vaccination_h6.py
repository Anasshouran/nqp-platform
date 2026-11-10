"""M5-A-2 — P2 / H6: vaccination via `SectorScopedMixin` — works since M4-1."""
import uuid

import pytest

from apps.vaccination.models import VaccinationSite

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user,
)


@pytest.mark.django_db
class TestVaccinationH6:

    def test_state_user_sees_own_state_site(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        site = VaccinationSite.objects.create(
            name_ar='عيادة أ', kind='CLINIC', entry_point=world_a['entry_point'],
        )
        VaccinationSite.objects.create(
            name_ar='عيادة ب', kind='CLINIC', entry_point=world_b['entry_point'],
        )

        user = make_state_user(world_a['state'], with_perm=('vaccination',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vaccination/sites/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(site.id) in ids, 'STATE user missing own-state vaccination site.'

    def test_state_user_no_cross_state_site(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        site_b = VaccinationSite.objects.create(
            name_ar='عيادة ب', kind='CLINIC', entry_point=world_b['entry_point'],
        )
        user = make_state_user(world_a['state'], with_perm=('vaccination',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vaccination/sites/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(site_b.id) not in ids, 'CROSS-STATE LEAK in vaccination sites!'
