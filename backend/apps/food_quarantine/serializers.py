from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.masterdata.models import EntryPoint as Port

from apps.finance.models import Invoice as FinanceInvoice

from .models import (
    AnalysisCertificate,
    AnalyticalMethod,
    AuditLog,
    ChainOfCustody,
    CpaRecord,
    DisposalRequest,
    FoodDecisionCertificate,
    FoodFee,
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
    SampleInvoice,
    SampleTest,
    SampleUnitResult,
    SampleSource,
    SamplingPolicy,
    ShipmentAttachment,
    Solution,
    SpecificationVersion,
    Standard,
    StandardRequirement,
    StandardVersion,
    StorageLocation,
    TestMethod,
    FoodDecisionCertificate,
)


class FoodOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodOrderItem
        fields = [
            'id', 'product_name', 'brand', 'origin', 'weight_kg',
            'package_count', 'package_type',
        ]
        read_only_fields = ['id']


class ShipmentAttachmentSerializer(serializers.ModelSerializer):
    doc_type_label = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True, default=None)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentAttachment
        fields = [
            'id', 'shipment', 'doc_type', 'doc_type_label', 'file', 'file_url',
            'original_name', 'status', 'status_label', 'rejected_reason',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'status', 'status_label', 'rejected_reason']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None


class FoodShipmentEventSerializer(serializers.ModelSerializer):
    stage_label = serializers.CharField(source='get_stage_display', read_only=True)
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default=None)

    class Meta:
        model = FoodShipmentEvent
        fields = [
            'id', 'shipment', 'stage', 'stage_label', 'message',
            'actor', 'actor_name', 'occurred_at',
        ]
        read_only_fields = ['id', 'shipment', 'stage', 'message', 'actor', 'occurred_at']


class FoodShipmentSerializer(serializers.ModelSerializer):
    port = serializers.SlugRelatedField(slug_field='code', queryset=Port.objects.all())
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    port_type = serializers.CharField(source='port.kind', read_only=True)
    manifest_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    assigned_inspector_name = serializers.CharField(source='assigned_inspector.full_name', read_only=True, default=None)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True, default=None)
    decided_by_name = serializers.CharField(source='decided_by.full_name', read_only=True, default=None)
    referred_by_name = serializers.CharField(source='referred_by.full_name', read_only=True, default=None)
    items = FoodOrderItemSerializer(many=True, read_only=True)
    attachments = ShipmentAttachmentSerializer(many=True, read_only=True)
    fee_preview = serializers.SerializerMethodField()

    class Meta:
        model = FoodShipment
        fields = [
            'id', 'manifest_number', 'port', 'port_name', 'port_type',
            'supplier_name', 'origin_country', 'product_list', 'arrival_date',
            'shipment_type', 'customs_number', 'certificate_no', 'vessel_name',
            'clearing_agent', 'exporter_name', 'message_type', 'loading_port',
            'bill_of_lading', 'transport_data', 'total_weight_kg', 'samples_required',
            'inspection_required', 'submitted_at', 'items', 'attachments', 'fee_preview',
            'status', 'assigned_inspector', 'assigned_inspector_name',
            'assigned_at', 'recorded_by', 'recorded_by_name', 'final_decision',
            'decided_by', 'decided_by_name', 'decided_at', 'decision_reason',
            'fees_paid', 'referred_from', 'referral_reference', 'referred_by',
            'referred_by_name', 'referred_at',
        ]
        read_only_fields = [
            'id', 'status', 'assigned_at', 'recorded_by', 'final_decision',
            'decided_by', 'decided_at', 'fees_paid', 'referred_by', 'referred_at',
            'submitted_at', 'fee_preview',
        ]

    def get_fee_preview(self, obj):
        from .services import compute_fee_breakdown
        return compute_fee_breakdown(obj)

    @staticmethod
    def generate_manifest_number(shipment_type):
        from .models import FoodShipment
        prefix = 'IMP' if shipment_type == 'IMPORT' else 'EXP'
        year = timezone.now().year
        seq = FoodShipment.objects.filter(manifest_number__startswith=f'{prefix}-{year}-').count() + 1
        candidate = f'{prefix}-{year}-{seq:05d}'
        while FoodShipment.objects.filter(manifest_number=candidate).exists():
            seq += 1
            candidate = f'{prefix}-{year}-{seq:05d}'
        return candidate


class FoodFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodFee
        fields = ['id', 'name_ar', 'fee_type', 'amount', 'unit', 'is_active']
        read_only_fields = ['id']


class QuarantineFeeSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = QuarantineFee
        fields = [
            'id', 'code', 'category', 'category_label', 'name_ar',
            'amount_sdg', 'amount_usd', 'currency_note', 'order', 'year', 'is_active',
        ]
        read_only_fields = ['id']


class FoodInvoiceSerializer(serializers.ModelSerializer):
    shipment_manifest = serializers.CharField(source='shipment.manifest_number', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default=None)
    paid_by_name = serializers.CharField(source='paid_by.full_name', read_only=True, default=None)

    class Meta:
        model = FoodInvoice
        fields = [
            'id', 'shipment', 'shipment_manifest', 'invoice_number', 'items',
            'total_amount', 'status', 'issued_by', 'issued_by_name', 'issued_at',
            'receipt_number', 'payment_method', 'paid_notes', 'paid_by', 'paid_by_name',
            'paid_at', 'payment_reference',
        ]
        read_only_fields = [
            'id', 'shipment', 'invoice_number', 'items', 'total_amount', 'status',
            'issued_by', 'issued_at', 'receipt_number', 'paid_by', 'paid_at',
        ]


