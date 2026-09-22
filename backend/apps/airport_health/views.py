import os

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from django.db.models import Count
from django.utils import timezone
from datetime import date

from core.filters import ExactFilterBackend
from core.utils.response import success_response
from core.utils.scoping import SectorScopedMixin
from apps.carriers.models import Flight
from apps.clinic.models import ClinicReferral
from apps.notifications.models import NotificationLog
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Traveler

from .models import (
    AircraftInspection,
    AirportScreening,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)
from .serializers import (
    AircraftInspectionSerializer,
    AirportDashboardSerializer,
    AirportScreeningSerializer,
    AirportTerminalSerializer,
    CrewHealthRecordSerializer,
    PortSerializer,
    PortWriteSerializer,
    ScreeningPointSerializer,
)


class PortViewSet(viewsets.ModelViewSet):
    queryset = Port.objects.select_related('state').all()
    serializer_class = PortSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en']
    filter_fields = ['kind', 'state', 'is_active']
    ordering_fields = ['code', 'name_ar']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PortWriteSerializer
        return PortSerializer

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        port = self.get_object()
        from apps.screening.models import HealthScreening
        from apps.laboratory.models import LabResult

        today = request.query_params.get('date')
        screenings = HealthScreening.objects.filter(port=port)
        if today:
            screenings = screenings.filter(screened_at__date=today)
        data = {
            'port': port.code,
            'total_screenings': screenings.count(),
            'active_alerts': port.alerts.filter(status='NEW').count(),
            'pending_referrals': port.referrals.filter(status='PENDING').count(),
        }
        return Response(success_response(data))

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        port = self.get_object()
        port.is_active = not port.is_active
        port.save(update_fields=['is_active'])
        return Response(success_response(PortSerializer(port).data))


class TerminalViewSet(viewsets.ModelViewSet):
    queryset = AirportTerminal.objects.select_related('port').all()
    serializer_class = AirportTerminalSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'terminal_code']
    filter_fields = ['port', 'is_active']
    ordering_fields = ['terminal_code']


class ScreeningPointViewSet(viewsets.ModelViewSet):
    queryset = ScreeningPoint.objects.select_related('terminal', 'terminal__port').all()
    serializer_class = ScreeningPointSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['point_code']
    filter_fields = ['terminal', 'point_type', 'is_active']
    ordering_fields = ['point_code']


