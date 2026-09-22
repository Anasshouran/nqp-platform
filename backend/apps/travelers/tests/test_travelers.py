import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from ..models import Country, Traveler

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def country(db):
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


def test_register_traveler_public(api_client, country):
    response = api_client.post(
        '/api/v1/travelers/',
        {
            'passport_number': 'A1234567',
            'first_name': 'محمد',
            'last_name': 'أحمد',
            'date_of_birth': '1990-05-15',
            'nationality': 'SD',
            'phone': '+249123456789',
            'email': 'mohamed@example.com',
            'medical_history': {'diabetes': False, 'hypertension': True},
        },
        format='json',
    )
    assert response.status_code == 201
    data = response.data['data']
    assert data['passport_number'] == 'A1234567'
    assert data['registration_status'] == 'PENDING_DOCUMENTS'
    assert data['full_name'] == 'محمد أحمد'


def test_register_endpoint_public(api_client, country):
    response = api_client.post(
        '/api/v1/travelers/register/',
        {
            'passport_number': 'REG12345',
            'first_name': 'سارة',
            'last_name': 'محمد',
            'date_of_birth': '1995-03-10',
            'nationality': 'SD',
        },
        format='json',
    )
    assert response.status_code == 201
    data = response.data['data']
    assert data['passport_number'] == 'REG12345'
    assert data['registration_status'] == 'PENDING_DOCUMENTS'


