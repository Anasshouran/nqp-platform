import type { StatusMeta } from './types';

export const travelerStatus: Record<string, StatusMeta> = {
  PENDING_DOCUMENTS: { label: 'في انتظار المستندات', tone: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', tone: 'warning' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
};
