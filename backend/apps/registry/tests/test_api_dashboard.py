"""اختبارات dashboard endpoints."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{uuid.uuid4().hex[:8]}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


@pytest.mark.django_db
class TestDashboardAPI:

    def test_summary_returns_dict(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/dashboard/summary/')
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

    def test_tree_returns_data(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/dashboard/tree/')
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
