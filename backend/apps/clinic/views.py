import base64
import io
import uuid
from datetime import timedelta

import qrcode
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.laboratory.models import LabResult, LabSample
from core.filters import ExactFilterBackend
from core.utils.response import success_response

from .models import (
    Clinic,
    ClinicReferral,
    ClinicType,
    ClinicVisit,
    EMRRecord,
    HealthCertificate,
    IsolationRecord,
    LabRequest,
    Medication,
    Prescription,
    TriageRecord,
)
from .serializers import (
    ClinicDashboardSerializer,
    ClinicPatientSerializer,
    ClinicReferralSerializer,
    ClinicSerializer,
    ClinicTypeSerializer,
    ClinicVisitDetailSerializer,
    ClinicVisitSerializer,
    EMRRecordSerializer,
    HealthCertificateSerializer,
    IsolationRecordSerializer,
    LabRequestSerializer,
    LabResultSummarySerializer,
    MedicationSerializer,
    PrescriptionSerializer,
    TriageRecordSerializer,
)
from .services import find_or_create_patient, patient_qr_png, walk_in_referral


def scoped_clinics(user):
    """العيادات التي يديرها المستخدم: كل العيادات للمشرفين، أو عيادات الكادر للطبيب."""
    managed = Clinic.objects.filter(staff_members__user=user, staff_members__is_active=True)
    if user.is_superuser:
        return Clinic.objects.filter(is_active=True)
    return managed


class ClinicTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClinicType.objects.filter(is_active=True).all()
    serializer_class = ClinicTypeSerializer
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['kind']
    ordering = ['order']


