"""تسجيل نماذج نظام صحة المعابر البرية في لوحة إدارة Django.

مولَّد آلياً: أعمدة الجدول وعوامل التصفية مضبوطة لكل نموذج،
والعلاقات تُعرض عبر `raw_id_fields` لتفادي قوائم منسدلة ضخمة.
"""

from django.contrib import admin

from .models import (
    BorderCertificate,
    BorderCrossing,
    BorderDailyStatistics,
    BorderDecision,
    BorderEmergency,
    BorderFacility,
    BorderHealthIncident,
    BorderNotification,
    BorderSample,
    BorderScreening,
    BorderShift,
    BorderStaff,
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


class BaseBorderAdmin(admin.ModelAdmin):
    """أساس مشترك — لا أعمدة افتراضية، كل نموذج يحدد عرضه."""


class BorderScopedAdmin(BaseBorderAdmin):
    """يضيف تصفية المعبر لأي نموذج يحمل علاقة `crossing`."""

    list_filter = ('crossing',)


@admin.register(BorderCertificate)
class BorderCertificateAdmin(BorderScopedAdmin):
    list_display = (
        'certificate_number',
        'certificate_type',
        'crossing',
        'status',
        'issue_date',
        'expiry_date',
    )
    list_filter = ('crossing', 'certificate_type', 'status')

    date_hierarchy = 'issue_date'
    search_fields = ('certificate_number',)
    raw_id_fields = (
        'crossing',
        'issued_by',
        'traveler',
        'vehicle',
        'vehicle_inspection',
    )


@admin.register(BorderCrossing)
class BorderCrossingAdmin(BaseBorderAdmin):
    list_display = (
        'entry_point',
        'neighbor_country',
        'border_type',
        'operating_status',
        'daily_capacity',
        'quarantine_capacity',
    )
    list_filter = ('operating_status', 'border_type', 'neighbor_country')

    search_fields = (
        'entry_point__code',
        'entry_point__name_ar',
        'neighbor_country',
        'working_agencies',
    )
    raw_id_fields = ('entry_point',)


@admin.register(BorderDailyStatistics)
class BorderDailyStatisticsAdmin(BorderScopedAdmin):
    list_display = (
        'crossing',
        'stat_date',
        'travelers_inbound',
        'travelers_outbound',
        'vehicles_inspected',
        'quarantine_cases',
        'samples_collected',
    )
    list_filter = ('crossing',)
    date_hierarchy = 'stat_date'
    raw_id_fields = ('crossing',)


@admin.register(BorderDecision)
class BorderDecisionAdmin(BorderScopedAdmin):
    list_display = ('crossing', 'subject_type', 'outcome', 'decided_at')
    list_filter = ('crossing', 'subject_type', 'outcome')

    date_hierarchy = 'decided_at'
    search_fields = ('reason',)
    raw_id_fields = (
        'cargo_inspection',
        'crossing',
        'decided_by',
        'quarantine_case',
        'traveler',
        'vehicle',
    )


@admin.register(BorderEmergency)
class BorderEmergencyAdmin(BorderScopedAdmin):
    list_display = (
        'title',
        'crossing',
        'restriction_level',
        'status',
        'reported_at',
        'resolved_at',
    )
    list_filter = ('crossing', 'restriction_level', 'status')

    date_hierarchy = 'reported_at'
    search_fields = ('title', 'description')
    raw_id_fields = ('crossing', 'disease', 'reported_by', 'shared_event')


@admin.register(BorderFacility)
class BorderFacilityAdmin(BorderScopedAdmin):
    list_display = (
        'name_ar',
        'crossing',
        'kind',
        'capacity',
        'staff_count',
        'is_operational',
    )
    list_filter = ('crossing', 'kind', 'is_operational')

    search_fields = ('name_ar', 'name_en')
    raw_id_fields = ('crossing',)


@admin.register(BorderHealthIncident)
class BorderHealthIncidentAdmin(BorderScopedAdmin):
    list_display = (
        'title',
        'crossing',
        'severity',
        'status',
        'reported_at',
        'closed_at',
    )
    list_filter = ('crossing', 'severity', 'status')

    date_hierarchy = 'reported_at'
    search_fields = ('title', 'description')
    raw_id_fields = ('crossing', 'quarantine_case', 'reported_by')


@admin.register(BorderNotification)
class BorderNotificationAdmin(BorderScopedAdmin):
    list_display = (
        'title',
        'crossing',
        'channel',
        'status',
        'recipient_role',
        'sent_at',
    )
    list_filter = ('crossing', 'channel', 'status', 'recipient_role')

    date_hierarchy = 'sent_at'
    search_fields = ('title', 'body', 'recipient_contact')
    raw_id_fields = ('crossing', 'sent_by')


@admin.register(BorderSample)
class BorderSampleAdmin(BorderScopedAdmin):
    list_display = (
        'sample_code',
        'crossing',
        'sample_type',
        'status',
        'result',
        'collected_at',
    )
    list_filter = ('crossing', 'sample_type', 'status', 'result')

    date_hierarchy = 'collected_at'
    search_fields = ('sample_code',)
    raw_id_fields = (
        'cargo_inspection',
        'collected_by',
        'crossing',
        'lab_sample',
        'vehicle',
    )


@admin.register(BorderScreening)
class BorderScreeningAdmin(BorderScopedAdmin):
    list_display = (
        'traveler',
        'crossing',
        'risk_level',
        'decision',
        'body_temperature',
        'oxygen_saturation',
        'screened_at',
    )
    list_filter = (
        'crossing',
        'risk_level',
        'decision',
        'document_verified',
        'vaccination_verified',
    )

    date_hierarchy = 'screened_at'
    search_fields = (
        'traveler__passport_number',
        'traveler__full_name_ar',
        'observed_symptoms',
    )
    raw_id_fields = (
        'crossing',
        'screened_by',
        'screening_certificate',
        'shared_screening',
        'traveler',
    )


@admin.register(BorderShift)
class BorderShiftAdmin(BorderScopedAdmin):
    list_display = (
        'crossing',
        'shift_date',
        'shift_type',
        'started_at',
        'ended_at',
        'is_staffed',
    )
    list_filter = ('crossing', 'shift_type', 'is_staffed')

    date_hierarchy = 'shift_date'
    search_fields = ('notes',)
    raw_id_fields = ('crossing', 'supervisor')


@admin.register(BorderStaff)
class BorderStaffAdmin(BorderScopedAdmin):
    list_display = ('user', 'crossing', 'role', 'assignment_type', 'is_active')
    list_filter = ('crossing', 'role', 'assignment_type', 'is_active')
    raw_id_fields = ('crossing', 'user')


@admin.register(CargoInspection)
class CargoInspectionAdmin(BorderScopedAdmin):
    list_display = (
        'crossing',
        'scope',
        'status',
        'decision',
        'declaration_number',
        'product_type',
        'decided_at',
    )
    list_filter = ('crossing', 'scope', 'status', 'decision')

    search_fields = ('declaration_number', 'product_type', 'country_of_origin')
    raw_id_fields = ('crossing', 'decided_by', 'facility', 'food_shipment', 'vehicle')


@admin.register(Contact)
class ContactAdmin(BaseBorderAdmin):
    list_display = ('full_name', 'tracing_case', 'status', 'follow_up_day', 'phone')
    list_filter = ('status', 'follow_up_day')

    search_fields = ('full_name', 'passport_number', 'phone')
    raw_id_fields = ('tracing_case',)


@admin.register(ContactTracingCase)
class ContactTracingCaseAdmin(BorderScopedAdmin):
    list_display = (
        'crossing',
        'index_case_name',
        'status',
        'transport_mode',
        'follow_up_days',
        'started_at',
    )
    list_filter = ('crossing', 'status', 'transport_mode')

    date_hierarchy = 'started_at'
    search_fields = ('index_case_name',)
    raw_id_fields = ('case', 'crossing', 'shared_contact_trace', 'vehicle')


@admin.register(HealthDeclaration)
class HealthDeclarationAdmin(BorderScopedAdmin):
    list_display = (
        'traveler',
        'crossing',
        'status',
        'departure_country',
        'departure_date',
        'declared_at',
    )
    list_filter = ('crossing', 'status', 'departure_country')

    date_hierarchy = 'departure_date'
    search_fields = (
        'traveler__passport_number',
        'traveler__full_name_ar',
        'contact_name',
    )
    raw_id_fields = ('crossing', 'reviewed_by', 'traveler')


@admin.register(IsolationCase)
class IsolationCaseAdmin(BorderScopedAdmin):
    list_display = (
        'crossing',
        'status',
        'quarantine_case',
        'start_date',
        'expected_end_date',
        'end_date',
    )
    list_filter = ('crossing', 'status')
    date_hierarchy = 'start_date'
    raw_id_fields = (
        'clinic_isolation',
        'closed_by',
        'crossing',
        'facility',
        'quarantine_case',
        'started_by',
    )


@admin.register(QuarantineCase)
class QuarantineCaseAdmin(BorderScopedAdmin):
    list_display = (
        'case_number',
        'person_name',
        'crossing',
        'status',
        'phase',
        'required_days',
        'entry_at',
    )
    list_filter = ('crossing', 'status', 'phase')

    date_hierarchy = 'entry_at'
    search_fields = ('case_number', 'person_name')
    raw_id_fields = (
        'clinic',
        'crossing',
        'disease',
        'facility',
        'health_case',
        'traveler',
    )


@admin.register(TravelerHealthRecord)
class TravelerHealthRecordAdmin(BorderScopedAdmin):
    list_display = (
        'traveler',
        'crossing',
        'direction',
        'health_status',
        'risk_level',
        'decision',
        'entry_at',
    )
    list_filter = (
        'crossing',
        'direction',
        'health_status',
        'risk_level',
        'decision',
        'transport_mode',
    )

    date_hierarchy = 'entry_at'
    search_fields = (
        'traveler__passport_number',
        'traveler__full_name_ar',
        'departure_country',
    )
    raw_id_fields = ('assessed_by', 'crossing', 'traveler', 'vehicle')


@admin.register(Vehicle)
class VehicleAdmin(BorderScopedAdmin):
    list_display = (
        'plate_number',
        'crossing',
        'vehicle_type',
        'status',
        'make_model',
        'driver_name',
    )
    list_filter = ('crossing', 'vehicle_type', 'status')

    search_fields = ('plate_number', 'chassis_number', 'driver_name', 'owner_name')
    raw_id_fields = ('crossing',)


@admin.register(VehicleInspection)
class VehicleInspectionAdmin(BaseBorderAdmin):
    list_display = (
        'vehicle',
        'inspection_type',
        'overall_status',
        'inspection_date',
        'reinspection_required',
    )
    list_filter = (
        'inspection_type',
        'overall_status',
        'reinspection_required',
        'cleanliness_status',
        'pest_control_status',
    )

    date_hierarchy = 'inspection_date'
    search_fields = ('vehicle__plate_number', 'findings')
    raw_id_fields = ('inspector', 'vehicle')
