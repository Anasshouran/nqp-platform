import type { StatusMeta } from './types';

export const sampleStatus: Record<string, StatusMeta> = {
  REGISTERED: { label: 'مسجلة', tone: 'info' },
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  ACCEPTED: { label: 'مقبولة', tone: 'success' },
  CONDITIONALLY_ACCEPTED: { label: 'قبول مشروط', tone: 'warning' },
  PROCESSING: { label: 'قيد التحليل', tone: 'warning' },
  UNDER_TESTING: { label: 'قيد التحليل', tone: 'warning' },
  READY_FOR_APPROVAL: { label: 'جاهزة للاعتماد', tone: 'warning' },
  COMPLETED: { label: 'مكتملة', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const receptionStatus: Record<string, StatusMeta> = {
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  ACCEPTED: { label: 'مقبولة', tone: 'success' },
  CONDITIONALLY_ACCEPTED: { label: 'قبول مشروط', tone: 'warning' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const sampleTestStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الانتظار', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  DRAFT: { label: 'مسودة', tone: 'info' },
  SUBMITTED: { label: 'مُرسلة للمراجعة', tone: 'warning' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const labResultStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الاعتماد', tone: 'warning' },
  APPROVED: { label: 'معتمد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const sampleOutcome: Record<string, StatusMeta> = {
  POSITIVE: { label: 'إيجابي', tone: 'error' },
  NEGATIVE: { label: 'سلبي', tone: 'success' },
  INCONCLUSIVE: { label: 'غير حاسم', tone: 'warning' },
};

export const samplePriority: Record<string, StatusMeta> = {
  ROUTINE: { label: 'عادي', tone: 'info' },
  HIGH: { label: 'عالي', tone: 'warning' },
  URGENT: { label: 'عاجل', tone: 'error' },
};

export const sampleSource: Record<string, StatusMeta> = {
  CLINIC: { label: 'عيادة الحجر الصحي', tone: 'primary' },
  AIRPORT: { label: 'مطار', tone: 'info' },
  SEAPORT: { label: 'ميناء', tone: 'info' },
  LAND_PORT: { label: 'معبر بري', tone: 'info' },
  FOOD_SURVEILLANCE: { label: 'رقابة الأغذية', tone: 'warning' },
  SURVEILLANCE: { label: 'الترصد', tone: 'warning' },
  REFERRAL: { label: 'إحالة طبية', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const sampleType: Record<string, StatusMeta> = {
  BLOOD: { label: 'دم', tone: 'error' },
  SWAB: { label: 'مسحة', tone: 'info' },
  URINE: { label: 'بول', tone: 'warning' },
  STOOL: { label: 'براز', tone: 'warning' },
  TISSUE: { label: 'أنسجة', tone: 'primary' },
  FOOD: { label: 'غذاء', tone: 'warning' },
  WATER: { label: 'مياه', tone: 'info' },
  ENVIRONMENTAL: { label: 'بيئية', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const sampleSendStatus: Record<string, StatusMeta> = {
  NOT_COLLECTED: { label: 'لم تُسحب', tone: 'neutral' },
  SENT: { label: 'أُرسلت للمختبر', tone: 'info' },
  UNDER_TEST: { label: 'قيد الفحص', tone: 'warning' },
  RESULT_RECEIVED: { label: 'وصلت النتيجة', tone: 'success' },
};
