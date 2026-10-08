import logging

from rest_framework import viewsets, permissions, status
from rest_framework.settings import api_settings
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.http import Http404

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.response import success_response
from core.utils.scoping import CompanyPortScopedMixin

from apps.carriers.models import Carrier
from apps.carriers.permissions import IsCarrierRep
from apps.shipping import services
from apps.shipping.services import _agent_entry_point_ids
from apps.shipping.models import (
    PortClearanceDecision,
    PreArrivalNotification,
    ShippingAgent,
    VesselCompanyRelationship,
    ShippingAuditLog,
)
from apps.shipping.serializers import (
    ShippingAgentSerializer,
    ShippingAgentCreateSerializer,
    PreArrivalNotificationSerializer,
    PortClearanceDecisionSerializer,
    VesselCompanyRelationshipSerializer,
    VesselCompanyRelationshipCreateSerializer,
    ShippingAuditLogSerializer,
    ShippingCompanySerializer,
    ShippingCompanyDetailSerializer,
    ShippingCompanyAdminWriteSerializer,
)

User = get_user_model()

logger = logging.getLogger(__name__)

ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


class ShippingCompanyViewSet(viewsets.ModelViewSet):
    """شركات الملاحة — قراءة ذاتية الخدمة، وحوكمة للجهات الإدارية فقط.

    Phase 1C-C Part B: the company record is **effectively read-only** for
    `SHIPPING_COMPANY` / `SHIPPING_AGENT`. Company identity, registration
    status, compliance class and all integration/rate-limit configuration are
    governance state with no approved self-service workflow, so they are neither
    written nor filtered here. Platform administrators keep that surface
    through the existing `carriers` company API, which is the canonical
    administrative path.
    """

    queryset = Carrier.objects.filter(company_type__in=['MARITIME', 'CARGO']).select_related('country').prefetch_related('ports')
    serializer_class = ShippingCompanySerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'shipping_companies'
    filter_backends = [ExactFilterBackend]
    search_fields = ['name', 'name_en', 'iata_code', 'icao_code']
    # `registration_status` / `compliance_class` intentionally absent: they are
    # governance fields that members can neither see nor filter by.
    filter_fields = ['company_type', 'is_active', 'country']

    def get_serializer_class(self):
        # Administrators keep a writable governance projection; members are
        # permanently read-only and never see the writable fields at all.
        if self._is_admin() and self.action in ('create', 'update', 'partial_update'):
            return ShippingCompanyAdminWriteSerializer
        if self.action == 'retrieve':
            return ShippingCompanyDetailSerializer
        return ShippingCompanySerializer

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def _is_admin(self):
        user = self.request.user
        return bool(user.is_superuser or user.is_staff)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self._is_admin():
            return qs
        # Membership is the only source of company identity (never a posted id).
        company_ids = user.carrier_memberships.filter(
            is_active=True,
        ).values_list('carrier_id', flat=True)
        return qs.filter(id__in=company_ids)

    def _deny_member_write(self):
        """Members may not mutate the company record through this endpoint."""
        if self._is_admin():
            return
        raise PermissionDenied(
            'بيانات الشركة governed by the platform; self-service is read-only. '
            'Use the carrier profile API for contact details.'
        )

    def perform_update(self, serializer):
        self._deny_member_write()
        serializer.save()

    def perform_partial_update(self, serializer):
        self._deny_member_write()
        serializer.save()

    def perform_create(self, serializer):
        self._deny_member_write()
        serializer.save()

    def perform_destroy(self, instance):
        self._deny_member_write()
        instance.delete()

    @action(detail=True, methods=['get'])
    def vessels(self, request, pk=None):
        """سفن الشركة."""
        company = self.get_object()
        from apps.port_health.models import Vessel
        from apps.port_health.serializers import VesselSerializer
        vessels = company.vessels.all()
        page = self.paginate_queryset(vessels)
        serializer = VesselSerializer(page if page is not None else vessels, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['get'])
    def agents(self, request, pk=None):
        """وكلاء الشركة."""
        company = self.get_object()
        agents = company.shipping_agents.filter(is_active=True)
        serializer = ShippingAgentSerializer(agents, many=True)
        return Response(success_response(serializer.data))


