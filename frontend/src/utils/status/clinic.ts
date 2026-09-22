import type { StatusMeta } from './types';

export const healthFacilityKind: Record<string, StatusMeta> = {
  HOSPITAL: { label: 'مستشفى', tone: 'primary' },
  HEALTH_CENTER: { label: 'مركز صحي', tone: 'info' },
  PRIMARY_UNIT: { label: 'وحدة صحية أولية', tone: 'info' },
  CLINIC: { label: 'عيادة', tone: 'neutral' },
  QUARANTINE: { label: 'حجر', tone: 'warning' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const referralStatus: Record<string, StatusMeta> = {
  PENDING: { label: 'في الانتظار', tone: 'warning' },
  PRE_ACCEPT: { label: 'قيد المراجعة', tone: 'primary' },
  ACCEPTED: { label: 'مقبول', tone: 'info' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
};

export const visitStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

export const referralSource: Record<string, StatusMeta> = {
  LAND_BORDER_HEALTH: { label: 'معبر بري', tone: 'warning' },
  PORT_HEALTH: { label: 'ميناء بحري', tone: 'primary' },
  AIRPORT_HEALTH: { label: 'مطار', tone: 'info' },
};
