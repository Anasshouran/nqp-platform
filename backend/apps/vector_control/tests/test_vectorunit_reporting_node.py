import uuid

import pytest

from apps.vector_control.models import VectorUnit
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment
from apps.masterdata.models import HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State


def _uid():
    return uuid.uuid4().hex[:8]


def _build_hierarchy():
    """ybni state→locality→entry_point→health_facility للاختبار."""
    md = MasterdataSector.objects.create(code=f'MD_VU_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_VU_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_VU_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_VU_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = HealthFacility.objects.create(
        code=f'EP_VU_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_VU_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_VU_{_uid()}', name_ar='جذر اختبار', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_VU_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    node = ReportingNode.objects.create(
        code=f'FAC_NODE_VU_{_uid()}', name_ar='عقدة منشأة اختبار', kind='FACILITY', parent=state_node,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=node, valid_from=None, valid_to=None,
    )
    return {'facility': fac, 'node': node, 'state_node': state_node, 'sector': md}


@pytest.mark.django_db
class TestVectorUnitReportingNodeFK:
    """10 اختبارات لـ VectorUnit.reporting_node FK (مرآة A2b-full Phase 1)."""

    def test_reporting_node_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            sector=ctx['sector'],
        )
        assert unit.reporting_node is None

    def test_reporting_node_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة."""
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'], reporting_node=ctx['node'],
            sector=ctx['sector'],
        )
        assert unit.reporting_node_id == ctx['node'].id

    def test_no_save_sync_on_assignment_change(self):
        """IQ3 — لا مزامنة: تغيير التعيين لا يغير reporting_node मौجد."""
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'], reporting_node=ctx['node'],
            sector=ctx['sector'],
        )
        HealthFacilityNodeAssignment.objects.filter(
            facility=ctx['facility'], valid_to__isnull=True
        ).update(valid_to=None)
        unit.refresh_from_db()
        assert unit.reporting_node_id == ctx['node'].id

    def test_set_null_on_facility_delete(self):
        """IQ4 — SET_NULL عند حذف المنشأة."""
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'], reporting_node=ctx['node'],
            sector=ctx['sector'],
        )
        ctx['facility'].delete()
        unit.refresh_from_db()
        assert unit.reporting_node_id is None

    def test_serializer_includes_reporting_node(self):
        """IQ5 — السيالير يتضمن reporting_node (قراءة + كتابة)."""
        from apps.vector_control.serializers import VectorUnitSerializer
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'], reporting_node=ctx['node'],
            sector=ctx['sector'],
        )
        data = VectorUnitSerializer(unit).data
        assert data['reporting_node'] == str(ctx['node'].id)

    def test_backfill_dry_run_no_change(self):
        """IQ6 — dry-run لا يغير أي شيء."""
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'],
            sector=ctx['sector'],
        )
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('backfill_vectorunit_reporting_node', '--dry-run', stdout=out)
        unit.refresh_from_db()
        assert unit.reporting_node_id is None

    def test_backfill_unique_assignment_fills(self):
        """IQ7 — تعيين واحد → يملأ reporting_node."""
        ctx = _build_hierarchy()
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'],
            sector=ctx['sector'],
        )
        from django.core.management import call_command
        call_command('backfill_vectorunit_reporting_node')
        unit.refresh_from_db()
        assert unit.reporting_node_id == ctx['node'].id

    def test_backfill_ambiguous_null(self):
        """IQ8 — تعيينات متعددة (>1) → NULL (fail-safe)."""
        ctx = _build_hierarchy()
        node2 = ReportingNode.objects.create(
            code=f'FAC_NODE2_VU_{_uid()}', name_ar='عقدة ثانية', kind='FACILITY', parent=ctx['state_node'],
        )
        HealthFacilityNodeAssignment.objects.create(
            facility=ctx['facility'], node=node2, valid_from=None, valid_to=None,
        )
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'],
            sector=ctx['sector'],
        )
        from django.core.management import call_command
        call_command('backfill_vectorunit_reporting_node')
        unit.refresh_from_db()
        assert unit.reporting_node_id is None

    def test_backfill_unassigned_null(self):
        """IQ9 — لا تعيين → NULL."""
        fac_no_assign = HealthFacility.objects.create(
            code=f'FAC_NO_VU_{_uid()}', name_ar='منشأة بلا تعيين', sector=None, locality=None, entry_point=None,
        )
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=fac_no_assign,
            sector=ctx['sector'],
        )
        from django.core.management import call_command
        call_command('backfill_vectorunit_reporting_node')
        unit.refresh_from_db()
        assert unit.reporting_node_id is None

    def test_backfill_does_not_overwrite_existing(self):
        """IQ10 — لا يُكتب على reporting_node موجود."""
        ctx = _build_hierarchy()
        other_node = ReportingNode.objects.create(
            code=f'OTHER_VU_{_uid()}', name_ar='عقدة أخرى', kind='FACILITY', parent=ctx['state_node'],
        )
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة اختبار', kind='SURVEILLANCE',
            facility=ctx['facility'], reporting_node=other_node,
            sector=ctx['sector'],
        )
        from django.core.management import call_command
        call_command('backfill_vectorunit_reporting_node')
        unit.refresh_from_db()
        assert unit.reporting_node_id == other_node.id
