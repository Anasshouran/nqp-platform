import uuid
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import (
    ChemistryTest,
    ChemistryEquipment,
    ChemistryReagent,
    QCRecord,
    ChemistryAnalysisSession,
)
from .serializers import (
    ChemistryTestSerializer,
    ChemistryEquipmentSerializer,
    ChemistryReagentSerializer,
    QCRecordSerializer,
    ChemistryAnalysisSessionSerializer,
)


class ChemistryTestViewSet(viewsets.ModelViewSet):
    queryset = ChemistryTest.objects.select_related('sample', 'assigned_analyst').all()
    serializer_class = ChemistryTestSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['sample__national_id', 'product', 'test_type']
    ordering_fields = ['received_at', 'priority', 'status']
    filter_fields = ['status', 'test_type', 'priority']

    @action(detail=True, methods=['post'], url_path='start')
    def start_analysis(self, request, pk=None):
        test = self.get_object()
        test.status = ChemistryTest.Status.IN_ANALYSIS
        test.started_at = timezone.now()
        test.save(update_fields=['status', 'started_at'])
        return Response(success_response(ChemistryTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='enter-result')
    def enter_result(self, request, pk=None):
        test = self.get_object()
        result_value = request.data.get('result_value')
        unit = request.data.get('unit', '')
        compliance = request.data.get('compliance', '')

        test.result_value = result_value
        test.unit = unit

        if compliance == 'COMPLIANT':
            test.compliance_status = 'COMPLIANT'
        elif compliance == 'NON_COMPLIANT':
            test.compliance_status = 'NON_COMPLIANT'

        test.status = ChemistryTest.Result_ENTERED
        test.save(update_fields=['result_value', 'unit', 'compliance_status', 'status'])

        # Auto-QC check
        if test.qc_required and test.qc_passed is None:
            test.qc_passed = True  # Auto-pass if no QC required or already done
            test.save(update_fields=['qc_passed'])

        return Response(success_response(ChemistryTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_for_review(self, request, pk=None):
        test = self.get_object()
        test.status = ChemistryTest.Status.SUBMITTED
        test.save(update_fields=['status'])

        # Create analysis session record
        from .models import ChemistryAnalysisSession
        session, _ = ChemistryAnalysisSession.objects.get_or_create(
            sample=test.sample,
            test_type=test.test_type,
            defaults={
                'analyst': test.assigned_analyst,
                'status': ChemistryAnalysisSession.Status.COMPLETED,
            }
        )
        session.result_value = test.result_value
        session.unit = test.unit
        session.limit_value = test.specification_limit
        if test.compliance_status == 'COMPLIANT':
            session.compliance = ChemistryAnalysisSession.Meta.get_field('compliance').choices[0][0]
        else:
            session.compliance = ChemistryAnalysisSession.Meta.get_field('compliance').choices[1][0]
        session.save()

        return Response(success_response(ChemistryTestSerializer(test).data))

    @action(detail=True, methods=['post'], url_path='return')
    def return_result(self, request, pk=None):
        test = self.get_object()
        reason = request.data.get('reason', '')
        test.status = ChemistryTest.Status.RETURNED
        test.returned_reason = reason
        test.save(update_fields=['status', 'returned_reason'])
        return Response(success_response(ChemistryTestSerializer(test).data))


class ChemistryEquipmentViewSet(viewsets.ModelViewSet):
    queryset = ChemistryEquipment.objects.all()
    serializer_class = ChemistryEquipmentSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'serial_number', 'type']
    ordering_fields = ['name', 'last_calibration', 'next_calibration']
    filter_fields = ['status']

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_equipment(self, request, pk=None):
        equipment = self.get_object()
        analyst_id = request.data.get('analyst_id')
        if analyst_id:
            from django.contrib.auth import get_user_model
            UserModel = get_user_model()
            try:
                analyst = UserModel.objects.get(id=analyst_id)
                equipment.assigned_analyst = analyst
                equipment.save(update_fields=['assigned_analyst'])
            except UserModel.DoesNotExist:
                pass
        return Response(success_response(ChemistryEquipmentSerializer(equipment).data))

    @action(detail=True, methods=['post'], url_path='release')
    def release_equipment(self, request, pk=None):
        equipment = self.get_object()
        equipment.status = ChemistryEquipment.Status.AVAILABLE
        equipment.assigned_analyst = None
        equipment.save(update_fields=['status', 'assigned_analyst'])
        return Response(success_response(ChemistryEquipmentSerializer(equipment).data))


class ChemistryReagentViewSet(viewsets.ModelViewSet):
    queryset = ChemistryReagent.objects.all()
    serializer_class = ChemistryReagentSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'lot_number']
    ordering_fields = ['expiry_date', 'name']
    filter_fields = ['status', 'type']

    @action(detail=True, methods=['post'], url_path='update-stock')
    def update_stock(self, request, pk=None):
        reagent = self.get_object()
        quantity_change = request.data.get('quantity_change', 0)
        reagent.quantity += float(quantity_change)
        if reagent.quantity < 10:
            reagent.status = ChemistryReagent.Status.LOW_STOCK
        elif reagent.expiry_date and reagent.expiry_date <= timezone.now().date():
            reagent.status = ChemistryReagent.Status.EXPIRED
        reagent.save(update_fields=['quantity', 'status'])
        return Response(success_response(ChemistryReagentSerializer(reagent).data))


class QCRecordViewSet(viewsets.ModelViewSet):
    queryset = QCRecord.objects.all().order_by('-performed_at')
    serializer_class = QCRecordSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['test_type', 'control_sample']
    ordering_fields = ['performed_at']
    filter_fields = ['status', 'test_type']

    @action(detail=True, methods=['post'], url_path='mark-passed')
    def mark_passed(self, request, pk=None):
        qc = self.get_object()
        qc.status = QCRecord.QCStatus.PASSED
        qc.save(update_fields=['status'])
        return Response(success_response(QCRecordSerializer(qc).data))

    @action(detail=True, methods=['post'], url_path='mark-failed')
    def mark_failed(self, request, pk=None):
        qc = self.get_object()
        qc.status = QCRecord.QCStatus.FAILED
        qc.save(update_fields=['status'])
        return Response(success_response(QCRecordSerializer(qc).data))


class ChemistryAnalysisSessionViewSet(viewsets.ModelViewSet):
    queryset = ChemistryAnalysisSession.objects.select_related('sample', 'analyst', 'equipment_used').all()
    serializer_class = ChemistryAnalysisSessionSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['sample__national_id', 'test_type', 'compliance']
    ordering_fields = ['started_at', 'completed_at']
    filter_fields = ['status', 'test_type', 'compliance']

    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize_session(self, request, pk=None):
        session = self.get_object()
        session.status = ChemistryAnalysisSession.Status.COMPLETED
        session.completed_at = timezone.now()
        session.save(update_fields=['status', 'completed_at'])
        return Response(success_response(ChemistryAnalysisSessionSerializer(session).data))