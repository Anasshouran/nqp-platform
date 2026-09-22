import pytest

from apps.accounts.models import Permission, Role, RoleAssignment


@pytest.fixture
def grant_permissions(db):
    """يمنح المستخدم صلاحيات عبر دور اختبار وتعيين نطاق (يُستخدم لفرض مصفوفة الصلاحيات)."""

    def _grant(user, role_code='TEST_ROLE', codes=(), scope_type='GLOBAL', scope_id=None):
        perms = []
        for code in codes:
            resource, _, action = code.partition(':')
            perm, _ = Permission.objects.get_or_create(
                code=code,
                defaults={
                    'name': f'{action} {resource}',
                    'resource': resource,
                    'action': action,
                },
            )
            perms.append(perm)
        role, _ = Role.objects.get_or_create(
            code=role_code,
            defaults={
                'name': role_code,
                'name_ar': role_code,
                'description': 'دور اختبار',
                'default_scope': scope_type,
            },
        )
        if perms:
            role.permissions.add(*perms)
        assignment, _ = RoleAssignment.objects.get_or_create(
            user=user,
            role=role,
            scope_type=scope_type,
            scope_id=scope_id,
            defaults={
                'is_active': True,
                'assigned_by': user,
            },
        )
        return role, assignment

    return _grant