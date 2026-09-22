import type { StatusMeta } from './types';

export const fssRiskLevel: Record<string, StatusMeta> = {
  LOW: { label: 'منخفض', tone: 'success' },
  MEDIUM: { label: 'متوسط', tone: 'warning' },
  HIGH: { label: 'عالٍ', tone: 'error' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

export const fssAlertStatus: Record<string, StatusMeta> = {
  NEW: { label: 'جديد', tone: 'error' },
  ACKNOWLEDGED: { label: 'تم الاطلاع', tone: 'info' },
  INVESTIGATING: { label: 'قيد التحقيق', tone: 'warning' },
  ACTIONED: { label: 'تم اتخاذ إجراء', tone: 'primary' },
  CLOSED: { label: 'مغلق', tone: 'success' },
};

export const fssAlertReason: Record<string, StatusMeta> = {
  REPEATED_NON_CONFORMITY: { label: 'تكرار عدم المطابقة', tone: 'error' },
  LAB_TREND: { label: 'اتجاه مخبري', tone: 'warning' },
  FOODBORNE_OUTBREAK: { label: 'تفشٍ منقول بالغذاء', tone: 'error' },
  IMPORT_RISK: { label: 'مخاطر استيراد', tone: 'warning' },
  EXPORT_REJECTION: { label: 'رفض تصدير', tone: 'info' },
  RECALL: { label: 'سحب منتج', tone: 'error' },
  CUSTOM: { label: 'سبب مخصص', tone: 'neutral' },
};

export const fssNonConformityStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  UNDER_INVESTIGATION: { label: 'قيد التحقيق', tone: 'info' },
  CORRECTIVE_ACTION: { label: 'إجراء تصحيحي', tone: 'warning' },
  RESOLVED: { label: 'تم الحل', tone: 'primary' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

export const fssRecallStatus: Record<string, StatusMeta> = {
  DECIDED: { label: 'قرار', tone: 'error' },
  NOTIFYING: { label: 'إخطار الجهات', tone: 'warning' },
  WITHDRAWING: { label: 'سحب المنتج', tone: 'warning' },
  VERIFYING: { label: 'تحقق من السحب', tone: 'info' },
  CLOSED: { label: 'مغلق', tone: 'success' },
};

export const fssRecallType: Record<string, StatusMeta> = {
  WITHDRAWAL: { label: 'سحب احترازي', tone: 'warning' },
  RECALL: { label: 'استدعاء', tone: 'error' },
};
