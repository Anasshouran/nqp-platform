from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import EntryPoint, HealthFacility, Section, SectionMember, Sector, State, Station, Terminal
from .serializers import (
    EntryPointSerializer,
    EntryPointWriteSerializer,
    HealthFacilitySerializer,
    HealthFacilityWriteSerializer,
    MasterDataTreeSerializer,
    SectionMemberSerializer,
    SectionMemberWriteSerializer,
    SectionSerializer,
    SectionWriteSerializer,
    SectorSerializer,
    SectorWriteSerializer,
    StateSerializer,
    StateWriteSerializer,
    StationSerializer,
    StationWriteSerializer,
    TerminalSerializer,
    TerminalWriteSerializer,
)


def build_section_node(section):
    members = [
        {
            'id': str(m.id),
            'user': str(m.user_id),
            'user_name': getattr(m.user, 'full_name', None) or m.user.email,
            'user_email': m.user.email,
            'role_label': m.role_label,
        }
        for m in section.members.filter(is_active=True).select_related('user')
    ]
    return {
        'id': str(section.id),
        'code': section.code,
        'name_ar': section.name_ar,
        'name_en': section.name_en,
        'station': str(section.station_id),
        'description': section.description,
        'order': section.order,
        'members': members,
    }


def build_station_node(station):
    return {
        'id': str(station.id),
        'code': station.code,
        'name_ar': station.name_ar,
        'name_en': station.name_en,
        'location': station.location,
        'terminal': str(station.terminal_id) if station.terminal_id else None,
        'entry_point': str(station.entry_point_id) if station.entry_point_id else None,
        'description': station.description,
        'order': station.order,
        'sections': [
            build_section_node(s)
            for s in station.sections.filter(is_active=True).order_by('order', 'name_ar')
        ],
    }


def build_entry_node(entry_point):
    return {
        'id': str(entry_point.id),
        'code': entry_point.code,
        'name_ar': entry_point.name_ar,
        'name_en': entry_point.name_en,
        'kind': entry_point.kind,
        'state': str(entry_point.state_id),
        'location': entry_point.location,
        'description': entry_point.description,
        'order': entry_point.order,
        'terminals': [
            {
                'id': str(t.id),
                'code': t.code,
                'name_ar': t.name_ar,
                'name_en': t.name_en,
                'entry_point': str(t.entry_point_id),
                'description': t.description,
                'order': t.order,
                'stations': [
                    build_station_node(s)
                    for s in t.stations.filter(is_active=True).order_by('order', 'name_ar')
                ],
            }
            for t in entry_point.terminals.filter(is_active=True).order_by('order', 'name_ar')
        ],
        'stations': [
            build_station_node(s)
            for s in entry_point.stations_direct.filter(is_active=True).order_by('order', 'name_ar')
        ],
    }


def build_state_node(state):
    return {
        'id': str(state.id),
        'code': state.code,
        'name_ar': state.name_ar,
        'name_en': state.name_en,
        'sector': str(state.sector_id),
        'description': state.description,
        'order': state.order,
        'entry_points': [
            build_entry_node(e)
            for e in state.entry_points.filter(is_active=True).order_by('order', 'name_ar')
        ],
    }


class MasterDataTreeView(viewsets.GenericViewSet):
    """شجرة البيانات الأساسية الكاملة: القطاع ← الولاية ← المنفذ ← المنشأة ← المحطة ← القسم ← المستخدمون."""

    permission_classes = [IsAdmin]
    serializer_class = MasterDataTreeSerializer

    @action(detail=False, methods=['get'])
    def tree(self, request):
        sectors = Sector.objects.filter(is_active=True).order_by('order', 'name_ar')
        data = [
            {
                'id': str(s.id),
                'code': s.code,
                'name_ar': s.name_ar,
                'name_en': s.name_en,
                'color': s.color,
                'description': s.description,
                'order': s.order,
                'states': [
                    build_state_node(st)
                    for st in s.states.filter(is_active=True).order_by('order', 'name_ar')
                ],
            }
            for s in sectors
        ]
        return Response(success_response(data))


class BaseMasterDataViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    ordering_fields = ['order', 'created_at']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return self.write_serializer_class
        return self.serializer_class

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            success_response(self.serializer_class(obj).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(success_response(self.serializer_class(obj).data))


class SectorViewSet(BaseMasterDataViewSet):
    serializer_class = SectorSerializer
    write_serializer_class = SectorWriteSerializer
    queryset = Sector.objects.all()
    search_fields = ['name_ar', 'name_en', 'code']
    filter_fields = ['is_active']


class StateViewSet(BaseMasterDataViewSet):
    serializer_class = StateSerializer
    write_serializer_class = StateWriteSerializer
    queryset = State.objects.select_related('sector').all()
    search_fields = ['name_ar', 'name_en', 'code']
    filter_fields = ['is_active', 'sector']


class EntryPointViewSet(BaseMasterDataViewSet):
    serializer_class = EntryPointSerializer
    write_serializer_class = EntryPointWriteSerializer
    queryset = EntryPoint.objects.select_related('state', 'sector', 'locality').all()
    search_fields = ['name_ar', 'name_en', 'code']
    filter_fields = ['is_active', 'state', 'kind', 'sector', 'locality']


class HealthFacilityViewSet(BaseMasterDataViewSet):
    serializer_class = HealthFacilitySerializer
    write_serializer_class = HealthFacilityWriteSerializer
    queryset = HealthFacility.objects.select_related('locality', 'sector', 'entry_point').all()
    search_fields = ['name_ar', 'name_en', 'code', 'location']
    filter_fields = ['is_active', 'kind', 'locality', 'sector', 'entry_point']


class TerminalViewSet(BaseMasterDataViewSet):
    serializer_class = TerminalSerializer
    write_serializer_class = TerminalWriteSerializer
    queryset = Terminal.objects.select_related('entry_point').all()
    search_fields = ['name_ar', 'name_en', 'code']
    filter_fields = ['is_active', 'entry_point']


class StationViewSet(BaseMasterDataViewSet):
    serializer_class = StationSerializer
    write_serializer_class = StationWriteSerializer
    queryset = Station.objects.select_related('terminal', 'entry_point').all()
    search_fields = ['name_ar', 'name_en', 'code', 'location']
    filter_fields = ['is_active', 'terminal', 'entry_point']


class SectionViewSet(BaseMasterDataViewSet):
    serializer_class = SectionSerializer
    write_serializer_class = SectionWriteSerializer
    queryset = Section.objects.select_related('station').all()
    search_fields = ['name_ar', 'name_en', 'code']
    filter_fields = ['is_active', 'station']


class SectionMemberViewSet(BaseMasterDataViewSet):
    serializer_class = SectionMemberSerializer
    write_serializer_class = SectionMemberWriteSerializer
    queryset = SectionMember.objects.select_related('user', 'section').all()
    search_fields = ['user__email', 'user__full_name', 'section__name_ar']
    filter_fields = ['is_active', 'section']