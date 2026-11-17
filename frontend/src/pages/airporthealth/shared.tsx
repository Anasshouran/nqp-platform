import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import baseTheme from '../../styles/theme';
import KpiCardBase from '../../components/dashboard/KpiCard';
import { SectionCard, StatusChip, type StatusTone } from '../../components/uikit';

/* ============================= نظام التصميم =============================
 * الألوان مشتقة من سمة المنصة العامة (styles/theme) بدلاً من لوحة مستقلة،
 * لضمان اتساق «نظام صحة المطارات» مع بقية واجهات المنصة.
 */

const palette = baseTheme.palette;

export const C = {
  primary: palette.primary.main,
  primaryDark: palette.primary.dark,
  medicalBlue: palette.info.main,
  medicalGreen: palette.success.main,
  bg: palette.background.default,
  surface: palette.background.paper,
  text: palette.text.primary,
  textMuted: palette.text.secondary,
  border: palette.divider,
  danger: palette.error.main,
  dangerBg: alpha(palette.error.main, 0.1),
  warning: palette.warning.main,
  warningBg: alpha(palette.warning.main, 0.14),
  success: palette.success.main,
  successBg: alpha(palette.success.main, 0.12),
  info: palette.info.main,
  infoBg: alpha(palette.info.main, 0.1),
  chart: [
    palette.primary.main,
    palette.info.main,
    palette.success.main,
    palette.warning.main,
    palette.error.main,
    '#7C3AED',
  ],
} as const;

export type RiskKey = 'LOW' | 'MEDIUM' | 'HIGH' | 'ASSESSMENT' | 'CLOSED';
export type HealthStatus = 'CLEARED' | 'SCREENING' | 'SECONDARY' | 'MEDICAL_ASSESSMENT' | 'ALERT' | 'HOLD';

export const getRiskMeta = (t: (key: string) => string): Record<RiskKey, { label: string; color: string; bg: string }> => ({
  LOW: { label: '🟢 ' + t('borders.airportHealth.risk.low'), color: C.success, bg: C.successBg },
  MEDIUM: { label: '🟡 ' + t('borders.airportHealth.risk.medium'), color: C.warning, bg: C.warningBg },
  HIGH: { label: '🔴 ' + t('borders.airportHealth.risk.high'), color: C.danger, bg: C.dangerBg },
  ASSESSMENT: { label: '🔵 ' + t('borders.airportHealth.risk.assessment'), color: C.medicalBlue, bg: C.infoBg },
  CLOSED: { label: '⚫ ' + t('borders.airportHealth.risk.closed'), color: C.textMuted, bg: alpha(C.text, 0.06) },
});

export const getStatusMeta = (t: (key: string) => string): Record<HealthStatus, { label: string; color: string; bg: string }> => ({
  CLEARED: { label: t('borders.airportHealth.status.cleared') + ' ✓', color: C.success, bg: C.successBg },
  SCREENING: { label: t('borders.airportHealth.status.screening'), color: C.primary, bg: alpha(C.primary, 0.1) },
  SECONDARY: { label: t('borders.airportHealth.status.secondary'), color: C.medicalBlue, bg: C.infoBg },
  MEDICAL_ASSESSMENT: { label: t('borders.airportHealth.status.medicalAssessment'), color: C.warning, bg: C.warningBg },
  ALERT: { label: t('borders.airportHealth.status.alert'), color: C.danger, bg: C.dangerBg },
  HOLD: { label: t('borders.airportHealth.status.hold'), color: C.textMuted, bg: alpha(C.text, 0.06) },
});

export const RISK_META: Record<RiskKey, { label: string; color: string; bg: string }> = getRiskMeta((k: string) => {
  if (k === 'borders.airportHealth.risk.low') return '🟢 Low';
  if (k === 'borders.airportHealth.risk.medium') return '🟡 Medium';
  if (k === 'borders.airportHealth.risk.high') return '🔴 High';
  if (k === 'borders.airportHealth.risk.assessment') return '🔵 Under Assessment';
  if (k === 'borders.airportHealth.risk.closed') return '⚫ Closed';
  return k;
});

export const STATUS_META: Record<HealthStatus, { label: string; color: string; bg: string }> = getStatusMeta((k: string) => {
  if (k === 'borders.airportHealth.status.cleared') return 'Cleared';
  if (k === 'borders.airportHealth.status.screening') return 'Primary Screening';
  if (k === 'borders.airportHealth.status.secondary') return 'Secondary Screening';
  if (k === 'borders.airportHealth.status.medicalAssessment') return 'Medical Assessment';
  if (k === 'borders.airportHealth.status.alert') return 'Alert';
  if (k === 'borders.airportHealth.status.hold') return 'Hold';
  return k;
});

const RISK_TONE: Record<RiskKey, StatusTone> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
  ASSESSMENT: 'info',
  CLOSED: 'neutral',
};

