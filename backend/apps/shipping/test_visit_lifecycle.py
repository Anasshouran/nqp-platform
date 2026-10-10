"""VesselVisit lifecycle hardening tests — Phase 1D-P0.

Invariant under test:

    ``VesselVisit.status`` and ``VesselVisit.departure_date`` are
    **server-owned**. The only way a visit may become ``DEPARTED`` is

        POST /api/v1/shipping/vessel-visits/{id}/depart/
            -> apps.shipping.services.record_vessel_departure()

No generic PATCH/PUT/POST payload may move the lifecycle, and no actor — not
even a port-health officer holding ``port_health:edit`` — may reach the same
outcome through ``/api/v1/port-health/visits/``.

The generic endpoint therefore answers with an **explicit 400** (via
``VesselVisitSerializer.to_internal_value``) rather than the DRF default of
silently dropping a read-only field and returning 200, which would be a
false-success lifecycle bypass.
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
from apps.shipping.models import PortClearanceDecision, ShippingAgent
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

VISITS = '/api/v1/port-health/visits/'
VESSELS = '/api/v1/port-health/vessels/'
DEPART = '/api/v1/shipping/vessel-visits/{visit}/depart/'

PORT_HEALTH_PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit',
    'vessels:view', 'vessels:edit', 'vessels:add',
    'vessel_visits:view', 'vessel_visits:edit', 'vessel_visits:add',
    'ports:view', 'clearance_decisions:view', 'clearance_decisions:add',
    'pre_arrivals:view',
]
COMPANY_PERMS = [
    'port_health:view', 'vessels:view', 'vessels:edit',
    'vessel_visits:view', 'vessel_visits:edit', 'vessel_visits:add', 'ports:view',
]


# --- master data ------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='P0_ORG', defaults={'name_ar': 'قطاع'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='P0_SEA', defaults={'name_ar': 'بحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='P0_ST', defaults={'name_ar': 'ولاية', 'sector': md_sector})
    return o


@pytest.fixture
def ep_psc(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_P0_PSC', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                    'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def sp_psc(ep_psc):
    o, _ = SeaPort.objects.get_or_create(
        code='P0_SP_PSC', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True})
    return o


# --- company / vessel / visit ------------------------------------------------

@pytest.fixture
def company_a():
    o, _ = Carrier.objects.get_or_create(
        name='شركة ب', defaults={'name_en': 'Co P0', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def vessel_a(company_a):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-P0-1',
        defaults={'vessel_name': 'سفينة ب', 'flag_state': 'السودان',
                  'company': company_a, 'status': 'EXPECTED'})
    return o


@pytest.fixture
def visit_a(vessel_a, sp_psc):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=sp_psc,
        defaults={'arrival_date': date.today(), 'status': 'ARRIVED'})
    return o


# --- roles / users ----------------------------------------------------------

@pytest.fixture
def port_role():
    r, _ = Role.objects.get_or_create(
        code='P0_PORT_OFFICER',
        defaults={'name': 'Port Officer', 'name_ar': 'ضابط منفذ', 'default_scope': 'PORT'})
    r.permissions.set(_perms(PORT_HEALTH_PERMS))
    return r


@pytest.fixture
def company_role():
    r, _ = Role.objects.get_or_create(
        code='P0_SHIPPING_COMPANY',
        defaults={'name': 'Shipping Co', 'name_ar': 'ممثل شركة', 'default_scope': 'COMPANY'})
    r.permissions.set(_perms(COMPANY_PERMS))
    return r


@pytest.fixture
def officer(port_role, ep_psc):
    """Port-health officer with edit rights over the visit's own entry point."""
    u = User.objects.create_user(email='p0_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_psc.id, is_active=True)
    return u


@pytest.fixture
def rep_a(company_a, company_role):
    u = User.objects.create_user(email='p0_rep@nqp.gov.sd', password='StrongPass123!', full_name='ممثل')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_a(company_a, company_role, ep_psc):
    u = User.objects.create_user(email='p0_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    a = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل بورتسودان', status='ACTIVE', is_active=True)
    a.ports.add(ep_psc)
    return u


@pytest.fixture
def cleared(visit_a, officer):
    return PortClearanceDecision.objects.create(
        vessel_visit=visit_a, decision=PortClearanceDecision.Decision.CLEARED,
        decided_by=officer, is_current=True)


# ===========================================================================
# 1-4) Company / agent cannot reach the lifecycle through the generic endpoint
# ===========================================================================

class TestCompanyAndAgentBlocked:
    def test_1_company_patch_status_denied(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.patch(f'{VISITS}{visit_a.id}/', {'status': 'DEPARTED'}, format='json')
        assert res.status_code in (400, 403, 404)
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_2_company_patch_departure_date_denied(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.patch(
            f'{VISITS}{visit_a.id}/',
            {'departure_date': (date.today() + timedelta(days=5)).isoformat()}, format='json')
        assert res.status_code in (400, 403, 404)
        visit_a.refresh_from_db()
        assert visit_a.departure_date is None

    def test_3_agent_patch_status_denied(self, api_client, agent_a, visit_a):
        auth(api_client, agent_a)
        res = api_client.patch(f'{VISITS}{visit_a.id}/', {'status': 'DEPARTED'}, format='json')
        assert res.status_code in (400, 403, 404)
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_4_agent_patch_departure_date_denied(self, api_client, agent_a, visit_a):
        auth(api_client, agent_a)
        res = api_client.patch(
            f'{VISITS}{visit_a.id}/',
            {'departure_date': (date.today() + timedelta(days=5)).isoformat()}, format='json')
        assert res.status_code in (400, 403, 404)
        visit_a.refresh_from_db()
        assert visit_a.departure_date is None


# ===========================================================================
# 5-7) Port health may not bypass the service either
# ===========================================================================

class TestPortHealthCannotBypassService:
    def test_5_officer_patch_status_denied_even_with_edit_rights(self, api_client, officer, visit_a):
        """The officer owns this visit's entry point, so scoping lets them
        through; the server-owned field rule must still reject the write."""
        auth(api_client, officer)
        res = api_client.patch(f'{VISITS}{visit_a.id}/', {'status': 'DEPARTED'}, format='json')
        assert res.status_code == 400, res.content
        assert 'status' in res.json()
        visit_a.refresh_from_db()
        assert visit_a.status == 'ARRIVED'

    def test_6_officer_patch_departure_date_denied_even_with_edit_rights(self, api_client, officer, visit_a):
        auth(api_client, officer)
        res = api_client.patch(
            f'{VISITS}{visit_a.id}/',
            {'departure_date': (date.today() + timedelta(days=5)).isoformat()}, format='json')
        assert res.status_code == 400, res.content
        assert 'departure_date' in res.json()
        visit_a.refresh_from_db()
        assert visit_a.departure_date is None

    def test_7_officer_put_status_denied(self, api_client, officer, vessel_a, sp_psc, visit_a):
        """PUT is not routed on this viewset at all (`http_method_names`), so a
        full-update payload cannot be used as an alternative write path."""
        auth(api_client, officer)
        res = api_client.put(
            f'{VISITS}{visit_a.id}/',
            {'vessel': str(vessel_a.id), 'port': str(sp_psc.id),
             'arrival_date': visit_a.arrival_date.isoformat(),
             'status': 'DEPARTED',
             'departure_date': date.today().isoformat()},
            format='json')
        assert res.status_code == 405, res.content
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'
        assert visit_a.departure_date is None

    def test_8_create_visit_with_departure_state_denied(self, api_client, officer, vessel_a, sp_psc):
        """POST must not be a back door: a caller cannot mint a DEPARTED visit."""
        auth(api_client, officer)
        res = api_client.post(
            VISITS,
            {'vessel': str(vessel_a.id), 'port': str(sp_psc.id),
             'arrival_date': date.today().isoformat(),
             'status': 'DEPARTED',
             'departure_date': date.today().isoformat()},
            format='json')
        assert res.status_code == 400, res.content
        assert not VesselVisit.objects.filter(
            vessel=vessel_a, status='DEPARTED').exists()

    def test_9_vessel_patch_does_not_cascade_to_visit(self, api_client, officer, vessel_a, visit_a):
        """PATCHing the vessel must not reach the visit lifecycle."""
        auth(api_client, officer)
        res = api_client.patch(
            f'{VESSELS}{vessel_a.id}/',
            {'status': 'DEPARTED', 'departure_date': date.today().isoformat()},
            format='json')
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'
        assert visit_a.departure_date is None
        assert res.status_code in (200, 400, 403)


# ===========================================================================
# 10-11) The one legitimate path still works
# ===========================================================================

class TestOfficialDeparturePath:
    def test_10_officer_departure_service_allowed(self, api_client, officer, visit_a, cleared):
        auth(api_client, officer)
        res = api_client.post(DEPART.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 201, res.content
        visit_a.refresh_from_db()
        assert visit_a.status == 'DEPARTED'
        assert visit_a.departure_date == date.today()

    def test_11_officer_departure_service_still_enforces_rules(self, api_client, officer, visit_a):
        """No clearance -> the service (not the serializer) blocks the departure."""
        auth(api_client, officer)
        res = api_client.post(DEPART.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400, res.content
        assert 'preconditions' in res.json()
        visit_a.refresh_from_db()
        assert visit_a.status == 'ARRIVED'
        assert visit_a.departure_date is None