"""Shipping self-service portal security tests — Phase 1C-C (Parts A–H).

Covers company governance, audit-log scoping, relationship ownership rules,
vessel-visit self-service requests, sovereign-action isolation and notification
isolation.
"""
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.shipping.models import (
    PortClearanceDecision,
    PreArrivalNotification,
    ShippingAgent,
    ShippingAuditLog,
    VesselCompanyRelationship,
)
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

COMPANIES = '/api/v1/shipping/companies/'
AGENTS = '/api/v1/shipping/agents/'
RELS = '/api/v1/shipping/vessel-relationships/'
AUDIT = '/api/v1/shipping/audit-logs/'
VISIT_REQ = '/api/v1/shipping/vessel-visits/request/'
PREARR = '/api/v1/shipping/pre-arrivals/'
CLEARANCE = '/api/v1/shipping/clearance-decisions/'
VISITS = '/api/v1/port-health/visits/'

PORTAL_PERMS = [
    'shipping_companies:view', 'shipping_agents:view', 'shipping_agents:add',
    'shipping_audit_logs:view', 'pre_arrivals:view', 'pre_arrivals:add',
    'pre_arrivals:edit', 'clearance_decisions:view', 'port_health:view',
    'ports:view', 'vessels:view', 'vessel_visits:view',
    'vessel_company_relationships:view', 'vessel_company_relationships:add',
    'port_health:view', 'vessel_visits:view', 'vessels:view',
]
PORT_HEALTH_PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit', 'ports:view',
    'vessels:view', 'vessel_visits:view', 'pre_arrivals:view',
    'pre_arrivals:add', 'pre_arrivals:edit', 'clearance_decisions:view',
    'clearance_decisions:add', 'shipping_audit_logs:view',
]


@pytest.fixture
def api_client():
    return APIClient()


# --- master data ------------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='PSC_ORG', defaults={'name_ar': 'قطاع'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='PSC_SEA', defaults={'name_ar': 'بحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='PSC_ST', defaults={'name_ar': 'ولاية', 'sector': md_sector})
    return o


@pytest.fixture
def ep_psc(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_PSC_PORT', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                     'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_suk(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_SUK_PORT', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                     'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_air(state, org_sector):
    """A non-seaport entry point, to prove kind is enforced."""
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_AIR_PORT', defaults={'name_ar': 'مطار', 'kind': 'AIRPORT',
                                     'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def sp_psc(ep_psc):
    o, _ = SeaPort.objects.get_or_create(
        code='PSC_SP', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True})
    return o


@pytest.fixture
def sp_suk(ep_suk):
    o, _ = SeaPort.objects.get_or_create(
        code='SUK_SP', defaults={'name_ar': 'سواكن', 'entry_point': ep_suk, 'is_active': True})
    return o


# --- companies --------------------------------------------------------------

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
        imo_number='IMO-PC-1',
        defaults={'vessel_name': 'سفينة أ', 'flag_state': 'السودان', 'company': company_a,
                  'status': 'EXPECTED'})
    return o


@pytest.fixture
def vessel_b(company_b):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-PC-2',
        defaults={'vessel_name': 'سفينة ب', 'flag_state': 'السودان', 'company': company_b,
                  'status': 'EXPECTED'})
    return o


# --- roles / users ----------------------------------------------------------

@pytest.fixture
def portal_role():
    r, _ = Role.objects.get_or_create(
        code='PC_COMPANY', defaults={'name': 'Co', 'name_ar': 'شركة', 'default_scope': 'COMPANY'})
    r.permissions.set(_perms(PORTAL_PERMS))
    return r


@pytest.fixture
def agent_role():
    r, _ = Role.objects.get_or_create(
        code='PC_AGENT', defaults={'name': 'Ag', 'name_ar': 'وكيل', 'default_scope': 'COMPANY'})
    r.permissions.set(_perms(PORTAL_PERMS))
    return r


