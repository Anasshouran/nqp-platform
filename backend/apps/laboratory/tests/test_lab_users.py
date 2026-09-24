import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.organization.models import Sector

pytestmark = pytest.mark.django_db

User = get_user_model()


def auth_client_for(user):
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'x'}, format='json')
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def sector(db):
    return Sector.objects.filter(code='RED_SEA').first() or Sector.objects.create(
        code='RED_SEA', name_ar='البحر الأحمر', name_en='Red Sea', is_active=True,
    )


@pytest.fixture
def red_manager(sector):
    role, _ = Role.objects.get_or_create(
        code='LAB_MANAGER', defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )
    user = User.objects.create_user(
        email='lab-mgr@nqp.gov.sd', password='x', full_name='مدير المختبر'
    )
    user.sector = sector
    user.save(update_fields=['sector'])
    RoleAssignment.objects.get_or_create(user=user, role=role, defaults={
        'scope_type': ScopeType.SECTOR, 'scope_id': sector.pk,
    })
    return user


def test_create_lab_user_is_sector_scoped(sector, red_manager):
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(red_manager)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'lab-tech@nqp.gov.sd',
        'full_name': 'فني المختبر',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 201
    user = User.objects.get(email='lab-tech@nqp.gov.sd')
    assert user.role.code == 'LAB_TECHNICIAN'
    assignment = user.role_assignments.first()
    assert assignment.scope_type == ScopeType.SECTOR
    assert assignment.scope_id == sector.pk


def test_lab_users_listed_via_assignment_without_role_fk(sector):
    role, _ = Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    # مستخدم بتعيين دور فقط — دون حقل user.role
    tech = User.objects.create_user(
        email='tech-r@nqp.gov.sd', password='x', full_name='فني (تعيين فقط)'
    )
    RoleAssignment.objects.create(
        user=tech, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    assert tech.role_id is None

    national = User.objects.create_user(email='nat@nqp.gov.sd', password='x', full_name='وطني')
    RoleAssignment.objects.create(user=national, role=role, scope_type=ScopeType.GLOBAL)
    c = auth_client_for(national)
    resp = c.get('/api/v1/laboratory/users/')
    assert resp.status_code == 200
    emails = [u['email'] for u in resp.json()['data']]
    assert 'tech-r@nqp.gov.sd' in emails


def test_lab_manager_can_manage_assignment_only(sector):
    # مدير بتعيين دور فقط (بلا user.role) يملك حق الإدارة
    mgr = User.objects.create_user(
        email='mgr-a-only@nqp.gov.sd', password='x', full_name='مدير بالتعيين'
    )
    mgr_role, _ = Role.objects.get_or_create(
        code='LAB_DIRECTOR', defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )
    RoleAssignment.objects.create(
        user=mgr, role=mgr_role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    assert mgr.role_id is None
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(mgr)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'managed@nqp.gov.sd',
        'full_name': 'مُدار',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 201
    assert User.objects.filter(email='managed@nqp.gov.sd').exists()