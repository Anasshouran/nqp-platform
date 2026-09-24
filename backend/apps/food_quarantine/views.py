import uuid
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User as AccountUser
from apps.finance.models import Invoice as FinanceInvoice
from apps.finance.models import InvoiceStatus as FinanceInvoiceStatus
from apps.finance.services import FinanceServiceError, confirm_payment, create_shipment_invoice
from apps.masterdata.models import EntryPoint as Port
from apps.notifications.models import NotificationLog
from apps.organization.models import Sector

from core.utils.response import error_response, success_response

from .models import (
    AnalyticalMethod,
    AnalysisCertificate,
    AuditLog,
    ChainOfCustody,
    CpaRecord,
    DisposalRequest,
    FoodDecisionCertificate,
    FoodInspection,
    FoodInvoice,
    FoodOrderItem,
    FoodProduct,
    FoodReleaseCertificate,
    FoodSample,
    FoodShipment,
    FoodShipmentEvent,
    LabEquipment,
    LabParameter,
    MaterialCatalog,
    MaterialIssue,
    MaterialLot,
    MicrobiologicalLimit,
    MicrobiologicalSpecification,
    Microorganism,
    NonConformity,
    ProductCategory,
    QCRecord,
    QuarantineFee,
    Reagent,
    ReferenceSample,
    RegulatoryRule,
    ResultEvaluation,
    SampleSource,
    SampleTest,
    SampleTestRevision,
    SampleUnitResult,
    SamplingPolicy,
    ShipmentAttachment,
    Solution,
    SpecificationVersion,
    Standard,
    StandardRequirement,
    StandardVersion,
    StorageLocation,
    TestMethod,
)
from .serializers import (
    AnalyticalMethodSerializer,
    AnalysisCertificateSerializer,
    AuditLogSerializer,
    ChainOfCustodySerializer,
    CpaRecordSerializer,
    DisposalRequestSerializer,
    FinanceFoodInvoiceSerializer,
    FoodDecisionCertificateSerializer,
    FoodInspectionSerializer,
    FoodInvoiceSerializer,
    FoodProductSerializer,
    FoodSampleSerializer,
    FoodSampleWriteSerializer,
    FoodShipmentSerializer,
    LabEquipmentSerializer,
    LabParameterSerializer,
    MaterialCatalogSerializer,
    MaterialIssueSerializer,
    MaterialLotSerializer,
    MicrobiologicalLimitSerializer,
    MicrobiologicalSpecificationSerializer,
    MicroorganismSerializer,
    NonConformitySerializer,
    ProductCategorySerializer,
    QCRecordSerializer,
    QuarantineFeeSerializer,
    ReagentSerializer,
    ReferenceSampleSerializer,
    RegulatoryRuleSerializer,
    ResultEvaluationSerializer,
    SampleSourceSerializer,
    SampleTestSerializer,
    SampleUnitResultSerializer,
    SamplingPolicySerializer,
    ShipmentAttachmentSerializer,
    SolutionSerializer,
    SpecificationVersionSerializer,
    StandardSerializer,
    StandardRequirementSerializer,
    StandardVersionSerializer,
    StorageLocationSerializer,
    TestMethodSerializer,
    QualityDashboardSerializer,
)
from .services import apply_sampling, build_export_inspection_form, compute_fee_breakdown


# ---------------------------------------------------------------------------
#  أدوات مساعدة (نفس نمط باقي الموديولات: الدور عبر Role.code / تعيينات الدور)
# ---------------------------------------------------------------------------

def _has_role(user, code):
    if not user or user.is_anonymous:
        return False
    if user.role_assignments.filter(role__code=code, is_active=True).exists():
        return True
    return bool(user.role_id and getattr(user.role, 'code', None) == code)


def _audit(request, action, obj=None, event=None, object_type=None, object_id=None, object_label=None, extra=None):
    detail = dict(extra or {})
    if event:
        detail['event'] = event
    source = request.user if request else None
    AuditLog.objects.create(
        user=source,
        action=action,
        object_type=object_type or 'FoodShipment',
        object_id=object_id or (str(getattr(obj, 'id', '')) if obj else ''),
        object_label=object_label or (str(obj) if obj else ''),
        detail=detail,
        ip_address=request.META.get('REMOTE_ADDR', '') if request else '',
    )


def _notify(user, subject, body, channel='email'):
    NotificationLog.objects.create(
        user=user,
        channel=channel,
        recipient=user.email,
        subject=subject,
        body=body,
        status=NotificationLog.NotificationStatus.SENT,
        sent_at=timezone.now(),
    )


def _persist_shipment(shipment, fields):
    if 'updated_at' not in fields:
        fields = list(fields) + ['updated_at']
    shipment.save(update_fields=fields)


