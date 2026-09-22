from django.contrib import admin

from .models import (
    Disease,
    DiseaseCaseDefinition,
    LabResult,
    LabSample,
    Laboratory,
    TreatmentProtocol,
)


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ['icd_11_code', 'name_ar', 'name_en', 'ihr_category', 'is_public_health_emergency', 'is_active']
    list_filter = ['ihr_category', 'is_public_health_emergency', 'is_active']
    search_fields = ['icd_11_code', 'name_ar', 'name_en']


@admin.register(DiseaseCaseDefinition)
class DiseaseCaseDefinitionAdmin(admin.ModelAdmin):
    list_display = ['disease', 'case_type', 'version']
    list_filter = ['case_type']
    search_fields = ['disease__name_ar', 'disease__name_en']


@admin.register(TreatmentProtocol)
class TreatmentProtocolAdmin(admin.ModelAdmin):
    list_display = ['disease', 'name', 'severity_level', 'version', 'is_active']
    list_filter = ['severity_level', 'is_active']


@admin.register(LabSample)
class LabSampleAdmin(admin.ModelAdmin):
    list_display = ['sample_barcode', 'sample_type', 'status', 'collector', 'collected_at']
    list_filter = ['status', 'sample_type']
    search_fields = ['sample_barcode']


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ['sample', 'disease', 'result', 'approval_status', 'entered_by', 'result_date']
    list_filter = ['result', 'approval_status']
    search_fields = ['sample__sample_number', 'disease__name_ar']


@admin.register(Laboratory)
class LaboratoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'sector', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name_ar', 'name_en']
