from rest_framework import serializers

from .models import (
    ChemistryTest,
    ChemistryEquipment,
    ChemistryReagent,
    QCRecord,
    ChemistryAnalysisSession,
)


class ChemistryTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChemistryTest
        fields = [
            'id', 'sample', 'product', 'test_type', 'priority',
            'sla_unit', 'sla_value', 'status', 'assigned_analyst',
            'received_at', 'started_at', 'completed_at',
            'specification_version', 'specification_limit',
            'result_value', 'unit', 'compliance_status',
            'analyst_comment', 'returned_reason', 'qc_required', 'qc_passed',
        ]
        read_only_fields = ['id', 'received_at']

    def create(self, validated_data):
        validated_data['status'] = ChemistryTest.Status.DRAFT
        return super().create(validated_data)


class ChemistryEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChemistryEquipment
        fields = [
            'id', 'name', 'type', 'manufacturer', 'model',
            'serial_number', 'status', 'location',
            'last_calibration', 'next_calibration', 'calibration_status',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        serial_number = validated_data.get('serial_number')
        if not serial_number:
            validated_data['serial_number'] = f'CH-{validated_data["id"]}'
        return super().create(validated_data)


class ChemistryReagentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChemistryReagent
        fields = [
            'id', 'name', 'type', 'lot_number', 'expiry_date',
            'quantity', 'unit', 'minimum_stock', 'status', 'location',
            'assigned_test',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        lot_number = validated_data.get('lot_number')
        if not lot_number:
            validated_data['lot_number'] = f'REAGENT-{validated_data["id"]}'
        return super().create(validated_data)


class QCRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCRecord
        fields = [
            'id', 'test_type', 'control_sample', 'result',
            'expected_range', 'status', 'performed_by', 'performed_at',
        ]
        read_only_fields = ['id', 'performed_at']

    def create(self, validated_data):
        test_type = validated_data.get('test_type', '')
        control_sample = validated_data.get('control_sample', '')
        if not control_sample:
            import uuid
            control_sample = f'QC-{uuid.uuid4().hex[:6].upper()}'
        validated_data['control_sample'] = control_sample
        return super().create(validated_data)


class ChemistryAnalysisSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChemistryAnalysisSession
        fields = [
            'id', 'sample', 'test_type', 'equipment_used',
            'reagent_used', 'result_value', 'unit', 'limit_value',
            'compliance', 'analyst', 'started_at', 'completed_at', 'status',
        ]
        read_only_fields = ['id', 'started_at']

    def create(self, validated_data):
        equipment = validated_data.get('equipment_used')
        if equipment:
            equipment.status = ChemistryEquipment.Status.IN_USE
            equipment.save(update_fields=['status'])

        validated_data['status'] = ChemistryAnalysisSession.Status.IN_PROGRESS
        return super().create(validated_data)

    def update(self, instance, validated_data):
        equipment = validated_data.get('equipment_used', instance.equipment_used)
        if equipment and equipment != instance.equipment_used:
            instance.equipment_used.status = ChemistryEquipment.Status.AVAILABLE
            instance.equipment_used.save(update_fields=['status'])

        if 'status' in validated_data:
            instance.status = validated_data['status']

        if 'result_value' in validated_data or 'compliance' in validated_data:
            instance.compliance = validated_data.get('compliance', instance.compliance)

        if 'completed_at' not in validated_data:
            from django.utils import timezone
            instance.completed_at = timezone.now()

        return super().update(instance, validated_data)