from decimal import Decimal

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


class WHOICDMappingReviewSerializer(serializers.ModelSerializer):
    """سيريالايزر مراجعة خرائط ICD-11.

    - الحالة ``mapping_status``/``is_current``/``reviewed_by``/``reviewed_at``
      للقراءة فقط — لا يمكن للعميل حسم اقتراح بنفسه.
    - الإنشاء يجبر دائماً على ``PROPOSED + is_current=False`` (اقتراح فقط،
      لا موافقة تلقائية).
    - ``confidence`` مقيد بين 0 و 1 (خمسة أرقام، أربعة كسرية).
    """

    disease_name_ar = serializers.CharField(source='disease.name_ar', read_only=True)
    disease_name_en = serializers.CharField(source='disease.name_en', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    match_type = serializers.ChoiceField(
        choices=WHOICDMapping.MatchType.choices, required=False, allow_blank=True
    )
    confidence = serializers.DecimalField(
        max_digits=5, decimal_places=4, required=False, allow_null=True,
        min_value=Decimal('0'), max_value=Decimal('1'),
    )

    class Meta:
        model = WHOICDMapping
        fields = [
            'id', 'disease', 'disease_name_ar', 'disease_name_en', 'who_release',
            'foundation_uri', 'mms_uri', 'icd_11_code', 'title_en', 'title_ar',
            'mapping_status', 'confidence', 'match_type', 'source_query',
            'is_current', 'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'mapping_status', 'is_current', 'reviewed_at', 'reviewed_by',
            'reviewed_by_name', 'created_at', 'updated_at',
        ]
        validators = []

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.full_name if obj.reviewed_by else ''

    def create(self, validated_data):
        from .services.mapping_service import create_mapping_proposal

        return create_mapping_proposal(
            disease=validated_data['disease'],
            who_release=validated_data.get('who_release', ''),
            foundation_uri=validated_data.get('foundation_uri', ''),
            mms_uri=validated_data.get('mms_uri', ''),
            icd_11_code=validated_data.get('icd_11_code', ''),
            title_en=validated_data.get('title_en', ''),
            title_ar=validated_data.get('title_ar', ''),
            match_type=validated_data.get('match_type', ''),
            confidence=validated_data.get('confidence'),
            source_query=validated_data.get('source_query', ''),
            notes=validated_data.get('notes', ''),
            mapping_status=WHOICDMapping.MappingStatus.PROPOSED,
            is_current=False,
        )

    def update(self, instance, validated_data):
        from .services.mapping_service import MappingTransitionError, update_mapping_proposal

        try:
            return update_mapping_proposal(instance, **validated_data)
        except MappingTransitionError as exc:
            raise serializers.ValidationError({'mapping_status': str(exc)}) from exc