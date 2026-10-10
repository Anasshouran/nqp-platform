import uuid

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country

from ..models import (
    Carrier,
    CarrierMember,
    Flight,
    FlightHealthEvent,
    HealthDeclaration,
    HealthDeclarationLog,
    PassengerManifest,
)
from .conftest import assign_carrier_role

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = 'StrongPass123!'

AIRPORT_ACTIONS = ('view', 'add', 'edit')


@pytest.fixture
def world(db):
    sudan = Country.objects.get_or_create(code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'})[0]
    port = Port.objects.create(
        state=_ep_state(),
        code='SDKRT', name_ar='مطار الخرطوم', name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )
    other_port = Port.objects.create(
        state=_ep_state(),
        code='SDELM', name_ar='مطار بورتسودان', name_en='Port Sudan Airport',
        kind=Port.Kind.AIRPORT,
    )
    return {'sudan': sudan, 'port': port, 'other_port': other_port}


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'})
    state, _c2 = MState.objects.get_or_create(code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector})
    return state


@pytest.fixture
def carrier(world):
    return Carrier.objects.create(name='سودان إير', iata_code='SU', icao_code='SUD', is_active=True)


@pytest.fixture
def other_carrier(world):
    return Carrier.objects.create(name='مصر للطيران', iata_code='MS', icao_code='MSR', is_active=True)


