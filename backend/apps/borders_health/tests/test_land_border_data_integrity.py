"""اختبارات سلامة بيانات المعابر البرية — Phase 1.

تغطي السجل المرجعي للمعابر البرية دون تغيير سلوكه:
- انفصال نطاقَي `EntryPoint.state` (masterdata.State) عن `EntryPoint.sector` (organization.Sector).
- ثبات نسبة قطاع الأبيض (EL_OBEID) كقطاع دعم للمعابر الغربية.
- الأسماء الإنجليزية المعتمدة فقط، وترك غير المحسوم فارغاً.
- السلل الحدودية العامة غير المسمّاة، والتعارضات المرجعية غير المحسومة.

لا تُعدّل أي بيانات ولا تفترض قيمة غير موثّقة في المستودع.
"""
import pathlib

import pytest
from django.core.management import call_command

from apps.borders_health.management.commands.seed_borders_health import BORDER_PROFILE
from apps.borders_health.models import BorderCrossing, BorderFacility
from apps.masterdata.models import EntryPoint
from apps.masterdata.models import Sector as TransportSector
from apps.masterdata.models import State
from apps.organization.models import Sector as OrgSector

pytestmark = pytest.mark.django_db

REPO_ROOT = pathlib.Path(__file__).resolve().parents[4]
LAND_BORDER_DOC = REPO_ROOT / 'docs' / '04_Modules' / '20_Land_Border_Health_System' / '03_Border_Health_Command.md'
SEED_MASTERDATA_SRC = REPO_ROOT / 'backend' / 'apps' / 'masterdata' / 'management' / 'commands' / 'seed_masterdata.py'

# المصفوفة المرجعية: (رمز الولاية masterdata.State، رمز القطاع الإداري organization.Sector)
LAND_BORDER_REGISTRY = {
    'EP_ARGIN': ('MD_NORTHERN', 'NORTHERN'),
    'EP_WADI_HALFA': ('MD_NORTHERN', 'NORTHERN'),
    'EP_MUTHALLATH': ('MD_NORTHERN', 'NORTHERN'),
    'EP_ERITREA_BORDER': ('MD_KASSALA', 'KASSALA'),
    'EP_GALLABAT': ('MD_GEDAREF', 'GEDAREF'),
    'EP_SOUTH_SUDAN_BORDER': ('MD_BLUE_NILE', 'EL_OBEID'),
    'EP_ADRE': ('MD_W_DARFUR', 'EL_OBEID'),
    'EP_TINE': ('MD_W_DARFUR', 'EL_OBEID'),
    'EP_OSEIF': ('MD_RED_SEA_LAND', 'RED_SEA'),
    'EP_GABAIT': ('MD_RED_SEA_LAND', 'RED_SEA'),
    'EP_ASHKEIT': ('MD_N_DARFUR', 'EL_OBEID'),
    'EP_ALAFIA': ('MD_N_DARFUR', 'EL_OBEID'),
}

# قطاع الأبيض قطاع دعم مُقصود للمعابر الغربية (انظر وصف القطاع في seed_organization).
EL_OBEID_SUPPORTED_CROSSINGS = (
    'EP_SOUTH_SUDAN_BORDER',
    'EP_ADRE',
    'EP_TINE',
    'EP_ASHKEIT',
    'EP_ALAFIA',
)

# سلال حدودية عامة لم تُسمَّ بعد — ليست نقاط دخول تشغيلية مسمّاة.
GENERIC_REGISTRY_BUCKETS = {
    'EP_ERITREA_BORDER': 'إريتريا',
    'EP_SOUTH_SUDAN_BORDER': 'جنوب السودان',
}

APPROVED_NAME_EN = {
    'EP_ARGIN': 'Argin',
    'EP_WADI_HALFA': 'Wadi Halfa',
    'EP_GALLABAT': 'Gallabat',
    'EP_ADRE': 'Adre',
    'EP_TINE': 'Tine',
    'EP_OSEIF': 'Oseif',
    'EP_GABAIT': 'Gabait',
    'EP_ASHKEIT': 'Ashkeit',
    'EP_ALAFIA': 'Alafia',
}

# أسماء لا يدعمها المستودع بدليل كافٍ — تُترك فارغة بدل الاختلاق.
INTENTIONALLY_BLANK_NAME_EN = (
    'EP_MUTHALLATH',
    'EP_ERITREA_BORDER',
    'EP_SOUTH_SUDAN_BORDER',
)


@pytest.fixture
def seeded_land_registry():
    """السجل المرجعي الكامل: الهيكل الإداري ← البيانات الأساسية ← ملفات المعابر."""
    call_command('seed_organization', verbosity=0)
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_borders_health', verbosity=0)
    return EntryPoint.objects.filter(kind=EntryPoint.Kind.LAND_PORT)