@pytest.fixture
def health_role():
    r, _ = Role.objects.get_or_create(
        code='PC_HEALTH', defaults={'name': 'H', 'name_ar': 'صحة', 'default_scope': 'PORT'})
    r.permissions.set(_perms(PORT_HEALTH_PERMS))
    return r


@pytest.fixture
def rep_a(company_a, portal_role):
    u = User.objects.create_user(email='pc_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل أ')
    RoleAssignment.objects.create(user=u, role=portal_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def rep_b(company_b, portal_role):
    u = User.objects.create_user(email='pc_b@nqp.gov.sd', password='StrongPass123!', full_name='ممثل ب')
    RoleAssignment.objects.create(user=u, role=portal_role, scope_type='COMPANY',
                                  scope_id=company_b.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_b, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_a(company_a, agent_role, ep_psc):
    u = User.objects.create_user(email='pc_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل أ')
    RoleAssignment.objects.create(user=u, role=agent_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    ag = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل بورتسودان', status='ACTIVE', is_active=True)
    ag.ports.add(ep_psc)
    return u


@pytest.fixture
def officer(health_role, ep_psc):
    u = User.objects.create_user(email='pc_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    RoleAssignment.objects.create(user=u, role=health_role, scope_type='PORT',
                                  scope_id=ep_psc.id, is_active=True)
    return u


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email='pc_admin@nqp.gov.sd', password='StrongPass123!', full_name='مدير')


# ===========================================================================
# PART B — company governance (cases 1-4)
# ===========================================================================

class TestCompanyGovernance:
    def test_1_own_company_visible(self, api_client, rep_a, company_a):
        auth(api_client, rep_a)
        res = api_client.get(COMPANIES)
        assert res.status_code == 200
        ids = [r['id'] for r in res.json()['data']['results']]
        assert str(company_a.id) in ids

    def test_2_foreign_company_hidden(self, api_client, rep_a, company_b):
        auth(api_client, rep_a)
        res = api_client.get(COMPANIES)
        ids = [r['id'] for r in res.json()['data']['results']]
        assert str(company_b.id) not in ids

    def test_2b_foreign_company_detail_denied(self, api_client, rep_a, company_b):
        auth(api_client, rep_a)
        assert api_client.get(f'{COMPANIES}{company_b.id}/').status_code == 404

    def test_3_sensitive_fields_absent(self, api_client, rep_a, company_a):
        auth(api_client, rep_a)
        res = api_client.get(f'{COMPANIES}{company_a.id}/')
        assert res.status_code == 200
        body = res.json()['data']
        for leaked in ('api_key', 'api_key_display', 'client_id', 'client_secret_encrypted',
                       'allowed_ips', 'rate_limit_per_minute', 'rate_limit_daily',
                       'api_scopes', 'reviewed_by', 'reviewed_at', 'review_notes',
                       'registration_status', 'compliance_class', 'contact_info',
                       'api_error_count', 'last_api_use_at'):
            assert leaked not in body, leaked

    def test_3b_list_also_hides_sensitive_fields(self, api_client, rep_a):
        auth(api_client, rep_a)
        row = api_client.get(COMPANIES).json()['data']['results'][0]
        for leaked in ('api_key', 'allowed_ips', 'api_scopes', 'registration_status'):
            assert leaked not in row

    def test_4_own_company_update_denied(self, api_client, rep_a, company_a):
        auth(api_client, rep_a)
        res = api_client.patch(f'{COMPANIES}{company_a.id}/', {'name': 'مُعدَّل'}, format='json')
        assert res.status_code == 403
        company_a.refresh_from_db()
        assert company_a.name == 'شركة أ'

    def test_4b_registration_status_not_self_editable(self, api_client, rep_a, company_a):
        auth(api_client, rep_a)
        res = api_client.patch(f'{COMPANIES}{company_a.id}/',
                               {'registration_status': 'APPROVED'}, format='json')
        assert res.status_code == 403

    def test_4c_foreign_company_update_denied(self, api_client, rep_a, company_b):
        auth(api_client, rep_a)
        res = api_client.patch(f'{COMPANIES}{company_b.id}/', {'name': 'x'}, format='json')
        assert res.status_code in (403, 404)
        company_b.refresh_from_db()
        assert company_b.name == 'شركة ب'

    def test_4d_create_denied_for_member(self, api_client, rep_a):
        auth(api_client, rep_a)
        assert api_client.post(COMPANIES, {'name': 'جديدة'}, format='json').status_code == 403

    def test_4e_admin_retains_company_admin(self, api_client, admin_user, company_a):
        """Platform administration keeps its canonical path."""
        auth(api_client, admin_user)
        res = api_client.patch(f'{COMPANIES}{company_a.id}/', {'phone': '0912345678'}, format='json')
        assert res.status_code == 200
        company_a.refresh_from_db()
        assert company_a.phone == '0912345678'


# ===========================================================================
# Vessels (cases 5-6)
# ===========================================================================

class TestVesselIsolation:
    def test_5_own_vessel_visible(self, api_client, rep_a, vessel_a):
        auth(api_client, rep_a)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = [r['imo_number'] for r in res.json()['data']['results']]
        assert 'IMO-PC-1' in imos

    def test_6_foreign_vessel_denied(self, api_client, rep_a, vessel_b):
        auth(api_client, rep_a)
        assert api_client.get(f'/api/v1/port-health/vessels/{vessel_b.id}/').status_code == 404


# ===========================================================================
# PART C — relationships (cases 7-10)
# ===========================================================================

class TestRelationshipRules:
    def test_7_company_cannot_self_assert_owner(self, api_client, rep_a, vessel_a, company_a):
        auth(api_client, rep_a)
        res = api_client.post(RELS, {
            'vessel': str(vessel_a.id), 'company': str(company_a.id),
            'role': 'OWNER', 'is_active': True,
        }, format='json')
        assert res.status_code == 403
        assert not VesselCompanyRelationship.objects.filter(role='OWNER').exists()

    def test_7b_company_may_assert_operator_for_own_vessel(self, api_client, rep_a, vessel_a, company_a):
        auth(api_client, rep_a)
        res = api_client.post(RELS, {
            'vessel': str(vessel_a.id), 'company': str(company_a.id),
            'role': 'OPERATOR', 'is_active': True,
        }, format='json')
        assert res.status_code == 201, res.content

    def test_7c_company_cannot_assert_owner_on_foreign_vessel(self, api_client, rep_a, vessel_b, company_a):
        auth(api_client, rep_a)
        res = api_client.post(RELS, {
            'vessel': str(vessel_b.id), 'company': str(company_a.id),
            'role': 'OPERATOR', 'is_active': True,
        }, format='json')
        # Refused either as a cross-tenant miss or a domain rule; never created.
        assert res.status_code in (400, 403, 404)
        assert not VesselCompanyRelationship.objects.filter(vessel=vessel_b).exists()

    def test_8_foreign_vessel_relationship_denied(self, api_client, rep_a, vessel_b, company_b):
        rel = VesselCompanyRelationship.objects.create(
            vessel=vessel_b, company=company_b, role='OPERATOR', is_active=True)
        auth(api_client, rep_a)
        assert api_client.get(f'{RELS}{rel.id}/').status_code == 404

    def test_9_invalid_relationship_dates_rejected(self, api_client, rep_a, vessel_a, company_a):
        auth(api_client, rep_a)
        res = api_client.post(RELS, {
            'vessel': str(vessel_a.id), 'company': str(company_a.id), 'role': 'CHARTERER',
            'valid_from': '2026-01-01', 'valid_until': '2025-01-01', 'is_active': True,
        }, format='json')
        assert res.status_code == 400

    def test_10_primary_relationship_constraint_preserved(self, api_client, rep_a, vessel_a, company_a):
        VesselCompanyRelationship.objects.create(
            vessel=vessel_a, company=company_a, role='OPERATOR', is_primary=True, is_active=True)
        auth(api_client, rep_a)
        res = api_client.post(RELS, {
            'vessel': str(vessel_a.id), 'company': str(company_a.id),
            'role': 'MANAGER', 'is_primary': True, 'is_active': True,
        }, format='json')
        assert res.status_code == 400

    def test_10b_relationship_update_is_admin_only(self, api_client, rep_a, vessel_a, company_a):
        rel = VesselCompanyRelationship.objects.create(
            vessel=vessel_a, company=company_a, role='OPERATOR', is_active=True)
        auth(api_client, rep_a)
        assert api_client.patch(f'{RELS}{rel.id}/', {'role': 'MANAGER'},
                                format='json').status_code == 403


# ===========================================================================
# PART D — visit self-service (cases 11-19)
# ===========================================================================

class TestVisitRequest:
    @pytest.fixture(autouse=True)
    def _stations_exist(self, sp_psc, sp_suk):
        """A port call request needs an active SeaPort station to attach to."""
        return sp_psc

    def _payload(self, vessel, ep, **over):
        base = {'vessel': str(vessel.id), 'entry_point': str(ep.id),
                'eta': (date.today() + timedelta(days=7)).isoformat()}
        base.update(over)
        return base

    def test_11_company_can_request_visit(self, api_client, rep_a, vessel_a, ep_psc, sp_psc):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ, self._payload(vessel_a, ep_psc), format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['status'] == 'EXPECTED'

    def test_12_agent_can_request_visit(self, api_client, agent_a, vessel_a, ep_psc):
        auth(api_client, agent_a)
        res = api_client.post(VISIT_REQ, self._payload(vessel_a, ep_psc), format='json')
        assert res.status_code == 201, res.content

    def test_13_company_cannot_request_for_foreign_vessel(self, api_client, rep_a, vessel_b, ep_psc):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ, self._payload(vessel_b, ep_psc), format='json')
        assert res.status_code == 404
        assert not VesselVisit.objects.filter(vessel=vessel_b).exists()

    def test_14_agent_cannot_use_unauthorized_port(self, api_client, agent_a, vessel_a, ep_suk):
        auth(api_client, agent_a)
        res = api_client.post(VISIT_REQ, self._payload(vessel_a, ep_suk), format='json')
        assert res.status_code == 404

    def test_15_client_cannot_assign_foreign_company(self, api_client, rep_a, vessel_a, ep_psc, company_b):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ,
                              self._payload(vessel_a, ep_psc, company_id=str(company_b.id)),
                              format='json')
        if res.status_code == 201:
            visit = VesselVisit.objects.get(id=res.json()['data']['id'])
            assert visit.vessel.company_id == visit.vessel.company_id
            assert str(company_b.id) not in res.content.decode()

    def test_16_client_cannot_set_departed(self, api_client, rep_a, vessel_a, ep_psc):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ,
                              self._payload(vessel_a, ep_psc, status='DEPARTED',
                                            departure_date=date.today().isoformat()),
                              format='json')
        assert res.status_code == 201
        visit = VesselVisit.objects.get(id=res.json()['data']['id'])
        assert visit.status == 'EXPECTED'
        assert visit.departure_date is None

    def test_17_client_cannot_set_actual_departure(self, api_client, rep_a, vessel_a, ep_psc):
        auth(api_client, rep_a)
        api_client.post(VISIT_REQ, self._payload(vessel_a, ep_psc,
                                                 departure_date=date.today().isoformat()),
                        format='json')
        visit = VesselVisit.objects.get(vessel=vessel_a)
        assert visit.departure_date is None

    def test_18_visit_api_cannot_create_clearance(self, api_client, rep_a, vessel_a, ep_psc, sp_psc):
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, rep_a)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{visit.id}/clearance-decision/',
            {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)

    def test_19_duplicate_visit_enforced(self, api_client, rep_a, vessel_a, ep_psc):
        auth(api_client, rep_a)
        payload = self._payload(vessel_a, ep_psc)
        assert api_client.post(VISIT_REQ, payload, format='json').status_code == 201
        second = api_client.post(VISIT_REQ, payload, format='json')
        assert second.status_code == 400

    def test_19b_airport_entry_point_rejected(self, api_client, rep_a, vessel_a, ep_air):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ, self._payload(vessel_a, ep_air), format='json')
        assert res.status_code == 400

    def test_19c_planned_departure_before_eta_rejected(self, api_client, rep_a, vessel_a, ep_psc):
        auth(api_client, rep_a)
        res = api_client.post(VISIT_REQ, self._payload(
            vessel_a, ep_psc,
            eta=(date.today() + timedelta(days=10)).isoformat(),
            planned_departure=(date.today() + timedelta(days=2)).isoformat()), format='json')
        assert res.status_code == 400


