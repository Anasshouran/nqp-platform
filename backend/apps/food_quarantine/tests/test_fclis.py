import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port

from ..models import AnalysisCertificate, FoodInspection, FoodSample, FoodShipment, LabParameter, SampleTest

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def lab_client(api_client, db):
    user = User.objects.create_user(
        email='lab@nqp.gov.sd', password='StrongPass123!', full_name='موظف المختبر'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def inspector(db):
    return User.objects.create_user(
        email='inspector-fclis@nqp.gov.sd', password='StrongPass123!', full_name='مفتش أغذية'
    )


@pytest.fixture
def port(db):
    from apps.travelers.models import Country

    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT', name_ar='مطار الخرطوم', name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def shipment(port):
    return FoodShipment.objects.create(
        manifest_number='MAN-FCLIS-001', port=port, supplier_name='مورد',
        origin_country='Egypt', arrival_date='2026-08-05', shipment_type='IMPORT',
    )


@pytest.fixture
def inspection(shipment, inspector):
    insp = FoodInspection.objects.create(
        shipment=shipment, inspector=inspector, decision='COMPLIANT',
    )
    return insp


def make_sample(lab_client, inspection):
    res = lab_client.post(
        '/api/v1/food/samples/',
        {'inspection': str(inspection.id), 'sample_type': 'FOOD_PRODUCT', 'bench': 'MICROBIOLOGY'},
        format='json',
    )
    assert res.status_code == 201
    return res.json()['data']


def test_sample_creation_generates_reference(lab_client, inspection):
    data = make_sample(lab_client, inspection)
    assert data['sample_number'].startswith('NQP-')
    assert data['status'] == 'RECEIVED'
    assert data['received_by'] is not None
    sample = FoodSample.objects.get(id=data['id'])
    assert sample.received_at is not None


def test_set_parameters_creates_tests(lab_client, inspection):
    p1 = LabParameter.objects.create(code='SALMONELLA', name_ar='السالمونيلا', name_en='Salmonella', bench='MICROBIOLOGY')
    p2 = LabParameter.objects.create(code='COLIFORM', name_ar='القولونيات', name_en='Coliform', bench='MICROBIOLOGY')
    sample = make_sample(lab_client, inspection)
    res = lab_client.post(
        f"/api/v1/food/samples/{sample['id']}/set-parameters/",
        {'parameters': [str(p1.id), str(p2.id)]},
        format='json',
    )
    assert res.status_code == 200
    assert res.json()['data']['added'] == 2
    sample_obj = FoodSample.objects.get(id=sample['id'])
    assert sample_obj.status == FoodSample.LifecycleStatus.UNDER_TESTING


def test_duplicate_parameter_rejected(lab_client, inspection):
    p1 = LabParameter.objects.create(code='TPC', name_ar='العدد الكلي', name_en='TPC', bench='MICROBIOLOGY')
    sample = make_sample(lab_client, inspection)
    lab_client.post(
        f"/api/v1/food/samples/{sample['id']}/set-parameters/",
        {'parameters': [str(p1.id)]},
        format='json',
    )
    res = lab_client.post(
        f"/api/v1/food/samples/{sample['id']}/set-parameters/",
        {'parameters': [str(p1.id)]},
        format='json',
    )
    assert res.status_code == 200
    assert res.json()['data']['added'] == 0


def test_full_lifecycle_compliant(lab_client, inspection):
    p = LabParameter.objects.create(
        code='MOISTURE', name_ar='الرطوبة', name_en='Moisture', bench='CHEMISTRY',
        unit='%', reference_limit='≤ 10',
    )
    sample = make_sample(lab_client, inspection)
    lab_client.post(
        f"/api/v1/food/samples/{sample['id']}/set-parameters/",
        {'parameters': [str(p.id)]},
        format='json',
    )
    test = SampleTest.objects.get(sample_id=sample['id'], parameter=p)
    res = lab_client.post(
        f'/api/v1/food/sample-tests/{test.id}/enter-result/',
        {'result_value': 5.2, 'unit': '%', 'reference_limit': '≤ 10', 'decision': 'COMPLIANT'},
        format='json',
    )
    assert res.status_code == 200
    assert res.json()['data']['decision'] == 'COMPLIANT'

    approve = lab_client.post(f"/api/v1/food/samples/{sample['id']}/approve/")
    assert approve.status_code == 200
    assert approve.json()['data']['status'] == 'COMPLETED'
    assert approve.json()['data']['approval_status'] == 'APPROVED'

    cert = lab_client.post(f"/api/v1/food/samples/{sample['id']}/certify/")
    assert cert.status_code == 201
    assert cert.json()['data']['certificate_number'].startswith('FCL-')
    assert cert.json()['data']['decision'] == 'COMPLIANT'

    report = lab_client.post(f"/api/v1/food/samples/{sample['id']}/report/")
    assert report.status_code == 200
    shipment = FoodShipment.objects.get(id=inspection.shipment_id)
    assert shipment.status == FoodShipment.ShipmentStatus.RELEASED
    assert report.json()['data']['certificate_number'].startswith('FCL-')


def test_non_compliant_result_rejects_sample(lab_client, inspection):
    p = LabParameter.objects.create(
        code='SALMONELLA', name_ar='السالمونيلا', name_en='Salmonella', bench='MICROBIOLOGY'
    )
    sample = make_sample(lab_client, inspection)
    lab_client.post(
        f"/api/v1/food/samples/{sample['id']}/set-parameters/",
        {'parameters': [str(p.id)]},
        format='json',
    )
    test = SampleTest.objects.get(sample_id=sample['id'], parameter=p)
    lab_client.post(
        f'/api/v1/food/sample-tests/{test.id}/enter-result/',
        {'result_text': 'إيجابي', 'decision': 'NON_COMPLIANT'},
        format='json',
    )
    approve = lab_client.post(f"/api/v1/food/samples/{sample['id']}/approve/")
    assert approve.status_code == 200
    assert approve.json()['data']['status'] == 'REJECTED'
    cert = lab_client.post(f"/api/v1/food/samples/{sample['id']}/certify/")
    assert cert.json()['data']['decision'] == 'NON_COMPLIANT'
    report = lab_client.post(f"/api/v1/food/samples/{sample['id']}/report/")
    shipment = FoodShipment.objects.get(id=inspection.shipment_id)
    assert shipment.status == FoodShipment.ShipmentStatus.REJECTED


def test_certify_before_approval_blocked(lab_client, inspection):
    sample = make_sample(lab_client, inspection)
    res = lab_client.post(f"/api/v1/food/samples/{sample['id']}/certify/")
    assert res.status_code == 400


def test_dashboard_stats(lab_client, inspection):
    make_sample(lab_client, inspection)
    make_sample(lab_client, inspection)
    res = lab_client.get('/api/v1/food/samples/dashboard/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['total_samples'] == 2
    assert data['received'] == 2
    assert 'by_bench' in data
    assert data['avg_completion_hours'] is None


def test_parameters_catalog_and_certificates_list(lab_client, inspection):
    LabParameter.objects.create(code='FAT', name_ar='الدهون', name_en='Fat', bench='CHEMISTRY')
    res = lab_client.get('/api/v1/food/parameters/?bench=CHEMISTRY')
    assert res.status_code == 200
    assert res.json()['data']['results'][0]['code'] == 'FAT'
    cert_res = lab_client.get('/api/v1/food/certificates/')
    assert cert_res.status_code == 200


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

