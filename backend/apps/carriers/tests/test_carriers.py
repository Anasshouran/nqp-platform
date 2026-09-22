import csv
import io

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country, Traveler

from ..models import Carrier, CarrierMember, Flight, HealthNotice, PassengerManifest, NoticeAcknowledgement

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def world(db):
    sudan = Country.objects.get_or_create(code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'})[0]
    egypt = Country.objects.get_or_create(code='EG', defaults={'name': 'Egypt', 'name_ar': 'مصر'})[0]
    port = Port.objects.create(
        state=_ep_state(),
        code='SDKRT', name_ar='مطار الخرطوم', name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )
    return {'sudan': sudan, 'egypt': egypt, 'port': port}


@pytest.fixture
def carrier(world):
    return Carrier.objects.create(
        name='سودان إير', iata_code='SU', icao_code='SUD', is_active=True,
        email='ops@sudanair.example',
    )


@pytest.fixture
def rep(carrier):
    user = User.objects.create_user(email='rep@nqp.gov.sd', password='StrongPass123!', full_name='منسق شركة')
    CarrierMember.objects.create(user=user, carrier=carrier, is_primary=True, is_active=True)
    return user


@pytest.fixture
def auth_client(rep):
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': rep.email, 'password': 'StrongPass123!'}, format='json')
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def staff_client():
    user = User.objects.create_user(email='staff@nqp.gov.sd', password='StrongPass123!', full_name='مدير', is_staff=True)
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'StrongPass123!'}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def test_company_profile_get_and_update(auth_client, carrier):
    resp = auth_client.get('/api/v1/carriers/company/profile/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['name'] == 'سودان إير'
    assert data['iata_code'] == 'SU'

    resp = auth_client.put(
        '/api/v1/carriers/company/profile/',
        {'email': 'new@example.com', 'phone': '+249 900 111 222'},
        format='json',
    )
    assert resp.status_code == 200
    carrier.refresh_from_db()
    assert carrier.email == 'new@example.com'

    # منع تعديل الحقول المحمية من البوابة
    resp = auth_client.put('/api/v1/carriers/company/profile/', {'name': 'ممنوع'}, format='json')
    assert resp.status_code == 400


def test_api_key_regenerate(auth_client, carrier):
    resp = auth_client.get('/api/v1/carriers/company/api-key/')
    assert resp.status_code == 200
    old = carrier.api_key
    assert old is None

    resp = auth_client.post('/api/v1/carriers/company/api-key/regenerate/', format='json')
    assert resp.status_code == 200
    new_key = resp.json()['data']['api_key']
    assert new_key and new_key.startswith('nqp_')

    carrier.refresh_from_db()
    # لا يُخزَّن النص الصريح أبداً — تُحفَظ البصمة فقط
    assert carrier.api_key and len(carrier.api_key) == 64
    assert carrier.api_key == Carrier.hash_key(new_key)
    assert carrier.api_key != new_key
    assert carrier.has_api_key is True


def test_portal_flight_create_and_validation(auth_client, carrier, world):
    payload = {
        'flight_number': 'SUD101',
        'flight_type': 'AIR',
        'origin_code': 'CAI',
        'origin_country': 'EG',
        'destination_port': 'SDKRT',
        'scheduled_departure': timezone.now().isoformat(),
        'scheduled_arrival': (timezone.now() + timezone.timedelta(hours=2)).isoformat(),
    }
    resp = auth_client.post('/api/v1/carriers/flights/', payload, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['carrier_name'] == 'سودان إير'
    assert data['status'] == 'SCHEDULED'

    # منع التكرار (نفس رقم الرحلة + موعد الوصول)
    resp = auth_client.post('/api/v1/carriers/flights/', payload, format='json')
    assert resp.status_code == 400

    # شركة أخرى لا يمكنها التعديل
    other = Carrier.objects.create(name='مصر للطيران', iata_code='MS')
    other_flight = Flight.objects.create(
        flight_number='MSR100', carrier=other, flight_type='AIR', origin_code='CAI',
        origin_country=world['egypt'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=3),
    )
    resp = auth_client.patch(f"/api/v1/carriers/flights/{other_flight.id}/", {'notes': 'x'}, format='json')
    assert resp.status_code == 404

    # حماية الحذف بعد الوصول
    resp = auth_client.patch(f"/api/v1/carriers/flights/{data['id']}/status/", {'status': 'ARRIVED'}, format='json')
    assert resp.status_code == 200
    resp = auth_client.delete(f"/api/v1/carriers/flights/{data['id']}/")
    assert resp.status_code == 400


def test_manifest_upload_and_report(auth_client, world, carrier):
    flight, _ = Flight.objects.get_or_create(
        flight_number='SUD102', carrier=carrier, defaults={
            'flight_type': 'AIR', 'origin_code': 'CAI', 'origin_country': world['egypt'],
            'destination_port': world['port'],
            'scheduled_arrival': timezone.now() + timezone.timedelta(hours=2),
        },
    )
    Traveler.objects.create(passport_number='A123', date_of_birth='1990-05-15', nationality=world['sudan'])  # مسافر مسجل مسبقاً
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=['passport_number', 'first_name', 'last_name', 'date_of_birth', 'nationality_code'])
    writer.writeheader()
    writer.writerow({'passport_number': 'A123', 'first_name': 'محمد', 'last_name': 'أحمد', 'date_of_birth': '1990-05-15', 'nationality_code': 'SD'})
    writer.writerow({'passport_number': 'B456', 'first_name': 'أحمد', 'last_name': 'حسن', 'date_of_birth': '1985-10-20', 'nationality_code': 'EG'})

    from django.core.files.uploadedfile import SimpleUploadedFile

    resp = auth_client.post(
        f'/api/v1/carriers/flights/{flight.id}/manifest/upload/',
        {'file': SimpleUploadedFile('manifest.csv', buf.getvalue().encode('utf-8-sig'), content_type='text/csv')},
        format='multipart',
    )
    assert resp.status_code == 201, resp.json()
    flight.refresh_from_db()
    assert flight.status == 'MANIFEST_UPLOADED'

    report = auth_client.get(f'/api/v1/carriers/flights/{flight.id}/manifest/report/')
    assert report.status_code == 200
    data = report.json()['data']
    assert data['total'] == 2
    assert data['pre_registered'] == 1
    assert data['not_registered'] == 1

    errors = auth_client.get(f'/api/v1/carriers/flights/{flight.id}/manifest/errors/')
    assert errors.status_code == 200
    assert errors['Content-Type'].startswith('text/csv')


def test_notices_acknowledge(auth_client, carrier):
    notice, _ = HealthNotice.objects.get_or_create(
        title='إشعار تجريبي', defaults={
            'category': HealthNotice.NoticeCategory.GENERAL,
            'priority': HealthNotice.NoticePriority.MEDIUM,
            'description': 'نص تجريبي',
        },
    )
    resp = auth_client.get('/api/v1/carriers/notices/')
    assert resp.status_code == 200
    data = resp.json()['data']['results'][0]
    assert data['acknowledged'] is False

    resp = auth_client.post(f'/api/v1/carriers/notices/{notice.id}/acknowledge/', format='json')
    assert resp.status_code == 200
    assert NoticeAcknowledgement.objects.filter(carrier=carrier, notice=notice).exists()


def test_reports_kpi(auth_client, carrier, world):
    Flight.objects.create(
        flight_number='SUD200', carrier=carrier, flight_type='AIR', origin_code='CAI',
        origin_country=world['egypt'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=1),
    )
    resp = auth_client.get('/api/v1/carriers/reports/kpi/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['month_flights'] >= 1
    assert data['compliance']['active_notices'] is not None


def test_integration_with_api_key(world, carrier):
    plain = carrier.generate_api_key()
    carrier.save()
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=plain)

    resp = client.post('/api/v1/carriers/integration/flights/', {
        'flight_number': 'SUD500',
        'origin_code': 'CAI',
        'destination_port_code': 'SDKRT',
        'scheduled_arrival': (timezone.now() + timezone.timedelta(hours=3)).isoformat(),
        'passengers': [
            {'passport_number': 'X111', 'first_name': 'Ali', 'last_name': 'Omar', 'nationality_code': 'SD'},
            {'passport_number': 'X222', 'first_name': 'Sara', 'last_name': 'Nour', 'nationality_code': 'EG', 'date_of_birth': '1992-01-01'},
        ],
    }, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    flight_id = data['flight_id']

    status_resp = client.get(f'/api/v1/carriers/integration/flights/{flight_id}/status/')
    assert status_resp.status_code == 200
    assert status_resp.json()['data']['status'] == 'SCHEDULED'

    manifest_resp = client.post('/api/v1/carriers/integration/flights/manifest', {
        'flight': flight_id,
        'passengers': [{'passport_number': 'X333', 'first_name': 'Nada', 'last_name': 'Yusuf', 'nationality_code': 'SD'}],
    }, format='json')
    assert manifest_resp.status_code in (200, 201)

    # مفتاح خاطئ مرفوض (401 Unauthorized وفق وثائق التكامل)
    bad = APIClient()
    bad.credentials(HTTP_X_API_KEY='nqp_wrong')
    resp = bad.post('/api/v1/carriers/integration/flights/', {'flight_number': 'SUD501'}, format='json')
    assert resp.status_code == 401


def test_documented_airlines_integration_points(world, carrier):
    """الوثائق (Airlines.md) تنص على /api/v1/integration/airlines/* بمفتاح API لكل شركة."""
    plain = carrier.generate_api_key()
    carrier.save()
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=plain)

    flights_resp = client.post('/api/v1/integration/airlines/flights/', {
        'flight_number': 'BDR8810',
        'destination_port_code': 'SDKRT',
        'scheduled_departure': (timezone.now() + timezone.timedelta(hours=2)).isoformat(),
        'scheduled_arrival': (timezone.now() + timezone.timedelta(hours=6)).isoformat(),
    }, format='json')
    assert flights_resp.status_code == 201, flights_resp.content
    flight_id = flights_resp.json()['data']['flight_id']

    manifest_resp = client.post('/api/v1/integration/airlines/manifest/', {
        'flight_number': 'BDR8810',
        'passengers': [
            {'passport_number': 'X901', 'first_name': 'Adel', 'last_name': 'Bashir', 'nationality_code': 'SD'},
            {'passport_number': 'X902', 'first_name': 'Lina', 'last_name': 'Hassan', 'nationality_code': 'EG', 'seat_number': '14B'},
        ],
    }, format='json')
    assert manifest_resp.status_code in (200, 201), manifest_resp.content
    assert manifest_resp.json()['data']['total_passengers'] == 2

    from apps.carriers.models import Flight

    flight = Flight.objects.get(id=flight_id)
    manifest = flight.manifests.order_by('-created_at').first()
    assert manifest is not None
    assert manifest.total_passengers == 2
    assert manifest.error_report == {'errors': []}

    notices_resp = client.get('/api/v1/integration/airlines/notices/')
    assert notices_resp.status_code == 200
    assert isinstance(notices_resp.json()['data'], list)

    bad = APIClient()
    bad.credentials(HTTP_X_API_KEY='nqp_wrong')
    denied = bad.post('/api/v1/integration/airlines/manifest/', {'flight_number': 'BDR8810'}, format='json')
    assert denied.status_code == 401


def test_dashboard_stats(auth_client, carrier, world):
    Flight.objects.create(
        flight_number='SUD300', carrier=carrier, flight_type='AIR', origin_code='CAI',
        origin_country=world['egypt'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=1),
    )
    resp = auth_client.get('/api/v1/carriers/dashboard/stats/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['upcoming_today'] >= 1
    assert data['notices']['active'] >= 0
    assert data['api']['configured'] is False
    assert 'pre_registration_rate' in data


def test_dashboard_upcoming_and_notices_recent(auth_client, carrier, world):
    Flight.objects.create(
        flight_number='SUD400', carrier=carrier, flight_type='AIR', origin_code='CAI',
        origin_country=world['egypt'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=2),
    )
    up = auth_client.get('/api/v1/carriers/dashboard/upcoming/')
    assert up.status_code == 200
    items = up.json()['data']
    assert any(f['flight_number'] == 'SUD400' for f in items)
    assert all('route' in f and 'manifest_status' in f for f in items)

    rec = auth_client.get('/api/v1/carriers/notices/recent/')
    assert rec.status_code == 200
    assert isinstance(rec.json()['data'], list)


@pytest.fixture
def flight(world, carrier):
    return Flight.objects.create(
        flight_number='SUD600', carrier=carrier, flight_type='AIR', origin_code='CAI',
        origin_country=world['egypt'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=2),
    )


def test_registration_request_submit_and_review(world):
    anon = APIClient()

    resp = anon.post('/api/v1/carriers/registrations/', {
        'company_name': 'شركة الطيران الجديدة',
        'contact_name': 'مدير الشركة',
        'email': 'new@carrier.example',
        'iata_code': 'NA',
        'phone': '+249 000 111',
    }, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == 'PENDING'
    req_id = data['id']

    staff = User.objects.create_user(
        email='staff@nqp.gov.sd', password='StrongPass123!', full_name='مدير', is_staff=True,
    )
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': staff.email, 'password': 'StrongPass123!'}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")

    admin_list = client.get('/api/v1/carriers/registrations/')
    assert admin_list.status_code == 200
    assert admin_list.json()['data']['count'] == 1

    resp = client.post(f'/api/v1/carriers/registrations/{req_id}/review/', {
        'decision': 'APPROVED', 'review_notes': 'الوثائق سليمة',
    }, format='json')
    assert resp.status_code == 200, resp.content
    data = resp.json()['data']
    assert data['status'] == 'APPROVED'
    assert data['carrier_name'] == 'شركة الطيران الجديدة'

    # غير الموظفين لا يرون ملف الطلبات ولا يراجعونها
    anon_list = anon.get('/api/v1/carriers/registrations/')
    assert anon_list.status_code in (401, 403)


def test_flight_health_event_report_transition_escalate(auth_client, flight):
    resp = auth_client.post('/api/v1/carriers/health-events/', {
        'flight': flight.id,
        'category': 'SYMPTOM_ALERT',
        'severity': 'HIGH',
        'description': 'على متن الرحلة حالة أعراض تنفسية',
        'affected_count': 2,
    }, format='json')
    assert resp.status_code == 201, resp.content
    event = resp.json()['data']
    assert event['status'] == 'REPORTED'
    assert event['flight_number'] == 'SUD600'
    assert event['reported_via'] == 'PORTAL'

    trans = auth_client.post(f"/api/v1/carriers/health-events/{event['id']}/transition/", {
        'status': 'UNDER_REVIEW', 'note': 'بدأ المراجعة',
    }, format='json')
    assert trans.status_code == 200, trans.content
    assert trans.json()['data']['status'] == 'UNDER_REVIEW'

    escalate = auth_client.post(f"/api/v1/carriers/health-events/{event['id']}/escalate/", {
        'summary': 'تصعيد إلى غرفة الطوارئ',
    }, format='json')
    assert escalate.status_code == 200, escalate.content
    assert escalate.json()['data']['emergency_event_id']


def test_integration_rate_limit_and_audit(world, carrier):
    plain = carrier.generate_api_key()
    carrier.rate_limit_per_minute = 1
    carrier.save()

    client = APIClient()
    client.credentials(HTTP_X_API_KEY=plain)

    first = client.get('/api/v1/carriers/integration/health-notices/')
    assert first.status_code == 200

    second = client.get('/api/v1/carriers/integration/health-notices/')
    assert second.status_code == 429, second.content

    from ..models import CarrierApiUsageLog

    logs = CarrierApiUsageLog.objects.filter(carrier=carrier).order_by('-created_at')
    assert logs.count() >= 2
    assert logs.first().is_rate_limited is True
    assert logs.first().status_code == 429


def test_integration_scope_and_allowed_ips(world, carrier):
    plain = carrier.generate_api_key()
    carrier.api_scopes = ['flights']
    carrier.save()
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=plain)

    denied = client.post('/api/v1/carriers/integration/health-events/', {
        'flight': '', 'description': 'x',
    }, format='json')
    assert denied.status_code == 401, denied.content

    carrier.api_scopes = ['flights', 'health_events']
    carrier.allowed_ips = ['203.0.113.5']
    carrier.save()
    blocked = client.post('/api/v1/carriers/integration/health-events/', {
        'description': 'x',
    }, format='json')
    assert blocked.status_code == 401


def test_manifest_with_errors_stays_completed_but_reports(auth_client, world, carrier, flight):
    from django.core.files.uploadedfile import SimpleUploadedFile

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=['passport_number', 'first_name', 'last_name', 'nationality_code'])
    writer.writeheader()
    writer.writerow({'passport_number': 'C1', 'first_name': 'صلاح', 'last_name': 'محمد', 'nationality_code': 'SD'})
    writer.writerow({'passport_number': 'C2', 'first_name': 'فاطمة', 'last_name': 'نور', 'nationality_code': 'ZZ'})

    resp = auth_client.post(
        f'/api/v1/carriers/flights/{flight.id}/manifest/upload/',
        {'file': SimpleUploadedFile('errors.csv', buf.getvalue().encode('utf-8-sig'), content_type='text/csv')},
        format='multipart',
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == 'COMPLETED'
    assert data['total_passengers'] == 2
    assert len(data['error_report']['errors']) == 1


def test_carrier_admin_create_with_new_fields(staff_client, world):
    resp = staff_client.post('/api/v1/carriers/companies/', {
        'name': 'بدر للطيران',
        'name_en': 'Badr Airlines',
        'iata_code': 'J4',
        'icao_code': 'BDR',
        'company_type': 'NATIONAL',
        'country': 'SD',
        'ports': ['SDKRT'],
    }, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['name_en'] == 'Badr Airlines'
    assert data['country'] == 'SD'
    assert data['country_name'] == 'السودان'
    assert data['ports'] == ['SDKRT']
    assert data['ports_names'] == ['مطار الخرطوم']
    assert data['company_type_label'] == 'شركة طيران وطنية'
    assert data['registration_status'] == 'APPROVED'

    carrier_db = Carrier.objects.get(iata_code='J4')
    assert carrier_db.country.code == 'SD'
    assert list(carrier_db.ports.values_list('code', flat=True)) == ['SDKRT']


def test_carrier_admin_regenerate_api_key(staff_client, world):
    carrier = Carrier.objects.create(name='شركة تجربة', iata_code='TJ', is_active=True)
    info = staff_client.get(f'/api/v1/carriers/companies/{carrier.id}/api-key/')
    assert info.status_code == 200, info.content
    assert info.json()['data']['api_key'] is None

    resp = staff_client.post(f'/api/v1/carriers/companies/{carrier.id}/regenerate-api-key/', format='json')
    assert resp.status_code == 200, resp.content
    new_key = resp.json()['data']['api_key']
    assert new_key and new_key.startswith('nqp_')

    carrier.refresh_from_db()
    # البصمة تحفظ SHA-256 وليس النص الصريح
    assert carrier.api_key == Carrier.hash_key(new_key)
    assert carrier.api_key != new_key
    assert new_key[-4:] in carrier.api_key_display

    info2 = staff_client.get(f'/api/v1/carriers/companies/{carrier.id}/api-key/')
    # استعلام المعلومات يُظهر المعاينة المقنّعة ولا يُعيد النص الكامل
    assert info2.json()['data']['api_key'] == carrier.api_key_display
    assert info2.json()['data']['api_key'] != new_key


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

