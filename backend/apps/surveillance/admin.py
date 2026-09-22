from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from django.utils.html import format_html

from apps.surveillance.models.case import (
    HealthCase, CaseSymptom, CaseExposure, CaseTravelHistory, CaseStatusLog
)
from apps.surveillance.models.contact import ContactTrace, ContactFollowUp
from apps.surveillance.models.investigation import Investigation, InvestigationAxis, InvestigationFinding
from apps.surveillance.models.specimen import Specimen, SpecimenMovement, SpecimenLabResult
from apps.surveillance.models.alert import SurveillanceAlert, AlertRule, AlertEvaluation, AlertNotification
from apps.surveillance.models.outbreak import (
    Outbreak, OutbreakCase, OutbreakContact, OutbreakSpecimen,
    OutbreakResponseAction, OutbreakResponseTeam, OutbreakVectorFocus
)
from apps.surveillance.models.event import HealthEvent, EventReport
from apps.surveillance.models.location import SurveillanceLocation, HealthFacilitySurveillance, PortOfEntrySurveillance
from apps.surveillance.models.report import (
    DailySurveillanceReport, WeeklySurveillanceReport, MonthlySurveillanceReport,
    OutbreakReport, InvestigationReport, ReportLine
)
from apps.surveillance.models.notification import Notification, NotificationTemplate, NotificationPreference
from apps.surveillance.models.audit import SurveillanceAuditLog
from apps.surveillance.models.vector_integration import VectorSurveillanceLink, VectorAlertRule
from apps.surveillance.models.gis import SurveillanceMapLayer, MapFeature, MapViewState, SpatialAnalysis


class CaseSymptomInline(admin.TabularInline):
    model = CaseSymptom
    extra = 0
    readonly_fields = ['created_at', 'updated_at']


class CaseExposureInline(admin.TabularInline):
    model = CaseExposure
    fk_name = 'case'
    extra = 0


class CaseTravelHistoryInline(admin.TabularInline):
    model = CaseTravelHistory
    extra = 0


class ContactFollowUpInline(admin.TabularInline):
    model = ContactFollowUp
    extra = 0
    readonly_fields = ['check_date', 'status', 'checked_by', 'created_at']
    ordering = ['-check_date']


class InvestigationAxisInline(admin.TabularInline):
    model = InvestigationAxis
    extra = 0
    ordering = ['order']


class SpecimenMovementInline(admin.TabularInline):
    model = SpecimenMovement
    extra = 0
    readonly_fields = ['performed_at', 'action', 'handler']
    ordering = ['-performed_at']


class OutbreakCaseInline(admin.TabularInline):
    model = OutbreakCase
    extra = 0
    readonly_fields = ['added_by', 'confirmed_at']


class OutbreakResponseActionInline(admin.TabularInline):
    model = OutbreakResponseAction
    extra = 0
    ordering = ['planned_start']


class ReportLineInline(GenericTabularInline):
    model = ReportLine
    ct_field = 'report_content_type'
    ct_fk_field = 'report_object_id'
    extra = 0


@admin.register(HealthCase)
class HealthCaseAdmin(admin.ModelAdmin):
    list_display = [
        'case_number', 'person_name', 'disease', 'case_type', 'workflow_state',
        'status', 'severity', 'source', 'port', 'sector', 'reported_date', 'assigned_to'
    ]
    list_filter = [
        'case_type', 'workflow_state', 'status', 'severity', 'source',
        'disease', 'port', 'sector', 'locality', 'reported_date'
    ]
    search_fields = [
        'case_number', 'person_name', 'passport_number', 'national_id',
        'phone', 'traveler__first_name', 'traveler__last_name'
    ]
    readonly_fields = ['case_number', 'created_at', 'updated_at']
    inlines = [CaseSymptomInline, CaseExposureInline, CaseTravelHistoryInline]
    date_hierarchy = 'reported_date'
    ordering = ['-reported_date', '-created_at']
    list_select_related = ['disease', 'traveler', 'port', 'sector', 'locality', 'health_facility', 'assigned_to']
    autocomplete_fields = ['disease', 'traveler', 'port', 'sector', 'locality', 'health_facility', 'event', 'outbreak', 'case_definition', 'assigned_to', 'reported_by']


