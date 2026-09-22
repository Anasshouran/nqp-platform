import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role

from ..models import FoodShipment

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sector_model(db):
    from apps.organization.models import Sector

    return Sector.objects.create(code='SEC_T', name_ar='قطاع الاختبار')


@pytest.fixture
def country(db):
    from apps.travelers.models import Country

    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def port(db, sector_model, country):
    from apps.masterdata.models import EntryPoint as Port

    return Port.objects.create(
        state=_ep_state(),
        code='SDTST',
        name_ar='منفذ الاختبار',
        name_en='Test Port',
        kind=Port.Kind.SEAPORT,
        sector=sector_model,
    )


@pytest.fixture
def other_port(db, country):
    from apps.masterdata.models import EntryPoint as Port

    return Port.objects.create(
        state=_ep_state(),
        code='SDOTH',
        name_ar='منفذ قطاع آخر',
        name_en='Other Port',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def sector_head_role(db):
    return Role.objects.create(code='SECTOR_HEAD', name='Sector Head', name_ar='مدير رقابة الأغذية بالقطاع')


@pytest.fixture
def inspector_role(db):
    return Role.objects.create(code='FOOD_INSPECTOR', name='Food Inspector', name_ar='مفتش أغذية')


@pytest.fixture
def clerk_role(db):
    return Role.objects.create(code='CLERK', name='Clerk', name_ar='الكاتب')


@pytest.fixture
def sector_head(db, sector_head_role, sector_model):
    return User.objects.create_user(
        email='sector-head-t@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مدير القطاع',
        role=sector_head_role,
        sector=sector_model,
    )


@pytest.fixture
def sector_client(api_client, sector_head):
    api_client.force_authenticate(user=sector_head)
    return api_client


@pytest.fixture
def inspector(db, inspector_role):
    return User.objects.create_user(
        email='inspector-sec@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مفتش القطاع',
        role=inspector_role,
    )


def _shipment(port, inspector, manifest='IMP-SEC-0001', status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION):
    return FoodShipment.objects.create(
        manifest_number=manifest,
        port=port,
        supplier_name='مورد القطاع',
        origin_country='Egypt',
        arrival_date='2026-08-22',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=status,
        fees_paid=True,
        assigned_inspector=inspector,
    )


DASHBOARD_URL = '/api/v1/food/shipments/sector-head-dashboard/'


def test_requires_authentication(api_client):
    assert api_client.get(DASHBOARD_URL).status_code == 401


def test_user_without_sector_gets_400(api_client, db, clerk_role):
    u = User.objects.create_user(
        email='nosector-t@nqp.gov.sd', password='StrongPass123!', full_name='بلا قطاع', role=clerk_role
    )
    api_client.force_authenticate(user=u)
    res = api_client.get(DASHBOARD_URL)
    assert res.status_code == 400
    assert 'قطاع' in res.data['message']


def test_dashboard_scoped_to_sector_ports(sector_client, port, other_port, inspector):
    s_mine = _shipment(port, inspector, manifest='IMP-SEC-MINE')
    FoodShipment.objects.create(
        manifest_number='IMP-SEC-OTHER',
        port=other_port,
        supplier_name='مورد آخر',
        origin_country='Egypt',
        arrival_date='2026-08-22',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
        fees_paid=True,
    )
    res = sector_client.get(f'{DASHBOARD_URL}?period=MONTH')
    assert res.status_code == 200
    d = res.data['data']
    assert d['sector']['name_ar'] == 'قطاع الاختبار'
    assert d['kpis']['shipments_period'] >= 1
    manifests = [p['name_ar'] for p in d['ports_overview']]
    assert 'منفذ الاختبار' in manifests
    assert 'منفذ قطاع آخر' not in manifests
    my_row = next(p for p in d['ports_overview'] if p['code'] == 'SDTST')
    assert my_row['shipments'] >= 1


def test_inspection_board_and_staff(sector_client, port, inspector):
    _shipment(port, inspector, manifest='IMP-SEC-A')
    _shipment(port, inspector, manifest='IMP-SEC-B', status=FoodShipment.ShipmentStatus.UNDER_INSPECTION)
    res = sector_client.get(DASHBOARD_URL)
    assert res.status_code == 200
    d = res.data['data']
    assert d['inspection_board']['tasks_assigned'] >= 2
    assert d['inspection_board']['in_progress'] >= 1
    assert any(w['full_name'] == 'مفتش القطاع' for w in d['staff']['workload'])


def test_alerts_and_certificates_keys(sector_client, port, inspector):
    _shipment(port, inspector)
    res = sector_client.get(DASHBOARD_URL)
    d = res.data['data']
    for key in ('alerts', 'certificates', 'finance', 'samples_board', 'status_breakdown'):
        assert key in d
    assert set(d['finance']) == {'inspection_fees', 'lab_fees', 'certificate_fees', 'total'}
    sla = d['samples_board']
    assert {'sla_within', 'sla_near', 'sla_exceeded'} <= set(sla)


def test_superuser_can_query_any_sector(api_client, db, port, sector_model):
    admin = User.objects.create_superuser(email='sec-admin-t@nqp.gov.sd', password='AdminPass123!', full_name='مشرف')
    api_client.force_authenticate(user=admin)
    res = api_client.get(f'{DASHBOARD_URL}?sector={sector_model.pk}')
    assert res.status_code == 200
    assert res.data['data']['sector']['id'] == str(sector_model.pk)


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

