"""اختبارات التسلسل الزمني للطلب (UI-019).

`GET /api/v1/food/shipments/{id}/timeline/` — أحداث `FoodShipmentEvent` الثابتة
بترتيب زمني تصاعدي، مقيدة بصلاحية `food:view` ونطاق منافذ المستخدم.
"""
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import RoleAssignment, ScopeType
from apps.masterdata.models import EntryPoint as Port

from ..models import FoodShipment, FoodShipmentEvent

pytestmark = pytest.mark.django_db

User = get_user_model()


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def port(db):
    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def port_b(db):
    return Port.objects.create(
        state=_ep_state(),
        code='SDPPD',
        name_ar='ميناء بورتسودان',
        name_en='Port Sudan Port',
        kind=Port.Kind.SEAPORT,
    )


def _auth_client(api_client, email='timeline.user@nqp.gov.sd'):
    user = User.objects.create_user(
        email=email, password='StrongPass123!', full_name='مستخدم التسلسل الزمني'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client, user


def _shipment_payload(port, manifest='TIMELINE-2026-0001'):
    return {
        'manifest_number': manifest,
        'port': port.code,
        'supplier_name': 'شركة الاختبار الغذائية',
        'origin_country': 'Egypt',
        'arrival_date': '2026-08-20',
        'shipment_type': 'IMPORT',
        'as_draft': True,
        'items': [{'product_name': 'أرز', 'weight_kg': 500, 'package_count': 50}],
    }


def _make_shipment(auth_client, port, manifest):
    resp = auth_client.post(
        '/api/v1/food/shipments/', _shipment_payload(port, manifest), format='json'
    )
    assert resp.status_code == 201, resp.content
    return resp.json()['data']['id']


def test_timeline_requires_authentication(api_client, port):
    shipment_id = None
    resp = api_client.get(f'/api/v1/food/shipments/{shipment_id or "00000000-0000-0000-0000-000000000000"}/timeline/')
    assert resp.status_code == 401


def test_timeline_returns_events_chronologically(api_client, port):
    client, _ = _auth_client(api_client)
    shipment_id = _make_shipment(client, port, 'TIMELINE-2026-0001')
    shipment = FoodShipment.objects.get(id=shipment_id)
    # نُفرّغ أحداث الإنشاء التلقائي وننشئ أحداثاً بترتيب زمني تحكمه مواعيدها فقط
    shipment.events.all().delete()

    now = timezone.now()
    FoodShipmentEvent.objects.create(
        shipment=shipment, stage=FoodShipmentEvent.Stage.SUBMITTED,
        actor=None, occurred_at=now - timedelta(days=2), message='أُرسل الطلب',
    )
    FoodShipmentEvent.objects.create(
        shipment=shipment, stage=FoodShipmentEvent.Stage.DECISION,
        actor=None, occurred_at=now, message='القرار النهائي',
    )
    FoodShipmentEvent.objects.create(
        shipment=shipment, stage=FoodShipmentEvent.Stage.FEES_CONFIRMED,
        actor=None, occurred_at=now - timedelta(days=1), message='تأكيد الرسوم',
    )

    resp = client.get(f'/api/v1/food/shipments/{shipment_id}/timeline/')
    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body['status'] == 'success'
    events = body['data']
    assert [e['stage'] for e in events] == ['SUBMITTED', 'FEES_CONFIRMED', 'DECISION']

    first = events[0]
    assert set(first) == {
        'id', 'shipment', 'stage', 'stage_label', 'message', 'actor', 'actor_name', 'occurred_at',
    }
    assert first['shipment'] == shipment_id
    assert first['stage_label'] == 'تم إرسال الطلب'
    assert first['message'] == 'أُرسل الطلب'
    assert first['actor'] is None
    assert first['actor_name'] is None
    assert first['occurred_at']


def test_timeline_empty_for_shipment_without_events(api_client, port):
    client, _ = _auth_client(api_client)
    shipment_id = _make_shipment(client, port, 'TIMELINE-2026-0002')
    FoodShipment.objects.get(id=shipment_id).events.all().delete()

    resp = client.get(f'/api/v1/food/shipments/{shipment_id}/timeline/')
    assert resp.status_code == 200
    assert resp.json()['data'] == []


def test_timeline_scoped_to_user_ports(api_client, grant_food, port, port_b):
    client, _ = _auth_client(api_client)
    shipment_a = _make_shipment(client, port, 'TIMELINE-SCOPE-A')
    shipment_b = _make_shipment(client, port_b, 'TIMELINE-SCOPE-B')

    # مستخدم نطاقه PORT على المنفذ الأول فقط
    scoped_client = APIClient()
    scoped_user = User.objects.create_user(
        email='scope.user@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم النطاق'
    )
    # نُلغي التعيين GLOBAL التلقائي من conftest ونمنح PORT على المنفذ الأول
    scoped_user.role_assignments.filter(scope_type=ScopeType.GLOBAL).delete()
    grant_food(scoped_user, 'FOOD_INSPECTOR', scope_type=ScopeType.PORT, scope_id=port.pk)
    login = scoped_client.post(
        '/api/v1/auth/login/',
        {'email': 'scope.user@nqp.gov.sd', 'password': 'StrongPass123!'},
        format='json',
    )
    scoped_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )

    resp_ok = scoped_client.get(f'/api/v1/food/shipments/{shipment_a}/timeline/')
    assert resp_ok.status_code == 200, resp_ok.content

    resp_denied = scoped_client.get(f'/api/v1/food/shipments/{shipment_b}/timeline/')
    # خارج نطاق المستخدم ⇒ لا يوجد كائن أصلاً (404 وليس 403) لتفادي تسريب وجوده
    assert resp_denied.status_code in (403, 404)


def test_timeline_requires_food_view_permission(api_client, port):
    client, user = _auth_client(api_client, email='noperm.user@nqp.gov.sd')
    shipment_id = _make_shipment(client, port, 'TIMELINE-NOPERM')

    # نجرد المستخدم من كل تعيينات الأدوار ⇒ لا يملك food:view
    user.role_assignments.all().delete()

    resp = client.get(f'/api/v1/food/shipments/{shipment_id}/timeline/')
    assert resp.status_code == 403


def test_timeline_404_for_unknown_shipment(api_client):
    client, _ = _auth_client(api_client)
    resp = client.get(
        '/api/v1/food/shipments/00000000-0000-0000-0000-000000000000/timeline/'
    )
    assert resp.status_code == 404


def test_timeline_actor_attribution(api_client, port):
    client, user = _auth_client(api_client)
    shipment_id = _make_shipment(client, port, 'TIMELINE-ACTOR')
    shipment = FoodShipment.objects.get(id=shipment_id)
    shipment.events.all().delete()
    FoodShipmentEvent.objects.create(
        shipment=shipment, stage=FoodShipmentEvent.Stage.RELEASED,
        actor=user, occurred_at=timezone.now(), message='تم الإفراج',
    )

    resp = client.get(f'/api/v1/food/shipments/{shipment_id}/timeline/')
    assert resp.status_code == 200
    event = resp.json()['data'][0]
    assert event['actor'] == str(user.pk)
    assert event['actor_name'] == 'مستخدم التسلسل الزمني'