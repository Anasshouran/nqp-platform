import type { StatusMeta } from './types';

export const ihrCategory: Record<string, StatusMeta> = {
  PHEIC: { label: 'حالة طوارئ صحية عامة', tone: 'error' },
  TARGETED_ERADICATION: { label: 'استئصال موجه', tone: 'warning' },
  SURVEILLANCE_ONLY: { label: 'مراقبة فقط', tone: 'info' },
  NOT_IHR: { label: 'خارج اللوائح', tone: 'neutral' },
};

export const caseType: Record<string, StatusMeta> = {
  SUSPECTED: { label: 'مشتبه', tone: 'warning' },
  PROBABLE: { label: 'محتمل', tone: 'warning' },
  CONFIRMED: { label: 'مؤكد', tone: 'error' },
  NOT_A_CASE: { label: 'منفي', tone: 'success' },
};

export const caseStatus: Record<string, StatusMeta> = {
  UNDER_INVESTIGATION: { label: 'قيد التحقيق', tone: 'info' },
  ISOLATED: { label: 'معزول', tone: 'warning' },
  UNDER_TREATMENT: { label: 'قيد العلاج', tone: 'warning' },
  RECOVERED: { label: 'تعافى', tone: 'success' },
  DEAD: { label: 'وفاة', tone: 'error' },
  LOST_FOLLOWUP: { label: 'فقد المتابعة', tone: 'neutral' },
  CLOSED: { label: 'مغلق', tone: 'success' },
};

export const caseSource: Record<string, StatusMeta> = {
  SCREENING: { label: 'فحص نقاط الدخول', tone: 'info' },
  LAB: { label: 'مختبر', tone: 'primary' },
  CLINIC: { label: 'عيادة', tone: 'info' },
  EVENT: { label: 'حدث صحي', tone: 'warning' },
  EBS: { label: 'ترصد قائم على الأحداث', tone: 'warning' },
  COMMUNITY: { label: 'مجتمع', tone: 'info' },
  PUBLIC: { label: 'إبلاغ عام', tone: 'info' },
  MANUAL: { label: 'إدخال يدوي', tone: 'neutral' },
};

export const caseSeverity: Record<string, StatusMeta> = {
  LOW: { label: 'منخفض', tone: 'success' },
  MODERATE: { label: 'متوسط', tone: 'warning' },
  HIGH: { label: 'عالي', tone: 'error' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};