class ShippingAgentViewSet(viewsets.ModelViewSet):
    """
    إدارة الوكلاء الملاحيين.
    
    ممثل الشركة (SHIPPING_COMPANY/CARRIER) يدير وكلاء شركته فقط.
    الوكيل ملاحي معتمد يمثل شركة في ميناء محدد.
    التطبيق يفرض النطاق المزدوج: الشركة + المنافذ المصرح بها.
    """
    queryset = ShippingAgent.objects.select_related('company', 'user').prefetch_related('ports')
    serializer_class = ShippingAgentSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'shipping_agents'
    filter_backends = [ExactFilterBackend]
    search_fields = ['name', 'name_en', 'license_number', 'contact_name']
    filter_fields = ['agent_type', 'status', 'is_active', 'company']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ShippingAgentCreateSerializer
        return ShippingAgentSerializer

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return qs
        
        # Get user's company scope
        if hasattr(user, 'carrier_memberships'):
            company_ids = user.carrier_memberships.filter(is_active=True).values_list('carrier_id', flat=True)
            qs = qs.filter(company_id__in=company_ids)
        else:
            return qs.none()
        
        # Apply port scope if user has PORT scope
        from core.utils.scoping import resolve_combined_scope_ids
        scope_info = resolve_combined_scope_ids(self.request.user)
        
        if scope_info['has_port_scope']:
            port_ids = scope_info['port_ids']
            if port_ids is not None:
                if not port_ids:
                    return qs.none()
                # Filter agents whose authorized ports intersect with user's port scope
                qs = qs.filter(ports__id__in=port_ids).distinct()
        
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            serializer.save()
        else:
            company_id = user.carrier_memberships.filter(is_active=True).values_list('carrier_id', flat=True).first()
            if company_id:
                serializer.save(company_id=company_id)
            else:
                serializer.save()

    def perform_update(self, serializer):
        # Ensure user cannot change agent to a port outside their scope
        instance = self.get_object()
        user_ports = None
        from core.utils.scoping import resolve_combined_scope_ids
        scope_info = resolve_combined_scope_ids(self.request.user)
        if scope_info['has_port_scope']:
            user_ports = scope_info['port_ids']
        
        if user_ports is not None and user_ports:
            new_ports = serializer.validated_data.get('ports')
            if new_ports:
                new_port_ids = set(p.id for p in new_ports)
                if not new_port_ids.issubset(set(user_ports)):
                    from rest_framework.exceptions import PermissionDenied, ValidationError
                    raise PermissionDenied("لا يمكنك تعيين وكيل لمنافذ خارج نطاق صلاحيتك.")
        serializer.save()


class VesselCompanyRelationshipViewSet(viewsets.ModelViewSet):
    """علاقات الشركات بالسفن.

    Phase 1C-C Part C: creation is no longer generic CRUD. It goes through
    :func:`apps.shipping.services.create_vessel_company_relationship`, which
    refuses to let a company assert ``OWNER`` over a vessel and requires the
    company to already own the vessel. Update/destroy stay administrative.
    """

    queryset = VesselCompanyRelationship.objects.select_related('vessel', 'company')
    serializer_class = VesselCompanyRelationshipSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'vessel_company_relationships'
    filter_backends = [ExactFilterBackend]
    filter_fields = ['vessel', 'company', 'role', 'is_primary', 'is_active']

    def get_serializer_class(self):
        if self.action == 'create':
            return VesselCompanyRelationshipCreateSerializer
        return VesselCompanyRelationshipSerializer

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def _is_admin(self):
        user = self.request.user
        return bool(user.is_superuser or user.is_staff)

    def get_queryset(self):
        qs = super().get_queryset()
        if self._is_admin():
            return qs
        company_ids = self.request.user.carrier_memberships.filter(
            is_active=True,
        ).values_list('carrier_id', flat=True)
        return qs.filter(company_id__in=company_ids)

    def perform_create(self, serializer):
        """Delegate to the domain service; never trust the posted company."""
        services.create_vessel_company_relationship(
            vessel=serializer.validated_data['vessel'],
            company=serializer.validated_data['company'],
            role=serializer.validated_data.get('role', 'OPERATOR'),
            actor=self.request.user,
            is_primary=serializer.validated_data.get('is_primary', False),
            valid_from=serializer.validated_data.get('valid_from'),
            valid_until=serializer.validated_data.get('valid_until'),
            notes=serializer.validated_data.get('notes', ''),
        )

    def perform_update(self, serializer):
        if not self._is_admin():
            raise PermissionDenied('تعديل علاقة الشركة بالسفينة إجراء إداري.')
        serializer.save()

    def perform_destroy(self, instance):
        if not self._is_admin():
            raise PermissionDenied('حذف علاقة الشركة بالسفينة إجراء إداري.')
        instance.delete()


