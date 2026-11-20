"""B4 — zero-total invoices are exempted, not collected with amount=0.

Regression: `create_sample_invoice` used to call `confirm_payment(amount=0)`,
which is rejected by the fail-closed guard in `confirm_payment`.
"""
from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model

from apps.finance.models import (
    AuditAction,
    FinancialAuditLog,
    GatewayStatus,
    Invoice,
    InvoiceStatus,
    PaymentAttempt,
    PaymentMethod,
)
from apps.finance.services import (
    FinanceServiceError,
    create_sample_invoice,
    exempt_invoice,
)
from apps.food_quarantine.models import FoodSample, LabParameter, SampleTest

pytestmark = pytest.mark.django_db

User = get_user_model()


def _user():
    return User.objects.create_user(
        email=f'exempt-{uuid4().hex[:10]}@nqp.gov.sd',
        password='Str0ngPass!23',
        full_name='Finance exemption tester',
    )


def _inv(status=InvoiceStatus.PENDING_PAYMENT, net=Decimal('100')):
    return Invoice.objects.create(
        invoice_number=f'EXM-{uuid4().hex[:12]}',
        issued_by=_user(),
        status=status,
        gross_amount=net,
        net_amount=net,
        currency='SDG',
    )


def test_exempt_marks_paid_with_audit():
    inv = _inv()
    exempt_invoice(inv, reason='حالة اختبار')

    inv.refresh_from_db()
    assert inv.status == InvoiceStatus.PAID
    log = FinancialAuditLog.objects.get(
        action=AuditAction.EXEMPT, invoice=inv
    )
    assert log.old_value == InvoiceStatus.PENDING_PAYMENT
    assert log.new_value == InvoiceStatus.PAID
    assert log.metadata['reason'] == 'حالة اختبار'
    assert not PaymentAttempt.objects.filter(invoice=inv).exists()


def test_exempt_rejects_final_status():
    inv = _inv(status=InvoiceStatus.PAID)
    with pytest.raises(FinanceServiceError, match='لا يمكن إعفاء'):
        exempt_invoice(inv, reason='x')


def test_exempt_accepts_zero_balance_no_payments():
    """Zero balance with no payments is the B4 case — it must be exemptable."""
    inv = _inv(net=Decimal('0'))
    exempt_invoice(inv, reason='إعفاء صفر الرسوم')

    inv.refresh_from_db()
    assert inv.status == InvoiceStatus.PAID
    assert not PaymentAttempt.objects.filter(invoice=inv).exists()
    assert FinancialAuditLog.objects.filter(
        action=AuditAction.EXEMPT, invoice=inv
    ).exists()


def test_exempt_rejects_empty_reason():
    inv = _inv()
    with pytest.raises(FinanceServiceError, match='سبب الإعفاء مطلوب'):
        exempt_invoice(inv, reason='  ')


def test_exempt_rejects_invoice_with_payments():
    """A successful payment means collected — never audit it as EXEMPT."""
    inv = _inv()
    PaymentAttempt.objects.create(
        invoice=inv,
        method=PaymentMethod.CASH,
        amount=Decimal('100'),
        currency='SDG',
        gateway_status=GatewayStatus.CONFIRMED,
    )
    with pytest.raises(FinanceServiceError, match='تحصيلات سابقة'):
        exempt_invoice(inv, reason='x')

    inv.refresh_from_db()
    assert inv.status == InvoiceStatus.PENDING_PAYMENT
    assert not FinancialAuditLog.objects.filter(
        action=AuditAction.EXEMPT, invoice=inv
    ).exists()


def test_create_sample_invoice_zero_total_uses_exempt():
    """Zero-total path must complete without raising (no fake 0 payment)."""
    user = _user()
    sample = FoodSample.objects.create(
        sample_barcode=f'F4-ZERO-{uuid4().hex[:8]}',
        sample_type='FOOD',
        requesting_department='مختبر الاختبار',
    )
    parameter = LabParameter.objects.create(
        code=f'F4Z-{uuid4().hex[:8]}',
        name_ar='معامل صفري',
        name_en='Zero parameter',
        price=Decimal('0'),
    )
    SampleTest.objects.create(sample=sample, parameter=parameter)

    invoice, created = create_sample_invoice(sample, user)

    assert created is True
    invoice.refresh_from_db()
    assert invoice.status == InvoiceStatus.PAID
    assert not PaymentAttempt.objects.filter(invoice=invoice).exists()
    assert FinancialAuditLog.objects.filter(
        action=AuditAction.EXEMPT, invoice=invoice
    ).exists()
