import type { StatusMeta } from './types';

/* حالة المعبر — تطابق `BorderCrossing.BorderStatus` */
export const borderOperatingStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'يعمل', tone: 'success' },
  RESTRICTED: { label: 'مقيَّد', tone: 'warning' },
  LIMITED: { label: 'محدود', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'error' },
  EMERGENCY: { label: 'حالة طوارئ', tone: 'error' },
};

export const borderType: Record<string, StatusMeta> = {
  ROAD: { label: 'بري — طريق', tone: 'primary' },
  RAIL: { label: 'بري — سكة', tone: 'info' },
  RIVER: { label: 'بري — نهر', tone: 'neutral' },
};

export const borderFacilityKind: Record<string, StatusMeta> = {
  HEALTH: { label: 'مركز صحي', tone: 'primary' },
  LABORATORY: { label: 'مختبر', tone: 'info' },
  QUARANTINE: { label: 'وحدة حجر', tone: 'warning' },
  ISOLATION: { label: 'وحدة عزل', tone: 'warning' },
  STORAGE: { label: 'مخزن', tone: 'neutral' },
  WATER_SANITATION: { label: 'مياه وصرف صحي', tone: 'info' },
  WASTE: { label: 'إدارة نفايات', tone: 'neutral' },
  VECTOR_CONTROL: { label: 'مكافحة نواقل', tone: 'neutral' },
};

export const borderShiftType: Record<string, StatusMeta> = {
  MORNING: { label: 'صباحية', tone: 'info' },
  EVENING: { label: 'مسائية', tone: 'primary' },
  NIGHT: { label: 'ليلية', tone: 'neutral' },
  ROTATING: { label: 'تناوبية', tone: 'neutral' },
};

export const borderTravelDirection: Record<string, StatusMeta> = {
  INBOUND: { label: 'داخل', tone: 'info' },
  OUTBOUND: { label: 'خارج', tone: 'neutral' },
};

export const borderHealthStatus: Record<string, StatusMeta> = {
  FIT: { label: 'سليم', tone: 'success' },
  UNFIT: { label: 'غير صالح للعبور', tone: 'error' },
  UNDER_OBSERVATION: { label: 'تحت الملاحظة', tone: 'warning' },
};

export const borderRiskLevel: Record<string, StatusMeta> = {
  GREEN: { label: 'منخفض', tone: 'success' },
  YELLOW: { label: 'متوسط', tone: 'warning' },
  RED: { label: 'مرتفع', tone: 'error' },
};

export const borderTravelerDecision: Record<string, StatusMeta> = {
  CLEARED: { label: 'مُفرج عنه', tone: 'success' },
  HOLD: { label: 'محجوز للمراجعة', tone: 'warning' },
  REFERRED: { label: 'مُحال', tone: 'info' },
  QUARANTINED: { label: 'محجور', tone: 'error' },
  REFUSED_ENTRY: { label: 'ممنوع الدخول', tone: 'error' },
};

export const borderScreeningDecision: Record<string, StatusMeta> = {
  CLEARED: { label: 'مُفرج عنه', tone: 'success' },
  HOLD: { label: 'محجوز للمراجعة', tone: 'warning' },
  REFERRED: { label: 'مُحال', tone: 'info' },
  QUARANTINED: { label: 'محجور', tone: 'error' },
};

