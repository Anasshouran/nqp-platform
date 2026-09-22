import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.cms.models import DirectorProfile
from apps.organization.models import Sector

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='cmsadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير المحتوى'
    )
    login = api_client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'StrongPass123!'}, format='json')
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return user


@pytest.fixture
def director_profile():
    return DirectorProfile.objects.create(
        name_ar='د. اختبار', title='المدير العام', summary='نبذة تعريفية', is_active=True
    )


def test_director_list_public(api_client, director_profile):
    res = api_client.get('/api/v1/cms/director/')
    assert res.status_code == 200
    names = [item['name_ar'] for item in res.data['results']]
    assert 'د. اختبار' in names


def test_director_current_public(api_client, director_profile):
    res = api_client.get('/api/v1/cms/director/current/')
    assert res.status_code == 200
    assert res.data['data']['name_ar'] == 'د. اختبار'


def test_director_inactive_hidden_from_public(api_client, director_profile):
    director_profile.is_active = False
    director_profile.save()
    res = api_client.get('/api/v1/cms/director/')
    assert res.status_code == 200
    assert res.data['count'] == 0


def test_director_update_requires_admin(api_client, director_profile):
    res = api_client.patch(f'/api/v1/cms/director/{director_profile.id}/', {'title': 'تعديل'}, format='json')
    assert res.status_code in (401, 403)


def test_director_sector_scoped_with_confirmation_fields(api_client, director_profile):
    sector = Sector.objects.create(
        code='RED_SEA', name_ar='قطاع البحر الأحمر', region='البحر الأحمر', color='#e63946', order=1
    )
    DirectorProfile.objects.create(
        sector=sector,
        name_ar='د. أحمد محمد عثمان دِرير',
        title='مدير الحجر الصحي – قطاع البحر الأحمر',
        is_active=True,
        is_confirmed=False,
        confirmation_note='ينتظر التأكيد الإداري.',
    )
    res = api_client.get('/api/v1/cms/director/current/?sector=RED_SEA')
    assert res.status_code == 200
    data = res.data['data']
    assert data['name_ar'] == 'د. أحمد محمد عثمان دِرير'
    assert data['sector_code'] == 'RED_SEA'
    assert data['is_confirmed'] is False
    assert data['confirmation_note'] == 'ينتظر التأكيد الإداري.'


def test_director_sector_falls_back_to_national(api_client, director_profile):
    res = api_client.get('/api/v1/cms/director/current/?sector=KHARTOUM')
    assert res.status_code == 200
    assert res.data['data']['name_ar'] == 'د. اختبار'