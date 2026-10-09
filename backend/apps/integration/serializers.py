from rest_framework import serializers

from .models import (
    ApiEndpoint,
    AuditLog,
    DataScope,
    DeveloperApp,
    EncryptedCredentialValue,
    Integration,
    IntegrationHealth,
    IntegrationLog,
    Organization,
    WebhookDelivery,
    WebhookEndpoint,
    WebhookSubscription,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'id', 'code', 'name_en', 'name_ar', 'org_type', 'country', 'status',
            'technical_contact_name', 'technical_contact_email',
            'technical_contact_phone', 'last_sync_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    """سجل مراقبة للقراءة فقط.

    حقول المراقبة (`direction`, `status`, `error_message`, `duration_ms`,
    `correlation_id`, `completed_at`) للعرض فقط: يكتبها طبقة التبادل نفسها،
    ولا تُقبل من العميل.
    """

    is_successful = serializers.BooleanField(read_only=True)

    class Meta:
        model = IntegrationLog
        fields = [
            'id', 'integration_name', 'request_type', 'direction', 'status',
            'is_successful', 'status_code', 'error_message', 'duration_ms',
            'correlation_id', 'request_payload', 'response_payload',
            'request_timestamp', 'completed_at',
        ]
        read_only_fields = fields


class ImmigrationVerifySerializer(serializers.Serializer):
    passport_number = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False)


class ApiEndpointSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name_en', read_only=True)
    
    class Meta:
        model = ApiEndpoint
        fields = [
            'id', 'code', 'organization', 'organization_name', 'name_en', 'name_ar',
            'description', 'protocol', 'scope', 'base_url', 'version',
            'auth_type', 'doc_url', 'is_active', 'verified_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class IntegrationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name_en', read_only=True)
    endpoint_code = serializers.CharField(source='endpoint.code', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name_en', read_only=True)
    
    class Meta:
        model = Integration
        fields = [
            'id', 'organization', 'organization_name', 'endpoint', 'endpoint_code',
            'endpoint_name', 'environment', 'status', 'auth_type', 'base_url',
            'notes', 'verified_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class IntegrationHealthSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.organization.name_en', read_only=True)
    
    class Meta:
        model = IntegrationHealth
        fields = [
            'id', 'integration', 'integration_name', 'check_type', 'passed',
            'detail', 'checked_by', 'checked_at',
        ]
        read_only_fields = fields


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name_en', read_only=True)
    integration_name = serializers.CharField(source='integration.organization.name_en', read_only=True)
    secret = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = WebhookSubscription
        fields = [
            'id', 'organization', 'organization_name', 'integration', 'integration_name',
            'event_type', 'endpoint_url', 'secret', 'is_active',
            'last_delivery_at', 'failure_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WebhookDeliverySerializer(serializers.ModelSerializer):
    subscription_id = serializers.UUIDField(source='subscription.id', read_only=True)
    event_type = serializers.CharField(source='subscription.event_type', read_only=True)
    
    class Meta:
        model = WebhookDelivery
        fields = [
            'id', 'subscription', 'subscription_id', 'event_type',
            'status', 'http_status', 'request_payload', 'response_payload',
            'error_message', 'duration_ms', 'fired_at', 'completed_at',
        ]
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'resource_type', 'resource_id',
            'detail', 'ip_address', 'result', 'created_at',
        ]
        read_only_fields = fields


class DataScopeSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name_en', read_only=True)
    endpoint_code = serializers.CharField(source='endpoint.code', read_only=True)
    endpoint_name = serializers.CharField(source='endpoint.name_en', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.full_name', read_only=True)
    
    class Meta:
        model = DataScope
        fields = [
            'id', 'organization', 'organization_name', 'endpoint', 'endpoint_code',
            'endpoint_name', 'direction', 'resource', 'granted_by', 'granted_by_name',
            'granted_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EncryptedCredentialValueSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.organization.name_en', read_only=True)
    value = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = EncryptedCredentialValue
        fields = [
            'id', 'integration', 'integration_name', 'key_type', 'key_name',
            'value',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        value = validated_data.pop('value')
        instance = super().create(validated_data)
        instance.set_value(value)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        value = validated_data.pop('value', None)
        instance = super().update(instance, validated_data)
        if value is not None:
            instance.set_value(value)
            instance.save()
        return instance
