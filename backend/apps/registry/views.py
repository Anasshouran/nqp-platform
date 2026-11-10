"""ViewSets — طبقة API للسجل التنظيمي (M2).

M2-core: GLOBAL-only للكتابة، و GLOBAL-based للقراءة.
كل ViewSet يُعلن permission_resource وScoped queryset.
"""

import uuid as _uuid

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.response import success_response
from core.utils.scoping import (
    has_global_scope,
    has_state_scope,
    get_user_state_ids,
    resolve_authorized_entry_points,
    _active_assignments,
)
from django.db.models import Q

from .models import (
    DepartmentNodeAssignment,
    FacilityOwner,
    FacilityOwnership,
    HealthFacilityNodeAssignment,
    LocalityNodeAssignment,
    RegistryChangeLog,
    ReportingNode,
    Service,
    ServiceAvailability,
    ServiceNodeAssignment,
    StateMinistry,
    StateNodeAssignment,
    TechnicalSupervisor,
    TechnicalSupervision,
)
from .serializers import (
    DepartmentNodeAssignmentSerializer,
    DepartmentNodeAssignmentWriteSerializer,
    FacilityOwnerSerializer,
    FacilityOwnerWriteSerializer,
    FacilityOwnershipSerializer,
    FacilityOwnershipWriteSerializer,
    ServiceSerializer,
    ServiceWriteSerializer,
    ServiceAvailabilitySerializer,
    ServiceAvailabilityWriteSerializer,
    ServiceNodeAssignmentSerializer,
    ServiceNodeAssignmentWriteSerializer,
    TechnicalSupervisorSerializer,
    TechnicalSupervisorWriteSerializer,
    TechnicalSupervisionSerializer,
    TechnicalSupervisionWriteSerializer,
    HealthFacilityNodeAssignmentSerializer,
    HealthFacilityNodeAssignmentWriteSerializer,
    LocalityNodeAssignmentSerializer,
    LocalityNodeAssignmentWriteSerializer,
    RegistryChangeLogSerializer,
    ReportingNodeSerializer,
    ReportingNodeWriteSerializer,
    StateMinistrySerializer,
    StateMinistryWriteSerializer,
    StateNodeAssignmentSerializer,
    StateNodeAssignmentWriteSerializer,
)


def _apply_exact_filters(qs, request, mapping):
    """M4-4-C-1: تطبيق فلاتر exact-match من query params بعد الـ scoping.

    ``mapping`` = {param_name: orm_field}. يُطبَّق بعد ``get_queryset`` (الذي
    يفرض scoping)، لذا لا يمكن لأي فلتر أن يوسّع الرؤية (D-M4-4-C-3).

    قيمة UUID غير صالحة تُعيد ``qs.none()`` بدل رفع 500 عند التقييم.
    """
    for param, orm_field in mapping.items():
        value = request.query_params.get(param)
        if value in (None, ''):
            continue
        try:
            _uuid.UUID(str(value))
        except (ValueError, AttributeError, TypeError):
            return qs.none()
        qs = qs.filter(**{orm_field: value})
    return qs


