import csv
import io

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country

from .models import (
    Carrier,
    CarrierApiUsageLog,
    CarrierDocument,
    CarrierMember,
    CarrierRegistrationRequest,
    Flight,
    FlightHealthEvent,
    FlightHealthEventLog,
    HealthDeclaration,
    HealthNotice,
    ManifestPassenger,
    NoticeAcknowledgement,
    PassengerManifest,
)


class CarrierDashboardSerializer(serializers.Serializer):
    upcoming_today = serializers.IntegerField()
    expected_passengers = serializers.IntegerField()
    manifest_status = serializers.DictField()
    notices = serializers.DictField()
    pre_registration_rate = serializers.FloatField()
    api = serializers.DictField()


class CarrierUpcomingSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    flight_number = serializers.CharField()
    route = serializers.CharField()
    scheduled_arrival = serializers.DateTimeField()
    passengers = serializers.IntegerField()
    status = serializers.CharField()
    manifest_status = serializers.CharField(allow_null=True, required=False)


class CarrierKpiSerializer(serializers.Serializer):
    month_flights = serializers.IntegerField()
    month_passengers = serializers.IntegerField()
    pre_registration_rate = serializers.FloatField()
    late_flights = serializers.IntegerField()
    compliance = serializers.DictField()


class CarrierComplianceSerializer(serializers.Serializer):
    total_notices = serializers.IntegerField()
    acknowledged = serializers.IntegerField()
    acknowledged_ids = serializers.ListField(child=serializers.UUIDField())
    rate = serializers.FloatField()


class CarrierSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source='country.name_ar', read_only=True, default=None)
    company_type_label = serializers.CharField(source='get_company_type_display', read_only=True)
    registration_status_label = serializers.CharField(source='get_registration_status_display', read_only=True)
    ports_names = serializers.SerializerMethodField()
    country = serializers.SlugRelatedField(
        slug_field='code', queryset=Country.objects.all(), allow_null=True, required=False
    )
    ports = serializers.SlugRelatedField(
        slug_field='code', queryset=Port.objects.all(), many=True, required=False
    )

    class Meta:
        model = Carrier
        fields = [
            'id', 'name', 'name_en', 'company_type', 'company_type_label', 'country', 'country_name',
            'iata_code', 'icao_code', 'contact_info', 'email', 'phone', 'address', 'logo_url',
            'ports', 'ports_names', 'registration_status', 'registration_status_label', 'is_active',
        ]
        read_only_fields = ['id']

    def get_ports_names(self, obj):
        return list(obj.ports.order_by('name_ar').values_list('name_ar', flat=True))


class CarrierProfileSerializer(serializers.ModelSerializer):
    """ملف الشركة كما يراه ممثل الشركة (الحقول القابلة للتحديث فقط)."""

    class Meta:
        model = Carrier
        fields = ['id', 'name', 'iata_code', 'icao_code', 'email', 'phone', 'address', 'logo_url', 'is_active']
        read_only_fields = ['id', 'name', 'iata_code', 'icao_code', 'is_active']

    def validate(self, attrs):
        for field in ('iata_code', 'icao_code', 'name'):
            if field in attrs:
                raise serializers.ValidationError({field: 'الحقل غير قابل للتعديل من البوابة'})
        return attrs


