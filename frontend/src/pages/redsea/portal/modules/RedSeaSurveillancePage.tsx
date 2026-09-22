import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import { PageHeader, SectionCard, EmptyState } from '../../../../components/uikit';
import { getSectorDashboard, getEpidemicDashboard } from '../../../../api/endpoints/reports';
import type { SectorDashboard, EpidemicDashboard, EventSeverity } from '../../../../api/endpoints/reports';

const sevColor: Record<EventSeverity, 'error' | 'warning' | 'info' | 'default'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MODERATE: 'warning',
  LOW: 'info',
};

const riskLabels: Record<string, string> = {
  CRITICAL: 'حرج',
  MEDIUM: 'متوسط',
  LOW: 'منخفض',
  STABLE: 'مستقر',
};

const RedSeaSurveillancePage = () => {
  const [dash, setDash] = useState<SectorDashboard | null>(null);
  const [epi, setEpi] = useState<EpidemicDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSectorDashboard({ window: 'month' }),
      getEpidemicDashboard('month'),
    ])
      .then(([sRes, eRes]) => {
        setDash(sRes.data.data);
        setEpi(eRes.data.data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const sur = useMemo(() => dash?.surveillance, [dash]);

  const kpis = [
    { label: 'مشتبهة', value: sur?.suspected ?? '-', icon: <HealthAndSafetyIcon />, color: 'warning.main' as const },
    { label: 'مؤكدة', value: sur?.confirmed ?? '-', icon: <ScienceIcon />, color: 'error.main' as const },
    { label: 'تنبيهات نشطة', value: sur?.active_alerts ?? '-', icon: <NotificationsActiveIcon />, color: 'primary.main' as const },
    { label: 'أحداث نشطة', value: epi?.kpis?.active_events ?? '-', icon: <GroupsIcon />, color: 'info.main' as const },
  ];

  const events = epi?.events ?? [];
  const alerts = epi?.alerts ?? [];

  return (
    <Box>
      <PageHeader
        eyebrow="الترصد الوبائي"
        title="الترصد — قطاع البحر الأحمر"
        subtitle="حالات وأحداث وتنبيهات الترصد الوبائي ضمن نطاق القطاع."
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
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>{k.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <SectionCard title="مؤشرات القطاع" subtitle="مستوى الخطورة وحالات الترصد">
        {loading ? (
          <Skeleton height={40} />
        ) : (
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <Chip label={`مستوى الخطورة: ${riskLabels[sur?.risk_level ?? ''] ?? sur?.risk_level ?? '—'}`} color={sur?.risk_level === 'CRITICAL' ? 'error' : sur?.risk_level === 'MEDIUM' ? 'warning' : 'success'} />
            <Chip label={`عينات المختبر: ${epi?.lab?.samples ?? 0}`} variant="outlined" />
            <Chip label={`إيجابية: ${epi?.lab?.positive ?? 0}`} variant="outlined" />
            <Chip label={`الفرق: ${epi?.kpis?.teams ?? 0}`} variant="outlined" />
          </Stack>
        )}
      </SectionCard>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="الأحداث الوبائية" subtitle="الأحداث النشطة ضمن القطاع">
            {loading ? (
              <Stack spacing={1}><Skeleton height={50} /><Skeleton height={50} /></Stack>
            ) : events.length === 0 ? (
              <EmptyState title="لا توجد أحداث" description="لا توجد أحداث وبائية نشطة ضمن القطاع." />
            ) : (
              <Stack spacing={1.5}>
                {events.slice(0, 8).map((e) => (
                  <Stack key={e.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: sevColor[e.severity] === 'error' ? 'error.main' : 'primary.main', display: 'flex' }}>
                      <HealthAndSafetyIcon />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{e.title}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {e.number} · {e.location} · {e.source}
                      </Typography>
                    </Box>
                    <Chip size="small" label={e.severity} color={sevColor[e.severity]} variant="outlined" />
                    <Chip size="small" label={e.status} />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="التنبيهات" subtitle="إنذارات الترصد الوبائي">
            {loading ? (
              <Stack spacing={1}><Skeleton height={40} /><Skeleton height={40} /></Stack>
            ) : alerts.length === 0 ? (
              <EmptyState title="لا توجد تنبيهات" description="لا توجد تنبيهات ترصد نشطة." />
            ) : (
              <Stack spacing={1.5}>
                {alerts.slice(0, 6).map((a) => (
                  <Stack key={a.id} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: a.status === 'NEW' ? 'error.main' : 'info.main', display: 'flex' }}>
                      <NotificationsActiveIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{a.description}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{a.port}</Typography>
                    </Box>
                    <Chip size="small" label={a.type.replace('_', ' ')} color={a.type === 'RED_ALERT' ? 'error' : 'warning'} variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaSurveillancePage;
