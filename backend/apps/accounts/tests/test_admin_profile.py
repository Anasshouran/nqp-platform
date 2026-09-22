import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'


def _login_client(user, role=None):
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD},
        format='json',
    )
    assert resp.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin@nqp.gov.sd', password=PASSWORD, full_name='مدير النظام', is_staff=True,
    )


@pytest.fixture
def staff_client(admin_user):
    return _login_client(admin_user)


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular@nqp.gov.sd', password=PASSWORD, full_name='موظف عادي',
    )


@pytest.fixture
def target_user(db):
    return User.objects.create_user(
        email='target@nqp.gov.sd', password=PASSWORD, full_name='مستخدم مستهدف',
    )


def test_user_profile_requires_staff(regular_user, target_user):
    client = _login_client(regular_user)
    response = client.get(f'/api/v1/auth/users/{target_user.id}/profile/')
    assert response.status_code == 403


def test_user_profile_returns_unified_profile(staff_client, target_user):
    response = staff_client.get(f'/api/v1/auth/users/{target_user.id}/profile/')
    assert response.status_code == 200
    data = response.data['data']
    assert set(data.keys()) == {
        'user', 'profile', 'security', 'roles', 'organization',
        'effective_permissions', 'scopes',
    }
    assert data['user']['email'] == target_user.email
    assert data['profile']['employment_status'] == 'ACTIVE'
    assert data['security']['is_active'] is True
    assert isinstance(data['effective_permissions'], list)


def test_user_profile_not_found(staff_client):
    response = staff_client.get(f'/api/v1/auth/users/{uuid.uuid4()}/profile/')
    assert response.status_code == 404


def test_user_profile_includes_roles_and_organization(staff_client, db):
    role = Role.objects.create(code='CHEM_ANALYST', name='Chem Analyst', name_ar='محلل كيمياء')
    sector = Sector.objects.create(code='RED_SEA', name_ar='قطاع البحر الأحمر', order=1)
    department = Department.objects.create(code='QUALITY', name_ar='إدارة الجودة', sector=sector, order=1)
    position = OrgPosition.objects.create(code='ANALYST', name_ar='محلل كيمياء', level=1, order=1)
    target = User.objects.create_user(
        email='org-user@nqp.gov.sd', password=PASSWORD, full_name='مستخدم بتنظيم',
    )
    RoleAssignment.objects.create(user=target, role=role, scope_type='GLOBAL')
    OrgAssignment.objects.create(
        user=target, position=position, sector=sector, department=department, is_primary=True,
    )

    response = staff_client.get(f'/api/v1/auth/users/{target.id}/profile/')
    assert response.status_code == 200
    data = response.data['data']
    assert data['roles'][0]['role_name'] == 'محلل كيمياء'
    assert data['scopes'][0]['scope_type'] == 'GLOBAL'
    assert data['organization'][0]['sector'] == 'قطاع البحر الأحمر'
    assert data['organization'][0]['position'] == 'محلل كيمياء'