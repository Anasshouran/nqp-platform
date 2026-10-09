import io
import base64
from datetime import date, timedelta

import qrcode
from django.conf import settings
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.travelers.models import Traveler
from core.filters import ExactFilterBackend
from core.permissions import ActionPermissionMixin, PermissionAction
from core.utils.response import success_response
from core.utils.scoping import SectorScopedMixin, resolve_user_port_ids

from .models import (
    CertificateVerification,
    InventoryTransaction,
    VaccinationCertificate,
    VaccinationRecord,
    VaccinationRule,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)
from .serializers import (
    CertificateVerificationSerializer,
    InventoryTransactionSerializer,
    TravelerBriefSerializer,
    VaccinationAssessmentSerializer,
    VaccinationCertificateSerializer,
    VaccinationDashboardSerializer,
    VaccinationRecordSerializer,
    VaccinationRuleSerializer,
    VaccinationSiteSerializer,
    VaccineBatchSerializer,
    VaccineSerializer,
)
from .services import (
    adjust_batch,
    assess_traveler,
    find_traveler,
    issue_certificate,
    replace_certificate,
    reissue_certificate,
    record_vaccination,
    revoke_certificate,
    traveler_summary,
)


# خريطة CRUD الأساسية؛ كل viewset يوسّعها بإجراءاته المخصصة.
BASE_ACTION_PERMISSIONS = {
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'list': 'view',
    'retrieve': 'view',
}

# إجراءات قراءة بحتة: البحث عن مسافر وتقييم احتياجه لا يكتبان شيئاً.
READ_ACTION_PERMISSIONS = {
    'search_traveler': 'view',
    'assess': 'view',
}

# إصدار الشهادة وإلغاؤها وقراءة رمز التحقق كلها سلطة «مُصدِر شهادة» واحدة:
# `vaccination:issue`. كان الإصدار محمياً بـ `add` فقط، بينما الإلغاء
# وقراءة الرمز وتسوية المخزون كانت تسقط كلّها إلى `view`.
# لا `update`/`partial_update`/`destroy`: الشهادة تُصنع مرةً وتُلغى عبر
# `revoke` فقط، فلا مسارات تعديل/حذف في الخريطة ولا في الراوتر.
CERTIFICATE_ACTION_PERMISSIONS = {
    **BASE_ACTION_PERMISSIONS,
    'create': 'issue',
    'qr': 'issue',
    'revoke': 'issue',
    'replace': 'issue',
    'reissue': 'issue',
}


class VaccinationPermissionMixin(ActionPermissionMixin):
    permission_classes = [PermissionAction]
    permission_resource = 'vaccination'
    action_permission_map = BASE_ACTION_PERMISSIONS


class VaccineViewSet(VaccinationPermissionMixin, viewsets.ModelViewSet):
    """إدارة أنواع اللقاحات (Master Data)."""

    queryset = Vaccine.objects.all()
    serializer_class = VaccineSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['is_active', 'required', 'route']
    search_fields = ['code', 'name_ar', 'name_en', 'who_code']
    ordering_fields = ['order', 'name_ar', 'code']
    ordering = ['order', 'name_ar']


