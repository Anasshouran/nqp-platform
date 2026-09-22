from rest_framework import serializers

from apps.surveillance.models.vector_integration import (
    VectorSurveillanceLink,
    VectorAlertRule,
)


class VectorSurveillanceLinkSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='health_case.case_number', read_only=True, default=None)
    outbreak_number = serializers.CharField(source='outbreak.outbreak_number', read_only=True, default=None)
    event_number = serializers.CharField(source='health_event.event_number', read_only=True, default=None)
    focus_number = serializers.CharField(source='vector_focus.focus_number', read_only=True, default=None)
    focus_name = serializers.CharField(source='vector_focus.name', read_only=True, default=None)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    strength_display = serializers.CharField(source='get_association_strength_display', read_only=True)

    class Meta:
        model = VectorSurveillanceLink
        fields = ['id', 'health_case', 'case_number', 'outbreak', 'outbreak_number',
                  'health_event', 'event_number', 'vector_focus', 'focus_number',
                  'focus_name', 'vector_survey', 'vector_sample', 'vector_lab_result',
                  'link_type', 'distance_km', 'temporal_gap_days', 'spatial_overlap',
                  'vector_species_match', 'pathogen_detected_in_vector',
                  'association_strength', 'strength_display', 'status', 'status_display',
                  'epidemiological_notes', 'entomological_notes', 'lab_notes',
                  'created_by', 'created_by_name', 'reviewed_by', 'reviewed_by_name',
                  'reviewed_at', 'recommended_actions', 'actions_taken', 'created_at']
        read_only_fields = ['id', 'created_at', 'reviewed_at']


class VectorSurveillanceLinkWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VectorSurveillanceLink
        fields = ['health_case', 'outbreak', 'health_event', 'vector_focus',
                  'vector_survey', 'vector_sample', 'vector_lab_result', 'link_type',
                  'distance_km', 'temporal_gap_days', 'spatial_overlap',
                  'vector_species_match', 'pathogen_detected_in_vector',
                  'association_strength', 'epidemiological_notes',
                  'entomological_notes', 'lab_notes', 'recommended_actions']
        extra_kwargs = {
            'health_case': {'required': False, 'allow_null': True},
            'outbreak': {'required': False, 'allow_null': True},
            'health_event': {'required': False, 'allow_null': True},
        }


class VectorAlertRuleSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    vector_type_name = serializers.CharField(source='vector_type.name', read_only=True, default=None)

    class Meta:
        model = VectorAlertRule
        fields = ['id', 'name', 'description', 'disease', 'disease_name', 'syndrome',
                  'case_threshold', 'case_window_days', 'vector_type', 'vector_type_name',
                  'vector_index_threshold', 'focus_severity', 'focus_window_days',
                  'spatial_radius_km', 'alert_type', 'alert_level', 'notify_roles',
                  'is_active', 'last_evaluated', 'trigger_count']
        read_only_fields = ['id', 'last_evaluated', 'trigger_count']