class FoodDecisionCertificateSerializer(serializers.ModelSerializer):
    shipment_manifest = serializers.CharField(source='shipment.manifest_number', read_only=True)
    issued_by_name = serializers.CharField(source='decision.full_name', read_only=True, default=None)

    class Meta:
        model = FoodDecisionCertificate
        fields = [
            'id', 'shipment', 'shipment_manifest', 'certificate_number',
            'certificate_type', 'status', 'decision', 'issued_by_name',
            'issued_at', 'reason', 'certificate_data',
        ]
        read_only_fields = ['id', 'certificate_number', 'issued_by', 'issued_at', 'status']


class FoodInspectionSerializer(serializers.ModelSerializer):
    shipment = serializers.PrimaryKeyRelatedField(read_only=True)
    shipment_manifest = serializers.CharField(source='shipment.manifest_number', read_only=True)
    shipment_status = serializers.CharField(source='shipment.status', read_only=True)
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True, default=None)
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)
    supervisor_status_label = serializers.CharField(source='get_supervisor_status_display', read_only=True)

    class Meta:
        model = FoodInspection
        fields = [
            'id', 'shipment', 'shipment_manifest', 'shipment_status', 'inspector', 'inspector_name',
            'production_date', 'expiry_date', 'temperature', 'container_condition',
            'container_status', 'batch_number', 'package_condition', 'damaged_weight',
            'sound_weight', 'damaged_count', 'sound_count', 'notes', 'inspection_notes',
            'decision', 'inspected_at',
            'supervisor_status', 'supervisor_status_label', 'supervisor_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
        ]
        read_only_fields = ['id', 'inspected_at']


class SampleSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleSource
        fields = ['id', 'code', 'name_ar', 'name_en', 'description', 'order', 'is_active']
        read_only_fields = ['id']


class ReferenceSampleSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name_ar', read_only=True, default=None)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True, default=None)
    retrieved_by_name = serializers.CharField(source='retrieved_by.full_name', read_only=True, default=None)
    original_sample_number = serializers.CharField(source='original_sample.sample_number', read_only=True, default=None)

    class Meta:
        model = ReferenceSample
        fields = [
            'id', 'ref_number', 'source', 'source_name', 'product_name', 'origin',
            'original_sample', 'original_sample_number',
            'quantity', 'retention_reason', 'storage_temperature', 'retention_duration',
            'storage_location', 'coding', 'seal_number', 'condition_on_arrival',
            'received_by', 'received_by_name', 'received_at',
            'status', 'retrieved_by', 'retrieved_by_name', 'retrieved_at', 'remarks',
        ]
        read_only_fields = ['id', 'received_by', 'received_at']


class ReferenceSampleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceSample
        fields = ['id', 'source', 'product_name', 'origin',
                  'original_sample', 'quantity', 'retention_reason', 'storage_temperature', 'retention_duration',
                  'storage_location', 'coding', 'seal_number', 'condition_on_arrival', 'remarks']
        read_only_fields = ['id']


class ChainOfCustodySerializer(serializers.ModelSerializer):
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True)
    sample_barcode = serializers.CharField(source='sample.sample_barcode', read_only=True)
    transferred_by_name = serializers.CharField(source='transferred_by.full_name', read_only=True, default=None)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True, default=None)

    class Meta:
        model = ChainOfCustody
        fields = [
            'id', 'sample', 'sample_number', 'sample_barcode',
            'from_department', 'to_department',
            'transferred_by', 'transferred_by_name', 'received_by', 'received_by_name',
            'transferred_at', 'received_at', 'condition', 'seal_number', 'remarks', 'is_received',
        ]
        read_only_fields = ['id', 'transferred_by', 'transferred_at']


class ChainOfCustodyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChainOfCustody
        fields = ['sample', 'from_department', 'to_department', 'condition', 'seal_number', 'remarks']
        read_only_fields = ['id']


