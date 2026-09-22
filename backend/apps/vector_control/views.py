from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db.models import Avg, Count, DecimalField, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.utils.scoping import SectorFieldScopedMixin, SectorScopedMixin, resolve_user_port_ids

from .models import (
    InventoryMovement,
    OpChemicalLine,
    VectorAlert,
    VectorAttachment,
    VectorAuditLog,
    VectorCase,
    VectorChemical,
    VectorControlOperation,
    VectorEquipment,
    VectorFocus,
    VectorFollowUp,
    VectorInspection,
    VectorInventoryItem,
    VectorLabResult,
    VectorRegistry,
    VectorReport,
    VectorSample,
    VectorSequence,
    VectorSite,
    VectorSurvey,
    VectorTeam,
    VectorUnit,
)
from .serializers import (
    DashboardOverviewSerializer,
    InventoryMovementSerializer,
    MapFocusSerializer,
    OpChemicalLineSerializer,
    VectorAlertSerializer,
    VectorAttachmentSerializer,
    VectorAuditLogSerializer,
    VectorCaseSerializer,
    VectorChemicalSerializer,
    VectorControlOperationSerializer,
    VectorEquipmentSerializer,
    VectorFocusSerializer,
    VectorFollowUpSerializer,
    VectorInspectionSerializer,
    VectorInventoryItemSerializer,
    VectorLabResultSerializer,
    VectorRegistrySerializer,
    VectorReportSerializer,
    VectorSampleSerializer,
    VectorSiteSerializer,
    VectorSurveySerializer,
    VectorTeamSerializer,
    VectorUnitSerializer,
)

MANAGER_ROLES = (
    'VECTOR_NATIONAL_MANAGER',
    'VECTOR_SECTOR_MANAGER',
    'VECTOR_PORT_HEAD',
    'VECTOR_FIELD_SUPERVISOR',
)


def is_vector_staff(user):
    if not user or user.is_anonymous:
        return False
    if user.is_superuser:
        return True
    return user.role_assignments.filter(
        is_active=True, role__code__startswith='VECTOR_'
    ).exists()


def is_vector_manager(user):
    if not user or user.is_anonymous:
        return False
    if user.is_superuser:
        return True
    return user.role_assignments.filter(
        is_active=True, role__code__in=MANAGER_ROLES
    ).exists()


def require_manager(user):
    if not is_vector_manager(user):
        raise PermissionDenied('تتطلب هذه العملية صلاحية مدير مكافحة نواقل')


def log_audit(user, action, obj=None, model_name='', extra=None):
    """يسجل حدثًا في سجل التدقيق دون كسر تدفق العمل."""
    try:
        VectorAuditLog.objects.create(
            action=action,
            model_name=model_name or (obj.__class__.__name__ if obj else ''),
            object_id=obj.pk if obj and hasattr(obj, 'pk') else None,
            user=user if (user and not user.is_anonymous) else None,
            details=extra or {},
        )
    except Exception:
        pass


def raise_alert(alert_type, title_ar, body='', *, focus=None, operation=None, chemical=None, item=None, severity=None, user=None):
    if severity is None:
        severity = VectorAlert.Severity.WARNING
        if alert_type == VectorAlert.AlertType.HIGH_RISK_FOCUS:
            severity = VectorAlert.Severity.CRITICAL
    try:
        VectorAlert.objects.create(
            alert_type=alert_type, severity=severity, title_ar=title_ar, body=body,
            focus=focus, operation=operation, chemical=chemical, item=item,
            created_for=None if (user and user.is_superuser) else user,
        )
    except Exception:
        pass


def apply_inventory_use(chemical, requested_qty, operation, user, item=None, unit=None):
    """يخصم كمية مبيد من رصيد المنفذ ويُسجل حركة USE وينشئ إنذار مخزون منخفض."""
    qs = VectorInventoryItem.objects.filter(chemical=chemical, quantity__gt=0)
    if operation.entry_point_id:
        qs = qs.filter(entry_point_id=operation.entry_point_id)
    if item:
        qs = qs.filter(pk=item)
    selected = qs.order_by('expiry_date', 'received_date').first()
    if not selected:
        return None
    amount = Decimal(str(requested_qty))
    new_qty = selected.quantity - amount
    if new_qty < 0:
        return None
    selected.quantity = new_qty
    selected.save(update_fields=['quantity', 'updated_at'])
    InventoryMovement.objects.create(
        item=selected,
        movement_type=InventoryMovement.MovementType.USE,
        quantity=amount,
        unit=unit or selected.unit,
        operation=operation,
        reference=f'{operation.op_number} — {operation.operation_type}',
        performed_by=user,
        performed_at=timezone.now(),
        created_by=user,
        updated_by=user,
    )
    if selected.low_stock:
        raise_alert(
            VectorAlert.AlertType.LOW_STOCK,
            f'مخزون منخفض: {selected.chemical.name_ar}',
            f'الرصيد الحالي {selected.quantity} {selected.unit} ≤ الحد الأدنى {selected.chemical.min_stock}',
            chemical=selected.chemical, item=selected, user=user,
        )
    return selected


class AuditedCreateMixin:
    def perform_create(self, serializer):
        if 'created_by' in serializer.fields or hasattr(serializer, 'Meta'):
            try:
                serializer.save(created_by=self.request.user, updated_by=self.request.user)
                return
            except (TypeError, ValueError):
                pass
        serializer.save()

    def perform_update(self, serializer):
        try:
            serializer.save(updated_by=self.request.user)
        except (TypeError, ValueError):
            serializer.save()


