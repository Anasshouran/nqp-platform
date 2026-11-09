"""اختبارات TechnicalSupervisor."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.registry.models import TechnicalSupervisor

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


@pytest.mark.django_db
class TestTechnicalSupervisorModel:

    def test_create_supervisor(self):
        sup = TechnicalSupervisor.objects.create(
            code=f'SUP_{_uid()}', name_ar='برنامج السل',
            kind='FEDERAL_PROGRAM', domain='TB',
        )
        assert sup.is_active
        assert sup.domain == 'TB'

    def test_code_unique(self):
        code = f'UNIQ_{_uid()}'
        TechnicalSupervisor.objects.create(
            code=code, name_ar='1', kind='OTHER', domain='GENERAL',
        )
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            TechnicalSupervisor.objects.create(
                code=code, name_ar='2', kind='OTHER', domain='GENERAL',
            )


@pytest.mark.django_db
class TestTechnicalSupervisorAPI:

    def test_create_supervisor_global(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/technical-supervisors/', {
            'code': f'API_{_uid()}',
            'name_ar': 'برنامج API',
            'kind': 'FEDERAL_PROGRAM',
            'domain': 'TB',
        })
        assert response.status_code == 201, response.json()

    def test_create_supervisor_non_global_forbidden(self):
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/v1/registry/technical-supervisors/', {
            'code': f'DENY_{_uid()}',
            'name_ar': 'x',
            'kind': 'OTHER',
            'domain': 'GENERAL',
        })
        assert response.status_code in (403, 401)
