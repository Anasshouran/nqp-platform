"""اختبارات مرادفات أسماء الصلاحيات التجارية على أكواد `resource:action`."""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment, User
from apps.ihr.models import SPARIndicator
from core.permissions import ActionPermissionMixin
from core.utils.authorization import PERMISSION_CODE_ALIASES, resolve_permission_codes

pytestmark = pytest.mark.django_db

PASSWORD = 'StrongPass123!'

TARGET_ROLES = ['DG_MANAGER', 'NATIONAL_IT_DIRECTOR', 'IHR_NFP', 'WHO_INTEGRATION_OFFICER', 'ADMIN']

REQUIRED_CANONICAL = {
    'who.integration.view': 'who_integration:view',
    'who.integration.manage': 'who_integration:edit',
    'who.integration.test_connection': 'who_integration:test',
    'who.integration.sync': 'who_integration:sync',
    'who.integration.logs.view': 'who_logs:view',
    'who.icd11.search': 'who_mappings:search',
    'who.icd11.view': 'who_diseases:view',
    'who.ihr.integration.view': 'who_integration:view',
    'ihr.events.view': 'ihr_event:view',
    'ihr.events.create': 'ihr_event:add',
    'ihr.events.update': 'ihr_event:edit',
    'ihr.events.submit': 'ihr_event:submit',
    'ihr.notifications.view': 'ihr_event:notify',
    'ihr.notifications.create': 'ihr_event:notify',
    'ihr.notifications.submit': 'ihr_event:notify',
    'ihr.communications.view': 'ihr_event:view',
    'users.view': 'users:view',
    'roles.view': 'roles:view',
    'permissions.view': 'permissions:view',
    'audit_logs.view': 'audit_log:view',
}


def make_user(email='alias@nqp.gov.sd', **extra):
    return User.objects.create_user(email=email, password=PASSWORD, full_name='Alias User', **extra)


def assign(user, role, scope_type='GLOBAL', scope_id=None, **extra):
    return RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
        assigned_by=user, **extra,
    )


def seed_permissions(*codes):
    perms = []
    for code in codes:
        resource, _, action = code.partition(':')
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
        )
        perms.append(perm)
    return perms


# ---------------------------------------------------------------------------
# الترجمة
# ---------------------------------------------------------------------------
def test_every_requested_alias_maps_to_canonical_code():
    for alias, canonical in REQUIRED_CANONICAL.items():
        assert resolve_permission_codes(alias) == (canonical,), alias


def test_bundle_aliases_require_all_components():
    assert set(resolve_permission_codes('users.manage')) == {
        'users:add', 'users:edit', 'users:delete',
    }
    assert set(resolve_permission_codes('roles.manage')) == {
        'roles:add', 'roles:edit', 'roles:delete',
    }


def test_canonical_code_passes_through_unchanged():
    assert resolve_permission_codes('who_logs:view') == ('who_logs:view',)
    assert resolve_permission_codes('ihr_event:approve') == ('ihr_event:approve',)


def test_empty_code_resolves_to_empty_tuple():
    assert resolve_permission_codes('') == ()
    assert resolve_permission_codes(None) == ()


def test_alias_targets_all_exist_in_vocabulary():
    """كل هدف في الخريطة يجب أن يكون مورداً/إجراءً معرّفاً فعلاً في الـseeder."""
    call_command('seed_rbac', verbosity=0)
    existing = set(Permission.objects.values_list('code', flat=True))
    for alias in PERMISSION_CODE_ALIASES:
        for canonical in resolve_permission_codes(alias):
            assert canonical in existing, f'{alias} -> {canonical} غير موجود'


def test_no_alias_collides_with_canonical_vocabulary():
    """لا يجوز أن يكون الاسم التجاري كوداً قائماً، وإلا التبس الدلالة."""
    call_command('seed_rbac', verbosity=0)
    existing = set(Permission.objects.values_list('code', flat=True))
    assert not (set(PERMISSION_CODE_ALIASES) & existing)


