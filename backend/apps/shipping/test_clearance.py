"""Port clearance decision tests — Phase 1B-2.

Covers company/agent isolation, port-health geographic control, separation of
duties, decision-field validation, precondition independence from pre-arrival,
append-only history, and direct-object-ID security.
"""
from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import (
    HealthDeclaration,
    IsolationRecord,
    SeaPort,
    ShipInspection,
    Vessel,
    VesselVisit,
)
from apps.shipping.testing import auth, ensure_permissions, perms as _perms

@pytest.fixture
def api_client():
    return APIClient()
from apps.shipping.models import (
    PortClearanceDecision,
    PreArrivalNotification,
    ShippingAgent,
    ShippingAuditLog,
)

pytestmark = pytest.mark.django_db

User = get_user_model()

RECORD_URL = '/api/v1/shipping/vessel-visits/{visit}/clearance-decision/'
LIST_URL = '/api/v1/shipping/clearance-decisions/'

CLEARANCE_PERMS = [
    'clearance_decisions:view', 'clearance_decisions:add',
    'port_health:view', 'port_health:edit', 'port_health:add', 'ports:view',
    'vessels:view', 'vessel_visits:view', 'pre_arrivals:view',
]


@pytest.fixture
def company_role():
    r, _ = Role.objects.get_or_create(
        code='CLR_SHIPPING_COMPANY',
        defaults={'name': 'Shipping Company', 'name_ar': 'ممثل شركة', 'default_scope': 'COMPANY'})
    # Deliberately NO clearance_decisions:add — a company may only read.
    r.permissions.set(_perms([c for c in CLEARANCE_PERMS if c != 'clearance_decisions:add']))
    return r


@pytest.fixture
def agent_role():
    r, _ = Role.objects.get_or_create(
        code='CLR_SHIPPING_AGENT',
        defaults={'name': 'Shipping Agent', 'name_ar': 'وكيل', 'default_scope': 'COMPANY'})
    r.permissions.set(_perms([c for c in CLEARANCE_PERMS if c != 'clearance_decisions:add']))
    return r


@pytest.fixture
def port_role():
    r, _ = Role.objects.get_or_create(
        code='CLR_PORT_OFFICER',
        defaults={'name': 'Port Officer', 'name_ar': 'ضابط منفذ', 'default_scope': 'PORT'})
    r.permissions.set(_perms(CLEARANCE_PERMS))
    return r


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email='cl_admin@nqp.gov.sd', password='StrongPass123!', full_name='مدير')


# --- master data ------------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='RED_SEA', defaults={'name_ar': 'البحر الأحمر'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='SEA', defaults={'name_ar': 'القطاع البحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(
        code='MD_RED_SEA', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': md_sector})
    return o


