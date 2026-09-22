import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient

from apps.carriers.models import HealthNotice
from apps.laboratory.models import Disease
from apps.masterdata.models import EntryPoint as Port
from apps.organization.models import Sector
from apps.public.models import ContactMessage, HealthCertificate
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sector(db):
    return Sector.objects.create(
        code='SEC_KRT',
        name_ar='قطاع الخرطوم',
        name_en='Khartoum Sector',
        region='KHARTOUM',
        color='#0D47A1',
    )


@pytest.fixture
def port(db, sector):
    from apps.masterdata.models import Sector as MSector, State as MState

    ms, _c = MSector.objects.get_or_create(code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'})
    st, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': ms}
    )
    return Port.objects.create(
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
        state=st,
        sector=sector,
    )


def test_sectors_public_list(api_client, sector):
    response = api_client.get('/api/v1/public/sectors/')
    assert response.status_code == 200
    data = response.json()['data']
    assert any(item['id'] == str(sector.id) for item in data)


def test_sector_ports_action(api_client, sector, port):
    response = api_client.get(f'/api/v1/public/sectors/{sector.id}/ports/')
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 1
    assert data[0]['code'] == 'SDKRT'


def test_ports_public_list(api_client, port):
    response = api_client.get('/api/v1/public/ports/')
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 1
    assert data[0]['name_ar'] == 'مطار الخرطوم'


def test_ports_map_geojson(api_client, port):
    response = api_client.get('/api/v1/public/ports/map/')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['type'] == 'FeatureCollection'
    assert len(data['features']) == 1
    feature = data['features'][0]
    assert feature['geometry']['type'] == 'Point'
    assert feature['properties']['code'] == 'SDKRT'


def test_port_stats(api_client, port):
    response = api_client.get(f'/api/v1/public/ports/{port.id}/stats/')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['port_id'] == str(port.id)
    assert data['screenings_total'] == 0


def test_diseases_public_list(api_client):
    Disease.objects.create(
        icd_11_code='1A00',
        name_ar='الكوليرا',
        name_en='Cholera',
        symptoms=['إسهال مائي', 'جفاف'],
        is_active=True,
    )
    Disease.objects.create(
        icd_11_code='1C1Z',
        name_ar='الحصبة',
        name_en='Measles',
        is_active=False,
    )
    response = api_client.get('/api/v1/public/diseases/')
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 1
    assert data[0]['icd_11_code'] == '1A00'
    assert 'إسهال مائي' in data[0]['symptoms']


def test_countries_public_list(api_client):
    Country.objects.create(code='SD', name='Sudan', name_ar='السودان', risk_level='GREEN')
    Country.objects.create(code='EG', name='Egypt', name_ar='مصر', risk_level='YELLOW')
    response = api_client.get('/api/v1/public/countries/')
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 2
    codes = {item['code'] for item in data}
    assert codes == {'SD', 'EG'}
    assert any(item['name_ar'] == 'السودان' for item in data)


def test_notices_public_list(api_client):
    HealthNotice.objects.create(
        title='إشعار اختبار',
        description='وصف',
        category=HealthNotice.NoticeCategory.GENERAL,
        is_active=True,
    )
    HealthNotice.objects.create(
        title='إشعار غير نشط',
        description='وصف',
        category=HealthNotice.NoticeCategory.GENERAL,
        is_active=False,
    )
    response = api_client.get('/api/v1/public/notices/')
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 1
    assert data[0]['title'] == 'إشعار اختبار'


def test_travel_requirements_filter(api_client):
    Country.objects.create(code='IN', name='India', name_ar='الهند', risk_level='RED')
    Country.objects.create(code='EG', name='Egypt', name_ar='مصر', risk_level='YELLOW')
    HealthNotice.objects.create(
        title='شهادة تطعيم',
        description='مطلوبة',
        category=HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
        is_active=True,
    )
    HealthNotice.objects.create(
        title='إعلان عام',
        description='لا يظهر',
        category=HealthNotice.NoticeCategory.GENERAL,
        is_active=True,
    )
    response = api_client.get('/api/v1/public/travel-requirements/', {'country': 'IN'})
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 1
    assert data[0]['country_code'] == 'IN'
    assert data[0]['risk_level'] == 'RED'
    assert any(r['title'] == 'شهادة تطعيم' for r in data[0]['requirements'])
    assert not any(r['title'] == 'إعلان عام' for r in data[0]['requirements'])


