from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import ActionPermissionMixin, PermissionAction

from .models import DiseaseMaster, WHOSyncLog, WHOIntegration
from .serializers import (
    DiseaseMasterSerializer,
    DiseaseSyncSerializer,
    WHOIntegrationSerializer,
    WHOSyncLogSerializer,
)

ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'status': 'view',
    'test': 'test',
    'sync': 'sync',
}


class WHOIntegrationViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """إدارة إعدادات الاتصال بمنظمة الصحة العالمية."""

    serializer_class = WHOIntegrationSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'who_integration'
    action_permission_map = ACTION_TO_PERMISSION
    queryset = WHOIntegration.objects.all()

    @action(detail=False, methods=['get'], url_path='status')
    def status(self, request):
        integration = WHOIntegration.objects.filter(is_active=True).first()
        if not integration:
            return Response({'status': 'success', 'message': '', 'data': {'connected': False, 'configured': False}})
        return Response({
            'status': 'success',
            'message': '',
            'data': {
                'configured': True,
                'connected': bool(integration.last_success_at),
                'environment': integration.environment,
                'last_sync_at': integration.last_sync_at,
                'last_success_at': integration.last_success_at,
                'last_error': integration.last_error,
            },
        })

    @action(detail=False, methods=['post'], url_path='test')
    def test(self, request):
        integration = WHOIntegration.objects.filter(is_active=True).first()
        if not integration:
            return Response({'status': 'error', 'message': 'لا يوجد تكامل WHO فعّال.'}, status=400)
        from apps.who.tasks import test_who_connection

        result = test_who_connection()
        return Response({'status': 'success', 'message': '' if result.get('connected') else 'فشل الاتصال.', 'data': result})

    @action(detail=False, methods=['post'], url_path='sync')
    def sync(self, request):
        integration = WHOIntegration.objects.filter(is_active=True).first()
        if not integration:
            return Response({'status': 'error', 'message': 'لا يوجد تكامل WHO فعّال.'}, status=400)
        from apps.who.tasks import sync_who_diseases

        task = sync_who_diseases.delay()
        integration.last_sync_at = timezone.now()
        integration.save(update_fields=['last_sync_at'])
        return Response({'status': 'success', 'message': 'جُدولت المزامنة.', 'data': {'task_id': task.id}})


class WHOSyncLogViewSet(ActionPermissionMixin, viewsets.ReadOnlyModelViewSet):
    """سجلات مزامنة WHO."""

    serializer_class = WHOSyncLogSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'who_logs'
    queryset = WHOSyncLog.objects.select_related('integration').order_by('-started_at').all()

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        operation = self.request.query_params.get('operation')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if operation:
            qs = qs.filter(operation=operation)
        return qs


class DiseaseMasterViewSet(ActionPermissionMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = DiseaseMasterSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'who_diseases'
    action_permission_map = {**ACTION_TO_PERMISSION, 'sync': 'sync'}
    queryset = DiseaseMaster.objects.select_related('disease').order_by('disease__name_ar').all()

    @action(detail=False, methods=['post'])
    def sync(self, request):
        serializer = DiseaseSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        diseases = serializer.validated_data['diseases']
        for disease in diseases:
            DiseaseMaster.objects.update_or_create(disease=disease)
        return Response({'status': 'success', 'message': f'أُضيف {len(diseases)} مرض للخرائط.', 'data': []})