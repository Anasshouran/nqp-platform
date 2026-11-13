import json
import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.models import RoleAssignment
from apps.risk_engine.models import RiskAssessment
from apps.risk_engine.serializers import RiskAssessmentSerializer
from apps.risk_engine.services import RiskEngineService
from apps.travelers.models import Traveler
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.response import success_response

from .models import HealthScreening
from .serializers import HealthScreeningSerializer

logger = logging.getLogger(__name__)

# معلومات المرحلة M2: لا ننفّذ هنا أي خسارة في القيود. المصادقة + التفويض (RBAC)
# + نطاق الكائن (port) إلزامي — المصادقة وحدها غير كافية إطلاقاً (SEC-M0-1).
ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'scan_qr': 'view',
    'latest_risk': 'view',
    'refer': 'add',
}

# أنواع النطاق التي تحمل معرّف نقطة دخول/ميناء مباشرة.
_ENTRY_POINT_SCOPE_TYPES = {
    RoleAssignment.ScopeType.POINT,
    RoleAssignment.ScopeType.PORT,
    RoleAssignment.ScopeType.STATION,
}


class ScreeningViewSet(viewsets.ModelViewSet):
    queryset = HealthScreening.objects.select_related('traveler', 'port', 'officer').all()
    serializer_class = HealthScreeningSerializer
    http_method_names = ['get', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    ordering_fields = ['screened_at']
    filter_fields = ['port', 'traveler']

    # SEC-M0-1 remediation: RBAC (screening:*) + نطاق الـ port/entrypoint.
    # المصادقة (JWT) لم تعد كافية لوحدها — أي رمز مصادَق عليه بلا صلاحية
    # رسمية أو نطاق يُرفَض ولا يرى أي صف (فشل آمن).
    permission_resource = 'screening'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_type = RoleAssignment.ScopeType.PORT

    def get_permissions(self):
        action = self.action or 'list'
        self.permission_action = ACTION_TO_PERMISSION.get(action, 'view')
        if action in ('scan_qr', 'refer'):
            # إجراءات مخصّصة: تنتمي لعملية الفحص (view للقراءة، add للتحويل).
            self.permission_action = ACTION_TO_PERMISSION[action]
        return super().get_permissions()

    def _entry_point_ids_for(self, user):
        """يرجع معرفات منافذ الدخول المتاحة لنطاقات المستخدم (فشل آمن = قائمة فارغة)."""
        from core.utils.scoping import facility_scope_enabled, has_active_global_scope, locality_scope_enabled

        # GLOBAL scope (مدير/جهة وطنية) → كل السجلات؛ لا نُقيّد إلا بالنطاق الفعلي.
        if user.is_superuser or has_active_global_scope(user):
            return None
        scopes = user.active_scopes('screening')
        from apps.masterdata.models import EntryPoint, HealthFacility

        port_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] in _ENTRY_POINT_SCOPE_TYPES and s['scope_id'] is not None
        ]
        # M5-B-2: نطاق الولاية → كل منافذ الدخول في الولاية(ات) — اتحاد.
        state_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == RoleAssignment.ScopeType.STATE and s['scope_id'] is not None
        ]
        if state_ids:
            port_ids += list(
                EntryPoint.objects.filter(is_active=True, state_id__in=state_ids)
                .values_list('id', flat=True)
            )
        # M5-C-L: نطاق المحلية → كل منافذ الدخول في المحلية(ات) — اتحاد مع الولاية.
        # بوابة الإنتاج: في DEBUG أو مع PROD_SCOPING_ENABLED فقط؛ وإلا لا شيء (fail-safe).
        locality_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == RoleAssignment.ScopeType.LOCALITY and s['scope_id'] is not None
        ]
        if locality_ids and locality_scope_enabled():
            port_ids += list(
                EntryPoint.objects.filter(is_active=True, locality_id__in=locality_ids)
                .values_list('id', flat=True)
            )
        # M6-bis (D-M5-C-F-2): نطاق المنشأة → منفذ المنشأة عبر
        # `HealthFacility.entry_point` — اتحاد مع بقية القنوات.
        # بوابة الإنتاج: نفس بوابة LOCALITY/FACILITY (fail-safe عند الإغلاق).
        facility_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == RoleAssignment.ScopeType.FACILITY and s['scope_id'] is not None
        ]
        if facility_ids and facility_scope_enabled():
            port_ids += list(
                HealthFacility.objects
                .filter(is_active=True, id__in=facility_ids, entry_point__isnull=False)
                .values_list('entry_point_id', flat=True)
            )
        # اتحاد يبقى مع القطاع (نطاق SECTOR) والقطاع المنزلي `user.sector_id`
        # (قرار H1′ — M3/M5-A: home-sector grant بالبقية).
        sector_scope_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == RoleAssignment.ScopeType.SECTOR and s['scope_id'] is not None
        ]
        sector_ids = list(sector_scope_ids)
        home_sector = getattr(user, 'sector_id', None)
        if home_sector is not None:
            sector_ids.append(home_sector)
        sector_ids = list(dict.fromkeys(sector_ids))
        if sector_ids:
            port_ids += list(
                EntryPoint.objects.filter(is_active=True, sector_id__in=sector_ids)
                .values_list('id', flat=True)
            )
        if port_ids:
            return list(dict.fromkeys(port_ids))
        # منشأة بلا منفذ ليست خطأ: القناة المباشرة (facility) قد تفتح الصفوف
        # في `get_queryset`. لا نطلق تحذير الحجب إلا عند غياب كل قناة.
        if not (facility_ids and facility_scope_enabled()):
            logger.warning(
                'screening: no resolvable entry-point scope for %s — DENYING access', user
            )
        return []

    def _facility_ids_for(self, user):
        """معرّفات المنشآت المتاحة لنطاق FACILITY (M6-bis).

        `None` = GLOBAL (لا تقييد). `set()` = لا نطاق FACILITY أو البوابة مغلقة.
        """
        from core.utils.scoping import get_user_facility_ids

        return get_user_facility_ids(user)

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user or self.request.user.is_anonymous:
            return qs.none()
        port_ids = self._entry_point_ids_for(self.request.user)
        facility_ids = self._facility_ids_for(self.request.user)
        if port_ids is None or facility_ids is None:
            return qs
        # M6-bis: اتحاد قناتين — المعبر (port) والمنشأة المباشرة (facility).
        # الفشل الآمن يبقى: بلا أي قناة ⇒ لا صفوف.
        if not port_ids and not facility_ids:
            return qs.none()
        scope_q = Q()
        if port_ids:
            scope_q |= Q(port_id__in=port_ids)
        if facility_ids:
            scope_q |= Q(facility_id__in=facility_ids)
        return qs.filter(scope_q).distinct()

    def _assert_port_in_scope(self, port):
        """منع إنشاء فحص خارج نطاق صاحب الصلاحية (لا بوابات جانبية عبر create)."""
        if not self.request.user or self.request.user.is_anonymous:
            raise PermissionDenied('لا تملك الصلاحية لإنشاء فحص في هذا المنفذ')
        from core.utils.scoping import has_active_global_scope

        if self.request.user.is_superuser or has_active_global_scope(self.request.user):
            return
        port_ids = self._entry_point_ids_for(self.request.user)
        if port_ids is not None and str(port.pk) not in {str(pid) for pid in port_ids}:
            raise PermissionDenied('المنفذ خارج نطاق صلاحياتك')

    def create(self, request, *args, **kwargs):
        data = request.data if isinstance(request.data, dict) else {}
        port_id = data.get('port') or (data.get('port_id'))
        from apps.masterdata.models import EntryPoint
        if port_id:
            port = EntryPoint.objects.filter(id=port_id).first()
            if port is not None:
                self._assert_port_in_scope(port)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if 'port' in serializer.validated_data:
            self._assert_port_in_scope(serializer.validated_data['port'])
        screening = serializer.save()
        assessment = RiskEngineService.assess(screening)
        self._handle_assessment(screening, assessment)
        data = {
            'screening_id': str(screening.id),
            'risk_assessment': RiskAssessmentSerializer(assessment).data,
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='scan-qr')
    def scan_qr(self, request):
        raw = request.data.get('qr_data')
        if not raw:
            return Response({'status': 'error', 'message': 'qr_data مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        traveler_id = raw
        if raw.startswith('data:image') or len(raw) > 200:
            try:
                payload = json.loads(raw) if raw.startswith('{') else {}
                traveler_id = payload.get('traveler_id', raw)
            except (json.JSONDecodeError, AttributeError):
                traveler_id = raw
        try:
            traveler = Traveler.objects.get(id=traveler_id)
        except (Traveler.DoesNotExist, ValueError):
            return Response({'status': 'error', 'message': 'مسافر غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        documents_verified = traveler.documents.exists()
        data = {
            'traveler': {
                'id': str(traveler.id),
                'full_name': traveler.full_name,
                'passport_number': traveler.passport_number,
                'nationality': traveler.nationality.name_ar or traveler.nationality.name,
                'documents_verified': documents_verified,
            },
            'pre_registration': {
                'symptoms': traveler.medical_history or {},
                'travel_history': [],
            },
        }
        return Response(success_response(data))

    @action(detail=True, methods=['get'], url_path='latest-risk')
    def latest_risk(self, request, pk=None):
        screening = self.get_object()
        assessment = RiskAssessment.objects.filter(screening=screening).first()
        if not assessment:
            return Response({'status': 'error', 'message': 'لا يوجد تقييم'}, status=status.HTTP_404_NOT_FOUND)
        return Response(success_response(RiskAssessmentSerializer(assessment).data))

    @action(detail=True, methods=['post'], url_path='refer')
    def refer(self, request, pk=None):
        from apps.clinic.models import ClinicReferral
        from apps.clinic.serializers import ClinicReferralSerializer

        screening = self.get_object()
        clinic = screening.port.clinics.filter(is_active=True).first()
        referral = ClinicReferral.objects.create(
            screening=screening,
            port=screening.port,
            traveler=screening.traveler,
            clinic=clinic,
            source=ClinicReferral.Source.SCREENING,
            status=ClinicReferral.ReferralStatus.PENDING,
        )
        data = {
            'referral_id': str(referral.id),
            'clinic_visit_url': f'/api/v1/clinic/referrals/{referral.id}',
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    def _handle_assessment(self, screening, assessment):
        from django.utils import timezone

        from apps.emergency_eoc.models import EmergencyAlert, HealthCase
        from apps.emergency_eoc.services import generate_case_number, raise_single_event

        if assessment.risk_level == 'RED':
            EmergencyAlert.objects.create(
                traveler=screening.traveler,
                port=screening.port,
                alert_type=EmergencyAlert.AlertType.RED_ALERT,
                description=f'إنذار أحمر للمسافر {screening.traveler.full_name} (درجة الخطر {assessment.risk_score})',
            )
            case = HealthCase.objects.create(
                case_number=generate_case_number(),
                disease=None,
                case_type=HealthCase.CaseType.SUSPECTED,
                status=HealthCase.Status.UNDER_INVESTIGATION,
                severity=HealthCase.Severity.HIGH,
                source=HealthCase.Source.SCREENING,
                traveler=screening.traveler,
                person_name=screening.traveler.full_name if screening.traveler else '',
                nationality=screening.traveler.nationality.name if screening.traveler and screening.traveler.nationality else '',
                phone=screening.traveler.phone if screening.traveler else '',
                passport_number=screening.traveler.passport_number if screening.traveler else '',
                port=screening.port,
                sector=screening.port.sector if screening.port else None,
                locality=screening.port.locality if screening.port else None,
                reported_date=timezone.localdate(),
                symptoms=screening.observed_symptoms or [],
                reported_by=self.request.user,
            )
            raise_single_event(case)
