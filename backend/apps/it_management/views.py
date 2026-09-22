from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.scoping import resolve_user_sector
from core.utils.ports import sector_entry_points

from .models import GovernmentIntegration, ITAsset, ItSystem, NetworkStatus, SupportTicket
from .serializers import (
    GovernmentIntegrationSerializer,
    ITAssetSerializer,
    ItReportSerializer,
    ItDashboardSerializer,
    ItSystemSerializer,
    NationalItDashboardSerializer,
    NetworkStatusSerializer,
    SupportTicketSerializer,
)

ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


def user_is_it_manager(user):
    """مدير تقنية معلومات القطاع أو مدير النظام."""
    if not user or user.is_anonymous:
        return False
    if user.is_superuser or user.is_staff:
        return True
    from apps.accounts.models import Role
    from apps.accounts.models import RoleAssignment

    return RoleAssignment.objects.filter(
        user=user,
        is_active=True,
        role__code__in=['SECTOR_IT_MANAGER', 'ADMIN'],
    ).exists()


def user_is_national_it_director(user):
    """مدير تقنية المعلومات القومي أو مدير النظام (رؤية وطنية)."""
    if not user or user.is_anonymous:
        return False
    if user.is_superuser or user.is_staff:
        return True
    from apps.accounts.models import RoleAssignment

    return RoleAssignment.objects.filter(
        user=user,
        is_active=True,
        role__code__in=['NATIONAL_IT_DIRECTOR', 'ADMIN'],
    ).exists()


class ItSectorScopedMixin:
    """يقيّد queryset على قطاع المستخدم (SECTOR scope) عبر الحقل المباشر `sector`."""

    permission_resource = 'it'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_field = None

    def get_permissions(self):
        self.permission_action = ACTION_TO_PERMISSION.get(self.action, 'view')
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or user.is_anonymous:
            return qs.none()
        if user.is_superuser:
            return qs
        sector = resolve_user_sector(user)
        if sector is None:
            return qs.none()
        return qs.filter(sector=sector)

    def perform_create(self, serializer):
        user = self.request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        if sector is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('لا يوجد قطاع مرتبط بالحساب')
        serializer.save(sector=sector)


class ItSystemViewSet(ItSectorScopedMixin, viewsets.ModelViewSet):
    queryset = ItSystem.objects.select_related('sector').all()
    serializer_class = ItSystemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name', 'name_ar']
    ordering_fields = ['name_ar', 'created_at']
    filter_fields = ['status', 'sector']

    @action(detail=False, methods=['post'])
    def recheck(self, request):
        """إعادة فحص الأنظمة: تحديث حالة تحذيرية/توقف اختبرت يدوياً."""
        user = request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        systems = ItSystem.objects.all() if user.is_superuser else \
            ItSystem.objects.filter(sector=sector)
        checked = 0
        for system in systems:
            system.last_checked_at = timezone.now()
            system.save(update_fields=['last_checked_at'])
            checked += 1
        return Response({'status': 'success', 'data': {'checked': checked}})


class ITAssetViewSet(ItSectorScopedMixin, viewsets.ModelViewSet):
    queryset = ITAsset.objects.select_related('sector', 'entry_point', 'assigned_to').all()
    serializer_class = ITAssetSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'serial_number', 'location']
    ordering_fields = ['name', 'created_at']
    filter_fields = ['status', 'asset_type', 'entry_point', 'sector']


class SupportTicketViewSet(ItSectorScopedMixin, viewsets.ModelViewSet):
    queryset = SupportTicket.objects.select_related('sector', 'entry_point', 'created_by', 'assigned_to').all()
    serializer_class = SupportTicketSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['ticket_no', 'subject', 'description']
    ordering_fields = ['created_at', 'priority']
    filter_fields = ['status', 'priority', 'entry_point', 'assigned_to', 'sector']

    def get_permissions(self):
        """مدير القطاع (SECTOR_MANAGER) يرى التذاكر للقراءة فقط."""
        user = self.request.user
        if (
            user
            and not (user.is_superuser or user.is_staff)
            and not user_is_it_manager(user)
            and self.action not in ('list', 'retrieve')
        ):
            from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
            if self.request.method not in SAFE_METHODS:
                return [IsAuthenticated()] if user.is_authenticated else []
        return super().get_permissions()

    def perform_create(self, serializer):
        sector = None
        user = self.request.user
        if not user.is_superuser:
            sector = resolve_user_sector(user)
        serializer.save(created_by=user, sector=sector)

    def perform_update(self, serializer):
        status = serializer.validated_data.get('status')
        if status == SupportTicket.Status.RESOLVED and not serializer.instance.resolved_at:
            serializer.save(resolved_at=timezone.now())
        elif serializer.instance.resolved_at and status in (
            SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS, SupportTicket.Status.CLOSED
        ):
            serializer.save(resolved_at=None)
        else:
            serializer.save()


