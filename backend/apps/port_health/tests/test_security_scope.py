"""Port Health cross-scope write hardening tests — Phase 1D-2.

Invariants proven here
----------------------
A. **Create scope** — a Port Health user may only create a record whose
   client-supplied parents all resolve to an ``EntryPoint`` inside their own
   scope. Unresolvable parents DENY; they are never treated as "global".
B. **Parent consistency** — parents that disagree with each other are a 400
   and nothing is written.
C. **Safety-record protection** — ``IsolationRecord`` and ``PortEmergency``
   (the two models that block clearance/departure) cannot be injected into
   another port's workflow.
D. **Object-level scope** — PATCH/DELETE now work for a *scoped* officer
   (previously denied for every vessel-linked model) while remaining denied
   across ports.
E. **Audit** — lifecycle writes produce ``ShippingAuditLog`` rows whose
   ``company`` comes from the audited vessel, never from the actor.
"""
import ast
import inspect
import textwrap
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import (
    CargoInspection,
    CrewMember,
    FoodWaterInspection,
    HealthCertificate,
    HealthDeclaration,
    IsolationRecord,
    Passenger,
    PortEmergency,
    SanitationCertificate,
    SeaPort,
    ShipInspection,
    Vessel,
    VesselVisit,
    WasteInspection,
)
from apps.shipping.models import ShippingAuditLog

pytestmark = pytest.mark.django_db

User = get_user_model()

PH = '/api/v1/port-health/'

PERMS = [
    'port_health:view', 'port_health:add', 'port_health:edit', 'port_health:delete',
    'ports:view', 'vessels:view', 'vessels:add', 'vessels:edit',
    'vessel_visits:view', 'vessel_visits:add', 'vessel_visits:edit',
    'health_declarations:view', 'health_declarations:add', 'health_declarations:edit',
    'ship_inspections:view', 'ship_inspections:add', 'ship_inspections:edit',
    'sanitation_certificates:view', 'sanitation_certificates:add', 'sanitation_certificates:edit',
    'certificates:view', 'certificates:add', 'certificates:edit',
    'cargo_inspections:view', 'cargo_inspections:add', 'cargo_inspections:edit',
    'waste_inspections:view', 'waste_inspections:add', 'waste_inspections:edit',
    'food_water_inspections:view', 'food_water_inspections:add', 'food_water_inspections:edit',
    'isolation_records:view', 'isolation_records:add', 'isolation_records:edit',
    'emergencies:view', 'emergencies:add', 'emergencies:edit',
    'crew:view', 'crew:add', 'crew:edit',
    'passengers:view', 'passengers:add', 'passengers:edit',
    'pre_arrivals:view', 'clearance_decisions:view', 'clearance_decisions:add',
    'shipping_audit_logs:view',
]


# --- infra ------------------------------------------------------------------

def _count_blockers(src):
    """Count ``ok = False`` assignments in a function body (AST, not substring)."""
    tree = ast.parse(textwrap.dedent(src))
    return sum(
        1 for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and any(getattr(t, 'id', None) == 'ok' for t in node.targets)
        and isinstance(node.value, ast.Constant) and node.value.value is False
    )


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


