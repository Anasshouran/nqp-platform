"""اختبارات التعيين التنظيمي للمعابر البرية — Phase 2.

تغطي الارتباط التنظيمي المعتمد `OrgAssignment.entry_point` دون تغيير أي مخطط:
- مطابقة المصفوفة المرجعية للمعابر الاثني عشر.
- السلتان الحدودية العامتان غير المسمّاة تبقيان بلا تعيين.
- عدم تسرّب النطاق: قطاع التعيين = قطاع نقطة الدخول = قطاع المحطة.
- ثبات نسبة قطاع الأبيض (EL_OBEID) للمعابر الغربية.
- عزل الصلاحيات عبر `resolve_user_port_ids`.
- سلامة البذر عند التكرار (لا تكرار في المحطات ولا في التعيينات).

لا تفترض أي قيمة غير موثّقة في المستودع.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db.models import Count

from apps.masterdata.models import EntryPoint
from apps.masterdata.models import Sector as TransportSector
from apps.masterdata.models import State
from apps.organization.management.commands.seed_org_assignments import (
    Command as SeedOrgAssignments,
)
from apps.organization.models import (
    Department,
    OrgAssignment,
    Sector as OrgSector,
    Station,
)
from core.utils.scoping import resolve_user_port_ids

pytestmark = pytest.mark.django_db

User = get_user_model()

# (رمز نقطة الدخول، رمز القطاع الإداري، رمز الولاية masterdata.State، رمز المحطة المتوقعة)
NAMED_LAND_POES = [
    ('EP_ARGIN', 'NORTHERN', 'MD_NORTHERN', 'NORTHERN_LAND_PORTS_ARGIN'),
    ('EP_WADI_HALFA', 'NORTHERN', 'MD_NORTHERN', 'NORTHERN_LAND_PORTS_WADI_HALFA'),
    ('EP_MUTHALLATH', 'NORTHERN', 'MD_NORTHERN', 'NORTHERN_LAND_PORTS_MUTHALLATH'),
    ('EP_GALLABAT', 'GEDAREF', 'MD_GEDAREF', 'GEDAREF_LAND_PORTS_GALLABAT'),
    ('EP_ADRE', 'EL_OBEID', 'MD_W_DARFUR', 'EL_OBEID_LAND_PORTS_ADRE'),
    ('EP_TINE', 'EL_OBEID', 'MD_W_DARFUR', 'EL_OBEID_LAND_PORTS_TINE'),
    ('EP_ASHKEIT', 'EL_OBEID', 'MD_N_DARFUR', 'EL_OBEID_LAND_PORTS_ASHKEIT'),
    ('EP_ALAFIA', 'EL_OBEID', 'MD_N_DARFUR', 'EL_OBEID_LAND_PORTS_ALAFIA'),
    ('EP_OSEIF', 'RED_SEA', 'MD_RED_SEA_LAND', 'RED_SEA_LAND_PORTS_OSEIF_LAND'),
    ('EP_GABAIT', 'RED_SEA', 'MD_RED_SEA_LAND', 'RED_SEA_LAND_PORTS_GABAIT'),
]

# سلتان حدودية عامة غير مسمّاة — لا اسم محطة موثّق ⇒ لا تعيين.
UNNAMED_BUCKETS = ['EP_ERITREA_BORDER', 'EP_SOUTH_SUDAN_BORDER']

# المعابر الغربية التي تُخدم عبر قطاع الأبيض (قرار Phase 1).
EL_OBEID_POES = ['EP_SOUTH_SUDAN_BORDER', 'EP_ADRE', 'EP_TINE', 'EP_ASHKEIT', 'EP_ALAFIA']


@pytest.fixture
def seeded():
    """يبذر السجل المرجعي للبيانات ثم الهيكل الإداري ثم التعيينات الهيكلية."""
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_organization', verbosity=0)
    call_command('seed_org_assignments', verbosity=0)


def _officer(email, entry_point, station=None, sector=None):
    user = User.objects.create_user(
        email=email, password='Str0ngPass!23', full_name=email,
    )
    OrgAssignment.objects.create(
        user=user,
        sector=sector if sector is not None else entry_point.sector,
        station=station,
        entry_point=entry_point,
        is_primary=True,
        is_active=True,
    )
    return user


def _role_scoped_user(email, scope_type, scope_id):
    """مستخدم بدور واحد ونطاق واحد، بلا تعيين هيكلي — لاختبار نطاق الدور وحده."""
    from apps.accounts.models import Permission, Role, RoleAssignment

    user = User.objects.create_user(
        email=email, password='Str0ngPass!23', full_name=email,
    )
    role = Role.objects.create(
        code=f'R_{email.split("@")[0].replace(".", "_")}'.upper()[:50],
        name=email, default_scope=scope_type,
    )
    perm, _ = Permission.objects.get_or_create(
        code='borders_health:view',
        defaults={'name': 'borders_health view', 'resource': 'borders_health', 'action': 'view'},
    )
    role.permissions.add(perm)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )
    return user


# ---------------------------------------------------------------------------
# المطابقة المرجعية للسجل
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code,org_sector,state_code,station_code', NAMED_LAND_POES)
def test_land_poe_keeps_state_and_org_sector(
    seeded, ep_code, org_sector, state_code, station_code
):
    """لم تُغيَّر دلالات `EntryPoint.state` ولا `EntryPoint.sector` في Phase 2."""
    ep = EntryPoint.objects.get(code=ep_code)
    assert ep.state.code == state_code
    assert ep.sector.code == org_sector
    assert ep.kind == 'LAND_PORT'


def test_land_border_org_stations_exist(seeded):
    for _ep, org_sector, _state, station_code in NAMED_LAND_POES:
        station = Station.objects.get(code=station_code)
        assert station.sector.code == org_sector
        assert station.department.code == f'{org_sector}_LAND_PORTS'
        assert station.is_active is True


def test_named_poes_have_exactly_one_land_ports_department_each(seeded):
    """لا تكرار في الإدارات: إدارة معابر واحدة لكل قطاع."""
    expected = {f'{sector}_LAND_PORTS' for _ep, sector, _st, _sc in NAMED_LAND_POES}
    actual = set(
        Department.objects.filter(code__endswith='_LAND_PORTS').values_list('code', flat=True)
    )
    assert expected <= actual
    # كل قطاع في المصفوفة له إدارة واحدة بالضبط — لا نسخ مكرّرة بنفس القطاع
    assert len(actual) == len(expected)
    duplicated = (
        Department.objects.filter(code__endswith='_LAND_PORTS')
        .values('sector')
        .annotate(n=Count('id'))
        .filter(n__gt=1)
    )
    assert not list(duplicated), 'يوجد قطاع بأكثر من إدارة معابر برية'


def test_argin_station_is_not_shared_across_sectors(seeded):
    """`RED_SEA_LAND_PORTS_ARGIN` محطة بحر الأحمر ولا تصلح لـ EP_ARGIN (الشمالي)."""
    red_sea_argin = Station.objects.get(code='RED_SEA_LAND_PORTS_ARGIN')
    assert red_sea_argin.sector.code == 'RED_SEA'
    ep_argin = EntryPoint.objects.get(code='EP_ARGIN')
    assert ep_argin.sector.code == 'NORTHERN'
    assert red_sea_argin.sector_id != ep_argin.sector_id


# ---------------------------------------------------------------------------
# EL_OBEID
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code', EL_OBEID_POES)
def test_western_crossings_stay_on_el_obeid(seeded, ep_code):
    assert EntryPoint.objects.get(code=ep_code).sector.code == 'EL_OBEID'


def test_el_obeid_support_relationship_intact(seeded):
    """علاقة الدعم كاملة: كل المعابر الغربية ما زالت على قطاع الأبيض."""
    assert set(
        EntryPoint.objects.filter(
            kind='LAND_PORT', sector__code='EL_OBEID',
        ).values_list('code', flat=True)
    ) == set(EL_OBEID_POES)


# ---------------------------------------------------------------------------
# الارتباط التنظيمي عبر OrgAssignment.entry_point
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code,_sector,_state,station_code', NAMED_LAND_POES)
def test_seeded_assignment_links_expected_station(seeded, ep_code, _sector, _state, station_code):
    """كل معبر مسمّى يُنتج تعييناً يربط نقطة الدخول بالمحطة المتوقعة."""
    row = next(r for r in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS if r['entry_point'] == ep_code)
    user = User.objects.create_user(
        email=row['email'], password='Str0ngPass!23', full_name=row['email'],
    )
    call_command('seed_org_assignments', verbosity=0)

    assignment = OrgAssignment.objects.get(user=user, entry_point__code=ep_code)
    assert assignment.station.code == station_code
    assert assignment.is_active is True
    assert assignment.is_primary is True


@pytest.mark.parametrize('ep_code', UNNAMED_BUCKETS)
def test_unnamed_buckets_have_no_assignment(seeded, ep_code):
    """السلل غير المسمّاة تبقى بلا تعيين — لا أسماء مخترعة."""
    assert not OrgAssignment.objects.filter(entry_point__code=ep_code).exists()


@pytest.mark.parametrize('ep_code', UNNAMED_BUCKETS)
def test_unnamed_buckets_have_no_land_port_station(seeded, ep_code):
    """لا محطة معابر تُنشأ لسلة غير مسمّاة: `location` فارغ فلا هوية موثّقة."""
    ep = EntryPoint.objects.get(code=ep_code)
    assert ep.location == ''
    # لا محطة organisational باسم السلة نفسها، ولا محطة بموقع فارغ
    assert not Station.objects.filter(code=ep_code).exists()
    assert not Station.objects.filter(
        code__endswith='_LAND_PORTS', location='', is_active=True,
    ).exists()
    # قطاع كسلا لا يملك أي معبر برّي مسمّى ⇒ لا إدارة معابر له إطلاقاً
    if ep.sector.code == 'KASSALA':
        assert not Department.objects.filter(
            sector=ep.sector, code__endswith='_LAND_PORTS',
        ).exists()


@pytest.mark.parametrize('ep_code,_sector,_state,station_code', NAMED_LAND_POES)
def test_assignment_never_crosses_sector(seeded, ep_code, _sector, _state, station_code):
    """لا تسرّب نطاق: قطاع التعيين وقطاع المحطة كلاهما قطاع نقطة الدخول."""
    row = next(r for r in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS if r['entry_point'] == ep_code)
    user = User.objects.create_user(
        email=row['email'], password='Str0ngPass!23', full_name=row['email'],
    )
    call_command('seed_org_assignments', verbosity=0)

    assignment = OrgAssignment.objects.get(user=user, entry_point__code=ep_code)
    ep = assignment.entry_point
    assert assignment.sector_id == ep.sector_id
    assert assignment.station.sector_id == ep.sector_id
    assert assignment.department.sector_id == ep.sector_id


@pytest.mark.parametrize('ep_code,_sector,_state,station_code', NAMED_LAND_POES)
def test_org_sector_is_distinct_from_transport_sector(seeded, ep_code, _sector, _state, station_code):
    """لا خلط بين `organization.Sector` و`masterdata.Sector` (نطاق `State`)."""
    ep = EntryPoint.objects.get(code=ep_code)
    assert isinstance(ep.sector, OrgSector)
    assert isinstance(ep.state.sector, TransportSector)
    assert ep.state.sector_id != ep.sector_id


# ---------------------------------------------------------------------------
# العزل عبر الصلاحيات (resolve_user_port_ids)
# ---------------------------------------------------------------------------


def test_assigned_officer_sees_only_own_poe(seeded):
    ep_argin = EntryPoint.objects.get(code='EP_ARGIN')
    ep_oseif = EntryPoint.objects.get(code='EP_OSEIF')
    officer = _officer('argin.officer@nqp.gov.sd', ep_argin)

    assert resolve_user_port_ids(officer) == [ep_argin.id]


def test_sector_a_user_cannot_reach_sector_b_poe(seeded):
    """مستخدم نطاقه قطاع الشمال لا يصل إلى معبر أوسيف (البحر الأحمر)."""
    from apps.accounts.models import RoleAssignment

    northern = OrgSector.objects.get(code='NORTHERN')
    ep_northern = EntryPoint.objects.get(code='EP_ARGIN')
    ep_red_sea = EntryPoint.objects.get(code='EP_OSEIF')

    user = _role_scoped_user(
        'northern.head@nqp.gov.sd', RoleAssignment.ScopeType.SECTOR, northern.id,
    )

    ids = resolve_user_port_ids(user)
    assert ids is not None, 'المستخدم غير الوطني يجب أن يُقيَّد'
    assert ep_northern.id in ids
    assert ep_red_sea.id not in ids


def test_station_scoped_officer_cannot_cross_stations(seeded):
    """تعيين محطة واحدة لا يمنح محطة أخرى — العزل على مستوى المعبر."""
    ep_argin = EntryPoint.objects.get(code='EP_ARGIN')
    ep_halfa = EntryPoint.objects.get(code='EP_WADI_HALFA')
    argin_station = Station.objects.get(code='NORTHERN_LAND_PORTS_ARGIN')

    officer = _officer('halfa.officer@nqp.gov.sd', ep_halfa, station=argin_station)
    ids = resolve_user_port_ids(officer)
    assert ids == [ep_halfa.id]
    assert ep_argin.id not in ids


def test_poe_assignment_does_not_grant_other_sector(seeded):
    """تعيين معبر واحد لا يمنح بقية نقاط دخول القطاع نفسه ولا قطاعات أخرى."""
    ep_oseif = EntryPoint.objects.get(code='EP_OSEIF')
    officer = _officer('oseif.only@nqp.gov.sd', ep_oseif)

    ids = set(resolve_user_port_ids(officer))
    assert ids == {ep_oseif.id}
    for code in ('EP_ARGIN', 'EP_ADRE', 'EP_GALLABAT', 'EP_OSEIF'):
        ep = EntryPoint.objects.get(code=code)
        if code == 'EP_OSEIF':
            continue
        assert ep.id not in ids


def test_el_obeid_officer_retains_western_access(seeded):
    el_obeid = OrgSector.objects.get(code='EL_OBEID')
    ep_tine = EntryPoint.objects.get(code='EP_TINE')
    officer = _officer('tine.officer@nqp.gov.sd', ep_tine)

    assert el_obeid.id in {ep_tine.sector_id}
    assert resolve_user_port_ids(officer) == [ep_tine.id]


def test_national_scope_still_unrestricted(seeded):
    """النطاق الوطني لم يتأثر: superuser غير مقيَّد."""
    national = User.objects.create_superuser(
        email='nqp.super@nqp.gov.sd', password='Str0ngPass!23', full_name='وطني',
    )
    assert resolve_user_port_ids(national) is None


def test_user_without_any_scope_is_fail_closed(seeded):
    plain = User.objects.create_user(
        email='no.scope@nqp.gov.sd', password='Str0ngPass!23', full_name='بلا نطاق',
    )
    assert resolve_user_port_ids(plain) == []


# ---------------------------------------------------------------------------
# سلامة البذر
# ---------------------------------------------------------------------------


def test_seed_organization_is_idempotent(seeded):
    stations_before = set(Station.objects.values_list('code', flat=True))
    departments_before = set(Department.objects.values_list('code', flat=True))

    call_command('seed_organization', verbosity=0)
    call_command('seed_organization', verbosity=0)

    assert set(Station.objects.values_list('code', flat=True)) == stations_before
    assert set(Department.objects.values_list('code', flat=True)) == departments_before


def test_repeated_seeding_does_not_duplicate_assignments(seeded):
    for row in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS:
        User.objects.create_user(
            email=row['email'], password='Str0ngPass!23', full_name=row['email'],
        )
    call_command('seed_org_assignments', verbosity=0)
    first = OrgAssignment.objects.count()

    call_command('seed_org_assignments', verbosity=0)
    call_command('seed_org_assignments', verbosity=0)

    assert OrgAssignment.objects.count() == first
    for row in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS:
        assert OrgAssignment.objects.filter(
            entry_point__code=row['entry_point'], user__email=row['email'],
        ).count() == 1


def test_no_new_migration_required(seeded):
    """Phase 2 لا يضيف أي حقل — البنية المرجعية كما هي."""
    fields = {f.name for f in Station._meta.get_fields()}
    assert 'entry_point' not in fields
    assert 'entry_point' in {f.name for f in OrgAssignment._meta.get_fields()}


# ---------------------------------------------------------------------------
# حسابات الضباط التجريبية (نفس نمط أوامر الأدوار القائمة)
# ---------------------------------------------------------------------------


def _border_officer_role():
    from apps.accounts.models import Role

    return Role.objects.create(
        code='BORDER_HEALTH_OFFICER',
        name='Border Health Officer',
        name_ar='ضابط الصحة الحدودية',
        default_scope='PORT',
    )


def test_seed_border_officers_is_gated_without_demo_flag(seeded, monkeypatch):
    from django.core.management.base import CommandError

    monkeypatch.delenv('SEED_DEMO_USERS', raising=False)
    with pytest.raises(CommandError):
        call_command('seed_border_officers', verbosity=0)


def test_seed_border_officers_then_assignments_materialize(seeded, monkeypatch):
    """بعد بذر الحسابات، ينشأ تعيين `entry_point` لكل معبر برّي مسمّى."""
    _border_officer_role()
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')

    call_command('seed_border_officers', verbosity=0)
    call_command('seed_org_assignments', verbosity=0)

    for row in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS:
        assignment = OrgAssignment.objects.get(
            user__email=row['email'], entry_point__code=row['entry_point'],
        )
        ep = assignment.entry_point
        assert assignment.sector_id == ep.sector_id
        assert assignment.station.sector_id == ep.sector_id


def test_seeded_border_officer_scope_is_limited_to_own_poe(seeded, monkeypatch):
    """الضابط المرتبط عبر التعيين لا يرى إلا معبره."""
    _border_officer_role()
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')
    call_command('seed_border_officers', verbosity=0)
    call_command('seed_org_assignments', verbosity=0)

    officer = User.objects.get(email='border.adre@nqp.gov.sd')
    ids = set(resolve_user_port_ids(officer))
    assert ids == {EntryPoint.objects.get(code='EP_ADRE').id}


def test_seed_border_officers_is_idempotent(seeded, monkeypatch):
    _border_officer_role()
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')

    call_command('seed_border_officers', verbosity=0)
    before = User.objects.filter(email__startswith='border.').count()
    call_command('seed_border_officers', verbosity=0)
    call_command('seed_border_officers', verbosity=0)

    assert User.objects.filter(email__startswith='border.').count() == before
    assert before == len(SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS)