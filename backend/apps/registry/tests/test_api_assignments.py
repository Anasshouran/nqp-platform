"""اختبارات StateNodeAssignment API."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import Sector as MasterdataSector, State
from apps.registry.models import ReportingNode, StateNodeAssignment

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _make_state_node():
    root = _ensure_root()
    return ReportingNode.objects.create(
        code=f'SN_{_uid()}', name_ar='ولاية عقدة', kind='STATE', parent=root,
    )


def _make_state():
    sector = MasterdataSector.objects.create(
        code=f'SEC_{_uid()}', name_ar='قطاع',
    )
    return State.objects.create(
        code=f'ST_{_uid()}', name_ar='ولاية', sector=sector,
    )


@pytest.mark.django_db
class TestStateAssignmentsAPI:

    def test_create_valid_assignment(self):
        state = _make_state()
        node = _make_state_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert response.status_code == 201, response.json()
        assert StateNodeAssignment.objects.filter(state=state, node=node).exists()

    def test_invalid_date_range_rejected(self):
        state = _make_state()
        node = _make_state_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node.id),
            'valid_from': '2026-12-31',
            'valid_to': '2026-01-01',  # before valid_from
            'is_primary': False,
        })
        assert response.status_code == 400, (
            f"Expected 400 (valid_to <= valid_from), got {response.status_code}."
        )

    def test_two_active_primaries_rejected(self):
        state = _make_state()
        node1 = _make_state_node()
        node2 = _make_state_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())

        r1 = client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node1.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert r1.status_code == 201, r1.json()

        r2 = client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node2.id),
            'valid_from': '2026-06-01',
            'is_primary': True,
        })
        assert r2.status_code == 400, (
            f"Expected 400 for second active primary, got {r2.status_code}. "
            "If 201: serializer doesn't enforce 'one active primary'. "
            "Check full_clean() or partial unique constraint."
        )

    def test_historical_assignment_allowed(self):
        """تعيين أساسي جديد بعد إغلاق القديم (valid_to) مسموح."""
        state = _make_state()
        node1 = _make_state_node()
        node2 = _make_state_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())

        client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node1.id),
            'valid_from': '2025-01-01',
            'valid_to': '2025-12-31',
            'is_primary': True,
        })
        r2 = client.post('/api/v1/registry/states/assignments/', {
            'state': str(state.id),
            'node': str(node2.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert r2.status_code == 201, r2.json()