def _carrier_scope(user):
    """Carrier ids the user is authorised for (None = unrestricted)."""
    from core.utils.scoping import resolve_user_company_ids

    return resolve_user_company_ids(user)


def assert_visit_filable(user, visit, *, action='file a pre-arrival notification'):
    """Authorise `user` to file against `visit`.

    Enforces, server-side:
      * the visit's port (and therefore EntryPoint) is operational — never an
        archived/inactive SeaPort;
      * company scope: ``visit.vessel.company`` must be in the caller's scope;
      * agent port scope: when the caller acts as a shipping agent, the visit's
        EntryPoint must be among that agent's authorised ports.
    """
    port = visit.port
    if not port.is_active or port.entry_point_id is None:
        raise PermissionDenied('لا يمكن الإخطار على ميناء غير نشط أو غير مرتبط بمنفذ دخول.')

    company_ids = _carrier_scope(user)
    if company_ids is not None:
        owner = visit.vessel.company_id
        if owner is None or owner not in company_ids:
            # Do not confirm the vessel exists for another tenant.
            raise Http404

    agent_eps = _agent_entry_point_ids(user)
    if agent_eps is not None and visit.port.entry_point_id not in agent_eps:
        raise Http404

    return True


class PreArrivalNotificationViewSet(CompanyPortScopedMixin, viewsets.ModelViewSet):
    """Maritime pre-arrival notifications, filed against a `VesselVisit`.

    Scoping reuses the Phase 1A.1 combined PORT + COMPANY authorisation:

    * shipping company / agent -> only their own fleet, and (for agents) only
      their authorised entry points;
    * port health -> by EntryPoint, unchanged, and never granted company scope.

    ``status`` cannot be written directly: the only way to move a notification
    forward is the explicit workflow actions, each of which validates the
    transition and the actor.
    """

    queryset = PreArrivalNotification.objects.select_related(
        'vessel_visit', 'vessel_visit__vessel', 'vessel_visit__port',
        'vessel_visit__port__entry_point', 'submitted_by', 'reviewed_by',
    )
    serializer_class = PreArrivalNotificationSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'pre_arrivals'
    filter_backends = [ExactFilterBackend]
    search_fields = [
        'vessel_visit__vessel__vessel_name',
        'vessel_visit__vessel__imo_number',
    ]
    filter_fields = ['status', 'vessel_visit']
    http_method_names = ['get', 'post', 'patch', 'delete']

    #: Company ownership resolves through the visit's vessel.
    company_field = 'vessel_visit__vessel__company_id'
    port_field = 'vessel_visit__port__entry_point_id'

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def get_queryset(self):
        """Scope *and* exclude notifications whose operational port went inactive.

        Three independent restrictions are applied:

        1. combined PORT + COMPANY scoping from :class:`CompanyPortScopedMixin`
           (role-assignment based);
        2. the caller's own ``ShippingAgent.ports`` authorisation, which is *not*
           expressed as a PORT RoleAssignment and so is invisible to (1) — an
           agent must not see notifications for ports they are not authorised
           for, even within their own company;
        3. notifications whose operational port was archived after the fact are
           dropped rather than silently acted upon.

        Callers must not see a pre-arrival for a port that was archived after the
        fact; such rows are dropped rather than silently acted upon.
        """
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        qs = qs.filter(vessel_visit__port__is_active=True)

        agent_eps = _agent_entry_point_ids(user)
        if agent_eps is not None:
            if not agent_eps:
                return qs.none()
            qs = qs.filter(vessel_visit__port__entry_point_id__in=agent_eps)

        return qs

    def perform_create(self, serializer):
        visit = serializer.validated_data['vessel_visit']
        # Re-assert here: the serializer check covers validation errors, this is
        # the authoritative gate before anything is persisted.
        assert_visit_filable(self.request.user, visit)
        serializer.save(status=PreArrivalNotification.Status.DRAFT)

    def perform_update(self, serializer):
        instance = serializer.instance
        if 'status' in self.request.data:
            raise PermissionDenied(
                'تغيير الحالة يتم عبر إجراءات سير العمل فقط '
                '(submit/review/accept/reject/cancel).'
            )
        visit = serializer.validated_data.get('vessel_visit', instance.vessel_visit)
        assert_visit_filable(self.request.user, visit)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status != PreArrivalNotification.Status.DRAFT:
            raise PermissionDenied('لا يمكن حذف إخطار تجاوزت مرحلة المسودة؛ استخدم الإلغاء.')
        assert_visit_filable(self.request.user, instance.vessel_visit)
        instance.delete()

    # -- explicit workflow actions ------------------------------------------

    def _transition(self, fn, *, notes=None):
        """Run a workflow action.

        `notes` is forwarded only when the caller explicitly opted in, because
        the service functions are keyword-only and introspection of their
        signatures is unreliable.
        """
        notification = self.get_object()
        if notes is None:
            fn(notification, actor=self.request.user)
        else:
            fn(notification, actor=self.request.user, notes=notes)
        return Response(success_response(self.get_serializer(notification).data))

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        return self._transition(services.submit_pre_arrival)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        return self._transition(
            services.start_pre_arrival_review, notes=request.data.get('notes', ''))

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        return self._transition(
            services.accept_pre_arrival, notes=request.data.get('notes', ''))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._transition(
            services.reject_pre_arrival, notes=request.data.get('notes', ''))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self._transition(
            services.cancel_pre_arrival, notes=request.data.get('notes', ''))


