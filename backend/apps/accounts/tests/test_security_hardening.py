"""الاختبارات الأمنية لعمليات تحصين RBAC (C1/H1/H2/M1/M2 + نافذة زمنية).

تغطي: حماية حسابات المشرف/الموظفين، قيود منح الأدوار/الأنطاق، مصدر الحقيقة
لتعيينات الأدوار، وفشل-آمن لبوابة الإدارة الدقيقة.
"""
from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment, ScopeType, User
from core.permissions import AdminOrPermissionAction

pytestmark = pytest.mark.django_db


def _client_for(user):
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def _permission(code):
    resource, action = code.split(':')
    return Permission.objects.get_or_create(
        code=code, defaults={'name': code, 'resource': resource, 'action': action},
    )[0]


def _non_staff(code, holder_role, scope_type='GLOBAL', scope_id=None):
    """مستخدم غير موظف يحمل دوراً بصلاحية، بتعيين نشط (مصدر الحقيقة)."""
    role, _ = Role.objects.get_or_create(code=holder_role, defaults={'name': 'R', 'name_ar': 'ر'})
    role.permissions.add(_permission(code))
    user = User.objects.create_user(
        email=f'{holder_role.lower()}-{code.split(":")[0]}@nqp.gov.sd',
        password='StrongPass123!', full_name='Non staff',
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
    )
    return user, role


def _plain_role(code):
    return Role.objects.create(code=code, name=code, name_ar=code)


# --- C1: حماية حسابات المشرف/الموظفين و is_staff ---


def test_non_superuser_cannot_enable_staff_on_create(db):
    user, _ = _non_staff('users:add', 'USER_OFFICER')
    client = _client_for(user)
    response = client.post(
        '/api/v1/auth/users/',
        {
            'email': 'new-staff@nqp.gov.sd', 'full_name': 'New',
            'password': 'StrongPass123!', 'is_staff': True,
        },
        format='json',
    )
    assert response.status_code == 400
    assert not User.objects.filter(email='new-staff@nqp.gov.sd').exists()


def test_superuser_can_enable_staff_on_create(db):
    superuser = User.objects.create_superuser(
        email='root-sec@nqp.gov.sd', password='StrongPass123!',
    )
    client = _client_for(superuser)
    response = client.post(
        '/api/v1/auth/users/',
        {
            'email': 'staff-ok@nqp.gov.sd', 'full_name': 'Staff',
            'password': 'StrongPass123!', 'is_staff': True,
        },
        format='json',
    )
    assert response.status_code == 201
    assert User.objects.get(email='staff-ok@nqp.gov.sd').is_staff is True


def test_non_superuser_cannot_patch_superuser(db):
    superuser = User.objects.create_superuser(
        email='root-patch@nqp.gov.sd', password='StrongPass123!',
    )
    staff = User.objects.create_user(
        email='staff-patch@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/users/{superuser.id}/', {'full_name': 'مهاجم'}, format='json',
    )
    assert response.status_code == 403


