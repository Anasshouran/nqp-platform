from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class Database(BaseModel):
    class DbType(models.TextChoices):
        POSTGRESQL = 'POSTGRESQL', 'PostgreSQL'
        MYSQL = 'MYSQL', 'MySQL'
        ORACLE = 'ORACLE', 'Oracle'
        SQLSERVER = 'SQLSERVER', 'SQL Server'

    class DbStatus(models.TextChoices):
        ONLINE = 'ONLINE', 'متصل'
        OFFLINE = 'OFFLINE', 'غير متصل'
        DEGRADED = 'DEGRADED', 'منخفض الأداء'
        STARTING = 'STARTING', 'قيد التشغيل'
        STOPPED = 'STOPPED', 'متوقف'

    name = models.CharField(max_length=100, unique=True, verbose_name='اسم قاعدة البيانات')
    description = models.TextField(blank=True, verbose_name='الوصف')
    db_type = models.CharField(max_length=20, choices=DbType.choices, default=DbType.POSTGRESQL, verbose_name='النوع')
    version = models.CharField(max_length=30, blank=True, verbose_name='الإصدار')
    host = models.CharField(max_length=255, blank=True, verbose_name='المضيف')
    port = models.IntegerField(default=5432, verbose_name='المنفذ')
    engine = models.CharField(max_length=100, blank=True, verbose_name='محرك التخزين')
    status = models.CharField(max_length=20, choices=DbStatus.choices, default=DbStatus.ONLINE, verbose_name='الحالة')
    size_mb = models.FloatField(default=0, verbose_name='الحجم (م.ب)')
    owner = models.CharField(max_length=100, blank=True, verbose_name='المالك')
    primary = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='replicas', verbose_name='القاعدة الأساسية',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشطة')

    class Meta:
        ordering = ['name']
        verbose_name = 'قاعدة بيانات'
        verbose_name_plural = 'قواعد البيانات'

    def __str__(self):
        return self.name


class DbSchema(BaseModel):
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='schemas', verbose_name='قاعدة البيانات'
    )
    name = models.CharField(max_length=100, verbose_name='الاسم')
    description = models.TextField(blank=True, verbose_name='الوصف')
    object_count = models.PositiveIntegerField(default=0, verbose_name='عدد الكائنات')
    size_mb = models.FloatField(default=0, verbose_name='الحجم (م.ب)')
    last_analyzed_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تحليل')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['database__name', 'name']
        unique_together = ['database', 'name']
        verbose_name = 'مخطط'
        verbose_name_plural = 'المخططات'

    def __str__(self):
        return f'{self.database.name}.{self.name}'


class DbRole(BaseModel):
    code = models.CharField(max_length=50, unique=True, verbose_name='الكود')
    name = models.CharField(max_length=100, verbose_name='الاسم')
    name_ar = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالعربية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    is_superuser = models.BooleanField(default=False, verbose_name='صلاحيات سوبر')
    can_login = models.BooleanField(default=True, verbose_name='يمكنه الدخول')
    can_create_db = models.BooleanField(default=False, verbose_name='إنشاء قواعد')
    can_create_role = models.BooleanField(default=False, verbose_name='إنشاء أدوار')
    can_replicate = models.BooleanField(default=False, verbose_name='نسخ')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        verbose_name = 'دور قاعدة'
        verbose_name_plural = 'أدوار قواعد البيانات'

    def __str__(self):
        return self.code


class DbUser(BaseModel):
    username = models.CharField(max_length=100, unique=True, verbose_name='اسم المستخدم')
    full_name = models.CharField(max_length=150, blank=True, verbose_name='الاسم الكامل')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    db_role = models.ForeignKey(
        DbRole, on_delete=models.PROTECT, related_name='db_users', null=True,
        blank=True, verbose_name='الدور',
    )
    password_hash = models.CharField(max_length=255, blank=True, verbose_name='التجزئة')
    is_superuser = models.BooleanField(default=False, verbose_name='صلاحيات سا')
    connection_limit = models.IntegerField(default=-1, verbose_name='حد الاتصالات')
    last_login_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر دخول')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['username']
        verbose_name = 'مستخدم قاعدة بيانات'
        verbose_name_plural = 'مستخدمي قواعد البيانات'

    def __str__(self):
        return self.username


