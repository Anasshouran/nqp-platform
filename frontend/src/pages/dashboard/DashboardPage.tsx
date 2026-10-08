import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PeopleIcon from '@mui/icons-material/People';
import DomainIcon from '@mui/icons-material/Domain';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BiotechIcon from '@mui/icons-material/Biotech';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { alpha, useTheme } from '@mui/material/styles';
import { useAuth } from '../../hooks/useAuth';
import { getSectors, getPorts, getDiseases, getNotices } from '../../api/endpoints/public';
import type { PublicPort } from '../../api/endpoints/public';
import { getTravelers } from '../../api/endpoints/travelers';
import type { Traveler } from '../../types/traveler';
import KpiCard from '../../components/dashboard/KpiCard';
import { accentTokens } from '../../styles/theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const quickModules = [
  { label: 'إدارة المستخدمين', desc: 'إنشاء وتعديل حسابات الموظفين', path: '/app/users', icon: <PeopleIcon />, accent: accentTokens.brand },
  { label: 'المسافرون', desc: 'إدارة تسجيلات المسافرين', path: '/app/travelers', icon: <LocalShippingIcon />, accent: accentTokens.air },
  { label: 'الفحوصات الصحية', desc: 'متابعة الفحوصات عند المنافذ', path: '/app/screening', icon: <BiotechIcon />, accent: accentTokens.sea },
  { label: 'غرفة الطوارئ', desc: 'الإنذارات وحالات الطوارئ', path: '/app/emergency', icon: <WarningAmberIcon />, accent: accentTokens.land },
];

const quickLinks = [
  { label: 'إدارة المستخدمين والأدوار', path: '/app/users' },
  { label: 'لوحة التقارير', path: '/app/reports' },
  { label: 'الموقع العام للمنصة', path: '/', external: false },
];

const portTypeLabels: Record<PublicPort['type'], string> = {
  AIRPORT: 'المطارات',
  SEAPORT: 'الموانئ',
  LAND_PORT: 'المعابر البرية',
};

const portTypeColors: Record<PublicPort['type'], string> = {
  AIRPORT: accentTokens.brand,
  SEAPORT: accentTokens.sea,
  LAND_PORT: '#2f6dd0',
};

const buildDailySeries = (travelers: Traveler[], days: number) => {
  const buckets: string[] = [];
  const index: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push(key);
    index[key] = 0;
  }
  travelers.forEach((t) => {
    const key = (t.created_at || '').slice(0, 10);
    if (key in index) index[key] += 1;
  });
  return buckets.map((key) => index[key]);
};

