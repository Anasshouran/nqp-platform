import uuid
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from apps.airport_health.models import AirportScreening, AirportTerminal, ScreeningPoint
from apps.airport_health.serializers import AirportScreeningSerializer
from apps.masterdata.models import EntryPoint as Port
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Sector as OrgSector
from apps.registry.models import ReportingNode, StateNodeAssignment
from apps.travelers.models import Country, Traveler

User = get_user_model()

BACKFILL = 'backfill_airportscreening_reporting_node'


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    return User.objects.create_user(
        email=f'air_{_uid()}@example.com', password='testpass',
    )


def _country():
    country, _ = Country.objects.get_or_create(
        code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'},
    )
    return country


def _get_root_node():
    """يعيد الجذر الفيدرالي الوحيد (قيد `reporting_node_single_root`)."""
    root = ReportingNode.objects.filter(kind='FEDERAL', parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _build_chain(*, is_primary=True, with_assignment=True):
    """يبني state → entry_point → terminal → screening_point → traveler/screening."""
    root = _get_root_node()
    uid = _uid()
    md_sector = MasterdataSector.objects.create(code=f'MD_AIR_{uid}', name_ar='قطاع مرجعي')
    org_sector = OrgSector.objects.create(code=f'ORG_AIR_{uid}', name_ar='قطاع إداري')
    state = State.objects.create(
        code=f'ST_AIR_{uid}', name_ar=f'ولاية {uid}', sector=md_sector,
    )
    ep = Port.objects.create(
        code=f'EP_AIR_{uid}', name_ar=f'منفذ {uid}', kind=Port.Kind.AIRPORT, state=state,
    )
    terminal = AirportTerminal.objects.create(
        port=ep, terminal_code=f'T{uid}', name_ar='صالة الوصول', name_en='Arrival Hall',
    )
    point = ScreeningPoint.objects.create(
        terminal=terminal,
        point_code=f'P{uid}',
        point_type=ScreeningPoint.PointType.ARRIVAL,
    )
    traveler = Traveler.objects.create(
        first_name='أحمد',
        last_name='محمد',
        passport_number=f'PA{uid}',
        date_of_birth='1990-01-15',
        nationality=_country(),
        registration_status='COMPLETED',
    )
    user = _make_user()
    state_node = ReportingNode.objects.create(
        code=f'STATE_AIR_{uid}', name_ar=f'ولاية تبليغ {uid}', kind='STATE', parent=root,
    )
    assignment = None
    if with_assignment:
        assignment = StateNodeAssignment.objects.create(
            state=state,
            node=state_node,
            valid_from=timezone.now().date(),
            valid_to=None,
            is_primary=is_primary,
        )
    return {
        'root': root,
        'state': state,
        'ep': ep,
        'terminal': terminal,
        'point': point,
        'traveler': traveler,
        'user': user,
        'state_node': state_node,
        'assignment': assignment,
    }


def _screening(ctx, *, reporting_node=None):
    return AirportScreening.objects.create(
        traveler=ctx['traveler'],
        screening_point=ctx['point'],
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        screened_by=ctx['user'],
        reporting_node=reporting_node,
    )


@pytest.mark.django_db
class TestAirportScreeningReportingNodeFK:
    """10 اختبارات لـ AirportScreening.reporting_node (STATE-only، policy ii)."""

    def test_fk_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        ctx = _build_chain()
        screening = _screening(ctx)
        assert screening.reporting_node is None

    def test_fk_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة، ويبقى بعد reload."""
        ctx = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['state_node'])
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['state_node'].id

    def test_fk_no_sync_on_save(self):
        """IQ3 — لا مزامنة: تغيير screening_point لا يعيد كتابة reporting_node."""
        ctx = _build_chain()
        other_point = ScreeningPoint.objects.create(
            terminal=ctx['terminal'],
            point_code=f'P2{_uid()}',
            point_type=ScreeningPoint.PointType.DEPARTURE,
        )
        screening = _screening(ctx, reporting_node=ctx['state_node'])
        screening.screening_point = other_point
        screening.save()
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['state_node'].id

    def test_fk_set_null_when_reporting_node_deleted(self):
        """IQ4 (G3) — حذف ReportingNode ⇒ reporting_node = NULL (SET_NULL)."""
        ctx = _build_chain()
        extra_node = ReportingNode.objects.create(
            code=f'STATE_EXTRA_{_uid()}', name_ar='ولاية إضافية', kind='STATE',
            parent=ctx['root'],
        )
        screening = _screening(ctx, reporting_node=extra_node)
        extra_node.delete()
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert screening.screening_point_id == ctx['point'].id

    def test_serializer_includes_reporting_node(self):
        """IQ5 — الـ serializer يعرض reporting_node ويكون قابلاً للكتابة."""
        ctx = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['state_node'])
        data = AirportScreeningSerializer(screening).data
        assert 'reporting_node' in data
        assert data['reporting_node'] == ctx['state_node'].id
        assert 'reporting_node' not in AirportScreeningSerializer.Meta.read_only_fields

    def test_backfill_dry_run(self):
        """IQ6 — --dry-run لا يعدّل أي صف."""
        ctx = _build_chain()
        screening = _screening(ctx)
        out = StringIO()
        call_command(BACKFILL, '--dry-run', stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert '[DRY-RUN] Updated: 1' in out.getvalue()

    def test_backfill_count_eq_1(self):
        """IQ7 — تعيين primary نشط واحد ⇒ يُملأ."""
        ctx = _build_chain()
        screening = _screening(ctx)
        call_command(BACKFILL, stdout=StringIO())
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['state_node'].id

    def test_backfill_count_eq_0(self):
        """IQ8 — لا تعيين primary نشط ⇒ NULL (bucket: No STATE node)."""
        ctx = _build_chain(with_assignment=False)
        screening = _screening(ctx)
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert 'No STATE node: 1' in out.getvalue()

    def test_backfill_count_gt_1_strict(self):
        """IQ9 — (ii) أكثر من تعيين primary نشط ⇒ NULL (لا .first() على متعدد)."""
        ctx = _build_chain()
        second_node = ReportingNode.objects.create(
            code=f'STATE_AMB_{_uid()}', name_ar='ولاية ثانية', kind='STATE',
            parent=ctx['root'],
        )
        StateNodeAssignment.objects.create(
            state=ctx['state'],
            node=second_node,
            valid_from=timezone.now().date() + timezone.timedelta(days=1),
            valid_to=None,
            is_primary=True,
        )
        screening = _screening(ctx)
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert 'Ambiguous: 1' in out.getvalue()

    def test_backfill_does_not_overwrite(self):
        """IQ10 — لا يُعاد كتابة reporting_node موجود."""
        ctx = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['state_node'])
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['state_node'].id
        assert 'Updated: 0' in out.getvalue()
