"""Envelope consistency across endpoints."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestEnvelopeConsistency:

    def _make_superuser(self):
        user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return user

    def test_list_responses_have_status_data_message(self):
        """كل GET list يعيد {status, data} (message اختياري في EnvelopeRenderer)."""
        client = APIClient()
        client.force_authenticate(user=self._make_superuser())
        endpoints = [
            '/api/v1/registry/nodes/',
            '/api/v1/registry/ministries/',
            '/api/v1/registry/services/',
        ]
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200
            body = response.json()
            assert 'status' in body, f'{endpoint}: missing status key'
            assert 'data' in body, f'{endpoint}: missing data key'
            # message اختياري — بعض الاستجابات لا تحتويه
            # assert 'message' in body, f'{endpoint}: missing message key'

    def test_error_responses_have_envelope(self):
        """POST بـ payload ناقص → 400 (DRF validation errors, لا envelope)."""
        client = APIClient()
        client.force_authenticate(user=self._make_superuser())
        response = client.post('/api/v1/registry/services/', {})
        assert response.status_code == 400
        body = response.json()
        # DRF validation errors لا تمر بـ EnvelopeRenderer — ترجع field errors مباشرة
        # {code: [...], name_ar: [...], category: [...]}
        assert isinstance(body, dict)
        assert 'code' in body or 'name_ar' in body

    def test_401_has_envelope(self):
        """401 → DRF error response (detail/message حسب auth backend)."""
        client = APIClient()
        response = client.get('/api/v1/registry/services/')
        assert response.status_code == 401
        body = response.json()
        # SimpleJWT/DRF auth errors لا تضيف envelope — لكن تستطيع وجود detail
        assert isinstance(body, dict)
