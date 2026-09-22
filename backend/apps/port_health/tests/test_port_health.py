from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.port_health.models import (
    HealthDeclaration,
    SanitationCertificate,
    SeaPort,
    Vessel,
    VesselVisit,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='portadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير صحة الموانئ'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def seaport():
    return SeaPort.objects.create(code='PSC', name_ar='ميناء بورتسودان', name_en='Port Sudan')


@pytest.fixture
def vessel(seaport):
    v = Vessel.objects.create(
        vessel_name='MSV الصداقة', imo_number='IMO9301234',
        flag_state='السودان', vessel_type='COMMERCIAL', status='ARRIVED',
    )
    VesselVisit.objects.create(vessel=v, port=seaport, arrival_date=date.today(), status='ARRIVED')
    return v


def test_seaports_list(api_client, admin_user, seaport):
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 200
    assert res.json()['data']['results'][0]['code'] == 'PSC'


def test_vessels_list(api_client, admin_user, vessel):
    res = api_client.get('/api/v1/port-health/vessels/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['results'][0]['imo_number'] == 'IMO9301234'


def test_vessel_create(api_client, admin_user):
    res = api_client.post(
        '/api/v1/port-health/vessels/',
        {'vessel_name': 'نجمة البحر', 'imo_number': 'IMO9405678', 'flag_state': 'السودان', 'vessel_type': 'FISHING'},
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['vessel_name'] == 'نجمة البحر'


def test_ship_inspection_create(api_client, admin_user, vessel):
    res = api_client.post(
        '/api/v1/port-health/ship-inspections/',
        {'vessel': str(vessel.id), 'overall_status': 'PASSED'},
        format='json',
    )
    assert res.status_code == 201
    data = res.json()['data']
    assert data['inspector_name'] == 'مدير صحة الموانئ'
    assert data['vessel_name'] == 'MSV الصداقة'


def test_declaration_flow(api_client, admin_user, vessel):
    res = api_client.post(
        '/api/v1/port-health/declarations/',
        {
            'vessel': str(vessel.id), 'captain_name': 'ربان', 'declaration_date': str(date.today()),
            'illness_on_board': False, 'deaths_on_board': 0,
        },
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['status'] == 'RECEIVED'


def test_sanitation_certificate(api_client, admin_user, vessel):
    res = api_client.post(
        '/api/v1/port-health/sanitation-certificates/',
        {
            'certificate_number': 'SCC-1', 'certificate_type': 'SSCC', 'vessel': str(vessel.id),
            'issue_date': str(date.today()), 'expiry_date': str(date.today() + timedelta(days=180)),
        },
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['certificate_type'] == 'SSCC'


def test_dashboard_overview(api_client, admin_user, vessel):
    res = api_client.get('/api/v1/port-health/dashboard/overview/')
    assert res.status_code == 200
    data = res.data['data']
    assert data['vessels'] >= 1
    assert data['seaports'] >= 1


def _auth(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


@pytest.fixture
def no_port_role():
    role, _ = Role.objects.get_or_create(
        code='NO_PORT',
        defaults={'name': 'No Port', 'name_ar': 'بدون ميناء', 'description': ''},
    )
    role.permissions.set([])
    return role


@pytest.fixture
def port_scoped_role():
    role, _ = Role.objects.get_or_create(
        code='PORT_ONLY',
        defaults={'name': 'Port Only', 'name_ar': 'ميناء فقط', 'description': ''},
    )
    view, _ = Permission.objects.get_or_create(code='port_health:view', defaults={'resource': 'port_health', 'action': 'view', 'name': 'عرض صحة الموانئ'})
    edit, _ = Permission.objects.get_or_create(code='port_health:edit', defaults={'resource': 'port_health', 'action': 'edit', 'name': 'تعديل صحة الموانئ'})
    role.permissions.set([view, edit])
    return role


def test_seaports_forbidden_without_port_perm(api_client, seaport, no_port_role):
    user = User.objects.create_user(
        email='noport@nqp.gov.sd', password='StrongPass123!', full_name='بدون صلاحية'
    )
    RoleAssignment.objects.create(user=user, role=no_port_role, scope_type='GLOBAL', is_active=True)
    _auth(api_client, user)
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 403


def test_seaports_scoped_to_port(api_client, seaport, port_scoped_role):
    other = SeaPort.objects.create(code='NP', name_ar='الميناء الشمالي', name_en='North Port')
    user = User.objects.create_user(
        email='scoped@nqp.gov.sd', password='StrongPass123!', full_name='مفعّل الميناء'
    )
    RoleAssignment.objects.create(
        user=user, role=port_scoped_role, scope_type='PORT', scope_id=str(seaport.id), is_active=True
    )
    _auth(api_client, user)
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert codes == ['PSC']
