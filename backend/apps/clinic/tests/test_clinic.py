import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

from ..models import ClinicReferral, ClinicVisit, EMRRecord, Medication

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def doctor(api_client):
    user = User.objects.create_user(
        email='doctor@nqp.gov.sd', password='StrongPass123!', full_name='د. الطيب'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def port(db):
    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def country_sd(db):
    return Country.objects.get_or_create(
        code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'}
    )[0]


@pytest.fixture
def traveler(port, country_sd):
    return Traveler.objects.create(
        first_name='أحمد',
        last_name='محمد',
        passport_number='P-TEST-1',
        date_of_birth='1990-01-15',
        nationality=Country.objects.get(code='SD'),
        registration_status='COMPLETED',
    )


def _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.PENDING):
    screening = HealthScreening.objects.create(
        traveler=traveler,
        port=port,
        officer=doctor,
    )
    return ClinicReferral.objects.create(
        screening=screening, traveler=traveler, port=port, status=status
    )


def test_dashboard_returns_stats_and_lists(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor)
    referral.screening.body_temperature = 38.7
    referral.screening.observed_symptoms = ['حُمّى', 'سعال']
    referral.screening.officer_notes = 'مسافر قادم من منطقة موبوءة'
    referral.screening.save()

    visit = ClinicVisit.objects.create(
        referral=referral,
        traveler=traveler,
        doctor=doctor,
        visit_status=ClinicVisit.VisitStatus.OPEN,
    )
    EMRRecord.objects.create(visit=visit)

    response = api_client.get('/api/v1/clinic/dashboard/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['stats']['open_visits'] == 1
    assert payload['stats']['pending_referrals'] == 1
    assert payload['stats']['total_patients'] == 1
    assert len(payload['open_visits']) == 1
    assert payload['open_visits'][0]['traveler_name'] == 'أحمد محمد'
    assert len(payload['pending_referrals']) == 1
    ref = payload['pending_referrals'][0]
    assert ref['body_temperature'] == 38.7
    assert ref['observed_symptoms'] == ['حُمّى', 'سعال']
    assert ref['officer_notes'] == 'مسافر قادم من منطقة موبوءة'
    assert ref['nationality_name'] == 'السودان'
    assert ref['date_of_birth'] == '1990-01-15'


def test_referral_serializer_handles_missing_screening(api_client, doctor, port, traveler):
    referral = ClinicReferral.objects.create(
        screening=None, traveler=traveler, port=port, status=ClinicReferral.ReferralStatus.PENDING
    )
    response = api_client.get(f'/api/v1/clinic/referrals/{referral.id}/')
    assert response.status_code == 200
    ref = response.json()['data']
    assert ref['body_temperature'] is None
    assert ref['observed_symptoms'] == []
    assert ref['officer_notes'] == ''


def test_dashboard_scopes_open_visits_to_doctor(api_client, doctor, port, traveler):
    other = User.objects.create_user(
        email='other@nqp.gov.sd', password='StrongPass123!', full_name='د. آخر'
    )
    for dr in (doctor, other):
        referral = _make_referral(traveler, port, dr)
        ClinicVisit.objects.create(
            referral=referral, traveler=traveler, doctor=dr, visit_status=ClinicVisit.VisitStatus.OPEN
        )

    response = api_client.get('/api/v1/clinic/dashboard/')
    payload = response.json()['data']
    assert payload['stats']['open_visits'] == 1
    assert len(payload['open_visits']) == 1
    assert payload['open_visits'][0]['doctor_name'] == 'د. الطيب'


def test_dashboard_medications_endpoint(api_client, doctor):
    Medication.objects.create(name='باراسيتامول', generic_name='Acetaminophen', unit='قرص')
    response = api_client.get('/api/v1/clinic/dashboard/medications/')
    assert response.status_code == 200
    meds = response.json()['data']
    assert any(m['name'] == 'باراسيتامول' for m in meds)


def test_accept_referral_creates_visit_and_marks_accepted(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor)
    response = api_client.post(f'/api/v1/clinic/referrals/{referral.id}/accept/')
    assert response.status_code == 201
    referral.refresh_from_db()
    assert referral.status == ClinicReferral.ReferralStatus.ACCEPTED
    assert ClinicVisit.objects.filter(referral=referral, doctor=doctor).exists()


def test_hold_referral_marks_pre_accept(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor)
    response = api_client.post(f'/api/v1/clinic/referrals/{referral.id}/hold/')
    assert response.status_code == 200
    referral.refresh_from_db()
    assert referral.status == ClinicReferral.ReferralStatus.PRE_ACCEPT


def test_release_pre_accept_back_to_pending(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.PRE_ACCEPT)
    response = api_client.post(f'/api/v1/clinic/referrals/{referral.id}/release/')
    assert response.status_code == 200
    referral.refresh_from_db()
    assert referral.status == ClinicReferral.ReferralStatus.PENDING


def test_hold_rejects_non_pending(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.ACCEPTED)
    response = api_client.post(f'/api/v1/clinic/referrals/{referral.id}/hold/')
    assert response.status_code == 400


def test_accept_from_pre_accept_creates_visit(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.PRE_ACCEPT)
    response = api_client.post(f'/api/v1/clinic/referrals/{referral.id}/accept/')
    assert response.status_code == 201
    referral.refresh_from_db()
    assert referral.status == ClinicReferral.ReferralStatus.ACCEPTED
    assert ClinicVisit.objects.filter(referral=referral, doctor=doctor).exists()


def test_reject_from_pre_accept_with_reason(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.PRE_ACCEPT)
    response = api_client.post(
        f'/api/v1/clinic/referrals/{referral.id}/reject/', {'notes': 'حالة مستقرة'}, format='json'
    )
    assert response.status_code == 200
    referral.refresh_from_db()
    assert referral.status == ClinicReferral.ReferralStatus.REJECTED
    assert 'حالة مستقرة' in referral.notes


def test_dashboard_counts_pre_accept_in_queue(api_client, doctor, port, traveler):
    _make_referral(traveler, port, doctor, status=ClinicReferral.ReferralStatus.PRE_ACCEPT)
    response = api_client.get('/api/v1/clinic/dashboard/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['stats']['pending_referrals'] == 1
    assert len(payload['pending_referrals']) == 1
    assert payload['pending_referrals'][0]['status'] == 'PRE_ACCEPT'


def test_close_visit_marks_completed(api_client, doctor, port, traveler):
    referral = _make_referral(traveler, port, doctor)
    visit = ClinicVisit.objects.create(
        referral=referral, traveler=traveler, doctor=doctor, visit_status=ClinicVisit.VisitStatus.OPEN
    )
    response = api_client.post(f'/api/v1/clinic/visits/{visit.id}/close/')
    assert response.status_code == 200
    visit.refresh_from_db()
    referral.refresh_from_db()
    assert visit.visit_status == ClinicVisit.VisitStatus.CLOSED
    assert referral.status == ClinicReferral.ReferralStatus.COMPLETED


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

