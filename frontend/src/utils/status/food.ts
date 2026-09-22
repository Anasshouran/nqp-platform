import type { StatusMeta } from './types';

export const shipmentStatus: Record<string, StatusMeta> = {
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  FEES_DUE: { label: 'مستحقة الرسوم', tone: 'warning' },
  AWAITING_INSPECTION: { label: 'بانتظار التفتيش', tone: 'info' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', tone: 'warning' },
  AWAITING_LAB_RESULTS: { label: 'بانتظار النتائج', tone: 'warning' },
  AWAITING_DECISION: { label: 'بانتظار القرار', tone: 'warning' },
  RELEASED: { label: 'أفرج عنه', tone: 'success' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', tone: 'warning' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
  HOLD: { label: 'محجوزة', tone: 'error' },
  RE_EXPORT: { label: 'إعادة تصدير', tone: 'info' },
  DESTROYED: { label: 'إتلاف', tone: 'error' },
};

export const foodFinalDecision: Record<string, StatusMeta> = {
  COMPLIANT: { label: 'إفراج', tone: 'success' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', tone: 'warning' },
  PARTIAL_RELEASE: { label: 'إفراج جزئي', tone: 'warning' },
  TEMPORARY_RELEASE: { label: 'إفراج مؤقت', tone: 'warning' },
  TRANSFER: { label: 'تحويل', tone: 'info' },
  REJECTED: { label: 'رفض', tone: 'error' },
  HOLD: { label: 'حجز', tone: 'error' },
  RE_EXPORT: { label: 'إعادة تصدير', tone: 'info' },
  DESTROY: { label: 'إتلاف', tone: 'error' },
};

export const messageType: Record<string, StatusMeta> = {
  COMMERCIAL: { label: 'تجارية', tone: 'info' },
  RELIEF: { label: 'إغاثة (معفاة)', tone: 'success' },
  EXEMPT: { label: 'إعفاء', tone: 'warning' },
};

export const samplingReason: Record<string, StatusMeta> = {
  ROUTINE: { label: 'روتيني', tone: 'info' },
  SUSPECTED: { label: 'اشتباه فساد', tone: 'error' },
  FIRST_ENTRY: { label: 'أول ورود', tone: 'warning' },
};

export const shipmentType: Record<string, StatusMeta> = {
  IMPORT: { label: 'استيراد', tone: 'info' },
  EXPORT: { label: 'تصدير', tone: 'primary' },
};
