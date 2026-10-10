"""الاختبارات الأمنية لعمليات تحصين RBAC (C1/H1/H2/M1/M2 + نافذة زمنية).

تغطي: حماية حسابات المشرف/الموظفين، قيود منح الأدوار/الأنطاق، مصدر الحقيقة
لتعيينات الأدوار، وفشل-آمن لبوابة الإدارة الدقيقة.
"""
from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, PermissionAudit, Role, RoleAssignment, ScopeType, User
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


def _holder(codes, *, email, is_staff=False, role_code=None):
    """فاعل يحمل `codes` بتعيين نشط (مصدر الحقيقة) — اختبار القدرات لا الرايات."""
    role = Role.objects.create(
        code=role_code or f'H_{email.split("@")[0][:18].upper().replace("-", "_")}',
        name='Holder', name_ar='حامل',
    )
    for code in codes:
        role.permissions.add(_permission(code))
    user = User.objects.create_user(
        email=email, password='StrongPass123!', full_name='Holder', is_staff=is_staff,
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type=ScopeType.GLOBAL)
    return user, role


def _target(email):
    return User.objects.create_user(
        email=email, password='StrongPass123!', full_name='Target',
    )


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


# --- M8-A: مسار PATCH users/{id}/ كان يتجاوز check_grant_capability بالكامل ---

def _staff_user(email, roles=()):
    staff = User.objects.create_user(
        email=email, password='StrongPass123!', full_name='Staff', is_staff=True,
    )
    for role in roles:
        RoleAssignment.objects.create(
            user=staff, role=role, scope_type=ScopeType.GLOBAL,
        )
    return staff


def _admin_role():
    role, _ = Role.objects.get_or_create(
        code='ADMIN', defaults={'name': 'Admin', 'name_ar': 'مدير'},
    )
    role.permissions.add(_permission('users:add'))
    return role


def test_staff_cannot_self_grant_admin_role_via_users_patch(db):
    """`is_staff` وحده لا يفتح منح دور إداري عبر PATCH users (ثغرة M8-A)."""
    admin_role = _admin_role()
    staff = _staff_user('m8a-self@nqp.gov.sd')
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/users/{staff.id}/', {'role': admin_role.code}, format='json',
    )
    assert response.status_code == 400
    staff.refresh_from_db()
    assert staff.role is None
    assert not RoleAssignment.objects.filter(user=staff).exists()


def test_staff_cannot_grant_admin_role_to_another_user_via_users_patch(db):
    admin_role = _admin_role()
    staff = _staff_user('m8a-other@nqp.gov.sd')
    target = User.objects.create_user(
        email='m8a-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': admin_role.code}, format='json',
    )
    assert response.status_code == 400
    target.refresh_from_db()
    assert target.role is None
    assert not RoleAssignment.objects.filter(user=target).exists()


def test_staff_holding_admin_role_may_grant_it_via_users_patch(db):
    admin_role = _admin_role()
    staff = _staff_user('m8a-holder@nqp.gov.sd', roles=[admin_role])
    target = User.objects.create_user(
        email='m8a-holder-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': admin_role.code}, format='json',
    )
    assert response.status_code == 200
    assert RoleAssignment.objects.filter(
        user=target, role=admin_role, scope_type=ScopeType.GLOBAL, is_active=True,
    ).exists()


def test_staff_without_the_role_cannot_grant_ordinary_role_via_users_patch(db):
    """M8-S: سقط اختصار `is_staff` ⇒ منح أي دور. موظف بلا تعيين لا يمنح دوراً.

    كان السلوك السابق (المثبت في M8-A) أن `is_staff` يمنح أي دور عادي،
    وهو مخالفة لقاعدة D: الفاعل يمنح ما لا يحمله. الآن يُرفض، ويبقى المسار
    المشروع مفتوح للحامل الفعلي للدور (اختبار تالٍ).
    """
    role = _plain_role('M8S_ORDINARY')
    staff = _staff_user('m8s-ordinary@nqp.gov.sd')
    target = User.objects.create_user(
        email='m8s-ordinary-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{target.id}/', {'role': role.code}, format='json',
    )
    assert response.status_code == 400
    target.refresh_from_db()
    assert target.role_id is None


