from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.models import RoleAssignment
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.response import success_response

from .models import Department, Locality, OrgAssignment, OrgPosition, Sector, Station
from .serializers import (
    DepartmentSerializer,
    DepartmentWriteSerializer,
    LocalitySerializer,
    LocalityWriteSerializer,
    OrgAssignmentSerializer,
    OrgAssignmentWriteSerializer,
    OrganizationHierarchySerializer,
    OrgPositionSerializer,
    OrgPositionWriteSerializer,
    SectorSerializer,
    SectorWriteSerializer,
    StationSerializer,
    StationWriteSerializer,
)

ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
}


class OrgScopedMixin:
    """يقيّد الوصول بناءً على صلاحيات الوحدة ثم نطاق (القطاع) للمستخدم."""

    permission_resource = 'organization'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_type = RoleAssignment.ScopeType.SECTOR
    scope_field = None

    def get_permissions(self):
        action = ACTION_TO_PERMISSION.get(self.action, 'view')
        self.permission_action = action
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        scopes = user.active_scopes(self.permission_resource)
        scope_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == self.scope_type and s['scope_id'] is not None
        ]
        if self.scope_field and scope_ids:
            return qs.filter(**{f'{self.scope_field}__in': scope_ids})
        return qs


def build_position_tree(position, user_names=None):
    """يبني شجرة المنصب الواحد مع أسماء المعيَّنين."""
    assignments = position.assignments.filter(is_active=True).select_related('user')
    names = [getattr(a.user, 'full_name', None) or a.user.email for a in assignments]
    children = (
        OrgPosition.objects.filter(parent=position, is_active=True)
        .order_by('order', 'name_ar')
    )
    return {
        'id': str(position.id),
        'code': position.code,
        'name_ar': position.name_ar,
        'name_en': position.name_en,
        'level': position.level,
        'people': names,
        'children': [
            build_position_tree(c) for c in children
        ],
    }


class OrgPositionViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    queryset = OrgPosition.objects.select_related('parent').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'code']
    ordering_fields = ['level', 'order', 'created_at']
    filter_fields = ['level', 'is_active', 'parent']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return OrgPositionWriteSerializer
        return OrgPositionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(OrgPositionSerializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(OrgPositionSerializer(obj).data))


class SectorViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    queryset = Sector.objects.all()
    scope_field = 'id'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'code']
    ordering_fields = ['order', 'created_at']
    filter_fields = ['is_active']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SectorWriteSerializer
        return SectorSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(SectorSerializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(SectorSerializer(obj).data))


class LocalityViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    queryset = Locality.objects.select_related('sector').all()
    scope_field = 'sector'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'code']
    ordering_fields = ['order', 'created_at']
    filter_fields = ['is_active', 'sector']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LocalityWriteSerializer
        return LocalitySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(LocalitySerializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(LocalitySerializer(obj).data))


class DepartmentViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    queryset = Department.objects.select_related('sector', 'manager_position').all()
    scope_field = 'sector'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'code']
    ordering_fields = ['order', 'created_at']
    filter_fields = ['is_active', 'sector']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DepartmentWriteSerializer
        return DepartmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(DepartmentSerializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(DepartmentSerializer(obj).data))


class OrgAssignmentViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    queryset = OrgAssignment.objects.select_related('user', 'position', 'sector', 'department', 'station').all()
    scope_field = 'sector'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['user__email', 'user__full_name']
    ordering_fields = ['start_date', 'created_at', 'is_primary']
    filter_fields = ['is_active', 'is_primary', 'position', 'sector', 'department', 'station']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return OrgAssignmentWriteSerializer
        return OrgAssignmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(OrgAssignmentSerializer(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(OrgAssignmentSerializer(obj).data))


class StationViewSet(OrgScopedMixin, viewsets.ModelViewSet):
    """المحطات التشغيلية داخل الإدارات (مع نطاق محطة/إدارة/قطاع)."""

    queryset = Station.objects.select_related('department', 'sector').all()
    permission_resource = 'organization'
    scope_type = RoleAssignment.ScopeType.STATION
    scope_field = None
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'code', 'location']
    ordering_fields = ['order', 'created_at']
    filter_fields = ['is_active', 'department', 'sector']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return StationWriteSerializer
        return StationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        scopes = user.active_scopes(self.permission_resource)
        station_ids = [s['scope_id'] for s in scopes if s['scope_type'] == RoleAssignment.ScopeType.STATION and s['scope_id']]
        sector_ids = [s['scope_id'] for s in scopes if s['scope_type'] == RoleAssignment.ScopeType.SECTOR and s['scope_id']]
        department_ids = [s['scope_id'] for s in scopes if s['scope_type'] == RoleAssignment.ScopeType.DEPARTMENT and s['scope_id']]
        from django.db.models import Q

        q = Q()
        if station_ids:
            q |= Q(id__in=station_ids)
        if sector_ids:
            q |= Q(sector_id__in=sector_ids)
        if department_ids:
            q |= Q(department_id__in=department_ids)
        if q:
            return qs.filter(q)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(StationSerializer(obj).data), status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(StationSerializer(obj).data))


def build_department_node(department):
    """يبني عقدة قسم/وحدة/نقطة دخول مع وحداتها الفرعية ومناصبها الداخلية."""
    positions = [
        {'id': str(p.id), 'code': p.code, 'name_ar': p.name_ar}
        for p in department.positions.filter(is_active=True).order_by('order', 'name_ar')
    ]
    stations = [
        {'id': str(s.id), 'code': s.code, 'name_ar': s.name_ar, 'location': s.location}
        for s in department.stations.filter(is_active=True).order_by('order', 'name_ar')
    ]
    return {
        'id': str(department.id),
        'code': department.code,
        'name_ar': department.name_ar,
        'name_en': department.name_en,
        'kind': department.kind,
        'people': [
            getattr(a.user, 'full_name', None) or a.user.email
            for a in department.assignments.filter(is_active=True)
        ],
        'positions': positions,
        'stations': stations,
        'children': [
            build_department_node(c)
            for c in department.children.filter(is_active=True).order_by('order', 'name_ar')
        ],
    }


class OrganizationTreeViewSet(OrgScopedMixin, viewsets.GenericViewSet):
    """شجرة الهيكل الإداري الكاملة (المناصب القيادية ثم القطاعات والأقسام)."""
    serializer_class = OrganizationHierarchySerializer

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        user = request.user
        sectors = Sector.objects.filter(is_active=True).order_by('order', 'name_ar')
        if not user.is_superuser:
            scopes = user.active_scopes(self.permission_resource)
            allowed = [
                s['scope_id'] for s in scopes
                if s['scope_type'] == self.scope_type and s['scope_id'] is not None
            ]
            if allowed:
                sectors = sectors.filter(id__in=allowed)
        roots = OrgPosition.objects.filter(parent=None, is_active=True).order_by('level', 'order')
        positions = [build_position_tree(p) for p in roots]
        sector_data = []
        for s in sectors:
            sector_data.append({
                'id': str(s.id),
                'code': s.code,
                'name_ar': s.name_ar,
                'name_en': s.name_en,
                'color': s.color,
                'departments': [
                    build_department_node(d)
                    for d in s.departments.filter(is_active=True, parent=None).order_by('order', 'name_ar')
                ],
                'people': [
                    getattr(a.user, 'full_name', None) or a.user.email
                    for a in s.assignments.filter(is_active=True, department=None)
                ],
            })
        data = {
            'positions': positions,
            'sectors': sector_data,
        }
        return Response(success_response(data))