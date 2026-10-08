"""مسلسلات نظام صحة المعابر البرية.

النمط: مسلسل واحد لكل نموذج + حقول قراءة مسطّحة عبر
`source='<fk>.<attr>'` + حقول `HiddenField` لربط المستخدم الحالي من الخادم.
"""
from rest_framework import serializers

from .models import (
    BorderCertificate,
    BorderCrossing,
    BorderDailyStatistics,
    BorderEmergency,
    BorderFacility,
    BorderHealthIncident,
    BorderNotification,
    BorderSample,
    BorderScreening,
    BorderShift,
    BorderStaff,
    BorderDecision,
    CargoInspection,
    Contact,
    ContactTracingCase,
    HealthDeclaration,
    IsolationCase,
    QuarantineCase,
    TravelerHealthRecord,
    Vehicle,
    VehicleInspection,
)


# ---------------------------------------------------------------------------
# المعابر والمرافق
# ---------------------------------------------------------------------------


class BorderCrossingSerializer(serializers.ModelSerializer):
    entry_point_code = serializers.CharField(
        source='entry_point.code', read_only=True, default=None
    )
    name_ar = serializers.CharField(source='entry_point.name_ar', read_only=True)
    neighbor_state = serializers.CharField(
        source='entry_point.state.name_ar', read_only=True, default=None
    )

    class Meta:
        model = BorderCrossing
        fields = [
            'id', 'entry_point', 'entry_point_code', 'name_ar', 'neighbor_state',
            'border_type', 'neighbor_country', 'operating_status', 'operating_hours',
            'daily_capacity', 'working_agencies', 'has_health_facility',
            'has_laboratory', 'has_quarantine_facility', 'has_isolation_facility',
            'quarantine_capacity', 'closure_reason', 'notes',
        ]
        read_only_fields = ['id']


class BorderFacilitySerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderFacility
        fields = [
            'id', 'crossing', 'crossing_name', 'kind', 'name_ar', 'name_en',
            'capacity', 'staff_count', 'is_operational', 'notes',
        ]
        read_only_fields = ['id']


class BorderShiftSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(
        source='supervisor.full_name', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderShift
        fields = [
            'id', 'crossing', 'crossing_name', 'shift_date', 'shift_type',
            'started_at', 'ended_at', 'supervisor', 'supervisor_name',
            'is_staffed', 'notes',
        ]
        read_only_fields = ['id']


class BorderStaffSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderStaff
        fields = [
            'id', 'crossing', 'crossing_name', 'user', 'user_name', 'role',
            'assignment_type', 'starts_on', 'ends_on', 'is_active', 'notes',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# المسافرون
# ---------------------------------------------------------------------------


class TravelerHealthRecordSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(
        source='traveler.full_name', read_only=True, default=None
    )
    passport_number = serializers.CharField(
        source='traveler.passport_number', read_only=True, default=None
    )
    assessed_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    assessed_by_name = serializers.CharField(
        source='assessed_by.full_name', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = TravelerHealthRecord
        fields = [
            'id', 'crossing', 'crossing_name', 'traveler', 'traveler_name',
            'passport_number', 'direction', 'entry_at', 'departure_country',
            'visited_countries', 'transport_mode', 'vehicle', 'health_status',
            'risk_level', 'decision', 'assessed_by', 'assessed_by_name', 'notes',
        ]
        read_only_fields = ['id']


class HealthDeclarationSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(
        source='traveler.full_name', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = HealthDeclaration
        fields = [
            'id', 'crossing', 'crossing_name', 'traveler', 'traveler_name',
            'departure_country', 'departure_date', 'visited_countries',
            'health_conditions', 'current_symptoms', 'contact_name',
            'contact_phone', 'declared_at', 'status', 'reviewed_by', 'notes',
        ]
        read_only_fields = ['id', 'declared_at']


class BorderScreeningSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(
        source='traveler.full_name', read_only=True, default=None
    )
    passport_number = serializers.CharField(
        source='traveler.passport_number', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)
    screened_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    screened_by_name = serializers.CharField(
        source='screened_by.full_name', read_only=True, default=None
    )

    class Meta:
        model = BorderScreening
        fields = [
            'id', 'crossing', 'crossing_name', 'traveler', 'traveler_name',
            'passport_number', 'shared_screening', 'body_temperature',
            'oxygen_saturation', 'observed_symptoms', 'risk_level',
            'document_verified', 'vaccination_verified', 'screening_certificate',
            'decision', 'screened_by', 'screened_by_name', 'screened_at', 'notes',
        ]
        read_only_fields = ['id', 'screened_at']


# ---------------------------------------------------------------------------
# المركبات
# ---------------------------------------------------------------------------


class VehicleSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'crossing', 'crossing_name', 'plate_number', 'chassis_number',
            'vehicle_type', 'make_model', 'year_of_manufacture', 'capacity',
            'owner_name', 'driver_name', 'driver_phone', 'status', 'notes',
        ]
        read_only_fields = ['id']


class VehicleInspectionSerializer(serializers.ModelSerializer):
    plate_number = serializers.CharField(
        source='vehicle.plate_number', read_only=True, default=None
    )
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    inspector_name = serializers.CharField(
        source='inspector.full_name', read_only=True, default=None
    )

    class Meta:
        model = VehicleInspection
        fields = [
            'id', 'vehicle', 'plate_number', 'inspection_type', 'inspection_date',
            'inspector', 'inspector_name', 'cleanliness_status', 'pest_control_status',
            'waste_status', 'cooling_status', 'findings', 'overall_status',
            'reinspection_required',
        ]
        read_only_fields = ['id', 'inspection_date']


# ---------------------------------------------------------------------------
# الشحنات
# ---------------------------------------------------------------------------


class CargoInspectionSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)
    plate_number = serializers.CharField(
        source='vehicle.plate_number', read_only=True, default=None
    )

    class Meta:
        model = CargoInspection
        fields = [
            'id', 'crossing', 'crossing_name', 'scope', 'food_shipment',
            'facility', 'declaration_number', 'product_type', 'country_of_origin',
            'vehicle', 'plate_number', 'samples_collected', 'laboratory_result',
            'status', 'decision', 'decided_by', 'decided_at', 'notes',
        ]
        read_only_fields = ['id']


class BorderSampleSerializer(serializers.ModelSerializer):
    collected_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    collected_by_name = serializers.CharField(
        source='collected_by.full_name', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderSample
        fields = [
            'id', 'crossing', 'crossing_name', 'lab_sample', 'cargo_inspection',
            'vehicle', 'sample_code', 'sample_type', 'collected_by',
            'collected_by_name', 'collected_at', 'status', 'result', 'notes',
        ]
        read_only_fields = ['id', 'collected_at']


# ---------------------------------------------------------------------------
# الحجر والعزل
# ---------------------------------------------------------------------------


class QuarantineCaseSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)
    person_name = serializers.CharField(source='traveler.full_name', read_only=True, default=None)

    class Meta:
        model = QuarantineCase
        fields = [
            'id', 'case_number', 'crossing', 'crossing_name', 'traveler',
            'person_name', 'health_case', 'disease', 'clinic', 'facility',
            'entry_at', 'required_days', 'expected_end_date', 'actual_end_date',
            'phase', 'status', 'follow_up_notes',
        ]
        read_only_fields = ['id', 'entry_at']


class IsolationCaseSerializer(serializers.ModelSerializer):
    started_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    started_by_name = serializers.CharField(
        source='started_by.full_name', read_only=True, default=None
    )
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = IsolationCase
        fields = [
            'id', 'crossing', 'crossing_name', 'quarantine_case', 'clinic_isolation',
            'facility', 'start_date', 'expected_end_date', 'end_date', 'status',
            'started_by', 'started_by_name', 'closed_by', 'notes',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# تتبع المخالطين
# ---------------------------------------------------------------------------


class ContactTracingCaseSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = ContactTracingCase
        fields = [
            'id', 'case', 'crossing', 'crossing_name', 'index_case_name',
            'transport_mode', 'vehicle', 'shared_contact_trace', 'follow_up_days',
            'started_at', 'status', 'notes',
        ]
        read_only_fields = ['id', 'started_at']


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'tracing_case', 'full_name', 'passport_number', 'phone',
            'seat_or_relation', 'status', 'follow_up_day', 'notes',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# الطوارئ والحوادث
# ---------------------------------------------------------------------------


class BorderHealthIncidentSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderHealthIncident
        fields = [
            'id', 'crossing', 'crossing_name', 'quarantine_case', 'title',
            'description', 'severity', 'status', 'reported_at', 'closed_at',
            'reported_by', 'notes',
        ]
        read_only_fields = ['id', 'reported_at']


class BorderEmergencySerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderEmergency
        fields = [
            'id', 'crossing', 'crossing_name', 'shared_event', 'disease', 'title',
            'description', 'restriction_level', 'status', 'reported_at',
            'resolved_at', 'reported_by', 'notes',
        ]
        read_only_fields = ['id', 'reported_at']


# ---------------------------------------------------------------------------
# الشهادات والقرارات والإشعارات والإحصاءات
# ---------------------------------------------------------------------------


class BorderCertificateSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)
    issued_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    issued_by_name = serializers.CharField(
        source='issued_by.full_name', read_only=True, default=None
    )

    class Meta:
        model = BorderCertificate
        fields = [
            'id', 'certificate_number', 'certificate_type', 'crossing',
            'crossing_name', 'traveler', 'vehicle', 'vehicle_inspection',
            'issue_date', 'expiry_date', 'status', 'qr_payload', 'issued_by',
            'issued_by_name', 'notes',
        ]
        read_only_fields = ['id']


class BorderDecisionSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)
    decided_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    decided_by_name = serializers.CharField(
        source='decided_by.full_name', read_only=True, default=None
    )

    class Meta:
        model = BorderDecision
        fields = [
            'id', 'crossing', 'crossing_name', 'subject_type', 'traveler',
            'vehicle', 'cargo_inspection', 'quarantine_case', 'outcome', 'reason',
            'decided_by', 'decided_by_name', 'decided_at',
        ]
        read_only_fields = ['id', 'decided_at']


class BorderNotificationSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderNotification
        fields = [
            'id', 'crossing', 'crossing_name', 'recipient_role', 'recipient_contact',
            'title', 'body', 'channel', 'status', 'sent_at', 'sent_by',
        ]
        read_only_fields = ['id']


class BorderDailyStatisticsSerializer(serializers.ModelSerializer):
    crossing_name = serializers.CharField(source='crossing.entry_point.name_ar', read_only=True)

    class Meta:
        model = BorderDailyStatistics
        fields = [
            'id', 'crossing', 'crossing_name', 'stat_date', 'travelers_inbound',
            'travelers_outbound', 'vehicles_inspected', 'cargo_inspections',
            'quarantine_cases', 'isolation_cases', 'suspected_cases',
            'certificates_issued', 'samples_collected',
            'average_processing_minutes',
        ]
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# لوحة القيادة القومية — للتوثيق في مخطط OpenAPI فقط
# ---------------------------------------------------------------------------


class BordersHealthDashboardSerializer(serializers.Serializer):
    crossings = serializers.IntegerField()
    open_crossings = serializers.IntegerField()
    restricted_crossings = serializers.IntegerField()
    closed_crossings = serializers.IntegerField()
    travelers_today = serializers.IntegerField()
    vehicles_inspected = serializers.IntegerField()
    cargo_inspections = serializers.IntegerField()
    active_quarantine = serializers.IntegerField()
    active_isolation = serializers.IntegerField()
    suspected_cases = serializers.IntegerField()
    open_emergencies = serializers.IntegerField()
    certificates_issued = serializers.IntegerField()
    samples_collected = serializers.IntegerField()
