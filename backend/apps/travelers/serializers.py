from rest_framework import serializers

from .models import Country, Traveler, TravelerDocument, TravelerStatusLog

# M2-D1 (متابعة M2-C2): مفاتيح يملكها الخادم ولا يجوز للعميل كتابتها داخل
# `medical_history` (بما فيها health_declaration) — تُرفض صراحةً كمدخل.
# لا نصّح بلا صمت؛ رسالة خطأ واضحة تسهّل تجربة الإصلاح دون كسر البيانات
# المشروعة (خيار A + C في M2-D1 §5).
SERVER_OWNED_MEDICAL_KEYS = frozenset({
    'risk_score',
    'risk_level',
    'risk_assessment',
    'risk_verdict',
    'screening_status',
    'screening_id',
    'screening_result',
    'decision',
    'approved',
    'rejected',
    'reviewed_by',
    'staff_assignment',
    'internal_notes',
    'officer_notes',
    'audit',
    'created_by',
    'updated_by',
    'verification_status',
    'case_number',
})


def _find_server_owned_keys(obj, path=''):
    found = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if str(key).lower() in SERVER_OWNED_MEDICAL_KEYS:
                found.append(f'{path}{key}')
            found += _find_server_owned_keys(value, f'{path}{key}.')
    elif isinstance(obj, list):
        for index, item in enumerate(obj):
            found += _find_server_owned_keys(item, f'{path}[{index}].')
    return found


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

    def validate_medical_history(self, value):
        """يرفض المفاتيح المملوكة للخادم داخل medical_history (مثل risk_*).

        يحافظ على السجل الطبي المشروع للمسافر (خيار C) بينما يحظر
        حقول القرار/التقييم الداخلية من إملاء العميل (خيار A).
        """
        if not isinstance(value, dict):
            return value
        protected = _find_server_owned_keys(value)
        if protected:
            raise serializers.ValidationError(
                'الحقول التالية مملوكة للخادم ولا يمكن للعميل تعديلها: '
                + ', '.join(sorted(set(protected)))
            )
        return value


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
