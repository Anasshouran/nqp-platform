from rest_framework import serializers

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


class DbDashboardSerializer(serializers.Serializer):
    database_count = serializers.IntegerField()
    online_count = serializers.IntegerField()
    offline_count = serializers.IntegerField()
    total_size_mb = serializers.FloatField()
    db_user_count = serializers.IntegerField()
    db_role_count = serializers.IntegerField()
    active_connections = serializers.IntegerField()
    backup_total = serializers.IntegerField()
    last_backup_status = serializers.CharField(allow_null=True)
    replication_active = serializers.IntegerField()
    replication_total = serializers.IntegerField()
    critical_alerts = serializers.IntegerField()
    total_alerts = serializers.IntegerField()
    maintenance_due = serializers.IntegerField()
    performance = serializers.DictField()


class DatabaseSerializer(serializers.ModelSerializer):
    primary_name = serializers.CharField(source='primary.name', read_only=True, default=None)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    schema_count = serializers.SerializerMethodField()
    backup_count = serializers.SerializerMethodField()

    class Meta:
        model = Database
        fields = [
            'id', 'name', 'description', 'db_type', 'version', 'host', 'port',
            'engine', 'status', 'status_label', 'size_mb', 'owner', 'primary',
            'primary_name', 'schema_count', 'backup_count', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_schema_count(self, obj):
        value = getattr(obj, 'schema_count', None)
        return value if value is not None else obj.schemas.count()

    def get_backup_count(self, obj):
        value = getattr(obj, 'backup_count', None)
        return value if value is not None else obj.backups.count()


class DatabaseWriteSerializer(serializers.ModelSerializer):
    primary = serializers.PrimaryKeyRelatedField(
        queryset=Database.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Database
        fields = [
            'id', 'name', 'description', 'db_type', 'version', 'host', 'port',
            'engine', 'status', 'size_mb', 'owner', 'primary', 'is_active',
        ]
        read_only_fields = ['id']


class DbSchemaSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)

    class Meta:
        model = DbSchema
        fields = [
            'id', 'database', 'database_name', 'name', 'description',
            'object_count', 'size_mb', 'last_analyzed_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DbRoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = DbRole
        fields = [
            'id', 'code', 'name', 'name_ar', 'description', 'is_superuser',
            'can_login', 'can_create_db', 'can_create_role', 'can_replicate',
            'is_active', 'user_count', 'permission_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        value = getattr(obj, 'user_count', None)
        return value if value is not None else obj.db_users.count()

    def get_permission_count(self, obj):
        value = getattr(obj, 'permission_count', None)
        return value if value is not None else obj.db_permissions.count()


class DbRoleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DbRole
        fields = [
            'id', 'code', 'name', 'name_ar', 'description', 'is_superuser',
            'can_login', 'can_create_db', 'can_create_role', 'can_replicate', 'is_active',
        ]
        read_only_fields = ['id']


class DbUserSerializer(serializers.ModelSerializer):
    role_code = serializers.CharField(source='db_role.code', read_only=True, default=None)
    role_name = serializers.CharField(source='db_role.name_ar', read_only=True, default=None)

    class Meta:
        model = DbUser
        fields = [
            'id', 'username', 'full_name', 'email', 'db_role', 'role_code',
            'role_name', 'is_superuser', 'connection_limit', 'last_login_at',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'password_hash': {'write_only': True}}


class DbUserWriteSerializer(serializers.ModelSerializer):
    db_role = serializers.SlugRelatedField(
        slug_field='code', queryset=DbRole.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = DbUser
        fields = [
            'id', 'username', 'full_name', 'email', 'db_role',
            'is_superuser', 'connection_limit', 'is_active',
        ]
        read_only_fields = ['id']


class DbPermissionSerializer(serializers.ModelSerializer):
    role_code = serializers.CharField(source='db_role.code', read_only=True)
    database_name = serializers.CharField(source='database.name', read_only=True)
    schema_name = serializers.CharField(source='schema.name', read_only=True, default=None)

    class Meta:
        model = DbPermission
        fields = [
            'id', 'db_role', 'role_code', 'database', 'database_name',
            'schema', 'schema_name', 'table_name', 'action', 'granted',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BackupSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)
    type_label = serializers.CharField(source='get_backup_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Backup
        fields = [
            'id', 'database', 'database_name', 'backup_type', 'type_label',
            'status', 'status_label', 'storage', 'started_at', 'completed_at',
            'size_mb', 'file_path', 'checksum', 'created_by', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'started_at', 'completed_at', 'size_mb', 'created_at', 'updated_at']


class BackupWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Backup
        fields = ['id', 'database', 'backup_type', 'storage', 'notes']
        read_only_fields = ['id']


class RestoreHistorySerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)
    backup_type = serializers.CharField(source='backup.backup_type', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RestoreHistory
        fields = [
            'id', 'backup', 'database', 'database_name', 'backup_type',
            'target_database', 'status', 'status_label', 'started_at',
            'completed_at', 'restored_by', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'started_at', 'completed_at', 'created_at', 'updated_at']


class ReplicationNodeSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    type_label = serializers.CharField(source='get_node_type_display', read_only=True)

    class Meta:
        model = ReplicationNode
        fields = [
            'id', 'database', 'database_name', 'name', 'node_type', 'type_label',
            'host', 'port', 'sync_mode', 'status', 'status_label',
            'replication_lag_seconds', 'current_lsn', 'role', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReplicationNodeWriteSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field='code', queryset=DbRole.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = ReplicationNode
        fields = [
            'id', 'database', 'name', 'node_type', 'host', 'port', 'sync_mode',
            'status', 'replication_lag_seconds', 'current_lsn', 'role', 'is_active',
        ]
        read_only_fields = ['id']


class MaintenanceJobSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)
    job_type_label = serializers.CharField(source='get_job_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)

    class Meta:
        model = MaintenanceJob
        fields = [
            'id', 'database', 'database_name', 'name', 'job_type', 'job_type_label',
            'frequency', 'scheduled_time', 'last_run_at', 'next_run_at', 'status',
            'status_label', 'last_result', 'created_by', 'created_by_name', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaintenanceJobWriteSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = MaintenanceJob
        fields = [
            'id', 'database', 'name', 'job_type', 'frequency', 'scheduled_time',
            'next_run_at', 'status', 'created_by', 'is_active',
        ]
        read_only_fields = ['id']


class PerformanceMetricSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)

    class Meta:
        model = PerformanceMetric
        fields = [
            'id', 'database', 'database_name', 'cpu_usage', 'memory_usage',
            'disk_io_read', 'disk_io_write', 'connections', 'cache_hit_ratio',
            'transaction_rate', 'locks_count', 'deadlocks_count', 'recorded_at',
        ]
        read_only_fields = ['id', 'recorded_at']


class QueryStatisticSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)

    class Meta:
        model = QueryStatistic
        fields = [
            'id', 'database', 'database_name', 'query_text', 'calls',
            'total_time_ms', 'mean_time_ms', 'rows', 'shared_hit_ratio',
            'is_slow', 'is_indexed', 'last_executed_at',
        ]
        read_only_fields = ['id']


class StorageUsageSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True)

    class Meta:
        model = StorageUsage
        fields = [
            'id', 'database', 'database_name', 'database_size_mb', 'schema_name',
            'table_name', 'table_size_mb', 'index_size_mb', 'rows_count',
            'bloat_estimate', 'recorded_at',
        ]
        read_only_fields = ['id', 'recorded_at']


class DbAlertSerializer(serializers.ModelSerializer):
    database_name = serializers.CharField(source='database.name', read_only=True, default=None)
    type_label = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_label = serializers.CharField(source='get_severity_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DbAlert
        fields = [
            'id', 'database', 'database_name', 'alert_type', 'type_label',
            'severity', 'severity_label', 'status', 'status_label', 'title',
            'message', 'acknowledged_by', 'acknowledged_at', 'resolved_by',
            'resolved_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DbAlertWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DbAlert
        fields = ['id', 'database', 'alert_type', 'severity', 'title', 'message']
        read_only_fields = ['id']


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'resource_type', 'resource_id',
            'details', 'ip_address', 'user_agent', 'success', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)
    type_label = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_email', 'activity_type', 'type_label',
            'description', 'details', 'ip_address', 'performed_at',
        ]
        read_only_fields = ['id', 'performed_at']


class DbSettingSerializer(serializers.ModelSerializer):
    group_label = serializers.CharField(source='get_group_display', read_only=True)

    class Meta:
        model = DbSetting
        fields = [
            'id', 'key', 'value', 'label', 'group', 'group_label',
            'is_encrypted', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SecurityPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityPolicy
        fields = [
            'id', 'name', 'description', 'ssl_enabled', 'encryption_enabled',
            'row_level_security', 'password_policy', 'ip_whitelist', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DisasterRecoveryPlanSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DisasterRecoveryPlan
        fields = [
            'id', 'name', 'description', 'recovery_time_objective',
            'recovery_point_objective', 'backup_site', 'procedures', 'status',
            'status_label', 'tested_at', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