class PortClearanceDecisionViewSet(CompanyPortScopedMixin, viewsets.ReadOnlyModelViewSet):
    """Read-only access to Port Health clearance decisions.

    Scoping reuses the Phase 1A.1 combined PORT + COMPANY authorisation:

    * a shipping company / agent may **read** decisions for their own fleet,
      within their authorised entry points;
    * port health may read within their EntryPoint scope.

    Creation is deliberately absent: a clearance is recorded through
    ``POST /shipping/vessel-visits/{id}/clearance-decision/`` so the decision is
    always made against an explicit port call, never a bare decision payload.
    """

    queryset = PortClearanceDecision.objects.select_related(
        'vessel_visit', 'vessel_visit__vessel', 'vessel_visit__vessel__company',
        'vessel_visit__port', 'vessel_visit__port__entry_point', 'decided_by',
    )
    serializer_class = PortClearanceDecisionSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'clearance_decisions'
    filter_backends = [ExactFilterBackend]
    search_fields = [
        'vessel_visit__vessel__vessel_name',
        'vessel_visit__vessel__imo_number',
    ]
    filter_fields = ['decision', 'vessel_visit', 'is_current']
    http_method_names = ['get']

    company_field = 'vessel_visit__vessel__company_id'
    port_field = 'vessel_visit__port__entry_point_id'

    def get_permissions(self):
        self.permission_action = ACTION_TO_PERMISSION.get(self.action, 'view')
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        qs = qs.filter(vessel_visit__port__is_active=True)

        # An agent's port authorisation is not a role-assignment scope, so it
        # has to be applied explicitly (same rule as pre-arrivals).
        agent_eps = _agent_entry_point_ids(user)
        if agent_eps is not None:
            if not agent_eps:
                return qs.none()
            qs = qs.filter(vessel_visit__port__entry_point_id__in=agent_eps)
        return qs