def test_role_holder_may_grant_its_own_ordinary_role(db):
    """الحامل الفعلي للدور (بتعيين نشط) يبقى مخوّلاً بمنحه."""
    role = _plain_role('M8S_HELD')
    staff = _staff_user('m8s-holder-role@nqp.gov.sd', roles=[role])
    target = User.objects.create_user(
        email='m8s-holder-role-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{target.id}/', {'role': role.code}, format='json',
    )
    assert response.status_code == 200
    assert RoleAssignment.objects.filter(
        user=target, role=role, scope_type=ScopeType.GLOBAL, is_active=True,
    ).exists()


def test_denied_role_change_does_not_partially_write_other_fields(db):
    """رفض تغيير الدور يجب ألا يترك بقية حقول PATCH محفوظة."""
    admin_role = _admin_role()
    staff = _staff_user('m8a-atomic@nqp.gov.sd')
    target = User.objects.create_user(
        email='m8a-atomic-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(staff)
    response = client.patch(
        f'/api/v1/auth/users/{target.id}/',
        {'full_name': 'اسم محدَّث', 'role': admin_role.code},
        format='json',
    )
    assert response.status_code == 400
    target.refresh_from_db()
    assert target.full_name == 'T'
    assert target.role is None


def test_role_cleared_by_holding_actor_only(db):
    """`role: null` سحبٌ لصلاحية فيخضع لقاعدة المنح على الدور السابق."""
    held_role = _plain_role('M8A_CLEAR_HELD')
    other_role = _plain_role('M8A_CLEAR_OTHER')
    perm_role = Role.objects.create(code='M8A_CLEAR_PERM', name='P', name_ar='ص')
    perm_role.permissions.add(_permission('users:edit'))
    actor = User.objects.create_user(
        email='m8a-clear-actor@nqp.gov.sd', password='StrongPass123!', full_name='A',
    )
    RoleAssignment.objects.create(user=actor, role=perm_role, scope_type=ScopeType.GLOBAL)
    RoleAssignment.objects.create(user=actor, role=held_role, scope_type=ScopeType.GLOBAL)
    client = _client_for(actor)

    not_held = User.objects.create_user(
        email='m8a-clear-not-held@nqp.gov.sd', password='StrongPass123!',
        full_name='T', role=other_role,
    )
    denied = client.patch(
        f'/api/v1/auth/users/{not_held.id}/', {'role': None}, format='json',
    )
    assert denied.status_code == 400
    not_held.refresh_from_db()
    assert not_held.role_id == other_role.id

    held = User.objects.create_user(
        email='m8a-clear-held@nqp.gov.sd', password='StrongPass123!',
        full_name='T', role=held_role,
    )
    cleared = client.patch(
        f'/api/v1/auth/users/{held.id}/', {'role': None}, format='json',
    )
    assert cleared.status_code == 200
    held.refresh_from_db()
    assert held.role is None


def test_role_cleared_on_roleless_account_is_a_noop(db):
    """`role: null` على حساب بلا دور لا يغيّر شيئاً ولا ينهار (مسار الواجهة)."""
    perm_role = Role.objects.create(code='M8A_NULL_PERM', name='P', name_ar='ص')
    perm_role.permissions.add(_permission('users:edit'))
    actor = User.objects.create_user(
        email='m8a-null-actor@nqp.gov.sd', password='StrongPass123!', full_name='A',
    )
    RoleAssignment.objects.create(user=actor, role=perm_role, scope_type=ScopeType.GLOBAL)
    target = User.objects.create_user(
        email='m8a-null-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(actor)
    response = client.patch(
        f'/api/v1/auth/users/{target.id}/',
        {'full_name': 'اسم معدّل', 'role': None},
        format='json',
    )
    assert response.status_code == 200
    target.refresh_from_db()
    assert target.full_name == 'اسم معدّل'
    assert target.role is None


# --- H1: قيود منح الأدوار عبر RoleAssignment ---


def test_role_assignment_global_grant_requires_global_scope(db):
    from apps.organization.models import Sector

    # `get_or_create`: there is a session fixture in port_health that
    # creates RED_SEA outside the test transaction, and with `--reuse-db`
    # the row survives into later runs — `create()` would violate unique code.
    sector, _ = Sector.objects.get_or_create(
        code='RED_SEA', defaults={'name_ar': 'البحر الأحمر', 'name_en': 'Red Sea'},
    )
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

# --- C2: منع تصعيد الصلاحيات عبر is_staff (حادث 2026-10: حسابان منحا نفسيهما ADMIN) ---


def test_staff_cannot_self_grant_global_admin_role(db):
    """`is_staff` راية دخول لوحة الإدارة، وليست راية إدارة الهوية.

    Previously `check_grant_capability` returned True for any `is_staff` actor
    before reaching the admin-power check, letting a staff account with zero
    roles grant itself a GLOBAL `ADMIN` RoleAssignment.
    """
    admin_role = Role.objects.create(code='ADMIN', name='Admin', name_ar='مدير')
    admin_role.permissions.add(_permission('users:manage'))
    staff = User.objects.create_user(
        email='escalate-staff@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    client = _client_for(staff)
    response = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(staff.id), 'role': 'ADMIN', 'scope_type': ScopeType.GLOBAL},
        format='json',
    )
    assert response.status_code == 400
    assert not RoleAssignment.objects.filter(user=staff, role=admin_role).exists()


def test_staff_holding_admin_role_may_grant_it(db):
    """من يحمل الدور الإداري بتعيين نشط يبقى مخوّلاً بمنحه."""
    admin_role = Role.objects.create(code='ADMIN', name='Admin', name_ar='مدير')
    admin_role.permissions.add(_permission('users:manage'))
    staff = User.objects.create_user(
        email='admin-holder@nqp.gov.sd', password='StrongPass123!',
        full_name='Staff', is_staff=True,
    )
    RoleAssignment.objects.create(
        user=staff, role=admin_role, scope_type=ScopeType.GLOBAL,
    )
    target = User.objects.create_user(
        email='admin-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(staff)
    response = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(target.id), 'role': 'ADMIN', 'scope_type': ScopeType.GLOBAL},
        format='json',
    )
    assert response.status_code == 201
    assert RoleAssignment.objects.filter(user=target, role=admin_role).exists()


