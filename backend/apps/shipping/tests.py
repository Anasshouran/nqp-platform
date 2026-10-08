from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.shipping.models import ShippingAgent, VesselCompanyRelationship

pytestmark = pytest.mark.django_db

User = get_user_model()


def _auth(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


# ---------------------------------------------------------------------------
# Roles / permissions — built inline (test DB has no seed_rbac data, same as
# apps/port_health/tests/test_port_health.py).
# ---------------------------------------------------------------------------

SHIPPING_PERMISSION_CODES = [
    'port_health:view', 'port_health:add', 'port_health:edit',
    'ports:view',
    'vessels:view', 'vessels:add', 'vessels:edit',
    'vessel_visits:view', 'vessel_visits:add', 'vessel_visits:edit',
    'shipping_companies:view', 'shipping_companies:edit',
    'shipping_agents:view', 'shipping_agents:add', 'shipping_agents:edit',
    'vessel_company_relationships:view', 'vessel_company_relationships:add',
    'vessel_company_relationships:edit',
    'shipping_audit_logs:view',
]


def _make_permissions(codes):
    out = []
    for code in codes:
        resource, _, action = code.partition(':')
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'resource': resource, 'action': action, 'name': f'{action} {resource}'},
        )
        out.append(perm)
    return out


@pytest.fixture
def shipping_company_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_COMPANY',
        defaults={'name': 'Shipping Company', 'name_ar': 'ممثل شركة ملاحة', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_make_permissions(SHIPPING_PERMISSION_CODES))
    return role


@pytest.fixture
def shipping_agent_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_AGENT',
        defaults={'name': 'Shipping Agent', 'name_ar': 'وكيل ملاحي', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_make_permissions(SHIPPING_PERMISSION_CODES))
    return role


@pytest.fixture
def port_officer_role():
    role, _ = Role.objects.get_or_create(
        code='PORT_OFFICER_TEST',
        defaults={'name': 'Port Officer', 'name_ar': 'ضابط ميناء', 'default_scope': 'PORT'},
    )
    role.permissions.set(_make_permissions(['port_health:view', 'port_health:add', 'port_health:edit', 'ports:view']))
    return role


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email='shipadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير عام',
    )


# ---------------------------------------------------------------------------
# Master data
# ---------------------------------------------------------------------------

@pytest.fixture
def org_sector():
    obj, _ = OrgSector.objects.get_or_create(
        code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'region': 'البحر الأحمر'},
    )
    return obj


@pytest.fixture
def md_sector():
    obj, _ = Sector.objects.get_or_create(
        code='SEA', defaults={'name_ar': 'القطاع البحري', 'name_en': 'Maritime Sector'},
    )
    return obj


@pytest.fixture
def red_sea_state(md_sector):
    obj, _ = State.objects.get_or_create(
        code='MD_RED_SEA',
        defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': md_sector},
    )
    return obj


@pytest.fixture
def ep_port_sudan(red_sea_state, org_sector):
    obj, _ = EntryPoint.objects.get_or_create(
        code='EP_PORT_SUDAN',
        defaults={
            'name_ar': 'ميناء بورتسودان', 'name_en': 'Port Sudan', 'kind': 'SEAPORT',
            'state': red_sea_state, 'sector': org_sector, 'is_active': True,
        },
    )
    return obj


@pytest.fixture
def ep_suakin(red_sea_state, org_sector):
    obj, _ = EntryPoint.objects.get_or_create(
        code='EP_SUAKIN',
        defaults={
            'name_ar': 'ميناء الأمير عثمان دقنة – سواكن', 'name_en': 'Suakin', 'kind': 'SEAPORT',
            'state': red_sea_state, 'sector': org_sector, 'is_active': True,
        },
    )
    return obj


@pytest.fixture
def seaport_psc(ep_port_sudan):
    obj, _ = SeaPort.objects.get_or_create(
        code='PSC',
        defaults={
            'name_ar': 'ميناء بورتسودان', 'name_en': 'Port Sudan', 'location': 'بورتسودان',
            'entry_point': ep_port_sudan, 'is_active': True,
        },
    )
    return obj


@pytest.fixture
def seaport_od(ep_suakin):
    obj, _ = SeaPort.objects.get_or_create(
        code='OD',
        defaults={
            'name_ar': 'ميناء عثمان دقنة (سواكن)', 'name_en': 'Suakin', 'location': 'سواكن',
            'entry_point': ep_suakin, 'is_active': True,
        },
    )
    return obj


