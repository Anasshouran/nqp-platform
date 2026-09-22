from rest_framework import serializers

from apps.carriers.models import HealthNotice
from apps.laboratory.models import Disease
from apps.masterdata.models import EntryPoint as Port
from apps.organization.models import Sector
from apps.travelers.models import Country

from .models import ContactMessage, Service, ServiceCategory


class ServiceSerializer(serializers.ModelSerializer):
    category_code = serializers.CharField(source='category.code', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'code', 'category', 'category_code',
            'name_ar', 'name_en', 'description_ar', 'icon',
            'route', 'external_url', 'audience', 'requires_auth',
            'identity_provider', 'target_system', 'status',
            'sort_order', 'is_active',
        ]


class ServiceCategorySerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    sector_codes = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'description_ar',
            'icon', 'sort_order', 'is_active', 'services', 'sector_codes',
        ]

    def get_sector_codes(self, obj):
        return [s.code for s in obj.sectors.order_by('code')]


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class SectorSerializer(serializers.ModelSerializer):
    """قطاعات organization.Sector بمفاتيح متوافقة مع عقد /public/sectors/ القديم."""

    description_ar = serializers.CharField(source='description', read_only=True)
    description_en = serializers.SerializerMethodField()
    ports_count = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()

    class Meta:
        model = Sector
        fields = [
            'id', 'code', 'slug', 'name_ar', 'name_en', 'description_ar', 'description_en',
            'region', 'color', 'ports_count', 'phone', 'email', 'address',
            'latitude', 'longitude', 'logo', 'website', 'working_hours', 'is_active',
        ]

    def get_description_en(self, obj):
        return ''

    def get_ports_count(self, obj):
        from core.utils.ports import sector_entry_points
        return sector_entry_points(obj).count()

    def get_slug(self, obj):
        return obj.code.lower().replace('_', '-')


class PublicPortSerializer(serializers.ModelSerializer):
    """منافذ الدخول الموحدة (masterdata.EntryPoint) بمفاتيح متوافقة مع الواجهة القديمة."""
    type = serializers.CharField(source='kind', read_only=True)
    country_code = serializers.CharField(source='state.code', read_only=True)
    country_name = serializers.CharField(source='state.name_ar', read_only=True)
    location_geo = serializers.SerializerMethodField()

    class Meta:
        model = Port
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'type', 'country_code',
            'country_name', 'location_geo', 'address', 'phone', 'email', 'is_active',
        ]

    def get_location_geo(self, obj):
        geo = obj.location_geo
        if isinstance(geo, dict) and geo.get('coordinates'):
            return geo
        return {}


class PublicDiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = [
            'id', 'icd_11_code', 'name_ar', 'name_en', 'description', 'symptoms',
            'incubation_period_min', 'incubation_period_max', 'transmission_methods',
            'ihr_category',
        ]


class PublicNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthNotice
        fields = [
            'id', 'title', 'description', 'category', 'priority',
            'published_at', 'expiry_date',
        ]


class PublicCountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['code', 'name', 'name_ar', 'risk_level']


class PublicTravelRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthNotice
        fields = ['title', 'description', 'priority']


class PublicFlightSerializer(serializers.Serializer):
    flight_number = serializers.CharField()
    carrier_code = serializers.CharField()
    carrier_name = serializers.CharField()
    flight_type = serializers.CharField()
    origin_code = serializers.CharField()
    destination_code = serializers.CharField()
    destination_name = serializers.CharField()
    scheduled_departure = serializers.DateTimeField(required=False, allow_null=True)
    scheduled_arrival = serializers.DateTimeField(required=False, allow_null=True)
    status = serializers.CharField()
    status_label = serializers.CharField()


class FoodShipmentTrackSerializer(serializers.Serializer):
    manifest_number = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    decision = serializers.CharField(required=False, allow_blank=True)
    port_code = serializers.CharField()
    port_name = serializers.CharField()
    arrival_date = serializers.DateField(required=False, allow_null=True)
    supplier_name = serializers.CharField()
    origin_country = serializers.CharField()
    vessel_name = serializers.CharField(required=False, allow_blank=True)
    total_weight_kg = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    products = serializers.ListField(child=serializers.DictField())
    release_certificate = serializers.CharField(required=False, allow_blank=True)
    decided_at = serializers.DateTimeField(required=False, allow_null=True)


class LabResultLookupSerializer(serializers.Serializer):
    reference = serializers.CharField(required=True, max_length=50, trim_whitespace=True)
    code = serializers.CharField(required=True, max_length=12, trim_whitespace=True)


class TravelerLookupSerializer(serializers.Serializer):
    found = serializers.BooleanField()
    traveler_id = serializers.UUIDField(required=False)
    passport_number = serializers.CharField(required=False)
    full_name = serializers.CharField(required=False)
    nationality = serializers.CharField(required=False)
    registration_status = serializers.CharField(required=False)
    qr_issued = serializers.BooleanField(required=False)
    rejection_reason = serializers.CharField(required=False, allow_null=True)
    error = serializers.CharField(required=False)


class QrVerificationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    reason = serializers.CharField(required=False)
    traveler = serializers.DictField(required=False)


class WebPushSubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=512)
    keys = serializers.DictField()


class DemoQrSerializer(serializers.Serializer):
    traveler_id = serializers.UUIDField()
    passport_hash = serializers.CharField()
    issued_at = serializers.CharField()
    expires_at = serializers.CharField()
    signature = serializers.CharField()


class CertificateVerificationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    reason = serializers.CharField(required=False)
    certificate = serializers.DictField(required=False)


class AssistantContextSerializer(serializers.Serializer):
    country = serializers.CharField(required=False, allow_blank=True)


class AssistantChatSerializer(serializers.Serializer):
    message = serializers.CharField(required=True, allow_blank=False, max_length=2000)
    language = serializers.CharField(required=False, allow_blank=True, default='ar')
    context = AssistantContextSerializer(required=False)


class AssistantSourceSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(required=False, allow_blank=True)
    source_url = serializers.CharField(required=False, allow_blank=True)
    source_updated_at = serializers.DateField(required=False, allow_null=True)


class AssistantActionSerializer(serializers.Serializer):
    label = serializers.CharField(required=False, allow_blank=True)
    route = serializers.CharField(required=False, allow_blank=True)
    requires_auth = serializers.BooleanField(required=False)
    identity_provider = serializers.CharField(required=False, allow_blank=True)


class AssistantAnswerSerializer(serializers.Serializer):
    answer = serializers.CharField()
    answer_type = serializers.CharField()
    action = AssistantActionSerializer(required=False, allow_null=True)
    sources = AssistantSourceSerializer(many=True, required=False)
    confidence = serializers.CharField()
    language = serializers.CharField(required=False, allow_blank=True)
