import type { StatusMeta } from './types';

export const riskLevel: Record<string, StatusMeta> = {
  GREEN: { label: 'أخضر', tone: 'success' },
  YELLOW: { label: 'أصفر', tone: 'warning' },
  RED: { label: 'أحمر', tone: 'error' },
};

export const riskRecommendation: Record<string, StatusMeta> = {
  ADMIT: { label: 'إفراج', tone: 'success' },
  QUARANTINE: { label: 'حجر صحي', tone: 'warning' },
  REFER: { label: 'إحالة', tone: 'error' },
};

export const airportScreeningStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'قيد الانتظار', tone: 'info' },
  CLEARED: { label: 'مؤهل', tone: 'success' },
  QUARANTINED: { label: 'محجور', tone: 'warning' },
  REFERRED: { label: 'مُحال', tone: 'error' },
};

export const screeningType: Record<string, StatusMeta> = {
  ARRIVAL: { label: 'وصول', tone: 'info' },
  DEPARTURE: { label: 'مغادرة', tone: 'primary' },
  TRANSIT: { label: 'عبور', tone: 'neutral' },
  CREW: { label: 'طاقم', tone: 'warning' },
};

export const inspectionStatus: Record<string, StatusMeta> = {
  COMPLIANT: { label: 'مطابق', tone: 'success' },
  NON_COMPLIANT: { label: 'غير مطابق', tone: 'error' },
};

export const inspectionOverall: Record<string, StatusMeta> = {
  PASSED: { label: 'نجح', tone: 'success' },
  FAILED: { label: 'فشل', tone: 'error' },
  CONDITIONAL: { label: 'مشروط', tone: 'warning' },
};

export const crewHealthStatus: Record<string, StatusMeta> = {
  FIT: { label: 'لائق', tone: 'success' },
  UNFIT: { label: 'غير لائق', tone: 'error' },
  UNDER_OBSERVATION: { label: 'قيد المراقبة', tone: 'warning' },
};

export const portType: Record<string, StatusMeta> = {
  AIRPORT: { label: 'مطار', tone: 'info' },
  SEAPORT: { label: 'ميناء بحري', tone: 'primary' },
  LAND_PORT: { label: 'منفذ بري', tone: 'warning' },
};
