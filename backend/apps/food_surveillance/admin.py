from django.contrib import admin

from .models import CorrectiveAction, FoodAlert, FoodEstablishment, FoodRecall, NonConformity, RiskAssessment


@admin.register(FoodAlert)
class FoodAlertAdmin(admin.ModelAdmin):
    list_display = ['alert_number', 'title', 'reason', 'risk_level', 'status', 'raised_at']
    list_filter = ['status', 'risk_level', 'reason']
    search_fields = ['title', 'alert_number', 'product']


@admin.register(FoodEstablishment)
class FoodEstablishmentAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'establishment_type', 'region', 'risk_level', 'active']
    list_filter = ['establishment_type', 'risk_level', 'active']
    search_fields = ['name_ar', 'name_en']


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['assessment_type', 'target_name', 'score', 'risk_level', 'assessed_at']
    list_filter = ['assessment_type', 'risk_level']


@admin.register(NonConformity)
class NonConformityAdmin(admin.ModelAdmin):
    list_display = ['nc_number', 'product', 'source', 'status', 'risk_level', 'reported_at']
    list_filter = ['status', 'source', 'risk_level']
    search_fields = ['nc_number', 'product', 'supplier']


@admin.register(CorrectiveAction)
class CorrectiveActionAdmin(admin.ModelAdmin):
    list_display = ['non_conformity', 'action', 'status', 'responsible', 'due_date']


@admin.register(FoodRecall)
class FoodRecallAdmin(admin.ModelAdmin):
    list_display = ['recall_number', 'product', 'recall_type', 'status', 'risk_level', 'decided_at']
    list_filter = ['status', 'recall_type', 'risk_level']