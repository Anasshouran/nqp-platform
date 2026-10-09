from django.contrib import admin

from .models import DeveloperApp, Organization, IntegrationLog, WebhookEndpoint


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_en', 'org_type', 'status', 'is_active', 'created_at']
    list_filter = ['org_type', 'status', 'is_active']
    search_fields = ['code', 'name_en', 'name_ar']


@admin.register(IntegrationLog)
class IntegrationLogAdmin(admin.ModelAdmin):
    list_display = ['integration_name', 'request_type', 'status_code', 'request_timestamp']
    list_filter = ['integration_name', 'status_code']
    search_fields = ['integration_name', 'request_type']


@admin.register(DeveloperApp)
class DeveloperAppAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['api_key']


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ['app', 'event_type', 'endpoint_url', 'is_active']
    list_filter = ['event_type', 'is_active']
    search_fields = ['event_type', 'endpoint_url']
