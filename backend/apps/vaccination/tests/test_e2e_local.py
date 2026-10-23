"""اختبار E2E محلي — G-IMPL-001c-LOCAL.

التدفق الكامل على test DB مؤقتة (بدون VPS):
جرعة → خصم مخزون + InventoryTransaction → شهادة (QR + توقيع + key_id)
→ تحقق عام بدون PII → فاتورة رسوم SDG/USD → تحصيل (PAID + Receipt +
PaymentAttempt) → منع الدفع المزدوج.

اختبارات فقط — لا تعديل كود إنتاج، لا migrations جديدة.
"""
import pytest
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.finance.models import InvoiceStatus, PaymentAttempt, Receipt, ServiceType
from apps.finance.services import (
    FinanceServiceError,
    create_vaccination_invoice,
    pay_vaccination_invoice,
)
from apps.food_quarantine.models import QuarantineFee
from apps.masterdata.models import EntryPoint, Sector, State
from apps.travelers.models import Country, Traveler
from apps.vaccination.models import (
    InventoryTransaction,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)
from apps.vaccination.services import issue_certificate, record_vaccination
from core.utils.qr_payload import verify_payload

User = get_user_model()
pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
#  fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def country():
    return Country.objects.create(code='SDN', name='Sudan', name_ar='السودان')


@pytest.fixture
def traveler(country):
    return Traveler.objects.create(
        passport_number='E2E001',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth=date(1990, 5, 1),
        nationality=country,
    )


@pytest.fixture
def vaccine():
    return Vaccine.objects.create(
        code='YF',
        name_ar='الحمى الصفراء',
        name_en='Yellow Fever',
        series=1,
        validity_days=3650,
        required=True,
    )


@pytest.fixture
def batch(vaccine):
    return VaccineBatch.objects.create(
        vaccine=vaccine,
        lot_number='E2E-2026-LOT01',
        manufacturer='WHO Vendor',
        expiry_date=date(2028, 12, 31),
        received_quantity=100,
        available_quantity=50,
    )


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email='admin.e2e@test.sd', password='x', full_name='E2E Admin',
    )


@pytest.fixture
def port_sector():
    return Sector.objects.create(code='SEA_E', name_ar='البحري')


@pytest.fixture
def entry_point(port_sector):
    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=port_sector)
    return EntryPoint.objects.create(
        code='PSD', name_ar='بورتسودان', kind=EntryPoint.Kind.SEAPORT, state=state,
    )


@pytest.fixture
def site(entry_point):
    return VaccinationSite.objects.create(
        name_ar='عيادة بورتسودان',
        kind=VaccinationSite.Kind.PORT_POINT,
        entry_point=entry_point,
    )


@pytest.fixture
def vaccination_fee():
    """رسوم التطعيم للسنة الحالية — SDG +USD."""
    return QuarantineFee.objects.create(
        category=QuarantineFee.Category.VACCINATION,
        name_ar='تطعيم الحمى الصفراء',
        code='E2E-F14',
        amount_sdg=Decimal('5000.00'),
        amount_usd=Decimal('50.00'),
        year=timezone.localdate().year,
        is_active=True,
    )


@pytest.fixture
def issued_certificate(traveler, vaccine, batch, site, admin_user):
    record = record_vaccination(
        {
            'traveler': traveler,
            'vaccine': vaccine,
            'batch': batch,
            'site': site,
            'administered_at': date.today(),
        },
        admin_user,
    )
    return issue_certificate(record, admin_user)


def _verify_url(cert):
    return reverse('vaccination-public-verify', kwargs={'code': cert.certificate_number})


# ---------------------------------------------------------------------------
#  1) جرعة → شهادة → تحقق عام
# ---------------------------------------------------------------------------


def test_full_flow_dose_to_certificate_to_verify(traveler, vaccine, batch, site, admin_user):
    # إنشاء البيانات الأساسية عبر fixtures: traveler + vaccine + batch + site.

    # (أ) تسجيل الجرعة → خصم المخزون + حركة صرف OUT.
    qty_before = batch.available_quantity
    record = record_vaccination(
        {
            'traveler': traveler,
            'vaccine': vaccine,
            'batch': batch,
            'site': site,
            'administered_at': date.today(),
        },
        admin_user,
    )
    batch.refresh_from_db()
    assert batch.available_quantity == qty_before - 1

    txn = InventoryTransaction.objects.filter(
        batch=batch,
        type=InventoryTransaction.Type.OUT,
        reference_record=record,
    ).first()
    assert txn is not None, 'لا توجد حركة صرف مرتبطة بالجرعة'
    assert txn.quantity == 1

    # (ب) إصدار الشهادة → رقم + QR + توقيع.
    cert = issue_certificate(record, admin_user)
    assert cert.certificate_number
    assert cert.qr_token
    assert cert.verification_signature
    assert cert.verification_path

    # (ج) التحقق العام (reverse URL + client).
    client = APIClient()
    resp = client.get(_verify_url(cert), {'sig': cert.verification_signature})
    assert resp.status_code == 200

    body = resp.json()['data']
    assert body['verified'] is True
    assert body['certificate_number'] == cert.certificate_number
    assert body['vaccine_name_ar'] == 'الحمى الصفراء'
    assert body['status'] == 'ACTIVE'
    assert body['signature_valid'] is True

    # لا PII في الاستجابة العامة.
    assert 'traveler_name' not in body
    assert 'full_name' not in body
    assert 'passport_number' not in body


