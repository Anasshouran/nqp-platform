import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.organization.models import Sector

from ..models import LabSample

pytestmark = pytest.mark.django_db

User = get_user_model()

RED_CODE = 'RED_SEA'
KH_CODE = 'KHARTOUM'


@pytest.fixture
def red_sector(db):
    return Sector.objects.filter(code=RED_CODE).first() or Sector.objects.create(
        code=RED_CODE, name_ar='البحر الأحمر', name_en='Red Sea',
        region='شرق', color='#e74c3c', order=1, is_active=True,
    )


@pytest.fixture
def kh_sector(db):
    return Sector.objects.filter(code=KH_CODE).first() or Sector.objects.create(
        code=KH_CODE, name_ar='الخرطوم', name_en='Khartoum',
        region='وسط', color='#2f6dd0', order=2, is_active=True,
    )


@pytest.fixture
def national_user(db):
    user = User.objects.create_user(email='national@nqp.gov.sd', password='x', full_name='وطني')
    role = Role.objects.get_or_create(
        code='NATIONAL_LAB_ADMIN',
        defaults={'name_ar': 'الوطني', 'default_scope': ScopeType.GLOBAL},
    )[0]
    RoleAssignment.objects.get_or_create(user=user, role=role, defaults={'scope_type': ScopeType.GLOBAL})
    return user


@pytest.fixture
def red_manager(db):
    user = User.objects.create_user(email='rm@nqp.gov.sd', password='x', full_name='مدير البحر')
    user.sector = Sector.objects.filter(code=RED_CODE).first()
    user.save(update_fields=['sector'])
    role = Role.objects.get_or_create(
        code='LAB_MANAGER',
        defaults={'name_ar': 'مدير معمل', 'default_scope': ScopeType.SECTOR},
    )[0]
    RoleAssignment.objects.get_or_create(user=user, role=role, defaults={
        'scope_type': ScopeType.SECTOR, 'scope_id': user.sector_id,
    })
    return user


@pytest.fixture
def samples(red_sector, kh_sector, db):
    collector = User.objects.create_user(email='collector@nqp.gov.sd', password='x', full_name='جامع')
    s1 = LabSample.objects.create(sample_type='SWAB', source='CLINIC', sector=red_sector, collector=collector)
    s2 = LabSample.objects.create(sample_type='SWAB', source='CLINIC', sector=kh_sector, collector=collector)
    return s1, s2


def auth_client_for(user):
    client = APIClient()
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'x'}, format='json')
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def test_national_sees_all(samples, national_user):
    c = auth_client_for(user=national_user)
    r = c.get('/api/v1/laboratory/samples/?page_size=2')
    assert r.status_code == 200
    assert r.json()['data']['count'] == 2


def test_national_with_sector_param_filters(samples, national_user):
    c = auth_client_for(user=national_user)
    r = c.get(f'/api/v1/laboratory/samples/?sector={RED_CODE}&page_size=2')
    assert r.json()['data']['count'] == 1
    assert r.json()['data']['results'][0]['sector_name'] == 'البحر الأحمر'


def test_sector_manager_sees_own_only(samples, red_manager):
    c = auth_client_for(user=red_manager)
    r = c.get('/api/v1/laboratory/samples/?page_size=2')
    assert r.json()['data']['count'] == 1
    assert r.json()['data']['results'][0]['sector_name'] == 'البحر الأحمر'


def test_sector_manager_other_sector_empty(samples, red_manager):
    c = auth_client_for(user=red_manager)
    r = c.get(f'/api/v1/laboratory/samples/?sector={KH_CODE}&page_size=2')
    assert r.json()['data']['count'] == 0


def test_dashboard_sector_param_aggregates(samples, national_user):
    c = auth_client_for(user=national_user)
    r = c.get(f'/api/v1/laboratory/samples/dashboard/?sector={KH_CODE}')
    assert r.data['data']['totals']['samples'] == 1


def test_national_dashboard_all_sectors(samples, national_user):
    c = auth_client_for(user=national_user)
    r = c.get('/api/v1/laboratory/samples/national-dashboard/')
    assert r.status_code == 200
    codes = {s['code'] for s in r.data['data']['sectors']}
    assert RED_CODE in codes
    assert KH_CODE in codes
    totals = {s['code']: s['totals']['samples'] for s in r.data['data']['sectors']}
    assert totals[RED_CODE] == 1
    assert totals[KH_CODE] == 1


def test_sector_codes_in_profile(samples, national_user, red_manager):
    c = auth_client_for(user=national_user)
    r = c.get('/api/v1/auth/me/')
    assert {RED_CODE, KH_CODE} <= set(r.data['data']['sector_codes'])

    c2 = auth_client_for(user=red_manager)
    r2 = c2.get('/api/v1/auth/me/')
    assert r2.data['data']['sector_codes'] == [RED_CODE]