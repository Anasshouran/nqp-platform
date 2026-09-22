from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.response import success_response
from .models import (
    ServiceWindow, WindowCommodity, ShipmentTransaction,
    TransactionCommodity, CommodityDecision, WindowAssignment, WindowAuditLog,
)
from .serializers import (
    ServiceWindowSerializer, WindowCommoditySerializer,
    ShipmentTransactionSerializer, TransactionCommoditySerializer,
    CommodityDecisionSerializer, WindowAssignmentSerializer, WindowAuditLogSerializer,
)


class ServiceWindowViewSet(viewsets.ModelViewSet):
    queryset = ServiceWindow.objects.select_related('station').prefetch_related('commodities')
    serializer_class = ServiceWindowSerializer
    search_fields = ['code', 'name_ar']

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        windows = self.get_queryset().filter(is_active=True)
        now = timezone.now()
        data = []
        for w in windows:
            txs = w.transactions.filter(status__in=[ShipmentTransaction.Status.OPEN, ShipmentTransaction.Status.IN_PROGRESS])
            closed_today = w.transactions.filter(status=ShipmentTransaction.Status.CLOSED, closed_at__date=now.date())
            decisions = CommodityDecision.objects.filter(line__transaction__window=w)
            approved = decisions.filter(decision=CommodityDecision.DecisionType.APPROVED).count()
            rejected = decisions.filter(decision=CommodityDecision.DecisionType.REJECTED).count()
            data.append({
                'id': str(w.id),
                'code': w.code,
                'name_ar': w.name_ar,
                'station': str(w.station_id),
                'station_name': w.station.name_ar,
                'window_type': w.window_type,
                'open_transactions': txs.count(),
                'closed_today': closed_today.count(),
                'approved': approved,
                'rejected': rejected,
                'total_decisions': approved + rejected,
            })
        return Response(success_response(data), status=status.HTTP_200_OK)


class WindowCommodityViewSet(viewsets.ModelViewSet):
    queryset = WindowCommodity.objects.select_related('window')
    serializer_class = WindowCommoditySerializer
    search_fields = ['code', 'name_ar']


class ShipmentTransactionViewSet(viewsets.ModelViewSet):
    queryset = ShipmentTransaction.objects.select_related(
        'shipment', 'window', 'commodity', 'clerk',
    ).prefetch_related('commodity_lines__commodity')
    serializer_class = ShipmentTransactionSerializer
    search_fields = ['shipment__manifest_number']

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        tx = self.get_object()
        if tx.status == ShipmentTransaction.Status.CLOSED:
            return Response(
                {'status': 'error', 'message': 'المعاملة مغلقة بالفعل'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tx.status = ShipmentTransaction.Status.CLOSED
        tx.closed_at = timezone.now()
        tx.save(update_fields=['status', 'closed_at'])
        WindowAuditLog.objects.create(
            window=tx.window, user=request.user,
            action='close_transaction',
            detail={'transaction_id': str(tx.id), 'shipment': str(tx.shipment_id)},
        )
        return Response(success_response(ShipmentTransactionSerializer(tx).data), status=status.HTTP_200_OK)


class TransactionCommodityViewSet(viewsets.ModelViewSet):
    queryset = TransactionCommodity.objects.select_related('transaction', 'commodity')
    serializer_class = TransactionCommoditySerializer


class CommodityDecisionViewSet(viewsets.ModelViewSet):
    queryset = CommodityDecision.objects.select_related('line', 'decided_by')
    serializer_class = CommodityDecisionSerializer

    def perform_create(self, serializer):
        decision = serializer.save(decided_by=self.request.user)
        decision.line.decision = decision.decision
        decision.line.decided_at = decision.decided_at
        decision.line.save(update_fields=['decision', 'decided_at'])
        WindowAuditLog.objects.create(
            window=decision.line.transaction.window, user=self.request.user,
            action='commodity_decision',
            detail={
                'transaction_id': str(decision.line.transaction_id),
                'commodity': decision.line.commodity.name_ar,
                'decision': decision.decision,
            },
        )


class WindowAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WindowAssignment.objects.select_related('user', 'window').prefetch_related('commodities')
    serializer_class = WindowAssignmentSerializer

    @action(detail=False, methods=['get'], url_path='my-scope')
    def my_scope(self, request):
        """╴scope الحالي للمستخدم: النوافذ والسلع المرتبطة به."""
        assignments = WindowAssignment.objects.filter(
            user=request.user, is_active=True,
        ).select_related('window').prefetch_related('commodities')
        windows = []
        for a in assignments:
            windows.append({
                'window_id': str(a.window_id),
                'window_name': a.window.name_ar,
                'window_code': a.window.code,
                'station': a.window.station.name_ar,
                'commodities': [
                    {'id': str(c.id), 'name_ar': c.name_ar}
                    for c in a.commodities.all()
                ],
            })
        return Response(success_response(windows), status=status.HTTP_200_OK)


class WindowAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WindowAuditLog.objects.select_related('window', 'user')
    serializer_class = WindowAuditLogSerializer
