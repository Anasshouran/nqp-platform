from rest_framework import serializers

from .models import RiskAssessment, RiskSettings


class RiskAssessmentSerializer(serializers.ModelSerializer):
    passport_number = serializers.CharField(source='screening.traveler.passport_number', read_only=True)
    traveler_name = serializers.CharField(source='screening.traveler.full_name', read_only=True)
    port_name = serializers.CharField(source='screening.port.name_ar', read_only=True)

    class Meta:
        model = RiskAssessment
        fields = [
            'id', 'screening', 'passport_number', 'traveler_name', 'port_name',
            'risk_level', 'risk_score', 'decision_factors',
            'recommendation', 'assessed_at',
        ]
        read_only_fields = ['id', 'assessed_at']


class RiskSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskSettings
        fields = [
            'temp_weight', 'spo2_weight', 'symptom_weight', 'origin_weight',
            'vaccine_weight', 'yellow_threshold', 'red_threshold',
            'red_temp_threshold', 'red_spo2_threshold',
        ]
