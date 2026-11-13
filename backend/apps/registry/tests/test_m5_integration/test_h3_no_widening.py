"""M5-B-2 — H3: screening STATE branch يجب ألا يوسّع ولا ينقص.

H3 (الحالة الأولى): STATE-only user لا يرى بيانات الفحص في ولايته (deny-all) —
بعد M5-B-2 يجب أن يراها. الحارس المقابلة يضمن:
  1. `state_user_sees_own_state_screening` — baseline.
  2. `state_user_no_cross_state_leak` — لا تسرب عبر الولايات.
  3. `state_plus_sector_union` — H1′ محافَظ: STATE A + sector B ⇒ يرى كلتيهما.
"""
import uuid

import pytest
from django.utils import timezone

from apps.travelers.models import Country, Traveler
from apps.screening.models import HealthScreening

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_state_user_with_sector,
)


def _screening(world, officer):
    uid = uuid.uuid4().hex[:8]
    # كود ثابت عبر get_or_create: `f'S{uid[:2]}'` كان يوفّر 256 قيمة فقط،
    # والاختبارات التي تنشئ دولتين (world A + world B) كانت تتصادم 1/256.
    country, _ = Country.objects.get_or_create(
        code='TST',
        defaults={'name': 'Test Country', 'name_ar': 'بلد اختبار'},
    )
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(traveler=traveler, port=world['entry_point'],
                                          officer=officer)


@pytest.mark.django_db
class TestH3NoWidening:
    """STATE branch must not widen; union with SECTOR grant (H1′) must hold."""

    def test_state_user_sees_own_state_screening(self):
        """Baseline: STATE A user sees screenings in state A (was deny-all)."""
        world_a = _build_world('A')
        user = make_state_user(world_a['state'], with_perm=('screening',))
        screening_a = _screening(world_a, user)
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(screening_a.id) in ids, (
            'STATE user missing own screening after M5-B-2.'
        )

    def test_state_user_no_cross_state_leak(self):
        """STATE A must not see state B's screenings."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        other = make_state_user(world_b['state'], with_perm=('screening',))
        _screening(world_b, other)

        user = make_state_user(world_a['state'], with_perm=('screening',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'CROSS-SCOPE LEAK in screening — STATE A sees STATE B screening.'
        )

    def test_state_plus_sector_union(self):
        """H1′: STATE A + sector B → sees screening at B as well."""
        world_a = _build_world('A')
        world_b = _build_world('B')

        user_a_holder = make_state_user(world_a['state'], with_perm=('screening',))
        screening_a = _screening(world_a, user_a_holder)
        user_b_holder = make_state_user(world_b['state'], with_perm=('screening',))
        screening_b = _screening(world_b, user_b_holder)

        user = make_state_user_with_sector(
            world_a['state'], world_b['org_sector'],
            with_perm=('screening',),
        )
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(screening_a.id) in ids, 'STATE A missing own screening.'
        assert str(screening_b.id) in ids, (
            'H1′ broken — sector (B) grant lost in screening after STATE branch.'
        )
