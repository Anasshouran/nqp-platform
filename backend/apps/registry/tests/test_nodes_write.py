"""Part3-C/D: write endpoints are GLOBAL-only (M4-4-C-Part3-C/D decisions)."""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.organization.models import Sector as OrgSector
from apps.registry.models import ReportingNode

User = get_user_model()


def _uid(): return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_plain_user():
    return User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')


def _make_sector_user(sector):
    user = User.objects.create_user(email=f'sector_{_uid()}@test.com', password='x')
    user.sector = sector
    user.save()
    role = Role.objects.create(code=f'ROLE_{_uid()}', name=f'SECTOR_{_uid()}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='SECTOR', scope_id=sector.id,
    )
    return user


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _new_node(parent):
    return ReportingNode.objects.create(
        code=f'NODE_{_uid()}', name_ar=f'عقدة {_uid()}',
        kind='STATE', parent=parent,
    )


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _post(client, url, data=None):
    resp = client.post(url, data or {})
    return resp


def _patch(client, url, data=None):
    resp = client.patch(url, data or {})
    return resp


# ---------------------------------------------------------------------------
# TestCreateNodePermissions — 3
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCreateNodePermissions:

    def test_superuser_can_create(self):
        root = _ensure_root()
        c = _client(_make_superuser())
        resp = _post(c, '/api/v1/registry/nodes/', {
            'kind': 'STATE', 'code': f'NEW_{_uid()}', 'name_ar': 'عقدة جديدة',
            'parent': str(root.id),
        })
        assert resp.status_code == 201, resp.content[:300]

    def test_sector_user_cannot_create(self):
        root = _ensure_root()
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        user = _make_sector_user(org)
        c = _client(user)
        resp = _post(c, '/api/v1/registry/nodes/', {
            'kind': 'STATE', 'code': f'NEW_{_uid()}', 'name_ar': 'x',
            'parent': str(root.id),
        })
        assert resp.status_code == 403

    def test_plain_user_cannot_create(self):
        root = _ensure_root()
        c = _client(_make_plain_user())
        resp = _post(c, '/api/v1/registry/nodes/', {
            'kind': 'STATE', 'code': f'NEW_{_uid()}', 'name_ar': 'x',
            'parent': str(root.id),
        })
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# TestEditNodePermissions — 3
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestEditNodePermissions:

    def test_superuser_can_edit(self):
        node = _new_node(_ensure_root())
        c = _client(_make_superuser())
        resp = _patch(c, f'/api/v1/registry/nodes/{node.id}/', {'name_ar': 'معدّل'})
        assert resp.status_code == 200, resp.json()
        node.refresh_from_db()
        assert node.name_ar == 'معدّل'

    def test_sector_user_cannot_edit(self):
        node = _new_node(_ensure_root())
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        user = _make_sector_user(org)
        c = _client(user)
        resp = _patch(c, f'/api/v1/registry/nodes/{node.id}/', {'name_ar': 'x'})
        assert resp.status_code == 403

    def test_plain_user_cannot_edit(self):
        node = _new_node(_ensure_root())
        c = _client(_make_plain_user())
        resp = _patch(c, f'/api/v1/registry/nodes/{node.id}/', {'name_ar': 'x'})
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# TestDeactivatePermissions — 6
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDeactivatePermissions:

    def test_superuser_can_deactivate(self):
        node = _new_node(_ensure_root())
        c = _client(_make_superuser())
        resp = c.post(f'/api/v1/registry/nodes/{node.id}/deactivate/')
        assert resp.status_code == 200, resp.json()
        node.refresh_from_db()
        assert node.is_active is False

    def test_superuser_can_reactivate(self):
        node = _new_node(_ensure_root())
        node.is_active = False
        node.save()
        c = _client(_make_superuser())
        resp = c.post(f'/api/v1/registry/nodes/{node.id}/reactivate/')
        assert resp.status_code == 200, resp.json()
        node.refresh_from_db()
        assert node.is_active is True

    def test_cannot_deactivate_federal_root(self):
        root = _ensure_root()
        c = _client(_make_superuser())
        resp = c.post(f'/api/v1/registry/nodes/{root.id}/deactivate/')
        assert resp.status_code == 400

    def test_sector_user_cannot_deactivate(self):
        node = _new_node(_ensure_root())
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        user = _make_sector_user(org)
        c = _client(user)
        resp = c.post(f'/api/v1/registry/nodes/{node.id}/deactivate/')
        assert resp.status_code == 403

    def test_plain_user_cannot_deactivate(self):
        node = _new_node(_ensure_root())
        c = _client(_make_plain_user())
        resp = c.post(f'/api/v1/registry/nodes/{node.id}/deactivate/')
        assert resp.status_code == 403

    def test_sector_user_cannot_reactivate(self):
        node = _new_node(_ensure_root())
        node.is_active = False
        node.save()
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        user = _make_sector_user(org)
        c = _client(user)
        resp = c.post(f'/api/v1/registry/nodes/{node.id}/reactivate/')
        assert resp.status_code == 403
