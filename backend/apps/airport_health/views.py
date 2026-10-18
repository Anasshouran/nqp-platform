import logging
import os

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from django.db.models import Count
from django.utils import timezone
from datetime import date

from core.filters import ExactFilterBackend
from core.permissions import AdminOrPermissionAction
from core.utils.response import success_response
from core.utils.scoping import SectorScopedMixin, resolve_user_port_ids
from apps.carriers.models import Flight
from apps.clinic.models import ClinicReferral
from apps.notifications.models import NotificationLog
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Traveler

from .models import (
    AirportActivityAction,
    AirportActivityLog,
    AircraftInspection,
    AirportScreening,
    AirportStaff,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)
from .serializers import (
    AircraftInspectionSerializer,
    AirportActivityLogSerializer,
    AirportDashboardSerializer,
    AirportScreeningSerializer,
    AirportStaffSerializer,
    AirportTerminalSerializer,
    CrewHealthRecordSerializer,
    PortSerializer,
    PortWriteSerializer,
    ScreeningPointSerializer,
)


def _port_of_reference(obj):
    """منفذ الدخول المرجعي لسجل قيد الإنشاء: منفذ/صالة/نقطة فحص/رحلة."""
    if isinstance(obj, Port):
        return obj
    if isinstance(obj, AirportTerminal):
        return obj.port
    if isinstance(obj, ScreeningPoint):
        return obj.terminal.port
    if isinstance(obj, Flight):
        return obj.destination_port
    return None


class AirportHealthRBACMixin(SectorScopedMixin):
    """يغلق بيانات صحة المطارات خلف صلاحيات دقيقة ونطاق منافذ المستخدم.

    كانت كل الـ viewset هنا ترث `IsAuthenticated` من `DEFAULT_PERMISSION_CLASSES`،
    فقرأ أي حساب مصادق — بما فيه ممثل شركة نقل (`CARRIER`) — بيانات فحص المسافرين
    وسجلات صحة الطاقم (درجة الحرارة، تشبع الأكسجين، الأعراض، أرقام جوازات
    السفر) لكل المطارات على مستوى الدولة.

    السلوك الجديد:

    - `is_staff`/`is_superuser` يمران كما كان، توافقاً مع بقية الموديولات.
    - غير الموظفين يتطلّبون صلاحية `airport_health:<action>` عبر
      `AdminOrPermissionAction`، وهي فاشلة آمنة: أي إجراء غير معروف يُرفض.
    - القوائم والأكائن تُقصَر على منافذ نطاق المستخدم عبر `SectorScopedMixin`:
      نطاق عام ⇒ بلا تقييد، ولا نطاق قابل للحل ⇒ لا صفوف.
    - الإنشاء يفرض المنفذ المرجعي داخل النطاق، فلا يُحقن سجل في منفذ آخر.
    - لا يوجد إجراء `delete` في الدورين `AIRPORT_DIRECTOR` و`AIRPORT_INSPECTOR`،
      فالحذف يبقى مقصوراً على الهيئة الإدارية.
    """

    permission_resource = 'airport_health'
    permission_classes = [AdminOrPermissionAction]
    #: حقل مرجعي يحدد منفذ السجل (يُتحقق من نطاقه قبل الحفظ).
    port_reference_field = None

    def perform_create(self, serializer):
        self._assert_reference_port_in_scope(serializer.validated_data)
        serializer.save()

    def _assert_reference_port_in_scope(self, data):
        if not self.port_reference_field:
            return
        user = self.request.user
        if not user or not user.is_authenticated or user.is_superuser:
            return
        allowed = resolve_user_port_ids(user)
        if allowed is None:
            return
        reference = data.get(self.port_reference_field)
        if reference is None:
            return
        port = _port_of_reference(reference)
        if port is None:
            raise PermissionDenied('تعذّر تحديد منفذ السجل — تُرفض العملية')
        if str(port.pk) not in {str(pid) for pid in allowed}:
            raise PermissionDenied('السجل خارج نطاق منافذك — تُرفض العملية')


