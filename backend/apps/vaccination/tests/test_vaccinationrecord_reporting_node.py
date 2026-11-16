"""M7-A2c-vaccination — VaccinationRecord.reporting_node (STATE-only).

10 اختبارات: FK + serializer + backfill (سياسة (ii) strict، bulk map).
العبور: site.entry_point.state_id → StateNodeAssignment(نشط، أساسي) → STATE.
"""

import uuid
from datetime import date
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from apps.masterdata.models import EntryPoint, State
from apps.masterdata.models import Sector as MasterdataSector
from apps.registry.models import ReportingNode, StateNodeAssignment
from apps.travelers.models import Country, Traveler
from apps.vaccination.models import VaccinationRecord, VaccinationSite, Vaccine
from apps.vaccination.serializers import VaccinationRecordSerializer

User = get_user_model()

BACKFILL = 'backfill_vaccinationrecord_reporting_node'


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    return User.objects.create_user(
        email=f'vacc_{_uid()}@example.com', password='testpass',
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
    """state → entry_point → site → vaccine/traveler/record."""
    root = _get_root_node()
    uid = _uid()
    state = State.objects.create(
        code=f'ST_VAC_{uid}', name_ar=f'ولاية {uid}',
        sector=MasterdataSector.objects.create(
            code=f'MD_VAC_{uid}', name_ar=f'قطاع {uid}',
        ),
    )
    ep = EntryPoint.objects.create(
        code=f'EP_VAC_{uid}', name_ar=f'منفذ {uid}', kind=EntryPoint.Kind.SEAPORT,
        state=state,
    )
    site = VaccinationSite.objects.create(
        name_ar=f'عيادة {uid}', entry_point=ep,
    )
    vaccine = Vaccine.objects.create(
        code=f'VAC_{uid}', name_ar=f'لقاح {uid}', name_en=f'Vaccine {uid}',
        series=1, validity_days=3650, required=True,
    )
    traveler = Traveler.objects.create(
        first_name='محمد',
        last_name='عمر',
        passport_number=f'PV{uid}',
        date_of_birth=date(1990, 1, 1),
        nationality=_country(),
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_VAC_{uid}', name_ar=f'ولاية تبليغ {uid}', kind='STATE', parent=root,
    )
    assignment = None
    if with_assignment:
        assignment = StateNodeAssignment.objects.create(
            state=state,
            node=state_node,
            valid_from=timezone.now().date(),
            valid_to=None,
            is_primary=True,
        )
    return {
        'root': root,
        'state': state,
        'ep': ep,
        'site': site,
        'vaccine': vaccine,
        'traveler': traveler,
        'state_node': state_node,
        'assignment': assignment,
    }


def _record(ctx, *, reporting_node=None, site='__default__'):
    return VaccinationRecord.objects.create(
        traveler=ctx['traveler'],
        vaccine=ctx['vaccine'],
        administered_at=date.today(),
        site=ctx['site'] if site == '__default__' else site,
        reporting_node=reporting_node,
    )


@pytest.mark.django_db
class TestVaccinationRecordReportingNodeFK:
    """10 اختبارات لـ VaccinationRecord.reporting_node (STATE-only، policy ii)."""

    def test_fk_nullable_default(self):
        """IQ1 — reporting_node nullable، الافتراضي NULL."""
        ctx = _build_chain()
        record = _record(ctx)
        assert record.reporting_node is None

    def test_fk_set_explicitly(self):
        """IQ2 — يمكن تعيين reporting_node صراحة، ويبقى بعد reload."""
        ctx = _build_chain()
        record = _record(ctx, reporting_node=ctx['state_node'])
        record.refresh_from_db()
        assert record.reporting_node_id == ctx['state_node'].id

    def test_fk_no_sync_on_save(self):
        """IQ3 — لا مزامنة: تغيير site لا يعيد كتابة reporting_node."""
        ctx = _build_chain()
        other_site = VaccinationSite.objects.create(
            name_ar=f'عيادة أخرى {_uid()}', entry_point=None,
        )
        record = _record(ctx, reporting_node=ctx['state_node'])
        record.site = other_site
        record.save()
        record.refresh_from_db()
        assert record.reporting_node_id == ctx['state_node'].id

    def test_fk_set_null_when_reporting_node_deleted(self):
        """IQ4 — حذف ReportingNode ⇒ reporting_node = NULL (SET_NULL)."""
        ctx = _build_chain()
        extra_node = ReportingNode.objects.create(
            code=f'STATE_EXTRA_{_uid()}', name_ar='ولاية إضافية', kind='STATE',
            parent=ctx['root'],
        )
        record = _record(ctx, reporting_node=extra_node)
        extra_node.delete()
        record.refresh_from_db()
        assert record.reporting_node is None
        assert record.site_id == ctx['site'].id

    def test_serializer_includes_reporting_node(self):
        """IQ5 — الـ serializer يعرض reporting_node ويكون قابلاً للكتابة."""
        ctx = _build_chain()
        record = _record(ctx, reporting_node=ctx['state_node'])
        data = VaccinationRecordSerializer(record).data
        assert 'reporting_node' in data
        assert data['reporting_node'] == ctx['state_node'].id
        assert 'reporting_node' not in VaccinationRecordSerializer.Meta.read_only_fields

    def test_backfill_dry_run(self):
        """IQ6 — --dry-run لا يعدّل أي سجل."""
        ctx = _build_chain()
        record = _record(ctx)
        out = StringIO()
        call_command(BACKFILL, '--dry-run', stdout=out)
        record.refresh_from_db()
        assert record.reporting_node is None
        assert '[DRY-RUN] Updated: 1' in out.getvalue()

    def test_backfill_count_eq_1(self):
        """IQ7 — تعيين نشط أساسي واحد ⇒ يُملأ."""
        ctx = _build_chain()
        record = _record(ctx)
        call_command(BACKFILL, stdout=StringIO())
        record.refresh_from_db()
        assert record.reporting_node_id == ctx['state_node'].id

    def test_backfill_count_eq_0(self):
        """IQ8 — لا تعيين ⇒ NULL (bucket: unassigned)."""
        ctx = _build_chain(with_assignment=False)
        record = _record(ctx)
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        record.refresh_from_db()
        assert record.reporting_node is None
        assert 'No STATE node: 1' in out.getvalue()

    def test_backfill_count_gt_1_strict(self):
        """IQ9 — (ii) أكثر من تعيين نشط أساسي ⇒ NULL (لا .first() على متعدد)."""
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
        record = _record(ctx)
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        record.refresh_from_db()
        assert record.reporting_node is None
        assert 'Ambiguous: 1' in out.getvalue()

    def test_backfill_does_not_overwrite(self):
        """IQ10 — لا يُعاد كتابة reporting_node موجود."""
        ctx = _build_chain()
        record = _record(ctx, reporting_node=ctx['state_node'])
        out = StringIO()
        call_command(BACKFILL, stdout=out)
        record.refresh_from_db()
        assert record.reporting_node_id == ctx['state_node'].id
        assert 'Updated: 0' in out.getvalue()
