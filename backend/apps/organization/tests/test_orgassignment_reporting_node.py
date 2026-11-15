import uuid

import pytest
from django.utils import timezone
from django.utils.timezone import timedelta

from apps.organization.models import OrgAssignment
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment
from apps.masterdata.models import EntryPoint, HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username=f'user_{_uid()}', email=f'user_{_uid()}@example.com', password='testpass'
    )


def _build_hierarchy():
    """ybni state→locality→entry_point→health_facility للاختبار."""
    md = MasterdataSector.objects.create(code=f'MD_OA_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_OA_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_OA_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_OA_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_OA_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_OA_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_OA_{_uid()}', name_ar='جذر اختبار', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_OA_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    node = ReportingNode.objects.create(
        code=f'FAC_NODE_OA_{_uid()}', name_ar='عقدة منشأة اختبار', kind='FACILITY', parent=state_node,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=node, valid_from=timezone.now(), valid_to=None,
    )
    return {'facility': fac, 'node': node, 'state_node': state_node, 'user': _make_user()}


@pytest.mark.django_db
class TestOrgAssignmentReportingNodeFK:
    """10 اختبارات لـ OrgAssignment.reporting_node FK (مرآة A2c-1 Phase 1)."""

    def test_reporting_node_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            sector=OrgSector.objects.first(),
        )
        assert assignment.reporting_node is None

    def test_reporting_node_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
            reporting_node=ctx['node'],
        )
        assert assignment.reporting_node_id == ctx['node'].id

    def test_no_save_sync_on_assignment_change(self):
        """IQ3 — لا مزامنة: تغيير التعيين لا يغير reporting_node मौجد."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
            reporting_node=ctx['node'],
        )
        HealthFacilityNodeAssignment.objects.filter(
            facility=ctx['facility'], valid_to__isnull=True
        ).update(valid_to=None)
        assignment.refresh_from_db()
        assert assignment.reporting_node_id == ctx['node'].id

    def test_set_null_on_facility_delete(self):
        """IQ4 — SET_NULL عند حذف المنشأة (facility_id يُNull، reporting_node مستقل)."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
            reporting_node=ctx['node'],
        )
        ctx['facility'].delete()
        assignment.refresh_from_db()
        assert assignment.facility_id is None
        assert assignment.reporting_node_id == ctx['node'].id

    def test_serializer_includes_reporting_node(self):
        """IQ5 — السيالير يتضمن reporting_node (قراءة + كتابة)."""
        from apps.organization.serializers import OrgAssignmentSerializer
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
            reporting_node=ctx['node'],
        )
        data = OrgAssignmentSerializer(assignment).data
        assert data['reporting_node'] == ctx['node'].id

    def test_backfill_dry_run_no_change(self):
        """IQ6 — dry-run لا يغير أي شيء."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
        )
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('backfill_orgassignment_reporting_node', '--dry-run', stdout=out)
        assignment.refresh_from_db()
        assert assignment.reporting_node_id is None

    def test_backfill_unique_assignment_fills(self):
        """IQ7 — تعيين واحد → يملأ reporting_node."""
        ctx = _build_hierarchy()
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
        )
        from django.core.management import call_command
        call_command('backfill_orgassignment_reporting_node')
        assignment.refresh_from_db()
        assert assignment.reporting_node_id == ctx['node'].id

    def test_backfill_ambiguous_null(self):
        """IQ8 — تعيينات متعددة (>1) → NULL (fail-safe)."""
        ctx = _build_hierarchy()
        node2 = ReportingNode.objects.create(
            code=f'FAC_NODE2_OA_{_uid()}', name_ar='عقدة ثانية', kind='FACILITY', parent=ctx['state_node'],
        )
        HealthFacilityNodeAssignment.objects.create(
            facility=ctx['facility'], node=node2, valid_from=timezone.now().date() + timedelta(days=1), valid_to=None,
        )
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
        )
        from django.core.management import call_command
        call_command('backfill_orgassignment_reporting_node')
        assignment.refresh_from_db()
        assert assignment.reporting_node_id is None

    def test_backfill_unassigned_null(self):
        """IQ9 — لا تعيين → NULL."""
        ctx = _build_hierarchy()
        fac_no_assign = HealthFacility.objects.create(
            code=f'FAC_NO_OA_{_uid()}', name_ar='منشأة بلا تعيين', sector=None, locality=None, entry_point=None,
        )
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=fac_no_assign,
        )
        from django.core.management import call_command
        call_command('backfill_orgassignment_reporting_node')
        assignment.refresh_from_db()
        assert assignment.reporting_node_id is None

    def test_backfill_does_not_overwrite_existing(self):
        """IQ10 — لا يُكتب على reporting_node موجود."""
        ctx = _build_hierarchy()
        other_node = ReportingNode.objects.create(
            code=f'OTHER_OA_{_uid()}', name_ar='عقدة أخرى', kind='FACILITY', parent=ctx['state_node'],
        )
        assignment = OrgAssignment.objects.create(
            user=ctx['user'],
            facility=ctx['facility'],
            reporting_node=other_node,
        )
        from django.core.management import call_command
        call_command('backfill_orgassignment_reporting_node')
        assignment.refresh_from_db()
        assert assignment.reporting_node_id == other_node.id
