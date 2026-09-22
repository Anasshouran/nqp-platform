import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import BarChartIcon from '@mui/icons-material/BarChart';
import SummarizeIcon from '@mui/icons-material/Summarize';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { getEmergencyStats } from '../../api/endpoints/emergency';
import { useServerTable } from '../../hooks/useServerTable';
import { getAlerts } from '../../api/endpoints/emergency';
import type { EmergencyAlert } from '../../types/emergency';
import { alertStatus } from '../../utils/status';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'alerts', label: 'الإنذارات حسب الحالة', icon: <BarChartIcon fontSize="small" /> },
  { id: 'summary', label: 'ملخص العمليات', icon: <SummarizeIcon fontSize="small" /> },
] as const;

const ReportsPage = () => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const alerts = useServerTable<EmergencyAlert>({ fetchData: getAlerts, initialPageSize: 100 });

  useEffect(() => {
    getEmergencyStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const cards = [
    { value: stats.active_alerts ?? '—', label: 'إنذارات نشطة', icon: <WarningAmberIcon />, accent: 'error.main' },
    { value: stats.open_events ?? '—', label: 'حالات مفتوحة', icon: <FactCheckIcon />, accent: 'warning.main' },
    { value: stats.screenings_today ?? '—', label: 'فحوصات اليوم', icon: <ScienceIcon />, accent: 'info.main' },
    { value: stats.positive_results_today ?? '—', label: 'نتائج إيجابية اليوم', icon: <BiotechIcon />, accent: 'primary.main' },
  ];

  const alertChartData = useMemo(() => {
    const statuses = Object.values(alertStatus);
    const counts = statuses.map((s) => alerts.rows.filter((a) => a.status === Object.entries(alertStatus).find(([k]) => alertStatus[k] === s)?.[0]).length);
    return {
      labels: statuses.map((s) => s.label),
      datasets: [
        {
          label: 'عدد الإنذارات',
          data: counts,
          backgroundColor: statuses.map((s) =>
            s.tone === 'error' ? '#d64545' : s.tone === 'warning' ? '#f5a623' : '#22a06b'
          ),
          borderRadius: 10,
          barPercentage: 0.6,
        },
      ],
    };
  }, [alerts.rows]);

  return (
    <Box>
      <DashboardHero
        title="التقارير"
        subtitle="نظرة تحليلية على مؤشرات الأداء والعمليات"
        eyebrow="الطوارئ والتقارير"
        avatarLabel="ا"
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
            label="أقسام التقارير"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <KpiCard value={loading ? '…' : card.value} label={card.label} icon={card.icon} accent={card.accent} />
          </Grid>
        ))}
      </Grid>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                الإنذارات حسب الحالة
              </Typography>
              <Typography variant="caption" color="text.secondary">
                توزيع الإنذارات الحالية في النظام
              </Typography>
              <Box sx={{ height: 320, mt: 2 }}>
                {alerts.loading ? (
                  <Skeleton variant="rounded" width="100%" height={320} />
                ) : (
                  <Bar
                    data={alertChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { rtl: true } },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Cairo' } } },
                        y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'Cairo' } }, grid: { color: 'rgba(0,0,0,0.06)' } },
                      },
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box component="section" ref={register('summary')} data-section="summary" sx={{ scrollMarginTop: '80px' }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                ملخص العمليات
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'عينات قيد الفحص', value: stats.samples_in_process },
                  { label: 'منافذ بها إنذارات', value: stats.ports_with_alerts },
                ].map((row) => (
                  <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 2, borderRadius: 2, bgcolor: 'primary.lighter' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {row.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {loading ? '…' : row.value ?? 0}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
              </Typography>
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

export default ReportsPage;