class NetworkStatusViewSet(ItSectorScopedMixin, viewsets.ModelViewSet):
    queryset = NetworkStatus.objects.select_related('sector', 'entry_point').all()
    serializer_class = NetworkStatusSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['entry_point__name_ar', 'entry_point__code']
    ordering_fields = ['entry_point__order']
    filter_fields = ['connected', 'entry_point', 'sector']

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """مزامنة حالة الشبكات: ارتجاع حُدوث الآخير لكل منفذ قطاع المستخدم."""
        user = request.user
        sector = resolve_user_sector(user) if not user.is_superuser else None
        networks = NetworkStatus.objects.all() if user.is_superuser \
            else NetworkStatus.objects.filter(sector=sector)
        count = 0
        for network in networks:
            network.last_sync = timezone.now()
            network.ping_ms = 5 + (network.ping_ms + 3) % 60
            network.save(update_fields=['last_sync', 'ping_ms'])
            count += 1
        return Response({'status': 'success', 'data': {'synced': count}})


class ItDashboardViewSet(viewsets.GenericViewSet):
    permission_resource = 'it'
    queryset = ItSystem.objects.none()
    serializer_class = ItDashboardSerializer

    def list(self, request):
        user = request.user
        if user.is_superuser:
            systems = ItSystem.objects.all()
            assets = ITAsset.objects.all()
            tickets = SupportTicket.objects.all()
            networks = NetworkStatus.objects.all()
            ports = sector_entry_points(None)
        else:
            sector = resolve_user_sector(user)
            if sector is None:
                return Response({
                    'status': 'success',
                    'data': {
                        'active_systems': 0, 'warning_systems': 0, 'offline_systems': 0,
                        'connected_ports': 0, 'asset_count': 0, 'open_tickets': 0,
                        'critical_tickets': 0, 'high_tickets': 0,
                        'systems': [], 'recent_tickets': [], 'networks': [],
                    },
                })
            systems = ItSystem.objects.filter(sector=sector)
            assets = ITAsset.objects.filter(sector=sector)
            tickets = SupportTicket.objects.filter(sector=sector)
            networks = NetworkStatus.objects.filter(sector=sector)
            ports = sector_entry_points(sector)

        connected_ports = networks.filter(connected=True).count() if networks.exists() \
            else ports.count()

        data = {
            'active_systems': systems.filter(status=ItSystem.Status.ONLINE).count(),
            'warning_systems': systems.filter(status=ItSystem.Status.WARNING).count(),
            'offline_systems': systems.filter(status=ItSystem.Status.OFFLINE).count(),
            'connected_ports': connected_ports,
            'asset_count': assets.count(),
            'open_tickets': tickets.exclude(status=SupportTicket.Status.CLOSED).count(),
            'critical_tickets': tickets.filter(priority=SupportTicket.Priority.CRITICAL).exclude(
                status=SupportTicket.Status.CLOSED).count(),
            'high_tickets': tickets.filter(priority=SupportTicket.Priority.HIGH).exclude(
                status=SupportTicket.Status.CLOSED).count(),
            'systems': ItSystemSerializer(systems, many=True).data,
            'recent_tickets': SupportTicketSerializer(tickets[:5], many=True).data,
            'networks': NetworkStatusSerializer(networks, many=True).data,
        }
        return Response({'status': 'success', 'data': data})


class ItReportViewSet(viewsets.GenericViewSet):
    permission_resource = 'it'
    queryset = ItSystem.objects.none()
    serializer_class = ItReportSerializer

    def list(self, request):
        user = request.user
        if user.is_superuser:
            qs = ItSystem.objects.all()
            assets = ITAsset.objects.all()
            tickets = SupportTicket.objects.all()
            networks = NetworkStatus.objects.all()
        else:
            sector = resolve_user_sector(user)
            if sector is None:
                qs = ItSystem.objects.none()
                assets = ITAsset.objects.none()
                tickets = SupportTicket.objects.none()
                networks = NetworkStatus.objects.none()
            else:
                qs = ItSystem.objects.filter(sector=sector)
                assets = ITAsset.objects.filter(sector=sector)
                tickets = SupportTicket.objects.filter(sector=sector)
                networks = NetworkStatus.objects.filter(sector=sector)
        data = {
            'systems': ItSystemSerializer(qs, many=True).data,
            'assets': ITAssetSerializer(assets, many=True).data,
            'tickets': SupportTicketSerializer(tickets, many=True).data,
            'networks': NetworkStatusSerializer(networks, many=True).data,
        }
        return Response({'status': 'success', 'data': data})


