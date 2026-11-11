"""M5-C-F — H1′ consistency: FACILITY عبر نقطتي فرض السجل.

نقطتا الفرض في السجل:
  1. `_visible_reporting_node_ids` (helper) → يخدم `/api/v1/registry/nodes/`.
  2. `node_visibility_q` المضمّن في `RegistryScopedViewSet.get_queryset` →
     يخدم فرع `ServiceNodeAssignment` (تعيينات الخدمات تحت شجرة العقد المرئية).

يجب أن يتفق الموقعان على نفس شجرة المنشأة (بما فيها `valid_to__isnull=True`)،
وألا يتسرب أي شيء من منشأة أخرى (H1′ بالنمط الموسّع — بلا استبدال).
"""
import datetime
import uuid

import pytest

from apps.accounts.models import RoleAssignment
from apps.masterdata.models import HealthFacility
from apps.registry.models import (
    ReportingNode, HealthFacilityNodeAssignment, Service, ServiceNodeAssignment,
)

from .conftest import _build_world, _role_with_perm, api_client, list_items

from django.contrib.auth import get_user_model

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_facility_user(facility, *, with_perm=('registry',)):
    uid = _uid()
    user = User.objects.create_user(email=f'faccons_{uid}@x.com', password='x')
    role = _role_with_perm('FACILITY', list(with_perm))
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='FACILITY', scope_id=facility.id,
    )
    return user


def _root_node():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _facility_without_entry_point(world):
    return HealthFacility.objects.create(
        code=f'FAC_NEP_{_uid()}', name_ar='منشأة بلا منفذ',
        sector=world['org_sector'], locality=world['locality'],
    )


def _service_node(parent, *, facility_node):
    """عقدة خدمة تحت عقدة المنشأة + تعيين خدمة لها."""
    node = ReportingNode.objects.create(
        code=f'SVC_{_uid()}', name_ar='خدمة', kind='SERVICE', parent=parent,
    )
    service = Service.objects.create(
        code=f'SRV_{_uid()}', name_ar='خدمة صحية', category='OTHER',
    )
    assignment = ServiceNodeAssignment.objects.create(
        service=service, node=node, valid_from=datetime.date(2026, 1, 1),
    )
    return node, assignment


@pytest.mark.django_db
class TestFacilityConsistency:

    def test_registry_helper_and_service_branch_consistent(self, settings):
        """الموقعان يتفقان: عقد شجرة المنشأة مرئية في nodes وفي تعيينات الخدمات."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        facility = _facility_without_entry_point(world_a)
        root = _root_node()

        facility_node = ReportingNode.objects.create(
            code=f'NFA_{_uid()}', name_ar='منشأة أ', kind='FACILITY', parent=root,
        )
        service_node, assign_a = _service_node(facility_node, facility_node=facility_node)
        HealthFacilityNodeAssignment.objects.create(
            node=facility_node, facility=facility,
            valid_from=datetime.date(2026, 1, 1),
        )

        foreign_node = ReportingNode.objects.create(
            code=f'NFB_{_uid()}', name_ar='منشأة ب', kind='FACILITY', parent=root,
        )
        _foreign_service_node, assign_b = _service_node(
            foreign_node, facility_node=foreign_node,
        )
        HealthFacilityNodeAssignment.objects.create(
            node=foreign_node, facility=world_b['facility'],
            valid_from=datetime.date(2026, 1, 1),
        )

        user = _make_facility_user(facility)
        client = api_client()
        client.force_authenticate(user=user)

        resp_nodes = client.get('/api/v1/registry/nodes/')
        resp_assign = client.get('/api/v1/registry/service-node-assignments/')
        assert resp_nodes.status_code == 200
        assert resp_assign.status_code == 200

        node_ids = {str(i['id']) for i in list_items(resp_nodes)}
        assign_ids = {str(i['id']) for i in list_items(resp_assign)}

        # الموقع (1): شجرة المنشأة كاملة (العقدة + خدمتها) وبلا عقدة أجنبية.
        assert str(facility_node.id) in node_ids
        assert str(service_node.id) in node_ids
        assert str(foreign_node.id) not in node_ids

        # الموقع (2): تعيين الخدمة تحت الشجرة المرئية فقط — اتفاق مع (1).
        assert str(assign_a.id) in assign_ids
        assert str(assign_b.id) not in assign_ids, (
            'Registry enforcement inconsistency — service branch leaked a '
            'foreign facility tree'
        )

    def test_facility_historical_assignment_not_visible(self, settings):
        """التعيين المنتهي (valid_to) لا يمنح رؤية دائمة — D-M4-2-5."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        facility = _facility_without_entry_point(world_a)
        root = _root_node()

        node = ReportingNode.objects.create(
            code=f'NFH_{_uid()}', name_ar='منشأة تاريخية', kind='FACILITY', parent=root,
        )
        HealthFacilityNodeAssignment.objects.create(
            node=node, facility=facility,
            valid_from=datetime.date(2025, 1, 1),
            valid_to=datetime.date(2025, 12, 31),
        )

        user = _make_facility_user(facility)
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/registry/nodes/')
        assert resp.status_code == 200
        node_ids = {str(i['id']) for i in list_items(resp)}
        assert str(node.id) not in node_ids, (
            'Historical assignment leak — valid_to__isnull=True guard missing'
        )
