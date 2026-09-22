import type { StatusMeta } from './types';

export const vectorTypeMap: Record<string, StatusMeta> = {
  MOSQUITO: { label: 'بعوض', tone: 'warning' },
  RODENT: { label: 'قوارض', tone: 'error' },
  FLY: { label: 'ذباب', tone: 'neutral' },
  COCKROACH: { label: 'صراصير', tone: 'neutral' },
  FLEA: { label: 'براغيث', tone: 'neutral' },
  TICK: { label: 'قراد', tone: 'warning' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorDensity: Record<string, StatusMeta> = {
  LOW: { label: 'منخفضة', tone: 'success' },
  MEDIUM: { label: 'متوسطة', tone: 'info' },
  HIGH: { label: 'عالية', tone: 'warning' },
  CRITICAL: { label: 'حرجة', tone: 'error' },
};

export const workOrderStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'بانتظار الإسناد', tone: 'neutral' },
  ASSIGNED: { label: 'مُسند', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'primary' },
  COMPLETED: { label: 'منفذ', tone: 'success' },
  FOLLOW_UP: { label: 'تحت المتابعة', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'neutral' },
};

export const workOrderMethod: Record<string, StatusMeta> = {
  SPRAYING: { label: 'رش مبيد', tone: 'warning' },
  LARVAL_SOURCE: { label: 'معالجة مواقع التوالد', tone: 'info' },
  RODENT_CONTROL: { label: 'مكافحة قوارض', tone: 'error' },
  FOGGING: { label: 'ضبابي Fogging', tone: 'neutral' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorSeverity = vectorDensity;

export const vectorReportSource: Record<string, StatusMeta> = {
  PUBLIC: { label: 'مواطن', tone: 'info' },
  OFFICER: { label: 'موظف/مفتش', tone: 'primary' },
  INSPECTION: { label: 'تفتيش', tone: 'warning' },
  SURVEILLANCE: { label: 'ترصد', tone: 'info' },
  HEALTH_FACILITY: { label: 'مرفق صحي', tone: 'error' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorReportStatus: Record<string, StatusMeta> = {
  NEW: { label: 'جديد', tone: 'info' },
  ASSESSING: { label: 'قيد التقييم', tone: 'warning' },
  ACCEPTED: { label: 'تم اعتماد المهمة', tone: 'primary' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  FOLLOW_UP: { label: 'متابعة', tone: 'warning' },
  CLOSED: { label: 'مغلق', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const vectorFocusStatus: Record<string, StatusMeta> = {
  ACTIVE: { label: 'نشطة', tone: 'error' },
  TREATMENT: { label: 'قيد المعالجة', tone: 'warning' },
  MONITORING: { label: 'تحت المراقبة', tone: 'warning' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

export const vectorFocusWaterSource: Record<string, StatusMeta> = {
  CANALS: { label: 'قنوات', tone: 'info' },
  CONTAINERS: { label: 'أوعية/حاويات', tone: 'info' },
  SWAMPS: { label: 'مستنقعات', tone: 'warning' },
  TYRES: { label: 'إطارات', tone: 'warning' },
  STORAGE: { label: 'خزانات', tone: 'info' },
  BOTH: { label: 'مصدران معًا', tone: 'warning' },
  NONE: { label: 'لا يوجد', tone: 'neutral' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorFocusOrigin: Record<string, StatusMeta> = {
  SURVEY: { label: 'مسح', tone: 'info' },
  REPORT: { label: 'بلاغ', tone: 'warning' },
  INSPECTION: { label: 'تفتيش', tone: 'primary' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorInspectionStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  SUBMITTED: { label: 'مقدم', tone: 'info' },
  REVIEWED: { label: 'تمت المراجعة', tone: 'success' },
};

export const vectorInspectionPurpose: Record<string, StatusMeta> = {
  ROUTINE: { label: 'ترصد روتيني', tone: 'info' },
  REPORT_FOLLOWUP: { label: 'متابعة بلاغ', tone: 'warning' },
  CONTROL_FOLLOWUP: { label: 'متابعة مكافحة', tone: 'primary' },
  REINSPECTION: { label: 'إعادة تفتيش', tone: 'warning' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorSurveyMethod: Record<string, StatusMeta> = {
  SWEEP_NET: { label: 'شبكة جرف', tone: 'info' },
  OVITRAPS: { label: 'مصائد البيض', tone: 'info' },
  CDC_TRAPS: { label: 'مصائد CDC', tone: 'info' },
  LARVAL_DIPPING: { label: 'غمس اليرقات', tone: 'warning' },
  SIGHTING: { label: 'معاينة بصرية', tone: 'neutral' },
  TRAPS: { label: 'مصائد', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorSurveyStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  SUBMITTED: { label: 'مقدم', tone: 'info' },
  APPROVED: { label: 'معتمد', tone: 'success' },
};

export const vectorSampleStage: Record<string, StatusMeta> = {
  ADULT: { label: 'بالغ', tone: 'warning' },
  LARVAE: { label: 'يرقة', tone: 'info' },
  PUPAE: { label: 'عذراء', tone: 'info' },
  EGG: { label: 'بيض', tone: 'info' },
  RODENT: { label: 'قارض', tone: 'error' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorSampleStatus: Record<string, StatusMeta> = {
  COLLECTED: { label: 'تم الجمع', tone: 'info' },
  RECEIVED: { label: 'تم الاستلام', tone: 'info' },
  IN_TESTING: { label: 'قيد الفحص', tone: 'warning' },
  COMPLETED: { label: 'مكتملة', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
};

export const vectorLabResultStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الاعتماد', tone: 'warning' },
  APPROVED: { label: 'معتمد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const vectorLabResultValue: Record<string, StatusMeta> = {
  POSITIVE: { label: 'إيجابي', tone: 'error' },
  NEGATIVE: { label: 'سلبي', tone: 'success' },
};

export const vectorLabResultMethod: Record<string, StatusMeta> = {
  MORPHOLOGY: { label: 'تشريحي', tone: 'info' },
  MOLECULAR: { label: 'جزيئي PCR', tone: 'info' },
  CULTURE: { label: 'زراعة', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorOperationStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  APPROVED: { label: 'معتمد', tone: 'info' },
  ASSIGNED: { label: 'مُسند', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  COMPLETED: { label: 'منفذة', tone: 'success' },
  FOLLOW_UP: { label: 'تحت المتابعة', tone: 'warning' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

export const vectorOperationType: Record<string, StatusMeta> = {
  LARVICIDING: { label: 'مكافحة اليرقات', tone: 'info' },
  INDOOR_SPRAY: { label: 'رش داخل المباني', tone: 'warning' },
  OUTDOOR_SPRAY: { label: 'رش خارجي', tone: 'warning' },
  FOGGING: { label: 'ضباب', tone: 'neutral' },
  RODENT_BAITING: { label: 'طعوم قوارض', tone: 'error' },
  TRAPPING: { label: 'مصائد', tone: 'info' },
  SOURCE_REMOVAL: { label: 'إزالة مصادر التكاثر', tone: 'success' },
  WATER_TREATMENT: { label: 'معالجة المياه', tone: 'info' },
  ENVIRONMENTAL: { label: 'إجراءات بيئية', tone: 'success' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorChemicalForm: Record<string, StatusMeta> = {
  EC: { label: 'مستحلب', tone: 'info' },
  SC: { label: 'معلق', tone: 'info' },
  WP: { label: 'بودرة قابلة للبلل', tone: 'info' },
  GR: { label: 'حبيبات', tone: 'info' },
  BAIT: { label: 'طعوم', tone: 'warning' },
  UL: { label: 'سائل ULV', tone: 'info' },
  AEROSOL: { label: 'رذاذ', tone: 'neutral' },
  TABLET: { label: 'أقراص', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorHazardClass: Record<string, StatusMeta> = {
  WHO_I: { label: 'حصيلة I — حذر شديد', tone: 'error' },
  WHO_II: { label: 'معتدل الخطورة', tone: 'warning' },
  WHO_III: { label: 'خفيف الخطورة', tone: 'info' },
  WHO_U: { label: 'غير محتمل الخطر', tone: 'success' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorChemicalTarget: Record<string, StatusMeta> = {
  MOSQUITO: { label: 'البعوض البالغ', tone: 'warning' },
  LARVAE: { label: 'اليرقات', tone: 'info' },
  RODENT: { label: 'القوارض', tone: 'error' },
  FLY: { label: 'الذباب', tone: 'neutral' },
  COCKROACH: { label: 'الصراصير', tone: 'neutral' },
  GENERAL: { label: 'عام', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorEquipmentKind: Record<string, StatusMeta> = {
  SPRAYER: { label: 'مرشة', tone: 'info' },
  ULV_FOGGER: { label: 'جهاز ضباب', tone: 'info' },
  TRAP: { label: 'مصيدة حشرية', tone: 'info' },
  RODENT_TRAP: { label: 'مصيدة قوارض', tone: 'info' },
  PPE: { label: 'معدات وقاية', tone: 'success' },
  VEHICLE: { label: 'مركبة', tone: 'warning' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorEquipmentStatus: Record<string, StatusMeta> = {
  OPERATIONAL: { label: 'صالحة', tone: 'success' },
  MAINTENANCE: { label: 'تحت الصيانة', tone: 'warning' },
  OUT_OF_SERVICE: { label: 'معطلة', tone: 'error' },
};

export const vectorMovementType: Record<string, StatusMeta> = {
  RECEIVE: { label: 'استلام', tone: 'success' },
  WITHDRAW: { label: 'صرف', tone: 'warning' },
  USE: { label: 'استخدام', tone: 'warning' },
  RETURN: { label: 'إرجاع', tone: 'info' },
  ADJUST: { label: 'تسوية', tone: 'neutral' },
};

export const vectorFollowupStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'warning' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

export const vectorAlertType: Record<string, StatusMeta> = {
  HIGH_RISK_FOCUS: { label: 'بؤرة عالية الخطورة', tone: 'error' },
  LAB_POSITIVE: { label: 'نتيجة مختبر إيجابية', tone: 'error' },
  LOW_STOCK: { label: 'مخزون منخفض', tone: 'warning' },
  OPERATION_DELAYED: { label: 'تأخر عملية', tone: 'warning' },
};

export const vectorAlertSeverity: Record<string, StatusMeta> = {
  LOW: { label: 'منخفض', tone: 'success' },
  MEDIUM: { label: 'متوسط', tone: 'warning' },
  HIGH: { label: 'عالٍ', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

export const vectorTeamType: Record<string, StatusMeta> = {
  SURVEY: { label: 'ترصد حشري', tone: 'info' },
  INSPECTION: { label: 'تفتيش', tone: 'info' },
  CONTROL: { label: 'مكافحة', tone: 'warning' },
  RODENT: { label: 'قوارض', tone: 'error' },
  LAB: { label: 'مختبر حشري', tone: 'primary' },
  STOCK: { label: 'مخزون', tone: 'success' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorUnitKind: Record<string, StatusMeta> = {
  SURVEILLANCE: { label: 'الترصد الحشري', tone: 'info' },
  MOSQUITO: { label: 'مكافحة البعوض', tone: 'warning' },
  FLY: { label: 'مكافحة الذباب', tone: 'neutral' },
  RODENT: { label: 'مكافحة القوارض', tone: 'error' },
  CRAWLING: { label: 'الحشرات الزاحفة', tone: 'neutral' },
  SPRAY: { label: 'الرش والتطهير', tone: 'warning' },
  LAB: { label: 'المختبر الحشري', tone: 'primary' },
  STATS: { label: 'التقارير والإحصاء', tone: 'success' },
};

export const vectorSiteType: Record<string, StatusMeta> = {
  BUILDING: { label: 'مبنى', tone: 'info' },
  YARD: { label: 'فناء', tone: 'info' },
  WATER_BODY: { label: 'مسطح مائي', tone: 'info' },
  STORAGE: { label: 'مخزن', tone: 'warning' },
  QUARANTINE: { label: 'محجر صحي', tone: 'primary' },
  DUMP: { label: 'منطقة نفايات', tone: 'error' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vectorCaseClassification: Record<string, StatusMeta> = {
  CONFIRMED: { label: 'مؤكد', tone: 'error' },
  PROBABLE: { label: 'محتمل', tone: 'warning' },
  SUSPECT: { label: 'مشتبه', tone: 'warning' },
  DISCARDED: { label: 'مستبعد', tone: 'neutral' },
};
