import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SettingsIcon from '@mui/icons-material/Settings';
import { formatDateTime } from '../../../utils/formatters';
import type { WhoConnectionStatus, WhoConnectivityState } from '../../../types/who';

/**
 * بطاقة حالة WHO — تعرض **الدليل فقط**.
 *
 * قاعدة العرض: كل سطر مشتق من حقل يحمل دليلاً حقيقياً من الـ backend.
 * لا نعرض `DNS ✓` ولا `TLS ✓` ولا `IHR ✓` لأن الـ backend لا يقيسها،
 * ولا نعرض `ICD-11 ✓` إلا إذا أرجع الفحص `api_verified`.
 */

export const WHO_STATE_LABELS: Record<WhoConnectivityState, string> = {
  READY: 'متصل / جاهز',
  ERROR: 'خطأ في الاتصال',
  CONFIGURED: 'مُعد — لم يُتحقق من الاتصال',
  UNCONFIGURED: 'غير مُعد (ناقص اعتماد)',
  INVALID: 'إعدادات غير صالحة',
  DISABLED: 'معطّل',
};

const STATE_ICONS: Record<WhoConnectivityState, typeof CheckCircleIcon> = {
  READY: CheckCircleIcon,
  ERROR: ErrorIcon,
  CONFIGURED: HourglassEmptyIcon,
  UNCONFIGURED: SettingsIcon,
  INVALID: ErrorIcon,
  DISABLED: CancelIcon,
};

const STATE_COLORS: Record<WhoConnectivityState, string> = {
  READY: 'success.main',
  ERROR: 'error.main',
  CONFIGURED: 'warning.main',
  UNCONFIGURED: 'warning.main',
  INVALID: 'error.main',
  DISABLED: 'text.secondary',
};

interface Row {
  label: string;
  value: string;
  tone?: 'success' | 'error' | 'warning' | 'neutral';
}

/** يبني صفوف الدليل. مُستقل عن React لتسهيل الاختبار. */
export const buildEvidenceRows = (status: WhoConnectionStatus | null): Row[] => {
  if (!status) return [];

  const rows: Row[] = [];
  const verified = status.state === 'READY';

  rows.push({
    label: 'الحالة',
    value: WHO_STATE_LABELS[status.state] ?? status.state,
    tone: verified ? 'success' : status.state === 'ERROR' ? 'error' : 'warning',
  });

  // المصادقة: لا يُعرض إلا عندما يؤكّد الـ backend نجاح OAuth.
  if (status.oauth_verified) {
    rows.push({ label: 'المصادقة (OAuth)', value: 'مُتحقَّق منها', tone: 'success' });
  }

  // الاتصال: لا يُعرض إلا بفحص ناجح مسجَّل.
  if (verified) {
    rows.push({ label: 'الاتصال', value: 'مُتحقَّق منه', tone: 'success' });
  }

  // ICD-11: لا نُعلن نجاحاً إلا بدليل صريح من الفحص.
  if (status.api_verified) {
    rows.push({ label: 'ICD-11', value: 'مُتحقَّق منه', tone: 'success' });
  }

  if (status.verified_at) {
    rows.push({ label: 'آخر تحقّق', value: formatDateTime(status.verified_at), tone: 'neutral' });
  }

  // رمز HTTP دليل في الحالتين: نجاح (200) أو فشل مُبلَّغ عنه (401/5xx).
  // لا يُعرض إطلاقاً إن لم يُرجِع الفحص رمزاً.
  if (status.verified_http_status != null) {
    rows.push({
      label: 'رمز HTTP',
      value: String(status.verified_http_status),
      tone: verified ? 'neutral' : 'error',
    });
  }

  if (verified && status.verified_latency_ms != null) {
    rows.push({ label: 'زمن الاستجابة', value: `${status.verified_latency_ms} ms`, tone: 'neutral' });
  }

  if (verified && status.verified_endpoint) {
    rows.push({ label: 'المورد المُختبَر', value: status.verified_endpoint, tone: 'neutral' });
  }

  if (status.environment) {
    rows.push({ label: 'البيئة', value: status.environment, tone: 'neutral' });
  }

  // IHR: لا يوجد مسار حالة معتمد ⇒ نعرض الإعداد فقط، بلا علامة نجاح.
  rows.push({
    label: 'IHR',
    value: status.ihr_configured ? 'مُعد — غير مُتحقَّق' : 'غير مُعد',
    tone: 'neutral',
  });

  return rows;
};

const TONE_COLORS: Record<NonNullable<Row['tone']>, string> = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  neutral: 'text.primary',
};

const WhoConnectivityCard = ({ status }: { status: WhoConnectionStatus | null }) => {
  const rows = buildEvidenceRows(status);
  const StateIcon = STATE_ICONS[status?.state ?? 'DISABLED'];
  const stateColor = STATE_COLORS[status?.state ?? 'DISABLED'];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }} data-testid="who-connectivity-card">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <StateIcon sx={{ color: stateColor }} data-testid="who-state-icon" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              WHO {status ? (WHO_STATE_LABELS[status.state] ?? status.state) : '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {status?.verified_at ? `آخر تحقّق: ${formatDateTime(status.verified_at)}` : 'لم يُجرَ فحص تحقّق بعد'}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1}>
          {rows.map((row) => (
            <Stack
              key={row.label}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              data-testid={`evidence-${row.label}`}
            >
              <Typography variant="body2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography variant="body2" dir={row.label.includes('المورد') ? 'ltr' : 'rtl'} sx={{ color: TONE_COLORS[row.tone ?? 'neutral'], fontWeight: 600 }}>
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {status?.verification_message && status.state !== 'READY' && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {status.verification_message}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoConnectivityCard;
