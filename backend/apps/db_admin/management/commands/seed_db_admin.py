import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.db_admin.models import (
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

User = get_user_model()


class Command(BaseCommand):
    help = 'زرع بيانات تجريبية لنظام إدارة قواعد البيانات (DBAS)'

    def handle(self, *args, **options):
        counts = {}

        dbs = [
            {'name': 'nqp_db', 'description': 'قاعدة البيانات الرئيسية للمنصة', 'db_type': 'POSTGRESQL', 'version': '15.4', 'host': 'db-primary-01', 'port': 5432, 'engine': 'PostgreSQL', 'size_mb': 1280.5, 'owner': 'postgres'},
            {'name': 'nqp_warehouse', 'description': 'مستودع البيانات والتقارير', 'db_type': 'POSTGRESQL', 'version': '15.4', 'host': 'dw-01', 'port': 5432, 'engine': 'PostgreSQL', 'size_mb': 5120.0, 'owner': 'postgres'},
            {'name': 'nqp_audit', 'description': 'قاعدة سجلات التدقيق', 'db_type': 'POSTGRESQL', 'version': '15.4', 'host': 'audit-01', 'port': 5432, 'engine': 'PostgreSQL', 'size_mb': 640.2, 'owner': 'postgres'},
            {'name': 'nqp_staging', 'description': 'بيئة الاختبار والتحقق', 'db_type': 'POSTGRESQL', 'version': '15.4', 'host': 'staging-01', 'port': 5432, 'engine': 'PostgreSQL', 'size_mb': 300.0, 'owner': 'postgres', 'status': 'DEGRADED'},
        ]
        created_dbs = 0
        db_map = {}
        for item in dbs:
            db, created = Database.objects.get_or_create(
                name=item['name'],
                defaults={**item, 'status': item.get('status', 'ONLINE')},
            )
            db_map[item['name']] = db
            created_dbs += 1 if created else 0
        counts['databases'] = created_dbs

        created_schemas = 0
        for db_name, schemas in {
            'nqp_db': ['public', 'accounts', 'clinical', 'food_safety', 'operations', 'reporting'],
            'nqp_warehouse': ['public', 'star', 'ods', 'staging'],
            'nqp_audit': ['public'],
            'nqp_staging': ['public', 'tests'],
        }.items():
            db = db_map[db_name]
            for idx, name in enumerate(schemas):
                _, created = DbSchema.objects.get_or_create(
                    database=db,
                    name=name,
                    defaults={
                        'description': f'مخطط {name}',
                        'object_count': random.randint(5, 80),
                        'size_mb': round(random.uniform(2, 200), 1),
                        'last_analyzed_at': timezone.now() - timedelta(days=random.randint(0, 7)),
                    },
                )
                created_schemas += 1 if created else 0
        counts['schemas'] = created_schemas

        roles = [
            {'code': 'DB_ADMIN', 'name': 'Database Administrator', 'name_ar': 'مدير قواعد البيانات', 'is_superuser': True, 'can_login': True, 'can_create_db': True, 'can_create_role': True, 'can_replicate': True},
            {'code': 'DB_READ', 'name': 'Read Only', 'name_ar': 'قراءة فقط', 'is_superuser': False, 'can_login': True},
            {'code': 'DB_BACKUP', 'name': 'Backup Operator', 'name_ar': 'مشغل النسخ', 'is_superuser': False, 'can_login': True},
            {'code': 'DB_ANALYST', 'name': 'Performance Analyst', 'name_ar': 'محلل أداء', 'is_superuser': False, 'can_login': True},
            {'code': 'DB_REPLICATION', 'name': 'Replication Role', 'name_ar': 'دور النسخ المتطابق', 'is_superuser': False, 'can_login': False, 'can_replicate': True},
        ]
        created_roles = 0
        role_map = {}
        for item in roles:
            role, created = DbRole.objects.get_or_create(code=item['code'], defaults=item)
            role_map[item['code']] = role
            created_roles += 1 if created else 0
        counts['roles'] = created_roles

        created_users = 0
        users = [
            {'username': 'dbadmin', 'full_name': 'مدير قواعد البيانات', 'db_role': role_map['DB_ADMIN'], 'is_superuser': True},
            {'username': 'dbreport', 'full_name': 'مستخدم التقارير', 'db_role': role_map['DB_READ']},
            {'username': 'backupop', 'full_name': 'مشغل النسخ الاحتياطي', 'db_role': role_map['DB_BACKUP']},
            {'username': 'analyst', 'full_name': 'محلل الأداء', 'db_role': role_map['DB_ANALYST']},
        ]
        for item in users:
            _, created = DbUser.objects.get_or_create(username=item['username'], defaults=item)
            created_users += 1 if created else 0
        counts['db_users'] = created_users

        actions = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        created_perms = 0
        for db_name in ('nqp_db', 'nqp_warehouse'):
            db = db_map[db_name]
            for role_code, perms in {
                'DB_READ': ['SELECT'],
                'DB_ADMIN': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
            }.items():
                role = role_map[role_code]
                for action in perms:
                    _, created = DbPermission.objects.get_or_create(
                        db_role=role,
                        database=db,
                        table_name='*',
                        action=action,
                        defaults={'granted': True},
                    )
                    created_perms += 1 if created else 0
        counts['permissions'] = created_perms

        created_backups = 0
        for db in Database.objects.all():
            for btype in ('FULL', 'INCREMENTAL', 'FULL'):
                status_val = 'COMPLETED' if btype == 'FULL' or random.random() > 0.2 else 'FAILED'
                backup, created = Backup.objects.get_or_create(
                    database=db,
                    backup_type=btype,
                    started_at=timezone.now() - timedelta(days=random.randint(0, 7)),
                    defaults={
                        'status': status_val,
                        'storage': 'REMOTE',
                        'completed_at': timezone.now() - timedelta(days=random.randint(0, 7)),
                        'size_mb': round(random.uniform(50, 900), 1),
                        'file_path': f'/backups/{db.name}/{btype.lower()}_{random.randint(1000, 9999)}.dump',
                        'checksum': 'sha256:' + 'a' * 64,
                        'created_by': 'system',
                    },
                )
                created_backups += 1 if created else 0
                if created and status_val == 'COMPLETED' and btype == 'FULL':
                    RestoreHistory.objects.get_or_create(
                        backup=backup,
                        target_database=db.name,
                        defaults={
                            'database': db,
                            'status': 'COMPLETED',
                            'completed_at': backup.completed_at,
                            'restored_by': 'system',
                        },
                    )
        counts['backups'] = created_backups

        created_nodes = 0
        node_defs = [
            {'name': 'primary-01', 'node_type': 'PRIMARY', 'host': 'db-primary-01', 'sync_mode': 'SYNCHRONOUS', 'status': 'ACTIVE', 'lag': 0},
            {'name': 'standby-01', 'node_type': 'STANDBY', 'host': 'db-standby-01', 'sync_mode': 'ASYNCHRONOUS', 'status': 'ACTIVE', 'lag': 2},
            {'name': 'standby-02', 'node_type': 'STANDBY', 'host': 'db-standby-02', 'sync_mode': 'ASYNCHRONOUS', 'status': 'CATCHING_UP', 'lag': 45},
        ]
        for item in node_defs:
            node, created = ReplicationNode.objects.get_or_create(
                database=db_map['nqp_db'],
                name=item['name'],
                defaults={
                    'node_type': item['node_type'],
                    'host': item['host'],
                    'sync_mode': item['sync_mode'],
                    'status': item['status'],
                    'replication_lag_seconds': item['lag'],
                    'current_lsn': '0/27F8A00',
                },
            )
            created_nodes += 1 if created else 0
        counts['nodes'] = created_nodes

        job_types = [
            ('تنظيف أسبوعي', 'VACUUM', 'WEEKLY'),
            ('تحديث إحصائيات', 'ANALYZE', 'DAILY'),
            ('إعادة فهرسة شهرية', 'REINDEX', 'MONTHLY'),
            ('فحص سلامة', 'INTEGRITY_CHECK', 'WEEKLY'),
        ]
        created_jobs = 0
        for name, jtype, freq in job_types:
            job, created = MaintenanceJob.objects.get_or_create(
                database=db_map['nqp_db'],
                name=name,
                defaults={
                    'job_type': jtype,
                    'frequency': freq,
                    'next_run_at': timezone.now() + timedelta(days=1),
                    'status': 'SCHEDULED',
                },
            )
            created_jobs += 1 if created else 0
        counts['maintenance'] = created_jobs

        created_metrics = 0
        db = db_map['nqp_db']
        for i in range(24):
            _, created = PerformanceMetric.objects.get_or_create(
                database=db,
                recorded_at=timezone.now() - timedelta(hours=i),
                defaults={
                    'cpu_usage': round(random.uniform(20, 80), 1),
                    'memory_usage': round(random.uniform(45, 90), 1),
                    'disk_io_read': round(random.uniform(100, 800), 1),
                    'disk_io_write': round(random.uniform(50, 500), 1),
                    'connections': random.randint(10, 120),
                    'cache_hit_ratio': round(random.uniform(96.0, 99.9), 2),
                    'transaction_rate': round(random.uniform(200, 1500), 1),
                    'locks_count': random.randint(0, 40),
                    'deadlocks_count': random.randint(0, 2),
                },
            )
            created_metrics += 1 if created else 0
        counts['performance'] = created_metrics

        created_queries = 0
        queries = [
            ('SELECT * FROM travelers WHERE passport_number = $1', 1240, 89.2, 0.07, 1),
            ('SELECT t.*, s.* FROM screenings s JOIN travelers t ON t.id = s.traveler_id', 850, 2450.0, 2.88, 5000),
            ('SELECT COUNT(*) FROM alerts WHERE status = ''NEW''', 3000, 45.0, 0.02, 1),
            ('SELECT * FROM food_shipments ORDER BY created_at DESC', 500, 1200.5, 2.4, 300),
            ('SELECT * FROM emergency_events WHERE severity = ''CRITICAL''', 90, 700.0, 7.8, 40),
        ]
        for text, calls, total, mean, rows in queries:
            qs, created = QueryStatistic.objects.get_or_create(
                database=db,
                query_text=text,
                defaults={
                    'calls': calls,
                    'total_time_ms': total,
                    'mean_time_ms': mean,
                    'rows': rows,
                    'shared_hit_ratio': round(random.uniform(90, 99), 2),
                    'is_slow': mean > 1,
                    'is_indexed': mean < 0.5,
                    'last_executed_at': timezone.now() - timedelta(minutes=random.randint(1, 60)),
                },
            )
            created_queries += 1 if created else 0
        counts['queries'] = created_queries

        created_storage = 0
        tables = [
            ('public', 'travelers', 120.5, 35.0, 50000),
            ('public', 'screenings', 200.0, 80.0, 120000),
            ('public', 'alerts', 40.0, 12.0, 3000),
            ('public', 'food_shipments', 65.0, 20.0, 9000),
            ('clinical', 'lab_results', 150.0, 45.0, 45000),
        ]
        for schema_name, table_name, tsize, isize, rows in tables:
            _, created = StorageUsage.objects.get_or_create(
                database=db,
                table_name=table_name,
                defaults={
                    'database_size_mb': db.size_mb,
                    'schema_name': schema_name,
                    'table_size_mb': tsize,
                    'index_size_mb': isize,
                    'rows_count': rows,
                    'bloat_estimate': round(tsize * random.uniform(0.02, 0.15), 1),
                },
            )
            created_storage += 1 if created else 0
        counts['storage'] = created_storage

        alerts = [
            ('انخفاض مساحة التخزين', 'STORAGE', 'CRITICAL', 'مخزون المساحة أقل من 10%', 'nqp_db'),
            ('فشل النسخة الاحتياطية', 'BACKUP', 'HIGH', 'فشل نسخة احتياطية تلقائية للقاعدة nqp_audit', 'nqp_audit'),
            ('استعلام بطيء', 'QUERY', 'MEDIUM', 'استعلام يستغرق أكثر من 5 ثوانٍ', 'nqp_db'),
            ('تأخر النسخ المتطابق', 'REPLICATION', 'HIGH', 'تأخر النسخ على العقدة standby-02', 'nqp_db'),
            ('زيادة الاتصالات', 'CONNECTIONS', 'LOW', 'ارتفاع عدد الاتصالات النشطة', 'nqp_db'),
        ]
        created_alerts = 0
        for title, atype, severity, message, db_name in alerts:
            _, created = DbAlert.objects.get_or_create(
                database=db_map[db_name],
                title=title,
                defaults={
                    'alert_type': atype,
                    'severity': severity,
                    'message': message,
                },
            )
            created_alerts += 1 if created else 0
        counts['alerts'] = created_alerts

        created_policies = 0
        policy, created = SecurityPolicy.objects.get_or_create(
            name='السياسة الأساسية للأمن',
            defaults={
                'description': 'سياسة الأمن الافتراضية لقواعد بيانات المنصة',
                'ssl_enabled': True,
                'encryption_enabled': True,
                'row_level_security': True,
                'password_policy': 'STRONG',
                'ip_whitelist': ['10.0.0.0/8', '192.168.0.0/16'],
            },
        )
        created_policies += 1 if created else 0
        counts['policies'] = created_policies

        created_plans = 0
        plan, created = DisasterRecoveryPlan.objects.get_or_create(
            name='خطة التعافي من الكوارث الرئيسية',
            defaults={
                'description': 'استعادة كاملة خلال 4 ساعات من موقع النسخ البديل',
                'recovery_time_objective': 4,
                'recovery_point_objective': 24,
                'backup_site': 'المركز البديل - الخرطوم',
                'procedures': '1) تأكيد فشل القاعدة الأساسية\n2) التبديل للعقدة الاحتياطية\n3) استعادة آخر نسخة كاملة\n4) التحقق من السلامة',
            },
        )
        created_plans += 1 if created else 0
        counts['plans'] = created_plans

        settings_defs = [
            ('retention_days', '30', 'فترة الاحتفاظ بالنسخ (يوم)', 'BACKUP'),
            ('auto_backup_enabled', 'true', 'تفعيل النسخ الاحتياطي التلقائي', 'BACKUP'),
            ('backup_time', '02:00', 'وقت النسخ الاحتياطي اليومي', 'BACKUP'),
            ('smtp_enabled', 'true', 'تفعيل التنبيهات البريدية', 'NOTIFICATIONS'),
            ('maintenance_window', '23:00', 'نافذة الصيانة', 'MAINTENANCE'),
        ]
        created_settings = 0
        for key, value, label, group in settings_defs:
            _, created = DbSetting.objects.get_or_create(
                key=key,
                defaults={'value': value, 'label': label, 'group': group},
            )
            created_settings += 1 if created else 0
        counts['settings'] = created_settings

        # Activity + Audit logs
        staff = User.objects.filter(is_staff=True).first()
        created_activity = 0
        if staff:
            _, created = ActivityLog.objects.get_or_create(
                user=staff,
                activity_type='BACKUP',
                performed_at=timezone.now() - timedelta(hours=5),
                defaults={'description': 'نسخة احتياطية كاملة لقاعدة nqp_db'},
            )
            created_activity += 1 if created else 0
            _, created = ActivityLog.objects.get_or_create(
                user=staff,
                activity_type='PERMISSION_CHANGED',
                performed_at=timezone.now() - timedelta(hours=8),
                defaults={'description': 'تعديل صلاحيات الدور DB_READ'},
            )
            created_activity += 1 if created else 0
            _, created = AuditLog.objects.get_or_create(
                user=staff,
                action='BACKUP_RUN',
                resource_type='backup',
                created_at=timezone.now() - timedelta(hours=5),
                defaults={
                    'resource_id': str(db_map['nqp_db'].id),
                    'details': {'type': 'FULL'},
                    'success': True,
                },
            )
            created_activity += 1 if created else 0
        counts['logs'] = created_activity

        self.stdout.write(
            self.style.SUCCESS(
                'تم زرع DBAS بنجاح: '
                + ', '.join(f'{k}={v}' for k, v in counts.items())
            )
        )