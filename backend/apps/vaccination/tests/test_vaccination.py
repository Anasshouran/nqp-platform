import threading

import pytest
from datetime import date, timedelta

from django.db import connection, transaction
from django.utils import timezone

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint, Sector, State
from apps.travelers.models import Country, Traveler
from apps.vaccination.models import (
    CertificateVerification,
    InventoryTransaction,
    VaccinationAuditLog,
    VaccinationCertificate,
    VaccinationRecord,
    VaccinationRule,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)
from apps.vaccination.services import (
    assess_traveler,
    issue_certificate,
    next_certificate_number,
    record_vaccination,
    reissue_certificate,
    replace_certificate,
    revoke_certificate,
    traveler_summary,
)
from apps.vaccination.views import PublicVaccinationVerifyView

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


def _user_with(email, role_code, actions, scope_type='PORT', entry_point=None):
    role, _ = Role.objects.get_or_create(code=role_code, defaults={'name': role_code, 'name_ar': role_code})
    for action in actions:
        perm, _ = Permission.objects.get_or_create(
            code=f'vaccination:{action}',
            defaults={'name': action, 'resource': 'vaccination', 'action': action},
        )
        role.permissions.add(perm)
    user = User.objects.create_user(email=email, password='x', full_name=email, role=role)
    RoleAssignment.objects.create(
        user=user,
        role=role,
        scope_type=getattr(RoleAssignment.ScopeType, scope_type),
        scope_id=entry_point.id if entry_point else None,
        is_active=True,
        start_date=timezone.localdate(),
        assigned_by=user,
    )
    return user


@pytest.fixture
def port_sector():
    return Sector.objects.create(code='SEA_V', name_ar='البحري')


@pytest.fixture
def entry_point(port_sector):
    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=port_sector)
    return EntryPoint.objects.create(
        code='PSD', name_ar='بورتسودان', kind=EntryPoint.Kind.SEAPORT, state=state,
    )


@pytest.fixture
def other_entry_point(port_sector):
    state = State.objects.get_or_create(code='RS', defaults={'name_ar': 'البحر الأحمر', 'sector': port_sector})[0]
    return EntryPoint.objects.create(
        code='SUD', name_ar='السودان', kind=EntryPoint.Kind.SEAPORT, state=state,
    )


@pytest.fixture
def staff_user(entry_point):
    return _user_with(
        'officer.vac@test.sd',
        'VACCINATION_OFFICER',
        ['view', 'add', 'edit', 'issue', 'verify'],
        entry_point=entry_point,
    )


@pytest.fixture
def add_only_user(entry_point):
    """يملك `view` + `add` بلا `issue`/`edit`/`verify` — لا يُصدر ولا يُلغي."""
    return _user_with('adder.vac@test.sd', 'VACCINATION_ADDER', ['view', 'add'], entry_point=entry_point)


@pytest.fixture
def site(entry_point):
    return VaccinationSite.objects.create(
        name_ar='عيادة بورتسودان', kind=VaccinationSite.Kind.PORT_POINT, entry_point=entry_point,
    )


@pytest.fixture
def other_site(other_entry_point):
    return VaccinationSite.objects.create(
        name_ar='عيادة بحر الأحمر',
        name_en='Red Sea Clinic',
        kind=VaccinationSite.Kind.PORT_POINT,
        entry_point=other_entry_point,
    )


@pytest.fixture
def issued_certificate(traveler, vaccine, batch, site, admin_user):
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'site': site, 'administered_at': date.today()},
        admin_user,
    )
    return issue_certificate(record, admin_user)


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
    resp = client.get(
        f'/api/v1/vaccination/public/verify/{cert.certificate_number}/'
        f'?sig={cert.verification_signature}'
    )
    assert resp.status_code == 200
    body = resp.json()['data']
    assert body['verified'] is True
    assert body['certificate_number'] == cert.certificate_number
    assert body['status'] == VaccinationCertificate.Status.ACTIVE
    assert body['vaccine_code'] == 'YF'
    assert body['vaccine_name_ar'] == 'الحمى الصفراء'
    assert body['valid_until'] == cert.valid_until.isoformat()
    assert body['signature_valid'] is True
    # الاستجابة العامة لا تُعرِّض أي PII (لا اسم ولا جواز).
    assert 'traveler_name' not in body
    assert 'passport_number' not in body

    cert.status = VaccinationCertificate.Status.REVOKED
    cert.save(update_fields=['status'])
    resp = client.get(
        f'/api/v1/vaccination/public/verify/{cert.certificate_number}/'
        f'?sig={cert.verification_signature}'
    )
    assert resp.status_code == 200
    assert resp.json()['data']['verified'] is False


def test_public_verify_unknown_code():
    resp = APIClient().get('/api/v1/vaccination/public/verify/AFY-VAC-NOPE/')
    assert resp.status_code == 404


def test_private_endpoints_require_auth():
    resp = APIClient().get('/api/v1/vaccination/records/')
    assert resp.status_code == 401


def test_officer_can_create_record_and_issue_certificate_via_api(traveler, vaccine, batch, site, staff_user):
    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.post(
        '/api/v1/vaccination/records/',
        {
            'passport_number': 'P12345',
            'vaccine': str(vaccine.id),
            'batch': str(batch.id),
            'site': str(site.id),
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


@pytest.fixture
def given_record(traveler, vaccine, batch, site, admin_user):
    return record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'site': site, 'administered_at': date.today()},
        admin_user,
    )


def test_certificate_issue_requires_issue_not_just_add(given_record, add_only_user, staff_user):
    """`add` وحدها لا تكفي: الإصدار يقتضي `vaccination:issue`."""
    client = APIClient()
    client.force_authenticate(add_only_user)
    resp = client.post(
        '/api/v1/vaccination/certificates/',
        {'record': str(given_record.id)},
        format='json',
    )
    assert resp.status_code == 403
    assert not VaccinationCertificate.objects.filter(record=given_record).exists()

    client.force_authenticate(staff_user)
    resp = client.post(
        '/api/v1/vaccination/certificates/',
        {'record': str(given_record.id)},
        format='json',
    )
    assert resp.status_code == 201, resp.content


