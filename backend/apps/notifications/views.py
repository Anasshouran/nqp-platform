from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import DeviceToken, NotificationLog, NotificationTemplate, WebPushSubscription
from .serializers import (
    DeviceTokenSerializer,
    NotificationLogSerializer,
    NotificationTemplateSerializer,
    SendNotificationSerializer,
)


class TemplateViewSet(viewsets.ModelViewSet):
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAdmin]
    search_fields = ['name']


class NotificationViewSet(viewsets.ViewSet):
    serializer_class = SendNotificationSerializer

    def get_permissions(self):
        if self.action in ('send',):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def send(self, request):
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        template = None
        if data.get('template'):
            template = NotificationTemplate.objects.filter(name=data['template']).first()
        log = NotificationLog.objects.create(
            user=request.user if request.user and request.user.is_authenticated else None,
            template=template,
            channel=data['channel'],
            recipient=data['recipient'],
            subject=data.get('subject', ''),
            body=data['message'],
            status=NotificationLog.NotificationStatus.PENDING,
        )
        if data['channel'] == 'push':
            from .tasks import broadcast_web_push

            ids = list(WebPushSubscription.objects.values_list('id', flat=True))
            broadcast_web_push.delay(
                ids,
                title=data.get('subject') or 'تنبيه منصة الحجر الصحي',
                body=data['message'],
                url='/services/tools',
            )
            log.error_message = f'queued for {len(ids)} subscriptions'
            log.save(update_fields=['status', 'error_message'])
        else:
            log.status = NotificationLog.NotificationStatus.SENT
            log.sent_at = timezone.now()
            log.save(update_fields=['status', 'sent_at'])
        return Response(
            success_response(NotificationLogSerializer(log).data),
            status=status.HTTP_201_CREATED,
        )

    def list(self, request):
        qs = NotificationLog.objects.filter(user=request.user).order_by('-created_at')
        if request.query_params.get('unread') in ('1', 'true', 'True'):
            qs = qs.filter(is_read=False)
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except (TypeError, ValueError):
            limit = 50
        return Response(success_response(NotificationLogSerializer(qs[:limit], many=True).data))

    def unread_count(self, request):
        count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
        return Response(success_response({'unread_count': count}))

    def mark_read(self, request, pk=None):
        log = get_object_or_404(NotificationLog, pk=pk, user=request.user)
        log.is_read = True
        log.read_at = timezone.now()
        log.save(update_fields=['is_read', 'read_at'])
        return Response(success_response(NotificationLogSerializer(log).data))

    def mark_all_read(self, request):
        updated = NotificationLog.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response(success_response({'marked': updated}))

    @action(detail=False, methods=['post'], url_path='device', serializer_class=DeviceTokenSerializer)
    def device(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token, _ = DeviceToken.objects.get_or_create(
            device_token=serializer.validated_data['device_token'],
            defaults={'user': request.user, 'platform': serializer.validated_data['platform']},
        )
        return Response(
            success_response(DeviceTokenSerializer(token).data),
            status=status.HTTP_201_CREATED,
        )