def test_public_endpoints_require_no_auth(api_client, port):
    for url in [
        '/api/v1/public/sectors/',
        '/api/v1/public/ports/',
        '/api/v1/public/ports/map/',
        '/api/v1/public/diseases/',
        '/api/v1/public/notices/',
        '/api/v1/public/travel-requirements/',
    ]:
        response = api_client.get(url)
        assert response.status_code == 200, f'{url} requires no auth'


def test_contact_message_create_public(api_client):
    response = api_client.post(
        '/api/v1/public/contact/',
        {
            'name': 'محمد أحمد',
            'email': 'mohamed@example.com',
            'phone': '+249 912 000 000',
            'subject': 'استفسار عن متطلبات السفر',
            'message': 'أود الاستفسار عن المستندات المطلوبة للسفر.',
        },
        format='json',
    )
    assert response.status_code == 201
    data = response.json()['data']
    assert data['name'] == 'محمد أحمد'
    assert data['subject'] == 'استفسار عن متطلبات السفر'


def test_contact_message_requires_name_email(api_client):
    response = api_client.post(
        '/api/v1/public/contact/',
        {'subject': 'بدون بيانات', 'message': 'رسالة'},
        format='json',
    )
    assert response.status_code == 400


def test_contact_messages_list_requires_admin(api_client, port):
    response = api_client.get('/api/v1/public/contact/')
    assert response.status_code in (401, 403)


@pytest.fixture
def traveler(db, port):
    country = Country.objects.get_or_create(code='SD', name='Sudan', name_ar='السودان')[0]
    return Traveler.objects.create(
        passport_number='P1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth=date(1990, 1, 1),
        nationality=country,
        registration_status=Traveler.RegistrationStatus.COMPLETED,
    )


def test_traveler_lookup_found(api_client, traveler):
    response = api_client.get('/api/v1/public/lookup/', {'passport': 'p1234567', 'dob': '1990-01-01'})
    assert response.status_code == 200
    data = response.json()['data']
    assert data['found'] is True
    assert data['full_name'] == 'محمد أحمد'
    assert data['qr_issued'] is True


def test_traveler_lookup_rejects_passport_without_dob(api_client, traveler):
    response = api_client.get('/api/v1/public/lookup/', {'passport': 'p1234567'})
    assert response.status_code == 200
    data = response.json()['data']
    assert data['found'] is False
    assert data['error'] == 'PASSPORT_AND_DOB_REQUIRED'


def test_traveler_lookup_rejects_wrong_dob(api_client, traveler):
    response = api_client.get('/api/v1/public/lookup/', {'passport': 'p1234567', 'dob': '1985-05-05'})
    assert response.status_code == 200
    data = response.json()['data']
    assert data['found'] is False
    assert data['error'] == 'NOT_FOUND'


def test_traveler_lookup_not_found(api_client):
    response = api_client.get('/api/v1/public/lookup/', {'passport': 'XXXXXX', 'dob': '1990-01-01'})
    assert response.status_code == 200
    assert response.json()['data']['found'] is False


def test_traveler_lookup_requires_passport_and_dob(api_client):
    response = api_client.get('/api/v1/public/lookup/')
    assert response.status_code == 200
    assert response.json()['data']['error'] == 'PASSPORT_AND_DOB_REQUIRED'


def test_verify_qr_valid(api_client, traveler):
    from core.utils.qr_payload import make_qr_payload

    response = api_client.post('/api/v1/public/verify-qr/', make_qr_payload(traveler), format='json')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['valid'] is True
    assert data['traveler']['passport_number'] == traveler.passport_number


def test_verify_qr_rejects_tampered_signature(api_client, traveler):
    from core.utils.qr_payload import make_qr_payload

    payload = make_qr_payload(traveler)
    payload['passport_hash'] = '0' * 64
    response = api_client.post('/api/v1/public/verify-qr/', payload, format='json')
    assert response.status_code == 200
    assert response.json()['data']['valid'] is False
    assert response.json()['data']['reason'] == 'INVALID_SIGNATURE'


def test_verify_qr_rejects_unknown_traveler(api_client):
    from core.utils.qr_payload import make_qr_payload
    from apps.travelers.models import Traveler as T

    country, _ = Country.objects.get_or_create(code='SD', name='Sudan', name_ar='السودان')
    traveler = T.objects.create(
        passport_number='Z9999999',
        first_name='علي',
        last_name='حسن',
        date_of_birth=date(1990, 1, 1),
        nationality=country,
        registration_status=T.RegistrationStatus.COMPLETED,
    )
    payload = make_qr_payload(traveler)
    traveler.delete()
    response = api_client.post('/api/v1/public/verify-qr/', payload, format='json')
    assert response.json()['data']['valid'] is False
    assert response.json()['data']['reason'] == 'NOT_FOUND'


