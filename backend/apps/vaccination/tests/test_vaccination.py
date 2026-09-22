import pytest
from datetime import date, timedelta

from django.utils import timezone

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.travelers.models import Country, Traveler
from apps.vaccination.models import (
    InventoryTransaction,
    VaccinationCertificate,
    VaccinationRecord,
    VaccinationRule,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)
from apps.vaccination.services import assess_traveler, issue_certificate, record_vaccination

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def country():
    return Country.objects.create(code='SDN', name='Sudan', name_ar='السودان')


@pytest.fixture
def traveler(country):
    return Traveler.objects.create(
        passport_number='P12345',
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
        lot_number='YF-2026-LOT01',
        manufacturer='WHO Vendor',
        expiry_date=date(2028, 12, 31),
        received_quantity=100,
        available_quantity=50,
    )


@pytest.fixture
def admin_user():
    user = User.objects.create_superuser(email='admin.vac@test.sd', password='x', full_name='Admin')
    return user


@pytest.fixture
def staff_user():
    role, _ = Role.objects.get_or_create(code='VACCINATION_OFFICER', defaults={'name': 'Vaccination Officer', 'name_ar': 'مسؤول التطعيم'})
    for code, action in [
        ('vaccination:view', 'view'),
        ('vaccination:add', 'add'),
        ('vaccination:edit', 'edit'),
        ('vaccination:issue', 'issue'),
        ('vaccination:verify', 'verify'),
    ]:
        perm, _ = Permission.objects.get_or_create(code=code, defaults={'name': action, 'resource': 'vaccination', 'action': action})
        role.permissions.add(perm)
    user = User.objects.create_user(email='officer.vac@test.sd', password='x', full_name='Officer', role=role)
    RoleAssignment.objects.create(
        user=user,
        role=role,
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=None,
        is_active=True,
        start_date=timezone.localdate(),
        assigned_by=user,
    )
    return user


def test_record_vaccination_decrements_batch_and_logs_transaction(traveler, vaccine, batch, admin_user):
    record = record_vaccination(
        {
            'traveler': traveler,
            'vaccine': vaccine,
            'batch': batch,
            'administered_at': date.today(),
            'dose_number': 1,
        },
        admin_user,
    )
    assert record.status == VaccinationRecord.Status.GIVEN
    batch.refresh_from_db()
    assert batch.available_quantity == 49
    assert InventoryTransaction.objects.filter(batch=batch, type=InventoryTransaction.Type.OUT).exists()


def test_record_clears_when_batch_insufficient(traveler, vaccine, batch, admin_user):
    batch.available_quantity = 0
    batch.save()
    with pytest.raises(ValueError):
        record_vaccination(
            {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
            admin_user,
        )


def test_issue_certificate_number_and_verification_path(traveler, vaccine, batch, admin_user):
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    cert = issue_certificate(record, admin_user)
    assert cert.certificate_number.startswith('AFY-VAC-')
    assert cert.status == VaccinationCertificate.Status.ACTIVE
    assert cert.verification_path == f'/verify/vaccination/{cert.certificate_number}'
    assert cert.valid_until == date.today() + timedelta(days=3650)
    # idempotent
    again = issue_certificate(record, admin_user)
    assert again.pk == cert.pk


def test_assess_traveler_flags_missing_required(traveler, vaccine, batch, admin_user):
    rule = VaccinationRule.objects.create(
        vaccine=vaccine, title_ar='مطلوب للحمى الصفراء', required=True, doses_required=1, validity_days=3650,
    )
    assessment = assess_traveler(traveler)
    assert any(item['vaccine_id'] == str(vaccine.id) and item['status'] == 'MISSING' for item in assessment)

    record_vaccination({'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()}, admin_user)
    assessment = assess_traveler(traveler)
    status = next(item['status'] for item in assessment if item['vaccine_id'] == str(vaccine.id))
    assert status == 'COMPLETE'


def test_public_verify_success_and_revoked(traveler, vaccine, batch, admin_user):
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    cert = issue_certificate(record, admin_user)
    client = APIClient()
    resp = client.get(f'/api/v1/vaccination/public/verify/{cert.certificate_number}/')
    assert resp.status_code == 200
    body = resp.json()['data']
    assert body['verified'] is True
    assert body['traveler_name'] == 'محمد أحمد'
    assert body['passport_number'] == 'P12345'
    assert body['vaccine_code'] == 'YF'

    cert.status = VaccinationCertificate.Status.REVOKED
    cert.save(update_fields=['status'])
    resp = client.get(f'/api/v1/vaccination/public/verify/{cert.certificate_number}/')
    assert resp.status_code == 200
    assert resp.json()['data']['verified'] is False


def test_public_verify_unknown_code():
    resp = APIClient().get('/api/v1/vaccination/public/verify/AFY-VAC-NOPE/')
    assert resp.status_code == 404


def test_private_endpoints_require_auth():
    resp = APIClient().get('/api/v1/vaccination/records/')
    assert resp.status_code == 401


def test_officer_can_create_record_and_issue_certificate_via_api(traveler, vaccine, batch, staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.post(
        '/api/v1/vaccination/records/',
        {
            'passport_number': 'P12345',
            'vaccine': str(vaccine.id),
            'batch': str(batch.id),
            'dose_number': 1,
            'dose_type': 'FIRST',
            'administered_at': str(date.today()),
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    record_id = resp.json()['data']['id']

    resp = client.post('/api/v1/vaccination/certificates/', {'record': record_id}, format='json')
    assert resp.status_code == 201, resp.content
    number = resp.json()['data']['certificate_number']
    assert number.startswith('AFY-VAC-')

    resp = client.get(f'/api/v1/vaccination/certificates/{resp.json()["data"]["id"]}/qr/')
    assert resp.status_code == 200
    assert 'qr_png' in resp.json()['data']


def test_dashboard_endpoint(traveler, vaccine, batch, admin_user):
    record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.get('/api/v1/vaccination/dashboard/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['doses_today'] >= 1
    assert data['total_records'] >= 1
    assert isinstance(data['by_vaccine'], list)