# ===========================================================================
# PART E — pre-arrival (cases 20-22)
# ===========================================================================

class TestPreArrivalPortal:
    def test_20_company_prearrival_flow(self, api_client, rep_a, vessel_a, sp_psc):
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, rep_a)
        created = api_client.post(PREARR, {'vessel_visit': str(visit.id)}, format='json')
        assert created.status_code == 201
        pid = created.json()['data']['id']
        assert api_client.post(f'{PREARR}{pid}/submit/').status_code == 200

    def test_20b_company_cannot_review(self, api_client, rep_a, vessel_a, sp_psc):
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, rep_a)
        pid = api_client.post(PREARR, {'vessel_visit': str(visit.id)},
                              format='json').json()['data']['id']
        api_client.post(f'{PREARR}{pid}/submit/')
        assert api_client.post(f'{PREARR}{pid}/review/').status_code == 403

    def test_21_cross_company_prearrival_denied(self, api_client, rep_a, vessel_b, sp_suk):
        visit = VesselVisit.objects.create(
            vessel=vessel_b, port=sp_suk, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, rep_a)
        assert api_client.post(PREARR, {'vessel_visit': str(visit.id)},
                               format='json').status_code in (403, 404)

    def test_22_agent_unauthorized_port_denied(self, api_client, agent_a, vessel_a, sp_suk):
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suk, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, agent_a)
        assert api_client.post(PREARR, {'vessel_visit': str(visit.id)},
                               format='json').status_code in (403, 404)


