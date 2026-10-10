"""Phase 1D-6B — HealthDeclaration lifecycle + ShipInspection derivation.

Covers the frozen contract:

* ``status`` / ``reviewed_*`` / ``rejection_reason`` are server-owned;
* lifecycle ``RECEIVED -> REVIEWED -> {APPROVED, REJECTED}`` with both terminal
  states frozen (REJECTED is never revived in place);
* rejection requires a non-blank reason (whitespace-only fails);
* transitions are serialised with ``select_for_update()``;
* every transition writes a ``ShippingAuditLog`` row carrying actor, company,
  ``from_status`` and ``to_status``;
* ``overall_status`` is derived from the eight zones under the frozen
  fail-closed truth table and can never be client-supplied.
"""
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health import scoping as ph_scoping
from apps.port_health.models import SeaPort, ShipInspection, Vessel, VesselVisit
from apps.port_health.models import HealthDeclaration
from apps.shipping.models import ShippingAgent, ShippingAuditLog
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

DECL = '/api/v1/port-health/declarations/'
INSPECT = '/api/v1/port-health/ship-inspections/'

PH_PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit', 'port_health:delete',
    'ports:view', 'vessels:view', 'vessel_visits:view',
]

S = HealthDeclaration.DeclarationStatus
O = ShipInspection.OverallStatus
C = ShipInspection.Compliance

ALL_COMPLIANT = {
    'accommodation_status': C.COMPLIANT, 'kitchen_status': C.COMPLIANT,
    'storeroom_status': C.COMPLIANT, 'clinic_status': C.COMPLIANT,
    'water_tank_status': C.COMPLIANT, 'toilet_status': C.COMPLIANT,
    'ventilation_status': C.COMPLIANT, 'cleanliness_status': C.COMPLIANT,
}


@pytest.fixture
def api_client():
    return APIClient()


def _perms(codes):
    existing = set(Permission.objects.filter(code__in=codes).values_list('code', flat=True))
    missing = [c for c in codes if c not in existing]
    if missing:
        Permission.objects.bulk_create([
            Permission(code=c, resource=c.partition(':')[0], action=c.partition(':')[2],
                       name=f"{c.partition(':')[2]} {c.partition(':')[0]}")
            for c in missing
        ], ignore_conflicts=True)
    return list(Permission.objects.filter(code__in=codes))


# --- fixtures ---------------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='D6B_ORG', defaults={'name_ar': 'قطاع'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='D6B_SEA', defaults={'name_ar': 'بحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='D6B_ST', defaults={'name_ar': 'ولاية', 'sector': md_sector})
    return o