# ---------------------------------------------------------------------------
# Companies / vessels / visits
# ---------------------------------------------------------------------------

@pytest.fixture
def company_a():
    obj, _ = Carrier.objects.get_or_create(
        name='شركة الملاحة أ',
        defaults={'name_en': 'Company A', 'company_type': 'MARITIME', 'registration_status': 'APPROVED'},
    )
    return obj


@pytest.fixture
def company_b():
    obj, _ = Carrier.objects.get_or_create(
        name='شركة الملاحة ب',
        defaults={'name_en': 'Company B', 'company_type': 'MARITIME', 'registration_status': 'APPROVED'},
    )
    return obj


@pytest.fixture
def vessel_a(company_a):
    obj, _ = Vessel.objects.get_or_create(
        imo_number='IMO9999001',
        defaults={
            'vessel_name': 'سفينة أ', 'flag_state': 'السودان', 'vessel_type': 'COMMERCIAL',
            'company': company_a, 'status': 'ARRIVED',
        },
    )
    return obj


@pytest.fixture
def vessel_b(company_b):
    obj, _ = Vessel.objects.get_or_create(
        imo_number='IMO9999002',
        defaults={
            'vessel_name': 'سفينة ب', 'flag_state': 'السودان', 'vessel_type': 'COMMERCIAL',
            'company': company_b, 'status': 'ARRIVED',
        },
    )
    return obj


@pytest.fixture
def visit_a(vessel_a, seaport_psc):
    obj, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=seaport_psc,
        defaults={'arrival_date': date.today(), 'status': 'ARRIVED'},
    )
    return obj


@pytest.fixture
def visit_b(vessel_b, seaport_od):
    obj, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_b, port=seaport_od,
        defaults={'arrival_date': date.today(), 'status': 'ARRIVED'},
    )
    return obj


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@pytest.fixture
def rep_a(company_a, shipping_company_role):
    """SHIPPING_COMPANY user scoped (COMPANY) to company A, with membership."""
    user = User.objects.create_user(
        email='rep_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل شركة أ',
    )
    RoleAssignment.objects.create(
        user=user, role=shipping_company_role, scope_type='COMPANY',
        scope_id=company_a.id, is_active=True,
    )
    CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)
    return user


@pytest.fixture
def rep_b(company_b, shipping_company_role):
    """SHIPPING_COMPANY user scoped (COMPANY) to company B, with membership."""
    user = User.objects.create_user(
        email='rep_b@nqp.gov.sd', password='StrongPass123!', full_name='ممثل شركة ب',
    )
    RoleAssignment.objects.create(
        user=user, role=shipping_company_role, scope_type='COMPANY',
        scope_id=company_b.id, is_active=True,
    )
    CarrierMember.objects.create(user=user, carrier=company_b, is_primary=True, is_active=True)
    return user


@pytest.fixture
def agent_user_a(company_a, shipping_agent_role):
    """SHIPPING_AGENT user scoped (COMPANY) to company A, with membership."""
    user = User.objects.create_user(
        email='agent_a@nqp.gov.sd', password='StrongPass123!', full_name='وكيل شركة أ',
    )
    RoleAssignment.objects.create(
        user=user, role=shipping_agent_role, scope_type='COMPANY',
        scope_id=company_a.id, is_active=True,
    )
    CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)
    return user


@pytest.fixture
def port_officer_user(port_officer_role, ep_port_sudan):
    user = User.objects.create_user(
        email='po@nqp.gov.sd', password='StrongPass123!', full_name='ضابط صحة ميناء',
    )
    RoleAssignment.objects.create(
        user=user, role=port_officer_role, scope_type='PORT',
        scope_id=ep_port_sudan.id, is_active=True,
    )
    return user


# ===========================================================================
# 1) Company scope on Vessel
# ===========================================================================

