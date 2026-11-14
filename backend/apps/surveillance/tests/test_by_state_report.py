"""M7-A2b-lite — تقرير الترصد حسب الولاية (Phase 0).

يثبت هذا الملف الضوابط الأربعة المعتمدة:
1. بيانات عرض واقعية (fixtures هنا، والأمر seed_surveillance_testcases للـ dev).
2. تجميع بـ ancestry (walk-up) لا يعتمد على وجود جذر FEDERAL.
3. المصالحة: كل حالة في فئة واحدة بالضبط.
4. لا N+1: عدد الاستعلامات ثابت مهما كان عدد الحالات.

**لا FK ولا migration:** اختبار الانحدار الأخير يثبت أن HealthCase ما زال بلا
`reporting_node` (حالة M7-A2 محفوظة).
"""

import datetime
import uuid

import pytest
from django.utils import timezone

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint, HealthFacility, Sector as MasterSector, State
from apps.organization.models import Locality, Sector as OrgSector
from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.surveillance.models import HealthCase
from apps.surveillance.views.reports import build_by_state_report

pytestmark = pytest.mark.django_db


def _uid():
    return uuid.uuid4().hex[:8]


def _world(tag):
    """عالم كامل: ولاية + قطاع + محلية + منفذ + منشأة + شجرة سجل (FEDERAL→FACILITY)."""
    uid = _uid()
    md = MasterSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
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
    HealthFacilityNodeAssignment.objects.create(
        facility=facility, node=facility_node,
        valid_from=datetime.date(2020, 1, 1), is_primary=True,
    )
    return {
        'state': state, 'org_sector': org, 'locality': locality,
        'entry_point': entry_point, 'facility': facility,
        'root': root, 'state_node': state_node,
        'locality_node': locality_node, 'facility_node': facility_node,
    }


def _facility_without_assignment(tag):
    uid = _uid()
    return HealthFacility.objects.create(code=f'FAC_NA_{tag}_{uid}', name_ar=f'منشأة بلا تعيين {tag}')


def _case(*, facility=None, port=None, reported_date=None, tag='C'):
    uid = _uid()
    return HealthCase.objects.create(
        case_number=f'CASE_{tag}_{uid}',
        health_facility=facility,
        port=port,
        reported_date=reported_date or timezone.localdate(),
    )


def _superuser():
    from django.contrib.auth import get_user_model

    uid = _uid()
    return get_user_model().objects.create_user(
        email=f'su_{uid}@nqp.gov.sd', password='x', is_superuser=True, is_staff=True,
    )