class VaccineBatchViewSet(VaccinationPermissionMixin, viewsets.ModelViewSet):
    """إدارة تشغيلات اللقاح (LOT)."""

    action_permission_map = {**BASE_ACTION_PERMISSIONS, 'adjust': 'edit'}
    queryset = VaccineBatch.objects.select_related('vaccine').all()
    serializer_class = VaccineBatchSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['vaccine', 'status']
    search_fields = ['lot_number', 'manufacturer', 'vaccine__name_ar']
    ordering_fields = ['expiry_date', 'received_at']
    ordering = ['expiry_date']

    def perform_create(self, serializer):
        available = serializer.validated_data.get('available_quantity')
        self.request.user  # noqa: B018
        batch = serializer.save(received_quantity=serializer.validated_data.get('received_quantity', 0))
        if available is None:
            VaccineBatch.objects.filter(pk=batch.pk).update(available_quantity=batch.received_quantity)
        InventoryTransaction.objects.create(
            batch=batch,
            type=InventoryTransaction.Type.IN,
            quantity=batch.received_quantity,
            created_by=self.request.user,
            note='استلام تشغيلة جديدة',
        )

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        batch = self.get_object()
        try:
            delta = int(request.data.get('delta', 0))
        except (TypeError, ValueError):
            return Response({'status': 'error', 'message': 'قيمة delta غير صحيحة'}, status=400)
        if delta == 0:
            return Response({'status': 'error', 'message': 'لا تغيير'}, status=400)
        new_value = adjust_batch(
            batch, delta, user=request.user, reason=request.data.get('reason', 'تسوية')
        )
        batch.refresh_from_db()
        return Response(success_response({'available_quantity': new_value, 'batch': self.get_serializer(batch).data}))


class VaccinationSiteViewSet(VaccinationPermissionMixin, SectorScopedMixin, viewsets.ModelViewSet):
    """إدارة عيادات ونقاط التطعيم."""

    # العيادة مرتبطة بمنفذ دخول مباشرة، فمدير نقطة التطعيم يرى عيادات منفذه
    # فقط لا عيادات البلاد (role `VACCINATION_OFFICER` نطاقه PORT).
    port_field = 'entry_point'
    queryset = VaccinationSite.objects.select_related('entry_point').all()
    serializer_class = VaccinationSiteSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['kind']
    search_fields = ['name_ar', 'name_en', 'location']
    ordering = ['name_ar']

    def get_queryset(self):
        """النشطة افتراضياً في القائمة، والمعطّلة عند `?include_inactive=true`.

        التصفية كانت داخل `queryset` فتصبح العيادة المعطّلة غير مرئية تماماً:
        لا تُقرأ ولا تُعدَّل ولا تُحذف ولا تُعاد تنشيطها أبداً — يتيم دائم.
        الترشيح يقتصر على `list` وحدها حتى يبقى العنصر قابلاً للوصول بمعرّفه.
        """
        qs = super().get_queryset()
        if self.action != 'list':
            return qs
        if self.request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)
        return qs


