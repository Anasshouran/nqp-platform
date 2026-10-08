"""Pre-arrival notification tests — Phase 1B-1.

Covers company isolation, agent company+port isolation, preserved port-health
geographic scoping, the workflow state machine, and payload integrity.
"""
from datetime import date

import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.shipping.models import PreArrivalNotification, ShippingAgent, ShippingAuditLog
from apps.shipping.testing import auth, ensure_permissions, perms as _perms

@pytest.fixture
def api_client():
    return APIClient()

pytestmark = pytest.mark.django_db

User = get_user_model()

PRE_ARRIVAL_CODES = [
    'pre_arrivals:view', 'pre_arrivals:add', 'pre_arrivals:edit', 'pre_arrivals:delete',
    'port_health:view', 'port_health:edit', 'ports:view',
    'vessels:view', 'vessel_visits:view',
]


@pytest.fixture
def company_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_COMPANY',
        defaults={'name': 'Shipping Company', 'name_ar': 'ممثل شركة ملاحة', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_perms(PRE_ARRIVAL_CODES))
    return role


@pytest.fixture
def agent_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_AGENT',
        defaults={'name': 'Shipping Agent', 'name_ar': 'وكيل ملاحي', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_perms(PRE_ARRIVAL_CODES))
    return role


@pytest.fixture
def port_role():
    role, _ = Role.objects.get_or_create(
        code='PREARR_PORT_OFFICER',
        defaults={'name': 'Port Officer', 'name_ar': 'ضابط منفذ', 'default_scope': 'PORT'},
    )
    role.permissions.set(_perms(PRE_ARRIVAL_CODES))
    return role


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email='pa_admin@nqp.gov.sd', password='StrongPass123!', full_name='مدير',
    )


# --- master data -----------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='SEA', defaults={'name_ar': 'القطاع البحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='MD_RED_SEA', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': md_sector})
    return o