export const borderDeclarationStatus: Record<string, StatusMeta> = {
  SUBMITTED: { label: 'مُقدَّم', tone: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', tone: 'warning' },
  ACCEPTED: { label: 'مقبول', tone: 'success' },
  FLAGGED: { label: 'مُعلَّم', tone: 'error' },
};

export const borderVehicleType: Record<string, StatusMeta> = {
  BUS: { label: 'حافلة', tone: 'primary' },
  TRUCK: { label: 'شاحنة', tone: 'info' },
  CAR: { label: 'سيارة', tone: 'neutral' },
  PICKUP: { label: 'حمولة صغيرة', tone: 'neutral' },
  TRACTOR: { label: 'جرار', tone: 'neutral' },
  MOTORCYCLE: { label: 'دراجة نارية', tone: 'neutral' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const borderVehicleStatus: Record<string, StatusMeta> = {
  AWAITING: { label: 'في الانتظار', tone: 'warning' },
  INSPECTED: { label: 'تم التفتيش', tone: 'info' },
  CLEARED: { label: 'مُفرج عنه', tone: 'success' },
  HELD: { label: 'محجوز', tone: 'warning' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const borderInspectionType: Record<string, StatusMeta> = {
  EXTERIOR: { label: 'الهيكل الخارجي', tone: 'info' },
  CARGO_HOLD: { label: 'صندوق الشحن', tone: 'primary' },
  TEMPERATURE: { label: 'درجة الحرارة', tone: 'info' },
  DISINFECTION: { label: 'التعقيم', tone: 'success' },
  PEST_CONTROL: { label: 'مكافحة الحشرات', tone: 'neutral' },
  WASTE: { label: 'النفايات', tone: 'neutral' },
  CABIN: { label: 'المقصورة', tone: 'neutral' },
};

export const borderComplianceStatus: Record<string, StatusMeta> = {
  COMPLIANT: { label: 'مطابق', tone: 'success' },
  NON_COMPLIANT: { label: 'غير مطابق', tone: 'error' },
  NOT_APPLICABLE: { label: 'لا ينطبق', tone: 'neutral' },
};

export const borderInspectionOverall: Record<string, StatusMeta> = {
  PASSED: { label: 'مطابق', tone: 'success' },
  CONDITIONAL: { label: 'مشروط', tone: 'warning' },
  FAILED: { label: 'غير مطابق', tone: 'error' },
};

export const borderCargoScope: Record<string, StatusMeta> = {
  CARGO: { label: 'شحنة عامة', tone: 'primary' },
  FOOD: { label: 'غذاء', tone: 'success' },
  WAREHOUSE: { label: 'مستودع', tone: 'neutral' },
  WATER_SANITATION: { label: 'مياه وصرف', tone: 'info' },
};

export const borderCargoStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الانتظار', tone: 'neutral' },
  INSPECTING: { label: 'قيد التفتيش', tone: 'info' },
  SAMPLES_SENT: { label: 'عُيّنات مُرسلة', tone: 'info' },
  AWAITING_DECISION: { label: 'بانتظار القرار', tone: 'warning' },
  RELEASED: { label: 'مُفرج عنها', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
  HOLD: { label: 'محجوزة', tone: 'warning' },
};

export const borderCargoOutcome: Record<string, StatusMeta> = {
  CLEARED: { label: 'مُفرج عنها', tone: 'success' },
  CONDITIONAL: { label: 'مشروطة', tone: 'warning' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
  HOLD: { label: 'محجوزة', tone: 'warning' },
};

export const borderSampleStatus: Record<string, StatusMeta> = {
  COLLECTED: { label: 'مُحصَّلة', tone: 'info' },
  SENT: { label: 'مُرسلة', tone: 'info' },
  UNDER_TEST: { label: 'قيد الفحص', tone: 'warning' },
  RESULT_RECEIVED: { label: 'وصلت النتيجة', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const borderQuarantineStatus: Record<string, StatusMeta> = {
  ADMITTED: { label: 'مُستقبَل', tone: 'info' },
  UNDER_QUARANTINE: { label: 'تحت الحجر', tone: 'warning' },
  REFERRED: { label: 'مُحال', tone: 'info' },
  RELEASED: { label: 'مُفرج عنه', tone: 'success' },
  ESCALATED: { label: 'مُصعَّد', tone: 'error' },
};

export const borderQuarantinePhase: Record<string, StatusMeta> = {
  SCREENED: { label: 'مفحوص', tone: 'neutral' },
  ASSESSED: { label: 'مُقيَّم', tone: 'info' },
  QUARANTINED: { label: 'محجور', tone: 'warning' },
  UNDER_TREATMENT: { label: 'تحت العلاج', tone: 'info' },
  RECOVERED: { label: 'تعافى', tone: 'success' },
  RELEASED: { label: 'مُفرج عنه', tone: 'success' },
  REFERRED_OUT: { label: 'مُحال خارج المعبر', tone: 'neutral' },
};

export const borderIsolationStatus: Record<string, StatusMeta> = {
  ACTIVE: { label: 'نشطة', tone: 'warning' },
  RELEASED: { label: 'مُفرج عنه', tone: 'success' },
  REMOVED: { label: 'منقول', tone: 'neutral' },
};

export const borderContactTracingStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'info' },
  FOLLOW_UP: { label: 'قيد المتابعة', tone: 'warning' },
  COMPLETED: { label: 'مكتملة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

export const borderContactStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'في الانتظار', tone: 'neutral' },
  SYMPTOMATIC: { label: 'عَرَضي', tone: 'error' },
  ISOLATED: { label: 'معزول', tone: 'warning' },
  CLEARED: { label: 'سليم', tone: 'success' },
  LOST_TO_FOLLOW_UP: { label: 'مفقود المتابعة', tone: 'error' },
};

export const borderIncidentSeverity: Record<string, StatusMeta> = {
  LOW: { label: 'منخفضة', tone: 'neutral' },
  MEDIUM: { label: 'متوسطة', tone: 'warning' },
  HIGH: { label: 'عالية', tone: 'error' },
  CRITICAL: { label: 'حرجة', tone: 'error' },
};

export const borderIncidentStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'warning' },
  INVESTIGATING: { label: 'قيد التحقيق', tone: 'info' },
  RESOLVED: { label: 'مُحلولة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

export const borderEmergencyStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'warning' },
  ACTIVE: { label: 'نشطة', tone: 'error' },
  MONITORING: { label: 'قيد الرصد', tone: 'info' },
  RESOLVED: { label: 'مُحلولة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

export const borderRestrictionLevel: Record<string, StatusMeta> = {
  ADVISORY: { label: 'إرشادي', tone: 'info' },
  PARTIAL: { label: 'جزئي', tone: 'warning' },
  FULL: { label: 'كامل', tone: 'error' },
  BORDER_CLOSURE: { label: 'إغلاق المعبر', tone: 'error' },
};

export const borderCertificateType: Record<string, StatusMeta> = {
  HEALTH_CLEARANCE: { label: 'شهادة إفراج صحي', tone: 'success' },
  INSPECTION: { label: 'شهادة تفتيش', tone: 'info' },
  PASSAGE_PERMIT: { label: 'تصريح عبور', tone: 'primary' },
  QUARANTINE_RELEASE: { label: 'إفراج من الحجر', tone: 'primary' },
  REJECTION: { label: 'شهادة رفض', tone: 'error' },
};

export const borderCertificateStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  ISSUED: { label: 'صادرة', tone: 'success' },
  EXPIRED: { label: 'منتهية', tone: 'warning' },
  REVOKED: { label: 'ملغاة', tone: 'error' },
  CANCELLED: { label: 'ملغاة', tone: 'error' },
};

export const borderDecisionOutcome: Record<string, StatusMeta> = {
  CLEARED: { label: 'إفراج', tone: 'success' },
  CONDITIONAL: { label: 'مشروط', tone: 'warning' },
  HOLD: { label: 'حجز', tone: 'warning' },
  REFERRED: { label: 'إحالة', tone: 'info' },
  REJECTED: { label: 'رفض', tone: 'error' },
  ENFORCEMENT: { label: 'إجراء إنفاذي', tone: 'error' },
};

export const borderNotificationChannel: Record<string, StatusMeta> = {
  SMS: { label: 'رسالة نصية', tone: 'info' },
  EMAIL: { label: 'بريد إلكتروني', tone: 'primary' },
  PUSH: { label: 'إشعار', tone: 'primary' },
  RADIO: { label: 'لاماسلكي', tone: 'neutral' },
};

export const borderNotificationDeliveryStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'في الانتظار', tone: 'neutral' },
  SENT: { label: 'أُرسل', tone: 'info' },
  DELIVERED: { label: 'سُلّم', tone: 'success' },
  FAILED: { label: 'فشل', tone: 'error' },
};
