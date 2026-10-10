"""Phase 3B — إنفاذ `OrgAssignment.entry_point` داخل `borders_health`.

الخلل الذي عولج: كان `BordersHealthScopedMixin` يحسب النطاق بنفسه — يفحص
`PORT` ثم يرجع إلى قطاع كامل عبر `resolve_user_sector` — ولا يقرأ
`OrgAssignment.entry_point` إطلاقاً. النتيجة أن تعيينات المرحلة الثانية لم
تكن قابلة للتطبيق في الموديول الذي صُمّمت له: ضابط `EP_ARGIN` كان إمّا
محجوباً كلياً، أو يرى كل معابر الشمال.

كل معبر من معابر المرحلة الثانية العشرة يُختبر ثلاث مرات:
  officer → معبره            = مسموح (قائمة +تفصيل)
  officer → معبر شقيق        = ممنوع
  officer → معبر قطاع آخر    = ممنوع
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.borders_health.models import BorderCrossing
from apps.masterdata.models import EntryPoint
from apps.organization.models import OrgAssignment

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'


@pytest.fixture
def api_client():
    return APIClient()


# المعابر البرية المسمّاة في مصفوفة Phase 2 (العشرة).
NAMED_POES = [
    'EP_ARGIN', 'EP_WADI_HALFA', 'EP_MUTHALLATH', 'EP_GALLABAT', 'EP_ADRE',
    'EP_TINE', 'EP_ASHKEIT', 'EP_ALAFIA', 'EP_OSEIF', 'EP_GABAIT',
]

# السطلتان العامتان — بلا ضابط مخصّص.
GENERIC_POE_BUCKETS = ['EP_ERITREA_BORDER', 'EP_SOUTH_SUDAN_BORDER']


@pytest.fixture
def seeded_world():
    """السجل المرجعي + الهيكل الإداري + المعابر التشغيلية لكل معبر مسمّى."""
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_organization', verbosity=0)

    codes = list(NAMED_POES) + GENERIC_POE_BUCKETS
    crossings = {}
    for code in codes:
        entry_point = EntryPoint.objects.filter(code=code).first()
        if entry_point is None or entry_point.kind != 'LAND_PORT':
            continue
        crossing, _ = BorderCrossing.objects.get_or_create(
            entry_point=entry_point,
            defaults={'neighbor_country': '—', 'operating_status': 'OPEN'},
        )
        crossings[code] = crossing
    return crossings


def _officer(api_client, email, entry_point, *, scope_type='PORT', scope_id=None):
    """ضابط border: تعيين هيكلي إلى نقطة دخوله + `RoleAssignment` بنطاق.

    `scope_id=None` يعني «بلا نطاق دور» عمداً، لاختبار الجسر
    `OrgAssignment.entry_point` وحده — وهو ما كانPhase 2 يزوّد به.
    """
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    OrgAssignment.objects.create(
        user=user, sector=entry_point.sector, entry_point=entry_point,
        is_primary=True, is_active=True,
    )

    role, _ = Role.objects.get_or_create(
        code='P3B_BORDER_OFFICER', defaults={'name': 'ضابط', 'default_scope': 'PORT'},
    )
    perms = []
    for action in ('view', 'add', 'edit', 'delete', 'health_screen'):
        perm, _ = Permission.objects.get_or_create(
            code=f'borders_health:{action}',
            defaults={'name': action, 'resource': 'borders_health', 'action': action},
        )
        perms.append(perm)
    role.permissions.add(*perms)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )

    login = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    assert login.status_code == 200, login.content
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


def _other_crossing_code(entry_point, crossings, *, same_sector):
    """يختار معبراً آخر: داخل قطاع الضابط أو خارجه، حسب `same_sector`."""
    for code, crossing in sorted(crossings.items()):
        if crossing.entry_point_id == entry_point.id:
            continue
        if (crossing.entry_point.sector_id == entry_point.sector_id) == same_sector:
            return code
    return None


def _crossing_codes(api_client):
    res = api_client.get('/api/v1/borders-health/crossings/')
    assert res.status_code == 200, res.content
    return {row['entry_point_code'] for row in res.json()['data']['results']}


# ---------------------------------------------------------------------------
# لكل معبر مسمّى: المسموح والممنوع
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code', NAMED_POES)
def test_officer_sees_only_his_own_crossing(api_client, seeded_world, ep_code):
    """حدّ إيجابي: معبر الضابط ظاهر في القائمة."""
    entry_point = EntryPoint.objects.get(code=ep_code)
    _officer(api_client, f'p3b.{ep_code.lower()}@nqp.gov.sd', entry_point)

    assert _crossing_codes(api_client) == {ep_code}


@pytest.mark.parametrize('ep_code', NAMED_POES)
def test_officer_cannot_read_sibling_crossing(api_client, seeded_world, ep_code):
    """حدّ سلبي: معبر آخر داخل نفس القطاع ممنوع — لا يُورَث القطاع."""
    entry_point = EntryPoint.objects.get(code=ep_code)
    sibling_code = _other_crossing_code(
        entry_point, seeded_world, same_sector=True,
    )
    if sibling_code is None:
        pytest.skip(f'قطاع {ep_code} يحوي معبراً مسمّى واحداً فقط — لا شقيق')

    _officer(api_client, f'p3b.sib.{ep_code.lower()}@nqp.gov.sd', entry_point)

    sibling = seeded_world[sibling_code]
    res = api_client.get(f'/api/v1/borders-health/crossings/{sibling.id}/')
    assert res.status_code in (403, 404), f'ضابط {ep_code} قرأ الشقيق {sibling_code}'


@pytest.mark.parametrize('ep_code', NAMED_POES)
def test_officer_cannot_read_other_sector_crossing(api_client, seeded_world, ep_code):
    """حدّ سلبي: معبر قطاع مختلف ممنوع."""
    entry_point = EntryPoint.objects.get(code=ep_code)
    other_code = _other_crossing_code(entry_point, seeded_world, same_sector=False)
    assert other_code is not None, 'السجل يجب أن يحوي أكثر من قطاع'

    _officer(api_client, f'p3b.oth.{ep_code.lower()}@nqp.gov.sd', entry_point)

    other = seeded_world[other_code]
    res = api_client.get(f'/api/v1/borders-health/crossings/{other.id}/')
    assert res.status_code in (403, 404), f'ضابط {ep_code} قرأ معبر قطاع آخر {other_code}'


@pytest.mark.parametrize('ep_code', NAMED_POES)
def test_officer_detail_of_own_crossing_is_allowed(api_client, seeded_world, ep_code):
    """التفصيل على المعبر المخصّص مسموح — لا يُمنع الإيجابيات مع السالبات."""
    entry_point = EntryPoint.objects.get(code=ep_code)
    _officer(api_client, f'p3b.det.{ep_code.lower()}@nqp.gov.sd', entry_point)

    res = api_client.get(f'/api/v1/borders-health/crossings/{seeded_world[ep_code].id}/')
    assert res.status_code == 200, res.content
    assert res.json()['data']['entry_point_code'] == ep_code


# ---------------------------------------------------------------------------
# الجسر وحده: OrgAssignment.entry_point بلا نطاق دور
# ---------------------------------------------------------------------------


def test_org_assignment_bridge_alone_grants_exactly_one_crossing(api_client, seeded_world):
    """`OrgAssignment.entry_point` وحده يكفي، بلا أي `RoleAssignment` نطاقي."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(
        api_client, 'p3b.bridge@nqp.gov.sd', entry_point,
        scope_type='PORT', scope_id=None,
    )

    assert _crossing_codes(api_client) == {'EP_ARGIN'}


