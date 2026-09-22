from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Role, RoleAssignment
from apps.accounts.models import User as NqlUser

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
    SampleNumberCounter,
    StorageLocation,
    TreatmentProtocol,
)


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = [
            'id', 'icd_11_code', 'name_ar', 'name_en', 'description', 'symptoms',
            'incubation_period_min', 'incubation_period_max', 'transmission_methods',
            'is_public_health_emergency', 'ihr_category', 'is_active',
        ]
        read_only_fields = ['id']


class DiseaseCaseDefinitionSerializer(serializers.ModelSerializer):
    disease = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = DiseaseCaseDefinition
        fields = [
            'id', 'disease', 'case_type', 'clinical_criteria',
            'lab_criteria', 'epidemiological_criteria', 'version',
        ]
        read_only_fields = ['id', 'version']


class TreatmentProtocolSerializer(serializers.ModelSerializer):
    disease = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TreatmentProtocol
        fields = [
            'id', 'disease', 'name', 'severity_level', 'medications',
            'supportive_care', 'duration_days', 'version', 'is_active',
        ]
        read_only_fields = ['id', 'version']


class LabSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSection
        fields = ['id', 'code', 'name_ar', 'name_en', 'kind', 'description', 'order', 'is_active']
        read_only_fields = ['id']


class LabTestCatalogSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name_ar', read_only=True)

    class Meta:
        model = LabTestCatalog
        fields = ['id', 'code', 'name_ar', 'name_en', 'section', 'section_name', 'sort_order', 'is_active']
        read_only_fields = ['id']


class StorageLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageLocation
        fields = ['id', 'name', 'location_type', 'parent', 'temperature', 'humidity', 'notes']
        read_only_fields = ['id']


class SampleMovementSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='')
    action_label = serializers.SerializerMethodField()

    class Meta:
        model = SampleMovement
        fields = [
            'id', 'sample', 'action', 'action_label', 'department', 'location',
            'user', 'user_name', 'note', 'metadata', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_action_label(self, obj):
        return obj.get_action_display()


class LabSampleSerializer(serializers.ModelSerializer):
    collector_name = serializers.CharField(source='collector.full_name', read_only=True, default='')
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default='')
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default='')
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default='')
    visit_traveler_name = serializers.CharField(source='visit.traveler.full_name', read_only=True, default='')
    visit_phase = serializers.CharField(source='visit.phase', read_only=True, default='')
    request_barcode = serializers.CharField(source='lab_request.barcode', read_only=True, default='')
    request_priority = serializers.CharField(source='lab_request.priority', read_only=True, default='')
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    sample_type_label = serializers.CharField(source='get_sample_type_display', read_only=True)
    source_label = serializers.CharField(source='get_source_display', read_only=True)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)
    reception_status_label = serializers.CharField(source='get_reception_status_display', read_only=True)
    test_count = serializers.IntegerField(source='tests.count', read_only=True)
    result_count = serializers.IntegerField(source='results.count', read_only=True)
    movement_count = serializers.IntegerField(source='movements.count', read_only=True)

    class Meta:
        model = LabSample
        fields = [
            'id', 'sample_number', 'sample_barcode', 'sample_type', 'sample_type_label',
            'source', 'source_label', 'priority', 'priority_label', 'status', 'status_label',
            'reception_status', 'reception_status_label', 'reception_checklist', 'reception_note',
            'rejection_reason', 'received_at', 'storage_location', 'public_result_code', 'public_issued_at',
            'visit', 'visit_traveler_name', 'visit_phase', 'lab_request', 'request_barcode', 'request_priority',
            'section', 'section_name', 'sector', 'sector_name', 'entry_point', 'entry_point_name',
            'collector', 'collector_name', 'collected_at', 'reception_decision_by', 'reception_decision_at',
            'test_count', 'result_count', 'movement_count', 'created_at',
        ]
        read_only_fields = [
            'id', 'sample_number', 'sample_barcode', 'status', 'reception_status', 'received_at',
            'reception_decision_by', 'reception_decision_at', 'collector', 'collected_at', 'created_at',
            'public_result_code', 'public_issued_at',
        ]


class LabSampleCreateSerializer(serializers.ModelSerializer):
    sample_barcode = serializers.CharField(read_only=True)
    sample_number = serializers.CharField(read_only=True)
    collector = serializers.PrimaryKeyRelatedField(
        queryset=LabSample._meta.get_field('collector').remote_field.model.objects.all(),
        required=False, allow_null=True,
    )

    class Meta:
        model = LabSample
        fields = [
            'id', 'visit', 'lab_request', 'sample_number', 'sample_barcode', 'sample_type',
            'source', 'priority', 'section', 'sector', 'entry_point', 'collector',
            'status', 'reception_status', 'storage_location',
        ]
        read_only_fields = ['id', 'sample_number', 'sample_barcode', 'status', 'reception_status']

    def create(self, validated_data):
        collector = validated_data.pop('collector', None) or self.context['request'].user
        return LabSample.objects.create(collector=collector, **validated_data)


class LabSampleReceptionCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSample
        fields = [
            'reception_checklist', 'reception_note', 'rejection_reason',
        ]


class SampleTestSerializer(serializers.ModelSerializer):
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True, default='')
    sample_barcode = serializers.CharField(source='sample.sample_barcode', read_only=True, default='')
    section_name = serializers.CharField(source='sample.section.name_ar', read_only=True, default='')
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default='')
    disease_code = serializers.CharField(source='disease.icd_11_code', read_only=True, default='')
    instrument_name = serializers.CharField(source='instrument.name_ar', read_only=True, default='')
    assigned_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default='')
    entered_name = serializers.CharField(source='entered_by.full_name', read_only=True, default='')
    reviewed_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default='')
    approved_name = serializers.CharField(source='approved_by.full_name', read_only=True, default='')
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    outcome_label = serializers.CharField(source='get_outcome_display', read_only=True)
    critical_ack_name = serializers.CharField(source='critical_acknowledged_by.full_name', read_only=True, default='')
    lab_result_status = serializers.CharField(
        source='lab_result.approval_status', read_only=True, default=''
    )

    class Meta:
        model = SampleTest
        fields = [
            'id', 'sample', 'sample_number', 'sample_barcode', 'section_name',
            'disease', 'disease_name', 'disease_code', 'test_name', 'method',
            'instrument', 'instrument_name', 'assigned_to', 'assigned_name',
            'priority', 'status', 'status_label', 'version',
            'result_value', 'result_text', 'unit', 'reference_range', 'outcome', 'outcome_label',
            'notes', 'is_critical', 'critical_acknowledged_by', 'critical_acknowledged_at', 'critical_ack_name',
            'entered_by', 'entered_name', 'entered_at',
            'reviewed_by', 'reviewed_name', 'reviewed_at',
            'approved_by', 'approved_name', 'approved_at', 'lab_result', 'lab_result_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'version', 'is_critical', 'critical_acknowledged_by',
            'critical_acknowledged_at', 'entered_by', 'entered_at', 'reviewed_by', 'reviewed_at',
            'approved_by', 'approved_at', 'lab_result', 'lab_result_status', 'created_at', 'updated_at',
        ]


class SampleTestWriteSerializer(serializers.ModelSerializer):
    sample = serializers.PrimaryKeyRelatedField(
        queryset=LabSample.objects.all(), required=False, allow_null=True
    )
    disease_code = serializers.SlugRelatedField(
        source='disease', slug_field='icd_11_code', queryset=Disease.objects.filter(is_active=True),
        write_only=True, required=False, allow_null=True,
    )

    class Meta:
        model = SampleTest
        fields = [
            'sample', 'disease', 'disease_code', 'test_name', 'method', 'instrument',
            'assigned_to', 'priority', 'result_value', 'result_text', 'unit',
            'reference_range', 'outcome', 'notes',
        ]


class LabResultSerializer(serializers.ModelSerializer):
    sample = serializers.PrimaryKeyRelatedField(read_only=True)
    entered_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LabResult
        fields = [
            'id', 'sample', 'disease', 'result', 'value',
            'entered_by', 'approved_by', 'approval_status', 'result_date',
        ]
        read_only_fields = ['id', 'approval_status', 'approved_by', 'result_date']


class LabEquipmentSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default='')
    calibration_overdue = serializers.BooleanField(read_only=True)
    calibration_due_soon = serializers.BooleanField(read_only=True)

    class Meta:
        model = LabEquipment
        fields = [
            'id', 'name_ar', 'name_en', 'model_number', 'serial_number', 'section', 'section_name',
            'status', 'last_calibrated', 'next_calibration_due', 'calibration_overdue',
            'calibration_due_soon', 'notes', 'created_by',
        ]
        read_only_fields = ['id', 'created_by']


class ReagentSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default='')
    total_quantity = serializers.FloatField(read_only=True)
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Reagent
        fields = [
            'id', 'name_ar', 'name_en', 'material_type', 'section', 'section_name',
            'manufacturer', 'catalog_number', 'cas_number', 'grade', 'unit',
            'min_stock', 'reorder_level', 'max_stock', 'total_quantity', 'low_stock',
            'hazard_class', 'storage', 'notes', 'created_by',
        ]
        read_only_fields = ['id', 'created_by']

    def get_low_stock(self, obj):
        return obj.total_quantity <= obj.reorder_level if obj.reorder_level else False


class ReagentLotSerializer(serializers.ModelSerializer):
    reagent_name = serializers.CharField(source='reagent.name_ar', read_only=True, default='')
    is_expired = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = ReagentLot
        fields = [
            'id', 'reagent', 'reagent_name', 'lot_number', 'batch_number',
            'manufacturing_date', 'expiry_date', 'quantity', 'unit', 'storage',
            'supplier', 'certificate_ref', 'received_date', 'received_by', 'status',
            'is_expired', 'days_to_expiry', 'notes',
        ]
        read_only_fields = ['id', 'status']


