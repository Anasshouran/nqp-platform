from django.contrib import admin

from .models import (
    AnalysisCertificate,
    ChainOfCustody,
    FoodDecisionCertificate,
    FoodFee,
    FoodInspection,
    FoodInvoice,
    FoodProduct,
    FoodReleaseCertificate,
    FoodSample,
    FoodShipment,
    LabParameter,
    MicrobiologicalLimit,
    MicrobiologicalSpecification,
    Microorganism,
    ProductCategory,
    QuarantineFee,
    ReferenceSample,
    ResultEvaluation,
    SampleInvoice,
    SampleSource,
    SampleTest,
    SampleTestRevision,
    SampleUnitResult,
    SpecificationVersion,
    TestMethod,
)


@admin.register(FoodShipment)
class FoodShipmentAdmin(admin.ModelAdmin):
    list_display = ['manifest_number', 'supplier_name', 'origin_country', 'status', 'arrival_date', 'fees_paid', 'final_decision', 'referred_from']
    list_filter = ['status', 'shipment_type', 'fees_paid', 'final_decision', 'referred_from']
    search_fields = ['manifest_number', 'supplier_name']


@admin.register(FoodFee)
class FoodFeeAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'fee_type', 'amount', 'is_active']
    list_filter = ['fee_type', 'is_active']


@admin.register(QuarantineFee)
class QuarantineFeeAdmin(admin.ModelAdmin):
    list_display = ['code', 'category', 'name_ar', 'amount_sdg', 'amount_usd', 'currency_note', 'year', 'is_active']
    list_filter = ['category', 'year', 'is_active']
    search_fields = ['code', 'name_ar']
    ordering = ['year', 'category', 'order', 'id']


@admin.register(FoodInvoice)
class FoodInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'shipment', 'total_amount', 'status', 'issued_by', 'issued_at']
    list_filter = ['status']
    search_fields = ['invoice_number', 'receipt_number', 'shipment__manifest_number']


@admin.register(FoodDecisionCertificate)
class FoodDecisionCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'shipment', 'certificate_type', 'decision', 'issued_at']
    list_filter = ['certificate_type', 'status']
    search_fields = ['certificate_number', 'shipment__manifest_number']


@admin.register(FoodInspection)
class FoodInspectionAdmin(admin.ModelAdmin):
    list_display = ['shipment', 'inspector', 'decision', 'inspected_at']
    list_filter = ['decision']


@admin.register(FoodSample)
class FoodSampleAdmin(admin.ModelAdmin):
    list_display = [
        'sample_number', 'sample_barcode', 'inspection', 'source', 'classification', 'sample_type', 'bench',
        'status', 'approval_status', 'received_at',
    ]
    list_filter = ['status', 'bench', 'approval_status', 'classification', 'collection_status', 'source']



@admin.register(SampleSource)
class SampleSourceAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name_ar', 'name_en']
    ordering = ['order', 'name_ar']


@admin.register(ReferenceSample)
class ReferenceSampleAdmin(admin.ModelAdmin):
    list_display = ['ref_number', 'product_name', 'source', 'storage_location', 'status', 'received_at']
    list_filter = ['status', 'source']
    search_fields = ['ref_number', 'product_name', 'coding']


@admin.register(ChainOfCustody)
class ChainOfCustodyAdmin(admin.ModelAdmin):
    list_display = ['sample', 'from_department', 'to_department', 'transferred_by', 'is_received', 'transferred_at']
    list_filter = ['is_received']
    search_fields = ['sample__sample_number', 'seal_number']


@admin.register(LabParameter)
class LabParameterAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'bench', 'unit', 'order', 'is_active']
    list_filter = ['bench', 'is_active']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(SampleTest)
class SampleTestAdmin(admin.ModelAdmin):
    list_display = ['sample', 'parameter', 'assigned_to', 'status', 'decision', 'version', 'reviewed_by', 'approved_by', 'completed_at']
    list_filter = ['status', 'decision']
    readonly_fields = ['version']


