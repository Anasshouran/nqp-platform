"""اختبارات RegistryChangeLog API — read-only."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.registry.models import RegistryChangeLog

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
class TestChangeLogAPI:

    def test_changelog_readonly_list(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/changelog/')
        assert response.status_code == 200

    def test_changelog_delete_forbidden(self):
        log = RegistryChangeLog.objects.create(
            action='CREATE',
            entity_type='ReportingNode',
            entity_id=uuid.uuid4(),
            entity_label='test',
        )
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.delete(f'/api/v1/registry/changelog/{log.id}/')
        assert response.status_code in (403, 405), (
            f"ChangeLog delete should be forbidden, got {response.status_code}."
        )
