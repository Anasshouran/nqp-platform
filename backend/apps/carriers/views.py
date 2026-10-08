import csv
import io

from django.db import transaction
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, Throttled, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import AdminOrPermissionAction, IsAdmin
from core.utils.response import success_response
from core.utils.scoping import resolve_user_port_ids

from apps.accounts.models import PermissionAudit
from apps.accounts.views import _audit_request_context

from .models import (
    Carrier,
    CarrierApiUsageLog,
    CarrierDocument,
    CarrierMember,
    CarrierRegistrationRequest,
    CarrierRegistrationStatus,
    Flight,
    FlightHealthEvent,
    HealthDeclaration,
    HealthNotice,
    ManifestPassenger,
    NoticeAcknowledgement,
    PassengerManifest,
)
from .permissions import HasApiKey, IsCarrierRep, manageable_carrier_ids
from .serializers import (
    CarrierApiUsageLogSerializer,
    CarrierComplianceSerializer,
    CarrierDashboardSerializer,
    CarrierDocumentSerializer,
    CarrierMemberCreateSerializer,
    CarrierMemberSerializer,
    CarrierMemberUpdateSerializer,
    CarrierKpiSerializer,
    CarrierProfileSerializer,
    CarrierRegistrationRequestSerializer,
    CarrierSerializer,
    CarrierUpcomingSerializer,
    FlightHealthEventSerializer,
    FlightSerializer,
    HealthDeclarationSerializer,
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


# ---------------------------------------------------------------------------
# M8-B.0 (F-01): تصنيف نطاق الوصول لبيانات شركات النقل — فشل آمن
# ---------------------------------------------------------------------------
# كان العيب: `carrier = get_portal_carrier(user)` ثم `if carrier: qs.filter(...)`
# دون فرع بديل — فغياب العضوية النشطة كان يعني "بلا تقييد"، أي أن مستخدمًا يحمل
# `flights:*` بلا عضوية يقرأ رحلات كل الشركات وينشئ رحلات باسم شركة يختارها
# من الطلب (يرسل `carrier` في BODY). كذلك كان `_guard_company` لا يفعل شيئًا
# حين تكون `carrier is None`.
#
# التصنيف الحصري المتبادل:
#   * ``global``: فاعل إداري قائم (superuser/موظف) ⇒ سلوكه غير محدد كما كان،
#     تمامًا كالنمط الفاشل-آمن الموجود في `CarrierDocumentViewSet.get_queryset`.
#     هذه *بوابة وصول* بالنطاق وليست سلطة منح (M8-S).
#   * ``member`` : عضوية نشطة ⇒يُقص على شركة العضوية فقط.
#   * ``none``   : لا عضوية ⇒ لا قراءة ولا كتابة (qs.none()/PermissionDenied).
CARRIER_SCOPE_GLOBAL = 'global'
CARRIER_SCOPE_MEMBER = 'member'
CARRIER_SCOPE_NONE = 'none'

NO_MEMBERSHIP_MESSAGE = 'لا توجد عضوية نشطة في شركة نقل — لا يمكن الوصول لبيانات شركات النقل'


def resolve_carrier_scope(user):
    """(نطاق الفاعل، شركة النطاق) — أحد الثلاثة أعلاه حصريًا."""
    if not user or not user.is_authenticated:
        return (CARRIER_SCOPE_NONE, None)
    if user.is_superuser or user.is_staff:
        return (CARRIER_SCOPE_GLOBAL, None)
    carrier = get_portal_carrier(user)
    if carrier is not None:
        return (CARRIER_SCOPE_MEMBER, carrier)
    return (CARRIER_SCOPE_NONE, None)


def scope_queryset_to_carrier(qs, user, field='carrier'):
    """يقصّ queryset على نطاق الفاعل. غياب العضوية = `qs.none()` لا queryset مفتوح."""
    scope, carrier = resolve_carrier_scope(user)
    if scope == CARRIER_SCOPE_GLOBAL:
        return qs
    if scope == CARRIER_SCOPE_MEMBER:
        return qs.filter(**{field: carrier})
    return qs.none()


class FlightViewSet(viewsets.ModelViewSet):
    """الرحلات الجوية.

    كان بلا `permission_classes` فورث `IsAuthenticated` العام من DRF، فكان أي
    حساب مسجّل يقرأ ويكتب ويحذف رحلات كل الشركات. الآن التفويض عبر
    `flights:view/add/edit/delete`.

    النطاق ليس من الصلاحيات: `get_queryset` يقصر النتائج على
    `get_portal_carrier(user)` و`perform_create` يثبّت `carrier`، و
    `_guard_company` يمنع التعديل على رحلة شركة أخرى. أي أن ممثّل الناقل
    يدير رحلات شركته فقط، والإدارة (`is_staff`) ترى الكل.
    """

    queryset = Flight.objects.select_related('carrier', 'origin_country', 'destination_port').all()
    serializer_class = FlightSerializer
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'flights'
    # `AdminOrPermissionAction` يفشل مغلقًا على الإجراءات المخصصة، فكل `@action`
    # أدناه يحتاج تعيينًا صريحًا: GET→view، PATCH/POST على الحالة والكشف→
    # edit/add، وإدارة مفتاح API إدارية حصريًا.
    action_permission_map = {
        'upcoming': 'view',
        'set_status': 'edit',
        'upload_manifest': 'add',
        'manifest_status': 'view',
        'manifest_passengers': 'view',
        'manifest_report': 'view',
        'manifest_errors': 'view',
        'manifest_reprocess': 'edit',
        'api_key_info': 'edit',
        'regenerate_api_key': 'edit',
        'timeline': 'view',
    }
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
        # M8-B.0 (F-01): النطاق يُقصّ عبر `scope_queryset_to_carrier` — غياب
        # العضوية يعطي `qs.none()` بدل queryset مفتوح على كل الشركات.
        return scope_queryset_to_carrier(qs, self.request.user)

    def _guard_company(self, serializer=None):
        """ممثل البوابة يدير رحلات شركته فقط (M8-B.0: لا فشل مفتوح)."""
        scope, carrier = resolve_carrier_scope(self.request.user)
        if scope == CARRIER_SCOPE_NONE:
            raise PermissionDenied(NO_MEMBERSHIP_MESSAGE)
        if scope == CARRIER_SCOPE_GLOBAL:
            return
        instance_carrier = None
        if serializer is not None and serializer.instance:
            instance_carrier = serializer.instance.carrier
        elif self.request.method in ('PUT', 'PATCH'):
            instance_carrier = self.get_object().carrier
        if instance_carrier and instance_carrier.id != carrier.id:
            raise PermissionDenied('لا يمكن تعديل رحلات شركة أخرى')

    def perform_create(self, serializer):
        """شركة الناقل يثبّتها الخادم؛ ولا يُنشئ أحد شيئًا بلا عضوية."""
        scope, carrier = resolve_carrier_scope(self.request.user)
        if scope == CARRIER_SCOPE_MEMBER:
            serializer.save(carrier=carrier)
            return
        if scope == CARRIER_SCOPE_GLOBAL:
            serializer.save()
            return
        raise PermissionDenied(NO_MEMBERSHIP_MESSAGE)

    def perform_update(self, serializer):
        self._guard_company(serializer)
        scope, carrier = resolve_carrier_scope(self.request.user)
        if scope == CARRIER_SCOPE_MEMBER:
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
        manually_allowed = {
            Flight.FlightStatus.SCHEDULED: {Flight.FlightStatus.CANCELLED},
            Flight.FlightStatus.MANIFEST_UPLOADED: {Flight.FlightStatus.IN_TRANSIT, Flight.FlightStatus.CANCELLED},
            Flight.FlightStatus.IN_TRANSIT: {Flight.FlightStatus.ARRIVED, Flight.FlightStatus.CANCELLED},
            Flight.FlightStatus.ARRIVED: set(),
            Flight.FlightStatus.CANCELLED: set(),
        }
        if new_status not in manually_allowed.get(flight.status, set()):
            return Response(
                {'status': 'error', 'message': 'انتقال غير مسموح أو غير قابل للتغيير القطعي يدويًا'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            flight.transition_to(new_status, user=request.user, note=request.data.get('note', ''))
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(success_response(FlightSerializer(flight).data))

    @action(detail=True, methods=['post'], url_path='manifest/upload', serializer_class=PassengerManifestSerializer)
    def upload_manifest(self, request, pk=None):
        flight = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if flight.status not in (Flight.FlightStatus.SCHEDULED, Flight.FlightStatus.MANIFEST_UPLOADED):
            raise ValidationError('لا يمكن رفع كشف لرحلة بدأت أو أُغلقت')
        manifest = serializer.save(flight=flight)
        self._process_manifest(manifest)
        if flight.status == Flight.FlightStatus.SCHEDULED:
            flight.transition_to(
                Flight.FlightStatus.MANIFEST_UPLOADED,
                user=request.user,
                note='تم رفع الكشف',
            )
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

    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        """خط زمني موحّد لأحداث الرحلة، دون تفاصيل طبية أو علاجية."""
        flight = self.get_object()
        events = self._flight_timeline_payload(flight)
        return Response(success_response({'flight_id': str(flight.id), 'events': events}))

    def _flight_timeline_payload(self, flight):
        events = []

        for log in flight.status_logs.select_related('changed_by').all():
            events.append({
                '_timestamp': log.created_at,
                'event_type': 'flight_status_changed',
                'timestamp': log.created_at.isoformat(),
                'title': 'تحديث حالة الرحلة',
                'category': 'operational',
                'from_status': log.from_status,
                'to_status': log.to_status,
                'status': log.to_status,
                'actor_name': self._safe_actor(log.changed_by),
                'source_id': str(log.id),
                'source_type': 'flight_status_log',
            })

        declaration = getattr(flight, 'health_declaration', None)
        if declaration:
            for log in declaration.status_logs.select_related('changed_by').all():
                events.append({
                    '_timestamp': log.created_at,
                    'event_type': 'health_declaration_status_changed',
                    'timestamp': log.created_at.isoformat(),
                    'title': 'تحديث حالة الإقرار الصحي',
                    'category': 'health',
                    'from_status': log.from_status,
                    'to_status': log.to_status,
                    'status': log.to_status,
                    'actor_name': self._safe_actor(log.changed_by),
                    'source_id': str(log.id),
                    'source_type': 'health_declaration_log',
                })

        for event in flight.health_events.select_related('reporter_user').all():
            events.append({
                '_timestamp': event.reported_at,
                'event_type': 'flight_health_event_created',
                'timestamp': event.reported_at.isoformat(),
                'title': f'حدث صحي: {event.get_category_display()}',
                'category': 'health',
                'status': event.status,
                'details': {'severity': event.severity, 'affected_count': event.affected_count},
                'actor_name': event.reporter_name or self._safe_actor(event.reporter_user),
                'source_id': str(event.id),
                'source_type': 'flight_health_event',
            })
            for log in event.status_logs.select_related('changed_by').all():
                events.append({
                    '_timestamp': log.created_at,
                    'event_type': 'flight_health_event_status_changed',
                    'timestamp': log.created_at.isoformat(),
                    'title': 'تحديث حالة حدث صحي',
                    'category': 'health',
                    'from_status': log.from_status,
                    'to_status': log.to_status,
                    'status': log.to_status,
                    'actor_name': self._safe_actor(log.changed_by),
                    'source_id': str(log.id),
                    'source_type': 'flight_health_event_log',
                })

        for referral in flight.clinic_referrals.select_related('clinic').all():
            events.append({
                '_timestamp': referral.created_at,
                'event_type': 'clinic_referral_created',
                'timestamp': referral.created_at.isoformat(),
                'title': 'إنشاء إحالة عيادة',
                'category': 'health',
                'status': referral.status,
                'details': {'source': referral.source, 'clinic_id': str(referral.clinic_id) if referral.clinic_id else None},
                'source_id': str(referral.id),
                'source_type': 'clinic_referral',
            })

        for manifest in flight.manifests.all():
            events.append({
                '_timestamp': manifest.created_at,
                'event_type': 'passenger_manifest_uploaded',
                'timestamp': manifest.created_at.isoformat(),
                'title': 'رفع كشف المسافرين',
                'category': 'operational',
                'status': manifest.status,
                'details': {'manifest_id': str(manifest.id), 'total_passengers': manifest.total_passengers},
                'source_id': str(manifest.id),
                'source_type': 'passenger_manifest',
            })
            if manifest.processed_at:
                events.append({
                    '_timestamp': manifest.processed_at,
                    'event_type': 'passenger_manifest_processed',
                    'timestamp': manifest.processed_at.isoformat(),
                    'title': 'معالجة كشف المسافرين',
                    'category': 'operational',
                    'status': manifest.status,
                    'details': {'manifest_id': str(manifest.id), 'total_passengers': manifest.total_passengers},
                    'source_id': str(manifest.id),
                    'source_type': 'passenger_manifest',
                })

        events.sort(key=lambda item: item['_timestamp'])
        return [{k: v for k, v in event.items() if k != '_timestamp'} for event in events]

    @staticmethod
    def _safe_actor(user):
        if not user:
            return None
        return getattr(user, 'full_name', '') or getattr(user, 'email', '') or str(user)

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


class CarrierMemberViewSet(viewsets.GenericViewSet):
    """إدارة أعضاء شركة نقل واحدة.

    النطاق ليس من العضوية بل من تفويض صريح:

        RoleAssignment(scope_type=COMPANY, carrier_members=*)  ──►  إدارة
        CarrierMember  ──►  بوابة الناقل فقط، لا يمنح إدارة أبداً

    `carrier_id` (من المسار) هو الرقم الحاكم للنطاق: إن لم يكن ضمن
    `manageable_carrier_ids` للفاعل ⇒ 404 لكل رابط (لا تسريب للوجود).
    لا DELETE: الإزالة التشغيلية = deactivate.
    """

    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'carrier_members'
    queryset = CarrierMember.objects.select_related('user').all()
    action_permission_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'partial_update': 'edit',
        'activate': 'activate',
        'deactivate': 'deactivate',
    }

    def _carrier(self):
        carrier_id = self.kwargs['carrier_id']
        allowed = manageable_carrier_ids(self.request.user)
        # None ⇒ بلا تقييد (إدارة المنصّة)؛ وإلا يشترط أن يكون ضمن النطاق.
        if allowed is not None and str(carrier_id) not in {str(c) for c in allowed}:
            raise Http404
        return get_object_or_404(Carrier, pk=carrier_id)

    def _members_qs(self):
        carrier = self._carrier()
        return carrier, CarrierMember.objects.filter(carrier=carrier)

    def get_serializer_class(self):
        if self.action == 'create':
            return CarrierMemberCreateSerializer
        if self.action == 'partial_update':
            return CarrierMemberUpdateSerializer
        return CarrierMemberSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        carrier_id = self.kwargs.get('carrier_id')
        context['carrier'] = (
            get_object_or_404(Carrier, pk=carrier_id) if carrier_id else None
        )
        return context

    def list(self, request, carrier_id=None, **kwargs):
        carrier, qs = self._members_qs()
        qs = qs.order_by('-is_primary', 'user__full_name')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                self.get_serializer(page, many=True).data
            )
        return Response(
            success_response(self.get_serializer(qs, many=True).data)
        )

    def create(self, request, carrier_id=None, **kwargs):
        carrier = self._carrier()
        with transaction.atomic():
            # قفل صف الشركة لتسلسل فحص «ممثل واحد» مع الكتابات المتزامنة.
            Carrier.objects.select_for_update().get(pk=carrier.pk)
            serializer = CarrierMemberCreateSerializer(
                data=request.data,
                context={**self.get_serializer_context(), 'carrier': carrier},
            )
            serializer.is_valid(raise_exception=True)
            member = serializer.save()
            self._audit(
                request, member,
                carrier_id=carrier.pk, action=PermissionAudit.Action.GRANT,
                reason='إنشاء عضوية عضو عبر /api/v1/carriers/companies/{id}/members/',
            )
        return Response(
            success_response(CarrierMemberSerializer(member).data),
            status=status.HTTP_201_CREATED,
        )

    def _get_member(self):
        carrier, qs = self._members_qs()
        return get_object_or_404(qs, pk=self.kwargs['pk'])

    def retrieve(self, request, carrier_id=None, pk=None, **kwargs):
        member = self._get_member()
        return Response(success_response(CarrierMemberSerializer(member).data))

    def partial_update(self, request, carrier_id=None, pk=None, **kwargs):
        member = self._get_member()
        carrier = member.carrier
        with transaction.atomic():
            Carrier.objects.select_for_update().get(pk=carrier.pk)
            serializer = CarrierMemberUpdateSerializer(
                member, data=request.data, partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(success_response(CarrierMemberSerializer(member).data))

    def activate(self, request, carrier_id=None, pk=None, **kwargs):
        return self._toggle_active(request, activate=True)

    def deactivate(self, request, carrier_id=None, pk=None, **kwargs):
        return self._toggle_active(request, activate=False)

    def _toggle_active(self, request, activate):
        carrier, qs = self._members_qs()
        with transaction.atomic():
            Carrier.objects.select_for_update().get(pk=carrier.pk)
            member = get_object_or_404(
                CarrierMember.objects.select_for_update(),
                pk=self.kwargs['pk'], carrier=carrier,
            )
            if activate and member.is_active:
                raise ValidationError({'is_active': 'تم تفعيل هذه العضوية بالفعل'})
            if not activate and not member.is_active:
                raise ValidationError({'is_active': 'هذه العضوية معطّلة بالفعل'})
            member.is_active = activate
            member.save(update_fields=['is_active', 'updated_at'])
            self._audit(
                request, member,
                carrier_id=carrier.pk,
                action=PermissionAudit.Action.GRANT if activate else PermissionAudit.Action.REVOKE,
                reason='تفعيل العضوية' if activate else 'تعطيل العضوية',
            )
        return Response(success_response(CarrierMemberSerializer(member).data))

    def _audit(self, request, member, *, carrier_id, action, reason):
        ip, ua = _audit_request_context(request)
        PermissionAudit.objects.create(
            user=member.user,
            permission_code=f'carrier_membership:{carrier_id}',
            action=action,
            granted=action == PermissionAudit.Action.GRANT,
            reason=reason,
            ip_address=ip or None,
            user_agent=ua,
        )


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
    """الإشعارات الصحية — قراءة عامة مقصودة، وكتابة إدارية.

    `get_permissions` أدناه يتجاوز `permission_classes` عمداً: القراءة
    (`list/retrieve/archived/recent`) `AllowAny` لأن الإشعار الصحي نصيحة
    عامة، و`acknowledge` لممثل الناقل، وكل ما عدا ذلك `IsAdmin`.
    """

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
        # M8-B.0 (F-01): بلا عضوية نشطة ⇒ `qs.none()` (فشل آمن) بدل كشف
        # أحداث كل الشركات.
        return scope_queryset_to_carrier(qs, self.request.user, field='flight__carrier')

    @action(detail=False, methods=['get'], url_path='mine')
    def mine(self, request):
        qs = self.get_queryset()
        return Response(success_response(self.get_serializer(qs, many=True).data))

    def create(self, request):
        scope, carrier = resolve_carrier_scope(request.user)
        if scope == CARRIER_SCOPE_NONE:
            raise PermissionDenied(NO_MEMBERSHIP_MESSAGE)
        flight_id = request.data.get('flight')
        # M8-B.0: الرحلة تُبحث داخل نطاق الفاعل، فلا يُقبل مُعرّف رحلة شركة
        # أخرى كبوابة تجاوز للعزل.
        flights = Flight.objects.filter(carrier=carrier) if scope == CARRIER_SCOPE_MEMBER else Flight.objects.all()
        flight = flights.filter(id=flight_id).first()
        if not flight:
            raise ValidationError('الرحلة غير موجودة')
        if scope == CARRIER_SCOPE_MEMBER and flight.carrier_id != carrier.id:
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

    @action(detail=True, methods=['post'], url_path='referral')
    def create_referral(self, request, pk=None):
        """إنشاء إحالة عيادة مرتبطة بالحدث الصحي والرحلة."""
        event = self.get_object()
        if event.status == FlightHealthEvent.EventStatus.CLOSED:
            raise ValidationError('لا يمكن إنشاء إحالة لحدث مغلق')
        traveler_id = request.data.get('traveler') or request.data.get('traveler_id')
        if not traveler_id:
            raise ValidationError('traveler مطلوب')
        from apps.clinic.models import ClinicReferral
        from apps.travelers.models import Traveler

        traveler = Traveler.objects.filter(id=traveler_id).first()
        if not traveler:
            raise ValidationError('المسافر غير موجود')
        port = event.destination_port or event.flight.destination_port
        referral = ClinicReferral.objects.create(
            traveler=traveler,
            port=port,
            source=ClinicReferral.Source.SCREENING,
            status=ClinicReferral.ReferralStatus.PENDING,
            flight=event.flight,
            health_event=event,
            notes=request.data.get('notes', '') or event.description,
        )
        if not event.quarantine_state:
            event.quarantine_state = 'PENDING'
            event.save(update_fields=['quarantine_state', 'updated_at'])
        from apps.clinic.serializers import ClinicReferralSerializer

        return Response(success_response(ClinicReferralSerializer(referral).data), status=status.HTTP_201_CREATED)


class HealthDeclarationViewSet(viewsets.ModelViewSet):
    """الإقرار الصحي للرحلة — يقدَّم من الناقل ويُراجع من صحة المطار.

    - عمليات الناقل (create/partial_update/submit/list) تحت مورد `flights`.
    - عمليات مراجعة الصحة (review/approve/reject) تحت مورد `airport_health`،
      ويُقصر وصولها على منافذ الوجهة ضمن نطاق المستخدم.
    - الحالة لا تُغيَّر مباشرة عبر PATCH؛ الانتقالات عبر actions فقط.
    - الإقرار الواحد لكل رحلة؛ والرفض يتطلب سببًا ويُسجَّل.
    """

    queryset = HealthDeclaration.objects.select_related(
        'flight', 'carrier', 'submitted_by', 'reviewed_by'
    ).all()
    serializer_class = HealthDeclarationSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['flight__flight_number', 'carrier__name']
    filter_fields = ['status', 'flight']
    ordering_fields = ['created_at', 'submitted_at', 'reviewed_at']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch']

    AIRPORT_ACTIONS = {'review', 'approve', 'reject'}
    CARRIER_ACTIONS = {'create', 'update', 'partial_update', 'submit'}

    action_permission_map = {
        'submit': 'edit',
        'review': 'edit',
        'approve': 'edit',
        'reject': 'edit',
    }

    def _scope_context(self):
        """نطاق الوصول: all للمشرفين، carrier للناقل، airport للمناطجية، none للغريب."""
        user = self.request.user
        if not user or not user.is_authenticated:
            return ('none', None)
        if user.is_superuser or user.is_staff:
            return ('all', None)
        if self.action in self.AIRPORT_ACTIONS:
            return ('airport', resolve_user_port_ids(user))
        if self.action in self.CARRIER_ACTIONS:
            carrier = get_portal_carrier(user)
            return ('carrier', carrier)
        carrier = get_portal_carrier(user)
        if carrier and user.can('flights:view'):
            return ('carrier', carrier)
        ports = resolve_user_port_ids(user)
        if ports is not None and user.can('airport_health:view'):
            return ('airport', ports)
        if carrier:
            return ('carrier', carrier)
        return ('airport', ports)

    def get_permissions(self):
        scope, _ = self._scope_context()
        if self.action in self.AIRPORT_ACTIONS or (self.action in ('list', 'retrieve') and scope == 'airport'):
            self.permission_resource = 'airport_health'
        else:
            self.permission_resource = 'flights'
        return [AdminOrPermissionAction()]

    def get_queryset(self):
        qs = super().get_queryset()
        scope, target = self._scope_context()
        if scope in ('all', 'none'):
            return qs if scope == 'all' else qs.none()
        if scope == 'carrier':
            return qs.filter(carrier=target) if target else qs.none()
        if target is None:
            return qs
        if not target:
            return qs.none()
        return qs.filter(flight__destination_port_id__in=target)

    def perform_create(self, serializer):
        scope, target = self._scope_context()
        flight = serializer.validated_data.get('flight')
        carrier = get_portal_carrier(self.request.user)
        if scope == 'carrier' and carrier is not None and flight and flight.carrier_id != carrier.id:
            raise PermissionDenied('لا يمكن إنشاء إقرار لرحلة شركة أخرى')
        if flight and HealthDeclaration.objects.filter(flight=flight).exists():
            raise ValidationError('يوجد إقرار صحي مسجل لهذه الرحلة بالفعل')
        serializer.save(carrier=flight.carrier if flight else None)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._ensure_editable(instance)
        self._reject_direct_status_patch(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._ensure_editable(instance)
        self._reject_direct_status_patch(request)
        return super().partial_update(request, *args, **kwargs)

    def _reject_direct_status_patch(self, request):
        if 'status' in request.data:
            raise ValidationError('الحالة لا تُعدَّل مباشرة؛ استخدم submit/review/approve/reject')

    def _ensure_editable(self, instance):
        if instance.status != HealthDeclaration.Status.DRAFT:
            raise ValidationError('لا يمكن تعديل الإقرار بعد تقديمه')

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        decl = self.get_object()
        if decl.status not in (HealthDeclaration.Status.DRAFT, HealthDeclaration.Status.REJECTED):
            raise ValidationError('لا يمكن تقديم الإقرار في حالته الحالية')
        if decl.status == HealthDeclaration.Status.REJECTED:
            decl.rejection_reason = ''
            decl.save(update_fields=['rejection_reason'])
        decl.transition_to(HealthDeclaration.Status.SUBMITTED, user=request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_serializer(decl).data))

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        decl = self.get_object()
        if decl.status != HealthDeclaration.Status.SUBMITTED:
            raise ValidationError('يجب أن يكون الإقرار مُقدَّماً قبل المراجعة')
        decl.transition_to(HealthDeclaration.Status.UNDER_REVIEW, user=request.user, note=request.data.get('note', ''))
        return Response(success_response(self.get_serializer(decl).data))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        decl = self.get_object()
        if decl.status != HealthDeclaration.Status.UNDER_REVIEW:
            raise ValidationError('لا يمكن الاعتماد إلا بعد المراجعة')
        decl.transition_to(HealthDeclaration.Status.APPROVED, user=request.user, note=request.data.get('note', ''))
        review_notes = request.data.get('review_notes', '')
        if review_notes:
            decl.review_notes = review_notes
            decl.save(update_fields=['review_notes'])
        return Response(success_response(self.get_serializer(decl).data))

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        decl = self.get_object()
        if decl.status != HealthDeclaration.Status.UNDER_REVIEW:
            raise ValidationError('لا يمكن الرفض إلا بعد المراجعة')
        reason = (request.data.get('reason') or request.data.get('rejection_reason') or '').strip()
        if not reason:
            raise ValidationError('سبب الرفض مطلوب')
        decl.transition_to(HealthDeclaration.Status.REJECTED, user=request.user, note=reason)
        decl.rejection_reason = reason
        review_notes = request.data.get('review_notes', '')
        if review_notes:
            decl.review_notes = review_notes
        decl.save(update_fields=['rejection_reason', 'review_notes'])
        return Response(success_response(self.get_serializer(decl).data))


class CarrierDocumentViewSet(viewsets.ModelViewSet):
    queryset = CarrierDocument.objects.select_related('carrier', 'flight', 'uploaded_by').all()
    serializer_class = CarrierDocumentSerializer
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'flights'
    action_permission_map = {'download': 'view'}
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'carrier__name', 'flight__flight_number', 'document_type']
    filter_fields = ['document_type', 'flight', 'carrier']
    ordering_fields = ['created_at', 'updated_at', 'file_size']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            return qs.filter(carrier=carrier)
        if self.request.user.is_superuser or self.request.user.is_staff:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        carrier = get_portal_carrier(self.request.user)
        if carrier and self.request.data.get('carrier') and self.request.data.get('carrier') not in (str(carrier.id), carrier.iata_code):
            raise ValidationError('لا يمكن إنشاء مستند باسم شركة أخرى')
        flight = serializer.validated_data.get('flight')
        if carrier:
            if flight and flight.carrier_id != carrier.id:
                raise ValidationError('الرحلة لا تتبع شركة الناقل الحالية')
            carrier_obj = carrier
        else:
            carrier_obj = serializer.validated_data.get('carrier') or (flight.carrier if flight else None)
            if carrier_obj and flight and flight.carrier_id != carrier_obj.id:
                raise ValidationError('الرحلة لا تطابق شركة النقل')
        if not carrier_obj and not self.request.user.is_staff:
            raise PermissionDenied('شركة النقل مطلوبة')
        document = serializer.save(carrier=carrier_obj, uploaded_by=self.request.user)
        uploaded_file = serializer.validated_data.get('file')
        if uploaded_file:
            document.file_size = uploaded_file.size
            document.mime_type = getattr(uploaded_file, 'content_type', '') or ''
            document.original_filename = uploaded_file.name
            document.save(update_fields=['file_size', 'mime_type', 'original_filename'])

    def perform_update(self, serializer):
        carrier = get_portal_carrier(self.request.user)
        if carrier:
            serializer.save(carrier=carrier)
        else:
            serializer.save()

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        document = self.get_object()
        if not document.file:
            raise ValidationError('الملف غير متاح')
        return FileResponse(
            document.file.open('rb'),
            as_attachment=True,
            filename=document.original_filename or document.file.name.split('/')[-1] or 'document',
        )


class CarrierApiUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل تدقيق استخدام بوابة التكامل — للمسؤولين فقط."""

    queryset = CarrierApiUsageLog.objects.select_related('carrier')
    serializer_class = CarrierApiUsageLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['carrier', 'method', 'status_code', 'is_rate_limited']
    ordering_fields = ['created_at', 'latency_ms']
    ordering = ['-created_at']