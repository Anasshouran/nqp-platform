from rest_framework import serializers

from .models import IHREvent, NationalFocalPoint, RiskAssessment, SPARAssessment, SPARIndicator


class IHREventSerializer(serializers.ModelSerializer):
    risk_assessment = serializers.SerializerMethodField()

    class Meta:
        model = IHREvent
        fields = [
            'id', 'event_number', 'emergency_event', 'event_type', 'title', 'description',
            'disease', 'sector', 'port', 'locality', 'date_detected', 'date_verified',
            'cases_suspected', 'cases_probable', 'cases_confirmed', 'deaths',
            'risk_level', 'status', 'reported_by', 'reviewed_by', 'nfp_approved_by',
            'submitted_to_who_at', 'who_reference', 'is_international_impact',
            'is_active', 'created_at', 'updated_at', 'risk_assessment',
        ]
        read_only_fields = [
            'id', 'event_number', 'reported_by', 'reviewed_by', 'nfp_approved_by',
            'submitted_to_who_at', 'who_reference', 'created_at', 'updated_at',
        ]

    def get_risk_assessment(self, obj):
        assessment = getattr(obj, 'risk_assessment', None)
        if not assessment:
            return None
        return RiskAssessmentSerializer(assessment).data


class RiskAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessment
        fields = [
            'id', 'event', 'hazard', 'geographic_spread', 'transmission',
            'international_travel', 'poe_impact', 'response_capacity',
            'overall_risk', 'notes', 'assessed_by', 'assessed_at',
        ]
        read_only_fields = ['id', 'event', 'assessed_by', 'assessed_at']


class NationalFocalPointSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = NationalFocalPoint
        fields = [
            'id', 'user', 'user_email', 'user_name', 'nfp_type', 'phone', 'email',
            'institution', 'is_active', 'appointed_at',
        ]
        read_only_fields = ['id', 'user_email', 'user_name']


class SPARIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = SPARIndicator
        fields = ['id', 'code', 'name_ar', 'name_en', 'description', 'max_score', 'order', 'is_active']


class SPARAssessmentSerializer(serializers.ModelSerializer):
    indicator_code = serializers.CharField(source='indicator.code', read_only=True)
    indicator_name_ar = serializers.CharField(source='indicator.name_ar', read_only=True)

    class Meta:
        model = SPARAssessment
        fields = [
            'id', 'year', 'indicator', 'indicator_code', 'indicator_name_ar',
            'score', 'evidence', 'gaps', 'action_plan', 'comments',
            'assessed_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'assessed_by', 'created_at', 'updated_at']