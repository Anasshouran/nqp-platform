import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment, PermissionAudit

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def staff_client():
    admin = User.objects.create_user(
        email='rbac-admin@nqp.gov.sd', password='StrongPass123!',
        full_name='RBAC Admin', is_staff=True,
    )
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': admin.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


@pytest.fixture
def regular_client():
    user = User.objects.create_user(
        email='rbac-user@nqp.gov.sd', password='StrongPass123!', full_name='RBAC User'
    )
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


@pytest.fixture
def travelers_view():
    return Permission.objects.create(
        code='travelers:view', name='عرض المسافرين', resource='travelers', action='view'
    )


@pytest.fixture
def travelers_add():
    return Permission.objects.create(
        code='travelers:add', name='إضافة مسافرين', resource='travelers', action='add'
    )


@pytest.fixture
def food_view():
    return Permission.objects.create(
        code='food:view', name='عرض الغذاء', resource='food', action='view'
    )


def test_permissions_require_admin(regular_client):
    response = regular_client.get('/api/v1/auth/permissions/')
    assert response.status_code == 403


def test_roles_require_admin(regular_client):
    response = regular_client.get('/api/v1/auth/roles/')
    assert response.status_code == 403


def test_list_permissions(staff_client, travelers_view):
    response = staff_client.get('/api/v1/auth/permissions/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    perm = payload['results'][0]
    assert perm['code'] == 'travelers:view'


def test_permission_tree_groups_by_resource(staff_client, travelers_view):
    Permission.objects.create(
        code='food:add', name='إضافة طعام', resource='food', action='add'
    )
    response = staff_client.get('/api/v1/auth/permissions/tree/')
    assert response.status_code == 200
    tree = response.data['data']
    assert set(tree.keys()) == {'travelers', 'food'}
    assert tree['travelers'][0]['code'] == 'travelers:view'


def test_create_role_with_permissions(staff_client, travelers_view):
    response = staff_client.post(
        '/api/v1/auth/roles/',
        {
            'code': 'TRAVEL_OFFICER',
            'name': 'Travel Officer',
            'name_ar': 'موظف المسافرين',
            'permissions': ['travelers:view'],
        },
        format='json',
    )
    assert response.status_code == 201
    role = Role.objects.get(code='TRAVEL_OFFICER')
    assert list(role.permissions.values_list('code', flat=True)) == ['travelers:view']
    assert response.data['data']['permission_count'] == 1


def test_update_role_permissions(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    Permission.objects.create(
        code='users:view', name='عرض المستخدمين', resource='users', action='view'
    )
    response = staff_client.patch(
        f'/api/v1/auth/roles/{role.id}/', {'permissions': ['users:view']}, format='json'
    )
    assert response.status_code == 200
    role.refresh_from_db()
    assert list(role.permissions.values_list('code', flat=True)) == ['users:view']


def test_role_serializer_includes_user_count(staff_client, db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    User.objects.create_user(
        email='officer@nqp.gov.sd', password='StrongPass123!',
        full_name='Officer', role=role,
    )
    response = staff_client.get('/api/v1/auth/roles/')
    results = response.json()['data']['results']
    item = next(r for r in results if r['code'] == 'PORT_OFFICER')
    assert item['user_count'] == 1


def test_delete_role(staff_client, db):
    role = Role.objects.create(code='TMP_ROLE', name='Tmp', name_ar='مؤقت')
    response = staff_client.delete(f'/api/v1/auth/roles/{role.id}/')
    assert response.status_code == 204
    assert not Role.objects.filter(code='TMP_ROLE').exists()


def test_role_create_with_default_scope(staff_client, db):
    response = staff_client.post(
        '/api/v1/auth/roles/',
        {'code': 'STATION_HEAD', 'name': 'Station Head', 'name_ar': 'رئيس محطة', 'default_scope': 'STATION'},
        format='json',
    )
    assert response.status_code == 201
    assert response.data['data']['default_scope'] == 'STATION'
    role = Role.objects.get(code='STATION_HEAD')
    assert role.default_scope == 'STATION'


def test_role_serializer_includes_default_scope(staff_client, db):
    role = Role.objects.create(
        code='DEPT_MANAGER', name='Dept Manager', name_ar='مدير إدارة', default_scope='DEPARTMENT'
    )
    response = staff_client.get(f'/api/v1/auth/roles/{role.id}/')
    assert response.data['default_scope'] == 'DEPARTMENT'


def test_role_default_scope_defaults_to_global(staff_client, db):
    role = Role.objects.create(code='DEFAULT_SCOPE', name='Default', name_ar='افتراضي')
    assert role.default_scope == 'GLOBAL'


def test_delete_role_with_users_is_blocked(staff_client, db):
    role = Role.objects.create(code='USED_ROLE', name='Used', name_ar='مستخدم')
    User.objects.create_user(
        email='used@nqp.gov.sd', password='StrongPass123!',
        full_name='Used', role=role,
    )
    response = staff_client.delete(f'/api/v1/auth/roles/{role.id}/')
    assert response.status_code == 400


def test_assign_role_to_user(staff_client, db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    user = User.objects.create_user(
        email='assign@nqp.gov.sd', password='StrongPass123!', full_name='Assign'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/', {'role': 'PORT_OFFICER'}, format='json'
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.role.code == 'PORT_OFFICER'
    assert response.data['data']['role'] == 'PORT_OFFICER'
    assert response.data['data']['role_id'] == str(role.id)


def test_assign_extra_permissions_to_user(staff_client, travelers_view):
    user = User.objects.create_user(
        email='extra@nqp.gov.sd', password='StrongPass123!', full_name='Extra'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert list(user.extra_permissions.values_list('code', flat=True)) == ['travelers:view']
    assert 'travelers:view' in response.data['data']['permissions']


# --- RoleAssignment Tests ---


def test_create_role_assignment(staff_client, travelers_view, db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='assign-r@nqp.gov.sd', password='StrongPass123!', full_name='Assign R'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {
            'user': str(user.id),
            'role': 'PORT_OFFICER',
            'scope_type': 'GLOBAL',
        },
        format='json',
    )
    assert response.status_code == 201
    data = response.data['data']
    assert data['role_code'] == 'PORT_OFFICER'
    assert data['user_email'] == 'assign-r@nqp.gov.sd'
    assert data['scope_type'] == 'GLOBAL'
    assert data['is_active'] is True


def test_role_assignment_is_current(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    user = User.objects.create_user(
        email='current@nqp.gov.sd', password='StrongPass123!', full_name='Current'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {
            'user': str(user.id),
            'role': 'TEST_ROLE',
            'start_date': str(timezone.now().date()),
        },
        format='json',
    )
    assert response.status_code == 201
    assert response.data['data']['is_current'] is True


def test_duplicate_role_assignment_is_rejected(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    user = User.objects.create_user(
        email='dup@nqp.gov.sd', password='StrongPass123!', full_name='Dup'
    )
    staff_client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'TEST_ROLE', 'scope_type': 'GLOBAL'},
        format='json',
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'TEST_ROLE', 'scope_type': 'GLOBAL'},
        format='json',
    )
    assert response.status_code == 400


def test_list_role_assignments(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    user = User.objects.create_user(
        email='list-r@nqp.gov.sd', password='StrongPass123!', full_name='List R'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    response = staff_client.get('/api/v1/auth/role-assignments/')
    assert response.status_code == 200
    results = response.json()['data']['results']
    assert len(results) >= 1


def test_delete_role_assignment(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    user = User.objects.create_user(
        email='del-r@nqp.gov.sd', password='StrongPass123!', full_name='Del R'
    )
    assignment = RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    response = staff_client.delete(f'/api/v1/auth/role-assignments/{assignment.id}/')
    assert response.status_code == 204
    assert not RoleAssignment.objects.filter(id=assignment.id).exists()


# --- User.can() Tests ---


def test_superuser_can_anything(db):
    admin = User.objects.create_superuser(
        email='super@nqp.gov.sd', password='StrongPass123!', full_name='Super'
    )
    assert admin.can('travelers:view') is True
    assert admin.can('nonexistent:perm') is True


def test_user_can_via_role_assignment(staff_client, travelers_view, db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='can-r@nqp.gov.sd', password='StrongPass123!', full_name='Can R'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    assert user.can('travelers:view') is True
    assert user.can('food:view') is False


def test_user_can_via_extra_permissions(staff_client, travelers_view, db):
    user = User.objects.create_user(
        email='can-e@nqp.gov.sd', password='StrongPass123!', full_name='Can E'
    )
    user.extra_permissions.add(travelers_view)
    assert user.can('travelers:view') is True


def test_blocked_permission_overrides_extra(staff_client, travelers_view, db):
    user = User.objects.create_user(
        email='blocked@nqp.gov.sd', password='StrongPass123!', full_name='Blocked'
    )
    user.extra_permissions.add(travelers_view)
    user.blocked_permissions.add(travelers_view)
    assert user.can('travelers:view') is False


def test_blocked_permission_overrides_role(staff_client, travelers_view, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='blocked-r@nqp.gov.sd', password='StrongPass123!', full_name='Blocked R'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    user.blocked_permissions.add(travelers_view)
    assert user.can('travelers:view') is False


def test_effective_permission_codes(staff_client, travelers_view, food_view, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='eff@nqp.gov.sd', password='StrongPass123!', full_name='Eff'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    user.extra_permissions.add(food_view)
    codes = user.effective_permission_codes()
    assert 'travelers:view' in codes
    assert 'food:view' in codes


def test_expired_assignment_not_effective(staff_client, travelers_view, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='expired@nqp.gov.sd', password='StrongPass123!', full_name='Expired'
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='GLOBAL',
        start_date='2020-01-01', end_date='2020-12-31',
    )
    assert user.can('travelers:view') is False


# --- UserViewSet new endpoints ---


def test_user_effective_permissions_endpoint(staff_client, travelers_view, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='ep-end@nqp.gov.sd', password='StrongPass123!', full_name='EP End'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    response = staff_client.get(f'/api/v1/auth/users/{user.id}/effective-permissions/')
    assert response.status_code == 200
    assert 'travelers:view' in response.data['data']


def test_user_serializer_includes_blocked_permissions(staff_client, travelers_view, db):
    user = User.objects.create_user(
        email='ser-bp@nqp.gov.sd', password='StrongPass123!', full_name='Ser BP'
    )
    user.blocked_permissions.add(travelers_view)
    response = staff_client.get(f'/api/v1/auth/users/{user.id}/')
    assert response.status_code == 200
    data = response.data.get('data', response.data)
    assert 'travelers:view' in data['blocked_permissions']


def test_user_serializer_includes_role_assignments(staff_client, db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    user = User.objects.create_user(
        email='ser-ra@nqp.gov.sd', password='StrongPass123!', full_name='Ser RA'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    response = staff_client.get(f'/api/v1/auth/users/{user.id}/')
    assert response.status_code == 200
    data = response.data.get('data', response.data)
    assert len(data['role_assignments']) >= 1


def test_assign_blocked_permissions_to_user(staff_client, travelers_view):
    user = User.objects.create_user(
        email='blocked-a@nqp.gov.sd', password='StrongPass123!', full_name='Blocked A'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/',
        {'blocked_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert list(user.blocked_permissions.values_list('code', flat=True)) == ['travelers:view']


# --- مصدر الحقيقة: RoleAssignment مقابل حقل user.role القديم ---


def test_role_fk_without_assignment_grants_nothing(db, travelers_view):
    role = Role.objects.create(code='FK_ONLY', name='FK Only', name_ar='حقل فقط')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='fk@nqp.gov.sd', password='StrongPass123!', full_name='FK', role=role,
    )
    # الحقل وحده لا يمنح صلاحيات — التعيين هو المصدر
    assert user.can('travelers:view') is False
    # لكن role_code يعود للحقل القديم احتياطاً
    assert user.role_code == 'FK_ONLY'


def test_role_code_derived_from_assignment_over_fk(db):
    fk_role = Role.objects.create(code='FK_ROLE', name='FK', name_ar='حقل')
    assign_role = Role.objects.create(code='ASSIGN_ROLE', name='Assign', name_ar='تعيين')
    user = User.objects.create_user(
        email='derived@nqp.gov.sd', password='StrongPass123!', full_name='Derived', role=fk_role,
    )
    RoleAssignment.objects.create(user=user, role=assign_role, scope_type='GLOBAL')
    assert user.role_code == 'ASSIGN_ROLE'


def test_patch_user_role_creates_assignment_and_grants(staff_client, db, travelers_view):
    role = Role.objects.create(code='GRA', name='Grant', name_ar='منح')
    role.permissions.add(travelers_view)
    user = User.objects.create_user(
        email='gra@nqp.gov.sd', password='StrongPass123!', full_name='Grant'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/', {'role': 'GRA'}, format='json'
    )
    assert response.status_code == 200
    # المرآة: إنشاء تعيين GLOBAL مع كتابة الحقل
    assert user.role_assignments.filter(role=role, scope_type='GLOBAL', is_active=True).exists()
    user.refresh_from_db()
    assert user.role.code == 'GRA'
    assert user.can('travelers:view') is True


def test_food_quarantine_has_role_via_assignment_only(db):
    from apps.food_quarantine.views import _has_role

    role = Role.objects.create(code='FOOD_MANAGER', name='FM', name_ar='مدير')
    user = User.objects.create_user(
        email='fh@nqp.gov.sd', password='StrongPass123!', full_name='FH'
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    assert _has_role(user, 'FOOD_MANAGER') is True
    assert _has_role(user, 'UNKNOWN_ROLE') is False


# --- بوابة الإدارة الدقيقة (AdminOrPermissionAction) ---


def _non_staff_client_with_permission(code):
    resource, action = code.split(':')
    Permission.objects.get_or_create(
        code=code, defaults={'name': code, 'resource': resource, 'action': action},
    )
    role = Role.objects.create(code=f'GRANTED_{resource.upper()}', name='G', name_ar='مُصرّح')
    role.permissions.add(Permission.objects.get(code=code))
    user = User.objects.create_user(
        email=f'granted-{resource}@nqp.gov.sd', password='StrongPass123!',
        full_name='Granted', is_staff=False,
    )
    RoleAssignment.objects.create(user=user, role=role, scope_type='GLOBAL')
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def test_non_staff_with_users_add_can_create_user(db):
    client = _non_staff_client_with_permission('users:add')
    response = client.post(
        '/api/v1/auth/users/',
        {'email': 'new-granted@nqp.gov.sd', 'full_name': 'New', 'password': 'StrongPass123!'},
        format='json',
    )
    assert response.status_code == 201
    assert User.objects.filter(email='new-granted@nqp.gov.sd').exists()


def test_non_staff_users_view_cannot_reset_password(db):
    client = _non_staff_client_with_permission('users:view')
    target = User.objects.create_user(
        email='reset-t@nqp.gov.sd', password='StrongPass123!', full_name='T'
    )
    response = client.post(
        f'/api/v1/auth/users/{target.id}/reset-password/',
        {'password': 'StrongPass123!'}, format='json',
    )
    assert response.status_code == 403


def test_non_staff_without_users_perm_denied(db):
    user = User.objects.create_user(
        email='plain@nqp.gov.sd', password='StrongPass123!', full_name='Plain'
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    assert client.get('/api/v1/auth/users/').status_code == 403
    assert client.post('/api/v1/auth/users/', {
        'email': 'x@nqp.gov.sd', 'full_name': 'X', 'password': 'StrongPass123!',
    }, format='json').status_code == 403


def test_permission_view_denied_for_non_staff_without_permission(db):
    user = User.objects.create_user(
        email='perm-plain@nqp.gov.sd', password='StrongPass123!', full_name='PP'
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    assert client.get('/api/v1/auth/permissions/').status_code == 403
    assert client.get('/api/v1/auth/permissions/tree/').status_code == 403


# --- سلامة النطاقات ---


def test_role_assignment_scope_defaults_to_global(staff_client, db):
    role = Role.objects.create(code='SCOPE_G', name='S', name_ar='س')
    user = User.objects.create_user(
        email='sg@nqp.gov.sd', password='x', full_name='S'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'SCOPE_G'},
        format='json',
    )
    assert response.status_code == 201
    assert response.data['data']['scope_type'] == 'GLOBAL'


def test_role_assignment_default_scope_follows_role(staff_client, db):
    role = Role.objects.create(
        code='SCOPE_S', name='S', name_ar='س', default_scope='SECTOR'
    )
    user = User.objects.create_user(
        email='ss@nqp.gov.sd', password='x', full_name='S'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'SCOPE_S'},
        format='json',
    )
    assert response.status_code == 400
    assert 'scope_id' in response.json()


def test_role_assignment_rejects_unit_scope(staff_client, db):
    role = Role.objects.create(code='SCOPE_U', name='S', name_ar='س')
    user = User.objects.create_user(
        email='su@nqp.gov.sd', password='x', full_name='S'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'SCOPE_U', 'scope_type': 'UNIT'},
        format='json',
    )
    assert response.status_code == 400


def test_global_assignment_forces_scope_id_none(staff_client, db):
    import uuid

    role = Role.objects.create(code='SCOPE_N', name='S', name_ar='س')
    user = User.objects.create_user(
        email='sn@nqp.gov.sd', password='x', full_name='S'
    )
    response = staff_client.post(
        '/api/v1/auth/role-assignments/',
        {
            'user': str(user.id), 'role': 'SCOPE_N',
            'scope_type': 'GLOBAL', 'scope_id': str(uuid.uuid4()),
        },
        format='json',
    )
    assert response.status_code == 201
    assert response.data['data']['scope_id'] is None


# --- تغطية البذر (يرجع الكود لتعريف الأدوار كمرجع) ---


def test_all_referenced_permission_codes_are_covered(db):
    from apps.accounts.management.commands import seed_iam_roles, seed_rbac
    from apps.finance.management.commands.seed_finance_rbac import FINANCE_PERMISSIONS

    expected = set()
    for res in seed_rbac.RESOURCES:
        actions = {**seed_rbac.ACTIONS, **seed_rbac.EXTRA_ACTIONS.get(res, {})}
        expected.update(f'{res}:{a}' for a in actions)
    expected.update(code for code, *_rest in FINANCE_PERMISSIONS)

    uncovered = []
    for role_def in seed_rbac.ROLES:
        ref = set(seed_rbac.resolve_permission_codes(role_def['resources']))
        if ref - expected:
            uncovered.append(f"seed_rbac/{role_def['code']}: {sorted(ref - expected)}")
    for code, data in seed_iam_roles.ROLES.items():
        ref = set(data['permissions'])
        if ref - expected:
            uncovered.append(f'seed_iam_roles/{code}: {sorted(ref - expected)}')
    assert uncovered == [], 'صلاحيات مرجعية بلا مصدر بذر:\n' + '\n'.join(uncovered)
