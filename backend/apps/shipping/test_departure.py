"""Vessel departure tests — Phase 1B-3.

Departure is a port-authority domain action. Covers clearance dependency
(CLEARED / REFUSED / CONDITIONAL / superseded / absent), safety blocks
(isolation, vessel-restricting emergency), state (double departure, server
timestamp), API bypass vectors, authorisation and audit.
"""
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import (
    IsolationRecord,
    PortEmergency,
    SeaPort,
    Vessel,
    VesselVisit,
)
from apps.shipping.models import (
    PortClearanceDecision,
    ShippingAgent,
    ShippingAuditLog,
)
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

DEPART_URL = '/api/v1/shipping/vessel-visits/{visit}/depart/'
CLEARANCE_URL = '/api/v1/shipping/vessel-visits/{visit}/clearance-decision/'
VISITS_URL = '/api/v1/port-health/visits/'

DEPART_PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit', 'ports:view',
    'vessels:view', 'vessel_visits:view', 'clearance_decisions:view',
    'clearance_decisions:add', 'pre_arrivals:view',
]


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def port_role():
    r, _ = Role.objects.get_or_create(
        code='DEP_PORT_OFFICER',
        defaults={'name': 'Port Officer', 'name_ar': 'ضابط منفذ', 'default_scope': 'PORT'})
    r.permissions.set(_perms(DEPART_PERMS))
    return r


@pytest.fixture
def company_role():
    r, _ = Role.objects.get_or_create(
        code='DEP_SHIPPING_COMPANY',
        defaults={'name': 'Shipping Co', 'name_ar': 'ممثل شركة', 'default_scope': 'COMPANY'})
    # A company holds no port_health:edit in production; tests that need to
    # probe the domain rule grant it explicitly on a dedicated role.
    r.permissions.set(_perms([c for c in DEPART_PERMS if c != 'port_health:edit']))
    return r


@pytest.fixture
def agent_role():
    r, _ = Role.objects.get_or_create(
        code='DEP_SHIPPING_AGENT',
        defaults={'name': 'Agent', 'name_ar': 'وكيل', 'default_scope': 'COMPANY'})
    r.permissions.set(_perms([c for c in DEPART_PERMS if c != 'port_health:edit']))
    return r


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
        code='EP_DEP_PSC', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                     'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_suk(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_DEP_SUK', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                     'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def sp_psc(ep_psc):
    o, _ = SeaPort.objects.get_or_create(
        code='DEP_PSC', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True})
    return o


@pytest.fixture
def sp_suk(ep_suk):
    o, _ = SeaPort.objects.get_or_create(
        code='DEP_SUK', defaults={'name_ar': 'سواكن', 'entry_point': ep_suk, 'is_active': True})
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
        imo_number='IMO-DEP-1',
        defaults={'vessel_name': 'سفينة أ', 'flag_state': 'السودان',
                  'company': company_a, 'status': 'ARRIVED'})
    return o


@pytest.fixture
def vessel_b(company_b):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-DEP-2',
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
def officer_psc(port_role, ep_psc):
    u = User.objects.create_user(email='dep_psc@nqp.gov.sd', password='StrongPass123!', full_name='ضابط بورتسودان')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_psc.id, is_active=True)
    return u


@pytest.fixture
def officer_suk(port_role, ep_suk):
    u = User.objects.create_user(email='dep_suk@nqp.gov.sd', password='StrongPass123!', full_name='ضابط سواكن')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_suk.id, is_active=True)
    return u


