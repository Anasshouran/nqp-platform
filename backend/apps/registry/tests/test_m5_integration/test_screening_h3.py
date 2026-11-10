"""M5-A-2 — P1 / H3: custom scope parse in screening has no STATE branch.

`ScreeningViewSet._entry_point_ids_for()` manually parses active scopes with
`_ENTRY_POINT_SCOPE_TYPES = {POINT, PORT, STATION}` plus a SECTOR fallback —
STATE matches neither → silent deny-all (no leak, no functional data).
"""
import uuid

import pytest
from django.utils import timezone

from apps.travelers.models import Country, Traveler
from apps.screening.models import HealthScreening

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user,
)


def _screening(ep, officer):
    uid = uuid.uuid4().hex[:8]
    country = Country.objects.create(code=f'S{uid[:2]}'[:3], name=f'بلد {uid[:6]}',
                                     name_ar=f'بلد {uid[:6]}')
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(traveler=traveler, port=ep, officer=officer)


@pytest.mark.django_db
class TestScreeningH3:

    @pytest.mark.xfail(reason='H3 — custom scope parse has no STATE branch (screening).',
                       strict=False)
    def test_state_user_sees_own_state_screenings(self):
        world_a = _build_world('A')
        user = make_state_user(world_a['state'])
        _screening(world_a['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert len(list_items(resp)) >= 1, (
            'H3 CONFIRMED — STATE user sees 0 screenings in their state (silent deny-all).'
        )

    def test_state_user_no_cross_state_leak(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        other = make_state_user(world_b['state'])
        _screening(world_b['entry_point'], other)

        user = make_state_user(world_a['state'])
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'CROSS-SCOPE LEAK in screening — STATE A user sees STATE B screening!'
        )
