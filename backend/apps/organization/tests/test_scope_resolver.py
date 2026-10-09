"""Phase 3B — المحلّ المعتمد لنطاق نقاط الدخول + الفشل الآمن.

يغطي `core.utils.scoping.resolve_authorized_entry_points` بوصفه المصدر الوحيد
لتحويل نطاق المستخدم إلى `masterdata.EntryPoint`:

- كل نوع نطاق من الأنواع الفعلية، ومعه حدّه السلبي المقابل.
- جسر `OrgAssignment.entry_point` как الجسر التنظيمي المعتمد.
- أقل امتياز: محطة ⇒ معبرها وحده، لا قطاعها ولا معابر جيرانها.
- الاتحاد بين التعيينات المستقلة فقط، بلا «الأدق يفوز».
- الفشل الآمن في كل مكان كان يفضّح `qs` كاملاً عند غياب النطاق.

كل اختبار إيجابي له اختبار حدّ سلبي مقابل.
"""
import pytest
from django.contrib.auth import get_user_model

from apps.masterdata.models import EntryPoint, State
from apps.masterdata.models import Sector as TransportSector
from apps.organization.models import (
    Department,
    OrgAssignment,
    Sector as OrgSector,
    Station,
)
from core.utils.scoping import (
    SCOPE_OPT_OUT_ATTR,
    resolve_authorized_entry_points,
    resolve_combined_scope_ids,
    resolve_user_port_ids,
    scope_is_optional,
)

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'


# ---------------------------------------------------------------------------
# البنية: قطاعان إداريان، كلٌّ بموقع دخول، ولكل قطاع محطة وإدارة
# ---------------------------------------------------------------------------


@pytest.fixture
def org_world():
    """قطاعات إدارية + ولايات + نقاط دخول + إدارات ومحطات، بلا أي مستخدم.

    NORTHERN له معبران (A شقيق B) ⇒ اختبار «المحطة ⇒ معبرها وحده» له ما
    يثبتّ ضدّه. KASSALA قطاع منفصل تماماً لاختبار «قطاع آخر ⇒ منع».
    """
    state_north = State.objects.create(
        code='P3B_MD_NORTH', name_ar='ولاية شمالية', sector=TransportSector.objects.create(
            code='P3B_TS_N', name_ar='نقل شمالي',
        ),
    )
    state_kassa = State.objects.create(
        code='P3B_MD_KASSA', name_ar='ولاية كسلا', sector=TransportSector.objects.create(
            code='P3B_TS_K', name_ar='نقل كسلا',
        ),
    )

    north = OrgSector.objects.create(code='P3B_NORTH', name_ar='شمال')
    kassa = OrgSector.objects.create(code='P3B_KASSA', name_ar='كسلا')

    ep_a = EntryPoint.objects.create(
        code='P3B_EP_A', name_ar='معبر أ', kind=EntryPoint.Kind.LAND_PORT,
        state=state_north, sector=north, location='أ',
    )
    ep_b = EntryPoint.objects.create(
        code='P3B_EP_B', name_ar='معبر ب', kind=EntryPoint.Kind.LAND_PORT,
        state=state_north, sector=north, location='ب',
    )
    ep_kassa = EntryPoint.objects.create(
        code='P3B_EP_K', name_ar='معبر ك', kind=EntryPoint.Kind.LAND_PORT,
        state=state_kassa, sector=kassa, location='ك',
    )

    dept_north = Department.objects.create(
        code='P3B_NORTH_LAND_PORTS', name_ar='إدارة معابر الشمال', sector=north,
        kind=Department.Kind.ENTRY_POINT,
    )
    station_a = Station.objects.create(
        code='P3B_ST_A', name_ar='محطة أ', sector=north,
        department=dept_north, location='أ',
    )
    station_b = Station.objects.create(
        code='P3B_ST_B', name_ar='محطة ب', sector=north,
        department=dept_north, location='ب',
    )
    return {
        'north': north, 'kassa': kassa,
        'ep_a': ep_a, 'ep_b': ep_b, 'ep_kassa': ep_kassa,
        'dept_north': dept_north, 'station_a': station_a, 'station_b': station_b,
    }


def _user(email):
    return User.objects.create_user(email=email, password=PASSWORD, full_name=email)