def test_non_staff_admin_holder_may_grant_it(db):
    """حامل الدور الإداري دون is_staff يبقى مخوّلاً — الحارس يربط بالدور لا بالراية."""
    admin_role = Role.objects.create(code='ADMIN', name='Admin', name_ar='مدير')
    admin_role.permissions.add(_permission('users:manage'))
    # لبلوغ `check_grant_capability` يجب اجتياز بوابة العرض أولاً.
    admin_role.permissions.add(_permission('role_assignments:add'))
    holder = User.objects.create_user(
        email='admin-nonstaff@nqp.gov.sd', password='StrongPass123!', full_name='H',
    )
    RoleAssignment.objects.create(
        user=holder, role=admin_role, scope_type=ScopeType.GLOBAL,
    )
    target = User.objects.create_user(
        email='admin-nonstaff-target@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    client = _client_for(holder)
    response = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(target.id), 'role': 'ADMIN', 'scope_type': ScopeType.GLOBAL},
        format='json',
    )
    assert response.status_code == 201


# --- M8-S: سياسة منح/تعديل الصلاحيات الموحّدة ---


def _admin_power_role(code, code_permission='users:view'):
    role = Role.objects.create(code=code, name='Admin power', name_ar='سلطة إدارية')
    role.permissions.add(_permission(code_permission))
    return role


def test_staff_cannot_self_grant_extra_permission(db):
    """Test 1 — DENY: موظف يمنح نفسه صلاحية إضافية لا يحملها."""
    _permission('travelers:view')
    staff = _staff_user('m8s-self-extra@nqp.gov.sd')
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{staff.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 400
    staff.refresh_from_db()
    assert list(staff.extra_permissions.values_list('code', flat=True)) == []


def test_staff_cannot_grant_extra_permission_to_another_user(db):
    """Test 2 — DENY: موظف يمنح غيره صلاحية لا يحملها."""
    _permission('travelers:view')
    staff = _staff_user('m8s-other-extra@nqp.gov.sd')
    target = _target('m8s-other-extra-target@nqp.gov.sd')
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 400
    assert not target.extra_permissions.exists()


def test_users_edit_holder_cannot_grant_permission_it_does_not_own(db):
    """Test 3 — DENY: حامل users:edit يمنح صلاحية لا يملكها، ويُسمح له بما يملكه."""
    _permission('travelers:view')
    _permission('food:view')
    actor, _ = _holder(
        ['users:edit', 'travelers:view'], email='m8s-editor@nqp.gov.sd',
    )
    target = _target('m8s-editor-target@nqp.gov.sd')
    client = _client_for(actor)

    denied = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['food:view']},
        format='json',
    )
    assert denied.status_code == 400
    target.refresh_from_db()
    assert not target.extra_permissions.exists()

    allowed = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert allowed.status_code == 200
    assert list(target.extra_permissions.values_list('code', flat=True)) == ['travelers:view']