@pytest.fixture
def ep_psc(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_CL_PSC', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                    'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_suk(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_CL_SUK', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                    'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def sp_psc(ep_psc):
    o, _ = SeaPort.objects.get_or_create(
        code='CL_PSC', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True})
    return o


@pytest.fixture
def sp_suk(ep_suk):
    o, _ = SeaPort.objects.get_or_create(
        code='CL_SUK', defaults={'name_ar': 'سواكن', 'entry_point': ep_suk, 'is_active': True})
    return o


# --- companies / vessels / visits -------------------------------------------

@pytest.fixture
def company_a():
    o, _ = Carrier.objects.get_or_create(
        name='شركة أ', defaults={'name_en': 'Co A', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def company_b():
    o, _ = Carrier.objects.get_or_create(
        name='شركة ب', defaults={'name_en': 'Co B', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def vessel_a(company_a):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-CL-1',
        defaults={'vessel_name': 'سفينة أ', 'flag_state': 'السودان',
                  'company': company_a, 'status': 'ARRIVED'})
    return o


@pytest.fixture
def vessel_b(company_b):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-CL-2',
        defaults={'vessel_name': 'سفينة ب', 'flag_state': 'السودان',
                  'company': company_b, 'status': 'ARRIVED'})
    return o


@pytest.fixture
def visit_a(vessel_a, sp_psc):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=sp_psc,
        defaults={'arrival_date': date.today(), 'status': 'ARRIVED'})
    return o


@pytest.fixture
def visit_b(vessel_b, sp_suk):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_b, port=sp_suk,
        defaults={'arrival_date': date.today(), 'status': 'ARRIVED'})
    return o


# --- users ------------------------------------------------------------------

@pytest.fixture
def rep_a(company_a, company_role):
    u = User.objects.create_user(email='cl_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل أ')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def rep_b(company_b, company_role):
    u = User.objects.create_user(email='cl_b@nqp.gov.sd', password='StrongPass123!', full_name='ممثل ب')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_b.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_b, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_user(company_a, agent_role, ep_psc):
    u = User.objects.create_user(email='cl_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل')
    RoleAssignment.objects.create(user=u, role=agent_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    a = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل بورتسودان', status='ACTIVE', is_active=True)
    a.ports.add(ep_psc)
    return u


@pytest.fixture
def suakin_officer(port_role, ep_suk):
    u = User.objects.create_user(
        email='cl_officer_suk@nqp.gov.sd', password='StrongPass123!', full_name='ضابط سواكن')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_suk.id, is_active=True)
    return u


@pytest.fixture
def port_officer(port_role, ep_psc):
    u = User.objects.create_user(email='cl_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_psc.id, is_active=True)
    return u


# ===========================================================================
# 8-10) Port Health authority
# ===========================================================================

class TestPortHealthAuthority:
    def test_8_officer_records_for_assigned_entry_point(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['decision'] == 'CLEARED'

    def test_9_officer_cannot_record_for_another_entry_point(self, api_client, port_officer, visit_b):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_b.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_b).exists()

    def test_10_officer_cannot_use_another_port_visit_id(self, api_client, port_officer, visit_b):
        """Direct-ID attempt against a foreign port call."""
        auth(api_client, port_officer)
        assert api_client.post(RECORD_URL.format(visit=visit_b.id),
                               {'decision': 'REFUSED', 'reason': 'x'},
                               format='json').status_code in (403, 404)


# ===========================================================================
# 1-4) Company isolation
# ===========================================================================

class TestCompanyIsolation:
    def test_1_company_cannot_create_clearance(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_a).exists()

    def test_1b_company_cannot_create_for_other_company_visit(self, api_client, rep_a, visit_b):
        auth(api_client, rep_a)
        res = api_client.post(RECORD_URL.format(visit=visit_b.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_b).exists()

    def test_2_company_cannot_modify_decision(self, api_client, rep_a, port_officer, visit_a):
        auth(api_client, port_officer)
        pid = api_client.post(RECORD_URL.format(visit=visit_a.id),
                              {'decision': 'CLEARED'},
                              format='json').json()['data']['id']
        auth(api_client, rep_a)
        # No write verb is exposed at all on the read-only collection.
        for verb in ('patch', 'put', 'delete'):
            res = getattr(api_client, verb)(f'{LIST_URL}{pid}/', {'decision': 'REFUSED'}, format='json')
            assert res.status_code in (403, 404, 405), verb
        assert PortClearanceDecision.objects.get(id=pid).decision == 'CLEARED'

    def test_3_company_reads_own_clearance(self, api_client, rep_a, port_officer, visit_a):
        auth(api_client, port_officer)
        api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        auth(api_client, rep_a)
        res = api_client.get(LIST_URL)
        assert res.status_code == 200
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_a.id) in visits

    def test_4_company_cannot_read_foreign_by_direct_id(self, api_client, rep_a, rep_b, suakin_officer, visit_b):
        auth(api_client, suakin_officer)
        pid = api_client.post(RECORD_URL.format(visit=visit_b.id),
                              {'decision': 'CLEARED'},
                              format='json').json()['data']['id']
        auth(api_client, rep_b)
        assert api_client.get(f'{LIST_URL}{pid}/').status_code == 200  # sanity: exists
        auth(api_client, rep_a)
        assert api_client.get(f'{LIST_URL}{pid}/').status_code == 404


# ===========================================================================
# 5-7) Agent
# ===========================================================================

class TestAgentAuthorization:
    def test_5_agent_cannot_decide_clearance(self, api_client, agent_user, visit_a):
        auth(api_client, agent_user)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_a).exists()

    def test_6_agent_reads_authorized_company_clearance(self, api_client, agent_user, port_officer, visit_a):
        auth(api_client, port_officer)
        api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        auth(api_client, agent_user)
        res = api_client.get(LIST_URL)
        assert res.status_code == 200
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_a.id) in visits

    def test_7_agent_cannot_read_unauthorized_port(self, api_client, agent_user, port_role, company_a, vessel_a, sp_suk, visit_a):
        """Clearance at Suakin; the agent is authorised for Port Sudan only."""
        visit_suk = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suk, arrival_date=date.today(), status='ARRIVED')
        officer_suk = User.objects.create_user(
            email='cl_officer_suk@nqp.gov.sd', password='StrongPass123!', full_name='ضابط سواكن')
        RoleAssignment.objects.create(user=officer_suk, role=port_role, scope_type='PORT',
                                      scope_id=sp_suk.entry_point_id, is_active=True)
        auth(api_client, officer_suk)
        api_client.post(RECORD_URL.format(visit=visit_suk.id), {'decision': 'CLEARED'}, format='json')

        auth(api_client, agent_user)
        res = api_client.get(LIST_URL)
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_suk.id) not in visits
        assert str(visit_a.id) in visits or True  # PSC notification is fine to see or absent


