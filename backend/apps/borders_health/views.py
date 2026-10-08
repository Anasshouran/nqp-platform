"""العروض (Viewsets) لنظام صحة المعابر البرية.

نمط النطاق: كل نموذج يحمل `crossing` ← `BorderCrossing` ←
`masterdata.EntryPoint`. لذلك يقارن النطاق معرّفات `EntryPoint` مباشرةً،
وهو نفس فضاء المعرّفات الذي تستخدمه `ScopeType.PORT`.

تعديل المرحلة 3B: كان هذا الملف يصف نفسه بأنه يستخدم
`resolve_user_port_ids`، بينما الكود لم يكن يستدعيه إطلاقاً — فكان يقرأ
`PORT` ثم يرجع إلى قطاع كامل، ويهمل `OrgAssignment.entry_point`. الآن
`BordersHealthScopedMixin` يستدعي `resolve_authorized_entry_points` مباشرة،
وهو المحلّ المعتمد الوحيد، فلا يوجد مسار نطاق موازٍ في هذا الموديول.
"""
import logging

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.models import RoleAssignment
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.response import success_response

from .models import (
    BorderCertificate,
    BorderCrossing,
    BorderDailyStatistics,
    BorderEmergency,
    BorderFacility,
    BorderHealthIncident,
    BorderNotification,
    BorderSample,
    BorderScreening,
    BorderShift,
    BorderStaff,
    BorderDecision,
    CargoInspection,
    Contact,
    ContactTracingCase,
    HealthDeclaration,
    IsolationCase,
    QuarantineCase,
    TravelerHealthRecord,
    Vehicle,
    VehicleInspection,
)
from .serializers import (
    BorderCertificateSerializer,
    BorderCrossingSerializer,
    BorderDailyStatisticsSerializer,
    BorderDecisionSerializer,
    BorderEmergencySerializer,
    BorderFacilitySerializer,
    BorderHealthIncidentSerializer,
    BorderNotificationSerializer,
    BorderSampleSerializer,
    BorderScreeningSerializer,
    BorderShiftSerializer,
    BorderStaffSerializer,
    BordersHealthDashboardSerializer,
    CargoInspectionSerializer,
    ContactSerializer,
    ContactTracingCaseSerializer,
    HealthDeclarationSerializer,
    IsolationCaseSerializer,
    QuarantineCaseSerializer,
    TravelerHealthRecordSerializer,
    VehicleInspectionSerializer,
    VehicleSerializer,
)
from .permissions import MultiHopScopeFilter

logger = logging.getLogger(__name__)


ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    # إجراءات مخصّصة — لكل إجراء صلاحيته الخاصة. بدون هذا السجل كان
    # `.get(action, 'view')` يمنح أي دور يملك `view` حق إصدار شهادة أو
    # تغيير حالة معبر، أي تصعيد صلاحيات.
    'change_status': 'edit',        # crossings/{id}/status
    'reassess': 'health_screen',    # screenings/{id}/reassess
    'issue': 'certificate_issue',   # certificates/issue
    'decide': 'cargo_inspect',      # cargo-inspections/{id}/decide
    'refresh': 'dashboard_view',    # daily-statistics/refresh
    # لوحة القيادة للقراءة فقط.
    'overview': 'dashboard_view',
    'crossing_performance': 'dashboard_view',
    'traffic_trend': 'dashboard_view',
}