# ---------------------------------------------------------------------------
# User.can مع المرادفات
# ---------------------------------------------------------------------------
def test_can_accepts_business_alias():
    user = make_user()
    role = Role.objects.create(
        code='ALIAS_SINGLE', name='Alias Single', name_ar='alias',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(seed_permissions('who_integration:view'))
    assign(user, role)
    assert user.can('who.integration.view') is True
    assert user.can('who_integration:view') is True


def test_can_bundle_requires_every_component():
    perms = seed_permissions('users:add', 'users:edit')
    role = Role.objects.create(
        code='ALIAS_PARTIAL', name='Partial', name_ar='partial',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(perms)
    user = make_user(email='partial@nqp.gov.sd')
    assign(user, role)
    # ناقص users:delete => المرادف الحُزمي مرفوض
    assert user.can('users.manage') is False
    role.permissions.set(seed_permissions('users:add', 'users:edit', 'users:delete'))
    assert user.can('users.manage') is True


def test_blocked_alias_denies():
    user = make_user(email='blocked@nqp.gov.sd')
    role = Role.objects.create(
        code='ALIAS_BLOCKABLE', name='Blockable', name_ar='blockable',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(seed_permissions('who_logs:view'))
    assign(user, role)
    assert user.can('who.integration.logs.view') is True
    user.blocked_permissions.set(seed_permissions('who_logs:view'))
    assert user.can('who.integration.logs.view') is False


def test_extra_permission_satisfies_alias():
    user = make_user(email='extra@nqp.gov.sd')
    user.extra_permissions.set(seed_permissions('audit_log:view'))
    assert user.can('audit_logs.view') is True


def test_superuser_passes_any_alias():
    user = make_user(email='super@nqp.gov.sd', is_superuser=True)
    assert user.can('who.integration.view') is True
    assert user.can('anything.at.all') is True


def test_inactive_assignment_does_not_grant_alias():
    user = make_user(email='inactive@nqp.gov.sd')
    role = Role.objects.create(
        code='ALIAS_INACTIVE', name='Inactive', name_ar='inactive',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(seed_permissions('ihr_event:notify'))
    assign(user, role, is_active=False)
    assert user.can('ihr.notifications.create') is False


def test_expired_assignment_does_not_grant_alias():
    user = make_user(email='expired@nqp.gov.sd')
    role = Role.objects.create(
        code='ALIAS_EXPIRED', name='Expired', name_ar='expired',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(seed_permissions('who_mappings:search'))
    assign(user, role, start_date=timezone.localdate() - timezone.timedelta(days=10),
           end_date=timezone.localdate() - timezone.timedelta(days=1))
    assert user.can('who.icd11.search') is False


def test_unknown_alias_does_not_grant():
    """اسم غير معروف يُعامل كأكواد حرفي؛ لا يمنح صلاحية بالصدفة."""
    user = make_user(email='unknown@nqp.gov.sd')
    role = Role.objects.create(
        code='ALIAS_UNKNOWN', name='Unknown', name_ar='unknown',
        description='test', default_scope=RoleAssignment.ScopeType.GLOBAL,
    )
    role.permissions.set(seed_permissions('who_integration:view'))
    assign(user, role)
    assert user.can('who.integration.nonexistent') is False
    assert user.can('who.integraton.view') is False  # خطأ إملائي لا يُقبل


# ---------------------------------------------------------------------------
# خريطة الأدوار الخمسة
# ---------------------------------------------------------------------------
@pytest.fixture
def seeded_roles(db):
    call_command('seed_rbac', verbosity=0)
    return {r.code: r for r in Role.objects.filter(code__in=TARGET_ROLES)}


def test_all_five_roles_seeded(seeded_roles):
    assert set(seeded_roles) == set(TARGET_ROLES)


@pytest.mark.parametrize('alias', [
    'ihr.events.view', 'ihr.events.create', 'ihr.events.update', 'ihr.events.submit',
    'ihr.notifications.view', 'ihr.notifications.create', 'ihr.notifications.submit',
    'ihr.communications.view',
])
def test_nfp_has_all_ihr_functional_aliases(seeded_roles, alias):
    nfp = seeded_roles['IHR_NFP']
    granted = set(nfp.permissions.values_list('code', flat=True))
    for canonical in resolve_permission_codes(alias):
        assert canonical in granted, f'IHR_NFP ينقص {canonical}'


def test_nfp_denied_technical_who_operations(seeded_roles):
    """فصل المهام: NFP وظيفي، لا يملك تشغيل التكامل تقنياً."""
    granted = set(seeded_roles['IHR_NFP'].permissions.values_list('code', flat=True))
    for forbidden in ('who_integration:test', 'who_integration:sync', 'who_integration:edit'):
        assert forbidden not in granted


def test_nfp_denied_system_administration(seeded_roles):
    granted = set(seeded_roles['IHR_NFP'].permissions.values_list('code', flat=True))
    for forbidden in ('users:view', 'users:add', 'roles:view', 'permissions:view'):
        assert forbidden not in granted


def test_dg_has_ihr_approval_and_who_monitoring(seeded_roles):
    granted = set(seeded_roles['DG_MANAGER'].permissions.values_list('code', flat=True))
    for expected in ('ihr_event:view', 'ihr_event:approve', 'ihr_event:assess',
                     'who_integration:view', 'who_logs:view', 'who_logs:export',
                     'who_diseases:view', 'who_mappings:view'):
        assert expected in granted, f'DG_MANAGER ينقص {expected}'


def test_dg_denied_technical_who_operations(seeded_roles):
    granted = set(seeded_roles['DG_MANAGER'].permissions.values_list('code', flat=True))
    for forbidden in ('who_integration:test', 'who_integration:sync', 'who_diseases:sync'):
        assert forbidden not in granted


def test_it_director_has_monitoring_test_and_export(seeded_roles):
    granted = set(seeded_roles['NATIONAL_IT_DIRECTOR'].permissions.values_list('code', flat=True))
    for expected in ('who_integration:view', 'who_integration:test',
                     'who_integration:export', 'who_logs:view', 'who_logs:export',
                     'who_diseases:view', 'who_diseases:export'):
        assert expected in granted, f'NATIONAL_IT_DIRECTOR ينقص {expected}'


def test_it_director_denied_who_data_mutation(seeded_roles):
    granted = set(seeded_roles['NATIONAL_IT_DIRECTOR'].permissions.values_list('code', flat=True))
    for forbidden in ('who_integration:edit', 'who_integration:sync', 'who_diseases:edit',
                      'who_diseases:sync', 'who_mappings:approve'):
        assert forbidden not in granted


def test_it_director_denied_ihr_functional_workflow(seeded_roles):
    """الإدارة التقنية لا تملك صلاحيات IHR الوظيفية."""
    granted = set(seeded_roles['NATIONAL_IT_DIRECTOR'].permissions.values_list('code', flat=True))
    for forbidden in ('ihr_event:add', 'ihr_event:submit', 'ihr_event:approve',
                      'ihr_event:notify', 'ihr_nfp:assign'):
        assert forbidden not in granted


def test_who_officer_has_full_technical_operations(seeded_roles):
    granted = set(seeded_roles['WHO_INTEGRATION_OFFICER'].permissions.values_list('code', flat=True))
    for expected in ('who_integration:view', 'who_integration:edit', 'who_integration:test',
                     'who_integration:sync', 'who_logs:view', 'who_logs:export',
                     'who_diseases:view', 'who_diseases:sync', 'who_diseases:export',
                     'who_mappings:view', 'who_mappings:search', 'who_mappings:add'):
        assert expected in granted, f'WHO_INTEGRATION_OFFICER ينقص {expected}'


def test_who_officer_ihr_is_read_only(seeded_roles):
    """مسؤول التكامل watching أحداث IHR فقط؛ الاعتماد والإخطار bolted على NFP."""
    granted = set(seeded_roles['WHO_INTEGRATION_OFFICER'].permissions.values_list('code', flat=True))
    assert 'ihr_event:view' in granted
    for forbidden in ('ihr_event:add', 'ihr_event:submit', 'ihr_event:approve',
                      'ihr_event:notify', 'ihr_nfp:assign'):
        assert forbidden not in granted


# ---------------------------------------------------------------------------
# علة SPARIndicatorViewSet: كانت بلا ActionPermissionMixin فترفض كل غير-سوبر-USER
# ---------------------------------------------------------------------------
def test_spar_indicator_resolves_permission_action():
    from apps.ihr.views import SPARIndicatorViewSet
    assert issubclass(SPARIndicatorViewSet, ActionPermissionMixin)
    assert SPARIndicatorViewSet.permission_resource == 'ihr_spar'


def test_spar_indicator_list_allowed_with_view_permission(grant_permissions):
    SPARIndicator.objects.get_or_create(
        code='C99', defaults={'name_ar': 'مؤشر اختبار', 'order': 99},
    )
    user = User.objects.create_user(email='spar-view@nqp.gov.sd', password=PASSWORD, full_name='SPAR View')
    grant_permissions(user, 'SPAR_VIEW_ROLE', ['ihr_spar:view'])
    client = APIClient()
    resp = client.post('/api/v1/auth/login/',
                       {'email': user.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    assert client.get('/api/v1/ihr/spar/indicators/').status_code == 200


def test_spar_indicator_denied_without_permission(grant_permissions):
    user = User.objects.create_user(email='spar-none@nqp.gov.sd', password=PASSWORD, full_name='SPAR None')
    grant_permissions(user, 'SPAR_NONE_ROLE', [])
    client = APIClient()
    resp = client.post('/api/v1/auth/login/',
                       {'email': user.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    assert client.get('/api/v1/ihr/spar/indicators/').status_code == 403


def test_admin_holds_every_aliased_permission(seeded_roles):
    admin = seeded_roles['ADMIN']
    granted = set(admin.permissions.values_list('code', flat=True))
    for alias in PERMISSION_CODE_ALIASES:
        for canonical in resolve_permission_codes(alias):
            assert canonical in granted, f'ADMIN ينقص {canonical}'