@pytest.fixture
def rep_a(company_a, company_role):
    u = User.objects.create_user(email='dep_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل أ')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_user(company_a, agent_role, ep_psc):
    u = User.objects.create_user(email='dep_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل')
    RoleAssignment.objects.create(user=u, role=agent_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    a = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل بورتسودان', status='ACTIVE', is_active=True)
    a.ports.add(ep_psc)
    return u


@pytest.fixture
def cleared(visit_a, officer_psc):
    """A current CLEARED decision for visit_a."""
    return PortClearanceDecision.objects.create(
        vessel_visit=visit_a, decision=PortClearanceDecision.Decision.CLEARED,
        decided_by=officer_psc, is_current=True)


# ===========================================================================
# 1) Happy path
# ===========================================================================

class TestHappyPath:
    def test_1_current_cleared_allows_departure(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 201, res.content
        visit_a.refresh_from_db()
        assert visit_a.status == 'DEPARTED'
        assert visit_a.departure_date == date.today()

    def test_21_returns_updated_visit(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        body = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').json()['data']
        assert body['id'] == str(visit_a.id)
        assert body['status'] == 'DEPARTED'
        assert body['departure_date'] == date.today().isoformat()


# ===========================================================================
# 2-6) Clearance rules
# ===========================================================================

class TestClearanceRules:
    def test_2_no_clearance_blocks(self, api_client, officer_psc, visit_a):
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        assert 'preconditions' in res.json()
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_3_superseded_clearance_blocks(self, api_client, officer_psc, visit_a, cleared):
        """An old CLEARED decision that was superseded no longer authorises."""
        PortClearanceDecision.objects.create(
            vessel_visit=visit_a, decision=PortClearanceDecision.Decision.REFUSED,
            reason='إعادة نظر', decided_by=officer_psc, is_current=True, supersedes=cleared)
        cleared.is_current = False
        cleared.save(update_fields=['is_current'])

        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_4_current_refused_blocks(self, api_client, officer_psc, visit_a):
        PortClearanceDecision.objects.create(
            vessel_visit=visit_a, decision=PortClearanceDecision.Decision.REFUSED,
            reason='رفض', decided_by=officer_psc, is_current=True)
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_5_conditional_blocks_without_satisfaction_mechanism(self, api_client, officer_psc, visit_a):
        """No conditions ledger exists, so CONDITIONAL must not self-authorise."""
        PortClearanceDecision.objects.create(
            vessel_visit=visit_a, decision=PortClearanceDecision.Decision.CONDITIONAL,
            conditions='فحص waters إلزامي', decided_by=officer_psc, is_current=True)
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        notes = ' '.join(res.json()['preconditions'])
        assert 'مشروط' in notes or 'الشروط' in notes
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_6_conditional_cannot_be_forced_by_parameters(self, api_client, officer_psc, visit_a):
        """No request field may stand in for proven satisfaction."""
        PortClearanceDecision.objects.create(
            vessel_visit=visit_a, decision=PortClearanceDecision.Decision.CONDITIONAL,
            conditions='شرط', decided_by=officer_psc, is_current=True)
        auth(api_client, officer_psc)
        for payload in (
            {'conditions_satisfied': True},
            {'status': 'CLEARED'},
            {'override': True},
            {'decision': 'CLEARED'},
        ):
            res = api_client.post(DEPART_URL.format(visit=visit_a.id), payload, format='json')
            assert res.status_code == 400, payload
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'


# ===========================================================================
# 7-8) Safety preconditions
# ===========================================================================

class TestSafetyPreconditions:
    def test_7_active_isolation_blocks(self, api_client, officer_psc, visit_a, cleared, vessel_a):
        IsolationRecord.objects.create(
            vessel=vessel_a, person_name='مشتبه', person_type='CREW',
            start_date=date.today(), status=IsolationRecord.IsolationStatus.ACTIVE)
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        assert 'حجر' in ' '.join(res.json()['preconditions'])
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_7b_closed_isolation_does_not_block(self, api_client, officer_psc, visit_a, cleared, vessel_a):
        IsolationRecord.objects.create(
            vessel=vessel_a, person_name='سابق', person_type='CREW',
            start_date=date.today() - timedelta(days=5), end_date=date.today() - timedelta(days=1),
            status=IsolationRecord.IsolationStatus.RELEASED)
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').status_code == 201

    def test_8_vessel_restricting_emergency_blocks(self, api_client, officer_psc, visit_a, cleared, vessel_a, sp_psc):
        PortEmergency.objects.create(
            port=sp_psc, vessel=vessel_a, title='طارئ',
            status=PortEmergency.EmergencyStatus.OPEN, vessel_restricted=True)
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        assert 'طارئ' in ' '.join(res.json()['preconditions'])
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_8b_closed_emergency_does_not_block(self, api_client, officer_psc, visit_a, cleared, vessel_a, sp_psc):
        PortEmergency.objects.create(
            port=sp_psc, vessel=vessel_a, title='منتهٍ',
            status=PortEmergency.EmergencyStatus.CLOSED, vessel_restricted=True)
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').status_code == 201


# ===========================================================================
# 9-12) State & timestamp integrity
# ===========================================================================

class TestStateIntegrity:
    def test_9_already_departed_blocks(self, api_client, officer_psc, visit_a, cleared):
        visit_a.status = 'DEPARTED'
        visit_a.departure_date = date.today() - timedelta(days=1)
        visit_a.save(update_fields=['status', 'departure_date'])

        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code == 400
        visit_a.refresh_from_db()
        assert visit_a.departure_date == date.today() - timedelta(days=1)

    def test_22_repeated_departure_rejected(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').status_code == 201
        second = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert second.status_code == 400
        assert PortClearanceDecision.objects.filter(vessel_visit=visit_a).count() == 1

    def test_10_timestamp_is_server_generated(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        visit_a.refresh_from_db()
        assert visit_a.departure_date == date.today()

    def test_11_client_cannot_override_departure_timestamp(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        future = (date.today() + timedelta(days=30)).isoformat()
        api_client.post(DEPART_URL.format(visit=visit_a.id), {'departure_date': future}, format='json')
        visit_a.refresh_from_db()
        assert visit_a.departure_date == date.today()

    def test_12_direct_status_patch_cannot_bypass(self, api_client, officer_psc, visit_a, cleared):
        """The port_health visit endpoint must not allow writing status/departure."""
        auth(api_client, officer_psc)
        res = api_client.patch(f'{VISITS_URL}{visit_a.id}/',
                               {'status': 'DEPARTED', 'departure_date': date.today().isoformat()},
                               format='json')
        assert res.status_code == 400
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'
        assert visit_a.departure_date is None

    def test_12b_vessel_endpoint_also_protected(self, api_client, officer_psc, vessel_a, cleared):
        auth(api_client, officer_psc)
        res = api_client.patch(f'/api/v1/port-health/vessels/{vessel_a.id}/',
                               {'status': 'DEPARTED'}, format='json')
        assert res.status_code in (400, 403)
        vessel_a.refresh_from_db()
        assert vessel_a.status != 'DEPARTED'

    def test_12c_berth_change_still_allowed(self, api_client, officer_psc, visit_a, cleared):
        """Closing the bypass must not freeze unrelated editable fields."""
        auth(api_client, officer_psc)
        res = api_client.patch(f'{VISITS_URL}{visit_a.id}/', {'berth': None}, format='json')
        assert res.status_code == 200


# ===========================================================================
# 13-17) Authorisation
# ===========================================================================

class TestAuthorization:
    def test_13_company_cannot_depart(self, api_client, rep_a, visit_a, cleared):
        auth(api_client, rep_a)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_14_agent_cannot_depart(self, api_client, agent_user, visit_a, cleared):
        auth(api_client, agent_user)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_14b_company_with_port_edit_still_cannot_depart(self, api_client, company_a, company_role, visit_a, cleared):
        """Domain rule: the shipping company may never sail its own vessel out."""
        sod_role, _ = Role.objects.get_or_create(
            code='DEP_SOD_PROBE',
            defaults={'name': 'SoD', 'name_ar': 'اختبار', 'default_scope': 'COMPANY'})
        sod_role.permissions.set(_perms(DEPART_PERMS))

        u = User.objects.create_user(email='dep_sod@nqp.gov.sd', password='StrongPass123!', full_name='ممثل بصلاحيات')
        RoleAssignment.objects.create(user=u, role=sod_role, scope_type='COMPANY',
                                      scope_id=company_a.id, is_active=True)
        CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)

        auth(api_client, u)
        res = api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_a.refresh_from_db()
        assert visit_a.status != 'DEPARTED'

    def test_15_company_a_cannot_depart_company_b_visit(self, api_client, rep_a, officer_suk, visit_b):
        PortClearanceDecision.objects.create(
            vessel_visit=visit_b, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer_suk, is_current=True)
        auth(api_client, rep_a)
        res = api_client.post(DEPART_URL.format(visit=visit_b.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_b.refresh_from_db()
        assert visit_b.status != 'DEPARTED'

    def test_16_agent_cannot_depart_outside_authorised_port(self, api_client, agent_user, officer_suk, company_a, vessel_a, sp_suk):
        visit_suk = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suk, arrival_date=date.today(), status='ARRIVED')
        PortClearanceDecision.objects.create(
            vessel_visit=visit_suk, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer_suk, is_current=True)
        auth(api_client, agent_user)
        res = api_client.post(DEPART_URL.format(visit=visit_suk.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_suk.refresh_from_db()
        assert visit_suk.status != 'DEPARTED'

    def test_17_officer_cannot_depart_another_entry_point(self, api_client, officer_psc, officer_suk, visit_b):
        PortClearanceDecision.objects.create(
            vessel_visit=visit_b, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer_suk, is_current=True)
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=visit_b.id), {}, format='json')
        assert res.status_code in (403, 404)
        visit_b.refresh_from_db()
        assert visit_b.status != 'DEPARTED'


# ===========================================================================
# 18-19) Audit
# ===========================================================================

class TestAudit:
    def test_18_successful_departure_audited(self, api_client, officer_psc, visit_a, cleared):
        auth(api_client, officer_psc)
        api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json')
        rows = ShippingAuditLog.objects.filter(
            object_type='VesselVisit', action=ShippingAuditLog.Action.DEPARTURE_RECORDED)
        assert rows.count() == 1
        detail = rows.first().detail
        assert detail['vessel_visit'] == str(visit_a.id)
        assert detail['vessel'] == visit_a.vessel.imo_number
        assert detail['departed_at']

    def test_19_failed_departure_writes_no_departure_audit(self, api_client, officer_psc, visit_a):
        """A blocked attempt must not leave a false 'departed' record."""
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').status_code == 400
        assert not ShippingAuditLog.objects.filter(
            action=ShippingAuditLog.Action.DEPARTURE_RECORDED).exists()

    def test_19b_blocked_isolation_attempt_audits_nothing(self, api_client, officer_psc, visit_a, cleared, vessel_a):
        IsolationRecord.objects.create(
            vessel=vessel_a, person_name='مشتبه', person_type='CREW',
            start_date=date.today(), status=IsolationRecord.IsolationStatus.ACTIVE)
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_a.id), {}, format='json').status_code == 400
        assert not ShippingAuditLog.objects.filter(
            action=ShippingAuditLog.Action.DEPARTURE_RECORDED).exists()


# ===========================================================================
# 20-21) Direct-ID / bypass surface
# ===========================================================================

class TestBypassSurface:
    def test_20_direct_foreign_visit_id_denied(self, api_client, officer_psc, officer_suk, visit_b):
        """Naming a foreign visit id directly is refused."""
        PortClearanceDecision.objects.create(
            vessel_visit=visit_b, decision=PortClearanceDecision.Decision.CLEARED,
            decided_by=officer_suk, is_current=True)
        auth(api_client, officer_psc)
        assert api_client.post(DEPART_URL.format(visit=visit_b.id), {}, format='json').status_code in (403, 404)

    def test_20b_unknown_visit_id_404(self, api_client, officer_psc):
        import uuid
        auth(api_client, officer_psc)
        res = api_client.post(DEPART_URL.format(visit=uuid.uuid4()), {}, format='json')
        assert res.status_code == 404

    def test_20c_body_cannot_redirect_the_target(self, api_client, officer_psc, visit_a, cleared, visit_b):
        """The URL decides the visit; the body is ignored for identity."""
        auth(api_client, officer_psc)
        api_client.post(DEPART_URL.format(visit=visit_a.id),
                        {'vessel_visit': str(visit_b.id), 'port': 'X', 'company': 'Y'},
                        format='json')
        visit_a.refresh_from_db()
        visit_b.refresh_from_db()
        assert visit_a.status == 'DEPARTED'
        assert visit_b.status != 'DEPARTED'


# ===========================================================================
# Service-level checks
# ===========================================================================

class TestServiceLayer:
    def test_inactive_port_blocks_departure(self, officer_psc, visit_a, cleared, sp_psc):
        from apps.shipping import services
        sp_psc.is_active = False
        sp_psc.save(update_fields=['is_active'])
        visit_a.refresh_from_db()
        ok, notes = services.departure_preconditions(visit_a)
        assert ok is False
        assert 'الميناء غير نشط' in ' '.join(notes)

    def test_departure_requires_authentication(self, visit_a, cleared):
        from rest_framework.exceptions import PermissionDenied
        from apps.shipping import services
        with pytest.raises(PermissionDenied):
            services.record_vessel_departure(vessel_visit=visit_a, actor=None)

    def test_preconditions_reports_cleared_context(self, visit_a, cleared):
        from apps.shipping import services
        ok, notes = services.departure_preconditions(visit_a)
        assert ok is True
        assert any('مُفرج عنها' in n for n in notes)