def test_certificate_qr_requires_issue_permission(issued_certificate, add_only_user, staff_user):
    url = f'/api/v1/vaccination/certificates/{issued_certificate.id}/qr/'
    client = APIClient()
    client.force_authenticate(add_only_user)
    assert client.get(url).status_code == 403

    client.force_authenticate(staff_user)
    resp = client.get(url)
    assert resp.status_code == 200
    assert 'qr_png' in resp.json()['data']


def test_certificate_revoke_requires_issue_permission(issued_certificate, add_only_user, staff_user):
    url = f'/api/v1/vaccination/certificates/{issued_certificate.id}/revoke/'
    client = APIClient()
    client.force_authenticate(add_only_user)
    assert client.post(url, {}, format='json').status_code == 403
    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE

    client.force_authenticate(staff_user)
    assert client.post(url, {}, format='json').status_code == 200
    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED


def test_batch_adjust_requires_edit_permission(batch, add_only_user, staff_user):
    url = f'/api/v1/vaccination/batches/{batch.id}/adjust/'
    client = APIClient()
    client.force_authenticate(add_only_user)
    assert client.post(url, {'delta': 5, 'reason': 'تسوية'}, format='json').status_code == 403
    batch.refresh_from_db()
    assert batch.available_quantity == 50

    client.force_authenticate(staff_user)
    resp = client.post(url, {'delta': 5, 'reason': 'تسوية'}, format='json')
    assert resp.status_code == 200
    batch.refresh_from_db()
    assert batch.available_quantity == 55


def test_verification_log_requires_verify_permission(issued_certificate, add_only_user, staff_user):
    CertificateVerification.objects.create(
        certificate=issued_certificate,
        success=True,
        ip_address='127.0.0.1',
        note='تحقق اختباري',
    )
    client = APIClient()
    client.force_authenticate(add_only_user)
    assert client.get('/api/v1/vaccination/verifications/').status_code == 403

    client.force_authenticate(staff_user)
    resp = client.get('/api/v1/vaccination/verifications/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] == 1


def test_read_only_helpers_stay_on_view_permission(traveler, add_only_user):
    """البحث والتقييم يقرآن فقط — يبقىان على `view` بلا `issue`."""
    client = APIClient()
    client.force_authenticate(add_only_user)
    assert client.get('/api/v1/vaccination/records/search-traveler/?passport=P12345').status_code == 200
    resp = client.post(
        '/api/v1/vaccination/records/assess/',
        {'passport_number': 'P12345'},
        format='json',
    )
    assert resp.status_code == 200
    assert 'assessment' in resp.json()['data']


def test_certificate_cannot_be_edited_or_deleted(issued_certificate, staff_user):
    """لا مسارات PUT/PATCH/DELETE: الشهادة تُصدر وتُلغى فقط."""
    before = (issued_certificate.valid_until, issued_certificate.status)
    client = APIClient()
    client.force_authenticate(staff_user)
    url = f'/api/v1/vaccination/certificates/{issued_certificate.id}/'

    assert client.put(url, {'valid_until': '2099-01-01'}, format='json').status_code == 405
    assert client.patch(url, {'valid_until': '2099-01-01'}, format='json').status_code == 405
    assert client.delete(url).status_code == 405

    issued_certificate.refresh_from_db()
    assert (issued_certificate.valid_until, issued_certificate.status) == before


def test_certificate_revoke_is_the_only_mutation_path(issued_certificate, staff_user):
    """الإلغاء يترك سجلاً: الحالة تتغير ولا تُحذف الوثيقة."""
    client = APIClient()
    client.force_authenticate(staff_user)
    assert client.post(f'/api/v1/vaccination/certificates/{issued_certificate.id}/revoke/', {}, format='json').status_code == 200

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED
    # الشهادة الملغاة تبقى في قاعدة البيانات للتدقيق.
    resp = client.get('/api/v1/vaccination/certificates/?status=REVOKED')
    assert resp.status_code == 200
    assert str(issued_certificate.id) in [row['id'] for row in resp.json()['data']['results']]


def test_certificate_number_collision_is_retried(traveler, vaccine, batch, admin_user, monkeypatch):
    """تصادم الرقم تحت التزامن يُعاد حسابه بدل رمي 500."""
    first = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()}, admin_user
    )
    second = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()}, admin_user
    )
    taken = issue_certificate(first, admin_user)
    assert taken.certificate_number == 'AFY-VAC-000001'

    real_next = next_certificate_number
    calls = {'n': 0}

    def colliding():
        calls['n'] += 1
        # المحاولة الأولى ترجع رقماً محجوزاً فعلاً ⇒ IntegrityError متوقّع.
        return taken.certificate_number if calls['n'] == 1 else real_next()

    monkeypatch.setattr('apps.vaccination.services.next_certificate_number', colliding)

    retried = issue_certificate(second, admin_user)
    assert calls['n'] == 2
    assert retried.certificate_number == 'AFY-VAC-000002'
    assert retried.verification_path == '/verify/vaccination/AFY-VAC-000002'


def test_certificate_number_exhaustion_raises_value_error(traveler, vaccine, batch, admin_user):
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()}, admin_user
    )
    VaccinationCertificate.objects.create(
        traveler=traveler,
        vaccine=vaccine,
        certificate_number='AFY-VAC-999999',
        valid_until=date.today() + timedelta(days=3650),
        validity_days=3650,
    )
    with pytest.raises(ValueError):
        issue_certificate(record, admin_user)


