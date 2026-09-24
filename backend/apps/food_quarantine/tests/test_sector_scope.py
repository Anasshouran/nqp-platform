import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port, Sector as MasterSector, State as MasterState
from apps.organization.models import Sector
from apps.accounts.models import Role, RoleAssignment, ScopeType

from ..models import (
    FoodSample,
    FoodShipment,
    FoodInspection,
    SampleTest,
    SampleTestRevision,
    LabParameter,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def red_sea():
    sector, _ = Sector.objects.get_or_create(
        code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'name_en': 'Red Sea Sector'}
    )
    return sector


@pytest.fixture
def red_sea_port(red_sea):
    state, _ = MasterState.objects.get_or_create(
        code='ST_RS', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': MasterSector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'}
        )[0]}
    )
    port, _ = Port.objects.get_or_create(
        code='P-SDN',
        defaults={
            'state': state,
            'name_ar': 'ميناء بورتسودان الجنوبي',
            'name_en': 'South Port Sudan',
            'kind': Port.Kind.SEAPORT,
            'sector': red_sea,
        },
    )
    return port


def _auth(user):
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def _user(email='food@nqp.gov.sd', role=None):
    user = User.objects.create_user(email=email, password='StrongPass123!', full_name='مستخدم فحص')
    if role:
        user.role = role
        user.save()
    return user


def _approved_test(user, ignored_port):
    """فحص معتمد جاهز لإعادة الفحص."""
    sample = FoodSample.objects.create(
        sample_barcode='FS-RETEST-1',
        received_by=user,
        status=FoodSample.LifecycleStatus.APPROVED,
        sector=ignored_port.sector,
    )
    parameter = LabParameter.objects.create(code='M1', name_ar='معامل 1', bench=FoodSample.LabBench.CHEMISTRY)
    test = SampleTest.objects.create(
        sample=sample,
        parameter=parameter,
        status=SampleTest.TestStatus.APPROVED,
        decision=SampleTest.Decision.NON_COMPLIANT,
        result_value=12.5,
        version=2,
    )
    return test


def test_sample_number_uses_sector_prefix(red_sea):
    sample = FoodSample.objects.create(sample_barcode='FS-1', sector=red_sea)
    assert sample.sample_number.startswith('NQP-RED_SEA-')

    other = FoodSample.objects.create(sample_barcode='FS-2')
    assert other.sample_number.startswith('NQP-')


def test_create_resolves_sector_from_entry_point(red_sea_port):
    user = _user()
    client = _auth(user)
    shipment = FoodShipment.objects.create(
        manifest_number='MAN-SCOPE-001',
        port=red_sea_port,
        supplier_name='مورد',
        origin_country='Egypt',
        arrival_date='2026-08-01',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
    )
    inspection = FoodInspection.objects.create(
        shipment=shipment, inspector=user,
        decision=FoodInspection.Decision.NEEDS_ANALYSIS,
    )
    resp = client.post(
        '/api/v1/food/samples/',
        {'inspection': str(inspection.id), 'classification': 'ANALYSIS', 'sample_type': 'غذائي'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    sample = FoodSample.objects.get(id=resp.json()['data']['id'])
    assert sample.sector == red_sea_port.sector
    assert sample.sample_number.startswith('NQP-RED_SEA-')


def test_dashboard_sector_filter_scopes_stats(red_sea, red_sea_port):
    user = _user()
    sector_sample = FoodSample.objects.create(
        sample_barcode='FS-RS', status=FoodSample.LifecycleStatus.RECEIVED, sector=red_sea
    )
    FoodSample.objects.create(sample_barcode='FS-OTHER', status=FoodSample.LifecycleStatus.RECEIVED)

    client = _auth(user)
    all_resp = client.get('/api/v1/food/samples/dashboard/')
    assert all_resp.status_code == 200
    scoped_resp = client.get('/api/v1/food/samples/dashboard/', {'sector': 'RED_SEA'})
    assert scoped_resp.status_code == 200
    payload = scoped_resp.json()['data']
    assert payload['total_samples'] == 1
    assert payload['received'] == 1
    assert payload['sector_name'] == red_sea.name_ar
    assert payload['total_tests'] >= 0


def test_retest_reopens_approved_test(user=None):
    user = _user()
    red_sea, _ = Sector.objects.get_or_create(code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'})
    # إعادة استخدام نفس تدفق _approved_test عبر إنشاء بورت مصغر
    from apps.masterdata.models import State as MState
    state, _ = MState.objects.get_or_create(
        code='ST_RS_X', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': MasterSector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'})[0]}
    )
    port, _ = Port.objects.get_or_create(
        code='P-RS-X', defaults={'state': state, 'name_ar': 'ميناء', 'kind': Port.Kind.SEAPORT, 'sector': red_sea}
    )
    test = _approved_test(user, port)

    client = _auth(user)
    resp = client.post(f'/api/v1/food/sample-tests/{test.id}/retest/', {'reason': 'نتيجة مشكوك فيها'})
    assert resp.status_code == 200, resp.content
    test.refresh_from_db()
    assert test.status == SampleTest.TestStatus.RETEST
    assert test.decision == SampleTest.Decision.PENDING
    assert not test.approved_by_id
    assert test.revisions.count() == 1
    revision = test.revisions.first()
    assert revision.reason == 'نتيجة مشكوك فيها'
    assert revision.snapshot['version'] == 2


def test_retest_blocked_for_receptionist():
    role, _ = Role.objects.get_or_create(code='LAB_RECEPTIONIST', defaults={'name_ar': 'مستقبل العينات'})
    user = _user(email='reception@nqp.gov.sd', role=role)
    RoleAssignment.objects.create(user=user, role=role, scope_type=ScopeType.GLOBAL)
    red_sea, _ = Sector.objects.get_or_create(code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'})
    state, _ = MasterState.objects.get_or_create(
        code='ST_RX', defaults={'name_ar': 'ولاية', 'sector': MasterSector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'})[0]}
    )
    port, _ = Port.objects.get_or_create(
        code='P-RX', defaults={'state': state, 'name_ar': 'ميناء', 'kind': Port.Kind.SEAPORT, 'sector': red_sea}
    )
    test = _approved_test(user, port)

    client = _auth(user)
    resp = client.post(f'/api/v1/food/sample-tests/{test.id}/retest/', {'reason': 'إعادة'})
    assert resp.status_code == 403
    test.refresh_from_db()
    assert test.status == SampleTest.TestStatus.APPROVED