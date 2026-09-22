import type { StatusMeta } from './types';

export const surveillanceAlertType: Record<string, StatusMeta> = {
  EWARS_THRESHOLD: { label: 'تجاوز عتبة', tone: 'warning' },
  SINGLE_EVENT: { label: 'حدث فردي', tone: 'warning' },
  LAB_POSITIVE: { label: 'نتيجة مختبر', tone: 'error' },
  CONFIRMED_OUTBREAK: { label: 'تفشٍ مؤكد', tone: 'error' },
};

export const surveillanceAlertStatus: Record<string, StatusMeta> = {
  NEW: { label: 'جديد', tone: 'error' },
  ACKNOWLEDGED: { label: 'تم الإقرار', tone: 'info' },
  RESPONDING: { label: 'قيد الاستجابة', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'success' },
};

export const notificationTimeline: Record<string, StatusMeta> = {
  IMMEDIATE: { label: 'فوري', tone: 'error' },
  WITHIN_24H: { label: 'خلال 24 ساعة', tone: 'warning' },
  WEEKLY: { label: 'أسبوعي', tone: 'info' },
};

export const surveillanceMode: Record<string, StatusMeta> = {
  CASE_BASED: { label: 'قائم على الحالات', tone: 'primary' },
  AGGREGATE: { label: 'تجميعي', tone: 'info' },
  SYNDROME: { label: 'بالمتلازمات', tone: 'warning' },
};

export const contactType: Record<string, StatusMeta> = {
  FAMILY: { label: 'أسرة', tone: 'info' },
  WORK: { label: 'عمل', tone: 'info' },
  SOCIAL: { label: 'اجتماعي', tone: 'info' },
  HEALTHCARE: { label: 'رعاية صحية', tone: 'warning' },
  TRAVEL: { label: 'سفر', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const contactStatus: Record<string, StatusMeta> = {
  UNDER_MONITORING: { label: 'تحت المراقبة', tone: 'info' },
  COMPLETED: { label: 'أكمل المتابعة', tone: 'success' },
  SYMPTOMATIC: { label: 'يظهر أعراضاً', tone: 'warning' },
  CONVERTED_CASE: { label: 'تحول إلى حالة', tone: 'error' },
  LOST: { label: 'فقد', tone: 'neutral' },
};

export const investigationStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  COMPLETED: { label: 'مكتملة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};
