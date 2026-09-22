from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityLogViewSet,
    AlertViewSet,
    AuditLogViewSet,
    BackupViewSet,
    DashboardViewSet,
    DatabaseViewSet,
    DisasterRecoveryPlanViewSet,
    DbPermissionViewSet,
    DbRoleViewSet,
    DbUserViewSet,
    MaintenanceJobViewSet,
    PerformanceMetricViewSet,
    QueryStatisticViewSet,
    ReplicationNodeViewSet,
    RestoreHistoryViewSet,
    SchemaViewSet,
    SecurityPolicyViewSet,
    SettingViewSet,
    StorageUsageViewSet,
)

router = DefaultRouter()
router.register('dashboard', DashboardViewSet, basename='db-dashboard')
router.register('databases', DatabaseViewSet, basename='db-database')
router.register('schemas', SchemaViewSet, basename='db-schema')
router.register('roles', DbRoleViewSet, basename='db-role')
router.register('users', DbUserViewSet, basename='db-user')
router.register('permissions', DbPermissionViewSet, basename='db-permission')
router.register('backups', BackupViewSet, basename='db-backup')
router.register('restores', RestoreHistoryViewSet, basename='db-restore')
router.register('replication', ReplicationNodeViewSet, basename='db-replication')
router.register('performance', PerformanceMetricViewSet, basename='db-performance')
router.register('queries', QueryStatisticViewSet, basename='db-query')
router.register('storage', StorageUsageViewSet, basename='db-storage')
router.register('maintenance', MaintenanceJobViewSet, basename='db-maintenance')
router.register('alerts', AlertViewSet, basename='db-alert')
router.register('audit-logs', AuditLogViewSet, basename='db-audit')
router.register('activity-logs', ActivityLogViewSet, basename='db-activity')
router.register('settings', SettingViewSet, basename='db-setting')
router.register('security-policies', SecurityPolicyViewSet, basename='db-security')
router.register('disaster-recovery', DisasterRecoveryPlanViewSet, basename='db-dr')

urlpatterns = [
    path('', include(router.urls)),
]