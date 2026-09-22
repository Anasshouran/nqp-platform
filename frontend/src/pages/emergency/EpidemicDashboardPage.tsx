import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
} from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';
import { severityLevel, eventStatus, alertStatus, alertType } from '../../utils/status';
import { getEpidemicDashboard } from '../../api/endpoints/reports';
import type {
  EpidemicDashboard,
  EpidemicEvent,
  EpidemicAlert,
  EpidemicTeam,
  DashboardWindow,
} from '../../api/endpoints/reports';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const WINDOWS: Array<{ key: DashboardWindow; label: string }> = [
  { key: 'day', label: 'اليوم' },
  { key: 'week', label: 'الأسبوع' },
  { key: 'month', label: 'الشهر' },
  { key: 'year', label: 'السنة' },
  { key: 'all', label: 'الكل' },
];

const LEVELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  LEVEL_0: { label: 'مستوى 0 — جاهزية طبيعية', tone: 'success' },
  LEVEL_1: { label: 'مستوى 1 — مراقبة معززة', tone: 'success' },
  LEVEL_2: { label: 'مستوى 2 — استجابة محددة', tone: 'warning' },
  LEVEL_3: { label: 'مستوى 3 — استجابة شاملة', tone: 'error' },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'cases', label: 'منحنى الحالات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'events', label: 'الأحداث الوبائية', icon: <NotificationsActiveIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات والفرق', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'investigations', label: 'التحقيقات والخطة', icon: <FactCheckIcon fontSize="small" /> },
] as const;

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 14, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', titleFont: { family: 'IBM Plex Sans Arabic' }, bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' }, grid: { color: 'rgba(16,40,34,0.06)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 12, padding: 12, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
};