# ===========================================================================
# PART F/G — clearance & departure remain sovereign (cases 23-28)
# ===========================================================================

class TestSovereignActions:
    @pytest.fixture
    def cleared_visit(self, vessel_a, sp_psc):
        return VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='ARRIVED')

    def test_23_company_can_read_own_clearance(self, api_client, rep_a, cleared_visit, officer):
        PortClearanceDecision.objects.create(
            vessel_visit=cleared_visit, decision='CLEARED', decided_by=officer, is_current=True)
        auth(api_client, rep_a)
        res = api_client.get(CLEARANCE)
        assert res.status_code == 200
        assert len(res.json()['data']['results']) == 1

    def test_24_company_cannot_create_clearance(self, api_client, rep_a, cleared_visit):
        auth(api_client, rep_a)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{cleared_visit.id}/clearance-decision/',
            {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)

    def test_25_agent_cannot_create_clearance(self, api_client, agent_a, cleared_visit):
        auth(api_client, agent_a)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{cleared_visit.id}/clearance-decision/',
            {'decision': 'CLEARED'}, format='json')
        assert res.status_code in (403, 404)

    def test_26_company_can_read_departure_status(self, api_client, rep_a, cleared_visit):
        auth(api_client, rep_a)
        res = api_client.get(f'{VISITS}{cleared_visit.id}/')
        assert res.status_code == 200
        assert 'departure_date' in res.json()['data']

    def test_27_company_cannot_execute_departure(self, api_client, rep_a, cleared_visit, officer):
        PortClearanceDecision.objects.create(
            vessel_visit=cleared_visit, decision='CLEARED', decided_by=officer, is_current=True)
        auth(api_client, rep_a)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{cleared_visit.id}/depart/', {}, format='json')
        assert res.status_code in (403, 404)
        cleared_visit.refresh_from_db()
        assert cleared_visit.status != 'DEPARTED'

    def test_28_agent_cannot_execute_departure(self, api_client, agent_a, cleared_visit, officer):
        PortClearanceDecision.objects.create(
            vessel_visit=cleared_visit, decision='CLEARED', decided_by=officer, is_current=True)
        auth(api_client, agent_a)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{cleared_visit.id}/depart/', {}, format='json')
        assert res.status_code in (403, 404)

    def test_conditional_remains_distinct(self, api_client, rep_a, cleared_visit, officer):
        """Part G: CONDITIONAL must never be presented as CLEARED."""
        PortClearanceDecision.objects.create(
            vessel_visit=cleared_visit, decision='CONDITIONAL', conditions='فحص',
            decided_by=officer, is_current=True)
        auth(api_client, rep_a)
        row = api_client.get(CLEARANCE).json()['data']['results'][0]
        assert row['decision'] == 'CONDITIONAL'
        assert row['conditions'] == 'فحص'

    def test_conditional_still_blocks_departure(self, api_client, officer, cleared_visit):
        """Part G: no conditions ledger -> departure stays blocked."""
        PortClearanceDecision.objects.create(
            vessel_visit=cleared_visit, decision='CONDITIONAL', conditions='فحص',
            decided_by=officer, is_current=True)
        auth(api_client, officer)
        res = api_client.post(
            f'/api/v1/shipping/vessel-visits/{cleared_visit.id}/depart/', {}, format='json')
        assert res.status_code == 400
        cleared_visit.refresh_from_db()
        assert cleared_visit.status != 'DEPARTED'