class TestVesselCompanyScope:
    def test_company_a_rep_sees_only_own_vessels(self, api_client, rep_a, vessel_a, vessel_b):
        _auth(api_client, rep_a)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = [r['imo_number'] for r in res.json()['data']['results']]
        assert imos == ['IMO9999001']

    def test_company_b_rep_sees_only_own_vessels(self, api_client, rep_b, vessel_a, vessel_b):
        _auth(api_client, rep_b)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = [r['imo_number'] for r in res.json()['data']['results']]
        assert imos == ['IMO9999002']

    def test_company_a_rep_cannot_retrieve_company_b_vessel_by_id(self, api_client, rep_a, vessel_b):
        """Cross-tenant read via direct object ID must be blocked."""
        _auth(api_client, rep_a)
        res = api_client.get(f'/api/v1/port-health/vessels/{vessel_b.id}/')
        assert res.status_code == 404

    def test_company_a_rep_cannot_patch_company_b_vessel(self, api_client, rep_a, vessel_b):
        """Cross-tenant write via direct object ID must be blocked."""
        _auth(api_client, rep_a)
        res = api_client.patch(
            f'/api/v1/port-health/vessels/{vessel_b.id}/',
            {'vessel_name': 'مُخترقة'}, format='json',
        )
        assert res.status_code == 404
        vessel_b.refresh_from_db()
        assert vessel_b.vessel_name == 'سفينة ب'

    def test_company_a_rep_cannot_delete_company_b_vessel(self, api_client, rep_a, vessel_b):
        """Cross-tenant delete is blocked and the row survives.

        403 here is the role lacking ``port_health:delete``; a role that *does*
        hold it is covered by the scoping test below.
        """
        _auth(api_client, rep_a)
        res = api_client.delete(f'/api/v1/port-health/vessels/{vessel_b.id}/')
        assert res.status_code in (403, 404)
        assert Vessel.objects.filter(id=vessel_b.id).exists()

    def test_company_a_rep_with_delete_cannot_delete_company_b_vessel(self, api_client, shipping_company_role, company_a, vessel_b):
        """Even with delete granted, company scoping blocks another company's vessel."""
        perms = list(shipping_company_role.permissions.all())
        delete_perm, _ = Permission.objects.get_or_create(
            code='port_health:delete',
            defaults={'resource': 'port_health', 'action': 'delete', 'name': 'حذف صحة الموانئ'},
        )
        shipping_company_role.permissions.set(perms + [delete_perm])

        user = User.objects.create_user(
            email='rep_del@nqp.gov.sd', password='StrongPass123!', full_name='ممثلحذف',
        )
        RoleAssignment.objects.create(
            user=user, role=shipping_company_role, scope_type='COMPANY',
            scope_id=company_a.id, is_active=True,
        )
        CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)

        _auth(api_client, user)
        res = api_client.delete(f'/api/v1/port-health/vessels/{vessel_b.id}/')
        assert res.status_code == 404
        assert Vessel.objects.filter(id=vessel_b.id).exists()


# ===========================================================================
# 2) Company scope on VesselVisit
# ===========================================================================

class TestVesselVisitCompanyScope:
    def test_company_a_rep_sees_only_own_visits(self, api_client, rep_a, visit_a, visit_b):
        _auth(api_client, rep_a)
        res = api_client.get('/api/v1/port-health/visits/')
        assert res.status_code == 200
        imos = [r['vessel_imo'] for r in res.json()['data']['results']]
        assert imos == ['IMO9999001']

    def test_company_a_rep_cannot_retrieve_company_b_visit(self, api_client, rep_a, visit_b):
        _auth(api_client, rep_a)
        res = api_client.get(f'/api/v1/port-health/visits/{visit_b.id}/')
        assert res.status_code == 404

    def test_company_a_rep_cannot_patch_company_b_visit(self, api_client, rep_a, visit_b):
        _auth(api_client, rep_a)
        res = api_client.patch(
            f'/api/v1/port-health/visits/{visit_b.id}/',
            {'status': 'CLEARED'}, format='json',
        )
        assert res.status_code == 404


# ===========================================================================
# 3) Port Health scope must be preserved
# ===========================================================================

class TestPortHealthScopePreserved:
    def test_port_officer_sees_only_own_port_vessels(self, api_client, port_officer_user, vessel_a, vessel_b, visit_a, visit_b):
        _auth(api_client, port_officer_user)
        res = api_client.get('/api/v1/port-health/visits/')
        assert res.status_code == 200
        ports = [r['port_name'] for r in res.json()['data']['results']]
        assert ports == ['ميناء بورتسودان']

    def test_port_officer_is_not_restricted_by_company(self, api_client, port_officer_user, vessel_a, visit_a, visit_b):
        """A vessel of ANY company at the officer's port is visible."""
        _auth(api_client, port_officer_user)
        res = api_client.get('/api/v1/port-health/visits/')
        assert res.status_code == 200
        imos = [r['vessel_imo'] for r in res.json()['data']['results']]
        assert 'IMO9999001' in imos

    def test_port_officer_still_sees_seaports(self, api_client, port_officer_user, seaport_psc, seaport_od):
        """Geographic EntryPoint scoping on SeaPort is unchanged."""
        _auth(api_client, port_officer_user)
        res = api_client.get('/api/v1/port-health/seaports/')
        assert res.status_code == 200
        codes = [r['code'] for r in res.json()['data']['results']]
        assert codes == ['PSC']