# ---------------------------------------------------------------------------
# 1) نطاقان لا يتبادلان: الولاية الجغرافية ≠ القطاع الإداري
# ---------------------------------------------------------------------------


def test_state_and_sector_fks_point_to_distinct_models():
    assert EntryPoint._meta.get_field('state').related_model is State
    assert EntryPoint._meta.get_field('sector').related_model is OrgSector
    assert EntryPoint._meta.get_field('state').related_model is not EntryPoint._meta.get_field('sector').related_model


def test_state_sector_is_transport_sector_not_org_sector():
    """`State.sector` يقود قطاع النقل (بحري/بري/جوي)، لا القطاع الإداري."""
    assert State._meta.get_field('sector').related_model is TransportSector
    assert TransportSector is not OrgSector


def test_org_sector_cannot_be_assigned_as_entry_point_state():
    with pytest.raises(ValueError):
        EntryPoint(code='EP_SWAP', name_ar='محاولة تبديل', kind=EntryPoint.Kind.LAND_PORT, state=OrgSector())


def test_geographic_state_cannot_be_assigned_as_entry_point_sector():
    with pytest.raises(ValueError):
        EntryPoint(code='EP_SWAP2', name_ar='محاولة تبديل', kind=EntryPoint.Kind.LAND_PORT, sector=State())


def test_seeded_land_registry_has_no_cross_domain_leakage(seeded_land_registry):
    for entry_point in seeded_land_registry:
        assert type(entry_point.state) is State
        assert type(entry_point.sector) is OrgSector
        assert type(entry_point.state.sector) is TransportSector


# ---------------------------------------------------------------------------
# 2) مصفوفة الولاية/القطاع المرجعية للمعابر البرية الاثني عشر
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('code,expected', sorted(LAND_BORDER_REGISTRY.items()))
def test_seeded_crossing_binds_expected_state_and_org_sector(seeded_land_registry, code, expected):
    state_code, sector_code = expected
    entry_point = seeded_land_registry.get(code=code)
    assert entry_point.state.code == state_code
    assert entry_point.sector.code == sector_code


def test_seeded_land_registry_is_complete(seeded_land_registry):
    assert set(seeded_land_registry.values_list('code', flat=True)) == set(LAND_BORDER_REGISTRY)
    assert BorderCrossing.objects.count() == len(LAND_BORDER_REGISTRY)


# ---------------------------------------------------------------------------
# 3) قطاع الأبيض: علاقة دعم مقصودة لا خطأ بيانات
# ---------------------------------------------------------------------------


def test_el_obeid_remains_support_sector_for_western_crossings(seeded_land_registry):
    for code in EL_OBEID_SUPPORTED_CROSSINGS:
        entry_point = seeded_land_registry.get(code=code)
        assert entry_point.sector.code == 'EL_OBEID'
        assert type(entry_point.sector) is OrgSector


def test_el_obeid_support_relationship_is_documented_in_sector_description(seeded_land_registry):
    """نيّة الدعم موثّقة في وصف قطاع الأبيض نفسه داخل المستودع."""
    description = OrgSector.objects.get(code='EL_OBEID').description
    assert 'البرية الغربية' in description
    assert 'إسناد' in description
    for place in ('أدري', 'تينة', 'جنوب السودان'):
        assert place in description


def test_el_obeid_is_not_a_geographic_state(seeded_land_registry):
    """`EL_OBEID` قطاع إداري فقط — لا توجد له ولاية جغرافية مقابلة."""
    assert not State.objects.filter(code__in=('EL_OBEID', 'MD_EL_OBEID')).exists()
    assert State.objects.filter(code='MD_BLUE_NILE').exists()


def test_darfur_and_blue_nile_crossings_are_not_rerouted(seeded_land_registry):
    """ولايات دارفور والنيل الأزرق تحت EL_OBEID تُحفظ كما هي دون إعادة توجيه."""
    expected_states = {
        'EP_SOUTH_SUDAN_BORDER': 'MD_BLUE_NILE',
        'EP_ADRE': 'MD_W_DARFUR',
        'EP_TINE': 'MD_W_DARFUR',
        'EP_ASHKEIT': 'MD_N_DARFUR',
        'EP_ALAFIA': 'MD_N_DARFUR',
    }
    for code, state_code in expected_states.items():
        assert seeded_land_registry.get(code=code).state.code == state_code


# ---------------------------------------------------------------------------
# 4) الأسماء الإنجليزية: المعتمد فقط
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('code,name_en', sorted(APPROVED_NAME_EN.items()))
def test_approved_english_names_are_populated(seeded_land_registry, code, name_en):
    assert seeded_land_registry.get(code=code).name_en == name_en


@pytest.mark.parametrize('code', INTENTIONALLY_BLANK_NAME_EN)
def test_insufficient_evidence_names_stay_blank(seeded_land_registry, code):
    assert seeded_land_registry.get(code=code).name_en == ''


