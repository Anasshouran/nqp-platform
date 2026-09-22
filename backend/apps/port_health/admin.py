from django.contrib import admin

from .models import (
    Berth,
    CargoInspection,
    CrewMember,
    FoodWaterInspection,
    HealthCertificate,
    HealthDeclaration,
    IsolationRecord,
    Passenger,
    PortEmergency,
    SanitationCertificate,
    SeaPort,
    ShipInspection,
    SurveillanceCase,
    VectorControl,
    Vessel,
    VesselVisit,
    WasteInspection,
)


@admin.register(SeaPort)
class SeaPortAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'location', 'capacity', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(Berth)
class BerthAdmin(admin.ModelAdmin):
    list_display = ['code', 'port', 'name_ar', 'max_draft', 'is_active']
    list_filter = ['port', 'is_active']


@admin.register(Vessel)
class VesselAdmin(admin.ModelAdmin):
    list_display = ['vessel_name', 'imo_number', 'flag_state', 'vessel_type', 'status']
    list_filter = ['vessel_type', 'status']
    search_fields = ['vessel_name', 'imo_number', 'flag_state']


@admin.register(VesselVisit)
class VesselVisitAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'port', 'berth', 'arrival_date', 'departure_date', 'status']
    list_filter = ['port', 'status']


@admin.register(CrewMember)
class CrewMemberAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'vessel', 'nationality', 'job_title', 'health_status']
    list_filter = ['health_status']


@admin.register(Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'vessel', 'nationality', 'health_status']
    list_filter = ['health_status']


@admin.register(HealthDeclaration)
class HealthDeclarationAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'captain_name', 'declaration_date', 'illness_on_board', 'status']
    list_filter = ['status']


@admin.register(ShipInspection)
class ShipInspectionAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'inspector', 'inspection_date', 'overall_status', 'certificate_issued']
    list_filter = ['overall_status', 'certificate_issued']


@admin.register(FoodWaterInspection)
class FoodWaterInspectionAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'inspector', 'inspection_date', 'sample_status']
    list_filter = ['sample_status']


@admin.register(SanitationCertificate)
class SanitationCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'certificate_type', 'vessel', 'issue_date', 'expiry_date', 'status']
    list_filter = ['certificate_type', 'status']


@admin.register(IsolationRecord)
class IsolationRecordAdmin(admin.ModelAdmin):
    list_display = ['person_name', 'vessel', 'person_type', 'start_date', 'end_date', 'status']
    list_filter = ['person_type', 'status']


@admin.register(SurveillanceCase)
class SurveillanceCaseAdmin(admin.ModelAdmin):
    list_display = ['disease_name', 'person_name', 'vessel', 'report_date', 'status']
    list_filter = ['status']


@admin.register(VectorControl)
class VectorControlAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'control_type', 'inspection_date', 'evidence_found', 'treatment_applied']
    list_filter = ['control_type']


@admin.register(CargoInspection)
class CargoInspectionAdmin(admin.ModelAdmin):
    list_display = ['declaration_number', 'vessel', 'cargo_type', 'country_of_origin', 'status']
    list_filter = ['cargo_type', 'status']


@admin.register(WasteInspection)
class WasteInspectionAdmin(admin.ModelAdmin):
    list_display = ['vessel', 'inspector', 'inspection_date']
    list_filter = []


@admin.register(PortEmergency)
class PortEmergencyAdmin(admin.ModelAdmin):
    list_display = ['title', 'port', 'vessel', 'severity', 'status', 'reported_at']
    list_filter = ['severity', 'status']


@admin.register(HealthCertificate)
class HealthCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'certificate_type', 'vessel', 'issue_date', 'expiry_date', 'status']
    list_filter = ['certificate_type', 'status']