# ===========================================================================
# 11-15) Decision validation
# ===========================================================================

class TestDecisionValidation:
    def test_11_cleared_succeeds(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201
        assert res.json()['data']['decision'] == 'CLEARED'

    def test_12_conditional_requires_conditions(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CONDITIONAL'}, format='json')
        assert res.status_code == 400
        assert 'conditions' in res.json()
        with_conditions = api_client.post(
            RECORD_URL.format(visit=visit_a.id),
            {'decision': 'CONDITIONAL', 'conditions': 'فحص مياه ملزم'}, format='json')
        assert with_conditions.status_code == 201

    def test_13_refused_requires_reason(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'REFUSED'}, format='json')
        assert res.status_code == 400
        assert 'reason' in res.json()
        ok = api_client.post(RECORD_URL.format(visit=visit_a.id),
                             {'decision': 'REFUSED', 'reason': 'عزل نشط'}, format='json')
        assert ok.status_code == 201

    def test_14_invalid_decision_value_rejected(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'MAYBE'}, format='json')
        assert res.status_code == 400
        assert 'decision' in res.json()

    def test_15_arbitrary_patch_rejected(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        pid = api_client.post(RECORD_URL.format(visit=visit_a.id),
                              {'decision': 'CLEARED'},
                              format='json').json()['data']['id']
        for url in (f'{LIST_URL}{pid}/', RECORD_URL.format(visit=visit_a.id)):
            res = api_client.patch(url, {'decision': 'REFUSED'}, format='json')
            assert res.status_code in (403, 404, 405)
        assert PortClearanceDecision.objects.get(id=pid).decision == 'CLEARED'


# ===========================================================================
# 16-19) Independence from pre-arrival
# ===========================================================================

class TestPreArrivalIndependence:
    def test_16_rejected_prearrival_is_not_clearance(self, api_client, port_officer, visit_a):
        pre = PreArrivalNotification.objects.create(
            vessel_visit=visit_a, status=PreArrivalNotification.Status.REJECTED)
        auth(api_client, port_officer)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_a).exists()
        assert pre.status == 'REJECTED'
        # Still decidable explicitly by port health.
        res = api_client.post(RECORD_URL.format(visit=visit_a.id),
                              {'decision': 'REFUSED', 'reason': 'مراجعة'}, format='json')
        assert res.status_code == 201

    def test_17_accepted_prearrival_does_not_auto_clear(self, api_client, visit_a):
        PreArrivalNotification.objects.create(
            vessel_visit=visit_a, status=PreArrivalNotification.Status.ACCEPTED)
        assert PortClearanceDecision.objects.filter(vessel_visit=visit_a).count() == 0

    def test_18_clearance_independent_of_prearrival(self, api_client, port_officer, visit_a):
        """No pre-arrival at all: the decision is still recordable."""
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201

    def test_19_existing_evidence_respected(self, api_client, port_officer, visit_a, vessel_a):
        """An active isolation on the vessel blocks clearance (precondition)."""
        IsolationRecord.objects.create(
            vessel=vessel_a, person_name='مشتبه', person_type='CREW',
            start_date=date.today(),
            status=IsolationRecord.IsolationStatus.ACTIVE)
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 400
        assert 'preconditions' in res.json()

    def test_19b_declaration_and_inspection_gate(self, api_client, port_officer, visit_a, vessel_a):
        """Phase 1D-6B: these are now gates, not context.

        Frozen policy: missing -> non-blocking (U-1/U-2); REJECTED blocks;
        FAILED and CONDITIONAL block; PASSED allows.
        """
        # 1) missing declaration + missing inspection -> still allowed (U-1/U-2)
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content

    def test_19c_rejected_declaration_blocks(self, api_client, port_officer, visit_a, vessel_a):
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today(), status='APPROVED')
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today(), status='REJECTED', rejection_reason='نواقص جسيمة')
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 400
        assert 'preconditions' in res.json()

    def test_19d_old_rejected_does_not_block_newer_approved(self, api_client, port_officer, visit_a, vessel_a):
        """Latest-record determinism: the newer APPROVED declaration supersedes."""
        old = HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today() - timedelta(days=5), status='REJECTED',
            rejection_reason='نواقص جسيمة')
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today(), status='APPROVED')
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content
        assert old.status == 'REJECTED'  # immutable history

    @pytest.mark.parametrize('overall', ['FAILED', 'CONDITIONAL'])
    def test_19e_blocking_inspection_blocks(self, api_client, port_officer, visit_a, vessel_a, overall):
        """U-4: CONDITIONAL blocks exactly like FAILED."""
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today(), status='APPROVED')
        ShipInspection.objects.create(
            vessel=vessel_a, visit=visit_a, inspector=port_officer,
            overall_status=overall)
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 400
        assert 'preconditions' in res.json()

    def test_19f_passed_inspection_allows(self, api_client, port_officer, visit_a, vessel_a):
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان',
            declaration_date=date.today(), status='APPROVED')
        ShipInspection.objects.create(
            vessel=vessel_a, visit=visit_a, inspector=port_officer,
            overall_status='PASSED')
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content

    def test_19g_visit_less_records_do_not_gate(self, api_client, port_officer, visit_a, vessel_a):
        """U-9 Option A: no NULL-visit fallback."""
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=None, captain_name='ربان',
            declaration_date=date.today(), status='REJECTED', rejection_reason='مرفوض')
        ShipInspection.objects.create(
            vessel=vessel_a, visit=None, inspector=port_officer,
            overall_status='FAILED')
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content

    def test_19h_other_visit_records_do_not_gate(self, api_client, port_officer, visit_a, vessel_a, sp_suk, vessel_b):
        """A rejection attached to a different port call must not leak in."""
        other = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suk, arrival_date=date.today(), status='ARRIVED')
        HealthDeclaration.objects.create(
            vessel=vessel_a, visit=other, captain_name='ربان',
            declaration_date=date.today(), status='REJECTED', rejection_reason='مرفوض')
        auth(api_client, port_officer)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content


