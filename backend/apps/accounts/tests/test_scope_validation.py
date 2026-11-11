"""M5-C-0: API-level scope validation tests (RoleAssignment write path).

Bug fixed in M5-C-0 (found in M5-C Discovery, commit e5fd708):
`_validate_scope_id` in `accounts/serializers.py` did not know 'STATE'.
Any POST /api/v1/auth/role-assignments/ with scope_type='STATE' returned
400 "نوع النطاق STATE غير معروف" — the frontend RoleAssignmentFormDialog
sends STATE. Tests bypassed the API via objects.create, so it went
unnoticed since M4-1.
"""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State,
)
from apps.organization.models import (
    Sector as OrgSector,
)
from apps.accounts.models import Role, RoleAssignment

User = get_user_model()

ROLE_ASSIGNMENTS_URL = '/api/v1/auth/role-assignments/'


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(
        email=f'admin_{_uid()}@test.com', password='x',
    )
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_state():
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
    return State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)


def _make_sector():
    return OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')


def _make_role():
    return Role.objects.create(code=f'ROLE_{_uid()}', name=f'Role {_uid()}')


@pytest.mark.django_db
class TestScopeValidationAPI:
    """POST /api/v1/auth/role-assignments/ — scope validation."""

    def _post_assignment(self, client, **kwargs):
        target = User.objects.create_user(
            email=f'u_{_uid()}@x.com', password='x',
        )
        role = _make_role()
        payload = {
            'user': str(target.id),
            'role': role.code,           # SlugRelatedField (slug_field='code')
            **kwargs,
        }
        return client.post(ROLE_ASSIGNMENTS_URL, payload)

    def test_state_scope_via_api_now_works(self):
        """Bug fix M5-C-0: POST STATE + valid State.id → 201."""
        state = _make_state()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(
            client, scope_type='STATE', scope_id=str(state.id),
        )
        assert resp.status_code == 201, resp.json()
        body = resp.json()
        assignment_id = body.get('data', {}).get('id') or body.get('id')
        assert RoleAssignment.objects.filter(
            pk=assignment_id, scope_type='STATE', scope_id=state.id,
        ).exists()

    def test_state_scope_invalid_id_rejected(self):
        """POST STATE + random UUID → 400."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(
            client, scope_type='STATE', scope_id=str(uuid.uuid4()),
        )
        assert resp.status_code == 400
        assert 'state' in str(resp.json()).lower() or 'الولاية' in str(resp.json())

    def test_state_scope_missing_id_rejected(self):
        """POST STATE + no scope_id → 400."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(client, scope_type='STATE')
        assert resp.status_code == 400

    def test_global_scope_normalizes_any_id(self):
        """POST GLOBAL + scope_id → 201 with scope_id normalized to None.

        Documented convention (accounts/serializers.py:209-215): GLOBAL
        always carries scope_id=null; the API normalises silently.
        """
        state = _make_state()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(
            client, scope_type='GLOBAL', scope_id=str(state.id),
        )
        assert resp.status_code == 201, resp.json()
        body = resp.json()
        assignment_id = body.get('data', {}).get('id') or body.get('id')
        assignment = RoleAssignment.objects.get(pk=assignment_id)
        assert assignment.scope_type == 'GLOBAL'
        assert assignment.scope_id is None

    def test_sector_scope_still_works(self):
        """Regression: SECTOR still accepts a valid Sector.id → 201."""
        sector = _make_sector()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(
            client, scope_type='SECTOR', scope_id=str(sector.id),
        )
        assert resp.status_code == 201, resp.json()

    def test_unknown_scope_type_rejected(self):
        """POST with an unknown scope_type → 400 (ChoiceField)."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = self._post_assignment(
            client, scope_type='INVALID_TYPE_X', scope_id=str(uuid.uuid4()),
        )
        assert resp.status_code == 400