@admin.register(CaseSymptom)
class CaseSymptomAdmin(admin.ModelAdmin):
    list_display = ['case', 'symptom_name_ar', 'onset_date', 'severity', 'is_primary']
    list_filter = ['severity', 'is_primary', 'symptom_code']
    search_fields = ['case__case_number', 'symptom_name_ar', 'symptom_name_en']


@admin.register(CaseExposure)
class CaseExposureAdmin(admin.ModelAdmin):
    list_display = ['case', 'exposure_type', 'location', 'start_date', 'end_date']
    list_filter = ['exposure_type', 'start_date']
    search_fields = ['case__case_number', 'location', 'description']


@admin.register(CaseTravelHistory)
class CaseTravelHistoryAdmin(admin.ModelAdmin):
    list_display = ['case', 'country', 'arrival_date', 'departure_date', 'port_of_entry']
    list_filter = ['country', 'arrival_date']
    search_fields = ['case__case_number', 'country', 'region']


@admin.register(CaseStatusLog)
class CaseStatusLogAdmin(admin.ModelAdmin):
    list_display = ['case', 'field', 'old_value', 'new_value', 'changed_by', 'changed_at']
    list_filter = ['field', 'changed_at']
    search_fields = ['case__case_number', 'changed_by__username']
    readonly_fields = ['case', 'field', 'old_value', 'new_value', 'note', 'changed_by', 'changed_at']


@admin.register(ContactTrace)
class ContactTraceAdmin(admin.ModelAdmin):
    list_display = [
        'contact_number', 'person_name', 'index_case', 'contact_type', 'status',
        'follow_up_start', 'follow_up_end', 'current_follow_up_day', 'assigned_to'
    ]
    list_filter = ['contact_type', 'status', 'sector', 'port']
    search_fields = ['contact_number', 'person_name', 'phone', 'national_id', 'index_case__case_number']
    readonly_fields = ['contact_number', 'created_at', 'updated_at']
    inlines = [ContactFollowUpInline]
    date_hierarchy = 'follow_up_start'
    autocomplete_fields = ['index_case', 'port', 'sector', 'assigned_to', 'supervised_by']


@admin.register(ContactFollowUp)
class ContactFollowUpAdmin(admin.ModelAdmin):
    list_display = ['contact', 'check_date', 'status', 'temperature', 'checked_by']
    list_filter = ['status', 'check_method', 'check_date']
    search_fields = ['contact__contact_number', 'contact__person_name', 'notes']
    readonly_fields = ['check_date', 'created_at']


@admin.register(Investigation)
class InvestigationAdmin(admin.ModelAdmin):
    list_display = [
        'investigation_number', 'title', 'case', 'event', 'outbreak',
        'lead_investigator', 'status', 'priority', 'started_at', 'completed_at'
    ]
    list_filter = ['status', 'priority', 'lead_investigator']
    search_fields = ['investigation_number', 'title', 'case__case_number', 'event__event_number']
    readonly_fields = ['investigation_number', 'started_at', 'created_at', 'updated_at']
    inlines = [InvestigationAxisInline]
    date_hierarchy = 'started_at'
    autocomplete_fields = ['case', 'event', 'outbreak', 'lead_investigator', 'supervisor', 'case_definition_used']


@admin.register(InvestigationAxis)
class InvestigationAxisAdmin(admin.ModelAdmin):
    list_display = ['investigation', 'axis_type', 'title', 'is_completed', 'completed_at']
    list_filter = ['axis_type', 'is_completed']
    search_fields = ['investigation__investigation_number', 'title']


@admin.register(InvestigationFinding)
class InvestigationFindingAdmin(admin.ModelAdmin):
    list_display = ['investigation', 'finding_type', 'title', 'confidence_level', 'created_by']
    list_filter = ['finding_type', 'confidence_level']
    search_fields = ['investigation__investigation_number', 'title']


@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    list_display = [
        'specimen_number', 'case', 'specimen_type', 'status', 'priority',
        'laboratory', 'collected_at', 'received_at'
    ]
    list_filter = ['specimen_type', 'status', 'priority', 'laboratory']
    search_fields = ['specimen_number', 'case__case_number', 'case__person_name']
    readonly_fields = ['specimen_number', 'created_at', 'updated_at']
    inlines = [SpecimenMovementInline]
    date_hierarchy = 'collected_at'
    autocomplete_fields = ['case', 'investigation', 'outbreak', 'laboratory', 'lab_sample', 'collected_by']


