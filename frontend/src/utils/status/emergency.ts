import type { StatusMeta } from './types';

export const alertStatus: Record<string, StatusMeta> = {
  NEW: { label: 'جديد', tone: 'error' },
  PROCESSING: { label: 'قيد المعالجة', tone: 'warning' },
  RESOLVED: { label: 'تم الحل', tone: 'success' },
};

export const alertType: Record<string, StatusMeta> = {
  RED_ALERT: { label: 'إنذار أحمر', tone: 'error' },
  OUTBREAK: { label: 'فاشية', tone: 'warning' },
};

export const eventStatus: Record<string, StatusMeta> = {
  IDENTIFIED: { label: 'تم التحديد', tone: 'info' },
  VERIFIED: { label: 'مؤكد', tone: 'primary' },
  RESPONDING: { label: 'قيد الاستجابة', tone: 'error' },
  CONTROLLED: { label: 'تمت السيطرة', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'neutral' },
};

export const severityLevel: Record<string, StatusMeta> = {
  LOW: { label: 'منخفضة', tone: 'success' },
  MODERATE: { label: 'متوسطة', tone: 'warning' },
  HIGH: { label: 'عالية', tone: 'error' },
  CRITICAL: { label: 'حرجة', tone: 'error' },
};

export const alertLevel: Record<string, StatusMeta> = {
  LEVEL_0: { label: 'جاهزية طبيعية', tone: 'success' },
  LEVEL_1: { label: 'مراقبة معززة', tone: 'info' },
  LEVEL_2: { label: 'استجابة محددة', tone: 'warning' },
  LEVEL_3: { label: 'استجابة شاملة', tone: 'error' },
};