class DbPermission(BaseModel):
    class DbAction(models.TextChoices):
        SELECT = 'SELECT', 'قراءة'
        INSERT = 'INSERT', 'إدراج'
        UPDATE = 'UPDATE', 'تحديث'
        DELETE = 'DELETE', 'حذف'
        TRUNCATE = 'TRUNCATE', 'تفريغ'
        REFERENCES = 'REFERENCES', 'مراجع'
        TRIGGER = 'TRIGGER', 'محفز'
        EXECUTE = 'EXECUTE', 'تنفيذ'
        USAGE = 'USAGE', 'استخدام'
        ALL = 'ALL', 'الكل'

    db_role = models.ForeignKey(
        DbRole, on_delete=models.CASCADE, related_name='db_permissions', verbose_name='الدور'
    )
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='db_permissions', verbose_name='قاعدة البيانات'
    )
    schema = models.ForeignKey(
        DbSchema, on_delete=models.CASCADE, null=True, blank=True,
        related_name='db_permissions', verbose_name='المخطط',
    )
    table_name = models.CharField(max_length=100, blank=True, verbose_name='الجدول')
    action = models.CharField(max_length=12, choices=DbAction.choices, verbose_name='العملية')
    granted = models.BooleanField(default=True, verbose_name='ممنوحة')
    is_active = models.BooleanField(default=True, verbose_name='نشطة')

    class Meta:
        ordering = ['db_role__code', 'database__name', 'table_name']
        verbose_name = 'صلاحية قاعدة بيانات'
        verbose_name_plural = 'صلاحيات قواعد البيانات'

    def __str__(self):
        return f'{self.db_role.code}:{self.action}@{self.table_name or "*"}'


class Backup(BaseModel):
    class BackupType(models.TextChoices):
        FULL = 'FULL', 'نسخة كاملة'
        INCREMENTAL = 'INCREMENTAL', 'نسخة تزايدية'
        PITR = 'PITR', 'استرداد زمني'

    class BackupStatus(models.TextChoices):
        RUNNING = 'RUNNING', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'تمت بنجاح'
        FAILED = 'FAILED', 'فشلت'
        CANCELLED = 'CANCELLED', 'أُلغيت'

    class BackupStorage(models.TextChoices):
        LOCAL = 'LOCAL', 'محلي'
        REMOTE = 'REMOTE', 'عن بُعد'
        CLOUD = 'CLOUD', 'سحابي'

    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='backups', verbose_name='قاعدة البيانات'
    )
    backup_type = models.CharField(max_length=15, choices=BackupType.choices, default=BackupType.FULL, verbose_name='النوع')
    status = models.CharField(max_length=12, choices=BackupStatus.choices, default=BackupStatus.RUNNING, verbose_name='الحالة')
    storage = models.CharField(max_length=10, choices=BackupStorage.choices, default=BackupStorage.REMOTE, verbose_name='التخزين')
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='بدأت')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='اكتملت')
    size_mb = models.FloatField(default=0, verbose_name='الحجم (م.ب)')
    file_path = models.CharField(max_length=500, blank=True, verbose_name='مسار الملف')
    checksum = models.CharField(max_length=128, blank=True, verbose_name='المجموع الاختباري')
    created_by = models.CharField(max_length=100, blank=True, verbose_name='نفذها')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'نسخة احتياطية'
        verbose_name_plural = 'النسخ الاحتياطية'

    def __str__(self):
        return f'{self.database.name} - {self.backup_type} ({self.status})'


