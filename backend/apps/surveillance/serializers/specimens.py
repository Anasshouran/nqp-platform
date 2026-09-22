from rest_framework import serializers

from apps.surveillance.models.specimen import (
    Specimen,
    SpecimenMovement,
    SpecimenLabResult,
    SpecimenStatus,
)


class SpecimenMovementSerializer(serializers.ModelSerializer):
    handler_name = serializers.CharField(source='handler.full_name', read_only=True, default=None)

    class Meta:
        model = SpecimenMovement
        fields = ['id', 'action', 'from_location', 'to_location', 'handler',
                  'handler_name', 'performed_at', 'notes', 'metadata']
        read_only_fields = fields


class SpecimenLabResultSerializer(serializers.ModelSerializer):
    entered_by_name = serializers.CharField(source='entered_by.full_name', read_only=True, default=None)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True, default=None)
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)

    class Meta:
        model = SpecimenLabResult
        fields = ['id', 'specimen', 'lab_result', 'disease', 'disease_name',
                  'test_name', 'test_method', 'result_value', 'result_qualitative',
                  'reference_range', 'unit', 'interpretation', 'clinical_significance',
                  'is_critical', 'entered_by', 'entered_by_name', 'verified_by',
                  'verified_by_name', 'verified_at']
        read_only_fields = ['id', 'critical_notified_at']


class SpecimenSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True, default=None)
    laboratory_name = serializers.CharField(source='laboratory.name_ar', read_only=True, default=None)
    collected_by_name = serializers.CharField(source='collected_by.full_name', read_only=True, default=None)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True, default=None)
    result_detail = SpecimenLabResultSerializer(source='lab_result_detail', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    specimen_type_display = serializers.CharField(source='get_specimen_type_display', read_only=True)

    class Meta:
        model = Specimen
        fields = ['id', 'specimen_number', 'case', 'case_number', 'investigation',
                  'outbreak', 'specimen_type', 'specimen_type_display',
                  'specimen_type_other', 'collected_by',
                  'collected_by_name', 'collected_at', 'collection_method',
                  'collection_site', 'volume_quantity', 'container_type',
                  'transport_medium', 'status', 'status_display', 'priority',
                  'laboratory', 'laboratory_name', 'lab_sample', 'shipped_at',
                  'shipped_by', 'received_at', 'received_by', 'received_by_name',
                  'rejection_reason', 'result_summary', 'result_reported_at',
                  'result_reported_to', 'clinical_info', 'notes', 'result_detail',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'specimen_number', 'created_at', 'updated_at']


class SpecimenWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specimen
        fields = ['case', 'investigation', 'outbreak', 'specimen_type',
                  'specimen_type_other', 'collection_method', 'collection_site',
                  'volume_quantity', 'container_type', 'transport_medium',
                  'priority', 'laboratory', 'clinical_info', 'notes']


class SpecimenTransitionSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=SpecimenStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, default='')


class SpecimenResultWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecimenLabResult
        fields = ['disease', 'test_name', 'test_method', 'result_value',
                  'result_qualitative', 'reference_range', 'unit',
                  'interpretation', 'clinical_significance', 'is_critical']


class SpecimenLabResultCreateSerializer(serializers.Serializer):
    disease = serializers.UUIDField()
    test_name = serializers.CharField()
    test_method = serializers.CharField(required=False, allow_blank=True, default='')
    result_qualitative = serializers.ChoiceField(
        choices=[('POSITIVE', 'إيجابي'), ('NEGATIVE', 'سلبي'),
                 ('INCONCLUSIVE', 'غير حاسم'), ('BORDERLINE', 'حدي')]
    )
    result_value = serializers.CharField(required=False, allow_blank=True, default='')
    interpretation = serializers.CharField(required=False, allow_blank=True, default='')
    is_critical = serializers.BooleanField(default=False)