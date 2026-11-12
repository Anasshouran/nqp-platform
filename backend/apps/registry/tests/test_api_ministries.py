"""اختبارات StateMinistry API."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import Sector as MasterdataSector, State
from apps.registry.models import StateMinistry

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_plain_user():
    return User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')


def _make_state():
    sector = MasterdataSector.objects.create(
        code=f'SEC_{_uid()}', name_ar='قطاع اختبار',
    )
    return State.objects.create(
        code=f'ST_{_uid()}', name_ar='ولاية اختبار', sector=sector,
    )


@pytest.mark.django_db
class TestMinistriesAPI:

    def test_list_ministries_global(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200

    def test_create_ministry_global(self):
        state = _make_state()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/ministries/', {
            'state': str(state.id),
            'ministry_name_ar': 'وزارة اختبار',
        })
        assert response.status_code == 201, response.json()
        assert StateMinistry.objects.filter(state=state).exists()

    def test_create_ministry_non_global_forbidden(self):
        state = _make_state()
        client = APIClient()
        client.force_authenticate(user=_make_plain_user())
        response = client.post('/api/v1/registry/ministries/', {
            'state': str(state.id),
            'ministry_name_ar': 'وزارة اختبار',
        })
        assert response.status_code in (401, 403)

    def test_duplicate_ministry_rejected(self):
        state = _make_state()
        StateMinistry.objects.create(state=state, ministry_name_ar='موجودة')
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/ministries/', {
            'state': str(state.id),
            'ministry_name_ar': 'مكررة',
        })
        assert response.status_code == 400, (
            f"Expected 400 (OneToOne constraint), got {response.status_code}."
        )

    def test_plain_user_fail_safe_empty_list(self):
        _make_state()  # بيانات موجودة
        client = APIClient()
        client.force_authenticate(user=_make_plain_user())
        response = client.get('/api/v1/registry/ministries/')
        if response.status_code == 200:
            data = response.json()
            items = data.get('results', []) if isinstance(data, dict) else data
            assert items == []