def _visible_reporting_node_ids(user):
    """يعيد set من ReportingNode.id المرئية للمستخدم (M4-3-bis).

    - superuser / GLOBAL → None (لا تقييد).
    - لا scope → set() (fail-safe).
    - غير ذلك → set of IDs (قد تكون فارغة).

    Centralizes ReportingNode scoping so RegistryScopedViewSet.get_queryset
    and RegistryDashboardViewSet (tree/summary) share one source of truth.
    Reuses M4-2-bis logic: entry points + STATE path derivation + valid_to
    filters + trailing-slash prefix defense.
    """
    if user.is_superuser or has_global_scope(user):
        return None
    if not _active_assignments(user).exists():
        return set()

    entry_point_ids = resolve_authorized_entry_points(user)
    if entry_point_ids is None:
        return None
    user_state_ids = get_user_state_ids(user) if has_state_scope(user) else set()
    user_state_ids = user_state_ids or set()

    if not entry_point_ids and not user_state_ids:
        return set()

    from apps.masterdata.models import EntryPoint, HealthFacility

    facility_ids = list(
        HealthFacility.objects.filter(entry_point_id__in=entry_point_ids).values_list('id', flat=True)
    )
    locality_ids = list(
        HealthFacility.objects.filter(
            entry_point_id__in=entry_point_ids, locality__isnull=False,
        ).values_list('locality_id', flat=True)
    )
    state_ids = list(
        EntryPoint.objects.filter(id__in=entry_point_ids, state__isnull=False).values_list('state_id', flat=True)
    )
    if user_state_ids:
        state_ids = list(set(state_ids) | set(user_state_ids))

    org_sector_ids = list(
        HealthFacility.objects.filter(
            entry_point_id__in=entry_point_ids, sector__isnull=False,
        ).values_list('sector_id', flat=True)
    )

    # M4-2-bis: STATE path derivation (facilities/localities/org sectors)
    if user_state_ids:
        state_node_ids = StateNodeAssignment.objects.filter(
            state_id__in=user_state_ids, valid_to__isnull=True,
        ).values_list('node_id', flat=True)
        state_node_paths = list(
            ReportingNode.objects.filter(id__in=state_node_ids).values_list('path', flat=True)
        )
        if state_node_paths:
            path_q = Q()
            for node_path in state_node_paths:
                if not node_path:
                    continue
                path_q |= Q(path=node_path) | Q(path__startswith=f'{node_path}/')
            subtree_node_ids = list(ReportingNode.objects.filter(path_q).values_list('id', flat=True))
            if subtree_node_ids:
                path_facility_ids = set(
                    HealthFacilityNodeAssignment.objects.filter(
                        node_id__in=subtree_node_ids, valid_to__isnull=True,
                    ).values_list('facility_id', flat=True)
                )
                facility_ids = list(set(facility_ids) | path_facility_ids)
                path_locality_ids = set(
                    LocalityNodeAssignment.objects.filter(
                        node_id__in=subtree_node_ids, valid_to__isnull=True,
                    ).values_list('locality_id', flat=True)
                )
                locality_ids = list(set(locality_ids) | path_locality_ids)
                path_org_sector_ids = set(
                    HealthFacility.objects.filter(id__in=path_facility_ids, sector__isnull=False).values_list('sector_id', flat=True)
                )
                org_sector_ids = list(set(org_sector_ids) | path_org_sector_ids)

    # STATE path Q for ReportingNode descendants
    state_path_q = Q(pk__in=[])
    if user_state_ids:
        state_node_ids = StateNodeAssignment.objects.filter(
            state_id__in=user_state_ids, valid_to__isnull=True,
        ).values_list('node_id', flat=True)
        state_node_paths = ReportingNode.objects.filter(id__in=state_node_ids).values_list('path', flat=True)
        for node_path in state_node_paths:
            if not node_path:
                continue
            state_path_q |= Q(path=node_path) | Q(path__startswith=f'{node_path}/')

    node_visibility_q = (
        Q(statenodeassignment_set__state_id__in=state_ids, statenodeassignment_set__valid_to__isnull=True)
        | Q(localitynodeassignment_set__locality_id__in=locality_ids, localitynodeassignment_set__valid_to__isnull=True)
        | Q(healthfacilitynodeassignment_set__facility_id__in=facility_ids, healthfacilitynodeassignment_set__valid_to__isnull=True)
        | Q(department_assignments__department__facility_id__in=facility_ids, department_assignments__valid_to__isnull=True)
        | Q(department_assignments__department__facility__isnull=True, department_assignments__department__sector_id__in=org_sector_ids, department_assignments__valid_to__isnull=True)
        | state_path_q
    )
    return set(ReportingNode.objects.filter(node_visibility_q).values_list('id', flat=True))


