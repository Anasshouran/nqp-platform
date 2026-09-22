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
        email='officer@nqp.gov.sd',
        password='StrongPass123!',
        full_name='محمد أحمد',
        phone='+249900000001',
    )


def test_create_user_and_login(api_client, db):
    user = User.objects.create_user(
        email='admin@nqp.gov.sd', password='StrongPass123!', full_name='Admin User'
    )
    assert user.is_active
    response = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'admin@nqp.gov.sd', 'password': 'StrongPass123!'},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['status'] == 'success'
    data = response.data['data']
    assert data['access_token']
    assert data['refresh_token']
    assert data['user']['email'] == 'admin@nqp.gov.sd'
    assert data['user']['full_name'] == 'Admin User'


def test_login_wrong_password(api_client, user):
    response = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'WrongPass123!'},
        format='json',
    )
    assert response.status_code == 400


def test_me_requires_auth(api_client, user):
    response = api_client.get('/api/v1/auth/me/')
    assert response.status_code == 401


def test_me_returns_current_user(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    response = api_client.get('/api/v1/auth/me/')
    assert response.status_code == 200
    assert response.data['data']['id'] == str(user.id)


def test_refresh_token(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    refresh_token = login.data['data']['refresh_token']
    response = api_client.post(
        '/api/v1/auth/refresh/', {'refresh': refresh_token}, format='json'
    )
    assert response.status_code == 200
    assert response.data['data']['access_token']


def test_logout_blacklists_refresh(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    refresh_token = login.data['data']['refresh_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    response = api_client.post(
        '/api/v1/auth/logout/', {'refresh': refresh_token}, format='json'
    )
    assert response.status_code == 204
    refreshed = api_client.post(
        '/api/v1/auth/refresh/', {'refresh': refresh_token}, format='json'
    )
    assert refreshed.status_code == 400


def test_change_password(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    response = api_client.post(
        '/api/v1/auth/change-password/',
        {'old_password': 'StrongPass123!', 'new_password': 'NewPass456!'},
        format='json',
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password('NewPass456!')


def test_change_password_wrong_old(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    response = api_client.post(
        '/api/v1/auth/change-password/',
        {'old_password': 'WrongOld123!', 'new_password': 'NewPass456!'},
        format='json',
    )
    assert response.status_code == 400


def test_user_list_requires_admin(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    response = api_client.get('/api/v1/auth/users/')
    assert response.status_code == 403


def test_register_creates_user_and_returns_tokens(api_client, db):
    response = api_client.post(
        '/api/v1/auth/register/',
        {
            'full_name': 'سارة خالد',
            'email': 'sara@example.com',
            'phone': '+249911111111',
            'national_id': '1122334455',
            'user_type': 'TRAVELER',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
        },
    )
    assert response.status_code == 201
    data = response.data['data']
    assert data['access_token']
    assert data['refresh_token']
    assert data['user']['email'] == 'sara@example.com'
    assert data['user']['user_type'] == 'TRAVELER'
    assert User.objects.filter(email='sara@example.com').exists()


def test_register_password_mismatch(api_client, db):
    response = api_client.post(
        '/api/v1/auth/register/',
        {
            'full_name': 'سارة خالد',
            'email': 'sara2@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'DifferentPass123!',
        },
    )
    assert response.status_code == 400


def test_register_company_requires_organization_name(api_client, db):
    response = api_client.post(
        '/api/v1/auth/register/',
        {
            'full_name': 'شركة النيل للشحن',
            'email': 'company@example.com',
            'user_type': 'COMPANY',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
        },
    )
    assert response.status_code == 400


def test_login_with_phone(api_client, user):
    response = api_client.post(
        '/api/v1/auth/login/',
        {'identifier': '+249900000001', 'password': 'StrongPass123!'},
    )
    assert response.status_code == 200
    assert response.data['data']['user']['email'] == 'officer@nqp.gov.sd'


def test_login_with_national_id(api_client, db):
    user = User.objects.create_user(
        email='nid@nqp.gov.sd', password='StrongPass123!', full_name='NID User',
        national_id='9988776655',
    )
    response = api_client.post(
        '/api/v1/auth/login/',
        {'identifier': '9988776655', 'password': 'StrongPass123!'},
    )
    assert response.status_code == 200
    assert response.data['data']['user']['email'] == user.email


def test_login_with_email_identifier(api_client, user):
    response = api_client.post(
        '/api/v1/auth/login/',
        {'identifier': 'officer@nqp.gov.sd', 'password': 'StrongPass123!'},
    )
    assert response.status_code == 200


def test_register_multiple_users_without_phone(api_client, db):
    first = api_client.post(
        '/api/v1/auth/register/',
        {
            'full_name': 'أحمد محمد',
            'email': 'ahmed@example.com',
            'user_type': 'CITIZEN',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
        },
    )
    assert first.status_code == 201
    assert first.data['data']['user']['phone'] is None

    second = api_client.post(
        '/api/v1/auth/register/',
        {
            'full_name': 'فاطمة علي',
            'email': 'fatima@example.com',
            'user_type': 'CITIZEN',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
        },
    )
    assert second.status_code == 201
    assert second.data['data']['user']['phone'] is None