class CarrierMemberSerializer(serializers.ModelSerializer):
    """قراءة فقط: لا أسرار، لا أدوار، لا tokens، لا معلومات أمن حساب."""

    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = CarrierMember
        fields = [
            'id', 'user', 'user_email', 'user_full_name',
            'is_primary', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


def _reject_unknown_fields(initial_data, allowed):
    unknown = set(initial_data) - set(allowed)
    if unknown:
        raise serializers.ValidationError(
            {key: 'هذا الحقل غير مسموح في هذا المسار' for key in sorted(unknown)}
        )


class CarrierMemberCreateSerializer(serializers.ModelSerializer):
    """إنشاء عضوية: `carrier` و`is_active` يضبطهما الخادم فقط، ولا تعديل لاحق."""

    class Meta:
        model = CarrierMember
        fields = ['id', 'user', 'is_primary']
        read_only_fields = ['id']

    _ALLOWED_INPUT = ('user', 'is_primary')

    def validate(self, attrs):
        _reject_unknown_fields(
            self.initial_data, set(self._ALLOWED_INPUT)
        )
        user = attrs.get('user')
        carrier = self.context['carrier']
        if user is None:
            raise serializers.ValidationError({'user': 'مطلوب'})
        if not user.is_active:
            raise serializers.ValidationError(
                {'user': 'الحساب معطّل — لا يمكن إضافته كعضو نشط'}
            )
        if CarrierMember.objects.filter(user=user, carrier=carrier).exists():
            raise serializers.ValidationError(
                {'user': 'المستخدم عضو في هذه الشركة بالفعل'}
            )
        if attrs.get('is_primary'):
            conflict = CarrierMember.objects.select_for_update().filter(
                carrier=carrier, is_primary=True
            )
            if conflict.exists():
                raise serializers.ValidationError(
                    {'is_primary': 'يوجد ممثل رئيسي آخر لهذه الشركة — عطِّل عضويته السابقة ثم أعد المحاولة'}
                )
        return attrs

    def create(self, validated_data):
        return CarrierMember.objects.create(
            carrier=self.context['carrier'],
            is_active=True,
            **validated_data,
        )


class CarrierMemberUpdateSerializer(serializers.ModelSerializer):
    """PATCH: `is_primary` فقط. الهوية `user`/`carrier` و`is_active` لا تتعدل."""

    class Meta:
        model = CarrierMember
        fields = ['is_primary']

    _ALLOWED_INPUT = ('is_primary',)

    def validate(self, attrs):
        _reject_unknown_fields(
            self.initial_data, set(self._ALLOWED_INPUT)
        )
        if attrs.get('is_primary') is True:
            conflict = CarrierMember.objects.select_for_update().filter(
                carrier=self.instance.carrier, is_primary=True,
            ).exclude(pk=self.instance.pk)
            if conflict.exists():
                raise serializers.ValidationError(
                    {'is_primary': 'يوجد ممثل رئيسي آخر لهذه الشركة — يُرفض تعيين عضوين رئيسيين'}
                )
        return attrs


class FlightSerializer(serializers.ModelSerializer):
    carrier = serializers.SlugRelatedField(slug_field='iata_code', queryset=Carrier.objects.all(), required=False)
    origin_country = serializers.SlugRelatedField(slug_field='code', queryset=Country.objects.all())
    destination_port = serializers.SlugRelatedField(slug_field='code', queryset=Port.objects.all())
    carrier_name = serializers.CharField(source='carrier.name', read_only=True)
    origin_country_name = serializers.CharField(source='origin_country.name_ar', read_only=True)
    destination_port_name = serializers.CharField(source='destination_port.name_ar', read_only=True)

    class Meta:
        model = Flight
        fields = [
            'id', 'flight_number', 'carrier', 'carrier_name', 'flight_type',
            'aircraft_type', 'crew_count', 'previous_origin_code',
            'origin_code', 'origin_country', 'origin_country_name',
            'destination_port', 'destination_port_name',
            'scheduled_departure', 'scheduled_arrival', 'status', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def validate(self, attrs):
        flight_number = attrs.get('flight_number', getattr(self.instance, 'flight_number', None))
        scheduled_arrival = attrs.get('scheduled_arrival', getattr(self.instance, 'scheduled_arrival', None))
        if flight_number and scheduled_arrival:
            duplicate = Flight.objects.filter(
                flight_number=flight_number, scheduled_arrival=scheduled_arrival,
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError('رحلة بنفس رقم الرحلة وموعد الوصول مسجلة مسبقاً')
        origin_country = attrs.get('origin_country', getattr(self.instance, 'origin_country', None))
        destination_port = attrs.get('destination_port', getattr(self.instance, 'destination_port', None))
        if (
            origin_country
            and origin_country.code == getattr(settings, 'HOME_COUNTRY_CODE', 'SD')
            and destination_port is not None
        ):
            raise serializers.ValidationError('دولة المغادرة يجب ألا تطابق دولة المنفذ الوجهة')
        return attrs


class PassengerManifestSerializer(serializers.ModelSerializer):
    flight = serializers.PrimaryKeyRelatedField(queryset=Flight.objects.all(), required=False)

    class Meta:
        model = PassengerManifest
        fields = ['id', 'flight', 'file', 'status', 'total_passengers', 'error_report', 'processed_at']
        read_only_fields = ['id', 'status', 'total_passengers', 'error_report', 'processed_at']


class CarrierDocumentSerializer(serializers.ModelSerializer):
    carrier = serializers.SlugRelatedField(
        slug_field='iata_code', queryset=Carrier.objects.all(), required=False, allow_null=True
    )
    document_type_label = serializers.CharField(source='get_document_type_display', read_only=True)
    carrier_name = serializers.CharField(source='carrier.name', read_only=True, allow_null=True)
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True, allow_null=True)

    class Meta:
        model = CarrierDocument
        fields = [
            'id', 'carrier', 'carrier_name', 'flight', 'flight_number', 'document_type',
            'document_type_label', 'title', 'file', 'original_filename', 'mime_type',
            'file_size', 'uploaded_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'original_filename', 'mime_type', 'file_size', 'uploaded_by', 'created_at', 'updated_at']
        extra_kwargs = {'carrier': {'required': False, 'allow_null': True}}

    def validate_file(self, value):
        if not value:
            raise serializers.ValidationError('الملف مطلوب')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('حجم الملف يتجاوز 10MB')
        allowed = {
            'application/pdf', 'image/jpeg', 'image/png', 'text/csv',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        if getattr(value, 'content_type', None) and value.content_type not in allowed:
            raise serializers.ValidationError('صيغة الملف غير مدعومة')
        return value

    def validate(self, attrs):
        flight = attrs.get('flight', getattr(self.instance, 'flight', None))
        carrier = attrs.get('carrier', getattr(self.instance, 'carrier', None))
        if flight is not None and carrier is not None and carrier.id != flight.carrier_id:
            raise serializers.ValidationError({'flight': 'الرحلة لا تتبع شركة النقل الحالية'})
        return attrs


class ManifestPassengerSerializer(serializers.ModelSerializer):
    nationality = serializers.SlugRelatedField(slug_field='code', queryset=Country.objects.all())
    nationally_name = serializers.CharField(source='nationality.name_ar', read_only=True)
    pre_registered = serializers.SerializerMethodField()

    class Meta:
        model = ManifestPassenger
        fields = [
            'id', 'passport_number', 'first_name', 'last_name', 'date_of_birth',
            'nationality', 'nationally_name', 'gender', 'previous_country', 'is_crew',
            'seat_number', 'email', 'phone', 'traveler',
            'pre_registered',
        ]
        read_only_fields = ['id']

    def get_pre_registered(self, obj):
        return bool(obj.traveler_id)


class HealthNoticeSerializer(serializers.ModelSerializer):
    acknowledged = serializers.SerializerMethodField()

    class Meta:
        model = HealthNotice
        fields = ['id', 'title', 'description', 'category', 'priority', 'published_at', 'expiry_date', 'is_active', 'acknowledged']
        read_only_fields = ['id', 'published_at']

    def get_acknowledged(self, obj):
        carrier = getattr(self.context.get('request'), 'carrier', None)
        if carrier is None:
            member = getattr(self.context.get('request'), 'carrier_member', None)
            carrier = getattr(member, 'carrier', None)
        if carrier is None:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated and not request.user.is_staff:
                from .views import get_portal_carrier

                carrier = get_portal_carrier(request.user)
        if not carrier:
            return None
        return NoticeAcknowledgement.objects.filter(carrier=carrier, notice=obj).exists()


def build_manifest_report(manifest):
    """تقرير التحقق من الكشف: ملخص + حالة كل مسافر (مسجل مسبقاً أم لا)."""
    passengers = manifest.passengers.select_related('nationality', 'traveler').order_by('last_name')
    rows = []
    for p in passengers:
        rows.append({
            'passport_number': p.passport_number,
            'full_name': f'{p.first_name} {p.last_name}'.strip(),
            'nationality': p.nationality.name_ar if p.nationality else '',
            'pre_registered': bool(p.traveler_id),
            'valid': True,
        })
    report = {
        'total': len(rows),
        'pre_registered': sum(1 for r in rows if r['pre_registered']),
        'not_registered': sum(1 for r in rows if not r['pre_registered']),
        'errors': len(manifest.error_report.get('errors', [])) if manifest.error_report else 0,
        'rows': rows,
    }
    return report


def export_errors_csv(manifest):
    errors = (manifest.error_report or {}).get('errors', [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['row', 'error'])
    for e in errors:
        writer.writerow([e.get('row', ''), e.get('error', '')])
    return output.getvalue()

class CarrierApiUsageLogSerializer(serializers.ModelSerializer):
    """سجل استخدام بوابة API — للاطلاع والتدقيق المؤسسي (قراءة فقط)."""

    carrier_name = serializers.CharField(source='carrier.name', read_only=True)

    class Meta:
        model = CarrierApiUsageLog
        fields = [
            'id', 'carrier', 'carrier_name', 'endpoint', 'method', 'status_code',
            'ip_address', 'user_agent', 'latency_ms', 'is_rate_limited',
            'error_message', 'request_payload', 'created_at',
        ]
        read_only_fields = fields


class CarrierRegistrationRequestSerializer(serializers.ModelSerializer):
    """طلب تسجيل شركة نقل في البوابة — يُنشأ من ممثل الشركة ويُراجع من مسؤول المنصة."""

    carrier_name = serializers.CharField(source='carrier.name', read_only=True, allow_null=True)

    class Meta:
        model = CarrierRegistrationRequest
        fields = [
            'id', 'carrier', 'carrier_name', 'company_name', 'iata_code', 'icao_code',
            'contact_name', 'email', 'phone', 'address', 'documents', 'requested_scopes',
            'status', 'submitted_by', 'reviewed_by', 'reviewed_at', 'review_notes',
            'created_at',
        ]
        read_only_fields = [
            'id', 'carrier', 'status', 'submitted_by', 'reviewed_by', 'reviewed_at', 'created_at',
        ]

    def validate(self, attrs):
        if not (attrs.get('company_name') or getattr(self.instance, 'company_name', '')):
            raise serializers.ValidationError({'company_name': 'اسم الشركة مطلوب'})
        return attrs


class FlightHealthEventSerializer(serializers.ModelSerializer):
    """حدث صحي لرحلة (PHA) — كامل بعناصره الوبائية وربطه بمنفذ الوصول وخطة الطوارئ."""

    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    severity_label = serializers.CharField(source='get_severity_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = FlightHealthEvent
        fields = [
            'id', 'flight', 'flight_number', 'category', 'category_label', 'severity',
            'severity_label', 'status', 'status_label', 'description', 'affected_count',
            'is_crew_related', 'symptoms', 'reporter_name', 'reporter_user',
            'reported_via', 'reported_at', 'assigned_to', 'assigned_at',
            'quarantine_state', 'health_facility', 'destination_port',
            'resolution_notes', 'resolved_at', 'closed_at', 'emergency_event',
            'escalated_at', 'transmitted_to_eoc_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'reporter_user', 'reported_at', 'status', 'escalated_at',
            'transmitted_to_eoc_at', 'created_at', 'updated_at',
        ]


class HealthDeclarationSerializer(serializers.ModelSerializer):
    """إقرار صحي لرحلة — يقدَّم من الناقل ويُراجع من صحة المطار.

    الحالة (status) لا تُعدَّل مباشرة عبر PATCH؛ الانتقالات حصرية عبر
    actions: submit/review/approve/reject.
    """

    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    carrier_name = serializers.CharField(source='carrier.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = HealthDeclaration
        fields = [
            'id', 'flight', 'flight_number', 'carrier', 'carrier_name',
            'declaration_date', 'officer_name', 'officer_phone',
            'doctor_name', 'doctor_phone', 'passenger_count', 'crew_count',
            'ill_passenger_count', 'has_medical_emergency', 'symptoms_present',
            'notes', 'status', 'status_label', 'submitted_by', 'submitted_at',
            'reviewed_by', 'reviewed_at', 'review_notes', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'flight_number', 'carrier_name', 'status', 'status_label',
            'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {'carrier': {'required': False, 'allow_null': True}}

    def validate(self, attrs):
        flight = attrs.get('flight', getattr(self.instance, 'flight', None))
        carrier = attrs.get('carrier', getattr(self.instance, 'carrier', None))
        if flight is not None and carrier is not None and carrier.id != flight.carrier_id:
            raise serializers.ValidationError({'carrier': 'الناقل يجب أن يطابق ناقل الرحلة'})
        return attrs


class FlightHealthEventLogSerializer(serializers.ModelSerializer):
    """سجل انتقالات حالة حدث صحي — تدقيق مؤسسي للامتثال (قراءة فقط)."""

    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default='')

    class Meta:
        model = FlightHealthEventLog
        fields = [
            'id', 'event', 'from_status', 'to_status', 'changed_by', 'changed_by_name',
            'note', 'created_at',
        ]
        read_only_fields = fields
