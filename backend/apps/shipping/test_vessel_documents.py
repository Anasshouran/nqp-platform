"""VesselDocument — API + permissions + scoping + file validation (PR-M1).

Covers: auth gate, valid multipart create, size/MIME rejection, cross-tenant
create and read isolation, agent and POE-health visibility, and delete.
"""
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.carriers.models import Carrier, CarrierMember
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as OrgSector
from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.shipping.models import ShippingAgent, VesselDocument
from apps.shipping.testing import auth, perms as _perms

pytestmark = pytest.mark.django_db

User = get_user_model()

DOCUMENT_URL = '/api/v1/shipping/documents/'

DOC_CODES = [
    'shipping_documents:view', 'shipping_documents:add', 'shipping_documents:delete',
    'port_health:view', 'ports:view', 'vessels:view', 'vessel_visits:view',
]


@pytest.fixture(autouse=True)
def _media_root(tmp_path, settings):
    """Keep uploaded test files out of the repository media/ directory."""
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def api_client():
    return APIClient()


def _pdf(name='manifest.pdf', content=b'%PDF-1.4 test'):
    return SimpleUploadedFile(name, content, content_type='application/pdf')


# --- roles -----------------------------------------------------------------

@pytest.fixture
def company_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_COMPANY',
        defaults={'name': 'Shipping Company', 'name_ar': 'ممثل شركة ملاحة', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_perms(DOC_CODES))
    return role


@pytest.fixture
def agent_role():
    role, _ = Role.objects.get_or_create(
        code='SHIPPING_AGENT',
        defaults={'name': 'Shipping Agent', 'name_ar': 'وكيل ملاحي', 'default_scope': 'COMPANY'},
    )
    role.permissions.set(_perms(DOC_CODES))
    return role


@pytest.fixture
def poe_role():
    role, _ = Role.objects.get_or_create(
        code='POE_HEALTH_OFFICER',
        defaults={'name': 'POE Officer', 'name_ar': 'ضابط منفذ', 'default_scope': 'POINT'},
    )
    role.permissions.set(_perms(['shipping_documents:view', 'port_health:view', 'ports:view']))
    return role


# --- master data -----------------------------------------------------------

@pytest.fixture
def org_sector():
    obj, _ = OrgSector.objects.get_or_create(code='RED_SEA_DOC', defaults={'name_ar': 'قطاع البحر الأحمر'})
    return obj


@pytest.fixture
def md_sector():
    obj, _ = Sector.objects.get_or_create(code='SEA_DOC', defaults={'name_ar': 'القطاع البحري'})
    return obj


@pytest.fixture
def state(md_sector):
    obj, _ = State.objects.get_or_create(
        code='MD_RED_SEA_DOC', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': md_sector},
    )
    return obj


@pytest.fixture
def ep_psc(state, org_sector):
    obj, _ = EntryPoint.objects.get_or_create(
        code='EP_DOC_PSC',
        defaults={'name_ar': 'بورتسودان', 'kind': 'SEAPORT',
                  'state': state, 'sector': org_sector, 'is_active': True},
    )
    return obj


@pytest.fixture
def sp_psc(ep_psc):
    obj, _ = SeaPort.objects.get_or_create(
        code='DOC_PSC', defaults={'name_ar': 'بورتسودان', 'entry_point': ep_psc, 'is_active': True},
    )
    return obj


# --- companies / vessels / visits -----------------------------------------

@pytest.fixture
def company_a():
    obj, _ = Carrier.objects.get_or_create(
        name='شركة مستند أ', defaults={'name_en': 'Doc Co A', 'company_type': 'MARITIME'},
    )
    return obj


@pytest.fixture
def company_b():
    obj, _ = Carrier.objects.get_or_create(
        name='شركة مستند ب', defaults={'name_en': 'Doc Co B', 'company_type': 'MARITIME'},
    )
    return obj


@pytest.fixture
def vessel_a(company_a):
    obj, _ = Vessel.objects.get_or_create(
        imo_number='IMO-DOC-001',
        defaults={'vessel_name': 'سفينة مستند أ', 'flag_state': 'السودان',
                  'company': company_a, 'status': 'EXPECTED'},
    )
    return obj


@pytest.fixture
def vessel_b(company_b):
    obj, _ = Vessel.objects.get_or_create(
        imo_number='IMO-DOC-002',
        defaults={'vessel_name': 'سفينة مستند ب', 'flag_state': 'السودان',
                  'company': company_b, 'status': 'EXPECTED'},
    )
    return obj


@pytest.fixture
def visit_a(vessel_a, sp_psc):
    obj, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_a, port=sp_psc, defaults={'arrival_date': date.today(), 'status': 'EXPECTED'},
    )
    return obj


@pytest.fixture
def visit_b(vessel_b, sp_psc):
    obj, _ = VesselVisit.objects.get_or_create(
        vessel=vessel_b, port=sp_psc, defaults={'arrival_date': date.today(), 'status': 'EXPECTED'},
    )
    return obj


# --- users -----------------------------------------------------------------

@pytest.fixture
def rep_a(company_a, company_role):
    u = User.objects.create_user(email='doc_a@nqp.gov.sd', password='StrongPass123!', full_name='ممثل أ')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY', scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    return u


@pytest.fixture
def rep_b(company_b, company_role):
    u = User.objects.create_user(email='doc_b@nqp.gov.sd', password='StrongPass123!', full_name='ممثل ب')
    RoleAssignment.objects.create(user=u, role=company_role, scope_type='COMPANY', scope_id=company_b.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_b, is_primary=True, is_active=True)
    return u


