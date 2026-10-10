import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from apps.accounts.models import RoleAssignment
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.response import success_response
from core.utils.scoping import CompanyPortScopedMixin, resolve_combined_scope_ids

from . import scoping as ph_scoping
from .models import (
    Berth,
    CargoInspection,
    CrewMember,
    FoodWaterInspection,
    HealthCertificate,
    HealthDeclaration,
    IsolationRecord,
    Passenger,
    PortEmergency,
    SanitationCertificate,
    SeaPort,
    ShipInspection,
    SurveillanceCase,
    VectorControl,
    Vessel,
    VesselVisit,
    WasteInspection,
)
from .serializers import (
    BerthSerializer,
    CargoInspectionSerializer,
    CrewMemberSerializer,
    FoodWaterInspectionSerializer,
    HealthCertificateSerializer,
    HealthDeclarationSerializer,
    IsolationRecordSerializer,
    PassengerSerializer,
    PortEmergencySerializer,
    PortHealthDashboardSerializer,
    SanitationCertificateSerializer,
    SeaPortSerializer,
    ShipInspectionSerializer,
    SurveillanceCaseSerializer,
    VectorControlSerializer,
    VesselSerializer,
    VesselVisitSerializer,
    WasteInspectionSerializer,
)


ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


class PortHealthScopedMixin:
    """يقيّد الوصول بناءً على صلاحيات الوحدة ثم نطاق (الميناء) للمستخدم.

    بعد الترحيل إلى الربط القياسي بـ masterdata.EntryPoint (Phase 0B)، أصبحت كل
    النطاقات تُحل عبر `entry_point_id` (معرّف EntryPoint الكانونيكي) بدلاً من
    `SeaPort.id` المحلي.

    خرائط المسارات الجديدة:
    - `entry_point_id` للـ SeaPort نفسه.
    - `port__entry_point_id` عند وجود علاقة مباشرة Berth/VesselVisit/PortEmergency.
    - `visit__port__entry_point_id` للسجلات المرتبطة بزيارة سفينة.
    - `vessel__visits__port__entry_point_id` للسجلات المرتبطة بالسفينة فقط
      (مسار متعدد القيم، فيلزم `scope_distinct = True`).
    - `Vessel` الآن له مسار عبر الزيارات: `visits__port__entry_point_id`.
    """

    permission_resource = 'port_health'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_type = RoleAssignment.ScopeType.PORT
    scope_field = None
    scope_distinct = False

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser:
            return qs
        field = self._scoped_field()
        scopes = user.active_scopes(self.permission_resource)
        port_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == self.scope_type and s['scope_id'] is not None
        ]
        if not port_ids:
            from core.utils.scoping import resolve_user_sector

            sector = resolve_user_sector(user)
            if sector is not None:
                from core.utils.ports import sector_entry_points

                port_ids = [
                    str(pid)
                    for pid in sector_entry_points(sector).values_list('id', flat=True)
                ]
        if field and port_ids:
            qs = qs.filter(**{f'{field}__in': port_ids})
            # المسارات متعددة القيم (`vessel__visits__port__entry_point_id` إلخ) تكرّر الصفوف.
            return qs.distinct() if self.scope_distinct else qs
        # فشل آمن: لا توجد منافذ على نطاق المستخدم، أو scope_field غير مضبوط،
        # أو الفلترة الفاشلة أدناه — في كل الحالات نُرجع لا شيء بدل كل السجلات.
        logger.warning(
            'PortHealthScopedMixin: no resolvable port scope for %s on %s '
            '(scope_field=%s, port_ids=%s) - DENYING all rows',
            user, self.__class__.__name__, self.scope_field, len(port_ids),
        )
        return qs.none()

    def _scoped_field(self):
        """حقل النطاق الفعلي، مع مسار احتياطي عبر علاقة الميناء."""
        if self.scope_field:
            return self.scope_field
        model = getattr(self, 'queryset', None)
        model = getattr(model, 'model', None)
        if model is not None and any(f.name == 'port' for f in model._meta.get_fields()):
            return 'port__entry_point_id'
        return None


class PortHealthPermissionMixin:
    """Permission plumbing shared by Port Health viewsets.

    Provides the action -> permission mapping (``PermissionAction``) and the
    ``scope_field`` used by ``ScopeFilter`` for object-level checks.

    Split out from :class:`PortHealthScopedMixin` so viewsets that need combined
    PORT + COMPANY queryset scoping can reuse the permission behaviour without
    inheriting a ``get_queryset`` that denies users lacking a PORT scope.
    """

    permission_resource = 'port_health'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_type = RoleAssignment.ScopeType.PORT
    scope_field = None
    scope_distinct = False

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def _scoped_field(self):
        """حقل النطاق الفعلي، مع مسار احتياطي عبر علاقة الميناء."""
        if self.scope_field:
            return self.scope_field
        model = getattr(getattr(self, 'queryset', None), 'model', None)
        if model is not None and any(f.name == 'port' for f in model._meta.get_fields()):
            return 'port__entry_point_id'
        return None


