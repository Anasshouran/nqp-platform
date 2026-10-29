import type { TFunction } from 'i18next';

export const getIsolationTypeMeta = (
  t: TFunction,
): Record<string, { label: string; tone: 'error' | 'primary' | 'info' }> => ({
  HOSPITAL: { label: t('clinic.shared.isolationType.hospital'), tone: 'error' },
  CLINIC_ISOLATION: { label: t('clinic.shared.isolationType.clinicIsolation'), tone: 'info' },
  QUARANTINE: { label: t('clinic.shared.isolationType.quarantine'), tone: 'primary' },
});

export const getIsolationStatusMeta = (
  t: TFunction,
): Record<string, { label: string; tone: 'success' | 'primary' | 'error' }> => ({
  ACTIVE: { label: t('clinic.shared.isolationStatus.active'), tone: 'success' },
  RELEASED: { label: t('clinic.shared.isolationStatus.released'), tone: 'primary' },
  REMOVED: { label: t('clinic.shared.isolationStatus.removed'), tone: 'error' },
});

export const getHealthStatusMeta = (
  t: TFunction,
): Record<string, { label: string; tone: 'success' | 'primary' | 'warning' | 'error' }> => ({
  STABLE: { label: t('clinic.shared.healthStatus.stable'), tone: 'success' },
  IMPROVING: { label: t('clinic.shared.healthStatus.improving'), tone: 'primary' },
  WORSENING: { label: t('clinic.shared.healthStatus.worsening'), tone: 'warning' },
  CRITICAL: { label: t('clinic.shared.healthStatus.critical'), tone: 'error' },
});

export const getIsoSeverityMeta = (
  t: TFunction,
): Record<string, { label: string; color: 'success' | 'warning' | 'error' }> => ({
  LOW: { label: t('clinic.shared.isoSeverity.low'), color: 'success' },
  MEDIUM: { label: t('clinic.shared.isoSeverity.medium'), color: 'warning' },
  HIGH: { label: t('clinic.shared.isoSeverity.high'), color: 'error' },
  CRITICAL: { label: t('clinic.shared.isoSeverity.critical'), color: 'error' },
});
