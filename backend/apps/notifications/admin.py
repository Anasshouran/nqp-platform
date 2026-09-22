from django.contrib import admin

from .models import DeviceToken, NotificationLog, NotificationTemplate, WebPushSubscription


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'channel']
    list_filter = ['channel']
    search_fields = ['name', 'subject']


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'channel', 'status', 'created_at', 'sent_at']
    list_filter = ['channel', 'status']
    search_fields = ['recipient', 'subject']


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'platform', 'device_token']
    list_filter = ['platform']


@admin.register(WebPushSubscription)
class WebPushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['endpoint', 'user', 'created_at']
    search_fields = ['endpoint']
