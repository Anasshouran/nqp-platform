import type { StatusMeta } from './types';

export const userType: Record<string, StatusMeta> = {
  CITIZEN: { label: 'مواطن', tone: 'primary' },
  TRAVELER: { label: 'مسافر', tone: 'info' },
  IMPORTER: { label: 'مستورد', tone: 'warning' },
  EXPORTER: { label: 'مصدر', tone: 'primary' },
  COMPANY: { label: 'شركة', tone: 'info' },
  GOVERNMENT: { label: 'جهة حكومية', tone: 'warning' },
  MINISTRY_STAFF: { label: 'موظف وزارة', tone: 'success' },
};

export const scopeType: Record<string, string> = {
  GLOBAL: 'عام (كل النظام)',
  POINT: 'نقطة حدودية',
  PORT: 'ميناء',
  REGION: 'منطقة',
  SECTOR: 'قطاع إداري',
  DEPARTMENT: 'إدارة',
  STATION: 'محطة',
};

export const permissionResource: Record<string, string> = {
  travelers: 'المسافرون',
  screening: 'الفحوصات',
  laboratory: 'المختبر',
  food: 'الغذاء',
  emergency: 'الطوارئ',
  reports: 'التقارير',
  users: 'المستخدمون',
  roles: 'الأدوار والصلاحيات',
  ports: 'المنافذ',
  risk: 'تقييم المخاطر',
  notifications: 'الإشعارات',
  settings: 'الإعدادات',
};

export const permissionAction: Record<string, string> = {
  view: 'عرض',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  export: 'تصدير',
};
