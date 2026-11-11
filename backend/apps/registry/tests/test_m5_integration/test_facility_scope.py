"""M5-C-F — FACILITY scope: resolver + gate + registry node visibility.

FACILITY يتحوّل إلى نقاط دخول عبر الجسر الوحيد المتاح
`HealthFacility.entry_point` (SET_NULL). منشأة بلا `entry_point` لا تفتح
أي منفذ (fail-safe)، لكنها تبقى مرئية في السجل عبر
`HealthFacilityNodeAssignment` (وهذا سبب وجود الاتحاد في طبقة السجل).

البوابة مشتركة مع LOCALITY (D-F-5): `DEBUG` أو `PROD_SCOPING_ENABLED`.
الاختبارات تفرض البوابة صراحةً عبر `settings` حتى لا تعتمد على بيئة التطوير.
"""
import datetime
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import RoleAssignment
from apps.masterdata.models import HealthFacility
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment
from core.utils import scoping

from .conftest import (
    _build_world, _role_with_perm, make_plain_user, make_state_user,
)

User = get_user_model()

DEFAULT_PERMS = (
    'port_health', 'shipping', 'laboratory', 'vector', 'screening',
    'hr_employee', 'surveillance', 'vaccination', 'borders_health',
)


def _uid():
    return uuid.uuid4().hex[:8]


def _make_facility_user(facility, *, with_perm=DEFAULT_PERMS):
    """FACILITY user — scope_type=FACILITY, scope_id=<masterdata.HealthFacility id>."""
    uid = _uid()
    user = User.objects.create_user(email=f'facility_{uid}@x.com', password='x')
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
    """منشأة بلا `entry_point` — لا جسر إلى أي نقطة دخول."""
    return HealthFacility.objects.create(
        code=f'FAC_NEP_{_uid()}', name_ar='منشأة بلا منفذ',
        sector=world['org_sector'], locality=world['locality'],
    )


@pytest.mark.django_db
class TestFacilityResolver:

    def test_facility_resolves_own_entry_point_and_ids(self, settings):
        """FACILITY user يحل نقطة دخول منشأته، ومعرّف منشأته فقط."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        user = _make_facility_user(world_a['facility'])
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved
        assert str(world_b['entry_point'].id) not in resolved, (
            'Cross-facility leak in resolver!'
        )
        facility_ids = scoping.get_user_facility_ids(user)
        assert facility_ids == {world_a['facility'].id}
        assert world_b['facility'].id not in facility_ids

    def test_facility_without_entry_point_resolves_empty(self, settings):
        """منشأة بلا entry_point ⇒ لا نقاط دخول (fail-safe، لا توسيع ضمني)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        facility = _facility_without_entry_point(world_a)
        user = _make_facility_user(facility)
        assert scoping.resolve_authorized_entry_points(user) == []

    def test_facility_union_with_sector_not_replacement(self, settings):
        """FACILITY A ∪ SECTOR B — اتحاد، ليس استبدالاً (H1′ بالنمط الموسّع)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        user = _make_facility_user(world_a['facility'], with_perm=('laboratory',))
        role = user.role_assignments.first().role
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='SECTOR', scope_id=world_b['org_sector'].id,
        )
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved
        assert str(world_b['entry_point'].id) in resolved

    def test_plain_user_denied_unchanged(self, settings):
        """ملف بلا أي نطاق يبقى deny-all."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        plain = make_plain_user()
        assert scoping.resolve_authorized_entry_points(plain) == []

    def test_non_facility_scope_not_widened(self, settings):
        """STATE grant لا يُستنتج منه FACILITY (لا تسرب متبادل)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_state_user(world_a['state'])
        assert scoping.get_user_facility_ids(user) == set()


@pytest.mark.django_db
class TestFacilityGate:
    """البوابة المشتركة مع LOCALITY (D-F-5 = PROD_SCOPING_ENABLED)."""

    def test_gate_off_debug_false_denies_resolver(self, settings):
        """إنتاج بلا PROD_SCOPING_ENABLED ⇒ FACILITY deny-all (fail-safe)."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = _make_facility_user(world_a['facility'])
        assert scoping.resolve_authorized_entry_points(user) == []
        assert scoping.get_user_facility_ids(user) == set()

    def test_gate_on_debug_false_allows_resolver(self, settings):
        """DEBUG=False + PROD_SCOPING_ENABLED=True ⇒ FACILITY تعمل بعد التحقق."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = True
        world_a = _build_world('A')
        user = _make_facility_user(world_a['facility'])
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved

    def test_gate_off_registry_denies_node_visibility(self, settings):
        """البوابة مغلقة ⇒ حتى عقدة المنشأة المباشرة غير مرئية (fail-closed)."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        root = _root_node()
        node = ReportingNode.objects.create(
            code=f'NFG_{_uid()}', name_ar='عقدة منشأة', kind='FACILITY', parent=root,
        )
        HealthFacilityNodeAssignment.objects.create(
            node=node, facility=world_a['facility'],
            valid_from=datetime.date(2026, 1, 1),
        )

        from apps.registry.views import _visible_reporting_node_ids
        user = _make_facility_user(world_a['facility'])
        assert node.id not in (_visible_reporting_node_ids(user) or set())


@pytest.mark.django_db
class TestFacilityRegistryNodes:

    def test_registry_facility_node_visible_without_entry_point(self, settings):
        """منشأة بلا entry_point: عقدتها مرئية عبر HealthFacilityNodeAssignment."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        facility = _facility_without_entry_point(world_a)
        root = _root_node()
        node_a = ReportingNode.objects.create(
            code=f'NFA_{_uid()}', name_ar='عقدة منشأة أ', kind='FACILITY', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NFB_{_uid()}', name_ar='عقدة منشأة ب', kind='FACILITY', parent=root,
        )
        HealthFacilityNodeAssignment.objects.create(
            node=node_a, facility=facility, valid_from=datetime.date(2026, 1, 1),
        )
        HealthFacilityNodeAssignment.objects.create(
            node=node_b, facility=world_b['facility'],
            valid_from=datetime.date(2026, 1, 1),
        )

        from apps.registry.views import _visible_reporting_node_ids
        user = _make_facility_user(facility)
        visible = _visible_reporting_node_ids(user) or set()
        assert node_a.id in visible, (
            'FACILITY node invisible — union of get_user_facility_ids failed'
        )
        assert node_b.id not in visible, 'Cross-facility node leak!'

    def test_registry_facility_node_subtree_visible(self, settings):
        """عقدة فرعية تحت عقدة منشأة المستخدم مرئية (subtree — D-M4-1-1)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        facility = _facility_without_entry_point(world_a)
        root = _root_node()
        facility_node = ReportingNode.objects.create(
            code=f'NFA_{_uid()}', name_ar='عقدة منشأة', kind='FACILITY', parent=root,
        )
        child = ReportingNode.objects.create(
            code=f'CH_{_uid()}', name_ar='فرع', kind='SERVICE', parent=facility_node,
        )
        HealthFacilityNodeAssignment.objects.create(
            node=facility_node, facility=facility,
            valid_from=datetime.date(2026, 1, 1),
        )

        from apps.registry.views import _visible_reporting_node_ids
        user = _make_facility_user(facility)
        visible = _visible_reporting_node_ids(user) or set()
        assert facility_node.id in visible
        assert child.id in visible
