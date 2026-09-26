import logging

import httpx
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import ActionPermissionMixin, PermissionAction

logger = logging.getLogger(__name__)

from .clients.base_client import WHOClientError
from .clients.icd_client import ICD11Client
from .models import DiseaseMaster, WHOSyncLog, WHOICDMapping, WHOIntegration
from .serializers import (
    DiseaseMasterSerializer,
    DiseaseSyncSerializer,
    WHOICDMappingReviewSerializer,
    WHOIntegrationSerializer,
    WHOSyncLogSerializer,
)
from .services.mapping_service import (
    MappingTransitionError,
    approve_mapping,
    create_mapping_proposal,
    reject_mapping,
    submit_mapping_for_review,
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


class WHOICDMappingViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """مراجعة خرائط ربط الأمراض بأكواد ICD-11.

    سير العمل: اقتراح → مراجعة → اعتماد / رفض (قرار بشري دائم).
    لا يُعدَّل Disease من هنا، ولا توجد موافقة تلقائية.
    """

    serializer_class = WHOICDMappingReviewSerializer
    permission_classes = [permissions.IsAuthenticated, PermissionAction]
    permission_resource = 'who_mappings'
    action_permission_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'edit',
        'partial_update': 'edit',
        'destroy': 'delete',
        'propose': 'add',
        'review': 'review',
        'approve': 'approve',
        'reject': 'reject',
    }
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['source_query', 'title_en', 'title_ar', 'icd_11_code']
    filter_fields = ['disease', 'who_release', 'mapping_status', 'match_type', 'is_current', 'icd_11_code']
    ordering_fields = ['created_at', 'updated_at', 'confidence', 'who_release', 'icd_11_code']
    ordering = ['-updated_at']

    def get_queryset(self):
        return WHOICDMapping.objects.select_related('disease', 'reviewed_by').all()

    @staticmethod
    def _mapping_response(mapping, message, status_code=200):
        return Response(
            {'status': 'success', 'message': message, 'data': WHOICDMappingReviewSerializer(mapping).data},
            status=status_code,
        )

    @action(detail=False, methods=['post'], url_path='propose')
    def propose(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mapping = serializer.save()
        return self._mapping_response(mapping, 'أُنشئ اقتراح الربط وجاهز للمراجعة.', status_code=201)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        mapping = self.get_object()
        try:
            mapping = submit_mapping_for_review(mapping, user=request.user)
        except MappingTransitionError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return self._mapping_response(mapping, 'أُرسل الاقتراح للمراجعة.')

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        mapping = self.get_object()
        try:
            mapping = approve_mapping(mapping, user=request.user)
        except MappingTransitionError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return self._mapping_response(mapping, 'اعتُمد ربط ICD-11 وأصبح الحالي.')

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        mapping = self.get_object()
        try:
            mapping = reject_mapping(mapping, user=request.user)
        except MappingTransitionError as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=400)
        return self._mapping_response(mapping, 'رُفض اقتراح الربط.')


class WHOICDSearchPermission(PermissionAction):
    """بحث ICD-11 يتطلب صلاحية who_mappings:search."""

    def __init__(self):
        super().__init__(resource='who_mappings', action='search')


class WHOICDSearchViewSet(viewsets.ViewSet):
    """بحث قراءة-فقط في تصنيف ICD-11 (لا يُنشئ اقتراحاً ولا يعدّل Disease)."""

    permission_classes = [permissions.IsAuthenticated, WHOICDSearchPermission]

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response({'status': 'error', 'message': 'معامل q مطلوب للبحث.'}, status=400)

        integration = WHOIntegration.objects.filter(is_active=True).order_by('-last_success_at').first()
        if not integration:
            return Response({'status': 'error', 'message': 'لا يوجد تكامل WHO فعّال.'}, status=400)

        try:
            client = ICD11Client(
                base_url=integration.base_url,
                client_id=integration.client_id,
                client_secret=integration.client_secret,
            )
            results = client.search(query, language=request.query_params.get('language', 'en'))
        except (WHOClientError, httpx.HTTPError) as exc:
            logger.warning('WHO ICD-11 search failed for q=%r', query[:100])
            return Response({'status': 'error', 'message': 'فشل الاتصال بخدمة ICD-11.'}, status=502)
        return Response({'status': 'success', 'message': '', 'data': results or []})