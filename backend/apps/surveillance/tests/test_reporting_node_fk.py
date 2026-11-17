"""M7-A2b-full — HealthCase.reporting_node FK: snapshot تاريخي، بلا sync.

يثبت هذا الملف الضوابط الثلاثة الإلزامية (T1-T3 من A2b-full prompt):
- T2: FK nullable — HealthCase بلا reporting_node يبقى صالحاً (لا كسر للاختبارات القائمة).
- T3: لا save() sync، لا signal — تغيير/حذف التعيين لا يمسّ الـ snapshot.
- Backfill: fail-safe (ambiguous → NULL، unassigned → NULL).
"""

import datetime
import uuid

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.masterdata.models import EntryPoint, HealthFacility, Sector as MasterdataSector, State
from apps.organization.models import Locality, Sector as OrgSector
from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.surveillance.models import HealthCase

pytestmark = pytest.mark.django_db


def _uid():
    return uuid.uuid4().hex[:8]


def _world(tag):
    """ولاية + قطاع + محلية + منفذ + منشأة + شجرة سجل (FEDERAL→FACILITY)."""
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    locality = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    entry_point = EntryPoint.objects.create(
        code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}', kind='SEAPORT',
        state=state, sector=org, locality=locality,
    )
    facility = HealthFacility.objects.create(
        code=f'FAC_{tag}_{uid}', name_ar=f'منشأة {tag}',
        sector=org, locality=locality, entry_point=entry_point,
    )
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'FED_{tag}_{uid}', name_ar=f'فيدرالي {tag}', kind=ReportingNode.Kind.FEDERAL,
        )
    state_node = ReportingNode.objects.create(
        code=f'STN_{tag}_{uid}', name_ar=f'ولاية عقدة {tag}',
        kind=ReportingNode.Kind.STATE, parent=root,
    )
    locality_node = ReportingNode.objects.create(
        code=f'LCN_{tag}_{uid}', name_ar=f'محلية عقدة {tag}',
        kind=ReportingNode.Kind.LOCALITY, parent=state_node,
    )
    facility_node = ReportingNode.objects.create(
        code=f'FCN_{tag}_{uid}', name_ar=f'منشأة عقدة {tag}',
        kind=ReportingNode.Kind.FACILITY, parent=locality_node,
    )
    return {
        'facility': facility, 'entry_point': entry_point, 'state': state,
        'facility_node': facility_node, 'state_node': state_node,
    }


def _case(*, facility, reporting_node=None, tag='C'):
    return HealthCase.objects.create(
        case_number=f'CASE_{tag}_{_uid()}',
        health_facility=facility,
        port=facility.entry_point,
        reported_date=timezone.localdate(),
        reporting_node=reporting_node,
    )


# ==============================================================================
# T2 — nullable default (14+ اختبار قائم ينشئ HealthCase بلا facility/FK)
# ==============================================================================

def test_fk_nullable_default():
    """HealthCase بلا reporting_node → NULL صالح (لا كسر للاختبارات الموجودة)."""
    case = HealthCase.objects.create(
        case_number=f'CASE_{_uid()}',
        reported_date=timezone.localdate(),
    )
    case.refresh_from_db()
    assert case.reporting_node_id is None


def test_fk_set_explicitly():
    """HealthCase مع reporting_node و health_facility → يحفظ الاثنين معاً."""
    world = _world('A')
    case = _case(facility=world['facility'], reporting_node=world['facility_node'])

    case.refresh_from_db()
    assert case.reporting_node_id == world['facility_node'].id
    assert case.health_facility_id == world['facility'].id


# ==============================================================================
# T3 — لا save() sync، لا signal (snapshot تاريخي)
# ==============================================================================

def test_fk_no_sync_on_save():
    """تغيير تعيين المنشأة لا يُعيد كتابة reporting_node الموجود."""
    world = _world('A')
    case = _case(facility=world['facility'], reporting_node=world['facility_node'])

    # تعيين نشط ثانٍ لنفس المنشأة، لعقدة أخرى
    other_node = ReportingNode.objects.create(
        code=f'FCN_OTHER_{_uid()}', name_ar='عقدة أخرى',
        kind=ReportingNode.Kind.FACILITY, parent=world['facility_node'],
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=world['facility'], node=other_node,
        valid_from=datetime.date(2020, 1, 1), is_primary=True,
    )
    case.save()

    case.refresh_from_db()
    assert case.reporting_node_id == world['facility_node'].id  # ثابت


def test_fk_no_sync_on_assignment_delete():
    """حذف التعيين النشط لا يمسّ reporting_node (SET_NULL على العقدة لا التعيين)."""
    world = _world('A')
    case = _case(facility=world['facility'], reporting_node=world['facility_node'])

    world['facility'].node_assignments.filter(valid_to__isnull=True).delete()

    case.refresh_from_db()
    assert case.reporting_node_id == world['facility_node'].id  # snapshot محفوظ


# ==============================================================================
# Backfill — fail-safe (ambiguous → NULL، unassigned → NULL)
# ==============================================================================

def test_backfill_dry_run():
    """--dry-run يحلل فقط: يبلغ عن Updated دون تعديل الصفوف."""
    world = _world('A')
    _case(facility=world['facility'], reporting_node=None)

    call_command('backfill_healthcase_reporting_node', dry_run=True)

    case = HealthCase.objects.get()
    assert case.reporting_node_id is None  # لم يُعدَّل


def test_backfill_fills_when_unique_assignment():
    """تعيين نشط واحد → reporting_node يُملأ من node."""
    world = _world('A')
    HealthFacilityNodeAssignment.objects.create(
        facility=world['facility'], node=world['facility_node'],
        valid_from=datetime.date(2020, 1, 1), is_primary=True,
    )
    _case(facility=world['facility'], reporting_node=None)

    call_command('backfill_healthcase_reporting_node')

    case = HealthCase.objects.get()
    assert case.reporting_node_id == world['facility_node'].id


def test_backfill_skips_ambiguous():
    """تعيينان نشطان → يبقى NULL (fail-safe، لا اختيار عشوائي)."""
    world = _world('A')
    other_node = ReportingNode.objects.create(
        code=f'FCN_OTHER_{_uid()}', name_ar='عقدة أخرى',
        kind=ReportingNode.Kind.FACILITY, parent=world['facility_node'],
    )
    for i, node in enumerate((world['facility_node'], other_node)):
        HealthFacilityNodeAssignment.objects.create(
            facility=world['facility'], node=node,
            # valid_from مختلفة — قيد facility_assignment_unique_start (facility, valid_from) فريد.
            valid_from=datetime.date(2020 + i, 1, 1), is_primary=True,
        )
    _case(facility=world['facility'], reporting_node=None)

    call_command('backfill_healthcase_reporting_node')

    case = HealthCase.objects.get()
    assert case.reporting_node_id is None


def test_backfill_skips_unassigned():
    """منشأة بلا تعيين نشط → يبقى NULL."""
    world = _world('A')
    _case(facility=world['facility'], reporting_node=None)

    call_command('backfill_healthcase_reporting_node')

    case = HealthCase.objects.get()
    assert case.reporting_node_id is None