def test_staff_cannot_mutate_admin_power_role(db):
    """Test 4 — DENY: تعديل صلاحيات دور إداري مقصور على المشرف."""
    admin_role = _admin_power_role('M8S_ADMIN_ROLE')
    _permission('travelers:view')
    staff = _staff_user('m8s-role-mutator@nqp.gov.sd')
    response = _client_for(staff).patch(
        f'/api/v1/auth/roles/{admin_role.id}/',
        {'permissions': ['users:view', 'travelers:view']}, format='json',
    )
    assert response.status_code == 400
    assert list(admin_role.permissions.values_list('code', flat=True)) == ['users:view']


def test_role_permissions_cannot_escalate_beyond_actor(db):
    """Test 5 — DENY: لا يُبنى دور من صلاحيات لا يحملها الفاعل."""
    _permission('travelers:view')
    _permission('food:view')
    actor, _ = _holder(
        ['roles:edit', 'travelers:view'], email='m8s-role-holder@nqp.gov.sd',
    )
    role = _plain_role('M8S_PLAIN_ROLE')
    client = _client_for(actor)

    denied = client.patch(
        f'/api/v1/auth/roles/{role.id}/',
        {'permissions': ['travelers:view', 'food:view']}, format='json',
    )
    assert denied.status_code == 400
    assert not role.permissions.exists()

    allowed = client.patch(
        f'/api/v1/auth/roles/{role.id}/', {'permissions': ['travelers:view']},
        format='json',
    )
    assert allowed.status_code == 200
    assert list(role.permissions.values_list('code', flat=True)) == ['travelers:view']


def test_role_code_change_denied_for_non_superuser(db):
    """Test 6 — DENY: رمز الدور غير قابل للتعديل إلا للمشرف."""
    actor, _ = _holder(['roles:edit'], email='m8s-code-editor@nqp.gov.sd')
    role = _plain_role('M8S_CODE')
    response = _client_for(actor).patch(
        f'/api/v1/auth/roles/{role.id}/', {'code': 'M8S_CODE_HIJACK'}, format='json',
    )
    assert response.status_code == 400
    role.refresh_from_db()
    assert role.code == 'M8S_CODE'


def test_superuser_may_rename_role_code(db):
    """سياسة صريحة: المشرف هو من يصلح رمز دور بالخطأ."""
    root = User.objects.create_superuser(
        email='m8s-root-code@nqp.gov.sd', password='StrongPass123!',
    )
    role = _plain_role('M8S_CODE_ROOT')
    response = _client_for(root).patch(
        f'/api/v1/auth/roles/{role.id}/', {'code': 'M8S_CODE_FIXED'}, format='json',
    )
    assert response.status_code == 200
    role.refresh_from_db()
    assert role.code == 'M8S_CODE_FIXED'


def test_blocked_permissions_privilege_manipulation_denied(db):
    """Test 7 — DENY: لا يُستعمل الحقل لتحكّم غير مخوّل بالصلاحيات الفعّالة."""
    _permission('travelers:view')
    _permission('food:view')
    staff = _staff_user('m8s-blocker@nqp.gov.sd')
    client = _client_for(staff)
    target = _target('m8s-blocker-target@nqp.gov.sd')

    denied_add = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'blocked_permissions': ['travelers:view']},
        format='json',
    )
    assert denied_add.status_code == 400
    assert not target.blocked_permissions.exists()

    # استعادة صلاحية محجوبة = توسيع سلطة ⇒ شرط حمل الصلاحية نفسها.
    target.blocked_permissions.add(Permission.objects.get(code='food:view'))
    actor, _ = _holder(['users:edit'], email='m8s-unblocker@nqp.gov.sd')
    denied_remove = _client_for(actor).patch(
        f'/api/v1/auth/users/{target.id}/', {'blocked_permissions': []}, format='json',
    )
    assert denied_remove.status_code == 400
    target.refresh_from_db()
    assert list(target.blocked_permissions.values_list('code', flat=True)) == ['food:view']


