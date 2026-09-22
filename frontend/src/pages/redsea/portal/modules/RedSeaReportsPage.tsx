import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaidIcon from '@mui/icons-material/Paid';
import VerifiedIcon from '@mui/icons-material/Verified';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getSectorDashboard } from '../../../../api/endpoints/reports';
import type { DashboardWindow, SectorDashboard } from '../../../../api/endpoints/reports';

const WINDOWS: { value: DashboardWindow; label: string }[] = [
  { value: 'day', label: 'اليوم' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
  { value: 'year', label: 'السنة' },
  { value: 'all', label: 'الكل' },
];

const RedSeaReportsPage = () => {
  const [windowKey, setWindowKey] = useState<DashboardWindow>('month');
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSectorDashboard({ window: windowKey })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [windowKey]);

  const performance = useMemo(() => data?.performance ?? [], [data]);
  const shares = data?.revenue?.shares ?? [];

  const kpis = [
    { label: 'إجمالي الإيرادات', value: Number(data?.revenue?.total ?? 0), icon: <PaidIcon />, color: 'success.main' as const },
    { label: 'المعاملات', value: data?.kpis?.shipments ?? 0, icon: <AssessmentIcon />, color: 'primary.main' as const },
    { label: 'العينات', value: data?.kpis?.samples ?? 0, icon: <VerifiedIcon />, color: 'info.main' as const },
    { label: 'الفهارس المسجلة', value: performance.length, icon: <DonutLargeIcon />, color: 'warning.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="التقارير"
        title="تقارير وأداء — قطاع البحر الأحمر"
        subtitle="مؤشرات الأداء والإيرادات للقطاع ضمن النطاق الزمني المحدد."
        action={
          <TextField
            select
            size="small"
            value={windowKey}
            onChange={(e) => setWindowKey(e.target.value as DashboardWindow)}
            sx={{ minWidth: 120 }}
          >
            {WINDOWS.map((w) => (
              <MenuItem key={w.value} value={w.value}>{w.label}</MenuItem>
            ))}
          </TextField>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            {loading ? (
              <Skeleton variant="rounded" height={110} />
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: k.color, display: 'flex' }}>{k.icon}</Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {typeof k.value === 'number' && k.label === 'إجمالي الإيرادات' ? k.value.toLocaleString('ar-EG') : k.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="مؤشرات الأداء" subtitle="القيم المسجلة عند نهاية الفترة">
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : performance.length === 0 ? (
              <EmptyState title="لا توجد مؤشرات أداء" description="لم تُسجّل مؤشرات أداء ضمن القطاع بعد." />
            ) : (
              <Stack spacing={1.5}>
                {performance.map((p) => (
                  <Stack key={p.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{p.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(p.value).toLocaleString('ar-EG')}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="الإيرادات" subtitle="توزيع الإيرادات حسب المصدر">
            {loading ? (
              <Skeleton height={80} />
            ) : shares.length === 0 && !data ? (
              <EmptyState title="لا توجد بيانات إيرادات" description="لا توجد بيانات إيرادات بعد." />
            ) : (
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>إجمالي الإيرادات</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{Number(data?.revenue?.total ?? 0).toLocaleString('ar-EG')}</Typography>
                </Stack>
                {shares.map((sh) => (
                  <Box key={sh.name}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{sh.name}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{sh.amount.toLocaleString('ar-EG')} ({sh.pct}%)</Typography>
                    </Stack>
                    <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                      <Box sx={{ width: `${Math.min(100, sh.pct)}%`, height: '100%', bgcolor: 'success.main', borderRadius: 1 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaReportsPage;