class AirportScreeningViewSet(viewsets.ModelViewSet):
    queryset = AirportScreening.objects.select_related('traveler', 'screening_point', 'screening_point__terminal', 'screened_by').all()
    serializer_class = AirportScreeningSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    filter_fields = ['status', 'risk_level', 'screening_type', 'screening_point']
    ordering_fields = ['screened_at']
    port_field = 'screening_point__terminal__port'
    http_method_names = ['get', 'post']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        screening = serializer.save()
        level = self._compute_risk(screening)
        screening.risk_level = level
        screening.save(update_fields=['risk_level'])
        data = {
            'screening_id': str(screening.id),
            'risk_level': level,
            'risk_assessment': {'level': level, 'score': self._score(screening)},
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    def _score(self, screening):
        score = 0.0
        if screening.body_temperature and screening.body_temperature > 37.5:
            score += (screening.body_temperature - 37.0) * 10
        if screening.oxygen_saturation and screening.oxygen_saturation < 95:
            score += (100 - screening.oxygen_saturation) * 2
        score += len(screening.symptoms or []) * 5
        return round(min(100.0, score), 2)

    # عتبات تقييم الخطورة (قابلة للضبط عبر متغيرات البيئة دون تعديل الكود)
    RISK_RED_SCORE = float(os.environ.get('AIRPORT_RISK_RED_SCORE', 30))
    RISK_YELLOW_SCORE = float(os.environ.get('AIRPORT_RISK_YELLOW_SCORE', 15))
    RISK_RED_TEMP = float(os.environ.get('AIRPORT_RISK_RED_TEMP', 39))
    RISK_RED_OXYGEN = float(os.environ.get('AIRPORT_RISK_RED_OXYGEN', 93))

    def _compute_risk(self, screening):
        score = self._score(screening)
        high_fever = bool(screening.body_temperature and screening.body_temperature > self.RISK_RED_TEMP)
        low_oxygen = bool(screening.oxygen_saturation and screening.oxygen_saturation < self.RISK_RED_OXYGEN)
        if high_fever or low_oxygen:
            return 'RED'
        if score >= self.RISK_RED_SCORE:
            return 'RED'
        if score >= self.RISK_YELLOW_SCORE:
            return 'YELLOW'
        return 'GREEN'


class AircraftInspectionViewSet(viewsets.ModelViewSet):
    queryset = AircraftInspection.objects.select_related('flight', 'inspector').all()
    serializer_class = AircraftInspectionSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['aircraft_registration', 'flight__flight_number']
    filter_fields = ['overall_status', 'certificate_issued']
    ordering_fields = ['inspection_date']
    http_method_names = ['get', 'post']


class CrewHealthRecordViewSet(viewsets.ModelViewSet):
    queryset = CrewHealthRecord.objects.select_related('crew', 'flight').all()
    serializer_class = CrewHealthRecordSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['crew__full_name', 'crew__email', 'flight__flight_number']
    filter_fields = ['health_status', 'flight']
    ordering_fields = ['created_at']


class AirportDashboardViewSet(viewsets.ViewSet):
    """واجهة لوحة مفتش الحجر الصحي في المطار (تجميع عام لكل المنافذ الجوية)."""
    serializer_class = AirportDashboardSerializer

    AIRPORT = Port.Kind.AIRPORT

    def _flights(self):
        return Flight.objects.filter(destination_port__kind=self.AIRPORT)

    def list(self, request):
        now = timezone.now()
        today = now.date()
        flights = self._flights()

        flights_today = flights.filter(scheduled_arrival__date=today).count()
        passengers_today = Traveler.objects.filter(created_at__date=today).count()
        pending_screenings = AirportScreening.objects.filter(
            status=AirportScreening.ScreeningStatus.PENDING
        ).count()
        screened_today = AirportScreening.objects.filter(created_at__date=today).count()
        referrals_today = ClinicReferral.objects.filter(created_at__date=today).count()
        red_today = AirportScreening.objects.filter(
            risk_level=AirportScreening.RiskLevel.RED, created_at__date=today
        ).count()
        suspected_today = red_today + ClinicReferral.objects.filter(
            status=ClinicReferral.ReferralStatus.PENDING, created_at__date=today
        ).count()
        completed_today = AirportScreening.objects.filter(
            status='CLEARED', created_at__date=today
        ).count()

        kpis = {
            'flights_today': flights_today,
            'passengers_today': passengers_today,
            'pending_screenings': pending_screenings,
            'screened_today': screened_today,
            'clinic_referrals': referrals_today,
            'suspected_cases': suspected_today,
            'vaccinations': 0,
            'completed_today': completed_today,
        }

        upcoming_flights = [
            {
                'id': str(f.id),
                'flight_number': f.flight_number,
                'origin_country': f.origin_country.name_ar or f.origin_country.name,
                'scheduled_arrival': f.scheduled_arrival.isoformat(),
                'status': f.status,
            }
            for f in flights.filter(scheduled_arrival__gte=now)
            .exclude(status=Flight.FlightStatus.CANCELLED)
            .select_related('origin_country')
            .order_by('scheduled_arrival')[:8]
        ]

        suspected = []
        red_screenings = (
            AirportScreening.objects.filter(risk_level=AirportScreening.RiskLevel.RED, created_at__date=today)
            .select_related('traveler', 'flight')
            .order_by('-created_at')[:8]
        )
        for s in red_screenings:
            suspected.append({
                'kind': 'RED',
                'traveler_name': s.traveler.full_name,
                'flight_number': s.flight.flight_number if s.flight else None,
                'detail': '، '.join(s.symptoms or []) or 'حالة شديدة الخطورة',
                'at': s.created_at.isoformat(),
            })
        pending_referrals = (
            ClinicReferral.objects.filter(status='PENDING')
            .select_related('traveler', 'port')
            .order_by('-created_at')[:8]
        )
        for r in pending_referrals:
            suspected.append({
                'kind': 'REFERRAL',
                'traveler_name': r.traveler.full_name,
                'flight_number': None,
                'detail': r.notes or f'إحالة إلى عيادة {r.port.name_ar}',
                'at': r.created_at.isoformat(),
            })

        tasks = []
        for f in flights.filter(scheduled_arrival__date=today, status__in=['ARRIVED', 'IN_TRANSIT'])[:8]:
            tasks.append({'kind': 'flight', 'title': f'فحص رحلة {f.flight_number}', 'priority': 'medium'})
        for s in AirportScreening.objects.filter(status='PENDING', risk_level='RED').select_related('traveler')[:6]:
            tasks.append({'kind': 'refer', 'title': f'مراجعة حالة {s.traveler.full_name}', 'priority': 'high'})
        for f in flights.filter(status='IN_TRANSIT')[:4]:
            tasks.append({'kind': 'declare', 'title': f'مراجعة الإقرار الصحي لرحلة {f.flight_number}', 'priority': 'low'})

        alerts = [
            {
                'id': str(n.id),
                'subject': n.subject or 'تنبيه',
                'body': n.body,
                'created_at': n.created_at.isoformat(),
                'status': n.status,
            }
            for n in NotificationLog.objects.order_by('-created_at')[:6]
        ]

        by_flight = list(
            AirportScreening.objects.filter(created_at__date=today)
            .values('flight__flight_number')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        report = {
            'flights': flights_today,
            'travelers': passengers_today,
            'screened': screened_today,
            'referrals': referrals_today,
            'suspected': red_today,
            'screenings_by_flight': [
                {'flight_number': r['flight__flight_number'] or '—', 'count': r['count']} for r in by_flight
            ],
        }

        return Response(
            success_response({
                'kpis': kpis,
                'upcoming_flights': upcoming_flights,
                'suspected': suspected,
                'tasks': tasks,
                'alerts': alerts,
                'report': report,
            })
        )