@pytest.fixture
def ep(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_D6B', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                 'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_other(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_D6B_OTHER', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                       'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def port(ep):
    o, _ = SeaPort.objects.get_or_create(
        code='D6B_SP', defaults={'name_ar': 'بورتسودان', 'entry_point': ep, 'is_active': True})
    return o


@pytest.fixture
def port_other(ep_other):
    o, _ = SeaPort.objects.get_or_create(
        code='D6B_SP_OTHER', defaults={'name_ar': 'سواكن', 'entry_point': ep_other, 'is_active': True})
    return o


@pytest.fixture
def company():
    o, _ = Carrier.objects.get_or_create(
        name='شركة د6ب', defaults={'name_en': 'Co D6B', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def vessel(company, port):
    v = Vessel.objects.create(vessel_name='سفينة', imo_number='IMO-D6B-1', company=company)
    VesselVisit.objects.create(vessel=v, port=port, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def visit(vessel, port):
    return vessel.visits.get(port=port)


@pytest.fixture
def vessel_b(company, port_other):
    """A vessel whose port call is at the *other* entry point."""
    v = Vessel.objects.create(vessel_name='سفينة ب', imo_number='IMO-D6B-2', company=company)
    VesselVisit.objects.create(vessel=v, port=port_other, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def visit_b(vessel_b, port_other):
    return vessel_b.visits.get(port=port_other)


@pytest.fixture
def ph_role():
    r, _ = Role.objects.get_or_create(
        code='D6B_PH', defaults={'name': 'PH', 'name_ar': 'صحة الموانئ', 'default_scope': 'PORT'})
    r.permissions.set(_perms(PH_PERMS))
    return r


@pytest.fixture
def officer(ph_role, ep):
    u = User.objects.create_user(email='d6b_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    RoleAssignment.objects.create(user=u, role=ph_role, scope_type='PORT',
                                  scope_id=ep.id, is_active=True)
    return u


@pytest.fixture
def company_user(company):
    role, _ = Role.objects.get_or_create(
        code='D6B_CO', defaults={'name': 'Co', 'name_ar': 'شركة', 'default_scope': 'COMPANY'})
    role.permissions.set(_perms(['port_health:view', 'vessel_visits:view']))
    u = User.objects.create_user(email='d6b_co@nqp.gov.sd', password='StrongPass123!', full_name='ممثل')
    RoleAssignment.objects.create(user=u, role=role, scope_type='COMPANY',
                                  scope_id=company.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_user(company, ep):
    role, _ = Role.objects.get_or_create(
        code='D6B_AG', defaults={'name': 'Ag', 'name_ar': 'وكيل', 'default_scope': 'COMPANY'})
    role.permissions.set(_perms(['port_health:view']))
    u = User.objects.create_user(email='d6b_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل')
    RoleAssignment.objects.create(user=u, role=role, scope_type='COMPANY',
                                  scope_id=company.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company, is_primary=True, is_active=True)
    a = ShippingAgent.objects.create(company=company, user=u, name='وكيل', status='ACTIVE', is_active=True)
    a.ports.add(ep)
    return u


def make_decl(vessel, visit=None, status=S.RECEIVED, **kw):
    params = {'vessel': vessel, 'visit': visit, 'captain_name': 'ربان',
              'declaration_date': date.today(), 'status': status}
    if status == S.REJECTED:
        params.setdefault('rejection_reason', 'نواقص جسيمة')
    params.update(kw)
    return HealthDeclaration.objects.create(**params)


# ===========================================================================
# Creation semantics
# ===========================================================================

class TestCreateSemantics:
    def test_create_starts_received(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(DECL, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'captain_name': 'ربان', 'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['status'] == S.RECEIVED

    @pytest.mark.parametrize('forged', ['APPROVED', 'REVIEWED', 'REJECTED'])
    def test_forged_status_never_creates_that_state(self, api_client, officer, vessel, visit, forged):
        auth(api_client, officer)
        res = api_client.post(DECL, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'captain_name': 'ربان', 'declaration_date': date.today().isoformat(),
            'status': forged,
        }, format='json')
        # explicit 400: the client must never believe it forged a state
        assert res.status_code == 400, res.content
        assert 'status' in res.json()
        assert not HealthDeclaration.objects.filter(status=forged).exists()

    def test_forged_reviewer_rejected(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(DECL, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'captain_name': 'ربان', 'declaration_date': date.today().isoformat(),
            'reviewed_by': str(officer.id),
        }, format='json')
        assert res.status_code == 400
        assert 'reviewed_by' in res.json()

    def test_db_constraint_rejects_reasonless_rejection(self, vessel, visit):
        """Defence in depth behind the service check."""
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                make_decl(vessel, visit, status=S.REJECTED, rejection_reason='')


# ===========================================================================
# Direct mutation forbidden
# ===========================================================================

class TestDirectMutationForbidden:
    @pytest.mark.parametrize('payload', [
        {'status': 'APPROVED'}, {'status': 'REJECTED'},
        {'reviewed_by': None}, {'rejection_reason': 'تلاعب'},
    ])
    def test_patch_server_owned_fields_400(self, api_client, officer, vessel, visit, payload):
        d = make_decl(vessel, visit)
        auth(api_client, officer)
        res = api_client.patch(f'{DECL}{d.id}/', payload, format='json')
        assert res.status_code == 400, res.content
        d.refresh_from_db()
        assert d.status == S.RECEIVED
        assert d.rejection_reason == ''

    def test_put_not_routed(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit)
        auth(api_client, officer)
        assert api_client.put(f'{DECL}{d.id}/', {'status': 'APPROVED'}, format='json').status_code == 405


# ===========================================================================
# Valid / invalid transitions
# ===========================================================================

class TestTransitions:
    def test_received_to_reviewed(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit)
        auth(api_client, officer)
        res = api_client.post(f'{DECL}{d.id}/submit-review/', {'note': 'قيد المراجعة'}, format='json')
        assert res.status_code == 200, res.content
        d.refresh_from_db()
        assert d.status == S.REVIEWED
        assert d.reviewed_by_id == officer.id
        assert d.reviewed_at is not None

    def test_reviewed_to_approved(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit, status=S.REVIEWED)
        auth(api_client, officer)
        res = api_client.post(f'{DECL}{d.id}/approve/', {}, format='json')
        assert res.status_code == 200, res.content
        d.refresh_from_db()
        assert d.status == S.APPROVED

    def test_reviewed_to_rejected(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit, status=S.REVIEWED)
        auth(api_client, officer)
        res = api_client.post(f'{DECL}{d.id}/reject/',
                              {'rejection_reason': 'نواقص جسيمة'}, format='json')
        assert res.status_code == 200, res.content
        d.refresh_from_db()
        assert d.status == S.REJECTED
        assert d.rejection_reason == 'نواقص جسيمة'

    @pytest.mark.parametrize('action,start', [
        ('approve', S.RECEIVED), ('reject', S.RECEIVED),
        ('submit-review', S.APPROVED), ('submit-review', S.REJECTED),
        ('approve', S.REJECTED), ('reject', S.APPROVED),
    ])
    def test_forbidden_transitions_400(self, api_client, officer, vessel, visit, action, start):
        d = make_decl(vessel, visit, status=start)
        auth(api_client, officer)
        res = api_client.post(f'{DECL}{d.id}/{action}/', {'rejection_reason': 'س'}, format='json')
        assert res.status_code == 400, (action, start, res.content)
        d.refresh_from_db()
        assert d.status == start  # immutable

    def test_rejected_is_not_revived_in_place(self, api_client, officer, vessel, visit):
        """Re-submission means a NEW record; the rejected one stays immutable."""
        rejected = make_decl(vessel, visit, status=S.REJECTED, rejection_reason='مرفوض نهائي')
        auth(api_client, officer)
        assert api_client.post(f'{DECL}{rejected.id}/submit-review/', {}, format='json').status_code == 400
        rejected.refresh_from_db()
        assert rejected.status == S.REJECTED
        assert rejected.rejection_reason == 'مرفوض نهائي'
        # a fresh declaration starts at RECEIVED
        fresh = make_decl(vessel, visit)
        assert fresh.status == S.RECEIVED


# ===========================================================================
# Rejection reason
# ===========================================================================

class TestRejectionReason:
    @pytest.mark.parametrize('reason', [None, '', '   ', '\t\n'])
    def test_blank_reason_400(self, api_client, officer, vessel, visit, reason):
        d = make_decl(vessel, visit, status=S.REVIEWED)
        auth(api_client, officer)
        payload = {} if reason is None else {'rejection_reason': reason}
        res = api_client.post(f'{DECL}{d.id}/reject/', payload, format='json')
        assert res.status_code == 400, res.content
        d.refresh_from_db()
        assert d.status == S.REVIEWED

    def test_reason_persists_and_survives_later_declaration(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit, status=S.REVIEWED)
        auth(api_client, officer)
        api_client.post(f'{DECL}{d.id}/reject/', {'rejection_reason': 'نواقص جسيمة'}, format='json')
        make_decl(vessel, visit)  # re-submission
        d.refresh_from_db()
        assert d.rejection_reason == 'نواقص جسيمة'


# ===========================================================================
# Audit
# ===========================================================================

class TestTransitionAudit:
    def test_audit_records_from_to_actor_company(self, api_client, officer, vessel, visit, company):
        d = make_decl(vessel, visit)
        auth(api_client, officer)
        api_client.post(f'{DECL}{d.id}/submit-review/', {'note': 'ملاحظة'}, format='json')
        row = ShippingAuditLog.objects.filter(object_type='HealthDeclaration').latest('created_at')
        assert row.action == ShippingAuditLog.Action.STATUS_CHANGE
        assert row.user_id == officer.id
        assert str(row.company_id) == str(company.id)
        assert row.detail['from_status'] == S.RECEIVED
        assert row.detail['to_status'] == S.REVIEWED
        assert row.detail['vessel'] == vessel.imo_number

    def test_rejection_audit_carries_reason(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit, status=S.REVIEWED)
        auth(api_client, officer)
        api_client.post(f'{DECL}{d.id}/reject/', {'rejection_reason': 'مرفوض'}, format='json')
        row = ShippingAuditLog.objects.filter(object_type='HealthDeclaration').latest('created_at')
        assert row.detail['from_status'] == S.REVIEWED
        assert row.detail['to_status'] == S.REJECTED
        assert row.detail['rejection_reason'] == 'مرفوض'

    def test_audit_failure_rolls_back_the_whole_transition(
        self, api_client, officer, vessel, visit,
    ):
        """C-1/C-2 regression: VALID transition + audit failure = no state change.

        The audit INSERT lives inside the same ``transaction.atomic()`` block as
        the status/reviewer mutation, so forcing it to raise must roll the
        transition back entirely — not merely return 500 with the new status
        already committed.
        """
        from unittest import mock

        from django.db import DatabaseError

        from apps.port_health import views as ph_views

        d = make_decl(vessel, visit)
        assert d.status == S.RECEIVED
        assert d.reviewed_by_id is None
        assert d.reviewed_at is None

        before_audits = ShippingAuditLog.objects.filter(object_type='HealthDeclaration').count()

        auth(api_client, officer)
        with mock.patch.object(
            ph_views.ph_scoping, 'audit_port_health',
            side_effect=DatabaseError('audit sink unavailable'),
        ):
            with pytest.raises(DatabaseError):
                api_client.post(f'{DECL}{d.id}/submit-review/', {}, format='json')

        # The whole transaction rolled back: no state change, no reviewer, no audit.
        d.refresh_from_db()
        assert d.status == S.RECEIVED
        assert d.reviewed_by_id is None
        assert d.reviewed_at is None
        assert ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count() == before_audits

    def test_successful_transition_writes_exactly_one_audit(self, api_client, officer, vessel, visit):
        """The success path still produces exactly one audit row."""
        d = make_decl(vessel, visit)
        before = ShippingAuditLog.objects.filter(object_type='HealthDeclaration').count()
        auth(api_client, officer)
        res = api_client.post(f'{DECL}{d.id}/submit-review/', {}, format='json')
        assert res.status_code == 200, res.content
        rows = ShippingAuditLog.objects.filter(object_type='HealthDeclaration')
        assert rows.count() == before + 1
        row = rows.latest('created_at')
        assert row.detail['from_status'] == S.RECEIVED
        assert row.detail['to_status'] == S.REVIEWED

    def test_failed_transition_writes_no_audit(self, api_client, officer, vessel, visit):
        d = make_decl(vessel, visit)
        auth(api_client, officer)
        api_client.post(f'{DECL}{d.id}/approve/', {}, format='json')
        assert not ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration',
            detail__to_status=S.APPROVED).exists()


# ===========================================================================
# Isolation
# ===========================================================================

class TestIsolation:
    def test_company_cannot_transition(self, api_client, company_user, vessel, visit):
        d = make_decl(vessel, visit)
        auth(api_client, company_user)
        assert api_client.post(f'{DECL}{d.id}/submit-review/', {}, format='json').status_code in (403, 404)
        d.refresh_from_db()
        assert d.status == S.RECEIVED

    def test_agent_cannot_transition(self, api_client, agent_user, vessel, visit):
        d = make_decl(vessel, visit)
        auth(api_client, agent_user)
        assert api_client.post(f'{DECL}{d.id}/submit-review/', {}, format='json').status_code in (403, 404)
        d.refresh_from_db()
        assert d.status == S.RECEIVED

    def test_cross_port_officer_denied(self, api_client, ph_role, ep_other, vessel, visit):
        u = User.objects.create_user(email='d6b_other@nqp.gov.sd', password='StrongPass123!', full_name='ضابط آخر')
        RoleAssignment.objects.create(user=u, role=ph_role, scope_type='PORT',
                                      scope_id=ep_other.id, is_active=True)
        d = make_decl(vessel, visit)
        auth(api_client, u)
        assert api_client.post(f'{DECL}{d.id}/submit-review/', {}, format='json').status_code == 404
        d.refresh_from_db()
        assert d.status == S.RECEIVED


# ===========================================================================
# Deterministic latest
# ===========================================================================

class TestDeterministicLatest:
    def test_same_date_resolved_by_created_at_then_id(self, vessel, visit):
        from apps.shipping.services import clearance_preconditions

        older = make_decl(vessel, visit, declaration_date=date.today(), status=S.RECEIVED)
        newer = make_decl(vessel, visit, declaration_date=date.today(), status=S.REJECTED)
        qs = (HealthDeclaration.objects.filter(visit=visit)
              .order_by('-declaration_date', '-created_at', '-id'))
        assert qs.first().id == newer.id
        # the gate must therefore see the REJECTED one
        ok, notes = clearance_preconditions(visit)
        assert ok is False
        assert older.status == S.RECEIVED


# ===========================================================================
# ShipInspection derivation
# ===========================================================================

class TestInspectionDerivation:
    def test_all_compliant_yields_passed(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {'vessel': str(vessel.id), 'visit': str(visit.id), **ALL_COMPLIANT},
                              format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['overall_status'] == O.PASSED

    def test_any_non_compliant_yields_failed(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            **{**ALL_COMPLIANT, 'kitchen_status': C.NON_COMPLIANT},
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['overall_status'] == O.FAILED

    @pytest.mark.parametrize('na_field', list(ALL_COMPLIANT))
    def test_not_applicable_without_non_compliant_400(self, api_client, officer, vessel, visit, na_field):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            **{**ALL_COMPLIANT, na_field: C.NOT_APPLICABLE},
        }, format='json')
        assert res.status_code == 400, (na_field, res.content)
        assert 'zones' in res.json()
        assert not ShipInspection.objects.filter(visit=visit).exists()

    def test_not_applicable_with_non_compliant_is_failed(self, api_client, officer, vessel, visit):
        """Rule 1 has highest precedence, so NOT_APPLICABLE does not 400 here."""
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            **{**ALL_COMPLIANT, 'clinic_status': C.NON_COMPLIANT,
               'ventilation_status': C.NOT_APPLICABLE},
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['overall_status'] == O.FAILED

    @pytest.mark.parametrize('forged', ['PASSED', 'FAILED', 'CONDITIONAL'])
    def test_client_cannot_supply_overall_status(self, api_client, officer, vessel, visit, forged):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'overall_status': forged, **ALL_COMPLIANT,
        }, format='json')
        assert res.status_code == 400
        assert 'overall_status' in res.json()
        assert not ShipInspection.objects.filter(visit=visit).exists()

    def test_forged_passed_cannot_override_non_compliant(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'overall_status': 'PASSED',
            **{**ALL_COMPLIANT, 'toilet_status': C.NON_COMPLIANT},
        }, format='json')
        assert res.status_code == 400
        assert not ShipInspection.objects.filter(overall_status=O.PASSED).exists()

    def test_zone_patch_recomputes(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        created = api_client.post(INSPECT, {'vessel': str(vessel.id), 'visit': str(visit.id), **ALL_COMPLIANT},
                                  format='json').json()['data']
        assert created['overall_status'] == O.PASSED
        res = api_client.patch(f'{INSPECT}{created["id"]}/',
                              {'kitchen_status': C.NON_COMPLIANT}, format='json')
        assert res.status_code == 200, res.content
        assert res.json()['data']['overall_status'] == O.FAILED

    def test_inspector_and_date_are_server_owned(self, api_client, officer, vessel, visit):
        auth(api_client, officer)
        res = api_client.post(INSPECT, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'inspector': str(officer.id), **ALL_COMPLIANT,
        }, format='json')
        assert res.status_code == 201
        row = ShipInspection.objects.get(id=res.json()['data']['id'])
        assert row.inspector_id == officer.id
        assert row.inspection_date is not None

    def test_conditional_remains_valid_model_state(self, vessel, visit, officer):
        """CONDITIONAL is recorded but never produced by the derivation."""
        row = ShipInspection.objects.create(
            vessel=vessel, visit=visit, inspector=officer, overall_status=O.CONDITIONAL)
        assert ShipInspection.objects.filter(id=row.id, overall_status=O.CONDITIONAL).exists()

    def test_deterministic_latest_inspection(self, vessel, visit, officer):
        from apps.shipping.services import clearance_preconditions

        ShipInspection.objects.create(vessel=vessel, visit=visit, inspector=officer, overall_status=O.PASSED)
        ShipInspection.objects.create(vessel=vessel, visit=visit, inspector=officer, overall_status=O.FAILED)
        qs = (ShipInspection.objects.filter(visit=visit)
              .order_by('-inspection_date', '-created_at', '-id'))
        assert qs.first().overall_status == O.FAILED
        ok, _ = clearance_preconditions(visit)
        assert ok is False

    def test_company_cannot_create_inspection(self, api_client, company_user, vessel, visit):
        auth(api_client, company_user)
        res = api_client.post(INSPECT, {'vessel': str(vessel.id), 'visit': str(visit.id), **ALL_COMPLIANT},
                              format='json')
        assert res.status_code == 403
        assert not ShipInspection.objects.filter(visit=visit).exists()

    def test_cross_port_officer_cannot_create(self, api_client, ph_role, ep_other, vessel, visit):
        u = User.objects.create_user(email='d6b_insp_other@nqp.gov.sd', password='StrongPass123!', full_name='آخر')
        RoleAssignment.objects.create(user=u, role=ph_role, scope_type='PORT',
                                      scope_id=ep_other.id, is_active=True)
        auth(api_client, u)
        res = api_client.post(INSPECT, {'vessel': str(vessel.id), 'visit': str(visit.id), **ALL_COMPLIANT},
                              format='json')
        assert res.status_code in (403, 404)
        assert not ShipInspection.objects.filter(visit=visit).exists()


# ===========================================================================
# Phase 1D-7-R1 — D-1: cross-port re-parenting is refused on update
# ===========================================================================

class TestCrossPortReparentingBlocked:
    """D-1. `get_object()` proves the CURRENT parents are in scope; a PATCH can
    also change `vessel`/`visit`, so the prospective parents must be re-checked
    before persistence — otherwise a Port A officer could move a REJECTED
    declaration (a clearance blocker) onto Port B's port call.
    """

    def test_declaration_cannot_be_moved_to_another_port(
        self, api_client, officer, vessel, visit, vessel_b, visit_b,
    ):
        d = make_decl(vessel, visit, status=S.RECEIVED)
        original_vessel_id, original_visit_id = d.vessel_id, d.visit_id
        audits_before = ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count()

        auth(api_client, officer)
        res = api_client.patch(
            f'{DECL}{d.id}/',
            {'vessel': str(vessel_b.id), 'visit': str(visit_b.id)},
            format='json')
        assert res.status_code in (400, 403), res.content

        d.refresh_from_db()
        assert d.vessel_id == original_vessel_id   # not re-parented
        assert d.visit_id == original_visit_id
        assert d.status == S.RECEIVED
        # rejected updates must not leave an audit trail either
        assert ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count() == audits_before

    def test_declaration_cannot_be_moved_even_with_rejected_status(
        self, api_client, officer, vessel, visit, vessel_b, visit_b,
    ):
        """The dangerous case: REJECTED (a clearance blocker) moved to Port B."""
        d = make_decl(vessel, visit, status=S.REJECTED, rejection_reason='نواقص')
        auth(api_client, officer)
        res = api_client.patch(
            f'{DECL}{d.id}/',
            {'vessel': str(vessel_b.id), 'visit': str(visit_b.id)},
            format='json')
        assert res.status_code in (400, 403), res.content
        d.refresh_from_db()
        assert d.visit_id == visit.id   # still on Port A, where it was reviewed
        # Port B never receives a blocking record
        assert not HealthDeclaration.objects.filter(visit=visit_b).exists()

    def test_inspection_cannot_be_moved_to_another_port(
        self, api_client, officer, vessel, visit, vessel_b, visit_b,
    ):
        insp = ShipInspection.objects.create(
            vessel=vessel, visit=visit, inspector=officer, overall_status=O.PASSED)
        original_vessel_id, original_visit_id = insp.vessel_id, insp.visit_id
        audits_before = ShippingAuditLog.objects.filter(
            object_type='ShipInspection').count()

        auth(api_client, officer)
        res = api_client.patch(
            f'{INSPECT}{insp.id}/',
            {'vessel': str(vessel_b.id), 'visit': str(visit_b.id)},
            format='json')
        assert res.status_code in (400, 403), res.content

        insp.refresh_from_db()
        assert insp.vessel_id == original_vessel_id
        assert insp.visit_id == original_visit_id
        assert not ShipInspection.objects.filter(visit=visit_b).exists()
        assert ShippingAuditLog.objects.filter(
            object_type='ShipInspection').count() == audits_before

    def test_in_scope_update_still_succeeds(
        self, api_client, officer, vessel, visit,
    ):
        """Positive control: legitimate same-port edits must keep working."""
        d = make_decl(vessel, visit, status=S.RECEIVED)
        audits_before = ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count()

        auth(api_client, officer)
        res = api_client.patch(
            f'{DECL}{d.id}/', {'notes': 'ملاحظة من المفتش'}, format='json')
        assert res.status_code == 200, res.content

        d.refresh_from_db()
        assert d.notes == 'ملاحظة من المفتش'
        assert d.vessel_id == vessel.id and d.visit_id == visit.id
        assert ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count() == audits_before + 1


# ===========================================================================
# Phase 1D-7-R1 — D-2: generic write + audit commit together
# ===========================================================================

class TestGenericWriteAtomicity:
    def test_create_audit_failure_rolls_back_the_row(self, api_client, officer, vessel, visit):
        """D-2. `serializer.save()` and `audit_port_health()` must commit as one.

        If the audit write fails, the record itself must not survive.
        """
        from unittest import mock

        from django.db import DatabaseError

        from apps.port_health import views as ph_views

        before = HealthDeclaration.objects.filter(visit=visit).count()
        auth(api_client, officer)
        with mock.patch.object(
            ph_scoping, 'audit_port_health',
            side_effect=DatabaseError('audit sink unavailable'),
        ):
            with pytest.raises(DatabaseError):
                api_client.post(DECL, {
                    'vessel': str(vessel.id), 'visit': str(visit.id),
                    'captain_name': 'ربان', 'declaration_date': date.today().isoformat(),
                }, format='json')

        assert HealthDeclaration.objects.filter(visit=visit).count() == before

    def test_successful_create_still_audits_exactly_once(self, api_client, officer, vessel, visit):
        before = ShippingAuditLog.objects.filter(object_type='HealthDeclaration').count()
        auth(api_client, officer)
        res = api_client.post(DECL, {
            'vessel': str(vessel.id), 'visit': str(visit.id),
            'captain_name': 'ربان', 'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201, res.content
        assert ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count() == before + 1

    def test_destroy_audit_failure_rolls_back_the_delete(self, api_client, officer, vessel, visit):
        from unittest import mock

        from django.db import DatabaseError

        from apps.port_health import views as ph_views

        d = make_decl(vessel, visit)
        audits_before = ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count()
        auth(api_client, officer)
        with mock.patch.object(
            ph_scoping, 'audit_port_health',
            side_effect=DatabaseError('audit sink unavailable'),
        ):
            with pytest.raises(DatabaseError):
                api_client.delete(f'{DECL}{d.id}/')

        assert HealthDeclaration.objects.filter(pk=d.pk).exists()  # not deleted
        assert ShippingAuditLog.objects.filter(
            object_type='HealthDeclaration').count() == audits_before
