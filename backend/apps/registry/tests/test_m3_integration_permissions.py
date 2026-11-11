"""Cross-endpoint permission matrix."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


WRITE_ENDPOINTS = [
    '/api/v1/registry/nodes/',
    '/api/v1/registry/ministries/',
    '/api/v1/registry/owners/',
    '/api/v1/registry/technical-supervisors/',
    '/api/v1/registry/services/',
]

READ_ENDPOINTS = [
    '/api/v1/registry/nodes/',
    '/api/v1/registry/ministries/',
    '/api/v1/registry/facility-ownerships/',
    '/api/v1/registry/technical-supervisions/',
    '/api/v1/registry/services/',
    '/api/v1/registry/service-availability/',
    '/api/v1/registry/changelog/',
]


@pytest.mark.django_db
class TestPermissionsMatrix:

    def test_anonymous_gets_401_everywhere(self):
        """Anonymous → 401 عبر كل endpoints."""
        client = APIClient()
        for endpoint in READ_ENDPOINTS:
            response = client.get(endpoint)
            assert response.status_code == 401, f'{endpoint}: expected 401, got {response.status_code}'

    def test_plain_user_gets_200_or_403_no_500(self):
        """Plain user → 200 (فارغ) أو 403، لا 500."""
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        for endpoint in READ_ENDPOINTS:
            response = client.get(endpoint)
            assert response.status_code in (200, 403), (
                f'{endpoint}: got {response.status_code}, expected 200/403'
            )

    def test_plain_user_write_forbidden(self):
        """Plain user → 403/401 عند POST على كل endpoints."""
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        for endpoint in WRITE_ENDPOINTS:
            response = client.post(endpoint, {})
            assert response.status_code in (400, 401, 403), (
                f'{endpoint}: got {response.status_code}, expected 400/401/403'
            )
            assert response.status_code != 500, f'{endpoint}: 500 error!'

    def test_superuser_can_list_all(self):
        """Superuser → 200 على كل endpoints."""
        user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        client = APIClient()
        client.force_authenticate(user=user)
        for endpoint in READ_ENDPOINTS:
            response = client.get(endpoint)
            assert response.status_code == 200, (
                f'{endpoint}: superuser got {response.status_code}'
            )

    def test_delete_forbidden_everywhere(self):
        """DELETE → 405 على كل endpoints (http_method_names)."""
        user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        client = APIClient()
        client.force_authenticate(user=user)
        fake_id = uuid.uuid4()
        for endpoint in WRITE_ENDPOINTS:
            response = client.delete(f'{endpoint}{fake_id}/')
            assert response.status_code == 405, (
                f'{endpoint}: DELETE got {response.status_code}, expected 405'
            )