class RegistryScopedViewSet(viewsets.ModelViewSet):
    """ViewSet أساسي للسجل — يفرض scoping fail-safe.

    M2-core: يسمح GLOBAL فقط. كل مستخدم آخر يرى qs.none().
    M2-bis: scoping متقدم (SECTOR/DEPARTMENT) بعد مراجعة.

    permission_resource يحدد مورد الصلاحية (registry/ministry/...).

    D-M2-2: DELETE ممنوع صراحةً — البيانات التنظيمية لا تُحذف،
    فقط تُعطَّل عبر is_active=False.
    """

    permission_resource = None
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    # D-M2-2: منع DELETE — لا حذف فعلي للسجلات التنظيمية
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        from .permissions import RegistryPermissionMixin

        # إضافة RegistryPermissionMixin ديناميكياً
        action_map = {
            "list": "view",
            "retrieve": "view",
            "create": "add",
            "update": "edit",
            "partial_update": "edit",
            "destroy": "delete",
        }
        self.permission_action = action_map.get(self.action, "view")
        return [PermissionAction()]

    def initial(self, request, *args, **kwargs):
        """يضبط current_user في contextvar من request.user (DRF level).
        
        M3-1-A: Middleware يعمل للطلبات الحقيقية (session/JWT) لكن
        force_authenticate في الاختبارات يعمل عند DRF level.
        هذا يضمن أن signals تلتقط المستخدم في كل الحالات.
        """
        from .middleware import _current_user

        token = _current_user.set(request.user if request.user.is_authenticated else None)
        super().initial(request, *args, **kwargs)
        # ملاحظة: contextvar يُعيد تعيينه في finally عبر reset — لكن signals
        # تحدث أثناء processing الـ request، لذا يجب أن يبقى set حتى بعد initial.
        # نستخدم token.reset() في نهاية dispatch عبر finally في middleware.
        # هنا لا نعيد تعيينه — الـ middleware يفعل ذلك.

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # GLOBAL/superuser: كل شيء
        if user.is_superuser or has_global_scope(user):
            return qs

        # M3-1-B: SECTOR/DEPARTMENT/POINT scoping عبر entry_points
        if not _active_assignments(user).exists():
            return qs.none()  # fail-safe

        entry_point_ids = resolve_authorized_entry_points(user)
        if entry_point_ids is None:  # GLOBAL (shouldn't happen here, but safe)
            return qs

        # M4-2 (D-M4-1-1/D-M4-1-7): تفعيل helpers. STATE user قد يرى عقد
        # ولايته عبر الشجرة حتى بدون أي EntryPoint — لذا لا يجوز الخروج
        # المبكر بـ qs.none() قبل حساب مسار STATE.
        user_state_ids = get_user_state_ids(user) if has_state_scope(user) else set()
        user_state_ids = user_state_ids or set()

        if not entry_point_ids and not user_state_ids:
            return qs.none()  # fail-safe محفوظ لكل scope آخر

        # حساب الكيانات المسموحة عبر entry_points
        from apps.masterdata.models import EntryPoint
        from apps.masterdata.models import HealthFacility

        facility_ids = list(
            HealthFacility.objects.filter(
                entry_point_id__in=entry_point_ids,
            ).values_list('id', flat=True)
        )
        locality_ids = list(
            HealthFacility.objects.filter(
                entry_point_id__in=entry_point_ids,
                locality__isnull=False,
            ).values_list('locality_id', flat=True)
        )
        state_ids = list(
            EntryPoint.objects.filter(
                id__in=entry_point_ids,
                state__isnull=False,
            ).values_list('state_id', flat=True)
        )
        # M4-2 (D-M4-1-1): ولاية المستخدم نفسها مرئية حتى بلا EntryPoints،
        # وإلا بقي STATE user أعمى عن StateMinistry/StateNodeAssignment.
        if user_state_ids:
            state_ids = list(set(state_ids) | set(user_state_ids))
        # M4-1-bis: قطاعات organization المشتقة من نقاط الدخول — تُستخدم
        # في عقد الإدارات وفي DepartmentNodeAssignment (كانت تُحسب مرتين).
        org_sector_ids = list(
            HealthFacility.objects.filter(
                entry_point_id__in=entry_point_ids,
                sector__isnull=False,
            ).values_list('sector_id', flat=True)
        )

        # M4-2-bis (D-M4-2-8): STATE user بلا EntryPoints → اشتقاق
        # facility_ids / locality_ids / org_sector_ids من StateNodeAssignment
        # path (subtree). D-M4-2-9: trailing '/' لتفادي prefix collision.
        if user_state_ids:
            state_node_ids = StateNodeAssignment.objects.filter(
                state_id__in=user_state_ids,
                valid_to__isnull=True,
            ).values_list('node_id', flat=True)

            state_node_paths = list(
                ReportingNode.objects.filter(id__in=state_node_ids).values_list('path', flat=True)
            )

            subtree_node_ids = []
            if state_node_paths:
                path_q = Q()
                for node_path in state_node_paths:
                    if not node_path:
                        continue
                    path_q |= Q(path=node_path) | Q(path__startswith=f'{node_path}/')
                subtree_node_ids = list(
                    ReportingNode.objects.filter(path_q).values_list('id', flat=True)
                )

            if subtree_node_ids:
                # facilities from HealthFacilityNodeAssignment under subtree
                path_facility_ids = set(
                    HealthFacilityNodeAssignment.objects.filter(
                        node_id__in=subtree_node_ids,
                        valid_to__isnull=True,
                    ).values_list('facility_id', flat=True)
                )
                facility_ids = list(set(facility_ids) | path_facility_ids)

                # localities from LocalityNodeAssignment under subtree
                path_locality_ids = set(
                    LocalityNodeAssignment.objects.filter(
                        node_id__in=subtree_node_ids,
                        valid_to__isnull=True,
                    ).values_list('locality_id', flat=True)
                )
                locality_ids = list(set(locality_ids) | path_locality_ids)

                # org sectors from facilities under subtree
                path_org_sector_ids = set(
                    HealthFacility.objects.filter(
                        id__in=path_facility_ids,
                        sector__isnull=False,
                    ).values_list('sector_id', flat=True)
                )
                org_sector_ids = list(set(org_sector_ids) | path_org_sector_ids)

        # M4-2: مسار STATE — كل descendants لعقدة الولاية (D-M4-1-1).
        # path مبني من UUIDs مفصولة بـ '/'، لذا نستخدم تطابقاً صريحاً
        # (path = X أو path يبدأ بـ 'X/') لتفادي أي تطابق بادئة عرضي.
        state_path_q = Q(pk__in=[])  # False افتراضياً (Q فارغ لا يُفلتر)
        if user_state_ids:
            state_node_ids = StateNodeAssignment.objects.filter(
                state_id__in=user_state_ids,
                valid_to__isnull=True,
            ).values_list('node_id', flat=True)
            state_node_paths = ReportingNode.objects.filter(
                id__in=state_node_ids,
            ).values_list('path', flat=True)
            for node_path in state_node_paths:
                if not node_path:
                    continue
                state_path_q |= Q(path=node_path) | Q(path__startswith=f'{node_path}/')

        model_name = qs.model.__name__

        # كيان مرئي عبر الشجرة: التعيينات المباشرة + مسار STATE.
        # M4-2: كل فروع التطابق المباشر تُقيَّد بـ valid_to IS NULL — كان
        # التعيين المنتهي يمنح رؤية دائمة (تسريب صامت ورثناه من M3-1).
        node_visibility_q = (
            Q(
                statenodeassignment_set__state_id__in=state_ids,
                statenodeassignment_set__valid_to__isnull=True,
            )
            | Q(
                localitynodeassignment_set__locality_id__in=locality_ids,
                localitynodeassignment_set__valid_to__isnull=True,
            )
            | Q(
                healthfacilitynodeassignment_set__facility_id__in=facility_ids,
                healthfacilitynodeassignment_set__valid_to__isnull=True,
            )
            # M4-1-bis: عقد الإدارات (M3-4) كانت غائبة — SECTOR user لا يراها.
            | Q(
                department_assignments__department__facility_id__in=facility_ids,
                department_assignments__valid_to__isnull=True,
            )
            | Q(
                department_assignments__department__facility__isnull=True,
                department_assignments__department__sector_id__in=org_sector_ids,
                department_assignments__valid_to__isnull=True,
            )
            | state_path_q
        )

        if model_name == 'ReportingNode':
            # M4-3-bis: use centralized helper (single source of truth)
            visible = _visible_reporting_node_ids(user)
            if visible is None:
                return qs
            if not visible:
                return qs.none()
            return qs.filter(id__in=visible).distinct()

        if model_name == 'ServiceNodeAssignment':
            # M4-2: عقدة الخدمة ورقةٌ تحت عقدة المنشأة/الولاية، لذا التطابق
            # المباشر وحده لا يكفي. نضيف هنا فقط (وليس في ReportingNode)
            # رؤية التعيينات الواقعة تحت شجرة العقد المرئية — دون توسيع
            # قائمة العقد نفسها.
            visible_nodes = ReportingNode.objects.filter(node_visibility_q)
            visible_node_ids = visible_nodes.values('id')
            visible_paths = visible_nodes.values_list('path', flat=True)

            service_q = Q(node_id__in=visible_node_ids)
            for visible_path in visible_paths:
                if not visible_path:
                    continue
                service_q |= Q(node__path__startswith=f'{visible_path}/')
            return qs.filter(service_q).distinct()

        if model_name == 'StateNodeAssignment':
            return qs.filter(state_id__in=state_ids)

        if model_name == 'LocalityNodeAssignment':
            return qs.filter(locality_id__in=locality_ids)

        if model_name == 'HealthFacilityNodeAssignment':
            # M4-1-bis: الحقل هو facility وليس health_facility (كان 500).
            return qs.filter(facility_id__in=facility_ids)

        if model_name == 'StateMinistry':
            return qs.filter(state_id__in=state_ids)

        if model_name == 'TechnicalSupervision':
            return qs.filter(facility_id__in=facility_ids)

        if model_name == 'ServiceAvailability':
            return qs.filter(
                Q(facility_id__in=facility_ids)
                | Q(department__facility_id__in=facility_ids)
            )

        if model_name == 'RegistryChangeLog':
            return qs  # TODO: tighten in M3-bis — polymorphic scoping is complex

        if model_name == 'FacilityOwnership':
            # الملكية تتبع facility_id المسموح
            return qs.filter(facility_id__in=facility_ids)

        if model_name == 'DepartmentNodeAssignment':
            # Department can be under a facility (via facility FK) or at sector level
            # For MVP: filter by department.facility in allowed facilities, OR
            # department.sector in allowed sectors (for sector-level departments)
            return qs.filter(
                Q(department__facility_id__in=facility_ids)
                | Q(
                    department__facility__isnull=True,
                    department__sector_id__in=org_sector_ids,
                )
            )

        if model_name == 'FacilityOwner':
            # Owners مرجعية عامة — GLOBAL فقط (كتابة) أو كل المسجلين (قراءة)
            # القراءة مفتوحة، الكتابة عبر RegistryScopedViewSet GLOBAL
            return qs

        return qs.none()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return self.write_serializer_class
        return self.serializer_class