def test_english_names_are_unique_among_land_crossings(seeded_land_registry):
    values = [ep.name_en for ep in seeded_land_registry if ep.name_en]
    assert len(values) == len(set(values)) == len(APPROVED_NAME_EN)


# ---------------------------------------------------------------------------
# 5) السلال الحدودية العامة: غير مسمّاة، وغير محسومة
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('code,neighbor', sorted(GENERIC_REGISTRY_BUCKETS.items()))
def test_generic_buckets_remain_unnamed_and_unlocated(seeded_land_registry, code, neighbor):
    entry_point = seeded_land_registry.get(code=code)
    assert entry_point.kind == EntryPoint.Kind.LAND_PORT
    assert entry_point.name_ar == f'المعابر الحدودية مع {neighbor}'
    # لا موقع ولا اسم إنجليزي: سجل عام لا نقطة دخول مسمّاة.
    assert entry_point.location == ''
    assert entry_point.name_en == ''


def test_generic_buckets_are_not_counted_as_named_poes(seeded_land_registry):
    named = [ep for ep in seeded_land_registry if ep.name_ar.startswith('معبر ') and ep.location]
    assert len(named) == len(LAND_BORDER_REGISTRY) - len(GENERIC_REGISTRY_BUCKETS)
    assert GENERIC_REGISTRY_BUCKETS.keys().isdisjoint({ep.code for ep in named})


def test_generic_buckets_keep_operational_profiles(seeded_land_registry):
    """السلة العامة تحتفظ بملفها التشغيلي حتى يصل سجل رسمي بمسمّياتها."""
    for code in GENERIC_REGISTRY_BUCKETS:
        crossing = seeded_land_registry.get(code=code).border_crossing
        assert crossing.operating_status == BorderCrossing.BorderStatus.OPEN
        assert BorderFacility.objects.filter(crossing=crossing).exists()


# ---------------------------------------------------------------------------
# 6) تعارضات الدول المجاورة: موثّقة وغير مُغيَّرة
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('code', ['EP_OSEIF', 'EP_GABAIT'])
def test_red_sea_neighbor_conflict_is_preserved_not_guessed(seeded_land_registry, code):
    """المستودع متعارض: seed_masterdata يذكر مصر، وBORDER_PROFILE يذكر إريتريا.

    القيمة المحفوظة هي إريتريا، ولم تُغيَّر صامتة، ولم يُشتَق منها أي اسم.
    """
    assert BORDER_PROFILE[code]['neighbor_country'] == 'إريتريا'
    assert seeded_land_registry.get(code=code).border_crossing.neighbor_country == 'إريتريا'
    assert 'مصر' in SEED_MASTERDATA_SRC.read_text(encoding='utf-8')


def test_gallabat_neighbor_conflict_is_preserved(seeded_land_registry):
    """المستودع متعارض للقلابات: وثيقة القيادة تقول إثيوبيا، والبذرة تقول إريتريا."""
    if not LAND_BORDER_DOC.exists():
        pytest.skip('وثيقة مركز قيادة المعابر غير متوفرة')
    doc = LAND_BORDER_DOC.read_text(encoding='utf-8')
    assert 'إثيوبيا' in doc
    assert BORDER_PROFILE['EP_GALLABAT']['neighbor_country'] == 'إريتريا'
    assert seeded_land_registry.get(code='EP_GALLABAT').border_crossing.neighbor_country == 'إريتريا'


# ---------------------------------------------------------------------------
# 7) سلامة البذر: تكرار آمن وحتمي بلا عمليات مدمّرة
# ---------------------------------------------------------------------------


def _registry_snapshot():
    return {
        ep.code: (ep.name_ar, ep.name_en, ep.state.code, ep.sector.code, ep.location)
        for ep in EntryPoint.objects.filter(kind=EntryPoint.Kind.LAND_PORT).order_by('code')
    }


def test_seeding_is_idempotent_and_deterministic(seeded_land_registry):
    before_entries = _registry_snapshot()
    before_counts = {
        'entry_points': EntryPoint.objects.count(),
        'crossings': BorderCrossing.objects.count(),
        'facilities': BorderFacility.objects.count(),
    }

    call_command('seed_organization', verbosity=0)
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_borders_health', verbosity=0)

    assert _registry_snapshot() == before_entries
    assert EntryPoint.objects.count() == before_counts['entry_points']
    assert BorderCrossing.objects.count() == before_counts['crossings']
    assert BorderFacility.objects.count() == before_counts['facilities']


def test_every_land_port_has_a_profile_without_missing_neighbor(seeded_land_registry):
    for entry_point in seeded_land_registry:
        crossing = entry_point.border_crossing
        assert crossing.neighbor_country, entry_point.code
        assert entry_point.code in BORDER_PROFILE