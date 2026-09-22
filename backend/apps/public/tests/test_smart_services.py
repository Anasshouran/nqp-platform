import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient

from apps.carriers.models import Carrier, CarrierCompanyType, Flight
from apps.food_quarantine.models import FoodReleaseCertificate, FoodShipment
from apps.masterdata.models import EntryPoint as Port
from apps.organization.models import Sector as OrgSector
from apps.masterdata.models import Sector as MasterSector, State as MasterState
from apps.travelers.models import Country

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def country(db):
    return Country.objects.create(
        code='SDN', name='Sudan', name_ar='السودان', risk_level=Country.RiskLevel.YELLOW
    )


@pytest.fixture
def port(db):
    ms, _c = MasterSector.objects.get_or_create(code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'})
    st, _c2 = MasterState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': ms}
    )
    org = OrgSector.objects.create(
        code='SEC_KRT', name_ar='قطاع الخرطوم', name_en='Khartoum Sector',
        region='KHARTOUM', color='#0D47A1',
    )
    return Port.objects.create(
        code='SDKRT', name_ar='مطار الخرطوم', name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT, state=st, sector=org,
    )


@pytest.fixture
def carrier(db, country):
    return Carrier.objects.create(
        name='بدر للطيران', name_en='Badr Airlines', company_type=CarrierCompanyType.NATIONAL,
        country=country, iata_code='J4', icao_code='BDR',
    )


@pytest.fixture
def flight(db, carrier, country, port):
    return Flight.objects.create(
        flight_number='J4001',
        carrier=carrier,
        flight_type=Flight.FlightType.AIR,
        origin_code='KRT',
        origin_country=country,
        destination_port=port,
        scheduled_departure=timezone.now() - timedelta(hours=1),
        scheduled_arrival=timezone.now() + timedelta(hours=2),
        status=Flight.FlightStatus.SCHEDULED,
    )


@pytest.fixture
def shipment(db, port):
    return FoodShipment.objects.create(
        manifest_number='NQC-1001',
        port=port,
        supplier_name='مورد الاختبار',
        origin_country='إثيوبيا',
        product_list=[{'name_ar': 'قمح', 'quantity': '500 طن'}],
        arrival_date=timezone.localdate(),
        total_weight_kg='500000.00',
        status=FoodShipment.ShipmentStatus.RELEASED,
        final_decision=FoodShipment.FinalDecision.COMPLIANT,
    )


def test_flight_status_found(api_client, flight):
    response = api_client.get('/api/v1/public/flights/', {'flight_number': 'J4001'})
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'success'
    row = body['data'][0]
    assert row['flight_number'] == 'J4001'
    assert row['carrier_name'] == 'Badr Airlines'
    assert row['status_label'] == 'مجدولة'
    assert 'destination_name' in row


def test_flight_status_partial_number(api_client, flight):
    response = api_client.get('/api/v1/public/flights/', {'flight_number': 'J40'})
    assert response.status_code == 200
    assert response.json()['data'][0]['flight_number'] == 'J4001'


def test_flight_status_requires_number(api_client):
    response = api_client.get('/api/v1/public/flights/')
    assert response.status_code == 400


def test_flight_status_not_found(api_client):
    response = api_client.get('/api/v1/public/flights/', {'flight_number': 'ZZZ99'})
    assert response.status_code == 404


def test_shipment_track_by_manifest(api_client, shipment):
    response = api_client.get('/api/v1/public/food/shipments/lookup/', {'reference': 'NQC-1001'})
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'success'
    data = body['data']
    assert data['manifest_number'] == 'NQC-1001'
    assert data['status_label'] == 'تم الإفراج'
    assert data['products'][0]['name'] == 'قمح'


def test_shipment_track_by_release_certificate(api_client, shipment, country):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        username='issuer', email='issuer@nqp.gov.sd', password='x', is_staff=True
    )
    cert = FoodReleaseCertificate.objects.create(
        shipment=shipment, certificate_number='FRC-2026-0001', issued_by=user,
        certificate_data={'products': shipment.product_list},
    )
    response = api_client.get('/api/v1/public/food/shipments/lookup/', {'reference': 'frc-2026-0001'})
    assert response.status_code == 200
    assert response.json()['data']['release_certificate'] == 'FRC-2026-0001'


def test_shipment_track_requires_reference(api_client):
    response = api_client.get('/api/v1/public/food/shipments/lookup/')
    assert response.status_code == 400


def test_shipment_track_not_found(api_client):
    response = api_client.get('/api/v1/public/food/shipments/lookup/', {'reference': 'NOPE-999'})
    assert response.status_code == 404