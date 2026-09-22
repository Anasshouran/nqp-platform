import type { StatusMeta } from './types';

export const flightStatus: Record<string, StatusMeta> = {
  SCHEDULED: { label: 'مجدولة', tone: 'info' },
  MANIFEST_UPLOADED: { label: 'تم رفع الكشف', tone: 'warning' },
  IN_TRANSIT: { label: 'في الطريق', tone: 'warning' },
  ARRIVED: { label: 'وصلت', tone: 'success' },
  CANCELLED: { label: 'ملغاة', tone: 'error' },
};

export const flightType: Record<string, StatusMeta> = {
  AIR: { label: 'جوي', tone: 'info' },
  SEA: { label: 'بحري', tone: 'primary' },
  LAND: { label: 'بري', tone: 'warning' },
};

export const noticeCategory: Record<string, StatusMeta> = {
  FLIGHT_SUSPENSION: { label: 'تعليق رحلات', tone: 'error' },
  ENTRY_REQUIREMENTS: { label: 'متطلبات الدخول', tone: 'info' },
  EPIDEMIC_ALERT: { label: 'إنذار وبائي', tone: 'error' },
  GENERAL: { label: 'إعلان عام', tone: 'neutral' },
};

export const noticePriority: Record<string, StatusMeta> = {
  HIGH: { label: 'عالي', tone: 'error' },
  MEDIUM: { label: 'متوسط', tone: 'warning' },
  LOW: { label: 'منخفض', tone: 'success' },
};
