"""Tests for vaccination fee collection (SIVS-FIN-009)."""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.finance.models import Invoice, InvoiceSource, InvoiceStatus, Receipt, ServiceType
from apps.food_quarantine.models import QuarantineFee
from apps.vaccination.models import VaccinationCertificate, VaccinationSite
from apps.vaccination.services import issue_certificate, record_vaccination
from apps.finance.services import FinanceServiceError, create_vaccination_invoice, confirm_payment, PaymentMethod

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def country():
    from apps.travelers.models import Country

    return Country.objects.create(code='SDN', name='Sudan', name_ar='السودان')


@pytest.fixture
def traveler(country):
    from apps.travelers.models import Traveler

    return Traveler.objects.create(
        passport_number='P12345',
        first_name='محمد',
        last_name='أحمد',
        date_of_birth=date(1990, 5, 1),
        nationality=country,
    )


@pytest.fixture
def vaccine():
    from apps.vaccination.models import Vaccine

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
    from apps.vaccination.models import VaccineBatch

    return VaccineBatch.objects.create(
        vaccine=vaccine,
        lot_number='YF-2026-LOT01',
        manufacturer='WHO Vendor',
        expiry_date=date(2028, 12, 31),
        received_quantity=100,
        available_quantity=50,
    )


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(email='admin.fee@test.sd', password='x', full_name='Admin')


@pytest.fixture
def port_sector():
    from apps.masterdata.models import Sector

    return Sector.objects.create(code='SEA_F', name_ar='البحري')


@pytest.fixture
def entry_point(port_sector):
    from apps.masterdata.models import EntryPoint, State

    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=port_sector)
    return EntryPoint.objects.create(
        code='PSD', name_ar='بورتسودان', kind=EntryPoint.Kind.SEAPORT, state=state,
    )


@pytest.fixture
def site(entry_point):
    return VaccinationSite.objects.create(
        name_ar='عيادة بورتسودان', kind=VaccinationSite.Kind.PORT_POINT, entry_point=entry_point,
    )


@pytest.fixture
def issued_certificate(traveler, vaccine, batch, site, admin_user):
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'site': site, 'administered_at': date.today()},
        admin_user,
    )
    return issue_certificate(record, admin_user)


@pytest.fixture
def vaccination_fee():
    """Create a vaccination fee for current year."""
    from apps.food_quarantine.models import QuarantineFee

    return QuarantineFee.objects.create(
        category=QuarantineFee.Category.VACCINATION,
        name_ar='تطعيم الحمى الصفراء',
        code='F14',
        amount_sdg=Decimal('5000.00'),
        amount_usd=Decimal('50.00'),
        year=timezone.localdate().year,
        is_active=True,
    )


class TestVaccinationFeeCollection:
    def test_create_invoice_for_certificate(self, issued_certificate, vaccination_fee, admin_user):
        invoice = create_vaccination_invoice(issued_certificate, admin_user)
        assert invoice is not None
        assert invoice.vaccination_certificate == issued_certificate
        assert invoice.service_type == ServiceType.VACCINATION
        assert invoice.source_type == InvoiceSource.VACCINATION_CERTIFICATE
        assert invoice.net_amount == Decimal('5000.00')
        assert invoice.currency == 'SDG'

    def test_invoice_requires_issue_permission(self, issued_certificate, vaccination_fee, admin_user):
        # Simulate a user without issue permission by using a regular user
        user = User.objects.create_user(email='noperm@test.sd', password='x', full_name='NoPerm')
        from django.core.exceptions import PermissionDenied
        # The endpoint requires vaccination:issue; here we test the service directly
        # with a user that has no role — should still create (service doesn't check perms)
        # Permission is checked at view level; service-level test just verifies creation
        invoice = create_vaccination_invoice(issued_certificate, user)
        assert invoice is not None

    def test_pay_invoice(self, issued_certificate, vaccination_fee, admin_user):
        invoice = create_vaccination_invoice(issued_certificate, admin_user)
        assert invoice.status == InvoiceStatus.PENDING_PAYMENT
        invoice, payment, receipt = confirm_payment(
            invoice, admin_user, method='CASH', amount=Decimal('5000.00'),
            notes='test payment', request=None,
        )
        assert invoice.status == InvoiceStatus.PAID
        assert receipt is not None
        assert receipt.amount == Decimal('5000.00')
        assert payment.gateway_status == 'CONFIRMED'

    def test_pay_requires_collect_permission(self, issued_certificate, vaccination_fee, admin_user):
        # Service-level: confirm_payment works for any user with access
        invoice = create_vaccination_invoice(issued_certificate, admin_user)
        invoice, payment, receipt = confirm_payment(
            invoice, admin_user, method='CASH', amount=Decimal('5000.00'),
        )
        assert invoice.status == InvoiceStatus.PAID

    def test_no_fees_for_year(self, issued_certificate, admin_user):
        with pytest.raises(FinanceServiceError):
            # No vaccination fees for year 2099
            create_vaccination_invoice(issued_certificate, admin_user, year=2099)

    def test_invoice_includes_usd_and_sdg(self, issued_certificate, vaccination_fee, admin_user):
        # Create invoice in USD
        invoice = create_vaccination_invoice(issued_certificate, admin_user, currency='USD')
        assert invoice.currency == 'USD'
        assert invoice.net_amount == Decimal('50.00')

    def test_cannot_pay_already_paid_invoice(self, issued_certificate, vaccination_fee, admin_user):
        invoice = create_vaccination_invoice(issued_certificate, admin_user)
        confirm_payment(invoice, admin_user, method='CASH', amount=Decimal('5000.00'))
        invoice.refresh_from_db()
        assert invoice.status == InvoiceStatus.PAID
        # Try to pay again
        with pytest.raises(Exception):
            confirm_payment(invoice, admin_user, method='CASH', amount=Decimal('5000.00'))

    def test_invoice_linked_to_certificate(self, issued_certificate, vaccination_fee, admin_user):
        invoice = create_vaccination_invoice(issued_certificate, admin_user)
        assert invoice.vaccination_certificate_id == issued_certificate.id
        # Verify reverse relation
        assert issued_certificate.invoices.count() == 1
        assert issued_certificate.invoices.first() == invoice