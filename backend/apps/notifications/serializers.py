from rest_framework import serializers

from .models import DeviceToken, NotificationLog, NotificationTemplate


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = ['id', 'name', 'subject', 'body_text', 'body_html', 'sms_body', 'channel']
        read_only_fields = ['id']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = ['id', 'user', 'template', 'channel', 'recipient', 'subject', 'body', 'status', 'is_read', 'read_at', 'sent_at', 'created_at', 'error_message']
        read_only_fields = ['id', 'sent_at']


class SendNotificationSerializer(serializers.Serializer):
    recipient = serializers.EmailField()
    channel = serializers.ChoiceField(choices=['email', 'sms', 'push', 'websocket'])
    subject = serializers.CharField(required=False, allow_blank=True)
    message = serializers.CharField()
    template = serializers.CharField(required=False, allow_blank=True)


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'device_token', 'platform']
        read_only_fields = ['id']