class VectorRegistryViewSet(viewsets.ModelViewSet):
    queryset = VectorRegistry.objects.all()
    serializer_class = VectorRegistrySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['vector_type', 'is_active']
    search_fields = ['name_ar', 'species']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)
        return qs


class VectorUnitViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    queryset = VectorUnit.objects.select_related('sector').all()
    serializer_class = VectorUnitSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['kind', 'sector', 'is_active']
    search_fields = ['name_ar', 'code']
    sector_field = 'sector'


class VectorSiteViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorSite.objects.select_related('entry_point').all()
    serializer_class = VectorSiteSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'site_type', 'is_active']
    search_fields = ['name_ar', 'entry_point__name_ar']
    port_field = 'entry_point'


class VectorTeamViewSet(SectorFieldScopedMixin, viewsets.ModelViewSet):
    queryset = VectorTeam.objects.select_related('sector', 'entry_point', 'leader').prefetch_related('members').all()
    serializer_class = VectorTeamSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['team_type', 'sector', 'entry_point', 'is_active']
    search_fields = ['name_ar', 'code']
    sector_field = 'sector'


class VectorReportViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorReport.objects.select_related(
        'entry_point', 'site', 'vector', 'reported_by', 'assessed_by'
    ).all()
    serializer_class = VectorReportSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['report_type', 'source', 'severity', 'status', 'entry_point']
    search_fields = ['report_number', 'problem_description', 'entry_point__name_ar']
    ordering_fields = ['reported_at']
    port_field = 'entry_point'

    def perform_create(self, serializer):
        serializer.save(
            reported_by=self.request.user if self.request.user.is_authenticated else None,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def assess(self, request, pk=None):
        report = self.get_object()
        if report.status != VectorReport.Status.NEW:
            return Response({'detail': 'قبول التقييم يكون فقط للبلاغات الجديدة'}, status=400)
        report.status = VectorReport.Status.ASSESSING
        report.assessment_note = request.data.get('note', '')
        report.assessed_by = request.user
        report.assessed_at = timezone.now()
        report.save(update_fields=['status', 'assessment_note', 'assessed_by', 'assessed_at', 'updated_at'])
        log_audit(request.user, 'assess_report', report, extra={'status': report.status})
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        report = self.get_object()
        if report.status != VectorReport.Status.ASSESSING:
            return Response({'detail': 'يُعتمد البلاغ بعد مرحلة التقييم'}, status=400)
        report.status = VectorReport.Status.ACCEPTED
        report.save(update_fields=['status', 'updated_at'])
        log_audit(request.user, 'accept_report', report)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'])
    def open_focus(self, request, pk=None):
        report = self.get_object()
        if report.status in (VectorReport.Status.CLOSED, VectorReport.Status.REJECTED):
            return Response({'detail': 'لا يمكن فتح بؤرة من بلاغ مغلق/مرفوض'}, status=400)
        existing = report.foci.first()
        if existing:
            return Response({'detail': 'بلاغ مرتبط ببؤرة مسبقًا'}, status=400)
        require_manager(request.user)
        focus = VectorFocus.objects.create(
            entry_point=report.entry_point,
            site=report.site,
            vector=report.vector,
            severity=report.severity,
            origin=VectorFocus.Origin.REPORT,
            source_report=report,
            description=report.problem_description,
            gps_latitude=report.gps_latitude,
            gps_longitude=report.gps_longitude,
            opened_by=request.user,
            created_by=request.user,
            updated_by=request.user,
        )
        report.status = VectorReport.Status.ACCEPTED
        if not report.assessed_at:
            report.assessed_at = timezone.now()
            report.assessed_by = report.assessed_by or request.user
        report.save(update_fields=['status', 'assessed_at', 'assessed_by', 'updated_at'])
        log_audit(request.user, 'open_focus_from_report', report, extra={'focus': str(focus.pk)})
        if report.severity in (VectorReport.Severity.HIGH, VectorReport.Severity.CRITICAL):
            raise_alert(
                VectorAlert.AlertType.HIGH_RISK_FOCUS,
                f'بؤرة {focus.focus_number} — {focus.get_severity_display()}',
                f'فُتحت من بلاغ {report.report_number} في {report.entry_point.name_ar}',
                focus=focus, user=request.user,
            )
        return Response(VectorFocusSerializer(focus).data, status=201)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        report = self.get_object()
        if report.status not in (VectorReport.Status.NEW, VectorReport.Status.ASSESSING):
            return Response({'detail': 'يُرفض البلاغ فقط إذا كان جديدًا أو قيد التقييم'}, status=400)
        report.status = VectorReport.Status.REJECTED
        report.assessment_note = request.data.get('note', report.assessment_note)
        report.assessed_by = request.user
        report.assessed_at = timezone.now()
        report.closed_at = timezone.now()
        report.save(update_fields=['status', 'assessment_note', 'assessed_by', 'assessed_at', 'closed_at', 'updated_at'])
        log_audit(request.user, 'reject_report', report, extra={'note': request.data.get('note', '')})
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        report = self.get_object()
        report.status = VectorReport.Status.CLOSED
        report.closed_at = timezone.now()
        report.save(update_fields=['status', 'closed_at', 'updated_at'])
        log_audit(request.user, 'close_report', report)
        return Response(self.get_serializer(report).data)


class VectorFocusViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorFocus.objects.select_related(
        'entry_point', 'entry_point__sector', 'site', 'vector', 'opened_by', 'closed_by', 'source_report'
    ).prefetch_related('control_operations').all()
    serializer_class = VectorFocusSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'vector', 'severity', 'status', 'origin']
    search_fields = ['focus_number', 'description', 'entry_point__name_ar', 'site__name_ar']
    ordering_fields = ['opened_at', 'severity']
    port_field = 'entry_point'

    def perform_create(self, serializer):
        serializer.save(
            opened_by=self.request.user,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        focus = self.get_object()
        if focus.status == VectorFocus.Status.CLOSED:
            return Response({'detail': 'البؤرة مغلقة مسبقًا'}, status=400)
        open_ops = focus.control_operations.exclude(
            status__in=[VectorControlOperation.Status.CLOSED, VectorControlOperation.Status.DRAFT]
        )
        if open_ops.exists():
            return Response({'detail': 'لا يمكن الإغلاق مع وجود عمليات مكافحة مفتوحة'}, status=400)
        focus.status = VectorFocus.Status.CLOSED
        focus.closed_by = request.user
        focus.closed_at = timezone.now()
        focus.closure_reason = request.data.get('reason', '')
        focus.save(update_fields=['status', 'closed_by', 'closed_at', 'closure_reason', 'updated_at'])
        log_audit(request.user, 'close_focus', focus, extra={'reason': focus.closure_reason})
        return Response(self.get_serializer(focus).data)

    @action(detail=True, methods=['post'])
    def retreat(self, request, pk=None):
        """إعادة فتح بؤرة مغلقة للمعالجة من جديد."""
        focus = self.get_object()
        if focus.status != VectorFocus.Status.CLOSED:
            return Response({'detail': 'إعادة الفتح تتم فقط للبؤر المغلقة'}, status=400)
        focus.status = VectorFocus.Status.TREATMENT
        focus.closed_by = None
        focus.closed_at = None
        focus.closure_reason = request.data.get('reason', 'أُعيدت للمعالجة')
        focus.save(update_fields=['status', 'closed_by', 'closed_at', 'closure_reason', 'updated_at'])
        log_audit(request.user, 'reopen_focus', focus)
        return Response(self.get_serializer(focus).data)


class VectorInspectionViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorInspection.objects.select_related(
        'entry_point', 'site', 'team', 'inspector', 'linked_focus'
    ).all()
    serializer_class = VectorInspectionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'site', 'purpose', 'findings_severity', 'status', 'inspector']
    search_fields = ['inspection_number', 'notes', 'hazards_found', 'entry_point__name_ar']
    ordering_fields = ['visit_datetime']
    port_field = 'entry_point'

    def perform_create(self, serializer):
        serializer.save(
            inspector=self.request.user if self.request.user.is_authenticated else None,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        inspection = self.get_object()
        if inspection.status == VectorInspection.Status.SUBMITTED:
            return Response({'detail': 'الزيارة مرفوعة مسبقًا'}, status=400)
        inspection.status = VectorInspection.Status.SUBMITTED
        inspection.save(update_fields=['status', 'updated_at'])
        log_audit(request.user, 'submit_inspection', inspection)
        return Response(self.get_serializer(inspection).data)


class VectorSurveyViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorSurvey.objects.select_related(
        'entry_point', 'site', 'vector', 'team', 'approved_by', 'suggested_focus'
    ).all()
    serializer_class = VectorSurveySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'vector', 'density', 'proposed_risk', 'status', 'method']
    search_fields = ['survey_number', 'area', 'entry_point__name_ar']
    ordering_fields = ['survey_date']
    port_field = 'entry_point'

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        survey = self.get_object()
        if survey.status == VectorSurvey.Status.APPROVED:
            return Response({'detail': 'المسح معتمد مسبقًا'}, status=400)
        require_manager(request.user)
        survey.status = VectorSurvey.Status.APPROVED
        survey.approved_by = request.user
        survey.approved_at = timezone.now()
        survey.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        log_audit(request.user, 'approve_survey', survey)
        return Response(self.get_serializer(survey).data)

    @action(detail=True, methods=['post'])
    def open_focus(self, request, pk=None):
        survey = self.get_object()
        if survey.suggested_focus_id:
            return Response({'detail': 'مسح مرتبط ببؤرة مسبقًا'}, status=400)
        require_manager(request.user)
        focus = VectorFocus.objects.create(
            entry_point=survey.entry_point,
            site=survey.site,
            vector=survey.vector,
            severity=survey.proposed_risk,
            origin=VectorFocus.Origin.SURVEY,
            description=(f'مسح {survey.survey_number}: {survey.area}'),
            opened_by=request.user,
            created_by=request.user,
            updated_by=request.user,
        )
        survey.suggested_focus = focus
        survey.save(update_fields=['suggested_focus', 'updated_at'])
        log_audit(request.user, 'open_focus_from_survey', survey, extra={'focus': str(focus.pk)})
        if survey.proposed_risk in (VectorReport.Severity.HIGH, VectorReport.Severity.CRITICAL):
            raise_alert(
                VectorAlert.AlertType.HIGH_RISK_FOCUS,
                f'بؤرة {focus.focus_number} — {focus.get_severity_display()}',
                f'فُتحت من مسح {survey.survey_number}',
                focus=focus, user=request.user,
            )
        return Response(VectorFocusSerializer(focus).data, status=201)


class VectorSampleViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorSample.objects.select_related(
        'entry_point', 'focus', 'inspection', 'survey', 'vector', 'collector', 'received_by'
    ).all()
    serializer_class = VectorSampleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'focus', 'vector', 'stage', 'status']
    search_fields = ['sample_number', 'condition_note', 'entry_point__name_ar']
    ordering_fields = ['collected_at']
    port_field = 'entry_point'

    def perform_create(self, serializer):
        serializer.save(
            collector=self.request.user if self.request.user.is_authenticated else None,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        sample = self.get_object()
        if sample.status == VectorSample.Status.COLLECTED:
            sample.status = VectorSample.Status.RECEIVED
            sample.received_by = request.user
            sample.received_at = timezone.now()
            sample.save(update_fields=['status', 'received_by', 'received_at', 'updated_at'])
        else:
            return Response({'detail': 'العينة غير قابلة للاستلام من حالتها الحالية'}, status=400)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=['post'])
    def submit_result(self, request, pk=None):
        sample = self.get_object()
        if sample.status == VectorSample.Status.REJECTED:
            return Response({'detail': 'لا يمكن إرسال نتيجة لعينة مرفوضة'}, status=400)
        result = request.data.get('result')
        if result not in tuple(VectorLabResult.Result.values):
            return Response({'detail': 'حدد النتيجة: إيجابي أو سلبي'}, status=400)
        species = request.data.get('species_identified', '')
        VectorSample.objects.filter(pk=sample.pk).update(status=VectorSample.Status.IN_TESTING, updated_at=timezone.now())
        lab_result, _ = VectorLabResult.objects.update_or_create(
            sample=sample,
            defaults={
                'result': result,
                'species_identified': species,
                'identification_method': request.data.get('identification_method', VectorLabResult.Method.MORPHOLOGY),
                'findings': request.data.get('findings', ''),
                'analyst': request.user if request.user.is_authenticated else None,
                'analyzed_at': timezone.now(),
                'created_by': request.user,
                'updated_by': request.user,
            },
        )
        log_audit(request.user, 'submit_lab_result', lab_result, extra={'result': result})
        return Response(VectorLabResultSerializer(lab_result).data)


class VectorLabResultViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorLabResult.objects.select_related(
        'sample', 'sample__entry_point', 'sample__vector', 'analyst', 'approved_by'
    ).all()
    serializer_class = VectorLabResultSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['result', 'status', 'sample']
    search_fields = ['sample__sample_number', 'species_identified']
    port_field = 'sample__entry_point'

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        result = self.get_object()
        if result.status == VectorLabResult.Status.APPROVED:
            return Response({'detail': 'النتيجة معتمدة مسبقًا'}, status=400)
        result.status = VectorLabResult.Status.APPROVED
        result.approved_by = request.user
        result.approved_at = timezone.now()
        result.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        sample = result.sample
        if sample.status != VectorSample.Status.REJECTED:
            sample.status = VectorSample.Status.COMPLETED
            sample.save(update_fields=['status', 'updated_at'])
        log_audit(request.user, 'approve_lab_result', result, extra={'result': result.result})
        focus = sample.focus
        if result.result == VectorLabResult.Result.POSITIVE:
            escalation = {
                VectorFocus.Severity.LOW: VectorFocus.Severity.MEDIUM,
                VectorFocus.Severity.MEDIUM: VectorFocus.Severity.HIGH,
                VectorFocus.Severity.HIGH: VectorFocus.Severity.CRITICAL,
            }
            if focus:
                focus_severity = escalation.get(focus.severity)
                if focus_severity and focus_severity != focus.severity:
                    focus.severity = focus_severity
                    focus.save(update_fields=['severity', 'updated_at'])
                raise_alert(
                    VectorAlert.AlertType.LAB_POSITIVE,
                    f'نتيجة مختبر إيجابية {sample.sample_number}',
                    f'النوع المحدد: {result.species_identified or "غير محدد"} — مرتبطة ببؤرة {focus.focus_number}',
                    focus=focus, severity=VectorAlert.Severity.CRITICAL, user=request.user,
                )
        return Response(self.get_serializer(result).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        result = self.get_object()
        if result.status != VectorLabResult.Status.PENDING:
            return Response({'detail': 'يُرفض فقط النتائج غير المعتمدة'}, status=400)
        result.status = VectorLabResult.Status.REJECTED
        result.rejection_reason = request.data.get('reason', '')
        result.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        sample = result.sample
        sample.status = VectorSample.Status.REJECTED
        sample.rejection_reason = result.rejection_reason
        sample.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        log_audit(request.user, 'reject_lab_result', result, extra={'reason': result.rejection_reason})
        return Response(self.get_serializer(result).data)


class VectorChemicalViewSet(viewsets.ModelViewSet):
    queryset = VectorChemical.objects.all()
    serializer_class = VectorChemicalSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['target', 'form', 'hazard_class', 'is_active', 'is_restricted']
    search_fields = ['name_ar', 'active_ingredient']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)
        return qs


class VectorEquipmentViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorEquipment.objects.select_related('assigned_team', 'entry_point').all()
    serializer_class = VectorEquipmentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['kind', 'status', 'entry_point', 'is_active']
    search_fields = ['name_ar', 'code', 'model']
    port_field = 'entry_point'


class VectorInventoryItemViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorInventoryItem.objects.select_related('chemical', 'entry_point').all()
    serializer_class = VectorInventoryItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['chemical', 'entry_point', 'expiry_date']
    search_fields = ['batch_number', 'chemical__name_ar']
    port_field = 'entry_point'

    def perform_create(self, serializer):
        item = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        InventoryMovement.objects.create(
            item=item,
            movement_type=InventoryMovement.MovementType.RECEIVE,
            quantity=item.quantity,
            unit=item.unit,
            reference=f'استلام دفعة {item.batch_number or item.chemical.name_ar}',
            performed_by=self.request.user,
            performed_at=timezone.now(),
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        item = self.get_object()
        quantity = request.data.get('quantity')
        if quantity is None:
            return Response({'detail': 'حدد الرصيد الجديد'}, status=400)
        try:
            new_qty = Decimal(str(quantity))
        except (TypeError, ValueError):
            return Response({'detail': 'الرصيد الجديد غير صالح'}, status=400)
        if new_qty < 0:
            return Response({'detail': 'الرصيد لا يكون سالبًا'}, status=400)
        delta = new_qty - item.quantity
        item.quantity = new_qty
        item.save(update_fields=['quantity', 'updated_at'])
        InventoryMovement.objects.create(
            item=item,
            movement_type=InventoryMovement.MovementType.ADJUST,
            quantity=abs(delta),
            unit=item.unit,
            reference=request.data.get('note', ''),
            performed_by=request.user,
            performed_at=timezone.now(),
            created_by=request.user,
            updated_by=request.user,
        )
        return Response(self.get_serializer(item).data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        items = [i for i in self.get_queryset() if i.low_stock]
        return Response(self.get_serializer(items, many=True).data)


class InventoryMovementViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.select_related('item', 'item__chemical', 'operation', 'performed_by').all()
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['item', 'movement_type', 'operation']
    search_fields = ['reference', 'item__batch_number']
    ordering_fields = ['performed_at']
    port_field = 'item__entry_point'

    def perform_create(self, serializer):
        movement = serializer.save(performed_by=self.request.user, created_by=self.request.user, updated_by=self.request.user)
        item = movement.item
        amount = movement.quantity
        if movement.movement_type in (InventoryMovement.MovementType.RECEIVE, InventoryMovement.MovementType.RETURN):
            item.quantity += amount
        else:
            item.quantity -= amount
            if item.quantity < 0:
                movement.delete()
                return
        item.save(update_fields=['quantity', 'updated_at'])
        if item.low_stock:
            raise_alert(
                VectorAlert.AlertType.LOW_STOCK,
                f'مخزون منخفض: {item.chemical.name_ar}',
                f'الرصيد الحالي {item.quantity} {item.unit}',
                chemical=item.chemical, item=item, user=self.request.user,
            )


class VectorControlOperationViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorControlOperation.objects.select_related(
        'focus', 'report', 'entry_point', 'site', 'vector', 'team', 'leader', 'review_by'
    ).prefetch_related('chemical_lines', 'chemical_lines__chemical', 'equipment_used').all()
    serializer_class = VectorControlOperationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['entry_point', 'focus', 'operation_type', 'status', 'team']
    search_fields = ['op_number', 'notes', 'entry_point__name_ar']
    ordering_fields = ['created_at', 'planned_at']
    port_field = 'entry_point'

    NEXT_STATUS = {
        VectorControlOperation.Status.DRAFT: VectorControlOperation.Status.APPROVED,
        VectorControlOperation.Status.APPROVED: VectorControlOperation.Status.ASSIGNED,
        VectorControlOperation.Status.ASSIGNED: VectorControlOperation.Status.IN_PROGRESS,
        VectorControlOperation.Status.IN_PROGRESS: VectorControlOperation.Status.COMPLETED,
        VectorControlOperation.Status.COMPLETED: VectorControlOperation.Status.FOLLOW_UP,
        VectorControlOperation.Status.FOLLOW_UP: None,
        VectorControlOperation.Status.CLOSED: None,
    }

    @action(detail=True, methods=['post'])
    def next(self, request, pk=None):
        operation = self.get_object()
        nxt = self.NEXT_STATUS.get(operation.status)
        if nxt is None:
            return Response({'detail': 'لا يمكن التقدم من الحالة الحالية'}, status=400)
        operation.status = nxt
        if nxt == VectorControlOperation.Status.ASSIGNED and not operation.team_id:
            team = request.data.get('team')
            if not team:
                return Response({'detail': 'حدد الفريق للإسناد'}, status=400)
            operation.team_id = team
        if nxt == VectorControlOperation.Status.IN_PROGRESS:
            operation.started_at = operation.started_at or timezone.now()
        if nxt == VectorControlOperation.Status.COMPLETED:
            operation.ended_at = operation.ended_at or timezone.now()
            if operation.focus_id:
                VectorFocus.objects.filter(pk=operation.focus_id).update(
                    status=VectorFocus.Status.TREATMENT, updated_at=timezone.now()
                )
            log_audit(request.user, 'start_complete_operation', operation)
        operation.save(update_fields=['status', 'team', 'started_at', 'ended_at', 'updated_at'])
        if nxt == VectorControlOperation.Status.COMPLETED:
            log_audit(request.user, 'complete_operation', operation)
        return Response(self.get_serializer(operation).data)

    @action(detail=True, methods=['post'])
    def chemicals(self, request, pk=None):
        """إضافة بند كيميائي وإنشاء العملية + خصم تلقائي من المخزون."""
        operation = self.get_object()
        chemical_id = request.data.get('chemical')
        quantity_used = request.data.get('quantity_used')
        if not chemical_id or quantity_used is None:
            return Response({'detail': 'حدد المبيد والكمية المستخدمة'}, status=400)
        chemical = VectorChemical.objects.filter(pk=chemical_id).first()
        if not chemical:
            return Response({'detail': 'المبيد غير موجود'}, status=400)
        item = request.data.get('item')
        applied_item = apply_inventory_use(
            chemical, quantity_used, operation, request.user,
            item=item, unit=request.data.get('unit') or chemical.unit,
        )
        if not applied_item:
            return Response({'detail': 'لا يوجد رصيد كافٍ للمبيد في منفذ العملية'}, status=400)
        line = OpChemicalLine.objects.create(
            operation=operation,
            chemical=chemical,
            item=applied_item,
            dosage=request.data.get('dosage', ''),
            concentration=request.data.get('concentration', ''),
            quantity_used=Decimal(str(quantity_used)),
            unit=request.data.get('unit') or chemical.unit,
            area_covered=request.data.get('area_covered'),
            created_by=request.user,
            updated_by=request.user,
        )
        log_audit(request.user, 'add_chemical_to_operation', line, extra={'qty': str(line.quantity_used)})
        return Response(OpChemicalLineSerializer(line).data, status=201)

    @action(detail=True, methods=['post'])
    def set_result(self, request, pk=None):
        operation = self.get_object()
        effective = request.data.get('effective')
        if effective is None:
            return Response({'detail': 'حدد نتيجة الفعالية'}, status=400)
        if operation.status not in (VectorControlOperation.Status.COMPLETED, VectorControlOperation.Status.FOLLOW_UP):
            return Response({'detail': 'النتيجة تُسجل بعد إكمال التنفيذ فقط'}, status=400)
        operation.result_effective = bool(effective)
        percent = request.data.get('effectiveness_percent')
        if percent is not None:
            try:
                percent = max(0, min(100, int(percent)))
            except (TypeError, ValueError):
                return Response({'detail': 'نسبة الفعالية يجب أن تكون رقمًا'}, status=400)
            operation.effectiveness_percent = percent
        operation.review_by = request.user
        operation.reviewed_at = timezone.now()
        if not operation.result_effective:
            operation.notes = f"{operation.notes}\n[إعادة معالجة] {request.data.get('reason', '')}".strip()
        operation.save(update_fields=['result_effective', 'effectiveness_percent', 'review_by', 'reviewed_at', 'notes', 'updated_at'])
        log_audit(request.user, 'set_operation_result', operation, extra={'effective': operation.result_effective})
        return Response(self.get_serializer(operation).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        operation = self.get_object()
        if operation.status != VectorControlOperation.Status.FOLLOW_UP:
            return Response({'detail': 'تُغلق العملية بعد مرحلة المتابعة'}, status=400)
        if operation.result_effective is None:
            return Response({'detail': 'سجل نتيجة الفعالية قبل الإغلاق'}, status=400)
        operation.status = VectorControlOperation.Status.CLOSED
        operation.save(update_fields=['status', 'updated_at'])
        log_audit(request.user, 'close_operation', operation)
        return Response(self.get_serializer(operation).data)


class VectorFollowUpViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorFollowUp.objects.select_related(
        'focus', 'focus__entry_point', 'operation', 'team', 'performed_by'
    ).all()
    serializer_class = VectorFollowUpSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['focus', 'operation', 'status', 'controlled']
    search_fields = ['followup_number', 'findings']
    ordering_fields = ['visit_datetime']
    port_field = 'focus__entry_point'

    def perform_create(self, serializer):
        serializer.save(
            performed_by=self.request.user if self.request.user.is_authenticated else None,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        followup = self.get_object()
        if followup.status == VectorFollowUp.Status.CLOSED:
            return Response({'detail': 'المتابعة مغلقة مسبقًا'}, status=400)
        controlled = request.data.get('controlled')
        if controlled is None:
            return Response({'detail': 'حدد هل تمت السيطرة؟'}, status=400)
        followup.controlled = bool(controlled)
        followup.recommend_retreatment = bool(request.data.get('recommend_retreatment', not followup.controlled))
        followup.status = VectorFollowUp.Status.CLOSED
        followup.closed_at = timezone.now()
        followup.save(update_fields=['controlled', 'recommend_retreatment', 'status', 'closed_at', 'updated_at'])
        operation = followup.operation
        focus = followup.focus
        log_audit(request.user, 'close_followup', followup, extra={'controlled': followup.controlled})
        if followup.controlled and not followup.recommend_retreatment:
            if operation and operation.status == VectorControlOperation.Status.FOLLOW_UP:
                operation.status = VectorControlOperation.Status.CLOSED
                operation.save(update_fields=['status', 'updated_at'])
            open_ops = focus.control_operations.exclude(
                status__in=[VectorControlOperation.Status.CLOSED, VectorControlOperation.Status.DRAFT]
            ).exclude(pk=operation.pk if operation else None)
            if not open_ops.exists():
                focus.status = VectorFocus.Status.CLOSED
                focus.closed_by = request.user
                focus.closed_at = timezone.now()
                focus.closure_reason = 'تمت السيطرة بعد متابعة ناجحة'
                focus.save(update_fields=['status', 'closed_by', 'closed_at', 'closure_reason', 'updated_at'])
                log_audit(request.user, 'close_focus_from_followup', focus)
            else:
                focus.status = VectorFocus.Status.MONITORING
                focus.save(update_fields=['status', 'updated_at'])
        else:
            if operation and operation.status in (
                VectorControlOperation.Status.COMPLETED, VectorControlOperation.Status.FOLLOW_UP,
            ):
                operation.status = VectorControlOperation.Status.IN_PROGRESS
                operation.notes = f"{operation.notes}\n[إعادة معالجة بعد متابعة {followup.followup_number}]".strip()
                operation.result_effective = False
                operation.save(update_fields=['status', 'notes', 'result_effective', 'updated_at'])
            focus.status = VectorFocus.Status.TREATMENT
            focus.save(update_fields=['status', 'updated_at'])
            log_audit(request.user, 'retreat_focus', focus)
        return Response(self.get_serializer(followup).data)


class VectorCaseViewSet(SectorScopedMixin, AuditedCreateMixin, viewsets.ModelViewSet):
    queryset = VectorCase.objects.select_related('focus', 'focus__entry_point').all()
    serializer_class = VectorCaseSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['focus', 'classification', 'disease']
    search_fields = ['case_number', 'disease', 'patient_ref']
    ordering_fields = ['detected_at']
    port_field = 'focus__entry_point'


class VectorAlertViewSet(viewsets.ModelViewSet):
    queryset = VectorAlert.objects.all()
    serializer_class = VectorAlertSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['alert_type', 'severity', 'is_read']
    search_fields = ['title_ar', 'body']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_anonymous or user.is_superuser:
            return qs
        if is_vector_manager(user) or user.role_assignments.filter(is_active=True, role__code__startswith='VECTOR_').exists():
            return qs
        return qs.filter(created_for=user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=['is_read', 'updated_at'])
        return Response(self.get_serializer(alert).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True, updated_at=timezone.now())
        return Response({'detail': 'تم تعليم كل التنبيهات كمقروءة'})


class VectorAttachmentViewSet(viewsets.ModelViewSet):
    queryset = VectorAttachment.objects.select_related('uploaded_by').all()
    serializer_class = VectorAttachmentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['caption', 'file']

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user if self.request.user.is_authenticated else None)


class VectorAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VectorAuditLog.objects.select_related('user').all()
    serializer_class = VectorAuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    filter_fields = ['action', 'model_name', 'user']
    search_fields = ['action', 'model_name']
    ordering_fields = ['created_at']


class VectorControlDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _port_ids(self):
        return resolve_user_port_ids(self.request.user)

    def _scoped(self, qs, port_field='entry_point_id'):
        ids = self._port_ids()
        if ids is None:
            return qs
        return qs.filter(**{f'{port_field}__in': ids}) if ids else qs.none()

    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        now = timezone.localdate()
        month_start = now.replace(day=1)
        today_start = timezone.make_aware(timezone.datetime.combine(now, timezone.datetime.min.time()))

        reports_qs = self._scoped(VectorReport.objects.all())
        inspections_qs = self._scoped(VectorInspection.objects.all())
        surveys_qs = self._scoped(VectorSurvey.objects.all())
        foci_qs = self._scoped(VectorFocus.objects.all())
        ops_qs = self._scoped(VectorControlOperation.objects.all())
        samples_qs = self._scoped(VectorSample.objects.all(), 'entry_point_id')
        lab_qs = VectorLabResult.objects.filter(status=VectorLabResult.Status.PENDING)
        inventory_qs = self._scoped(VectorInventoryItem.objects.all())

        severity_counts = dict(
            foci_qs.values_list('severity').annotate(c=Count('id')).values_list('severity', 'c')
        )
        wo_active = ops_qs.exclude(
            status__in=[VectorControlOperation.Status.CLOSED, VectorControlOperation.Status.DRAFT]
        ).count()
        avg_eff = ops_qs.filter(effectiveness_percent__isnull=False).aggregate(v=Avg('effectiveness_percent'))['v']
        low_stock = sum(1 for i in inventory_qs if i.low_stock)
        data = {
            'reports_new': reports_qs.filter(status=VectorReport.Status.NEW).count(),
            'reports_total': reports_qs.count(),
            'inspections_today': inspections_qs.filter(visit_datetime__gte=today_start).count(),
            'surveys_this_month': surveys_qs.filter(survey_date__gte=month_start).count(),
            'foci_active': foci_qs.exclude(status=VectorFocus.Status.CLOSED).count(),
            'foci_critical': foci_qs.filter(severity=VectorFocus.Severity.CRITICAL, status__in=[
                VectorFocus.Status.ACTIVE, VectorFocus.Status.TREATMENT,
            ]).count(),
            'operations_active': wo_active,
            'operations_completed': ops_qs.filter(status=VectorControlOperation.Status.COMPLETED).count(),
            'samples_pending': samples_qs.filter(status__in=[
                VectorSample.Status.COLLECTED, VectorSample.Status.RECEIVED, VectorSample.Status.IN_TESTING,
            ]).count(),
            'lab_results_pending': lab_qs.count(),
            'low_stock_items': low_stock,
            'unread_alerts': VectorAlert.objects.filter(is_read=False).count(),
            'avg_effectiveness': round(avg_eff, 1) if avg_eff is not None else None,
            'by_severity': {
                'LOW': severity_counts.get('LOW', 0),
                'MEDIUM': severity_counts.get('MEDIUM', 0),
                'HIGH': severity_counts.get('HIGH', 0),
                'CRITICAL': severity_counts.get('CRITICAL', 0),
            },
        }
        return Response(DashboardOverviewSerializer(data).data)

    @action(detail=False, methods=['get'], url_path='map')
    def map(self, request):
        foci = self._scoped(VectorFocus.objects.select_related(
            'entry_point', 'entry_point__sector', 'site', 'vector'
        ).all())
        severity = request.query_params.get('severity')
        focus_status = request.query_params.get('status')
        if severity:
            foci = foci.filter(severity=severity)
        if focus_status:
            foci = foci.filter(status=focus_status)
        items = [
            {
                'id': f.pk,
                'focus_number': f.focus_number,
                'entry_point': f.entry_point_id,
                'entry_point_name': f.entry_point.name_ar,
                'site_name': f.site.name_ar if f.site_id else None,
                'vector_name': f.vector.name_ar if f.vector_id else None,
                'severity': f.severity,
                'severity_display': f.get_severity_display(),
                'status': f.status,
                'status_display': f.get_status_display(),
                'latitude': f.gps_latitude,
                'longitude': f.gps_longitude,
                'sector_code': f.entry_point.sector.code if f.entry_point.sector_id else None,
                'sector_name': f.entry_point.sector.name_ar if f.entry_point.sector_id else None,
            }
            for f in foci
        ]
        return Response(MapFocusSerializer(items, many=True).data)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        foci_qs = self._scoped(VectorFocus.objects.all())
        ops_qs = self._scoped(VectorControlOperation.objects.all())
        reports_qs = self._scoped(VectorReport.objects.all())
        samples_qs = self._scoped(VectorSample.objects.all(), 'entry_point_id')

        def groups(qs, field):
            return [{'key': k, 'value': v} for k, v in qs.values_list(field).annotate(c=Count('id')).values_list(field, 'c')]

        sector_rows = list(
            foci_qs.values('entry_point__sector__code', 'entry_point__sector__name_ar')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        usage_rows = list(
            OpChemicalLine.objects.values('chemical__name_ar')
            .annotate(total=Coalesce(Sum('quantity_used'), 0, output_field=DecimalField(max_digits=14, decimal_places=2)))
            .order_by('-total')[:10]
        )
        data = {
            'foci_by_sector': [
                {'code': r['entry_point__sector__code'], 'name': r['entry_point__sector__name_ar'], 'count': r['count']}
                for r in sector_rows
            ],
            'foci_by_severity': groups(foci_qs, 'severity'),
            'foci_by_status': groups(foci_qs, 'status'),
            'operations_by_type': groups(ops_qs, 'operation_type'),
            'reports_by_status': groups(reports_qs, 'status'),
            'samples_by_status': groups(samples_qs, 'status'),
            'chemicals_usage': [{'chemical': r['chemical__name_ar'], 'total': r['total']} for r in usage_rows],
        }
        return Response(data)

    @action(detail=False, methods=['get'], url_path='recent-activity')
    def recent_activity(self, request):
        limit = min(int(request.query_params.get('limit', 10)), 50)
        reports = list(self._scoped(VectorReport.objects.all()).order_by('-created_at')[:limit])
        inspections = list(self._scoped(VectorInspection.objects.all()).order_by('-created_at')[:limit])
        operations = list(self._scoped(VectorControlOperation.objects.all()).order_by('-created_at')[:limit])
        followups = list(self._scoped(VectorFollowUp.objects.all(), 'focus__entry_point_id').order_by('-created_at')[:limit])
        focuses = list(self._scoped(VectorFocus.objects.all()).order_by('-created_at')[:limit])

        def moment(obj):
            return obj.created_at.time().strftime('%H:%M') if obj.created_at else ''

        activities = []
        for r in reports:
            activities.append({
                'type': 'رفع_بلاغ', 'data': {'num': r.report_number, 'severity': r.severity},
                'entry_point': r.entry_point.name_ar, 'time': r.created_at,
                'by': r.reported_by.full_name if r.reported_by_id else '',
            })
        for i in inspections:
            activities.append({
                'type': 'تفتيش', 'data': {'num': i.inspection_number, 'severity': i.findings_severity},
                'entry_point': i.entry_point.name_ar, 'time': i.created_at,
                'by': i.inspector.full_name if i.inspector_id else '',
            })
        for o in operations:
            activities.append({
                'type': 'عملية_مكافحة', 'data': {'num': o.op_number, 'op_type': o.operation_type, 'status': o.status},
                'entry_point': o.entry_point.name_ar, 'time': o.created_at,
                'by': o.created_by.full_name if o.created_by_id else '',
            })
        for f in followups:
            activities.append({
                'type': 'متابعة', 'data': {'num': f.followup_number, 'controlled': f.controlled},
                'entry_point': f.focus.entry_point.name_ar if f.focus_id else '',
                'time': f.created_at,
                'by': f.performed_by.full_name if f.performed_by_id else '',
            })
        for fc in focuses:
            activities.append({
                'type': 'بؤرة', 'data': {'num': fc.focus_number, 'severity': fc.severity},
                'entry_point': fc.entry_point.name_ar, 'time': fc.created_at,
                'by': fc.opened_by.full_name if fc.opened_by_id else '',
            })
        activities.sort(key=lambda a: a['time'], reverse=True)
        return Response(activities[:limit])