# يقيّد الوصول بصلاحيات الوحدة ثم بنطاق نقطة الدخول للمستخدم.
#
# الفشل آمن: إن لم يُحلَّد نطاق صالح يُرجَع `none()` بدل كل السجلات،
# ويُسجَّل تحذير. المسارات متعددة القيم تحتاج `scope_distinct = True`
# حتى لا يتكرّر الصف الواحد.
#
# ملاحظة: توثيق هذه الوحدة في سطر `description` لا في `__doc__`، لأن DRF
# كان يرث `__doc__` من هذا الصف ويضعه كوصف لكل نقطة نهاية في OpenAPI.
class BordersHealthScopedMixin:
    description = 'نظام صحة المعابر البرية — محصور بنطاق نقطة دخول المستخدم.'

    permission_resource = 'borders_health'
    permission_classes = [PermissionAction, MultiHopScopeFilter]
    scope_type = RoleAssignment.ScopeType.PORT
    scope_field = None
    scope_distinct = False

    def get_permissions(self):
        self.permission_action = ACTION_TO_PERMISSION.get(self.action, 'view')
        return super().get_permissions()

    def _entry_point_scope_ids(self):
        """معرّفات نقاط الدخول ضمن نطاق المستخدم.

        تفويض كامل لـ `resolve_authorized_entry_points` — المحلّ المعتمد الوحيد.
        كان هذا الموديول يحسب النطاق بنفسه: يفحص `PORT` ثم يرجع إلى قطاع
        كامل عبر `resolve_user_sector`، ولا يقرأ `OrgAssignment.entry_point`
        إطلاقاً — فلم تكن تعيينات المرحلة الثانية قابلة للتطبيق هنا، وكان
        ضابطٌ مُعيَّن إلى `EP_ARGIN` إمّا محجوباً كلياً أو يرى قطاعه كله.

        العقد محفوظ: `None` لتغطية وطنية (بلا تقييد)، وقائمة للمفلترة،
        و`[]` عند غياب النطاق ⇒ حجب كامل (فشل آمن).
        """
        from core.utils.scoping import resolve_authorized_entry_points

        return resolve_authorized_entry_points(self.request.user)

    def _scoped_crossing_ids(self):
        """معرّفات `BorderCrossing` ضمن نطاق المستخدم (فشل آمن ⇒ فارغ)."""
        user = self.request.user
        if user.is_superuser:
            return BorderCrossing.objects.values_list('id', flat=True)

        entry_point_ids = self._entry_point_scope_ids()
        if entry_point_ids is None:  # تغطية وطنية ⇒ كل المعابر
            return BorderCrossing.objects.values_list('id', flat=True)

        if not entry_point_ids:
            logger.warning(
                'BordersHealthScopedMixin: no resolvable entry-point scope for %s '
                '- DENYING aggregate', user,
            )
            return BorderCrossing.objects.none().values_list('id', flat=True)

        return BorderCrossing.objects.filter(
            entry_point_id__in=entry_point_ids
        ).values_list('id', flat=True)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        entry_point_ids = self._entry_point_scope_ids()
        if entry_point_ids is None:  # تغطية وطنية
            return qs

        if self.scope_field and entry_point_ids:
            qs = qs.filter(**{f'{self.scope_field}__in': entry_point_ids})
            return qs.distinct() if self.scope_distinct else qs

        logger.warning(
            'BordersHealthScopedMixin: no resolvable entry-point scope for %s on %s '
            '(scope_field=%s, ids=%s) - DENYING all rows',
            user, self.__class__.__name__, self.scope_field, len(entry_point_ids),
        )
        return qs.none()

    # ------------------------------------------------------------------
    # الكتابة محمية بنطاق نقطة الدخول (المرحلة 3D)
    #
    # `BordersHealthScopedMixin` هو الأساس الوحيد لكل ViewSet في الموديول،
    # فوضعه للإنفاذ هنا يغطي كل نقطة كتابة (create/update/partial_update)
    # بلا استثناء — بما فيها الفئات التي تعيد تعريف `perform_create`.
    # النمط مطابق لـ `HRWriteScopeMixin`: تقييد القائمة لوحده لا يمنع إنشاء
    # سجل أو نقله إلى معبر خارج نطاق المستخدم.
    # المحلّ المعتمد الوحيد يبقى `resolve_authorized_entry_points`، ولا
    # يعيد هذا السطر حساب PORT/SECTOR/STATION/REGION/DEPARTMENT.
    #
    # تُحدَّد نقطة الدخول التي سيرتبط بها الكائن من مفاتيح FK الحاملة للنطاق
    # في الحمولة المقدَّمة (`entry_point`/`crossing`/`vehicle`/...). أي طلب
    # بلا نقطة قابلة للحل (create) أو بنقطة خارج النطاق أو بحمولة تشير إلى
    # معبرين مختلفين ⇒ 403 قبل أي حفظ. الفشل آمن دائماً.
    # ------------------------------------------------------------------

    _SCOPE_ANCHOR_LOOKUPS = {
        # (model_to_resolve, lookup_expression_to_EntryPoint.pk)
        'entry_point': (None, 'pk'),
        'crossing': (BorderCrossing, 'entry_point_id'),
        'vehicle': (Vehicle, 'crossing__entry_point_id'),
        'tracing_case': (ContactTracingCase, 'crossing__entry_point_id'),
        'facility': (BorderFacility, 'crossing__entry_point_id'),
        'cargo_inspection': (CargoInspection, 'crossing__entry_point_id'),
        'quarantine_case': (QuarantineCase, 'crossing__entry_point_id'),
        'vehicle_inspection': (VehicleInspection, 'vehicle__crossing__entry_point_id'),
    }

    @staticmethod
    def _extract_pk(value):
        """معرّف المفتاح الأجنبي من القيمة المقدَّمة (UUID أو dict أو قائمة)."""
        if isinstance(value, dict):
            return value.get('id') or value.get('pk')
        if isinstance(value, (list, tuple)):
            return (
                BordersHealthScopedMixin._extract_pk(value[0]) if value else None
            )
        return value

    def _effective_entry_point_ids(self, data):
        """نقاط دخول الكائن المقدَّم، محلولة من مفاتيح FK الحاملة للنطاق.

        التعارض (معبران مختلفان في نفس الطلب) يبقى مكشوفاً كمجموعة متعددة
        ويُرفض في `_enforce_write_entry_point_scope`. القيمة غير القابلة
        للحل لا تُضاف — الفشل آمن في جهة الاستدعاء.
        """
        from apps.masterdata.models import EntryPoint

        ep_ids = set()
        for key, value in data.items():
            model, lookup = self._SCOPE_ANCHOR_LOOKUPS.get(key, (None, None))
            if model is None and lookup is None:
                continue
            pk = self._extract_pk(value)
            if pk is None or pk == '':
                continue
            try:
                if model is None:
                    resolved = EntryPoint.objects.filter(pk=pk).values_list(
                        'pk', flat=True
                    ).first()
                else:
                    resolved = model.objects.filter(pk=pk).values_list(
                        lookup, flat=True
                    ).first()
            except (TypeError, ValueError):
                resolved = None
            if resolved is not None:
                ep_ids.add(resolved)
        return ep_ids

    def _deny_write(self, reason):
        from rest_framework.exceptions import PermissionDenied

        logger.warning(
            'BorderHealth write denied for %s on %s: %s',
            self.request.user, self.__class__.__name__, reason,
        )
        raise PermissionDenied('لا تملك صلاحية الكتابة خارج نطاق نقاط الدخول')

    def _enforce_write_entry_point_scope(self, request, *, require_scope):
        """فرض نطاق نقطة الدخول على الحمولة قبل أي حفظ.

        - GLOBAL / superuser: غير مقيّد.
        - create (`require_scope=True`): يجب حلّ نقطة دخول واحدة على الأقل
          وتكون ضمن النطاق، وإلا 403.
        - update (`require_scope=False`): إن نُقل المسار إلى نقطة أخرى يجب
          أن تكون الوجهة ضمن النطاق؛ عدم تغيير النطاق لا يُقيّد (والكائن
          الحالي مُصرَّح به أصلاً عبر `get_object`).
        """
        user = getattr(request, 'user', None)
        if user is None or user.is_anonymous:
            self._deny_write('unauthenticated write attempt')

        from core.utils.authorization import has_active_global_scope

        if user.is_superuser or has_active_global_scope(user):
            return

        from core.utils.scoping import resolve_authorized_entry_points

        authorized = set(resolve_authorized_entry_points(user) or ())
        if not authorized:
            self._deny_write('no authorized entry-point scope')

        ep_ids = self._effective_entry_point_ids(request.data)
        if not ep_ids:
            if require_scope:
                self._deny_write('no resolvable entry point in the submitted payload')
            return

        if not ep_ids <= authorized:
            self._deny_write(
                f'submitted entry point(s) {sorted(str(i) for i in ep_ids)} '
                f'outside authorized scope {sorted(str(i) for i in authorized)}'
            )

    def create(self, request, *args, **kwargs):
        self._enforce_write_entry_point_scope(request, require_scope=True)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._enforce_write_entry_point_scope(request, require_scope=False)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._enforce_write_entry_point_scope(request, require_scope=False)
        return super().partial_update(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# المعابر والمرافق
# ---------------------------------------------------------------------------


class BorderCrossingViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderCrossing.objects.select_related('entry_point', 'entry_point__state').all()
    serializer_class = BorderCrossingSerializer
    scope_field = 'entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['entry_point__name_ar', 'entry_point__code', 'neighbor_country']
    filter_fields = ['entry_point', 'operating_status', 'border_type']
    ordering_fields = ['entry_point__name_ar', 'entry_point__code']

    @action(detail=True, methods=['patch'], url_path='status')
    def change_status(self, request, pk=None):
        """تغيير حالة تشغيل المعبر (مفتوح/مقيّد/مغلق/طوارئ)."""
        crossing = self.get_object()
        status = request.data.get('operating_status')
        valid = {c for c, _ in BorderCrossing.BorderStatus.choices}
        if status not in valid:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({'operating_status': 'حالة تشغيل غير معروفة'})
        crossing.operating_status = status
        crossing.closure_reason = request.data.get('closure_reason', crossing.closure_reason)
        crossing.save(update_fields=['operating_status', 'closure_reason', 'updated_at'])
        return Response(success_response(self.get_serializer(crossing).data))


class BorderFacilityViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderFacility.objects.select_related('crossing').all()
    serializer_class = BorderFacilitySerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en']
    filter_fields = ['crossing', 'kind', 'is_operational']
    ordering_fields = ['name_ar']


class BorderShiftViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderShift.objects.select_related('crossing', 'supervisor').all()
    serializer_class = BorderShiftSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['notes']
    filter_fields = ['crossing', 'shift_date', 'shift_type', 'is_staffed']
    ordering_fields = ['shift_date', 'shift_type']


class BorderStaffViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderStaff.objects.select_related('crossing', 'user').all()
    serializer_class = BorderStaffSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['user__full_name', 'notes']
    filter_fields = ['crossing', 'user', 'role', 'is_active']
    ordering_fields = ['role']


# ---------------------------------------------------------------------------
# المسافرون
# ---------------------------------------------------------------------------


class TravelerHealthRecordViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = TravelerHealthRecord.objects.select_related(
        'crossing', 'traveler', 'vehicle'
    ).all()
    serializer_class = TravelerHealthRecordSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__full_name', 'traveler__passport_number']
    filter_fields = ['crossing', 'traveler', 'direction', 'risk_level', 'decision']
    ordering_fields = ['entry_at', 'risk_level']


class HealthDeclarationViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = HealthDeclaration.objects.select_related('crossing', 'traveler').all()
    serializer_class = HealthDeclarationSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__full_name', 'traveler__passport_number']
    filter_fields = ['crossing', 'traveler', 'status']
    ordering_fields = ['declared_at']


class BorderScreeningViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderScreening.objects.select_related(
        'crossing', 'traveler', 'screened_by'
    ).all()
    serializer_class = BorderScreeningSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__full_name', 'traveler__passport_number']
    filter_fields = ['crossing', 'traveler', 'decision', 'risk_level']
    ordering_fields = ['screened_at']

    def perform_create(self, serializer):
        """يحسب القرار آلياً من القياسات والأعراض والوثائق."""
        from .services import assess_screening

        data = serializer.validated_data
        risk, decision = assess_screening(
            body_temperature=data.get('body_temperature'),
            oxygen_saturation=data.get('oxygen_saturation'),
            observed_symptoms=data.get('observed_symptoms'),
            document_verified=data.get('document_verified', False),
            vaccination_verified=data.get('vaccination_verified', False),
        )
        serializer.save(risk_level=risk, decision=decision)

    @action(detail=True, methods=['post'], url_path='reassess')
    def reassess(self, request, pk=None):
        """يعيد حساب القرار من القياسات والأعراض دون تعديل يدوي."""
        from .services import apply_screening_decision

        screening = self.get_object()
        for field in ('body_temperature', 'oxygen_saturation', 'observed_symptoms',
                      'document_verified', 'vaccination_verified'):
            if field in request.data:
                setattr(screening, field, request.data[field])
        apply_screening_decision(screening)
        screening.save(update_fields=[
            'body_temperature', 'oxygen_saturation', 'observed_symptoms',
            'document_verified', 'vaccination_verified', 'risk_level',
            'decision', 'updated_at',
        ])
        return Response(success_response(self.get_serializer(screening).data))


# ---------------------------------------------------------------------------
# المركبات
# ---------------------------------------------------------------------------


class VehicleViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related('crossing').all()
    serializer_class = VehicleSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['plate_number', 'chassis_number', 'driver_name', 'owner_name']
    filter_fields = ['crossing', 'vehicle_type', 'status']
    ordering_fields = ['plate_number', 'created_at']


class VehicleInspectionViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = VehicleInspection.objects.select_related('vehicle', 'inspector').all()
    serializer_class = VehicleInspectionSerializer
    scope_field = 'vehicle__crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vehicle__plate_number', 'findings']
    filter_fields = ['vehicle', 'inspection_type', 'overall_status']
    ordering_fields = ['inspection_date']