def test_inactive_site_is_reachable_for_reactivation(admin_user):
    """العيادة المعطّلة مخفية في القوائم لكنها قابلة للاسترجاع والتعديل."""
    site = VaccinationSite.objects.create(name_ar='عيادة متوقفة', is_active=False)
    client = APIClient()
    client.force_authenticate(admin_user)

    listed = client.get('/api/v1/vaccination/sites/')
    assert listed.status_code == 200
    assert str(site.id) not in [row['id'] for row in listed.json()['data']['results']]

    with_all = client.get('/api/v1/vaccination/sites/?include_inactive=true')
    assert with_all.status_code == 200
    assert str(site.id) in [row['id'] for row in with_all.json()['data']['results']]

    # الوصول بمعرّفه لا يتأثر بترشيح القائمة.
    assert client.get(f'/api/v1/vaccination/sites/{site.id}/').status_code == 200

    resp = client.patch(f'/api/v1/vaccination/sites/{site.id}/', {'is_active': True}, format='json')
    assert resp.status_code == 200, resp.content
    site.refresh_from_db()
    assert site.is_active is True

    assert client.delete(f'/api/v1/vaccination/sites/{site.id}/').status_code == 204
    assert not VaccinationSite.objects.filter(pk=site.id).exists()


def test_expired_certificate_is_not_counted_as_active(issued_certificate, admin_user):
    """`EXPIRED` مشتق عند الاستعلام: لا يُحسب نشطاً في أي عداد أو استعلام."""
    record = issued_certificate.record
    VaccinationCertificate.objects.filter(pk=issued_certificate.id).update(
        valid_until=date.today() - timedelta(days=1)
    )
    issued_certificate.refresh_from_db()

    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert issued_certificate.effective_status == VaccinationCertificate.Status.EXPIRED
    assert issued_certificate.is_valid is False

    client = APIClient()
    client.force_authenticate(admin_user)
    dashboard = client.get('/api/v1/vaccination/dashboard/')
    assert dashboard.status_code == 200
    assert dashboard.json()['data']['active_certificates'] == 0

    assert traveler_summary(record.traveler)['certificates'] == []

    anon = APIClient()
    lookup = anon.get('/api/v1/vaccination/public/lookup/?passport=P12345')
    assert lookup.status_code == 200
    assert lookup.json()['data']['certificates'] == []

    verified = anon.get(
        f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
        f'?sig={issued_certificate.verification_signature}'
    )
    assert verified.status_code == 200
    assert verified.json()['data']['verified'] is False
    assert verified.json()['data']['status'] == VaccinationCertificate.Status.EXPIRED


def test_expired_certificate_can_be_reissued(issued_certificate, admin_user):
    """الشهادة المنتهية لا تُعدَّل ولا تُلغى: تُصدَر شهادة جديدة."""
    issued_certificate.valid_until = date.today() - timedelta(days=1)
    issued_certificate.save()

    fresh = issue_certificate(issued_certificate.record, admin_user)

    assert fresh.pk != issued_certificate.pk
    assert fresh.status == VaccinationCertificate.Status.ACTIVE
    assert fresh.is_valid is True
    assert fresh.valid_until > date.today()


def test_qr_encodes_a_scannable_signed_verification_url(issued_certificate, staff_user):
    """الرمز يرمز إلى رابط قابل للمسح، لا إلى نصّ لا يفهمه قارئ."""
    import base64

    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.get(f'/api/v1/vaccination/certificates/{issued_certificate.id}/qr/')
    assert resp.status_code == 200

    data = resp.json()['data']
    number = issued_certificate.certificate_number
    # بلا PUBLIC_SITE_URL يسقط إلى مضيف الطلب —acceptable للتطوير، لا للإنتاج.
    assert data['verification_url'].endswith(f'/verify/vaccination/{number}?sig={issued_certificate.verification_signature}')
    assert data['signature'] == issued_certificate.verification_signature
    # PNG حقيقي، لا نصاً base64 فارغاً.
    assert base64.b64decode(data['qr_png'])[:8] == b'\x89PNG\r\n\x1a\n'



# ---- Reissue eligibility tests (Phase 2A-BE-R1) ---

def test_reissue_active_future_cannot_reissue(issued_certificate, admin_user):
    """ACTIVE + future valid_until: reissue rejected with HTTP 400."""
    client = APIClient()
    client.force_authenticate(admin_user)
    url = f'/api/v1/vaccination/certificates/{issued_certificate.id}/reissue/'
    resp = client.post(url)
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'
    assert VaccinationCertificate.objects.filter(pk=issued_certificate.pk).count() == 1
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()


def test_reissue_active_today_cannot_reissue(issued_certificate, admin_user):
    """ACTIVE + today valid_until: reissue rejected with HTTP 400."""
    issued_certificate.valid_until = timezone.localdate()
    issued_certificate.save(update_fields=['valid_until'])

    client = APIClient()
    client.force_authenticate(admin_user)
    url = f'/api/v1/vaccination/certificates/{issued_certificate.id}/reissue/'
    resp = client.post(url)
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'
    assert VaccinationCertificate.objects.filter(pk=issued_certificate.pk).count() == 1
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()


def test_reissue_active_expired_can_reissue(issued_certificate, admin_user):
    """ACTIVE + expired valid_until: reissue allowed (critical regression test)."""
    from django.db import transaction

    issued_certificate.valid_until = timezone.localdate() - timedelta(days=1)
    issued_certificate.save()

    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert issued_certificate.effective_status == VaccinationCertificate.Status.EXPIRED
    assert issued_certificate.is_valid is False

    from apps.vaccination.services import reissue_certificate as svc_reissue

    with transaction.atomic():
        new_cert = svc_reissue(issued_certificate.pk, issued_certificate.issued_by)

    assert new_cert.pk != issued_certificate.pk
    assert new_cert.status == VaccinationCertificate.Status.ACTIVE
    assert new_cert.replaces_id == issued_certificate.pk
    assert new_cert.certificate_number != issued_certificate.certificate_number
    assert new_cert.qr_token != issued_certificate.qr_token
    assert new_cert.valid_until > timezone.localdate()

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert issued_certificate.replaced_at is None


def test_reissue_revoked_can_reissue(issued_certificate, admin_user):
    """REVOKED: reissue allowed."""
    from apps.vaccination.services import reissue_certificate as svc_reissue

    issued_certificate.status = VaccinationCertificate.Status.REVOKED
    issued_certificate.save()

    with transaction.atomic():
        new_cert = svc_reissue(issued_certificate.pk, issued_certificate.issued_by)

    assert new_cert.pk != issued_certificate.pk
    assert new_cert.status == VaccinationCertificate.Status.ACTIVE
    assert new_cert.replaces_id == issued_certificate.pk

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED


