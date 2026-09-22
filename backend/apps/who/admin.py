from django.contrib import admin

from .models import DiseaseMaster, WHOSyncLog, WHOIntegration


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