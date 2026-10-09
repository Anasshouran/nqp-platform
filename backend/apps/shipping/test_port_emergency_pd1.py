"""PD-1 PortEmergency blocking predicate — Phase 1D-5.

Form A, as approved in Phase 1D-4 and re-justified in the Phase 1D-4H audit:

    an OPEN PortEmergency blocks a visit when

      (1) vessel_restricted AND it names this vessel   [vessel-centric: the
          emergency's own ``port`` is deliberately NOT compared to the visit's]
      OR
      (2) it names no vessel (vessel IS NULL) AND it applies to this visit's port

Test B is the mandatory Form A witness: a vessel-specific emergency keeps
blocking after the vessel is rerouted to another port.
"""
from datetime import date

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import Role, RoleAssignment
from apps.carriers.models import Carrier
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import (
    PortEmergency,
    SeaPort,
    Vessel,
    VesselVisit,
)
from apps.shipping.models import PortClearanceDecision
from apps.shipping.services import blocking_port_emergency_exists
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

CLEARANCE_URL = '/api/v1/shipping/vessel-visits/{visit}/clearance-decision/'
DEPART_URL = '/api/v1/shipping/vessel-visits/{visit}/depart/'

OFFICER_PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit',
    'emergencies:view', 'emergencies:add', 'emergencies:edit',
    'ports:view', 'vessels:view', 'vessel_visits:view',
    'clearance_decisions:view', 'clearance_decisions:add', 'pre_arrivals:view',
]


# --- master data ------------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='PD1_ORG', defaults={'name_ar': 'قطاع'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='PD1_SEA', defaults={'name_ar': 'بحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='PD1_ST', defaults={'name_ar': 'ولاية', 'sector': md_sector})
    return o


