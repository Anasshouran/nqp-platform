from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.vector_control.models import VectorUnit
from core.utils.scoping import (
    resolve_authorized_entry_points, has_global_scope,
)


class VectorUnitByStateReportView(APIView):
    """تقرير وحدات المكافحة حسب الولاية (via reporting_node walk-up)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = VectorUnit.objects.select_related(
            'reporting_node', 'facility',
        )
        if not (user.is_superuser or has_global_scope(user)):
            ep_ids = resolve_authorized_entry_points(user)
            if ep_ids is None:
                pass
            elif not ep_ids:
                return Response({'status': 'success', 'data': self._empty()})
            else:
                qs = qs.filter(facility__entry_point_id__in=ep_ids)

        total = qs.count()
        matched = 0
        node_no_state = 0
        by_state = {}

        for unit in qs.iterator():
            if unit.reporting_node is None:
                continue
            node = unit.reporting_node
            while node is not None and node.kind != 'STATE':
                node = node.parent
            if node is None:
                node_no_state += 1
            else:
                matched += 1
                key = str(node.id)
                if key not in by_state:
                    by_state[key] = {
                        'state_id': str(node.id),
                        'state_name_ar': node.name_ar,
                        'count': 0,
                    }
                by_state[key]['count'] += 1

        unassigned_facility = qs.filter(facility__isnull=True).count()
        unassigned_node = qs.filter(
            reporting_node__isnull=True, facility__isnull=False
        ).count()

        assert total == matched + node_no_state + unassigned_facility + unassigned_node

        return Response({
            'status': 'success',
            'data': {
                'total': total,
                'matched': matched,
                'node_no_state': node_no_state,
                'unassigned_facility': unassigned_facility,
                'unassigned_node': unassigned_node,
                'by_state': list(by_state.values()),
                'scoped': not (user.is_superuser or has_global_scope(user)),
            },
        })

    def _empty(self):
        return {
            'total': 0, 'matched': 0, 'node_no_state': 0,
            'unassigned_facility': 0, 'unassigned_node': 0,
            'by_state': [], 'scoped': True,
        }
