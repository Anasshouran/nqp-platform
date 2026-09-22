from django.contrib import admin

from .models import ITAsset, ItSystem, NetworkStatus, SupportTicket


@admin.register(ItSystem)
class ItSystemAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'status', 'request_count', 'last_checked_at', 'sector']
    list_filter = ['status', 'sector']
    search_fields = ['code', 'name', 'name_ar']


@admin.register(ITAsset)
class ITAssetAdmin(admin.ModelAdmin):
    list_display = ['name', 'asset_type', 'serial_number', 'status', 'entry_point', 'sector']
    list_filter = ['asset_type', 'status', 'sector']
    search_fields = ['name', 'serial_number', 'location']


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_no', 'subject', 'priority', 'status', 'created_by', 'assigned_to', 'created_at']
    list_filter = ['priority', 'status', 'sector']
    search_fields = ['ticket_no', 'subject', 'description']


@admin.register(NetworkStatus)
class NetworkStatusAdmin(admin.ModelAdmin):
    list_display = ['entry_point', 'connected', 'ping_ms', 'last_sync', 'sector']
    list_filter = ['connected', 'sector']