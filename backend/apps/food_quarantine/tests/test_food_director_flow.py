import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role

from ..models import FoodShipment

pytestmark = pytest.mark.django_db

User = get_user_model()

DASHBOARD_URL = '/api/v1/food/shipments/food-director-dashboard/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def director_role(db):
    return Role.objects.create(code='FOOD_DIRECTOR', name='Food Director', name_ar='مدير إدارة رقابة الأغذية')


@pytest.fixture
def clerk_role(db):
    return Role.objects.create(code='CLERK', name='Clerk', name_ar='الكاتب')


@pytest.fixture
def country(db):
    from apps.travelers.models import Country

    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def sectors_ports(db, country):
    from apps.masterdata.models import EntryPoint as Port
    from apps.organization.models import Sector

    s1 = Sector.objects.create(code='SEC_A', name_ar='قطاع أ')
    s2 = Sector.objects.create(code='SEC_B', name_ar='قطاع ب')
    p1 = Port.objects.create(
        state=_ep_state(),
        code='SDA', name_ar='منفذ أ', kind=Port.Kind.SEAPORT, sector=s1
    )
    p2 = Port.objects.create(
        state=_ep_state(),
        code='SDB', name_ar='منفذ ب', kind=Port.Kind.AIRPORT, sector=s2
    )
    return s1, p1, p2


@pytest.fixture
def director(db, director_role):
    return User.objects.create_user(
        email='director-t@nqp.gov.sd',
        password='StrongPass123!',
        full_name='المدير العام',
        role=director_role,
    )


@pytest.fixture
def director_client(api_client, director):
    api_client.force_authenticate(user=director)
    return api_client


def _shipment(port, manifest):
    return FoodShipment.objects.create(
        manifest_number=manifest,
        port=port,
        supplier_name='مورد قومي',
        origin_country='Egypt',
        arrival_date='2026-08-22',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
        fees_paid=True,
    )


def test_requires_authentication(api_client):
    assert api_client.get(DASHBOARD_URL).status_code == 401


def test_national_scope_no_sector_required(api_client, db, clerk_role):
    """المدير العام لا يحتاج قطاعًا مرتبطًا — النطاق قومي."""
    u = User.objects.create_user(
        email='dir-nosector-t@nqp.gov.sd', password='StrongPass123!', full_name='مدير', role=clerk_role
    )
    api_client.force_authenticate(user=u)
    res = api_client.get(DASHBOARD_URL)
    assert res.status_code == 200
    assert 'sectors_overview' in res.data['data']


def test_sectors_overview_covers_all_sectors(director_client, sectors_ports):
    s1, p1, p2 = sectors_ports
    _shipment(p1, 'IMP-NAT-A')
    _shipment(p2, 'IMP-NAT-B')
    res = director_client.get(f'{DASHBOARD_URL}?period=MONTH')
    assert res.status_code == 200
    d = res.data['data']
    names = {s['name_ar'] for s in d['sectors_overview']}
    assert {'قطاع أ', 'قطاع ب'} <= names
    total_ships = sum(s['shipments'] for s in d['sectors_overview'])
    assert total_ships >= d['kpis']['shipments_period'] >= 2


def test_kpi_table_and_trade_keys(director_client, sectors_ports):
    _, p1, p2 = sectors_ports
    _shipment(p1, 'IMP-NAT-C')
    FoodShipment.objects.create(
        manifest_number='EXP-NAT-1',
        port=p2,
        supplier_name='مصدر محلي',
        origin_country='Sudan',
        arrival_date='2026-08-22',
        shipment_type=FoodShipment.ShipmentType.EXPORT,
        status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
        fees_paid=True,
    )
    res = director_client.get(DASHBOARD_URL)
    d = res.data['data']
    for key in ('kpis', 'outcomes', 'lab_performance', 'kpi_table', 'trade', 'finance', 'staff', 'certificates'):
        assert key in d
    assert len(d['kpi_table']) == 4
    assert {'import', 'export'} <= set(d['trade'])
    assert d['trade']['export']['total'] >= 1


def test_alerts_present_when_data_exists(director_client, sectors_ports):
    _, p1, _p2 = sectors_ports
    _shipment(p1, 'IMP-NAT-D', )
    res = director_client.get(DASHBOARD_URL)
    assert isinstance(res.data['data']['alerts'], list)


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

