"""M8-B.0 — F-01: عزل شركات النقل يجب أن يُفشل مغلقًا (fail closed).

العيب الأصلي (F-01): كان النطاق مبنيًا على
``carrier = get_portal_carrier(user)`` ثم ``if carrier: qs.filter(...)`` بلا
فرع بديل — فغياب العضوية النشطة كان يعني "بلا تقييد". المستخدم الذي يحمل
`flights:*` دون عضوية كان يقرأ رحلات كل الشركات وينشئ رحلات باسم شركة يختارها
من الطلب، و`_guard_company` كان لا يفعل شيئًا عند `carrier is None`.

الثوابت التي تتحققها هذه الاختبارات:
    * عضو نشط        ⇒ شركة العضوية فقط
    * عضوية معطّلة   ⇒ لا شيء
    * بلا عضوية      ⇒ لا شيء
    * مُدخل مزوّر    ⇒ لا يمكن تحويله إلى شركة أخرى
    * فاعل إداري قائم ⇒ سلوكه السابق بلا تغيير

يُستخدم `conftest.assign_carrier_role` واصطلاحات تسجيل الدخول نفسها المستعملة
في بقية اختبارات التفويض، دون بنية اختبار موازية.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country

from ..models import Carrier, CarrierMember, Flight, FlightHealthEvent

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = 'StrongPass123!'
FLIGHTS_URL = '/api/v1/carriers/flights/'
EVENTS_URL = '/api/v1/carriers/health-events/'
EVENTS_READ_URL = '/api/v1/carriers/health-events/mine/'


# ---------------------------------------------------------------------------
# أدوات مشتركة للاختبار
# ---------------------------------------------------------------------------
@pytest.fixture
def two_carriers(db):
    """شركتان: A (مملوكة للمستخدم) و B (أخرى)."""
    carrier_a = Carrier.objects.create(name='شركة أ', iata_code='AA', is_active=True)
    carrier_b = Carrier.objects.create(name='شركة ب', iata_code='BB', is_active=True)
    return {'a': carrier_a, 'b': carrier_b}


@pytest.fixture
def entry_point(db):
    Country.objects.get_or_create(code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'})
    Country.objects.get_or_create(code='EG', defaults={'name': 'Egypt', 'name_ar': 'مصر'})
    from apps.masterdata.models import Sector, State

    sector, _ = Sector.objects.get_or_create(code='SEC_F01', defaults={'name_ar': 'قطاع'})
    state, _ = State.objects.get_or_create(
        code='ST_F01', defaults={'name_ar': 'ولاية', 'sector': sector}
    )
    return Port.objects.create(
        state=state, code='F01PT', name_ar='منفذ', name_en='Port', kind=Port.Kind.AIRPORT,
    )


def _flight(carrier, number, port):
    return Flight.objects.create(
        flight_number=number, carrier=carrier, flight_type='AIR', origin_code='CAI',
        origin_country=Country.objects.get(code='EG'), destination_port=port,
        scheduled_departure=timezone.now() + timezone.timedelta(days=1),
        scheduled_arrival=timezone.now() + timezone.timedelta(days=1, hours=2),
    )


def _event(flight, **extra):
    defaults = {
        'flight': flight,
        'category': FlightHealthEvent.HealthEventCategory.SUSPECTED_INFECTION,
        'description': 'حالة مشتبه بها',
        'reported_via': 'PORTAL',
        'reporter_name': 'منسق',
    }
    defaults.update(extra)
    return FlightHealthEvent.objects.create(**defaults)


def _event_payload(flight):
    return {
        'flight': str(flight.id),
        'category': FlightHealthEvent.HealthEventCategory.SUSPECTED_INFECTION,
        'description': 'حالة مشتبه بها',
        'reporter_name': 'اختراق',
    }


def _payload(carrier, number):
    return {
        'flight_number': number,
        'flight_type': 'AIR',
        'carrier': carrier.iata_code,
        'origin_code': 'CAI',
        'origin_country': 'EG',
        'destination_port': 'F01PT',
        'scheduled_departure': (timezone.now() + timezone.timedelta(days=2)).isoformat(),
        'scheduled_arrival': (timezone.now() + timezone.timedelta(days=2, hours=2)).isoformat(),
    }


def _client_for(email, *, member=None, is_staff=False, codes=()):
    """عميل مصادَق؛ `member=None` يعني «بلا عضوية»."""
    from .conftest import assign_carrier_role, ensure_carrier_role

    user = User.objects.create_user(
        email=email, password=PASSWORD, full_name=email, is_staff=is_staff,
    )
    if codes:
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
            code=f'F01_{email.split("@")[0]}', name='f01', name_ar='ف01',
            default_scope=RoleAssignment.ScopeType.GLOBAL,
        )
        role.permissions.set(perms)
        RoleAssignment.objects.create(
            user=user, role=role, scope_type=RoleAssignment.ScopeType.GLOBAL,
            assigned_by=user, is_active=True,
        )
    else:
        assign_carrier_role(user)
    if member is not None:
        CarrierMember.objects.create(
            user=user, carrier=member, is_primary=True, is_active=True,
        )

    from rest_framework.test import APIClient

    client = APIClient()
    resp = client.post('/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json')
    assert resp.status_code == 200, resp.content
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client, user


def _numbers(resp):
    return {row['flight_number'] for row in _rows(resp)}


def _rows(resp):
    data = resp.json()['data']
    return data if isinstance(data, list) else data['results']


# ---------------------------------------------------------------------------
# الاختبار A — عضوية نشطة تعزل الرحلات على شركة العضوية
# ---------------------------------------------------------------------------
def test_active_membership_isolates_flights_to_own_carrier(two_carriers, entry_point):
    _flight(two_carriers['a'], 'F01-A1', entry_point)
    _flight(two_carriers['b'], 'F01-B1', entry_point)
    client, _ = _client_for('f01-active@nqp.gov.sd', member=two_carriers['a'])

    resp = client.get(FLIGHTS_URL)

    assert resp.status_code == 200
    assert _numbers(resp) == {'F01-A1'}, 'رحلة شركة أخرى تسرّبت إلى عضو نشط'


# ---------------------------------------------------------------------------
# الاختبار B — لا عضوية ⇒ لا رحلات إطلاقًا
# ---------------------------------------------------------------------------
def test_no_membership_cannot_list_flights(two_carriers, entry_point):
    _flight(two_carriers['a'], 'F01-A2', entry_point)
    _flight(two_carriers['b'], 'F01-B2', entry_point)
    client, _ = _client_for('f01-nomember@nqp.gov.sd')

    resp = client.get(FLIGHTS_URL)

    assert resp.status_code == 200
    assert _numbers(resp) == set(), 'F-01: فهرس الرحلات مفتوح بلا عضوية'


def test_inactive_membership_cannot_list_flights(two_carriers, entry_point):
    _flight(two_carriers['a'], 'F01-A3', entry_point)
    client, user = _client_for('f01-inactive@nqp.gov.sd', member=two_carriers['a'])
    CarrierMember.objects.filter(user=user).update(is_active=False)

    resp = client.get(FLIGHTS_URL)

    assert resp.status_code == 200
    assert _numbers(resp) == set(), 'عضوية معطّلة لا يجوز أن تُبقي فتح البيانات'


# ---------------------------------------------------------------------------
# الاختبار C — لا عضوية ⇒ لا إنشاء (ولا صف في القاعدة)
# ---------------------------------------------------------------------------
def test_no_membership_cannot_create_flight_and_writes_no_row(two_carriers, entry_point):
    _flight(two_carriers['b'], 'F01-B3', entry_point)
    client, _ = _client_for('f01-nomember-write@nqp.gov.sd')

    resp = client.post(FLIGHTS_URL, _payload(two_carriers['a'], 'F01-X1'), format='json')

    assert resp.status_code == 403, resp.content
    assert not Flight.objects.filter(flight_number='F01-X1').exists(), 'F-01: صف رحلة أُنشئ بلا عضوية'


# ---------------------------------------------------------------------------
# الاختبار D — عضو نشط لا يستطيع إنشاء رحلة باسم شركة أخرى
# ---------------------------------------------------------------------------
def test_active_member_cannot_create_flight_for_other_carrier(two_carriers, entry_point):
    """الثابت الأمني: لا رحلة باسم شركة أخرى — إما رفض، أو تثبيت الخادم عليها.

    عقد التطبيق القائم (`perform_create`) يثبّت شركة العضو ويتجاهل الحقل القادم
    من العميل، فالرفض بالـ403 ليس مطلوبًا؛ المطلوب Absence صفر لصف owned by B.
    """
    client, _ = _client_for('f01-spoof@nqp.gov.sd', member=two_carriers['a'])

    resp = client.post(FLIGHTS_URL, _payload(two_carriers['b'], 'F01-X2'), format='json')

    assert resp.status_code in (201, 400), resp.content
    assert not Flight.objects.filter(flight_number='F01-X2', carrier=two_carriers['b']).exists(), \
        'F-01: عضو شركة أ أنشأ رحلة باسم شركة ب'


def test_active_member_create_is_server_pinned_to_own_carrier(two_carriers, entry_point):
    """إن لم يُرفض الطلب، فالخادم هو من يثبّت الشركة — لا الحقل القادم من العميل."""
    client, _ = _client_for('f01-pin@nqp.gov.sd', member=two_carriers['a'])
    payload = _payload(two_carriers['a'], 'F01-X3')
    payload['carrier'] = two_carriers['b'].iata_code

    resp = client.post(FLIGHTS_URL, payload, format='json')

    assert resp.status_code in (201, 400), resp.content
    if resp.status_code == 201:
        flight = Flight.objects.get(flight_number='F01-X3')
        assert flight.carrier_id == two_carriers['a'].id, 'الفاعل ثبّت شركة أخرى من الطلب'


# ---------------------------------------------------------------------------
# الاختبارات E/F — لا عضوية ⇒ لا تعديل ولا حذف لرحلة حالية
# ---------------------------------------------------------------------------
def test_no_membership_cannot_patch_foreign_flight(two_carriers, entry_point):
    foreign = _flight(two_carriers['a'], 'F01-A4', entry_point)
    client, _ = _client_for('f01-nomember-patch@nqp.gov.sd')

    resp = client.patch(f'{FLIGHTS_URL}{foreign.id}/', {'notes': 'اختراق'}, format='json')

    assert resp.status_code in (403, 404), resp.content
    foreign.refresh_from_db()
    assert foreign.notes != 'اختراق'


def test_no_membership_cannot_delete_foreign_flight(two_carriers, entry_point):
    foreign = _flight(two_carriers['a'], 'F01-A5', entry_point)
    client, _ = _client_for('f01-nomember-delete@nqp.gov.sd')

    resp = client.delete(f'{FLIGHTS_URL}{foreign.id}/')

    assert resp.status_code in (403, 404), resp.content
    assert Flight.objects.filter(pk=foreign.pk).exists(), 'F-01: رحلة حُذفت بلا عضوية'


# ---------------------------------------------------------------------------
# الاختبارات G/H/I — الأحداث الصحية للرحلات
# ---------------------------------------------------------------------------
def test_no_membership_cannot_list_health_events(two_carriers, entry_point):
    own_event = _event(_flight(two_carriers['a'], 'F01-A6', entry_point))
    other_event = _event(_flight(two_carriers['b'], 'F01-B6', entry_point))
    client, _ = _client_for('f01-nomember-events@nqp.gov.sd')

    resp = client.get(EVENTS_READ_URL)

    # `IsCarrierRep` بوابة الوصول ترفض العضو الغائب بـ403 قبل بلوغ الـviewset،
    # و`get_queryset` مبنيّ على `qs.none()` احتياطًا إن تغيّرت البوابة يومًا.
    assert resp.status_code == 403, resp.content
    body = resp.content.decode()
    assert str(own_event.id) not in body and str(other_event.id) not in body, \
        'F-01: حدث صحي تسرّب لفاعل بلا عضوية'


def test_active_member_sees_only_own_carrier_events(two_carriers, entry_point):
    own_event = _event(_flight(two_carriers['a'], 'F01-A7', entry_point))
    _event(_flight(two_carriers['b'], 'F01-B7', entry_point))
    client, _ = _client_for('f01-events@nqp.gov.sd', member=two_carriers['a'])

    resp = client.get(EVENTS_READ_URL)

    assert resp.status_code == 200
    ids = {row['id'] for row in _rows(resp)}
    assert ids == {str(own_event.id)}, 'حدث شركة أخرى تسرّب'


def test_no_membership_cannot_create_health_event_and_writes_no_row(two_carriers, entry_point):
    foreign_flight = _flight(two_carriers['a'], 'F01-A8', entry_point)
    client, _ = _client_for('f01-nomember-event-write@nqp.gov.sd')

    resp = client.post(EVENTS_URL, _event_payload(foreign_flight), format='json')

    assert resp.status_code == 403, resp.content
    assert FlightHealthEvent.objects.filter(flight=foreign_flight).count() == 0


def test_active_member_cannot_report_event_on_foreign_flight(two_carriers, entry_point):
    foreign_flight = _flight(two_carriers['b'], 'F01-B8', entry_point)
    client, _ = _client_for('f01-event-spoof@nqp.gov.sd', member=two_carriers['a'])

    resp = client.post(EVENTS_URL, _event_payload(foreign_flight), format='json')

    assert resp.status_code in (400, 403, 404), resp.content
    assert FlightHealthEvent.objects.filter(flight=foreign_flight).count() == 0


def test_no_membership_cannot_touch_foreign_health_event(two_carriers, entry_point):
    foreign_event = _event(_flight(two_carriers['a'], 'F01-A9', entry_point))
    client, _ = _client_for('f01-nomember-event-touch@nqp.gov.sd')

    assert client.get(f'{EVENTS_URL}{foreign_event.id}/').status_code in (403, 404)
    assert client.patch(
        f'{EVENTS_URL}{foreign_event.id}/', {'reporter_name': 'اختراق'}, format='json',
    ).status_code in (403, 404)
    assert client.delete(f'{EVENTS_URL}{foreign_event.id}/').status_code in (403, 404)
    foreign_event.refresh_from_db()
    assert foreign_event.reporter_name != 'اختراق'


# ---------------------------------------------------------------------------
# الاختبار 7 — سلوك الفاعلين الإداريين القائمين يبقى كما كان
# ---------------------------------------------------------------------------
def test_staff_actor_retains_global_access(two_carriers, entry_point):
    _flight(two_carriers['a'], 'F01-ADMIN1', entry_point)
    _flight(two_carriers['b'], 'F01-ADMIN2', entry_point)
    client, _ = _client_for('f01-admin@nqp.gov.sd', is_staff=True)

    resp = client.get(FLIGHTS_URL)

    assert resp.status_code == 200
    assert {'F01-ADMIN1', 'F01-ADMIN2'} <= _numbers(resp)


def test_staff_actor_may_still_create_flight_for_any_carrier(two_carriers, entry_point):
    client, _ = _client_for('f01-admin-create@nqp.gov.sd', is_staff=True)

    resp = client.post(FLIGHTS_URL, _payload(two_carriers['b'], 'F01-ADMIN3'), format='json')

    assert resp.status_code == 201, resp.content
    assert Flight.objects.get(flight_number='F01-ADMIN3').carrier_id == two_carriers['b'].id


def test_staff_actor_may_still_list_all_health_events(two_carriers, entry_point):
    own = _event(_flight(two_carriers['a'], 'F01-ADMIN4', entry_point))
    other = _event(_flight(two_carriers['b'], 'F01-ADMIN5', entry_point))
    client, _ = _client_for('f01-admin-events@nqp.gov.sd', is_staff=True)

    resp = client.get(EVENTS_READ_URL)

    ids = {row['id'] for row in _rows(resp)}
    assert {str(own.id), str(other.id)} <= ids


def test_non_carrier_role_without_membership_gets_empty_flights(two_carriers, entry_point):
    """قدرة `flights:view` بلا عضوية = قراءة صفرية، لا قراءة شاملة."""
    _flight(two_carriers['a'], 'F01-OTHERROLE', entry_point)
    client, _ = _client_for('f01-other-role@nqp.gov.sd', codes=('flights:view',))

    resp = client.get(FLIGHTS_URL)

    assert resp.status_code == 200
    assert _numbers(resp) == set()