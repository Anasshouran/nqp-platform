// Queue pipeline summary cards and the weekly activity chart.
// Extracted from ClerkDashboardPage without behavioural change.
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import type { FoodShipment } from '../../../types/food';
import type { QueueCounts } from '../constants';

const PIPELINE_STAGES: Array<{ key: keyof QueueCounts; label: string; color: string }> = [
  { key: 'drafts', label: 'مسودات', color: 'primary.main' },
  { key: 'submitted', label: 'بانتظار الرسوم', color: '#8c6d1f' },
  { key: 'underReview', label: 'بانتظار المراجعة', color: '#a86400' },
  { key: 'inspection', label: 'قيد الفحص', color: '#12a585' },
  { key: 'rejected', label: 'مرفوضة', color: 'error.main' },
];

export const PipelineCard = ({ counts }: { counts: QueueCounts }) => {
  const total = PIPELINE_STAGES.reduce((s, st) => s + (counts[st.key] ?? 0), 0);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>مسار الطلبات</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>توزيع الطلبات الجارية حسب المرحلة</Typography>
        {total === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>لا توجد طلبات جارية حاليًا.</Typography>
        ) : (
          <>
            <Stack direction="row" sx={{ height: 14, borderRadius: 3, overflow: 'hidden', mb: 1.75 }}>
              {PIPELINE_STAGES.map((st) => {
                const v = counts[st.key] ?? 0;
                return v > 0 ? <Box key={st.key} sx={{ width: `${(v / total) * 100}%`, bgcolor: st.color }} /> : null;
              })}
            </Stack>
            <Stack spacing={1}>
              {PIPELINE_STAGES.map((st) => {
                const v = counts[st.key] ?? 0;
                return (
                  <Stack key={st.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: st.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{st.label}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {v} <Typography component="span" variant="caption" color="text.secondary">({total ? Math.round((v / total) * 100) : 0}٪)</Typography>
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const WEEK_LABEL = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' });

export const WeeklyActivityCard = ({ shipments }: { shipments: FoodShipment[] }) => {
  const week = useMemo(() => {
    const days: Array<{ label: string; count: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = shipments.filter((s) => (s.submitted_at || '').slice(0, 10) === key).length;
      days.push({ label: WEEK_LABEL.format(d), count });
    }
    return days;
  }, [shipments]);
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>نشاط الأسبوع</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>الطلبات المُرسلة خلال آخر 7 أيام</Typography>
        <Stack direction="row" alignItems="flex-end" spacing={1.25} useFlexGap sx={{ flex: 1, minHeight: 120, mt: 'auto' }}>
          {week.map((d) => (
            <Stack key={d.label + d.count} sx={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }} spacing={0.5}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.count}</Typography>
              <Box
                sx={{
                  width: '62%',
                  height: d.count ? Math.max(6, Math.round((d.count / max) * 88)) : 4,
                  borderRadius: 2,
                  bgcolor: d.count ? 'primary.main' : 'rgba(16,40,34,0.08)',
                }}
                title={`${d.label}: ${d.count}`}
              />
              <Typography variant="caption" color="text.secondary" noWrap>{d.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export { PIPELINE_STAGES };