@admin.register(SpecimenMovement)
class SpecimenMovementAdmin(admin.ModelAdmin):
    list_display = ['specimen', 'action', 'from_location', 'to_location', 'handler', 'performed_at']
    list_filter = ['action', 'performed_at']
    search_fields = ['specimen__specimen_number', 'notes']
    readonly_fields = ['performed_at', 'created_at']


@admin.register(SpecimenLabResult)
class SpecimenLabResultAdmin(admin.ModelAdmin):
    list_display = ['specimen', 'disease', 'test_name', 'result_qualitative', 'is_critical', 'verified_by']
    list_filter = ['result_qualitative', 'is_critical', 'disease']
    search_fields = ['specimen__specimen_number', 'test_name', 'disease__name_ar']


@admin.register(SurveillanceAlert)
class SurveillanceAlertAdmin(admin.ModelAdmin):
    list_display = [
        'alert_number', 'title', 'alert_type', 'level', 'evaluation_status', 'status',
        'disease', 'sector', 'port', 'case_count', 'generated_at'
    ]
    list_filter = ['alert_type', 'level', 'evaluation_status', 'status', 'disease', 'sector', 'port']
    search_fields = ['alert_number', 'title', 'description', 'disease__name_ar']
    readonly_fields = ['alert_number', 'generated_at', 'created_at', 'updated_at']
    date_hierarchy = 'generated_at'
    autocomplete_fields = ['disease', 'sector', 'locality', 'port', 'health_facility', 'event', 'outbreak', 'trigger_rule', 'assigned_to', 'evaluated_by', 'resolved_by']


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'disease', 'rule_type', 'alert_level', 'is_active', 'trigger_count', 'last_triggered']
    list_filter = ['rule_type', 'alert_level', 'is_active', 'is_system']
    search_fields = ['name', 'description', 'disease__name_ar']
    autocomplete_fields = ['disease']


@admin.register(AlertEvaluation)
class AlertEvaluationAdmin(admin.ModelAdmin):
    list_display = ['alert', 'evaluator', 'decision', 'risk_level', 'created_at']
    list_filter = ['decision', 'risk_level', 'created_at']
    search_fields = ['alert__alert_number', 'evaluator__username', 'justification']
    readonly_fields = ['created_at']


@admin.register(AlertNotification)
class AlertNotificationAdmin(admin.ModelAdmin):
    list_display = ['alert', 'channel', 'recipient', 'status', 'sent_at', 'delivered_at']
    list_filter = ['channel', 'status', 'sent_at']
    search_fields = ['alert__alert_number', 'recipient__username', 'recipient_contact']
    readonly_fields = ['created_at']


@admin.register(Outbreak)
class OutbreakAdmin(admin.ModelAdmin):
    list_display = [
        'outbreak_number', 'name', 'disease', 'status', 'severity',
        'sector', 'locality', 'total_cases', 'confirmed_cases', 'deaths',
        'detection_date', 'lead_epidemiologist'
    ]
    list_filter = ['status', 'severity', 'disease', 'sector', 'locality', 'mode']
    search_fields = ['outbreak_number', 'name', 'description', 'disease__name_ar']
    readonly_fields = ['outbreak_number', 'detection_date', 'created_at', 'updated_at']
    inlines = [OutbreakCaseInline, OutbreakResponseActionInline]
    date_hierarchy = 'detection_date'
    autocomplete_fields = ['disease', 'sector', 'locality', 'port', 'health_facility', 'origin_alert', 'lead_epidemiologist', 'response_coordinator', 'response_plan']


@admin.register(OutbreakCase)
class OutbreakCaseAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'case', 'role', 'generation', 'confirmed_at']
    list_filter = ['role', 'generation']
    search_fields = ['outbreak__outbreak_number', 'case__case_number']
    autocomplete_fields = ['outbreak', 'case', 'linked_to']


@admin.register(OutbreakContact)
class OutbreakContactAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'contact', 'priority', 'quarantine_start', 'quarantine_end']
    list_filter = ['priority']
    search_fields = ['outbreak__outbreak_number', 'contact__contact_number']
    autocomplete_fields = ['outbreak', 'contact']


