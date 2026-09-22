from django.contrib import admin

from .models import (
    CaseStatusLog,
    ContactFollowUp,
    ContactTrace,
    CrisisTeamMember,
    EmergencyAlert,
    EmergencyEvent,
    HealthCase,
    Investigation,
    KillSwitch,
    ReportableDisease,
    ResponsePlan,
    SurveillanceAlert,
    WeeklyReportLine,
    WeeklySurveillanceReport,
)


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = ['alert_type', 'traveler', 'port', 'status', 'triggered_at']
    list_filter = ['alert_type', 'status']
    search_fields = ['description']


@admin.register(KillSwitch)
class KillSwitchAdmin(admin.ModelAdmin):
    list_display = ['port', 'activated_by', 'activated_at', 'deactivated_at']
    list_filter = ['port']


@admin.register(ResponsePlan)
class ResponsePlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(EmergencyEvent)
class EmergencyEventAdmin(admin.ModelAdmin):
    list_display = ['event_number', 'title', 'disease', 'severity', 'status', 'reported_at']
    list_filter = ['severity', 'status', 'source_type']
    search_fields = ['title', 'description']


@admin.register(CrisisTeamMember)
class CrisisTeamMemberAdmin(admin.ModelAdmin):
    list_display = ['event', 'user', 'role']
    list_filter = ['role']


@admin.register(ReportableDisease)
class ReportableDiseaseAdmin(admin.ModelAdmin):
    list_display = ['disease', 'notification_timeline', 'surveillance_mode', 'ewars_threshold', 'is_enabled']
    list_filter = ['notification_timeline', 'surveillance_mode', 'is_enabled']


@admin.register(HealthCase)
class HealthCaseAdmin(admin.ModelAdmin):
    list_display = ['case_number', 'person_name', 'disease', 'case_type', 'status', 'severity', 'reported_date']
    list_filter = ['case_type', 'status', 'source', 'disease', 'sector']
    search_fields = ['case_number', 'person_name', 'passport_number']


@admin.register(CaseStatusLog)
class CaseStatusLogAdmin(admin.ModelAdmin):
    list_display = ['case', 'field', 'old_value', 'new_value', 'changed_by', 'changed_at']
    list_filter = ['field']


@admin.register(SurveillanceAlert)
class SurveillanceAlertAdmin(admin.ModelAdmin):
    list_display = ['alert_number', 'title', 'level', 'alert_type', 'status', 'generated_at']
    list_filter = ['level', 'status', 'alert_type']
    search_fields = ['alert_number', 'title']


@admin.register(ContactTrace)
class ContactTraceAdmin(admin.ModelAdmin):
    list_display = ['contact_number', 'person_name', 'index_case', 'contact_type', 'status']
    list_filter = ['contact_type', 'status']


@admin.register(ContactFollowUp)
class ContactFollowUpAdmin(admin.ModelAdmin):
    list_display = ['contact', 'check_date', 'temperature', 'status', 'checked_by']
    list_filter = ['status']


@admin.register(Investigation)
class InvestigationAdmin(admin.ModelAdmin):
    list_display = ['investigation_number', 'title', 'case', 'event', 'status', 'lead_investigator']
    list_filter = ['status']


@admin.register(WeeklySurveillanceReport)
class WeeklySurveillanceReportAdmin(admin.ModelAdmin):
    list_display = ['report_number', 'period_start', 'period_end', 'health_facility', 'port', 'sector', 'is_on_time']
    list_filter = ['is_on_time', 'sector']


@admin.register(WeeklyReportLine)
class WeeklyReportLineAdmin(admin.ModelAdmin):
    list_display = ['report', 'disease', 'syndrome', 'new_cases', 'deaths']
