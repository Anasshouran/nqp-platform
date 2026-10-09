import uuid

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment, PermissionAudit, ScopeType

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


def _staff_client_holding(*role_codes):
    """عميل موظف يحمل الأدوار المطلوب منحها بتعيين GLOBAL (تفويض قائم منذ M8-S)."""
    import uuid

    user = User.objects.create_user(
        email=f'rbac-grantor-{uuid.uuid4().hex[:8]}@nqp.gov.sd',
        password='StrongPass123!', full_name='Grantor', is_staff=True,
    )
    for code in role_codes:
        RoleAssignment.objects.create(
            user=user, role=Role.objects.get(code=code), scope_type=ScopeType.GLOBAL,
        )
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'}, format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


def _client_with_permissions(email, codes, is_staff=False):
    """عميل يحمل الصلاحيات عبر دور وتعيين نشط (مصدر الحقيقة)، بغير اعتماد على is_staff."""
    user = User.objects.create_user(
        email=email, password='StrongPass123!', full_name='Holder', is_staff=is_staff,
    )
    role = Role.objects.create(
        code=f'HOLDER_{user.id.hex[:8].upper()}', name='Holder', name_ar='حامل',
    )
    for code in codes:
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(
            code=code, defaults={'name': code, 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    RoleAssignment.objects.create(user=user, role=role, scope_type=ScopeType.GLOBAL)
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': email, 'password': 'StrongPass123!'}, format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client, user


def test_create_role_with_permissions_denied_for_unprivileged_staff(staff_client, travelers_view):
    """حدود أمنية (M8-S): `is_staff` وحده لا يمنح إنشاء دور يحمل صلاحية لا يحملها الفاعل."""
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
    assert response.status_code == 400
    assert not Role.objects.filter(code='TRAVEL_OFFICER').exists()


def test_create_role_with_permissions_allowed_for_capability_holder(db, travelers_view):
    """الطرف المخوّل يبني الدور من صلاحياته هو، مع إبقاء راية is_staff بلا دور."""
    client, _ = _client_with_permissions('rbac-role-maker@nqp.gov.sd', ['roles:add', 'travelers:view'])
    response = client.post(
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


def test_update_role_permissions_denied_for_unprivileged_staff(staff_client, db):
    """حدود أمنية (M8-S): لا يُبنى دور من صلاحيات لا يحملها الفاعل (users:view هنا)."""
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    Permission.objects.create(
        code='users:view', name='عرض المستخدمين', resource='users', action='view'
    )
    response = staff_client.patch(
        f'/api/v1/auth/roles/{role.id}/', {'permissions': ['users:view']}, format='json'
    )
    assert response.status_code == 400
    assert list(role.permissions.values_list('code', flat=True)) == []


def test_update_role_permissions_allowed_for_capability_holder(db, travelers_view):
    client, _ = _client_with_permissions('rbac-role-editor@nqp.gov.sd', ['roles:edit', 'travelers:view'])
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    response = client.patch(
        f'/api/v1/auth/roles/{role.id}/', {'permissions': ['travelers:view']}, format='json'
    )
    assert response.status_code == 200
    assert list(role.permissions.values_list('code', flat=True)) == ['travelers:view']


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


def test_assign_role_to_user(db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    staff_client = _staff_client_holding('PORT_OFFICER')
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


def test_assign_extra_permissions_denied_for_unprivileged_staff(staff_client, travelers_view):
    """حدود أمنية (M8-S): لا يُمنح `extra_permissions` لمن لا يحمل الصلاحية.

    الاختبار القديم كان يثبّت السلوك غير المحمي (موظف بلا صلاحيات يمنح
    `travelers:view`)، فصار الآن اختبار رفض صريح.
    """
    user = User.objects.create_user(
        email='extra@nqp.gov.sd', password='StrongPass123!', full_name='Extra'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 400
    user.refresh_from_db()
    assert list(user.extra_permissions.values_list('code', flat=True)) == []


def test_assign_extra_permissions_allowed_for_capability_holder(db, travelers_view):
    client, _ = _client_with_permissions('rbac-granter@nqp.gov.sd', ['users:edit', 'travelers:view'])
    user = User.objects.create_user(
        email='extra-ok@nqp.gov.sd', password='StrongPass123!', full_name='Extra OK'
    )
    response = client.patch(
        f'/api/v1/auth/users/{user.id}/', {'extra_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert list(user.extra_permissions.values_list('code', flat=True)) == ['travelers:view']
    assert 'travelers:view' in response.data['data']['permissions']


# --- RoleAssignment Tests ---


def test_create_role_assignment(travelers_view, db):
    role = Role.objects.create(code='PORT_OFFICER', name='Port Officer', name_ar='موظف المنفذ')
    role.permissions.add(travelers_view)
    staff_client = _staff_client_holding('PORT_OFFICER')
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


def test_role_assignment_is_current(db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    staff_client = _staff_client_holding('TEST_ROLE')
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


def test_duplicate_role_assignment_is_rejected(db):
    role = Role.objects.create(code='TEST_ROLE', name='Test', name_ar='اختبار')
    staff_client = _staff_client_holding('TEST_ROLE')
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


def test_assign_blocked_permissions_denied_for_unprivileged_staff(staff_client, travelers_view):
    """حدود أمنية (M8-S): `blocked_permissions` تحكّم بالصلاحيات الفعّالة، فمكترِسة بلا حمل."""
    user = User.objects.create_user(
        email='blocked-a@nqp.gov.sd', password='StrongPass123!', full_name='Blocked A'
    )
    response = staff_client.patch(
        f'/api/v1/auth/users/{user.id}/',
        {'blocked_permissions': ['travelers:view']},
        format='json',
    )
    assert response.status_code == 400
    user.refresh_from_db()
    assert list(user.blocked_permissions.values_list('code', flat=True)) == []


def test_assign_blocked_permissions_allowed_for_capability_holder(db, travelers_view):
    client, _ = _client_with_permissions('rbac-blocker@nqp.gov.sd', ['users:edit', 'travelers:view'])
    user = User.objects.create_user(
        email='blocked-ok@nqp.gov.sd', password='StrongPass123!', full_name='Blocked OK'
    )
    response = client.patch(
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


def test_patch_user_role_creates_assignment_and_grants(db, travelers_view):
    role = Role.objects.create(code='GRA', name='Grant', name_ar='منح')
    role.permissions.add(travelers_view)
    staff_client = _staff_client_holding('GRA')
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


def test_role_assignment_scope_defaults_to_global(db):
    role = Role.objects.create(code='SCOPE_G', name='S', name_ar='س')
    staff_client = _staff_client_holding('SCOPE_G')
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


def test_global_assignment_forces_scope_id_none(db):
    import uuid

    role = Role.objects.create(code='SCOPE_N', name='S', name_ar='س')
    staff_client = _staff_client_holding('SCOPE_N')
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


# --- Phase 1C-B: invariant GLOBAL -> scope_id = NULL ------------------------


def _grant(role_code, target, scope_type, scope_id=None, *, also_hold=None):
    """Assign ``role_code`` to ``target`` through the API.

    ``also_hold`` grants the granter the very scope being delegated — a granter
    only holds what ``check_grant_capability`` can verify, so a scoped grant
    needs a granter that already covers that scope.
    """
    if also_hold is not None:
        holder_type, holder_id = also_hold
        granter = User.objects.create_user(
            email=f'rbac-grantor-{uuid.uuid4().hex[:8]}@nqp.gov.sd',
            password='StrongPass123!', full_name='ScopedGrantor', is_staff=True,
        )
        RoleAssignment.objects.create(
            user=granter, role=Role.objects.get(code=role_code),
            scope_type=holder_type, scope_id=holder_id,
        )
        client = APIClient()
        resp = client.post(
            '/api/v1/auth/login/',
            {'email': granter.email, 'password': 'StrongPass123!'}, format='json',
        )
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}"
        )
    else:
        client = _staff_client_holding(role_code)

    payload = {'user': str(target.id), 'role': role_code, 'scope_type': scope_type}
    if scope_id is not None:
        payload['scope_id'] = str(scope_id)
    return client, client.post(
        '/api/v1/auth/role-assignments/', payload, format='json',
    )


def test_global_assignment_with_null_scope_id_succeeds(db):
    """Case A: GLOBAL + null -> success, stored with no scope."""
    Role.objects.create(code='GC_A', name='A', name_ar='أ')
    user = User.objects.create_user(email='gca@nqp.gov.sd', password='x', full_name='A')
    _, res = _grant('GC_A', user, 'GLOBAL')
    assert res.status_code == 201
    assert res.data['data']['scope_id'] is None
    assert RoleAssignment.objects.get(user=user).scope_id is None


def test_global_assignment_with_supplied_scope_id_normalises(db):
    """Case B: GLOBAL + supplied scope_id -> normalised to NULL, not rejected.

    Normalising (rather than 400-ing) matches the documented contract that
    GLOBAL is always scope_id=null, and keeps the API forgiving of clients that
    echo back a previously supplied id.
    """
    Role.objects.create(code='GC_B', name='B', name_ar='ب')
    user = User.objects.create_user(email='gcb@nqp.gov.sd', password='x', full_name='B')
    _, res = _grant('GC_B', user, 'GLOBAL', scope_id=uuid.uuid4())
    assert res.status_code == 201
    assert res.data['data']['scope_id'] is None


def test_global_normalisation_happens_before_capability_check(db):
    """Capability validation must only ever see the normalised scope.

    ``check_grant_capability`` treats ``scope_type='GLOBAL'`` as a global grant
    and ignores ``scope_id`` entirely, so a stale client id is not itself a
    privilege-escalation vector. The invariant that matters is that the value
    is normalised *before* validation and before persistence, so the stored
    assignment can never disagree with what was authorised.
    """
    Role.objects.create(code='GC_CAP', name='C', name_ar='ج')
    granter = User.objects.create_user(
        email='gcc@nqp.gov.sd', password='StrongPass123!', full_name='G', is_staff=True,
    )
    RoleAssignment.objects.create(
        user=granter, role=Role.objects.get(code='GC_CAP'),
        scope_type=ScopeType.GLOBAL, is_active=True,
    )

    # Whatever the client sent, the persisted row holds no scope id.
    user = User.objects.create_user(email='gcc2@nqp.gov.sd', password='x', full_name='T')
    _, res = _grant('GC_CAP', user, 'GLOBAL', scope_id=uuid.uuid4())
    assert res.status_code == 201
    assert res.data['data']['scope_id'] is None
    assert RoleAssignment.objects.get(user=user).scope_id is None


def test_global_grant_denied_without_global_coverage(db):
    """No escalation in the other direction: a port-scoped actor cannot mint GLOBAL."""
    from apps.masterdata.models import EntryPoint, Sector, State
    from apps.organization.models import Sector as OrgSector

    Role.objects.create(code='GC_NOG', name='N', name_ar='ن')
    org = OrgSector.objects.create(code='GC_ORG3', name_ar='قطاع٣')
    sector = Sector.objects.create(code='GC_SEA3', name_ar='بحري٣')
    state = State.objects.create(code='GC_ST3', name_ar='ولاية٣', sector=sector)
    ep = EntryPoint.objects.create(
        code='GC_EP3', name_ar='منفذ٣', kind='SEAPORT', state=state, sector=org,
    )
    actor = User.objects.create_user(
        email='gcnog@nqp.gov.sd', password='StrongPass123!', full_name='P', is_staff=True,
    )
    RoleAssignment.objects.create(
        user=actor, role=Role.objects.get(code='GC_NOG'),
        scope_type=ScopeType.PORT, scope_id=ep.id,
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': actor.email, 'password': 'StrongPass123!'}, format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")

    user = User.objects.create_user(email='gcnog2@nqp.gov.sd', password='x', full_name='T')
    res = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'GC_NOG', 'scope_type': 'GLOBAL'}, format='json',
    )
    assert res.status_code == 400
    assert not RoleAssignment.objects.filter(user=user).exists()


def test_company_scope_assignment_is_valid(db):
    """Case C: COMPANY scope resolves against carriers.Carrier."""
    from apps.carriers.models import Carrier

    Role.objects.create(code='GC_CO', name='D', name_ar='د')
    carrier = Carrier.objects.create(name='ProbeCo', company_type='MARITIME')
    user = User.objects.create_user(email='gco@nqp.gov.sd', password='x', full_name='D')
    _, res = _grant('GC_CO', user, 'COMPANY', scope_id=carrier.id,
                    also_hold=(ScopeType.COMPANY, carrier.id))
    assert res.status_code == 201, res.data
    assert res.data['data']['scope_id'] == str(carrier.id)
    assert RoleAssignment.objects.get(user=user).scope_type == ScopeType.COMPANY


def test_company_scope_rejects_unknown_company(db):
    Role.objects.create(code='GC_CO2', name='E', name_ar='ه')
    user = User.objects.create_user(email='gco2@nqp.gov.sd', password='x', full_name='E')
    _, res = _grant('GC_CO2', user, 'COMPANY', scope_id=uuid.uuid4(),
                     also_hold=(ScopeType.COMPANY, uuid.uuid4()))
    assert res.status_code == 400


def test_port_scope_assignment_still_valid(db):
    """Case D: PORT scope resolves against masterdata.EntryPoint."""
    Role.objects.create(code='GC_PORT', name='F', name_ar='ف')
    from apps.masterdata.models import EntryPoint, Sector, State
    from apps.organization.models import Sector as OrgSector

    org = OrgSector.objects.create(code='GC_ORG', name_ar='قطاع')
    sector = Sector.objects.create(code='GC_SEA', name_ar='بحري')
    state = State.objects.create(code='GC_ST', name_ar='ولاية', sector=sector)
    ep = EntryPoint.objects.create(
        code='GC_EP', name_ar='منفذ', kind='SEAPORT', state=state, sector=org,
    )
    user = User.objects.create_user(email='gport@nqp.gov.sd', password='x', full_name='F')
    _, res = _grant('GC_PORT', user, 'PORT', scope_id=ep.id,
                    also_hold=(ScopeType.PORT, ep.id))
    assert res.status_code == 201, res.data
    assert res.data['data']['scope_id'] == str(ep.id)


def test_company_scope_does_not_become_global(db):
    """No scope widening: COMPANY stays COMPANY after normalisation."""
    from apps.carriers.models import Carrier

    Role.objects.create(code='GC_NOUP', name='G', name_ar='ح')
    carrier = Carrier.objects.create(name='ProbeCo2', company_type='MARITIME')
    user = User.objects.create_user(email='gnoup@nqp.gov.sd', password='x', full_name='G')
    _, res = _grant('GC_NOUP', user, 'COMPANY', scope_id=carrier.id,
                    also_hold=(ScopeType.COMPANY, carrier.id))
    assert res.status_code == 201
    stored = RoleAssignment.objects.get(user=user)
    assert stored.scope_type == ScopeType.COMPANY
    assert stored.scope_id == carrier.id


def test_patch_to_global_normalises_scope_id(db):
    """PATCH that turns an assignment GLOBAL must drop its scope id."""
    from apps.masterdata.models import EntryPoint, Sector, State
    from apps.organization.models import Sector as OrgSector

    Role.objects.create(code='GC_PATCH', name='H', name_ar='خ')
    org = OrgSector.objects.create(code='GC_ORG2', name_ar='قطاع٢')
    sector = Sector.objects.create(code='GC_SEA2', name_ar='بحري٢')
    state = State.objects.create(code='GC_ST2', name_ar='ولاية٢', sector=sector)
    ep = EntryPoint.objects.create(
        code='GC_EP2', name_ar='منفذ٢', kind='SEAPORT', state=state, sector=org,
    )

    # One granter holding both PORT (to create) and GLOBAL (to flip to GLOBAL).
    granter = User.objects.create_user(
        email='gpatcher@nqp.gov.sd', password='StrongPass123!', full_name='P', is_staff=True,
    )
    role = Role.objects.get(code='GC_PATCH')
    RoleAssignment.objects.create(
        user=granter, role=role, scope_type=ScopeType.PORT, scope_id=ep.id,
    )
    RoleAssignment.objects.create(
        user=granter, role=role, scope_type=ScopeType.GLOBAL, scope_id=None,
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': granter.email, 'password': 'StrongPass123!'}, format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")

    user = User.objects.create_user(email='gpatch@nqp.gov.sd', password='x', full_name='H')
    created = client.post(
        '/api/v1/auth/role-assignments/',
        {'user': str(user.id), 'role': 'GC_PATCH', 'scope_type': 'PORT',
         'scope_id': str(ep.id)}, format='json',
    )
    assert created.status_code == 201, created.data
    assignment_id = created.data['data']['id']

    patched = client.patch(
        f'/api/v1/auth/role-assignments/{assignment_id}/',
        {'scope_type': 'GLOBAL', 'scope_id': str(uuid.uuid4())}, format='json',
    )
    assert patched.status_code == 200, patched.data
    assert patched.data['data']['scope_id'] is None
    stored = RoleAssignment.objects.get(pk=assignment_id)
    assert stored.scope_type == ScopeType.GLOBAL
    assert stored.scope_id is None


def test_model_save_normalises_global_scope_id(db):
    """Defence in depth: the invariant holds on the ORM path too, not just the API."""
    Role.objects.create(code='GC_ORM', name='I', name_ar='ذ')
    user = User.objects.create_user(email='gorm@nqp.gov.sd', password='x', full_name='I')
    assignment = RoleAssignment.objects.create(
        user=user, role=Role.objects.get(code='GC_ORM'),
        scope_type=ScopeType.GLOBAL, scope_id=uuid.uuid4(),
    )
    assignment.refresh_from_db()
    assert assignment.scope_id is None


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
