"""مساعدات مشترك لاختبارات الفسح الغذائي.

موديول الفسح الغذائي يفرض الآن صلاحيات `food:*` عبر `FoodPermissionMixin`
(كان سابقاً `[IsAuthenticated]` فقط). لذلك يحتاج كل مستخدم اختباري دوراً
بصلاحيات `food` وربطاً بالنطاق، وإلا ردّت الواجهة 403 على منطق العمل الذي
تحاول الاختبارات تغطيته.
"""
import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, RoleAssignment, ScopeType

User = get_user_model()

# كل إجراء منطقي تم اختباره في هذا الموديول
FOOD_TEST_ACTIONS = ('view', 'add', 'edit', 'delete', 'review', 'approve', 'export')

# الأدوار التي يستخدمها ملفّات الاختبار وكيفية منحها صلاحية food
_ROLE_ACTIONS = {
    'FOOD_INSPECTOR': ('view', 'add', 'edit'),
    'FOOD_CLERK': ('view', 'add', 'edit'),
    'FOOD_REVIEWER': ('view', 'add', 'edit', 'review'),
    'FOOD_DIRECTOR': ('view', 'add', 'edit', 'delete', 'review', 'approve', 'export'),
    'FOOD_CONTROL_MANAGER': ('view', 'add', 'edit', 'delete', 'review', 'approve', 'export'),
    'STATION_HEAD': ('view', 'add', 'edit', 'review'),
    'SECTOR_HEAD': ('view', 'add', 'edit', 'review', 'approve'),
    'SECTOR_MANAGER': ('view', 'add', 'edit', 'review', 'approve'),
    'ACCOUNTANT': ('view', 'export', 'edit'),
    'LAB_RECEPTIONIST': ('view', 'add', 'edit'),
}


def _permission_codes(resource, actions):
    codes = []
    for action in actions:
        code = f'{resource}:{action}'
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
        )
        codes.append(perm)
    return codes


@pytest.fixture(autouse=True)
def _auto_grant_food_to_test_users(monkeypatch):
    """يمنح كل مستخدم يُنشأ في اختبارات هذا الموديول صلاحيات `food` كاملة.

    كُتبت هذه الاختبارات قبل فرض الصلاحيات، فتسجيل الدخول كان كافياً. بدل
    تعديل كل ملف اختبار يدوياً، نلفّ `create_user` ليمنح النطاق المطلوب
    تلقائياً. النطاق GLOBAL يعني "يرى كل المنافذ" — وهو ما تفترضه الاختبارات
    التي لا تنشئ منافذ خاصة.

    الاختبارات السلبية (مثل `test_inspector_cannot_review`) تبقى صالحة لأن
    رفضها مبني على الأدوار عبر `_can_review_food`، لا على الصلاحيات.
    """
    original = User.objects.create_user

    def create_user(*args, **kwargs):
        user = original(*args, **kwargs)
        if not user.is_superuser:
            perms = _permission_codes('food', FOOD_TEST_ACTIONS)
            role, _ = Role.objects.get_or_create(
                code='FOOD_TEST_ROLE',
                defaults={'name': 'FOOD_TEST_ROLE', 'name_ar': 'دور اختبار غذاء'},
            )
            role.permissions.add(*perms)
            RoleAssignment.objects.get_or_create(
                user=user,
                role=role,
                scope_type=ScopeType.GLOBAL,
                scope_id=None,
                defaults={'is_active': True, 'assigned_by': user},
            )
        return user

    monkeypatch.setattr(User.objects, 'create_user', create_user)


@pytest.fixture
def grant_food(db):
    """يمنح مستخدماً دوراً بصلاحيات `food` ونطاقاً (GLOBAL افتراضاً).

    الاستخدام: ``grant_food(user, 'FOOD_INSPECTOR')`` أو
    ``grant_food(user, 'FOOD_INSPECTOR', scope_type='PORT', scope_id=port.pk)``.
    """

    def _grant(user, role_code='FOOD_INSPECTOR', actions=None, scope_type=ScopeType.GLOBAL, scope_id=None):
        actions = actions or _ROLE_ACTIONS.get(role_code, FOOD_TEST_ACTIONS)
        perms = _permission_codes('food', actions)
        role, _ = Role.objects.get_or_create(
            code=role_code,
            defaults={'name': role_code, 'name_ar': role_code, 'description': 'دور اختباري'},
        )
        role.permissions.add(*perms)
        assignment, _ = RoleAssignment.objects.get_or_create(
            user=user,
            role=role,
            scope_type=scope_type,
            scope_id=scope_id,
            defaults={'is_active': True, 'assigned_by': user},
        )
        return role, assignment

    return _grant


@pytest.fixture
def food_user(grant_food):
    """ينشئ مستخدماً مصادقاً بصلاحيات `food` ونطاق عالمي."""

    def _make(email='food.user@nqp.gov.sd', role_code='FOOD_INSPECTOR', **kwargs):
        user = User.objects.create_user(
            email=email, password='StrongPass123!', full_name=kwargs.pop('full_name', 'مستخدم أغذية'), **kwargs
        )
        grant_food(user, role_code)
        return user

    return _make
