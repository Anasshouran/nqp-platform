from django.contrib import admin

from .models import DiseaseMaster, WHOSyncLog, WHOICDMapping, WHOIntegration


@admin.register(WHOIntegration)
class WHOIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'environment', 'authentication_type', 'is_active', 'last_sync_at', 'last_success_at']
    list_filter = ['environment', 'authentication_type', 'is_active']


@admin.register(WHOSyncLog)
class WHOSyncLogAdmin(admin.ModelAdmin):
    list_display = ['operation', 'status', 'direction', 'http_status', 'started_at', 'completed_at']
    list_filter = ['operation', 'status', 'direction']
    search_fields = ['local_ref', 'remote_ref', 'request_id']


@admin.register(DiseaseMaster)
class DiseaseMasterAdmin(admin.ModelAdmin):
    list_display = ['disease', 'is_notifiable', 'reporting_timeline', 'mapped_at', 'last_synced_at']
    list_filter = ['is_notifiable']
    search_fields = ['disease__name_ar', 'disease__name_en']


@admin.register(WHOICDMapping)
class WHOICDMappingAdmin(admin.ModelAdmin):
    list_display = [
        'disease', 'who_release', 'icd_11_code', 'title_en', 'mapping_status',
        'match_type', 'confidence', 'is_current', 'updated_at',
    ]
    list_filter = ['mapping_status', 'match_type', 'is_current', 'who_release']
    search_fields = ['disease__name_ar', 'disease__name_en', 'icd_11_code', 'title_en', 'title_ar']
    ordering = ['-updated_at']