def test_personal_info_endpoint(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='PI123456',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.patch(
        f'/api/v1/travelers/{traveler.id}/personal-info/',
        {'email': 'update@example.com', 'phone': '+249911223344'},
        format='json',
    )
    assert response.status_code == 200
    traveler.refresh_from_db()
    assert traveler.email == 'update@example.com'
    assert response.data['data']['phone'] == '+249911223344'


def test_submit_endpoint(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='SUB12345',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.post(f'/api/v1/travelers/{traveler.id}/submit/')
    assert response.status_code == 200
    traveler.refresh_from_db()
    assert traveler.registration_status == Traveler.RegistrationStatus.UNDER_REVIEW
    assert response.data['data']['registration_status'] == 'UNDER_REVIEW'


def test_list_delete_download_documents(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='DOC-LIST',
        first_name='سارة',
        last_name='محمد',
        date_of_birth='1995-03-10',
        nationality=country,
    )
    uploaded = SimpleUploadedFile(
        'passport.jpg', b'fake-image-content', content_type='image/jpeg'
    )
    created = api_client.post(
        f'/api/v1/travelers/{traveler.id}/documents/',
        {'document_type': 'PASSPORT', 'file': uploaded},
        format='multipart',
    )
    assert created.status_code == 201
    doc_id = created.data['data']['id']
    assert created.data['data']['file_size'] is not None

    listing = api_client.get(f'/api/v1/travelers/{traveler.id}/documents/')
    assert listing.status_code == 200
    assert len(listing.data['data']) == 1
    assert listing.data['data'][0]['document_type'] == 'PASSPORT'

    download = api_client.get(f'/api/v1/travelers/{traveler.id}/documents/{doc_id}/download/')
    assert download.status_code == 200
    assert download.data['data']['doc_id'] == doc_id

    deleted = api_client.delete(f'/api/v1/travelers/{traveler.id}/documents/{doc_id}/')
    assert deleted.status_code == 204
    listing_after = api_client.get(f'/api/v1/travelers/{traveler.id}/documents/')
    assert len(listing_after.data['data']) == 0


def test_duplicate_passport_rejected(api_client, country):
    payload = {
        'passport_number': 'B9876543',
        'first_name': 'Ali',
        'last_name': 'Hassan',
        'date_of_birth': '1985-01-01',
        'nationality': 'SD',
    }
    api_client.post('/api/v1/travelers/', payload, format='json')
    response = api_client.post('/api/v1/travelers/', payload, format='json')
    assert response.status_code == 400


def test_upload_document(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    uploaded = SimpleUploadedFile(
        'passport.jpg', b'fake-file-content', content_type='image/jpeg'
    )
    response = api_client.post(
        f'/api/v1/travelers/{traveler.id}/documents/',
        {'document_type': 'PASSPORT', 'file': uploaded},
        format='multipart',
    )
    assert response.status_code == 201
    traveler.refresh_from_db()
    assert traveler.registration_status == 'UNDER_REVIEW'


def test_get_status(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.get(f'/api/v1/travelers/{traveler.id}/status/')
    assert response.status_code == 200
    data = response.data['data']
    assert data['registration_status'] == 'PENDING_DOCUMENTS'
    assert data['qr_code_issued'] is False
    assert data['rejection_reason'] is None


def test_timeline_after_submit(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='TIMELINE1',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.get(f'/api/v1/travelers/{traveler.id}/timeline/')
    assert response.status_code == 200
    assert response.data['data'] == []

    api_client.post(f'/api/v1/travelers/{traveler.id}/submit/')
    response = api_client.get(f'/api/v1/travelers/{traveler.id}/timeline/')
    assert response.status_code == 200
    logs = response.data['data']
    assert len(logs) == 1
    assert logs[0]['to_status'] == 'UNDER_REVIEW'
    assert logs[0]['from_status'] == 'PENDING_DOCUMENTS'


def test_review_action_required_and_require_auth(api_client, admin_api, country, db):
    traveler = Traveler.objects.create(
        passport_number='REVIEW1',
        first_name='سارة',
        last_name='محمد',
        date_of_birth='1995-03-10',
        nationality=country,
    )
    anonymous = APIClient()
    anonymous_response = anonymous.post(
        f'/api/v1/travelers/{traveler.id}/review/',
        {'registration_status': 'ACTION_REQUIRED'},
        format='json',
    )
    assert anonymous_response.status_code == 401

    response = admin_api.post(
        f'/api/v1/travelers/{traveler.id}/review/',
        {'registration_status': 'ACTION_REQUIRED', 'note': 'يرجى إعادة رفع شهادة التطعيم'},
        format='json',
    )
    assert response.status_code == 200
    traveler.refresh_from_db()
    assert traveler.registration_status == 'ACTION_REQUIRED'

    status = admin_api.get(f'/api/v1/travelers/{traveler.id}/status/')
    assert status.data['data']['action_required'] is True

    timeline = admin_api.get(f'/api/v1/travelers/{traveler.id}/timeline/')
    assert timeline.data['data'][0]['to_status'] == 'ACTION_REQUIRED'
    assert timeline.data['data'][0]['note'] == 'يرجى إعادة رفع شهادة التطعيم'


def test_review_reject_requires_reason(admin_api, country, db):
    traveler = Traveler.objects.create(
        passport_number='REVIEW2',
        first_name='أحمد',
        last_name='علي',
        date_of_birth='1988-07-21',
        nationality=country,
    )
    response = admin_api.post(
        f'/api/v1/travelers/{traveler.id}/review/',
        {'registration_status': 'REJECTED'},
        format='json',
    )
    assert response.status_code == 400

    response = admin_api.post(
        f'/api/v1/travelers/{traveler.id}/review/',
        {'registration_status': 'REJECTED', 'rejection_reason': 'مستندات غير مكتملة'},
        format='json',
    )
    assert response.status_code == 200
    traveler.refresh_from_db()
    assert traveler.registration_status == 'REJECTED'
    assert traveler.rejection_reason == 'مستندات غير مكتملة'


def test_get_qr_code(api_client, country, db):
    import hashlib

    traveler = Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    from django.conf import settings
    import base64
    import hmac
    import json

    response = api_client.get(f'/api/v1/travelers/{traveler.id}/qr-code/')
    assert response.status_code == 200
    data = response.data['data']
    assert data['qr_code'].startswith('data:image/png;base64,')
    payload = data['qr_data']
    assert payload['traveler_id'] == str(traveler.id)
    assert payload['passport_hash'] == hashlib.sha256(b'A1234567').hexdigest()
    assert 'signature' in payload and 'expires_at' in payload
    expected = {k: payload[k] for k in ['traveler_id', 'passport_hash', 'issued_at', 'expires_at']}
    sig = hmac.new(settings.SECRET_KEY.encode(), json.dumps(expected, separators=(',', ':'), sort_keys=True).encode(), hashlib.sha256).hexdigest()
    assert payload['signature'] == sig


def test_qr_download(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.get(f'/api/v1/travelers/{traveler.id}/qr-code/download/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'image/png'


def test_qr_refresh(api_client, country, db):
    traveler = Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.post(f'/api/v1/travelers/{traveler.id}/qr-code/refresh/')
    assert response.status_code == 200
    data = response.data['data']
    assert data['qr_code'].startswith('data:image/png;base64,')
    assert 'signature' in data['qr_data']


def test_qr_verify_requires_auth(api_client):
    response = api_client.post('/api/v1/travelers/qr-code/verify/', {'payload': 'x'}, format='json')
    assert response.status_code == 401


def test_traveler_list_requires_auth(api_client, country, db):
    Traveler.objects.create(
        passport_number='A1234567',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth='1990-05-15',
        nationality=country,
    )
    response = api_client.get('/api/v1/travelers/')
    assert response.status_code == 401


@pytest.fixture
def admin_api(api_client, db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    admin = User.objects.create_user(
        email='admin@nqp.gov.sd', password='StrongPass123!', full_name='Admin'
    )
    admin.is_staff = True
    admin.is_superuser = True
    admin.save(update_fields=['is_staff', 'is_superuser'])
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'admin@nqp.gov.sd', 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


def test_traveler_search_and_page_size(admin_api, country):
    Traveler.objects.create(
        passport_number='SD-100', first_name='محمد', last_name='أحمد',
        date_of_birth='1990-05-15', nationality=country,
    )
    Traveler.objects.create(
        passport_number='SD-200', first_name='فاطمة', last_name='علي',
        date_of_birth='1992-01-20', nationality=country,
    )
    response = admin_api.get('/api/v1/travelers/', {'search': 'محمد'})
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data['results']) == 1
    assert data['results'][0]['passport_number'] == 'SD-100'

    response = admin_api.get('/api/v1/travelers/', {'page_size': 1})
    body = response.json()['data']
    assert len(body['results']) == 1
    assert body['count'] == 2
    assert body['next'] is not None


def test_traveler_status_filter(admin_api, country):
    pending = Traveler.objects.create(
        passport_number='SD-300', first_name='محمد', last_name='أحمد',
        date_of_birth='1990-05-15', nationality=country,
    )
    Traveler.objects.create(
        passport_number='SD-400', first_name='فاطمة', last_name='علي',
        date_of_birth='1992-01-20', nationality=country,
        registration_status=Traveler.RegistrationStatus.REJECTED,
    )
    response = admin_api.get('/api/v1/travelers/', {'registration_status': 'REJECTED'})
    assert response.status_code == 200
    results = response.json()['data']['results']
    assert len(results) == 1
    assert results[0]['id'] != str(pending.id)
    assert results[0]['registration_status'] == 'REJECTED'


def test_traveler_ordering(admin_api, country):
    Traveler.objects.create(
        passport_number='SD-500', first_name='زياد', last_name='بكر',
        date_of_birth='1990-05-15', nationality=country,
    )
    Traveler.objects.create(
        passport_number='SD-600', first_name='أحمد', last_name='سالم',
        date_of_birth='1992-01-20', nationality=country,
    )
    response = admin_api.get('/api/v1/travelers/', {'ordering': 'first_name'})
    results = response.json()['data']['results']
    assert len(results) == 2
    assert results[0]['first_name'] == 'أحمد'
    assert results[1]['first_name'] == 'زياد'
