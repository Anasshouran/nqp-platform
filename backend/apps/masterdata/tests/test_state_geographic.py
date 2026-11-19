"""اختبارات masterdata.State.geographic_state (Model B).

تغطي خمس حالات:
1. الحقل nullable — ولاية بلا ربط جغرافي.
2. الـFK + العلاقة العكسية (masterdata_states).
3. حذف GeographicState → SET_NULL (لا حذف للولاية).
4. باكفيل B-1: كل أكواد الولاية العشرة تُربط بالكود الجغرافي الصحيح.
5. سياسة الباكفيل: غياب كود جغرافي → RuntimeError، وغياب صف State → no-op صامت.

المصدر: Migration 0010_backfill_state_geographic_state (MAP + forwards).
"""
import importlib

import pytest
from django.apps import apps as django_apps

from apps.masterdata.models import Sector, State
from apps.organization.models import GeographicState
from apps.organization.management.commands.seed_geographic_states import STATES

pytestmark = pytest.mark.django_db

backfill = importlib.import_module(
    'apps.masterdata.migrations.0010_backfill_state_geographic_state'
)


@pytest.fixture
def sector(db):
    return Sector.objects.create(code='SEC_GEO_TEST', name_ar='قطاع اختبار جغرافي')


def seed_geo_rows():
    """يضمن وجود الصفوف الكانونية (0013) بغض النظر عن حالة test DB."""
    for code, name_ar, name_en, order in STATES:
        GeographicState.objects.get_or_create(
            code=code,
            defaults={'name_ar': name_ar, 'name_en': name_en, 'order': order, 'is_active': True},
        )


@pytest.fixture
def seed_geo(db):
    seed_geo_rows()


@pytest.fixture
def geo_kh(seed_geo):
    return GeographicState.objects.get(code='SD-KH')


def make_state(code, sector, geographic_state=None):
    return State.objects.create(
        code=code,
        name_ar=f'ولاية {code}',
        sector=sector,
        geographic_state=geographic_state,
    )


def test_state_geographic_state_is_nullable(sector):
    """1) ولاية جديدة بدون ربط جغرافي — الحقل فارغ (nullable)."""
    state = make_state('MD_GEO_NULL', sector)
    assert state.geographic_state is None
    assert state.geographic_state_id is None


def test_state_geographic_state_fk_and_reverse(sector, geo_kh):
    """2) الربط يعمل من الولاية ومن الجهة المعاكسة (related_name)."""
    state = make_state('MD_GEO_LINK', sector, geographic_state=geo_kh)
    assert state.geographic_state == geo_kh
    assert geo_kh.masterdata_states.filter(pk=state.pk).exists()


def test_deleting_geographic_state_sets_null(sector, geo_kh):
    """3) حذف الولاية الجغرافية → SET_NULL مع بقاء صف masterdata.State."""
    state = make_state('MD_GEO_SETNULL', sector, geographic_state=geo_kh)
    geo_kh.delete()
    state.refresh_from_db()
    assert state.geographic_state is None
    assert State.objects.filter(pk=state.pk).exists()


def test_b1_backfill_maps_all_ten_codes(sector, seed_geo):
    """4) باكفيل B-1 يربط العشرة أكواد بالأكواد الجغرافية الصحيحة."""
    for code in backfill.MAP:
        State.objects.get_or_create(
            code=code, defaults={'name_ar': f'ولاية {code}', 'sector': sector}
        )
    backfill.forwards(django_apps, None)
    for code, geo_code in backfill.MAP.items():
        state = State.objects.get(code=code)
        assert state.geographic_state is not None
        assert state.geographic_state.code == geo_code


def test_backfill_policy_fail_loud_and_silent_noop(sector, seed_geo):
    """5) غياب كود جغرافي → RuntimeError؛ غياب صف State → no-op صامت."""
    # غياب كود جغرافي: نحذف كل الصفوف ثم نتوقع فشلاً صريحاً.
    GeographicState.objects.all().delete()
    with pytest.raises(RuntimeError, match='غير موجود'):
        backfill.forwards(django_apps, None)

    # غياب صف State: لا استثناء، ولا أثر.
    seed_geo_rows()
    State.objects.filter(code='ST_KRT').delete()
    backfill.forwards(django_apps, None)  # لا يرفع
    assert not State.objects.filter(
        code='ST_KRT', geographic_state__isnull=False
    ).exists()
