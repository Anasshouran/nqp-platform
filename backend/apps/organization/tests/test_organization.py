import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector, Station

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='orgadmin@nqp.gov.sd', password='StrongPass123!',
        full_name='مدير الهيكل الإداري',
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def position():
    return OrgPosition.objects.create(
        code='MINISTER', name_ar='وزير الصحة', level=1, order=1,
    )


@pytest.fixture
def sector():
    return Sector.objects.create(
        code='KHARTOUM', name_ar='قطاع الخرطوم', region='الخرطوم', order=1,
    )


@pytest.fixture
def department(sector):
    return Department.objects.create(
        code='IT', name_ar='قسم تقنية المعلومات', sector=sector, order=1,
    )


@pytest.fixture
def station(department):
    return Station.objects.create(
        code='KHARTOUM_MAIN', name_ar='محطة الخرطوم الرئيسية',
        sector=department.sector, department=department, order=1,
    )


def test_positions_list(api_client, admin_user, position):
    res = api_client.get('/api/v1/organization/positions/')
    data = res.json()['data']
    assert res.status_code == 200
    assert data['results'][0]['code'] == 'MINISTER'
    assert data['results'][0]['parent_name'] is None


def test_position_create_with_parent(api_client, admin_user, position):
    child = OrgPosition.objects.create(
        code='DG_EMERGENCY', name_ar='مدير عام للطواري والاوبئة',
        level=2, parent=position,
    )
    assert child.parent.code == 'MINISTER'


def test_sectors_list(api_client, admin_user, sector):
    res = api_client.get('/api/v1/organization/sectors/')
    assert res.status_code == 200
    assert res.json()['data']['results'][0]['code'] == 'KHARTOUM'


def test_departments_list(api_client, admin_user, department, sector):
    res = api_client.get(f'/api/v1/organization/departments/?sector={sector.id}')
    assert res.status_code == 200
    assert res.json()['data']['results'][0]['sector_name'] == 'قطاع الخرطوم'


def test_assignment_create(api_client, admin_user, admin_user_alt, position):
    res = api_client.post(
        '/api/v1/organization/assignments/',
        {'user': admin_user_alt.id, 'position': str(position.id), 'is_active': True},
        format='json',
    )
    assert res.status_code == 201
    data = res.json()['data']
    assert data['position_name'] == 'وزير الصحة'
    assert data['user_email'] == admin_user_alt.email


def test_assignment_requires_target(api_client, admin_user, admin_user_alt):
    res = api_client.post(
        '/api/v1/organization/assignments/',
        {'user': admin_user_alt.id, 'is_active': True},
        format='json',
    )
    assert res.status_code == 400


def test_tree_hierarchy(api_client, admin_user, position):
    OrgPosition.objects.create(
        code='DG_EMERGENCY', name_ar='مدير عام للطواري والاوبئة',
        level=2, parent=position,
    )
    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    data = res.data['data']
    assert data['positions'][0]['code'] == 'MINISTER'
    assert data['positions'][0]['children'][0]['code'] == 'DG_EMERGENCY'


def test_tree_hierarchy_department_people(api_client, admin_user, department, admin_user_alt):
    OrgAssignment.objects.create(
        user=admin_user_alt, department=department, is_active=True,
    )
    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    data = res.data['data']
    sector = data['sectors'][0]
    assert sector['departments'][0]['people'] == ['موظف']


def test_tree_hierarchy_sector_people(api_client, admin_user, sector, admin_user_alt):
    OrgAssignment.objects.create(
        user=admin_user_alt, sector=sector, is_active=True,
    )
    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    data = res.data['data']
    assert data['sectors'][0]['people'] == ['موظف']


def test_tree_hierarchy_nested_units(api_client, admin_user, sector):
    parent = Department.objects.create(
        code='FOOD', name_ar='إدارة رقابة الأغذية', sector=sector,
        kind='DEPARTMENT', order=1,
    )
    unit = Department.objects.create(
        code='FOOD_NORTH_PORT', name_ar='ميناء الشمالي', sector=sector,
        parent=parent, kind='UNIT', order=1,
    )
    OrgPosition.objects.create(
        code='FOOD_NORTH_PORT_SECTION_HEAD', name_ar='رئيس قسم',
        level=8, parent=None, department=unit,
    )
    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    dep = res.data['data']['sectors'][0]['departments'][0]
    assert dep['kind'] == 'DEPARTMENT'
    assert dep['children'][0]['code'] == 'FOOD_NORTH_PORT'
    assert dep['children'][0]['kind'] == 'UNIT'
    assert dep['children'][0]['positions'][0]['name_ar'] == 'رئيس قسم'


@pytest.fixture
def admin_user_alt():
    return User.objects.create_user(
        email='officer-org@nqp.gov.sd', password='StrongPass123!', full_name='موظف'
    )


def test_stations_list(api_client, admin_user, station, sector):
    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['results'][0]['code'] == 'KHARTOUM_MAIN'
    assert data['results'][0]['department_name'] == 'قسم تقنية المعلومات'
    assert data['results'][0]['sector_name'] == 'قطاع الخرطوم'