@pytest.fixture
def ep_psc(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_PU_PSC', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                    'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_suakin(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_PU_SUK', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                    'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def sp_psc(ep_psc):
    o, _ = SeaPort.objects.get_or_create(
        code='PU_PSC', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True})
    return o


@pytest.fixture
def sp_suakin(ep_suakin):
    o, _ = SeaPort.objects.get_or_create(
        code='PU_SUK', defaults={'name_ar': 'سواكن', 'entry_point': ep_suakin, 'is_active': True})
    return o


@pytest.fixture
def sp_archived(ep_suakin):
    o, _ = SeaPort.objects.get_or_create(
        code='PU_OLD', defaults={'name_ar': 'ميناء قديم', 'entry_point': ep_suakin, 'is_active': False})
    return o


# --- companies / vessels / visits -----------------------------------------

@pytest.fixture
def company_a():
    o, _ = Carrier.objects.get_or_create(
        name='شركة أ', defaults={'name_en': 'Company A', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def company_b():
    o, _ = Carrier.objects.get_or_create(
        name='شركة ب', defaults={'name_en': 'Company B', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def vessel_a(company_a):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-PU-001',
        defaults={'vessel_name': 'سفينة أ', 'flag_state': 'السودان', 'company': company_a, 'status': 'EXPECTED'})
    return o


@pytest.fixture
def vessel_b(company_b):
    o, _ = Vessel.objects.get_or_create(
        imo_number='IMO-PU-002',
        defaults={'vessel_name': 'سفينة ب', 'flag_state': 'السودان', 'company': company_b, 'status': 'EXPECTED'})
    return o


@pytest.fixture
def visit_a(vessel_a, sp_psc):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=sp_psc, defaults={'arrival_date': date.today(), 'status': 'EXPECTED'})
    return o


@pytest.fixture
def visit_b(vessel_b, sp_suakin):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_b, port=sp_suakin, defaults={'arrival_date': date.today(), 'status': 'EXPECTED'})
    return o


@pytest.fixture
def visit_a_archived_port(vessel_a, sp_archived):
    o, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=sp_archived, defaults={'arrival_date': date.today(), 'status': 'EXPECTED'})
    return o


# --- users -----------------------------------------------------------------

@pytest.fixture
def rep_a(company_a, company_role):
    u = User.objects.create_user(email='pa_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل أ')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def rep_b(company_b, company_role):
    u = User.objects.create_user(email='pa_b@nqp.gov.sd', password='StrongPass123!', full_name='ممثل ب')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY',
                                  scope_id=company_b.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_b, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_user(company_a, agent_role, ep_psc):
    """Agent for company A, authorised for Port Sudan only."""
    u = User.objects.create_user(email='pa_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل أ')
    RoleAssignment.objects.create(user=u, role=agent_role, scope_type='COMPANY',
                                  scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    agent = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل بورتسودان', status='ACTIVE', is_active=True)
    agent.ports.add(ep_psc)
    return u


@pytest.fixture
def port_officer(port_role, ep_psc):
    """Port health officer scoped to Port Sudan only — no company scope."""
    u = User.objects.create_user(email='pa_officer@nqp.gov.sd', password='StrongPass123!', full_name='ضابط')
    RoleAssignment.objects.create(user=u, role=port_role, scope_type='PORT',
                                  scope_id=ep_psc.id, is_active=True)
    return u


# ===========================================================================
# 1-4) Company isolation
# ===========================================================================

class TestCompanyIsolation:
    def test_1_company_a_cannot_create_for_company_b_vessel(self, api_client, rep_a, visit_b):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json')
        assert res.status_code in (400, 404)
        assert not PreArrivalNotification.objects.filter(vessel_visit=visit_b).exists()

    def test_1b_company_a_can_create_for_own_visit(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a.id)}, format='json')
        assert res.status_code == 201, res.content
        assert PreArrivalNotification.objects.filter(vessel_visit=visit_a).exists()

    def test_1c_company_a_list_excludes_company_b(self, api_client, rep_a, visit_a, visit_b):
        auth(api_client, rep_a)
        api_client.post('/api/v1/shipping/pre-arrivals/', {'vessel_visit': str(visit_a.id)}, format='json')
        res = api_client.get('/api/v1/shipping/pre-arrivals/')
        assert res.status_code == 200
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_a.id) in visits
        assert str(visit_b.id) not in visits

    def test_2_company_a_cannot_retrieve_company_b_notification(self, api_client, rep_a, rep_b, visit_b):
        auth(api_client, rep_b)
        created = api_client.post('/api/v1/shipping/pre-arrivals/',
                                  {'vessel_visit': str(visit_b.id)}, format='json')
        assert created.status_code == 201
        pid = created.json()['data']['id']

        auth(api_client, rep_a)
        assert api_client.get(f'/api/v1/shipping/pre-arrivals/{pid}/').status_code == 404

    def test_3_company_a_cannot_submit_company_b_notification(self, api_client, rep_a, rep_b, visit_b):
        auth(api_client, rep_b)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)},
                              format='json').json()['data']['id']
        auth(api_client, rep_a)
        assert api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/submit/').status_code == 404

    def test_4_company_a_cannot_accept_or_reject_company_b(self, api_client, rep_a, rep_b, visit_b, port_officer):
        auth(api_client, rep_b)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json').json()['data']['id']
        auth(api_client, port_officer)
        api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/submit/')
        api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/review/')

        auth(api_client, rep_a)
        assert api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/accept/').status_code == 404
        assert api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/reject/').status_code == 404

    def test_4b_company_rep_cannot_accept_own_notification(self, api_client, rep_a, visit_a):
        """Separation of duties: the filing company cannot decide its own filing.

        This holds even though the test role also holds ``port_health:edit`` —
        the rule is enforced in the service, not left to RBAC grants.
        """
        auth(api_client, rep_a)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a.id)}, format='json').json()['data']['id']
        api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/submit/')
        # 403: the filing company is not an independent reviewer.
        assert api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/review/').status_code == 403
        # Still SUBMITTED, so ACCEPTED is not even a reachable state -> 400.
        assert PreArrivalNotification.objects.get(id=pid).status == 'SUBMITTED'
        assert api_client.post(f'/api/v1/shipping/pre-arrivals/{pid}/accept/').status_code == 400


# ===========================================================================
# 5-7) Agent isolation
# ===========================================================================

class TestAgentIsolation:
    def test_5_agent_cannot_create_for_other_company(self, api_client, agent_user, visit_b):
        auth(api_client, agent_user)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json')
        assert res.status_code in (400, 404)
        assert not PreArrivalNotification.objects.filter(vessel_visit=visit_b).exists()

    def test_6_agent_cannot_create_for_unauthorized_port(self, api_client, agent_user, company_a, vessel_a, sp_suakin):
        """Agent is authorised for Port Sudan only; this visit is at Suakin."""
        visit_suk = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suakin, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, agent_user)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_suk.id)}, format='json')
        assert res.status_code in (400, 404)
        assert not PreArrivalNotification.objects.filter(vessel_visit=visit_suk).exists()

    def test_7_agent_can_create_for_own_company_and_authorized_port(self, api_client, agent_user, visit_a):
        auth(api_client, agent_user)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a.id)}, format='json')
        assert res.status_code == 201, res.content