/* Leading icon tile used on section-level card headers */
const SectionIcon = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <Box
    aria-hidden
    sx={{
      width: 46,
      height: 46,
      borderRadius: 2,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      color,
      bgcolor: alpha(color, 0.1),
      border: `1px solid ${alpha(color, 0.2)}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
    }}
  >
    {children}
  </Box>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState({ sectors: '—', ports: '—', diseases: '—', notices: '—' });
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [chartsReady, setChartsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30>(7);

  useEffect(() => {
    Promise.all([getSectors(), getPorts(), getDiseases(), getNotices(), getTravelers({ page_size: 500 })])
      .then(([sectors, portsData, diseases, notices, travelerData]) => {
        setPorts(portsData.data.data);
        setTravelers(travelerData.data.data.results || []);
        setStats({
          sectors: String(sectors.data.data.length),
          ports: String(portsData.data.data.length),
          diseases: String(diseases.data.data.length),
          notices: String(notices.data.data.filter((n) => n.priority === 'HIGH').length),
        });
        setChartsReady(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('ar', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dailyLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('ar', { weekday: 'short', day: 'numeric' }));
    }
    return labels;
  }, [days]);

  const dailyCounts = useMemo(() => buildDailySeries(travelers, days), [travelers, days]);

  const portTypeCounts = useMemo(() => {
    const types: PublicPort['type'][] = ['AIRPORT', 'SEAPORT', 'LAND_PORT'];
    return types.map((t) => ports.filter((p) => p.type === t).length);
  }, [ports]);

  const totalPorts = portTypeCounts.reduce((a, b) => a + b, 0);

  const statCards = [
    { value: loading ? '…' : stats.ports, label: 'منافذ دخول', icon: <LocalShippingIcon />, accent: 'primary.main', onClick: () => navigate('/app/port-health') },
    { value: loading ? '…' : stats.sectors, label: 'قطاع صحي', icon: <DomainIcon />, accent: 'info.main', onClick: () => navigate('/app/sector-manager') },
    { value: loading ? '…' : stats.diseases, label: 'أمراض مرصودة', icon: <BiotechIcon />, accent: 'warning.main', onClick: () => navigate('/app/epidemic-dashboard') },
    { value: loading ? '…' : stats.notices, label: 'إنذارات عالية', icon: <WarningAmberIcon />, accent: 'error.main', onClick: () => navigate('/app/national-command') },
  ];

  const ink = theme.palette.primary.darker ?? theme.palette.primary.dark ?? theme.palette.primary.main;
  const soft = theme.palette.text.secondary;
  const chartFont = theme.typography.fontFamily;

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { rtl: true, backgroundColor: ink, titleFont: { family: chartFont }, bodyFont: { family: chartFont } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: chartFont }, color: soft } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { family: chartFont }, color: soft }, grid: { color: alpha(ink, 0.07) } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: chartFont }, boxWidth: 12, padding: 14, color: soft } },
      tooltip: { rtl: true, backgroundColor: ink, bodyFont: { family: chartFont } },
    },
  };

  return (
    <Box>
      <Paper
        sx={{
          mb: 3,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          background: `linear-gradient(120deg, ${theme.palette.primary.darker}, ${theme.palette.primary.dark} 52%, ${theme.palette.primary.main})`,
          boxShadow: '0 22px 48px -18px rgba(6,66,56,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
      >
        {/* Aurora wash */}
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <Box
            sx={{
              position: 'absolute',
              width: { xs: 260, md: 360 },
              height: { xs: 260, md: 360 },
              borderRadius: '50%',
              top: -130,
              insetInlineEnd: { xs: -70, md: -90 },
              background: 'radial-gradient(circle, rgba(18,165,133,0.55), transparent 65%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: '50%',
              bottom: -110,
              insetInlineStart: '16%',
              background: 'radial-gradient(circle, rgba(169,138,46,0.3), transparent 65%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: '50%',
              top: -30,
              insetInlineStart: '48%',
              background: 'radial-gradient(circle, rgba(47,109,208,0.24), transparent 65%)',
            }}
          />
        </Box>

        <Box sx={{ position: 'relative', p: { xs: 2.75, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 16 }} />
                {today}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                نظرة عامة على المنصة
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95, mt: 0.5 }}>
                أهلاً بك، {user?.full_name || 'موظف المنصة'} — الإدارة الاتحادية للحجر الصحي
              </Typography>
            </Box>
            <Chip
              icon={<MonitorHeartIcon />}
              label="مراقبة مستمرة 24/7"
              sx={{
                bgcolor: 'rgba(255,255,255,0.14)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                '& .MuiChip-icon': { color: '#fff' },
              }}
            />
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <KpiCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 'var(--pad-card)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.75} alignItems="center">
                  <SectionIcon color={theme.palette.primary.main}>
                    <QueryStatsIcon />
                  </SectionIcon>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      تسجيلات المسافرين
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      عدد المسافرين المسجلين في المنصة يومياً
                    </Typography>
                  </Box>
                </Stack>
                <ToggleButtonGroup
                  value={days}
                  exclusive
                  size="small"
                  onChange={(_, value) => value && setDays(value)}
                  aria-label="نطاق المخطط"
                >
                  <ToggleButton value={7}>آخر ٧ أيام</ToggleButton>
                  <ToggleButton value={30}>آخر ٣٠ يوماً</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Box sx={{ height: 300, mt: 1 }}>
                {!chartsReady ? (
                  <Skeleton variant="rounded" width="100%" height={300} />
                ) : (
                  <Line
                    data={{
                      labels: dailyLabels,
                      datasets: [
                        {
                          label: 'المسافرون',
                          data: dailyCounts,
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.16),
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: theme.palette.primary.main,
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointRadius: 3,
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
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 'var(--pad-card)' }}>
              <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2 }}>
                <SectionIcon color={accentTokens.sea}>
                  <DomainIcon />
                </SectionIcon>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    توزيع المنافذ
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    حسب نوع المنفذ ({totalPorts} منفذاً)
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ height: 300, mt: 1, display: 'grid', placeItems: 'center' }}>
                {!chartsReady ? (
                  <Skeleton variant="circular" width={220} height={220} />
                ) : (
                  <Doughnut
                    data={{
                      labels: ['AIRPORT', 'SEAPORT', 'LAND_PORT'].map((t) => portTypeLabels[t as PublicPort['type']]),
                      datasets: [
                        {
                          data: portTypeCounts,
                          backgroundColor: ['AIRPORT', 'SEAPORT', 'LAND_PORT'].map(
                            (t) => portTypeColors[t as PublicPort['type']],
                          ),
                          borderColor: '#fff',
                          borderWidth: 3,
                        },
                      ],
                    }}
                    options={doughnutOptions}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 'var(--pad-card)' }}>
              <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2.5 }}>
                <SectionIcon color={accentTokens.brand}>
                  <QueryStatsIcon />
                </SectionIcon>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    الوحدات والأنظمة
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    وصلات سريعة إلى الوحدات التشغيلية
                  </Typography>
                </Box>
              </Stack>
              <Grid container spacing={2}>
                {quickModules.map((mod) => (
                  <Grid item xs={12} sm={6} key={mod.label}>
                    <Button
                      component={Link}
                      to={mod.path}
                      fullWidth
                      variant="outlined"
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'right',
                        py: 1.8,
                        px: 2.5,
                        borderRadius: 3,
                        color: 'text.primary',
                        '&:hover': {
                          borderColor: alpha(mod.accent, 0.5),
                          bgcolor: alpha(mod.accent, 0.06),
                          transform: 'translateY(-2px)',
                          boxShadow: `0 14px 30px -16px ${alpha(mod.accent, 0.45)}`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            color: '#fff',
                            background: `linear-gradient(135deg, ${mod.accent}, ${mod.accent}aa)`,
                            boxShadow: `0 8px 18px -10px ${mod.accent}`,
                            flexShrink: 0,
                          }}
                        >
                          {mod.icon}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {mod.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {mod.desc}
                          </Typography>
                        </Box>
                      </Box>
                      <ArrowForwardIcon sx={{ ml: 'auto', color: 'primary.main', flexShrink: 0 }} />
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 'var(--pad-card)' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
                روابط سريعة
              </Typography>
              <Stack spacing={1}>
                {quickLinks.map((link) => (
                  <Button
                    key={link.label}
                    component={Link}
                    to={link.path}
                    endIcon={<ArrowBackIcon />}
                    sx={{ justifyContent: 'space-between', py: 1.2, borderRadius: 2 }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2 }}>
                للحصول على دعم فني أو استفسارات حول النظام، تواصل مع فريق إدارة النظام عبر
                <Typography component="span" color="primary.main" sx={{ fontWeight: 700 }}>
                  {' '}info@nqp.gov.sd
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;