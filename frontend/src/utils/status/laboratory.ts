import type { StatusMeta } from './types';

export const labSampleStatus: Record<string, StatusMeta> = {
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  COORDINATED: { label: 'تم التنسيق', tone: 'primary' },
  ASSIGNED: { label: 'أُسندت للقسم', tone: 'info' },
  UNDER_TESTING: { label: 'قيد التحليل', tone: 'warning' },
  READY_FOR_APPROVAL: { label: 'جاهزة للاعتماد', tone: 'warning' },
  APPROVED: { label: 'معتمدة', tone: 'primary' },
  DISPATCHED: { label: 'أُرسلت النتائج', tone: 'success' },
  COMPLETED: { label: 'مكتملة', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const labCollection: Record<string, StatusMeta> = {
  PENDING: { label: 'غير محصّل', tone: 'warning' },
  PAID: { label: 'محصّل', tone: 'success' },
  EXEMPT: { label: 'معفاة', tone: 'neutral' },
};

export const labBench: Record<string, StatusMeta> = {
  MICROBIOLOGY: { label: 'الأحياء الدقيقة', tone: 'info' },
  CHEMISTRY: { label: 'الكيمياء', tone: 'primary' },
  TOXICOLOGY: { label: 'السموم', tone: 'warning' },
  MOLECULAR: { label: 'الجزيئي', tone: 'neutral' },
};

export const labApproval: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الاعتماد', tone: 'warning' },
  APPROVED: { label: 'معتمد', tone: 'success' },
};

export const labTestStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الانتظار', tone: 'neutral' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  DRAFT: { label: 'مسودة', tone: 'info' },
  SUBMITTED: { label: 'مُرسلة للمراجعة', tone: 'warning' },
  REVIEWED: { label: 'راجعها رئيس القسم', tone: 'primary' },
  APPROVED: { label: 'اعتمدها مدير المختبر', tone: 'success' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  RETEST: { label: 'إعادة فحص', tone: 'error' },
};

export const labDecision: Record<string, StatusMeta> = {
  PENDING: { label: 'غير محسوم', tone: 'neutral' },
  COMPLIANT: { label: 'مطابق', tone: 'success' },
  NON_COMPLIANT: { label: 'غير مطابق', tone: 'error' },
  INCONCLUSIVE: { label: 'غير حاسم', tone: 'warning' },
  NOT_APPLICABLE: { label: 'لا ينطبق', tone: 'neutral' },
};

export const labReception: Record<string, StatusMeta> = {
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  ACCEPTED: { label: 'مقبولة', tone: 'success' },
  CONDITIONALLY_ACCEPTED: { label: 'قبول مشروط', tone: 'warning' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const labSla: Record<string, StatusMeta> = {
  ON_TIME: { label: 'ضمن المدة', tone: 'success' },
  DUE_SOON: { label: 'قرب الاستحقاق', tone: 'warning' },
  DELAYED: { label: 'متأخر', tone: 'error' },
  COMPLETED: { label: 'مكتمل', tone: 'info' },
};

export const labPriority: Record<string, StatusMeta> = {
  LOW: { label: 'منخفضة', tone: 'neutral' },
  NORMAL: { label: 'عادية', tone: 'info' },
  HIGH: { label: 'عالية', tone: 'warning' },
  URGENT: { label: 'عاجلة', tone: 'error' },
};

export const labQc: Record<string, StatusMeta> = {
  PENDING: { label: 'بانتظار المراجعة', tone: 'warning' },
  PASSED: { label: 'مطابق', tone: 'success' },
  FAILED: { label: 'غير مطابق', tone: 'error' },
};

export const labEquipmentStatus: Record<string, StatusMeta> = {
  OPERATIONAL: { label: 'تشغيلية', tone: 'success' },
  UNDER_MAINTENANCE: { label: 'قيد الصيانة', tone: 'warning' },
  OUT_OF_SERVICE: { label: 'خارج الخدمة', tone: 'error' },
};

export const labInvoiceStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  ISSUED: { label: 'صادرة', tone: 'info' },
  PENDING: { label: 'معلقة', tone: 'warning' },
  PENDING_PAYMENT: { label: 'بانتظار الدفع', tone: 'warning' },
  OVERDUE: { label: 'متأخرة', tone: 'error' },
  PAID: { label: 'مدفوعة', tone: 'success' },
  RECONCILED: { label: 'تسويت', tone: 'success' },
  REFUNDED: { label: 'مسترَدّة', tone: 'error' },
  CANCELLED: { label: 'معفاة / ملغاة', tone: 'neutral' },
  EXEMPT: { label: 'معفاة', tone: 'neutral' },
};