def _assign_role(user, scope_type, scope_id=None, *, role_code='P3B_ROLE', active=True):
    from apps.accounts.models import Role, RoleAssignment

    role, _ = Role.objects.get_or_create(
        code=f'{role_code}_{scope_type}',
        defaults={'name': role_code, 'default_scope': scope_type},
    )
    assignment, _ = RoleAssignment.objects.get_or_create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
        defaults={'is_active': active},
    )
    assignment.is_active = active
    assignment.save(update_fields=['is_active'])
    return assignment


def _resolved(user):
    """النتيجة كمجموعة، أوNone كما هي للدلالة على «بلا تقييد»."""
    ids = resolve_authorized_entry_points(user)
    return None if ids is None else set(ids)


# ---------------------------------------------------------------------------
# 1-3. STATION ⇒ نقطة دخولها وحدها، عبر OrgAssignment
# ---------------------------------------------------------------------------


def test_station_resolves_to_its_own_entry_point_via_org_assignment(org_world):
    """STATION ⇒ نقطة الدخول المذكورة في `OrgAssignment` لتلك المحطة."""
    user = _user('st.a@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], department=org_world['dept_north'],
        entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    assert _resolved(user) == {org_world['ep_a'].id}


def test_station_does_not_reach_sibling_station(org_world):
    """محطة ⇒ لا الشقيقة، حتى داخل نفس الإدارة ونفس القطاع."""
    user = _user('st.b@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], department=org_world['dept_north'],
        entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    resolved = _resolved(user)
    assert org_world['ep_b'].id not in resolved
    assert org_world['ep_kassa'].id not in resolved


def test_station_does_not_widen_to_its_whole_sector(org_world):
    """محطة ⇒ لا قطاعها. لا يوجد «الأدق يفوز» ولا «الأوسع يرث»."""
    user = _user('st.sector@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    assert _resolved(user) == {org_world['ep_a'].id}


def test_station_without_entry_point_in_org_assignment_fails_closed(org_world):
    """محطة بلا OrgAssignment يحمل نقطة دخول ⇒ لا استنتاج، بل حجب."""
    user = _user('st.empty@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    assert resolve_authorized_entry_points(user) == []


def test_inactive_org_assignment_is_not_honoured(org_world):
    """تعيين هيكلي غير نشط لا يمنح شيئاً — نفس دلالة `is_active` في المستودع."""
    user = _user('st.inactive@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], entry_point=org_world['ep_a'], is_active=False,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    assert resolve_authorized_entry_points(user) == []


def test_inactive_role_assignment_is_not_honoured(org_world):
    """تعيين دور غير نشط (أو خارج النافذة) لا يُقرأ.

    لا `OrgAssignment` هنا عمداً: بدونه لا يبقى أي مصدر جغرافي، فالنتيجة
    يجب أن تكون `[]` لا `None`.
    """
    user = _user('st.inactive_ra@nqp.gov.sd')
    _assign_role(user, 'STATION', org_world['station_a'].id, active=False)

    assert resolve_authorized_entry_points(user) == []


def test_inactive_role_assignment_does_not_cancel_the_org_bridge(org_world):
    """التعيين الهيكلي مستقلّ عن حالة تعيين الدور.

    الجسر `OrgAssignment.entry_point` يبقى فعّالاً طالما كان نشطاً: تعطيل
    الدور يمنع الوصول، ولا يلغي الارتباط التنظيمي. الفارق مقصود.
    """
    user = _user('st.ra_off_org_on@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id, active=False)

    assert _resolved(user) == {org_world['ep_a'].id}


# ---------------------------------------------------------------------------
# 4-5. PORT / POINT ⇒ نقطة الدخول نفسها لا غير
# ---------------------------------------------------------------------------


def test_point_resolves_exact_entry_point(org_world):
    user = _user('pt@nqp.gov.sd')
    _assign_role(user, 'POINT', org_world['ep_a'].id)

    assert _resolved(user) == {org_world['ep_a'].id}


def test_port_resolves_exact_entry_point(org_world):
    user = _user('port@nqp.gov.sd')
    _assign_role(user, 'PORT', org_world['ep_b'].id)

    assert _resolved(user) == {org_world['ep_b'].id}


@pytest.mark.parametrize('scope_type', ['POINT', 'PORT'])
def test_port_and_point_do_not_reach_other_sectors(org_world, scope_type):
    """نقطة ⇒ لا قطاع آخر، ولا معبر شقيق داخل قطاعها."""
    user = _user(f'{scope_type.lower()}.iso@nqp.gov.sd')
    _assign_role(user, scope_type, org_world['ep_a'].id)

    resolved = _resolved(user)
    assert resolved == {org_world['ep_a'].id}
    assert org_world['ep_kassa'].id not in resolved


# ---------------------------------------------------------------------------
# 6-7. SECTOR ⇒ نقاط دخول القطاع، وحده
# ---------------------------------------------------------------------------


def test_sector_resolves_all_entry_points_of_that_sector(org_world):
    user = _user('sector.n@nqp.gov.sd')
    _assign_role(user, 'SECTOR', org_world['north'].id)

    assert _resolved(user) == {org_world['ep_a'].id, org_world['ep_b'].id}


def test_sector_does_not_reach_other_sector(org_world):
    user = _user('sector.n2@nqp.gov.sd')
    _assign_role(user, 'SECTOR', org_world['north'].id)

    assert org_world['ep_kassa'].id not in _resolved(user)


def test_inactive_entry_point_is_excluded_from_sector_expansion(org_world):
    """`sector_entry_points` يفلتر `is_active=True` — التوسع يتبعه."""
    EntryPoint.objects.filter(pk=org_world['ep_b'].id).update(is_active=False)
    user = _user('sector.active@nqp.gov.sd')
    _assign_role(user, 'SECTOR', org_world['north'].id)

    assert _resolved(user) == {org_world['ep_a'].id}


# ---------------------------------------------------------------------------
# 8. REGION ≡ organization.Sector
# ---------------------------------------------------------------------------


def test_region_resolves_as_organization_sector(org_world):
    """نطاق REGION يحمل معرّف قطاع إداري فيُحلّ تماماً مثل SECTOR."""
    user = _user('region.n@nqp.gov.sd')
    _assign_role(user, 'REGION', org_world['north'].id)

    assert _resolved(user) == {org_world['ep_a'].id, org_world['ep_b'].id}


def test_region_does_not_treat_sector_uuid_as_entry_point_id(org_world):
    """الحدّ الحرج: معرّف القطاع ليس معرّف نقطة دخول.

    كان `apps.hr.scoping.SCOPE_LOOKUPS['REGION']` يقرأ `entry_point_id`،
    فيتعلّم كأنه معرّف معبر. هنا نثبت أنه يُعامل كقطاع: كل نقاط قطاعه،
    ولا شيء خارجه.
    """
    user = _user('region.iso@nqp.gov.sd')
    _assign_role(user, 'REGION', org_world['north'].id)

    resolved = _resolved(user)
    assert resolved == {org_world['ep_a'].id, org_world['ep_b'].id}
    assert org_world['ep_kassa'].id not in resolved
    # pylint: disable=protected-access
    assert org_world['north'].id not in resolved


def test_region_and_sector_are_equivalent(org_world):
    """المعنىان متطابقان تماماً — لا لبس بينهما في أي موديول."""
    region_user = _user('region.equiv@nqp.gov.sd')
    sector_user = _user('sector.equiv@nqp.gov.sd')
    _assign_role(region_user, 'REGION', org_world['north'].id, role_code='EQ')
    _assign_role(sector_user, 'SECTOR', org_world['north'].id, role_code='EQ')

    assert _resolved(region_user) == _resolved(sector_user)


# ---------------------------------------------------------------------------
# 9. DEPARTMENT ⇒ عبر تعييناته
# ---------------------------------------------------------------------------


def test_department_resolves_entry_points_of_its_assignments(org_world):
    user = _user('dept@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, department=org_world['dept_north'],
        sector=org_world['north'], entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'DEPARTMENT', org_world['dept_north'].id)

    assert _resolved(user) == {org_world['ep_a'].id}


def test_department_resolves_assignments_reached_through_its_stations(org_world):
    """تعيين على محطة داخل الإدارة يُحلّ عبر نطاق الإدارة (السلسلة الهرمية)."""
    user = _user('dept.hier@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_b'],
        sector=org_world['north'], department=org_world['dept_north'],
        entry_point=org_world['ep_b'], is_active=True,
    )
    _assign_role(user, 'DEPARTMENT', org_world['dept_north'].id)

    assert _resolved(user) == {org_world['ep_b'].id}


def test_department_does_not_reach_unrelated_department(org_world):
    """إدارة ⇒ لا إدارة أخرى، حتى لو كانت في القطاع نفسه.

    التعيين الهيكلي المعارض يخصّ **مستخدماً آخر**: لو كان للمستخدم نفسه
    لكان جسراً مباشراً على `entry_point` (انظر
    `test_org_assignment_entry_point_is_honoured_without_any_role_scope`).
    """
    other_dept = Department.objects.create(
        code='P3B_OTHER_DEPT', name_ar='إدارة أخرى',
        sector=org_world['north'], kind=Department.Kind.DEPARTMENT,
    )
    colleague = _user('dept.colleague@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=colleague, department=other_dept, sector=org_world['north'],
        entry_point=org_world['ep_a'], is_active=True,
    )

    user = _user('dept.iso@nqp.gov.sd')
    _assign_role(user, 'DEPARTMENT', org_world['dept_north'].id)

    assert resolve_authorized_entry_points(user) == []


# ---------------------------------------------------------------------------
# 10-11. GLOBAL / الفراغ
# ---------------------------------------------------------------------------


def test_empty_scope_fails_closed(org_world):
    """لا نطاق ولا OrgAssignment ⇒ `[]` لا `None` (حجب، لا ترقية)."""
    user = _user('nobody@nqp.gov.sd')

    assert resolve_authorized_entry_points(user) == []


def test_company_only_user_gets_no_geography(org_world):
    """نطاق COMPANY لا يُنتج بعداً جغرافياً — يبقى الحجب على البُعد الجغرافي."""
    from apps.accounts.models import Permission, Role, RoleAssignment

    role = Role.objects.create(code='P3B_CARRIER', name='شركة', default_scope='COMPANY')
    perm, _ = Permission.objects.get_or_create(
        code='shipping_agents:view',
        defaults={'name': 'view', 'resource': 'shipping_agents', 'action': 'view'},
    )
    role.permissions.add(perm)

    user = _user('carrier.only@nqp.gov.sd')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='COMPANY',
        scope_id='00000000-0000-0000-0000-0000000000ff', is_active=True,
    )

    assert resolve_authorized_entry_points(user) == []
    info = resolve_combined_scope_ids(user)
    assert info['has_company_scope'] is True
    assert info['has_port_scope'] is False


def test_global_scope_is_unrestricted(org_world):
    user = _user('global@nqp.gov.sd')
    _assign_role(user, 'GLOBAL', None)

    assert resolve_authorized_entry_points(user) is None


def test_global_beats_a_narrow_scope_in_the_same_account(org_world):
    """GLOBAL ⇒ `None` حتى لو حُمل نطاق ضيّق معه — العقد لا يتغيّر."""
    user = _user('global.plus@nqp.gov.sd')
    _assign_role(user, 'GLOBAL', None, role_code='G1')
    _assign_role(user, 'POINT', org_world['ep_a'].id, role_code='G2')

    assert resolve_authorized_entry_points(user) is None


def test_superuser_is_unrestricted(org_world):
    user = User.objects.create_superuser(
        email='su@nqp.gov.sd', password=PASSWORD, full_name='su',
    )
    assert resolve_authorized_entry_points(user) is None


def test_anonymous_user_is_not_unrestricted(org_world):
    from django.contrib.auth.models import AnonymousUser

    assert resolve_authorized_entry_points(AnonymousUser()) == []


# ---------------------------------------------------------------------------
# 12. الاتحاد بين التعيينات المستقلة
# ---------------------------------------------------------------------------


def test_multiple_independent_assignments_union(org_world):
    """الاتحاد هو التوسّع الوحيد: نقطة + محطة ⇒ المعبران."""
    user = _user('union@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_b'],
        sector=org_world['north'], entry_point=org_world['ep_b'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_b'].id, role_code='U1')
    _assign_role(user, 'POINT', org_world['ep_a'].id, role_code='U2')

    assert _resolved(user) == {org_world['ep_a'].id, org_world['ep_b'].id}


def test_narrow_and_broad_scopes_union_rather_than_intersect(org_world):
    """نقطة ضيّقة + قطاع عريض ⇒ قطاع كامل. لا «الأدق يفوز»."""
    user = _user('union.broad@nqp.gov.sd')
    _assign_role(user, 'POINT', org_world['ep_a'].id, role_code='UN1')
    _assign_role(user, 'SECTOR', org_world['north'].id, role_code='UN2')

    assert _resolved(user) == {org_world['ep_a'].id, org_world['ep_b'].id}


# ---------------------------------------------------------------------------
#-orgAssignment.entry_point جسر معتمد بذاته
# ---------------------------------------------------------------------------


def test_org_assignment_entry_point_is_honoured_without_any_role_scope(org_world):
    """التعيين الهيكلي نفسه يكفي لمنحه معبره — الجسر المعتمد."""
    user = _user('org.only@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, sector=org_world['north'], entry_point=org_world['ep_a'],
        is_active=True,
    )

    assert _resolved(user) == {org_world['ep_a'].id}


def test_org_assignment_does_not_grant_a_sibling(org_world):
    user = _user('org.sibling@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, sector=org_world['north'], entry_point=org_world['ep_a'],
        is_active=True,
    )

    assert org_world['ep_b'].id not in _resolved(user)


def test_another_users_org_assignment_grants_nothing(org_world):
    """تعيين شخص آخر لا يُشترى — الانتماء للمستخدم نفسه فقط."""
    other = _user('org.other@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=other, sector=org_world['north'], entry_point=org_world['ep_a'],
        is_active=True,
    )
    user = _user('org.thief@nqp.gov.sd')

    assert resolve_authorized_entry_points(user) == []


# ---------------------------------------------------------------------------
# التوافق: resolve_user_port_ids و resolve_combined_scope_ids
# ---------------------------------------------------------------------------


def test_resolve_user_port_ids_delegates_to_the_canonical_resolver(org_world):
    user = _user('delegate@nqp.gov.sd')
    OrgAssignment.objects.create(
        user=user, station=org_world['station_a'],
        sector=org_world['north'], entry_point=org_world['ep_a'], is_active=True,
    )
    _assign_role(user, 'STATION', org_world['station_a'].id)

    assert set(resolve_user_port_ids(user)) == {org_world['ep_a'].id}


def test_resolve_user_port_ids_keeps_unrestricted_contract(org_world):
    user = _user('delegate.global@nqp.gov.sd')
    _assign_role(user, 'GLOBAL', None)

    assert resolve_user_port_ids(user) is None


def test_resolve_combined_scope_ids_reports_geometry_and_company_separately(org_world):
    """البُعد الجغرافي vient من المحلّ المعتمد، وCOMPANY يبقى مستقلاً."""
    user = _user('combined@nqp.gov.sd')
    _assign_role(user, 'POINT', org_world['ep_a'].id, role_code='CB')

    info = resolve_combined_scope_ids(user)
    assert info['has_port_scope'] is True
    assert set(info['port_ids']) == {org_world['ep_a'].id}
    assert info['has_company_scope'] is False
    assert info['company_ids'] is None


def test_resolve_combined_scope_ids_asserts_geometry_for_department_scope(org_world):
    """نطاق DEPARTMENT يُطالب بالبُعد الجغرافي (كان يُهمَل سابقاً)."""
    user = _user('combined.dept@nqp.gov.sd')
    _assign_role(user, 'DEPARTMENT', org_world['dept_north'].id, role_code='CB')

    info = resolve_combined_scope_ids(user)
    assert info['has_port_scope'] is True


def test_resolve_combined_scope_ids_unrestricted_when_global(org_world):
    user = _user('combined.global@nqp.gov.sd')
    _assign_role(user, 'GLOBAL', None, role_code='CB')

    info = resolve_combined_scope_ids(user)
    assert info['port_ids'] is None
    assert info['has_port_scope'] is False


# ---------------------------------------------------------------------------
# مركز الاعتماد الصريح عن بُعد النطاق
# ---------------------------------------------------------------------------


def test_scope_opt_out_is_off_by_default():
    """الافتراضي فشل آمن: غياب النطاق لا يعني تغطية عامة."""

    class PlainView:
        pass

    assert scope_is_optional(PlainView()) is False
    assert SCOPE_OPT_OUT_ATTR == 'scope_optional'


def test_scope_opt_out_requires_an_explicit_declaration():
    class OptedOutView:
        scope_optional = True

    assert scope_is_optional(OptedOutView()) is True