from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticalMethodViewSet,
    AuditLogViewSet,
    CertificateViewSet,
    ChainOfCustodyViewSet,
    CpaRecordViewSet,
    DisposalRequestViewSet,
    FoodInspectionViewSet,
    FoodInvoiceViewSet,
    FoodProductViewSet,
    FoodSampleViewSet,
    LabEquipmentViewSet,
    LabParameterViewSet,
    MaterialCatalogViewSet,
    MaterialIssueViewSet,
    MaterialLotViewSet,
    MicrobiologicalLimitViewSet,
    MicrobiologicalSpecificationViewSet,
    MicroorganismViewSet,
    NonConformityViewSet,
    ProductCategoryViewSet,
    QCRecordViewSet,
    QualityDashboardViewSet,
    QuarantineFeeViewSet,
    ReagentManagementViewSet,
    ReagentViewSet,
    ReferenceSampleViewSet,
    RegulatoryRuleViewSet,
    ResultEvaluationViewSet,
    SampleSourceViewSet,
    SampleTestViewSet,
    SampleUnitResultViewSet,
    SamplingPolicyViewSet,
    ShipmentAttachmentViewSet,
    ShipmentViewSet,
    SolutionViewSet,
    SpecificationVersionViewSet,
    StandardRequirementViewSet,
    StandardsManagementViewSet,
    StandardVersionViewSet,
    StandardViewSet,
    StorageLocationViewSet,
    TestMethodViewSet,
)

router = DefaultRouter()
router.register('shipments', ShipmentViewSet, basename='shipment')
router.register('invoices', FoodInvoiceViewSet, basename='invoice')
router.register('shipment-attachments', ShipmentAttachmentViewSet, basename='shipment-attachment')
router.register('inspections', FoodInspectionViewSet, basename='inspection')
router.register('samples', FoodSampleViewSet, basename='sample')
router.register('sample-tests', SampleTestViewSet, basename='sample-test')
router.register('parameters', LabParameterViewSet, basename='parameter')
router.register('certificates', CertificateViewSet, basename='certificate')
router.register('sampling-policies', SamplingPolicyViewSet, basename='sampling-policy')
router.register('quarantine-fees', QuarantineFeeViewSet, basename='quarantine-fee')
router.register('sample-sources', SampleSourceViewSet, basename='sample-source')
router.register('reference-samples', ReferenceSampleViewSet, basename='reference-sample')
router.register('chain-of-custody', ChainOfCustodyViewSet, basename='chain-of-custody')
router.register('lab-equipment', LabEquipmentViewSet, basename='lab-equipment')
router.register('microorganisms', MicroorganismViewSet, basename='microorganism')
router.register('product-categories', ProductCategoryViewSet, basename='product-category')
router.register('products', FoodProductViewSet, basename='product')
router.register('test-methods', TestMethodViewSet, basename='test-method')
router.register('analytical-methods', AnalyticalMethodViewSet, basename='analytical-method')
router.register('micro-specifications', MicrobiologicalSpecificationViewSet, basename='micro-specification')
router.register('spec-versions', SpecificationVersionViewSet, basename='spec-version')
router.register('micro-limits', MicrobiologicalLimitViewSet, basename='micro-limit')
router.register('unit-results', SampleUnitResultViewSet, basename='unit-result')
router.register('result-evaluations', ResultEvaluationViewSet, basename='result-evaluation')
router.register('qa/dashboard', QualityDashboardViewSet, basename='qa-dashboard')
router.register('qa/qc-records', QCRecordViewSet, basename='qa-qc-record')
router.register('qa/reagents', ReagentViewSet, basename='qa-reagent')
router.register('qa/nonconformities', NonConformityViewSet, basename='qa-nonconformity')
router.register('qa/capa', CpaRecordViewSet, basename='qa-capa')
router.register('qa/audit-logs', AuditLogViewSet, basename='qa-audit-log')
router.register('materials', MaterialCatalogViewSet, basename='material')
router.register('material-lots', MaterialLotViewSet, basename='material-lot')
router.register('solutions', SolutionViewSet, basename='solution')
router.register('material-issues', MaterialIssueViewSet, basename='material-issue')
router.register('disposal-requests', DisposalRequestViewSet, basename='disposal-request')
router.register('storage-locations', StorageLocationViewSet, basename='storage-location')
router.register('reagent-management', ReagentManagementViewSet, basename='reagent-management')
router.register('standards', StandardViewSet, basename='standard')
router.register('standard-versions', StandardVersionViewSet, basename='standard-version')
router.register('standard-requirements', StandardRequirementViewSet, basename='standard-requirement')
router.register('regulatory-rules', RegulatoryRuleViewSet, basename='regulatory-rule')
router.register('standards-management', StandardsManagementViewSet, basename='standards-management')

urlpatterns = [
    path('', include(router.urls)),
]