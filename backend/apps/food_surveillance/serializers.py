from rest_framework import serializers

from .models import CorrectiveAction, FoodAlert, FoodEstablishment, FoodRecall, NonConformity, RiskAssessment


class SurveillanceDashboardSerializer(serializers.Serializer):
    window = serializers.DictField()
    kpis = serializers.DictField()
    risk = serializers.DictField()
    trend = serializers.ListField(child=serializers.DictField())
    lab_top = serializers.ListField(child=serializers.DictField())
    nc_distribution = serializers.DictField()
    alerts = serializers.ListField(child=serializers.DictField())
    non_conformities = serializers.ListField(child=serializers.DictField())
    recalls = serializers.ListField(child=serializers.DictField())
    response_level = serializers.CharField()


class FoodAlertSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True, default='')

    class Meta:
        model = FoodAlert
        fields = [
            'id', 'alert_number', 'title', 'reason', 'risk_level', 'product', 'origin_country',
            'supplier', 'description', 'recommended_action', 'status', 'raised_by', 'raised_by_name',
            'raised_at', 'closed_at', 'created_at',
        ]
        read_only_fields = ['id', 'alert_number', 'raised_by', 'raised_at', 'created_at']


class FoodEstablishmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodEstablishment
        fields = [
            'id', 'name_ar', 'name_en', 'establishment_type', 'region', 'port',
            'risk_level', 'last_inspection_at', 'violations_count', 'active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class RiskAssessmentSerializer(serializers.ModelSerializer):
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True, default='')

    class Meta:
        model = RiskAssessment
        fields = [
            'id', 'assessment_type', 'target_name', 'score', 'risk_level', 'justification',
            'recommendation', 'assessed_by', 'assessed_by_name', 'assessed_at', 'created_at',
        ]
        read_only_fields = ['id', 'assessed_by', 'created_at']


class NonConformitySerializer(serializers.ModelSerializer):
    shipment_number = serializers.CharField(source='shipment.manifest_number', read_only=True, default='')
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True, default='')
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default='')

    class Meta:
        model = NonConformity
        fields = [
            'id', 'nc_number', 'shipment', 'shipment_number', 'sample', 'sample_number', 'source',
            'product', 'origin_country', 'supplier', 'status', 'risk_level', 'description',
            'required_action', 'reported_by', 'reported_by_name', 'reported_at', 'closed_at', 'created_at',
        ]
        read_only_fields = ['id', 'nc_number', 'reported_by', 'reported_at', 'created_at']


class CorrectiveActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectiveAction
        fields = [
            'id', 'non_conformity', 'action', 'responsible', 'due_date', 'status',
            'completed_at', 'by_user', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FoodRecallSerializer(serializers.ModelSerializer):
    decided_by_name = serializers.CharField(source='decided_by.full_name', read_only=True, default='')

    class Meta:
        model = FoodRecall
        fields = [
            'id', 'recall_number', 'product', 'origin_country', 'recall_type', 'reasons',
            'status', 'risk_level', 'decided_by', 'decided_by_name', 'decided_at', 'closed_at', 'created_at',
        ]
        read_only_fields = ['id', 'recall_number', 'decided_by', 'decided_at', 'created_at']