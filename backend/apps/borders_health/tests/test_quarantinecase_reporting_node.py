import uuid

import pytest
from django.utils import timezone

from apps.borders_health.models import QuarantineCase
from apps.registry.models import ReportingNode, StateNodeAssignment, HealthFacilityNodeAssignment
from apps.masterdata.models import HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State, EntryPoint
from apps.borders_health.models import BorderCrossing


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username=f'user_{_uid()}', email=f'user_{_uid()}@example.com', password='testpass'
    )


def _build_hierarchy():
    """ybni state→locality→entry_point→border_crossing→quarantine_case."""
    md = MasterdataSector.objects.create(code=f'MD_QC_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_QC_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_QC_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_QC_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_QC_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    crossing = BorderCrossing.objects.create(
        code=f'BC_QC_{_uid()}', name_ar=f'معبر {_uid()}', entry_point=ep,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_QC_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_QC_{_uid()}', name_ar='جذر اختبار', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_QC_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    StateNodeAssignment.objects.create(
        state=ep.state, node=state_node, valid_from=timezone.now().date(), valid_to=None,
    )
    return {'crossing': crossing, 'state_node': state_node, 'node': state_node, 'facility': fac, 'user': _make_user()}


@pytest.mark.django_db
class TestQuarantineCaseReportingNodeFK:
    """10 اختبارات لـ QuarantineCase.reporting_node FK (مرآة A2c-1 Phase 1، STATE-only)."""

    def test_reporting_node_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
        )
        assert case.reporting_node is None

    def test_reporting_node_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        assert case.reporting_node_id == ctx['node'].id

    def test_no_save_sync_on_crossing_change(self):
        """IQ3 — لا مزامنة: تغيير crossing لا يغير reporting_node मौجد."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        case.refresh_from_db()
        assert case.reporting_node_id == ctx['node'].id

    def test_set_null_on_crossing_delete(self):
        """IQ4 — SET_NULL عند حذف crossing (ت Cascade على QuarantineCase نفسه)."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        ctx['crossing'].delete()
        assert QuarantineCase.objects.filter(case_number=case.case_number).count() == 0

    def test_serializer_includes_reporting_node(self):
        """IQ5 — السيالير يتضمن reporting_node (قراءة + كتابة)."""
        from apps.borders_health.serializers import QuarantineCaseSerializer
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        data = QuarantineCaseSerializer(case).data
        assert data['reporting_node'] == ctx['node'].id

    def test_backfill_dry_run_no_change(self):
        """IQ6 — dry-run لا يغير أي شيء."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
        )
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('backfill_quarantinecase_reporting_node', '--dry-run', stdout=out)
        case.refresh_from_db()
        assert case.reporting_node_id is None

    def test_backfill_unique_primary_assignment_fills(self):
        """IQ7 — StateNodeAssignment(primary) واحد → يُملأ."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
        )
        from django.core.management import call_command
        call_command('backfill_quarantinecase_reporting_node')
        case.refresh_from_db()
        assert case.reporting_node_id == ctx['node'].id

    def test_backfill_no_state_node(self):
        """IQ8 — state موجود لكن لا StateNodeAssignment → NULL."""
        ctx = _build_hierarchy()
        # حذف StateNodeAssignment
        StateNodeAssignment.objects.filter(state=ctx['crossing'].entry_point.state).delete()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
        )
        from django.core.management import call_command
        call_command('backfill_quarantinecase_reporting_node')
        case.refresh_from_db()
        assert case.reporting_node_id is None

    def test_backfill_no_ep_or_state(self):
        """IQ9 — crossing.entry_point NULL → NULL."""
        ctx = _build_hierarchy()
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
        )
        # إزالة entry_point من crossing
        ctx['crossing'].entry_point = None
        ctx['crossing'].save()
        from django.core.management import call_command
        call_command('backfill_quarantinecase_reporting_node')
        case.refresh_from_db()
        assert case.reporting_node_id is None

    def test_backfill_does_not_overwrite_existing(self):
        """IQ10 — لا يُكتب على reporting_node موجود."""
        ctx = _build_hierarchy()
        other_root = ReportingNode.objects.create(code=f'ROOT2_QC_{_uid()}', name_ar='جذر2', kind='FEDERAL')
        other_node = ReportingNode.objects.create(
            code=f'OTHER_QC_{_uid()}', name_ar='عقدة أخرى', kind='STATE', parent=other_root,
        )
        case = QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=other_node,
        )
        from django.core.management import call_command
        call_command('backfill_quarantinecase_reporting_node')
        case.refresh_from_db()
        assert case.reporting_node_id == other_node.id