class FoodSampleSerializer(serializers.ModelSerializer):
    inspection = serializers.PrimaryKeyRelatedField(read_only=True)
    tests = serializers.SerializerMethodField()
    source = serializers.PrimaryKeyRelatedField(read_only=True)
    shipment_manifest = serializers.CharField(
        source='inspection.shipment.manifest_number', read_only=True, default=None
    )
    source_name = serializers.CharField(source='source.name_ar', read_only=True, default=None)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True, default=None)
    coordinator_name = serializers.CharField(source='coordinator.full_name', read_only=True, default=None)
    department_head_name = serializers.CharField(source='department_head.full_name', read_only=True, default=None)
    analyst_name = serializers.CharField(source='analyst.full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    dispatched_by_name = serializers.CharField(source='dispatched_by.full_name', read_only=True, default=None)
    reception_decision_by_name = serializers.CharField(source='reception_decision_by.full_name', read_only=True, default=None)
    lab_invoice = serializers.SerializerMethodField()
    custody = serializers.SerializerMethodField()
    priority_updated_by_name = serializers.CharField(source='priority_updated_by.full_name', read_only=True, default=None)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)
    sampling_reason_label = serializers.CharField(source='get_sampling_reason_display', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    sector_code = serializers.CharField(source='sector.code', read_only=True, default=None)

    class Meta:
        model = FoodSample
        fields = [
            'id', 'inspection', 'shipment_manifest', 'source', 'source_name', 'classification',
            'requesting_department', 'sample_barcode', 'sample_number', 'sample_type',
            'sampling_reason', 'sampling_reason_label', 'priority', 'priority_label',
            'priority_updated_by', 'priority_updated_by_name', 'priority_updated_at',
            'bench', 'received_by', 'received_by_name', 'received_at',
            'coordinator', 'coordinator_name', 'department_head', 'department_head_name',
            'analyst', 'analyst_name',
            'status', 'approval_status', 'approved_by', 'approved_by_name', 'approved_at',
            'collection_status', 'fee_amount',
            'reception_status', 'reception_note', 'reception_decision_by', 'reception_decision_by_name', 'reception_decision_at',
            'rejection_reason', 'reception_checklist',
            'analysis_request_number', 'station', 'inspector_name', 'brand', 'origin_country', 'batch_number',
            'production_date', 'expiry_date', 'quantity', 'quantity_unit', 'units_count',
            'packaging_type', 'packaging_condition', 'temperature',
            'dispatched_by', 'dispatched_by_name', 'dispatched_at', 'dispatch_notes',
            'reported_to_food_safety', 'lab_invoice', 'tests', 'custody', 'sector', 'sector_name', 'sector_code',
        ]
        read_only_fields = [
            'id', 'sample_number', 'status', 'approval_status', 'approved_by', 'approved_at',
            'received_by', 'received_at', 'coordinator', 'department_head', 'analyst',
            'dispatched_by', 'dispatched_at', 'reported_to_food_safety',
            'reception_status', 'reception_note', 'reception_decision_by', 'reception_decision_at',
            'priority_updated_by', 'priority_updated_at', 'sector', 'sector_name', 'sector_code',
        ]

    def get_tests(self, obj):
        tests = obj.tests.select_related('parameter', 'assigned_to').order_by('created_at')
        return SampleTestSerializer(tests, many=True).data

    def get_lab_invoice(self, obj):
        invoice = obj.finance_invoices.order_by('-created_at').first()
        if not invoice:
            return None
        return FinanceSampleInvoiceSerializer(invoice).data

    def get_custody(self, obj):
        events = obj.custody_events.select_related('transferred_by', 'received_by').order_by('transferred_at')
        return ChainOfCustodySerializer(events, many=True).data


class SampleInvoiceSerializer(serializers.ModelSerializer):
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default=None)
    paid_by_name = serializers.CharField(source='paid_by.full_name', read_only=True, default=None)
    exempted_by_name = serializers.CharField(source='exempted_by.full_name', read_only=True, default=None)

    class Meta:
        model = SampleInvoice
        fields = [
            'id', 'sample', 'sample_number', 'invoice_number', 'items',
            'total_amount', 'currency', 'status',
            'issued_by', 'issued_by_name', 'issued_at',
            'receipt_number', 'paid_by', 'paid_by_name', 'paid_at', 'payment_reference',
            'exemption_reason', 'exempted_by', 'exempted_by_name', 'exempted_at',
        ]
        read_only_fields = [
            'id', 'sample', 'invoice_number', 'items', 'total_amount', 'currency', 'status',
            'issued_by', 'issued_at', 'receipt_number', 'paid_by', 'paid_at', 'payment_reference',
            'exemption_reason', 'exempted_by', 'exempted_at',
        ]


class FinanceFoodInvoiceSerializer(serializers.ModelSerializer):
    """عرض فاتورة رقابة أغذية من سجل الفاتورة المالية الموحد (صيغة الواجهة الحالية)."""

    shipment = serializers.UUIDField(source='food_shipment_id', read_only=True)
    shipment_manifest = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(source='net_amount', max_digits=14, decimal_places=2, read_only=True)
    items = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    paid_notes = serializers.SerializerMethodField()
    paid_by = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()
    payment_reference = serializers.SerializerMethodField()

    class Meta:
        model = FinanceInvoice
        fields = [
            'id', 'shipment', 'shipment_manifest', 'invoice_number', 'items',
            'total_amount', 'status', 'issued_by', 'issued_by_name', 'issued_at',
            'receipt_number', 'payment_method', 'paid_notes', 'paid_by', 'paid_by_name',
            'paid_at', 'payment_reference',
        ]
        read_only_fields = fields

    def _payment(self, obj):
        return obj.payments.order_by('-collected_at').first()

    def get_shipment_manifest(self, obj):
        return obj.food_shipment.manifest_number if obj.food_shipment else None

    def get_items(self, obj):
        return [
            {
                'name': line.get('name') or line.get('name_ar') or '',
                'amount': (line.get('amount') or line.get('fee')
                           or line.get('unit_amount') or line.get('total') or 0),
            }
            for line in (obj.items or [])
        ]

    def get_issued_by_name(self, obj):
        return getattr(obj.issued_by, 'full_name', None)

    def get_payment_method(self, obj):
        payment = self._payment(obj)
        return payment.method if payment else ''

    def get_paid_notes(self, obj):
        payment = self._payment(obj)
        return payment.notes if payment else ''

    def get_paid_by(self, obj):
        payment = self._payment(obj)
        return payment.collected_by_id if payment else None

    def get_paid_by_name(self, obj):
        payment = self._payment(obj)
        return getattr(payment.collected_by, 'full_name', None) if payment else None

    def get_paid_at(self, obj):
        payment = self._payment(obj)
        return payment.collected_at if payment else None

    def get_payment_reference(self, obj):
        payment = self._payment(obj)
        return payment.gateway_ref if payment else ''


