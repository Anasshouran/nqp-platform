from rest_framework import serializers

from .models import DeveloperApp, ExternalEntity, IntegrationLog, WebhookEndpoint


class ExternalEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalEntity
        fields = ['id', 'name', 'api_key', 'is_active']
        read_only_fields = ['id']


class DeveloperAppSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperApp
        fields = ['id', 'name', 'description', 'api_key', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'api_key', 'created_at', 'updated_at']


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ['id', 'app', 'event_type', 'endpoint_url', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationLog
        fields = [
            'id', 'integration_name', 'request_type', 'request_payload',
            'response_payload', 'status_code', 'request_timestamp',
        ]
        read_only_fields = ['id', 'request_timestamp']


class ImmigrationVerifySerializer(serializers.Serializer):
    passport_number = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False)