# ---------------------------------------------------------------------------
# الشحنات
# ---------------------------------------------------------------------------


class CargoInspectionViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = CargoInspection.objects.select_related(
        'crossing', 'vehicle', 'facility', 'food_shipment'
    ).all()
    serializer_class = CargoInspectionSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['declaration_number', 'product_type', 'country_of_origin']
    filter_fields = ['crossing', 'scope', 'status', 'decision', 'country_of_origin']
    ordering_fields = ['created_at', 'status']

    @action(detail=True, methods=['post'], url_path='decide')
    def decide(self, request, pk=None):
        """يحسب قرار الشحنة من عيّناتها، أو يثبّت قرار الفاحص الصريح."""
        from rest_framework.exceptions import ValidationError

        from .services import assess_cargo_inspection

        inspection = self.get_object()
        explicit = request.data.get('decision')
        valid = {c for c, _ in CargoInspection.Outcome.choices}
        if explicit is not None and explicit not in valid:
            raise ValidationError({'decision': 'قرار غير معروف'})

        outcome = explicit or assess_cargo_inspection(inspection)
        inspection.decision = outcome
        inspection.decided_by = request.user
        inspection.decided_at = timezone.now()
        if outcome == CargoInspection.Outcome.REJECTED:
            inspection.status = CargoInspection.Status.REJECTED
        elif outcome == CargoInspection.Outcome.CLEARED:
            inspection.status = CargoInspection.Status.RELEASED
        elif outcome == CargoInspection.Outcome.HOLD:
            inspection.status = CargoInspection.Status.AWAITING_DECISION
        inspection.save(update_fields=[
            'decision', 'decided_by', 'decided_at', 'status', 'updated_at',
        ])
        return Response(success_response(self.get_serializer(inspection).data))


class BorderSampleViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderSample.objects.select_related(
        'crossing', 'vehicle', 'collected_by'
    ).all()
    serializer_class = BorderSampleSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['sample_code', 'sample_type']
    filter_fields = ['crossing', 'cargo_inspection', 'vehicle', 'status']
    ordering_fields = ['collected_at']


# ---------------------------------------------------------------------------
# الحجر والعزل
# ---------------------------------------------------------------------------


class QuarantineCaseViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = QuarantineCase.objects.select_related('crossing', 'traveler', 'disease').all()
    serializer_class = QuarantineCaseSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['case_number', 'person_name']
    filter_fields = ['crossing', 'traveler', 'disease', 'status', 'phase']
    ordering_fields = ['entry_at', 'status']


class IsolationCaseViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = IsolationCase.objects.select_related('crossing', 'quarantine_case').all()
    serializer_class = IsolationCaseSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['notes']
    filter_fields = ['crossing', 'quarantine_case', 'status']
    ordering_fields = ['start_date', 'status']


# ---------------------------------------------------------------------------
# تتبع المخالطين
# ---------------------------------------------------------------------------


class ContactTracingCaseViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = ContactTracingCase.objects.select_related('crossing', 'vehicle').all()
    serializer_class = ContactTracingCaseSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['index_case_name', 'transport_mode']
    filter_fields = ['crossing', 'case', 'status', 'transport_mode']
    ordering_fields = ['started_at']


class ContactViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = Contact.objects.select_related(
        'tracing_case', 'tracing_case__crossing'
    ).all()
    serializer_class = ContactSerializer
    scope_field = 'tracing_case__crossing__entry_point'
    scope_distinct = True
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'passport_number', 'phone']
    filter_fields = ['tracing_case', 'status']
    ordering_fields = ['full_name', 'status']


# ---------------------------------------------------------------------------
# الطوارئ والحوادث
# ---------------------------------------------------------------------------


class BorderHealthIncidentViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderHealthIncident.objects.select_related('crossing').all()
    serializer_class = BorderHealthIncidentSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'description']
    filter_fields = ['crossing', 'severity', 'status']
    ordering_fields = ['reported_at']


class BorderEmergencyViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderEmergency.objects.select_related('crossing', 'disease').all()
    serializer_class = BorderEmergencySerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'description']
    filter_fields = ['crossing', 'restriction_level', 'status', 'disease']
    ordering_fields = ['reported_at']


# ---------------------------------------------------------------------------
# الشهادات والقرارات والإشعارات والإحصاءات
# ---------------------------------------------------------------------------


class BorderCertificateViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderCertificate.objects.select_related(
        'crossing', 'traveler', 'vehicle', 'issued_by'
    ).all()
    serializer_class = BorderCertificateSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['certificate_number']
    filter_fields = ['crossing', 'traveler', 'vehicle', 'certificate_type', 'status']
    ordering_fields = ['issue_date', 'status']

    @action(detail=False, methods=['post'], url_path='issue')
    def issue(self, request):
        """يُصدر شهادة برقم ومحتوى QR مولَّدين من الخادم."""
        from rest_framework.exceptions import ValidationError

        from .services import issue_certificate

        crossing_id = request.data.get('crossing')
        cert_type = request.data.get('certificate_type')
        if not crossing_id or not cert_type:
            raise ValidationError(
                {'crossing': 'مطلوب', 'certificate_type': 'مطلوب'}
            )
        crossing = BorderCrossing.objects.filter(
            id__in=self._scoped_crossing_ids(), pk=crossing_id
        ).first()
        if crossing is None:
            raise ValidationError({'crossing': 'معبر غير موجود في نطاقك'})

        try:
            expiry_days = int(request.data.get('expiry_days', 30))
        except (TypeError, ValueError):
            raise ValidationError({'expiry_days': 'عدد أيام غير صحيح'})

        # المفاتيح الأجنبية تُسلَّم كنصوص من العميل ⇒ تُحلّ لكائنات هنا.
        # يجب أن تكون كل الكيانات داخل **نفس المعبر** المطلوب، وإلا الختم
        # سيربط شهادة بمركبة/تفتيش من معبر آخر (تسريب عبر النطاق).
        def _resolve(model, value, label, scope_qs=None, crossing_of=None):
            if not value:
                return None
            qs = scope_qs if scope_qs is not None else model.objects.all()
            obj = qs.filter(pk=value).first()
            if obj is None:
                raise ValidationError({label: 'غير موجود في نطاقك'})
            if crossing_of is not None and crossing_of(obj) != crossing.id:
                raise ValidationError(
                    {label: f'يجب أن ينتمي إلى المعبر {crossing}'}
                )
            return obj

        from apps.travelers.models import Traveler as _Traveler

        from .models import Vehicle as _Vehicle, VehicleInspection as _VehicleInspection

        scoped_vehicles = _Vehicle.objects.filter(crossing=crossing)
        scoped_inspections = _VehicleInspection.objects.filter(
            vehicle__in=scoped_vehicles
        )

        certificate = issue_certificate(
            crossing=crossing,
            certificate_type=cert_type,
            traveler=_resolve(
                _Traveler, request.data.get('traveler'), 'traveler',
            ),
            vehicle=_resolve(
                _Vehicle, request.data.get('vehicle'), 'vehicle',
                scope_qs=scoped_vehicles,
                crossing_of=lambda v: v.crossing_id,
            ),
            vehicle_inspection=_resolve(
                _VehicleInspection, request.data.get('vehicle_inspection'),
                'vehicle_inspection',
                scope_qs=scoped_inspections,
                crossing_of=lambda i: i.vehicle.crossing_id,
            ),
            issued_by=request.user,
            expiry_days=expiry_days,
            notes=request.data.get('notes', ''),
        )
        return Response(
            success_response(self.get_serializer(certificate).data),
            status=status.HTTP_201_CREATED,
        )


class BorderDecisionViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderDecision.objects.select_related('crossing', 'traveler', 'vehicle').all()
    serializer_class = BorderDecisionSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['reason', 'subject_type']
    filter_fields = ['crossing', 'traveler', 'vehicle', 'outcome']
    ordering_fields = ['decided_at']


class BorderNotificationViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderNotification.objects.select_related('crossing', 'sent_by').all()
    serializer_class = BorderNotificationSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'body', 'recipient_role']
    filter_fields = ['crossing', 'channel', 'status']
    ordering_fields = ['created_at']


class BorderDailyStatisticsViewSet(BordersHealthScopedMixin, viewsets.ModelViewSet):
    queryset = BorderDailyStatistics.objects.select_related('crossing').all()
    serializer_class = BorderDailyStatisticsSerializer
    scope_field = 'crossing__entry_point'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['crossing', 'stat_date']
    ordering_fields = ['stat_date']

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh(self, request):
        """يعيد حساب حصيلة معبر (أو كل معابر النطاق) ليوم محدّد."""
        from datetime import date as _date

        from rest_framework.exceptions import ValidationError

        from .services import refresh_daily_statistics

        raw_date = request.data.get('stat_date')
        stat_date = None
        if raw_date:
            try:
                stat_date = _date.fromisoformat(raw_date)
            except ValueError:
                raise ValidationError({'stat_date': 'تاريخ غير صحيح (YYYY-MM-DD)'})

        crossing_id = request.data.get('crossing')
        crossing_ids = list(self._scoped_crossing_ids())
        if crossing_id:
            crossing_ids = [c for c in crossing_ids if str(c) == str(crossing_id)]
            if not crossing_ids:
                raise ValidationError({'crossing': 'معبر غير موجود في نطاقك'})
        crossings = BorderCrossing.objects.filter(id__in=crossing_ids)

        rows = [
            self.get_serializer(refresh_daily_statistics(c, stat_date)).data
            for c in crossings
        ]
        return Response(success_response({'results': rows, 'count': len(rows)}))


