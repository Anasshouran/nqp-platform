from rest_framework import serializers

from .models import Country, Traveler, TravelerDocument, TravelerStatusLog


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'code', 'name', 'name_ar']
        read_only_fields = ['id']


class TravelerSerializer(serializers.ModelSerializer):
    nationality = serializers.SlugRelatedField(
        slug_field='code', queryset=Country.objects.all()
    )
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Traveler
        fields = [
            'id', 'passport_number', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'nationality', 'phone', 'email', 'medical_history',
            'registration_status', 'rejection_reason', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'registration_status', 'rejection_reason', 'created_at', 'updated_at']


class TravelerDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = TravelerDocument
        fields = ['id', 'document_type', 'file', 'file_url', 'file_size', 'expiry_date', 'uploaded_at']
        read_only_fields = ['id', 'file_url', 'file_size', 'uploaded_at']

    def get_file_url(self, obj):
        try:
            return obj.file.url if obj.file else None
        except ValueError:
            return None

    def get_file_size(self, obj):
        try:
            return obj.file.size if obj.file else None
        except (ValueError, OSError):
            return None


class TravelerStatusSerializer(serializers.Serializer):
    registration_status = serializers.CharField()
    qr_code_issued = serializers.BooleanField()
    rejection_reason = serializers.CharField(allow_null=True)
    action_required = serializers.BooleanField(read_only=True)


class TravelerStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TravelerStatusLog
        fields = ['id', 'from_status', 'to_status', 'note', 'changed_by_name', 'created_at']
        read_only_fields = fields

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return None
        name = getattr(obj.changed_by, 'full_name', '') or obj.changed_by.get_full_name()
        return name or obj.changed_by.username