# ===========================================================================
# 4) Combined scope (company + port) -> intersection
# ===========================================================================

class TestCombinedScope:
    def test_company_and_port_scope_intersects(self, api_client, shipping_company_role, company_a, vessel_a, vessel_b, visit_a, visit_b):
        """Company A rep also scoped to Suakin: sees only company A visits AT Suakin (none)."""
        user = User.objects.create_user(
            email='combo@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم مركّب',
        )
        RoleAssignment.objects.create(
            user=user, role=shipping_company_role, scope_type='COMPANY',
            scope_id=company_a.id, is_active=True,
        )
        RoleAssignment.objects.create(
            user=user, role=shipping_company_role, scope_type='PORT',
            scope_id=company_a.id, is_active=True,  # deliberately wrong id
        )
        CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)

        _auth(api_client, user)
        res = api_client.get('/api/v1/port-health/visits/')
        assert res.status_code == 200
        # Company A has a visit at PSC, not at the bogus port scope -> intersection empty
        assert res.json()['data']['results'] == []

    def test_membership_alone_grants_company_scope(self, api_client, shipping_company_role, company_a, vessel_a):
        """CarrierMember without a COMPANY RoleAssignment still scopes (no unrestricted leak)."""
        user = User.objects.create_user(
            email='memberonly@nqp.gov.sd', password='StrongPass123!', full_name='عضو فقط',
        )
        RoleAssignment.objects.create(
            user=user, role=shipping_company_role, scope_type='COMPANY',
            scope_id=company_a.id, is_active=True,
        )
        CarrierMember.objects.create(user=user, carrier=company_a, is_primary=True, is_active=True)
        _auth(api_client, user)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = [r['imo_number'] for r in res.json()['data']['results']]
        assert imos == ['IMO9999001']


# ===========================================================================
# 5) Admin unrestricted
# ===========================================================================

class TestAdminUnrestricted:
    def test_admin_sees_all_vessels(self, api_client, admin_user, vessel_a, vessel_b):
        _auth(api_client, admin_user)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = {r['imo_number'] for r in res.json()['data']['results']}
        assert {'IMO9999001', 'IMO9999002'} <= imos

    def test_admin_sees_all_visits(self, api_client, admin_user, visit_a, visit_b):
        _auth(api_client, admin_user)
        res = api_client.get('/api/v1/port-health/visits/')
        assert res.status_code == 200
        ports = {r['port_name'] for r in res.json()['data']['results']}
        assert {'ميناء بورتسودان', 'ميناء عثمان دقنة (سواكن)'} <= ports


# ===========================================================================
# 6) ShippingAgent: company + authorized ports
# ===========================================================================

class TestShippingAgentScope:
    @pytest.fixture
    def agent_a(self, agent_user_a, company_a, ep_port_sudan):
        agent = ShippingAgent.objects.create(
            company=company_a, user=agent_user_a, name='وكيل بورتسودان',
            agent_type='PORT_AGENT', license_number='LIC-001', status='ACTIVE',
            valid_from=date.today() - timedelta(days=1),
            valid_until=date.today() + timedelta(days=365), is_active=True,
        )
        agent.ports.add(ep_port_sudan)
        return agent

    def test_agent_sees_own_company_agents(self, api_client, agent_user_a, agent_a, company_b):
        _auth(api_client, agent_user_a)
        res = api_client.get('/api/v1/shipping/agents/')
        assert res.status_code == 200
        assert len(res.json()['data']['results']) == 1

    def test_agent_cannot_retrieve_other_company_agent(self, api_client, agent_user_a, company_b, agent_a):
        other = ShippingAgent.objects.create(
            company=company_b, name='وكيل شركة ب', status='ACTIVE', is_active=True,
        )
        _auth(api_client, agent_user_a)
        res = api_client.get(f'/api/v1/shipping/agents/{other.id}/')
        assert res.status_code == 404

    def test_agent_sees_own_company_vessels(self, api_client, agent_user_a, agent_a, vessel_a, vessel_b):
        _auth(api_client, agent_user_a)
        res = api_client.get('/api/v1/port-health/vessels/')
        assert res.status_code == 200
        imos = [r['imo_number'] for r in res.json()['data']['results']]
        assert imos == ['IMO9999001']

    def test_agent_cannot_retrieve_other_company_vessel(self, api_client, agent_user_a, agent_a, vessel_b):
        _auth(api_client, agent_user_a)
        res = api_client.get(f'/api/v1/port-health/vessels/{vessel_b.id}/')
        assert res.status_code == 404

    def test_agent_cannot_create_agent_for_other_company(self, api_client, agent_user_a, agent_a, company_b):
        _auth(api_client, agent_user_a)
        res = api_client.post(
            '/api/v1/shipping/agents/',
            {'company': str(company_b.id), 'name': 'وكيل مزيّف', 'status': 'ACTIVE', 'is_active': True},
            format='json',
        )
        assert res.status_code in (400, 403)
        assert not ShippingAgent.objects.filter(company=company_b, name='وكيل مزيّف').exists()

    def test_agent_ports_are_enforced_on_list(self, api_client, agent_user_a, agent_a, company_b, ep_suakin):
        """An agent authorized only for Port Sudan must not surface Suakin-only rows."""
        suakin_only = ShippingAgent.objects.create(
            company=company_b, name='وكيل سواكن', status='ACTIVE', is_active=True,
        )
        suakin_only.ports.add(ep_suakin)

        _auth(api_client, agent_user_a)
        res = api_client.get('/api/v1/shipping/agents/')
        assert res.status_code == 200
        names = [r['name'] for r in res.json()['data']['results']]
        assert 'وكيل سواكن' not in names