# ---------------------------------------------------------------------------
# لوحة القيادة القومية — Border Health Command Center
# ---------------------------------------------------------------------------


class BordersHealthDashboardViewSet(BordersHealthScopedMixin, viewsets.ViewSet):
    """ملخص وطني مجمّع عبر نقاط الدخول على نطاق المستخدم."""

    serializer_class = BordersHealthDashboardSerializer

    def _base(self):
        """نطاق المعابر المسموح بها لهذا المستخدم."""
        return BorderCrossing.objects.filter(id__in=self._scoped_crossing_ids())

    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        from django.utils import timezone

        crossings = self._base()
        ids = list(crossings.values_list('id', flat=True))
        today = timezone.localdate()

        open_status = BorderCrossing.BorderStatus.OPEN
        restricted = [
            BorderCrossing.BorderStatus.RESTRICTED,
            BorderCrossing.BorderStatus.LIMITED,
            BorderCrossing.BorderStatus.EMERGENCY,
        ]

        records = TravelerHealthRecord.objects.filter(crossing_id__in=ids, entry_at__date=today)
        vehicles = VehicleInspection.objects.filter(
            vehicle__crossing_id__in=ids, inspection_date__date=today
        )
        cargo = CargoInspection.objects.filter(crossing_id__in=ids, created_at__date=today)

        data = {
            'crossings': crossings.count(),
            'open_crossings': crossings.filter(operating_status=open_status).count(),
            'restricted_crossings': crossings.filter(
                operating_status__in=restricted
            ).count(),
            'closed_crossings': crossings.filter(
                operating_status=BorderCrossing.BorderStatus.CLOSED
            ).count(),
            'travelers_today': records.count(),
            'vehicles_inspected': vehicles.count(),
            'cargo_inspections': cargo.count(),
            'active_quarantine': QuarantineCase.objects.filter(
                crossing_id__in=ids,
                status=QuarantineCase.QuarantineStatus.UNDER_QUARANTINE,
            ).count(),
            'active_isolation': IsolationCase.objects.filter(
                crossing_id__in=ids, status=IsolationCase.IsolationStatus.ACTIVE
            ).count(),
            'suspected_cases': TravelerHealthRecord.objects.filter(
                crossing_id__in=ids, risk_level=TravelerHealthRecord.RiskLevel.RED
            ).count(),
            'open_emergencies': BorderEmergency.objects.filter(
                crossing_id__in=ids,
                status__in=[BorderEmergency.EmergencyStatus.OPEN,
                            BorderEmergency.EmergencyStatus.ACTIVE],
            ).count(),
            'certificates_issued': BorderCertificate.objects.filter(
                crossing_id__in=ids, issue_date=today
            ).count(),
            'samples_collected': BorderSample.objects.filter(
                crossing_id__in=ids, collected_at__date=today
            ).count(),
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='crossing-performance')
    def crossing_performance(self, request):
        """أداء كل معبر — يخدم لوحة القيادة القومية ومقارنة المعابر."""
        crossings = self._base()
        rows = (
            crossings
            .annotate(
                records_count=Count('traveler_records', distinct=True),
                vehicle_inspections_count=Count(
                    'vehicles__inspections', distinct=True
                ),
                cargo_count=Count('cargo_inspections', distinct=True),
                quarantine_count=Count(
                    'quarantine_cases', filter=Q(
                        quarantine_cases__status=QuarantineCase.QuarantineStatus.UNDER_QUARANTINE
                    ), distinct=True
                ),
            )
            .values(
                'id', 'entry_point__code', 'entry_point__name_ar',
                'operating_status', 'neighbor_country',
                'records_count', 'vehicle_inspections_count', 'cargo_count',
                'quarantine_count',
            )
        )
        return Response(success_response({'results': list(rows), 'count': len(rows)}))

    @action(detail=False, methods=['get'], url_path='traffic-trend')
    def traffic_trend(self, request):
        """اتجاه الحركة اليومية لـ N يوماً من إحصاءات المعابر."""
        from datetime import timedelta

        from django.utils import timezone

        days = min(int(request.query_params.get('days', 7)), 90)
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        ids = list(self._scoped_crossing_ids())

        rows = (
            BorderDailyStatistics.objects.filter(
                crossing_id__in=ids, stat_date__gte=start
            )
            .values('stat_date')
            .annotate(
                inbound=Sum('travelers_inbound'),
                outbound=Sum('travelers_outbound'),
                vehicles=Sum('vehicles_inspected'),
                cargo=Sum('cargo_inspections'),
                samples=Sum('samples_collected'),
            )
            .order_by('stat_date')
        )
        return Response(success_response({'results': list(rows), 'count': len(rows)}))