def test_user_role_self_elevation_denied_on_every_surface(db):
    """Test 8 — DENY: لا تصعيد ذاتي عبر extra أو role أو RoleAssignment."""
    _permission('users:view')
    admin_role = _admin_power_role('M8S_SELF_ADMIN')
    staff = _staff_user('m8s-self-role@nqp.gov.sd')
    client = _client_for(staff)

    via_extra = client.patch(
        f'/api/v1/auth/users/{staff.id}/', {'extra_permissions': ['users:view']},
        format='json',
    )
    assert via_extra.status_code == 400

    via_role_field = client.patch(
        f'/api/v1/auth/users/{staff.id}/', {'role': admin_role.code}, format='json',
    )
    assert via_role_field.status_code == 400

    via_assignment = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(staff.id), 'role': admin_role.code, 'scope_type': ScopeType.GLOBAL},
        format='json',
    )
    assert via_assignment.status_code == 400

    staff.refresh_from_db()
    assert staff.role is None
    assert not staff.extra_permissions.exists()
    assert not RoleAssignment.objects.filter(user=staff).exists()


def test_superuser_may_perform_rbac_operations(db):
    """Test 9 — ALLOW: المشرف ينفّذ عمليات RBAC المصرّح بها."""
    _permission('travelers:view')
    root = User.objects.create_superuser(
        email='m8s-root@nqp.gov.sd', password='StrongPass123!',
    )
    client = _client_for(root)
    target = _target('m8s-root-target@nqp.gov.sd')

    created = client.post(
        '/api/v1/auth/roles/',
        {'code': 'M8S_ROOT_ROLE', 'name': 'R', 'name_ar': 'ر', 'permissions': ['travelers:view']},
        format='json',
    )
    assert created.status_code == 201

    extra = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert extra.status_code == 200

    blocked = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'blocked_permissions': ['travelers:view']},
        format='json',
    )
    assert blocked.status_code == 200

    renamed = client.patch(
        f"/api/v1/auth/roles/{Role.objects.get(code='M8S_ROOT_ROLE').id}/",
        {'code': 'M8S_ROOT_ROLE_2'}, format='json',
    )
    assert renamed.status_code == 200


def test_admin_power_holder_may_perform_permitted_rbac_operation(db):
    """Test 9b — ALLOW: حامل دور إداري يبقى مخوّلاً بالعمليات المسموحة له."""
    _permission('travelers:view')
    admin_role = Role.objects.create(code='M8S_ADMIN_HOLDER', name='Admin', name_ar='مدير')
    for code in ('users:manage', 'role_assignments:add'):
        admin_role.permissions.add(_permission(code))
    # دور فارغ + تعيين للدور الإداري: السلطة تأتي من الدور الإداري نفسه.
    holder, _ = _holder(
        [], email='m8s-admin-holder@nqp.gov.sd', is_staff=True, role_code='M8S_PLAIN_HOLDER',
    )
    RoleAssignment.objects.create(
        user=holder, role=admin_role, scope_type=ScopeType.GLOBAL,
    )
    plain = _plain_role('M8S_GRANTABLE')
    target = _target('m8s-admin-holder-target@nqp.gov.sd')
    client = _client_for(holder)

    granted_role = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'role': plain.code}, format='json',
    )
    assert granted_role.status_code == 200

    # وما لا يحمله لا يُمنح، وصلاحيات الدور الإداري لا تُلمس.
    denied_extra = client.patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert denied_extra.status_code == 400

    denied_role_edit = client.patch(
        f'/api/v1/auth/roles/{admin_role.id}/',
        {'permissions': ['users:manage', 'travelers:view']}, format='json',
    )
    assert denied_role_edit.status_code == 400


def test_admin_power_role_deletion_denied_for_non_superuser(db):
    admin_role = _admin_power_role('M8S_ADMIN_DELETE')
    staff = _staff_user('m8s-role-deleter@nqp.gov.sd')
    response = _client_for(staff).delete(f'/api/v1/auth/roles/{admin_role.id}/')
    assert response.status_code == 403
    assert Role.objects.filter(pk=admin_role.pk).exists()


def test_apply_role_requires_policy_checked(db):
    """`_apply_role` باب داخلي: يرفض العمل بلا إقرار بأن الفحصسبق."""
    from apps.accounts.serializers import UserWriteSerializer

    role = _plain_role('M8S_SIDE_DOOR')
    user = _target('m8s-side-door@nqp.gov.sd')
    with pytest.raises(RuntimeError):
        UserWriteSerializer._apply_role(user, role)
    UserWriteSerializer._apply_role(user, role, None, policy_checked=True)
    assert RoleAssignment.objects.filter(
        user=user, role=role, scope_type=ScopeType.GLOBAL,
    ).exists()