def test_reissue_expired_persisted_can_reissue(issued_certificate, admin_user):
    """EXPIRED persisted: reissue allowed."""
    from apps.vaccination.services import reissue_certificate as svc_reissue

    issued_certificate.status = VaccinationCertificate.Status.EXPIRED
    issued_certificate.save()

    with transaction.atomic():
        new_cert = svc_reissue(issued_certificate.pk, issued_certificate.issued_by)

    assert new_cert.pk != issued_certificate.pk
    assert new_cert.status == VaccinationCertificate.Status.ACTIVE
    assert new_cert.replaces_id == issued_certificate.pk

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.EXPIRED


def test_reissue_chain(issued_certificate, admin_user):
    """السلسلة A → B → C فقط بعد أن يصبح B مؤهلاً بنفسه.

    B فعّالة بعد إصدارها ⇒ محاولة إصدار C من B مرفوضة حتى تنتهي صلاحيتها
    أو تُلغى. A تبقى بطفيل مباشر واحد (B) وB بطفيل واحد (C)."""
    # A مؤهلة: منتهية الصلاحية.
    issued_certificate.valid_until = date.today() - timedelta(days=1)
    issued_certificate.save(update_fields=['valid_until'])

    B = reissue_certificate(issued_certificate.pk, admin_user)
    assert B.replaces_id == issued_certificate.pk
    assert B.record_id == issued_certificate.record_id

    # B فعّالة (3650 يوماً) ⇒ غير مؤهلاً لإعادة الإصدار.
    with pytest.raises(ValueError):
        reissue_certificate(B.pk, admin_user)

    # B تصبح غير فعّالة ⇒ يُعاد إصدارها إلى C.
    B.valid_until = date.today() - timedelta(days=1)
    B.save(update_fields=['valid_until'])
    C = reissue_certificate(B.pk, admin_user)
    assert C.replaces_id == B.pk
    assert C.record_id == issued_certificate.record_id

    # A طفلها B فقط، وB طفلها C فقط — لا تفرّع.
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).first().pk == B.pk
    assert VaccinationCertificate.objects.filter(replaces=B).count() == 1
    assert VaccinationCertificate.objects.filter(replaces=B).first().pk == C.pk


def test_qr_uses_public_site_url_when_configured(issued_certificate, staff_user, settings):
    """رابط مُطبوع على شهادة لا ينفع خلف وكيل عكسي بلا أصل عام ثابت."""
    settings.PUBLIC_SITE_URL = 'https://nqp.gov.sd'
    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.get(f'/api/v1/vaccination/certificates/{issued_certificate.id}/qr/')
    assert resp.json()['data']['verification_url'].startswith('https://nqp.gov.sd/verify/vaccination/')


def test_public_verify_accepts_the_signature_carried_by_the_qr(issued_certificate):
    anon = APIClient()
    url = f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
    resp = anon.get(f'{url}?sig={issued_certificate.verification_signature}')
    assert resp.status_code == 200
    assert resp.json()['data']['signature_valid'] is True
    assert resp.json()['data']['verified'] is True


def test_public_verify_rejects_tampered_signature(issued_certificate):
    anon = APIClient()
    url = f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
    resp = anon.get(f'{url}?sig=deadbeef')
    assert resp.status_code == 400
    assert resp.json()['data']['signature_valid'] is False

    log = CertificateVerification.objects.filter(certificate=issued_certificate).latest('created_at')
    assert log.success is False
    assert 'عبث' in log.note


def test_public_verify_without_signature_fails_closed(issued_certificate):
    """NG-04 (P1.5): QR بلا توقيع مرجع غير مقبول — فشل-إغلاق (400)."""
    resp = APIClient().get(f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/')
    assert resp.status_code == 400
    body = resp.json()['data']
    assert body['signature_valid'] is False
    assert body['certificate_number'] == issued_certificate.certificate_number
    log = CertificateVerification.objects.filter(certificate=issued_certificate).latest('created_at')
    assert log.success is False


def test_public_verify_is_rate_limited(issued_certificate):
    """أرقام الشهادات تسلسلية، فتخمينُها بلا حدّ مقبول ليس مقبولاً."""
    from rest_framework.settings import api_settings

    assert PublicVaccinationVerifyView.throttle_classes == [ScopedRateThrottle]
    assert PublicVaccinationVerifyView.throttle_scope == 'traveler_lookup'
    assert 'traveler_lookup' in api_settings.DEFAULT_THROTTLE_RATES


# --- تقييد النطاق بنقطة الدخول -------------------------------------------------
# `role: VACCINATION_OFFICER` نطاقه PORT حسب `seed_rbac`. قبل هذا التقييد كانت
# كل نقاط النهاية ترجع بيانات البلاد كاملة: مسجّل بورتسودان يرى جرعات وعيادات
# ومنشآت كل المنافذ، واللوحة تعرض أرقاماً وطنية.


def _manager():
    return _user_with(
        'manager.vac@test.sd', 'VACCINATION_MANAGER', ['view', 'add', 'edit', 'issue', 'verify'],
        scope_type='GLOBAL',
    )


def _other_port_certificate(country, vaccine, batch, other_site, admin_user):
    traveler = Traveler.objects.create(
        passport_number='P99999', first_name='علي', last_name='سالم',
        date_of_birth=date(1988, 1, 1), nationality=country,
    )
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'site': other_site,
         'administered_at': date.today()},
        admin_user,
    )
    return record, issue_certificate(record, admin_user)


def test_port_officer_sees_only_own_port_sites(staff_user, site, other_site):
    client = APIClient()
    client.force_authenticate(staff_user)
    names = {row['name_ar'] for row in client.get('/api/v1/vaccination/sites/').json()['data']['results']}
    assert site.name_ar in names
    assert other_site.name_ar not in names