def test_verify_qr_rejects_pending_traveler(api_client):
    from core.utils.qr_payload import make_qr_payload
    from apps.travelers.models import Traveler as T

    country, _ = Country.objects.get_or_create(code='SD', name='Sudan', name_ar='السودان')
    pending = T.objects.create(
        passport_number='P0000999',
        first_name='سارة',
        last_name='خالد',
        date_of_birth=date(1990, 1, 1),
        nationality=country,
        registration_status=T.RegistrationStatus.PENDING_DOCUMENTS,
    )
    response = api_client.post('/api/v1/public/verify-qr/', make_qr_payload(pending), format='json')
    assert response.json()['data']['valid'] is False
    assert response.json()['data']['reason'] == 'NOT_APPROVED'


def test_verify_qr_rejects_old_issuance(api_client, traveler):
    from core.utils.qr_payload import sign_payload

    signed = {
        'traveler_id': str(traveler.id),
        'passport_hash': '0' * 64,
        'issued_at': '2020-01-01T00:00:00+00:00',
        'expires_at': '2020-01-02T00:00:00+00:00',
    }
    signed['signature'] = sign_payload(signed)
    response = api_client.post('/api/v1/public/verify-qr/', signed, format='json')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['valid'] is False
    assert data['reason'] == 'QR_EXPIRED'


def test_verify_certificate_valid(api_client):
    certificate = HealthCertificate.objects.create(
        certificate_number='NQP-YF-2026-0001',
        traveler_name='محمد أحمد',
        passport_number='P1234567',
        certificate_type=HealthCertificate.CertificateType.VACCINATION,
        disease='الحمى الصفراء',
        issued_date=date.today() - timedelta(days=30),
        expiry_date=date.today() + timedelta(days=300),
    )
    response = api_client.post(
        '/api/v1/public/verify-certificate/',
        {'certificate_number': 'nqp-yf-2026-0001'},
        format='json',
    )
    assert response.status_code == 200
    data = response.json()['data']
    assert data['valid'] is True
    assert data['certificate']['certificate_number'] == certificate.certificate_number


def test_verify_certificate_expired(api_client):
    HealthCertificate.objects.create(
        certificate_number='NQP-EXPIRED-1',
        traveler_name='خالد',
        passport_number='P000',
        issued_date=date.today() - timedelta(days=500),
        expiry_date=date.today() - timedelta(days=100),
    )
    response = api_client.post(
        '/api/v1/public/verify-certificate/',
        {'certificate_number': 'NQP-EXPIRED-1'},
        format='json',
    )
    assert response.status_code == 200
    assert response.json()['data']['valid'] is False
    assert response.json()['data']['reason'] == 'EXPIRED'


def test_verify_certificate_not_found(api_client):
    response = api_client.post(
        '/api/v1/public/verify-certificate/',
        {'certificate_number': 'NOPE'},
        format='json',
    )
    assert response.status_code == 200
    assert response.json()['data']['valid'] is False
    assert response.json()['data']['reason'] == 'NOT_FOUND'


def test_demo_qr_returns_verifiable_payload(api_client, settings):
    settings.ENABLE_DEMO_QR = True
    from core.utils.qr_payload import verify_payload

    response = api_client.get('/api/v1/public/demo-qr/')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['passport_number'] == 'P1234567'
    assert verify_payload(data['qr_data']) is True

    verify = api_client.post('/api/v1/public/verify-qr/', data['qr_data'], format='json')
    assert verify.json()['data']['valid'] is True


def test_vapid_key_endpoint(api_client):
    from core.utils.vapid import get_vapid_public_key

    response = api_client.get('/api/v1/public/webpush/vapid-key/')
    assert response.status_code == 200
    assert response.json()['data']['vapid_public_key'] == get_vapid_public_key()


def test_webpush_subscribe_store_and_upsert(api_client):
    subscription = {
        'endpoint': 'https://push.example.com/send/abc',
        'keys': {'p256dh': 'BEAD-1', 'auth': 'auth-1'},
    }
    first = api_client.post('/api/v1/public/webpush/subscribe/', subscription, format='json')
    assert first.status_code == 201
    first_id = first.json()['data']['id']

    subscription['keys'] = {'p256dh': 'BEAD-2', 'auth': 'auth-2'}
    second = api_client.post('/api/v1/public/webpush/subscribe/', subscription, format='json')
    assert second.status_code == 201
    assert second.json()['data']['id'] == first_id


def test_webpush_subscribe_invalid(api_client):
    response = api_client.post(
        '/api/v1/public/webpush/subscribe/',
        {'endpoint': 'not-a-url'},
        format='json',
    )
    assert response.status_code == 400