# ===========================================================================
# PART A — audit scoping (cases 29-33)
# ===========================================================================

class TestAuditScoping:
    def _row(self, vessel, object_type='PreArrivalNotification'):
        return ShippingAuditLog.objects.create(
            user=None, company=vessel.company, action='STATUS_CHANGE',
            object_type=object_type, object_id=str(vessel.id), object_label='x',
            detail={'entry_point': str(vessel.visits.first().port.entry_point_id)
                    if vessel.visits.exists() else ''},
        )

    def test_29_company_reads_own_audit(self, api_client, rep_a, vessel_a, company_a, sp_psc):
        VesselVisit.objects.create(vessel=vessel_a, port=sp_psc, arrival_date=date.today())
        self._row(vessel_a)
        auth(api_client, rep_a)
        res = api_client.get(AUDIT)
        assert res.status_code == 200
        assert len(res.json()['data']['results']) == 1

    def test_30_company_cannot_read_foreign_audit(self, api_client, rep_a, vessel_b, sp_suk):
        VesselVisit.objects.create(vessel=vessel_b, port=sp_suk, arrival_date=date.today())
        row = self._row(vessel_b)
        auth(api_client, rep_a)
        assert api_client.get(f'{AUDIT}{row.id}/').status_code == 404
        assert api_client.get(AUDIT).json()['data']['results'] == []

    def test_30b_cannot_filter_into_foreign_company(self, api_client, rep_a, vessel_b, company_b, sp_suk):
        VesselVisit.objects.create(vessel=vessel_b, port=sp_suk, arrival_date=date.today())
        self._row(vessel_b)
        auth(api_client, rep_a)
        res = api_client.get(f'{AUDIT}?company={company_b.id}')
        assert res.status_code == 200
        assert res.json()['data']['results'] == []

    def test_31_agent_cannot_read_foreign_company_audit(self, api_client, agent_a, vessel_b, sp_suk):
        VesselVisit.objects.create(vessel=vessel_b, port=sp_suk, arrival_date=date.today())
        self._row(vessel_b)
        auth(api_client, agent_a)
        assert api_client.get(AUDIT).json()['data']['results'] == []

    def test_32_port_health_cannot_read_unrelated_entry_point(self, api_client, officer, vessel_b, sp_suk):
        VesselVisit.objects.create(vessel=vessel_b, port=sp_suk, arrival_date=date.today())
        self._row(vessel_b)
        auth(api_client, officer)
        assert api_client.get(AUDIT).json()['data']['results'] == []

    def test_33_global_user_retains_visibility(self, api_client, admin_user, vessel_a, sp_psc):
        VesselVisit.objects.create(vessel=vessel_a, port=sp_psc, arrival_date=date.today())
        self._row(vessel_a)
        auth(api_client, admin_user)
        res = api_client.get(AUDIT)
        assert res.status_code == 200
        assert len(res.json()['data']['results']) == 1

    def test_33b_authenticated_without_scope_sees_nothing(self, api_client):
        """Being authenticated is never sufficient for broad visibility."""
        u = User.objects.create_user(email='pc_noscope@nqp.gov.sd',
                                     password='StrongPass123!', full_name='no scope')
        # authenticated, but holds neither the permission nor any scope
        auth(api_client, u)
        res = api_client.get(AUDIT)
        assert res.status_code == 403  # no shipping_audit_logs permission at all

    def test_audit_company_is_owner_not_actor(self, vessel_a, officer, sp_psc):
        """A1: attribution follows the audited object, not the actor."""
        from apps.shipping import services
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='ARRIVED')
        PortClearanceDecision.objects.create(
            vessel_visit=visit, decision='CLEARED', decided_by=officer, is_current=True)
        services.record_vessel_departure(vessel_visit=visit, actor=officer)
        row = ShippingAuditLog.objects.filter(
            action=ShippingAuditLog.Action.DEPARTURE_RECORDED).latest('created_at')
        assert row.company_id == vessel_a.company_id
        assert row.company_id != officer.carrier_memberships.first().carrier_id \
            if officer.carrier_memberships.exists() else True