def test_port_officer_list_hides_other_port_certificates(issued_certificate, country, vaccine, batch,
                                                         other_site, admin_user, staff_user):
    _, other_cert = _other_port_certificate(country, vaccine, batch, other_site, admin_user)
    client = APIClient()
    client.force_authenticate(staff_user)
    numbers = {
        row['certificate_number']
        for row in client.get('/api/v1/vaccination/certificates/').json()['data']['results']
    }
    assert issued_certificate.certificate_number in numbers
    assert other_cert.certificate_number not in numbers


def test_port_officer_cannot_open_another_port_certificate(issued_certificate, country, vaccine, batch,
                                                           other_site, admin_user, staff_user):
    _, other_cert = _other_port_certificate(country, vaccine, batch, other_site, admin_user)
    client = APIClient()
    client.force_authenticate(staff_user)
    assert client.get(f'/api/v1/vaccination/certificates/{other_cert.id}/').status_code == 404
    # الإلغاء وQR محميان بنفس الـ queryset المقصوص.
    assert client.post(f'/api/v1/vaccination/certificates/{other_cert.id}/revoke/').status_code == 404
    assert client.get(f'/api/v1/vaccination/certificates/{other_cert.id}/qr/').status_code == 404


def test_port_officer_cannot_issue_certificate_for_another_port_record(country, vaccine, batch, site,
                                                                       other_site, admin_user, staff_user):
    other_record, _ = _other_port_certificate(country, vaccine, batch, other_site, admin_user)
    before = VaccinationCertificate.objects.filter(record=other_record).count()
    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.post('/api/v1/vaccination/certificates/', {'record': str(other_record.id)}, format='json')
    assert resp.status_code == 404
    assert VaccinationCertificate.objects.filter(record=other_record).count() == before


def test_dashboard_counts_only_own_port(traveler, vaccine, batch, site, other_site, admin_user, staff_user):
    record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'site': site, 'administered_at': date.today()},
        admin_user,
    )
    _other_port_certificate(traveler.nationality, vaccine, batch, other_site, admin_user)
    client = APIClient()
    client.force_authenticate(staff_user)
    data = client.get('/api/v1/vaccination/dashboard/').json()['data']
    assert data['total_records'] == 1
    assert data['active_certificates'] == 0
    assert data['doses_today'] == 1
    assert [r['passport_number'] for r in data['recent_records']] == ['P12345']
    # المخزون وطني: التشغيلة مشتركة بين المنافذ فلا يُقصّ.
    assert data['batches_count'] >= 1


def test_verification_log_is_scoped_to_own_port(issued_certificate, country, vaccine, batch, other_site,
                                               admin_user, staff_user):
    _, other_cert = _other_port_certificate(country, vaccine, batch, other_site, admin_user)
    CertificateVerification.objects.create(certificate=other_cert, success=True)
    CertificateVerification.objects.create(certificate=issued_certificate, success=True)
    client = APIClient()
    client.force_authenticate(staff_user)
    rows = client.get('/api/v1/vaccination/verifications/').json()['data']['results']
    assert {row['certificate'] for row in rows} == {str(issued_certificate.id)}


def test_manager_with_global_scope_sees_every_port(issued_certificate, country, vaccine, batch, other_site,
                                                   admin_user):
    _, other_cert = _other_port_certificate(country, vaccine, batch, other_site, admin_user)
    client = APIClient()
    client.force_authenticate(_manager())
    numbers = {
        row['certificate_number']
        for row in client.get('/api/v1/vaccination/certificates/').json()['data']['results']
    }
    assert {issued_certificate.certificate_number, other_cert.certificate_number} <= numbers


def test_user_without_port_scope_sees_nothing(issued_certificate):
    """فشل آمن: من لا نطاق له لا يرى شيئاً، بدل رؤية كل شيء."""
    client = APIClient()
    client.force_authenticate(_user_with('nos.scope.vac@test.sd', 'VACCINATION_ADDER', ['view', 'add']))
    for url in ('/api/v1/vaccination/certificates/', '/api/v1/vaccination/records/', '/api/v1/vaccination/sites/'):
        assert client.get(url).json()['data']['results'] == []


def test_record_without_site_is_hidden_from_port_officer_but_visible_to_manager(traveler, vaccine, batch,
                                                                              staff_user):
    """سجل بلا عيادة لا ينسبه منفذ، فلا يظهر لمحدَّد النطاق.

    الفشل آمن: أفضل من إظهاره لكل مسجّل في البلاد على خفاية المنافذ.
    """
    orphan = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        staff_user,
    )
    client = APIClient()
    client.force_authenticate(staff_user)
    assert client.get('/api/v1/vaccination/records/').json()['data']['results'] == []
    assert client.get(f'/api/v1/vaccination/records/{orphan.id}/').status_code == 404

    client.force_authenticate(_manager())
    assert client.get(f'/api/v1/vaccination/records/{orphan.id}/').status_code == 200


def test_port_officer_cannot_record_a_dose_in_another_port_site(traveler, vaccine, batch, other_site, staff_user):
    """الكتابة مقصوصة كالقراءة: بلا هذا يكتب مسجّل ميناء في عيادة ميناء آخر."""
    client = APIClient()
    client.force_authenticate(staff_user)
    resp = client.post(
        '/api/v1/vaccination/records/',
        {
            'passport_number': traveler.passport_number,
            'vaccine': str(vaccine.id),
            'batch': str(batch.id),
            'site': str(other_site.id),
            'administered_at': str(date.today()),
        },
        format='json',
    )
    assert resp.status_code == 400
    assert not VaccinationRecord.objects.filter(site=other_site).exists()
    # ولم تُخصم جرعة من المخزون.
    batch.refresh_from_db()
    assert batch.available_quantity == 50


# ---- Phase 2B-R2: lifecycle remediation coverage ----


def _expire_certificate(cert):
    """جعل الشهادة غير فعّالة بالاشتقاق: status=ACTIVE لكن valid_until ماضٍ."""
    cert.valid_until = date.today() - timedelta(days=1)
    cert.save(update_fields=['valid_until'])
    return cert


def _issue_url(cert, action):
    return f'/api/v1/vaccination/certificates/{cert.id}/{action}/'


