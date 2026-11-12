"""M5-A-2 — P2 / H6: surveillance via `resolve_user_port_ids` — works since M4-1.

These MUST remain green. If they ever fail, M4-1 regressed silently.
"""
import uuid

import pytest
from django.utils import timezone

from apps.surveillance.models import HealthCase

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user, make_plain_user,
)


def _case(ep, tag):
    uid = uuid.uuid4().hex[:8]
    return HealthCase.objects.create(
        case_number=f'C_{tag}_{uid}',
        port=ep,
        person_name=f'شخص {uid}',
        reported_date=timezone.localdate(),
    )


@pytest.mark.django_db
class TestSurveillanceH6:

    def test_state_user_sees_own_state_case(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        case_a = _case(world_a['entry_point'], 'A')
        _case(world_b['entry_point'], 'B')

        user = make_state_user(world_a['state'], with_perm=('surveillance',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/surveillance/cases/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(case_a.id) in ids, 'STATE user missing own-state case (surveillance).'

    def test_state_user_no_cross_state_case(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        case_b = _case(world_b['entry_point'], 'B')

        user = make_state_user(world_a['state'], with_perm=('surveillance',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/surveillance/cases/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(case_b.id) not in ids, 'CROSS-STATE LEAK in surveillance!'

    def test_sector_user_still_sees_own_sector_case(self):
        world_a = _build_world('A')
        case_a = _case(world_a['entry_point'], 'A')
        user = make_sector_user(world_a['org_sector'], with_perm=('surveillance',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/surveillance/cases/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(case_a.id) in ids

    def test_plain_user_sees_nothing(self):
        world_a = _build_world('A')
        _case(world_a['entry_point'], 'A')
        plain = make_plain_user(with_perm=('surveillance',))
        client = api_client()
        client.force_authenticate(user=plain)
        resp = client.get('/api/v1/surveillance/cases/')
        assert resp.status_code == 200
        assert list_items(resp) == []