@admin.register(SampleTestRevision)
class SampleTestRevisionAdmin(admin.ModelAdmin):
    list_display = ['test', 'version', 'reason', 'created_by', 'created_at']
    search_fields = ['test__sample__sample_number', 'reason']


@admin.register(SampleInvoice)
class SampleInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'sample', 'total_amount', 'status', 'issued_at', 'paid_at']
    list_filter = ['status', 'currency']


@admin.register(AnalysisCertificate)
class AnalysisCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'sample', 'issued_by', 'issued_at', 'decision', 'status']
    list_filter = ['status', 'decision']


@admin.register(FoodReleaseCertificate)
class FoodReleaseCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'shipment', 'issued_by', 'issue_date']
    search_fields = ['certificate_number']


# ============================================================
#  النظام الوطني للمواصفات الميكروبيولوجية
# ============================================================


class MicrobiologicalLimitInline(admin.TabularInline):
    model = MicrobiologicalLimit
    extra = 0
    autocomplete_fields = ['microorganism', 'test_method']
    fields = ['microorganism', 'test_method', 'unit', 'n', 'c', 'm', 'M', 'plan', 'active']


class SpecificationVersionInline(admin.TabularInline):
    model = SpecificationVersion
    extra = 0
    fields = ['version', 'effective_from', 'effective_to', 'approved_by', 'approval_date', 'notes']


@admin.register(Microorganism)
class MicroorganismAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'scientific_name', 'detection_type', 'default_unit', 'active', 'order']
    list_filter = ['detection_type', 'active', 'category']
    search_fields = ['code', 'name_ar', 'name_en', 'scientific_name']
    ordering = ['order', 'code']


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'parent', 'active', 'order']
    list_filter = ['active']
    search_fields = ['code', 'name_ar', 'name_en']
    ordering = ['order', 'code']


@admin.register(FoodProduct)
class FoodProductAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'category', 'subcategory', 'risk_group', 'micro_category', 'is_active']
    list_filter = ['is_active', 'category', 'risk_group']
    search_fields = ['code', 'name_ar', 'name_en', 'category']
    ordering = ['category', 'name_ar']


@admin.register(TestMethod)
class TestMethodAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'reference_standard', 'unit', 'sample_quantity', 'active']
    list_filter = ['active']
    search_fields = ['code', 'name_ar', 'name_en', 'reference_standard']


@admin.register(MicrobiologicalSpecification)
class MicrobiologicalSpecificationAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'product_category', 'product', 'status', 'approval_date']
    list_filter = ['status', 'product_category']
    search_fields = ['code', 'name_ar', 'name_en', 'reference']
    inlines = [SpecificationVersionInline]


@admin.register(SpecificationVersion)
class SpecificationVersionAdmin(admin.ModelAdmin):
    list_display = ['specification', 'version', 'effective_from', 'effective_to', 'approval_date']
    list_filter = ['specification']
    search_fields = ['specification__code', 'specification__name_ar']
    inlines = [MicrobiologicalLimitInline]


@admin.register(MicrobiologicalLimit)
class MicrobiologicalLimitAdmin(admin.ModelAdmin):
    list_display = ['version', 'microorganism', 'test_method', 'unit', 'n', 'c', 'm', 'M', 'plan', 'active']
    list_filter = ['plan', 'active']
    search_fields = ['microorganism__code', 'microorganism__name_ar']


@admin.register(SampleUnitResult)
class SampleUnitResultAdmin(admin.ModelAdmin):
    list_display = ['test', 'unit_number', 'result_value', 'qualifier', 'result_unit', 'entered_by', 'entered_at']
    search_fields = ['test__sample__sample_number']
    list_filter = ['qualifier']


@admin.register(ResultEvaluation)
class ResultEvaluationAdmin(admin.ModelAdmin):
    list_display = ['test', 'decision', 'limit', 'spec_version', 'engine_version', 'evaluated_by', 'evaluated_at']
    list_filter = ['decision']
    search_fields = ['test__sample__sample_number']