class RestoreHistory(BaseModel):
    class RestoreStatus(models.TextChoices):
        RUNNING = 'RUNNING', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'تمت بنجاح'
        FAILED = 'FAILED', 'فشلت'
        ROLLED_BACK = 'ROLLED_BACK', 'تراجعت'

    backup = models.ForeignKey(
        Backup, on_delete=models.CASCADE, related_name='restores', verbose_name='النسخة'
    )
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='restores', verbose_name='قاعدة البيانات'
    )
    target_database = models.CharField(max_length=100, verbose_name='القاعدة الهدف')
    status = models.CharField(max_length=15, choices=RestoreStatus.choices, default=RestoreStatus.RUNNING, verbose_name='الحالة')
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='بدأت')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='اكتملت')
    restored_by = models.CharField(max_length=100, blank=True, verbose_name='نفذها')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'سجل استعادة'
        verbose_name_plural = 'سجلات الاستعادة'

    def __str__(self):
        return f'{self.database.name} ← {self.backup_id} ({self.status})'


class ReplicationNode(BaseModel):
    class NodeType(models.TextChoices):
        PRIMARY = 'PRIMARY', 'أساسي'
        STANDBY = 'STANDBY', 'احتياطي'
        CASCADE = 'CASCADE', 'متسلسل'

    class NodeStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشط'
        DEGRADED = 'DEGRADED', 'منخفض الأداء'
        CATCHING_UP = 'CATCHING_UP', 'يلحق'
        OFFLINE = 'OFFLINE', 'غير متصل'

    class SyncMode(models.TextChoices):
        SYNCHRONOUS = 'SYNCHRONOUS', 'متزامن'
        ASYNCHRONOUS = 'ASYNCHRONOUS', 'غير متزامن'

    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='replication_nodes', verbose_name='قاعدة البيانات'
    )
    name = models.CharField(max_length=100, verbose_name='الاسم')
    node_type = models.CharField(max_length=10, choices=NodeType.choices, default=NodeType.STANDBY, verbose_name='النوع')
    host = models.CharField(max_length=255, verbose_name='المضيف')
    port = models.IntegerField(default=5432, verbose_name='المنفذ')
    sync_mode = models.CharField(max_length=15, choices=SyncMode.choices, default=SyncMode.ASYNCHRONOUS, verbose_name='الوضع')
    status = models.CharField(max_length=15, choices=NodeStatus.choices, default=NodeStatus.ACTIVE, verbose_name='الحالة')
    replication_lag_seconds = models.IntegerField(default=0, verbose_name='التأخر (ثانية)')
    current_lsn = models.CharField(max_length=100, blank=True, verbose_name='LSN الحالي')
    role = models.ForeignKey(
        DbRole, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='replication_nodes', verbose_name='دور النسخ',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'عقدة نسخ'
        verbose_name_plural = 'عقد النسخ'

    def __str__(self):
        return f'{self.name} ({self.node_type})'


class MaintenanceJob(BaseModel):
    class JobType(models.TextChoices):
        VACUUM = 'VACUUM', 'تنظيف (VACUUM)'
        ANALYZE = 'ANALYZE', 'تحليل (ANALYZE)'
        REINDEX = 'REINDEX', 'إعادة فهرسة'
        STATS_UPDATE = 'STATS_UPDATE', 'تحديث إحصائيات'
        INTEGRITY_CHECK = 'INTEGRITY_CHECK', 'فحص سلامة'
        ARCHIVE = 'ARCHIVE', 'أرشفة'

    class JobStatus(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'مجدولة'
        RUNNING = 'RUNNING', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'اكتملت'
        FAILED = 'FAILED', 'فشلت'
        CANCELLED = 'CANCELLED', 'أُلغيت'

    class Frequency(models.TextChoices):
        ONCE = 'ONCE', 'مرة واحدة'
        DAILY = 'DAILY', 'يومي'
        WEEKLY = 'WEEKLY', 'أسبوعي'
        MONTHLY = 'MONTHLY', 'شهري'

    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='maintenance_jobs', verbose_name='قاعدة البيانات'
    )
    name = models.CharField(max_length=150, verbose_name='الاسم')
    job_type = models.CharField(max_length=20, choices=JobType.choices, verbose_name='النوع')
    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.WEEKLY, verbose_name='التكرار')
    scheduled_time = models.TimeField(null=True, blank=True, verbose_name='الوقت المجدول')
    last_run_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تشغيل')
    next_run_at = models.DateTimeField(null=True, blank=True, verbose_name='التشغيل القادم')
    status = models.CharField(max_length=12, choices=JobStatus.choices, default=JobStatus.SCHEDULED, verbose_name='الحالة')
    last_result = models.TextField(blank=True, verbose_name='آخر نتيجة')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='maintenance_jobs', verbose_name='أنشأها',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشطة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مهمة صيانة'
        verbose_name_plural = 'مهام الصيانة'

    def __str__(self):
        return f'{self.name} ({self.job_type})'


