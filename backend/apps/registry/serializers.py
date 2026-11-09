"""Serializers — M2.

Report serializers للعرض، Write serializers للكتابة، مجمّعة في ملف واحد.
"""

from rest_framework import serializers

from apps.registry.models import (
    HealthFacilityNodeAssignment,
    LocalityNodeAssignment,
    RegistryChangeLog,
    ReportingNode,
    StateMinistry,
    StateNodeAssignment,
)


# ---------------------------------------------------------------------------
# ReportingNode
# ---------------------------------------------------------------------------

class ReportingNodeSerializer(serializers.ModelSerializer):
    """Serializer قراءة — يعرض parent_name وقيمة قابلة للتصفية."""

    parent_name = serializers.CharField(
        source='parent.name_ar', read_only=True, default=None
    )
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = ReportingNode
        fields = [
            'id', 'kind', 'code', 'name_ar', 'name_en', 'description',
            'parent', 'parent_name', 'path', 'depth', 'is_active', 'order',
            'children_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'path', 'depth', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()


class ReportingNodeWriteSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=ReportingNode.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = ReportingNode
        fields = [
            'id', 'kind', 'code', 'name_ar', 'name_en', 'description',
            'parent', 'is_active', 'order', 'path', 'depth',
        ]
        read_only_fields = ['id', 'path', 'depth']

    def validate(self, attrs):
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        parent = attrs.get('parent', getattr(self.instance, 'parent', None))

        # الجذر يجب أن يكون FEDERAL
        if parent is None and kind != ReportingNode.Kind.FEDERAL:
            raise serializers.ValidationError(
                {'kind': 'الجذر يجب أن يكون kind=FEDERAL'}
            )

        # منع إنشاء جذر ثانٍ (at serializer level — يحوّل IntegrityError إلى 400)
        if parent is None and self.instance is None:
            # instance is None → create (not update)
            if ReportingNode.objects.filter(parent__isnull=True).exists():
                raise serializers.ValidationError(
                    {'detail': 'جذر واحد فقط مسموح — يوجد جذر مسبقاً'}
                )

        return attrs


# ---------------------------------------------------------------------------
# Assignment serializers (3 أنواع)
# ---------------------------------------------------------------------------

class StateNodeAssignmentSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source='state.code', read_only=True)
    state_name = serializers.CharField(source='state.name_ar', read_only=True, default=None)
    node_code = serializers.CharField(source='node.code', read_only=True)

    class Meta:
        model = StateNodeAssignment
        fields = [
            'id', 'state', 'state_code', 'state_name', 'node', 'node_code',
            'valid_from', 'valid_to', 'is_primary', 'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StateNodeAssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateNodeAssignment
        fields = [
            'id', 'state', 'node', 'valid_from', 'valid_to',
            'is_primary', 'note',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        """تحقق من قيود clean() النموذج (valid range + primary واحد)."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        instance = StateNodeAssignment(**attrs)
        instance.pk = getattr(self.instance, 'pk', None)
        try:
            instance.clean()
        except DjangoValidationError as e:
            # Django ValidationError → DRF ValidationError
            raise serializers.ValidationError(e.messages)
        return attrs


class LocalityNodeAssignmentSerializer(serializers.ModelSerializer):
    locality_code = serializers.CharField(source='locality.code', read_only=True)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    node_code = serializers.CharField(source='node.code', read_only=True)

    class Meta:
        model = LocalityNodeAssignment
        fields = [
            'id', 'locality', 'locality_code', 'locality_name', 'node', 'node_code',
            'valid_from', 'valid_to', 'is_primary', 'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LocalityNodeAssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalityNodeAssignment
        fields = [
            'id', 'locality', 'node', 'valid_from', 'valid_to',
            'is_primary', 'note',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        from django.core.exceptions import ValidationError as DjangoValidationError

        instance = LocalityNodeAssignment(**attrs)
        instance.pk = getattr(self.instance, 'pk', None)
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return attrs


class HealthFacilityNodeAssignmentSerializer(serializers.ModelSerializer):
    facility_code = serializers.CharField(source='facility.code', read_only=True)
    facility_name = serializers.CharField(source='facility.name_ar', read_only=True, default=None)
    node_code = serializers.CharField(source='node.code', read_only=True)

    class Meta:
        model = HealthFacilityNodeAssignment
        fields = [
            'id', 'facility', 'facility_code', 'facility_name', 'node', 'node_code',
            'valid_from', 'valid_to', 'is_primary', 'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HealthFacilityNodeAssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthFacilityNodeAssignment
        fields = [
            'id', 'facility', 'node', 'valid_from', 'valid_to',
            'is_primary', 'note',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        from django.core.exceptions import ValidationError as DjangoValidationError

        instance = HealthFacilityNodeAssignment(**attrs)
        instance.pk = getattr(self.instance, 'pk', None)
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return attrs


# ---------------------------------------------------------------------------
# StateMinistry
# ---------------------------------------------------------------------------

class StateMinistrySerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source='state.code', read_only=True)
    state_name = serializers.CharField(source='state.name_ar', read_only=True, default=None)

    class Meta:
        model = StateMinistry
        fields = [
            'id', 'state', 'state_code', 'state_name',
            'ministry_name_ar', 'ministry_name_en', 'address', 'phone',
            'email', 'website', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StateMinistryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateMinistry
        fields = [
            'id', 'state', 'ministry_name_ar', 'ministry_name_en',
            'address', 'phone', 'email', 'website', 'is_active',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# RegistryChangeLog (read-only)
# ---------------------------------------------------------------------------

class RegistryChangeLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = RegistryChangeLog
        fields = [
            'id', 'user', 'user_name', 'action', 'entity_type',
            'entity_id', 'entity_label', 'detail', 'ip_address', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        if obj.user_id is None:
            return None
        return getattr(obj.user, 'full_name', None) or obj.user.email
