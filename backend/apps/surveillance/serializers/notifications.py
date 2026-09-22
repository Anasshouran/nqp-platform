from rest_framework import serializers

from apps.surveillance.models.notification import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
)


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'notification_type_display', 'priority',
                  'priority_display', 'recipient', 'title', 'message', 'action_url',
                  'action_label', 'channels', 'sent_channels', 'failed_channels',
                  'is_read', 'read_at', 'scheduled_at', 'sent_at', 'group_key',
                  'is_digest', 'object_id', 'created_at']
        read_only_fields = fields


class NotificationTemplateSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = ['id', 'notification_type', 'notification_type_display', 'name_ar',
                  'name_en', 'in_app_title_template', 'in_app_message_template',
                  'push_title_template', 'push_message_template', 'email_subject_template',
                  'email_body_template', 'sms_template', 'whatsapp_template',
                  'available_variables', 'default_channels', 'default_roles',
                  'condition_expression', 'is_active']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['id', 'user', 'enabled_types', 'disabled_types', 'preferred_channels',
                  'do_not_disturb_start', 'do_not_disturb_end', 'timezone',
                  'daily_digest_enabled', 'daily_digest_time', 'critical_override_dnd',
                  'role_based_enabled', 'assigned_only']
        read_only_fields = ['id', 'user']