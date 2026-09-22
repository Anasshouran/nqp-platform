import json

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.risk_engine.models import RiskAssessment
from apps.risk_engine.serializers import RiskAssessmentSerializer
from apps.risk_engine.services import RiskEngineService
from apps.travelers.models import Traveler
from core.filters import ExactFilterBackend
from core.utils.response import success_response

from .models import HealthScreening
from .serializers import HealthScreeningSerializer


class ScreeningViewSet(viewsets.ModelViewSet):
    queryset = HealthScreening.objects.select_related('traveler', 'port', 'officer').all()
    serializer_class = HealthScreeningSerializer
    http_method_names = ['get', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    ordering_fields = ['screened_at']
    filter_fields = ['port', 'traveler']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
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
