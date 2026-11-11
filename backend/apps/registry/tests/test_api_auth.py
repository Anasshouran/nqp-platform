"""اختبارات المصادقة — كل endpoints تتطلب auth."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestAPIAuth:

    def test_nodes_requires_auth(self):
        response = APIClient().get('/api/v1/registry/nodes/')
        assert response.status_code == 401

    def test_ministries_requires_auth(self):
        response = APIClient().get('/api/v1/registry/ministries/')
        assert response.status_code == 401

    def test_dashboard_tree_requires_auth(self):
        response = APIClient().get('/api/v1/registry/dashboard/tree/')
        assert response.status_code == 401