def test_rbac_mutations_are_audited(db):
    """تدقيق: منح الأدوار، حزمة صلاحيات الدور، extra/blocked."""
    _permission('travelers:view')
    root = User.objects.create_superuser(
        email='m8s-audit-root@nqp.gov.sd', password='StrongPass123!',
    )
    client = _client_for(root)
    target = _target('m8s-audit-target@nqp.gov.sd')
    plain = _plain_role('M8S_AUDIT_ROLE')

    assert client.patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    ).status_code == 200
    assert PermissionAudit.objects.filter(
        user=target, permission_code='travelers:view', action=PermissionAudit.Action.GRANT,
    ).exists()

    assert client.patch(
        f'/api/v1/auth/roles/{plain.id}/', {'permissions': ['travelers:view']}, format='json',
    ).status_code == 200
    assert PermissionAudit.objects.filter(
        user=root, permission_code='travelers:view', action=PermissionAudit.Action.GRANT,
        reason__contains='M8S_AUDIT_ROLE',
    ).exists()

    assert client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(target.id), 'role': plain.code, 'scope_type': ScopeType.GLOBAL},
        format='json',
    ).status_code == 201
    assert PermissionAudit.objects.filter(
        user=target, permission_code='role:M8S_AUDIT_ROLE', action=PermissionAudit.Action.GRANT,
    ).exists()

    assert client.patch(
        f'/api/v1/auth/users/{target.id}/', {'blocked_permissions': ['travelers:view']},
        format='json',
    ).status_code == 200
    assert PermissionAudit.objects.filter(
        user=target, permission_code='travelers:view', action=PermissionAudit.Action.DENY,
    ).exists()


def test_permission_revocation_remains_allowed_for_unprivileged_actor(db):
    """قاعدة E: سحب صلاحية خفضٌ للسلطة، فيحكمه gate الـ endpoint لا شرط الحمل."""
    _permission('travelers:view')
    staff = _staff_user('m8s-revoker@nqp.gov.sd')
    target = _target('m8s-revoker-target@nqp.gov.sd')
    target.extra_permissions.add(Permission.objects.get(code='travelers:view'))
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{target.id}/', {'extra_permissions': []}, format='json',
    )
    assert response.status_code == 200
    target.refresh_from_db()
    assert not target.extra_permissions.exists()


def test_denied_permission_mutation_writes_nothing(db):
    """الرفض لا يترك كتابة جزئية على بقية حقول PATCH."""
    _permission('travelers:view')
    staff = _staff_user('m8s-atomic-perm@nqp.gov.sd')
    target = _target('m8s-atomic-perm-target@nqp.gov.sd')
    response = _client_for(staff).patch(
        f'/api/v1/auth/users/{target.id}/',
        {'full_name': 'اسم محدَّث', 'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 400
    target.refresh_from_db()
    assert target.full_name == 'Target'
    assert not target.extra_permissions.exists()


def test_django_admin_requires_active_superuser(db):
    """Test 10 — DENY للموظف/غير النشط/العادي، ALLOW للمشرف."""
    from django.contrib import admin as django_admin
    from django.test import Client as DjangoClient
    from django.test import RequestFactory

    # زائر غير مصادَق
    assert django_admin.site.has_permission(RequestFactory().get('/admin/')) is False

    staff = User.objects.create_user(
        email='m8s-admin-staff@nqp.gov.sd', password='StrongPass123!',
        full_name='S', is_staff=True,
    )
    plain = User.objects.create_user(
        email='m8s-admin-plain@nqp.gov.sd', password='StrongPass123!', full_name='P',
    )
    inactive_staff = User.objects.create_user(
        email='m8s-admin-inactive@nqp.gov.sd', password='StrongPass123!',
        full_name='I', is_staff=True, is_active=False,
    )
    root = User.objects.create_superuser(
        email='m8s-admin-root@nqp.gov.sd', password='StrongPass123!',
    )

    django_client = DjangoClient()
    for denied_user in (staff, plain, inactive_staff):
        django_client.force_login(denied_user)
        assert django_client.get('/admin/').status_code in (302, 403), denied_user.email

    django_client.force_login(root)
    assert django_client.get('/admin/').status_code == 200
