import csv
import io

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, Throttled, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import (
    Carrier,
    CarrierRegistrationRequest,
    CarrierRegistrationStatus,
    CarrierApiUsageLog,
    CarrierMember,
    Flight,
    FlightHealthEvent,
    HealthNotice,
    ManifestPassenger,
    NoticeAcknowledgement,
    PassengerManifest,
)
from .permissions import HasApiKey, IsCarrierRep
from .serializers import (
    CarrierApiUsageLogSerializer,
    CarrierComplianceSerializer,
    CarrierDashboardSerializer,
    CarrierKpiSerializer,
    CarrierProfileSerializer,
    CarrierRegistrationRequestSerializer,
    CarrierSerializer,
    CarrierUpcomingSerializer,
    FlightHealthEventSerializer,
    FlightSerializer,
    HealthNoticeSerializer,
    ManifestPassengerSerializer,
    PassengerManifestSerializer,
    build_manifest_report,
    export_errors_csv,
)


def get_portal_carrier(user):
    """شركة النقل التي ينتمي إليها المستخدم (ممثل بوابة الناقل)."""
    if not user or not user.is_authenticated or user.is_staff:
        return None
    member = CarrierMember.objects.filter(user=user, is_active=True).select_related('carrier').first()
    return member.carrier if member else None


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.select_related('carrier', 'origin_country', 'destination_port').all()
    serializer_class = FlightSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['flight_number', 'carrier__name', 'origin_code']
    ordering_fields = ['scheduled_arrival', 'scheduled_departure', 'created_at']
    filter_fields = ['status', 'flight_type', 'destination_port']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        from_date = self.request.query_params.get('from')
        to_date = self.request.query_params.get('to')
        if from_date:
            qs = qs.filter(scheduled_arrival__date__gte=from_date)
        if to_date:
            qs = qs.filter(scheduled_arrival__date__lte=to_date)
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            qs = qs.filter(carrier=carrier)
        return qs

    def _guard_company(self, serializer=None):
        """ممثل البوابة يدير رحلات شركته فقط."""
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            instance_carrier = None
            if serializer is not None and serializer.instance:
                instance_carrier = serializer.instance.carrier
            elif self.request.method in ('PUT', 'PATCH'):
                instance_carrier = self.get_object().carrier
            if instance_carrier and instance_carrier.id != carrier.id:
                raise PermissionDenied('لا يمكن تعديل رحلات شركة أخرى')

    def perform_create(self, serializer):
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            serializer.save(carrier=carrier)
        else:
            serializer.save()

    def perform_update(self, serializer):
        self._guard_company(serializer)
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            serializer.save(carrier=carrier)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        if instance.status in (Flight.FlightStatus.ARRIVED, Flight.FlightStatus.CANCELLED):
            raise ValidationError('لا يمكن حذف رحلة وصلت أو أُلغيت')
        if instance.manifests.filter(status=PassengerManifest.ManifestStatus.COMPLETED).exists():
            raise ValidationError('لا يمكن حذف رحلة ارتبطت بكشف مسافرين تمت معالجته')
        instance.delete()

    @action(detail=False, methods=['get'], url_path='upcoming')
    def upcoming(self, request):
        qs = self.get_queryset().filter(status__in=['SCHEDULED', 'MANIFEST_UPLOADED', 'IN_TRANSIT'])
        return Response(success_response(FlightSerializer(qs, many=True).data))

    @action(detail=True, methods=['patch'], url_path='status')
    def set_status(self, request, pk=None):
        flight = self.get_object()
        new_status = request.data.get('status')
        if new_status not in Flight.FlightStatus.values:
            return Response({'status': 'error', 'message': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        flight.status = new_status
        flight.save(update_fields=['status'])
        return Response(success_response(FlightSerializer(flight).data))

    @action(detail=True, methods=['post'], url_path='manifest/upload', serializer_class=PassengerManifestSerializer)
    def upload_manifest(self, request, pk=None):
        flight = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        manifest = serializer.save(flight=flight)
        self._process_manifest(manifest)
        flight.status = Flight.FlightStatus.MANIFEST_UPLOADED
        flight.save(update_fields=['status'])
        return Response(
            success_response(PassengerManifestSerializer(manifest).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='manifest/status')
    def manifest_status(self, request, pk=None):
        flight = self.get_object()
        manifest = flight.manifests.order_by('-created_at').first()
        if not manifest:
            return Response({'status': 'error', 'message': 'لا يوجد كشف'}, status=status.HTTP_404_NOT_FOUND)
        return Response(success_response({
            'manifest_id': str(manifest.id),
            'status': manifest.status,
            'total_passengers': manifest.total_passengers,
            'error_report': manifest.error_report,
            'processed_at': manifest.processed_at,
        }))

    @action(detail=True, methods=['get'], url_path='manifest/passengers')
    def manifest_passengers(self, request, pk=None):
        flight = self.get_object()
        manifest = flight.manifests.order_by('-created_at').first()
        if not manifest:
            return Response({'status': 'error', 'message': 'لا يوجد كشف'}, status=status.HTTP_404_NOT_FOUND)
        passengers = manifest.passengers.select_related('nationality', 'traveler').all()
        return Response(success_response(ManifestPassengerSerializer(passengers, many=True).data))

    @action(detail=True, methods=['get'], url_path='manifest/report')
    def manifest_report(self, request, pk=None):
        flight = self.get_object()
        manifest = flight.manifests.order_by('-created_at').first()
        if not manifest:
            return Response({'status': 'error', 'message': 'لا يوجد كشف'}, status=status.HTTP_404_NOT_FOUND)
        return Response(success_response(build_manifest_report(manifest)))

    @action(detail=True, methods=['get'], url_path='manifest/errors')
    def manifest_errors(self, request, pk=None):
        flight = self.get_object()
        manifest = flight.manifests.order_by('-created_at').first()
        if not manifest:
            return Response({'status': 'error', 'message': 'لا يوجد كشف'}, status=status.HTTP_404_NOT_FOUND)
        content = export_errors_csv(manifest)
        response = HttpResponse(content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="manifest-errors-{manifest.id}.csv"'
        return response

    @action(detail=True, methods=['post'], url_path='manifest/reprocess')
    def manifest_reprocess(self, request, pk=None):
        flight = self.get_object()
        manifest = flight.manifests.order_by('-created_at').first()
        if not manifest or not manifest.file:
            return Response({'status': 'error', 'message': 'لا يوجد ملف كشف لإعادة معالجته'}, status=status.HTTP_400_BAD_REQUEST)
        self._process_manifest(manifest)
        return Response(success_response(PassengerManifestSerializer(manifest).data))

    def _process_manifest(self, manifest):
        from apps.travelers.models import Country, Traveler

        manifest.status = PassengerManifest.ManifestStatus.PROCESSING
        manifest.save(update_fields=['status'])
        errors = []
        count = 0
        try:
            decoded = manifest.file.read().decode('utf-8-sig')
            rows = csv.DictReader(io.StringIO(decoded))
            for row in rows:
                count += 1
                passport = (row.get('passport_number') or '').strip()
                dob = row.get('date_of_birth') or ''
                try:
                    country = Country.objects.get(code=(row.get('nationality_code') or '').strip().upper())
                except Country.DoesNotExist:
                    errors.append({'row': count, 'error': 'nationality_code غير موجود'})
                    continue
                traveler = Traveler.objects.filter(passport_number=passport).first()
                manifest.passengers.get_or_create(
                    manifest=manifest,
                    passport_number=passport,
                    defaults={
                        'first_name': row.get('first_name', ''),
                        'last_name': row.get('last_name', ''),
                        'date_of_birth': dob or None,
                        'nationality': country,
                        'seat_number': row.get('seat_number', ''),
                        'email': row.get('email', ''),
                        'phone': row.get('phone', ''),
                        'traveler': traveler,
                    },
                )
            manifest.total_passengers = count
            manifest.error_report = {'errors': errors[:100]}
            manifest.status = PassengerManifest.ManifestStatus.COMPLETED
        except Exception as exc:
            manifest.status = PassengerManifest.ManifestStatus.FAILED
            manifest.error_report = {'errors': [{'error': str(exc)}]}
        manifest.processed_at = timezone.now()
        manifest.save()


class CarrierViewSet(viewsets.ModelViewSet):
    queryset = Carrier.objects.select_related('country').prefetch_related('ports').all()
    serializer_class = CarrierSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'name_en', 'iata_code', 'icao_code']
    ordering_fields = ['name', 'created_at']
    filter_fields = ['is_active', 'registration_status', 'company_type']

    @action(detail=True, methods=['get'], url_path='api-key')
    def api_key_info(self, request, pk=None):
        carrier = self.get_object()
        return Response(success_response({
            'api_key': carrier.api_key_display or None,
            'created_at': carrier.api_key_created_at,
            'last_use_at': carrier.last_api_use_at,
            'last_use_ip': carrier.last_api_use_ip,
            'scopes': carrier.api_scopes,
        }))

    @action(detail=True, methods=['post'], url_path='regenerate-api-key')
    def regenerate_api_key(self, request, pk=None):
        carrier = self.get_object()
        new_key = carrier.generate_api_key()
        carrier.save(update_fields=['api_key', 'api_key_display', 'api_key_created_at', 'updated_at'])
        return Response(success_response({
            'api_key': new_key,
            'created_at': carrier.api_key_created_at,
            'last_use_at': carrier.last_api_use_at,
        }))


class HealthNoticeViewSet(viewsets.ModelViewSet):
    queryset = HealthNotice.objects.all()
    serializer_class = HealthNoticeSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'description']
    ordering_fields = ['published_at', 'priority']
    filter_fields = ['category', 'priority', 'is_active']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'archived', 'recent'):
            return [AllowAny()]
        if self.action == 'acknowledge':
            return [IsCarrierRep()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        is_staff = bool(user and user.is_authenticated and user.is_staff)
        if not is_staff:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'], url_path='archived')
    def archived(self, request):
        qs = HealthNotice.objects.filter(is_active=True, expiry_date__lt=timezone.now().date())
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            qs = qs.filter(is_active=True)
        return Response(success_response(HealthNoticeSerializer(qs, many=True).data))

    @action(detail=False, methods=['get'], url_path='recent')
    def recent(self, request):
        qs = HealthNotice.objects.filter(is_active=True).exclude(
            expiry_date__lt=timezone.now().date(),
        ).order_by('-published_at')[:5]
        return Response(success_response(HealthNoticeSerializer(qs, many=True, context={'request': request}).data))

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        notice = self.get_object()
        carrier = get_portal_carrier(request.user)
        if not carrier:
            raise PermissionDenied('لا يمكن تأكيد الاطلاع إلا لممثل شركة نقل')
        NoticeAcknowledgement.objects.get_or_create(carrier=carrier, notice=notice)
        return Response(success_response({
            'notice_id': str(notice.id),
            'acknowledged': True,
        }))


class CarrierCompanyViewSet(viewsets.GenericViewSet):
    """ملف الشركة ومفتاح API لممثل الناقل."""

    permission_classes = [IsCarrierRep]
    serializer_class = CarrierProfileSerializer

    def _carrier(self, request):
        carrier = get_portal_carrier(request.user)
        if not carrier:
            raise PermissionDenied('المستخدم ليس عضواً في شركة نقل')
        return carrier

    @action(detail=False, methods=['get', 'put'], url_path='profile')
    def profile(self, request):
        carrier = self._carrier(request)
        protected = {'id', 'name', 'iata_code', 'icao_code', 'is_active'}
        bad_fields = protected.intersection(request.data.keys())
        if bad_fields:
            return Response(
                {'status': 'error', 'message': 'الحقول الرئيسية غير قابلة للتعديل من البوابة', 'fields': sorted(bad_fields)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.method == 'GET':
            return Response(success_response(CarrierProfileSerializer(carrier).data))
        serializer = CarrierProfileSerializer(carrier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(CarrierProfileSerializer(carrier).data))

    @action(detail=False, methods=['post'], url_path='logo')
    def logo(self, request):
        carrier = self._carrier(request)
        logo_url = request.data.get('logo_url')
        if not logo_url:
            return Response({'status': 'error', 'message': 'logo_url مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        carrier.logo_url = logo_url
        carrier.save(update_fields=['logo_url', 'updated_at'])
        return Response(success_response({'logo_url': carrier.logo_url}))

    @action(detail=False, methods=['get'], url_path='api-key')
    def api_key(self, request):
        carrier = self._carrier(request)
        return Response(success_response({
            'api_key': carrier.api_key_display or None,
            'created_at': carrier.api_key_created_at,
            'last_use_at': carrier.last_api_use_at,
            'last_use_ip': carrier.last_api_use_ip,
        }))

    @action(detail=False, methods=['post'], url_path='api-key/regenerate')
    def regenerate_api_key(self, request):
        carrier = self._carrier(request)
        new_key = carrier.generate_api_key()
        carrier.save(update_fields=['api_key', 'api_key_display', 'api_key_created_at', 'updated_at'])
        return Response(success_response({'api_key': new_key, 'created_at': carrier.api_key_created_at}))


class CarrierDashboardViewSet(viewsets.ViewSet):
    """حالة العمليات لممثل شركة النقل: رحلات اليوم، المسافرون المتوقعون، الإشعارات، نسبة التسجيل المسبق."""

    permission_classes = [IsCarrierRep]
    serializer_class = CarrierDashboardSerializer

    def _carrier(self, request):
        carrier = get_portal_carrier(request.user)
        if not carrier:
            raise PermissionDenied('المستخدم ليس عضواً في شركة نقل')
        return carrier

    def _fetch_latest_manifests(self, flight_id):
        latest = PassengerManifest.objects.filter(flight_id=flight_id).order_by('-created_at').first()
        return latest

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        carrier = self._carrier(request)
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)

        upcoming = carrier.flights.filter(
            status__in=[Flight.FlightStatus.SCHEDULED, Flight.FlightStatus.MANIFEST_UPLOADED, Flight.FlightStatus.IN_TRANSIT],
        )
        today_flights = upcoming.filter(scheduled_arrival__gte=today_start, scheduled_arrival__lt=today_end)
        next24 = tuple(
            upcoming.filter(
                scheduled_arrival__gte=now, scheduled_arrival__lte=now + timezone.timedelta(hours=24)
            ).order_by('scheduled_arrival').values_list('id', flat=True)
        )

        expected = 0
        manifest_ready = 0
        manifest_missing = 0
        if next24:
            latest_map = {}
            for manifest in (
                PassengerManifest.objects.filter(flight_id__in=next24)
                .order_by('-created_at')
                .values('flight_id', 'id', 'status', 'total_passengers')
            ):
                latest_map.setdefault(manifest['flight_id'], manifest)
            for flight_id in next24:
                latest = latest_map.get(flight_id)
                total = latest['total_passengers'] if latest else 0
                expected += total
                if latest and latest['status'] == PassengerManifest.ManifestStatus.COMPLETED:
                    manifest_ready += 1
                else:
                    manifest_missing += 1

        active_notices = HealthNotice.objects.filter(is_active=True).exclude(
            expiry_date__lt=now.date(),
        )
        acknowledged_ids = set(
            NoticeAcknowledgement.objects.filter(carrier=carrier).values_list('notice_id', flat=True)
        )
        acked = sum(1 for n in active_notices if n.id in acknowledged_ids)

        total_manifested = ManifestPassenger.objects.filter(manifest__flight__carrier=carrier).count()
        pre_registered = ManifestPassenger.objects.filter(
            manifest__flight__carrier=carrier, traveler__isnull=False
        ).count()

        return Response(success_response({
            'upcoming_today': today_flights.count(),
            'expected_passengers': expected,
            'manifest_status': {
                'ready': manifest_ready,
                'missing': manifest_missing,
                'total': len(next24),
            },
            'notices': {
                'active': active_notices.count(),
                'unacknowledged': active_notices.count() - acked,
            },
            'pre_registration_rate': round(pre_registered / total_manifested, 3) if total_manifested else 0,
            'api': {
                'configured': carrier.has_api_key,
                'last_use_at': carrier.last_api_use_at,
            },
        }))

    @action(detail=False, methods=['get'], url_path='upcoming', serializer_class=CarrierUpcomingSerializer)
    def upcoming(self, request):
        carrier = self._carrier(request)
        now = timezone.now()
        flights = list(
            carrier.flights.filter(
                status__in=[Flight.FlightStatus.SCHEDULED, Flight.FlightStatus.MANIFEST_UPLOADED, Flight.FlightStatus.IN_TRANSIT],
                scheduled_arrival__gte=now,
            ).select_related('carrier', 'origin_country', 'destination_port').order_by('scheduled_arrival')[:10]
        )

        flight_ids = [f.id for f in flights]
        latest_map = {}
        if flight_ids:
            for manifest in (
                PassengerManifest.objects.filter(flight_id__in=flight_ids)
                .order_by('-created_at')
                .values('flight_id', 'id', 'status', 'total_passengers')
            ):
                latest_map.setdefault(manifest['flight_id'], manifest)

        items = []
        for f in flights:
            latest = latest_map.get(f.id)
            items.append({
                'id': str(f.id),
                'flight_number': f.flight_number,
                'route': f'{f.origin_code} → {f.destination_port.code}',
                'scheduled_arrival': f.scheduled_arrival,
                'passengers': latest['total_passengers'] if latest else 0,
                'status': f.status,
                'manifest_status': latest['status'] if latest else None,
            })
        return Response(success_response(items))


class CarrierReportViewSet(viewsets.ViewSet):
    """تقارير ومؤشرات أداء شركة النقل (التزام وأعداد المسافرين والرحلات)."""

    permission_classes = [IsCarrierRep]
    serializer_class = CarrierKpiSerializer

    def _carrier(self, request):
        carrier = get_portal_carrier(request.user)
        if not carrier:
            raise PermissionDenied('المستخدم ليس عضواً في شركة نقل')
        return carrier

    @action(detail=False, methods=['get'], url_path='kpi')
    def kpi(self, request):
        carrier = self._carrier(request)
        now = timezone.now()
        flights_qs = carrier.flights.filter(scheduled_arrival__year=now.year, scheduled_arrival__month=now.month)
        flight_ids = list(flights_qs.values_list('id', flat=True))
        latest_map = {}
        if flight_ids:
            for manifest in (
                PassengerManifest.objects.filter(flight_id__in=flight_ids)
                .order_by('-created_at')
                .values('flight_id', 'total_passengers')
            ):
                latest_map.setdefault(manifest['flight_id'], manifest)
        total_passengers = sum(
            latest_map[fid]['total_passengers'] for fid in flight_ids if fid in latest_map
        )
        pre_registered = ManifestPassenger.objects.filter(
            manifest__flight__carrier=carrier, traveler__isnull=False
        ).count()
        total_manifested = ManifestPassenger.objects.filter(
            manifest__flight__carrier=carrier
        ).count()
        late = carrier.flights.filter(
            status=Flight.FlightStatus.SCHEDULED, scheduled_arrival__lt=now,
        ).count()
        active_notices = HealthNotice.objects.filter(is_active=True, expiry_date__gte=now.date())
        acknowledged_ids = set(
            NoticeAcknowledgement.objects.filter(carrier=carrier).values_list('notice_id', flat=True)
        )
        acked = sum(1 for n in active_notices if n.id in acknowledged_ids)
        return Response(success_response({
            'month_flights': len(flight_ids),
            'month_passengers': total_passengers,
            'pre_registration_rate': round(pre_registered / total_manifested, 3) if total_manifested else 0,
            'late_flights': late,
            'compliance': {
                'active_notices': active_notices.count(),
                'acknowledged': acked,
            },
        }))

    @action(detail=False, methods=['get'], url_path='flights')
    def flights(self, request):
        carrier = self._carrier(request)
        qs = carrier.flights.select_related('carrier', 'origin_country', 'destination_port')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        if from_date:
            qs = qs.filter(scheduled_arrival__date__gte=from_date)
        if to_date:
            qs = qs.filter(scheduled_arrival__date__lte=to_date)
        flights = list(qs.order_by('-scheduled_arrival')[:500])
        latest_map = {}
        if flights:
            flight_ids = [f.id for f in flights]
            for manifest in (
                PassengerManifest.objects.filter(flight_id__in=flight_ids)
                .order_by('-created_at')
                .values('flight_id', 'status', 'total_passengers')
            ):
                latest_map.setdefault(manifest['flight_id'], manifest)
        rows = []
        for f in flights:
            latest = latest_map.get(f.id)
            rows.append({
                'flight_number': f.flight_number,
                'route': f'{f.origin_code} → {f.destination_port.code}',
                'scheduled_departure': f.scheduled_departure,
                'scheduled_arrival': f.scheduled_arrival,
                'passengers': latest['total_passengers'] if latest else 0,
                'status': f.status,
            })
        return Response(success_response(rows))

    @action(detail=False, methods=['get'], url_path='compliance', serializer_class=CarrierComplianceSerializer)
    def compliance(self, request):
        carrier = self._carrier(request)
        now = timezone.now()
        notices = HealthNotice.objects.filter(is_active=True, expiry_date__gte=now.date())
        total = notices.count()
        acknowledged_ids = set(
            NoticeAcknowledgement.objects.filter(carrier=carrier).values_list('notice_id', flat=True)
        )
        acked = sum(1 for n in notices if n.id in acknowledged_ids)
        return Response(success_response({
            'total_notices': total,
            'acknowledged': acked,
            'acknowledged_ids': list(acknowledged_ids),
            'rate': round(acked / total, 3) if total else 0,
        }))


class CarrierIntegrationViewSet(viewsets.ViewSet):
    """بوابة التكامل الآلي (X-API-Key): الرحلات والكشوف والإشعارات والأحداث الصحية.

    كل طلب يُسجَّل في سجل التدقيق CarrierApiUsageLog لأغراض الرقابة والامتثال،
    وتُطبَّق حدود معدل الطلبات والصلاحيات وعناوين IP المعلنة على الشركة.
    """

    permission_classes = [HasApiKey]
    serializer_class = FlightSerializer
    required_scope = 'flights'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._started_at = timezone.now()

    def _carrier(self, request):
        return getattr(request, 'carrier', None)

    def initial(self, request, *args, **kwargs):
        self._started_at = timezone.now()
        return super().initial(request, *args, **kwargs)

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        self._log_usage(self.request, response, self._started_at, exception=exc)
        self._exception_logged = True
        return response

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if not getattr(self, '_exception_logged', False):
            self._log_usage(request, response, self._started_at, exception=None)
        return response

    def _log_usage(self, request, response, started_at, exception=None):
        carrier = getattr(request, 'carrier', None)
        if not carrier:
            return
        if getattr(response, 'status_code', None) is not None:
            status_code = response.status_code
        elif exception is not None:
            status_code = getattr(exception, 'status_code', 500)
        else:
            status_code = 0
        CarrierApiUsageLog.objects.create(
            carrier=carrier,
            endpoint=request.path,
            method=request.method,
            status_code=status_code,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:255],
            latency_ms=int((timezone.now() - started_at).total_seconds() * 1000),
            is_rate_limited=isinstance(exception, Throttled),
            error_message=str(exception) if exception else '',
            request_payload=dict(request.data) if getattr(request, 'data', None) else {},
        )

    def create_flight(self, request):
        carrier = self._carrier(request)
        data = request.data
        flight_number = data.get('flight_number')
        if not flight_number:
            raise ValidationError('flight_number مطلوب')

        from apps.masterdata.models import EntryPoint as Port
        from apps.travelers.models import Country

        port_code = data.get('destination_port_code') or data.get('destination_port')
        if not port_code:
            raise ValidationError('destination_port_code مطلوب')
        port = Port.objects.filter(code=port_code).first()
        if not port:
            raise ValidationError(f'منفذ غير موجود: {port_code}')

        origin = None
        origin_code = (data.get('origin_country_code') or '').strip().upper()
        if origin_code:
            origin = Country.objects.filter(code=origin_code).first()

        flight, _ = Flight.objects.update_or_create(
            flight_number=flight_number, carrier=carrier,
            defaults={
                'origin_code': data.get('origin_code', ''),
                'origin_country': origin,
                'flight_type': data.get('flight_type', Flight.FlightType.AIR),
                'destination_port': port,
                'scheduled_departure': data.get('scheduled_departure'),
                'scheduled_arrival': data.get('scheduled_arrival'),
                'notes': data.get('notes', ''),
            },
        )
        passengers = data.get('passengers', [])
        if passengers:
            self._ingest_passengers(flight, passengers)
        return Response(success_response({
            'flight_id': str(flight.id),
            'flight_number': flight.flight_number,
            'manifest_id': None,
            'processing_status': 'QUEUED',
            'total_passengers': len(passengers),
            'message': 'تم استلام بيانات الرحلة بنجاح.',
        }), status=status.HTTP_201_CREATED)

    def flight_manifest(self, request, pk=None):
        carrier = self._carrier(request)
        flight = None
        flight_id = request.data.get('flight') or pk
        if flight_id:
            flight = Flight.objects.filter(id=flight_id, carrier=carrier).first()
        if not flight:
            flight_number = request.data.get('flight_number')
            if flight_number:
                flight = Flight.objects.filter(flight_number__iexact=flight_number, carrier=carrier).first()
        if not flight:
            return Response(
                {'status': 'error', 'message': 'الرحلة غير موجودة — أرسل flight أو flight_number'},
                status=status.HTTP_404_NOT_FOUND,
            )
        manifest, _ = PassengerManifest.objects.get_or_create(
            flight=flight, status=PassengerManifest.ManifestStatus.UPLOADED,
            defaults={'file': None},
        )
        passengers = request.data.get('passengers', request.data.get('data', []))
        if not isinstance(passengers, list):
            raise ValidationError('passengers يجب أن يكون مصفوفة')
        self._ingest_passengers(flight, passengers, manifest=manifest)
        manifest.total_passengers = manifest.passengers.count()
        manifest.status = PassengerManifest.ManifestStatus.COMPLETED
        manifest.processed_at = timezone.now()
        manifest.save()
        return Response(success_response({
            'flight_id': str(flight.id),
            'manifest_id': str(manifest.id),
            'processing_status': 'QUEUED',
            'total_passengers': manifest.total_passengers,
            'message': 'تم استلام قائمة الركاب بنجاح.',
        }), status=status.HTTP_201_CREATED)

    def flight_status(self, request, pk=None):
        carrier = self._carrier(request)
        flight = Flight.objects.filter(id=pk, carrier=carrier).first()
        if not flight:
            return Response({'status': 'error', 'message': 'الرحلة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        manifest = flight.manifests.order_by('-created_at').first()
        return Response(success_response({
            'flight_id': str(flight.id),
            'status': flight.status,
            'manifest_status': manifest.status if manifest else None,
            'total_passengers': manifest.total_passengers if manifest else 0,
        }))

    def health_notices(self, request):
        notices = HealthNotice.objects.filter(is_active=True).exclude(
            expiry_date__lt=timezone.now().date(),
        )
        return Response(success_response(HealthNoticeSerializer(notices, many=True).data))

    def report_health_event(self, request):
        carrier = self._carrier(request)
        flight_id = request.data.get('flight')
        flight = Flight.objects.filter(id=flight_id, carrier=carrier).first()
        if not flight:
            return Response({'status': 'error', 'message': 'الرحلة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FlightHealthEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(
            reported_via='API',
            reporter_name=request.data.get('reporter_name', ''),
        )
        return Response(
            success_response(FlightHealthEventSerializer(event).data),
            status=status.HTTP_201_CREATED,
        )

    def _ingest_passengers(self, flight, passengers, manifest=None):
        from apps.travelers.models import Country, Traveler

        if manifest is None:
            manifest, _ = PassengerManifest.objects.get_or_create(
                flight=flight, status=PassengerManifest.ManifestStatus.UPLOADED,
                defaults={'file': None},
            )
        errors = []
        for idx, row in enumerate(passengers, start=1):
            passport = (row.get('passport_number') or '').strip()
            if not passport:
                errors.append({'row': idx, 'error': 'passport_number مطلوب'})
                continue
            if manifest.passengers.filter(passport_number=passport).exists() and row.get('action') == 'remove':
                manifest.passengers.filter(passport_number=passport).delete()
                continue
            if manifest.passengers.filter(passport_number=passport).exists():
                errors.append({'row': idx, 'error': f'جواز مكرر {passport}'})
                continue
            country = None
            code = (row.get('nationality_code') or '').strip().upper()
            if code:
                country = Country.objects.filter(code=code).first()
            if not country:
                errors.append({'row': idx, 'error': f'nationality_code غير موجود: {code}'})
                continue
            traveler = Traveler.objects.filter(passport_number=passport).first()
            manifest.passengers.create(
                manifest=manifest,
                passport_number=passport,
                first_name=row.get('first_name', ''),
                last_name=row.get('last_name', ''),
                date_of_birth=row.get('date_of_birth') or None,
                nationality=country,
                seat_number=row.get('seat_number', ''),
                email=row.get('email', ''),
                phone=row.get('phone', ''),
                traveler=traveler,
            )
        manifest.error_report = {'errors': errors[:100]}
        manifest.save()
        return len(errors)


class CarrierRegistrationViewSet(viewsets.GenericViewSet):
    """طلبات تسجيل شركات النقل في البوابة — تقديم الزبون ومراجعة المسؤول."""

    queryset = CarrierRegistrationRequest.objects.select_related('submitted_by', 'reviewed_by', 'carrier')
    serializer_class = CarrierRegistrationRequestSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['company_name', 'email', 'iata_code', 'icao_code']
    ordering_fields = ['created_at', 'status']
    filter_fields = ['status']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdmin()]

    def list(self, request):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            data = self.get_serializer(page, many=True).data
            return self.get_paginated_response(data)
        return Response(success_response(self.get_serializer(qs, many=True).data))

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        obj = serializer.save(submitted_by=user)
        return Response(
            success_response(self.get_serializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        req = self.get_object()
        decision = request.data.get('decision')
        if decision not in ('APPROVED', 'REJECTED'):
            raise ValidationError('decision يجب أن يكون APPROVED أو REJECTED')
        req.status = decision
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.review_notes = request.data.get('review_notes', req.review_notes)
        if decision == 'APPROVED' and req.carrier_id is None:
            req.carrier = self._accept_carrier(req)
        req.save()
        return Response(success_response(self.get_serializer(req).data))

    def _accept_carrier(self, req):
        if req.iata_code:
            existing = Carrier.objects.filter(iata_code=req.iata_code).first()
            if existing:
                return existing
        return Carrier.objects.create(
            name=req.company_name,
            iata_code=req.iata_code or None,
            icao_code=req.icao_code or None,
            email=req.email,
            phone=req.phone,
            address=req.address,
            is_active=True,
            registration_status=CarrierRegistrationStatus.APPROVED,
        )


class FlightHealthEventViewSet(viewsets.GenericViewSet):
    """الأحداث الصحية على متن الرحلات (PHA) — الإبلاغ والمعالجة والتصعيد إلى EOC."""

    queryset = FlightHealthEvent.objects.select_related('flight', 'assigned_to', 'destination_port', 'emergency_event')
    serializer_class = FlightHealthEventSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend]
    ordering_fields = ['reported_at', 'severity', 'status']
    filter_fields = ['status', 'severity', 'category', 'flight']
    ordering = ['-reported_at']

    def get_permissions(self):
        return [(IsAdmin | IsCarrierRep)()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        carrier = get_portal_carrier(user)
        if carrier:
            qs = qs.filter(flight__carrier=carrier)
        return qs

    @action(detail=False, methods=['get'], url_path='mine')
    def mine(self, request):
        qs = self.get_queryset()
        return Response(success_response(self.get_serializer(qs, many=True).data))

    def create(self, request):
        carrier = get_portal_carrier(request.user)
        flight_id = request.data.get('flight')
        flight = Flight.objects.filter(id=flight_id).first()
        if not flight:
            raise ValidationError('الرحلة غير موجودة')
        if carrier and flight.carrier_id != carrier.id:
            raise PermissionDenied('لا يمكن الإبلاغ عن حدث على رحلة شركة أخرى')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(
            reporter_user=request.user,
            reported_via='PORTAL',
            reporter_name=request.data.get('reporter_name', ''),
        )
        return Response(
            success_response(self.get_serializer(event).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        event = self.get_object()
        to_status = request.data.get('status')
        if not to_status:
            raise ValidationError('status مطلوب')
        try:
            event.transition_to(
                to_status, user=request.user,
                note=request.data.get('note', ''),
            )
        except ValueError as exc:
            raise ValidationError(str(exc))
        return Response(success_response(self.get_serializer(event).data))

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        event = self.get_object()
        if event.emergency_event_id:
            return Response(success_response({'emergency_event_id': str(event.emergency_event_id)}))
        eoc_event = event.escalate_to_eoc(
            user=request.user,
            summary=request.data.get('summary', ''),
        )
        return Response(success_response({'emergency_event_id': str(eoc_event.id)}))


class CarrierApiUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل تدقيق استخدام بوابة التكامل — للمسؤولين فقط."""

    queryset = CarrierApiUsageLog.objects.select_related('carrier')
    serializer_class = CarrierApiUsageLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['carrier', 'method', 'status_code', 'is_rate_limited']
    ordering_fields = ['created_at', 'latency_ms']
    ordering = ['-created_at']