class PortHealthWriteScopeMixin:
    """Authorise writes whose parent objects were supplied by the client.

    Phase 1D-2. DRF never consults object-level permissions on ``create``, so a
    Port Health user could ``POST`` a declaration / inspection / certificate /
    **isolation** / **emergency** against a vessel or port belonging to another
    entry point. ``ScopeFilter`` only protects rows that already exist, and
    ``get_queryset`` only filters reads.

    This mixin closes that hole *before* anything is persisted:

    1. resolve each supplied parent to its canonical ``EntryPoint``
       (see :mod:`apps.port_health.scoping`);
    2. compare against the caller's scope — an unresolvable parent means DENY,
       never "unrestricted";
    3. reject parents that disagree with each other;
    4. only then ``save()`` and write the audit row.

    Subclasses declare which of their own fields are client-supplied parents via
    :attr:`parent_fields`; nothing is inferred from field names.
    """

    #: Serializer/model fields a client may supply that anchor the record to a
    #: port call. Resolved through ``scoping.PARENT_RESOLVERS``.
    parent_fields = ()

    #: ``ShippingAuditLog.object_type`` for lifecycle audit rows.
    audit_object_type = None

    def _audit_action(self, action):
        from apps.shipping.models import ShippingAuditLog

        return {
            'create': ShippingAuditLog.Action.CREATE,
            'update': ShippingAuditLog.Action.UPDATE,
            'partial_update': ShippingAuditLog.Action.UPDATE,
            'destroy': ShippingAuditLog.Action.DELETE,
        }.get(action, ShippingAuditLog.Action.UPDATE)

    def _audit(self, action, instance, detail=None):
        if not self.audit_object_type:
            return
        ph_scoping.audit_port_health(
            self.request,
            action=self._audit_action(action),
            instance=instance,
            object_type=self.audit_object_type,
            detail=detail,
        )

    def _extra_save_kwargs(self, serializer):
        """Server-computed values to inject on save.

        Subclasses override this instead of `perform_create`/`perform_update`,
        so the parent-scope and consistency checks above can never be bypassed
        by accident.
        """
        return {}

    def perform_create(self, serializer):
        """Persist the record and its audit row in ONE transaction (D-2).

        Sequence: build prospective → scope → consistency → save → audit.
        Nothing is persisted before authorisation passes, and if the audit
        write fails the state change is rolled back with it.
        """
        # `validated_data` already resolved the FKs; build an *unsaved*
        # instance so the parent/consistency checks inspect exactly what would
        # be written — nothing is persisted before authorisation passes.
        prospective = serializer.Meta.model(**serializer.validated_data)
        ph_scoping.assert_parents_in_scope(
            self.request.user, prospective, self.parent_fields,
        )
        ph_scoping.assert_parents_consistent(prospective, serializer.Meta.model)
        with transaction.atomic():
            saved = serializer.save(**self._extra_save_kwargs(serializer))
            self._audit('create', saved)

    def perform_update(self, serializer):
        """Same sequence as create, with the D-1 scope check on the NEW parents.

        D-1 (Phase 1D-7): `get_object()` only proves the *current* parents are
        in scope. A PATCH may also re-parent the record (`vessel`/`visit` are
        writable), so the **prospective** parents must be re-checked here —
        otherwise a Port A officer could move a record (and a REJECTED status,
        which blocks clearance) onto Port B's port call.
        """
        instance = serializer.instance
        merged = {
            field.name: getattr(instance, field.name)
            for field in instance._meta.fields
        }
        merged.update(serializer.validated_data)
        prospective = instance.__class__(**merged)
        ph_scoping.assert_parents_in_scope(
            self.request.user, prospective, self.parent_fields,
        )
        ph_scoping.assert_parents_consistent(prospective, serializer.Meta.model)
        with transaction.atomic():
            saved = serializer.save(**self._extra_save_kwargs(serializer))
            self._audit('update', saved)

    def perform_destroy(self, instance):
        with transaction.atomic():
            self._audit('destroy', instance)
            instance.delete()


