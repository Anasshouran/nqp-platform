import csv
import io
from collections import Counter
from datetime import timedelta

from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.emergency_eoc.models import EmergencyAlert
from apps.laboratory.models import LabResult, LabSample
from apps.screening.models import HealthScreening
from apps.travelers.models import Traveler
from core.utils.response import success_response

from .models import Report
from .serializers import ReportSerializer


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related('requested_by').all()
    serializer_class = ReportSerializer
    http_method_names = ['get', 'post']

    @action(detail=False, methods=['get'], url_path='kpis')
    def kpis(self, request):
        port_id = request.query_params.get('port_id')
        today = timezone.localdate()
        screenings_qs = HealthScreening.objects.filter(screened_at__date=today)
        if port_id:
            screenings_qs = screenings_qs.filter(port_id=port_id)
        positive_today = LabResult.objects.filter(
            result=LabResult.Result.POSITIVE, result_date__date=today
        )
        active_followups = Traveler.objects.filter(
            registration_status=Traveler.RegistrationStatus.COMPLETED
        ).count()
        data = {
            'total_screenings_today': screenings_qs.count(),
            'positive_cases_today': positive_today.count(),
            'occupancy_rate': 0.0,
            'avg_processing_time': 0.0,
            'pending_lab_results': LabResult.objects.filter(
                approval_status=LabResult.ApprovalStatus.PENDING
            ).count(),
            'active_followups': active_followups,
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='surveillance')
    def surveillance(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        disease_id = request.query_params.get('disease_id')
        results = LabResult.objects.all()
        if from_date:
            results = results.filter(result_date__date__gte=from_date)
        if to_date:
            results = results.filter(result_date__date__lte=to_date)
        if disease_id:
            results = results.filter(disease_id=disease_id)
        by_disease = list(
            results.values('disease__icd_11_code', 'disease__name_ar')
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        by_status = list(
            results.values('result').annotate(total=Count('id')).order_by('-total')
        )
        return Response(success_response({'by_disease': by_disease, 'by_status': by_status}))

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        report_format = request.query_params.get('type', 'CSV')
        report_id = request.query_params.get('report_id')
        rows = list(HealthScreening.objects.values(
            'traveler__passport_number', 'port__code', 'body_temperature',
            'oxygen_saturation', 'screened_at'
        )[:1000])
        if report_format == 'CSV' or report_format == 'EXCEL':
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()) if rows else ['id'])
            writer.writeheader()
            writer.writerows(rows)
            response = HttpResponse(buffer.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="report.csv"'
            return response
        return Response({'status': 'error', 'message': 'الصيغة غير مدعومة'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='ihr')
    def ihr(self, request):
        today = timezone.localdate()
        data = {
            'report_date': today.isoformat(),
            'reporting_entity': 'National Quarantine Platform - Sudan',
            'total_screenings_today': HealthScreening.objects.filter(screened_at__date=today).count(),
            'positive_cases_today': LabResult.objects.filter(
                result=LabResult.Result.POSITIVE, result_date__date=today
            ).count(),
            'active_emergencies': EmergencyAlert.objects.filter(status=EmergencyAlert.AlertStatus.NEW).count(),
            'ihr_events': [],
        }
        return Response(success_response(data))

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(requested_by=request.user)
        report.status = Report.ReportStatus.READY
        report.save(update_fields=['status'])
        return Response(
            success_response(ReportSerializer(report).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        qs = self.get_queryset()[:100]
        return Response(success_response(ReportSerializer(qs, many=True).data))

    @action(detail=False, methods=['get'], url_path='executive-dashboard')
    def executive_dashboard(self, request):
        """لوحة القيادة التنفيذية الوطنية لمدير عام الحجر الصحي القومي."""
        window = (request.query_params.get('window') or 'month').lower()
        if window not in ('day', 'week', 'month', 'year', 'all'):
            window = 'month'

        today = timezone.localdate()
        start = None
        if window != 'all':
            days = {'day': 0, 'week': 7, 'month': 30, 'year': 365}.get(window, 30)
            start = today - timedelta(days=days)

        def windowed(qs, field='created_at'):
            ftype = qs.model._meta.get_field(field).get_internal_type()
            lookup = 'gte' if ftype == 'DateField' else 'date__gte'
            return qs.filter(**{f'{field}__{lookup}': start}) if start else qs

        # ---------- القطاعات والمنافذ ----------
        from apps.organization.models import Sector
        from apps.masterdata.models import EntryPoint as Port
        from apps.travelers.models import Traveler
        from apps.screening.models import HealthScreening
        from apps.clinic.models import ClinicReferral

        port_types = list(Port.objects.values('kind').annotate(total=Count('id')))
        ports = {
            'total': sum(p['total'] for p in port_types),
            'airports': next((p['total'] for p in port_types if p['kind'] == 'AIRPORT'), 0),
            'seaports': next((p['total'] for p in port_types if p['kind'] == 'SEAPORT'), 0),
            'land_ports': next((p['total'] for p in port_types if p['kind'] == 'LAND_PORT'), 0),
        }

        passengers = windowed(Traveler.objects.all()).count()

        screening_qs = windowed(HealthScreening.objects.select_related('port'), field='screened_at')
        referrals_qs = windowed(ClinicReferral.objects.all(), field='created_at')

        sector_rows = []
        for s in Sector.objects.annotate(station_count=Count('stations')).order_by('name_en'):
            # الربط مباشر: EntryPoint.sector يشير الآن إلى organization.Sector
            screens = screening_qs.filter(port__sector=s).count()
            suspected = referrals_qs.filter(
                status=ClinicReferral.ReferralStatus.PENDING,
                port__sector=s,
            ).count()
            readiness = round(100 - min(100, suspected * 100 // max(1, screens)))
            if screens > 0 and suspected / screens >= 0.30:
                status_label = 'CRITICAL'
            elif screens > 0 and suspected / screens >= 0.10:
                status_label = 'WATCH'
            else:
                status_label = 'STABLE'
            sector_rows.append({
                'id': str(s.id),
                'name': s.name_ar or s.name_en,
                'stations': s.station_count,
                'screens': screens,
                'suspected': suspected,
                'readiness': readiness,
                'status': status_label,
            })
        ranking = sorted(sector_rows, key=lambda x: -x['readiness'])

        # ---------- رقابة الأغذية ----------
        from apps.food_quarantine.models import FoodInvoice, FoodSample, FoodShipment

        shipment_qs = windowed(FoodShipment.objects.all(), field='arrival_date')
        imports = shipment_qs.filter(shipment_type='IMPORT').count()
        exports = shipment_qs.filter(shipment_type='EXPORT').count()
        released = shipment_qs.filter(
            final_decision__in=['COMPLIANT', 'CONDITIONAL_RELEASE']
        ).count()
        rejected = shipment_qs.filter(
            final_decision__in=['REJECTED', 'HOLD', 'RE_EXPORT', 'DESTROY']
        ).count()
        in_progress = shipment_qs.filter(
            status__in=['RECEIVED', 'FEES_DUE', 'AWAITING_INSPECTION', 'UNDER_INSPECTION',
                        'AWAITING_LAB_RESULTS', 'AWAITING_DECISION']
        ).count()
        food_samples = windowed(FoodSample.objects.all(), field='received_at').count()

        rejected_all = FoodShipment.objects.filter(
            final_decision__in=['REJECTED', 'HOLD', 'RE_EXPORT', 'DESTROY']
        )
        product_counter: Counter = Counter()
        for s in rejected_all.iterator():
            for item in (s.product_list or []):
                name = item.get('name') if isinstance(item, dict) else str(item)
                if name:
                    product_counter[name.strip()] += 1
        top_products = [
            {'name': name, 'count': total} for name, total in product_counter.most_common(5)
        ]

        final_decisions = list(
            shipment_qs.exclude(final_decision='')
            .values('final_decision').annotate(total=Count('id')).order_by('-total')
        )

        # ---------- الإيرادات ----------
        paid_invoices = FoodInvoice.objects.filter(paid_at__isnull=False)
        revenue_total = float(paid_invoices.aggregate(total=Sum('total_amount'))['total'] or 0)
        revenue_shares = []
        if revenue_total > 0:
            food_amt = float(paid_invoices.aggregate(total=Sum('total_amount'))['total'] or 0)
            revenue_shares = [
                {'name': 'رقابة الأغذية', 'amount': food_amt, 'pct': round(food_amt / revenue_total * 100)},
                {'name': 'المختبرات', 'amount': 0.0, 'pct': 0},
                {'name': 'الشهادات', 'amount': 0.0, 'pct': 0},
            ]
        else:
            revenue_shares = []

        # ---------- المختبرات ----------
        lab_qs = windowed(LabSample.objects.all(), field='collected_at')
        lab = {
            'received': lab_qs.count(),
            'processing': lab_qs.filter(status='PROCESSING').count(),
            'completed': lab_qs.filter(status='COMPLETED').count(),
            'pending_results': LabResult.objects.filter(
                approval_status=LabResult.ApprovalStatus.PENDING
            ).count(),
        }
        turnover = []
        for r in LabResult.objects.select_related('sample').filter(sample__collected_at__isnull=False)[:300]:
            if r.sample is None or r.result_date is None:
                continue
            days = (r.result_date.date() - r.sample.collected_at.date()).days
            if days >= 0:
                turnover.append(days)
        lab['avg_turnover_days'] = round(sum(turnover) / len(turnover), 1) if turnover else 0.0

        # ---------- الترصد الوبائي ----------
        suspected_total = referrals_qs.filter(
            status=ClinicReferral.ReferralStatus.PENDING
        ).count()
        confirmed_total = LabResult.objects.filter(
            result=LabResult.Result.POSITIVE,
        ).count()
        confirmed_window = windowed(LabResult.objects.filter(result='POSITIVE'), field='result_date').count()
        active_alerts = EmergencyAlert.objects.filter(
            status=EmergencyAlert.AlertStatus.NEW
        ).count()
        risk_ratio = confirmed_total / max(1, HealthScreening.objects.count())
        if risk_ratio >= 0.3:
            risk_level = 'CRITICAL'
        elif risk_ratio >= 0.1:
            risk_level = 'MEDIUM'
        elif confirmed_total > 0:
            risk_level = 'LOW'
        else:
            risk_level = 'STABLE'

        # ---------- المطارات ----------
        from apps.airport_health.models import AirportScreening
        from apps.carriers.models import Flight as AirportFlight
        airports = {
            'count': ports['airports'],
            'flights_today': AirportFlight.objects.filter(
                destination_port__type='AIRPORT', scheduled_arrival__date=today
            ).exclude(status='CANCELLED').count(),
            'screenings': windowed(AirportScreening.objects.all(), field='screened_at').count(),
            'referrals': referrals_qs.filter(port__type='AIRPORT').count(),
            'suspected': AirportScreening.objects.filter(
                risk_level='RED', screened_at__date__gte=start if start else today - timedelta(days=30)
            ).count(),
        }

        # ---------- الموانئ ----------
        from apps.port_health.models import HealthDeclaration, Vessel
        vessels_qs = windowed(Vessel.objects.all(), field='arrival_date')
        declarations_qs = windowed(HealthDeclaration.objects.all(), field='declaration_date')
        seaports = {
            'ships': vessels_qs.count(),
            'inspected': vessels_qs.filter(status__in=['INSPECTED', 'CLEARED']).count(),
            'declarations': declarations_qs.count(),
            'free_pratique': declarations_qs.filter(status='APPROVED').count(),
        }

        # ---------- المعابر ----------
        border_screenings = screening_qs.filter(port__type='LAND_PORT').count()
        land_borders = {
            'ports': ports['land_ports'],
            'screenings': border_screenings,
            'suspected': referrals_qs.filter(port__type='LAND_PORT').count(),
        }

        # ---------- ناقلات ----------
        vectors = {
            'reports': 0,
            'active_campaigns': 0,
            'high_risk_sites': 0,
            'completed_sprays': 0,
            'note': 'لا يوجد مصدر بيانات لمكافحة النواقل بعد',
        }

        # ---------- التنبيهات ----------
        from apps.notifications.models import NotificationLog
        alerts = [
            {
                'id': str(n.id),
                'severity': 'info',
                'title': n.subject or 'إشعار',
                'body': (n.body or '')[:140],
                'time': n.created_at.isoformat(),
                'recipient': n.recipient,
            }
            for n in NotificationLog.objects.order_by('-created_at')[:8]
        ]

        # ---------- العرض النهائي ----------
        kpis = {
            'sectors': Sector.objects.count(),
            'ports': ports,
            'passengers': passengers,
            'imports': imports,
            'exports': exports,
            'samples': food_samples,
            'screenings': {
                'total': screening_qs.count(),
                'pending': referrals_qs.filter(status=ClinicReferral.ReferralStatus.PENDING).count(),
                'completed': screening_qs.count() - referrals_qs.filter(status='PENDING').count(),
            },
            'certificates': released,
            'revenue': revenue_total,
            'suspected': suspected_total,
            'confirmed': confirmed_total,
        }

        return Response(success_response({
            'window': {'key': window, 'start': start.isoformat() if start else None, 'today': today.isoformat()},
            'kpis': kpis,
            'sectors': sector_rows,
            'ranking': ranking,
            'food': {
                'imports': imports, 'exports': exports,
                'released': released, 'rejected': rejected, 'in_progress': in_progress,
                'samples': food_samples, 'noncomplying': rejected,
                'top_products': top_products, 'final_decisions': final_decisions,
            },
            'labs': lab,
            'surveillance': {
                'suspected': suspected_total, 'confirmed': confirmed_total,
                'active_alerts': active_alerts, 'risk_level': risk_level,
            },
            'vectors': vectors,
            'airports': airports,
            'seaports': seaports,
            'land_borders': land_borders,
            'revenue': {'total': revenue_total, 'shares': revenue_shares},
            'alerts': alerts,
        }))

    @action(detail=False, methods=['get'], url_path='sector-dashboard')
    def sector_dashboard(self, request):
        """لوحة مدير القطاع — نطاق قطاع واحد فقط (Sector Scope)."""
        from apps.organization.models import Department, OrgAssignment, Sector, Station
        from apps.masterdata.models import EntryPoint as Port
        from core.utils.ports import sector_entry_points
        from apps.clinic.models import ClinicReferral

        window = (request.query_params.get('window') or 'month').lower()
        if window not in ('day', 'week', 'month', 'year', 'all'):
            window = 'month'

        sector = None
        sector_id = request.query_params.get('sector_id') or request.query_params.get('sector')
        if sector_id:
            sector = Sector.objects.filter(pk=sector_id).first()
        if sector is None and not request.user.is_anonymous:
            scopes = request.user.active_scopes('view_dashboard')
            scope = next((s for s in scopes if s['scope_type'] == 'SECTOR' and s['scope_id']), None)
            if scope:
                sector = Sector.objects.filter(pk=scope['scope_id']).first()
        if sector is None:
            sector = Sector.objects.filter(is_active=True).order_by('order').first()

        empty = {
            'sector': None, 'window': {'key': window}, 'kpis': {}, 'stations': [],
            'food': {}, 'lab': {}, 'airports': {}, 'seaports': {}, 'land_borders': {},
            'vectors': {}, 'surveillance': {}, 'revenue': {'total': 0.0, 'shares': []},
            'alerts': [], 'departments': [], 'staff': [], 'performance': [],
        }
        if sector is None:
            return Response(success_response(empty))

        today = timezone.localdate()
        start = None
        if window != 'all':
            days = {'day': 0, 'week': 7, 'month': 30, 'year': 365}.get(window, 30)
            start = today - timedelta(days=days)

        def windowed(qs, field='created_at'):
            ftype = qs.model._meta.get_field(field).get_internal_type()
            lookup = 'gte' if ftype == 'DateField' else 'date__gte'
            return qs.filter(**{f'{field}__{lookup}': start}) if start else qs

        # ---------- منافذ القطاع (نقاط الدخول) ----------
        sector_ports = sector_entry_points(sector)
        port_ids = list(sector_ports.values_list('id', flat=True))

        port_rows = []
        screening_qs = windowed(HealthScreening.objects.select_related('port'), field='screened_at')
        referrals_qs = windowed(ClinicReferral.objects.all(), field='created_at')
        if port_ids:
            screening_qs = screening_qs.filter(port_id__in=port_ids)
            referrals_qs = referrals_qs.filter(port_id__in=port_ids)

        for p in sector_ports.order_by('name_ar'):
            screens = screening_qs.filter(port_id=p.id).count()
            suspected = referrals_qs.filter(port_id=p.id, status=ClinicReferral.ReferralStatus.PENDING).count()
            readiness = round(100 - min(100, suspected * 100 // max(1, screens))) if screens else 100
            if screens > 0 and suspected / screens >= 0.30:
                port_status = 'CRITICAL'
            elif screens > 0 and suspected / screens >= 0.10:
                port_status = 'WATCH'
            else:
                port_status = 'STABLE'
            port_rows.append({
                'id': str(p.id),
                'name': p.name_ar or p.name_en,
                'code': p.code,
                'kind': p.kind,
                'type': p.kind,
                'screens': screens,
                'suspected': suspected,
                'readiness': readiness,
                'status': port_status,
            })

        # ---------- ملخص القطاع ----------
        station_count = Station.objects.filter(sector_id=sector.id, is_active=True).count()
        staff_count = OrgAssignment.objects.filter(sector_id=sector.id, is_active=True).values('user_id').distinct().count()
        passenger_count = (
            HealthScreening.objects.filter(port_id__in=port_ids).values('traveler_id').distinct().count()
            if port_ids else 0
        )

        # ---------- رقابة الأغذية ----------
        from apps.food_quarantine.models import FoodInvoice, FoodSample, FoodShipment, SampleTest
        shipment_qs = windowed(FoodShipment.objects.all(), field='arrival_date')
        if port_ids:
            shipment_qs = shipment_qs.filter(port_id__in=port_ids)
        imports = shipment_qs.filter(shipment_type='IMPORT').count()
        exports = shipment_qs.filter(shipment_type='EXPORT').count()
        released = shipment_qs.filter(final_decision__in=['COMPLIANT', 'CONDITIONAL_RELEASE']).count()
        rejected = shipment_qs.filter(final_decision__in=['REJECTED', 'HOLD', 'RE_EXPORT', 'DESTROY']).count()
        in_progress = shipment_qs.filter(
            status__in=['RECEIVED', 'FEES_DUE', 'AWAITING_INSPECTION', 'UNDER_INSPECTION',
                        'AWAITING_LAB_RESULTS', 'AWAITING_DECISION']
        ).count()

        shipment_ids = list(shipment_qs.values_list('id', flat=True))
        sample_qs = FoodSample.objects.filter(inspection__shipment_id__in=shipment_ids) if shipment_ids else FoodSample.objects.none()
        food_samples = sample_qs.count()
        noncomplying_food = (
            SampleTest.objects.filter(sample__in=sample_qs, decision='NON_COMPLIANT').values('sample_id').distinct().count()
            if shipment_ids else 0
        )
        product_counter: Counter = Counter()
        for s in FoodShipment.objects.filter(id__in=shipment_ids).iterator() if shipment_ids else []:
            for item in (s.product_list or []):
                name = item.get('name') if isinstance(item, dict) else str(item)
                if name:
                    product_counter[name.strip()] += 1
        top_products = [
            {'name': name, 'count': total} for name, total in product_counter.most_common(5)
        ]

        # ---------- الإيرادات ----------
        invoice_qs = FoodInvoice.objects.filter(shipment_id__in=shipment_ids) if shipment_ids else FoodInvoice.objects.none()
        paid_invoices = invoice_qs.filter(paid_at__isnull=False)
        revenue_total = float(paid_invoices.aggregate(total=Sum('total_amount'))['total'] or 0)
        revenue_shares = []
        if revenue_total > 0:
            revenue_shares = [
                {'name': 'رقابة الأغذية', 'amount': revenue_total, 'pct': 100},
                {'name': 'المختبرات', 'amount': 0.0, 'pct': 0},
                {'name': 'الشهادات', 'amount': 0.0, 'pct': 0},
            ]

        # ---------- المختبرات ----------
        from apps.laboratory.models import LabResult, LabSample
        lab_samples = windowed(LabSample.objects.all(), field='collected_at')
        if port_ids:
            lab_samples = lab_samples.filter(visit__referral__port_id__in=port_ids)
        lab_ids = list(lab_samples.values_list('id', flat=True))
        approved_results = LabResult.objects.filter(sample_id__in=lab_ids) if lab_ids else LabResult.objects.none()
        lab = {
            'received': lab_samples.count(),
            'processing': lab_samples.filter(status='PROCESSING').count(),
            'completed': lab_samples.filter(status='COMPLETED').count(),
            'pending_results': lab_samples.filter(status__in=['REGISTERED', 'PROCESSING']).count(),
            'noncomplying': approved_results.filter(result__in=['POSITIVE', 'INCONCLUSIVE']).count(),
        }
        turnover = []
        for r in approved_results.select_related('sample').filter(sample__collected_at__isnull=False)[:300]:
            if r.sample is None or r.result_date is None:
                continue
            days = (r.result_date.date() - r.sample.collected_at.date()).days
            if days >= 0:
                turnover.append(days)
        lab['avg_turnover_days'] = round(sum(turnover) / len(turnover), 1) if turnover else 0.0

        # ---------- المطارات ----------
        from apps.airport_health.models import AirportScreening
        from apps.carriers.models import Flight
        airport_port_ids = [p['id'] for p in port_rows if p['type'] == 'AIRPORT']
        flights_qs = Flight.objects.filter(destination_port_id__in=airport_port_ids) if airport_port_ids else Flight.objects.none()
        flights_today = flights_qs.filter(scheduled_arrival__date=today).exclude(status='CANCELLED').count()
        airport_screenings = AirportScreening.objects.filter(
            screening_point__terminal__port_id__in=airport_port_ids
        ) if airport_port_ids else AirportScreening.objects.none()
        airports = {
            'count': len(airport_port_ids),
            'flights_today': flights_today,
            'screenings': windowed(airport_screenings, field='screened_at').count(),
            'passengers': passenger_count,
            'referrals': referrals_qs.filter(port_id__in=airport_port_ids).count(),
            'suspected': windowed(airport_screenings.filter(risk_level='RED'), field='screened_at').count(),
        }

        # ---------- الموانئ (تربط بـ SeaPort عبر الاسم) ----------
        from apps.port_health.models import HealthDeclaration, SeaPort, SurveillanceCase, VesselVisit
        seaport_names = [p['name'] for p in port_rows if p['type'] == 'SEAPORT']
        sea_ports = SeaPort.objects.filter(name_ar__in=seaport_names) if seaport_names else SeaPort.objects.none()
        sea_port_ids = list(sea_ports.values_list('id', flat=True))
        visit_qs = VesselVisit.objects.filter(port_id__in=sea_port_ids) if sea_port_ids else VesselVisit.objects.none()
        visit_ids = list(visit_qs.values_list('id', flat=True))
        declarations = HealthDeclaration.objects.filter(visit_id__in=visit_ids) if visit_ids else HealthDeclaration.objects.none()
        seaports = {
            'ships': visit_qs.count(),
            'inspected': visit_qs.exclude(status__in=['EXPECTED', 'ARRIVED']).count(),
            'declarations': windowed(declarations, field='declaration_date').count(),
            'free_pratique': declarations.filter(status='APPROVED').count(),
            'suspected': SurveillanceCase.objects.filter(vessel__visits__port_id__in=sea_port_ids).count(),
        }

        # ---------- المعابر البرية ----------
        land_port_ids = [p['id'] for p in port_rows if p['type'] == 'LAND_PORT']
        land_borders = {
            'ports': len(land_port_ids),
            'screenings': screening_qs.filter(port_id__in=land_port_ids).count() if land_port_ids else 0,
            'suspected': referrals_qs.filter(port_id__in=land_port_ids).count() if land_port_ids else 0,
        }

        # ---------- النواقل ----------
        from apps.vector_control.models import VectorControlOperation, VectorSurvey
        survey_qs = windowed(VectorSurvey.objects.select_related('entry_point').all(), field='survey_date')
        if port_ids:
            survey_qs = survey_qs.filter(entry_point_id__in=port_ids)
        high_risk_sites = survey_qs.filter(
            proposed_risk__in=['HIGH', 'CRITICAL'], status=VectorSurvey.Status.APPROVED
        ).count()
        vectors = {
            'reports': survey_qs.count(),
            'high_risk_sites': high_risk_sites,
            'active_campaigns': VectorControlOperation.objects.filter(
                entry_point_id__in=port_ids, status__in=[
                    VectorControlOperation.Status.APPROVED,
                    VectorControlOperation.Status.ASSIGNED,
                    VectorControlOperation.Status.IN_PROGRESS,
                    VectorControlOperation.Status.FOLLOW_UP,
                ],
            ).count() if port_ids else 0,
            'completed_sprays': VectorControlOperation.objects.filter(
                entry_point_id__in=port_ids,
                operation_type__in=[
                    VectorControlOperation.OperationType.INDOOR_SPRAY,
                    VectorControlOperation.OperationType.OUTDOOR_SPRAY,
                    VectorControlOperation.OperationType.FOGGING,
                ],
                status=VectorControlOperation.Status.COMPLETED,
            ).count() if port_ids else 0,
            'note': '',
        }

        # ---------- الترصد الوبائي ----------
        from apps.emergency_eoc.models import EmergencyAlert
        suspected_total = referrals_qs.filter(status=ClinicReferral.ReferralStatus.PENDING).count()
        confirmed_total = (
            LabResult.objects.filter(
                result=LabResult.Result.POSITIVE, sample__visit__referral__port_id__in=port_ids
            ).count() if port_ids else 0
        )
        risk_ratio = confirmed_total / max(1, screening_qs.count())
        if risk_ratio >= 0.3:
            risk_level = 'CRITICAL'
        elif risk_ratio >= 0.1:
            risk_level = 'MEDIUM'
        elif confirmed_total > 0:
            risk_level = 'LOW'
        else:
            risk_level = 'STABLE'
        active_alerts = (
            EmergencyAlert.objects.filter(status=EmergencyAlert.AlertStatus.NEW, port_id__in=port_ids).count()
            if port_ids else 0
        )
        surveillance = {
            'suspected': suspected_total, 'confirmed': confirmed_total,
            'active_alerts': active_alerts, 'risk_level': risk_level,
        }

        # ---------- التنبيهات ----------
        from apps.notifications.models import NotificationLog
        alerts = [
            {
                'id': str(n.id),
                'severity': 'info',
                'title': n.subject or 'إشعار',
                'body': (n.body or '')[:140],
                'time': n.created_at.isoformat(),
                'recipient': n.recipient,
            }
            for n in NotificationLog.objects.order_by('-created_at')[:8]
        ]
        if suspected_total > 0:
            alerts.insert(0, {
                'id': 'sus-1', 'severity': 'critical' if suspected_total > 3 else 'medium',
                'title': 'حالات صحية تحتاج متابعة',
                'body': f'{suspected_total} حالة مشتبهة في قطاع {sector.name_ar}',
                'time': today.isoformat(),
            })
        if rejected > 0:
            alerts.insert(0, {
                'id': 'rej-1', 'severity': 'critical',
                'title': 'شحنات غذائية مرفوضة',
                'body': f'{rejected} شحنة مرفوضة/محجوزة خلال الفترة',
                'time': today.isoformat(),
            })
        alerts = alerts[:12]

        # ---------- الموظفون ----------
        staff = [
            {
                'id': str(os.id), 'name': os.user.full_name,
                'sector': os.sector.name_ar if os.sector else '',
                'department': os.department.name_ar if os.department else '',
                'station': os.station.name_ar if os.station else '',
            }
            for os in OrgAssignment.objects.filter(sector_id=sector.id, is_active=True)
            .select_related('sector', 'department', 'station').order_by('-is_primary')[:30]
        ]

        # ---------- أداء الإدارات ----------
        departments = []
        dept_scale = max(1, screening_qs.count())
        for dept in Department.objects.filter(sector_id=sector.id, is_active=True).order_by('order'):
            dept_staff = OrgAssignment.objects.filter(
                sector_id=sector.id, department_id=dept.id, is_active=True
            ).values('user_id').distinct().count()
            score = min(100, 50 + dept_staff * 10)
            departments.append({'id': str(dept.id), 'name': dept.name_ar, 'staff': dept_staff, 'score': score})

        # ---------- مؤشرات الأداء (تقديرية) ----------
        performance = [
            {'key': 'imports', 'label': 'طلبات الوارد', 'value': imports},
            {'key': 'exports', 'label': 'طلبات الصادر', 'value': exports},
            {'key': 'screenings', 'label': 'الفحوصات', 'value': screening_qs.count()},
            {'key': 'samples', 'label': 'العينات', 'value': food_samples},
            {'key': 'certificates', 'label': 'الشهادات', 'value': released},
            {'key': 'lab_turnover', 'label': 'زمن المختبر (يوم)', 'value': lab['avg_turnover_days']},
        ]

        ov = {
            'sector': {
                'id': str(sector.id), 'name_ar': sector.name_ar, 'name_en': sector.name_en,
                'code': sector.code, 'region': sector.region,
            },
            'window': {'key': window, 'start': start.isoformat() if start else None, 'today': today.isoformat()},
            'kpis': {
                'stations': station_count,
                'staff': staff_count,
                'ports': len(port_rows),
                'imports': imports,
                'exports': exports,
                'shipments': shipment_qs.count(),
                'samples': food_samples,
                'passengers': passenger_count,
                'certificates': released,
                'revenue': revenue_total,
                'suspected': suspected_total,
                'confirmed': confirmed_total,
                'alerts': len(alerts),
            },
            'stations': port_rows,
            'food': {
                'imports': imports, 'exports': exports,
                'released': released, 'rejected': rejected, 'in_progress': in_progress,
                'samples': food_samples, 'noncomplying': noncomplying_food,
                'top_products': top_products,
                'decisions': list(
                    shipment_qs.exclude(final_decision='')
                    .values('final_decision').annotate(total=Count('id')).order_by('-total')
                ),
            },
            'lab': lab,
            'airports': airports,
            'seaports': seaports,
            'land_borders': land_borders,
            'vectors': vectors,
            'surveillance': surveillance,
            'revenue': {'total': revenue_total, 'shares': revenue_shares},
            'alerts': alerts,
            'departments': departments,
            'staff': staff,
            'performance': performance,
        }
        return Response(success_response(ov))

    @action(detail=False, methods=['get'], url_path='epidemic-dashboard')
    def epidemic_dashboard(self, request):
        """لوحة مكافحة الأوبئة والاستجابة (ECRS) — يرتكز على أحداث/إنذارات الطوارئ والفحص والمختبر."""
        from django.db.models.functions import TruncDate

        from apps.emergency_eoc.models import CrisisTeamMember, EmergencyAlert, EmergencyEvent, ResponsePlan
        from apps.clinic.models import ClinicReferral
        from apps.laboratory.models import LabResult, LabSample

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

        event_qs = windowed(
            EmergencyEvent.objects.select_related('location_port', 'response_plan'),
            field='reported_at',
        )
        alert_qs = windowed(EmergencyAlert.objects.select_related('port'), field='triggered_at')
        lab_sample_qs = windowed(LabSample.objects.all(), field='collected_at')
        lab_result_qs = windowed(LabResult.objects.select_related('sample', 'disease'), field='result_date')
        referral_qs = windowed(ClinicReferral.objects.all(), field='created_at')

        # ---------- KPI ----------
        open_events = event_qs.exclude(
            status__in=[EmergencyEvent.EventStatus.CLOSED, EmergencyEvent.EventStatus.REJECTED]
        )
        active_events = open_events.exclude(status=EmergencyEvent.EventStatus.CONTROLLED).count()
        under_monitoring = open_events.filter(
            status__in=[EmergencyEvent.EventStatus.IDENTIFIED, EmergencyEvent.EventStatus.VERIFIED]
        ).count()
        active_alerts = alert_qs.filter(status=EmergencyAlert.AlertStatus.NEW).count()

        positive_results = lab_result_qs.filter(result=LabResult.Result.POSITIVE).count()
        negative_results = lab_result_qs.filter(result=LabResult.Result.NEGATIVE).count()
        lab_counts = {
            'samples': lab_sample_qs.count(),
            'registered': lab_sample_qs.filter(status=LabSample.SampleStatus.REGISTERED).count(),
            'processing': lab_sample_qs.filter(status=LabSample.SampleStatus.PROCESSING).count(),
            'completed': lab_sample_qs.filter(status=LabSample.SampleStatus.COMPLETED).count(),
            'pending': lab_sample_qs.filter(
                status__in=[LabSample.SampleStatus.REGISTERED, LabSample.SampleStatus.PROCESSING]
            ).count(),
            'positive': positive_results,
            'negative': negative_results,
            'inconclusive': lab_result_qs.filter(result=LabResult.Result.INCONCLUSIVE).count(),
        }

        suspected_cases = referral_qs.filter(
            status=ClinicReferral.ReferralStatus.PENDING
        ).count()
        confirmed_cases = positive_results

        status_totals = {
            (s['status'] or 'UNKNOWN'): s['total']
            for s in event_qs.values('status').annotate(total=Count('id'))
        }
        severity_totals = dict(
            event_qs.values_list('severity').annotate(total=Count('id'))
        )

        # ---------- الأحداث (جدول) ----------
        events = []
        for e in event_qs.order_by('-reported_at')[:12]:
            events.append({
                'id': str(e.id),
                'number': e.event_number or f'EVT-{str(e.id)[:8]}',
                'title': e.title,
                'severity': e.severity,
                'status': e.status,
                'location': e.location_port.name_ar if e.location_port else '',
                'source': e.source_type,
                'reported_at': e.reported_at.isoformat(),
                'team_count': e.team_members.count(),
                'affected_count': e.affected_travelers.count(),
            })

        team_total_count = CrisisTeamMember.objects.filter(
            event_id__in=list(event_qs.values_list('id', flat=True))
        ).count()

        # ---------- فرق الاستجابة ----------
        teams = []
        for team in CrisisTeamMember.objects.select_related('event', 'user').order_by('-created_at')[:12]:
            event = team.event
            teams.append({
                'id': str(team.id),
                'team_name': event.event_number if event else 'غير محدد',
                'member': team.user.full_name,
                'role': team.role,
                'event_number': event.event_number if event else '',
                'event_title': event.title if event else '',
                'event_status': event.status if event else '',
            })

        # ---------- التنبيهات الوبائية ----------
        alerts = [
            {
                'id': str(a.id),
                'type': a.alert_type,
                'status': a.status,
                'description': a.description,
                'port': a.port.name_ar if a.port else '',
                'triggered_at': a.triggered_at.isoformat(),
            }
            for a in alert_qs.order_by('-triggered_at')[:10]
        ]

        # ---------- منحنى الحالات المؤكدة ----------
        curve_rows = list(
            lab_result_qs.filter(result=LabResult.Result.POSITIVE)
            .annotate(day=TruncDate('result_date'))
            .values('day')
            .annotate(total=Count('id'))
            .order_by('day')[:30]
        )
        case_curve = [{'date': str(c['day']), 'count': c['total']} for c in curve_rows]

        # ---------- التحقيقات ----------
        investigations = {
            'identified': status_totals.get('IDENTIFIED', 0),
            'verified': status_totals.get('VERIFIED', 0),
            'responding': status_totals.get('RESPONDING', 0),
            'controlled': status_totals.get('CONTROLLED', 0),
            'closed': status_totals.get('CLOSED', 0),
            'open': status_totals.get('IDENTIFIED', 0) + status_totals.get('VERIFIED', 0),
        }

        # ---------- المتأثرون / المناطق ----------
        affected_ports = set()
        affected_ports.update(alert_qs.exclude(port=None).values_list('port_id', flat=True))
        affected_ports.update(
            event_qs.exclude(location_port=None).values_list('location_port_id', flat=True)
        )

        # ---------- مستوى الاستجابة ----------
        severity_rank = {'LOW': 1, 'MODERATE': 2, 'HIGH': 3, 'CRITICAL': 4}
        response_level = 'LEVEL_0'
        highest = 0
        for sev, total in severity_totals.items():
            if total and severity_rank.get(sev, 0) > highest:
                highest = severity_rank.get(sev, 0)
        if max(active_events, active_alerts) >= 3 and highest >= 4:
            response_level = 'LEVEL_3'
        elif highest >= 3 or (active_events + active_alerts) >= 2:
            response_level = 'LEVEL_2'
        elif highest >= 2 or active_alerts:
            response_level = 'LEVEL_1'

        # ---------- خطة الاستجابة النشطة ----------
        response_plan = ResponsePlan.objects.filter(is_active=True).first()

        return Response(success_response({
            'window': {'key': window, 'start': start.isoformat() if start else None, 'today': today.isoformat()},
            'kpis': {
                'active_events': active_events,
                'alerts': active_alerts,
                'under_monitoring': under_monitoring,
                'suspected': suspected_cases,
                'confirmed': confirmed_cases,
                'samples': lab_counts['samples'],
                'positive': lab_counts['positive'],
                'teams': team_total_count,
                'affected_locations': len(affected_ports),
            },
            'events': events,
            'teams': teams,
            'alerts': alerts,
            'lab': lab_counts,
            'case_curve': case_curve,
            'response_level': response_level,
            'investigations': investigations,
            'severity_totals': severity_totals,
            'status_totals': status_totals,
            'response_plan': {
                'name': response_plan.name if response_plan else '',
                'description': response_plan.description if response_plan else '',
                'active': bool(response_plan),
            },
        }))