def test_issue_sequential_duplicate_returns_existing_certificate(traveler, vaccine, batch, admin_user):
    """الإصدار المتسلسل لنفس الجرعة يعيد الشهادة ولا يضاعفها."""
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    first = issue_certificate(record, admin_user)
    second = issue_certificate(record, admin_user)

    assert second.pk == first.pk
    assert VaccinationCertificate.objects.filter(record=record).count() == 1
    assert VaccinationAuditLog.objects.filter(action='ISSUE', certificate=first).count() == 1


def test_issue_after_expiry_keeps_single_current_certificate(traveler, vaccine, batch, admin_user):
    """شهادة منتهية لا تحجب إصداراً جديداً ولا تترك شهادتين حاليتين."""
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    old = issue_certificate(record, admin_user)
    _expire_certificate(old)

    new = issue_certificate(record, admin_user)
    assert new.pk != old.pk

    active = VaccinationCertificate.objects.filter(record=record).active()
    assert active.count() == 1
    assert active.first().pk == new.pk
    old.refresh_from_db()
    assert old.is_valid is False


def test_issue_audit_failure_rolls_back_mutation(traveler, vaccine, batch, admin_user, monkeypatch):
    """فشل كتابة التدقيق يُرجِع الإصدار بأكمله — لا شهادة بلا تدقيق."""

    def boom(*args, **kwargs):
        raise RuntimeError('audit insert failed')

    monkeypatch.setattr(VaccinationAuditLog.objects, 'create', boom)
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    with pytest.raises(RuntimeError):
        issue_certificate(record, admin_user)

    assert not VaccinationCertificate.objects.filter(record=record).exists()
    assert not VaccinationAuditLog.objects.filter(action='ISSUE').exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_issue_produces_single_current_certificate(traveler, vaccine, batch, admin_user):
    """N محاولات إصدار متزامنة لنفس المجال تُخرج شهادة حالية واحدة بالضبط."""
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    n = 4
    barrier = threading.Barrier(n, timeout=30)
    results = {}
    errors = []

    def worker(i):
        try:
            barrier.wait()
            cert = issue_certificate(record, admin_user)
            results[i] = cert.pk
        except Exception as exc:
            errors.append(f'{i}: {type(exc).__name__}: {exc}')
        finally:
            connection.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=90)

    assert not errors, errors
    assert len(results) == n, results
    active = VaccinationCertificate.objects.filter(record=record).active()
    assert active.count() == 1
    assert set(results.values()) == {active.first().pk}


def test_replace_active_future_succeeds_with_audit(issued_certificate, admin_user):
    """استبدال ACTIVE بصلاحية مستقبلية: نجاح + إلغاء الأصل + تدقيق ذري."""
    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.post(_issue_url(issued_certificate, 'replace'), {'replacement_reason': 'تالف'}, format='json')
    assert resp.status_code == 200, resp.content

    new_cert = VaccinationCertificate.objects.get(pk=resp.json()['data']['id'])
    assert new_cert.replaces_id == issued_certificate.pk
    assert new_cert.record_id == issued_certificate.record_id
    assert new_cert.status == VaccinationCertificate.Status.ACTIVE
    assert new_cert.is_valid is True

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED
    assert issued_certificate.replaced_at is not None

    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1

    audit = VaccinationAuditLog.objects.get(action='REPLACE', certificate=new_cert)
    assert audit.source_certificate_id == issued_certificate.pk
    assert audit.record_id == issued_certificate.record_id
    assert audit.user_id == admin_user.pk
    assert audit.details.get('replacement_reason') == 'تالف'


def test_replace_active_today_succeeds(issued_certificate, admin_user):
    """استبدال ACTIVE بصلاحية تنتهي اليوم: مسموح (effective_status = ACTIVE)."""
    issued_certificate.valid_until = timezone.localdate()
    issued_certificate.save(update_fields=['valid_until'])

    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.post(_issue_url(issued_certificate, 'replace'), {}, format='json')
    assert resp.status_code == 200, resp.content

    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1
    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED


def test_replace_active_expired_returns_400(issued_certificate, admin_user):
    """استبدال ACTIVE منتهية الصلاحية: رفض 400 بلا أي تغيير."""
    _expire_certificate(issued_certificate)

    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.post(_issue_url(issued_certificate, 'replace'), {}, format='json')
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert issued_certificate.replaced_at is None
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()
    assert not VaccinationAuditLog.objects.filter(action='REPLACE').exists()


def test_replace_revoked_returns_400(issued_certificate, admin_user):
    """استبدال شهادة ملغاة: رفض 400."""
    issued_certificate.status = VaccinationCertificate.Status.REVOKED
    issued_certificate.save(update_fields=['status'])

    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.post(_issue_url(issued_certificate, 'replace'), {}, format='json')
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()


def test_replace_persisted_expired_returns_400(issued_certificate, admin_user):
    """استبدال شهادة حالتها المخزنة EXPIRED: رفض 400."""
    issued_certificate.status = VaccinationCertificate.Status.EXPIRED
    issued_certificate.save(update_fields=['status'])

    client = APIClient()
    client.force_authenticate(admin_user)
    resp = client.post(_issue_url(issued_certificate, 'replace'), {}, format='json')
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()


def test_replace_preserves_record_and_blocks_new_issue(traveler, vaccine, batch, admin_user):
    """الاستبدال يحمل سجل الجرعة: الإصدار اللاحق لا ينشئ شهادة ثانية حالية."""
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    A = issue_certificate(record, admin_user)
    B = replace_certificate(A.pk, 'استبدال', admin_user)

    assert B.record_id == record.pk
    assert B.replaces_id == A.pk
    A.refresh_from_db()
    assert A.status == VaccinationCertificate.Status.REVOKED

    C = issue_certificate(record, admin_user)
    assert C.pk == B.pk
    assert VaccinationCertificate.objects.filter(record=record).count() == 2
    assert VaccinationCertificate.objects.filter(record=record).active().count() == 1