def test_non_superuser_cannot_reset_superuser_password(db):
    superuser = User.objects.create_superuser(
        email='root-reset@nqp.gov.sd', password='StrongPass123!',
    )
    staff = User.objects.create_user(
        email='staff-reset@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    client = _client_for(staff)
    response = client.post(
        f'/api/v1/auth/users/{superuser.id}/reset-password/',
        {'password': 'NewPass123!'}, format='json',
    )
    assert response.status_code == 403


def test_non_superuser_cannot_delete_superuser(db):
    superuser = User.objects.create_superuser(
        email='root-del@nqp.gov.sd', password='StrongPass123!',
    )
    staff = User.objects.create_user(
        email='staff-del@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    client = _client_for(staff)
    assert client.delete(f'/api/v1/auth/users/{superuser.id}/').status_code == 403


def test_non_staff_users_edit_cannot_touch_staff_account(db):
    staff = User.objects.create_user(
        email='staff-edit@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    actor, _ = _non_staff('users:edit', 'GRANT_EDIT')
    client = _client_for(actor)
    response = client.patch(
        f'/api/v1/auth/users/{staff.id}/', {'full_name': 'تعديل'}, format='json',
    )
    assert response.status_code == 403


def test_users_edit_cannot_grant_role_not_held_or_admin(db):
    held_role = _plain_role('GRANT_HOLD')
    other_role = _plain_role('GRANT_B')
    admin_role = Role.objects.create(code='ADMIN', name='Admin', name_ar='مدير')
    admin_role.permissions.add(_permission('users:add'))

    perm_role = Role.objects.create(code='GRANT_PERM', name='P', name_ar='ص')
    perm_role.permissions.add(_permission('users:edit'))
    actor = User.objects.create_user(
        email='actor-grant@nqp.gov.sd', password='StrongPass123!', full_name='Actor',
    )
    RoleAssignment.objects.create(user=actor, role=perm_role, scope_type=ScopeType.GLOBAL)
    RoleAssignment.objects.create(user=actor, role=held_role, scope_type=ScopeType.GLOBAL)
    target = User.objects.create_user(
        email='target-grant@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(actor)

    denied = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': other_role.code}, format='json',
    )
    assert denied.status_code == 400

    denied_admin = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': admin_role.code}, format='json',
    )
    assert denied_admin.status_code == 400

    allowed = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': held_role.code}, format='json',
    )
    assert allowed.status_code == 200
    target.refresh_from_db()
    assert target.role.code == held_role.code


# --- H1: قيود منح الأدوار عبر RoleAssignment ---


def test_role_assignment_global_grant_requires_global_scope(db):
    from apps.organization.models import Sector

    sector = Sector.objects.create(code='RED_SEA', name_ar='البحر الأحمر', name_en='Red Sea')
    grant_role = _plain_role('GRANT_A')
    perm_role = Role.objects.create(code='GRANT_PERM_ASG', name='P', name_ar='ص')
    perm_role.permissions.add(_permission('role_assignments:add'))
    actor = User.objects.create_user(
        email='assign-scoped@nqp.gov.sd', password='StrongPass123!', full_name='Sc',
    )
    RoleAssignment.objects.create(
        user=actor, role=perm_role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    RoleAssignment.objects.create(
        user=actor, role=grant_role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
    )
    target = User.objects.create_user(
        email='assign-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(actor)

    denied = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': target.id, 'role': grant_role.code, 'scope_type': 'GLOBAL'},
        format='json',
    )
    assert denied.status_code == 400

    allowed = client.post(
        '/api/v1/auth/role-assignments/',
        {
            'user': target.id, 'role': grant_role.code,
            'scope_type': 'SECTOR', 'scope_id': str(sector.pk),
        },
        format='json',
    )
    assert allowed.status_code == 201


def test_role_assignment_cannot_grant_admin_power_role(db):
    role = _plain_role('GRANT_B')
    admin_role = Role.objects.create(code='ADMIN', name='Admin', name_ar='مدير')
    admin_role.permissions.add(_permission('users:view'))
    actor = User.objects.create_user(
        email='assign-admin@nqp.gov.sd', password='StrongPass123!', full_name='A',
    )
    RoleAssignment.objects.create(user=actor, role=role, scope_type=ScopeType.GLOBAL)
    role.permissions.add(_permission('role_assignments:add'))
    target = User.objects.create_user(
        email='assign-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(actor)
    response = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': target.id, 'role': admin_role.code, 'scope_type': 'GLOBAL'},
        format='json',
    )
    assert response.status_code == 400


def test_staff_cannot_modify_superuser_assignment(db):
    superuser = User.objects.create_superuser(
        email='root-asg@nqp.gov.sd', password='StrongPass123!',
    )
    role = _plain_role('GRANT_C')
    RoleAssignment.objects.create(
        user=superuser, role=role, scope_type=ScopeType.GLOBAL,
    )
    staff = User.objects.create_user(
        email='staff-asg@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/role-assignments/{RoleAssignment.objects.get(user=superuser, role=role).id}/',
        {'is_active': False},
        format='json',
    )
    assert response.status_code == 403


# --- H2/M2: مصدر الحقيقة + نافذة زمنية ---


def test_role_fk_ignored_when_assignment_inactive_or_out_of_window(db):
    from apps.food_quarantine.views import _has_role
    from core.utils.scoping import has_role

    role = Role.objects.create(code='FOOD_REV_ROLE', name='R', name_ar='ر')
    user = User.objects.create_user(
        email='window@nqp.gov.sd', password='StrongPass123!', full_name='W', role=role,
    )
    active = RoleAssignment.objects.create(
        user=user, role=role, scope_type=ScopeType.GLOBAL,
    )
    assert has_role(user, role.code) is True
    assert _has_role(user, role.code) is True

    active.is_active = False
    active.save(update_fields=['is_active'])
    assert has_role(user, role.code) is False
    assert _has_role(user, role.code) is False

    active.is_active = True
    active.end_date = timezone.now().date() - timedelta(days=1)
    active.save(update_fields=['is_active', 'end_date'])
    assert has_role(user, role.code) is False

    active.end_date = None
    active.start_date = timezone.now().date() + timedelta(days=1)
    active.save(update_fields=['end_date', 'start_date'])
    assert has_role(user, role.code) is False

    active.start_date = timezone.now().date()
    active.end_date = None
    active.save(update_fields=['start_date', 'end_date'])
    assert has_role(user, role.code) is True


def test_fk_without_assignment_grants_nothing(db):
    from core.utils.scoping import has_role

    role = _plain_role('GRANT_D')
    user = User.objects.create_user(
        email='fkonly@nqp.gov.sd', password='StrongPass123!', full_name='F', role=role,
    )
    assert has_role(user, role.code) is False


# --- M1: فشل-آمن لإدارة دقيقة ---


def _grant_view(action='list', resource='travelers'):
    return SimpleNamespace(action=action, permission_resource=resource, action_permission_map={})


def test_admin_or_permission_action_fails_closed_without_resource(db):
    user, _ = _non_staff('travelers:view', 'GRANT_E')
    request = SimpleNamespace(user=user)
    view = _grant_view(resource=None)
    assert AdminOrPermissionAction().has_permission(request, view) is False


def test_admin_or_permission_action_denies_unmapped_action(db):
    user, _ = _non_staff('travelers:view', 'GRANT_E')
    request = SimpleNamespace(user=user)
    view = _grant_view(action='custom_unknown_action')
    assert AdminOrPermissionAction().has_permission(request, view) is False


def test_admin_or_permission_action_allows_mapped_action(db):
    user, _ = _non_staff('travelers:view', 'GRANT_E')
    request = SimpleNamespace(user=user)
    view = _grant_view(action='list')
    assert AdminOrPermissionAction().has_permission(request, view) is True


def test_admin_or_permission_action_staff_bypass_fail_closed_config(db):
    staff = User.objects.create_user(
        email='staff-m1@nqp.gov.sd', password='StrongPass123!',
        full_name='S', is_staff=True,
    )
    request = SimpleNamespace(user=staff)
    view = _grant_view(resource=None)
    assert AdminOrPermissionAction().has_permission(request, view) is True