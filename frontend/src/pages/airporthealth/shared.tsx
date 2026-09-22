import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

/* ============================= نظام التصميم ============================= */

export const C = {
  primary: '#0B5CAD',
  primaryDark: '#094A8F',
  medicalBlue: '#0E7490',
  medicalGreen: '#16855B',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  danger: '#C62828',
  dangerBg: '#FDECEC',
  warning: '#D97706',
  warningBg: '#FFF4E5',
  success: '#16855B',
  successBg: '#E9F7F0',
  info: '#0E7490',
  infoBg: '#E6F4F8',
  chart: ['#0B5CAD', '#0E7490', '#16855B', '#D97706', '#C62828', '#7C3AED'],
} as const;

export type RiskKey = 'LOW' | 'MEDIUM' | 'HIGH' | 'ASSESSMENT' | 'CLOSED';
export type HealthStatus = 'CLEARED' | 'SCREENING' | 'SECONDARY' | 'MEDICAL_ASSESSMENT' | 'ALERT' | 'HOLD';

export const RISK_META: Record<RiskKey, { label: string; color: string; bg: string }> = {
  LOW: { label: '🟢 منخفض', color: C.success, bg: C.successBg },
  MEDIUM: { label: '🟡 متوسط', color: C.warning, bg: C.warningBg },
  HIGH: { label: '🔴 مرتفع', color: C.danger, bg: C.dangerBg },
  ASSESSMENT: { label: '🔵 قيد التقييم', color: C.medicalBlue, bg: C.infoBg },
  CLOSED: { label: '⚫ مغلق', color: '#374151', bg: '#F3F4F6' },
};

export const STATUS_META: Record<HealthStatus, { label: string; color: string; bg: string }> = {
  CLEARED: { label: 'صُرف ✓', color: C.success, bg: C.successBg },
  SCREENING: { label: 'فحص أساسي', color: C.primary, bg: '#EAF2FC' },
  SECONDARY: { label: 'فحص ثانوي', color: C.medicalBlue, bg: C.infoBg },
  MEDICAL_ASSESSMENT: { label: 'تقييم طبي', color: C.warning, bg: C.warningBg },
  ALERT: { label: 'إنذار', color: C.danger, bg: C.dangerBg },
  HOLD: { label: 'إيقاف مؤقت', color: '#6B7280', bg: '#F3F4F6' },
};

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ============================= مكونات مشتركة ============================= */

export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Stack spacing={0.4} sx={{ mb: 3 }}>
    <Typography variant="h4" component="h2" sx={{ fontWeight: 700, color: C.text }}>
      {title}
    </Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Stack>
);

export const SurfaceCard = ({ title, subtitle, action, children, sx }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; sx?: object }) => (
  <Card elevation={0} sx={{ borderRadius: '18px', border: `1px solid ${C.border}`, bgcolor: C.surface, boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.05)', ...sx }}>
    {title && (
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 2.5, pb: 1.5, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: C.text }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {action}
      </Stack>
    )}
    <CardContent sx={{ pt: title ? 1 : 2.5 }}>{children}</CardContent>
  </Card>
);

export const KpiCard = ({ icon, value, label, trend, trendLabel, status, statusColor }: {
  icon: ReactNode;
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  status?: string;
  statusColor?: string;
}) => {
  const TrendIcon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : RemoveIcon;
  return (
    <Card elevation={0} sx={{ borderRadius: '18px', border: `1px solid ${C.border}`, bgcolor: C.surface, boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.05)', overflow: 'visible' }}>
      <CardContent sx={{ p: 2.25, display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', color: C.primary, bgcolor: 'rgba(11,92,173,0.09)', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: C.text }}>{value}</Typography>
            {trend && trend !== 'flat' && <TrendIcon sx={{ fontSize: 16, color: trend === 'up' ? C.success : C.danger }} />}
            {trendLabel && <Typography variant="caption" sx={{ color: trend === 'up' ? C.success : trend === 'down' ? C.danger : 'text.disabled', fontWeight: 700 }}>{trendLabel}</Typography>}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
          {status && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor || C.success }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor || C.success }}>{status}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const RiskBadge = ({ risk }: { risk: RiskKey }) => (
  <Chip label={RISK_META[risk].label} size="small" sx={{ bgcolor: RISK_META[risk].bg, color: RISK_META[risk].color, fontWeight: 700, borderRadius: 2 }} />
);

export const StatusBadge = ({ status }: { status: HealthStatus }) => (
  <Chip label={STATUS_META[status].label} size="small" sx={{ bgcolor: STATUS_META[status].bg, color: STATUS_META[status].color, fontWeight: 700, borderRadius: 2 }} />
);

/* شريط تقدم أفقي ملوّن */
export const ProgressBar = ({ value, color = C.primary }: { value: number; color?: string }) => (
  <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#EEF1F5', overflow: 'hidden', width: '100%' }}>
    <Box sx={{ height: '100%', width: `${Math.min(100, Math.max(3, value))}%`, borderRadius: 4, bgcolor: color }} />
  </Box>
);

/* مؤشر دائري (نصف دائرة) للمخاطر */
export const RiskGauge = ({ score, label, color }: { score: number; label: string; color: string }) => (
  <Stack alignItems="center" sx={{ position: 'relative' }}>
    <svg width={160} height={92} viewBox="0 0 160 92">
      <path d="M 18 82 A 62 62 0 0 1 142 82" fill="none" stroke="#EEF1F5" strokeWidth={14} strokeLinecap="round" />
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
export const OFFLINE_PILL = ({ state }: { state: 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' }) => {
  const meta = state === 'ONLINE' ? { color: C.success, bg: C.successBg } : state === 'SYNCING' ? { color: C.warning, bg: C.warningBg } : state === 'SYNCED' ? { color: C.primary, bg: '#EAF2FC' } : { color: '#6B7280', bg: '#F3F4F6' };
  const label = state === 'ONLINE' ? 'ONLINE — متصل' : state === 'OFFLINE' ? 'OFFLINE — غير متصل' : state === 'SYNCING' ? 'SYNCING — مزامنة' : 'SYNC COMPLETE — اكتمل';
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
  <Box sx={{ py: 6, textAlign: 'center', borderRadius: 3, border: `1px dashed ${C.border}`, bgcolor: '#FAFBFD' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
      {type === 'loading' ? '⏳' : type === 'error' ? '⚠️' : '🗂️'} {text}
    </Typography>
  </Box>
);