@admin.register(OutbreakSpecimen)
class OutbreakSpecimenAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'specimen', 'is_representative', 'sequencing_done', 'variant']
    list_filter = ['is_representative', 'sequencing_done']
    search_fields = ['outbreak__outbreak_number', 'specimen__specimen_number']
    autocomplete_fields = ['outbreak', 'specimen']


@admin.register(OutbreakResponseAction)
class OutbreakResponseActionAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'action_type', 'title', 'status', 'assigned_to', 'planned_start', 'progress_percent']
    list_filter = ['action_type', 'status', 'effectiveness']
    search_fields = ['outbreak__outbreak_number', 'title', 'description']
    autocomplete_fields = ['outbreak', 'port', 'health_facility', 'responsible_team', 'assigned_to']


@admin.register(OutbreakResponseTeam)
class OutbreakResponseTeamAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'name', 'team_type', 'lead', 'is_active']
    list_filter = ['team_type', 'is_active']
    search_fields = ['outbreak__outbreak_number', 'name']
    autocomplete_fields = ['outbreak', 'lead']


@admin.register(OutbreakVectorFocus)
class OutbreakVectorFocusAdmin(admin.ModelAdmin):
    list_display = ['outbreak', 'vector_focus', 'is_primary', 'control_status']
    list_filter = ['is_primary', 'control_status']
    search_fields = ['outbreak__outbreak_number', 'vector_focus__focus_number']
    autocomplete_fields = ['outbreak', 'vector_focus']


@admin.register(HealthEvent)
class HealthEventAdmin(admin.ModelAdmin):
    list_display = ['event_number', 'title', 'event_type', 'status', 'priority', 'sector', 'affected_count', 'reported_at']
    list_filter = ['event_type', 'status', 'priority', 'sector', 'source']
    search_fields = ['event_number', 'title', 'description', 'suspected_disease__name_ar']
    readonly_fields = ['event_number', 'reported_at', 'created_at', 'updated_at']
    date_hierarchy = 'reported_at'
    autocomplete_fields = ['sector', 'locality', 'port', 'health_facility', 'suspected_disease', 'reported_by', 'investigation', 'outbreak']


@admin.register(EventReport)
class EventReportAdmin(admin.ModelAdmin):
    list_display = ['event', 'report_type', 'title', 'reported_by', 'reported_at']
    list_filter = ['report_type', 'reported_at']
    search_fields = ['event__event_number', 'title', 'content']
    autocomplete_fields = ['event', 'reported_by']


@admin.register(SurveillanceLocation)
class SurveillanceLocationAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'name_en', 'location_type', 'code', 'sector', 'locality', 'is_active', 'is_sentinel']
    list_filter = ['location_type', 'sector', 'locality', 'is_active', 'is_sentinel']
    search_fields = ['name_ar', 'name_en', 'code', 'address']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(HealthFacilitySurveillance)
class HealthFacilitySurveillanceAdmin(admin.ModelAdmin):
    list_display = ['facility', 'reporting_level', 'reporting_frequency', 'timeliness_rate', 'completeness_rate']
    list_filter = ['reporting_level', 'reporting_frequency', 'has_lab', 'has_isolation']
    search_fields = ['facility__name_ar', 'facility__name_en']
    autocomplete_fields = ['facility', 'contact_person', 'surveillance_diseases']


@admin.register(PortOfEntrySurveillance)
class PortOfEntrySurveillanceAdmin(admin.ModelAdmin):
    list_display = ['port', 'medical_officers', 'has_lab', 'travelers_screened_daily_avg', 'cases_detected']
    list_filter = ['has_lab', 'has_isolation_rooms', 'auto_alert_enabled']
    search_fields = ['port__name_ar', 'port__name_en']
    autocomplete_fields = ['port', 'target_diseases', 'referral_hospitals', 'quarantine_facilities']


