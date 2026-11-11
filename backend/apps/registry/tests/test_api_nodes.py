"""اختبارات ReportingNode API."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.registry.models import ReportingNode

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


def _ensure_root():
    """يعيد الجذر الموجود أو ينشئ واحداً — يتجنب conflicts مع FED seed."""
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'API_ROOT_{_uid()}', name_ar='جذر اختبار', kind='FEDERAL',
        )
    return root


@pytest.mark.django_db
class TestNodesAPI:

    def test_global_user_sees_nodes(self):
        _ensure_root()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/nodes/')
        assert response.status_code == 200

    def test_plain_user_fail_safe(self):
        _ensure_root()
        client = APIClient()
        client.force_authenticate(user=_make_plain_user())
        response = client.get('/api/v1/registry/nodes/')
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            data = response.json()
            items = data.get('results', []) if isinstance(data, dict) else data
            assert items == [], f"Fail-safe violated: user sees {len(items)} items"

    def test_create_second_root_rejected(self):
        _ensure_root()  # تأكد من وجود جذر واحد
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/nodes/', {
            'code': f'SECOND_ROOT_{_uid()}',
            'name_ar': 'جذر ثانٍ',
            'kind': 'FEDERAL',
        })
        assert response.status_code == 400, (
            f"Expected 400 (single-root constraint), got {response.status_code}. "
            "If 500: serializer doesn't handle IntegrityError. "
            "If 201: constraint not enforced at API level."
        )

    def test_create_child_node(self):
        root = _ensure_root()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/nodes/', {
            'code': f'CHILD_{_uid()}',
            'name_ar': 'ولاية اختبار',
            'kind': 'STATE',
            'parent': str(root.id),
        })
        assert response.status_code == 201, response.json()
        # EnvelopeRenderer يغلف الاستجابة في {'status': ..., 'data': {...}}
        data = response.json()
        inner = data.get('data', data) if isinstance(data, dict) else data
        assert str(root.id) in inner['path']

    def test_patch_node_updates_path(self):
        root = _ensure_root()
        uid = _uid()
        s1 = ReportingNode.objects.create(code=f'S1_{uid}', name_ar='و1', kind='STATE', parent=root)
        s2 = ReportingNode.objects.create(code=f'S2_{uid}', name_ar='و2', kind='STATE', parent=root)
        loc = ReportingNode.objects.create(code=f'L_{uid}', name_ar='محلية', kind='LOCALITY', parent=s1)

        old_path = loc.path
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.patch(f'/api/v1/registry/nodes/{loc.id}/', {'parent': str(s2.id)})
        assert response.status_code == 200, response.json()

        loc.refresh_from_db()
        assert loc.path != old_path, "Path didn't change after moving node"
        assert str(s2.id) in loc.path, f"New parent {s2.id} not in path {loc.path}"

    def test_delete_not_allowed(self):
        root = _ensure_root()
        child = ReportingNode.objects.create(
            code=f'DEL_{_uid()}', name_ar='حذف', kind='STATE', parent=root,
        )
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.delete(f'/api/v1/registry/nodes/{child.id}/')

        if response.status_code == 204:
            if not ReportingNode.objects.filter(pk=child.id).exists():
                pytest.fail(
                    "HARD DELETE detected (violates D-M2-2 soft-delete design). "
                    "Fix: override destroy() or http_method_names."
                )
        assert response.status_code in (204, 403, 405)
