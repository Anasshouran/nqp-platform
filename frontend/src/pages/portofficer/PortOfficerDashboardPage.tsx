import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AirplaneTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuth } from '../../hooks/useAuth';
import { StatusChip } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { getTravelers } from '../../api/endpoints/travelers';
import type { Traveler } from '../../types/traveler';
import { getScreenings } from '../../api/endpoints/screening';
import type { HealthScreening } from '../../types/screening';
import { getAlerts } from '../../api/endpoints/emergency';
import type { EmergencyAlert } from '../../types/emergency';
import { travelerStatus, alertStatus, alertType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'arrivals', label: 'وصول المسافرين', icon: <AirplaneTakeoffIcon fontSize="small" /> },
  { id: 'alerts', label: 'الإنذارات النشطة', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'screenings', label: 'أحدث الفحوصات', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'reviews', label: 'قيد المراجعة', icon: <GroupsIcon fontSize="small" /> },
] as const;

const PortOfficerDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [screenings, setScreenings] = useState<HealthScreening[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getTravelers({ page_size: 500 }),
      getScreenings({ page_size: 200 }),
      getAlerts({ page_size: 50 }),
    ])
      .then(([t, s, a]) => {
        setTravelers(t.data.data.results || []);
        setScreenings(s.data.data.results || []);
        setAlerts(a.data.data.results || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const inReview = travelers.filter((t) => t.registration_status === 'UNDER_REVIEW').length;
  const lowOxygen = screenings.filter((s) => s.oxygen_saturation !== null && s.oxygen_saturation < 92).length;
  const activeAlerts = alerts.filter((a) => a.status === 'NEW' || a.status === 'PROCESSING');

  const statCards = [
    { value: loading ? '…' : String(travelers.length), label: 'مسافرون مسجلون', icon: <AirplaneTakeoffIcon />, accent: 'primary.main' },
    { value: loading ? '…' : String(inReview), label: 'قيد المراجعة', icon: <FactCheckIcon />, accent: 'warning.main' },
    { value: loading ? '…' : String(lowOxygen), label: 'تشبع منخفض', icon: <WarningAmberIcon />, accent: 'error.main' },
    { value: loading ? '…' : String(activeAlerts.length), label: 'إنذارات نشطة', icon: <WarningAmberIcon />, accent: 'info.main' },
  ];

  const dailyLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('ar', { weekday: 'short', day: 'numeric' }));
    }
    return labels;
  }, []);

  const dailyCounts = useMemo(() => {
    const buckets: Date[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      buckets.push(d);
    }
    return buckets.map((day) => {
      const key = day.toISOString().slice(0, 10);
      return travelers.filter((t) => (t.created_at || '').slice(0, 10) === key).length;
    });
  }, [travelers]);

  const recentScreenings = [...screenings].sort((a, b) => (b.screened_at || '').localeCompare(a.screened_at || '')).slice(0, 6);
  const topAlerts = [...alerts].sort((a, b) => (b.triggered_at || '').localeCompare(a.triggered_at || '')).slice(0, 6);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { rtl: true, backgroundColor: '#14312a', titleFont: { family: 'IBM Plex Sans Arabic' }, bodyFont: { family: 'IBM Plex Sans Arabic' } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' }, grid: { color: 'rgba(16,40,34,0.06)' } },
    },
  };

  return (
    <Box>
      <DashboardHero
        eyebrow="الحجر البشري"
        title="لوحة موظف الحجر الصحي"
        subtitle={`أهلاً بك، ${user?.full_name || 'موظف الحفر'} - متابعة المسافرين والفحوصات عند المنافذ`}
        gradient="ocean"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <KpiCard {...stat} />
          </Grid>
        ))}
      </Grid>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Box component="section" ref={register('arrivals')} data-section="arrivals" sx={{ scrollMarginTop: '80px', height: '100%' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  وصول المسافرين (آخر 7 أيام)
                </Typography>
                <FactCheckIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                عدد المسافرين المسجلين يومياً لدى المنفذ
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" width="100%" height={300} />
                ) : (
                  <Line
                    data={{
                      labels: dailyLabels,
                      datasets: [
                        {
                          label: 'المسافرون',
                          data: dailyCounts,
                          borderColor: '#0c7f6a',
                          backgroundColor: 'rgba(12,127,106,0.16)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: '#0c7f6a',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                        },
                      ],
                    }}
                    options={lineOptions}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px', height: '100%' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  الإنذارات النشطة
                </Typography>
                <Tooltip title="غرفة الطوارئ">
                  <IconButton aria-label="تقدم" size="small" color="primary" onClick={() => navigate('/app/emergency')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : activeAlerts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  لا توجد إنذارات نشطة حالياً
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {recentAlerts(activeAlerts).map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.alert_type}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 180 }}>
                          {a.description || a.port}
                        </Typography>
                      </Box>
                      <StatusChip label={alertStatus[a.status]?.label || a.status} tone={alertStatus[a.status]?.tone || 'neutral'} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Box component="section" ref={register('screenings')} data-section="screenings" sx={{ scrollMarginTop: '80px', height: '100%' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  أحدث الفحوصات
                </Typography>
                <Tooltip title="جميع الفحوصات">
                  <IconButton aria-label="تقدم" size="small" color="primary" onClick={() => navigate('/app/screening')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : recentScreenings.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  لا توجد فحوصات مسجلة
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {recentScreenings.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{s.traveler_name || 'مسافر'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {s.passport_number}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                          {formatDateTime(s.screened_at)}
                        </Typography>
                        <Badge
                          color="error"
                          variant="dot"
                          invisible={!(s.oxygen_saturation !== null && s.oxygen_saturation < 92)}
                        >
                          <Chip
                            label={s.oxygen_saturation !== null ? `${Math.round(s.oxygen_saturation)}%` : '—'}
                            size="small"
                            variant="outlined"
                          />
                        </Badge>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
          </Box>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Box component="section" ref={register('reviews')} data-section="reviews" sx={{ scrollMarginTop: '80px', height: '100%' }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  المسافرون قيد المراجعة
                </Typography>
                <Tooltip title="جميع المسافرين">
                  <IconButton aria-label="تقدم" size="small" color="primary" onClick={() => navigate('/app/travelers')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : inReview === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  لا يوجد مسافرون قيد المراجعة
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {recentTravelers(travelers).slice(0, 6).map((t) => (
                    <Box
                      key={t.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{t.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {t.passport_number}
                        </Typography>
                      </Box>
                      <StatusChip label={travelerStatus[t.registration_status]?.label || t.registration_status} tone={travelerStatus[t.registration_status]?.tone || 'neutral'} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
          </Box>
        </Grid>
      </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

const uniqueBy = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
};
const recentAlerts = (items: EmergencyAlert[]) => uniqueBy(items).sort((a, b) => (b.triggered_at || '').localeCompare(a.triggered_at || ''));
const recentTravelers = (items: Traveler[]) => items.filter((t) => t.registration_status === 'UNDER_REVIEW').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

export default PortOfficerDashboardPage;