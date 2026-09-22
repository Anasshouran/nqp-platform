import type { StatusMeta } from './types';

export const vesselType: Record<string, StatusMeta> = {
  COMMERCIAL: { label: 'تجارية', tone: 'info' },
  PASSENGER: { label: 'ركاب', tone: 'primary' },
  TANKER: { label: 'ناقلة نفط', tone: 'warning' },
  CONTAINER: { label: 'حاويات', tone: 'neutral' },
  FISHING: { label: 'صيد', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const vesselStatus: Record<string, StatusMeta> = {
  EXPECTED: { label: 'متوقعة', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'primary' },
  INSPECTED: { label: 'فُحصت', tone: 'warning' },
  CLEARED: { label: 'أُفرج عنها', tone: 'success' },
  QUARANTINED: { label: 'محجورة', tone: 'error' },
  DEPARTED: { label: 'غادرت', tone: 'neutral' },
};

export const declarationStatus: Record<string, StatusMeta> = {
  RECEIVED: { label: 'مستلم', tone: 'info' },
  REVIEWED: { label: 'جاري المراجعة', tone: 'warning' },
  APPROVED: { label: 'معتمد', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};

export const certificateStatus: Record<string, StatusMeta> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  ISSUED: { label: 'صادرة', tone: 'success' },
  EXPIRED: { label: 'منتهية', tone: 'warning' },
  REVOKED: { label: 'ملغاة', tone: 'error' },
};

export const sanitationCertType: Record<string, StatusMeta> = {
  SSCC: { label: 'مكافحة التلوث (SSCC)', tone: 'primary' },
  SSCEC: { label: 'الإعفاء (SSCEC)', tone: 'info' },
};

export const healthCertType: Record<string, StatusMeta> = {
  SHIP_HEALTH: { label: 'صحة السفينة', tone: 'primary' },
  INSPECTION: { label: 'التفتيش الصحي', tone: 'info' },
  RELEASE: { label: 'الإفراج الصحي', tone: 'success' },
};

export const isolationStatus: Record<string, StatusMeta> = {
  ACTIVE: { label: 'نشطة', tone: 'warning' },
  COMPLETED: { label: 'منتهية', tone: 'info' },
  RELEASED: { label: 'أُفرج عنه', tone: 'success' },
};

export const surveillanceStatus: Record<string, StatusMeta> = {
  SUSPECTED: { label: 'مشتبه بها', tone: 'warning' },
  CONFIRMED: { label: 'مؤكدة', tone: 'error' },
  RULED_OUT: { label: 'مستبعدة', tone: 'success' },
};

export const cargoType: Record<string, StatusMeta> = {
  FOOD: { label: 'أغذية', tone: 'info' },
  MEDICINE: { label: 'أدوية', tone: 'primary' },
  CHEMICAL: { label: 'مواد كيميائية', tone: 'warning' },
  ANIMAL: { label: 'حيوانات ومنتجات حيوانية', tone: 'warning' },
  AGRICULTURAL: { label: 'منتجات زراعية', tone: 'success' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const cargoStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الفحص', tone: 'info' },
  CLEARED: { label: 'أُفرج عنها', tone: 'success' },
  REJECTED: { label: 'مرفوضة', tone: 'error' },
  SENT_TO_LAB: { label: 'أُرسلت للمختبر', tone: 'warning' },
};
