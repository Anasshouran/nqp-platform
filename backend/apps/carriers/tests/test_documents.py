import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country

from ..models import Carrier, CarrierDocument, CarrierMember, Flight
from .conftest import assign_carrier_role

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = 'StrongPass123!'


@pytest.fixture
def world(db):
    sudan = Country.objects.get_or_create(code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'})[0]
    port = Port.objects.create(
        state=_ep_state(), code='SDKRT', name_ar='مطار الخرطوم', name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )
    other_port = Port.objects.create(
        state=_ep_state(), code='SDELM', name_ar='مطار بورتسودان', name_en='Port Sudan Airport',
        kind=Port.Kind.AIRPORT,
    )
    return {'sudan': sudan, 'port': port, 'other_port': other_port}


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _ = MSector.objects.get_or_create(code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'})
    state, _ = MState.objects.get_or_create(code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector})
    return state


@pytest.fixture
def carrier(world):
    return Carrier.objects.create(name='سودان اير', iata_code='SA', icao_code='SDN', is_active=True)


@pytest.fixture
def other_carrier(world):
    return Carrier.objects.create(name='مصر للطيران', iata_code='MS', icao_code='MSR', is_active=True)


@pytest.fixture
def flight(carrier, world):
    return Flight.objects.create(
        flight_number='SA101', carrier=carrier, flight_type=Flight.FlightType.AIR,
        origin_code='CAI', origin_country=world['sudan'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=2),
    )


@pytest.fixture
def other_flight(other_carrier, world):
    return Flight.objects.create(
        flight_number='MS999', carrier=other_carrier, flight_type=Flight.FlightType.AIR,
        origin_code='DXB', origin_country=world['sudan'], destination_port=world['other_port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=3),
    )


def _client_for(email, user=None):
    if user is None:
        user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client, user


@pytest.fixture
def auth_client(carrier):
    user = User.objects.create_user(email='rep@nqp.gov.sd', password=PASSWORD, full_name='منسق شركة')
    assign_carrier_role(user)
    CarrierMember.objects.create(user=user, carrier=carrier, is_primary=True, is_active=True)
    return _client_for(user.email, user)[0]


@pytest.fixture
def other_auth_client(other_carrier):
    user = User.objects.create_user(email='other@nqp.gov.sd', password=PASSWORD, full_name='منسق آخر')
    assign_carrier_role(user)
    CarrierMember.objects.create(user=user, carrier=other_carrier, is_primary=True, is_active=True)
    return _client_for(user.email, user)[0]


@pytest.fixture
def staff_client():
    return _client_for('staff@nqp.gov.sd', User.objects.create_user(
        email='staff@nqp.gov.sd', password=PASSWORD, full_name='مدير', is_staff=True,
    ))[0]


def _pdf():
    return SimpleUploadedFile('doc.pdf', b'%PDF-1.4 test', content_type='application/pdf')


def test_carrier_can_create_and_list_download_own_document(auth_client, flight, carrier):
    client = auth_client
    resp = client.post('/api/v1/carriers/documents/', {
        'carrier': carrier.iata_code,
        'flight': str(flight.id),
        'document_type': 'FLIGHT_DOCUMENT',
        'title': 'Aircraft docs',
        'file': _pdf(),
    }, format='multipart')
    assert resp.status_code == 201, resp.content
    doc_id = resp.json()['data']['id']

    listed = client.get('/api/v1/carriers/documents/')
    assert listed.status_code == 200
    assert listed.json()['data']['count'] == 1

    downloaded = client.get(f'/api/v1/carriers/documents/{doc_id}/download/')
    assert downloaded.status_code == 200
    assert downloaded['Content-Type'] == 'application/pdf'


def test_carrier_cannot_create_document_with_other_flight(auth_client, other_flight):
    client = auth_client
    resp = client.post('/api/v1/carriers/documents/', {
        'flight': str(other_flight.id),
        'document_type': 'FLIGHT_DOCUMENT',
        'file': _pdf(),
    }, format='multipart')
    assert resp.status_code == 400


def test_other_carrier_cannot_access_document(auth_client, other_auth_client, flight, carrier):
    create = auth_client.post('/api/v1/carriers/documents/', {
        'document_type': 'FLIGHT_DOCUMENT',
        'title': 'Doc A',
        'file': _pdf(),
    }, format='multipart')
    assert create.status_code == 201
    doc_id = create.json()['data']['id']

    assert other_auth_client.get(f'/api/v1/carriers/documents/{doc_id}/').status_code == 404
    assert other_auth_client.get(f'/api/v1/carriers/documents/{doc_id}/download/').status_code == 404
    assert other_auth_client.delete(f'/api/v1/carriers/documents/{doc_id}/').status_code == 404


def test_anonymous_cannot_list_documents():
    client = APIClient()
    resp = client.get('/api/v1/carriers/documents/')
    assert resp.status_code in (401, 403)


def test_staff_can_access_all_documents(staff_client, flight, carrier):
    create = staff_client.post('/api/v1/carriers/documents/', {
        'carrier': carrier.iata_code,
        'flight': str(flight.id),
        'document_type': 'HEALTH_DOCUMENT',
        'title': 'Admin doc',
        'file': _pdf(),
    }, format='multipart')
    assert create.status_code == 201, create.content
    listed = staff_client.get('/api/v1/carriers/documents/')
    assert listed.status_code == 200
    assert listed.json()['data']['count'] == 1


def test_delete_document(auth_client, flight, carrier):
    create = auth_client.post('/api/v1/carriers/documents/', {
        'document_type': 'OTHER',
        'title': 'Temp',
        'file': _pdf(),
    }, format='multipart')
    doc_id = create.json()['data']['id']
    delete = auth_client.delete(f'/api/v1/carriers/documents/{doc_id}/')
    assert delete.status_code == 204
    assert not CarrierDocument.objects.filter(id=doc_id).exists()
