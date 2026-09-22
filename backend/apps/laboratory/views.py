import base64
import io
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.accounts.models import Role, User
from core.filters import ExactFilterBackend
from core.utils.response import success_response
from core.utils.scoping import (
    SectorFieldScopedMixin,
    has_global_scope,
    resolve_user_sectors,
)

from .models import (
    LAB_ROLE_CODES,
    CapaRecord,
    CriticalResultNotification,
    Disease,
    DiseaseCaseDefinition,
    LabEquipment,
    LabResult,
    LabSample,
    LabSection,
    LabTestCatalog,
    MaterialIssue,
    NonConformity,
    QCRecord,
    Reagent,
    ReagentLot,
    SampleMovement,
    SampleTest,
    StorageLocation,
    TreatmentProtocol,
)
from .serializers import (
    CapaRecordSerializer,
    CriticalResultNotificationSerializer,
    DiseaseCaseDefinitionSerializer,
    DiseaseSerializer,
    LabEquipmentSerializer,
    LabResultSerializer,
    LabSampleCreateSerializer,
    LabSampleReceptionCheckSerializer,
    LabSampleSerializer,
    LabSectionSerializer,
    LabTestCatalogSerializer,
    LabUserSerializer,
    LabUserWriteSerializer,
    MaterialIssueSerializer,
    NonConformitySerializer,
    QCRecordSerializer,
    ReagentLotSerializer,
    ReagentSerializer,
    SampleMovementSerializer,
    SampleTestSerializer,
    SampleTestWriteSerializer,
    StorageLocationSerializer,
    TreatmentProtocolSerializer,
)


def notify_on_positive_result(result):
    from apps.emergency_eoc.models import EmergencyAlert, HealthCase, ReportableDisease
    from apps.emergency_eoc.services import generate_case_number, raise_lab_positive

    if result.result != LabResult.Result.POSITIVE:
        return
    sample = result.sample
    traveler = sample.visit.traveler if sample.visit else None
    port = sample.visit.referral.port if sample.visit and sample.visit.referral else None
    sector = port.sector if port else None
    locality = port.locality if port else None

    if result.disease.is_public_health_emergency:
        EmergencyAlert.objects.create(
            traveler=traveler,
            port=port,
            alert_type=EmergencyAlert.AlertType.OUTBREAK,
            description=f'نتيجة إيجابية لـ {result.disease.name_ar} '
                        f'({sample.sample_number or sample.sample_barcode})',
        )

    if not ReportableDisease.objects.filter(disease_id=result.disease_id, is_enabled=True).exists():
        return
    case = HealthCase.objects.create(
        case_number=generate_case_number(),
        disease=result.disease,
        case_type=HealthCase.CaseType.CONFIRMED,
        status=HealthCase.Status.UNDER_INVESTIGATION,
        source=HealthCase.Source.LAB,
        traveler=traveler,
        person_name=traveler.full_name if traveler else '',
        nationality=traveler.nationality.name if traveler and traveler.nationality else '',
        phone=traveler.phone if traveler else '',
        passport_number=traveler.passport_number if traveler else '',
        port=port,
        sector=sector,
        locality=locality,
        lab_result=result,
        reported_date=timezone.localdate(),
        confirmation_date=timezone.localdate(),
        symptoms=result.disease.symptoms or [],
    )
    raise_lab_positive(case)


def _request_sector_ids(request):
    """معرفات قطاعات المستخدم لتقطيع إحصاءات المعمل.

    يأخذ معامل `?sector=CODE` إن وجد وهو ضمن نطاق المستخدم، وإلا يعتمد على
    نطاق المستخدم: [] للوطني (بلا تقييد) مع وجود نطاق قطاعي يعيد قطاعاته.
    """
    user = request.user
    if not user or user.is_anonymous:
        return None
    sectors = resolve_user_sectors(user)
    if not sectors:
        return None
    members_by_code = {s.code: s.pk for s in sectors}
    requested = request.query_params.get('sector')
    if requested:
        pk = members_by_code.get(requested)
        return [pk] if pk else []
    if user.is_superuser or has_global_scope(user):
        return None
    return [s.pk for s in sectors] or None


class DiseaseViewSet(viewsets.ModelViewSet):
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['icd_11_code', 'name_ar', 'name_en']
    ordering_fields = ['name_ar', 'icd_11_code']
    filter_fields = ['ihr_category', 'is_public_health_emergency', 'is_active']

    @action(detail=True, methods=['get'], url_path='case-definitions')
    def case_definitions(self, request, pk=None):
        disease = self.get_object()
        return Response(success_response(
            DiseaseCaseDefinitionSerializer(disease.case_definitions.all(), many=True).data
        ))

    @action(detail=True, methods=['post'], url_path='case-definitions', serializer_class=DiseaseCaseDefinitionSerializer)
    def add_case_definition(self, request, pk=None):
        disease = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = disease.case_definitions.count() + 1
        serializer.save(disease=disease, version=version)
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='protocols')
    def protocols(self, request, pk=None):
        disease = self.get_object()
        return Response(success_response(
            TreatmentProtocolSerializer(disease.protocols.filter(is_active=True), many=True).data
        ))

    @action(detail=True, methods=['post'], url_path='protocols', serializer_class=TreatmentProtocolSerializer)
    def add_protocol(self, request, pk=None):
        disease = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = disease.protocols.count() + 1
        serializer.save(disease=disease, version=version)
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)


class LabSectionViewSet(viewsets.ModelViewSet):
    queryset = LabSection.objects.all()
    serializer_class = LabSectionSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [OrderingFilter, ExactFilterBackend]
    ordering_fields = ['order', 'code']
    filter_fields = ['kind', 'is_active']