def auth(client, user):
    login = client.post('/api/v1/auth/login/',
                        {'email': user.email, 'password': 'StrongPass123!'}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")


# --- master data ------------------------------------------------------------

@pytest.fixture
def org_sector():
    o, _ = OrgSector.objects.get_or_create(code='D2_ORG', defaults={'name_ar': 'قطاع'})
    return o


@pytest.fixture
def md_sector():
    o, _ = Sector.objects.get_or_create(code='D2_SEA', defaults={'name_ar': 'بحري'})
    return o


@pytest.fixture
def state(md_sector):
    o, _ = State.objects.get_or_create(code='D2_ST', defaults={'name_ar': 'ولاية', 'sector': md_sector})
    return o


@pytest.fixture
def ep_a(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_D2_A', defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                                  'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def ep_b(state, org_sector):
    o, _ = EntryPoint.objects.get_or_create(
        code='EP_D2_B', defaults={'name_ar': 'سواكن', 'kind': 'SEAPORT',
                                  'state': state, 'sector': org_sector, 'is_active': True})
    return o


@pytest.fixture
def port_a(ep_a):
    o, _ = SeaPort.objects.get_or_create(
        code='D2_SP_A', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_a, 'is_active': True})
    return o


@pytest.fixture
def port_b(ep_b):
    o, _ = SeaPort.objects.get_or_create(
        code='D2_SP_B', defaults={'name_ar': 'سواكن', 'entry_point': ep_b, 'is_active': True})
    return o


@pytest.fixture
def company_a():
    o, _ = Carrier.objects.get_or_create(
        name='شركة د2', defaults={'name_en': 'Co D2', 'company_type': 'MARITIME'})
    return o


@pytest.fixture
def company_b():
    o, _ = Carrier.objects.get_or_create(
        name='شركة د2 ب', defaults={'name_en': 'Co D2 B', 'company_type': 'MARITIME'})
    return o


# Vessels only have geographic meaning through their port calls, so each one is
# bound to exactly one port by a VesselVisit (the canonical Port Call).
@pytest.fixture
def vessel_a(company_a, port_a):
    v = Vessel.objects.create(vessel_name='سفينة أ', imo_number='IMO-D2-A', company=company_a)
    VesselVisit.objects.create(vessel=v, port=port_a, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def vessel_b(company_b, port_b):
    v = Vessel.objects.create(vessel_name='سفينة ب', imo_number='IMO-D2-B', company=company_b)
    VesselVisit.objects.create(vessel=v, port=port_b, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def visit_a(vessel_a, port_a):
    return vessel_a.visits.first()


@pytest.fixture
def visit_b(vessel_b, port_b):
    return vessel_b.visits.first()


@pytest.fixture
def vessel_a2(company_a, port_a):
    """A *second* vessel at Port A, so same-scope parent mismatches can be tested."""
    v = Vessel.objects.create(vessel_name='سفينة أ2', imo_number='IMO-D2-A2', company=company_a)
    VesselVisit.objects.create(vessel=v, port=port_a, arrival_date=date.today(), status='ARRIVED')
    return v


@pytest.fixture
def visit_a2(vessel_a2, port_a):
    return vessel_a2.visits.first()


# --- users ------------------------------------------------------------------

@pytest.fixture
def officer_a(ep_a):
    role, _ = Role.objects.get_or_create(
        code='D2_OFFICER', defaults={'name': 'PH Officer', 'name_ar': 'ضابط', 'default_scope': 'PORT'})
    role.permissions.set(_perms(PERMS))
    u = User.objects.create_user(email='d2_a@nqp.gov.sd', password='StrongPass123!', full_name='ضابط أ')
    RoleAssignment.objects.create(user=u, role=role, scope_type='PORT',
                                  scope_id=ep_a.id, is_active=True)
    return u


@pytest.fixture
def super_user():
    return User.objects.create_superuser(email='d2_root@nqp.gov.sd', password='StrongPass123!', full_name='root')


# ===========================================================================
# A) Create scope — cross-port injection blocked
# ===========================================================================

class TestCreateScope:
    def test_a1_isolation_same_port_allowed(self, api_client, officer_a, vessel_a):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_a.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201, res.content
        assert IsolationRecord.objects.filter(vessel=vessel_a).exists()

    def test_a2_isolation_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_b.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content
        assert not IsolationRecord.objects.filter(vessel=vessel_b).exists()

    def test_a3_emergency_cross_port_denied(self, api_client, officer_a, port_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}emergencies/', {
            'port': str(port_b.id), 'title': 'طارئ', 'severity': 'HIGH',
            'vessel_restricted': True,
        }, format='json')
        assert res.status_code == 403, res.content
        assert not PortEmergency.objects.filter(port=port_b).exists()

    def test_a4_emergency_own_port_allowed(self, api_client, officer_a, port_a):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}emergencies/', {
            'port': str(port_a.id), 'title': 'طارئ', 'severity': 'HIGH',
        }, format='json')
        assert res.status_code == 201, res.content

    def test_a5_emergency_own_port_foreign_vessel_denied(self, api_client, officer_a, port_a, vessel_b):
        """Port A + a vessel that never calls Port A."""
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}emergencies/', {
            'port': str(port_a.id), 'vessel': str(vessel_b.id), 'title': 'طارئ',
            'vessel_restricted': True,
        }, format='json')
        assert res.status_code == 403, res.content
        assert not PortEmergency.objects.filter(vessel=vessel_b).exists()

    def test_a6_emergency_own_port_own_vessel_allowed(self, api_client, officer_a, port_a, vessel_a):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}emergencies/', {
            'port': str(port_a.id), 'vessel': str(vessel_a.id), 'title': 'طارئ',
            'vessel_restricted': True,
        }, format='json')
        assert res.status_code == 201, res.content

    def test_a7_declaration_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}declarations/', {
            'vessel': str(vessel_b.id), 'captain_name': 'ربان',
            'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content
        assert not HealthDeclaration.objects.filter(vessel=vessel_b).exists()

    def test_a8_declaration_cross_port_visit_denied(self, api_client, officer_a, visit_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}declarations/', {
            'vessel': str(visit_b.vessel_id), 'visit': str(visit_b.id), 'captain_name': 'ربان',
            'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content

    def test_a9_inspection_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}ship-inspections/', {
            'vessel': str(vessel_b.id), 'findings': 'x',
        }, format='json')
        assert res.status_code == 403, res.content
        assert not ShipInspection.objects.filter(vessel=vessel_b).exists()

    def test_a10_sanitation_cert_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}sanitation-certificates/', {
            'certificate_number': 'SSCC-D2-X', 'certificate_type': 'SSCC',
            'vessel': str(vessel_b.id), 'issue_date': date.today().isoformat(),
            'expiry_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content
        assert not SanitationCertificate.objects.filter(certificate_number='SSCC-D2-X').exists()

    def test_a11_health_cert_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}certificates/', {
            'certificate_number': 'HC-D2-X', 'certificate_type': 'SHIP_HEALTH',
            'vessel': str(vessel_b.id), 'issue_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content
        assert not HealthCertificate.objects.filter(certificate_number='HC-D2-X').exists()

    def test_a12_cargo_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}cargo-inspections/', {
            'vessel': str(vessel_b.id), 'cargo_type': 'FOOD',
        }, format='json')
        assert res.status_code == 403, res.content
        assert not CargoInspection.objects.filter(vessel=vessel_b).exists()

    def test_a13_waste_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}waste-inspections/', {'vessel': str(vessel_b.id)}, format='json')
        assert res.status_code == 403, res.content
        assert not WasteInspection.objects.filter(vessel=vessel_b).exists()

    def test_a14_food_water_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}food-water-inspections/', {'vessel': str(vessel_b.id)}, format='json')
        assert res.status_code == 403, res.content
        assert not FoodWaterInspection.objects.filter(vessel=vessel_b).exists()

    def test_a15_crew_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}crew/', {
            'vessel': str(vessel_b.id), 'full_name': 'عضو', 'nationality': 'SDN',
        }, format='json')
        assert res.status_code == 403, res.content
        assert not CrewMember.objects.filter(vessel=vessel_b).exists()

    def test_a16_passenger_cross_port_denied(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}passengers/', {
            'vessel': str(vessel_b.id), 'full_name': 'راكب', 'nationality': 'SDN',
        }, format='json')
        assert res.status_code == 403, res.content
        assert not Passenger.objects.filter(vessel=vessel_b).exists()

    def test_a17_same_port_creates_allowed_for_all_domains(self, api_client, officer_a, vessel_a, visit_a):
        auth(api_client, officer_a)
        payloads = [
            (f'{PH}declarations/', {'vessel': str(vessel_a.id), 'captain_name': 'ربان',
                                    'declaration_date': date.today().isoformat()}),
            (f'{PH}ship-inspections/', {'vessel': str(vessel_a.id), 'visit': str(visit_a.id)}),
            (f'{PH}sanitation-certificates/', {'certificate_number': 'SSCC-D2-OK',
                                               'certificate_type': 'SSCC', 'vessel': str(vessel_a.id),
                                               'issue_date': date.today().isoformat(),
                                               'expiry_date': date.today().isoformat()}),
            (f'{PH}certificates/', {'certificate_number': 'HC-D2-OK',
                                    'certificate_type': 'SHIP_HEALTH',
                                    'vessel': str(vessel_a.id),
                                    'issue_date': date.today().isoformat()}),
            (f'{PH}cargo-inspections/', {'vessel': str(vessel_a.id), 'cargo_type': 'FOOD'}),
            (f'{PH}waste-inspections/', {'vessel': str(vessel_a.id)}),
            (f'{PH}food-water-inspections/', {'vessel': str(vessel_a.id)}),
            (f'{PH}crew/', {'vessel': str(vessel_a.id), 'full_name': 'عضو', 'nationality': 'SDN'}),
            (f'{PH}passengers/', {'vessel': str(vessel_a.id), 'full_name': 'راكب', 'nationality': 'SDN'}),
        ]
        for url, body in payloads:
            res = api_client.post(url, body, format='json')
            assert res.status_code == 201, (url, res.content)

    def test_a18_unresolvable_vessel_denied(self, api_client, officer_a, company_a):
        """A vessel with no port call has no geographic evidence -> DENY."""
        orphan = Vessel.objects.create(vessel_name='بلا زيارة', imo_number='IMO-D2-ORPHAN',
                                       company=company_a)
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(orphan.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content
        assert not IsolationRecord.objects.filter(vessel=orphan).exists()

    def test_a19_superuser_unaffected(self, api_client, super_user, vessel_b, port_b):
        auth(api_client, super_user)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_b.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201, res.content


# ===========================================================================
# B) Parent consistency
# ===========================================================================

class TestParentConsistency:
    def test_b1_declaration_vessel_visit_mismatch(self, api_client, officer_a, vessel_a, visit_a2):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}declarations/', {
            'vessel': str(vessel_a.id), 'visit': str(visit_a2.id), 'captain_name': 'ربان',
            'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 400, res.content
        assert not HealthDeclaration.objects.filter(vessel=vessel_a).exists()

    def test_b2_inspection_vessel_visit_mismatch(self, api_client, officer_a, vessel_a, visit_a2):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}ship-inspections/', {
            'vessel': str(vessel_a.id), 'visit': str(visit_a2.id),
        }, format='json')
        assert res.status_code == 400, res.content
        assert not ShipInspection.objects.filter(vessel=vessel_a).exists()

    def test_b3_sanitation_cert_vessel_inspection_mismatch(self, api_client, officer_a, vessel_a, vessel_a2):
        theirs = ShipInspection.objects.create(vessel=vessel_a2, inspector=officer_a)
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}sanitation-certificates/', {
            'certificate_number': 'SSCC-D2-M', 'certificate_type': 'SSCC',
            'vessel': str(vessel_a.id), 'inspection': str(theirs.id),
            'issue_date': date.today().isoformat(),
            'expiry_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 400, res.content
        assert not SanitationCertificate.objects.filter(certificate_number='SSCC-D2-M').exists()

    def test_b4_health_cert_vessel_inspection_mismatch(self, api_client, officer_a, vessel_a, vessel_a2):
        theirs = ShipInspection.objects.create(vessel=vessel_a2, inspector=officer_a)
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}certificates/', {
            'certificate_number': 'HC-D2-M', 'certificate_type': 'SHIP_HEALTH',
            'vessel': str(vessel_a.id), 'inspection': str(theirs.id),
            'issue_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 400, res.content
        assert not HealthCertificate.objects.filter(certificate_number='HC-D2-M').exists()

    def test_b5_emergency_port_vessel_mismatch(self, api_client, super_user, port_a, vessel_b):
        """Port A paired with a vessel that never calls Port A.

        A superuser is used so the *consistency* rule is what rejects the
        payload: a scoped officer would be stopped earlier by the scope check.
        """
        auth(api_client, super_user)
        res = api_client.post(f'{PH}emergencies/', {
            'port': str(port_a.id), 'vessel': str(vessel_b.id), 'title': 'طارئ',
        }, format='json')
        assert res.status_code == 400, res.content
        assert not PortEmergency.objects.filter(vessel=vessel_b).exists()

    def test_b6_cross_port_parents_denied_before_consistency(self, api_client, officer_a, vessel_a, visit_b):
        """Scope is evaluated first: a cross-port parent is 403, not 400."""
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}declarations/', {
            'vessel': str(vessel_a.id), 'visit': str(visit_b.id), 'captain_name': 'ربان',
            'declaration_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 403, res.content


