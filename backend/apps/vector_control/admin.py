from django.contrib import admin

from .models import (
    InventoryMovement,
    OpChemicalLine,
    VectorAlert,
    VectorAttachment,
    VectorAuditLog,
    VectorCase,
    VectorChemical,
    VectorControlOperation,
    VectorEquipment,
    VectorFocus,
    VectorFollowUp,
    VectorInspection,
    VectorInventoryItem,
    VectorLabResult,
    VectorRegistry,
    VectorReport,
    VectorSample,
    VectorSequence,
    VectorSite,
    VectorSurvey,
    VectorTeam,
    VectorUnit,
)


@admin.register(VectorSequence)
class VectorSequenceAdmin(admin.ModelAdmin):
    list_display = ('scope', 'last')
    search_fields = ('scope',)


@admin.register(VectorRegistry)
class VectorRegistryAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'vector_type', 'species', 'disease_risk', 'is_active')
    list_filter = ('vector_type', 'is_active')
    search_fields = ('name_ar', 'species')


@admin.register(VectorUnit)
class VectorUnitAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'kind', 'sector', 'is_active')
    list_filter = ('kind', 'is_active')
    search_fields = ('name_ar', 'code')


@admin.register(VectorSite)
class VectorSiteAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'entry_point', 'site_type', 'is_active')
    list_filter = ('site_type', 'is_active')
    search_fields = ('name_ar', 'entry_point__name_ar')


@admin.register(VectorTeam)
class VectorTeamAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'team_type', 'sector', 'leader', 'is_active')
    list_filter = ('team_type', 'is_active')
    search_fields = ('name_ar', 'code')


@admin.register(VectorReport)
class VectorReportAdmin(admin.ModelAdmin):
    list_display = ('report_number', 'report_type', 'entry_point', 'severity', 'status', 'reported_at')
    list_filter = ('report_type', 'severity', 'status')
    search_fields = ('report_number', 'problem_description', 'entry_point__name_ar')


@admin.register(VectorFocus)
class VectorFocusAdmin(admin.ModelAdmin):
    list_display = ('focus_number', 'entry_point', 'vector', 'severity', 'status', 'opened_at')
    list_filter = ('severity', 'status', 'water_source', 'origin')
    search_fields = ('focus_number', 'description', 'entry_point__name_ar')


@admin.register(VectorInspection)
class VectorInspectionAdmin(admin.ModelAdmin):
    list_display = ('inspection_number', 'entry_point', 'inspector', 'purpose', 'findings_severity', 'status', 'visit_datetime')
    list_filter = ('purpose', 'findings_severity', 'status')
    search_fields = ('inspection_number', 'notes', 'entry_point__name_ar')


@admin.register(VectorSurvey)
class VectorSurveyAdmin(admin.ModelAdmin):
    list_display = ('survey_number', 'entry_point', 'vector', 'area', 'survey_date', 'density', 'proposed_risk', 'status')
    list_filter = ('density', 'proposed_risk', 'status', 'method')
    search_fields = ('survey_number', 'area', 'entry_point__name_ar')


@admin.register(VectorSample)
class VectorSampleAdmin(admin.ModelAdmin):
    list_display = ('sample_number', 'entry_point', 'vector', 'stage', 'status', 'collected_at')
    list_filter = ('stage', 'status')
    search_fields = ('sample_number', 'condition_note')


@admin.register(VectorLabResult)
class VectorLabResultAdmin(admin.ModelAdmin):
    list_display = ('sample', 'species_identified', 'result', 'status', 'analyst', 'analyzed_at')
    list_filter = ('result', 'status', 'identification_method')
    search_fields = ('species_identified', 'sample__sample_number')


@admin.register(VectorChemical)
class VectorChemicalAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'active_ingredient', 'form', 'target', 'hazard_class', 'min_stock', 'is_active')
    list_filter = ('form', 'target', 'hazard_class', 'is_active')
    search_fields = ('name_ar', 'active_ingredient')


@admin.register(VectorEquipment)
class VectorEquipmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'kind', 'status', 'quantity', 'assigned_team')
    list_filter = ('kind', 'status', 'is_active')
    search_fields = ('name_ar', 'code', 'model')


@admin.register(VectorInventoryItem)
class VectorInventoryItemAdmin(admin.ModelAdmin):
    list_display = ('chemical', 'entry_point', 'batch_number', 'quantity', 'unit', 'expiry_date', 'received_date')
    list_filter = ('chemical',)
    search_fields = ('batch_number', 'chemical__name_ar')


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ('item', 'movement_type', 'quantity', 'unit', 'performed_by', 'performed_at')
    list_filter = ('movement_type',)
    search_fields = ('item__batch_number', 'reference')


@admin.register(VectorControlOperation)
class VectorControlOperationAdmin(admin.ModelAdmin):
    list_display = ('op_number', 'operation_type', 'entry_point', 'focus', 'team', 'status', 'started_at')
    list_filter = ('operation_type', 'status')
    search_fields = ('op_number', 'notes', 'entry_point__name_ar')


@admin.register(OpChemicalLine)
class OpChemicalLineAdmin(admin.ModelAdmin):
    list_display = ('operation', 'chemical', 'quantity_used', 'unit', 'area_covered')
    search_fields = ('operation__op_number', 'chemical__name_ar')


@admin.register(VectorFollowUp)
class VectorFollowUpAdmin(admin.ModelAdmin):
    list_display = ('followup_number', 'focus', 'operation', 'controlled', 'recommend_retreatment', 'status', 'visit_datetime')
    list_filter = ('status', 'controlled', 'recommend_retreatment')
    search_fields = ('followup_number', 'focus__focus_number', 'findings')


@admin.register(VectorCase)
class VectorCaseAdmin(admin.ModelAdmin):
    list_display = ('case_number', 'focus', 'disease', 'classification', 'detected_at')
    list_filter = ('classification',)
    search_fields = ('case_number', 'disease', 'patient_ref')


@admin.register(VectorAlert)
class VectorAlertAdmin(admin.ModelAdmin):
    list_display = ('title_ar', 'alert_type', 'severity', 'is_read', 'created_at')
    list_filter = ('alert_type', 'severity', 'is_read')
    search_fields = ('title_ar', 'body')


@admin.register(VectorAttachment)
class VectorAttachmentAdmin(admin.ModelAdmin):
    list_display = ('file', 'caption', 'content_type', 'uploaded_by', 'created_at')


@admin.register(VectorAuditLog)
class VectorAuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'model_name', 'user', 'created_at')
    search_fields = ('action', 'model_name')