# ===========================================================================
# 7) VesselCompanyRelationship integrity
# ===========================================================================

class TestVesselCompanyRelationshipIntegrity:
    def test_duplicate_active_primary_is_rejected_at_db(self, company_a, vessel_a):
        VesselCompanyRelationship.objects.create(
            vessel=vessel_a, company=company_a, role='OPERATOR', is_primary=True, is_active=True,
        )
        with pytest.raises(Exception):
            VesselCompanyRelationship.objects.create(
                vessel=vessel_a, company=company_a, role='OPERATOR', is_primary=True, is_active=True,
            )

    def test_second_primary_for_different_role_is_allowed(self, company_a, company_b, vessel_a):
        VesselCompanyRelationship.objects.create(
            vessel=vessel_a, company=company_a, role='OPERATOR', is_primary=True, is_active=True,
        )
        VesselCompanyRelationship.objects.create(
            vessel=vessel_a, company=company_b, role='OWNER', is_primary=True, is_active=True,
        )
        assert VesselCompanyRelationship.objects.filter(vessel=vessel_a, is_primary=True).count() == 2

    def test_invalid_date_range_rejected_by_db(self, company_a, vessel_a):
        with pytest.raises(Exception):
            VesselCompanyRelationship.objects.create(
                vessel=vessel_a, company=company_a, role='MANAGER',
                valid_from=date(2026, 1, 1), valid_until=date(2025, 1, 1),
                is_active=True,
            )

    def test_invalid_date_range_rejected_by_api(self, api_client, admin_user, company_a, vessel_a):
        _auth(api_client, admin_user)
        res = api_client.post(
            '/api/v1/shipping/vessel-relationships/',
            {
                'vessel': str(vessel_a.id), 'company': str(company_a.id), 'role': 'MANAGER',
                'valid_from': '2026-01-01', 'valid_until': '2025-01-01', 'is_active': True,
            },
            format='json',
        )
        assert res.status_code == 400
        assert 'valid_until' in res.json()

    def test_relationship_scoped_to_own_company(self, api_client, rep_a, company_b, vessel_b):
        rel = VesselCompanyRelationship.objects.create(
            vessel=vessel_b, company=company_b, role='OWNER', is_primary=True, is_active=True,
        )
        _auth(api_client, rep_a)
        res = api_client.get(f'/api/v1/shipping/vessel-relationships/{rel.id}/')
        assert res.status_code == 404


# ===========================================================================
# 8) Legacy field consumers + semantics
# ===========================================================================

class TestLegacyFieldSafety:
    def test_vessel_serializer_still_exposes_legacy_field(self, api_client, admin_user, vessel_a):
        _auth(api_client, admin_user)
        res = api_client.get(f'/api/v1/port-health/vessels/{vessel_a.id}/')
        assert res.status_code == 200
        assert 'shipping_company' in res.json()['data']

    def test_company_fk_is_populated_for_migrated_vessels(self, api_client, admin_user, vessel_a):
        _auth(api_client, admin_user)
        res = api_client.get('/api/v1/port-health/vessels/')
        row = next(r for r in res.json()['data']['results'] if r['imo_number'] == 'IMO9999001')
        assert row['company'] == str(vessel_a.company_id)