class MaterialIssueSerializer(serializers.ModelSerializer):
    lot_number = serializers.CharField(source='lot.lot_number', read_only=True, default='')
    reagent_name = serializers.CharField(source='lot.reagent.name_ar', read_only=True, default='')
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default='')

    class Meta:
        model = MaterialIssue
        fields = [
            'id', 'lot', 'lot_number', 'reagent_name', 'issue_type', 'quantity_used',
            'unit', 'purpose', 'issued_by', 'issued_by_name', 'issued_at', 'notes',
        ]
        read_only_fields = ['id', 'issued_by', 'issued_at']


class QCRecordSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default='')
    test_label = serializers.CharField(source='test.test_name', read_only=True, default='')
    reviewed_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default='')

    class Meta:
        model = QCRecord
        fields = [
            'id', 'qc_number', 'section', 'section_name', 'test', 'test_label',
            'control_type', 'lot_number', 'status', 'severity',
            'result_value', 'expected_value', 'tolerance', 'qc_notes',
            'reviewed_by', 'reviewed_name', 'reviewed_at',
        ]
        read_only_fields = ['id', 'qc_number', 'reviewed_by', 'reviewed_at']


class NonConformitySerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default='')
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default='')
    capa_count = serializers.IntegerField(source='capas.count', read_only=True)

    class Meta:
        model = NonConformity
        fields = [
            'id', 'nc_number', 'nc_type', 'section', 'section_name', 'severity', 'status',
            'title', 'description', 'reference_type', 'reference_number', 'root_cause',
            'capa_required', 'reported_by', 'reported_by_name', 'closed_at',
            'capa_count', 'created_at',
        ]
        read_only_fields = ['id', 'nc_number', 'reported_by', 'closed_at', 'created_at']


class CapaRecordSerializer(serializers.ModelSerializer):
    responsible_name = serializers.CharField(source='responsible_user.full_name', read_only=True, default='')
    nc_number = serializers.CharField(source='non_conformity.nc_number', read_only=True)
    nc_title = serializers.CharField(source='non_conformity.title', read_only=True)

    class Meta:
        model = CapaRecord
        fields = [
            'id', 'non_conformity', 'nc_number', 'nc_title', 'title', 'root_cause',
            'corrective_action', 'preventive_action', 'responsible_user', 'responsible_name',
            'due_date', 'status', 'verification_notes', 'closed_at',
        ]
        read_only_fields = ['id', 'closed_at']


class CriticalResultNotificationSerializer(serializers.ModelSerializer):
    sample_number = serializers.CharField(source='test.sample.sample_number', read_only=True, default='')
    test_name = serializers.CharField(source='test.test_name', read_only=True, default='')
    outcome = serializers.CharField(source='test.outcome', read_only=True, default='')
    acknowledged_name = serializers.CharField(source='acknowledged_by.full_name', read_only=True, default='')

    class Meta:
        model = CriticalResultNotification
        fields = [
            'id', 'test', 'sample_number', 'test_name', 'outcome',
            'notified_at', 'channel', 'acknowledged_by', 'acknowledged_name',
            'acknowledged_at', 'note',
        ]
        read_only_fields = ['id', 'acknowledged_by', 'acknowledged_at']


class SampleNumberCounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleNumberCounter
        fields = ['id', 'year', 'last_sequence']


class LabUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role.code', read_only=True, allow_null=True)
    role_id = serializers.UUIDField(source='role.id', read_only=True, allow_null=True)

    class Meta:
        model = NqlUser
        fields = [
            'id', 'email', 'username', 'full_name', 'phone',
            'user_type', 'organization_name', 'role', 'role_id',
            'is_active', 'last_login', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LabUserWriteSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field='code', queryset=Role.objects.filter(code__in=LAB_ROLE_CODES), required=False, allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    class Meta:
        model = NqlUser
        fields = ['id', 'email', 'full_name', 'phone', 'user_type', 'role', 'password', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.get('role')
        user = NqlUser(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if role:
            user.role = role
            user.save(update_fields=['role'])
            RoleAssignment.objects.update_or_create(
                user=user,
                role=role,
                defaults={'is_active': True, 'start_date': timezone.localdate()},
            )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.pop('role', 'UNSET')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if role != 'UNSET':
            old_role = instance.role
            instance.role = role
            instance.save(update_fields=['role'])
            if old_role and old_role != role:
                RoleAssignment.objects.filter(user=instance, role=old_role).update(is_active=False)
            RoleAssignment.objects.update_or_create(
                user=instance,
                role=role,
                defaults={'is_active': True, 'start_date': timezone.localdate()},
            )
        return instance