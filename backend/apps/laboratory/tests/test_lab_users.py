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


def test_deactivated_assignment_denies_lab_management(sector):
    mgr = User.objects.create_user(
        email='mgr-deact@nqp.gov.sd', password='x', full_name='مدير مُعطّل'
    )
    mgr_role, _ = Role.objects.get_or_create(
        code='LAB_MANAGER', defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )
    assignment = RoleAssignment.objects.create(
        user=mgr, role=mgr_role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    # يبقى الحقل القديم user.role معطياً — لكنه يجب ألا يمنح تفويضاً
    mgr.role = mgr_role
    mgr.save(update_fields=['role'])
    assignment.is_active = False
    assignment.save(update_fields=['is_active'])
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(mgr)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'no-deact@nqp.gov.sd',
        'full_name': 'مرفوض',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 403


def test_expired_assignment_denies_lab_management(sector, red_manager):
    from datetime import timedelta
    from django.utils import timezone

    # انتهاء نافذة مدير البحر الأحمر يمنع الإدارة حتى مع بقاء الحقل القديم
    assignment = RoleAssignment.objects.get(user=red_manager, role__code='LAB_MANAGER')
    assignment.end_date = timezone.now().date() - timedelta(days=1)
    assignment.save(update_fields=['end_date'])
    red_manager.role = assignment.role
    red_manager.save(update_fields=['role'])
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(red_manager)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'no-expired@nqp.gov.sd',
        'full_name': 'مرفوض',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 403


def test_future_dated_assignment_cannot_yet_manage(sector):
    from datetime import timedelta
    from django.utils import timezone

    role, _ = Role.objects.get_or_create(
        code='LAB_MANAGER', defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )
    mgr = User.objects.create_user(
        email='mgr-future@nqp.gov.sd', password='x', full_name='مدير مستقبلي'
    )
    mgr.role = role
    mgr.save(update_fields=['role'])
    RoleAssignment.objects.create(
        user=mgr, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
        start_date=timezone.now().date() + timedelta(days=1),
    )
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(mgr)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'no-future@nqp.gov.sd',
        'full_name': 'مرفوض',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 403


def test_lab_users_list_filters_by_date_window(sector):
    from datetime import timedelta
    from django.utils import timezone

    role, _ = Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    active_tech = User.objects.create_user(email='tech-active@nqp.gov.sd', password='x', full_name='نشط')
    RoleAssignment.objects.create(
        user=active_tech, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    stale = User.objects.create_user(email='tech-stale@nqp.gov.sd', password='x', full_name='قديم')
    stale.role = role
    stale.save(update_fields=['role'])
    RoleAssignment.objects.create(
        user=stale, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
        end_date=timezone.now().date() - timedelta(days=1),
    )
    viewer = User.objects.create_user(email='view@nqp.gov.sd', password='x', full_name='مشاهِد')
    RoleAssignment.objects.create(user=viewer, role=role, scope_type=ScopeType.GLOBAL)
    c = auth_client_for(viewer)
    resp = c.get('/api/v1/laboratory/users/')
    emails = [u['email'] for u in resp.json()['data']]
    assert 'tech-active@nqp.gov.sd' in emails
    assert 'tech-stale@nqp.gov.sd' not in emails


def test_cross_sector_lab_user_creation_denied(sector, red_manager):
    khartoum = Sector.objects.create(code='KHARTOUM', name_ar='الخرطوم', name_en='Khartoum')
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(red_manager)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'cross@nqp.gov.sd',
        'full_name': 'عابر قطاع',
        'role': 'LAB_TECHNICIAN',
        'sector': str(khartoum.pk),
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 400
    assert not User.objects.filter(email='cross@nqp.gov.sd').exists()


def test_lab_manager_cannot_create_higher_tier(sector, red_manager):
    Role.objects.get_or_create(
        code='LAB_DIRECTOR', defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(red_manager)
    resp = c.post('/api/v1/laboratory/users/', {
        'email': 'new-director@nqp.gov.sd',
        'full_name': 'مدير جديد',
        'role': 'LAB_DIRECTOR',
        'password': 'testpass123',
    }, format='json')
    assert resp.status_code == 400
    assert not User.objects.filter(email='new-director@nqp.gov.sd').exists()


def test_lab_manager_can_create_peer_and_lower_within_scope(sector, red_manager):
    Role.objects.get_or_create(
        code='LAB_TECHNICIAN', defaults={'name_ar': 'فني معمل', 'default_scope': ScopeType.SECTOR},
    )
    c = auth_client_for(red_manager)
    tech = c.post('/api/v1/laboratory/users/', {
        'email': 'tech-ok@nqp.gov.sd',
        'full_name': 'فني',
        'role': 'LAB_TECHNICIAN',
        'password': 'testpass123',
    }, format='json')
    assert tech.status_code == 201