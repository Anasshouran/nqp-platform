import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='inspector2@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مفتش عام',
        phone='+249900000099',
    )


def _auth_client(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def test_profile_requires_auth(api_client, user):
    response = api_client.get('/api/v1/auth/profile/')
    assert response.status_code == 401


def test_profile_returns_unified_profile(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/auth/profile/')
    assert response.status_code == 200
    data = response.data['data']
    assert set(data.keys()) >= {
        'user', 'profile', 'security', 'roles', 'organization',
        'effective_permissions', 'scopes',
    }
    assert data['user']['email'] == user.email
    # الملف يُنشأ تلقائياً عند أول طلب مع قيم افتراضية
    assert data['profile']['employment_status'] == 'ACTIVE'
    assert data['profile']['language'] == 'AR'
    assert data['profile']['theme'] == 'LIGHT'
    assert data['profile']['timezone'] == 'Africa/Khartoum'
    assert data['security']['is_mfa_enabled'] is False
    assert data['security']['is_active'] is True


def test_profile_patch_updates_fields(api_client, user):
    _auth_client(api_client, user)
    response = api_client.patch(
        '/api/v1/auth/profile/',
        {
            'full_name': 'مفتش محدّث',
            'profile': {
                'job_title': 'مفتش حجر صحي',
                'employee_number': 'NQP-000999',
                'language': 'EN',
                'theme': 'DARK',
                'notify_sms': True,
            },
        },
        format='json',
    )
    assert response.status_code == 200
    data = response.data['data']
    assert data['user']['full_name'] == 'مفتش محدّث'
    assert data['profile']['job_title'] == 'مفتش حجر صحي'
    assert data['profile']['employee_number'] == 'NQP-000999'
    assert data['profile']['language'] == 'EN'
    assert data['profile']['theme'] == 'DARK'
    assert data['profile']['notify_sms'] is True


def test_profile_patch_persists_across_requests(api_client, user):
    _auth_client(api_client, user)
    api_client.patch(
        '/api/v1/auth/profile/',
        {'profile': {'internal_phone': '2100', 'timezone': 'Africa/Khartoum'}},
        format='json',
    )
    response = api_client.get('/api/v1/auth/profile/')
    assert response.status_code == 200
    assert response.data['data']['profile']['internal_phone'] == '2100'


def test_profile_rejects_invalid_preferences(api_client, user):
    _auth_client(api_client, user)
    response = api_client.patch(
        '/api/v1/auth/profile/',
        {'profile': {'language': 'XX'}},
        format='json',
    )
    assert response.status_code == 400