class VaccinationRecordViewSet(VaccinationPermissionMixin, SectorScopedMixin, viewsets.ModelViewSet):
    """سجلات الجرعات: تسجيل، بحث، تقييم المسافر."""

    # الجرعة تنتمي لمنفذ عبر عيادتها؛ مسجّل لكل منفذ كان يرى كل جرعات
    # البلاد. `site` اختياري في النموذج، فسجل بلا عيادة لا يُنسب إلى أي
    # منفذ ولا يظهر لأحد بنطاق منفذ (فشل آمن) — يُرى للمدير العام فقط.
    port_field = 'site__entry_point'
    action_permission_map = {**BASE_ACTION_PERMISSIONS, **READ_ACTION_PERMISSIONS}
    queryset = VaccinationRecord.objects.select_related(
        'traveler', 'vaccine', 'batch', 'site', 'vaccinator', 'recorded_by'
    ).all()
    serializer_class = VaccinationRecordSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['vaccine', 'dose_type', 'status', 'traveler']
    search_fields = ['traveler__passport_number', 'traveler__first_name', 'traveler__last_name', 'vaccine__name_ar']
    ordering_fields = ['administered_at', 'created_at']
    ordering = ['-administered_at']

    def get_serializer_context(self):
        return {'user': self.request.user}

    def create(self, request, *args, **kwargs):
        data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
        passport = data.get('passport_number') or data.get('passport')
        traveler_id = data.get('traveler_id')
        traveler, _ = find_traveler(passport=passport, traveler_id=traveler_id)
        if not traveler:
            return Response({'status': 'error', 'message': 'المسافر غير موجود — تأكد من رقم الجواز'}, status=404)

        from apps.vaccination.models import Vaccine, VaccineBatch, VaccinationSite

        vaccine = Vaccine.objects.filter(pk=data.get('vaccine')).first()
        if not vaccine:
            return Response({'status': 'error', 'message': 'اللقاح غير صالح'}, status=400)

        site = VaccinationSite.objects.filter(pk=data.get('site')).first() if data.get('site') else None
        # الكتابة تحتاج القطع نفسها التي تقرأ: بلا هذا كان مسجّل ميناء يكتب
        # جرعة في عيادة ميناء آخر بتقليص مخزون ذلك الميناء وفساد إحصاءاته.
        port_ids = resolve_user_port_ids(request.user)
        if site and port_ids is not None and site.entry_point_id not in port_ids:
            return Response({'status': 'error', 'message': 'العيادة خارج نطاق منفذك'}, status=400)

        payload = {
            'traveler': traveler,
            'vaccine': vaccine,
            'batch': VaccineBatch.objects.filter(pk=data.get('batch')).first() if data.get('batch') else None,
            'dose_type': data.get('dose_type') or VaccinationRecord.DoseType.FIRST,
            'dose_number': int(data.get('dose_number', 1)),
            'administered_at': data.get('administered_at') or date.today(),
            'site': site,
            'vaccinator': None,
            'notes': data.get('notes', ''),
        }
        from django.contrib.auth import get_user_model

        User = get_user_model()
        payload['vaccinator'] = User.objects.filter(pk=data.get('vaccinator_id')).first()
        try:
            record = record_vaccination(payload, request.user)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return Response(success_response(self.get_serializer(record).data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='search-traveler')
    def search_traveler(self, request):
        passport = (request.query_params.get('passport') or '').strip().upper()
        name_q = request.query_params.get('q')
        qs = Traveler.objects.all()
        if passport:
            qs = qs.filter(passport_number=passport)
        elif name_q:
            qs = qs.filter(Q(first_name__icontains=name_q) | Q(last_name__icontains=name_q) | Q(passport_number__icontains=name_q))
        else:
            return Response(success_response({'traveler': None}))
        traveler = qs.first()
        if not traveler:
            return Response(success_response({'traveler': None, 'message': 'لم يتم العثور على مسافر'}))
        destination = request.query_params.get('destination')
        return Response(
            success_response(
                {
                    'traveler': TravelerBriefSerializer(traveler).data,
                    'summary': traveler_summary(traveler),
                    'assessment': assess_traveler(traveler, destination=destination),
                }
            )
        )

    @action(detail=False, methods=['post'], url_path='assess')
    def assess(self, request):
        passport = (request.data.get('passport_number') or request.data.get('passport') or '').strip().upper()
        traveler_id = request.data.get('traveler_id')
        traveler = Traveler.objects.filter(pk=traveler_id).first() if traveler_id else Traveler.objects.filter(passport_number=passport).first()
        if not traveler:
            return Response({'status': 'error', 'message': 'المسافر غير موجود'}, status=404)
        summary = traveler_summary(traveler)
        return Response(
            success_response(
                VaccinationAssessmentSerializer(
                    {
                        'assessment': assess_traveler(traveler, destination=request.data.get('destination')),
                        'records': summary['records'],
                        'certificates': summary['certificates'],
                    }
                ).data
            )
        )


class VaccinationCertificateViewSet(
    VaccinationPermissionMixin,
    SectorScopedMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """إصدار شهادات التلعيم الدولية، وقراءتها، وإلغائها.

    مقصود غياب `UpdateModelMixin`/`DestroyModelMixin`: الشهادة وثيقة قانونية
    لا تُعدَّل ولا تُحذف بـ PUT/PATCH/DELETE، فمسارَا التغيير الوحيدان هما
    الإصدار (`create` → `issue_certificate`) والإلغاء (`revoke`). الراوتر لا
    يسجّل مسارات PUT/PATCH/DELETE أصلاً لأن الـ viewset لا يعرّفها.
    """

    # الشهادة لا تحمل منفذاً مباشرة؛ ترثه من جرعتها عبر عيادتها.
    port_field = 'record__site__entry_point'
    action_permission_map = CERTIFICATE_ACTION_PERMISSIONS
    queryset = VaccinationCertificate.objects.select_related(
        'traveler', 'vaccine', 'record', 'issued_by'
    ).all()
    serializer_class = VaccinationCertificateSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['status', 'vaccine']
    search_fields = ['certificate_number', 'traveler__passport_number', 'traveler__first_name', 'traveler__last_name']
    ordering_fields = ['issued_at', 'valid_until']
    ordering = ['-issued_at']

    def create(self, request, *args, **kwargs):
        # الجرعة يجب أن تكون ضمن نطاق منفذ الموظف، وإلا استطاع مُصدِّر شهادة
        # في ميناء واحد إصدار شهادة لجرعة سجّلها ميناء آخر (والعكس: رؤية
        # اسم مسافر لا ينتمي لمنفذه عبر استجابة 404/201 مقلوب).
        port_ids = resolve_user_port_ids(request.user)
        records = VaccinationRecord.objects.filter(pk=request.data.get('record'))
        if port_ids is not None:
            records = records.filter(site__entry_point__in=port_ids)
        record = records.select_related('traveler', 'vaccine').first()
        if not record:
            return Response({'status': 'error', 'message': 'سجل الجرعة غير موجود'}, status=404)
        validity_days = request.data.get('validity_days')
        try:
            cert = issue_certificate(record, request.user, validity_days=validity_days)
        except ValueError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return Response(success_response(self.get_serializer(cert).data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        """صورة QR ترمز إلى رابط التحقق الموقَّع — قابلة للمسح فعلياً."""
        cert = self.get_object()
        base = getattr(settings, 'PUBLIC_SITE_URL', '') or request.build_absolute_uri('/').rstrip('/')
        url = cert.verification_url(base=base)
        img = qrcode.make(url)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return Response(
            success_response(
                data={
                    'qr_png': base64.b64encode(buf.getvalue()).decode(),
                    'verification_url': url,
                    'signature': cert.verification_signature,
                }
            )
        )

    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke(self, request, pk=None):
        cert = self.get_object()
        ok, message = revoke_certificate(cert, request.user)
        if not ok:
            return Response({'status': 'error', 'message': message}, status=400)
        return Response(success_response(self.get_serializer(cert).data))

    @action(detail=True, methods=['post'], url_path='replace')
    def replace(self, request, pk=None):
        certificate = self.get_object()
        replacement_reason = request.data.get('replacement_reason', '')
        try:
            new_cert = replace_certificate(certificate.pk, replacement_reason, request.user)
        except ValueError as exc:
            # رفض أهلية العمل (شهادة ليست فعّالة) = 400 لا 500.
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return Response(success_response(self.get_serializer(new_cert).data))

    @action(detail=True, methods=['post'], url_path='reissue')
    def reissue(self, request, pk=None):
        certificate = self.get_object()
        try:
            new_cert = reissue_certificate(certificate.pk, request.user)
        except ValueError as exc:
            # رفض أهلية العمل (شهادة فعّالة) = 400 لا 500.
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return Response(success_response(self.get_serializer(new_cert).data))


class VaccinationRuleViewSet(VaccinationPermissionMixin, viewsets.ModelViewSet):
    """قواعد تقييم احتياج المسافر للتطعيم."""

    queryset = VaccinationRule.objects.select_related('vaccine').all()
    serializer_class = VaccinationRuleSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['vaccine', 'required']
    search_fields = ['title_ar', 'vaccine__name_ar']
    ordering = ['vaccine__name_ar']


class VaccineInventoryViewSet(VaccinationPermissionMixin, viewsets.ReadOnlyModelViewSet):
    """حركات المخزون."""

    queryset = InventoryTransaction.objects.select_related('batch__vaccine', 'created_by').all()
    serializer_class = InventoryTransactionSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['type', 'batch']
    search_fields = ['batch__lot_number', 'batch__vaccine__name_ar', 'note']
    ordering = ['-created_at']


class CertificateVerificationViewSet(VaccinationPermissionMixin, SectorScopedMixin, viewsets.ReadOnlyModelViewSet):
    """سجل عمليات التحقق من الشهادات."""

    # سجل التحقق كشفٌ تشغيلي لا يُقرأ بـ `view`؛ اشتراط `verify` يجعل
    # الصلاحية المزروعة في seed_rbac فعّالة بدل أن تكون رمزاً ميّتاً.
    action_permission_map = {'list': 'verify', 'retrieve': 'verify'}
    # فحص شهادة ميناء آخر ليس «سجل تحقق» يخصّ ميناء الموظف.
    port_field = 'certificate__record__site__entry_point'
    queryset = CertificateVerification.objects.select_related('certificate', 'verified_by').all()
    serializer_class = CertificateVerificationSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    filter_fields = ['success', 'certificate']
    ordering = ['-created_at']


class VaccinationDashboardViewSet(VaccinationPermissionMixin, SectorScopedMixin, viewsets.ReadOnlyModelViewSet):
    """إحصاءات لوحة التطعيم الدولي."""

    # اللوحة كانت تُحسب من `VaccinationRecord.objects.filter(...)` مباشرةً،
    # فمدير نقطة تطعيم يرى «جرعات اليوم» وأرقاماً وطنية تخصّ منافذ أخرى.
    # الآن يبني الـ mixin queryset مقصوصاً على نطاق المنفذ، و`list` يشتقّ
    # كل تجميعاته منه.
    port_field = 'site__entry_point'
    queryset = VaccinationRecord.objects.filter(status=VaccinationRecord.Status.GIVEN)
    serializer_class = VaccinationDashboardSerializer

    def list(self, request):
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        records = self.get_queryset()

        by_vaccine = list(
            records.filter(administered_at__gte=week_start)
            .values(label=F('vaccine__name_ar'))
            .annotate(value=Count('id'))
            .order_by('-value')[:8]
        )
        by_vaccine = [{'label': item['label'], 'value': item['value']} for item in by_vaccine]

        expiring = list(
            VaccineBatch.objects.filter(
                expiry_date__gte=today, expiry_date__lte=today + timedelta(days=60), available_quantity__gt=0
            )
            .select_related('vaccine')
            .order_by('expiry_date')[:5]
        )
        expiring_soon = [
            {
                'id': str(b.id),
                'lot_number': b.lot_number,
                'vaccine_name_ar': b.vaccine.name_ar,
                'expiry_date': b.expiry_date.isoformat(),
                'available_quantity': b.available_quantity,
            }
            for b in expiring
        ]

        recent = list(records.select_related('traveler', 'vaccine', 'batch').order_by('-created_at')[:8])
        recent_records = [
            {
                'id': str(r.id),
                'traveler_name': r.traveler.full_name,
                'passport_number': r.traveler.passport_number,
                'vaccine_code': r.vaccine.code,
                'dose_number': r.dose_number,
                'administered_at': r.administered_at.isoformat(),
                'lot_number': r.batch.lot_number if r.batch else '',
            }
            for r in recent
        ]

        # الشهادات تُقصّ على نطاق المنفذ مثل الجرعات؛ أما `batches_count`
        # و`expiring_soon_batches` فوطنيان عمداً: التشغيلة (LOT) مخزون
        # مشترك بين المنافذ ولا تُشترى أو تُسوّى منفذاً بمنفذ.
        certs = VaccinationCertificate.objects.active()
        port_ids = resolve_user_port_ids(request.user)
        if port_ids is not None:
            certs = certs.filter(record__site__entry_point__in=port_ids)

        data = {
            'doses_today': records.filter(administered_at=today).count(),
            'doses_this_week': records.filter(administered_at__gte=week_start).count(),
            'total_records': records.count(),
            'active_certificates': certs.count(),
            'batches_count': VaccineBatch.objects.filter(available_quantity__gt=0).count(),
            'expiring_soon_batches': expiring_soon,
            'by_vaccine': by_vaccine,
            'recent_records': recent_records,
        }
        return Response(success_response(VaccinationDashboardSerializer(data).data))


class PublicVaccinationVerifyView(APIView):
    """التحقق العام من شهادة التطعيم الدولية بدون تسجيل دخول."""

    authentication_classes = []
    permission_classes = [AllowAny]
    # أرقام الشهادات تسلسلية (`AFY-VAC-000001`) فتخمينُها سهل؛ تقييد
    # `anon` العام (100/دقيقة) يتيح تفحّص 40 ألف شهادة في ساعة.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'traveler_lookup'

    def get(self, request, code):
        cert = (
            VaccinationCertificate.objects.select_related('traveler', 'vaccine', 'record')
            .filter(certificate_number=code)
            .first()
        )
        if not cert:
            return Response(
                {'status': 'error', 'message': 'رقم الشهادة غير موجود'},
                status=status.HTTP_404_NOT_FOUND,
            )
        effective_status = cert.effective_status

        # NG-04 (P1.5): التوقيع **إلزامي** — فشل-إغلاق. QR بلا توقيع أو بتوقيع
        # غير صالح لا يُقبل أبداً كاعتماد شهادة صالحة. لا إدخال «يدوي» بلا
        # توقيع في مسار التحقق من QR للشهادة.
        signature = request.query_params.get('sig')
        signature_ok = cert.signature_matches(signature) if signature else False

        ip = request.META.get('REMOTE_ADDR', '')[:45]
        authenticated = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        if not signature_ok:
            CertificateVerification.objects.create(
                certificate=cert,
                verified_by=authenticated,
                success=False,
                ip_address=ip or None,
                note='توقيع رمز QR لا يطابق الشهادة — اشتباه عبث',
            )
            return Response(
                {
                    'status': 'error',
                    'message': 'توقيع رمز QR لا يطابق الشهادة — قد تكون الشهادة معدَّلة',
                    'data': {'certificate_number': cert.certificate_number, 'signature_valid': False},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        CertificateVerification.objects.create(
            certificate=cert,
            verified_by=authenticated,
            success=cert.is_valid,
            ip_address=ip or None,
            note=f'تحقق عام بالكود {code}',
        )

        payload = {
            'certificate_number': cert.certificate_number,
            'vaccine_name_ar': cert.vaccine.name_ar if cert.vaccine else '',
            'vaccine_code': cert.vaccine.code if cert.vaccine else '',
            'issued_at': cert.issued_at.isoformat(),
            'valid_until': cert.valid_until.isoformat(),
            'status': effective_status,
            'signature_valid': True,
        }
        verified = cert.is_valid
        message = 'الشهادة سارية' if verified else 'الشهادة غير سارية'
        return Response(success_response({**payload, 'verified': verified}, message=message))


class PublicVaccinationLookupView(APIView):
    """استعلام عام عما إذا كان المسافر يملك شهادة تطعيم (لموظف المنفذ)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'traveler_lookup'

    def get(self, request):
        passport = (request.query_params.get('passport') or '').strip().upper()
        traveler = Traveler.objects.filter(passport_number=passport).first()
        if not traveler:
            return Response(success_response({'traveler': None, 'message': 'لا يوجد مسافر بهذا الرقم'}))
        passport_partial = (traveler.passport_number[:4] + '*****') if traveler.passport_number else ''

        labels = []
        for c in VaccinationCertificate.objects.filter(traveler=traveler).active().select_related('vaccine'):
            labels.append(
                {
                    'vaccine_name_ar': c.vaccine.name_ar if c.vaccine else '',
                    'vaccine_code': c.vaccine.code if c.vaccine else '',
                    'valid_until': c.valid_until.isoformat(),
                    'verification_path': c.verification_path,
                }
            )
        return Response(
            success_response(
                {
                    'traveler': {
                        'full_name': traveler.full_name,
                        'passport_partial': passport_partial,
                    },
                    'certificates': labels,
                }
            )
        )