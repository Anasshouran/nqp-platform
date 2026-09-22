from rest_framework import serializers

from apps.surveillance.models.alert import (
    SurveillanceAlert,
    AlertRule,
    AlertEvaluation,
    AlertStatus,
    AlertEvaluationStatus,
)


class AlertEvaluationSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.CharField(source='evaluator.full_name', read_only=True, default=None)

    class Meta:
        model = AlertEvaluation
        fields = ['id', 'alert', 'evaluator', 'evaluator_name', 'previous_status',
                  'new_status', 'decision', 'risk_level', 'justification',
                  'recommended_actions', 'created_at']
        read_only_fields = fields


class AlertRuleSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)

    class Meta:
        model = AlertRule
        fields = ['id', 'name', 'description', 'rule_type', 'disease',
                  'disease_name', 'is_global', 'threshold_value', 'window_days',
                  'baseline_weeks', 'min_cases_for_alert', 'spatial_radius_km',
                  'temporal_window_days', 'alert_level', 'notify_roles',
                  'is_active', 'is_system', 'last_triggered', 'trigger_count']
        read_only_fields = ['id', 'last_triggered', 'trigger_count']


class SurveillanceAlertSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    disease_icd = serializers.CharField(source='disease.icd_11_code', read_only=True, default=None)
    port_name = serializers.CharField(source='port.name_ar', read_only=True, default=None)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    case_numbers_display = serializers.ListField(source='case_numbers', read_only=True)
    evaluations = AlertEvaluationSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = SurveillanceAlert
        fields = ['id', 'alert_number', 'alert_type', 'level', 'level_display',
                  'evaluation_status', 'status', 'status_display', 'title',
                  'description', 'disease', 'disease_name', 'disease_icd',
                  'sector', 'sector_name', 'locality', 'locality_name',
                  'port', 'port_name', 'port_code', 'health_facility',
                  'cases', 'case_count', 'case_numbers_display',
                  'event', 'outbreak', 'trigger', 'trigger_rule',
                  'evaluated_by', 'evaluated_at', 'evaluation_notes',
                  'risk_assessment', 'assigned_to', 'response_actions',
                  'resolved_by', 'resolved_at', 'closure_reason',
                  'notified_roles', 'notification_sent', 'evaluations',
                  'generated_at', 'acknowledged_at', 'responded_at',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'alert_number', 'notification_sent', 'generated_at',
                            'created_at', 'updated_at']


class SurveillanceAlertWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillanceAlert
        fields = ['title', 'description', 'alert_type', 'level', 'disease',
                  'sector', 'locality', 'port', 'health_facility', 'assigned_to']
        extra_kwargs = {
            'disease': {'required': False, 'allow_null': True},
            'sector': {'required': False, 'allow_null': True},
            'locality': {'required': False, 'allow_null': True},
            'port': {'required': False, 'allow_null': True},
        }


class AlertAcknowledgeSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')


class AlertEvaluateSerializer(serializers.Serializer):
    DECISION_CHOICES = [
        ('ACCEPT', 'قبول'),
        ('REJECT', 'رفض'),
        ('REQUEST_INFO', 'طلب معلومات'),
        ('ESCALATE', 'تصعيد'),
    ]
    decision = serializers.ChoiceField(choices=DECISION_CHOICES)
    risk_level = serializers.ChoiceField(
        choices=[('LOW', 'منخفض'), ('MODERATE', 'متوسط'),
                 ('HIGH', 'عالي'), ('CRITICAL', 'حرج')],
        default='MODERATE'
    )
    justification = serializers.CharField()
    recommended_actions = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class AlertCloseSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class AlertEscalateOutbreakSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True, default='')
    onset_date = serializers.DateField(required=False, allow_null=True, default=None)
    severity = serializers.CharField(default='LEVEL_2')
    source_of_infection = serializers.CharField(required=False, allow_blank=True, default='')
    transmission_route = serializers.CharField(required=False, allow_blank=True, default='')