class PerformanceMetric(BaseModel):
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='performance_metrics', verbose_name='قاعدة البيانات'
    )
    cpu_usage = models.FloatField(default=0, verbose_name='CPU %')
    memory_usage = models.FloatField(default=0, verbose_name='الذاكرة %')
    disk_io_read = models.FloatField(default=0, verbose_name='قراءة I/O')
    disk_io_write = models.FloatField(default=0, verbose_name='كتابة I/O')
    connections = models.IntegerField(default=0, verbose_name='الاتصالات')
    cache_hit_ratio = models.FloatField(default=0, verbose_name='نسبة كسر الكاش')
    transaction_rate = models.FloatField(default=0, verbose_name='معدل المعاملات')
    locks_count = models.IntegerField(default=0, verbose_name='الأقفال')
    deadlocks_count = models.IntegerField(default=0, verbose_name='الأقفال الميتة')
    recorded_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التسجيل')

    class Meta:
        ordering = ['-recorded_at']
        verbose_name = 'مقياس أداء'
        verbose_name_plural = 'مقاييس الأداء'

    def __str__(self):
        return f'{self.database.name} - {self.recorded_at:%Y-%m-%d %H:%M}'


class QueryStatistic(BaseModel):
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='query_statistics', verbose_name='قاعدة البيانات'
    )
    query_text = models.TextField(verbose_name='نص الاستعلام')
    calls = models.IntegerField(default=0, verbose_name='عدد الاستدعاءات')
    total_time_ms = models.FloatField(default=0, verbose_name='الزمن الكلي (مللي)')
    mean_time_ms = models.FloatField(default=0, verbose_name='الزمن المتوسط (مللي)')
    rows = models.IntegerField(default=0, verbose_name='عدد الصفوف')
    shared_hit_ratio = models.FloatField(default=0, verbose_name='نسبة الكسر')
    is_slow = models.BooleanField(default=False, verbose_name='بطيئة')
    is_indexed = models.BooleanField(default=False, verbose_name='مفهرسة')
    last_executed_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تنفيذ')

    class Meta:
        ordering = ['-total_time_ms']
        verbose_name = 'إحصائية استعلام'
        verbose_name_plural = 'إحصائيات الاستعلامات'

    def __str__(self):
        return f'{self.query_text[:40]}... ({self.mean_time_ms:.0f}ms)'


class StorageUsage(BaseModel):
    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, related_name='storage_usage', verbose_name='قاعدة البيانات'
    )
    database_size_mb = models.FloatField(default=0, verbose_name='حجم القاعدة (م.ب)')
    schema_name = models.CharField(max_length=100, blank=True, verbose_name='المخطط')
    table_name = models.CharField(max_length=100, blank=True, verbose_name='الجدول')
    table_size_mb = models.FloatField(default=0, verbose_name='حجم الجدول (م.ب)')
    index_size_mb = models.FloatField(default=0, verbose_name='حجم الفهارس (م.ب)')
    rows_count = models.BigIntegerField(default=0, verbose_name='عدد الصفوف')
    bloat_estimate = models.FloatField(default=0, verbose_name='تقدير التضخم (م.ب)')
    recorded_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التسجيل')

    class Meta:
        ordering = ['-recorded_at', '-table_size_mb']
        verbose_name = 'استخدام تخزين'
        verbose_name_plural = 'استخدامات التخزين'

    def __str__(self):
        return f'{self.database.name}/{self.table_name or "*"} - {self.table_size_mb:.1f}MB'