# ---------------------------------------------------------------------------
#  2) شهادة → فاتورة → دفع
# ---------------------------------------------------------------------------


def test_full_flow_certificate_to_invoice_to_payment(issued_certificate, vaccination_fee, admin_user):
    # (أ) فاتورة SDG من رسوم QuarantineFee.VACCINATION.
    invoice = create_vaccination_invoice(issued_certificate, admin_user)
    # issue_invoice: DRAFT → ISSUED ثم انتظار الدفع (PENDING_PAYMENT).
    assert invoice.status == InvoiceStatus.PENDING_PAYMENT
    assert invoice.net_amount == Decimal('5000.00')  # amount_sdg > 0
    assert invoice.net_amount > 0
    assert invoice.currency == 'SDG'
    assert invoice.service_type == ServiceType.VACCINATION

    # (ب) فاتورة USD من نفس الرسوم.
    invoice_usd = create_vaccination_invoice(
        issued_certificate, admin_user, currency='USD',
    )
    assert invoice_usd.currency == 'USD'
    assert invoice_usd.net_amount == Decimal('50.00')  # amount_usd >= 0

    # (ج) تحصيل الدفع → PAID + Receipt + PaymentAttempt.
    invoice, payment, receipt = pay_vaccination_invoice(invoice, admin_user)
    invoice.refresh_from_db()
    assert invoice.status == InvoiceStatus.PAID
    assert receipt.receipt_number
    assert payment is not None
    assert Receipt.objects.filter(invoice=invoice).count() == 1
    assert PaymentAttempt.objects.filter(invoice=invoice).count() == 1

    # (د) لا يمكن الدفع مرة ثانية.
    with pytest.raises(FinanceServiceError):
        pay_vaccination_invoice(invoice, admin_user)


# ---------------------------------------------------------------------------
#  3-4) فشل-إغلاق للتحقق العام بدون توقيع / بتوقيع خاطئ
# ---------------------------------------------------------------------------


def test_public_verify_fail_closed_without_signature(issued_certificate):
    client = APIClient()
    resp = client.get(_verify_url(issued_certificate))
    assert resp.status_code == 400
    assert resp.json()['data']['signature_valid'] is False


def test_public_verify_fail_closed_with_wrong_signature(issued_certificate):
    client = APIClient()
    resp = client.get(_verify_url(issued_certificate), {'sig': 'deadbeef' * 16})
    assert resp.status_code == 400
    body = resp.json()['data']
    assert body['signature_valid'] is False
    # رقم الشهادة فقط في بيانات الرفض — لا PII.
    assert 'traveler_name' not in body
    assert 'passport_number' not in body


# ---------------------------------------------------------------------------
#  5) تكامل SEC-PLAT-001 — key_id داخل الحمولة الموقعة
# ---------------------------------------------------------------------------


def test_qr_key_id_present(issued_certificate):
    cert = issued_certificate
    sig = cert.verification_signature
    assert isinstance(sig, str) and len(sig) == 64
    assert settings.QR_KEY_ID == 'v1'

    # الحمولة الموقعة تتضمن key_id (جزءاً من البيانات الموقعة).
    payload_with_key = {
        'certificate_number': cert.certificate_number,
        'qr_token': str(cert.qr_token),
        'key_id': settings.QR_KEY_ID,
        'signature': sig,
    }
    assert verify_payload(payload_with_key) is True

    # بدون key_id لا يتحقق — الحمولة موقعة عليه.
    payload_no_key = {
        'certificate_number': cert.certificate_number,
        'qr_token': str(cert.qr_token),
        'signature': sig,
    }
    assert verify_payload(payload_no_key) is False

    # التحقق العام يقبل التوقيع (key_id=v1).
    client = APIClient()
    resp = client.get(_verify_url(cert), {'sig': sig})
    assert resp.status_code == 200
    assert resp.json()['data']['signature_valid'] is True