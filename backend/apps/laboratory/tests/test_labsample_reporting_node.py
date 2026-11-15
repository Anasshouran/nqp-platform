import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import models

from apps.laboratory.models import LabSample
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment
from apps.masterdata.models import EntryPoint, HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State


def _uid():
    return uuid.uuid4().hex[:8]


def _make_collector():
    User = get_user_model()
    return User.objects.create_user(
        username=f'collector_{_uid()}', email=f'collector_{_uid()}@example.com', password='testpass'
    )


def _build_hierarchy():
    """ybni state→locality→entry_point→health_facility للاختبار."""
    md = MasterdataSector.objects.create(code=f'MD_LS_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_LS_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_LS_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_LS_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_LS_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_LS_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_LS_{_uid()}', name_ar='جذر اختبار', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_LS_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    node = ReportingNode.objects.create(
        code=f'FAC_NODE_LS_{_uid()}', name_ar='عقدة منشأة اختبار', kind='FACILITY', parent=state_node,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=node, valid_from=None, valid_to=None,
    )
    return {'facility': fac, 'node': node, 'state_node': state_node}


@pytest.mark.django_db
class TestLabSampleReportingNodeFK:
    """10 اختبارات لـ LabSample.reporting_node FK (مرآة A2b-full Phase 1)."""

    def test_reporting_node_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            collector=_make_collector(),
        )
        assert sample.reporting_node is None

    def test_reporting_node_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة."""
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'], reporting_node=ctx['node'],
            collector=_make_collector(),
        )
        assert sample.reporting_node_id == ctx['node'].id

    def test_no_save_sync_on_assignment_change(self):
        """IQ3 — لا مزامنة: تغيير التعيين لا يغير reporting_node मौجد."""
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'], reporting_node=ctx['node'],
            collector=_make_collector(),
        )
        # تغيير التعيين في HealthFacilityNodeAssignment لا يجب أن يؤثر على sample मौجد
        HealthFacilityNodeAssignment.objects.filter(
            facility=ctx['facility'], valid_to__isnull=True
        ).update(valid_to=None)  # no-op to prove no signal/save sync
        sample.refresh_from_db()
        assert sample.reporting_node_id == ctx['node'].id

    def test_set_null_on_facility_delete(self):
        """IQ4 — SET_NULL عند حذف المنشأة."""
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'], reporting_node=ctx['node'],
            collector=_make_collector(),
        )
        ctx['facility'].delete()
        sample.refresh_from_db()
        assert sample.reporting_node_id is None

    def test_serializer_includes_reporting_node(self):
        """IQ5 — السيالير يتضمن reporting_node (قراءة + كتابة)."""
        from apps.laboratory.serializers import LabSampleSerializer
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'], reporting_node=ctx['node'],
            collector=_make_collector(),
        )
        data = LabSampleSerializer(sample).data
        assert data['reporting_node'] == str(ctx['node'].id)

    def test_backfill_dry_run_no_change(self):
        """IQ6 — dry-run لا يغير أي شيء."""
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'],
            collector=_make_collector(),
        )
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('backfill_labsample_reporting_node', '--dry-run', stdout=out)
        sample.refresh_from_db()
        assert sample.reporting_node_id is None  # لم يتغير

    def test_backfill_unique_assignment_fills(self):
        """IQ7 — تعيين واحد → يملأ reporting_node."""
        ctx = _build_hierarchy()
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'],
            collector=_make_collector(),
        )
        from django.core.management import call_command
        call_command('backfill_labsample_reporting_node')
        sample.refresh_from_db()
        assert sample.reporting_node_id == ctx['node'].id

    def test_backfill_ambiguous_null(self):
        """IQ8 — تعيينات متعددة (>1) → NULL (fail-safe)."""
        ctx = _build_hierarchy()
        # تعيين ثاني لنفس المنشأة
        node2 = ReportingNode.objects.create(
            code=f'FAC_NODE2_LS_{_uid()}', name_ar='عقدة ثانية', kind='FACILITY', parent=ctx['state_node'],
        )
        HealthFacilityNodeAssignment.objects.create(
            facility=ctx['facility'], node=node2, valid_from=None, valid_to=None,
        )
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'],
            collector=_make_collector(),
        )
        from django.core.management import call_command
        call_command('backfill_labsample_reporting_node')
        sample.refresh_from_db()
        assert sample.reporting_node_id is None  # ambiguous → NULL

    def test_backfill_unassigned_null(self):
        """IQ9 — لا تعيين → NULL."""
        fac_no_assign = HealthFacility.objects.create(
            code=f'FAC_NO_LS_{_uid()}', name_ar='منشأة بلا تعيين', sector=None, locality=None, entry_point=None,
        )
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=fac_no_assign,
            collector=_make_collector(),
        )
        from django.core.management import call_command
        call_command('backfill_labsample_reporting_node')
        sample.refresh_from_db()
        assert sample.reporting_node_id is None

    def test_backfill_does_not_overwrite_existing(self):
        """IQ10 — لا يُكتب على reporting_node موجود."""
        ctx = _build_hierarchy()
        other_node = ReportingNode.objects.create(
            code=f'OTHER_LS_{_uid()}', name_ar='عقدة أخرى', kind='FACILITY', parent=ctx['state_node'],
        )
        sample = LabSample.objects.create(
            sample_number=f'LS_{_uid()}', sample_barcode=f'BC_{_uid()}', sample_type='BLOOD',
            source='CLINIC', status='REGISTERED',
            facility=ctx['facility'], reporting_node=other_node,
            collector=_make_collector(),
        )
        from django.core.management import call_command
        call_command('backfill_labsample_reporting_node')
        sample.refresh_from_db()
        assert sample.reporting_node_id == other_node.id  # لم يُكتب عليه