@pytest.fixture
def agent_user(company_a, agent_role, ep_psc):
    """Agent for company A, authorised for Port Sudan only."""
    u = User.objects.create_user(email='doc_agent@nqp.gov.sd', password='StrongPass123!', full_name='وكيل أ')
    RoleAssignment.objects.create(user=u, role=agent_role, scope_type='COMPANY', scope_id=company_a.id, is_active=True)
    CarrierMember.objects.create(user=u, carrier=company_a, is_primary=True, is_active=True)
    agent = ShippingAgent.objects.create(
        company=company_a, user=u, name='وكيل مستندات', status='ACTIVE', is_active=True,
    )
    agent.ports.add(ep_psc)
    return u


@pytest.fixture
def poe_officer(poe_role, ep_psc):
    u = User.objects.create_user(email='doc_poe@nqp.gov.sd', password='StrongPass123!', full_name='ضابط منفذ')
    RoleAssignment.objects.create(user=u, role=poe_role, scope_type='PORT', scope_id=ep_psc.id, is_active=True)
    return u


@pytest.fixture
def plain_user():
    return User.objects.create_user(
        email='doc_plain@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم بلا صلاحية',
    )


# ===========================================================================
# API + permissions + scoping + validation
# ===========================================================================

class TestVesselDocumentAPI:
    def test_list_requires_auth(self, api_client):
        assert api_client.get(DOCUMENT_URL).status_code == 401

    def test_company_rep_can_create_valid_pdf(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        res = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id),
            'document_type': 'CARGO_MANIFEST',
            'title': 'Manifest May',
            'file': _pdf(),
        }, format='multipart')
        assert res.status_code == 201, res.content
        data = res.json()['data']
        assert data['original_filename'] == 'manifest.pdf'
        assert data['file_size'] > 0
        assert data['mime_type'] == 'application/pdf'
        assert data['document_type_label'] == 'بيان الحمولة'
        assert data['uploaded_by_name'] == 'ممثل أ'
        assert VesselDocument.objects.filter(vessel_visit=visit_a).exists()

    def test_create_rejects_oversize_file(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        big = _pdf('big.pdf', b'x' * (11 * 1024 * 1024))
        res = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'OTHER', 'title': 'big', 'file': big,
        }, format='multipart')
        assert res.status_code == 400

    def test_create_rejects_disallowed_mime(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        bad = SimpleUploadedFile('x.exe', b'MZ', content_type='application/x-msdownload')
        res = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'OTHER', 'title': 'x', 'file': bad,
        }, format='multipart')
        assert res.status_code == 400

    def test_cannot_attach_to_other_company_visit(self, api_client, rep_a, visit_b):
        auth(api_client, rep_a)
        res = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_b.id), 'document_type': 'OTHER', 'title': 'x', 'file': _pdf(),
        }, format='multipart')
        assert res.status_code == 404
        assert not VesselDocument.objects.filter(vessel_visit=visit_b).exists()

    def test_agent_can_create_and_list(self, api_client, agent_user, visit_a):
        auth(api_client, agent_user)
        create = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'CREW_LIST',
            'title': 'Crew', 'file': _pdf('crew.pdf'),
        }, format='multipart')
        assert create.status_code == 201, create.content
        listed = api_client.get(DOCUMENT_URL)
        assert listed.status_code == 200
        assert listed.json()['data']['count'] == 1

    def test_poe_health_can_list_but_not_create(self, api_client, poe_officer, visit_a, rep_a):
        auth(api_client, rep_a)
        api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'HEALTH_CERTIFICATE',
            'title': 'Health', 'file': _pdf('h.pdf'),
        }, format='multipart')

        auth(api_client, poe_officer)
        listed = api_client.get(DOCUMENT_URL)
        assert listed.status_code == 200
        assert listed.json()['data']['count'] == 1

        denied = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'OTHER', 'title': 'x', 'file': _pdf(),
        }, format='multipart')
        assert denied.status_code == 403

    def test_company_isolation_on_list(self, api_client, rep_a, rep_b, visit_a, visit_b):
        auth(api_client, rep_b)
        created = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_b.id), 'document_type': 'OTHER', 'title': 'B doc', 'file': _pdf('b.pdf'),
        }, format='multipart')
        assert created.status_code == 201, created.content

        auth(api_client, rep_a)
        api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'OTHER', 'title': 'A doc', 'file': _pdf('a.pdf'),
        }, format='multipart')
        listed = api_client.get(DOCUMENT_URL)
        assert listed.status_code == 200
        titles = {r['title'] for r in listed.json()['data']['results']}
        assert titles == {'A doc'}

    def test_user_without_permission_is_denied(self, api_client, plain_user):
        auth(api_client, plain_user)
        assert api_client.get(DOCUMENT_URL).status_code == 403

    def test_company_rep_can_delete_own_document(self, api_client, rep_a, visit_a):
        auth(api_client, rep_a)
        created = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_a.id), 'document_type': 'OTHER', 'title': 'Temp', 'file': _pdf('t.pdf'),
        }, format='multipart')
        doc_id = created.json()['data']['id']
        deleted = api_client.delete(f'{DOCUMENT_URL}{doc_id}/')
        assert deleted.status_code == 204
        assert not VesselDocument.objects.filter(id=doc_id).exists()

    def test_company_rep_cannot_retrieve_other_company_document(self, api_client, rep_a, rep_b, visit_b):
        auth(api_client, rep_b)
        doc_id = api_client.post(DOCUMENT_URL, {
            'vessel_visit': str(visit_b.id), 'document_type': 'OTHER', 'title': 'B', 'file': _pdf('b.pdf'),
        }, format='multipart').json()['data']['id']

        auth(api_client, rep_a)
        assert api_client.get(f'{DOCUMENT_URL}{doc_id}/').status_code == 404
