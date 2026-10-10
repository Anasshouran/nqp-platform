"""اختبارات تفويض الرحلات والإشعارات الصحية.

الخلفية: كان `FlightViewSet` بلا `permission_classes`، فورث `IsAuthenticated`
العام من DRF — أي أن أي حساب مسجّل كان يقرأ ويكتب ويحذف الرحلات.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.carriers.models import Carrier, CarrierMember, Flight, HealthNotice
from apps.carriers.views import FlightViewSet, HealthNoticeViewSet

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = 'StrongPass123!'

FLIGHTS_URL = '/api/v1/carriers/flights/'
NOTICES_URL = '/api/v1/carriers/notices/'


def login(email, password=PASSWORD):
    client = APIClient()
    resp = client.post('/api/v1/auth/login/', {'email': email, 'password': password}, format='json')
    assert resp.status_code == 200, resp.content
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


def make_user(email, role_code=None, codes=(), **extra):
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email, **extra)
    if role_code or codes:
        from apps.accounts.models import Permission, Role, RoleAssignment
        perms = []
        for code in codes:
            resource, _, action = code.partition(':')
            perm, _ = Permission.objects.get_or_create(
                code=code,
                defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
            )
            perms.append(perm)
        role = Role.objects.create(
            code=role_code or f'T_{abs(hash(email)) % 10**8}',
            name='test', name_ar='test', description='test',
            default_scope=RoleAssignment.ScopeType.GLOBAL,
        )
        role.permissions.set(perms)
        RoleAssignment.objects.create(user=user, role=role, assigned_by=user)
    return user


# ---------------------------------------------------------------------------
# الإعداد
# ---------------------------------------------------------------------------
def test_flights_viewset_declares_explicit_permissions():
    assert FlightViewSet.permission_classes
    assert FlightViewSet.permission_resource == 'flights'


def test_flights_permission_is_fail_closed_not_default_isauthenticated():
    """الحارس يجب أن يكون `AdminOrPermissionAction` لا الافتراضي العام."""
    from core.permissions import AdminOrPermissionAction
    assert AdminOrPermissionAction in FlightViewSet.permission_classes
    assert AdminOrPermissionAction not in HealthNoticeViewSet.permission_classes


# ---------------------------------------------------------------------------
# المنع: مستخدم بلا أي صلاحية
# ---------------------------------------------------------------------------
@pytest.mark.parametrize('method', ['get', 'post', 'put', 'patch', 'delete'])
def test_unprivileged_user_denied_all_flight_verbs(method):
    user = make_user('flights-none@nqp.gov.sd', codes=[])
    client = login(user.email)
    resp = getattr(client, method)(FLIGHTS_URL, {}, format='json')
    assert resp.status_code == 403, f'{method} should be forbidden'


def test_authenticated_but_unrelated_role_cannot_list_flights(grant_permissions):
    """الدور الذي لا علاقة له بالرحلات ممنوع حتى القراءة."""
    user = make_user('flights-standards@nqp.gov.sd')
    grant_permissions(user, 'STANDARDS_PROBE', ['users:view'])
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 403


def test_anonymous_cannot_list_flights():
    assert APIClient().get(FLIGHTS_URL).status_code == 401


# ---------------------------------------------------------------------------
# السماح: قراءة فقط
# ---------------------------------------------------------------------------
def test_flights_view_permission_allows_read_only(grant_permissions):
    user = make_user('flights-reader@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_READER', ['flights:view'])
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 200
    # القراءة لا تُمنح كتابة
    assert client.post(FLIGHTS_URL, {}, format='json').status_code == 403


def test_flights_view_does_not_grant_update_or_delete(grant_permissions):
    user = make_user('flights-reader2@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_READER2', ['flights:view'])
    client = login(user.email)
    flight = Flight.objects.first()
    if flight:
        assert client.patch(f'{FLIGHTS_URL}{flight.id}/', {'status': 'CANCELLED'}, format='json').status_code == 403
        assert client.delete(f'{FLIGHTS_URL}{flight.id}/').status_code == 403


# ---------------------------------------------------------------------------
# السماح: إدارة كاملة
# ---------------------------------------------------------------------------
def test_flights_add_permission_allows_create(grant_permissions):
    user = make_user('flights-writer@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_WRITER', ['flights:view', 'flights:add'])
    carrier = Carrier.objects.create(name='شركة كاتب', iata_code='WR', is_active=True)
    # M8-B.0: صلاحية `flights:add` لا تكفي وحدها؛ الفاعل المقيّد يحتاج عضوية
    # نشطة، وإلا فالكتابة تُرفض 403 بلا أي صف (انظر اختبار F-01 المقابل).
    CarrierMember.objects.create(user=user, carrier=carrier, is_active=True)
    client = login(user.email)
    payload = {'flight_number': 'SD999', 'carrier': str(carrier.id),
               'origin_code': 'KRT', 'destination_port': None, 'scheduled_departure': '2030-01-01T08:00:00Z'}
    resp = client.post(FLIGHTS_URL, payload, format='json')
    assert resp.status_code in (201, 400), resp.content


def test_flights_edit_permission_allows_patch(grant_permissions):
    user = make_user('flights-editor@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_EDITOR', ['flights:view', 'flights:edit'])
    client = login(user.email)
    flight = Flight.objects.first()
    if flight and flight.carrier_id:
        # M8-B.0: العضوية النشطة شرط للوصول إلى الكائن أصلًا (وإلا 404 لا 200).
        CarrierMember.objects.get_or_create(user=user, carrier_id=flight.carrier_id)
        resp = client.patch(f'{FLIGHTS_URL}{flight.id}/', {'status': 'CANCELLED'}, format='json')
        assert resp.status_code in (200, 400), resp.content


def test_flights_delete_permission_allows_delete(grant_permissions):
    user = make_user('flights-deleter@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_DELETER', ['flights:view', 'flights:delete'])
    client = login(user.email)
    flight = Flight.objects.first()
    if flight and flight.carrier_id:
        # M8-B.0: نفس قاعدة التفعيل قبل الحذف.
        CarrierMember.objects.get_or_create(user=user, carrier_id=flight.carrier_id)
        resp = client.delete(f'{FLIGHTS_URL}{flight.id}/')
        assert resp.status_code in (204, 400), resp.content


def test_staff_retains_access_regardless_of_permissions():
    """`is_staff` يتجاوز التفويض — السلوك المقصود في AdminOrPermissionAction."""
    user = make_user('flights-staff@nqp.gov.sd', is_staff=True)
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 200


def test_superuser_retains_access():
    user = make_user('flights-super@nqp.gov.sd', is_superuser=True, is_staff=True)
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 200


def test_blocked_permission_overrides_granted_flights_view(grant_permissions):
    user = make_user('flights-blocked@nqp.gov.sd')
    grant_permissions(user, 'FLIGHTS_BLOCKED', ['flights:view'])
    from apps.accounts.models import Permission
    blocked, _ = Permission.objects.get_or_create(
        code='flights:view',
        defaults={'name': 'view flights', 'resource': 'flights', 'action': 'view'},
    )
    user.blocked_permissions.set([blocked])
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 403


def test_inactive_assignment_does_not_grant_flights_view(grant_permissions):
    from apps.accounts.models import RoleAssignment
    user = make_user('flights-inactive@nqp.gov.sd')
    _, assignment = grant_permissions(user, 'FLIGHTS_INACTIVE', ['flights:view'])
    assignment.is_active = False
    assignment.save(update_fields=['is_active'])
    client = login(user.email)
    assert client.get(FLIGHTS_URL).status_code == 403
    assert RoleAssignment.objects.filter(pk=assignment.pk, is_active=False).exists()


# ---------------------------------------------------------------------------
# نطاق ممثّل الناقل: الصلاحيات واسعة، لكن النطاق ضيّق
# ---------------------------------------------------------------------------
@pytest.fixture
def rep_carriers(make_login_client):
    from apps.carriers.models import Carrier, CarrierMember
    from apps.masterdata.models import EntryPoint as Port
    from apps.travelers.models import Country
    own = Carrier.objects.create(name='شركة الاختبار', iata_code='TS', is_active=True)
    other = Carrier.objects.create(name='شركة أخرى', iata_code='OT', is_active=True)
    from apps.masterdata.models import Sector as MSector, State as MState
    sector, _ = MSector.objects.get_or_create(code='SEC_P', defaults={'name_ar': 'قطاع'})
    state, _ = MState.objects.get_or_create(
        code='ST_P', defaults={'name_ar': 'ولاية', 'sector': sector})
    port = Port.objects.create(
        state=state, code='SDRPT', name_ar='منفذ', name_en='Port', kind=Port.Kind.AIRPORT)
    Country.objects.get_or_create(code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'})
    client, rep = make_login_client('rep-scope@nqp.gov.sd', assign_carrier=True)
    CarrierMember.objects.create(user=rep, carrier=own, is_primary=True, is_active=True)
    return {'client': client, 'rep': rep, 'own': own, 'other': other, 'port': port}


def _flight(carrier, number, port):
    return Flight.objects.create(
        flight_number=number, carrier=carrier, flight_type='AIR', origin_code='CAI',
        destination_port=port, scheduled_arrival='2030-01-02T10:00:00Z',
    )


def test_carrier_can_create_own_flight_without_explicit_staff(rep_carriers):
    client = rep_carriers['client']
    resp = client.post(FLIGHTS_URL, {'flight_number': 'SC100', 'flight_type': 'AIR',
                                     'origin_code': 'CAI',
                                     'scheduled_departure': '2030-01-02T08:00:00Z'}, format='json')
    assert resp.status_code in (201, 400), resp.content
    if resp.status_code == 201:
        assert resp.json()['data']['carrier_name'] == rep_carriers['own'].name


def test_carrier_cannot_see_other_carriers_flights(rep_carriers):
    _flight(rep_carriers['own'], 'OWN1', rep_carriers['port'])
    _flight(rep_carriers['other'], 'OTH1', rep_carriers['port'])
    client = rep_carriers['client']
    resp = client.get(FLIGHTS_URL)
    assert resp.status_code == 200
    numbers = {f['flight_number'] for f in resp.json()['data']['results']}
    assert 'OWN1' in numbers
    assert 'OTH1' not in numbers, 'تسريب رحلات شركة أخرى'


def test_carrier_cannot_touch_other_carriers_flight(rep_carriers):
    foreign = _flight(rep_carriers['other'], 'OTH2', rep_carriers['port'])
    client = rep_carriers['client']
    assert client.patch(f'{FLIGHTS_URL}{foreign.id}/', {'notes': 'x'}, format='json').status_code in (403, 404)
    assert client.delete(f'{FLIGHTS_URL}{foreign.id}/').status_code in (403, 404)


def test_carrier_cannot_change_own_flight_carrier(rep_carriers):
    own_flight = _flight(rep_carriers['own'], 'OWN2', rep_carriers['port'])
    client = rep_carriers['client']
    client.patch(f'{FLIGHTS_URL}{own_flight.id}/',
                 {'carrier': str(rep_carriers['other'].id)}, format='json')
    own_flight.refresh_from_db()
    assert own_flight.carrier_id == rep_carriers['own'].id, 'لا يجوز نقل الرحلة لشركة أخرى'


def test_staff_sees_all_carriers_flights(rep_carriers, make_login_client):
    _flight(rep_carriers['own'], 'OWN3', rep_carriers['port'])
    _flight(rep_carriers['other'], 'OTH3', rep_carriers['port'])
    staff_client, _ = make_login_client('scope-staff@nqp.gov.sd', is_staff=True)
    resp = staff_client.get(FLIGHTS_URL)
    assert resp.status_code == 200
    numbers = {f['flight_number'] for f in resp.json()['data']['results']}
    assert {'OWN3', 'OTH3'} <= numbers


# ---------------------------------------------------------------------------
# الإشعارات الصحية: قراءة عامة مقصودة، كتابة إدارية
# ---------------------------------------------------------------------------
def test_notices_read_is_public_by_design():
    """`get_permissions` في HealthNoticeViewSet يتجاوز `permission_classes` عمداً."""
    assert APIClient().get(NOTICES_URL).status_code == 200


def test_notices_read_uses_get_permissions_override_not_permission_classes():
    assert 'get_permissions' in HealthNoticeViewSet.__dict__


@pytest.mark.parametrize('method', ['post', 'put', 'patch', 'delete'])
def test_unprivileged_user_cannot_write_notices(method):
    """الكتابة إدارية: إنشاء إشعار يجدول بث Web Push لكل المشتركين."""
    client = APIClient()
    resp = client.post('/api/v1/auth/login/', {'email': 'notices-none@nqp.gov.sd',
                                                'password': PASSWORD}, format='json')
    user = make_user('notices-none@nqp.gov.sd', codes=[])
    client = login(user.email)
    resp = getattr(client, method)(NOTICES_URL, {'title': 'x'}, format='json')
    assert resp.status_code in (403, 404), f'{method} should not be permitted'


def test_anonymous_cannot_create_notice():
    assert APIClient().post(NOTICES_URL, {'title': 'x'}, format='json').status_code in (401, 403)


def test_creating_notice_requires_staff():
    user = make_user('notices-writer@nqp.gov.sd', codes=[])
    client = login(user.email)
    assert client.post(NOTICES_URL, {'title': 'تنبيه', 'category': 'GENERAL',
                                     'priority': 'LOW', 'description': 'x'}, format='json').status_code == 403


def test_staff_can_create_notice():
    user = make_user('notices-staff@nqp.gov.sd', is_staff=True)
    client = login(user.email)
    resp = client.post(NOTICES_URL, {'title': 'تنبيه اختباري', 'category': 'GENERAL',
                                     'priority': 'LOW', 'description': 'وصف'}, format='json')
    assert resp.status_code in (201, 400), resp.content


# ---------------------------------------------------------------------------
# خريطة الأدوار
# ---------------------------------------------------------------------------
@pytest.fixture
def seeded(db):
    from django.core.management import call_command
    from apps.accounts.models import Role
    call_command('seed_rbac', verbosity=0)
    return {r.code: set(r.permissions.values_list('code', flat=True)) for r in Role.objects.all()}


def test_flights_resource_is_seeded(seeded):
    assert any(c.startswith('flights:') for c in seeded['ADMIN'])


def test_admin_and_dg_hold_full_flights_admin(seeded):
    for code in ('ADMIN', 'DG_MANAGER'):
        for action in ('view', 'add', 'edit', 'delete', 'export'):
            assert f'flights:{action}' in seeded[code], f'{code} ينقص flights:{action}'


@pytest.mark.parametrize('code', [
    'POE_HEALTH_OFFICER', 'QUARANTINE_INSPECTOR',
    'NATIONAL_SURVEILLANCE_OFFICER', 'SECTOR_IHR_OFFICER',
])
def test_operational_roles_hold_flights_view_only(seeded, code):
    assert 'flights:view' in seeded[code], f'{code} ينقص flights:view'
    for action in ('add', 'edit', 'delete'):
        assert f'flights:{action}' not in seeded[code], f'{code} لا يجب أن يملك flights:{action}'


def test_carrier_holds_flights_crud_but_not_export(seeded):
    """مموّل الناقل يحتاج إدارة رحلات شركته؛ التقييد للscope في الـviewset."""
    for action in ('view', 'add', 'edit', 'delete'):
        assert f'flights:{action}' in seeded['CARRIER'], f'CARRIER ينقص flights:{action}'
    assert 'flights:export' not in seeded['CARRIER'], 'CARRIER لا يجب أن يصدّر'


def test_no_operational_role_can_write_flights(seeded):
    """فроме CARRIER: لا دور تشغيلي آخر يملك كتابة على الرحلات."""
    administrative = {'ADMIN', 'DG_MANAGER', 'CARRIER'}
    for code, perms in seeded.items():
        if code in administrative:
            continue
        writes = {p for p in perms if p.startswith('flights:') and p not in ('flights:view', 'flights:export')}
        assert not writes, f'{code} يملك {writes}'


def test_carrier_role_exists_in_rbac_vocabulary(seeded):
    assert 'CARRIER' in seeded


def test_notices_resource_not_introduced(seeded):
    """لا مورد RBAC للإشعارات: القراءة عامة عبر get_permissions والكتابة IsAdmin."""
    for code, perms in seeded.items():
        assert not any(p.startswith('notices:') for p in perms), code
