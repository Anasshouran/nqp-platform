from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.models import RoleAssignment
from core.filters import ExactFilterBackend
from core.permissions import PermissionAction, ScopeFilter
from core.utils.response import success_response

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
    """يقيّد الوصول بناءً على صلاحيات الوحدة ثم نطاق (الميناء) للمستخدم."""

    permission_resource = 'port_health'
    permission_classes = [PermissionAction, ScopeFilter]
    scope_type = RoleAssignment.ScopeType.PORT
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
        port_ids = [
            s['scope_id']
            for s in scopes
            if s['scope_type'] == self.scope_type and s['scope_id'] is not None
        ]
        if self.scope_field and port_ids:
            return qs.filter(**{f'{self.scope_field}__in': port_ids})
        if not port_ids:
            from core.utils.scoping import resolve_user_sector

            sector = resolve_user_sector(user)
            if sector is not None:
                from core.utils.ports import sector_entry_points

                sector_port_ids = list(sector_entry_points(sector).values_list('id', flat=True))
                if sector_port_ids:
                    field = self.scope_field if self.scope_field else 'port'
                    return qs.filter(**{f'{field}__in': sector_port_ids})
        return qs


class SeaPortViewSet(PortHealthScopedMixin, viewsets.ModelViewSet):
    queryset = SeaPort.objects.all()
    serializer_class = SeaPortSerializer
    scope_field = 'id'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en']
    filter_fields = ['is_active']
    ordering_fields = ['code', 'name_ar']


class BerthViewSet(viewsets.ModelViewSet):
    queryset = Berth.objects.select_related('port').all()
    serializer_class = BerthSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar']
    filter_fields = ['port', 'is_active']
    ordering_fields = ['code']


class VesselViewSet(viewsets.ModelViewSet):
    queryset = Vessel.objects.all()
    serializer_class = VesselSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel_name', 'imo_number', 'flag_state', 'shipping_company']
    filter_fields = ['status', 'vessel_type', 'flag_state']
    ordering_fields = ['vessel_name', 'arrival_date']


class VesselVisitViewSet(viewsets.ModelViewSet):
    queryset = VesselVisit.objects.select_related('vessel', 'port', 'berth').all()
    serializer_class = VesselVisitSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['port', 'vessel', 'status', 'berth']
    ordering_fields = ['arrival_date']


class CrewMemberViewSet(viewsets.ModelViewSet):
    queryset = CrewMember.objects.select_related('vessel').all()
    serializer_class = CrewMemberSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'passport_number', 'nationality']
    filter_fields = ['vessel', 'health_status']
    ordering_fields = ['full_name']


class PassengerViewSet(viewsets.ModelViewSet):
    queryset = Passenger.objects.select_related('vessel').all()
    serializer_class = PassengerSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['full_name', 'passport_number', 'nationality']
    filter_fields = ['vessel', 'health_status']
    ordering_fields = ['full_name']


class HealthDeclarationViewSet(viewsets.ModelViewSet):
    queryset = HealthDeclaration.objects.select_related('vessel', 'visit').all()
    serializer_class = HealthDeclarationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'captain_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['declaration_date']


class ShipInspectionViewSet(viewsets.ModelViewSet):
    queryset = ShipInspection.objects.select_related('vessel', 'visit', 'inspector').all()
    serializer_class = ShipInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['vessel', 'overall_status', 'certificate_issued']
    ordering_fields = ['inspection_date']


class FoodWaterInspectionViewSet(viewsets.ModelViewSet):
    queryset = FoodWaterInspection.objects.select_related('vessel', 'inspector').all()
    serializer_class = FoodWaterInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'vessel__imo_number']
    filter_fields = ['vessel', 'sample_status']
    ordering_fields = ['inspection_date']


class SanitationCertificateViewSet(viewsets.ModelViewSet):
    queryset = SanitationCertificate.objects.select_related('vessel', 'inspection').all()
    serializer_class = SanitationCertificateSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['certificate_number', 'vessel__vessel_name']
    filter_fields = ['vessel', 'certificate_type', 'status']
    ordering_fields = ['issue_date']


class IsolationRecordViewSet(viewsets.ModelViewSet):
    queryset = IsolationRecord.objects.select_related('vessel').all()
    serializer_class = IsolationRecordSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['person_name', 'vessel__vessel_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['start_date']


class SurveillanceCaseViewSet(viewsets.ModelViewSet):
    queryset = SurveillanceCase.objects.select_related('vessel').all()
    serializer_class = SurveillanceCaseSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['disease_name', 'person_name', 'vessel__vessel_name']
    filter_fields = ['vessel', 'status']
    ordering_fields = ['report_date']


class VectorControlViewSet(viewsets.ModelViewSet):
    queryset = VectorControl.objects.select_related('vessel').all()
    serializer_class = VectorControlSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name', 'campaign_name']
    filter_fields = ['vessel', 'control_type']
    ordering_fields = ['inspection_date']


class CargoInspectionViewSet(viewsets.ModelViewSet):
    queryset = CargoInspection.objects.select_related('vessel').all()
    serializer_class = CargoInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['declaration_number', 'description', 'country_of_origin']
    filter_fields = ['vessel', 'cargo_type', 'status']
    ordering_fields = ['created_at']


class WasteInspectionViewSet(viewsets.ModelViewSet):
    queryset = WasteInspection.objects.select_related('vessel', 'inspector').all()
    serializer_class = WasteInspectionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['vessel__vessel_name']
    filter_fields = ['vessel']
    ordering_fields = ['inspection_date']


class PortEmergencyViewSet(viewsets.ModelViewSet):
    queryset = PortEmergency.objects.select_related('port', 'vessel').all()
    serializer_class = PortEmergencySerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'description']
    filter_fields = ['port', 'vessel', 'status', 'severity']
    ordering_fields = ['reported_at']


class HealthCertificateViewSet(viewsets.ModelViewSet):
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