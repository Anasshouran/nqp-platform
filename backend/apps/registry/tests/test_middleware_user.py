"""D-M2-1: signals تحفظ user_id عندما يكون request authenticated."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.registry.models import ReportingNode, RegistryChangeLog

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
class TestMiddlewareUser:

    def test_api_create_logs_user(self):
        """عند إنشاء node عبر API authenticated، log.user_id مملوء."""
        user = _make_superuser()
        client = APIClient()
        client.force_authenticate(user=user)

        # إنشاء root إن لم يوجد
        if not ReportingNode.objects.filter(parent__isnull=True).exists():
            ReportingNode.objects.create(code=f'R_{_uid()}', name_ar='جذر', kind='FEDERAL')

        root = ReportingNode.objects.filter(parent__isnull=True).first()
        response = client.post('/api/v1/registry/nodes/', {
            'code': f'MW_{_uid()}',
            'name_ar': 'عقدة سياق',
            'kind': 'STATE',
            'parent': str(root.id),
        })
        assert response.status_code == 201, response.json()

        node_id = response.json()['data']['id']
        log = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode', entity_id=node_id, action='CREATE',
        ).first()
        assert log is not None
        assert log.user_id == user.id, (
            f"Expected log.user_id={user.id}, got {log.user_id}. "
            "Middleware may not be registered or is before AuthenticationMiddleware."
        )

    def test_shell_create_logs_null_user(self):
        """عند إنشاء node بدون request (shell/test)، log.user_id = None."""
        ReportingNode.objects.create(
            code=f'SHELL_{_uid()}', name_ar='shell', kind='FEDERAL',
        )
        log = RegistryChangeLog.objects.filter(
            entity_type='ReportingNode', action='CREATE',
        ).order_by('-created_at').first()
        assert log is not None
        assert log.user_id is None, (
            f"Expected None (no request context), got {log.user_id}. "
            "Middleware should not leak user between requests."
        )

    def test_user_does_not_leak_between_requests(self):
        """middleware يُعيد reset بعد كل request — لا تسريب."""
        user = _make_superuser()
        client = APIClient()

        # Request 1 (authenticated)
        client.force_authenticate(user=user)
        if not ReportingNode.objects.filter(parent__isnull=True).exists():
            ReportingNode.objects.create(code=f'R_{_uid()}', name_ar='جذر', kind='FEDERAL')
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        client.post('/api/v1/registry/nodes/', {
            'code': f'REQ1_{_uid()}', 'name_ar': 'r1', 'kind': 'STATE', 'parent': str(root.id),
        })

        # Request 2 (anonymous — via direct model create in same process)
        ReportingNode.objects.create(code=f'OUTSIDE_{_uid()}', name_ar='outside', kind='STATE', parent=root)

        # آخر log يجب أن يكون user_id=None (بلا request)
        last_log = RegistryChangeLog.objects.order_by('-created_at').first()
        assert last_log.user_id is None, (
            f"User leaked from previous request: {last_log.user_id}"
        )
