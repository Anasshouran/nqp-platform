"""M5-A-2 — P2 / H6: borders_health via direct `resolve_authorized_entry_points` — works since M4-1."""
import pytest

from apps.borders_health.models import BorderCrossing

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_plain_user,
)


@pytest.mark.django_db
class TestBordersHealthH6:

    def test_state_user_sees_own_state_crossing(self):
        world_a = _build_world('A')
        crossing_a = BorderCrossing.objects.create(
            entry_point=world_a['entry_point'], border_type='ROAD',
        )
        world_b = _build_world('B')
        BorderCrossing.objects.create(entry_point=world_b['entry_point'], border_type='ROAD')

        user = make_state_user(world_a['state'], with_perm=('borders_health',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/borders-health/crossings/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(crossing_a.id) in ids, 'STATE user missing own border crossing.'

    def test_state_user_no_cross_state_crossing(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        crossing_b = BorderCrossing.objects.create(
            entry_point=world_b['entry_point'], border_type='ROAD',
        )
        user = make_state_user(world_a['state'], with_perm=('borders_health',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/borders-health/crossings/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(crossing_b.id) not in ids, 'CROSS-STATE LEAK in borders_health!'

    def test_plain_user_cannot_see_crossings(self):
        world_a = _build_world('A')
        BorderCrossing.objects.create(
            entry_point=world_a['entry_point'], border_type='ROAD',
        )
        plain = make_plain_user(with_perm=('borders_health',))
        client = api_client()
        client.force_authenticate(user=plain)
        resp = client.get('/api/v1/borders-health/crossings/')
        assert resp.status_code == 200
        assert list_items(resp) == []
