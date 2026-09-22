from rest_framework import serializers

from apps.surveillance.models.contact import (
    ContactTrace,
    ContactFollowUp,
    FollowUpStatus,
)
from apps.surveillance.services.workflows import ContactWorkflowService


class ContactFollowUpSerializer(serializers.ModelSerializer):
    checked_by_name = serializers.CharField(source='checked_by.full_name', read_only=True, default=None)

    class Meta:
        model = ContactFollowUp
        fields = ['id', 'check_date', 'check_time', 'temperature', 'heart_rate',
                  'respiratory_rate', 'oxygen_saturation', 'symptoms',
                  'symptom_onset_date', 'status', 'notes', 'checked_by',
                  'checked_by_name', 'check_method', 'converted_case', 'created_at']
        read_only_fields = ['id', 'created_at']


class ContactTraceSerializer(serializers.ModelSerializer):
    index_case_number = serializers.CharField(source='index_case.case_number', read_only=True)
    port_name = serializers.CharField(source='port.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    follow_ups = ContactFollowUpSerializer(many=True, read_only=True)
    day = serializers.IntegerField(source='current_follow_up_day', read_only=True)
    missed_followups = serializers.SerializerMethodField()

    class Meta:
        model = ContactTrace
        fields = ['id', 'contact_number', 'index_case', 'index_case_number',
                  'person_name', 'age', 'sex', 'phone', 'national_id',
                  'relationship', 'contact_type', 'last_exposure_date',
                  'exposure_duration_minutes', 'exposure_setting', 'exposure_details',
                  'follow_up_start', 'follow_up_end', 'follow_up_days',
                  'current_follow_up_day', 'location', 'latitude', 'longitude',
                  'port', 'port_name', 'sector', 'sector_name', 'status',
                  'converted_case', 'notes', 'assigned_to', 'assigned_to_name',
                  'supervised_by', 'day', 'missed_followups', 'follow_ups', 'created_at']
        read_only_fields = ['id', 'contact_number', 'created_at']

    def get_missed_followups(self, obj):
        return obj.get_missed_followups_count()


class ContactTraceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactTrace
        fields = ['index_case', 'person_name', 'age', 'sex', 'phone', 'national_id',
                  'relationship', 'contact_type', 'last_exposure_date',
                  'exposure_duration_minutes', 'exposure_setting', 'exposure_details',
                  'follow_up_days', 'location', 'latitude', 'longitude',
                  'port', 'sector', 'status', 'converted_case', 'notes',
                  'assigned_to', 'supervised_by']
        extra_kwargs = {
            'person_name': {'required': True},
            'last_exposure_date': {'required': True},
        }

    def create(self, validated_data):
        if 'status' not in validated_data:
            validated_data['status'] = 'UNDER_MONITORING'
        return super().create(validated_data)


class ContactFollowUpWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactFollowUp
        fields = ['check_date', 'check_time', 'temperature', 'heart_rate',
                  'respiratory_rate', 'oxygen_saturation', 'symptoms',
                  'symptom_onset_date', 'status', 'notes', 'check_method',
                  'converted_case']
        extra_kwargs = {
            'check_date': {'required': False},
            'symptoms': {'required': False},
        }

    def create(self, validated_data):
        contact = validated_data.pop('contact')
        if 'status' not in validated_data:
            validated_data['status'] = FollowUpStatus.OK
        return ContactWorkflowService.add_followup(contact, validated_data, self.context['request'].user)