class DbAlert(BaseModel):
    class AlertType(models.TextChoices):
        STORAGE = 'STORAGE', 'مساحة التخزين'
        BACKUP = 'BACKUP', 'النسخ الاحتياطي'
        DATABASE = 'DATABASE', 'قاعدة البيانات'
        QUERY = 'QUERY', 'الاستعلامات'
        REPLICATION = 'REPLICATION', 'النسخ المتطابقة'
        CONNECTIONS = 'CONNECTIONS', 'الاتصالات'
        SECURITY = 'SECURITY', 'الأمن'

    class AlertSeverity(models.TextChoices):
        INFO = 'INFO', 'معلومات'
        LOW = 'LOW', 'منخفضة'
        MEDIUM = 'MEDIUM', 'متوسطة'
        HIGH = 'HIGH', 'عالية'
        CRITICAL = 'CRITICAL', 'حرجة'

    class AlertStatus(models.TextChoices):
        NEW = 'NEW', 'جديد'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'تم الإقرار'
        RESOLVED = 'RESOLVED', 'تم الحل'

    database = models.ForeignKey(
        Database, on_delete=models.CASCADE, null=True, blank=True,
        related_name='alerts', verbose_name='قاعدة البيانات',
    )
    alert_type = models.CharField(max_length=15, choices=AlertType.choices, verbose_name='النوع')
    severity = models.CharField(max_length=10, choices=AlertSeverity.choices, default=AlertSeverity.MEDIUM, verbose_name='الخطورة')
    status = models.CharField(max_length=15, choices=AlertStatus.choices, default=AlertStatus.NEW, verbose_name='الحالة')
    title = models.CharField(max_length=200, verbose_name='العنوان')
    message = models.TextField(blank=True, verbose_name='الرسالة')
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='acknowledged_alerts', verbose_name='أقر بها',
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإقرار')
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_alerts', verbose_name='حلها',
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الحل')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تنبيه قاعدة بيانات'
        verbose_name_plural = 'تنبيهات قواعد البيانات'

    def __str__(self):
        return f'{self.severity} - {self.title}'


class AuditLog(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='db_audit_logs', verbose_name='المستخدم',
    )
    action = models.CharField(max_length=100, verbose_name='الإجراء')
    resource_type = models.CharField(max_length=50, blank=True, verbose_name='نوع المورد')
    resource_id = models.CharField(max_length=100, blank=True, verbose_name='معرف المورد')
    details = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    user_agent = models.CharField(max_length=255, blank=True, verbose_name='وكيل المستخدم')
    success = models.BooleanField(default=True, verbose_name='ناجح')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل تدقيق'
        verbose_name_plural = 'سجلات التدقيق'

    def __str__(self):
        return f'{self.user_id} - {self.action}'


class ActivityLog(BaseModel):
    class ActivityType(models.TextChoices):
        LOGIN = 'LOGIN', 'دخول'
        LOGOUT = 'LOGOUT', 'خروج'
        DB_CREATED = 'DB_CREATED', 'إنشاء قاعدة'
        DB_DELETED = 'DB_DELETED', 'حذف قاعدة'
        PERMISSION_CHANGED = 'PERMISSION_CHANGED', 'تعديل صلاحيات'
        BACKUP = 'BACKUP', 'نسخة احتياطية'
        RESTORE = 'RESTORE', 'استعادة'
        SQL_EXECUTED = 'SQL_EXECUTED', 'تنفيذ SQL'
        SETTINGS_CHANGED = 'SETTINGS_CHANGED', 'تعديل إعدادات'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='db_activity_logs', verbose_name='المستخدم',
    )
    activity_type = models.CharField(max_length=25, choices=ActivityType.choices, verbose_name='النوع')
    description = models.CharField(max_length=255, verbose_name='الوصف')
    details = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    performed_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التنفيذ')

    class Meta:
        ordering = ['-performed_at']
        verbose_name = 'سجل نشاط'
        verbose_name_plural = 'سجلات النشاط'

    def __str__(self):
        return f'{self.activity_type} - {self.description}'