class BaseReportAdmin(admin.ModelAdmin):
    list_display = ['report_number', 'title', 'report_type', 'period_start', 'period_end', 'status', 'prepared_by', 'submitted_at']
    list_filter = ['report_type', 'status', 'sector', 'locality']
    search_fields = ['report_number', 'title', 'description']
    readonly_fields = ['report_number', 'created_at', 'updated_at']
    inlines = [ReportLineInline]
    date_hierarchy = 'period_end'
    autocomplete_fields = ['sector', 'locality', 'health_facility', 'port', 'outbreak', 'investigation', 'prepared_by', 'reviewed_by', 'approved_by']


@admin.register(DailySurveillanceReport)
class DailySurveillanceReportAdmin(BaseReportAdmin):
    pass


@admin.register(WeeklySurveillanceReport)
class WeeklySurveillanceReportAdmin(BaseReportAdmin):
    pass


@admin.register(MonthlySurveillanceReport)
class MonthlySurveillanceReportAdmin(BaseReportAdmin):
    pass


@admin.register(OutbreakReport)
class OutbreakReportAdmin(BaseReportAdmin):
    list_display = ['report_number', 'title', 'sub_type', 'outbreak', 'period_start', 'period_end', 'status']
    list_filter = ['sub_type', 'status']
    autocomplete_fields = ['outbreak']


@admin.register(InvestigationReport)
class InvestigationReportAdmin(BaseReportAdmin):
    list_display = ['report_number', 'title', 'sub_type', 'investigation', 'period_start', 'period_end', 'status']
    list_filter = ['sub_type', 'status']
    autocomplete_fields = ['investigation']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'notification_type', 'priority', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'priority', 'is_read', 'created_at']
    search_fields = ['recipient__username', 'title', 'message', 'group_key']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'name_ar', 'is_active']
    list_filter = ['is_active', 'notification_type']
    search_fields = ['name_ar', 'name_en']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'daily_digest_enabled', 'daily_digest_time', 'critical_override_dnd']
    search_fields = ['user__username']


@admin.register(SurveillanceAuditLog)
class SurveillanceAuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'object_repr', 'severity', 'created_at']
    list_filter = ['action', 'severity', 'user_role', 'created_at']
    search_fields = ['user__username', 'object_repr', 'action_description']
    readonly_fields = ['created_at', 'user', 'action', 'object_repr', 'changes', 'old_values', 'new_values', 'metadata']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(VectorSurveillanceLink)
class VectorSurveillanceLinkAdmin(admin.ModelAdmin):
    list_display = ['health_case', 'outbreak', 'health_event', 'vector_focus', 'link_type', 'association_strength', 'status']
    list_filter = ['link_type', 'association_strength', 'status']
    search_fields = ['health_case__case_number', 'outbreak__outbreak_number', 'vector_focus__focus_number']
    autocomplete_fields = ['health_case', 'outbreak', 'health_event', 'vector_focus', 'vector_survey', 'vector_sample', 'vector_lab_result']


@admin.register(VectorAlertRule)
class VectorAlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'disease', 'vector_type', 'alert_type', 'alert_level', 'is_active', 'trigger_count']
    list_filter = ['alert_type', 'alert_level', 'is_active']
    search_fields = ['name', 'disease__name_ar', 'vector_type__name_ar']
    autocomplete_fields = ['disease', 'vector_type']


@admin.register(SurveillanceMapLayer)
class SurveillanceMapLayerAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'layer_key', 'layer_type', 'data_source', 'is_visible_by_default', 'is_active']
    list_filter = ['layer_type', 'data_source', 'is_active', 'is_public']
    search_fields = ['name_ar', 'name_en', 'layer_key']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(MapFeature)
class MapFeatureAdmin(admin.ModelAdmin):
    list_display = ['layer', 'feature_id', 'feature_type', 'label', 'data_timestamp']
    list_filter = ['layer', 'feature_type', 'is_realtime']
    search_fields = ['feature_id', 'label', 'properties']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(MapViewState)
class MapViewStateAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'is_default', 'zoom', 'last_accessed']
    search_fields = ['user__username', 'name']


@admin.register(SpatialAnalysis)
class SpatialAnalysisAdmin(admin.ModelAdmin):
    list_display = ['name', 'analysis_type', 'executed_by', 'status', 'executed_at']
    list_filter = ['analysis_type', 'status']
    search_fields = ['name', 'executed_by__username']
    readonly_fields = ['executed_at', 'created_at', 'updated_at']