# ===========================================================================
# 8-9) Port health geographic scoping preserved
# ===========================================================================

class TestPortHealthScoping:
    def test_8_officer_lists_notifications_for_assigned_entry_point(self, api_client, admin_user, port_officer, visit_a):
        auth(api_client, admin_user)
        api_client.post('/api/v1/shipping/pre-arrivals/', {'vessel_visit': str(visit_a.id)}, format='json')

        auth(api_client, port_officer)
        res = api_client.get('/api/v1/shipping/pre-arrivals/')
        assert res.status_code == 200
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_a.id) in visits

    def test_9_officer_cannot_access_notification_outside_entry_point(self, api_client, admin_user, port_officer, visit_b):
        auth(api_client, admin_user)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json').json()['data']['id']
        auth(api_client, port_officer)
        assert api_client.get(f'/api/v1/shipping/pre-arrivals/{pid}/').status_code == 404
        res = api_client.get('/api/v1/shipping/pre-arrivals/')
        assert res.json()['data']['results'] == []

    def test_9b_officer_has_no_company_scope(self, port_officer):
        from core.utils.scoping import resolve_combined_scope_ids
        info = resolve_combined_scope_ids(port_officer)
        assert info['has_port_scope'] is True
        assert info['has_company_scope'] is False


# ===========================================================================
# 10-15) Workflow
# ===========================================================================

class TestWorkflow:
    @pytest.fixture
    def draft(self, api_client, admin_user, visit_a):
        auth(api_client, admin_user)
        return api_client.post('/api/v1/shipping/pre-arrivals/',
                               {'vessel_visit': str(visit_a.id)}, format='json').json()['data']

    def test_10_draft_to_submitted(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        res = api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/submit/")
        assert res.status_code == 200, res.content
        assert res.json()['data']['status'] == 'SUBMITTED'
        assert res.json()['data']['submitted_at'] is not None

    def test_11_submitted_to_under_review(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/submit/")
        res = api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/review/")
        assert res.status_code == 200
        assert res.json()['data']['status'] == 'UNDER_REVIEW'
        assert res.json()['data']['reviewed_at'] is not None

    def test_12_under_review_to_accepted(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        for step in ('submit', 'review'):
            api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/{step}/")
        res = api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/accept/")
        assert res.status_code == 200
        assert res.json()['data']['status'] == 'ACCEPTED'

    def test_13_under_review_to_rejected(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        for step in ('submit', 'review'):
            api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/{step}/")
        res = api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/reject/",
                              {'notes': 'ناقص'}, format='json')
        assert res.status_code == 200
        assert res.json()['data']['status'] == 'REJECTED'
        assert res.json()['data']['review_notes'] == 'ناقص'

    def test_14_invalid_transitions_rejected(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        url = f"/api/v1/shipping/pre-arrivals/{draft['id']}"
        # Cannot review before submit, nor accept before review.
        assert api_client.post(f'{url}/review/').status_code == 400
        assert api_client.post(f'{url}/accept/').status_code == 400
        api_client.post(f'{url}/submit/')
        assert api_client.post(f'{url}/accept/').status_code == 400

    def test_14b_terminal_states_have_no_outgoing_transitions(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        url = f"/api/v1/shipping/pre-arrivals/{draft['id']}"
        for step in ('submit', 'review', 'accept'):
            api_client.post(f'{url}/{step}/')
        assert api_client.post(f'{url}/reject/').status_code == 400
        assert api_client.post(f'{url}/cancel/').status_code == 400

    def test_15_arbitrary_status_patch_rejected(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        res = api_client.patch(f"/api/v1/shipping/pre-arrivals/{draft['id']}/",
                               {'status': 'ACCEPTED'}, format='json')
        assert res.status_code == 403
        notification = PreArrivalNotification.objects.get(id=draft['id'])
        assert notification.status == 'DRAFT'

    def test_15b_cancel_from_draft(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        res = api_client.post(f"/api/v1/shipping/pre-arrivals/{draft['id']}/cancel/")
        assert res.status_code == 200
        assert res.json()['data']['status'] == 'CANCELLED'

    def test_workflow_writes_audit_rows(self, api_client, admin_user, draft):
        auth(api_client, admin_user)
        url = f"/api/v1/shipping/pre-arrivals/{draft['id']}"
        for step in ('submit', 'review', 'accept'):
            api_client.post(f'{url}/{step}/')
        details = list(
            ShippingAuditLog.objects
            .filter(object_type='PreArrivalNotification', object_id=draft['id'])
            .values_list('action', 'detail')
        )
        assert details, 'no audit rows were written'
        assert all(action == 'STATUS_CHANGE' for action, _ in details)
        transitions = {d['transition'] for _, d in details}
        assert {'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'} <= transitions


# ===========================================================================
# 16-20) Integrity
# ===========================================================================

class TestIntegrity:
    def test_16_resolves_vessel_and_port_from_visit(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        data = api_client.post('/api/v1/shipping/pre-arrivals/',
                               {'vessel_visit': str(visit_a.id)}, format='json').json()['data']
        assert data['vessel_name'] == visit_a.vessel.vessel_name
        assert data['vessel_imo'] == visit_a.vessel.imo_number
        assert data['port_code'] == visit_a.port.code
        assert data['arrival_date'] == visit_a.arrival_date.isoformat()

    def test_17_client_cannot_override_port(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a.id), 'port_code': 'HIJACK',
                               'entry_point_id': str(visit_a.port.entry_point_id)},
                              format='json')
        assert res.status_code == 201
        assert res.json()['data']['port_code'] == visit_a.port.code

    def test_18_client_cannot_override_company(self, api_client, rep_a, visit_a, company_b):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a.id),
                               'company_id': str(company_b.id)}, format='json')
        assert res.status_code == 201
        assert res.json()['data']['company_id'] == str(visit_a.vessel.company_id)

    def test_19_duplicate_active_notification_enforced(self, api_client, admin_user, visit_a):
        """OneToOne on vessel_visit: a second filing is rejected."""
        auth(api_client, admin_user)
        assert api_client.post('/api/v1/shipping/pre-arrivals/',
                               {'vessel_visit': str(visit_a.id)}, format='json').status_code == 201
        second = api_client.post('/api/v1/shipping/pre-arrivals/',
                                 {'vessel_visit': str(visit_a.id)}, format='json')
        assert second.status_code == 400
        assert PreArrivalNotification.objects.filter(vessel_visit=visit_a).count() == 1

    def test_20_inactive_port_cannot_be_used(self, api_client, rep_a, visit_a_archived_port):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_a_archived_port.id)}, format='json')
        assert res.status_code == 403
        assert not PreArrivalNotification.objects.filter(vessel_visit=visit_a_archived_port).exists()

    def test_20b_archived_port_rows_hidden_from_listing(self, api_client, rep_a, visit_a, visit_a_archived_port):
        """A notification whose port was archived is not offered to a company user."""
        # force-create one against the archived port to prove the queryset hides it
        PreArrivalNotification.objects.create(vessel_visit=visit_a_archived_port)

        auth(api_client, rep_a)
        res = api_client.get('/api/v1/shipping/pre-arrivals/')
        assert res.status_code == 200
        visits = {r['vessel_visit'] for r in res.json()['data']['results']}
        assert str(visit_a_archived_port.id) not in visits


