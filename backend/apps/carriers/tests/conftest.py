"""أدوات RBAC مشتركة لاختبارات carriers.

`User.can()` يعتمد `RoleAssignment` النشطة فقط ولا يعتمد `User.role` القديم،
لذلك ممثّل الناقل في الاختبارات يحتاج تعيينًا فعليًا لدور `CARRIER`.
"""
import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, RoleAssignment

PASSWORD = 'StrongPass123!'

CARRIER_FLIGHT_ACTIONS = ('view', 'add', 'edit', 'delete')
CARRIER_MEMBER_ACTIONS = ('view', 'add', 'edit', 'activate', 'deactivate')


def ensure_carrier_role():
    """ينشئ دور `CARRIER` بصلاحيات الرحلات إن لم يكن مبذورًا."""
    perms = []
    for action in CARRIER_FLIGHT_ACTIONS:
        code = f'flights:{action}'
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'name': f'{action} flights', 'resource': 'flights', 'action': action},
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code='CARRIER',
        defaults={
            'name': 'Carrier Representative',
            'name_ar': 'ممثل شركة نقل',
            'description': 'إدارة رحلات الشركة فقط',
            'default_scope': RoleAssignment.ScopeType.GLOBAL,
        },
    )
    role.permissions.set(perms)
    return role


def assign_carrier_role(user):
    """تعيين نشط لدور `CARRIER` للمستخدم — يماثل ما يفعله seed_carriers."""
    role = ensure_carrier_role()
    assignment, _ = RoleAssignment.objects.get_or_create(
        user=user,
        role=role,
        scope_type=RoleAssignment.ScopeType.GLOBAL,
        defaults={'assigned_by': user, 'is_active': True},
    )
    if not assignment.is_active:
        assignment.is_active = True
        assignment.save(update_fields=['is_active'])
    return assignment


def ensure_carrier_admin_role():
    """ينشئ دور `CARRIER_ADMIN` بصلاحيات العضوية إن لم يكن موجوداً."""
    perms = []
    for action in CARRIER_MEMBER_ACTIONS:
        code = f'carrier_members:{action}'
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={
                'name': f'carrier_members {action}',
                'resource': 'carrier_members',
                'action': action,
            },
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code='CARRIER_ADMIN',
        defaults={
            'name': 'Carrier Administrator',
            'name_ar': 'مدير شركة نقل',
            'description': 'إدارة أعضاء شركة النقل ضمن نطاقه',
            'default_scope': RoleAssignment.ScopeType.COMPANY,
        },
    )
    role.permissions.set(perms)
    return role


def assign_carrier_admin_role(user, carrier, *, scope_type=None):
    """تعيين CARRIER_ADMIN للمستخدم في نطاق شركة محدد (أو GLOBAL إن طُلب).

    scope_type الافتراضي COMPANY — يطابق ما يبذر seed_rbac أثناء الإعداد.
    """
    role = ensure_carrier_admin_role()
    assignment, _ = RoleAssignment.objects.get_or_create(
        user=user,
        role=role,
        scope_type=scope_type or RoleAssignment.ScopeType.COMPANY,
        scope_id=carrier.id if scope_type != RoleAssignment.ScopeType.GLOBAL else None,
        defaults={'assigned_by': user, 'is_active': True},
    )
    return assignment

@pytest.fixture
def make_login_client():
    """ينشئ مستخدمًا بكلمة مرور محددة ويعيد APIClient مصادقًا."""
    from rest_framework.test import APIClient

    def factory(email, codes=(), assign_carrier=False, **extra):
        user = get_user_model().objects.create_user(
            email=email, password=PASSWORD, full_name=email, **extra
        )
        if assign_carrier:
            assign_carrier_role(user)
        if codes and not assign_carrier:
            perms = []
            for code in codes:
                resource, _, action = code.partition(':')
                perm, _ = Permission.objects.get_or_create(
                    code=code,
                    defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
                )
                perms.append(perm)
            role = Role.objects.create(
                code=f'T_{abs(hash(email)) % 10 ** 8}',
                name='test', name_ar='اختبار', description='test',
                default_scope=RoleAssignment.ScopeType.GLOBAL,
            )
            role.permissions.set(perms)
            RoleAssignment.objects.create(
                user=user, role=role, scope_type=RoleAssignment.ScopeType.GLOBAL,
                assigned_by=user, is_active=True,
            )
        client = APIClient()
        resp = client.post('/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json')
        assert resp.status_code == 200, resp.content
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
        return client, user

    return factory