def _assert_readable_visit(user, visit):
    """Confirm the caller may at least *see* this visit under Phase 1A.1 scoping.

    The write path for clearance must not become a side door around the
    queryset scoping used by the read endpoints: a company rep must not be able
    to name a foreign VesselVisit id here.

    Note: company restriction is applied **only** when the caller actually
    carries a COMPANY scope. A port-health officer has none, and treating their
    empty membership as "deny" would lock them out of their own port.
    """
    if user.is_superuser:
        return

    from core.utils.scoping import resolve_combined_scope_ids

    info = resolve_combined_scope_ids(user)

    if info['has_company_scope']:
        owner = visit.vessel.company_id
        if owner is None or owner not in (info['company_ids'] or []):
            raise Http404

    agent_eps = _agent_entry_point_ids(user)
    if agent_eps is not None and visit.port.entry_point_id not in agent_eps:
        raise Http404


class VesselDepartureView(viewsets.GenericViewSet):
    """The single departure path: record that a vessel has sailed.

    Mounted at ``POST /api/v1/shipping/vessel-visits/{vessel_visit_id}/depart/``.
    The body is intentionally empty: no vessel/port/company/timestamp is taken
    from the client, and the service is the only thing that may set DEPARTED.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortClearanceDecisionSerializer  # unused; visit is returned
    pagination_class = None

    def create(self, request, vessel_visit_id=None):
        from apps.port_health.serializers import VesselVisitSerializer
        from apps.port_health.models import VesselVisit

        visit = (
            VesselVisit.objects
            .select_related('vessel', 'vessel__company', 'port', 'port__entry_point', 'berth')
            .filter(pk=vessel_visit_id)
            .first()
        )
        if visit is None:
            raise Http404
        # Reuse Phase 1B-2 read-scope so the write path is not a side door.
        _assert_readable_visit(request.user, visit)

        updated = services.record_vessel_departure(
            vessel_visit=visit,
            actor=request.user,
            notes=request.data.get('notes', ''),
        )
        return Response(
            success_response(VesselVisitSerializer(updated).data),
            status=status.HTTP_201_CREATED,
        )


class VesselVisitRequestView(viewsets.GenericViewSet):
    """Self-service port-call request.

    ``POST /api/v1/shipping/vessel-visits/request/``

    A company or agent asks for a future visit. The result is an ``EXPECTED``
    ``VesselVisit``; it confers no operational authority and cannot set arrival,
    clearance or departure.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = None
    pagination_class = None

    def create(self, request):
        from datetime import date as _date

        from apps.masterdata.models import EntryPoint
        from apps.port_health.models import Berth, Vessel
        from apps.port_health.serializers import VesselVisitSerializer

        vessel = Vessel.objects.filter(pk=request.data.get('vessel')).select_related('company').first()
        if vessel is None:
            raise Http404

        entry_point = EntryPoint.objects.filter(
            pk=request.data.get('entry_point'),
        ).first()
        if entry_point is None:
            raise Http404

        eta = request.data.get('eta') or request.data.get('arrival_date')
        try:
            eta_date = _date.fromisoformat(eta) if isinstance(eta, str) else eta
        except (TypeError, ValueError):
            raise ValidationError({'eta': 'تاريخ الوصول المتوقع غير صالح (YYYY-MM-DD).'})

        planned = request.data.get('planned_departure')
        try:
            planned_date = _date.fromisoformat(planned) if isinstance(planned, str) else planned
        except (TypeError, ValueError):
            raise ValidationError({'planned_departure': 'تاريخ المغادرة المتوقعة غير صالح.'})

        berth = None
        if request.data.get('berth'):
            berth = Berth.objects.filter(pk=request.data['berth']).first()

        visit = services.create_vessel_visit_request(
            vessel=vessel,
            entry_point=entry_point,
            actor=request.user,
            eta=eta_date,
            planned_departure=planned_date,
            berth=berth,
            remarks=request.data.get('remarks', ''),
        )
        return Response(
            success_response(VesselVisitSerializer(visit).data),
            status=status.HTTP_201_CREATED,
        )