def _log_event(shipment, stage, actor, message=''):
    try:
        FoodShipmentEvent.objects.create(shipment=shipment, stage=stage, actor=actor, message=message)
    except Exception:  # الأحداث سجلّية وليست حرجة — لا تُفشل العملية عند تعذرها
        pass


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = FoodShipment.objects.all()
    serializer_class = FoodShipmentSerializer
    permission_classes = [IsAuthenticated]

    # ------------------------------------------------------------------
    #  القوائم / التصفية
    # ------------------------------------------------------------------
    def get_queryset(self):
        qs = super().get_queryset()
        port_type = self.request.query_params.get('port_type')
        if port_type:
            qs = qs.filter(port__kind=port_type)
        inspector = self.request.query_params.get('assigned_inspector')
        if inspector:
            qs = qs.filter(assigned_inspector_id=inspector)
        shipment_status = self.request.query_params.get('status')
        if shipment_status:
            qs = qs.filter(status=shipment_status)
        return qs

    # ------------------------------------------------------------------
    #  الإنشاء/التعديل/الحذف (المسودة اليدوية + السلوك القديم)
    # ------------------------------------------------------------------
    @staticmethod
    def _set_items(shipment, items):
        if items is None:
            return
        shipment.items.all().delete()
        total = Decimal('0')
        for row in items:
            try:
                weight = Decimal(str(row.get('weight_kg') or 0))
            except Exception:
                weight = Decimal('0')
            total += weight
            FoodOrderItem.objects.create(
                shipment=shipment,
                product_name=row.get('product_name', ''),
                brand=row.get('brand', ''),
                origin=row.get('origin', ''),
                weight_kg=weight,
                package_count=row.get('package_count') or 0,
                package_type=row.get('package_type', ''),
            )
        shipment.total_weight_kg = total
        _persist_shipment(shipment, ['total_weight_kg'])

    def create(self, request, *args, **kwargs):
        data = request.data
        as_draft = bool(data.get('as_draft'))
        shipment_type = data.get('shipment_type') or FoodShipment.ShipmentType.IMPORT
        manifest = data.get('manifest_number') or FoodShipmentSerializer.generate_manifest_number(shipment_type)
        port = Port.objects.filter(code=data.get('port')).first()
        if not port:
            return Response(error_response('المنفذ غير موجود'), status=status.HTTP_400_BAD_REQUEST)
        shipment = FoodShipment.objects.create(
            manifest_number=manifest,
            port=port,
            supplier_name=data.get('supplier_name', ''),
            origin_country=data.get('origin_country', ''),
            product_list=data.get('product_list') or [],
            arrival_date=data.get('arrival_date'),
            shipment_type=shipment_type,
            message_type=data.get('message_type') or FoodShipment.MessageType.COMMERCIAL,
            transport_data=data.get('transport_data') or {},
            customs_number=data.get('customs_number', ''),
            certificate_no=data.get('certificate_no', ''),
            vessel_name=data.get('vessel_name', ''),
            clearing_agent=data.get('clearing_agent', ''),
            exporter_name=data.get('exporter_name', ''),
            loading_port=data.get('loading_port', ''),
            bill_of_lading=data.get('bill_of_lading', ''),
            status=FoodShipment.ShipmentStatus.DRAFT if as_draft else FoodShipment.ShipmentStatus.RECEIVED,
            recorded_by=request.user,
        )
        self._set_items(shipment, data.get('items'))
        if not as_draft:
            apply_sampling(shipment)
        _log_event(shipment, FoodShipmentEvent.Stage.CREATED, request.user)
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        shipment = self.get_object()
        data = request.data
        if 'items' in data:
            if shipment.status != FoodShipment.ShipmentStatus.DRAFT:
                return Response(
                    error_response('لا يمكن تعديل البنود بعد إرسال الشحنة'),
                    status=status.HTTP_400_BAD_REQUEST,
                )
            self._set_items(shipment, data['items'])
        updated = []
        for field in (
            'supplier_name', 'origin_country', 'product_list', 'arrival_date', 'shipment_type',
            'message_type', 'transport_data', 'customs_number', 'certificate_no', 'vessel_name',
            'clearing_agent', 'exporter_name', 'loading_port', 'bill_of_lading',
        ):
            if field in data:
                setattr(shipment, field, data[field])
                updated.append(field)
        if 'port' in data:
            port = Port.objects.filter(code=data['port']).first()
            if not port:
                return Response(error_response('المنفذ غير موجود'), status=status.HTTP_400_BAD_REQUEST)
            shipment.port = port
            updated.append('port')
        if updated:
            _persist_shipment(shipment, updated)
            _audit(request, AuditLog.Action.UPDATE, obj=shipment, event='update_shipment')
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    def destroy(self, request, *args, **kwargs):
        shipment = self.get_object()
        if shipment.status != FoodShipment.ShipmentStatus.DRAFT:
            return Response(
                error_response('لا يمكن حذف الشحنة بعد إرسالها'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        shipment.delete()
        return Response(success_response({'deleted': True}))

    # ------------------------------------------------------------------
    #  مسار عمل الشحنة
    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        shipment = self.get_object()
        if shipment.status not in (
            FoodShipment.ShipmentStatus.DRAFT,
            FoodShipment.ShipmentStatus.RECEIVED,
        ):
            return Response(
                error_response('لا يمكن إعادة إرسال هذه الشحنة'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        apply_sampling(shipment)
        shipment.status = FoodShipment.ShipmentStatus.FEES_DUE
        shipment.submitted_at = timezone.now()
        _persist_shipment(shipment, ['status', 'submitted_at', 'samples_required'])
        self._notify_accountants(shipment)
        _log_event(shipment, FoodShipmentEvent.Stage.SUBMITTED, request.user)
        _audit(request, AuditLog.Action.UPDATE, obj=shipment, event='submit')
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    def _notify_accountants(self, shipment):
        recipients = (
            AccountUser.objects.filter(
                Q(role__code='ACCOUNTANT')
                | Q(role_assignments__role__code='ACCOUNTANT', role_assignments__is_active=True)
            )
            .distinct()
            .exclude(is_active=False)
        )
        for user in recipients:
            _notify(
                user,
                'شحنة جديدة بانتظار التحصيل',
                f'الشحنة {shipment.manifest_number} في انتظار تحصيل الرسوم',
            )

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        shipment = self.get_object()
        decision = request.data.get('decision')
        if decision and decision == 'APPROVE':
            shipment.status = FoodShipment.ShipmentStatus.AWAITING_INSPECTION
            _persist_shipment(shipment, ['status'])
            _log_event(shipment, FoodShipmentEvent.Stage.REFERRED_TO_INSPECTOR, request.user)
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['get'], url_path='fee-preview')
    def fee_preview(self, request, pk=None):
        shipment = self.get_object()
        return Response(success_response(compute_fee_breakdown(shipment)))

    @action(detail=True, methods=['post'], url_path='invoice')
    def open_invoice(self, request, pk=None):
        shipment = self.get_object()
        existing = shipment.finance_invoices.order_by('-created_at').first()
        if existing:
            serializer = FinanceFoodInvoiceSerializer(existing, context={'request': request})
            return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)
        try:
            invoice = create_shipment_invoice(shipment, request.user)
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        serializer = FinanceFoodInvoiceSerializer(invoice, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        shipment = self.get_object()
        invoice = shipment.finance_invoices.order_by('-created_at').first()
        if not invoice:
            return Response(error_response('لا توجد فاتورة للشحنة'), status=status.HTTP_400_BAD_REQUEST)
        if invoice.status == FinanceInvoiceStatus.PAID:
            return Response(error_response('تم تسديد الفاتورة مسبقاً'), status=status.HTTP_400_BAD_REQUEST)
        payment_method = request.data.get('payment_method') or 'CASH'
        notes = request.data.get('notes', '')
        try:
            confirm_payment(invoice, request.user, method=payment_method, notes=notes)
        except FinanceServiceError as exc:
            return Response(error_response(str(exc)), status=status.HTTP_400_BAD_REQUEST)
        shipment.fees_paid = True
        shipment.status = FoodShipment.ShipmentStatus.AWAITING_INSPECTION
        _persist_shipment(shipment, ['fees_paid', 'status'])
        _log_event(shipment, FoodShipmentEvent.Stage.FEES_CONFIRMED, request.user)
        _audit(request, AuditLog.Action.APPROVE, obj=shipment, event='confirm_payment',
               extra={'invoice': str(invoice.id)})
        serializer = FinanceFoodInvoiceSerializer(invoice, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['post'])
    def inspection(self, request, pk=None):
        shipment = self.get_object()
        if FoodInspection.objects.filter(shipment=shipment).exists():
            return Response(
                error_response('تم تسجيل تفتيش لهذه الشحنة مسبقاً'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data
        inspection = FoodInspection.objects.create(
            shipment=shipment,
            inspector=request.user,
            decision=data.get('decision'),
            production_date=data.get('production_date'),
            expiry_date=data.get('expiry_date'),
            temperature=data.get('temperature'),
            container_condition=data.get('container_condition', ''),
            container_status=data.get('container_status', ''),
            batch_number=data.get('batch_number', ''),
            package_condition=data.get('package_condition', ''),
            damaged_weight=data.get('damaged_weight', 0),
            sound_weight=data.get('sound_weight', 0),
            damaged_count=data.get('damaged_count', 0),
            sound_count=data.get('sound_count', 0),
            notes=data.get('notes', ''),
            inspection_notes=data.get('inspection_notes') or {},
        )
        decision = inspection.decision
        if decision == FoodInspection.Decision.COMPLIANT:
            shipment.status = FoodShipment.ShipmentStatus.RELEASED
            shipment.final_decision = FoodShipment.FinalDecision.COMPLIANT
            shipment.decided_by = request.user
            shipment.decided_at = timezone.now()
        elif decision == FoodInspection.Decision.NON_COMPLIANT:
            shipment.status = FoodShipment.ShipmentStatus.AWAITING_DECISION
        elif decision == FoodInspection.Decision.NEEDS_ANALYSIS:
            shipment.status = FoodShipment.ShipmentStatus.UNDER_INSPECTION
        _persist_shipment(shipment, ['status', 'final_decision', 'decided_by', 'decided_at'])
        _log_event(shipment, FoodShipmentEvent.Stage.INSPECTION, request.user)
        _audit(request, AuditLog.Action.REVIEW, obj=shipment, event='complete_inspection',
               object_type='FoodInspection')
        serializer = FoodInspectionSerializer(inspection, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='samples')
    def add_sample(self, request, pk=None):
        shipment = self.get_object()
        inspection = getattr(shipment, 'inspection', None)
        if not inspection:
            return Response(
                error_response('يجب التفتيش أولاً قبل سحب العينات'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data
        sample = FoodSample.objects.create(
            inspection=inspection,
            sample_barcode='FS-{}'.format(uuid.uuid4().hex[:10].upper()),
            sample_type=data.get('sample_type', ''),
            sampling_reason=data.get('sampling_reason') or FoodSample.SamplingReason.ROUTINE,
            bench=data.get('bench') or FoodSample.LabBench.MICROBIOLOGY,
            quantity=data.get('quantity'),
            quantity_unit=data.get('quantity_unit', ''),
            received_by=request.user,
            received_at=timezone.now(),
        )
        shipment.status = FoodShipment.ShipmentStatus.AWAITING_LAB_RESULTS
        _persist_shipment(shipment, ['status'])
        _log_event(shipment, FoodShipmentEvent.Stage.SAMPLING, request.user)
        _audit(request, AuditLog.Action.CREATE, obj=sample, event='register_sample',
               object_type='FoodSample')
        serializer = FoodSampleSerializer(sample, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='to-decision')
    def to_decision(self, request, pk=None):
        shipment = self.get_object()
        shipment.status = FoodShipment.ShipmentStatus.AWAITING_DECISION
        _persist_shipment(shipment, ['status'])
        _log_event(shipment, FoodShipmentEvent.Stage.AWAITING_DECISION, request.user)
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        shipment = self.get_object()
        if not shipment.fees_paid:
            return Response(
                error_response('يجب تسديد الرسوم قبل اتخاذ القرار'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision = request.data.get('decision')
        reason = request.data.get('reason', '')
        valid_decisions = [c[0] for c in FoodShipment.FinalDecision.choices]
        if decision not in valid_decisions:
            return Response(error_response('قرار غير صالح'), status=status.HTTP_400_BAD_REQUEST)
        if decision == FoodShipment.FinalDecision.REJECTED and not reason:
            return Response(error_response('سبب الرفض مطلوب'), status=status.HTTP_400_BAD_REQUEST)

        status_map = {
            FoodShipment.FinalDecision.COMPLIANT: FoodShipment.ShipmentStatus.RELEASED,
            FoodShipment.FinalDecision.CONDITIONAL_RELEASE: FoodShipment.ShipmentStatus.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.REJECTED: FoodShipment.ShipmentStatus.REJECTED,
            FoodShipment.FinalDecision.HOLD: FoodShipment.ShipmentStatus.HOLD,
            FoodShipment.FinalDecision.RE_EXPORT: FoodShipment.ShipmentStatus.RE_EXPORT,
            FoodShipment.FinalDecision.DESTROY: FoodShipment.ShipmentStatus.DESTROYED,
            FoodShipment.FinalDecision.PARTIAL_RELEASE: FoodShipment.ShipmentStatus.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.TEMPORARY_RELEASE: FoodShipment.ShipmentStatus.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.TRANSFER: FoodShipment.ShipmentStatus.HOLD,
        }
        cert_type_map = {
            FoodShipment.FinalDecision.COMPLIANT: FoodDecisionCertificate.CertificateType.RELEASED,
            FoodShipment.FinalDecision.CONDITIONAL_RELEASE: FoodDecisionCertificate.CertificateType.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.REJECTED: FoodDecisionCertificate.CertificateType.REJECTED,
            FoodShipment.FinalDecision.HOLD: FoodDecisionCertificate.CertificateType.HOLD,
            FoodShipment.FinalDecision.RE_EXPORT: FoodDecisionCertificate.CertificateType.RE_EXPORT,
            FoodShipment.FinalDecision.DESTROY: FoodDecisionCertificate.CertificateType.DESTROY,
            FoodShipment.FinalDecision.PARTIAL_RELEASE: FoodDecisionCertificate.CertificateType.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.TEMPORARY_RELEASE: FoodDecisionCertificate.CertificateType.CONDITIONAL_RELEASE,
            FoodShipment.FinalDecision.TRANSFER: FoodDecisionCertificate.CertificateType.HOLD,
        }
        shipment.final_decision = decision
        shipment.decided_by = request.user
        shipment.decided_at = timezone.now()
        shipment.decision_reason = reason
        shipment.status = status_map[decision]
        _persist_shipment(shipment, ['final_decision', 'decided_by', 'decided_at', 'decision_reason', 'status'])

        certificate = FoodDecisionCertificate.objects.create(
            shipment=shipment,
            certificate_number='FCER-{}-{}'.format(timezone.now().year, uuid.uuid4().hex[:8].upper()),
            certificate_type=cert_type_map[decision],
            status=FoodDecisionCertificate.CertificateStatus.ISSUED,
            decision=request.user,
            reason=reason,
        )
        _log_event(shipment, FoodShipmentEvent.Stage.DECISION, request.user)
        _audit(request, AuditLog.Action.APPROVE, obj=shipment, event='final_decision')
        serializer = FoodDecisionCertificateSerializer(certificate, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        shipment = self.get_object()
        if not shipment.fees_paid:
            return Response(
                error_response('يجب تسديد الرسوم قبل الإفراج'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        shipment.status = FoodShipment.ShipmentStatus.RELEASED
        _persist_shipment(shipment, ['status'])
        _log_event(shipment, FoodShipmentEvent.Stage.RELEASED, request.user)
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['post'], url_path='assign-inspector')
    def assign_inspector(self, request, pk=None):
        shipment = self.get_object()
        inspector = AccountUser.objects.filter(id=request.data.get('assigned_inspector')).first()
        if not inspector:
            return Response(error_response('المفتش غير موجود'), status=status.HTTP_400_BAD_REQUEST)
        shipment.assigned_inspector = inspector
        shipment.assigned_at = timezone.now()
        shipment.status = FoodShipment.ShipmentStatus.AWAITING_INSPECTION
        _persist_shipment(shipment, ['assigned_inspector', 'assigned_at', 'status'])
        _log_event(shipment, FoodShipmentEvent.Stage.REFERRED_TO_INSPECTOR, request.user)
        _notify(inspector, 'تكليف تفتيش', f'تم تكليفك بتفتيش الشحنة {shipment.manifest_number}')
        _audit(request, AuditLog.Action.ASSIGN, obj=shipment, event='assign_inspector')
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['post'])
    def refer(self, request, pk=None):
        shipment = self.get_object()
        if shipment.referred_from:
            return Response(
                error_response('الشحنة محالة مسبقاً'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        source = request.data.get('referred_from')
        valid_sources = [c[0] for c in FoodShipment.ReferralSource.choices]
        if source not in valid_sources:
            return Response(
                error_response('مصدر الإحالة غير صالح'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        shipment.referred_from = source
        shipment.referral_reference = request.data.get('referral_reference', '')
        shipment.referred_by = request.user
        shipment.referred_at = timezone.now()
        _persist_shipment(shipment, ['referred_from', 'referral_reference', 'referred_by', 'referred_at'])
        serializer = FoodShipmentSerializer(shipment, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['get'], url_path='export-form')
    def export_form(self, request, pk=None):
        shipment = self.get_object()
        return Response(success_response(build_export_inspection_form(shipment)))

    # ------------------------------------------------------------------
    #  لوحات/إحصائيات
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='clerk-stats')
    def clerk_stats(self, request):
        today = timezone.localdate()
        drafts = FoodShipment.objects.filter(status=FoodShipment.ShipmentStatus.DRAFT).count()
        imports_today = (
            FoodShipment.objects.filter(
                shipment_type=FoodShipment.ShipmentType.IMPORT
            )
            .filter(Q(arrival_date=today) | Q(created_at__date=today))
            .count()
        )
        recent = list(
            FoodShipment.objects.order_by('-created_at')[:10].values(
                'id', 'manifest_number', 'status', 'created_at'
            )
        )
        stats = {
            'drafts': drafts,
            'imports_today': imports_today,
            'received': FoodShipment.objects.filter(status=FoodShipment.ShipmentStatus.RECEIVED).count(),
            'fees_due': FoodShipment.objects.filter(status=FoodShipment.ShipmentStatus.FEES_DUE).count(),
        }
        return Response(success_response({'stats': stats, 'recent': recent}))

    @action(detail=False, methods=['get'], url_path='inspectors')
    def inspectors_workload(self, request):
        inspectors = (
            AccountUser.objects.filter(
                Q(role__code='FOOD_INSPECTOR')
                | Q(role_assignments__role__code='FOOD_INSPECTOR', role_assignments__is_active=True)
            )
            .distinct()
            .order_by('id')
        )
        rows = []
        for user in inspectors:
            open_tasks = FoodShipment.objects.filter(
                assigned_inspector=user,
                status__in=[
                    FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
                    FoodShipment.ShipmentStatus.UNDER_INSPECTION,
                ],
            ).count()
            rows.append({
                'id': str(user.id),
                'full_name': user.full_name,
                'open_tasks': open_tasks,
                'status': 'BUSY' if open_tasks else 'AVAILABLE',
            })
        return Response(success_response(rows))

    @action(detail=False, methods=['get'], url_path='supervisor-stats')
    def supervisor_stats(self, request):
        today = timezone.localdate()
        data = {
            'pending_review': FoodInspection.objects.filter(
                supervisor_status=FoodInspection.SupervisorStatus.PENDING
            ).count(),
            'awaiting_decision': FoodShipment.objects.filter(
                status=FoodShipment.ShipmentStatus.AWAITING_DECISION
            ).count(),
            'holds_rejections': FoodShipment.objects.filter(
                status__in=[
                    FoodShipment.ShipmentStatus.HOLD,
                    FoodShipment.ShipmentStatus.REJECTED,
                    FoodShipment.ShipmentStatus.RE_EXPORT,
                    FoodShipment.ShipmentStatus.DESTROYED,
                ]
            ).count(),
            'active_inspectors_today': FoodInspection.objects.filter(
                inspected_at__date=today
            ).values('inspector').distinct().count(),
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='department-head-dashboard')
    def department_head_dashboard(self, request):
        shipments = FoodShipment.objects.all()
        inspections = FoodInspection.objects.all()
        pending = list(
            shipments.filter(status=FoodShipment.ShipmentStatus.AWAITING_DECISION).order_by('-created_at')[:20]
        )
        inspector_count = (
            AccountUser.objects.filter(
                Q(role__code='FOOD_INSPECTOR')
                | Q(role_assignments__role__code='FOOD_INSPECTOR', role_assignments__is_active=True)
            )
            .distinct()
            .count()
        )
        total_invoices = FinanceInvoice.objects.filter(food_shipment__in=shipments).aggregate(
            t=Sum('net_amount')
        )['t'] or 0
        data = {
            'kpis': {
                'pending_decision': shipments.filter(status=FoodShipment.ShipmentStatus.AWAITING_DECISION).count(),
                'inspection_today': inspections.filter(inspected_at__date=timezone.localdate()).count(),
            },
            'details': {
                'inspected': inspections.count(),
                'non_compliant_results': inspections.filter(
                    decision=FoodInspection.Decision.NON_COMPLIANT
                ).count(),
            },
            'pending_decisions': [
                {'id': str(s.id), 'manifest_number': s.manifest_number, 'status': s.status} for s in pending
            ],
            'recent_shipments': [
                {'id': str(s.id), 'manifest_number': s.manifest_number, 'status': s.status}
                for s in shipments.order_by('-created_at')[:10]
            ],
            'finance': {'inspection_fees': total_invoices, 'total': total_invoices},
            'staff': {'inspectors': inspector_count},
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='sector-head-dashboard')
    def sector_head_dashboard(self, request):
        user = request.user
        requested = request.query_params.get('sector')
        sector = None
        if user.is_superuser:
            if not requested:
                return Response(error_response('حدد القطاع — قطاع مطلوب'), status=status.HTTP_400_BAD_REQUEST)
            sector = Sector.objects.filter(pk=requested).first()
        else:
            if user.sector_id:
                sector = user.sector
            if not sector:
                assignment_sector = (
                    user.role_assignments.filter(
                        scope_type='SECTOR', scope_id__isnull=False, is_active=True
                    ).values_list('scope_id', flat=True).first()
                )
                if assignment_sector:
                    sector = Sector.objects.filter(pk=assignment_sector).first()
            if not sector:
                return Response(error_response('قطاع مطلوب لهذا المستخدم'), status=status.HTTP_400_BAD_REQUEST)
        ports = Port.objects.filter(sector=sector)
        shipments = FoodShipment.objects.filter(port__in=ports)

        period_days = {'DAY': 1, 'MONTH': 30, 'YEAR': 365}.get(
            request.query_params.get('period', 'MONTH'), 30
        )
        period_start = timezone.now() - timedelta(days=period_days)
        period_qs = shipments.filter(created_at__gte=period_start)

        ports_overview = [
            {'code': p.code, 'name_ar': p.name_ar, 'shipments': shipments.filter(port=p).count()}
            for p in ports.order_by('code')
        ]

        assigned = shipments.filter(status__in=[
            FoodShipment.ShipmentStatus.AWAITING_INSPECTION,
            FoodShipment.ShipmentStatus.UNDER_INSPECTION,
        ])
        workload = []
        for row in assigned.values('assigned_inspector', 'assigned_inspector__full_name').annotate(
            total=Count('id')
        ):
            if row.get('assigned_inspector'):
                workload.append({'id': str(row['assigned_inspector']),
                                 'full_name': row['assigned_inspector__full_name'] or '',
                                 'tasks': row['total']})

        total_invoices = FinanceInvoice.objects.filter(food_shipment__in=shipments).aggregate(
            t=Sum('net_amount')
        )['t'] or 0
        data = {
            'sector': {'id': str(sector.id), 'code': sector.code, 'name_ar': sector.name_ar},
            'kpis': {'shipments_period': period_qs.count()},
            'ports_overview': ports_overview,
            'inspection_board': {
                'tasks_assigned': assigned.count(),
                'in_progress': shipments.filter(status=FoodShipment.ShipmentStatus.UNDER_INSPECTION).count(),
            },
            'staff': {'workload': workload},
            'alerts': [],
            'certificates': [],
            'finance': {
                'inspection_fees': total_invoices,
                'lab_fees': 0,
                'certificate_fees': 0,
                'total': total_invoices,
            },
            'samples_board': {'sla_within': 0, 'sla_near': 0, 'sla_exceeded': 0},
            'status_breakdown': {
                s[0]: shipments.filter(status=s[0]).count() for s in FoodShipment.ShipmentStatus.choices
            },
        }
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='food-director-dashboard')
    def food_director_dashboard(self, request):
        shipments = FoodShipment.objects.all()
        period_days = {'DAY': 1, 'MONTH': 30, 'YEAR': 365}.get(
            request.query_params.get('period', 'MONTH'), 30
        )
        period_start = timezone.now() - timedelta(days=period_days)
        period_qs = shipments.filter(created_at__gte=period_start)

        sectors_overview = []
        for sector in Sector.objects.all():
            port_ids = Port.objects.filter(sector=sector).values_list('id', flat=True)
            count = shipments.filter(port_id__in=list(port_ids)).count()
            sectors_overview.append({'id': str(sector.id), 'code': sector.code,
                                     'name_ar': sector.name_ar, 'shipments': count})

        trade = {
            'import': {'total': shipments.filter(shipment_type=FoodShipment.ShipmentType.IMPORT).count()},
            'export': {'total': shipments.filter(shipment_type=FoodShipment.ShipmentType.EXPORT).count()},
        }
        total_invoices = FinanceInvoice.objects.filter(food_shipment__in=shipments).aggregate(
            t=Sum('net_amount')
        )['t'] or 0
        data = {
            'sectors_overview': sectors_overview,
            'kpis': {'shipments_period': period_qs.count()},
            'outcomes': {
                'released': shipments.filter(status=FoodShipment.ShipmentStatus.RELEASED).count(),
                'holds_rejections': shipments.filter(
                    status__in=[FoodShipment.ShipmentStatus.HOLD, FoodShipment.ShipmentStatus.REJECTED]
                ).count(),
            },
            'lab_performance': {
                'awaiting_results': shipments.filter(
                    status=FoodShipment.ShipmentStatus.AWAITING_LAB_RESULTS
                ).count(),
            },
            'kpi_table': [
                {'metric': 'shipments', 'value': shipments.count()},
                {'metric': 'samples', 'value': FoodSample.objects.count()},
                {'metric': 'inspections', 'value': FoodInspection.objects.count()},
                {'metric': 'certificates', 'value': FoodDecisionCertificate.objects.count()},
            ],
            'trade': trade,
            'finance': {'inspection_fees': total_invoices, 'lab_fees': 0,
                        'certificate_fees': 0, 'total': total_invoices},
            'staff': {'inspectors': AccountUser.objects.count()},
            'certificates': [],
            'alerts': [],
        }
        return Response(success_response(data))


class FoodInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """فاتورة رقابة الأغذية من السجل المالي الموحد (وارد/صادر)."""

    queryset = FinanceInvoice.objects.all()
    serializer_class = FinanceFoodInvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            FinanceInvoice.objects.filter(food_shipment__isnull=False)
            .select_related('food_shipment', 'issued_by')
            .order_by('-created_at')
        )
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(food_shipment__manifest_number__icontains=search)
        return qs


class ShipmentAttachmentViewSet(viewsets.ModelViewSet):
    queryset = ShipmentAttachment.objects.all()
    serializer_class = ShipmentAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ShipmentAttachment.objects.all()
        shipment = self.request.query_params.get('shipment')
        if shipment:
            qs = qs.filter(shipment_id=shipment)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            uploaded_by=self.request.user,
            status=ShipmentAttachment.DocStatus.UPLOADED,
        )


class FoodInspectionViewSet(viewsets.ModelViewSet):
    queryset = FoodInspection.objects.all()
    serializer_class = FoodInspectionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        inspection = self.get_object()
        if _has_role(request.user, 'FOOD_INSPECTOR'):
            return Response(
                error_response('لا يسمح للمفتش بمراجعة تقريره'),
                status=status.HTTP_403_FORBIDDEN,
            )
        if inspection.supervisor_status != FoodInspection.SupervisorStatus.PENDING:
            return Response(
                error_response('تمت مراجعة التقرير مسبقاً'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        action_name = request.data.get('action')
        notes = request.data.get('notes', '')
        if action_name == 'RETURN':
            if not notes:
                return Response(
                    error_response('ملاحظات الإرجاع مطلوبة'),
                    status=status.HTTP_400_BAD_REQUEST,
                )
            inspection.supervisor_status = FoodInspection.SupervisorStatus.RETURNED
            inspection.supervisor_notes = notes
            inspection.reviewed_by = request.user
            inspection.reviewed_at = timezone.now()
            inspection.save(update_fields=['supervisor_status', 'supervisor_notes',
                                           'reviewed_by', 'reviewed_at', 'updated_at'])
            shipment = inspection.shipment
            if shipment.status != FoodShipment.ShipmentStatus.RELEASED:
                shipment.status = FoodShipment.ShipmentStatus.AWAITING_INSPECTION
                _persist_shipment(shipment, ['status'])
        elif action_name == 'APPROVE':
            inspection.supervisor_status = FoodInspection.SupervisorStatus.APPROVED
            inspection.reviewed_by = request.user
            inspection.reviewed_at = timezone.now()
            inspection.save(update_fields=['supervisor_status', 'reviewed_by',
                                           'reviewed_at', 'updated_at'])
        else:
            return Response(error_response('إجراء غير صالح'), status=status.HTTP_400_BAD_REQUEST)
        _audit(request, AuditLog.Action.UPDATE, obj=inspection, event='review_inspection',
               object_type='FoodInspection')
        serializer = FoodInspectionSerializer(inspection, context={'request': request})
        return Response(success_response(serializer.data))


class FoodSampleViewSet(viewsets.ModelViewSet):
    queryset = FoodSample.objects.all()
    serializer_class = FoodSampleSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = FoodSampleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample = serializer.save(
            sample_barcode='FS-{}'.format(uuid.uuid4().hex[:10].upper()),
            received_by=request.user,
            received_at=timezone.now(),
            status=FoodSample.LifecycleStatus.RECEIVED,
        )
        output = FoodSampleSerializer(sample, context={'request': request})
        return Response(success_response(output.data), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        qs = FoodSample.objects.all()
        requested = request.query_params.get('sector')
        sector = None
        if requested:
            sector = Sector.objects.filter(code=requested).first()
            if sector:
                qs = qs.filter(sector=sector)
        total_tests = SampleTest.objects.filter(sample__in=qs).count()

        durations = []
        for sample in qs.exclude(received_at__isnull=True).filter(approved_at__isnull=False):
            durations.append((sample.approved_at - sample.received_at).total_seconds() / 3600)
        avg_hours = round(sum(durations) / len(durations), 1) if durations else None

        data = {
            'total_samples': qs.count(),
            'received': qs.filter(status=FoodSample.LifecycleStatus.RECEIVED).count(),
            'by_bench': dict(
                qs.order_by().values_list('bench').annotate(c=Count('id')).values_list('bench', 'c')
            ),
            'avg_completion_hours': avg_hours,
            'sector_name': sector.name_ar if sector else None,
            'total_tests': total_tests,
        }
        return Response(success_response(data))

    @action(detail=True, methods=['post'], url_path='set-parameters')
    def set_parameters(self, request, pk=None):
        sample = self.get_object()
        param_ids = [str(p) for p in (request.data.get('parameters') or [])]
        existing = {str(p) for p in SampleTest.objects.filter(
            sample=sample, parameter_id__in=param_ids
        ).values_list('parameter_id', flat=True)}
        added = 0
        for param_id in param_ids:
            if param_id in existing:
                continue
            SampleTest.objects.create(sample=sample, parameter_id=param_id)
            added += 1
        if added:
            sample.status = FoodSample.LifecycleStatus.UNDER_TESTING
            sample.save(update_fields=['status', 'updated_at'])
        return Response(success_response({'added': added, 'sample': str(sample.id)}))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        sample = self.get_object()
        noncompliant = sample.tests.filter(decision=SampleTest.Decision.NON_COMPLIANT).exists()
        sample.approval_status = FoodSample.ApprovalStatus.APPROVED
        sample.approved_by = request.user
        sample.approved_at = timezone.now()
        sample.status = (
            FoodSample.LifecycleStatus.REJECTED
            if noncompliant
            else FoodSample.LifecycleStatus.COMPLETED
        )
        sample.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'status', 'updated_at'])
        return Response(success_response({
            'id': str(sample.id),
            'status': sample.status,
            'approval_status': sample.approval_status,
            'sample_number': sample.sample_number,
        }))

    @action(detail=True, methods=['post'], url_path='certify')
    def certify(self, request, pk=None):
        sample = self.get_object()
        if sample.approval_status != FoodSample.ApprovalStatus.APPROVED:
            return Response(
                error_response('يجب اعتماد العينة قبل إصدار الشهادة'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = AnalysisCertificate.objects.filter(sample=sample).first()
        if existing:
            serializer = AnalysisCertificateSerializer(existing, context={'request': request})
            return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)
        decision = (
            AnalysisCertificate.Decision.NON_COMPLIANT
            if sample.status == FoodSample.LifecycleStatus.REJECTED
            else AnalysisCertificate.Decision.COMPLIANT
        )
        certificate = AnalysisCertificate.objects.create(
            sample=sample,
            certificate_number='FCL-{}-{}'.format(timezone.now().year, uuid.uuid4().hex[:8].upper()),
            issued_by=request.user,
            decision=decision,
            status=AnalysisCertificate.Status.ISSUED,
            summary={'sample': sample.sample_number, 'decision': decision},
        )
        serializer = AnalysisCertificateSerializer(certificate, context={'request': request})
        return Response(success_response(serializer.data), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='report')
    def report(self, request, pk=None):
        sample = self.get_object()
        certificate = AnalysisCertificate.objects.filter(sample=sample).first()
        if not certificate:
            return Response(
                error_response('أصدر شهادة التحليل أولاً'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        compliant = certificate.decision == AnalysisCertificate.Decision.COMPLIANT
        shipment = sample.inspection.shipment if sample.inspection_id else None
        if shipment:
            shipment.status = (
                FoodShipment.ShipmentStatus.RELEASED
                if compliant
                else FoodShipment.ShipmentStatus.REJECTED
            )
            shipment.final_decision = (
                FoodShipment.FinalDecision.COMPLIANT if compliant else FoodShipment.FinalDecision.REJECTED
            )
            shipment.decided_by = request.user
            shipment.decided_at = timezone.now()
            _persist_shipment(shipment, ['status', 'final_decision', 'decided_by', 'decided_at'])
        serializer = AnalysisCertificateSerializer(certificate, context={'request': request})
        return Response(success_response(serializer.data))


class SampleTestViewSet(viewsets.ModelViewSet):
    queryset = SampleTest.objects.all()
    serializer_class = SampleTestSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='enter-result')
    def enter_result(self, request, pk=None):
        test = self.get_object()
        data = request.data
        if 'result_value' in data:
            test.result_value = data.get('result_value')
        if 'result_text' in data:
            test.result_text = data.get('result_text', '')
        if 'unit' in data:
            test.unit = data.get('unit', '')
        if 'reference_limit' in data:
            test.reference_limit = data.get('reference_limit', '')
        if 'method_used' in data:
            test.method_used = data.get('method_used', '')
        if 'decision' in data:
            test.decision = data.get('decision')
        test.status = SampleTest.TestStatus.SUBMITTED
        test.entered_by = request.user
        test.entered_at = timezone.now()
        test.save(update_fields=['result_value', 'result_text', 'unit', 'reference_limit',
                                 'method_used', 'decision', 'status', 'entered_by',
                                 'entered_at', 'updated_at'])
        serializer = SampleTestSerializer(test, context={'request': request})
        return Response(success_response(serializer.data))

    @action(detail=True, methods=['post'], url_path='retest')
    def retest(self, request, pk=None):
        if _has_role(request.user, 'LAB_RECEPTIONIST'):
            return Response(
                error_response('غير مسموح لمستقبل العينات بإعادة الفحص'),
                status=status.HTTP_403_FORBIDDEN,
            )
        test = self.get_object()
        if test.status != SampleTest.TestStatus.APPROVED:
            return Response(
                error_response('إعادة الفحص مسموحة للفحص المعتمد فقط'),
                status=status.HTTP_400_BAD_REQUEST,
            )
        SampleTestRevision.objects.create(
            test=test,
            version=test.version,
            snapshot={'version': test.version, 'status': test.status, 'decision': test.decision},
            reason=request.data.get('reason', ''),
            created_by=request.user,
        )
        test.status = SampleTest.TestStatus.RETEST
        test.decision = SampleTest.Decision.PENDING
        test.approved_by = None
        test.save(update_fields=['status', 'decision', 'approved_by', 'updated_at'])
        serializer = SampleTestSerializer(test, context={'request': request})
        return Response(success_response(serializer.data))


class LabParameterViewSet(viewsets.ModelViewSet):
    queryset = LabParameter.objects.all()
    serializer_class = LabParameterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LabParameter.objects.all()
        bench = self.request.query_params.get('bench')
        if bench:
            qs = qs.filter(bench=bench)
        return qs


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = AnalysisCertificate.objects.all()
    serializer_class = AnalysisCertificateSerializer
    permission_classes = [IsAuthenticated]


class SamplingPolicyViewSet(viewsets.ModelViewSet):
    queryset = SamplingPolicy.objects.all()
    serializer_class = SamplingPolicySerializer
    permission_classes = [IsAuthenticated]


class QuarantineFeeViewSet(viewsets.ModelViewSet):
    queryset = QuarantineFee.objects.all()
    serializer_class = QuarantineFeeSerializer
    permission_classes = [IsAuthenticated]


class SampleSourceViewSet(viewsets.ModelViewSet):
    queryset = SampleSource.objects.all()
    serializer_class = SampleSourceSerializer
    permission_classes = [IsAuthenticated]


class ReferenceSampleViewSet(viewsets.ModelViewSet):
    queryset = ReferenceSample.objects.all()
    serializer_class = ReferenceSampleSerializer
    permission_classes = [IsAuthenticated]


class ChainOfCustodyViewSet(viewsets.ModelViewSet):
    queryset = ChainOfCustody.objects.all()
    serializer_class = ChainOfCustodySerializer
    permission_classes = [IsAuthenticated]


class LabEquipmentViewSet(viewsets.ModelViewSet):
    queryset = LabEquipment.objects.all()
    serializer_class = LabEquipmentSerializer
    permission_classes = [IsAuthenticated]


class MicroorganismViewSet(viewsets.ModelViewSet):
    queryset = Microorganism.objects.all()
    serializer_class = MicroorganismSerializer
    permission_classes = [IsAuthenticated]


class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated]


class FoodProductViewSet(viewsets.ModelViewSet):
    queryset = FoodProduct.objects.all()
    serializer_class = FoodProductSerializer
    permission_classes = [IsAuthenticated]


class TestMethodViewSet(viewsets.ModelViewSet):
    queryset = TestMethod.objects.all()
    serializer_class = TestMethodSerializer
    permission_classes = [IsAuthenticated]


class AnalyticalMethodViewSet(viewsets.ModelViewSet):
    queryset = AnalyticalMethod.objects.all()
    serializer_class = AnalyticalMethodSerializer
    permission_classes = [IsAuthenticated]


class MicrobiologicalSpecificationViewSet(viewsets.ModelViewSet):
    queryset = MicrobiologicalSpecification.objects.all()
    serializer_class = MicrobiologicalSpecificationSerializer
    permission_classes = [IsAuthenticated]


class SpecificationVersionViewSet(viewsets.ModelViewSet):
    queryset = SpecificationVersion.objects.all()
    serializer_class = SpecificationVersionSerializer
    permission_classes = [IsAuthenticated]


class MicrobiologicalLimitViewSet(viewsets.ModelViewSet):
    queryset = MicrobiologicalLimit.objects.all()
    serializer_class = MicrobiologicalLimitSerializer
    permission_classes = [IsAuthenticated]


class SampleUnitResultViewSet(viewsets.ModelViewSet):
    queryset = SampleUnitResult.objects.all()
    serializer_class = SampleUnitResultSerializer
    permission_classes = [IsAuthenticated]


class ResultEvaluationViewSet(viewsets.ModelViewSet):
    queryset = ResultEvaluation.objects.all()
    serializer_class = ResultEvaluationSerializer
    permission_classes = [IsAuthenticated]


class QualityDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response({'status': 'ok', 'data': []})


class QCRecordViewSet(viewsets.ModelViewSet):
    queryset = QCRecord.objects.all()
    serializer_class = QCRecordSerializer
    permission_classes = [IsAuthenticated]


class ReagentViewSet(viewsets.ModelViewSet):
    queryset = Reagent.objects.all()
    serializer_class = ReagentSerializer
    permission_classes = [IsAuthenticated]


class NonConformityViewSet(viewsets.ModelViewSet):
    queryset = NonConformity.objects.all()
    serializer_class = NonConformitySerializer
    permission_classes = [IsAuthenticated]


class CpaRecordViewSet(viewsets.ModelViewSet):
    queryset = CpaRecord.objects.all()
    serializer_class = CpaRecordSerializer
    permission_classes = [IsAuthenticated]


class AuditLogViewSet(viewsets.ModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]


class MaterialCatalogViewSet(viewsets.ModelViewSet):
    queryset = MaterialCatalog.objects.all()
    serializer_class = MaterialCatalogSerializer
    permission_classes = [IsAuthenticated]


class MaterialLotViewSet(viewsets.ModelViewSet):
    queryset = MaterialLot.objects.all()
    serializer_class = MaterialLotSerializer
    permission_classes = [IsAuthenticated]


class SolutionViewSet(viewsets.ModelViewSet):
    queryset = Solution.objects.all()
    serializer_class = SolutionSerializer
    permission_classes = [IsAuthenticated]


class MaterialIssueViewSet(viewsets.ModelViewSet):
    queryset = MaterialIssue.objects.all()
    serializer_class = MaterialIssueSerializer
    permission_classes = [IsAuthenticated]


class DisposalRequestViewSet(viewsets.ModelViewSet):
    queryset = DisposalRequest.objects.all()
    serializer_class = DisposalRequestSerializer
    permission_classes = [IsAuthenticated]


class StorageLocationViewSet(viewsets.ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer
    permission_classes = [IsAuthenticated]


class ReagentManagementViewSet(viewsets.ModelViewSet):
    queryset = Reagent.objects.all()
    serializer_class = ReagentSerializer
    permission_classes = [IsAuthenticated]


class StandardViewSet(viewsets.ModelViewSet):
    queryset = Standard.objects.all()
    serializer_class = StandardSerializer
    permission_classes = [IsAuthenticated]


class StandardVersionViewSet(viewsets.ModelViewSet):
    queryset = StandardVersion.objects.all()
    serializer_class = StandardVersionSerializer
    permission_classes = [IsAuthenticated]


class StandardRequirementViewSet(viewsets.ModelViewSet):
    queryset = StandardRequirement.objects.all()
    serializer_class = StandardRequirementSerializer
    permission_classes = [IsAuthenticated]


class RegulatoryRuleViewSet(viewsets.ModelViewSet):
    queryset = RegulatoryRule.objects.all()
    serializer_class = RegulatoryRuleSerializer
    permission_classes = [IsAuthenticated]


class StandardsManagementViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response({'status': 'ok', 'data': []})