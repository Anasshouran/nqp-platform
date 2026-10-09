"""أدوات RBAC مشتركة لاختبارات صحة المطارات.

`User.can()` يعتمد `RoleAssignment` النشطة فقط ولا يعتمد `User.role` القديم،
لذلك يحتاج مفتش المطار في الاختبارات تعيينًا فعليًا يحمل صلاحيات
`airport_health:*`. وممثل شركة النقل يُبنى بدور `CARRIER` بصلاحيات الرحلات
فقط — بلا أي صلاحية على صحة المطارات — كما في `seed_rbac`.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment

PASSWORD = 'StrongPass123!'

AIRPORT_ACTIONS = ('view', 'add', 'edit')
CARRIER_FLIGHT_ACTIONS = ('view', 'add', 'edit', 'delete')


def ensure_role(code, grants, default_scope=RoleAssignment.ScopeType.GLOBAL):
    """ينشئ دوراً بصلاحيات `resource:action` المحددة إن لم يكن مبذوراً."""
    perms = []
    for resource, action in grants:
        perm, _ = Permission.objects.get_or_create(
            code=f'{resource}:{action}',
            defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code=code,
        defaults={
            'name': code,
            'name_ar': code,
            'description': 'دور اختباري لصحة المطارات',
            'default_scope': default_scope,
        },
    )
    role.permissions.set(perms)
    return role


def assign_role(user, role, *, scope_type=RoleAssignment.ScopeType.GLOBAL, scope_id=None):
    assignment, _ = RoleAssignment.objects.get_or_create(
        user=user,
        role=role,
        scope_type=scope_type,
        scope_id=scope_id,
        defaults={'assigned_by': user, 'is_active': True},
    )
    if not assignment.is_active:
        assignment.is_active = True
        assignment.save(update_fields=['is_active'])
    return assignment


def ensure_airport_role(actions=AIRPORT_ACTIONS):
    return ensure_role(
        'AIRPORT_INSPECTOR',
        [('airport_health', action) for action in actions],
    )


def assign_airport_inspector(user, *, scope_type=RoleAssignment.ScopeType.GLOBAL, scope_id=None):
    return assign_role(
        user, ensure_airport_role(), scope_type=scope_type, scope_id=scope_id
    )


def ensure_carrier_role():
    return ensure_role(
        'CARRIER',
        [('flights', action) for action in CARRIER_FLIGHT_ACTIONS],
    )


def assign_carrier_rep(user):
    return assign_role(user, ensure_carrier_role())


@pytest.fixture
def login_client():
    """ينشئ مستخدماً مسجّلاً الدخول ويعيد (APIClient مصادق، User)."""

    def factory(email, assign=None):
        user = get_user_model().objects.create_user(
            email=email, password=PASSWORD, full_name=email
        )
        if assign is not None:
            assign(user)
        client = APIClient()
        response = client.post(
            '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json'
        )
        assert response.status_code == 200, response.content
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access_token']}"
        )
        return client, user

    return factory