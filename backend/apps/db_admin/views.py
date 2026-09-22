from django.db.models import Avg, Count, Max
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import PermissionAction
from core.utils.response import success_response

from .models import (
    ActivityLog,
    AuditLog,
    Backup,
    Database,
    DbAlert,
    DbPermission,
    DbRole,
    DbSchema,
    DbSetting,
    DbUser,
    DisasterRecoveryPlan,
    MaintenanceJob,
    PerformanceMetric,
    QueryStatistic,
    ReplicationNode,
    RestoreHistory,
    SecurityPolicy,
    StorageUsage,
)
from .serializers import (
    ActivityLogSerializer,
    AuditLogSerializer,
    BackupSerializer,
    BackupWriteSerializer,
    DatabaseSerializer,
    DatabaseWriteSerializer,
    DbAlertSerializer,
    DbAlertWriteSerializer,
    DbDashboardSerializer,
    DbPermissionSerializer,
    DbRoleSerializer,
    DbRoleWriteSerializer,
    DbSchemaSerializer,
    DbSettingSerializer,
    DbUserSerializer,
    DbUserWriteSerializer,
    DisasterRecoveryPlanSerializer,
    MaintenanceJobSerializer,
    MaintenanceJobWriteSerializer,
    PerformanceMetricSerializer,
    QueryStatisticSerializer,
    ReplicationNodeSerializer,
    ReplicationNodeWriteSerializer,
    RestoreHistorySerializer,
    SecurityPolicySerializer,
    StorageUsageSerializer,
)


ACTION_TO_PERMISSION = {
    'list': 'view',
    'retrieve': 'view',
    'create': 'add',
    'update': 'edit',
    'partial_update': 'edit',
    'destroy': 'delete',
    'overview': 'view',
    'toggle-status': 'edit',
    'restore': 'edit',
    'run': 'edit',
    'failover': 'edit',
    'switchover': 'edit',
    'latest': 'view',
    'slow': 'view',
    'acknowledge': 'edit',
    'resolve': 'edit',
    'test': 'edit',
}


class DbAdminPermissionMixin:
    """يفرض صلاحيات `db_admin:action` على كل واجهات إدارة قاعدة البيانات."""

    permission_resource = 'db_admin'
    permission_classes = [PermissionAction]

    def get_permissions(self):
        action = self.action or 'list'
        self.permission_action = ACTION_TO_PERMISSION.get(action, 'view')
        return super().get_permissions()


class DashboardViewSet(DbAdminPermissionMixin, viewsets.GenericViewSet):
    permission_resource = 'db_admin'
    filter_backends = [OrderingFilter]
    serializer_class = DbDashboardSerializer

    @action(detail=False, methods=['get'])
    def overview(self, request):
        databases = Database.objects.all()
        total_size = databases.aggregate(total=Avg('size_mb'))['total'] or 0
        online = databases.filter(status=Database.DbStatus.ONLINE).count()
        metric = PerformanceMetric.objects.order_by('-recorded_at').first()
        data = {
            'database_count': databases.count(),
            'online_count': online,
            'offline_count': databases.filter(status=Database.DbStatus.OFFLINE).count(),
            'total_size_mb': round(total_size, 2),
            'db_user_count': DbUser.objects.count(),
            'db_role_count': DbRole.objects.count(),
            'active_connections': DbUser.objects.filter(is_active=True).count(),
            'backup_total': Backup.objects.count(),
            'last_backup_status': Backup.objects.order_by('-started_at').values_list('status', flat=True).first(),
            'replication_active': ReplicationNode.objects.filter(status=ReplicationNode.NodeStatus.ACTIVE).count(),
            'replication_total': ReplicationNode.objects.count(),
            'critical_alerts': DbAlert.objects.filter(status=DbAlert.AlertStatus.NEW, severity__in=['HIGH', 'CRITICAL']).count(),
            'total_alerts': DbAlert.objects.filter(status=DbAlert.AlertStatus.NEW).count(),
            'maintenance_due': MaintenanceJob.objects.filter(status=MaintenanceJob.JobStatus.SCHEDULED).count(),
            'performance': {
                'cpu': metric.cpu_usage if metric else 0,
                'memory': metric.memory_usage if metric else 0,
                'connections': metric.connections if metric else 0,
                'cache_hit': metric.cache_hit_ratio if metric else 0,
                'locks': metric.locks_count if metric else 0,
            },
        }
        return Response(success_response(data))


class DatabaseViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = Database.objects.annotate(
        schema_count=Count('schemas', distinct=True),
        backup_count=Count('backups', distinct=True),
    ).select_related('primary').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'host', 'engine', 'version']
    ordering_fields = ['name', 'size_mb', 'created_at']
    filter_fields = ['db_type', 'status', 'is_active']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DatabaseWriteSerializer
        return DatabaseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        database = serializer.save()
        return Response(
            success_response(DatabaseSerializer(database).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        database = serializer.save()
        return Response(success_response(DatabaseSerializer(database).data))

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        database = self.get_object()
        database.is_active = not database.is_active
        database.save(update_fields=['is_active'])
        return Response(success_response(DatabaseSerializer(database).data))


class SchemaViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbSchema.objects.select_related('database').all()
    serializer_class = DbSchemaSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'size_mb', 'object_count']
    filter_fields = ['database', 'name', 'is_active']


class DbRoleViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbRole.objects.annotate(
        user_count=Count('db_users', distinct=True),
        permission_count=Count('db_permissions', distinct=True),
    ).all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name', 'name_ar', 'description']
    ordering_fields = ['code']
    filter_fields = ['is_active', 'is_superuser']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DbRoleWriteSerializer
        return DbRoleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            success_response(DbRoleSerializer(role).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(success_response(DbRoleSerializer(role).data))


class DbUserViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbUser.objects.select_related('db_role').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['username', 'full_name', 'email']
    ordering_fields = ['username', 'created_at']
    filter_fields = ['db_role', 'is_active', 'is_superuser']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DbUserWriteSerializer
        return DbUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        db_user = serializer.save()
        return Response(
            success_response(DbUserSerializer(db_user).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        db_user = serializer.save()
        return Response(success_response(DbUserSerializer(db_user).data))


class DbPermissionViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbPermission.objects.select_related(
        'db_role', 'database', 'schema'
    ).all()
    serializer_class = DbPermissionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['table_name', 'db_role__code']
    ordering_fields = ['db_role__code', 'database__name', 'table_name']
    filter_fields = ['db_role', 'database', 'schema', 'action', 'granted']


class BackupViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = Backup.objects.select_related('database').all()
    http_method_names = ['get', 'post', 'patch']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['database__name', 'file_path', 'created_by']
    ordering_fields = ['started_at', 'size_mb']
    filter_fields = ['database', 'backup_type', 'status', 'storage']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BackupWriteSerializer
        return BackupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        backup = serializer.save(
            created_by=request.user.full_name if request.user.is_authenticated else 'system',
            status=Backup.BackupStatus.COMPLETED,
            size_mb=request.data.get('size_mb', 0),
            completed_at=timezone.now(),
        )
        return Response(
            success_response(BackupSerializer(backup).data),
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        backup = self.get_object()
        target = request.data.get('target_database', backup.database.name)
        restore = RestoreHistory.objects.create(
            backup=backup,
            database=backup.database,
            target_database=target,
            status='completed',
            restored_by=request.user.full_name if request.user.is_authenticated else 'Admin',
            completed_at=timezone.now(),
            notes=request.data.get('notes', ''),
        )
        # automatic re-seed via a hook would require DB privileges; this is a manual audit record
        return Response(
            success_response(RestoreHistorySerializer(restore).data),
            status=status.HTTP_201_CREATED,
        )


class RestoreHistoryViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = RestoreHistory.objects.select_related('backup', 'database', 'backup__database').all()
    serializer_class = RestoreHistorySerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['database__name', 'target_database', 'restored_by']
    ordering_fields = ['started_at']
    filter_fields = ['database', 'backup', 'status']


class ReplicationNodeViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = ReplicationNode.objects.select_related('database', 'role').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'host', 'database__name']
    ordering_fields = ['name', 'replication_lag_seconds']
    filter_fields = ['database', 'node_type', 'sync_mode', 'status', 'is_active']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ReplicationNodeWriteSerializer
        return ReplicationNodeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        node = serializer.save()
        return Response(
            success_response(ReplicationNodeSerializer(node).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        node = serializer.save()
        return Response(success_response(ReplicationNodeSerializer(node).data))

    @action(detail=True, methods=['post'], url_path='failover')
    def failover(self, request, pk=None):
        node = self.get_object()
        db = node.database
        db.status = Database.DbStatus.DEGRADED
        db.save(update_fields=['status'])
        node.status = ReplicationNode.NodeStatus.ACTIVE
        node.replication_lag_seconds = 0
        node.save(update_fields=['status', 'replication_lag_seconds'])
        return Response(success_response({'message': 'تم التبديل إلى العقدة', 'node': node.name}))

    @action(detail=True, methods=['post'], url_path='switchover')
    def switchover(self, request, pk=None):
        node = self.get_object()
        node.status = ReplicationNode.NodeStatus.ACTIVE
        node.save(update_fields=['status'])
        return Response(success_response({'message': 'تمت عملية التبديل بنجاح'}))


class PerformanceMetricViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PerformanceMetric.objects.select_related('database').all()
    serializer_class = PerformanceMetricSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['database__name']
    ordering_fields = ['recorded_at']
    filter_fields = ['database']

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        db_id = request.query_params.get('database')
        qs = PerformanceMetric.objects.select_related('database').order_by('-recorded_at')
        if db_id:
            qs = qs.filter(database_id=db_id)
        metrics = qs[:24]
        return Response(success_response(PerformanceMetricSerializer(metrics, many=True).data))


class QueryStatisticViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = QueryStatistic.objects.select_related('database').all()
    serializer_class = QueryStatisticSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['query_text']
    ordering_fields = ['total_time_ms', 'mean_time_ms', 'calls', 'rows']
    filter_fields = ['database', 'is_slow', 'is_indexed']

    @action(detail=False, methods=['get'], url_path='slow')
    def slow(self, request):
        db_id = request.query_params.get('database')
        qs = QueryStatistic.objects.select_related('database').filter(is_slow=True).order_by('-mean_time_ms')[:20]
        if db_id:
            qs = qs.filter(database_id=db_id)
        return Response(success_response(QueryStatisticSerializer(qs, many=True).data))


class StorageUsageViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = StorageUsage.objects.select_related('database').all()
    serializer_class = StorageUsageSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['table_name', 'schema_name', 'database__name']
    ordering_fields = ['table_size_mb', 'rows_count']
    filter_fields = ['database', 'schema_name']


class MaintenanceJobViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = MaintenanceJob.objects.select_related('database', 'created_by').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'database__name', 'last_result']
    ordering_fields = ['next_run_at', 'created_at']
    filter_fields = ['database', 'job_type', 'frequency', 'status', 'is_active']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MaintenanceJobWriteSerializer
        return MaintenanceJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(
            success_response(MaintenanceJobSerializer(job).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(success_response(MaintenanceJobSerializer(job).data))

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, pk=None):
        job = self.get_object()
        job.status = MaintenanceJob.JobStatus.COMPLETED
        job.last_run_at = timezone.now()
        job.last_result = 'تم تنفيذ {0} بنجاح على {1}'.format(
            job.get_job_type_display(), job.database.name
        )
        job.save(update_fields=['status', 'last_run_at', 'last_result'])
        return Response(success_response(MaintenanceJobSerializer(job).data))


class AlertViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbAlert.objects.select_related('database', 'acknowledged_by', 'resolved_by').all()
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['title', 'message', 'database__name']
    ordering_fields = ['created_at', 'severity']
    filter_fields = ['database', 'alert_type', 'severity', 'status']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DbAlertWriteSerializer
        return DbAlertSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        return Response(
            success_response(DbAlertSerializer(alert).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        return Response(success_response(DbAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='acknowledge')
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = DbAlert.AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = request.user if request.user.is_authenticated else None
        alert.acknowledged_at = timezone.now()
        alert.save(update_fields=['status', 'acknowledged_by', 'acknowledged_at'])
        return Response(success_response(DbAlertSerializer(alert).data))

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = DbAlert.AlertStatus.RESOLVED
        alert.resolved_by = request.user if request.user.is_authenticated else None
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['status', 'resolved_by', 'resolved_at'])
        return Response(success_response(DbAlertSerializer(alert).data))


class AuditLogViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['action', 'resource_type', 'user__email']
    ordering_fields = ['created_at']
    filter_fields = ['action', 'resource_type', 'success', 'user']


class ActivityLogViewSet(DbAdminPermissionMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related('user').all()
    serializer_class = ActivityLogSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['description', 'activity_type', 'user__email']
    ordering_fields = ['performed_at']
    filter_fields = ['activity_type', 'user']


class SettingViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DbSetting.objects.all()
    serializer_class = DbSettingSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['key', 'label', 'value']
    ordering_fields = ['key']
    filter_fields = ['group', 'is_active']


class SecurityPolicyViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = SecurityPolicy.objects.all()
    serializer_class = SecurityPolicySerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    filter_fields = ['is_active']


class DisasterRecoveryPlanViewSet(DbAdminPermissionMixin, viewsets.ModelViewSet):
    queryset = DisasterRecoveryPlan.objects.all()
    serializer_class = DisasterRecoveryPlanSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name', 'description', 'backup_site']
    ordering_fields = ['name']
    filter_fields = ['status', 'is_active']

    @action(detail=True, methods=['post'], url_path='test')
    def test(self, request, pk=None):
        plan = self.get_object()
        plan.status = DisasterRecoveryPlan.PlanStatus.IN_TEST
        plan.tested_at = timezone.now()
        plan.save(update_fields=['status', 'tested_at'])
        return Response(success_response(DisasterRecoveryPlanSerializer(plan).data))