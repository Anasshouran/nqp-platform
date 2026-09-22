import type { StatusMeta } from './types';

export const vectorControlType: Record<string, StatusMeta> = {
  MOSQUITO: { label: 'بعوض', tone: 'warning' },
  RODENT: { label: 'قوارض', tone: 'neutral' },
  INSECT: { label: 'حشرات', tone: 'info' },
  OTHER: { label: 'أخرى', tone: 'neutral' },
};

export const emergencySeverity: Record<string, StatusMeta> = {
  LOW: { label: 'منخفضة', tone: 'success' },
  MEDIUM: { label: 'متوسطة', tone: 'warning' },
  HIGH: { label: 'عالية', tone: 'error' },
};

export const emergencyStatus: Record<string, StatusMeta> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

export const personType: Record<string, StatusMeta> = {
  CREW: { label: 'طاقم', tone: 'info' },
  PASSENGER: { label: 'راكب', tone: 'primary' },
};