# ===========================================================================
# C+D) Object-level scope: scoped officer allowed, cross-port denied
# ===========================================================================

class TestObjectLevelScope:
    def test_c1_isolation_same_port_full_lifecycle(self, api_client, officer_a, vessel_a):
        rec = IsolationRecord.objects.create(
            vessel=vessel_a, person_name='حالة', person_type='CREW',
            start_date=date.today(), status='ACTIVE')
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}isolation-records/{rec.id}/').status_code == 200
        # G2 fix: a *scoped* officer can now close an isolation record.
        res = api_client.patch(f'{PH}isolation-records/{rec.id}/', {'status': 'RELEASED'}, format='json')
        assert res.status_code == 200, res.content
        rec.refresh_from_db()
        assert rec.status == 'RELEASED'
        assert api_client.delete(f'{PH}isolation-records/{rec.id}/').status_code == 204

    def test_c2_isolation_cross_port_all_denied(self, api_client, officer_a, vessel_b):
        rec = IsolationRecord.objects.create(
            vessel=vessel_b, person_name='حالة', person_type='CREW',
            start_date=date.today(), status='ACTIVE')
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}isolation-records/{rec.id}/').status_code == 404
        assert api_client.patch(f'{PH}isolation-records/{rec.id}/', {'status': 'RELEASED'}, format='json').status_code == 404
        assert api_client.delete(f'{PH}isolation-records/{rec.id}/').status_code == 404
        rec.refresh_from_db()
        assert rec.status == 'ACTIVE'

    def test_c3_emergency_cross_port_denied(self, api_client, officer_a, port_b):
        em = PortEmergency.objects.create(port=port_b, title='طارئ', status='OPEN')
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}emergencies/{em.id}/').status_code == 404
        assert api_client.patch(f'{PH}emergencies/{em.id}/', {'status': 'CLOSED'}, format='json').status_code == 404
        em.refresh_from_db()
        assert em.status == 'OPEN'

    def test_c4_emergency_same_port_closeable(self, api_client, officer_a, port_a):
        em = PortEmergency.objects.create(port=port_a, title='طارئ', status='OPEN')
        auth(api_client, officer_a)
        res = api_client.patch(f'{PH}emergencies/{em.id}/', {'status': 'CLOSED'}, format='json')
        assert res.status_code == 200, res.content
        em.refresh_from_db()
        assert em.status == 'CLOSED'

    def test_c5_declaration_cross_port_denied(self, api_client, officer_a, vessel_b):
        d = HealthDeclaration.objects.create(
            vessel=vessel_b, captain_name='ربان', declaration_date=date.today())
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}declarations/{d.id}/').status_code == 404
        assert api_client.patch(f'{PH}declarations/{d.id}/', {'captain_name': 'x'}, format='json').status_code == 404

    def test_c6_declaration_same_port_update_allowed(self, api_client, officer_a, vessel_a, visit_a):
        d = HealthDeclaration.objects.create(
            vessel=vessel_a, visit=visit_a, captain_name='ربان', declaration_date=date.today())
        auth(api_client, officer_a)
        res = api_client.patch(f'{PH}declarations/{d.id}/', {'notes': 'ملاحظة'}, format='json')
        assert res.status_code == 200, res.content

    def test_c7_inspection_cross_port_denied(self, api_client, officer_a, vessel_b, visit_b):
        ins = ShipInspection.objects.create(vessel=vessel_b, visit=visit_b, inspector=officer_a)
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}ship-inspections/{ins.id}/').status_code == 404
        assert api_client.patch(f'{PH}ship-inspections/{ins.id}/', {'findings': 'x'}, format='json').status_code == 404

    def test_c8_certificate_cross_port_denied(self, api_client, officer_a, vessel_b):
        cert = SanitationCertificate.objects.create(
            certificate_number='SSCC-D2-RO', certificate_type='SSCC', vessel=vessel_b,
            issue_date=date.today(), expiry_date=date.today())
        auth(api_client, officer_a)
        assert api_client.get(f'{PH}sanitation-certificates/{cert.id}/').status_code == 404

    def test_c9_vessel_list_still_port_scoped(self, api_client, officer_a, vessel_a, vessel_b):
        auth(api_client, officer_a)
        res = api_client.get(f'{PH}vessels/')
        assert res.status_code == 200
        ids = [r['id'] for r in res.json()['data']['results']]
        assert str(vessel_a.id) in ids
        assert str(vessel_b.id) not in ids