class ClearanceDecisionRecordView(viewsets.GenericViewSet):
    """The single write path: record a clearance decision for a port call.

    Mounted at ``/api/v1/shipping/vessel-visits/{vessel_visit_id}/clearance-decision/``.
    Kept deliberately small — all business logic lives in the service.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortClearanceDecisionSerializer
    pagination_class = api_settings.DEFAULT_PAGINATION_CLASS

    def _load_visit(self, vessel_visit_id):
        from apps.port_health.models import VesselVisit

        visit = (
            VesselVisit.objects
            .select_related('vessel', 'vessel__company', 'port', 'port__entry_point')
            .filter(pk=vessel_visit_id)
            .first()
        )
        if visit is None:
            raise Http404
        _assert_readable_visit(self.request.user, visit)
        return visit

    def create(self, request, vessel_visit_id=None):
        visit = self._load_visit(vessel_visit_id)

        created = services.record_port_clearance_decision(
            vessel_visit=visit,
            decision=request.data.get('decision'),
            reason=request.data.get('reason', ''),
            conditions=request.data.get('conditions', ''),
            actor=request.user,
        )
        return Response(
            success_response(PortClearanceDecisionSerializer(created).data),
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, vessel_visit_id=None):
        """History of decisions for one port call (newest first)."""
        self._load_visit(vessel_visit_id)
        qs = PortClearanceDecision.objects.filter(vessel_visit_id=vessel_visit_id)
        page = self.paginate_queryset(qs)
        serializer = PortClearanceDecisionSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(success_response(serializer.data))


class ShippingAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل تدقيق الملاحة — مقروء فقط ومُقيَّد بنطاق المستخدم.

    Narrowing rules (Phase 1C-C Part A4):
      * company user  -> rows whose ``company`` is in their asserted scope;
      * shipping agent-> the same, further restricted to their authorised
                          entry points where the event carries one;
      * port health   -> events within their EntryPoint scope;
      * global users  -> everything.

    Being authenticated is never on its own sufficient for broad visibility.
    """

    queryset = ShippingAuditLog.objects.select_related('user', 'company').all()
    serializer_class = ShippingAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'shipping_audit_logs'
    http_method_names = ['get']
    filter_backends = [ExactFilterBackend]
    filter_fields = ['object_type', 'action', 'user', 'company']
    search_fields = ['object_label']
    ordering = ['-created_at']
    ordering_fields = ['created_at']

    def get_permissions(self):
        self.permission_action = 'view'
        return super().get_permissions()

    def get_queryset(self):
        from core.utils.scoping import resolve_combined_scope_ids

        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs

        info = resolve_combined_scope_ids(user)
        has_company = info['has_company_scope']
        has_port = info['has_port_scope']

        # No scope at all -> fail closed.
        if not has_company and not has_port:
            return qs.none()

        from django.db.models import Q

        if has_company:
            company_ids = info['company_ids'] or []
            if not company_ids:
                return qs.none()
            clause = Q(company_id__in=company_ids)
        else:
            clause = Q(pk__in=[])  # company-scoped branch not applicable

        if has_port:
            port_ids = info['port_ids'] or []
            if not port_ids:
                return qs.none()
            entry_points = _entry_points_for_audit_rows(port_ids)
            clause &= (Q(company_id__in=entry_points['companies'])
                       | Q(detail__entry_point__in=entry_points['entry_points'])
                       | Q(company__isnull=True, detail__entry_point__in=entry_points['entry_points']))
        else:
            # Company-only: an agent may additionally be limited to its ports.
            agent_eps = _agent_entry_point_ids(user)
            if agent_eps is not None:
                clause &= Q(detail__entry_point__in=[str(e) for e in agent_eps]) | Q(
                    object_type__in=['ShippingAgent', 'VesselCompanyRelationship', 'Carrier'],
                    detail__entry_point__isnull=True,
                )

        return qs.filter(clause).distinct()


def _entry_points_for_audit_rows(port_ids):
    """Map EntryPoint ids to the set of company ids operating them.

    Used to keep port-health and agent views of the audit trail inside their
    geographic scope without storing a second redundant column on the row.
    Ids are stringified because they are compared against a JSONField detail.
    """
    from apps.carriers.models import Carrier

    entry_points = [str(pid) for pid in port_ids]
    companies = [
        str(cid)
        for cid in Carrier.objects.filter(ports__id__in=entry_points)
        .values_list('id', flat=True)
        .distinct()
    ]
    return {'entry_points': entry_points, 'companies': companies}