from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    AnalyticalMethod,
    AuditLog,
    ChainOfCustody,
    CpaRecord,
    DisposalRequest,
    FoodInspection,
    FoodInvoice,
    FoodProduct,
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
    AnalysisCertificate,
    FoodReleaseCertificate,
    FoodDecisionCertificate,
)
from .serializers import (
    AnalyticalMethodSerializer,
    AnalysisCertificateSerializer,
    AuditLogSerializer,
    ChainOfCustodySerializer,
    CpaRecordSerializer,
    DisposalRequestSerializer,
    FoodInspectionSerializer,
    FoodInvoiceSerializer,
    FoodProductSerializer,
    FoodSampleSerializer,
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


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = FoodShipment.objects.all()
    serializer_class = FoodShipmentSerializer
    permission_classes = [IsAuthenticated]


class FoodInvoiceViewSet(viewsets.ModelViewSet):
    queryset = FoodInvoice.objects.all()
    serializer_class = FoodInvoiceSerializer
    permission_classes = [IsAuthenticated]


class ShipmentAttachmentViewSet(viewsets.ModelViewSet):
    queryset = ShipmentAttachment.objects.all()
    serializer_class = ShipmentAttachmentSerializer
    permission_classes = [IsAuthenticated]


class FoodInspectionViewSet(viewsets.ModelViewSet):
    queryset = FoodInspection.objects.all()
    serializer_class = FoodInspectionSerializer
    permission_classes = [IsAuthenticated]


class FoodSampleViewSet(viewsets.ModelViewSet):
    queryset = FoodSample.objects.all()
    serializer_class = FoodSampleSerializer
    permission_classes = [IsAuthenticated]


class SampleTestViewSet(viewsets.ModelViewSet):
    queryset = SampleTest.objects.all()
    serializer_class = SampleTestSerializer
    permission_classes = [IsAuthenticated]


class LabParameterViewSet(viewsets.ModelViewSet):
    queryset = LabParameter.objects.all()
    serializer_class = LabParameterSerializer
    permission_classes = [IsAuthenticated]


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
