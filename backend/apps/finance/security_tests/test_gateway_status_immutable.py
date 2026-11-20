"""B5 — a client must never be able to issue a receipt for uncollected money."""
import pytest
from decimal import Decimal

from apps.finance.models import GatewayStatus, InvoiceStatus
from apps.finance.serializers import PaymentAttemptSerializer
from apps.finance.services import paid_amount

from .conftest import login, make_invoice, make_user

pytestmark = pytest.mark.django_db

INVOICES = '/api/v1/finance/invoices/'


def _pending_invoice(two_ports, email):
    issuer = make_user(email, national=True)
    return make_invoice(
        two_ports['ports'][0], 'INV-F1-GW-1', issuer,
        status=InvoiceStatus.PENDING_PAYMENT,
    )


def test_fake_failed_gateway_status_is_ignored(api_client, two_ports):
    invoice = _pending_invoice(two_ports, 'f1-gw-issuer-1@test.sd')
    make_user('f1-gw-root-1@test.sd', superuser=True)
    login(api_client, 'f1-gw-root-1@test.sd')

    res = api_client.post(
        f'{INVOICES}{invoice.id}/pay/',
        {'method': 'CASH', 'gateway_status': 'FAILED', 'gateway_ref': 'FAKE'},
        format='json',
    )

    assert res.status_code == 200, res.content
    payment = invoice.payments.get()
    assert payment.gateway_status == GatewayStatus.CONFIRMED
    assert invoice.receipts.count() == 1


def test_paid_amount_matches_confirmed_payment(api_client, two_ports):
    invoice = _pending_invoice(two_ports, 'f1-gw-issuer-2@test.sd')
    make_user('f1-gw-root-2@test.sd', superuser=True)
    login(api_client, 'f1-gw-root-2@test.sd')

    res = api_client.post(
        f'{INVOICES}{invoice.id}/pay/',
        {'method': 'CASH', 'gateway_status': 'PENDING', 'amount': '40.00'},
        format='json',
    )

    assert res.status_code == 200, res.content
    invoice.refresh_from_db()
    assert invoice.status == InvoiceStatus.PARTIAL
    assert paid_amount(invoice) == Decimal('40.00')
    assert invoice.payments.get().gateway_status == GatewayStatus.CONFIRMED


def test_payment_serializer_gateway_status_is_read_only():
    field = PaymentAttemptSerializer().fields['gateway_status']
    assert field.read_only is True
