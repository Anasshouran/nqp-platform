"""Phase 3B — الفشل الآمن في querysets التي كانت تفضّح كل شيء.

السلوك القديم: غياب نطاق قابل للحل كان يعني «بلا تقييد» ويُعيد `qs`
كاملاً. النتيجة: أي حساب بنطاق `STATION` (وهو نطاق 18 دوراً لا يفهمه
`resolve_user_sectors`) كان يقرأ صفوف المختبر والمكافحة النواقلة والهيكل
التنظيمي من كل القطاعات.

هنا نثبت لكل حالة سلبية متناظرة:
  - حساب بلا أي نطاق           ⇒ لا صفوف.
  - حساب بنطاق `STATION` فقط  ⇒ لا صفوف (الحدّ الذي كان مسرّباً).
  - حساب بنطاق قطاعي          ⇒ قطاعه فقط، لا قطاع غيره.
  - حساب وطني (`GLOBAL`)      ⇒ كل شيء (السلوك المحفوظ عمداً).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint, State
from apps.masterdata.models import Sector as TransportSector
from apps.organization.models import (
    Department,
    OrgAssignment,
    Sector as OrgSector,
    Station,
)
from apps.vector_control.models import VectorTeam, VectorUnit

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def world():
    """قطاعان إداريان، محطة في كل منهما، ونقطة دخول لكل قطاع."""
    transport = TransportSector.objects.create(code='P3BF_TS', name_ar='نقل')
    state = State.objects.create(code='P3BF_MD', name_ar='ولاية', sector=transport)

    north = OrgSector.objects.create(code='P3BF_NORTH', name_ar='شمال')
    kassa = OrgSector.objects.create(code='P3BF_KASSA', name_ar='كسلا')

    ep_north = EntryPoint.objects.create(
        code='P3BF_EP_N', name_ar='معبر شمالي', kind=EntryPoint.Kind.LAND_PORT,
        state=state, sector=north, location='شمال',
    )
    EntryPoint.objects.create(
        code='P3BF_EP_K', name_ar='معبر كسلا', kind=EntryPoint.Kind.LAND_PORT,
        state=state, sector=kassa, location='كسلا',
    )

    dept = Department.objects.create(
        code='P3BF_DEPT_N', name_ar='إدارة الشمال', sector=north,
        kind=Department.Kind.ENTRY_POINT,
    )
    station = Station.objects.create(
        code='P3BF_ST_N', name_ar='محطة الشمال', sector=north,
        department=dept, location='شمال',
    )
    return {'north': north, 'kassa': kassa, 'ep_north': ep_north,
            'dept': dept, 'station': station}


def _actor(api_client, email, *, scope_type='GLOBAL', scope_id=None,
           resources=('laboratory', 'vector', 'organization'),
           with_org_assignment=False, world=None):
    """حساب بصلاحيات `resource:{view,add,edit,delete}` ونطاق واحد محدَّد."""
    from apps.accounts.models import Permission, Role, RoleAssignment

    perms = []
    for resource in resources:
        for action in ('view', 'add', 'edit', 'delete'):
            code = f'{resource}:{action}'
            perm, _ = Permission.objects.get_or_create(
                code=code,
                defaults={'name': f'{action} {resource}', 'resource': resource,
                          'action': action},
            )
            perms.append(perm)
    role = Role.objects.create(
        code=f'P3BF_{email.replace("@", "_").replace(".", "_").upper()[:40]}',
        name=email, default_scope=scope_type,
    )
    role.permissions.add(*perms)

    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )
    if with_org_assignment and world is not None:
        OrgAssignment.objects.create(
            user=user, station=world['station'], department=world['dept'],
            sector=world['north'], entry_point=world['ep_north'], is_active=True,
        )

    login = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


def _vector_rows(sector):
    VectorUnit.objects.create(code='VU-N', name_ar='وحدة شمالية', sector=sector)
    VectorTeam.objects.create(code='VT-N', name_ar='فريق شمالي', sector=sector)


# ---------------------------------------------------------------------------
# SectorFieldScopedMixin — عبر موديول حقيقي يستهلكه (vector_control)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('url', [
    '/api/v1/vector-control/units/',
    '/api/v1/vector-control/teams/',
])
def test_sector_field_scoped_viewset_denies_a_user_with_no_scope(api_client, world, url):
    """لا نطاق ⇒ `[]`. هذا كان تسريباً كاملاً قبل المرحلة 3B."""
    _vector_rows(world['north'])
    # صلاحية بلا نطاق قابل للحل: `scope_type=SECTOR` لكن `scope_id=None`.
    _actor(api_client, 'ff.noscope@nqp.gov.sd', scope_type='SECTOR', scope_id=None)

    res = api_client.get(url)
    assert res.status_code == 200
    assert res.json()['data']['results'] == []


@pytest.mark.parametrize('url', [
    '/api/v1/vector-control/units/',
    '/api/v1/vector-control/teams/',
])
def test_sector_field_scoped_viewset_denies_a_station_only_user(api_client, world, url):
    """نطاق `STATION` لا ينتج قطاعاً ⇒ حجب، لا تسريب عبر كل القطاعات."""
    _vector_rows(world['north'])
    _actor(
        api_client, 'ff.station@nqp.gov.sd',
        scope_type='STATION', scope_id=world['station'].id,
        with_org_assignment=True, world=world,
    )

    res = api_client.get(url)
    assert res.status_code == 200
    assert res.json()['data']['results'] == [], (
        f'{url} كشف صفوف لمستخدم بنطاق STATION فقط'
    )


def test_sector_field_scoped_viewset_isolates_by_sector(api_client, world):
    """الحدّ الإيجابي/السلبي: قطاعي يرى وحدته، ووحدة قطاع آخر لا تظهر له."""
    VectorUnit.objects.create(code='VU-MINE', name_ar='وحدتي', sector=world['north'])
    VectorUnit.objects.create(code='VU-THEIRS', name_ar='وحدتهم', sector=world['kassa'])

    _actor(
        api_client, 'ff.sector@nqp.gov.sd',
        scope_type='SECTOR', scope_id=world['north'].id,
    )

    res = api_client.get('/api/v1/vector-control/units/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert 'VU-MINE' in codes
    assert 'VU-THEIRS' not in codes


def test_sector_field_scoped_viewset_keeps_global_unrestricted(api_client, world):
    """التغطية الوطنية تحتفظ بكل شيء — السلوك الذي لا يجوز كسره."""
    _vector_rows(world['north'])
    _actor(api_client, 'ff.global@nqp.gov.sd', scope_type='GLOBAL', scope_id=None)

    res = api_client.get('/api/v1/vector-control/units/')
    assert res.status_code == 200
    assert res.json()['data']['results'], 'GLOBAL يجب أن يرى كل الوحدات'


# ---------------------------------------------------------------------------
# organization/StationViewSet — كان `if q: ... return qs` (تسريب)
# ---------------------------------------------------------------------------


def test_organization_stations_deny_a_user_with_no_scope(api_client, world):
    _actor(
        api_client, 'ff.org.noscope@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=None,
    )

    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    assert res.json()['data']['results'] == []


def test_organization_stations_deny_an_unrelated_sector_user(api_client, world):
    """مستخدم قطاع كسلا لا يرى محطة الشمال."""
    _actor(
        api_client, 'ff.org.kassa@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=world['kassa'].id,
    )

    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    assert res.json()['data']['results'] == []


def test_organization_stations_allow_own_sector(api_client, world):
    """الإيجابي المقابل: قطاعه يرى محطاته."""
    _actor(
        api_client, 'ff.org.north@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=world['north'].id,
    )

    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert 'P3BF_ST_N' in codes


def test_organization_stations_allow_a_station_scoped_user_its_own_station(api_client, world):
    """نطاق STATION ⇒ محطته هي (مع `scope_type = STATION` على الـ viewset على الـ viewset)."""
    _actor(
        api_client, 'ff.org.station@nqp.gov.sd', resources=('organization',),
        scope_type='STATION', scope_id=world['station'].id,
    )

    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert codes == ['P3BF_ST_N']


# ---------------------------------------------------------------------------
# organization — بقية الـ viewsets (OrgScopedMixin كان `return qs` غير المقيد)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('url', [
    '/api/v1/organization/sectors/',
    '/api/v1/organization/departments/',
    '/api/v1/organization/stations/',
])
def test_organization_viewsets_deny_a_user_with_no_scope(api_client, url):
    _actor(
        api_client, 'ff.org.ns2@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=None,
    )

    res = api_client.get(url)
    assert res.status_code == 200
    assert res.json()['data']['results'] == [], f'{url} كشف صفوف بلا نطاق'


def test_organization_hierarchy_deny_a_user_with_no_scope(api_client):
    _actor(
        api_client, 'ff.tree.ns@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=None,
    )

    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data.get('sectors', []) == []


# ---------------------------------------------------------------------------
# الاستثناء المصرَّح به: جدول مرجعي بلا بُعد نطاق
# ---------------------------------------------------------------------------


def test_org_positions_remain_open_to_any_permitted_user(api_client):
    """`OrgPositionViewSet` يعلن `scope_optional = True` صراحةً.

    المناصب لا تحمل قطاعاً ولا نقطة دخول، فحجبها كان سيكسر شجرة الهيكل بلا
    فائدة أمنية. الاستثناء موثّق باختبار لا مخفيّ.
    """
    from apps.organization.models import OrgPosition

    OrgPosition.objects.create(code='P3BF_POS', name_ar='منصب', level=1)
    _actor(
        api_client, 'ff.pos@nqp.gov.sd', resources=('organization',),
        scope_type='SECTOR', scope_id=None,
    )

    res = api_client.get('/api/v1/organization/positions/')
    assert res.status_code == 200
    assert [r['code'] for r in res.json()['data']['results']] == ['P3BF_POS']


def test_org_positions_still_require_the_action_permission(api_client):
    """الاستثناء على النطاق فقط — لا يلغي بوابة الصلاحية."""
    from apps.organization.models import OrgPosition

    OrgPosition.objects.create(code='P3BF_POS2', name_ar='منصب', level=1)
    user = User.objects.create_user(
        email='ff.pos.noperm@nqp.gov.sd', password=PASSWORD, full_name='x',
    )

    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD}, format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )

    res = api_client.get('/api/v1/organization/positions/')
    assert res.status_code == 403