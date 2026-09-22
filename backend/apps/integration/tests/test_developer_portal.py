import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.integration.models import DeveloperApp, WebhookEndpoint

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='devadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير المطورين'
    )
    login = api_client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'StrongPass123!'}, format='json')
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return user


@pytest.fixture
def regular_user(api_client):
    return User.objects.create_user(email='user@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم')


def test_developer_app_create_and_key_generated(api_client, admin_user):
    res = api_client.post('/api/v1/integration/developer-apps/', {'name': 'تطبيق اختبار'}, format='json')
    assert res.status_code == 201
    data = res.data
    assert data['name'] == 'تطبيق اختبار'
    assert data['api_key'].startswith('nqp_')


def test_developer_app_requires_admin(api_client, regular_user):
    api_client.force_authenticate(regular_user)
    res = api_client.post('/api/v1/integration/developer-apps/', {'name': 'غير مصرح'}, format='json')
    assert res.status_code in (401, 403)


def test_rotate_key_generates_new_key(api_client, admin_user):
    app = DeveloperApp.objects.create(name='تطبيق التناوب')
    old = app.api_key
    res = api_client.post(f'/api/v1/integration/developer-apps/{app.id}/rotate-key/')
    assert res.status_code == 200
    app.refresh_from_db()
    assert app.api_key != old
    assert app.api_key.startswith('nqp_')


def test_webhook_crud(api_client, admin_user):
    app = DeveloperApp.objects.create(name='تطبيق ويب')
    res = api_client.post(
        '/api/v1/integration/webhooks/',
        {'app': str(app.id), 'event_type': 'FLIGHT_ARRIVAL', 'endpoint_url': 'https://example.com/hook'},
        format='json',
    )
    assert res.status_code == 201
    webhook = WebhookEndpoint.objects.get()
    assert webhook.event_type == 'FLIGHT_ARRIVAL'

    res = api_client.patch(f'/api/v1/integration/webhooks/{webhook.id}/', {'is_active': False}, format='json')
    assert res.status_code == 200
    webhook.refresh_from_db()
    assert webhook.is_active is False

    res = api_client.delete(f'/api/v1/integration/webhooks/{webhook.id}/')
    assert res.status_code == 204
    assert not WebhookEndpoint.objects.filter(id=webhook.id).exists()