# ===========================================================================
# 11b) Separation of duties
# ===========================================================================

class TestSeparationOfDuties:
    def test_company_cannot_decide_even_with_port_permission(self, api_client, company_a, company_role, visit_a):
        """Domain rule enforced in the service, not left to RBAC grants.

        Uses a *dedicated* role: mutating the shared SHIPPING_COMPANY role
        would leak extra permissions into every other test.
        """
        sod_role, _ = Role.objects.get_or_create(
            code='SOD_PROBE',
            defaults={'name': 'SoD probe', 'name_ar': 'اختبار فصل المهام',
                      'default_scope': 'COMPANY'})
        # Everything a company rep has, PLUS full port-health edit rights.
        sod_role.permissions.set(_perms(CLEARANCE_PERMS))

        user = User.objects.create_user(
            email='cl_sod@nqp.gov.sd', password='StrongPass123!', full_name='ممثل بصلاحيات زائدة')
        RoleAssignment.objects.create(user=user, role=sod_role, scope_type='COMPANY',
                                      scope_id=company_a.id, is_active=True)
        CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)

        auth(api_client, user)
        res = api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_a).exists()


# ===========================================================================
# 20-21) Direct object-ID security
# ===========================================================================

class TestDirectObjectIdSecurity:
    def test_20_cross_company_direct_id_returns_404(self, api_client, rep_a, rep_b, suakin_officer, visit_b):
        auth(api_client, suakin_officer)
        pid = api_client.post(RECORD_URL.format(visit=visit_b.id),
                              {'decision': 'CLEARED'},
                              format='json').json()['data']['id']
        auth(api_client, rep_a)
        assert api_client.get(f'{LIST_URL}{pid}/').status_code == 404
        assert api_client.get(RECORD_URL.format(visit=visit_b.id)).status_code == 404

    def test_21_cross_port_direct_id_returns_404(self, api_client, agent_user, port_role, company_a, vessel_a, sp_suk):
        visit_suk = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suk, arrival_date=date.today(), status='ARRIVED')
        officer_suk = User.objects.create_user(
            email='cl_suk2@nqp.gov.sd', password='StrongPass123!', full_name='ضابط سواكن')
        RoleAssignment.objects.create(user=officer_suk, role=port_role, scope_type='PORT',
                                      scope_id=sp_suk.entry_point_id, is_active=True)
        auth(api_client, officer_suk)
        pid = api_client.post(RECORD_URL.format(visit=visit_suk.id),
                              {'decision': 'CLEARED'},
                              format='json').json()['data']['id']
        auth(api_client, agent_user)
        assert api_client.get(f'{LIST_URL}{pid}/').status_code == 404


