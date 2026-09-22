from django.contrib import admin

from apps.ports.models import Port

from .models import (
    AircraftInspection,
    AirportScreening,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)


@admin.register(Port)
class PortAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'type', 'country', 'is_active']
    list_filter = ['type', 'is_active']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(AirportTerminal)
class AirportTerminalAdmin(admin.ModelAdmin):
    list_display = ['terminal_code', 'port', 'name_ar', 'name_en', 'is_active']
    list_filter = ['port', 'is_active']


@admin.register(ScreeningPoint)
class ScreeningPointAdmin(admin.ModelAdmin):
    list_display = ['point_code', 'terminal', 'point_type', 'is_active']
    list_filter = ['point_type', 'is_active']


@admin.register(AirportScreening)
class AirportScreeningAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'screening_point', 'screening_type', 'risk_level', 'status', 'screened_at']
    list_filter = ['screening_type', 'risk_level', 'status']


@admin.register(AircraftInspection)
class AircraftInspectionAdmin(admin.ModelAdmin):
    list_display = ['aircraft_registration', 'flight', 'overall_status', 'certificate_issued', 'inspection_date']
    list_filter = ['overall_status', 'certificate_issued']


@admin.register(CrewHealthRecord)
class CrewHealthRecordAdmin(admin.ModelAdmin):
    list_display = ['crew', 'flight', 'health_status', 'temperature']
    list_filter = ['health_status']
