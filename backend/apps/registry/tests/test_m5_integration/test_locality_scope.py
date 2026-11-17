"""M5-C-L — LOCALITY scope: resolver + gate + asserts_geographic_scope.

LOCALITY scope عبر `organization.Locality` — نفس نمط STATE (union بلا استبدال)،
مع بوابة إنتاج `PROD_SCOPING_ENABLED` (+ `DEBUG`) تحمي البيئة الإنتاجية حتى
يُتحقَّق من البيانات (COUNT). الاختبارات تفرض البوابة صراحةً عبر `settings`
لتكون مستقلة عن بيئة التطوير.
"""
import datetime
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import RoleAssignment
from apps.registry.models import ReportingNode, LocalityNodeAssignment
from core.utils import scoping

from .conftest import (
    _build_world, make_locality_user, make_plain_user,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _root_node():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


@pytest.mark.django_db
class TestLocalityResolver:

    def test_locality_resolves_own_entry_points(self, settings):
        """LOCALITY user يحل نقاط دخول محليته — لا محليات أخرى."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        user = make_locality_user(world_a['locality'])
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved
        assert str(world_b['entry_point'].id) not in resolved

    def test_locality_union_with_sector_not_replacement(self, settings):
        """LOCALITY A ∪ SECTOR B — اتحاد، ليس استبدالاً (H1′ بالنمط الموسّع)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        user = make_locality_user(world_a['locality'], with_perm=('laboratory',))
        role = user.role_assignments.first().role
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='SECTOR', scope_id=world_b['org_sector'].id,
        )
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved
        assert str(world_b['entry_point'].id) in resolved

    def test_plain_user_denied_unchanged(self, settings):
        """لا نطاق جديد يسرّب للملفات العادية — plain user يبقى deny-all."""
        settings.DEBUG = True
        plain = make_plain_user()
        assert scoping.resolve_authorized_entry_points(plain) == []

    def test_non_locality_scope_not_widened(self, settings):
        """STATE grant لا يُستنتج منه شيء يمنح LOCALITY (لا تسرب متبادل)."""
        settings.DEBUG = True
        world_a = _build_world('A')
        from .conftest import make_state_user
        user = make_state_user(world_a['state'])
        assert scoping.get_user_locality_ids(user) == set()

    def test_gate_off_debug_false_denies_resolver(self, settings):
        """الإنتاج بلا PROD_SCOPING_ENABLED ⇒ LOCALITY deny-all (fail-safe)."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        assert scoping.resolve_authorized_entry_points(user) == []

    def test_gate_on_debug_false_allows_resolver(self, settings):
        """DEBUG=False + PROD_SCOPING_ENABLED=True ⇒ LOCALITY تعمل بعد التحقق."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = True
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        resolved = {str(i) for i in scoping.resolve_authorized_entry_points(user)}
        assert str(world_a['entry_point'].id) in resolved

    def test_gate_off_api_assignments_still_locality_forbidden_scope(self, settings):
        """البوابة مغلقة ⇒ get_user_locality_ids ينفي — لا محليات حتى لتفويض LOCALITY."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        assert scoping.get_user_locality_ids(user) == set()


@pytest.mark.django_db
class TestLocalityGeographicAssert:

    def test_locality_asserted_even_gate_off(self, settings):
        """LOCALITY تُطالب بالبُعد الجغرافي حتى بلا بوابة: fail-closed وليس عام."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        assert scoping.asserts_geographic_scope(user) is True

    def test_locality_combined_scope_fails_closed_in_prod(self, settings):
        """البوابة مغلقة:has_port_scope=True مع port_ids=[] ⇒ deny-all لا «عام»."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        info = scoping.resolve_combined_scope_ids(user)
        assert info['has_port_scope'] is True
        assert info['port_ids'] == []
        assert info['has_company_scope'] is False

    def test_locality_combined_scope_open_in_dev(self, settings):
        """البوابة مفتوحة (DEBUG): port_ids تحمل معرفات محلية المستخدم."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'])
        info = scoping.resolve_combined_scope_ids(user)
        assert info['has_port_scope'] is True
        assert {str(i) for i in info['port_ids']} == {str(world_a['entry_point'].id)}


@pytest.mark.django_db
class TestLocalityRegistryNodes:

    def test_locality_user_sees_own_locality_node_only(self, settings):
        """عقدة LOCALITY المخصصة لمحليتي مرئية؛ عقدة محلية أخرى غير مرئية."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        root = _root_node()
        node_a = ReportingNode.objects.create(
            code=f'NLA_{_uid()}', name_ar='عقدة أ', kind='LOCALITY', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NLB_{_uid()}', name_ar='عقدة ب', kind='LOCALITY', parent=root,
        )
        LocalityNodeAssignment.objects.create(
            node=node_a, locality=world_a['locality'], valid_from=datetime.date(2026, 1, 1),
        )
        LocalityNodeAssignment.objects.create(
            node=node_b, locality=world_b['locality'], valid_from=datetime.date(2026, 1, 1),
        )

        from apps.registry.views import _visible_reporting_node_ids
        user = make_locality_user(world_a['locality'])
        visible = _visible_reporting_node_ids(user)
        assert node_a.id in visible
        assert node_b.id not in visible

    def test_locality_node_subtree_visible(self, settings):
        """عقدة فرعية تحت عقدة LocalityNodeAssignment مرئية أيضاً (subtree)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        root = _root_node()
        locality_node = ReportingNode.objects.create(
            code=f'NLA_{_uid()}', name_ar='عقدة أ', kind='LOCALITY', parent=root,
        )
        child = ReportingNode.objects.create(
            code=f'CH_{_uid()}', name_ar='فرع', kind='FACILITY', parent=locality_node,
        )
        LocalityNodeAssignment.objects.create(
            node=locality_node, locality=world_a['locality'], valid_from=datetime.date(2026, 1, 1),
        )

        from apps.registry.views import _visible_reporting_node_ids
        user = make_locality_user(world_a['locality'])
        visible = _visible_reporting_node_ids(user)
        assert locality_node.id in visible
        assert child.id in visible