def test_stations_filter_by_department(api_client, admin_user, station, department):
    res = api_client.get(f'/api/v1/organization/stations/?department={department.id}')
    assert res.status_code == 200
    assert res.json()['data']['count'] == 1


def test_station_create(api_client, admin_user, department):
    res = api_client.post(
        '/api/v1/organization/stations/',
        {
            'code': 'PORT_SUDAN', 'name_ar': 'ميناء بورتسودان',
            'department': str(department.id), 'sector': str(department.sector_id),
            'location': 'بورتسودان', 'order': 2,
        },
        format='json',
    )
    assert res.status_code == 201
    data = res.json()['data']
    assert data['code'] == 'PORT_SUDAN'
    assert data['department_name'] == 'قسم تقنية المعلومات'
    assert data['assignments_count'] == 0


def test_station_update(api_client, admin_user, station):
    res = api_client.patch(
        f'/api/v1/organization/stations/{station.id}/',
        {'name_ar': 'محطة محدثة', 'location': 'موقع جديد'},
        format='json',
    )
    assert res.status_code == 200
    assert res.json()['data']['name_ar'] == 'محطة محدثة'


def test_assignment_with_station(api_client, admin_user, admin_user_alt, position, station):
    res = api_client.post(
        '/api/v1/organization/assignments/',
        {'user': admin_user_alt.id, 'station': str(station.id), 'is_active': True},
        format='json',
    )
    assert res.status_code == 201
    data = res.json()['data']
    assert data['station_name'] == 'محطة الخرطوم الرئيسية'


def test_tree_hierarchy_has_stations(api_client, admin_user, department, station):
    res = api_client.get('/api/v1/organization/tree/hierarchy/')
    assert res.status_code == 200
    dep = res.data['data']['sectors'][0]['departments'][0]
    assert dep['stations'][0]['code'] == 'KHARTOUM_MAIN'


def test_scoped_station_user_sees_only_his_station(api_client, station):
    from apps.accounts.models import Permission, Role, RoleAssignment

    other = Station.objects.create(
        code='OTHER_PORT', name_ar='محطة أخرى',
        sector=station.sector, department=station.department, order=2,
    )
    user = User.objects.create_user(
        email='station-head@nqp.gov.sd', password='StrongPass123!',
        full_name='رئيس محطة',
    )
    role = Role.objects.create(code='STATION_HEAD', name='Station Head', name_ar='رئيس محطة')
    for code in ('organization:view', 'organization:edit'):
        role.permissions.add(Permission.objects.get_or_create(
            code=code, defaults={'name': code, 'resource': 'organization', 'action': 'view'}
        )[0])
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='STATION', scope_id=station.id, is_active=True,
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")

    res = api_client.get('/api/v1/organization/stations/')
    assert res.status_code == 200
    ids = [s['id'] for s in res.json()['data']['results']]
    assert str(station.id) in ids
    assert str(other.id) not in ids


def test_station_ordering(api_client, admin_user, department):
    Station.objects.create(
        code='B', name_ar='B', sector=department.sector,
        department=department, order=2,
    )
    Station.objects.create(
        code='A', name_ar='A', sector=department.sector,
        department=department, order=1,
    )
    res = api_client.get('/api/v1/organization/stations/')
    codes = [s['code'] for s in res.json()['data']['results']]
    assert codes == ['A', 'B']


@pytest.fixture
def scoped_user(api_client, sector):
    from apps.accounts.models import Permission, Role, RoleAssignment

    user = User.objects.create_user(
        email='sector-manager@nqp.gov.sd', password='StrongPass123!',
        full_name='مدير قطاع',
    )
    role = Role.objects.create(code='SECTOR_MANAGER', name='Sector Manager', name_ar='مدير قطاع')
    for code in ('organization:view', 'organization:add', 'organization:edit', 'organization:delete'):
        role.permissions.add(Permission.objects.get_or_create(code=code, defaults={'name': code, 'resource': 'organization', 'action': 'view'})[0])
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='SECTOR', scope_id=sector.id, is_active=True,
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


def test_user_without_org_permission_denied(api_client):
    plain = User.objects.create_user(
        email='plain@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم عادي'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': plain.email, 'password': 'StrongPass123!'},
        format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    assert api_client.get('/api/v1/organization/sectors/').status_code == 403


def test_scoped_user_sees_only_his_sector(api_client, scoped_user, sector):
    other = Sector.objects.create(code='RED_SEA', name_ar='قطاع البحر الأحمر', order=2)
    res = api_client.get('/api/v1/organization/sectors/')
    assert res.status_code == 200
    codes = [s['code'] for s in res.json()['data']['results']]
    assert sector.code in codes
    assert other.code not in codes


def test_scoped_user_cannot_view_out_of_scope_object(api_client, scoped_user, sector):
    other = Sector.objects.create(code='RED_SEA', name_ar='قطاع البحر الأحمر', order=2)
    res = api_client.get(f'/api/v1/organization/sectors/{other.id}/')
    assert res.status_code == 404


def test_scoped_user_cannot_delete_out_of_scope_object(api_client, scoped_user, sector):
    other = Sector.objects.create(code='RED_SEA', name_ar='قطاع البحر الأحمر', order=2)
    res = api_client.delete(f'/api/v1/organization/sectors/{other.id}/')
    assert res.status_code == 404