class SeaPortViewSet(PortHealthScopedMixin, viewsets.ModelViewSet):
    queryset = SeaPort.objects.all()
    serializer_class = SeaPortSerializer
    scope_field = 'entry_point_id'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en']
    filter_fields = ['is_active']
    ordering_fields = ['code', 'name_ar']


class BerthViewSet(PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'port__entry_point_id'

    queryset = Berth.objects.select_related('port', 'port__entry_point').all()
    serializer_class = BerthSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar']
    filter_fields = ['port', 'is_active']
    ordering_fields = ['code']


class VesselViewSet(CompanyPortScopedMixin, PortHealthPermissionMixin, viewsets.ModelViewSet):

    #: `CompanyPortScopedMixin` (queryset) and `ScopeFilter` (object) both need
    #: the canonical EntryPoint path; they read different attribute names.
    port_field = 'visits__port__entry_point_id'
    company_field = 'company_id'
    scope_field = 'visits__port__entry_point_id'
    scope_distinct = True

    queryset = Vessel.objects.all()
    serializer_class = VesselSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel_name', 'imo_number', 'flag_state', 'shipping_company']
    filter_fields = ['status', 'vessel_type', 'flag_state']
    ordering_fields = ['vessel_name', 'arrival_date']


class VesselVisitViewSet(CompanyPortScopedMixin, PortHealthPermissionMixin, viewsets.ModelViewSet):
    """VesselVisit viewset with combined company + port scoping (Phase 1A.1).

    Company (COMPANY) scope is applied *in addition to* the Phase 0B geographic
    port scope, never instead of it:

    - Port Health officer (PORT scope only) -> EntryPoint scoping, unchanged.
    - Shipping company rep (COMPANY scope only) -> Carrier scoping.
    - Both -> intersection (AND).
    - superuser / GLOBAL -> unrestricted.

    Company ownership resolves through the canonical
    ``VesselVisit -> Vessel.company`` path; no duplicated company field is
    introduced on VesselVisit.
    """

    port_field = 'port__entry_point_id'
    company_field = 'vessel__company_id'
    scope_field = 'port__entry_point_id'

    queryset = VesselVisit.objects.select_related('vessel', 'vessel__company', 'port', 'port__entry_point', 'berth').all()
    serializer_class = VesselVisitSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['port', 'vessel', 'status', 'berth']
    ordering_fields = ['arrival_date']


class CrewMemberViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'CrewMember'

    queryset = CrewMember.objects.select_related('vessel').all()
    serializer_class = CrewMemberSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'passport_number', 'nationality']
    filter_fields = ['vessel', 'health_status']
    ordering_fields = ['full_name']


class PassengerViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'Passenger'

    queryset = Passenger.objects.select_related('vessel').all()
    serializer_class = PassengerSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'passport_number', 'nationality']
    filter_fields = ['vessel', 'health_status']
    ordering_fields = ['full_name']


class HealthDeclarationViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    """Maritime Declaration of Health with a server-enforced lifecycle.

    Phase 1D-6B. ``status`` moves only through the explicit actions below:

        RECEIVED --submit-review--> REVIEWED --approve--> APPROVED (terminal)
                                          \\--reject----> REJECTED (terminal)

    ``REJECTED`` is terminal by design: re-submission creates a **new**
    declaration so the rejection, its reason and its audit trail stay immutable.
    """

    scope_field = 'visit__port__entry_point_id'
    parent_fields = ('vessel', 'visit')
    audit_object_type = 'HealthDeclaration'

    #: Lifecycle actions need edit rights; reads/creates keep the default mapping.
    action_permission_map = {
        'submit_review': 'edit',
        'approve': 'edit',
        'reject': 'edit',
    }

    queryset = HealthDeclaration.objects.select_related('vessel', 'visit', 'visit__port', 'visit__port__entry_point').all()
    serializer_class = HealthDeclarationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'captain_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['declaration_date', 'created_at']

    def _extra_save_kwargs(self, serializer):
        # A declaration always starts RECEIVED. The serializer already refuses a
        # client-supplied status, so this is belt-and-braces. Injected through the
        # mixin hook so the Phase 1D-2 parent-scope and parent-consistency checks
        # still run on every create.
        return {'status': HealthDeclaration.DeclarationStatus.RECEIVED}

    # -- lifecycle transitions ---------------------------------------------

    def _transition(self, target, request, **extra):
        """Apply one lifecycle transition atomically, under a row lock.

        ``select_for_update()`` serialises concurrent transitions, so two racing
        review/approve/reject requests cannot both succeed: the loser re-reads
        the already-changed state and is rejected with 400.

        Phase 1D-6B-R1 (fixes 1D-6C findings C-1 and C-3): the audit INSERT now
        happens **inside** the same ``transaction.atomic()`` block as the state
        mutation, so a failing audit rolls the whole transition back instead of
        leaving an unaudited status change committed. ``from_status`` is read
        from the locked row rather than the earlier unlocked instance, so the
        audit always records the status actually observed under the lock.
        """
        from django.db import transaction

        from apps.shipping.models import ShippingAuditLog

        declaration = self.get_object()
        with transaction.atomic():
            locked = (
                HealthDeclaration.objects
                .select_for_update()
                .select_related('vessel')
                .get(pk=declaration.pk)
            )
            # Captured under the lock, before any mutation (C-3).
            from_status = locked.status
            if not locked.can_transition_to(target):
                raise ValidationError({
                    'status': (
                        f'انتقال غير مسموح من «{locked.get_status_display()}» '
                        f'إلى «{dict(HealthDeclaration.DeclarationStatus.choices)[target]}».'
                    )
                })
            fields = ['status', 'updated_at', 'reviewed_by', 'reviewed_at']
            locked.status = target
            locked.reviewed_by = request.user if getattr(request.user, 'pk', None) else None
            locked.reviewed_at = timezone.now()
            for field, value in extra.items():
                setattr(locked, field, value)
                if field not in fields:
                    fields.append(field)
            locked.save(update_fields=fields)

            # Audit inside the transaction (C-1): if this raises, the status and
            # reviewer mutations above are rolled back with it.
            detail = {'from_status': from_status, 'to_status': target}
            for key in ('note', 'rejection_reason'):
                value = extra.get(key)
                if value:
                    detail[key] = value
            ph_scoping.audit_port_health(
                request,
                action=ShippingAuditLog.Action.STATUS_CHANGE,
                instance=locked,
                object_type=self.audit_object_type,
                detail=detail,
            )

        return Response(success_response(self.get_serializer(locked).data))

    @action(detail=True, methods=['post'], url_path='submit-review')
    def submit_review(self, request, pk=None):
        """RECEIVED -> REVIEWED."""
        return self._transition(HealthDeclaration.DeclarationStatus.REVIEWED, request)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """REVIEWED -> APPROVED."""
        return self._transition(HealthDeclaration.DeclarationStatus.APPROVED, request)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """REVIEWED -> REJECTED. A non-blank reason is mandatory."""
        reason = (request.data.get('rejection_reason') or '').strip()
        if not reason:
            raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب.'})
        return self._transition(
            HealthDeclaration.DeclarationStatus.REJECTED, request,
            rejection_reason=reason,
        )


class ShipInspectionViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    """Port-health inspection whose verdict is derived from the eight zones.

    Phase 1D-6B. ``overall_status`` is never accepted from a client; the
    serializer's fail-closed truth table decides it.
    """

    scope_field = 'visit__port__entry_point_id'
    parent_fields = ('vessel', 'visit')
    audit_object_type = 'ShipInspection'

    queryset = ShipInspection.objects.select_related('vessel', 'visit', 'visit__port', 'visit__port__entry_point', 'inspector').all()
    serializer_class = ShipInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['vessel', 'overall_status', 'certificate_issued']
    ordering_fields = ['inspection_date', 'created_at']

    #: Frozen Phase 1D-6A derivation.
    @staticmethod
    def derive_overall_status(values):
        """Return the derived verdict, or raise for an unresolved combination.

        Rule 1: any ``NON_COMPLIANT`` -> ``FAILED`` (highest precedence).
        Rule 2: all eight ``COMPLIANT`` -> ``PASSED``.
        Rule 3: any ``NOT_APPLICABLE`` without ``NON_COMPLIANT`` -> reject.
        Rule 4: anything else -> reject (fail closed).
        """
        compliance = ShipInspection.Compliance
        if any(v == compliance.NON_COMPLIANT for v in values.values()):
            return ShipInspection.OverallStatus.FAILED
        if any(v == compliance.NOT_APPLICABLE for v in values.values()):
            raise ValidationError({
                'zones': (
                    'تحديد أي منطقة كـ «غير متاح» غير مدعوم حالياً؛ استنتاج النتيجة '
                    'يتطلب تصنيفاً قاطعاً لكل المناطق الثماني.'
                )
            })
        if all(v == compliance.COMPLIANT for v in values.values()):
            return ShipInspection.OverallStatus.PASSED
        raise ValidationError({'zones': 'تركيبة مناطق فحص غير معروفة؛ تم رفضها احتياطياً.'})

    def _zone_values(self, serializer):
        instance = getattr(serializer, 'instance', None)
        values = {}
        for field in ShipInspectionSerializer.ZONE_FIELDS:
            if field in serializer.validated_data:
                values[field] = serializer.validated_data[field]
            elif instance is not None:
                values[field] = getattr(instance, field)
        return values

    def _extra_save_kwargs(self, serializer):
        """Derive the verdict from the zone set (create *and* zone PATCH).

        Injected through the mixin hook so the Phase 1D-2 parent-scope and
        parent-consistency checks still run on every write.
        """
        return {
            'overall_status': self.derive_overall_status(self._zone_values(serializer)),
        }


class FoodWaterInspectionViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'FoodWaterInspection'

    queryset = FoodWaterInspection.objects.select_related('vessel', 'inspector').all()
    serializer_class = FoodWaterInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['vessel', 'sample_status']
    ordering_fields = ['inspection_date']


class SanitationCertificateViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel', 'inspection')
    audit_object_type = 'SanitationCertificate'

    queryset = SanitationCertificate.objects.select_related('vessel', 'inspection').all()
    serializer_class = SanitationCertificateSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['certificate_number', 'vessel__vessel_name']
    filter_fields = ['vessel', 'certificate_type', 'status']
    ordering_fields = ['issue_date']


class IsolationRecordViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'IsolationRecord'

    queryset = IsolationRecord.objects.select_related('vessel').all()
    serializer_class = IsolationRecordSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['person_name', 'vessel__vessel_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['start_date']


class SurveillanceCaseViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'SurveillanceCase'

    queryset = SurveillanceCase.objects.select_related('vessel').all()
    serializer_class = SurveillanceCaseSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['disease_name', 'person_name', 'vessel__vessel_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['report_date']


class VectorControlViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'VectorControl'

    queryset = VectorControl.objects.select_related('vessel').all()
    serializer_class = VectorControlSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'campaign_name']
    filter_fields = ['vessel', 'control_type']
    ordering_fields = ['inspection_date']


class CargoInspectionViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'CargoInspection'

    queryset = CargoInspection.objects.select_related('vessel').all()
    serializer_class = CargoInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['declaration_number', 'description', 'country_of_origin']
    filter_fields = ['vessel', 'cargo_type', 'status']
    ordering_fields = ['created_at']


class WasteInspectionViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel',)
    audit_object_type = 'WasteInspection'

    queryset = WasteInspection.objects.select_related('vessel', 'inspector').all()
    serializer_class = WasteInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name']
    filter_fields = ['vessel']
    ordering_fields = ['inspection_date']


class PortEmergencyViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'port__entry_point_id'
    parent_fields = ('port', 'vessel')
    audit_object_type = 'PortEmergency'

    queryset = PortEmergency.objects.select_related('port', 'port__entry_point', 'vessel').all()
    serializer_class = PortEmergencySerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'description']
    filter_fields = ['port', 'vessel', 'status', 'severity']
    ordering_fields = ['reported_at']


class HealthCertificateViewSet(PortHealthWriteScopeMixin, PortHealthScopedMixin, viewsets.ModelViewSet):
    scope_field = 'vessel__visits__port__entry_point_id'
    scope_distinct = True
    parent_fields = ('vessel', 'inspection')
    audit_object_type = 'HealthCertificate'

    queryset = HealthCertificate.objects.select_related('vessel', 'inspection').all()
    serializer_class = HealthCertificateSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['certificate_number', 'vessel__vessel_name']
    filter_fields = ['vessel', 'certificate_type', 'status']
    ordering_fields = ['issue_date']


class PortHealthDashboardViewSet(PortHealthScopedMixin, viewsets.ViewSet):
    serializer_class = PortHealthDashboardSerializer

    @action(detail=False, methods=['get'])
    def overview(self, request):
        data = {
            'seaports': SeaPort.objects.count(),
            'vessels': Vessel.objects.count(),
            'arrived_vessels': Vessel.objects.filter(status=Vessel.VesselStatus.ARRIVED).count(),
            'inspections': ShipInspection.objects.count(),
            'pending_certificates': HealthCertificate.objects.filter(status=HealthCertificate.CertStatus.ISSUED).count(),
            'suspected_cases': SurveillanceCase.objects.filter(status=SurveillanceCase.CaseStatus.SUSPECTED).count(),
            'active_isolation': IsolationRecord.objects.filter(status=IsolationRecord.IsolationStatus.ACTIVE).count(),
            'open_emergencies': PortEmergency.objects.filter(status=PortEmergency.EmergencyStatus.OPEN).count(),
        }
        return Response(success_response(data))