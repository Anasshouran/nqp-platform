import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from ..models import AuditLog, FoodInspection, FoodShipment

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def port(db):
    from apps.masterdata.models import EntryPoint as Port
    from apps.travelers.models import Country

    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def inspector(db):
    return User.objects.create_user(
        email='inspector@nqp.gov.sd', password='StrongPass123!', full_name='مفتش رقابة الأغذية'
    )


@pytest.fixture
def auth_client(api_client, db, inspector):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': inspector.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


def _assigned_shipment(db, port, inspector, manifest='IMP-2026-00777'):
    return FoodShipment.objects.create(
        manifest_number=manifest,
        port=port,
        supplier_name='شركة الأمل للتجارة',
        origin_country='Egypt',
        arrival_date='2026-08-23',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
        fees_paid=True,
        assigned_inspector=inspector,
    )


def _inspect(client, shipment, decision):
    return client.post(
        f'/api/v1/food/shipments/{shipment.pk}/inspection/',
        {
            'decision': decision,
            'temperature': 4.5,
            'container_condition': 'سليم',
            'package_condition': 'عبوات سليمة',
            'batch_number': 'BATCH-1',
            'notes': 'لا توجد ملاحظات',
        },
        format='json',
    )


def test_compliant_inspection_releases_shipment(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    res = _inspect(auth_client, shipment, FoodInspection.Decision.COMPLIANT)
    assert res.status_code == 201
    assert res.data['data']['decision'] == 'COMPLIANT'
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.RELEASED
    assert shipment.final_decision == FoodShipment.FinalDecision.COMPLIANT


def test_non_compliant_goes_to_decision(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    res = _inspect(auth_client, shipment, FoodInspection.Decision.NON_COMPLIANT)
    assert res.status_code == 201
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_DECISION
    assert not shipment.final_decision


def test_needs_analysis_holds_for_lab(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    res = _inspect(auth_client, shipment, FoodInspection.Decision.NEEDS_ANALYSIS)
    assert res.status_code == 201
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.UNDER_INSPECTION


def test_double_inspection_rejected(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    first = _inspect(auth_client, shipment, FoodInspection.Decision.COMPLIANT)
    second = _inspect(auth_client, shipment, FoodInspection.Decision.COMPLIANT)
    assert first.status_code == 201
    assert second.status_code == 400


def test_sample_gets_barcode_and_moves_to_lab(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    _inspect(auth_client, shipment, FoodInspection.Decision.NEEDS_ANALYSIS)
    res = auth_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/samples/',
        {'sample_type': 'غذائية', 'quantity': '500', 'quantity_unit': 'كجم'},
        format='json',
    )
    assert res.status_code == 201
    assert res.data['data']['sample_barcode'].startswith('FS-')
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_LAB_RESULTS


def test_sample_blocked_without_inspection(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    res = auth_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/samples/',
        {'sample_type': 'غذائية'},
        format='json',
    )
    assert res.status_code == 400


def test_inspection_and_sample_write_audit_log(auth_client, db, port, inspector):
    shipment = _assigned_shipment(db, port, inspector)
    before_complete = AuditLog.objects.filter(detail__event='complete_inspection').count()
    before_register = AuditLog.objects.filter(detail__event='register_sample').count()
    _inspect(auth_client, shipment, FoodInspection.Decision.NEEDS_ANALYSIS)
    auth_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/samples/',
        {'sample_type': 'غذائية'},
        format='json',
    )
    assert AuditLog.objects.filter(detail__event='complete_inspection').count() == before_complete + 1
    assert AuditLog.objects.filter(detail__event='register_sample').count() == before_register + 1


def test_assign_inspector_notifies_and_audits(api_client, db, port, inspector):
    admin = User.objects.create_user(
        email='manager@nqp.gov.sd', password='StrongPass123!', full_name='مدير المنفذ'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': admin.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    shipment = FoodShipment.objects.create(
        manifest_number='IMP-2026-00779',
        port=port,
        supplier_name='شركة النيل للتجارة',
        origin_country='Egypt',
        arrival_date='2026-08-23',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=FoodShipment.ShipmentStatus.FEES_DUE,
        fees_paid=True,
    )

    from apps.notifications.models import NotificationLog

    before = NotificationLog.objects.filter(user=inspector).count()
    res = api_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/assign-inspector/',
        {'assigned_inspector': str(inspector.pk)},
        format='json',
    )
    assert res.status_code == 200
    assert NotificationLog.objects.filter(user=inspector).count() == before + 1
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_INSPECTION
    assert AuditLog.objects.filter(detail__event='assign_inspector').exists()


def test_assigned_inspector_filter(auth_client, db, port, inspector):
    _assigned_shipment(db, port, inspector, manifest='IMP-2026-00777')
    other = User.objects.create_user(
        email='inspector2@nqp.gov.sd', password='StrongPass123!', full_name='مفتش آخر'
    )
    _assigned_shipment(db, port, other, manifest='IMP-2026-00778')

    res = auth_client.get(
        f'/api/v1/food/shipments/?assigned_inspector={inspector.pk}&status=AWAITING_INSPECTION&page_size=50'
    )
    assert res.status_code == 200
    manifests = {row['manifest_number'] for row in res.data['results']}
    assert manifests == {'IMP-2026-00777'}


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