class PatientViewSet(viewsets.ViewSet):
    """سجل مرضى العيادة: تسجيل حضور مباشر وبحث وطباعة QR."""

    queryset = None

    def _get_traveler(self, pk):
        from apps.travelers.models import Traveler

        return Traveler.objects.filter(pk=pk).first()

    def list(self, request):
        from apps.travelers.models import Traveler

        q = (request.query_params.get('q') or '').strip()
        qs = Traveler.objects.select_related('nationality').all()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(passport_number__icontains=q)
                | Q(medical_file_no__icontains=q)
            )
        data = ClinicPatientSerializer(qs[:20], many=True).data
        return Response(success_response(data))

    def retrieve(self, request, pk=None):
        traveler = self._get_traveler(pk)
        if not traveler:
            return Response({'status': 'error', 'message': 'المريض غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        return Response(success_response(ClinicPatientSerializer(traveler).data))

    @action(detail=False, methods=['post'])
    def register(self, request):
        """تسجيل حالة حضور مباشر: إنشاء/إيجاد مسافر وإنشاء إحالة بانتظار القبول."""
        from apps.clinic.models import Clinic

        payload = dict(request.data)
        clinic = None
        clinic_id = payload.pop('clinic', None)
        if clinic_id:
            clinic = Clinic.objects.filter(pk=clinic_id, is_active=True).first()
        traveler, created = find_or_create_patient(payload, user=request.user)
        referral = walk_in_referral(
            traveler=traveler,
            user=request.user,
            clinic=clinic,
            port=payload.get('port'),
            notes=payload.get('notes', ''),
        )
        data = {
            'created': created,
            'traveler': ClinicPatientSerializer(traveler).data,
            'referral': ClinicReferralSerializer(referral).data,
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        traveler = self._get_traveler(pk)
        if not traveler:
            return Response({'status': 'error', 'message': 'المريض غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            success_response(
                {'qr_png': patient_qr_png(traveler), 'medical_file_no': traveler.medical_file_no}
            )
        )


class ClinicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClinicSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en', 'entry_point__name_ar']
    ordering_fields = ['order', 'name_ar']
    filter_fields = ['clinic_type', 'entry_point', 'sector', 'is_active']

    def get_queryset(self):
        qs = Clinic.objects.filter(is_active=True).select_related(
            'entry_point', 'sector', 'clinic_type'
        ).prefetch_related('staff_members__user')
        if not (self.request.user.is_superuser or self.request.user.is_staff):
            qs = qs.filter(id__in=scoped_clinics(self.request.user))
        return qs

    @action(detail=True, methods=['get'], url_path='reports')
    def reports(self, request, pk=None):
        clinic = self.get_object()
        visits = ClinicVisit.objects.filter(clinic=clinic)
        total_visits = visits.count()
        open_visits = visits.filter(visit_status=ClinicVisit.VisitStatus.OPEN).count()
        closed_visits = visits.filter(visit_status=ClinicVisit.VisitStatus.CLOSED).count()
        isolated = IsolationRecord.objects.filter(visit__clinic=clinic).count()
        certificates = HealthCertificate.objects.filter(visit__clinic=clinic).count()
        patients = visits.values('traveler').distinct().count()
        by_phase = {}
        for phase in ClinicVisit.Phase:
            cnt = visits.filter(phase=phase.value).count()
            if cnt:
                by_phase[phase.value] = cnt
        recent_closed_today = visits.filter(
            visit_status=ClinicVisit.VisitStatus.CLOSED,
            closed_at__date=timezone.localdate(),
        ).count()
        return Response(
            success_response(
                {
                    'clinic': ClinicSerializer(clinic).data,
                    'stats': {
                        'total_visits': total_visits,
                        'open_visits': open_visits,
                        'closed_visits': closed_visits,
                        'isolated': isolated,
                        'certificates': certificates,
                        'patients': patients,
                        'completed_today': recent_closed_today,
                        'by_phase': by_phase,
                    },
                }
            )
        )


class ClinicDashboardViewSet(viewsets.ViewSet):
    """لوحة الطبيب الرئيسية: إحصاءات وزيارات وإحالات بانتظار القبول."""
    serializer_class = ClinicDashboardSerializer

    def list(self, request):
        user = request.user
        open_visits = ClinicVisit.objects.filter(
            doctor=user, visit_status=ClinicVisit.VisitStatus.OPEN
        ).select_related('traveler', 'doctor', 'referral')
        closed_visits = ClinicVisit.objects.filter(
            doctor=user, visit_status=ClinicVisit.VisitStatus.CLOSED
        ).select_related('traveler', 'doctor', 'referral')
        pending_referrals = ClinicReferral.objects.filter(
            status__in=[
                ClinicReferral.ReferralStatus.PENDING,
                ClinicReferral.ReferralStatus.PRE_ACCEPT,
            ]
        ).select_related('traveler', 'traveler__nationality', 'port', 'screening')

        total_patients = (
            ClinicVisit.objects.filter(doctor=user).values('traveler').distinct().count()
        )
        completed_today = closed_visits.filter(closed_at__date=timezone.localdate()).count()

        data = {
            'stats': {
                'open_visits': open_visits.count(),
                'closed_visits': closed_visits.count(),
                'pending_referrals': pending_referrals.count(),
                'total_patients': total_patients,
                'completed_today': completed_today,
            },
            'open_visits': ClinicVisitSerializer(open_visits[:5], many=True).data,
            'pending_referrals': ClinicReferralSerializer(pending_referrals[:5], many=True).data,
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='medications', serializer_class=MedicationSerializer)
    def medications(self, request):
        meds = Medication.objects.all().order_by('name')
        data = [
            {
                'id': str(m.id),
                'name': m.name,
                'generic_name': m.generic_name,
                'unit': m.unit,
                'interactions': m.interactions or [],
            }
            for m in meds
        ]
        return Response(success_response(data))


class ReferralViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClinicReferral.objects.select_related(
        'traveler', 'traveler__nationality', 'port', 'screening'
    ).all()
    serializer_class = ClinicReferralSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    ordering_fields = ['created_at']
    filter_fields = ['status', 'port']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        referral = self.get_object()
        if referral.status not in (
            ClinicReferral.ReferralStatus.PENDING,
            ClinicReferral.ReferralStatus.PRE_ACCEPT,
        ):
            return Response({'status': 'error', 'message': 'الإحالة غير قابلة للقبول'}, status=status.HTTP_400_BAD_REQUEST)
        visit = ClinicVisit.objects.create(
            referral=referral,
            clinic=referral.clinic,
            traveler=referral.traveler,
            doctor=request.user,
        )
        referral.status = ClinicReferral.ReferralStatus.ACCEPTED
        referral.save(update_fields=['status'])
        return Response(
            success_response(ClinicVisitSerializer(visit).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        referral = self.get_object()
        if referral.status not in (
            ClinicReferral.ReferralStatus.PENDING,
            ClinicReferral.ReferralStatus.PRE_ACCEPT,
        ):
            return Response({'status': 'error', 'message': 'الإحالة غير قابلة للرفض'}, status=status.HTTP_400_BAD_REQUEST)
        notes = referral.notes
        rejection_reason = request.data.get('notes') or request.data.get('reason') or ''
        if rejection_reason:
            notes = f'{notes}\nسبب الرفض: {rejection_reason}'.strip() if notes else f'سبب الرفض: {rejection_reason}'
        referral.status = ClinicReferral.ReferralStatus.REJECTED
        referral.notes = notes
        referral.save(update_fields=['status', 'notes'])
        return Response(success_response(ClinicReferralSerializer(referral).data))

    @action(detail=True, methods=['post'], url_path='hold')
    def hold(self, request, pk=None):
        referral = self.get_object()
        if referral.status != ClinicReferral.ReferralStatus.PENDING:
            return Response({'status': 'error', 'message': 'الإحالة غير قابلة للتأجيل'}, status=status.HTTP_400_BAD_REQUEST)
        referral.status = ClinicReferral.ReferralStatus.PRE_ACCEPT
        referral.save(update_fields=['status'])
        return Response(success_response(ClinicReferralSerializer(referral).data))

    @action(detail=True, methods=['post'], url_path='release')
    def release(self, request, pk=None):
        referral = self.get_object()
        if referral.status != ClinicReferral.ReferralStatus.PRE_ACCEPT:
            return Response({'status': 'error', 'message': 'الإحالة ليست قيد المراجعة'}, status=status.HTTP_400_BAD_REQUEST)
        referral.status = ClinicReferral.ReferralStatus.PENDING
        referral.save(update_fields=['status'])
        return Response(success_response(ClinicReferralSerializer(referral).data))


class LabRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabRequest.objects.select_related('visit__traveler', 'disease').all()
    serializer_class = LabRequestSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        'barcode',
        'sample_type',
        'visit__traveler__first_name',
        'visit__traveler__last_name',
        'visit__traveler__passport_number',
    ]
    ordering_fields = ['created_at']
    ordering = ['-created_at']


class VisitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClinicVisit.objects.select_related('traveler', 'doctor', 'referral').all()
    serializer_class = ClinicVisitSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['traveler__first_name', 'traveler__last_name', 'traveler__passport_number']
    ordering_fields = ['opened_at', 'closed_at']
    filter_fields = ['visit_status', 'traveler', 'doctor', 'referral']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClinicVisitDetailSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'retrieve':
            qs = qs.prefetch_related('prescriptions', 'lab_requests', 'triages')
        return qs

    @action(detail=True, methods=['post'], url_path='emr', serializer_class=EMRRecordSerializer)
    def emr(self, request, pk=None):
        visit = self.get_object()
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            return Response({'status': 'error', 'message': 'الزيارة مغلقة'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emr, created = EMRRecord.objects.update_or_create(visit=visit, defaults=serializer.validated_data)
        if visit.phase in (ClinicVisit.Phase.REGISTERED, ClinicVisit.Phase.TRIAGED):
            visit.phase = ClinicVisit.Phase.EXAMINED
            visit.save(update_fields=['phase'])
        return Response(
            success_response(EMRRecordSerializer(emr).data),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='lab-requests', serializer_class=LabRequestSerializer)
    def lab_requests(self, request, pk=None):
        visit = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_request = serializer.save(visit=visit)
        LabSample.objects.create(
            visit=visit,
            sample_barcode=lab_request.barcode,
            sample_type=lab_request.sample_type,
            collector=request.user,
            status=LabSample.SampleStatus.REGISTERED,
        )
        data = {
            'sample_id': str(lab_request.id),
            'barcode': lab_request.barcode,
            'status': lab_request.status,
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='prescriptions', serializer_class=PrescriptionSerializer)
    def prescriptions(self, request, pk=None):
        visit = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save(visit=visit)
        return Response(
            success_response(PrescriptionSerializer(prescription).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='triage', serializer_class=TriageRecordSerializer)
    def triage(self, request, pk=None):
        visit = self.get_object()
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            return Response({'status': 'error', 'message': 'الزيارة مغلقة'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        triage = serializer.save(visit=visit, triaged_by=request.user)
        if visit.phase == ClinicVisit.Phase.REGISTERED:
            visit.phase = ClinicVisit.Phase.TRIAGED
            visit.save(update_fields=['phase'])
        return Response(
            success_response(TriageRecordSerializer(triage).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='results', serializer_class=LabResultSummarySerializer)
    def results(self, request, pk=None):
        visit = self.get_object()
        results = (
            LabResult.objects.filter(sample__visit=visit)
            .select_related('disease', 'sample', 'entered_by', 'approved_by')
            .order_by('-result_date')
        )
        return Response(success_response(self.get_serializer(results, many=True).data))

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        visit = self.get_object()
        to_phase = (request.data.get('phase') or '').upper()
        allowed = {
            p.value for p in ClinicVisit.PHASE_ALLOWED_TRANSITIONS.get(visit.phase, set())
        }
        if to_phase not in allowed:
            labels = '، '.join(
                ClinicVisit.Phase(p).label for p in sorted(allowed)
            )
            return Response(
                {'status': 'error', 'message': f'الانتقال غير مسموح. المراحل المتاحة: {labels or "لا شيء"}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if to_phase == ClinicVisit.Phase.CLOSED:
            if visit.phase not in (ClinicVisit.Phase.DECISION, ClinicVisit.Phase.CERTIFICATE):
                return Response(
                    {'status': 'error', 'message': 'لا يمكن إغلاق الزيارة قبل اتخاذ القرار الطبي'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            visit.visit_status = ClinicVisit.VisitStatus.CLOSED
            visit.closed_at = timezone.now()
            if visit.referral:
                visit.referral.status = ClinicReferral.ReferralStatus.COMPLETED
                visit.referral.save(update_fields=['status'])
        visit.phase = to_phase
        save_fields = ['phase']
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            save_fields += ['visit_status', 'closed_at']
        visit.save(update_fields=save_fields)
        return Response(success_response(ClinicVisitDetailSerializer(visit).data))

    @action(detail=True, methods=['post'], url_path='isolate', serializer_class=IsolationRecordSerializer)
    def isolate(self, request, pk=None):
        visit = self.get_object()
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            return Response({'status': 'error', 'message': 'الزيارة مغلقة'}, status=status.HTTP_400_BAD_REQUEST)
        if getattr(visit, 'isolation', None):
            return Response(
                {'status': 'error', 'message': 'يوجد سجل عزل نشط لهذه الزيارة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(visit=visit, started_by=request.user)
        allowed = {p.value for p in ClinicVisit.PHASE_ALLOWED_TRANSITIONS.get(visit.phase, set())}
        if ClinicVisit.Phase.DECISION.value in allowed:
            visit.phase = ClinicVisit.Phase.DECISION
            visit.save(update_fields=['phase'])
        return Response(
            success_response(IsolationRecordSerializer(record).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='certificate', serializer_class=HealthCertificateSerializer)
    def certificate(self, request, pk=None):
        visit = self.get_object()
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            return Response({'status': 'error', 'message': 'الزيارة مغلقة'}, status=status.HTTP_400_BAD_REQUEST)
        if visit.phase not in (ClinicVisit.Phase.DECISION, ClinicVisit.Phase.CERTIFICATE):
            return Response(
                {'status': 'error', 'message': 'يجب اتخاذ القرار الطبي قبل إصدار الشهادة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if getattr(visit, 'health_certificate', None):
            return Response(
                {'status': 'error', 'message': 'تم إصدار شهادة لهذه الزيارة بالفعل'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            data={
                'certificate_type': (request.data.get('certificate_type') or 'CLEARANCE').upper(),
                'verdict': (request.data.get('verdict') or 'RELEASE').upper(),
                'decision': request.data.get('decision', ''),
            }
        )
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save(
            visit=visit,
            issued_by=request.user,
            certificate_number=f'QC-{uuid.uuid4().hex[:10].upper()}',
            valid_until=timezone.localdate() + timedelta(days=30),
        )
        certificate.verification_path = f'/public/certificates/{certificate.certificate_number}/verify/'
        certificate.save(update_fields=['verification_path'])
        if visit.phase == ClinicVisit.Phase.DECISION:
            visit.phase = ClinicVisit.Phase.CERTIFICATE
            visit.save(update_fields=['phase'])
        return Response(
            success_response(serializer.data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        visit = self.get_object()
        if visit.visit_status == ClinicVisit.VisitStatus.CLOSED:
            return Response({'status': 'error', 'message': 'الزيارة مغلقة بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        decision = request.data.get('decision')
        summary = request.data.get('summary')
        if decision or summary:
            emr, _ = EMRRecord.objects.get_or_create(visit=visit)
            notes = dict(emr.clinical_notes or {})
            notes['disposition'] = {
                'decision': decision or '',
                'summary': summary or '',
                'closed_by': request.user.full_name,
                'closed_at': timezone.now().isoformat(),
            }
            emr.clinical_notes = notes
            emr.save(update_fields=['clinical_notes'])
        visit.visit_status = ClinicVisit.VisitStatus.CLOSED
        visit.closed_at = timezone.now()
        visit.save(update_fields=['visit_status', 'closed_at'])
        if visit.referral:
            visit.referral.status = ClinicReferral.ReferralStatus.COMPLETED
            visit.referral.save(update_fields=['status'])
        return Response(success_response(message='تم إغلاق الزيارة'))


class IsolationViewSet(viewsets.ModelViewSet):
    """سجلات العزل والحجر الصحي."""

    queryset = IsolationRecord.objects.select_related(
        'visit__traveler', 'visit__referral__port', 'started_by', 'closed_by', 'visit__clinic'
    )
    serializer_class = IsolationRecordSerializer
    filter_backends = [ExactFilterBackend, OrderingFilter]
    ordering_fields = ['started_at', 'required_days', 'expected_end_date']
    ordering = ['-started_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        role = getattr(getattr(user, 'role', None), 'role', None)
        if role == 'SUPERVISOR':
            return qs
        return qs.filter(visit__clinic__in=scoped_clinics(user))

    @action(detail=True, methods=['post'], url_path='update-status', serializer_class=IsolationRecordSerializer)
    def update_status(self, request, pk=None):
        record = self.get_object()
        health_status = (request.data.get('health_status') or '').upper()
        if health_status not in IsolationRecord.HealthStatus:
            return Response(
                {'status': 'error', 'message': 'قيمة الحالة الصحية غير صحيحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.health_status = health_status
        record.save(update_fields=['health_status'])
        return Response(success_response(self.get_serializer(record).data))

    @action(detail=True, methods=['post'], url_path='release', serializer_class=IsolationRecordSerializer)
    def release(self, request, pk=None):
        record = self.get_object()
        if record.status != IsolationRecord.Status.ACTIVE:
            return Response(
                {'status': 'error', 'message': 'السجل في حالة مغلقة بالفعل'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.status = IsolationRecord.Status.RELEASED
        record.end_date = request.data.get('end_date') or timezone.localdate()
        record.discharge_summary = request.data.get('discharge_summary', '')
        record.closed_by = request.user
        record.closed_at = timezone.now()
        record.save(
            update_fields=['status', 'end_date', 'discharge_summary', 'closed_by', 'closed_at']
        )
        return Response(success_response(self.get_serializer(record).data))


class CertificatesViewSet(viewsets.ReadOnlyModelViewSet):
    """الشهادات الصحية الصادرة عن عيادات الحجر الصحي."""

    queryset = HealthCertificate.objects.select_related(
        'visit__traveler', 'visit__clinic', 'issued_by'
    )
    serializer_class = HealthCertificateSerializer
    filter_backends = [ExactFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ['certificate_number', 'visit__traveler__full_name', 'visit__traveler__passport_number']
    ordering_fields = ['issued_at', 'valid_until']
    ordering = ['-issued_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        role = getattr(getattr(user, 'role', None), 'role', None)
        if role == 'SUPERVISOR':
            return qs
        return qs.filter(visit__clinic__in=scoped_clinics(user))

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        cert = self.get_object()
        token = cert.qr_token
        img = qrcode.make(f'{token}:{cert.certificate_number}')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return Response(success_response(data={'qr_png': base64.b64encode(buf.getvalue()).decode()}))

    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke(self, request, pk=None):
        cert = self.get_object()
        if cert.status == HealthCertificate.Status.REVOKED:
            return Response({'status': 'error', 'message': 'الشهادة ملغاة بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        cert.status = HealthCertificate.Status.REVOKED
        cert.save(update_fields=['status'])
        return Response(success_response(self.get_serializer(cert).data))


class PublicCertificateVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, number):
        cert = (
            HealthCertificate.objects.select_related('visit__traveler', 'visit__clinic', 'issued_by')
            .filter(certificate_number=number)
            .first()
        )
        if not cert:
            return Response(
                {'status': 'error', 'message': 'رقم الشهادة غير موجود'},
                status=status.HTTP_404_NOT_FOUND,
            )
        payload = {
            'certificate_number': cert.certificate_number,
            'certificate_type': cert.certificate_type,
            'verdict': cert.verdict,
            'decision': cert.decision,
            'status': cert.status,
            'issued_at': cert.issued_at,
            'clinic_name': cert.visit.clinic.name_ar if cert.visit.clinic else '',
            'traveler_name': cert.visit.traveler.full_name if cert.visit.traveler else '',
        }
        if cert.status == HealthCertificate.Status.ACTIVE:
            payload['verified'] = True
            return Response(success_response(payload))
        return Response(
            {'status': 'success', 'data': {**payload, 'verified': False}, 'message': 'الشهادة ملغاة'}
        )