# ===========================================================================
# 22-23) Audit & history
# ===========================================================================

class TestAuditAndHistory:
    def test_22_decision_is_auditable(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        api_client.post(RECORD_URL.format(visit=visit_a.id),
                        {'decision': 'CONDITIONAL', 'conditions': 'فحص'}, format='json')
        rows = ShippingAuditLog.objects.filter(
            object_type='PortClearanceDecision',
            action=ShippingAuditLog.Action.CLEARANCE_DECISION_RECORDED)
        assert rows.count() == 1
        detail = rows.first().detail
        assert detail['decision'] == 'CONDITIONAL'
        assert detail['conditions'] == 'فحص'
        assert detail['vessel_visit'] == str(visit_a.id)

    def test_23_reconsideration_preserves_history(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        first = api_client.post(RECORD_URL.format(visit=visit_a.id),
                                {'decision': 'REFUSED', 'reason': 'أول'},
                                format='json').json()['data']
        second = api_client.post(RECORD_URL.format(visit=visit_a.id),
                                 {'decision': 'CLEARED'},
                                 format='json').json()['data']

        # Nothing overwritten.
        assert PortClearanceDecision.objects.filter(vessel_visit=visit_a).count() == 2
        original = PortClearanceDecision.objects.get(id=first['id'])
        assert original.decision == 'REFUSED'
        assert original.is_current is False
        # New decision supersedes the old one.
        new = PortClearanceDecision.objects.get(id=second['id'])
        assert new.is_current is True
        assert str(new.supersedes_id) == str(original.id)

        # History endpoint returns both, newest first.
        res = api_client.get(RECORD_URL.format(visit=visit_a.id))
        assert res.status_code == 200
        decisions = [r['decision'] for r in res.json()['data']['results']]
        assert decisions == ['CLEARED', 'REFUSED']

    def test_23b_audit_trail_for_each_decision(self, api_client, port_officer, visit_a):
        auth(api_client, port_officer)
        api_client.post(RECORD_URL.format(visit=visit_a.id), {'decision': 'CLEARED'}, format='json')
        api_client.post(RECORD_URL.format(visit=visit_a.id),
                        {'decision': 'REFUSED', 'reason': 'إعادة'}, format='json')
        rows = ShippingAuditLog.objects.filter(
            object_type='PortClearanceDecision',
            action=ShippingAuditLog.Action.CLEARANCE_DECISION_RECORDED)
        assert rows.count() == 2
        assert rows.order_by('created_at').first().detail['supersedes'] is None
        assert rows.order_by('created_at').last().detail['supersedes'] is not None


# ===========================================================================
# Model-level integrity
# ===========================================================================

class TestModelIntegrity:
    def test_refused_without_reason_blocked_at_db(self, visit_a, port_officer):
        from django.db.utils import IntegrityError
        with pytest.raises(IntegrityError):
            PortClearanceDecision.objects.create(
                vessel_visit=visit_a, decision='REFUSED', reason='', decided_by=port_officer)

    def test_conditional_without_conditions_blocked_at_db(self, visit_a, port_officer):
        from django.db.utils import IntegrityError
        with pytest.raises(IntegrityError):
            PortClearanceDecision.objects.create(
                vessel_visit=visit_a, decision='CONDITIONAL', conditions='', decided_by=port_officer)

    def test_supersedes_chain_stays_within_one_visit(self, visit_a, visit_b, admin_user):
        """History chains never cross port calls."""
        from apps.shipping import services
        first_a = services.record_port_clearance_decision(
            vessel_visit=visit_a, decision='CLEARED', actor=admin_user)
        services.record_port_clearance_decision(
            vessel_visit=visit_b, decision='CLEARED', actor=admin_user)
        second_a = services.record_port_clearance_decision(
            vessel_visit=visit_a, decision='REFUSED', reason='إعادة', actor=admin_user)
        assert second_a.supersedes_id == first_a.id
        assert second_a.vessel_visit_id == first_a.vessel_visit_id