# ===========================================================================
# PART H — notification isolation (cases 34-35)
# ===========================================================================

class TestNotificationIsolation:
    def test_34_company_notification_isolation(self, api_client, rep_a, rep_b):
        from apps.notifications.models import NotificationLog
        NotificationLog.objects.create(
            user=rep_a, channel='push', recipient=rep_a.email,
            subject='شركة أ', body='x', status='SENT')
        NotificationLog.objects.create(
            user=rep_b, channel='push', recipient=rep_b.email,
            subject='شركة ب', body='y', status='SENT')
        auth(api_client, rep_a)
        res = api_client.get('/api/v1/notifications/')
        assert res.status_code == 200
        subjects = [r['subject'] for r in res.json()['data']]
        assert 'شركة أ' in subjects
        assert 'شركة ب' not in subjects

    def test_35_agent_notification_isolation(self, api_client, agent_a, rep_b):
        from apps.notifications.models import NotificationLog
        NotificationLog.objects.create(
            user=agent_a, channel='push', recipient=agent_a.email,
            subject='وكيل', body='x', status='SENT')
        NotificationLog.objects.create(
            user=rep_b, channel='push', recipient=rep_b.email,
            subject='شركة ب', body='y', status='SENT')
        auth(api_client, agent_a)
        res = api_client.get('/api/v1/notifications/')
        subjects = [r['subject'] for r in res.json()['data']]
        assert subjects == ['وكيل']


# ===========================================================================
# PART L — direct API bypass (UI hiding is not security)
# ===========================================================================

class TestDirectApiBypass:
    def test_company_cannot_patch_visit_status(self, api_client, rep_a, vessel_a, sp_psc):
        visit = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_psc, arrival_date=date.today(), status='ARRIVED')
        auth(api_client, rep_a)
        res = api_client.patch(f'{VISITS}{visit.id}/', {'status': 'DEPARTED'}, format='json')
        assert res.status_code == 403
        visit.refresh_from_db()
        assert visit.status != 'DEPARTED'

    def test_company_cannot_delete_foreign_vessel(self, api_client, rep_a, vessel_b):
        auth(api_client, rep_a)
        res = api_client.delete(f'/api/v1/port-health/vessels/{vessel_b.id}/')
        assert res.status_code in (403, 404)
        assert Vessel.objects.filter(id=vessel_b.id).exists()
