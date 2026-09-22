import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.finance.models import Invoice as FinanceInvoice, InvoiceStatus as FinanceStatus
from apps.finance.services import create_shipment_invoice
from ..models import AuditLog, FoodShipment

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
def accountant_client(api_client, db):
    user = User.objects.create_user(
        email='accountant@nqp.gov.sd', password='StrongPass123!', full_name='محاسب رقابة الأغذية'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


def _shipment_with_invoice(db, port):
    clerk = User.objects.create_user(
        email='clerk2@nqp.gov.sd', password='StrongPass123!', full_name='كاتب الإصدار'
    )
    shipment = FoodShipment.objects.create(
        manifest_number='IMP-2026-00999',
        port=port,
        supplier_name='شركة الأمل للتجارة',
        origin_country='Egypt',
        arrival_date='2026-08-20',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=FoodShipment.ShipmentStatus.FEES_DUE,
    )
    invoice = create_shipment_invoice(
        shipment,
        clerk,
        item_lines=[{'name': 'رسوم الاختبار المالي', 'amount': 150000}],
    )
    return shipment, invoice


def test_pay_records_method_notes_and_receipt(accountant_client, db, port):
    shipment, _ = _shipment_with_invoice(db, port)
    res = accountant_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/pay/',
        {'payment_method': 'CASH', 'notes': 'دفع نقدي بالكامل'},
        format='json',
    )
    assert res.status_code == 200
    data = res.data['data']
    assert data['status'] == FinanceStatus.PAID
    assert data['payment_method'] == 'CASH'
    assert data['paid_notes'] == 'دفع نقدي بالكامل'
    assert data['receipt_number'].startswith('RCPT-')
    shipment.refresh_from_db()
    assert shipment.fees_paid is True
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_INSPECTION


def test_pay_rejects_invalid_payment_method(accountant_client, db, port):
    shipment, _ = _shipment_with_invoice(db, port)
    res = accountant_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/pay/',
        {'payment_method': 'BITCOIN'},
        format='json',
    )
    assert res.status_code == 400
    invoice = FinanceInvoice.objects.filter(food_shipment=shipment).first()
    assert invoice.status == FinanceStatus.PENDING_PAYMENT


def test_pay_writes_audit_log(accountant_client, db, port):
    shipment, _ = _shipment_with_invoice(db, port)
    before = AuditLog.objects.filter(detail__event='confirm_payment').count()
    accountant_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/pay/',
        {'payment_method': 'BANK_CARD'},
        format='json',
    )
    after = AuditLog.objects.filter(detail__event='confirm_payment').count()
    assert after == before + 1


def test_double_pay_blocked(accountant_client, db, port):
    shipment, _ = _shipment_with_invoice(db, port)
    first = accountant_client.post(f'/api/v1/food/shipments/{shipment.pk}/pay/', {}, format='json')
    second = accountant_client.post(f'/api/v1/food/shipments/{shipment.pk}/pay/', {}, format='json')
    assert first.status_code == 200
    assert second.status_code == 400


def test_invoices_endpoint_list_and_search(accountant_client, db, port):
    shipment, invoice = _shipment_with_invoice(db, port)
    res = accountant_client.get('/api/v1/food/invoices/')
    assert res.status_code == 200
    assert any(row['invoice_number'] == invoice.invoice_number for row in res.data['results'])
    found = accountant_client.get('/api/v1/food/invoices/?search=IMP-2026-00999')
    assert found.status_code == 200
    assert len(found.data['results']) >= 1


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state