def test_replace_audit_failure_rolls_back_mutation(issued_certificate, admin_user, monkeypatch):
    """فشل التدقيق يُرجِع الاستبدال: الأصل يبقى فعّالاً ولا يُنشأ بديل."""

    def boom(*args, **kwargs):
        raise RuntimeError('audit insert failed')

    monkeypatch.setattr(VaccinationAuditLog.objects, 'create', boom)
    with pytest.raises(RuntimeError):
        replace_certificate(issued_certificate.pk, 'x', admin_user)

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert issued_certificate.replaced_at is None
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()
    assert not VaccinationAuditLog.objects.filter(action='REPLACE').exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_replace_creates_single_replacement(issued_certificate, admin_user):
    """استبدالان متزامنان لنفس المصدر: واحد ينجح والآخر يُرفض بأمان."""
    barrier = threading.Barrier(2, timeout=30)
    results = []
    errors = []

    def worker():
        try:
            barrier.wait()
            results.append(replace_certificate(issued_certificate.pk, 'سباق', admin_user).pk)
        except ValueError as exc:
            errors.append(str(exc))
        except Exception as exc:
            errors.append(f'UNEXPECTED {type(exc).__name__}: {exc}')
        finally:
            connection.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=90)

    assert len(results) == 1, results
    assert len(errors) == 1, errors
    assert 'UNEXPECTED' not in errors[0], errors

    children = VaccinationCertificate.objects.filter(replaces=issued_certificate)
    assert children.count() == 1
    assert children.first().pk == results[0]
    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED


def test_reissue_first_call_creates_single_child(issued_certificate, admin_user):
    """الاستدعاء الأول ينشئ طفلًا واحدًا ويسجّل تدقيقاً واحداً."""
    _expire_certificate(issued_certificate)

    B = reissue_certificate(issued_certificate.pk, admin_user)
    assert B.replaces_id == issued_certificate.pk
    assert B.record_id == issued_certificate.record_id
    assert B.status == VaccinationCertificate.Status.ACTIVE
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1

    audits = VaccinationAuditLog.objects.filter(action='REISSUE', source_certificate=issued_certificate)
    assert audits.count() == 1
    assert audits.first().certificate_id == B.pk


def test_reissue_second_call_returns_same_child(issued_certificate, admin_user):
    """الاستدعاء الثاني يعيد الطفل نفسه بلا إنشاء أو تدقيق جديد."""
    _expire_certificate(issued_certificate)
    B = reissue_certificate(issued_certificate.pk, admin_user)

    B2 = reissue_certificate(issued_certificate.pk, admin_user)
    assert B2.pk == B.pk
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1
    assert VaccinationAuditLog.objects.filter(action='REISSUE', source_certificate=issued_certificate).count() == 1


def test_reissue_third_call_returns_same_child(issued_certificate, admin_user):
    """الاستدعاء الثالث أيضاً يعيد الطفل نفسه."""
    _expire_certificate(issued_certificate)
    B = reissue_certificate(issued_certificate.pk, admin_user)
    reissue_certificate(issued_certificate.pk, admin_user)

    B3 = reissue_certificate(issued_certificate.pk, admin_user)
    assert B3.pk == B.pk
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1


def test_reissue_returns_revoked_child_not_new_one(issued_certificate, admin_user):
    """طفل ملغى يبقى الطفل الوحيد: إعادة إصدار الأصل تعيده لا تنشئ شقيقاً."""
    _expire_certificate(issued_certificate)
    B = reissue_certificate(issued_certificate.pk, admin_user)
    B.status = VaccinationCertificate.Status.REVOKED
    B.save(update_fields=['status'])

    again = reissue_certificate(issued_certificate.pk, admin_user)
    assert again.pk == B.pk
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1
    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exclude(pk=B.pk).exists()


def test_reissue_returns_expired_child_not_new_one(issued_certificate, admin_user):
    """طفل منتهي الصلاحية يبقى الطفل الوحيد نفسه."""
    _expire_certificate(issued_certificate)
    B = reissue_certificate(issued_certificate.pk, admin_user)
    _expire_certificate(B)

    again = reissue_certificate(issued_certificate.pk, admin_user)
    assert again.pk == B.pk
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1


def test_reissue_second_direct_child_is_impossible(issued_certificate, admin_user):
    """A→B ثم A→C مستحيل مهما كان حالة B: العدّ يبقى واحداً دائماً."""
    _expire_certificate(issued_certificate)
    B = reissue_certificate(issued_certificate.pk, admin_user)

    # كل إعادة إصدار تُرجع B: مرة وهو ملغى ومرة وهو منتهٍ.
    B.status = VaccinationCertificate.Status.REVOKED
    B.save(update_fields=['status'])
    C1 = reissue_certificate(issued_certificate.pk, admin_user)
    _expire_certificate(B)
    C2 = reissue_certificate(issued_certificate.pk, admin_user)

    assert C1.pk == B.pk
    assert C2.pk == B.pk
    children = VaccinationCertificate.objects.filter(replaces=issued_certificate)
    assert children.count() == 1
    assert not children.exclude(pk=B.pk).exists()


def test_reissue_preserves_record_and_blocks_new_issue(traveler, vaccine, batch, admin_user):
    """إعادة الإصدار تحمل سجل الجرعة: الإصدار اللاحق يعيد الطفل لا ينشئ ثانياً."""
    record = record_vaccination(
        {'traveler': traveler, 'vaccine': vaccine, 'batch': batch, 'administered_at': date.today()},
        admin_user,
    )
    A = issue_certificate(record, admin_user)
    _expire_certificate(A)
    B = reissue_certificate(A.pk, admin_user)
    assert B.record_id == record.pk

    C = issue_certificate(record, admin_user)
    assert C.pk == B.pk
    assert VaccinationCertificate.objects.filter(record=record).active().count() == 1
    assert not VaccinationCertificate.objects.filter(record=record).active().exclude(pk=B.pk).exists()