class FinanceSampleInvoiceSerializer(serializers.ModelSerializer):
    """عرض فاتورة تحليل عينة من سجل الفاتورة المالية الموحد (صيغة الواجهة الحالية)."""

    sample = serializers.UUIDField(source='food_sample_id', read_only=True)
    sample_number = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(source='net_amount', max_digits=14, decimal_places=2, read_only=True)
    items = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()
    paid_by = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()
    payment_reference = serializers.SerializerMethodField()
    exemption_reason = serializers.SerializerMethodField()
    exempted_by = serializers.SerializerMethodField()
    exempted_by_name = serializers.SerializerMethodField()
    exempted_at = serializers.SerializerMethodField()

    class Meta:
        model = FinanceInvoice
        fields = [
            'id', 'sample', 'sample_number', 'invoice_number', 'items',
            'total_amount', 'currency', 'status',
            'issued_by', 'issued_by_name', 'issued_at',
            'receipt_number', 'paid_by', 'paid_by_name', 'paid_at', 'payment_reference',
            'exemption_reason', 'exempted_by', 'exempted_by_name', 'exempted_at',
        ]
        read_only_fields = fields

    def _payment(self, obj):
        return obj.payments.order_by('-collected_at').first()

    def get_sample_number(self, obj):
        return obj.food_sample.sample_number if obj.food_sample else None

    def get_items(self, obj):
        rows = []
        for line in (obj.items or []):
            rows.append({
                'parameter': line.get('parameter') or line.get('fee_id') or '',
                'code': line.get('fee_code') or line.get('code') or '',
                'name_ar': line.get('name') or line.get('name_ar') or '',
                'quantity': line.get('quantity', 1),
                'unit_price': (line.get('unit_amount') or line.get('unit_price')
                               or line.get('amount') or line.get('total') or 0),
                'total': (line.get('amount') or line.get('total')
                          or (line.get('unit_price', 0) * line.get('quantity', 1))),
            })
        return rows

    def get_issued_by_name(self, obj):
        return getattr(obj.issued_by, 'full_name', None)

    def get_paid_by(self, obj):
        payment = self._payment(obj)
        return payment.collected_by_id if payment else None

    def get_paid_by_name(self, obj):
        payment = self._payment(obj)
        return getattr(payment.collected_by, 'full_name', None) if payment else None

    def get_paid_at(self, obj):
        payment = self._payment(obj)
        return payment.collected_at if payment else None

    def get_payment_reference(self, obj):
        payment = self._payment(obj)
        return payment.gateway_ref if payment else ''

    def get_exemption_reason(self, obj):
        payment = self._payment(obj)
        if obj.net_amount == 0 and payment:
            return payment.notes or ''
        return ''

    def get_exempted_by(self, obj):
        return None

    def get_exempted_by_name(self, obj):
        return None

    def get_exempted_at(self, obj):
        return None


