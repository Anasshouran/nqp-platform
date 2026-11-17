"""M5-B-2 — H3: screening STATE branch في `_entry_point_ids_for()`.

`ScreeningViewSet._entry_point_ids_for()` سابقاً كان يقرأ PORT/POINT/STATION
ثم SECTOR fallback — ما أسقط STATE صامتاً (deny-all بلا تسرب). الآن يدمج
نطاقات STATE → كل منافذ الدخول `state_id__in` في الولاية. القطاع يبقى يخوض
عبر union (قرار H1′).
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
    # كود ثابت عبر get_or_create — راجع test_h3_no_widening.py (تصادم 1/256).
    country, _ = Country.objects.get_or_create(
        code='TST',
        defaults={'name': 'Test Country', 'name_ar': 'بلد اختبار'},
    )
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(traveler=traveler, port=ep, officer=officer)


@pytest.mark.django_db
class TestScreeningH3:

    # M5-B-2: نُزعت xfail — STATE branch أصبح فعلياً في `_entry_point_ids_for()`.
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