# ===========================================================================
# E) Audit attribution
# ===========================================================================

class TestAudit:
    def test_e1_create_writes_audit_with_audited_objects_company(self, api_client, officer_a, vessel_a):
        auth(api_client, officer_a)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_a.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201
        row = ShippingAuditLog.objects.filter(object_type='IsolationRecord').latest('created_at')
        assert row.user_id == officer_a.id
        # company comes from the audited vessel, NOT from the actor's membership
        assert str(row.company_id) == str(vessel_a.company_id)
        assert row.action == ShippingAuditLog.Action.CREATE

    def test_e2_officer_acting_on_other_company_vessel_attributes_to_that_company(
        self, api_client, super_user, vessel_b,
    ):
        """actor = superuser, company = the vessel's company (never the actor's)."""
        auth(api_client, super_user)
        res = api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_b.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert res.status_code == 201
        row = ShippingAuditLog.objects.filter(object_type='IsolationRecord').latest('created_at')
        assert str(row.company_id) == str(vessel_b.company_id)

    def test_e3_update_and_delete_write_audit(self, api_client, officer_a, vessel_a):
        rec = IsolationRecord.objects.create(
            vessel=vessel_a, person_name='حالة', person_type='CREW', start_date=date.today())
        auth(api_client, officer_a)
        api_client.patch(f'{PH}isolation-records/{rec.id}/', {'notes': 'n'}, format='json')
        assert ShippingAuditLog.objects.filter(
            object_type='IsolationRecord', action=ShippingAuditLog.Action.UPDATE).exists()
        api_client.delete(f'{PH}isolation-records/{rec.id}/')
        assert ShippingAuditLog.objects.filter(
            object_type='IsolationRecord', action=ShippingAuditLog.Action.DELETE).exists()

    def test_e4_denied_create_writes_no_audit(self, api_client, officer_a, vessel_b):
        auth(api_client, officer_a)
        api_client.post(f'{PH}isolation-records/', {
            'vessel': str(vessel_b.id), 'person_name': 'حالة', 'person_type': 'CREW',
            'start_date': date.today().isoformat(),
        }, format='json')
        assert not ShippingAuditLog.objects.filter(
            object_type='IsolationRecord', object_id=str(
                IsolationRecord.objects.values_list('id', flat=True).first() or ''
            )).exists()
        assert not ShippingAuditLog.objects.filter(
            object_type='IsolationRecord', detail__vessel=vessel_b.imo_number).exists()


