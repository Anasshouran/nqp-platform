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