def test_org_assignment_bridge_does_not_widen_to_the_sector(api_client, seeded_world):
    """الحدّ الأهم: الجسر لا يورّث القطاع — معبر واحد فقط."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    _officer(
        api_client, 'p3b.bridge.nowiden@nqp.gov.sd', entry_point,
        scope_type='PORT', scope_id=None,
    )

    visible = _crossing_codes(api_client)

    # قطاع ضابط EP_ARGIN يحوي ثلاثة معابر مسمّاة — يرى واحداً فقط.
    sector_siblings = _other_crossing_code(
        entry_point, seeded_world, same_sector=True,
    )
    assert sector_siblings is not None
    assert sector_siblings not in visible
    assert visible == {'EP_ARGIN'}


def test_port_scope_on_the_same_entry_point_agrees_with_the_org_bridge(api_client, seeded_world):
    """نطاق `PORT` على نفس نقطة الدخول لا يوسّع شيئاً عن الجسر."""
    entry_point = EntryPoint.objects.get(code='EP_ADRE')
    _officer(
        api_client, 'p3b.portscope@nqp.gov.sd', entry_point,
        scope_type='PORT', scope_id=entry_point.id,
    )

    assert _crossing_codes(api_client) == {'EP_ADRE'}


# ---------------------------------------------------------------------------
# الضابط بلا أي نطاق ⇒ حجب، لا ترقية
# ---------------------------------------------------------------------------


def test_officer_with_no_resolvable_scope_sees_nothing(api_client, seeded_world):
    """صلاحية + تعيين هيكلي معطّل ⇒ لا معابر."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    user = _officer(
        api_client, 'p3b.inactive@nqp.gov.sd', entry_point,
        scope_type='PORT', scope_id=None,
    )
    OrgAssignment.objects.filter(user=user).update(is_active=False)

    assert _crossing_codes(api_client) == set()


def test_officer_with_no_role_assignment_is_denied_entirely(api_client, seeded_world):
    """`User.can()` يقرأ `RoleAssignment` فقط — بلاه يُرفض عند البوابة (403)."""
    entry_point = EntryPoint.objects.get(code='EP_ARGIN')
    user = _officer(
        api_client, 'p3b.norole@nqp.gov.sd', entry_point,
        scope_type='PORT', scope_id=None,
    )
    RoleAssignment.objects.filter(user=user).delete()

    res = api_client.get('/api/v1/borders-health/crossings/')
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# السطلتان العامتان تبقيان بلا ضابط
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code', GENERIC_POE_BUCKETS)
def test_generic_buckets_have_no_officer_assignment(api_client, seeded_world, ep_code):
    """السطلتان غير المسمّيين بلا تعيين: `ORGANIZATIONAL_ASSIGNMENT_PENDING`."""
    entry_point = EntryPoint.objects.filter(code=ep_code).first()
    if entry_point is None:
        pytest.skip(f'{ep_code} غير موجود في السجل المرجعي')

    assert not OrgAssignment.objects.filter(entry_point=entry_point).exists()