class FoodSampleWriteSerializer(serializers.ModelSerializer):
    inspection = serializers.PrimaryKeyRelatedField(
        queryset=FoodInspection.objects.all(), required=False, allow_null=True
    )
    source = serializers.PrimaryKeyRelatedField(
        queryset=SampleSource.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = FoodSample
        fields = [
            'id', 'inspection', 'source', 'classification', 'requesting_department',
            'sample_type', 'sampling_reason', 'bench', 'priority',
            'analysis_request_number', 'station', 'inspector_name',
            'brand', 'origin_country', 'batch_number',
            'production_date', 'expiry_date',
            'quantity', 'quantity_unit', 'units_count',
            'packaging_type', 'packaging_condition', 'temperature',
        ]
        read_only_fields = ['id']


class LabParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabParameter
        fields = ['id', 'code', 'name_ar', 'name_en', 'bench', 'unit', 'method', 'reference_limit', 'detection_limit', 'price', 'sla_min_days', 'sla_max_days', 'order', 'is_active']
        read_only_fields = ['id']


class SampleTestSerializer(serializers.ModelSerializer):
    sample = serializers.PrimaryKeyRelatedField(read_only=True)
    parameter = LabParameterSerializer(read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    entered_by_name = serializers.CharField(source='entered_by.full_name', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    revisions = serializers.SerializerMethodField()
    sla = serializers.SerializerMethodField()
    micro_limit = serializers.SerializerMethodField()
    unit_results = serializers.SerializerMethodField()
    evaluations = serializers.SerializerMethodField()
    qc_reviewed_by_name = serializers.CharField(source='qc_reviewed_by.full_name', read_only=True, default=None)
    qc_status_label = serializers.CharField(source='get_qc_status_display', read_only=True)

    class Meta:
        model = SampleTest
        fields = [
            'id', 'sample', 'parameter', 'assigned_to', 'assigned_to_name',
            'status', 'result_value', 'result_text', 'unit', 'reference_limit',
            'method_used', 'device_used', 'reagent_lot',
            'decision', 'version', 'entered_by', 'entered_by_name', 'entered_at',
            'started_at', 'completed_at', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'approved_by', 'approved_by_name', 'approved_at',
            'notes', 'revisions', 'sla',
            'micro_limit', 'spec_snapshot', 'evaluation', 'evaluation_reason', 'evaluated_at',
            'unit_results', 'evaluations',
            'qc_status', 'qc_status_label', 'qc_notes', 'qc_reviewed_by', 'qc_reviewed_by_name', 'qc_reviewed_at',
        ]
        read_only_fields = ['id', 'entered_by', 'entered_at', 'reviewed_by', 'reviewed_at', 'approved_by', 'approved_at', 'qc_reviewed_by', 'qc_reviewed_at']

    def get_micro_limit(self, obj):
        limit = obj.micro_limit
        if not limit:
            return None
        return MicrobiologicalLimitSerializer(limit).data

    def get_unit_results(self, obj):
        rows = obj.unit_results.order_by('unit_number')
        if not rows:
            return []
        return [
            {
                'id': r.id,
                'unit_number': r.unit_number,
                'result_value': str(r.result_value) if r.result_value is not None else None,
                'qualifier': r.qualifier,
                'result_unit': r.result_unit,
                'entered_by': r.entered_by.full_name if r.entered_by else None,
                'entered_at': r.entered_at.isoformat(),
            }
            for r in rows
        ]

    def get_evaluations(self, obj):
        evs = obj.evaluations.order_by('-evaluated_at')
        if not evs:
            return []
        return [
            {
                'id': e.id,
                'decision': e.decision,
                'reason': e.reason,
                'details': e.details,
                'engine_version': e.engine_version,
                'limit_label': str(e.limit) if e.limit else None,
                'spec_version_label': e.spec_version.label() if e.spec_version else None,
                'evaluated_by': e.evaluated_by.full_name if e.evaluated_by else None,
                'evaluated_at': e.evaluated_at.isoformat(),
            }
            for e in evs
        ]

    def get_revisions(self, obj):
        revs = obj.revisions.all()
        if not revs:
            return []
        return [
            {
                'id': r.id,
                'version': r.version,
                'snapshot': r.snapshot,
                'reason': r.reason,
                'created_by': r.created_by.full_name if r.created_by else None,
                'created_at': r.created_at.isoformat(),
            }
            for r in revs
        ]

    def get_sla(self, obj):
        now = timezone.now()
        due_at = obj.sla_due_at()
        done = obj.is_finalized()
        if done:
            tat = obj.completed_at - obj.sample.received_at if (obj.completed_at and obj.sample.received_at) else None
            tat_hours = round(tat.total_seconds() / 3600, 1) if tat and tat.total_seconds() >= 0 else None
            return {
                'status': 'COMPLETED',
                'due_at': due_at.isoformat(),
                'completed_at': obj.completed_at.isoformat() if obj.completed_at else None,
                'tat_hours': tat_hours,
            }
        remaining = (due_at - now).total_seconds() / 3600 / 24
        if remaining < 0:
            status_val = 'DELAYED'
        elif remaining <= 1:
            status_val = 'DUE_SOON'
        else:
            status_val = 'ON_TIME'
        return {
            'status': status_val,
            'due_at': due_at.isoformat(),
            'remaining_days': round(remaining, 1),
        }


class LabEquipmentSerializer(serializers.ModelSerializer):
    bench_label = serializers.CharField(source='get_bench_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    calibration_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = LabEquipment
        fields = [
            'id', 'name_ar', 'name_en', 'model_number', 'bench', 'bench_label',
            'status', 'status_label', 'last_calibrated', 'next_calibration_due',
            'calibration_overdue', 'notes', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at']


class SampleTestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleTest
        fields = ['parameter', 'assigned_to', 'notes']

    def create(self, validated_data):
        sample_id = self.context['sample']
        existing = SampleTest.objects.filter(sample_id=sample_id, parameter=validated_data['parameter'])
        if existing.exists():
            raise serializers.ValidationError({'parameter': 'هذا الفحص مضافة مسبقاً للعينة'})
        return SampleTest.objects.create(sample_id=sample_id, **validated_data)


class AnalysisCertificateSerializer(serializers.ModelSerializer):
    sample = serializers.PrimaryKeyRelatedField(read_only=True)
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default=None)
    verify_url = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisCertificate
        fields = [
            'id', 'sample', 'sample_number', 'certificate_number', 'issued_by', 'issued_by_name',
            'issued_at', 'decision', 'summary', 'status', 'verify_url',
        ]
        read_only_fields = ['id', 'certificate_number', 'issued_by', 'issued_at', 'status', 'verify_url']

    def get_verify_url(self, obj):
        request = self.context.get('request')
        base = getattr(settings, 'PUBLIC_GATEWAY_URL', None)
        if base:
            return f'{base}/verify/{obj.certificate_number}'
        if request:
            return request.build_absolute_uri(f'/verify/{obj.certificate_number}')
        return f'/verify/{obj.certificate_number}'


class FoodReleaseCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodReleaseCertificate
        fields = ['id', 'shipment', 'certificate_number', 'issued_by', 'issue_date', 'certificate_data']
        read_only_fields = ['id', 'certificate_number', 'issued_by', 'issue_date']


class SamplingPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SamplingPolicy
        fields = [
            'id', 'name_ar', 'scope', 'benchmark', 'threshold',
            'samples_per_unit', 'max_samples', 'default_reason', 'order', 'is_active',
            'product_key', 'package_size', 'risk_group', 'rate_pct',
            'quantity', 'quantity_num', 'sampling_conditions',
        ]
        read_only_fields = ['id']


# ============================================================
#  النظام الوطني للمواصفات الميكروبيولوجية
# ============================================================


class MicroorganismSerializer(serializers.ModelSerializer):
    detection_type_label = serializers.CharField(source='get_detection_type_display', read_only=True)

    class Meta:
        model = Microorganism
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'scientific_name', 'category',
            'detection_type', 'detection_type_label', 'default_unit', 'order', 'active',
        ]
        read_only_fields = ['id']


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'code', 'name_ar', 'name_en', 'parent', 'description', 'order', 'active']
        read_only_fields = ['id']


class FoodProductSerializer(serializers.ModelSerializer):
    micro_category_name = serializers.CharField(source='micro_category.name_ar', read_only=True, default=None)

    class Meta:
        model = FoodProduct
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'category', 'subcategory', 'risk_group',
            'reference_quantity', 'micro_category', 'micro_category_name', 'order', 'is_active',
        ]
        read_only_fields = ['id']


class TestMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestMethod
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'reference_standard',
            'detection_limit', 'unit', 'sample_quantity', 'incubation_parameters', 'active',
        ]
        read_only_fields = ['id']


class MicrobiologicalLimitSerializer(serializers.ModelSerializer):
    microorganism = serializers.PrimaryKeyRelatedField(read_only=True)
    microorganism_name = serializers.CharField(source='microorganism.name_ar', read_only=True, default=None)
    microorganism_code = serializers.CharField(source='microorganism.code', read_only=True, default=None)
    detection_type = serializers.CharField(source='microorganism.detection_type', read_only=True, default=None)
    test_method_name = serializers.CharField(source='test_method.name_ar', read_only=True, default=None)
    plan_label = serializers.CharField(source='get_plan_display', read_only=True)
    rule = serializers.SerializerMethodField()

    class Meta:
        model = MicrobiologicalLimit
        fields = [
            'id', 'version', 'microorganism', 'microorganism_code', 'microorganism_name',
            'test_method', 'test_method_name', 'unit', 'n', 'c', 'm', 'M',
            'plan', 'plan_label', 'rule', 'rule_json', 'active',
            'detection_type',
        ]
        read_only_fields = ['id']

    def get_rule(self, obj):
        return obj.rule()


