from rest_framework import serializers

from apps.surveillance.models.investigation import (
    Investigation,
    InvestigationAxis,
    InvestigationFinding,
    InvestigationPriority,
)
from apps.surveillance.models.event import HealthEvent

from apps.surveillance.services.workflows import InvestigationWorkflowService


class InvestigationAxisSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(source='completed_by.full_name', read_only=True, default=None)
    axis_type_display = serializers.CharField(source='get_axis_type_display', read_only=True)

    class Meta:
        model = InvestigationAxis
        fields = ['id', 'axis_type', 'axis_type_display', 'findings', 'is_completed',
                  'order', 'completed_by', 'completed_by_name', 'completed_at']
        read_only_fields = ['id', 'is_completed', 'completed_by', 'completed_at']


class InvestigationFindingSerializer(serializers.ModelSerializer):
    finding_type_display = serializers.CharField(source='get_finding_type_display', read_only=True)

    class Meta:
        model = InvestigationFinding
        fields = ['id', 'finding_type', 'finding_type_display', 'title', 'description',
                  'evidence', 'confidence_level']
        read_only_fields = ['id']


class InvestigationSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True, default=None)
    event_number = serializers.CharField(source='event.event_number', read_only=True, default=None)
    lead_name = serializers.CharField(source='lead_investigator.full_name', read_only=True, default=None)
    axes = InvestigationAxisSerializer(many=True, read_only=True)
    findings_detail = InvestigationFindingSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Investigation
        fields = ['id', 'investigation_number', 'title', 'case', 'case_number',
                  'event', 'event_number', 'outbreak', 'priority', 'hypothesis',
                  'method', 'lead_investigator', 'lead_name', 'team', 'supervisor',
                  'axes', 'findings_detail', 'findings', 'source_of_infection',
                  'transmission_route', 'risk_assessment', 'status', 'status_display',
                  'recommendations', 'actions_taken', 'prevention_measures', 'notes',
                  'attachments', 'started_at', 'completed_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'investigation_number', 'created_at', 'updated_at']


class InvestigationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investigation
        fields = ['title', 'case', 'event', 'outbreak', 'priority', 'hypothesis',
                  'method', 'lead_investigator', 'team', 'supervisor',
                  'findings', 'source_of_infection', 'transmission_route',
                  'risk_assessment', 'recommendations', 'actions_taken',
                  'prevention_measures', 'notes']
        extra_kwargs = {
            'team': {'required': False},
        }


class InvestigationStartSerializer(serializers.Serializer):
    title = serializers.CharField()
    case = serializers.UUIDField(required=False, allow_null=True, default=None)
    event = serializers.UUIDField(required=False, allow_null=True, default=None)
    outbreak = serializers.UUIDField(required=False, allow_null=True, default=None)
    priority = serializers.ChoiceField(
        choices=InvestigationPriority.choices, default=InvestigationPriority.MEDIUM
    )
    hypothesis = serializers.CharField(required=False, allow_blank=True, default='')


class InvestigationAxisWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestigationAxis
        fields = ['axis_type', 'title', 'description', 'findings', 'order']

    def create(self, validated_data):
        investigation = validated_data.pop('investigation')
        validated_data['investigation'] = investigation
        return InvestigationAxis.objects.create(**validated_data)


class InvestigationCompleteAxisSerializer(serializers.Serializer):
    axis_id = serializers.UUIDField()
    findings = serializers.CharField(required=False, allow_blank=True, default='')


class InvestigationCloseSerializer(serializers.Serializer):
    conclusions = serializers.CharField(source='findings', required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')