def test_reissue_audit_failure_rolls_back_mutation(issued_certificate, admin_user, monkeypatch):
    """فشل التدقيق يُرجِع إعادة الإصدار: لا طفل بلا تدقيق."""

    def boom(*args, **kwargs):
        raise RuntimeError('audit insert failed')

    monkeypatch.setattr(VaccinationAuditLog.objects, 'create', boom)
    _expire_certificate(issued_certificate)
    with pytest.raises(RuntimeError):
        reissue_certificate(issued_certificate.pk, admin_user)

    assert not VaccinationCertificate.objects.filter(replaces=issued_certificate).exists()
    assert not VaccinationAuditLog.objects.filter(action='REISSUE').exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_reissue_returns_single_child(issued_certificate, admin_user):
    """إعادة إصدار متزامنة: كلا الطرفين يحصل على الطفل نفسه، طفل واحد."""
    _expire_certificate(issued_certificate)
    barrier = threading.Barrier(2, timeout=30)
    results = []
    errors = []

    def worker():
        try:
            barrier.wait()
            results.append(reissue_certificate(issued_certificate.pk, admin_user).pk)
        except Exception as exc:
            errors.append(f'{type(exc).__name__}: {exc}')
        finally:
            connection.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=90)

    assert not errors, errors
    assert len(results) == 2, results
    assert results[0] == results[1]
    assert VaccinationCertificate.objects.filter(replaces=issued_certificate).count() == 1


def test_revoke_success_creates_audit(issued_certificate, admin_user):
    """إلغاء ناجح: الحالة مثبتة وتدقيق مكتوب بالمستخدم نفسه."""
    ok, message = revoke_certificate(issued_certificate, admin_user)
    assert ok is True

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED
    audit = VaccinationAuditLog.objects.get(action='REVOKE', certificate=issued_certificate)
    assert audit.user_id == admin_user.pk


def test_revoke_repeated_is_idempotent_single_audit(issued_certificate, admin_user):
    """الإلغاء المتكرر آمن: مرة واحدة تنجح ولا تُكرَّر، والثانية تُرفض بلا تدقيق."""
    ok1, _ = revoke_certificate(issued_certificate, admin_user)
    ok2, message = revoke_certificate(issued_certificate, admin_user)

    assert ok1 is True
    assert ok2 is False
    assert message == 'الشهادة ملغاة بالفعل'
    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.REVOKED
    assert VaccinationAuditLog.objects.filter(action='REVOKE', certificate=issued_certificate).count() == 1


def test_revoke_audit_failure_rolls_back_mutation(issued_certificate, admin_user, monkeypatch):
    """فشل التدقيق يُرجِع الإلغاء: الشهادة تبقى على حالتها السابقة."""

    def boom(*args, **kwargs):
        raise RuntimeError('audit insert failed')

    monkeypatch.setattr(VaccinationAuditLog.objects, 'create', boom)
    with pytest.raises(RuntimeError):
        revoke_certificate(issued_certificate, admin_user)

    issued_certificate.refresh_from_db()
    assert issued_certificate.status == VaccinationCertificate.Status.ACTIVE
    assert not VaccinationAuditLog.objects.filter(action='REVOKE').exists()


# --------------------------------------------------------------------------- #
# P1.5 — NG-04 QR verification matrix (fail-closed)
# --------------------------------------------------------------------------- #
def test_qr_wrong_key_signature_rejected(issued_certificate):
    """توقيع صالح **لشهادة أخرى** (= مفتاح/حمولة خاطئة) لا يُقبل لهذه الشهادة."""
    from core.utils.qr_payload import sign_payload
    foreign_sig = sign_payload(
        {'certificate_number': 'AFY-VAC-FOREIGN', 'qr_token': 'deadbeef-0000-0000-0000-000000000000'}
    )
    url = f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/?sig={foreign_sig}'
    resp = APIClient().get(url)
    assert resp.status_code == 400
    assert resp.json()['data']['signature_valid'] is False


def test_qr_malformed_signature_rejected(issued_certificate):
    """توقيع مشوّه (خوارزمية/ترميز غير صالح) → فشل-إغلاق."""
    for bad_sig in ('', 'zzz-not-hex', '!@#', 'a' * 63, 'deadbeef'):
        url = (
            f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
            f'?sig={bad_sig}'
        )
        resp = APIClient().get(url)
        assert resp.status_code == 400, (bad_sig, resp.status_code)
        assert resp.json()['data']['signature_valid'] is False, bad_sig


def test_qr_unsigned_never_accepted_for_any_status(issued_certificate):
    """بلا توقيع: الرفض لا يعتمد على حالة الشهادة — فشل-إغلاق في كل الحالات."""
    issued_certificate.status = VaccinationCertificate.Status.EXPIRED
    issued_certificate.save(update_fields=['status'])
    resp = APIClient().get(f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/')
    assert resp.status_code == 400
    assert resp.json()['data']['signature_valid'] is False


def test_qr_valid_signature_but_expired_credential_fails_closed(issued_certificate):
    """توقيع صحيح + شهادة منتهية → غير معتمدة (فشل على مستوى حالة الاعتماد)."""
    issued_certificate.valid_until = date.today() - timedelta(days=1)
    issued_certificate.save(update_fields=['valid_until'])
    url = (
        f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
        f'?sig={issued_certificate.verification_signature}'
    )
    resp = APIClient().get(url)
    assert resp.status_code == 200
    assert resp.json()['data']['verified'] is False
    assert resp.json()['data']['status'] == VaccinationCertificate.Status.EXPIRED


def test_qr_valid_signature_but_revoked_fails_closed(issued_certificate, admin_user):
    """توقيع صحيح + شهادة مُلغاة → غير معتمدة + سجل تحقق فاشل."""
    from apps.vaccination.services import revoke_certificate
    revoke_certificate(issued_certificate, admin_user)
    issued_certificate.refresh_from_db()
    url = (
        f'/api/v1/vaccination/public/verify/{issued_certificate.certificate_number}/'
        f'?sig={issued_certificate.verification_signature}'
    )
    resp = APIClient().get(url)
    assert resp.status_code == 200
    assert resp.json()['data']['verified'] is False
    assert resp.json()['data']['status'] == VaccinationCertificate.Status.REVOKED
