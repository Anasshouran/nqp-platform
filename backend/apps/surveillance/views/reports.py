"""تقرير الترصد حسب الولاية — M7-A2b-lite (Phase 0).

**لا FK، لا migration، لا `save()` sync.** العبور:
``HealthCase.health_facility → node_assignments (النشط) → node → سلف STATE``.

قرارات مُعتمدة من المالك (2026-11-14):
- **Option B (scoping):** يُستخدم `_surveillance_scope_q` القائم مع
  `entry_links=['health_facility__entry_point']` حتى لا تُسقَط الحالات التي
  تُسند عبر المنفذ أو القطاع أو المنشأة (شرط المصالحة).
- **walk-up لا `path.split()`:** سلسلة `parent` هي المرجع القانوني، ولا تعتمد
  على صيغة `path`. تعمل بوجود جذر FEDERAL أو بغيابه.
- **كل حالة في فئة واحدة بالضبط:** matched / node_no_state / unassigned_node /
  unassigned_facility. لا إسقاط ولا ازدواج.
"""

from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import PermissionAction
from core.utils.response import success_response

from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.surveillance.models import HealthCase
from apps.surveillance.serializers.reports import ByStateReportSerializer

REPORT_NOTE = (
    'unassigned_facility: لا منشأة صحية للحالة. '
    'unassigned_node: المنشأة بلا تعيين عقدة نشط. '
    'node_no_state: العقدة موجودة لكن بلا سلف STATE. '
    'كل حالة تُحسب في فئة واحدة بالضبط (matched + الثلاث = total).'
)


def _state_ancestor(node):
    """ي ascends من العقدة حتى أول سلف من نوع STATE، أو None."""
    visited = set()
    current = node
    while current is not None and current.id not in visited:
        visited.add(current.id)
        if current.kind == ReportingNode.Kind.STATE:
            return current
        current = current.parent
    return None


def build_by_state_report(*, user, date_from=None, date_to=None):
    """يبني مخرجات التقرير كقاموس جاهز للتسلسل.

    دالة نقية (لا HTTP) حتى تُختبر المصالحة وعدد الاستعلامات مباشرة.
    """
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

    active_assignments = HealthFacilityNodeAssignment.objects.filter(
        valid_to__isnull=True
    ).select_related('node__parent__parent')

    rows = queryset.select_related('health_facility').prefetch_related(
        Prefetch(
            'health_facility__node_assignments',
            queryset=active_assignments,
            to_attr='_active_node_assignments',
        )
    )

    total = matched = node_no_state = unassigned_node = unassigned_facility = 0
    buckets = {}

    for case in rows:
        total += 1
        facility = case.health_facility
        if facility is None:
            unassigned_facility += 1
            continue

        assignments = getattr(facility, '_active_node_assignments', None) or []
        if not assignments:
            unassigned_node += 1
            continue

        state = _state_ancestor(assignments[0].node)
        if state is None:
            node_no_state += 1
            continue

        matched += 1
        bucket = buckets.get(state.id)
        if bucket is None:
            bucket = buckets[state.id] = {
                'state_id': state.id,
                'state_code': state.code,
                'state_name_ar': state.name_ar,
                'state_name_en': state.name_en,
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
