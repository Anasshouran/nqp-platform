from django.contrib import admin

from .models import RiskAssessment, RiskSettings


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['screening', 'risk_level', 'risk_score', 'recommendation', 'assessed_at']
    list_filter = ['risk_level', 'recommendation']


@admin.register(RiskSettings)
class RiskSettingsAdmin(admin.ModelAdmin):
    list_display = ['yellow_threshold', 'red_threshold', 'red_temp_threshold', 'red_spo2_threshold']
