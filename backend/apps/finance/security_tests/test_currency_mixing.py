"""B7 — collected totals are currency-filtered before acting on money."""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.finance.models import (
    Currency, GatewayStatus, Invoice, InvoiceStatus, PaymentAttempt, PaymentMethod,
)
from apps.finance.services import (
    FinanceServiceError, cancel_invoice, next_invoice_number, paid_amount,
    refund_invoice,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return get_user_model().objects.create_user(
        email='f2-currency@test.sd', password='Str0ngPass!23',
        full_name='F2 currency tester', is_staff=True, is_superuser=True,
    )


def _invoice(user, currency, status=InvoiceStatus.PENDING_PAYMENT):
    return Invoice.objects.create(
        invoice_number=next_invoice_number(),
        source_type='MANUAL',
        items=[],
        gross_amount='1000',
        net_amount='1000',
        currency=currency,
        status=status,
        issued_by=user,
    )


def _payment(invoice, user, currency, amount, gateway_status=GatewayStatus.CONFIRMED):
    return PaymentAttempt.objects.create(
        invoice=invoice, method=PaymentMethod.CASH, amount=amount,
        currency=currency, gateway_status=gateway_status, collected_by=user,
    )


def test_paid_amount_filters_by_currency(user):
    inv = _invoice(user, Currency.SDG)
    _payment(inv, user, Currency.SDG, 100)
    _payment(inv, user, Currency.USD, 50)
    assert paid_amount(inv, Currency.SDG) == Decimal('100')
    assert paid_amount(inv, Currency.USD) == Decimal('50')


def test_paid_amount_excludes_failed(user):
    inv = _invoice(user, Currency.SDG)
    _payment(inv, user, Currency.SDG, 100, GatewayStatus.FAILED)
    assert paid_amount(inv, Currency.SDG) == Decimal('0')


def test_cancel_blocks_on_same_currency_only(user):
    """An SDG invoice with only a USD payment must not look 'collected'."""
    inv = _invoice(user, Currency.SDG)
    _payment(inv, user, Currency.USD, 50)
    cancel_invoice(inv, user, 'اختبار')  # must not raise "has collected payments"
    inv.refresh_from_db()
    assert inv.status == InvoiceStatus.CANCELLED


def test_refund_respects_currency(user):
    inv = _invoice(user, Currency.SDG, status=InvoiceStatus.PARTIAL)
    _payment(inv, user, Currency.SDG, 100)
    _payment(inv, user, Currency.USD, 50)
    with pytest.raises(FinanceServiceError, match='يتجاوز المحصّل'):
        refund_invoice(inv, user, 'اختبار', amount=150)