class DbSetting(BaseModel):
    class SettingGroup(models.TextChoices):
        GENERAL = 'GENERAL', 'عام'
        BACKUP = 'BACKUP', 'النسخ الاحتياطي'
        SECURITY = 'SECURITY', 'الأمن'
        MAINTENANCE = 'MAINTENANCE', 'الصيانة'
        REPLICATION = 'REPLICATION', 'النسخ المتطابقة'
        NOTIFICATIONS = 'NOTIFICATIONS', 'الإشعارات'

    key = models.CharField(max_length=100, unique=True, verbose_name='المفتاح')
    value = models.CharField(max_length=500, blank=True, verbose_name='القيمة')
    label = models.CharField(max_length=150, verbose_name='التسمية')
    group = models.CharField(max_length=15, choices=SettingGroup.choices, default=SettingGroup.GENERAL, verbose_name='المجموعة')
    is_encrypted = models.BooleanField(default=False, verbose_name='مشفر')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['group', 'key']
        verbose_name = 'إعداد'
        verbose_name_plural = 'الإعدادات'

    def __str__(self):
        return self.key


class SecurityPolicy(BaseModel):
    name = models.CharField(max_length=150, verbose_name='الاسم')
    description = models.TextField(blank=True, verbose_name='الوصف')
    ssl_enabled = models.BooleanField(default=True, verbose_name='تشفير الاتصالات SSL')
    encryption_enabled = models.BooleanField(default=True, verbose_name='تشفير البيانات')
    row_level_security = models.BooleanField(default=False, verbose_name='أمان مستوى الصفوف')
    password_policy = models.CharField(max_length=20, default='STRONG', verbose_name='سياسة كلمات المرور')
    ip_whitelist = models.JSONField(default=list, blank=True, verbose_name='قائمة IP المسموحة')
    is_active = models.BooleanField(default=True, verbose_name='نشطة')

    class Meta:
        ordering = ['name']
        verbose_name = 'سياسة أمن'
        verbose_name_plural = 'سياسات الأمن'

    def __str__(self):
        return self.name


class DisasterRecoveryPlan(BaseModel):
    class PlanStatus(models.TextChoices):
        READY = 'READY', 'جاهز'
        IN_TEST = 'IN_TEST', 'قيد الاختبار'
        DEPLOYED = 'DEPLOYED', 'منفذ'
        OUTDATED = 'OUTDATED', 'بحاجة للتحديث'

    name = models.CharField(max_length=150, verbose_name='الاسم')
    description = models.TextField(blank=True, verbose_name='الوصف')
    recovery_time_objective = models.IntegerField(default=4, help_text='ساعات', verbose_name='هدف زمن الاستعادة')
    recovery_point_objective = models.IntegerField(default=24, help_text='ساعات', verbose_name='هدف نقطة الاستعادة')
    backup_site = models.CharField(max_length=255, blank=True, verbose_name='موقع النسخ')
    procedures = models.TextField(blank=True, verbose_name='إجراءات الطوارئ')
    status = models.CharField(max_length=12, choices=PlanStatus.choices, default=PlanStatus.READY, verbose_name='الحالة')
    tested_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر اختبار')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'خطة تعافي'
        verbose_name_plural = 'خطط التعافي من الكوارث'

    def __str__(self):
        return self.name