# ---------------------------------------------------------------------------
# ReportingNode
# ---------------------------------------------------------------------------

class ReportingNodeViewSet(RegistryScopedViewSet):
    queryset = ReportingNode.objects.all().order_by("order", "code")
    serializer_class = ReportingNodeSerializer
    write_serializer_class = ReportingNodeWriteSerializer
    permission_resource = "registry"
    search_fields = ["code", "name_ar", "name_en"]
    ordering_fields = ["order", "code", "kind", "depth"]

    @staticmethod
    def _is_global_write(user):
        """GLOBAL-only write gate (Part3-1 decision).

        Superuser or active GLOBAL scope required to write — read scoping
        already exists via get_queryset for non-GLOBAL roles.
        """
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and (user.is_superuser or has_global_scope(user))
        )

    @staticmethod
    def _forbidden():
        return Response(
            {"status": "error", "message": "GLOBAL scope required for write"},
            status=status.HTTP_403_FORBIDDEN,
        )

    def create(self, request, *args, **kwargs):
        if not self._is_global_write(request.user):
            return self._forbidden()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._is_global_write(request.user):
            return self._forbidden()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_global_write(request.user):
            return self._forbidden()
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Soft-delete: is_active=False. GLOBAL only. FEDERAL root protected."""
        if not self._is_global_write(request.user):
            return self._forbidden()
        node = self.get_object()
        if node.kind == ReportingNode.Kind.FEDERAL:
            return Response(
                {"status": "error", "message": "Cannot deactivate FEDERAL root"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        node.is_active = False
        node.save()
        return Response(
            {"status": "success",
             "data": {"id": str(node.id), "is_active": False}},
        )

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        if not self._is_global_write(request.user):
            return self._forbidden()
        node = self.get_object()
        node.is_active = True
        node.save()
        return Response(
            {"status": "success",
             "data": {"id": str(node.id), "is_active": True}},
        )


# ---------------------------------------------------------------------------
# Assignment ViewSets
# ---------------------------------------------------------------------------

class StateNodeAssignmentViewSet(RegistryScopedViewSet):
    queryset = StateNodeAssignment.objects.select_related(
        "state", "node"
    ).all().order_by("-valid_from")
    serializer_class = StateNodeAssignmentSerializer
    write_serializer_class = StateNodeAssignmentWriteSerializer
    permission_resource = "registry"
    search_fields = ["state__code", "node__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "state": "state_id",
            "node": "node_id",
        })


class LocalityNodeAssignmentViewSet(RegistryScopedViewSet):
    queryset = LocalityNodeAssignment.objects.select_related(
        "locality", "node"
    ).all().order_by("-valid_from")
    serializer_class = LocalityNodeAssignmentSerializer
    write_serializer_class = LocalityNodeAssignmentWriteSerializer
    permission_resource = "registry"
    search_fields = ["locality__code", "node__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "locality": "locality_id",
            "node": "node_id",
        })


class HealthFacilityNodeAssignmentViewSet(RegistryScopedViewSet):
    queryset = HealthFacilityNodeAssignment.objects.select_related(
        "facility", "node"
    ).all().order_by("-valid_from")
    serializer_class = HealthFacilityNodeAssignmentSerializer
    write_serializer_class = HealthFacilityNodeAssignmentWriteSerializer
    permission_resource = "registry"
    search_fields = ["facility__code", "node__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "facility": "facility_id",
            "node": "node_id",
        })


# ---------------------------------------------------------------------------
# StateMinistry
# ---------------------------------------------------------------------------

class StateMinistryViewSet(RegistryScopedViewSet):
    queryset = StateMinistry.objects.select_related("state").all().order_by(
        "ministry_name_ar"
    )
    serializer_class = StateMinistrySerializer
    write_serializer_class = StateMinistryWriteSerializer
    permission_resource = "ministry"
    search_fields = ["ministry_name_ar", "state__code"]


# ---------------------------------------------------------------------------
# RegistryChangeLog (read-only)
# ---------------------------------------------------------------------------

class RegistryChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل التغييرات — read-only بالكامل."""

    queryset = RegistryChangeLog.objects.select_related("user").all().order_by(
        "-created_at"
    )
    serializer_class = RegistryChangeLogSerializer
    permission_resource = "registry"
    permission_classes = [PermissionAction]
    filter_backends = [OrderingFilter, ExactFilterBackend, SearchFilter]
    search_fields = ["entity_type", "entity_label"]
    ordering_fields = ["created_at", "action"]

    def get_permissions(self):
        self.permission_action = "view"
        return [PermissionAction()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser or has_global_scope(user):
            return qs
        return qs.none()


# ---------------------------------------------------------------------------
# Dashboard / Tree aggregates
# ---------------------------------------------------------------------------

class RegistryDashboardViewSet(viewsets.ViewSet):
    """نقاط مجمعة: ملخص السجل + الشجرة الكاملة."""

    permission_resource = "registry"
    permission_classes = [PermissionAction]

    def get_permissions(self):
        self.permission_action = "view"
        return [PermissionAction()]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """ملخص السجل: عدد العقد + KPI مؤشرات (مقيّد بـ scoping)."""
        from apps.registry.models import ReportingNode

        user = request.user
        nodes_qs = ReportingNode.objects.filter(is_active=True)

        visible_ids = _visible_reporting_node_ids(user)
        if visible_ids is not None:
            nodes_qs = nodes_qs.filter(id__in=visible_ids)

        nodes_count = nodes_qs.count()
        states_count = nodes_qs.filter(kind=ReportingNode.Kind.STATE).count()
        facilities_count = nodes_qs.filter(kind=ReportingNode.Kind.FACILITY).count()

        ministries_qs = StateMinistry.objects.all()
        if not (user.is_superuser or has_global_scope(user)):
            from apps.masterdata.models import EntryPoint
            entry_point_ids = resolve_authorized_entry_points(user)
            ep_state_ids = set()
            if entry_point_ids:
                ep_state_ids = set(
                    EntryPoint.objects.filter(id__in=entry_point_ids, state__isnull=False).values_list('state_id', flat=True)
                )
            user_state_ids = get_user_state_ids(user) if has_state_scope(user) else set()
            user_state_ids = user_state_ids or set()
            visible_state_ids = ep_state_ids | user_state_ids
            if visible_state_ids:
                ministries_qs = ministries_qs.filter(state_id__in=visible_state_ids)
            else:
                ministries_qs = ministries_qs.none()
        ministries_count = ministries_qs.count()

        data = {
            "nodes": nodes_count,
            "states": states_count,
            "facilities": facilities_count,
            "ministries": ministries_count,
        }
        return Response(success_response(data, message="ملخص السجل التنظيمي"))

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """الشجرة الكاملة — بنية متداخلة (بلا pagination — مع cache).

        M4-3: تطبيق scoping — STATE/SECTOR user يرى فقط subtree الخاصة به.
        (كان غير مُقيَّد — ثغرة أمنية مُغلقة هنا.)
        """
        user = request.user

        # M4-3-bis: استخدم helper موحّد (لا instantiate viewset).
        visible_ids = _visible_reporting_node_ids(user)
        if visible_ids is None:
            visible_ids = None  # global → all
        else:
            visible_ids = set(visible_ids)

        nodes = ReportingNode.objects.filter(
            is_active=True
        ).select_related("parent").order_by("order", "code")

        if visible_ids is not None:
            nodes = nodes.filter(id__in=visible_ids)

        # M4-3: STATE/SECTOR user may not see the FEDERAL root, so treat any
        # visible node whose parent is not visible as a root (preserves tree shape).
        if visible_ids is not None:
            visible_set = visible_ids
            roots = [n for n in nodes if (n.parent_id is None) or (n.parent_id not in visible_set)]
        else:
            roots = list(nodes.filter(parent__isnull=True))

        result = []

        def build(node):
            # M4-4-C-2 (D-M4-4-B-2): expose facility_id for FACILITY nodes so
            # the frontend can navigate directly without a second lookup.
            facility_id = None
            if node.kind == ReportingNode.Kind.FACILITY:
                assignment = (
                    node.healthfacilitynodeassignment_set
                    .filter(valid_to__isnull=True)
                    .only("facility_id")
                    .first()
                )
                if assignment is not None:
                    facility_id = str(assignment.facility_id)

            item = {
                "id": str(node.id),
                "kind": node.kind,
                "code": node.code,
                "name_ar": node.name_ar,
                "name_en": node.name_en,
                "depth": node.depth,
                "facility_id": facility_id,
                "children": [],
            }
            children_qs = node.children.filter(is_active=True).order_by("order", "code")
            if visible_ids is not None:
                children_qs = children_qs.filter(id__in=visible_ids)
            for child in children_qs:
                item["children"].append(build(child))
            return item

        for root in roots:
            result.append(build(root))

        return Response(success_response(result, message="شجرة السجل التنظيمي"))


# ---------------------------------------------------------------------------
# FacilityOwner (Institutional Ownership)
# ---------------------------------------------------------------------------

class FacilityOwnerViewSet(RegistryScopedViewSet):
    """عرض وإدارة الجهات المالكة (GLOBAL فقط للكتابة)."""
    queryset = FacilityOwner.objects.all().order_by("kind", "code")
    serializer_class = FacilityOwnerSerializer
    write_serializer_class = FacilityOwnerWriteSerializer
    permission_resource = "registry"
    search_fields = ["code", "name_ar", "kind"]


class FacilityOwnershipViewSet(RegistryScopedViewSet):
    """عرض وإدارة ملكية المنشآت."""
    queryset = FacilityOwnership.objects.select_related(
        "facility", "owner"
    ).all().order_by("-valid_from")
    serializer_class = FacilityOwnershipSerializer
    write_serializer_class = FacilityOwnershipWriteSerializer
    permission_resource = "registry"
    search_fields = ["facility__code", "owner__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "facility": "facility_id",
            "owner": "owner_id",
        })