@pytest.fixture
def ep_a(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_PD1_A', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                   'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_b(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_PD1_B', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                   'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def port_a(ep_a):
    o, _ = SeaPort.objects.get_or_create(
        code='PD1_SP_A', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_a, 'is_active': True})
    return o


@pytest.fixture
def port_b(ep_b):
    o, _ = SeaPort.objects.get_or_create(
        code='PD1_SP_B', defaults={'name_ar': 'سواكن', 'entry_point': ep_b, 'is_active': True})
    return o


@pytest.fixture
def company():
    o, _ = Carrier.objects.get_or_create(
        name='شركة PD1', defaults={'name_en': 'Co PD1', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def vessel_v1(company, port_a):
    v = Vessel.objects.create(vessel_name='سفينة 1', imo_number='IMO-PD1-1', company=company)
    VesselVisit.objects.create(vessel=v, port=port_a, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def vessel_v2(company, port_a):
    v = Vessel.objects.create(vessel_name='سفينة 2', imo_number='IMO-PD1-2', company=company)
    VesselVisit.objects.create(vessel=v, port=port_a, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def visit_v1(vessel_v1, port_a):
    # VesselVisit orders by -arrival_date and both calls share a date, so the
    # port call must be selected explicitly rather than via .first().
    return vessel_v1.visits.get(port=port_a)


@pytest.fixture
def visit_v2(vessel_v2, port_a):
    return vessel_v2.visits.get(port=port_a)


@pytest.fixture
def visit_v1_at_b(vessel_v1, port_b):
    """Same vessel, second port call at Port B (the rerouting scenario)."""
    return VesselVisit.objects.create(
        vessel=vessel_v1, port=port_b, arrival_date=date.today(), status='ARRIVED')


@pytest.fixture
def officer(ep_a, ep_b):
    role, _ = Role.objects.get_or_create(
        code='PD1_OFFICER', defaults={'name': 'PH', 'name_ar': 'ضابط', 'default_scope': 'PORT'})
    role.permissions.set(_perms(OFFICER_PERMS))
    u = User.objects.create_user(email='pd1_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    # scoped to both ports so authorization never masks the predicate under test
    RoleAssignment.objects.create(user=u, role=role, scope_type='PORT',
                                  scope_id=ep_a.id, is_active=True)
    RoleAssignment.objects.create(user=u, role=role, scope_type='PORT',
                                  scope_id=ep_b.id, is_active=True)
    return u


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


def emergency(**kwargs):
    params = {'title': 'طارئ', 'severity': 'HIGH', 'status': 'OPEN'}
    params.update(kwargs)
    return PortEmergency.objects.create(**params)


# ===========================================================================
# Predicate-level truth table (fast, no HTTP)
# ===========================================================================

class TestPredicateTruthTable:
    def test_a_same_vessel_blocks(self, vessel_v1, port_a, visit_v1):
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True)
        assert blocking_port_emergency_exists(visit_v1) is True

    def test_b_same_vessel_blocks_after_port_change(self, vessel_v1, port_a, port_b, visit_v1_at_b):
        """MANDATORY Form A witness: emergency.port is Port A, visit.port is
        Port B, and the vessel is still blocked."""
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True)
        # guard: the visit really is at the *other* port, so the pass below can
        # only come from the vessel clause ignoring `port`.
        assert visit_v1_at_b.port_id == port_b.id
        assert port_b.id != port_a.id
        assert blocking_port_emergency_exists(visit_v1_at_b) is True

    def test_c_different_vessel_not_blocked(self, vessel_v1, vessel_v2, port_a, visit_v2):
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True)
        assert blocking_port_emergency_exists(visit_v2) is False

    def test_d_port_wide_blocks_same_port(self, port_a, visit_v1):
        emergency(port=port_a, vessel=None, vessel_restricted=False)
        assert blocking_port_emergency_exists(visit_v1) is True

    def test_e_port_wide_does_not_cross_ports(self, port_a, port_b, visit_v1_at_b):
        emergency(port=port_a, vessel=None, vessel_restricted=False)
        assert blocking_port_emergency_exists(visit_v1_at_b) is False

    def test_f_closed_emergency_never_blocks(self, vessel_v1, vessel_v2, port_a, port_b,
                                            visit_v1, visit_v2, visit_v1_at_b):
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True, status='CLOSED')
        emergency(port=port_a, vessel=None, status='CLOSED')
        assert blocking_port_emergency_exists(visit_v1) is False
        assert blocking_port_emergency_exists(visit_v2) is False
        assert blocking_port_emergency_exists(visit_v1_at_b) is False

    def test_g_vessel_restricted_false_does_not_activate_vessel_clause(self, vessel_v1, port_a, visit_v1):
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=False)
        assert blocking_port_emergency_exists(visit_v1) is False

    def test_g2_vessel_restricted_false_still_blocked_by_independent_port_wide_clause(
        self, vessel_v1, port_a, visit_v1,
    ):
        """Test G's own hedge: an independent port-wide emergency still blocks."""
        emergency(port=port_a, vessel=None, vessel_restricted=False)
        assert blocking_port_emergency_exists(visit_v1) is True

    def test_h_no_emergency_at_all(self, visit_v1):
        assert blocking_port_emergency_exists(visit_v1) is False


# ===========================================================================
# End-to-end: the predicate must actually stop clearance and departure
# ===========================================================================

class TestEndToEndBlocking:
    def test_i1_port_wide_emergency_blocks_clearance(self, api_client, officer, port_a, visit_v1):
        emergency(port=port_a, vessel=None)
        auth(api_client, officer)
        res = api_client.post(CLEARANCE_URL.format(visit=visit_v1.id),
                              {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 400, res.content
        assert 'preconditions' in res.json()
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_v1).exists()

    def test_i2_vessel_specific_emergency_blocks_clearance_after_reroute(
        self, api_client, officer, vessel_v1, port_a, visit_v1_at_b,
    ):
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True)
        auth(api_client, officer)
        res = api_client.post(CLEARANCE_URL.format(visit=visit_v1_at_b.id),
                              {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 400, res.content
        assert not PortClearanceDecision.objects.filter(vessel_visit=visit_v1_at_b).exists()

    def test_i3_port_wide_emergency_blocks_departure(self, api_client, officer, port_a, visit_v1):
        PortClearanceDecision.objects.create(
            vessel_visit=visit_v1, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer, is_current=True)
        emergency(port=port_a, vessel=None)
        auth(api_client, officer)
        res = api_client.post(DEPART_URL.format(visit=visit_v1.id), {}, format='json')
        assert res.status_code == 400, res.content
        visit_v1.refresh_from_db()
        assert visit_v1.status == 'ARRIVED'
        assert visit_v1.departure_date is None

    def test_i4_vessel_specific_emergency_blocks_departure_after_reroute(
        self, api_client, officer, vessel_v1, port_a, visit_v1_at_b,
    ):
        PortClearanceDecision.objects.create(
            vessel_visit=visit_v1_at_b, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer, is_current=True)
        emergency(port=port_a, vessel=vessel_v1, vessel_restricted=True)
        auth(api_client, officer)
        res = api_client.post(DEPART_URL.format(visit=visit_v1_at_b.id), {}, format='json')
        assert res.status_code == 400, res.content
        visit_v1_at_b.refresh_from_db()
        assert visit_v1_at_b.status == 'ARRIVED'

    def test_i5_closing_the_emergency_unblocks(self, api_client, officer, port_a, visit_v1):
        em = emergency(port=port_a, vessel=None)
        auth(api_client, officer)
        assert api_client.post(CLEARANCE_URL.format(visit=visit_v1.id),
                               {'decision': 'CLEARED'}, format='json').status_code == 400
        # the documented operational escape hatch: close the emergency
        assert api_client.patch(f'/api/v1/port-health/emergencies/{em.id}/',
                                {'status': 'CLOSED'}, format='json').status_code == 200
        res = api_client.post(CLEARANCE_URL.format(visit=visit_v1.id),
                              {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content

    def test_i6_unrelated_port_wide_emergency_does_not_block(self, api_client, officer, ep_b, port_a, visit_v1):
        """An emergency at another port must never block this port."""
        other_port = SeaPort.objects.create(
            code='PD1_SP_C', name_ar='ميناء آخر', entry_point=ep_b, is_active=True)
        emergency(port=other_port, vessel=None)
        auth(api_client, officer)
        res = api_client.post(CLEARANCE_URL.format(visit=visit_v1.id),
                              {'decision': 'CLEARED'}, format='json')
        assert res.status_code == 201, res.content

    def test_i7_company_cannot_create_a_blocking_emergency(self, api_client, company, port_a):
        """PD-1 must not become a company self-service lever (Phase 1C-C boundary)."""
        from apps.carriers.models import CarrierMember

        role, _ = Role.objects.get_or_create(
            code='PD1_COMPANY', defaults={'name': 'Co', 'name_ar': 'شركة', 'default_scope': 'COMPANY'})
        role.permissions.set(_perms(['port_health:view', 'emergencies:view']))
        u = User.objects.create_user(email='pd1_co@nqp.gov.sd', password='StrongPass123!', full_name='ممثل')
        RoleAssignment.objects.create(user=u, role=role, scope_type='COMPANY',
                                      scope_id=company.id, is_active=True)
        CarrierMember.objects.create(user=u, carrier=company, is_primary=True, is_active=True)
        auth(api_client, u)
        res = api_client.post('/api/v1/port-health/emergencies/', {
            'port': str(port_a.id), 'title': 'طارئ', 'vessel_restricted': True,
        }, format='json')
        assert res.status_code == 403, res.content
        assert not PortEmergency.objects.filter(port=port_a).exists()