@pytest.fixture
def flight(carrier, world):
    return Flight.objects.create(
        flight_number='SU101', carrier=carrier, flight_type=Flight.FlightType.AIR,
        origin_code='CAI', origin_country=world['sudan'], destination_port=world['port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=2),
    )


@pytest.fixture
def other_flight(other_carrier, world):
    return Flight.objects.create(
        flight_number='MS100', carrier=other_carrier, flight_type=Flight.FlightType.AIR,
        origin_code='DXB', origin_country=world['sudan'], destination_port=world['other_port'],
        scheduled_arrival=timezone.now() + timezone.timedelta(hours=3),
    )


@pytest.fixture
def rep(carrier):
    user = User.objects.create_user(email='rep@nqp.gov.sd', password=PASSWORD, full_name='منسق شركة')
    assign_carrier_role(user)
    CarrierMember.objects.create(user=user, carrier=carrier, is_primary=True, is_active=True)
    return user


@pytest.fixture
def auth_client(rep):
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': rep.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


@pytest.fixture
def staff_client():
    user = User.objects.create_user(email='staff@nqp.gov.sd', password=PASSWORD, full_name='مدير', is_staff=True)
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def _ensure_airport_role():
    perms = []
    for action in AIRPORT_ACTIONS:
        perm, _ = Permission.objects.get_or_create(
            code=f'airport_health:{action}',
            defaults={'name': f'{action} airport_health', 'resource': 'airport_health', 'action': action},
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code='AIRPORT_INSPECTOR',
        defaults={'name': 'Airport Health Inspector', 'name_ar': 'مفتش', 'default_scope': RoleAssignment.ScopeType.PORT},
    )
    role.permissions.set(perms)
    return role


def _airport_client(email, scope_type, scope_id=None):
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    role = _ensure_airport_role()
    RoleAssignment.objects.create(user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True)
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client, user


def _create_declaration(flight, carrier, **kwargs):
    return HealthDeclaration.objects.create(flight=flight, carrier=carrier, **kwargs)


# ---------------------------------------------------------------------------
# Carrier workflow + isolation
# ---------------------------------------------------------------------------


def test_carrier_creates_declaration(auth_client, flight, carrier):
    resp = auth_client.post('/api/v1/carriers/health-declarations/', {
        'flight': str(flight.id),
        'declaration_date': '2026-10-03',
        'officer_name': 'الكابتن أحمد',
        'passenger_count': 120,
        'crew_count': 6,
    }, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == 'DRAFT'
    assert data['carrier_name'] == carrier.name
    assert data['flight_number'] == flight.flight_number
    assert HealthDeclaration.objects.filter(flight=flight, carrier=carrier).exists()


def test_cannot_create_declaration_for_other_carriers_flight(auth_client, other_flight):
    resp = auth_client.post('/api/v1/carriers/health-declarations/', {
        'flight': str(other_flight.id),
    }, format='json')
    assert resp.status_code == 403
    assert not HealthDeclaration.objects.filter(flight=other_flight).exists()


def test_carrier_mismatch_with_flight_is_rejected(auth_client, flight, other_carrier):
    resp = auth_client.post('/api/v1/carriers/health-declarations/', {
        'flight': str(flight.id),
        'carrier': str(other_carrier.id),
    }, format='json')
    assert resp.status_code == 400


def test_one_declaration_per_flight(auth_client, flight, carrier):
    _create_declaration(flight, carrier)
    resp = auth_client.post('/api/v1/carriers/health-declarations/', {'flight': str(flight.id)}, format='json')
    assert resp.status_code == 400


def test_carrier_only_sees_own_declarations(auth_client, flight, carrier, other_flight, other_carrier):
    _create_declaration(flight, carrier)
    _create_declaration(other_flight, other_carrier)
    resp = auth_client.get('/api/v1/carriers/health-declarations/')
    assert resp.status_code == 200
    ids = {row['flight_number'] for row in resp.json()['data']['results']}
    assert ids == {flight.flight_number}


def test_draft_can_be_edited(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier)
    resp = auth_client.patch(f'/api/v1/carriers/health-declarations/{decl.id}/', {'notes': 'مراجعة سريعة'}, format='json')
    assert resp.status_code == 200
    decl.refresh_from_db()
    assert decl.notes == 'مراجعة سريعة'


def test_submitted_cannot_be_edited(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    resp = auth_client.patch(f'/api/v1/carriers/health-declarations/{decl.id}/', {'notes': 'لا يجب'}, format='json')
    assert resp.status_code == 400
    decl.refresh_from_db()
    assert decl.notes == ''


def test_submit_and_history(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier)
    resp = auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/submit/', {}, format='json')
    assert resp.status_code == 200, resp.content
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.SUBMITTED
    assert decl.submitted_at is not None
    logs = HealthDeclarationLog.objects.filter(declaration=decl)
    assert logs.count() == 1
    assert logs.first().to_status == HealthDeclaration.Status.SUBMITTED


def test_cannot_submit_twice(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    resp = auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/submit/', {}, format='json')
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Airport review workflow
# ---------------------------------------------------------------------------


def test_airport_can_review_and_approve_within_scope(world, carrier, flight):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    client, _u = _airport_client('inspector@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)

    listed = client.get('/api/v1/carriers/health-declarations/')
    assert listed.status_code == 200
    assert listed.json()['data']['count'] == 1

    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/review/', {}, format='json')
    assert resp.status_code == 200, resp.content
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.UNDER_REVIEW

    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/approve/', {'review_notes': 'لا ملاحظات'}, format='json')
    assert resp.status_code == 200
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.APPROVED
    assert decl.review_notes == 'لا ملاحظات'
    assert decl.reviewed_at is not None
    assert HealthDeclarationLog.objects.filter(declaration=decl).count() == 2


def test_airport_cannot_access_declaration_outside_scope(world, other_carrier, other_flight, carrier, flight):
    decl = _create_declaration(other_flight, other_carrier, status=HealthDeclaration.Status.SUBMITTED)
    client, _u = _airport_client('norange@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)
    assert client.get('/api/v1/carriers/health-declarations/').json()['data']['count'] == 0
    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/review/', {}, format='json')
    assert resp.status_code == 404


def test_airport_station_scope_sees_nothing(world, carrier, flight):
    _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    client, _u = _airport_client('station@nqp.gov.sd', RoleAssignment.ScopeType.STATION, uuid.uuid4())
    assert client.get('/api/v1/carriers/health-declarations/').json()['data']['count'] == 0


def test_reject_requires_reason_and_records_it(world, carrier, flight):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.UNDER_REVIEW)
    client, _u = _airport_client('rejector@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)
    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/reject/', {}, format='json')
    assert resp.status_code == 400

    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/reject/', {'reason': 'مستندات غير مكتملة'}, format='json')
    assert resp.status_code == 200
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.REJECTED
    assert decl.rejection_reason == 'مستندات غير مكتملة'


def test_rejected_can_be_resubmitted_and_reason_cleared(world, carrier, flight, auth_client):
    decl = _create_declaration(
        flight, carrier, status=HealthDeclaration.Status.REJECTED, rejection_reason='سبب سابق'
    )
    resp = auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/submit/', {}, format='json')
    assert resp.status_code == 200
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.SUBMITTED
    assert decl.rejection_reason == ''


def test_approve_only_from_under_review(world, carrier, flight):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    client, _u = _airport_client('approve@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)
    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/approve/', {}, format='json')
    assert resp.status_code == 400
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.SUBMITTED


def test_review_only_from_submitted(world, carrier, flight):
    decl = _create_declaration(flight, carrier)
    client, _u = _airport_client('review@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)
    resp = client.post(f'/api/v1/carriers/health-declarations/{decl.id}/review/', {}, format='json')
    assert resp.status_code == 400


def test_carrier_cannot_approve_or_reject(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.UNDER_REVIEW)
    resp = auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/approve/', {}, format='json')
    assert resp.status_code == 403
    resp = auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/reject/', {'reason': 'x'}, format='json')
    assert resp.status_code == 403


def test_invalid_transition_via_direct_patch_is_blocked(auth_client, flight, carrier):
    decl = _create_declaration(flight, carrier)
    resp = auth_client.patch(f'/api/v1/carriers/health-declarations/{decl.id}/', {'status': 'APPROVED'}, format='json')
    assert resp.status_code == 400
    decl.refresh_from_db()
    assert decl.status == HealthDeclaration.Status.DRAFT


def test_unauthenticated_cannot_access_declarations():
    client = APIClient()
    resp = client.get('/api/v1/carriers/health-declarations/')
    assert resp.status_code in (401, 403)


def test_audit_log_records_every_transition(world, carrier, flight, auth_client, staff_client):
    decl = _create_declaration(flight, carrier)
    auth_client.post(f'/api/v1/carriers/health-declarations/{decl.id}/submit/', {}, format='json')
    client, _u = _airport_client('audit@nqp.gov.sd', RoleAssignment.ScopeType.PORT, world['port'].id)
    client.post(f'/api/v1/carriers/health-declarations/{decl.id}/review/', {}, format='json')
    client.post(f'/api/v1/carriers/health-declarations/{decl.id}/reject/', {'reason': 'نقص معلومة'}, format='json')

    transitions = list(HealthDeclarationLog.objects.filter(declaration=decl).order_by('created_at'))
    assert [t.to_status for t in transitions] == [
        HealthDeclaration.Status.SUBMITTED,
        HealthDeclaration.Status.UNDER_REVIEW,
        HealthDeclaration.Status.REJECTED,
    ]
    assert all(t.changed_by is not None for t in transitions)


def test_flight_timeline_empty_is_valid(auth_client, world, carrier, flight):
    resp = auth_client.get(f'/api/v1/carriers/flights/{flight.id}/timeline/')
    assert resp.status_code == 200, resp.content
    assert resp.json()['data']['flight_id'] == str(flight.id)
    assert resp.json()['data']['events'] == []


def test_flight_timeline_merges_sources(auth_client, world, carrier, flight):
    flight.transition_to(Flight.FlightStatus.MANIFEST_UPLOADED, note='كشف مرفوع')
    event = FlightHealthEvent.objects.create(
        flight=flight,
        category=FlightHealthEvent.HealthEventCategory.SYMPTOM_ALERT,
        severity=FlightHealthEvent.Severity.MEDIUM,
        description='حالة موجزة',
        affected_count=1,
    )
    event.transition_to(FlightHealthEvent.EventStatus.UNDER_REVIEW, note='مراجعة')
    manifest = PassengerManifest.objects.create(
        flight=flight, status=PassengerManifest.ManifestStatus.COMPLETED,
        total_passengers=3, processed_at=timezone.now(),
    )
    decl = _create_declaration(flight, carrier, status=HealthDeclaration.Status.SUBMITTED)
    decl.transition_to(HealthDeclaration.Status.UNDER_REVIEW, note='قيد المراجعة')

    resp = auth_client.get(f'/api/v1/carriers/flights/{flight.id}/timeline/')
    assert resp.status_code == 200, resp.content
    events = resp.json()['data']['events']
    types = [e['event_type'] for e in events]
    assert 'flight_status_changed' in types
    assert 'flight_health_event_created' in types
    assert 'flight_health_event_status_changed' in types
    assert 'passenger_manifest_uploaded' in types
    assert 'passenger_manifest_processed' in types
    assert 'health_declaration_status_changed' in types
    timestamps = [e['timestamp'] for e in events]
    assert timestamps == sorted(timestamps)
    body = resp.content.decode('utf-8')
    for forbidden in ('symptoms', 'symptom_notes', 'clinical_notes', 'medical_history', 'notes":', 'description'):
        assert forbidden not in body


def test_carrier_cannot_access_other_timeline(auth_client, other_flight, other_carrier):
    other_flight.transition_to(Flight.FlightStatus.MANIFEST_UPLOADED)
    resp = auth_client.get(f'/api/v1/carriers/flights/{other_flight.id}/timeline/')
    assert resp.status_code == 404


def test_unauthenticated_cannot_access_timeline(world, carrier, flight):
    client = APIClient()
    resp = client.get(f'/api/v1/carriers/flights/{flight.id}/timeline/')
    assert resp.status_code in (401, 403)
