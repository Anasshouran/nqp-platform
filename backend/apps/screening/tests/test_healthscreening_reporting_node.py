"""M7-A2c-3 — HealthScreening.reporting_node (A2b-full، FACILITY-level).

10 اختبارات: FK + serializer + backfill (سياسة (ii) strict).
العبور: facility → HealthFacilityNodeAssignment (نشط) → node.
"""

import uuid
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from apps.masterdata.models import EntryPoint as Port
from apps.masterdata.models import HealthFacility
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Locality
from apps.organization.models import Sector as OrgSector
from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.screening.models import HealthScreening
from apps.screening.serializers import HealthScreeningSerializer
from apps.travelers.models import Country, Traveler

User = get_user_model()

BACKFILL = 'backfill_healthscreening_reporting_node'


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    return User.objects.create_user(
        email=f'scr_{_uid()}@example.com', password='testpass',
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


def _build_chain(*, with_assignment=True):
    """state → entry_point → locality → health_facility → traveler/screening."""
    root = _get_root_node()
    uid = _uid()
    md_sector = MasterdataSector.objects.create(code=f'MD_SCR_{uid}', name_ar='قطاع مرجعي')
    org_sector = OrgSector.objects.create(code=f'ORG_SCR_{uid}', name_ar='قطاع إداري')
    state = State.objects.create(
        code=f'ST_SCR_{uid}', name_ar=f'ولاية {uid}', sector=md_sector,
    )
    locality = Locality.objects.create(
        code=f'LOC_SCR_{uid}', name_ar=f'محلية {uid}', sector=org_sector,
    )
    ep = Port.objects.create(
        code=f'EP_SCR_{uid}', name_ar=f'منفذ {uid}', kind='SEAPORT', state=state,
    )
    facility = HealthFacility.objects.create(
        code=f'FAC_SCR_{uid}', name_ar=f'منشأة {uid}',
        sector=org_sector, locality=locality, entry_point=ep,
    )
    traveler = Traveler.objects.create(
        first_name='محمد',
        last_name='عمر',
        passport_number=f'PS{uid}',
        date_of_birth='1990-01-01',
        nationality=_country(),
    )
    user = _make_user()
    state_node = ReportingNode.objects.create(
        code=f'STATE_SCR_{uid}', name_ar=f'ولاية تبليغ {uid}', kind='STATE', parent=root,
    )
    facility_node = ReportingNode.objects.create(
        code=f'FACNODE_SCR_{uid}', name_ar=f'منشأة تبليغ {uid}',
        kind='FACILITY', parent=state_node,
    )
    assignment = None
    if with_assignment:
        assignment = HealthFacilityNodeAssignment.objects.create(
            facility=facility,
            node=facility_node,
            valid_from=timezone.now().date(),
            valid_to=None,
            is_primary=True,
        )
    return {
        'root': root,
        'state': state,
        'ep': ep,
        'facility': facility,
        'traveler': traveler,
        'user': user,
        'state_node': state_node,
        'facility_node': facility_node,
        'assignment': assignment,
    }


def _screening(ctx, *, reporting_node=None, facility=None):
    return HealthScreening.objects.create(
        traveler=ctx['traveler'],
        port=ctx['ep'],
        officer=ctx['user'],
        body_temperature=37.0,
        observed_symptoms=[],
        facility=ctx['facility'] if facility is None else facility,
        reporting_node=reporting_node,
    )


@pytest.mark.django_db
class TestHealthScreeningReportingNodeFK:
    """10 اختبارات لـ HealthScreening.reporting_node (A2b-full، policy ii)."""

    def test_fk_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        ctx = _build_chain()
        screening = _screening(ctx)
        assert screening.reporting_node is None

    def test_fk_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة، ويبقى بعد reload."""
        ctx = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['facility_node'])
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['facility_node'].id

    def test_fk_no_sync_on_save(self):
        """IQ3 — لا مزامنة: تغيير facility لا يعيد كتابة reporting_node."""
        ctx = _build_chain()
        other = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['facility_node'])
        screening.facility = other['facility']
        screening.save()
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['facility_node'].id

    def test_fk_set_null_when_reporting_node_deleted(self):
        """IQ4 (G3) — حذف ReportingNode ⇒ reporting_node = NULL (SET_NULL)."""
        ctx = _build_chain()
        extra_node = ReportingNode.objects.create(
            code=f'FACNODE_EXTRA_{_uid()}', name_ar='منشأة إضافية', kind='FACILITY',
            parent=ctx['state_node'],
        )
        screening = _screening(ctx, reporting_node=extra_node)
        extra_node.delete()
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert screening.facility_id == ctx['facility'].id

    def test_serializer_includes_reporting_node(self):
        """IQ5 — الـ serializer يعرض reporting_node ويكون قابلاً للكتابة."""
        ctx = _build_chain()
        screening = _screening(ctx, reporting_node=ctx['facility_node'])
        data = HealthScreeningSerializer(screening).data
        assert 'reporting_node' in data
        assert data['reporting_node'] == ctx['facility_node'].id
        assert 'reporting_node' not in HealthScreeningSerializer.Meta.read_only_fields

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
        """IQ7 — تعيين نشط واحد ⇒ يُملأ."""
        ctx = _build_chain()
        screening = _screening(ctx)
        call_command(BACKFILL, stdout=StringIO())
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['facility_node'].id

    def test_backfill_count_eq_0(self):
        """IQ8 — لا تعيين نشط ⇒ NULL (bucket: unassigned_node)."""
        ctx = _build_chain(with_assignment=False)
        screening = _screening(ctx)
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node is None
        assert 'Unassigned: 1' in out.getvalue()

    def test_backfill_count_gt_1_strict(self):
        """IQ9 — (ii) أكثر من تعيين نشط ⇒ NULL (لا .first() على متعدد)."""
        ctx = _build_chain()
        second_node = ReportingNode.objects.create(
            code=f'FACNODE_AMB_{_uid()}', name_ar='منشأة ثانية', kind='FACILITY',
            parent=ctx['state_node'],
        )
        HealthFacilityNodeAssignment.objects.create(
            facility=ctx['facility'],
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
        screening = _screening(ctx, reporting_node=ctx['facility_node'])
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        screening.refresh_from_db()
        assert screening.reporting_node_id == ctx['facility_node'].id
        assert 'Updated: 0' in out.getvalue()
