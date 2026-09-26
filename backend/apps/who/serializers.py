from rest_framework import serializers

from apps.laboratory.models import Disease

from .models import DiseaseMaster, WHOSyncLog, WHOICDMapping, WHOIntegration


class WHOIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WHOIntegration
        fields = [
            'id', 'name', 'environment', 'base_url', 'client_id',
            'authentication_type', 'is_active', 'last_sync_at',
            'last_success_at', 'last_error', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'client_secret_encrypted', 'last_sync_at',
            'last_success_at', 'last_error', 'created_at', 'updated_at',
        ]

    def create(self, validated_data):
        secret = self.initial_data.get('client_secret', '')
        instance = super().create(validated_data)
        if secret:
            instance.set_client_secret(secret)
            instance.save(update_fields=['client_secret_encrypted'])
        return instance

    def update(self, instance, validated_data):
        secret = self.initial_data.get('client_secret', '')
        instance = super().update(instance, validated_data)
        if secret:
            instance.set_client_secret(secret)
            instance.save(update_fields=['client_secret_encrypted'])
        return instance


class WHOSyncLogSerializer(serializers.ModelSerializer):
    integration_name = serializers.CharField(source='integration.name', read_only=True, default='')

    class Meta:
        model = WHOSyncLog
        fields = [
            'id', 'integration', 'integration_name', 'operation', 'direction',
            'resource_type', 'local_ref', 'remote_ref', 'request_id',
            'status', 'http_status', 'request_payload', 'response_payload',
            'error_message', 'started_at', 'completed_at',
        ]
        read_only_fields = fields


class DiseaseMasterSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True)
    disease_code = serializers.CharField(source='disease.icd_11_code', read_only=True)
    is_notifiable = serializers.BooleanField(read_only=True)

    class Meta:
        model = DiseaseMaster
        fields = [
            'id', 'disease', 'disease_name', 'disease_code', 'icd11_uri',
            'who_disease_code', 'is_notifiable', 'reporting_timeline',
            'mapped_at', 'last_synced_at', 'last_sync_status',
        ]
        read_only_fields = [
            'id', 'disease_name', 'disease_code', 'icd11_uri', 'mapped_at',
            'last_synced_at', 'last_sync_status',
        ]


class DiseaseSyncSerializer(serializers.Serializer):
    """حمولة طلب مزامنة خرائط الأمراض."""

    diseases = serializers.PrimaryKeyRelatedField(queryset=Disease.objects.all(), many=True)


class WHOICDMappingSerializer(serializers.ModelSerializer):
    disease_name_ar = serializers.CharField(source='disease.name_ar', read_only=True)
    disease_name_en = serializers.CharField(source='disease.name_en', read_only=True)

    class Meta:
        model = WHOICDMapping
        fields = [
            'id', 'disease', 'disease_name_ar', 'disease_name_en', 'who_release',
            'foundation_uri', 'mms_uri', 'icd_11_code', 'title_en', 'title_ar',
            'mapping_status', 'confidence', 'match_type', 'source_query',
            'is_current', 'reviewed_at', 'reviewed_by', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'disease_name_ar', 'disease_name_en', 'reviewed_at',
            'reviewed_by', 'created_at', 'updated_at',
        ]