import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VerifiedIcon from '@mui/icons-material/Verified';
import { PageHeader, SectionCard, StatusChip, EmptyState } from '../../../../components/uikit';
import type { StatusTone } from '../../../../components/uikit';
import { getSectorDashboard } from '../../../../api/endpoints/reports';
import type { DashboardWindow, SectorDashboard, SectorStation } from '../../../../api/endpoints/reports';

const WINDOWS: { value: DashboardWindow; label: string }[] = [
  { value: 'day', label: 'اليوم' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
  { value: 'year', label: 'السنة' },
  { value: 'all', label: 'الكل' },
];

const statusMeta: Record<SectorStation['status'], { label: string; tone: StatusTone }> = {
  STABLE: { label: 'مستقر', tone: 'success' },
  WATCH: { label: 'متابعة', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

const typeLabels: Record<string, string> = {
  AIRPORT: 'مطار',
  SEAPORT: 'ميناء بحري',
  LAND_PORT: 'معبر بري',
};

const typeIcons: Record<string, React.ReactNode> = {
  AIRPORT: <FlightTakeoffIcon />,
  SEAPORT: <DirectionsBoatIcon />,
  LAND_PORT: <DirectionsBusIcon />,
};

const RedSeaPointsPage = () => {
  const [windowKey, setWindowKey] = useState<DashboardWindow>('month');
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    getSectorDashboard({ window: windowKey })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [windowKey]);

  const stations = useMemo(() => data?.stations ?? [], [data]);
  const filtered = useMemo(
    () => (typeFilter === 'ALL' ? stations : stations.filter((s) => s.type === typeFilter)),
    [stations, typeFilter]
  );

  const countBy = (type: string) => stations.filter((s) => s.type === type).length;

  return (
    <Box>
      <PageHeader
        eyebrow="منافذ الدخول"
        title="نقاط الدخول — قطاع البحر الأحمر"
        subtitle="مطارات وموانئ ومعابر برية ضمن نطاق القطاع، مع حالة الجاهزية لكل منفذ."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">جميع الأنواع</MenuItem>
              <MenuItem value="AIRPORT">المطارات</MenuItem>
              <MenuItem value="SEAPORT">الموانئ</MenuItem>
              <MenuItem value="LAND_PORT">المعابر البرية</MenuItem>
            </TextField>
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
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'مطارات', value: countBy('AIRPORT'), icon: <FlightTakeoffIcon />, color: 'primary.main' as const },
          { label: 'موانئ بحرية', value: countBy('SEAPORT'), icon: <DirectionsBoatIcon />, color: 'info.main' as const },
          { label: 'معابر برية', value: countBy('LAND_PORT'), icon: <DirectionsBusIcon />, color: 'success.main' as const },
          {
            label: 'حرجة',
            value: stations.filter((s) => s.status === 'CRITICAL').length,
            icon: <WarningAmberIcon />,
            color: 'error.main' as const,
          },
        ].map((k) => (
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

      <SectionCard title="قائمة منافذ القطاع" subtitle="حالة الجاهزية لكل نقطة دخول">
        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={180} /></Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد منافذ" description="لم تُسجّل منافذ ضمن هذا القطاع بعد." />
        ) : (
          <Grid container spacing={2}>
            {filtered.map((s) => (
              <Grid item xs={12} sm={6} md={4} key={s.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Box sx={{ color: 'primary.main', display: 'flex' }}>{typeIcons[s.type]}</Box>
                      <Chip size="small" label={typeLabels[s.type]} variant="outlined" />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary" dir="ltr">{s.code}</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>فحوصات</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.screens}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 0.5, color: 'warning.main' }}>
                            <WarningAmberIcon fontSize="small" />
                          </Box>
                          مشتبهة
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.suspected}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 0.5, color: 'success.main' }}>
                            <VerifiedIcon fontSize="small" />
                          </Box>
                          جاهزية
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.readiness}%</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 0.5, color: 'info.main' }}>
                            <HealthAndSafetyIcon fontSize="small" />
                          </Box>
                          الحالة
                        </Typography>
                        <StatusChip label={statusMeta[s.status].label} tone={statusMeta[s.status].tone} />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>
    </Box>
  );
};

export default RedSeaPointsPage;