def _scoped_user(state, resource='surveillance'):
    from django.contrib.auth import get_user_model

    uid = _uid()
    user = get_user_model().objects.create_user(email=f'state_{uid}@nqp.gov.sd', password='x')
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'role_{uid}')
    for action in ('view', 'add', 'edit', 'delete'):
        perm, _ = Permission.objects.get_or_create(
            code=f'{resource}:{action}',
            defaults={'name': f'{resource}:{action}', 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='STATE', scope_id=state.id,
    )
    return user


# ==============================================================================
# 1) matched — الحالات التي تصل إلى ولاية عبر تعيين نشط
# ==============================================================================

def test_matched_count():
    world = _world('A')
    for _ in range(3):
        _case(facility=world['facility'], port=world['entry_point'])

    report = build_by_state_report(user=_superuser())

    assert report['total'] == 3
    assert report['matched'] == 3
    assert report['by_state'][0]['count'] == 3
    assert report['by_state'][0]['state_code'] == world['state_node'].code


# ==============================================================================
# 2) المصالحة (الضابط 3) + node_no_state + فلترة التاريخ
# ==============================================================================

def test_reconciliation_equality():
    world = _world('A')
    matched = _case(facility=world['facility'], port=world['entry_point'])
    _case(facility=None)
    _case(facility=_facility_without_assignment('A'))

    # عقدة بلا سلف STATE: محلية معلّقة مباشرة على الجذر الفيدرالي.
    orphan_locality = ReportingNode.objects.create(
        code=f'LCN_ORPHAN_{_uid()}', name_ar='محلية بلا ولاية',
        kind=ReportingNode.Kind.LOCALITY, parent=world['root'],
    )
    orphan_facility = _facility_without_assignment('ORPHAN')
    HealthFacilityNodeAssignment.objects.create(
        facility=orphan_facility, node=orphan_locality,
        valid_from=datetime.date(2020, 1, 1), is_primary=True,
    )
    _case(facility=orphan_facility)

    # حالة خارج نطاق التاريخ — يجب ألا تُحسب.
    _case(
        facility=world['facility'],
        reported_date=timezone.localdate() - datetime.timedelta(days=400),
    )

    report = build_by_state_report(
        user=_superuser(),
        date_from=timezone.localdate() - datetime.timedelta(days=30),
    )

    total = report['total']
    buckets = (
        report['matched'] + report['node_no_state']
        + report['unassigned_node'] + report['unassigned_facility']
    )
    assert total == buckets == 4, f'مصالحة مكسورة: {total} != {buckets}'
    assert report['reconciliation_ok'] is True
    assert report['matched'] == 1
    assert report['node_no_state'] == 1
    assert report['unassigned_node'] == 1
    assert report['unassigned_facility'] == 1
    assert sum(b['count'] for b in report['by_state']) == report['matched']
    assert matched.case_number  # الحالة المطابقة موجودة فعلاً


# ==============================================================================
# 3) unassigned_facility — بلا منشأة صحية
# ==============================================================================

def test_unassigned_facility():
    _case(facility=None)
    _case(facility=None)

    report = build_by_state_report(user=_superuser())

    assert report['total'] == 2
    assert report['unassigned_facility'] == 2
    assert report['matched'] == 0
    assert report['by_state'] == []


# ==============================================================================
# 4) unassigned_node — منشأة بلا تعيين نشط
# ==============================================================================

def test_unassigned_node():
    _case(facility=_facility_without_assignment('A'))

    report = build_by_state_report(user=_superuser())

    assert report['total'] == 1
    assert report['unassigned_node'] == 1
    assert report['unassigned_facility'] == 0


# ==============================================================================
# 5) التجميع حسب الولاية — مجموع الصفوف = matched
# ==============================================================================

def test_by_state_grouping():
    world_a = _world('A')
    world_b = _world('B')
    _case(facility=world_a['facility'], port=world_a['entry_point'])
    _case(facility=world_a['facility'], port=world_a['entry_point'])
    _case(facility=world_b['facility'], port=world_b['entry_point'])

    report = build_by_state_report(user=_superuser())

    counts = {b['state_code']: b['count'] for b in report['by_state']}
    assert counts == {
        world_a['state_node'].code: 2,
        world_b['state_node'].code: 1,
    }
    assert sum(counts.values()) == report['matched'] == report['total']


# ==============================================================================
# 6) لا N+1 — عدد الاستعلامات ثابت (الضابط 4)
# ==============================================================================

def test_no_n_plus_1(django_assert_num_queries):
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    world = _world('A')
    user = _superuser()
    _case(facility=world['facility'], port=world['entry_point'])

    with CaptureQueriesContext(connection) as one_case:
        build_by_state_report(user=user)
    one_case_queries = len(one_case)

    for _ in range(49):
        _case(facility=world['facility'], port=world['entry_point'])

    with django_assert_num_queries(one_case_queries):
        report = build_by_state_report(user=user)

    assert report['total'] == 50
    assert one_case_queries <= 5, f'عدد الاستعلامات {one_case_queries} > 5 (N+1 محتمل)'


# ==============================================================================
# 7) مستخدم مقيَّد — Option B: لا تُسقَط حالة بسبب قناة الإسناد
# ==============================================================================

def test_scoped_user_sees_subset():
    world_a = _world('A')
    world_b = _world('B')
    _case(facility=world_a['facility'], port=world_a['entry_point'])   # matched عبر المنشأة
    _case(facility=None, port=world_a['entry_point'])                  # بلا منشأة، لكن منفذها في النطاق
    _case(facility=world_b['facility'], port=world_b['entry_point'])   # ولاية أخرى — مستبعدة

    report = build_by_state_report(user=_scoped_user(world_a['state']))

    assert report['scoped'] is True
    assert report['total'] == 2, 'Option B: الحالة بلا منشأة لكن منفذها في النطاق يجب أن تظهر'
    assert report['matched'] == 1
    assert report['unassigned_facility'] == 1
    assert report['reconciliation_ok'] is True


# ==============================================================================
# 8) مستخدم عام — يرى الكل
# ==============================================================================

def test_global_user_sees_all():
    world_a = _world('A')
    world_b = _world('B')
    _case(facility=world_a['facility'], port=world_a['entry_point'])
    _case(facility=world_b['facility'], port=world_b['entry_point'])

    report = build_by_state_report(user=_superuser())

    assert report['scoped'] is False
    assert report['total'] == 2


# ==============================================================================
# 9) تقرير فارغ — مصالحة الصفر
# ==============================================================================

def test_empty_report():
    report = build_by_state_report(user=_superuser())

    assert report['total'] == 0
    assert report['by_state'] == []
    assert report['reconciliation_ok'] is True
    assert (
        report['matched'] + report['node_no_state']
        + report['unassigned_node'] + report['unassigned_facility']
    ) == 0


# ==============================================================================
# 10) انحدار M7-A2 — الحقل الغائب يبقى غائباً (لا FK، لا migration)
# ==============================================================================

def test_audit_tests_still_green():
    from apps.surveillance.models import HealthEvent

    for model in (HealthCase, HealthEvent):
        fields = {f.name for f in model._meta.fields}
        assert 'reporting_node' not in fields
        assert 'reporting_node_id' not in fields
        assert 'node_path' not in fields