def _log_airport_activity(
    request,
    action: str,
    description: str,
    target_type: str,
    target_id,
    target_label: str = '',
    airport=None,
    metadata: dict | None = None,
) -> None:
    """أفضل جهد — never raises so it never breaks the mutation path."""
    logger = logging.getLogger(__name__)
    try:
        user = getattr(request, 'user', None)
        actor_name = ''
        if user and getattr(user, 'is_authenticated', False):
            actor_name = getattr(user, 'full_name', '') or getattr(user, 'email', '') or ''
        ip = None
        if request and hasattr(request, 'META'):
            xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
            ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
        AirportActivityLog.objects.create(
            actor=user if (user and user.is_authenticated) else None,
            actor_name=actor_name[:200],
            action=action,
            description=description[:255],
            target_type=target_type,
            target_id=str(target_id),
            target_label=(target_label or '')[:255],
            airport=airport,
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception:
        logger.exception('airport activity log emit failed')


class PortViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = Port.objects.select_related('state').all()
    serializer_class = PortSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en']
    filter_fields = ['kind', 'state', 'is_active']
    ordering_fields = ['code', 'name_ar']
    port_field = 'id'
    action_permission_map = {'stats': 'view', 'toggle_status': 'edit'}

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


class TerminalViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = AirportTerminal.objects.select_related('port').all()
    serializer_class = AirportTerminalSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'terminal_code']
    filter_fields = ['port', 'is_active']
    ordering_fields = ['terminal_code']
    port_reference_field = 'port'


class ScreeningPointViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = ScreeningPoint.objects.select_related('terminal', 'terminal__port').all()
    serializer_class = ScreeningPointSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['point_code']
    filter_fields = ['terminal', 'point_type', 'is_active']
    ordering_fields = ['point_code']
    port_field = 'terminal__port'
    port_reference_field = 'terminal'


class AirportScreeningViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = AirportScreening.objects.select_related('traveler', 'screening_point', 'screening_point__terminal', 'screened_by').all()
    serializer_class = AirportScreeningSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    filter_fields = ['status', 'risk_level', 'screening_type', 'screening_point']
    ordering_fields = ['screened_at']
    port_field = 'screening_point__terminal__port'
    port_reference_field = 'screening_point'
    http_method_names = ['get', 'post']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        screening = serializer.instance
        level = self._compute_risk(screening)
        screening.risk_level = level
        screening.save(update_fields=['risk_level'])
        data = {
            'screening_id': str(screening.id),
            'risk_level': level,
            'risk_assessment': {'level': level, 'score': self._score(screening)},
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        screening = serializer.instance
        traveler_name = getattr(screening.traveler, 'full_name', '') or ''
        airport = (
            screening.screening_point.terminal.port
            if screening.screening_point and screening.screening_point.terminal
            else None
        )
        _log_airport_activity(
            self.request,
            AirportActivityAction.SCREENING_CREATED,
            f'فحص مسافر جديد — {traveler_name}',
            target_type='AirportScreening',
            target_id=screening.id,
            target_label=traveler_name,
            airport=airport,
        )

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


class AircraftInspectionViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = AircraftInspection.objects.select_related('flight', 'inspector').all()
    serializer_class = AircraftInspectionSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['aircraft_registration', 'flight__flight_number']
    filter_fields = ['overall_status', 'certificate_issued']
    ordering_fields = ['inspection_date']
    http_method_names = ['get', 'post']
    port_field = 'flight__destination_port'
    port_reference_field = 'flight'

    def perform_create(self, serializer):
        super().perform_create(serializer)
        inspection = serializer.instance
        airport = inspection.flight.destination_port if inspection.flight else None
        _log_airport_activity(
            self.request,
            AirportActivityAction.INSPECTION_CREATED,
            f'تفتيش طائرة — {inspection.aircraft_registration}',
            target_type='AircraftInspection',
            target_id=inspection.id,
            target_label=inspection.aircraft_registration,
            airport=airport,
        )


class CrewHealthRecordViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = CrewHealthRecord.objects.select_related('crew', 'flight').all()
    serializer_class = CrewHealthRecordSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['crew__full_name', 'crew__email', 'flight__flight_number']
    filter_fields = ['health_status', 'flight']
    ordering_fields = ['created_at']
    port_field = 'flight__destination_port'
    port_reference_field = 'flight'

    def perform_create(self, serializer):
        super().perform_create(serializer)
        record = serializer.instance
        crew_name = getattr(record.crew, 'full_name', '') if record.crew else ''
        airport = record.flight.destination_port if record.flight else None
        _log_airport_activity(
            self.request,
            AirportActivityAction.CREW_RECORD_CREATED,
            f'سجل طاقم — {crew_name}',
            target_type='CrewHealthRecord',
            target_id=record.id,
            target_label=crew_name,
            airport=airport,
        )


class AirportStaffViewSet(AirportHealthRBACMixin, viewsets.ModelViewSet):
    queryset = AirportStaff.objects.select_related('airport', 'user').all()
    serializer_class = AirportStaffSerializer
    permission_resource = 'airport_staff'
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'email', 'phone', 'role']
    filter_fields = ['airport', 'user', 'role', 'is_active']
    ordering_fields = ['full_name', 'role', 'created_at']
    port_field = 'airport'
    port_reference_field = 'airport'
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        staff = serializer.instance
        _log_airport_activity(
            self.request,
            AirportActivityAction.STAFF_CREATED,
            f'إضافة موظف — {staff.full_name} ({staff.get_role_display()})',
            target_type='AirportStaff',
            target_id=staff.id,
            target_label=staff.full_name,
            airport=staff.airport,
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        staff = serializer.instance
        _log_airport_activity(
            self.request,
            AirportActivityAction.STAFF_UPDATED,
            f'تعديل موظف — {staff.full_name}',
            target_type='AirportStaff',
            target_id=staff.id,
            target_label=staff.full_name,
            airport=staff.airport,
        )

    def perform_destroy(self, instance):
        # Log before delete so we still have id/name
        _log_airport_activity(
            self.request,
            AirportActivityAction.STAFF_DELETED,
            f'حذف موظف — {instance.full_name}',
            target_type='AirportStaff',
            target_id=instance.id,
            target_label=instance.full_name,
            airport=instance.airport,
        )
        super().perform_destroy(instance)


class AirportActivityLogViewSet(AirportHealthRBACMixin, viewsets.ReadOnlyModelViewSet):
    """سجل نشاط المطار — قراءة فقط، مقيد بنطاق منافذ المستخدم."""
    queryset = AirportActivityLog.objects.select_related('actor', 'airport').all()
    serializer_class = AirportActivityLogSerializer
    permission_resource = 'airport_health'
    http_method_names = ['get', 'head', 'options']
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['description', 'target_label', 'actor_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = AirportActivityLog.objects.select_related('actor', 'airport').all()
        user = self.request.user
        port_ids = None
        if user and user.is_authenticated and not user.is_superuser:
            port_ids = resolve_user_port_ids(user)
        if port_ids is not None:
            qs = qs.filter(airport_id__in=port_ids)
        return qs


class AirportDashboardViewSet(viewsets.ViewSet):
    """واجهة لوحة مفتش الحجر الصحي في المطار (تجميع عام لكل المنافذ الجوية)."""

    serializer_class = AirportDashboardSerializer
    permission_resource = 'airport_health'
    permission_classes = [AdminOrPermissionAction]

    AIRPORT = Port.Kind.AIRPORT

    def _flights(self):
        return Flight.objects.filter(destination_port__kind=self.AIRPORT)

    def _port_scope(self):
        """منافذ نطاق المستخدم: None لغير المقيدين (وطني)، [] عند غياب النطاق (فشل آمن)."""
        user = self.request.user
        if not user or not user.is_authenticated or user.is_superuser:
            return None
        return resolve_user_port_ids(user)

    def _scope_ports(self, queryset, port_ids, path):
        if port_ids is None:
            return queryset
        return queryset.filter(**{f'{path}__in': port_ids})

    def list(self, request):
        now = timezone.now()
        today = timezone.localdate()
        port_ids = self._port_scope()
        flights = self._scope_ports(self._flights(), port_ids, 'destination_port')
        screenings = self._scope_ports(
            AirportScreening.objects.all(), port_ids, 'screening_point__terminal__port'
        )
        referrals = self._scope_ports(ClinicReferral.objects.all(), port_ids, 'port')
        inspections = self._scope_ports(
            AircraftInspection.objects.all(), port_ids, 'flight__destination_port'
        )
        crew_records = self._scope_ports(
            CrewHealthRecord.objects.all(), port_ids, 'flight__destination_port'
        )
        staff = self._scope_ports(AirportStaff.objects.all(), port_ids, 'airport')

        flights_today = flights.filter(scheduled_arrival__date=today).count()
        passengers_today = Traveler.objects.filter(created_at__date=today).count()
        pending_screenings = screenings.filter(
            status=AirportScreening.ScreeningStatus.PENDING
        ).count()
        screened_today = screenings.filter(created_at__date=today).count()
        referrals_today = referrals.filter(created_at__date=today).count()
        red_today = screenings.filter(
            risk_level=AirportScreening.RiskLevel.RED, created_at__date=today
        ).count()
        suspected_today = red_today + referrals.filter(
            status=ClinicReferral.ReferralStatus.PENDING, created_at__date=today
        ).count()
        completed_today = screenings.filter(
            status='CLEARED', created_at__date=today
        ).count()
        inspections_today = inspections.filter(inspection_date__date=today).count()
        crew_records_today = crew_records.filter(created_at__date=today).count()
        arrivals_today = screenings.filter(
            screening_point__point_type=ScreeningPoint.PointType.ARRIVAL,
            created_at__date=today,
        ).count()
        departures_today = screenings.filter(
            screening_point__point_type=ScreeningPoint.PointType.DEPARTURE,
            created_at__date=today,
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
            'inspections_today': inspections_today,
            'crew_records_today': crew_records_today,
            'arrivals_today': arrivals_today,
            'departures_today': departures_today,
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
            screenings.filter(risk_level=AirportScreening.RiskLevel.RED, created_at__date=today)
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
            referrals.filter(status='PENDING')
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
        for s in screenings.filter(status='PENDING', risk_level='RED').select_related('traveler')[:6]:
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
            screenings.filter(created_at__date=today)
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

        recent_inspections = [
            {
                'id': str(i.id),
                'aircraft_registration': i.aircraft_registration,
                'flight_number': i.flight.flight_number,
                'overall_status': i.overall_status,
                'certificate_issued': i.certificate_issued,
                'inspection_date': i.inspection_date.isoformat(),
            }
            for i in inspections.select_related('flight').order_by('-inspection_date')[:20]
        ]
        recent_screenings = [
            {
                'id': str(s.id),
                'traveler_name': s.traveler.full_name,
                'risk_level': s.risk_level,
                'status': s.status,
                'screened_at': s.screened_at.isoformat(),
            }
            for s in screenings.select_related('traveler').order_by('-screened_at')[:20]
        ]

        return Response(
            success_response({
                'kpis': kpis,
                'upcoming_flights': upcoming_flights,
                'suspected': suspected,
                'tasks': tasks,
                'alerts': alerts,
                'report': report,
                'recent_inspections': recent_inspections,
                'recent_screenings': recent_screenings,
                'staff': [
                    {
                        'id': str(m.id),
                        'full_name': m.full_name,
                        'role': m.role,
                        'role_label': m.get_role_display(),
                        'email': m.email,
                        'phone': m.phone,
                        'shift': m.shift,
                        'is_active': m.is_active,
                    }
                    for m in staff.order_by('-is_active', 'role', 'full_name')[:20]
                ],
            })
        )