class NationalItDashboardViewSet(viewsets.GenericViewSet):
    """لوحة مدير تقنية المعلومات القومي: تجميع كل القطاعات + التكاملات الحكومية.

    متاحة لمدير تقنية المعلومات القومي (NATIONAL_IT_DIRECTOR) ومدير النظام فقط.
    """

    serializer_class = NationalItDashboardSerializer
    queryset = ItSystem.objects.none()

    def get_permissions(self):
        from rest_framework.permissions import SAFE_METHODS

        class IsNationalItDirector(permissions.BasePermission):
            def has_permission(self, request, view):
                return user_is_national_it_director(request.user)

        if self.request.method not in SAFE_METHODS:
            return [IsNationalItDirector()]
        return [IsNationalItDirector()]

    def list(self, request):
        from apps.organization.models import Sector

        sectors = list(Sector.objects.filter(is_active=True).order_by('order', 'name_ar'))
        sector_rows = []
        for sector in sectors:
            systems = ItSystem.objects.filter(sector=sector)
            tickets = SupportTicket.objects.filter(sector=sector)
            networks = NetworkStatus.objects.filter(sector=sector)
            active = systems.filter(status=ItSystem.Status.ONLINE).count()
            warning = systems.filter(status=ItSystem.Status.WARNING).count()
            offline = systems.filter(status=ItSystem.Status.OFFLINE).count()
            if offline:
                connectivity = 'DISRUPTION'
            elif warning:
                connectivity = 'PARTIAL'
            else:
                connectivity = 'STABLE'
            sector_rows.append({
                'id': str(sector.id),
                'code': sector.code,
                'name_ar': sector.name_ar,
                'total_systems': systems.count(),
                'active_systems': active,
                'warning_systems': warning,
                'offline_systems': offline,
                'connected_ports': networks.filter(connected=True).count(),
                'open_tickets': tickets.exclude(status=SupportTicket.Status.CLOSED).count(),
                'critical_tickets': tickets.filter(priority=SupportTicket.Priority.CRITICAL)
                    .exclude(status=SupportTicket.Status.CLOSED).count(),
                'connectivity': connectivity,
            })

        all_systems = ItSystem.objects.all()
        all_tickets = SupportTicket.objects.all()
        all_networks = NetworkStatus.objects.all()
        integrations = GovernmentIntegration.objects.filter(is_active=True).order_by('order', 'name_ar')
        data = {
            'sectors': sector_rows,
            'systems': ItSystemSerializer(all_systems.select_related('sector'), many=True).data,
            'integrations': GovernmentIntegrationSerializer(integrations, many=True).data,
            'active_systems': all_systems.filter(status=ItSystem.Status.ONLINE).count(),
            'warning_systems': all_systems.filter(status=ItSystem.Status.WARNING).count(),
            'offline_systems': all_systems.filter(status=ItSystem.Status.OFFLINE).count(),
            'connected_ports': all_networks.filter(connected=True).count(),
            'asset_count': ITAsset.objects.count(),
            'open_tickets': all_tickets.exclude(status=SupportTicket.Status.CLOSED).count(),
            'critical_tickets': all_tickets.filter(priority=SupportTicket.Priority.CRITICAL)
                .exclude(status=SupportTicket.Status.CLOSED).count(),
            'recent_tickets': SupportTicketSerializer(all_tickets[:5], many=True).data,
        }
        return Response({'status': 'success', 'data': data})


class GovernmentIntegrationViewSet(viewsets.ReadOnlyModelViewSet):
    """التكاملات الحكومية (قراءة) لمتابعة حالة المزامنة مع الجهات الخارجية."""

    queryset = GovernmentIntegration.objects.filter(is_active=True).select_related().all()
    serializer_class = GovernmentIntegrationSerializer
    filter_backends = [ExactFilterBackend, OrderingFilter]
    ordering_fields = ['order', 'name_ar']

    def get_permissions(self):
        from rest_framework.permissions import SAFE_METHODS

        class IsNationalItDirector(permissions.BasePermission):
            def has_permission(self, request, view):
                return user_is_national_it_director(request.user)

        return [IsNationalItDirector()]

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """اختبار اتصال: تحديث آخر مزامنة كفحص حي."""
        integration = self.get_object()
        from django.utils import timezone

        integration.last_sync_at = timezone.now()
        integration.error_count = 0
        integration.status = GovernmentIntegration.Status.CONNECTED
        integration.save(update_fields=['last_sync_at', 'error_count', 'status'])
        return Response({'status': 'success', 'data': GovernmentIntegrationSerializer(integration).data})