const STATUS_TONE: Record<HealthStatus, StatusTone> = {
  CLEARED: 'success',
  SCREENING: 'primary',
  SECONDARY: 'info',
  MEDICAL_ASSESSMENT: 'warning',
  ALERT: 'error',
  HOLD: 'neutral',
};

/* ============================= مكونات مشتركة ============================= */

export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Stack spacing={0.4} sx={{ mb: 2.5 }}>
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Stack>
);

/** بطاقة قسم موحّدة — غلاف حول SectionCard العامة. */
export const SurfaceCard = ({ title, subtitle, action, children, sx }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; sx?: SxProps<Theme> }) => (
  <SectionCard title={title} subtitle={subtitle} action={action} sx={sx}>
    {children}
  </SectionCard>
);

/** بطاقة مؤشر — غلاف حول KpiCard العامة مع دعم الحالة/الاتجاه. */
export const KpiCard = ({ icon, value, label, trend, trendLabel, status }: {
  icon: ReactNode;
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  status?: string;
  statusColor?: string;
}) => (
  <KpiCardBase
    icon={icon}
    value={value}
    label={label}
    hint={status ?? (trend === 'flat' ? trendLabel : undefined)}
    trend={trend && trend !== 'flat' && trendLabel ? { label: trendLabel, positive: trend === 'up' } : undefined}
  />
);

export const RiskBadge = ({ risk }: { risk: RiskKey }) => {
  const { t } = useTranslation();
  return <StatusChip label={getRiskMeta(t)[risk].label} tone={RISK_TONE[risk]} />;
};

export const StatusBadge = ({ status }: { status: HealthStatus }) => {
  const { t } = useTranslation();
  return <StatusChip label={getStatusMeta(t)[status].label} tone={STATUS_TONE[status]} />;
};

/* شريط تقدم أفقي ملوّن */
export const ProgressBar = ({ value, color = C.primary }: { value: number; color?: string }) => (
  <Box sx={{ height: 8, borderRadius: 4, bgcolor: alpha(C.text, 0.08), overflow: 'hidden', width: '100%' }}>
    <Box sx={{ height: '100%', width: `${Math.min(100, Math.max(3, value))}%`, borderRadius: 4, bgcolor: color }} />
  </Box>
);

/* مؤشر دائري (نصف دائرة) للمخاطر */
export const RiskGauge = ({ score, label, color }: { score: number; label: string; color: string }) => (
  <Stack alignItems="center" sx={{ position: 'relative' }}>
    <svg width={160} height={92} viewBox="0 0 160 92">
      <path d="M 18 82 A 62 62 0 0 1 142 82" fill="none" stroke={alpha(C.text, 0.08)} strokeWidth={14} strokeLinecap="round" />
      <path
        d="M 18 82 A 62 62 0 0 1 142 82"
        fill="none"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * 196} 196`}
        style={{ transition: 'stroke-dasharray 600ms ease' }}
      />
    </svg>
    <Stack alignItems="center" sx={{ position: 'absolute', mt: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{score}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>{label}</Typography>
    </Stack>
  </Stack>
);

/* حالة الأنماط التشغيلية */
export const OFFLINE_PILL = ({ state, t }: { state: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED'; t?: (k: string, o?: any) => string }) => {
  const tr = t || ((k: string) => {
    if (k === 'borders.airportHealth.offline.online') return 'ONLINE — متصل';
    if (k === 'borders.airportHealth.offline.offline') return 'OFFLINE — غير متصل';
    if (k === 'borders.airportHealth.offline.syncing') return 'SYNCING — مزامنة';
    if (k === 'borders.airportHealth.offline.synced') return 'SYNC COMPLETE — اكتمل';
    return k;
  });
  const meta = state === 'ONLINE' ? { color: C.success, bg: C.successBg } : state === 'SYNCING' ? { color: C.warning, bg: C.warningBg } : state === 'SYNCED' ? { color: C.primary, bg: alpha(C.primary, 0.1) } : { color: C.textMuted, bg: alpha(C.text, 0.06) };
  const label = state === 'ONLINE' ? tr('borders.airportHealth.offline.online') : state === 'OFFLINE' ? tr('borders.airportHealth.offline.offline') : state === 'SYNCING' ? tr('borders.airportHealth.offline.syncing') : tr('borders.airportHealth.offline.synced');
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.25, py: 0.5, borderRadius: 2, bgcolor: meta.bg }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color, animation: state === 'SYNCING' ? 'pulse 1.4s infinite' : 'none' }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>{label}</Typography>
    </Stack>
  );
};
export const OfflinePill = OFFLINE_PILL;

/* حالات فارغة/تحميل/خطأ موحدة */
export const StateBox = ({ type, text }: { type: 'empty' | 'loading' | 'error'; text: string }) => (
  <Box sx={{ py: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
      {type === 'loading' ? '⏳' : type === 'error' ? '⚠️' : '🗂️'} {text}
    </Typography>
  </Box>
);