# ===========================================================================
# 21-22) Security: direct object-ID access
# ===========================================================================

class TestDirectObjectIdSecurity:
    def test_21_cross_company_direct_id_returns_404(self, api_client, rep_a, rep_b, visit_b):
        """The headline guarantee, proven at API level."""
        auth(api_client, rep_b)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json').json()['data']['id']
        assert api_client.get(f'/api/v1/shipping/pre-arrivals/{pid}/').status_code == 200

        auth(api_client, rep_a)
        assert api_client.get(f'/api/v1/shipping/pre-arrivals/{pid}/').status_code == 404

    def test_22_cross_agent_port_direct_id_returns_404(self, api_client, admin_user, agent_user, company_a, vessel_a, sp_suakin):
        """Notification exists at Suakin; agent is authorised for Port Sudan only."""
        visit_suk = VesselVisit.objects.create(
            vessel=vessel_a, port=sp_suakin, arrival_date=date.today(), status='EXPECTED')
        auth(api_client, admin_user)
        pid = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_suk.id)}, format='json').json()['data']['id']

        auth(api_client, agent_user)
        assert api_client.get(f'/api/v1/shipping/pre-arrivals/{pid}/').status_code == 404

    def test_22b_cross_company_create_by_visit_id_returns_404(self, api_client, rep_a, visit_b):
        auth(api_client, rep_a)
        res = api_client.post('/api/v1/shipping/pre-arrivals/',
                              {'vessel_visit': str(visit_b.id)}, format='json')
        assert res.status_code == 404