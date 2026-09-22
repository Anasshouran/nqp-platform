from django.contrib import admin

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


@admin.register(Database)
class DatabaseAdmin(admin.ModelAdmin):
    list_display = ['name', 'db_type', 'version', 'status', 'size_mb', 'is_active']
    list_filter = ['db_type', 'status', 'is_active']
    search_fields = ['name', 'host']


@admin.register(DbSchema)
class DbSchemaAdmin(admin.ModelAdmin):
    list_display = ['name', 'database', 'object_count', 'size_mb']
    list_filter = ['database']


@admin.register(DbRole)
class DbRoleAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_superuser', 'is_active']
    search_fields = ['code', 'name']


@admin.register(DbUser)
class DbUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'full_name', 'db_role', 'is_active']
    search_fields = ['username', 'full_name', 'email']


@admin.register(DbPermission)
class DbPermissionAdmin(admin.ModelAdmin):
    list_display = ['db_role', 'database', 'table_name', 'action', 'granted']
    list_filter = ['action', 'granted', 'database']


@admin.register(Backup)
class BackupAdmin(admin.ModelAdmin):
    list_display = ['database', 'backup_type', 'status', 'storage', 'started_at', 'size_mb']
    list_filter = ['backup_type', 'status', 'storage']


@admin.register(RestoreHistory)
class RestoreHistoryAdmin(admin.ModelAdmin):
    list_display = ['database', 'backup', 'target_database', 'status', 'started_at']
    list_filter = ['status']


@admin.register(ReplicationNode)
class ReplicationNodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'database', 'node_type', 'sync_mode', 'status', 'replication_lag_seconds']
    list_filter = ['node_type', 'sync_mode', 'status']


@admin.register(MaintenanceJob)
class MaintenanceJobAdmin(admin.ModelAdmin):
    list_display = ['name', 'database', 'job_type', 'frequency', 'status', 'next_run_at']
    list_filter = ['job_type', 'frequency', 'status']


@admin.register(DbAlert)
class DbAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'database', 'alert_type', 'severity', 'status', 'created_at']
    list_filter = ['alert_type', 'severity', 'status']


@admin.register(DbSetting)
class DbSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'label', 'group', 'is_encrypted', 'is_active']
    list_filter = ['group', 'is_active']


@admin.register(SecurityPolicy)
class SecurityPolicyAdmin(admin.ModelAdmin):
    list_display = ['name', 'ssl_enabled', 'encryption_enabled', 'row_level_security', 'is_active']


@admin.register(DisasterRecoveryPlan)
class DisasterRecoveryPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'recovery_time_objective', 'tested_at', 'is_active']
    list_filter = ['status', 'is_active']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'user', 'resource_type', 'success', 'created_at']
    list_filter = ['action', 'success']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['activity_type', 'description', 'user', 'performed_at']
    list_filter = ['activity_type']