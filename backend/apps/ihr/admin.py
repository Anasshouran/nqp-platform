from django.contrib import admin

from .models import IHREvent, NationalFocalPoint, RiskAssessment, SPARAssessment, SPARIndicator


@admin.register(IHREvent)
class IHREventAdmin(admin.ModelAdmin):
    list_display = ['event_number', 'title', 'event_type', 'status', 'risk_level', 'disease', 'port', 'date_detected']
    list_filter = ['status', 'risk_level', 'event_type']
    search_fields = ['event_number', 'title', 'description']
    autocomplete_fields = ['disease', 'port', 'sector']


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['event', 'overall_risk', 'assessed_by', 'assessed_at']
    list_filter = ['overall_risk']


@admin.register(NationalFocalPoint)
class NationalFocalPointAdmin(admin.ModelAdmin):
    list_display = ['user', 'nfp_type', 'is_active', 'appointed_at']
    list_filter = ['nfp_type', 'is_active']


@admin.register(SPARIndicator)
class SPARIndicatorAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'max_score', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(SPARAssessment)
class SPARAssessmentAdmin(admin.ModelAdmin):
    list_display = ['year', 'indicator', 'score', 'assessed_by']
    list_filter = ['year']
    search_fields = ['indicator__name_ar']