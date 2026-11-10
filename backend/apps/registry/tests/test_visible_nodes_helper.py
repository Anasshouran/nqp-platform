"""Unit tests for _visible_reporting_node_ids helper (M4-3-bis refactor)."""
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.masterdata.models import Sector as MasterdataSector, State, EntryPoint, HealthFacility
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment, StateNodeAssignment
from apps.registry.views import _visible_reporting_node_ids
from apps.accounts.models import Role, RoleAssignment

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


@pytest.mark.django_db
class TestVisibleReportingNodeIds:

    def test_superuser_returns_none(self):
        user = User.objects.create_user(email='su@x.com', password='x')
        user.is_superuser = True
        user.is_staff = True
        user.save()
        assert _visible_reporting_node_ids(user) is None

    def test_plain_user_returns_empty(self):
        user = User.objects.create_user(email='p@x.com', password='x')
        result = _visible_reporting_node_ids(user)
        assert result is not None
        assert len(result) == 0

    def test_state_user_returns_own_subtree(self):
        uid = _uid()
        md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
        state = State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)

        root = _ensure_root()
        state_node = ReportingNode.objects.create(
            code=f'SN_{uid}', name_ar='عقدة ولاية', kind='STATE', parent=root,
        )
        child_node = ReportingNode.objects.create(
            code=f'CN_{uid}', name_ar='طفل', kind='LOCALITY', parent=state_node,
        )
        other_node = ReportingNode.objects.create(
            code=f'ON_{uid}', name_ar='أخرى', kind='STATE', parent=root,
        )

        StateNodeAssignment.objects.create(
            state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
        )

        user = User.objects.create_user(email=f'st_{uid}@x.com', password='x')
        role = Role.objects.create(code=f'R_{uid}', name=f'ST_{uid}')
        RoleAssignment.objects.create(user=user, role=role, scope_type='STATE', scope_id=state.id)

        result = _visible_reporting_node_ids(user)
        assert result is not None
        assert state_node.id in result
        assert child_node.id in result
        assert other_node.id not in result