class LabTestCatalogViewSet(viewsets.ModelViewSet):
    queryset = LabTestCatalog.objects.all()
    serializer_class = LabTestCatalogSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_ar', 'name_en']
    filter_fields = ['section', 'is_active']
    ordering_fields = ['sort_order', 'code']


class LabSampleViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sector'
    queryset = LabSample.objects.select_related(
        'collector', 'section', 'sector', 'entry_point', 'lab_request',
        'visit__traveler', 'visit__referral__port',
    ).all()
    serializer_class = LabSampleSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['sample_number', 'sample_barcode', 'lab_request__barcode', 'visit__traveler__passport_number']
    ordering_fields = ['collected_at', 'received_at', 'created_at']
    filter_fields = ['status', 'reception_status', 'sample_type', 'source', 'priority', 'section']

    def get_serializer_class(self):
        if self.action == 'create':
            return LabSampleCreateSerializer
        if self.action in ('accept', 'conditional_accept', 'reject'):
            return LabSampleReceptionCheckSerializer
        if self.action == 'add_test':
            return SampleTestWriteSerializer
        return LabSampleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample = serializer.save()
        sample.record_movement(
            action=SampleMovement.Action.RECEIVED,
            department='استقبال العينات',
            user=request.user,
            note='تسجيل وصول العينة',
        )
        data = {
            'sample_id': str(sample.id),
            'sample_number': sample.sample_number,
            'sample_barcode': sample.sample_barcode,
            'status': sample.status,
            'reception_status': sample.reception_status,
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    def _reception_decision(self, request, pk=None):
        sample = self.get_object()
        serializer = self.get_serializer(sample, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = {
            'accept': LabSample.ReceptionStatus.ACCEPTED,
            'conditional_accept': LabSample.ReceptionStatus.CONDITIONALLY_ACCEPTED,
        }.get(self.action, LabSample.ReceptionStatus.REJECTED)

        if sample.reception_status != LabSample.ReceptionStatus.RECEIVED:
            return Response(
                {'status': 'error', 'message': 'العينة ليست في مرحلة الاستلام'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == LabSample.ReceptionStatus.REJECTED and not (serializer.validated_data.get('rejection_reason') or '').strip():
            return Response(
                {'status': 'error', 'message': 'سبب الرفض مطلوب'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sample.reception_status = new_status
        sample.reception_checklist = serializer.validated_data.get('reception_checklist', {}) or {}
        sample.reception_note = serializer.validated_data.get('reception_note', '')
        sample.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        sample.reception_decision_by = request.user
        sample.reception_decision_at = timezone.now()
        sample.received_at = sample.received_at or timezone.now()
        if new_status == LabSample.ReceptionStatus.REJECTED:
            sample.status = LabSample.SampleStatus.REJECTED
        else:
            sample.status = LabSample.SampleStatus.ACCEPTED
        sample.save()

        action_map = {
            LabSample.ReceptionStatus.ACCEPTED: SampleMovement.Action.ACCEPTED,
            LabSample.ReceptionStatus.CONDITIONALLY_ACCEPTED: SampleMovement.Action.CONDITIONALLY_ACCEPTED,
            LabSample.ReceptionStatus.REJECTED: SampleMovement.Action.REJECTED,
        }
        sample.record_movement(
            action=action_map[new_status],
            department='استقبال العينات',
            user=request.user,
            note=f'القبول: {sample.reception_note}' if new_status != LabSample.ReceptionStatus.REJECTED
                 else f'الرفض: {sample.rejection_reason}',
            metadata={'checklist': sample.reception_checklist},
        )
        return Response(success_response(LabSampleSerializer(sample).data))

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        return self._reception_decision(request, pk)

    @action(detail=True, methods=['post'], url_path='conditional-accept')
    def conditional_accept(self, request, pk=None):
        return self._reception_decision(request, pk)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        return self._reception_decision(request, pk)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        sample = self.get_object()
        section_id = request.data.get('section')
        if not section_id:
            return Response({'status': 'error', 'message': 'القسم مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        section = LabSection.objects.filter(pk=section_id).first()
        if not section:
            return Response({'status': 'error', 'message': 'قسم غير موجود'}, status=status.HTTP_400_BAD_REQUEST)
        sample.section = section
        if sample.reception_status == LabSample.ReceptionStatus.RECEIVED:
            sample.reception_status = LabSample.ReceptionStatus.ACCEPTED
            sample.received_at = sample.received_at or timezone.now()
        if sample.status in (LabSample.SampleStatus.REGISTERED, LabSample.SampleStatus.RECEIVED):
            sample.status = LabSample.SampleStatus.ACCEPTED
        sample.save()
        sample.record_movement(
            action=SampleMovement.Action.ASSIGNED,
            department=section.name_ar,
            user=request.user,
            note=f'التوزيع على قسم {section.name_ar}',
            metadata={'section': section.code},
        )
        return Response(success_response(LabSampleSerializer(sample).data))

    @action(detail=True, methods=['post'], url_path='add-test', serializer_class=SampleTestWriteSerializer)
    def add_test(self, request, pk=None):
        sample = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if sample.reception_status == LabSample.ReceptionStatus.RECEIVED:
            sample.reception_status = LabSample.ReceptionStatus.ACCEPTED
            sample.received_at = sample.received_at or timezone.now()
        if sample.status in (LabSample.SampleStatus.REGISTERED, LabSample.SampleStatus.RECEIVED):
            sample.status = LabSample.SampleStatus.ACCEPTED
        sample.save(update_fields=['reception_status', 'received_at', 'status', 'updated_at'])
        test = SampleTest.objects.create(
            sample=sample,
            disease=serializer.validated_data.get('disease'),
            test_name=serializer.validated_data.get('test_name') or (
                serializer.validated_data['disease'].name_ar if serializer.validated_data.get('disease') else 'فحص'
            ),
            method=serializer.validated_data.get('method', ''),
            instrument=serializer.validated_data.get('instrument'),
            assigned_to=serializer.validated_data.get('assigned_to'),
            priority=serializer.validated_data.get('priority', LabSample.Priority.ROUTINE),
        )
        sample.record_movement(
            action=SampleMovement.Action.ASSIGNED,
            department=sample.section.name_ar if sample.section_id else 'المختبر',
            user=request.user,
            note=f'إضافة فحص «{test.test_name}»',
            metadata={'test_id': str(test.id), 'test_name': test.test_name},
        )
        return Response(success_response(SampleTestSerializer(test).data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='reception')
    def reception(self, request):
        qs = self.get_queryset().filter(
            reception_status=LabSample.ReceptionStatus.RECEIVED
        ).order_by('-priority', '-collected_at')
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(sample_number__icontains=search) | Q(sample_barcode__icontains=search)
                | Q(lab_request__barcode__icontains=search)
            )
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                LabSampleSerializer(page, many=True).data
            )
        return Response(success_response(LabSampleSerializer(qs, many=True).data))

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        import qrcode
        sample = self.get_object()
        payload = f'NQLIS|{sample.sample_number}|{sample.sample_barcode}|{sample.sample_type}|{sample.source}'
        img = qrcode.make(payload)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return Response(success_response({
            'qr_base64': base64.b64encode(buf.getvalue()).decode(),
            'sample_number': sample.sample_number,
            'sample_barcode': sample.sample_barcode,
            'label': payload,
        }))

    @action(detail=True, methods=['get'], url_path='track')
    def track(self, request, pk=None):
        sample = self.get_object()
        return Response(success_response({
            'sample_id': str(sample.id),
            'sample_number': sample.sample_number,
            'barcode': sample.sample_barcode,
            'status': sample.status,
            'reception_status': sample.reception_status,
            'collected_at': sample.collected_at,
            'received_at': sample.received_at,
            'section': sample.section_id,
            'section_name': sample.section.name_ar if sample.section_id else '',
            'result_count': sample.results.count(),
            'test_count': sample.tests.count(),
            'movements': SampleMovementSerializer(
                sample.movements.select_related('user').all(), many=True
            ).data,
        }))

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        today = timezone.localdate()
        sector_ids = _request_sector_ids(request)
        qs = self.get_queryset()
        sections = LabSection.objects.filter(is_active=True).order_by('order')
        data = {
            'sections': LabSectionSerializer(sections, many=True).data,
            'totals': {
                'samples': qs.count(),
                'received_today': qs.filter(
                    received_at__date=today
                ).count() or qs.filter(created_at__date=today).count(),
                'pending_reception': qs.filter(
                    reception_status=LabSample.ReceptionStatus.RECEIVED
                ).count(),
                'accepted': qs.filter(
                    reception_status__in=[
                        LabSample.ReceptionStatus.ACCEPTED,
                        LabSample.ReceptionStatus.CONDITIONALLY_ACCEPTED,
                    ]
                ).count(),
                'rejected': qs.filter(
                    reception_status=LabSample.ReceptionStatus.REJECTED
                ).count(),
                'under_testing': qs.filter(
                    status__in=[
                        LabSample.SampleStatus.UNDER_TESTING,
                        LabSample.SampleStatus.PROCESSING,
                    ]
                ).count(),
                'ready_for_approval': qs.filter(
                    status=LabSample.SampleStatus.READY_FOR_APPROVAL
                ).count(),
                'completed': qs.filter(status=LabSample.SampleStatus.COMPLETED).count(),
                'urgent': qs.filter(priority=LabSample.Priority.URGENT).count(),
            },
            'by_status': {
                s: qs.filter(status=s).count()
                for s, _ in LabSample.SampleStatus.choices
            },
            'by_section': [
                {'section': sec.id, 'name': sec.name_ar, 'count': qs.filter(section=sec).count()}
                for sec in sections
            ],
            'by_source': [
                {'source': s, 'name': LabSample.Source(s).label, 'count': qs.filter(source=s).count()}
                for s, _ in LabSample.Source.choices
            ],
            'tests': _test_workload_stats(sector_ids),
            'critical': _critical_stats(sector_ids),
            'quality': _quality_stats(sector_ids),
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='national-dashboard')
    def national_dashboard(self, request):
        from collections import Counter

        from apps.emergency_eoc.models import EmergencyAlert
        from apps.laboratory.models import Laboratory
        from apps.organization.models import Sector

        sector_ids = _request_sector_ids(request)
        today = timezone.localdate()
        sectors_qs = Sector.objects.filter(is_active=True).order_by('order')
        if sector_ids:
            sectors_qs = sectors_qs.filter(pk__in=sector_ids)
        labs_by_sector = {str(l.sector_id): l for l in Laboratory.objects.filter(is_active=True).select_related('sector')}

        summary = {
            'samples': 0, 'under_testing': 0, 'completed': 0, 'positive': 0, 'negative': 0,
            'critical': 0, 'open_nc': 0,
        }
        avg_tat_list: list[float] = []
        sectors_data: list[dict] = []
        tests_counter = Counter()

        for sector in sectors_qs:
            samples = LabSample.objects.filter(sector=sector)
            total = samples.count()
            under = samples.filter(status__in=[
                LabSample.SampleStatus.UNDER_TESTING,
                LabSample.SampleStatus.PROCESSING,
            ]).count()
            completed = samples.filter(status=LabSample.SampleStatus.COMPLETED).count()
            pos = LabResult.objects.filter(sample__sector=sector, result=LabResult.Result.POSITIVE).count()
            neg = LabResult.objects.filter(sample__sector=sector, result=LabResult.Result.NEGATIVE).count()
            critical = SampleTest.objects.filter(
                sample__sector=sector, is_critical=True, critical_acknowledged_at__isnull=True,
            ).count()
            approved_tests = SampleTest.objects.filter(
                sample__sector=sector, status__in=[SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED],
            ).select_related('sample')
            tat_vals = []
            for t in approved_tests:
                start = t.sample.received_at or t.sample.collected_at
                if start and t.approved_at:
                    tat_vals.append((t.approved_at - start).total_seconds() / 3600)
            avg_tat = round(sum(tat_vals) / len(tat_vals), 2) if tat_vals else 0
            avg_tat_list.extend(tat_vals)

            eq = LabEquipment.objects.filter(sector=sector)
            eq_total = eq.count()
            eq_overdue = eq.filter(next_calibration_due__lt=today).count()
            rg = Reagent.objects.filter(sector=sector)
            lots = ReagentLot.objects.filter(reagent__sector=sector)
            rg_total = rg.count()
            rg_expiring = lots.filter(status=ReagentLot.LotStatus.EXPIRING_SOON).count()
            rg_expired = lots.filter(status=ReagentLot.LotStatus.EXPIRED).count()
            rg_low = sum(1 for r in rg if r.reorder_level and r.total_quantity <= r.reorder_level)
            open_nc = NonConformity.objects.filter(sector=sector).exclude(status=NonConformity.Status.CLOSED).count()
            pending_qc = QCRecord.objects.filter(sector=sector, status=QCRecord.Status.PENDING).count()
            alerts = EmergencyAlert.objects.filter(
                port__sector=sector, status__in=[EmergencyAlert.AlertStatus.NEW, EmergencyAlert.AlertStatus.PROCESSING],
            ).count()

            lab_obj = labs_by_sector.get(str(sector.pk))
            sector_tests = Counter(
                SampleTest.objects.filter(sample__sector=sector).values_list('test_name', flat=True)
            ).most_common(5)
            tests_counter.update(dict(sector_tests))

            sectors_data.append({
                'code': sector.code,
                'name': sector.name_ar,
                'color': sector.color,
                'laboratory': {'code': lab_obj.code, 'name': lab_obj.name_ar} if lab_obj else None,
                'totals': {
                    'samples': total,
                    'under_testing': under,
                    'completed': completed,
                    'positive': pos,
                    'negative': neg,
                    'critical': critical,
                    'avg_tat_hours': avg_tat,
                },
                'equipment': {'total': eq_total, 'overdue': eq_overdue},
                'reagents': {'total': rg_total, 'expiring_soon': rg_expiring, 'expired': rg_expired, 'low_stock': rg_low},
                'quality': {'open_nc': open_nc, 'pending_qc': pending_qc},
                'epidemic_alerts': alerts,
                'top_tests': [{'name': name, 'count': c} for name, c in sector_tests],
            })

            for key in ('samples', 'under_testing', 'completed', 'positive', 'negative', 'critical', 'open_nc'):
                summary[key] += sectors_data[-1]['totals'].get(key, 0) if key != 'open_nc' else sectors_data[-1]['quality']['open_nc']

        overall_avg_tat = round(sum(avg_tat_list) / len(avg_tat_list), 2) if avg_tat_list else 0
        recent_alerts = [
            {
                'id': str(a.id),
                'alert_type': a.alert_type,
                'description': a.description,
                'port': a.port.name_ar if a.port else '',
                'status': a.status,
                'triggered_at': a.triggered_at.isoformat() if a.triggered_at else '',
            }
            for a in EmergencyAlert.objects.filter(status__in=[
                EmergencyAlert.AlertStatus.NEW, EmergencyAlert.AlertStatus.PROCESSING,
            ]).select_related('port').order_by('-triggered_at')[:10]
        ]

        return Response(success_response({
            'generated_at': timezone.now().isoformat(),
            'sectors': sectors_data,
            'totals': {
                **summary,
                'avg_tat_hours': overall_avg_tat,
                'tests_count': sum(tests_counter.values()),
            },
            'top_tests_global': [{'name': n, 'count': c} for n, c in tests_counter.most_common(10)],
            'recent_alerts': recent_alerts,
        }))

    @action(detail=False, methods=['get'], url_path='reports')
    def reports(self, request):
        sector_ids = _request_sector_ids(request)
        sample_qs = self.get_queryset()
        tests = SampleTest.objects.select_related(
            'sample', 'disease', 'sample__section', 'sample__entry_point'
        ).filter(sample__in=sample_qs)
        decided = tests.exclude(outcome='')
        positive = tests.filter(outcome=SampleTest.Outcome.POSITIVE)
        non_compliant = tests.filter(outcome=SampleTest.Outcome.NON_COMPLIANT)

        by_section = []
        for sec in LabSection.objects.filter(is_active=True):
            st = tests.filter(sample__section=sec)
            by_section.append({
                'section': sec.id,
                'name': sec.name_ar,
                'code': sec.code,
                'total': st.count(),
                'completed': st.filter(status__in=[
                    SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED,
                ]).count(),
                'positive': positive.filter(sample__section=sec).count(),
                'non_compliant': non_compliant.filter(sample__section=sec).count(),
                'critical': st.filter(is_critical=True).count(),
            })

        by_source = []
        for s, label in LabSample.Source.choices:
            qs = sample_qs.filter(source=s)
            by_source.append({
                'source': s, 'name': label, 'count': qs.count(),
            })

        by_disease = []
        for row in tests.exclude(disease__isnull=True).values('disease').distinct():
            disease = Disease.objects.filter(pk=row['disease']).first()
            dt = tests.filter(disease_id=row['disease'])
            by_disease.append({
                'disease': str(row['disease']),
                'name': disease.name_ar if disease else '',
                'total': dt.count(),
                'positive': dt.filter(outcome=SampleTest.Outcome.POSITIVE).count(),
            })

        approved = tests.filter(status__in=[SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED])
        tat = []
        for t in approved:
            start = t.sample.received_at or t.sample.collected_at
            if start:
                tat.append((t.approved_at - start).total_seconds() / 3600)
        avg_tat = round(sum(tat) / len(tat), 2) if tat else 0

        return Response(success_response({
            'summary': {
                'samples': sample_qs.count(),
                'tests': tests.count(),
                'decided': decided.count(),
                'completed': approved.count(),
                'positive': positive.count(),
                'non_compliant': non_compliant.count(),
                'critical': tests.filter(is_critical=True).count(),
                'positivity_rate': round(positive.count() / decided.count() * 100, 2) if decided.count() else 0,
                'avg_tat_hours': avg_tat,
            },
            'by_section': by_section,
            'by_source': by_source,
            'by_disease': sorted(by_disease, key=lambda x: -x['total']),
        }))


def _test_workload_stats(sector_ids=None):
    tests = SampleTest.objects.all()
    if sector_ids:
        tests = tests.filter(sample__sector_id__in=sector_ids)
    return {
        'total': tests.count(),
        'pending': tests.filter(status=SampleTest.Status.PENDING).count(),
        'in_progress': tests.filter(status=SampleTest.Status.IN_PROGRESS).count(),
        'draft': tests.filter(status=SampleTest.Status.DRAFT).count(),
        'submitted': tests.filter(
            status__in=[SampleTest.Status.SUBMITTED, SampleTest.Status.REVIEWED]
        ).count(),
        'approved': tests.filter(
            status__in=[SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED]
        ).count(),
    }


def _critical_stats(sector_ids=None):
    open_crit = SampleTest.objects.filter(
        is_critical=True, critical_acknowledged_at__isnull=True
    )
    acknowledged = SampleTest.objects.filter(
        is_critical=True, critical_acknowledged_at__isnull=False
    )
    recent = CriticalResultNotification.objects.filter(acknowledged_at__isnull=True)
    if sector_ids:
        open_crit = open_crit.filter(sample__sector_id__in=sector_ids)
        acknowledged = acknowledged.filter(sample__sector_id__in=sector_ids)
        recent = recent.filter(test__sample__sector_id__in=sector_ids)
    return {
        'open': open_crit.count(),
        'acknowledged': acknowledged.count(),
        'recent': recent.count(),
    }


def _quality_stats(sector_ids=None):
    today = timezone.localdate()
    equipment = LabEquipment.objects.all()
    lots = ReagentLot.objects.all()
    reagents = Reagent.objects.all()
    qc = QCRecord.objects.all()
    ncs = NonConformity.objects.all()
    if sector_ids:
        equipment = equipment.filter(sector_id__in=sector_ids)
        lots = lots.filter(reagent__sector_id__in=sector_ids)
        reagents = reagents.filter(sector_id__in=sector_ids)
        qc = qc.filter(sector_id__in=sector_ids)
        ncs = ncs.filter(sector_id__in=sector_ids)
    return {
        'equipment': {
            'total': equipment.count(),
            'overdue': equipment.filter(next_calibration_due__lt=today).count(),
            'due_soon': equipment.filter(
                next_calibration_due__gte=today, next_calibration_due__lte=today + timedelta(days=30)
            ).count(),
        },
        'reagents': {
            'total': reagents.count(),
            'expiring_soon': lots.filter(status=ReagentLot.LotStatus.EXPIRING_SOON).count(),
            'expired': lots.filter(status=ReagentLot.LotStatus.EXPIRED).count(),
            'low_stock': sum(1 for r in reagents if r.reorder_level and r.total_quantity <= r.reorder_level),
        },
        'qc': {
            'pending': qc.filter(status=QCRecord.Status.PENDING).count(),
            'failed': qc.filter(status=QCRecord.Status.FAILED).count(),
        },
        'non_conformities': {
            'open': ncs.exclude(status=NonConformity.Status.CLOSED).count(),
        },
    }


class SampleTestViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sample__sector'
    queryset = SampleTest.objects.select_related(
        'sample', 'sample__section', 'disease', 'instrument',
        'assigned_to', 'entered_by', 'reviewed_by', 'approved_by', 'lab_result',
    ).all()
    serializer_class = SampleTestSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['sample__sample_number', 'sample__sample_barcode', 'test_name']
    ordering_fields = ['updated_at', 'created_at']
    filter_fields = ['sample', 'status', 'priority', 'assigned_to', 'is_critical']

    def get_serializer_class(self):
        if self.action == 'create':
            return SampleTestWriteSerializer
        if self.action in ('save_result', 'enter_result'):
            return SampleTestWriteSerializer
        return SampleTestSerializer

    def create(self, request, *args, **kwargs):
        serializer = SampleTestWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample_id = serializer.validated_data.get('sample')
        sample = LabSample.objects.filter(pk=sample_id.id if sample_id else None).first()
        if not sample:
            return Response(
                {'status': 'error', 'message': 'العينة مطلوبة وغير موجودة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        test = SampleTest.objects.create(
            sample=sample,
            disease=serializer.validated_data.get('disease'),
            test_name=serializer.validated_data.get('test_name') or (
                serializer.validated_data['disease'].name_ar if serializer.validated_data.get('disease') else 'فحص'
            ),
            method=serializer.validated_data.get('method', ''),
            instrument=serializer.validated_data.get('instrument'),
            assigned_to=serializer.validated_data.get('assigned_to'),
            priority=serializer.validated_data.get('priority', LabSample.Priority.ROUTINE),
        )
        sample.record_movement(
            action=SampleMovement.Action.ASSIGNED,
            department=sample.section.name_ar if sample.section_id else 'المختبر',
            user=request.user,
            note=f'إضافة فحص «{test.test_name}»',
            metadata={'test_id': str(test.id)},
        )
        return Response(
            success_response(SampleTestSerializer(test).data), status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='worklist')
    def worklist(self, request):
        qs = self.get_queryset()
        section = request.query_params.get('section')
        status_filter = request.query_params.get('status')
        analyst = request.query_params.get('assigned_to')
        priority = request.query_params.get('priority')
        my = request.query_params.get('my')
        if section:
            qs = qs.filter(sample__section_id=section)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if analyst:
            qs = qs.filter(assigned_to_id=analyst)
        if priority:
            qs = qs.filter(priority=priority)
        if my and my in ('1', 'true', 'True'):
            qs = qs.filter(assigned_to=request.user)
        qs = qs.order_by(
            '-priority', '-sample__priority', 'updated_at'
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SampleTestSerializer(page, many=True).data)
        return Response(success_response(SampleTestSerializer(qs, many=True).data))

    def _require_status(self, test, allowed, message):
        if test.status not in allowed:
            raise ValueError(message)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        test = self.get_object()
        if test.status != SampleTest.Status.PENDING:
            return Response(
                {'status': 'error', 'message': 'الفحص بدأ بالفعل'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        test.status = SampleTest.Status.IN_PROGRESS
        test.assigned_to = test.assigned_to or request.user
        test.save(update_fields=['status', 'assigned_to', 'updated_at'])
        test.sample.record_movement(
            action=SampleMovement.Action.RESULT_ENTERED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'بدء فحص «{test.test_name}»',
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['patch'], url_path='save-result')
    def save_result(self, request, pk=None):
        test = self.get_object()
        if test.status in (SampleTest.Status.PENDING, SampleTest.Status.IN_PROGRESS, SampleTest.Status.DRAFT):
            serializer = SampleTestWriteSerializer(test, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            test = serializer.save()
            test.status = SampleTest.Status.DRAFT if test.status != SampleTest.Status.DRAFT else test.status
            test.save()
            return Response(success_response(SampleTestSerializer(test).data))
        return Response(
            {'status': 'error', 'message': 'لا يمكن حفظ النتيجة في هذه المرحلة'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=['post'], url_path='enter-result')
    def enter_result(self, request, pk=None):
        test = self.get_object()
        if test.status not in (SampleTest.Status.IN_PROGRESS, SampleTest.Status.DRAFT):
            return Response(
                {'status': 'error', 'message': 'الفحص يجب أن يكون قيد التنفيذ أو مسودة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not len(test.outcome or ''):
            serializer = SampleTestWriteSerializer(test, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            test = serializer.save()
        if not len(test.outcome or ''):
            return Response(
                {'status': 'error', 'message': 'النتيجة (outcome) مطلوبة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        test.status = SampleTest.Status.SUBMITTED
        test.entered_by = request.user
        test.entered_at = timezone.now()
        test.save(update_fields=['status', 'entered_by', 'entered_at', 'updated_at'])
        if test.sample.status in (LabSample.SampleStatus.ACCEPTED, LabSample.SampleStatus.REGISTERED):
            test.sample.status = LabSample.SampleStatus.UNDER_TESTING
            test.sample.save(update_fields=['status', 'updated_at'])
        test.sample.record_movement(
            action=SampleMovement.Action.SUBMITTED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'إرسال نتيجة «{test.test_name}» للمراجعة',
            metadata={'outcome': test.outcome, 'value': test.result_value},
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        test = self.get_object()
        if test.status != SampleTest.Status.SUBMITTED:
            return Response(
                {'status': 'error', 'message': 'الفحص غير مرسل للمراجعة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        test.reviewed_by = request.user
        test.reviewed_at = timezone.now()
        if 'notes' in request.data:
            test.notes = request.data.get('notes', test.notes)
        test.status = SampleTest.Status.REVIEWED
        test.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'notes', 'updated_at'])
        test.sample.record_movement(
            action=SampleMovement.Action.REVIEWED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'مراجعة «{test.test_name}»',
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        test = self.get_object()
        if test.status != SampleTest.Status.REVIEWED:
            return Response(
                {'status': 'error', 'message': 'الفحص يجب أن يراجع قبل الاعتماد'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        test.approved_by = request.user
        test.approved_at = timezone.now()
        test.is_critical = test.should_be_critical()
        test.status = SampleTest.Status.COMPLETED
        test.save(update_fields=[
            'status', 'approved_by', 'approved_at', 'is_critical', 'updated_at',
        ])

        result = self._backfill_lab_result(test, request.user)
        if result:
            notify_on_positive_result(result)

        if test.is_critical and not test.critical_acknowledged_at:
            CriticalResultNotification.objects.create(
                test=test,
                channel='NQLIS',
                note=f'نتيجة حرجة: {test.test_name} ({test.outcome})',
            )
        self._recompute_sample_status(test.sample)
        test.sample.record_movement(
            action=SampleMovement.Action.APPROVED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'اعتماد نتيجة «{test.test_name}» — {test.outcome}',
            metadata={'outcome': test.outcome, 'critical': test.is_critical},
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='return-result')
    def return_result(self, request, pk=None):
        test = self.get_object()
        if test.status != SampleTest.Status.SUBMITTED:
            return Response(
                {'status': 'error', 'message': 'إعادة النتيجة متاحة فقط للمرسلة للمراجعة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get('reason', '')
        test.status = SampleTest.Status.DRAFT
        test.reviewed_by = None
        test.reviewed_at = None
        test.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        test.sample.record_movement(
            action=SampleMovement.Action.RETURNED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'إعادة «{test.test_name}» للفني: {reason}' if reason else f'إعادة «{test.test_name}» للفني',
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='revise')
    def revise(self, request, pk=None):
        test = self.get_object()
        if test.status not in (SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED):
            return Response(
                {'status': 'error', 'message': 'التعديل متاح للنتائج المعتمدة فقط'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        previous = {
            'outcome': test.outcome, 'value': test.result_value, 'text': test.result_text,
            'version': test.version,
        }
        test.version += 1
        test.status = SampleTest.Status.SUBMITTED
        test.reviewed_by = None
        test.reviewed_at = None
        test.approved_by = None
        test.approved_at = None
        test.is_critical = False
        test.critical_acknowledged_by = None
        test.critical_acknowledged_at = None
        test.save(update_fields=[
            'version', 'status', 'reviewed_by', 'reviewed_at', 'approved_by',
            'approved_at', 'is_critical', 'critical_acknowledged_by',
            'critical_acknowledged_at', 'updated_at',
        ])
        test.sample.record_movement(
            action=SampleMovement.Action.REVISED,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'تعديل نتيجة «{test.test_name}» إلى الإصدار {test.version}',
            metadata={'previous': previous},
        )
        return Response(success_response(SampleTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        test = self.get_object()
        test.critical_acknowledged_by = request.user
        test.critical_acknowledged_at = timezone.now()
        test.save(update_fields=['critical_acknowledged_by', 'critical_acknowledged_at', 'updated_at'])
        CriticalResultNotification.objects.filter(
            test=test, acknowledged_at__isnull=True
        ).update(acknowledged_by=request.user, acknowledged_at=timezone.now())
        test.sample.record_movement(
            action=SampleMovement.Action.CRITICAL_ACK,
            department=test.sample.section.name_ar if test.sample.section_id else '',
            user=request.user,
            note=f'إقرار النتيجة الحرجة «{test.test_name}»',
        )
        return Response(success_response(SampleTestSerializer(test).data))

    def _backfill_lab_result(self, test, user):
        if not test.disease or test.lab_result_id:
            return None
        if test.outcome in (LabResult.Result.POSITIVE, LabResult.Result.NEGATIVE, LabResult.Result.INCONCLUSIVE):
            result_choice = test.outcome
        elif test.outcome == SampleTest.Outcome.NON_COMPLIANT:
            result_choice = LabResult.Result.POSITIVE
        elif test.outcome == SampleTest.Outcome.COMPLIANT:
            result_choice = LabResult.Result.NEGATIVE
        else:
            result_choice = LabResult.Result.INCONCLUSIVE
        result = LabResult.objects.create(
            sample=test.sample,
            disease=test.disease,
            result=result_choice,
            value=test.result_value,
            entered_by=test.entered_by or user,
            approved_by=user,
            approval_status=LabResult.ApprovalStatus.APPROVED,
        )
        test.lab_result = result
        test.save(update_fields=['lab_result', 'updated_at'])
        return result

    def _recompute_sample_status(self, sample):
        statuses = list(sample.tests.values_list('status', flat=True))
        if not statuses:
            return
        completed = all(s in (SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED) for s in statuses)
        if completed:
            sample.status = LabSample.SampleStatus.COMPLETED
            sample.save(update_fields=['status', 'updated_at'])
            if not sample.public_result_code:
                sample.publish_result()
        elif any(s in (SampleTest.Status.APPROVED, SampleTest.Status.COMPLETED) for s in statuses):
            sample.status = LabSample.SampleStatus.READY_FOR_APPROVAL
        elif any(s in (SampleTest.Status.SUBMITTED, SampleTest.Status.REVIEWED) for s in statuses):
            sample.status = LabSample.SampleStatus.UNDER_TESTING
        sample.save(update_fields=['status', 'updated_at'])


class LabEquipmentViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sector'
    queryset = LabEquipment.objects.select_related('section').all()
    serializer_class = LabEquipmentSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'model_number', 'serial_number']
    filter_fields = ['section', 'status']
    ordering_fields = ['name_ar']


class StorageLocationViewSet(viewsets.ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['location_type']


class ReagentViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sector'
    queryset = Reagent.objects.select_related('section', 'storage').prefetch_related('lots').all()
    serializer_class = ReagentSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_ar', 'name_en', 'catalog_number']
    filter_fields = ['section', 'material_type', 'hazard_class']
    ordering_fields = ['name_ar']


class ReagentLotViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'reagent__sector'
    queryset = ReagentLot.objects.select_related('reagent', 'storage').all()
    serializer_class = ReagentLotSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['lot_number', 'batch_number', 'reagent__name_ar']
    filter_fields = ['reagent', 'status', 'expiry_date']
    ordering_fields = ['expiry_date']


class MaterialIssueViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'lot__reagent__sector'
    queryset = MaterialIssue.objects.select_related('lot__reagent', 'issued_by').all()
    serializer_class = MaterialIssueSerializer
    http_method_names = ['get', 'post']
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['lot', 'issue_type']
    ordering_fields = ['issued_at']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = serializer.save(issued_by=request.user)
        return Response(
            success_response(MaterialIssueSerializer(issue).data), status=status.HTTP_201_CREATED
        )


class QCRecordViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sector'
    queryset = QCRecord.objects.select_related('section', 'test', 'reviewed_by').all()
    serializer_class = QCRecordSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['qc_number', 'control_type', 'lot_number']
    filter_fields = ['section', 'status', 'severity', 'test']
    ordering_fields = ['created_at']

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        qc = self.get_object()
        new_status = request.data.get('status')
        if new_status not in (QCRecord.Status.PASSED, QCRecord.Status.FAILED):
            return Response(
                {'status': 'error', 'message': 'حالة الاعتماد يجب أن تكون PASSED أو FAILED'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qc.status = new_status
        qc.severity = request.data.get('severity', qc.severity)
        qc.qc_notes = request.data.get('qc_notes', qc.qc_notes)
        qc.reviewed_by = request.user
        qc.reviewed_at = timezone.now()
        qc.save()
        return Response(success_response(QCRecordSerializer(qc).data))


class NonConformityViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'sector'
    queryset = NonConformity.objects.select_related('section', 'reported_by').all()
    serializer_class = NonConformitySerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['nc_number', 'title', 'reference_number']
    filter_fields = ['nc_type', 'section', 'severity', 'status']
    ordering_fields = ['created_at']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nc = serializer.save(reported_by=request.user)
        return Response(
            success_response(NonConformitySerializer(nc).data), status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        nc = self.get_object()
        new_status = request.data.get('status')
        if new_status not in NonConformity.Status.values:
            return Response(
                {'status': 'error', 'message': 'حالة غير صالحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        nc.status = new_status
        nc.root_cause = request.data.get('root_cause', nc.root_cause)
        nc.capa_required = request.data.get('capa_required', nc.capa_required)
        if new_status == NonConformity.Status.CLOSED:
            nc.closed_at = timezone.now()
        nc.save()
        return Response(success_response(NonConformitySerializer(nc).data))


class CapaRecordViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'non_conformity__sector'
    queryset = CapaRecord.objects.select_related('non_conformity', 'responsible_user').all()
    serializer_class = CapaRecordSerializer
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['non_conformity', 'status', 'responsible_user']
    ordering_fields = ['due_date']

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        capa = self.get_object()
        new_status = request.data.get('status')
        if new_status not in CapaRecord.Status.values:
            return Response(
                {'status': 'error', 'message': 'حالة غير صالحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        capa.status = new_status
        capa.verification_notes = request.data.get('verification_notes', capa.verification_notes)
        if new_status == CapaRecord.Status.CLOSED:
            capa.closed_at = timezone.now()
        capa.save()
        if new_status == CapaRecord.Status.CLOSED:
            nc = capa.non_conformity
            nc.status = NonConformity.Status.CLOSED
            nc.closed_at = timezone.now()
            nc.save(update_fields=['status', 'closed_at', 'updated_at'])
        return Response(success_response(CapaRecordSerializer(capa).data))


class CriticalResultViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    sector_field = 'test__sample__sector'
    queryset = CriticalResultNotification.objects.select_related(
        'test', 'test__sample', 'acknowledged_by'
    ).all()
    serializer_class = CriticalResultNotificationSerializer
    http_method_names = ['get', 'patch']
    filter_backends = [OrderingFilter, ExactFilterBackend]
    filter_fields = ['acknowledged_by']
    ordering_fields = ['notified_at']

    def get_queryset(self):
        qs = super().get_queryset()
        open_only = self.request.query_params.get('open')
        if open_only in ('1', 'true', 'True'):
            qs = qs.filter(acknowledged_at__isnull=True)
        return qs

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        notification = self.get_object()
        notification.acknowledged_by = request.user
        notification.acknowledged_at = timezone.now()
        notification.note = request.data.get('note', notification.note)
        notification.save()
        test = notification.test
        test.critical_acknowledged_by = request.user
        test.critical_acknowledged_at = timezone.now()
        test.save(update_fields=['critical_acknowledged_by', 'critical_acknowledged_at', 'updated_at'])
        return Response(
            success_response(CriticalResultNotificationSerializer(notification).data)
        )

class LabUsersManagePermission(BasePermission):
    """قراءة: أي مستخدم موثّق. إدارة: المشرف أو مدير المختبر (LAB_DIRECTOR / LAB_MANAGER)."""

    MANAGER_CODES = ('LAB_DIRECTOR', 'LAB_MANAGER')

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action in ('list', 'retrieve', 'lab_roles'):
            return True
        if request.user.is_staff:
            return True
        return bool(request.user.role and request.user.role.code in self.MANAGER_CODES)


class LabUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('role').filter(
        role__code__in=LAB_ROLE_CODES
    ).order_by('full_name')
    permission_classes = [LabUsersManagePermission]
    pagination_class = None
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['email', 'full_name', 'phone']
    ordering_fields = ['full_name', 'email', 'created_at']
    filter_fields = ['is_active']

    def get_queryset(self):
        qs = super().get_queryset()
        role_code = self.request.query_params.get('role')
        if role_code:
            qs = qs.filter(role__code=role_code)
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser or has_global_scope(user):
            return qs
        from apps.accounts.models import RoleAssignment
        sectors = resolve_user_sectors(user)
        if not sectors:
            return qs.none()
        return qs.filter(
            role_assignments__scope_type=RoleAssignment.ScopeType.SECTOR,
            role_assignments__scope_id__in=[s.pk for s in sectors],
            role_assignments__is_active=True,
        ).distinct()

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return LabUserWriteSerializer
        return LabUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            success_response(LabUserSerializer(user).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(success_response(LabUserSerializer(user).data))

    @action(detail=False, methods=['get'], url_path='lab-roles')
    def lab_roles(self, request):
        roles = []
        labs = Role.objects.filter(code__in=LAB_ROLE_CODES)
        for role in labs:
            roles.append({
                'code': role.code,
                'name_ar': role.name_ar,
                'name': role.name,
                'user_count': role.users.filter(is_active=True).count(),
            })
        return Response(success_response(roles))

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'status': 'error', 'message': 'كلمة المرور يجب ألا تقل عن 8 أحرف'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])
        return Response(success_response({'email': user.email, 'reset': True}))
