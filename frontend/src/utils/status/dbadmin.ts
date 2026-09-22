import type { StatusMeta } from './types';

export const dbStatus: Record<string, StatusMeta> = {
  ONLINE: { label: 'متصل', tone: 'success' },
  OFFLINE: { label: 'غير متصل', tone: 'error' },
  DEGRADED: { label: 'منخفض الأداء', tone: 'warning' },
  STARTING: { label: 'قيد التشغيل', tone: 'info' },
  STOPPED: { label: 'متوقف', tone: 'neutral' },
};

export const dbType: Record<string, StatusMeta> = {
  POSTGRESQL: { label: 'PostgreSQL', tone: 'info' },
  MYSQL: { label: 'MySQL', tone: 'primary' },
  ORACLE: { label: 'Oracle', tone: 'warning' },
  SQLSERVER: { label: 'SQL Server', tone: 'neutral' },
};

export const dbUserType: Record<string, StatusMeta> = {
  SUPERUSER: { label: 'صلاحيات سوبر', tone: 'error' },
  NORMAL: { label: 'عادي', tone: 'info' },
};

export const backupType: Record<string, StatusMeta> = {
  FULL: { label: 'نسخة كاملة', tone: 'primary' },
  INCREMENTAL: { label: 'نسخة تزايدية', tone: 'info' },
  PITR: { label: 'استرداد زمني', tone: 'warning' },
};

export const backupStatus: Record<string, StatusMeta> = {
  RUNNING: { label: 'قيد التنفيذ', tone: 'warning' },
  COMPLETED: { label: 'تمت بنجاح', tone: 'success' },
  FAILED: { label: 'فشلت', tone: 'error' },
  CANCELLED: { label: 'أُلغيت', tone: 'neutral' },
};

export const restoreStatus: Record<string, StatusMeta> = {
  RUNNING: { label: 'قيد التنفيذ', tone: 'warning' },
  COMPLETED: { label: 'تمت بنجاح', tone: 'success' },
  FAILED: { label: 'فشلت', tone: 'error' },
  ROLLED_BACK: { label: 'تراجعت', tone: 'neutral' },
};

export const replicationNodeType: Record<string, StatusMeta> = {
  PRIMARY: { label: 'أساسي', tone: 'primary' },
  STANDBY: { label: 'احتياطي', tone: 'info' },
  CASCADE: { label: 'متسلسل', tone: 'neutral' },
};

export const replicationStatus: Record<string, StatusMeta> = {
  ACTIVE: { label: 'نشط', tone: 'success' },
  DEGRADED: { label: 'منخفض الأداء', tone: 'warning' },
  CATCHING_UP: { label: 'يلحق', tone: 'info' },
  OFFLINE: { label: 'غير متصل', tone: 'error' },
};

export const syncMode: Record<string, StatusMeta> = {
  SYNCHRONOUS: { label: 'متزامن', tone: 'primary' },
  ASYNCHRONOUS: { label: 'غير متزامن', tone: 'info' },
};

export const maintenanceJobType: Record<string, StatusMeta> = {
  VACUUM: { label: 'تنظيف (VACUUM)', tone: 'primary' },
  ANALYZE: { label: 'تحليل (ANALYZE)', tone: 'info' },
  REINDEX: { label: 'إعادة فهرسة', tone: 'warning' },
  STATS_UPDATE: { label: 'تحديث إحصائيات', tone: 'info' },
  INTEGRITY_CHECK: { label: 'فحص سلامة', tone: 'success' },
  ARCHIVE: { label: 'أرشفة', tone: 'neutral' },
};

export const maintenanceStatus: Record<string, StatusMeta> = {
  SCHEDULED: { label: 'مجدولة', tone: 'info' },
  RUNNING: { label: 'قيد التنفيذ', tone: 'warning' },
  COMPLETED: { label: 'اكتملت', tone: 'success' },
  FAILED: { label: 'فشلت', tone: 'error' },
  CANCELLED: { label: 'أُلغيت', tone: 'neutral' },
};

export const dbAlertType: Record<string, StatusMeta> = {
  STORAGE: { label: 'مساحة التخزين', tone: 'warning' },
  BACKUP: { label: 'النسخ الاحتياطي', tone: 'info' },
  DATABASE: { label: 'قاعدة البيانات', tone: 'primary' },
  QUERY: { label: 'الاستعلامات', tone: 'warning' },
  REPLICATION: { label: 'النسخ المتطابقة', tone: 'info' },
  CONNECTIONS: { label: 'الاتصالات', tone: 'neutral' },
  SECURITY: { label: 'الأمن', tone: 'error' },
};

export const dbAlertSeverity: Record<string, StatusMeta> = {
  INFO: { label: 'معلومات', tone: 'info' },
  LOW: { label: 'منخفضة', tone: 'success' },
  MEDIUM: { label: 'متوسطة', tone: 'warning' },
  HIGH: { label: 'عالية', tone: 'error' },
  CRITICAL: { label: 'حرجة', tone: 'error' },
};

export const dbAlertStatus: Record<string, StatusMeta> = {
  NEW: { label: 'جديد', tone: 'error' },
  ACKNOWLEDGED: { label: 'تم الإقرار', tone: 'warning' },
  RESOLVED: { label: 'تم الحل', tone: 'success' },
};

export const drPlanStatus: Record<string, StatusMeta> = {
  READY: { label: 'جاهز', tone: 'success' },
  IN_TEST: { label: 'قيد الاختبار', tone: 'warning' },
  DEPLOYED: { label: 'منفذ', tone: 'info' },
  OUTDATED: { label: 'بحاجة للتحديث', tone: 'error' },
};

export const dbSettingGroup: Record<string, string> = {
  GENERAL: 'عام',
  BACKUP: 'النسخ الاحتياطي',
  SECURITY: 'الأمن',
  MAINTENANCE: 'الصيانة',
  REPLICATION: 'النسخ المتطابقة',
  NOTIFICATIONS: 'الإشعارات',
};

export const activityType: Record<string, string> = {
  LOGIN: 'دخول',
  LOGOUT: 'خروج',
  DB_CREATED: 'إنشاء قاعدة',
  DB_DELETED: 'حذف قاعدة',
  PERMISSION_CHANGED: 'تعديل صلاحيات',
  BACKUP: 'نسخة احتياطية',
  RESTORE: 'استعادة',
  SQL_EXECUTED: 'تنفيذ SQL',
  SETTINGS_CHANGED: 'تعديل إعدادات',
};