# ---------------------------------------------------------------------------
# TechnicalSupervisor (Technical Supervision مرجع)
# ---------------------------------------------------------------------------

class TechnicalSupervisorViewSet(RegistryScopedViewSet):
    """إدارة الجهات المشرفة فنياً (GLOBAL للكتابة، كل مستخدم مصادق للقراءة)."""
    queryset = TechnicalSupervisor.objects.all().order_by("domain", "code")
    serializer_class = TechnicalSupervisorSerializer
    write_serializer_class = TechnicalSupervisorWriteSerializer
    permission_resource = "registry"
    search_fields = ["code", "name_ar", "domain"]


class TechnicalSupervisionViewSet(RegistryScopedViewSet):
    """إدارة الإشراف الفني على المنشآت."""
    queryset = TechnicalSupervision.objects.select_related(
        "facility", "supervisor"
    ).all().order_by("-valid_from")
    serializer_class = TechnicalSupervisionSerializer
    write_serializer_class = TechnicalSupervisionWriteSerializer
    permission_resource = "registry"
    search_fields = ["facility__code", "supervisor__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "facility": "facility_id",
            "supervisor": "supervisor_id",
        })


class DepartmentNodeAssignmentViewSet(RegistryScopedViewSet):
    """تعيين الإدارات إلى عقد الشجرة."""
    queryset = DepartmentNodeAssignment.objects.select_related(
        "department", "node"
    ).all().order_by("-valid_from")
    serializer_class = DepartmentNodeAssignmentSerializer
    write_serializer_class = DepartmentNodeAssignmentWriteSerializer
    permission_resource = "registry"
    search_fields = ["department__code", "node__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        # D-M4-4-B-4: Departments tab يفلتر عبر department.facility.
        # `facility` مدعوم كاختصار لنفس الحقل.
        return _apply_exact_filters(qs, self.request, {
            "department": "department_id",
            "node": "node_id",
            "department__facility": "department__facility_id",
            "facility": "department__facility_id",
        })


class ServiceViewSet(RegistryScopedViewSet):
    """كتالوج الخدمات (GLOBAL للكتابة، كل مستخدم للقراءة)."""
    queryset = Service.objects.all().order_by("category", "code")
    serializer_class = ServiceSerializer
    write_serializer_class = ServiceWriteSerializer
    permission_resource = "registry"
    search_fields = ["code", "name_ar", "category"]

    def get_queryset(self):
        qs = Service.objects.all()
        user = self.request.user
        if self.request.method in ('POST', 'PATCH', 'PUT'):
            if not (user.is_superuser or has_global_scope(user)):
                return qs.none()
        return qs


class ServiceAvailabilityViewSet(RegistryScopedViewSet):
    """توفّر الخدمات."""
    queryset = ServiceAvailability.objects.select_related(
        "service", "facility", "department",
    ).all().order_by("-valid_from")
    serializer_class = ServiceAvailabilitySerializer
    write_serializer_class = ServiceAvailabilityWriteSerializer
    permission_resource = "registry"
    search_fields = ["service__code", "facility__code", "department__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "facility": "facility_id",
            "service": "service_id",
            "department": "department_id",
        })