# ===========================================================================
# F) Clearance / departure policy must be untouched
# ===========================================================================

class TestNoPolicyRegression:
    def test_f1_clearance_blocker_set_unchanged(self):
        """The *number of blocking conditions* is the policy. Contextual notes
        (pre-arrival / declaration / inspection) are read but must never flip
        ``ok``; safety blocks must still flip it."""
        import inspect

        from apps.shipping import services

        clearance_src = inspect.getsource(services.clearance_preconditions)
        departure_src = inspect.getsource(services.departure_preconditions)

        # The *number of blocking conditions* is the policy, so it is counted
        # from the AST rather than by substring.
        #
        #   clearance : port, departed, isolation, emergency, declaration, inspection
        #   departure : port, no clearance, refused, conditional, isolation, emergency
        #
        # Phase 1D-5 (PD-1) did NOT move either number: it widened the existing
        # emergency blocker instead of adding a condition.
        # Phase 1D-6B added exactly two clearance gates (REJECTED declaration,
        # FAILED/CONDITIONAL inspection) and deliberately NONE to departure:
        # departure stays transitively dependent on a current CLEARED decision,
        # so the health policy keeps a single source.
        assert _count_blockers(clearance_src) == 6
        assert _count_blockers(departure_src) == 6
        for src in (clearance_src, departure_src):
            assert 'IsolationRecord' in src
            # PD-1: both sites must delegate to the single shared predicate so
            # clearance and departure can never drift apart.
            assert 'blocking_port_emergency_exists(visit)' in src
            assert src.count('blocking_port_emergency_exists(visit)') == 1

    def test_f1c_health_gates_are_clearance_only(self):
        """No duplicate health predicate may appear in departure (§22)."""
        import inspect

        from apps.shipping import services

        clearance_src = inspect.getsource(services.clearance_preconditions)
        departure_src = inspect.getsource(services.departure_preconditions)
        assert 'HealthDeclaration' in clearance_src
        assert 'ShipInspection' in clearance_src
        for token in ('HealthDeclaration', 'ShipInspection'):
            assert token not in departure_src, \
                'departure must not duplicate the health gate (single policy source)'
        # PD-1 must remain the one emergency source in both.
        assert 'blocking_port_emergency_exists(visit)' in departure_src

    def test_f1b_port_emergency_predicate_is_form_a(self):
        """PD-1 Form A, asserted structurally (via AST) so it cannot regress.

        Clause 1 (vessel-specific): pins ``visit.vessel``, OPEN,
        ``vessel_restricted`` — and deliberately **not** ``port``.
        Clause 2 (port-wide): ``vessel__isnull``, ``port=visit.port``, OPEN.
        The two clauses must be OR-ed.
        """
        from apps.shipping import services

        tree = ast.parse(textwrap.dedent(inspect.getsource(services.blocking_port_emergency_exists)))
        filt = next(
            n for n in ast.walk(tree)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'filter'
        )
        clause = filt.args[0]
        # Django composes Q objects with the bitwise `|` operator, so the two
        # clauses appear as a BinOp/BitOr rather than a BoolOp/Or.
        assert isinstance(clause, ast.BinOp) and isinstance(clause.op, ast.BitOr), (
            'the two emergency clauses must be OR-ed (Django Q `|`), not AND-ed')
        assert len([v for v in (clause.left, clause.right)]) == 2, 'exactly two clauses are expected'

        def kwargs(node):
            return {kw.arg: ast.unparse(kw.value) for kw in node.keywords}

        vessel_clause, port_clause = (kwargs(v) for v in (clause.left, clause.right))

        # clause 1 - vessel-centric; must NOT be constrained by port (Form A)
        assert vessel_clause['vessel'] == 'visit.vessel'
        assert vessel_clause['vessel_restricted'] == 'True'
        assert vessel_clause['status'].endswith('EmergencyStatus.OPEN')
        assert 'port' not in vessel_clause, (
            'Form A: a vessel-specific emergency must NOT require emergency.port == visit.port')

        # clause 2 - port-wide; no vessel, this visit's port
        assert port_clause['vessel__isnull'] == 'True'
        assert port_clause['port'] == 'visit.port'
        assert port_clause['status'].endswith('EmergencyStatus.OPEN')
        assert 'vessel_restricted' not in port_clause, (
            'a port-wide emergency is not gated on vessel_restricted')


    def test_f2_health_documents_remain_context_only(self):
        """They are read for the notes, and nothing else."""
        import inspect

        from apps.shipping import services

        for fn in (services.clearance_preconditions, services.departure_preconditions):
            src = inspect.getsource(fn)
            assert 'SanitationCertificate' not in src
            assert 'HealthCertificate' not in src
            assert 'CargoInspection' not in src
            assert 'WasteInspection' not in src
            assert 'FoodWaterInspection' not in src

    def test_f3_departure_still_requires_current_cleared_decision(self):
        import inspect

        from apps.shipping import services

        src = inspect.getsource(services.departure_preconditions)
        assert '_current_clearance' in src
        assert 'REFUSED' in src and 'CONDITIONAL' in src

    def test_f4_vessel_visit_lifecycle_fields_still_read_only(self, api_client, officer_a, visit_a):
        auth(api_client, officer_a)
        res = api_client.patch(f'{PH}visits/{visit_a.id}/', {'status': 'DEPARTED'}, format='json')
        assert res.status_code == 400
        visit_a.refresh_from_db()
        assert visit_a.status == 'ARRIVED'