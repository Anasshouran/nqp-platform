"""تقرير الترصد حسب الولاية — M7-A2b-full (FK-direct، بدل A2b-lite traversal).

**لا save() sync، لا signal.** `reporting_node` snapshot تاريخي يُملأ صراحةً
(UI للجديدة / أمر backfill للموجودة) ولا ينعكس عليه تغيير التعيينات اللاحق.

العبور:
``HealthCase.reporting_node (FK) → سلف STATE``

قرارات معتمدة (A2b-lite 2026-11-14 + A2b-full prompt):
- **Option B (scoping):** `_surveillance_scope_q` القائم مع
  `entry_links=['health_facility__entry_point']` حتى لا تُسقَط حالة (شرط المصالحة).
- **الفئات (A2b-full):**
  - matched: reporting_node NOT NULL + سلف STATE موجود
  - node_no_state: reporting_node NOT NULL + بلا سلف STATE
  - unassigned_facility: health_facility IS NULL
  - unassigned_node: health_facility NOT NULL + reporting_node IS NULL
  كل حالة في فئة واحدة بالضبط.
"""

from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import PermissionAction
from core.utils.response import success_response

from apps.registry.models import ReportingNode
from apps.surveillance.models import HealthCase
from apps.surveillance.serializers.reports import ByStateReportSerializer

REPORT_NOTE = (
    'unassigned_facility: لا منشأة صحية للحالة. '
    'unassigned_node: reporting_node فارغ (snapshot لم يُملأ). '
    'node_no_state: العقدة موجودة لكن بلا سلف STATE. '
    'كل حالة تُحسب في فئة واحدة بالضبط (matched + الثلاث = total).'
)


def _node_map():
    """كل عقدة الشجرة في ذاكرة — استعلام واحد مهما كان عدد الحالات."""
    return {
        row['id']: row
        for row in ReportingNode.objects.values(
            'id', 'parent_id', 'kind', 'code', 'name_ar', 'name_en'
        )
    }


def _state_ancestor(node_id, nodes):
    """يصعد من العقدة حتى أول سلف STATE (أو None) من الخريطة — بلا استعلامات."""
    current = node_id
    visited = set()
    while current is not None and current not in visited:
        visited.add(current)
        row = nodes.get(current)
        if row is None:
            return None
        if row['kind'] == ReportingNode.Kind.STATE:
            return row
        current = row['parent_id']
    return None


def build_by_state_report(*, user, date_from=None, date_to=None):
    """يبني مخرجات التقرير كقاموس جاهز للتسلسل (دالة نقية، بلا HTTP)."""
    queryset = HealthCase.objects.all()
    if date_from is not None:
        queryset = queryset.filter(reported_date__gte=date_from)
    if date_to is not None:
        queryset = queryset.filter(reported_date__lte=date_to)

    # Option B: نطاق الترصد القائم + مسار منفذ المنشأة كقناة إسناد إضافية.
    from apps.surveillance.views import _surveillance_scope_q

    scope_q = _surveillance_scope_q(user, 'port', entry_links=['health_facility__entry_point'])
    if scope_q is not None:
        queryset = queryset.filter(scope_q)

    rows = queryset.select_related('health_facility', 'reporting_node')
    nodes = _node_map()

    total = matched = node_no_state = unassigned_node = unassigned_facility = 0
    buckets = {}

    for case in rows:
        total += 1
        node_id = case.reporting_node_id
        if node_id is None:
            if case.health_facility_id is None:
                unassigned_facility += 1
            else:
                unassigned_node += 1
            continue

        state = _state_ancestor(node_id, nodes)
        if state is None:
            node_no_state += 1
            continue

        matched += 1
        bucket = buckets.get(state['id'])
        if bucket is None:
            bucket = buckets[state['id']] = {
                'state_id': state['id'],
                'state_code': state['code'],
                'state_name_ar': state['name_ar'],
                'state_name_en': state['name_en'],
                'count': 0,
            }
        bucket['count'] += 1

    reconciliation_ok = total == matched + node_no_state + unassigned_node + unassigned_facility
    if not reconciliation_ok:  # pragma: no cover - بنيوي، لا يُفترض أن يقع
        raise AssertionError(
            f'فشل مصالحة تقرير by-state: {total} != '
            f'{matched} + {node_no_state} + {unassigned_node} + {unassigned_facility}'
        )

    return {
        'total': total,
        'matched': matched,
        'node_no_state': node_no_state,
        'unassigned_node': unassigned_node,
        'unassigned_facility': unassigned_facility,
        'by_state': sorted(buckets.values(), key=lambda b: b['state_name_ar'] or ''),
        'scoped': scope_q is not None,
        'reconciliation_ok': reconciliation_ok,
        'note': REPORT_NOTE,
    }


def _parse_date_param(value, field_name):
    if value in (None, ''):
        return None
    parsed = parse_date(value)
    if parsed is None:
        raise ValidationError({field_name: 'صيغة التاريخ غير صحيحة — استخدم YYYY-MM-DD.'})
    return parsed


class SurveillanceByStateReportViewSet(viewsets.ViewSet):
    """`GET /api/v1/surveillance/reports/by-state/` — تجميع هرمي للقراءة فقط."""

    serializer_class = ByStateReportSerializer
    permission_classes = [PermissionAction]
    permission_resource = 'surveillance'
    permission_action = 'view'

    def list(self, request):
        date_from = _parse_date_param(request.query_params.get('date_from'), 'date_from')
        date_to = _parse_date_param(request.query_params.get('date_to'), 'date_to')
        if date_from and date_to and date_from > date_to:
            raise ValidationError({'date_to': 'date_to يجب أن يكون بعد date_from أو مساوياً له.'})

        payload = build_by_state_report(
            user=request.user, date_from=date_from, date_to=date_to,
        )
        return Response(success_response(ByStateReportSerializer(payload).data))