class ServiceNodeAssignmentViewSet(RegistryScopedViewSet):
    """تعيين الخدمات إلى عقد الشجرة (M4-2)."""
    queryset = ServiceNodeAssignment.objects.select_related(
        "service", "node"
    ).all().order_by("-valid_from")
    serializer_class = ServiceNodeAssignmentSerializer
    write_serializer_class = ServiceNodeAssignmentWriteSerializer
    permission_resource = "registry"
    search_fields = ["service__code", "node__code"]

    def filter_queryset(self, qs):
        qs = super().filter_queryset(qs)
        return _apply_exact_filters(qs, self.request, {
            "service": "service_id",
            "node": "node_id",
        })


# ---------------------------------------------------------------------------
# Facility summary (read-only, scoped) — M4-4-C-Part3-A (D-M4-4-C-8)
# ---------------------------------------------------------------------------

class FacilitySummaryViewSet(viewsets.ViewSet):
    """ملخص المنشأة فقط — scoped.

    يُستخدم بدل ``masterdata/health-facilities/`` (الذي يجبر IsAdmin/is_staff)
    حتى يرى مستخدم SECTOR/STATE غير الموظف بيانات منشأته ضمن نطاقه.

    لا يُوفّر list — فقط retrieve. أي غياب/عدم ظهور الـ assignment → 404
    (لا تسريب جنسي).
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def retrieve(self, request, pk=None):
        from apps.masterdata.models import HealthFacility

        try:
            facility_id = _uuid.UUID(str(pk))
        except (ValueError, AttributeError, TypeError):
            return Response(
                {"status": "error", "message": "not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        visible_nodes = _visible_reporting_node_ids(request.user)
        if visible_nodes is None:
            # GLOBAL — أي منشأة مسموحة
            facility = (
                HealthFacility.objects
                .select_related("sector", "locality", "entry_point")
                .filter(pk=facility_id)
                .first()
            )
        else:
            assignment = HealthFacilityNodeAssignment.objects.filter(
                facility_id=facility_id,
                node_id__in=set(visible_nodes),
                valid_to__isnull=True,
            ).select_related(
                "facility__sector", "facility__locality", "facility__entry_point",
            ).first()
            facility = assignment.facility if assignment else None

        if facility is None:
            return Response(
                {"status": "error", "message": "not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        sector = getattr(facility, "sector", None)
        locality = getattr(facility, "locality", None)
        entry_point = getattr(facility, "entry_point", None)

        data = {
            "id": str(facility.id),
            "code": facility.code,
            "name_ar": facility.name_ar,
            "name_en": facility.name_en,
            "kind": facility.kind,
            "sector": {
                "id": str(sector.id) if sector else None,
                "name_ar": sector.name_ar if sector else None,
            },
            "locality": {
                "id": str(locality.id) if locality else None,
                "name_ar": locality.name_ar if locality else None,
            },
            "entry_point": {
                "id": str(entry_point.id) if entry_point else None,
                "name_ar": entry_point.name_ar if entry_point else None,
            },
            "is_active": facility.is_active,
        }
        return Response({"status": "success", "data": data})
