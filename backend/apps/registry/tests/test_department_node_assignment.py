"""اختبارات DepartmentNodeAssignment."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.organization.models import Department
from apps.registry.models import ReportingNode, DepartmentNodeAssignment, RegistryChangeLog

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


def _make_dept_node():
    root = _ensure_root()
    return ReportingNode.objects.create(
        code=f'DEPT_NODE_{_uid()}', name_ar='عقدة إدارة',
        kind='DEPARTMENT', parent=root,
    )


def _make_department():
    return Department.objects.create(
        code=f'DEPT_{_uid()}', name_ar='إدارة', kind='DEPARTMENT',
    )


@pytest.mark.django_db
class TestDepartmentNodeAssignmentModel:

    def test_create_assignment(self):
        dept = _make_department()
        node = _make_dept_node()
        a = DepartmentNodeAssignment.objects.create(
            department=dept, node=node,
            valid_from='2026-01-01', is_primary=True,
        )
        assert a.is_primary
        assert a.node.kind == 'DEPARTMENT'

    def test_node_kind_must_be_department(self):
        """node.kind ≠ 'DEPARTMENT' → ValidationError."""
        dept = _make_department()
        root = _ensure_root()  # FEDERAL, not DEPARTMENT
        a = DepartmentNodeAssignment(
            department=dept, node=root,
            valid_from='2026-01-01',
        )
        with pytest.raises((ValidationError, Exception)):
            a.full_clean()

    def test_invalid_date_range(self):
        dept = _make_department()
        node = _make_dept_node()
        a = DepartmentNodeAssignment(
            department=dept, node=node,
            valid_from='2026-12-31', valid_to='2026-01-01',
        )
        with pytest.raises((ValidationError, Exception)):
            a.full_clean()

    def test_two_active_primaries_rejected(self):
        dept = _make_department()
        node1 = _make_dept_node()
        node2 = _make_dept_node()
        DepartmentNodeAssignment.objects.create(
            department=dept, node=node1,
            valid_from='2026-01-01', is_primary=True,
        )
        with pytest.raises((ValidationError, Exception)):
            a2 = DepartmentNodeAssignment(
                department=dept, node=node2,
                valid_from='2026-06-01', is_primary=True,
            )
            a2.full_clean()

    def test_historical_assignment_allowed(self):
        dept = _make_department()
        node1 = _make_dept_node()
        node2 = _make_dept_node()
        DepartmentNodeAssignment.objects.create(
            department=dept, node=node1,
            valid_from='2025-01-01', valid_to='2025-12-31',
            is_primary=True,
        )
        a2 = DepartmentNodeAssignment.objects.create(
            department=dept, node=node2,
            valid_from='2026-01-01', is_primary=True,
        )
        assert a2.pk is not None


@pytest.mark.django_db
class TestDepartmentNodeAssignmentAPI:

    def test_create_assignment_api(self):
        dept = _make_department()
        node = _make_dept_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/department-assignments/', {
            'department': str(dept.id),
            'node': str(node.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert response.status_code == 201, response.json()

    def test_create_with_wrong_node_kind_api(self):
        dept = _make_department()
        root = _ensure_root()  # FEDERAL
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/department-assignments/', {
            'department': str(dept.id),
            'node': str(root.id),
            'valid_from': '2026-01-01',
        })
        assert response.status_code == 400, response.json()

    def test_signals_create_assign_log(self):
        dept = _make_department()
        node = _make_dept_node()
        before = RegistryChangeLog.objects.count()
        DepartmentNodeAssignment.objects.create(
            department=dept, node=node,
            valid_from='2026-01-01', is_primary=True,
        )
        assert RegistryChangeLog.objects.count() == before + 1
        last = RegistryChangeLog.objects.order_by('-created_at').first()
        assert last.action == 'ASSIGN'
