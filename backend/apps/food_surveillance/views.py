from collections import defaultdict
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.food_quarantine.models import FoodSample, FoodShipment, SampleTest
from core.filters import ExactFilterBackend
from core.utils.response import success_response

from .models import CorrectiveAction, FoodAlert, FoodEstablishment, FoodRecall, NonConformity, RiskAssessment
from .serializers import (
    CorrectiveActionSerializer,
    FoodAlertSerializer,
    FoodEstablishmentSerializer,
    FoodRecallSerializer,
    NonConformitySerializer,
    RiskAssessmentSerializer,
    SurveillanceDashboardSerializer,
)


class FoodAlertViewSet(viewsets.ModelViewSet):
    queryset = FoodAlert.objects.all()
    serializer_class = FoodAlertSerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['status', 'risk_level', 'reason']

    @action(detail=True, methods=['post'], url_path='action')
    def take_action(self, request, pk=None):
        alert = self.get_object()
        alert.status = FoodAlert.AlertStatus.ACTIONED
        alert.recommended_action = request.data.get('recommended_action', '') or alert.recommended_action
        alert.save(update_fields=['status', 'recommended_action'])
        return Response(success_response(FoodAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        alert = self.get_object()
        alert.status = FoodAlert.AlertStatus.CLOSED
        alert.closed_at = timezone.now()
        alert.save(update_fields=['status', 'closed_at'])
        return Response(success_response(FoodAlertSerializer(alert).data))


class FoodEstablishmentViewSet(viewsets.ModelViewSet):
    queryset = FoodEstablishment.objects.select_related('port').all()
    serializer_class = FoodEstablishmentSerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['establishment_type', 'risk_level', 'active', 'region']


class RiskAssessmentViewSet(viewsets.ModelViewSet):
    queryset = RiskAssessment.objects.all()
    serializer_class = RiskAssessmentSerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['assessment_type', 'risk_level']

    def perform_create(self, serializer):
        serializer.save(assessed_by=self.request.user)


class NonConformityViewSet(viewsets.ModelViewSet):
    queryset = NonConformity.objects.select_related('shipment', 'sample', 'reported_by').all()
    serializer_class = NonConformitySerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['status', 'source', 'risk_level']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='advance')
    def advance(self, request, pk=None):
        nc = self.get_object()
        new_status = request.data.get('status')
        allowed = {c for c, _ in NonConformity.NonConformityStatus.choices}
        if new_status not in allowed:
            return Response({'status': 'error', 'message': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        nc.status = new_status
        if new_status == NonConformity.NonConformityStatus.CLOSED:
            nc.closed_at = timezone.now()
        nc.save()
        return Response(success_response(NonConformitySerializer(nc).data))


class CorrectiveActionViewSet(viewsets.ModelViewSet):
    queryset = CorrectiveAction.objects.select_related('non_conformity', 'by_user').all()
    serializer_class = CorrectiveActionSerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['status', 'non_conformity']

    def perform_create(self, serializer):
        serializer.save(by_user=self.request.user)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        item = self.get_object()
        item.status = CorrectiveAction.CorrectiveActionStatus.COMPLETED
        item.completed_at = timezone.now()
        item.save(update_fields=['status', 'completed_at'])
        return Response(success_response(CorrectiveActionSerializer(item).data))


class FoodRecallViewSet(viewsets.ModelViewSet):
    queryset = FoodRecall.objects.all()
    serializer_class = FoodRecallSerializer
    filter_backends = [ExactFilterBackend]
    filter_fields = ['status', 'risk_level', 'recall_type']

    def perform_create(self, serializer):
        serializer.save(decided_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        recall = self.get_object()
        recall.status = FoodRecall.RecallStatus.CLOSED
        recall.closed_at = timezone.now()
        recall.save(update_fields=['status', 'closed_at'])
        return Response(success_response(FoodRecallSerializer(recall).data))


REJECTED_DECISIONS = [
    FoodShipment.FinalDecision.REJECTED,
    FoodShipment.FinalDecision.HOLD,
    FoodShipment.FinalDecision.RE_EXPORT,
    FoodShipment.FinalDecision.DESTROY,
]


def _risk_score(count, total, base=0):
    if total <= 0:
        return base
    return min(100, round(base + (count / total) * 100))


class SurveillanceDashboardViewSet(viewsets.ViewSet):
    serializer_class = SurveillanceDashboardSerializer

    def list(self, request):
        window = (request.query_params.get('window') or 'month').lower()
        if window not in ('day', 'week', 'month', 'year', 'all'):
            window = 'month'
        today = timezone.localdate()
        start = None
        if window != 'all':
            days = {'day': 0, 'week': 7, 'month': 30, 'year': 365}.get(window, 30)
            start = today - timedelta(days=days)

        def windowed(qs, field):
            ftype = qs.model._meta.get_field(field).get_internal_type()
            lookup = 'gte' if ftype == 'DateField' else 'date__gte'
            return qs.filter(**{f'{field}__{lookup}': start}) if start else qs

        shipments = windowed(FoodShipment.objects.all(), field='arrival_date')
        samples = windowed(FoodSample.objects.select_related('inspection'), field='created_at')
        tests = windowed(
            SampleTest.objects.filter(decision=SampleTest.Decision.NON_COMPLIANT),
            field='completed_at',
        )
        nc_qs = windowed(NonConformity.objects.all(), field='reported_at')
        alert_qs = windowed(FoodAlert.objects.all(), field='raised_at')
        recall_qs = windowed(FoodRecall.objects.all(), field='decided_at')

        import_qs = shipments.filter(shipment_type=FoodShipment.ShipmentType.IMPORT)
        export_qs = shipments.filter(shipment_type=FoodShipment.ShipmentType.EXPORT)
        rejected_qs = shipments.filter(final_decision__in=REJECTED_DECISIONS)
        released_qs = shipments.filter(final_decision=FoodShipment.FinalDecision.COMPLIANT)

        nonconforming_samples = samples.filter(
            status=FoodSample.LifecycleStatus.COMPLETED,
            tests__decision=SampleTest.Decision.NON_COMPLIANT,
        ).distinct()

        kpis = {
            'shipments': shipments.count(),
            'samples': samples.count(),
            'nonconforming': nonconforming_samples.count(),
            'alerts': alert_qs.exclude(status=FoodAlert.AlertStatus.CLOSED).count(),
            'recalls_active': recall_qs.exclude(status=FoodRecall.RecallStatus.CLOSED).count(),
            'non_conformities_open': nc_qs.exclude(
                status__in=[NonConformity.NonConformityStatus.RESOLVED, NonConformity.NonConformityStatus.CLOSED]
            ).count(),
            'imports': import_qs.count(),
            'exports': export_qs.count(),
            'rejected': rejected_qs.count(),
            'released': released_qs.count(),
        }

        ship_rows = shipments.values_list('origin_country', 'supplier_name', 'product_list', 'final_decision')

        country_ship = defaultdict(int)
        country_rej = defaultdict(int)
        supplier_ship = defaultdict(int)
        supplier_rej = defaultdict(int)
        product_ship = defaultdict(int)
        product_rej = defaultdict(int)

        for origin, supplier, products, decision in ship_rows:
            is_rejected = decision in REJECTED_DECISIONS
            if origin:
                country_ship[origin] += 1
                country_rej[origin] += int(is_rejected)
            if supplier:
                supplier_ship[supplier] += 1
                supplier_rej[supplier] += int(is_rejected)
            if products:
                names = []
                for p in (products if isinstance(products, list) else [products]):
                    if isinstance(p, dict):
                        names.append(p.get('item') or p.get('name') or p.get('product') or '')
                    elif isinstance(p, str):
                        names.append(p)
                for name in filter(None, names):
                    product_ship[str(name).strip()] += 1
                    product_rej[str(name).strip()] += int(is_rejected)

        def risk_list(counter_ship, counter_rej, limit=8):
            items = []
            for key in counter_ship:
                items.append({
                    'name': key,
                    'count': counter_ship[key],
                    'rejected': counter_rej[key],
                    'score': _risk_score(counter_rej[key], counter_ship[key], 15),
                })
            items.sort(key=lambda x: x['score'], reverse=True)
            return items[:limit]

        countries = risk_list(country_ship, country_rej, 6)
        suppliers = risk_list(supplier_ship, supplier_rej, 6)
        products = risk_list(product_ship, product_rej, 8)

        trend = list(
            samples.filter(tests__decision=SampleTest.Decision.NON_COMPLIANT)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(total=Count('id', distinct=True))
            .order_by('day')[:30]
        )
        trend_series = [{'date': str(r['day']), 'count': r['total']} for r in trend]

        parameter_rows = list(
            tests.filter(parameter__isnull=False)
            .values('parameter__code', 'parameter__name_ar')
            .annotate(total=Count('id'))
            .order_by('-total')[:9]
        )
        lab_top = [
            {'code': r['parameter__code'], 'name': r['parameter__name_ar'] or r['parameter__code'], 'count': r['total']}
            for r in parameter_rows
        ]

        nc_status_rows = list(nc_qs.values('status').annotate(total=Count('id')))
        nc_buckets = {r['status'] or 'OPEN': r['total'] for r in nc_status_rows}
        nc_distribution = {
            'open': nc_buckets.get('OPEN', 0),
            'under_investigation': nc_buckets.get('UNDER_INVESTIGATION', 0),
            'corrective_action': nc_buckets.get('CORRECTIVE_ACTION', 0),
            'resolved': nc_buckets.get('RESOLVED', 0),
            'closed': nc_buckets.get('CLOSED', 0),
        }

        alerts = [
            {
                'id': str(a.id),
                'alert_number': a.alert_number,
                'title': a.title,
                'reason': a.reason,
                'risk_level': a.risk_level,
                'product': a.product,
                'origin_country': a.origin_country,
                'supplier': a.supplier,
                'description': a.description,
                'recommended_action': a.recommended_action,
                'status': a.status,
                'raised_at': a.raised_at.isoformat(),
            }
            for a in alert_qs.order_by('-raised_at')[:8]
        ]
        non_conformities = [
            {
                'id': str(n.id),
                'nc_number': n.nc_number,
                'source': n.source,
                'product': n.product,
                'origin_country': n.origin_country,
                'supplier': n.supplier,
                'status': n.status,
                'risk_level': n.risk_level,
                'description': n.description,
                'reported_at': n.reported_at.isoformat(),
            }
            for n in nc_qs.order_by('-reported_at')[:8]
        ]
        recalls = [
            {
                'id': str(r.id),
                'recall_number': r.recall_number,
                'product': r.product,
                'origin_country': r.origin_country,
                'recall_type': r.recall_type,
                'status': r.status,
                'risk_level': r.risk_level,
                'decided_at': r.decided_at.isoformat(),
            }
            for r in recall_qs.order_by('-decided_at')[:8]
        ]

        active_alerts = kpis['alerts']
        active_recalls = kpis['recalls_active']
        if active_recalls >= 2 or kpis['nonconforming'] >= 3:
            response_level = 'LEVEL_3'
        elif active_alerts >= 3 or active_recalls >= 1:
            response_level = 'LEVEL_2'
        elif active_alerts >= 1:
            response_level = 'LEVEL_1'
        else:
            response_level = 'LEVEL_0'

        return Response(success_response({
            'window': {'key': window, 'start': start.isoformat() if start else None, 'today': today.isoformat()},
            'kpis': kpis,
            'risk': {
                'countries': countries,
                'suppliers': suppliers,
                'products': products,
            },
            'trend': trend_series,
            'lab_top': lab_top,
            'nc_distribution': nc_distribution,
            'alerts': alerts,
            'non_conformities': non_conformities,
            'recalls': recalls,
            'response_level': response_level,
        }))