class MicrobiologicalLimitWriteSerializer(serializers.ModelSerializer):
    microorganism = serializers.PrimaryKeyRelatedField(
        queryset=Microorganism.objects.all()
    )
    test_method = serializers.PrimaryKeyRelatedField(
        queryset=TestMethod.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = MicrobiologicalLimit
        fields = [
            'id', 'version', 'microorganism', 'test_method', 'unit', 'n', 'c', 'm', 'M',
            'plan', 'rule_json', 'active',
        ]
        read_only_fields = ['id']


class SpecificationVersionSerializer(serializers.ModelSerializer):
    spec_code = serializers.CharField(source='specification.code', read_only=True)
    spec_name = serializers.CharField(source='specification.name_ar', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    limits = MicrobiologicalLimitSerializer(many=True, read_only=True)
    label = serializers.CharField(read_only=True)

    class Meta:
        model = SpecificationVersion
        fields = [
            'id', 'specification', 'spec_code', 'spec_name', 'version',
            'effective_from', 'effective_to', 'approved_by', 'approved_by_name',
            'approval_date', 'notes', 'limits', 'label',
        ]
        read_only_fields = ['id']


class SpecificationVersionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecificationVersion
        fields = [
            'id', 'specification', 'version', 'effective_from', 'effective_to',
            'approved_by', 'approval_date', 'notes',
        ]
        read_only_fields = ['id']


class MicrobiologicalSpecificationSerializer(serializers.ModelSerializer):
    product_category_name = serializers.CharField(source='product_category.name_ar', read_only=True, default=None)
    product_name = serializers.CharField(source='product.name_ar', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    versions = SpecificationVersionSerializer(many=True, read_only=True)
    current_version = serializers.SerializerMethodField()

    class Meta:
        model = MicrobiologicalSpecification
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'product_category', 'product_category_name',
            'product', 'product_name', 'reference', 'status', 'status_label',
            'approved_by', 'approved_by_name', 'approval_date', 'versions', 'current_version',
        ]
        read_only_fields = ['id']

    def get_current_version(self, obj):
        version = obj.applicable_version()
        if not version:
            return None
        return SpecificationVersionSerializer(version).data


class MicrobiologicalSpecificationWriteSerializer(serializers.ModelSerializer):
    product_category = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(), required=False, allow_null=True
    )
    product = serializers.PrimaryKeyRelatedField(
        queryset=FoodProduct.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = MicrobiologicalSpecification
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'product_category', 'product',
            'reference', 'status', 'approved_by', 'approval_date',
        ]
        read_only_fields = ['id']


class SampleUnitResultSerializer(serializers.ModelSerializer):
    entered_by_name = serializers.CharField(source='entered_by.full_name', read_only=True, default=None)

    class Meta:
        model = SampleUnitResult
        fields = [
            'id', 'test', 'unit_number', 'result_value', 'qualifier',
            'result_unit', 'entered_by', 'entered_by_name', 'entered_at',
        ]
        read_only_fields = ['id', 'entered_by', 'entered_at']


class ResultEvaluationSerializer(serializers.ModelSerializer):
    limit_label = serializers.CharField(source='limit.__str__', read_only=True, default=None)
    spec_version_label = serializers.CharField(source='spec_version.label', read_only=True, default=None)
    evaluated_by_name = serializers.CharField(source='evaluated_by.full_name', read_only=True, default=None)

    class Meta:
        model = ResultEvaluation
        fields = [
            'id', 'test', 'limit', 'limit_label', 'spec_version', 'spec_version_label',
            'decision', 'reason', 'details', 'engine_version',
            'evaluated_by', 'evaluated_by_name', 'evaluated_at',
        ]
        read_only_fields = ['id', 'evaluated_by', 'evaluated_at']


class QCRecordSerializer(serializers.ModelSerializer):
    test_label = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)
    affected_tests_count = serializers.IntegerField(source='affected_tests.count', read_only=True)

    class Meta:
        model = QCRecord
        fields = [
            'id', 'qc_number', 'bench', 'test', 'test_label', 'control_type', 'lot_number',
            'status', 'severity', 'result_value', 'expected_value', 'tolerance',
            'qc_notes', 'affected_tests', 'affected_tests_count',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']

    def get_test_label(self, obj):
        if not obj.test_id:
            return None
        try:
            return f'{obj.test.sample.sample_number} — {obj.test.parameter.code}'
        except Exception:
            return str(obj.test_id)


class QCRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCRecord
        fields = [
            'id', 'bench', 'test', 'control_type', 'lot_number', 'status', 'severity',
            'result_value', 'expected_value', 'tolerance', 'qc_notes', 'affected_tests',
        ]
        read_only_fields = ['id']


class ReagentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reagent
        fields = [
            'id', 'name_ar', 'name_en', 'bench', 'lot_number', 'expiry_date',
            'quantity', 'unit', 'status', 'supplier', 'certificate_ref', 'notes',
            'is_expired', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StorageLocationSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    location_type_label = serializers.CharField(source='get_location_type_display', read_only=True)

    class Meta:
        model = StorageLocation
        fields = [
            'id', 'name', 'location_type', 'location_type_label', 'parent', 'parent_name',
            'temperature', 'humidity', 'light_protection', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaterialCatalogSerializer(serializers.ModelSerializer):
    material_type_label = serializers.CharField(source='get_material_type_display', read_only=True)
    grade_label = serializers.CharField(source='get_grade_display', read_only=True)
    hazard_label = serializers.CharField(source='get_hazard_class_display', read_only=True)
    bench_label = serializers.CharField(source='get_bench_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    total_stock = serializers.SerializerMethodField()
    low_stock = serializers.SerializerMethodField()
    active_lots = serializers.SerializerMethodField()

    class Meta:
        model = MaterialCatalog
        fields = [
            'id', 'name_ar', 'name_en', 'material_type', 'material_type_label', 'bench', 'bench_label',
            'manufacturer', 'catalog_number', 'cas_number', 'grade', 'grade_label', 'unit',
            'min_stock', 'reorder_level', 'max_stock', 'hazard_class', 'hazard_label',
            'default_storage', 'notes', 'created_by', 'created_by_name',
            'total_stock', 'low_stock', 'active_lots', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_total_stock(self, obj):
        return sum(l.quantity for l in obj.lots.exclude(status=MaterialLot.LotStatus.DISPOSED))

    def get_low_stock(self, obj):
        total = self.get_total_stock(obj)
        return bool(obj.min_stock and total < obj.min_stock)

    def get_active_lots(self, obj):
        return obj.lots.exclude(status__in=[MaterialLot.LotStatus.DISPOSED, MaterialLot.LotStatus.BLOCKED]).count()


class MaterialLotSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name_ar', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    storage_name = serializers.CharField(source='storage.name', read_only=True, default=None)
    days_to_expiry = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = MaterialLot
        fields = [
            'id', 'material', 'material_name', 'lot_number', 'batch_number',
            'manufacturing_date', 'expiry_date', 'quantity', 'unit', 'storage', 'storage_name',
            'supplier', 'certificate_ref', 'received_date', 'received_by',
            'status', 'status_label', 'days_to_expiry', 'is_expired', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SolutionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True, default=None)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True, default=None)
    source_lot_number = serializers.CharField(source='source_lot.lot_number', read_only=True, default=None)
    storage_name = serializers.CharField(source='storage.name', read_only=True, default=None)
    material_name = serializers.CharField(source='material.name_ar', read_only=True, default=None)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Solution
        fields = [
            'id', 'name', 'material', 'material_name', 'concentration', 'solvent',
            'final_volume', 'volume_unit', 'source_lot', 'source_lot_number', 'batch_number',
            'preparation_date', 'expiry_date', 'prepared_by', 'prepared_by_name',
            'verified_by', 'verified_by_name', 'verified_at', 'verified_notes',
            'storage', 'storage_name', 'status', 'status_label', 'is_expired', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'verified_at', 'created_at', 'updated_at']


class MaterialIssueSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name_ar', read_only=True)
    lot_number = serializers.CharField(source='lot.lot_number', read_only=True, default=None)
    solution_name = serializers.CharField(source='solution.name', read_only=True, default=None)
    test_parameter = serializers.CharField(source='test.parameter.name', read_only=True, default=None)
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True, default=None)
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default=None)
    issue_type_label = serializers.CharField(source='get_issue_type_display', read_only=True)

    class Meta:
        model = MaterialIssue
        fields = [
            'id', 'material', 'material_name', 'lot', 'lot_number', 'solution', 'solution_name',
            'test', 'test_parameter', 'sample', 'sample_number', 'issue_type', 'issue_type_label',
            'quantity_used', 'unit', 'purpose', 'issued_by', 'issued_by_name',
            'issued_at', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'issued_at', 'created_at', 'updated_at']


class DisposalRequestSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name_ar', read_only=True)
    lot_number = serializers.CharField(source='lot.lot_number', read_only=True, default=None)
    solution_name = serializers.CharField(source='solution.name', read_only=True, default=None)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)

    class Meta:
        model = DisposalRequest
        fields = [
            'id', 'material', 'material_name', 'lot', 'lot_number', 'solution', 'solution_name',
            'quantity', 'unit', 'reason', 'detail', 'status', 'status_label',
            'requested_by', 'requested_by_name', 'approved_by', 'approved_by_name',
            'approved_at', 'disposed_at', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requested_by', 'approved_at', 'disposed_at', 'created_at', 'updated_at']


class NonConformitySerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default=None)
    capa_count = serializers.IntegerField(source='capa_records.count', read_only=True)

    class Meta:
        model = NonConformity
        fields = [
            'id', 'nc_number', 'nc_type', 'bench', 'severity', 'status', 'title',
            'description', 'reference_type', 'reference_number', 'root_cause',
            'capa_required', 'capa_count', 'reported_by', 'reported_by_name',
            'closed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reported_by', 'closed_at', 'created_at', 'updated_at']


class CpaRecordSerializer(serializers.ModelSerializer):
    responsible_user_name = serializers.CharField(source='responsible_user.full_name', read_only=True, default=None)
    nc_number = serializers.CharField(source='non_conformity.nc_number', read_only=True, default=None)

    class Meta:
        model = CpaRecord
        fields = [
            'id', 'non_conformity', 'nc_number', 'title', 'root_cause',
            'corrective_action', 'preventive_action', 'responsible_user',
            'responsible_user_name', 'due_date', 'status', 'verification_notes',
            'closed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'closed_at', 'created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action', 'object_type',
            'object_id', 'object_label', 'detail', 'ip_address', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ============================================================
#  المواصفات والمعايير المرجعية (Standards & Compliance)
# ============================================================


class AnalyticalMethodSerializer(serializers.ModelSerializer):
    source_label = serializers.CharField(source='get_source_display', read_only=True)
    validation_status_label = serializers.CharField(source='get_validation_status_display', read_only=True)

    class Meta:
        model = AnalyticalMethod
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'source', 'source_label', 'version',
            'matrix', 'applicable_organism', 'lod', 'loq', 'unit',
            'validation_status', 'validation_status_label', 'reference_standard', 'active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StandardRequirementSerializer(serializers.ModelSerializer):
    parameter_code = serializers.CharField(source='parameter.code', read_only=True, default=None)
    parameter_name = serializers.CharField(source='parameter.name_ar', read_only=True, default=None)
    microorganism_code = serializers.CharField(source='microorganism.code', read_only=True, default=None)
    microorganism_name = serializers.CharField(source='microorganism.name_ar', read_only=True, default=None)
    method_code = serializers.CharField(source='method.code', read_only=True, default=None)
    method_name = serializers.CharField(source='method.name_ar', read_only=True, default=None)
    limit_type_label = serializers.CharField(source='get_limit_type_display', read_only=True)
    plan_label = serializers.CharField(source='get_plan_display', read_only=True)
    rule = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()
    version_label = serializers.CharField(source='version.label', read_only=True, default=None)
    version_code = serializers.CharField(source='version.standard.code', read_only=True, default=None)

    class Meta:
        model = StandardRequirement
        fields = [
            'id', 'version', 'version_label', 'version_code',
            'parameter', 'parameter_code', 'parameter_name',
            'microorganism', 'microorganism_code', 'microorganism_name',
            'method', 'method_code', 'method_name',
            'limit_type', 'limit_type_label', 'min_value', 'max_value', 'unit',
            'n', 'c', 'm', 'M', 'plan', 'plan_label', 'rule', 'rule_json',
            'label', 'active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_rule(self, obj):
        return obj.rule()

    def get_label(self, obj):
        return obj.label()


class StandardRequirementWriteSerializer(serializers.ModelSerializer):
    parameter = serializers.PrimaryKeyRelatedField(
        queryset=LabParameter.objects.all(), required=False, allow_null=True
    )
    microorganism = serializers.PrimaryKeyRelatedField(
        queryset=Microorganism.objects.all(), required=False, allow_null=True
    )
    method = serializers.PrimaryKeyRelatedField(
        queryset=AnalyticalMethod.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = StandardRequirement
        fields = [
            'id', 'version', 'parameter', 'microorganism', 'method',
            'limit_type', 'min_value', 'max_value', 'unit',
            'n', 'c', 'm', 'M', 'plan', 'rule_json', 'active',
        ]
        read_only_fields = ['id']


class StandardVersionSerializer(serializers.ModelSerializer):
    standard_code = serializers.CharField(source='standard.code', read_only=True)
    standard_title = serializers.CharField(source='standard.title_ar', read_only=True)
    standard_source = serializers.CharField(source='standard.get_source_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    label = serializers.CharField(read_only=True)
    requirements = StandardRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = StandardVersion
        fields = [
            'id', 'standard', 'standard_code', 'standard_title', 'standard_source',
            'version', 'effective_from', 'effective_to', 'issue_date',
            'document_reference', 'approved_by', 'approved_by_name',
            'approval_date', 'notes', 'requirements', 'label',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StandardVersionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandardVersion
        fields = [
            'id', 'standard', 'version', 'effective_from', 'effective_to', 'issue_date',
            'document_reference', 'approved_by', 'approval_date', 'notes',
        ]
        read_only_fields = ['id']


class StandardSerializer(serializers.ModelSerializer):
    source_label = serializers.CharField(source='get_source_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    product_name = serializers.CharField(source='product.name_ar', read_only=True, default=None)
    product_category_name = serializers.CharField(source='product_category.name_ar', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    versions = StandardVersionSerializer(many=True, read_only=True)
    current_version = serializers.SerializerMethodField()

    class Meta:
        model = Standard
        fields = [
            'id', 'code', 'title_ar', 'title_en', 'source', 'source_label',
            'country', 'document_reference', 'product', 'product_name',
            'product_category', 'product_category_name', 'mandatory',
            'status', 'status_label', 'approved_by', 'approved_by_name',
            'approval_date', 'notes', 'versions', 'current_version',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_current_version(self, obj):
        version = obj.applicable_version()
        if not version:
            return None
        return StandardVersionSerializer(version).data


class StandardWriteSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=FoodProduct.objects.all(), required=False, allow_null=True
    )
    product_category = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Standard
        fields = [
            'id', 'code', 'title_ar', 'title_en', 'source', 'country',
            'document_reference', 'product', 'product_category', 'mandatory',
            'status', 'approved_by', 'approval_date', 'notes',
        ]
        read_only_fields = ['id']


class RegulatoryRuleSerializer(serializers.ModelSerializer):
    source_type_label = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = RegulatoryRule
        fields = [
            'id', 'code', 'name_ar', 'description', 'priority',
            'source_type', 'source_type_label', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FoodDecisionCertificateSerializer(serializers.ModelSerializer):
    decision_label = serializers.CharField(source='get_certificate_type_display', read_only=True)
    decision_name = serializers.CharField(source='decision.full_name', read_only=True, default=None)
    certificate_type_display = serializers.CharField(source='get_certificate_type_display', read_only=True)

    class Meta:
        model = FoodDecisionCertificate
        fields = [
            'id', 'shipment', 'certificate_number', 'certificate_type', 'certificate_type_display',
            'status', 'decision', 'decision_name', 'decision_label', 'issued_at', 'reason', 'certificate_data',
        ]
        read_only_fields = ['id', 'issued_at', 'decision', 'decision_name', 'certificate_number']


class QualityDashboardSerializer(serializers.Serializer):
    specs = serializers.DictField()
    qc = serializers.DictField()
    equipment = serializers.DictField()
    reagents = serializers.DictField()
    methods = serializers.DictField()
    nonconformity = serializers.DictField()
    audit = serializers.DictField()
    compliance = serializers.DictField()
    qc_records = serializers.DictField()


class ReagentDashboardSerializer(serializers.Serializer):
    kpis = serializers.DictField()
    low_stock_materials = serializers.ListField(child=serializers.DictField())
    type_counts = serializers.DictField()
    recent_issues = serializers.ListField(child=serializers.DictField())


class StandardsDashboardSerializer(serializers.Serializer):
    kpis = serializers.DictField()
    source_counts = serializers.DictField()


class StandardsComparisonSerializer(serializers.Serializer):
    parameter_id = serializers.CharField()
    comparison = serializers.ListField(child=serializers.DictField())