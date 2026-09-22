export const isolationTypeMeta: Record<string, { label: string; tone: 'error' | 'primary' | 'info' }> = {
  HOSPITAL: { label: 'تحويل للمستشفى', tone: 'error' },
  CLINIC_ISOLATION: { label: 'عزل بالعيادة', tone: 'info' },
  QUARANTINE: { label: 'حجر صحي إجباري', tone: 'primary' },
};

export const isolationStatusMeta: Record<string, { label: string; tone: 'success' | 'primary' | 'error' }> = {
  ACTIVE: { label: 'جاري', tone: 'success' },
  RELEASED: { label: 'خروج', tone: 'primary' },
  REMOVED: { label: 'إنهاء/إلغاء', tone: 'error' },
};

export const healthStatusMeta: Record<string, { label: string; tone: 'success' | 'primary' | 'warning' | 'error' }> = {
  STABLE: { label: 'مستقر', tone: 'success' },
  IMPROVING: { label: 'أفضل', tone: 'primary' },
  WORSENING: { label: 'تدهور', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

export const isoSeverityMeta: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
  LOW: { label: 'منخفض', color: 'success' },
  MEDIUM: { label: 'متوسط', color: 'warning' },
  HIGH: { label: 'مرتفع', color: 'error' },
  CRITICAL: { label: 'حرج', color: 'error' },
};