const EpidemicDashboardPage = () => {
  const [page, setPage] = useState(1);
  const [window, setWindow] = useState<DashboardWindow>('month');
  const [data, setData] = useState<EpidemicDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEpidemicDashboard(window)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('تعذر تحميل لوحة مكافحة الأوبئة');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const alerts = useMemo(() => data?.alerts ?? [], [data]);
  const teams = useMemo(() => data?.teams ?? [], [data]);

  const kpis = [
    {
      icon: <WarningAmberIcon />,
      value: data?.kpis.active_events ?? 0,
      label: 'أحداث نشطة',
      accent: 'error.main',
      trend: { label: `${data?.kpis.under_monitoring ?? 0} تحت المراقبة`, positive: false },
    },
    {
      icon: <NotificationsActiveIcon />,
      value: data?.kpis.alerts ?? 0,
      label: 'إنذارات نشطة',
      accent: 'warning.main',
    },
    {
      icon: <PersonSearchIcon />,
      value: data?.kpis.suspected ?? 0,
      label: 'حالات مشتبهة',
      accent: 'warning.main',
    },
    {
      icon: <MonitorHeartIcon />,
      value: data?.kpis.confirmed ?? 0,
      label: 'حالات مؤكدة',
      accent: 'error.main',
      trend: { label: `${data?.kpis.positive ?? 0} نتيجة إيجابية`, positive: false },
    },
    {
      icon: <ScienceIcon />,
      value: data?.kpis.samples ?? 0,
      label: 'عينات مختبرية',
      accent: 'info.main',
    },
    {
      icon: <GroupsIcon />,
      value: data?.kpis.teams ?? 0,
      label: 'أعضاء فرق الاستجابة',
      accent: 'primary.main',
    },
    {
      icon: <LocationOnIcon />,
      value: data?.kpis.affected_locations ?? 0,
      label: 'مناطق متأثرة',
      accent: 'success.main',
    },
  ];

  const levelMeta = LEVELS[data?.response_level ?? 'LEVEL_0'];

  return (
    <Box>
      <DashboardHero
        eyebrow="Epidemic Control & Response"
        title="لوحة مكافحة الأوبئة والاستجابة"
        subtitle="رصد الأحداث الوبائية، فرق الاستجابة، التحقيقات، والمختبر"
        gradient="emerald"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={levelMeta.label}
              color={levelMeta.tone === 'error' ? 'error' : levelMeta.tone === 'warning' ? 'warning' : 'success'}
              sx={{ fontWeight: 700, px: 1 }}
            />
            <TextField
              select
              size="small"
              value={window}
              onChange={(e) => setWindow(e.target.value as DashboardWindow)}
              sx={{ minWidth: 130, bgcolor: 'background.paper' }}
              inputProps={{ 'aria-label': 'الفترة' }}
            >
              {WINDOWS.map((w) => (
                <MenuItem key={w.key} value={w.key}>
                  {w.label}
                </MenuItem>
              ))}
            </TextField>
            <ExportButton
              filename="epidemic-dashboard"
              headers={['الحدث', 'الخطورة', 'الحالة', 'الموقع', 'المصدر', 'أعضاء الفريق', 'المتأثرون']}
              rows={events.map((e) => [
                e.number,
                severityLevel[e.severity]?.label ?? e.severity,
                eventStatus[e.status]?.label ?? e.status,
                e.location,
                e.source,
                e.team_count,
                e.affected_count,
              ])}
              disabled={loading}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{data?.kpis.active_events ?? 0} أحداث نشطة</Box>,
        ]}
      />

      {error && (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

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
      <Grid container spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }} ref={register('overview')} data-section="overview">
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} xl={12 / 7} key={k.label}>
            {loading ? (
              <Skeleton variant="rounded" height={124} />
            ) : (
              <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }} ref={register('cases')} data-section="cases">
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  منحنى الحالات المؤكدة
                </Typography>
                <TrendingUpIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                النتائج المختبرية الإيجابية يوميًا خلال الفترة
              </Typography>
              <Box sx={{ height: 270, mt: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" height={270} />
                ) : (
                  <Line
                    data={{
                      labels: (data?.case_curve ?? []).map((c) => c.date),
                      datasets: [
                        {
                          label: 'حالات مؤكدة',
                          data: (data?.case_curve ?? []).map((c) => c.count),
                          borderColor: '#c63a3a',
                          backgroundColor: 'rgba(198,58,58,0.12)',
                          fill: true,
                          tension: 0.35,
                          pointBackgroundColor: '#c63a3a',
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
        <Grid item xs={12} sm={6} lg={4}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                توزيع الخطورة
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الأحداث الوبائية حسب مستوى الخطورة
              </Typography>
              <Box sx={{ height: 220, mt: 2, display: 'grid', placeItems: 'center' }}>
                {loading ? (
                  <Skeleton variant="circular" width={170} height={170} />
                ) : (
                  <Doughnut
                    data={{
                      labels: Object.keys(data?.severity_totals ?? {}).map((s) => severityLevel[s]?.label ?? s),
                      datasets: [
                        {
                          data: Object.values(data?.severity_totals ?? {}),
                          backgroundColor: ['#0c7f6a', '#b98a2e', '#e07a1f', '#c63a3a'],
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

      <Grid container spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }} ref={register('events')} data-section="events">
        <Grid item xs={12} lg={8}>
          <DataTable
            columns={[
              { key: 'number', label: 'الحدث', render: (r: EpidemicEvent) => <Typography sx={{ fontWeight: 700 }}>{r.number}</Typography> },
              { key: 'title', label: 'العنوان', render: (r: EpidemicEvent) => <Typography sx={{ maxWidth: 320 }}>{r.title}</Typography>, hideOnMobile: true },
              { key: 'severity', label: 'الخطورة', render: (r: EpidemicEvent) => { const m = severityLevel[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
              { key: 'status', label: 'الحالة', render: (r: EpidemicEvent) => { const m = eventStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={r.status} tone="neutral" />; } },
              { key: 'team_count', label: 'الفريق', align: 'center', hideOnMobile: true },
              { key: 'affected_count', label: 'المتأثرون', align: 'center', hideOnMobile: true },
            ]}
            rows={events}
            rowKey={(r: EpidemicEvent) => r.id}
            count={events.length}
            page={page}
            rowsPerPage={10}
            onPageChange={setPage}
            title="الأحداث الوبائية"
            subtitle="الحوادث قيد المتابعة وتفاصيل الاستجابة"
            emptyTitle="لا توجد أحداث"
            emptyDescription="لا توجد أحداث وبائية مسجلة في هذه الفترة"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <SectionCard title="🧪 حالة المختبر" subtitle={`${data?.lab.samples ?? 0} عينة`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="قيد التحليل" value={data?.lab.processing ?? 0} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="عينات مكتملة" value={data?.lab.completed ?? 0} />
                <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="نتائج إيجابية" value={data?.lab.positive ?? 0} />
                <FlowStat icon={<CloseIcon fontSize="small" />} label="نتائج سلبية" value={data?.lab.negative ?? 0} />
              </Stack>
            </SectionCard>
            <SectionCard title="🕵️ التحقيقات الوبائية" subtitle={`${data?.investigations.open ?? 0} مفتوحة`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<PersonSearchIcon fontSize="small" />} label="تم تحديدها" value={data?.investigations.identified ?? 0} />
                <FlowStat icon={<FactCheckIcon fontSize="small" />} label="تم التحقق" value={data?.investigations.verified ?? 0} />
                <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="قيد الاستجابة" value={data?.investigations.responding ?? 0} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="مغلقة" value={data?.investigations.closed ?? 0} />
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }} ref={register('alerts')} data-section="alerts">
        <Grid item xs={12} lg={6}>
          <SectionCard
            title="التنبيهات الوبائية"
            subtitle={`${alerts.length} تنبيه حديث`}
          >
            <Stack spacing={1.25}>
              {alerts.length === 0 ? (
                <Typography color="success.main" sx={{ fontWeight: 700 }}>
                  لا توجد تنبيهات وبائية. ✓
                </Typography>
              ) : (
                alerts.map((a) => (
                  <Stack
                    key={a.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}
                  >
                    <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: a.type === 'RED_ALERT' ? 'error.main' : 'warning.main', bgcolor: a.type === 'RED_ALERT' ? 'error.light' : 'warning.light', flexShrink: 0 }}>
                      <WarningAmberIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={alertType[a.type]?.label ?? a.type} size="small" color={a.type === 'RED_ALERT' ? 'error' : 'warning'} variant="outlined" />
                        <StatusChip label={alertStatus[a.status]?.label ?? a.status} tone={alertStatus[a.status]?.tone ?? 'neutral'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {a.port ? `${a.port} · ` : ''}
                        {formatDateTime(a.triggered_at)}
                        {a.description ? ` — ${a.description}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <SectionCard title="فرق الاستجابة" subtitle={`${data?.kpis.teams ?? 0} عضو`}>
            <Stack spacing={1.25}>
              {teams.length === 0 ? (
                <Typography color="text.secondary">لا توجد فرق استجابة مسجلة</Typography>
              ) : (
                teams.map((t) => (
                  <Stack key={t.id} direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                      <GroupsIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.member}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.role} {t.event_number ? ` · ${t.event_number}` : ''}
                      </Typography>
                    </Box>
                    {t.event_status ? (
                      <StatusChip label={eventStatus[t.event_status]?.label ?? t.event_status} tone={eventStatus[t.event_status]?.tone ?? 'neutral'} />
                    ) : null}
                  </Stack>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ scrollMarginTop: '80px' }} ref={register('investigations')} data-section="investigations">
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="حالة التحقيقات"
            subtitle="توزيع الأحداث الوبائية حسب مرحلة التحقيق"
          >
            <Box sx={{ height: 260 }}>
              <Bar
                data={{
                  labels: ['تم التحديد', 'تم التحقق', 'قيد الاستجابة', 'تحت السيطرة', 'مغلقة'],
                  datasets: [
                    {
                      label: 'الأحداث',
                      data: [
                        data?.investigations.identified ?? 0,
                        data?.investigations.verified ?? 0,
                        data?.investigations.responding ?? 0,
                        data?.investigations.controlled ?? 0,
                        data?.investigations.closed ?? 0,
                      ],
                      backgroundColor: ['#2f6dd0', '#0e8b9e', '#e07a1f', '#b98a2e', '#0c7f6a'],
                      borderRadius: 8,
                    },
                  ],
                }}
                options={lineOptions}
              />
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="خطة الاستجابة النشطة" subtitle="خطة معتمدة للتصدي للأحداث">
            <Stack spacing={1.5}>
              {data?.response_plan.active ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {data.response_plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.response_plan.description || 'لا يوجد وصف للخطة'}
                  </Typography>
                  <Box>
                    <Chip label="خطة نشطة" color="success" size="small" />
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">
                  لا توجد خطة استجابة نشطة حاليًا. يتم تفعيل الخطة عند تأكيد حدث وبائي.
                </Typography>
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
      </Grid>
      </Grid>
    </Box>
  );
};

const FlowStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Stack direction="row" alignItems="center" spacing={1.5}>
    <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
      {icon}
    </Box>
    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>
      {value.toLocaleString('ar-EG')}
    </Typography>
  </Stack>
);

export default EpidemicDashboardPage;
