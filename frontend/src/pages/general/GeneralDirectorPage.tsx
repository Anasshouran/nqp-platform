import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import ScienceIcon from '@mui/icons-material/Science';
import StorefrontIcon from '@mui/icons-material/Storefront';
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
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
  NotificationPanel,
} from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';
import { getExecutiveDashboard } from '../../api/endpoints/reports';
import type {
  ExecutiveDashboard,
  SectorRow,
  DashboardWindow,
  SectorStatus,
  TopProduct,
} from '../../api/endpoints/reports';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const sectorMeta: Record<SectorStatus, { label: string; tone: 'error' | 'warning' | 'success' }> = {
  CRITICAL: { label: 'حرج', tone: 'error' },
  WATCH: { label: 'مراقبة', tone: 'warning' },
  STABLE: { label: 'مستقر', tone: 'success' },
};

const WINDOWS: Array<{ key: DashboardWindow; label: string }> = [
  { key: 'day', label: 'اليوم' },
  { key: 'week', label: 'الأسبوع' },
  { key: 'month', label: 'الشهر' },
  { key: 'year', label: 'السنة' },
  { key: 'all', label: 'الكل' },
];

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
const barOptions = { ...lineOptions, indexAxis: 'y' as const };

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 12, padding: 12, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'charts', label: 'المخططات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'escalations', label: 'التصعيدات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'performance', label: 'الأداء', icon: <AdminPanelSettingsIcon fontSize="small" /> },
  { id: 'labs', label: 'المختبرات', icon: <ScienceIcon fontSize="small" /> },
] as const;

const GeneralDirectorPage = () => {
  const [page, setPage] = useState(1);
  const [window, setWindow] = useState<DashboardWindow>('month');
  const [queue, setQueue] = useState<ExecutiveDashboard['alerts']>([]);
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExecutiveDashboard(window)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setQueue(res.data.data.alerts);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('تعذر تحميل لوحة القيادة');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const sectors = useMemo(() => data?.sectors ?? [], [data]);
  const ranking = useMemo(() => data?.ranking ?? [], [data]);

  const criticalCount = useMemo(() => sectors.filter((s) => s.status === 'CRITICAL').length, [sectors]);
  const watchCount = useMemo(() => sectors.filter((s) => s.status === 'WATCH').length, [sectors]);
  const stubCount = useMemo(() => sectors.filter((s) => s.status === 'STABLE').length, [sectors]);

  const resolve = (id: string, approved: boolean) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
    notifySuccess(approved ? 'تمت الموافقة' : 'تم الرفض');
  };

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const kpis = [
    {
      icon: <ApartmentIcon />,
      value: data?.kpis.sectors ?? 0,
      label: 'قطاعات',
      accent: 'primary.main',
    },
    {
      icon: <GroupsIcon />,
      value: data?.kpis.ports.total ?? 0,
      label: 'منافذ',
      accent: 'info.main',
    },
    {
      icon: <PersonSearchIcon />,
      value: data?.kpis.screenings.total ?? 0,
      label: 'فحوصات',
      accent: 'success.main',
      trend: { label: `${data?.kpis.screenings.pending ?? 0} قيد الانتظار`, positive: false },
    },
    {
      icon: <WarningAmberIcon />,
      value: criticalCount,
      label: 'قطاعات حرجة',
      accent: 'error.main',
      trend: { label: `${watchCount} تحت المراقبة`, positive: false },
    },
    {
      icon: <MonitorHeartIcon />,
      value: data?.kpis.suspected ?? 0,
      label: 'حالات مشتبهة',
      accent: 'warning.main',
      trend: { label: `${data?.kpis.confirmed ?? 0} مؤكدة`, positive: false },
    },
    {
      icon: <TrendingUpIcon />,
      value: Number(data?.kpis.revenue ?? 0).toLocaleString('ar-EG'),
      label: 'الإيرادات',
      accent: 'primary.main',
      trend: { label: 'مجمّعة عبر الفترة', positive: true },
    },
  ];

  const chartSectors = ranking.length ? ranking : sectors;
  const topProducts: TopProduct[] = data?.food.top_products ?? [];

  return (
    <Box>
      <DashboardHero
        eyebrow="National Command"
        title="لوحة القيادة التنفيذية الوطنية"
        subtitle="إشراف القومي على أداء القطاعات، رقابة الأغذية، الترصد الوبائي، والمنافذ"
        gradient="amber"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
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
              filename="executive-dashboard"
              headers={['القطاع', 'المحطات', 'الفحوصات', 'المشتبهة', 'الجاهزية%', 'الحالة']}
              rows={chartSectors.map((s) => [s.name, s.stations, s.screens, s.suspected, s.readiness, sectorMeta[s.status].label])}
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
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{data?.kpis.sectors ?? 0} قطاع</Box>,
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
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={2.4} key={k.label}>
            {loading ? (
              <Skeleton variant="rounded" height={124} />
            ) : (
              <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
            )}
          </Grid>
        ))}
      </Grid>
      </Box>

      <Box component="section" ref={register('charts')} data-section="charts" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  أعباء القطاعات
                </Typography>
                <AdminPanelSettingsIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                الفحوصات الجارية لكل قطاع — أين يتركز العبء الأكبر
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" height={300} />
                ) : (
                  <Bar
                    data={{
                      labels: chartSectors.map((s) => s.name),
                      datasets: [
                        {
                          label: 'فحوصات',
                          data: chartSectors.map((s) => s.screens),
                          backgroundColor: chartSectors.map((s) =>
                            s.status === 'CRITICAL' ? '#c63a3a' : s.status === 'WATCH' ? '#b98a2e' : '#0c7f6a',
                          ),
                          borderRadius: 8,
                        },
                      ],
                    }}
                    options={barOptions}
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
                توزيع الفحوصات على القطاعات
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الحصة التشغيلية لكل قطاع من إجمالي الفحوصات
              </Typography>
              <Box sx={{ height: 260, mt: 2, display: 'grid', placeItems: 'center' }}>
                {loading ? (
                  <Skeleton variant="circular" width={180} height={180} />
                ) : (
                  <Doughnut
                    data={{
                      labels: chartSectors.map((s) => s.name),
                      datasets: [
                        {
                          data: chartSectors.map((s) => s.screens || 1),
                          backgroundColor: ['#0c7a6a', '#2f6dd0', '#c63a3a', '#8a5a00', '#425a53', '#7a5aa0', '#0e8b9e', '#b0784e', '#4e7b3e'],
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
      </Box>

      <Box component="section" ref={register('escalations')} data-section="escalations" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <SectionCard
            title="تصعيدات القطاعات بانتظار قرار المدير العام"
            subtitle={`${queue.length} تصعيد`}
            action={<Chip label="استعراض وطني" size="small" color="error" variant="outlined" />}
          >
            <Stack spacing={1.25}>
              {queue.length === 0 ? (
                <Typography color="success.main" sx={{ fontWeight: 700 }}>
                  اكتمل — لا توجد تصعيدات معلقة. ✓
                </Typography>
              ) : (
                queue.map((item) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}
                  >
                    <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                      <AdminPanelSettingsIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={item.severity} size="small" color={item.severity === 'critical' ? 'error' : 'primary'} variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.title}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {item.body} · {formatDateTime(item.time)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton aria-label="تأكيد" size="small" color="success" onClick={() => resolve(item.id, true)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                      <IconButton aria-label="إغلاق" size="small" color="error" onClick={() => resolve(item.id, false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
      </Box>

      <Box component="section" ref={register('performance')} data-section="performance" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <DataTable
            columns={[
              { key: 'name', label: 'القطاع', render: (r: SectorRow) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
              { key: 'stations', label: 'المحطات', align: 'center' },
              { key: 'screens', label: 'فحوصات', align: 'center', hideOnMobile: true },
              { key: 'suspected', label: 'مشتبهة', align: 'center', hideOnMobile: true },
              { key: 'readiness', label: 'الجاهزية%', align: 'center', render: (r: SectorRow) => <StatusChip label={`${r.readiness}%`} tone={r.readiness >= 95 ? 'success' : r.readiness >= 90 ? 'info' : 'warning'} /> },
              { key: 'status', label: 'الحالة', render: (r: SectorRow) => <StatusChip label={sectorMeta[r.status].label} tone={sectorMeta[r.status].tone} /> },
            ]}
            rows={sectors}
            rowKey={(r: SectorRow) => r.id}
            count={sectors.length}
            page={page}
            rowsPerPage={10}
            onPageChange={setPage}
            title="أداء القطاعات"
            subtitle="محطات، فحوصات، عبء، جاهزية، وحالة كل قطاع"
            emptyTitle="لا توجد قطاعات"
            emptyDescription="لا توجد بيانات مطابقة"
            actions={(r: SectorRow) => <Chip label={r.status === 'CRITICAL' ? 'خطة تدخل' : 'تقرير قطاع'} size="small" color={r.status === 'CRITICAL' ? 'error' : 'primary'} variant={r.status === 'CRITICAL' ? 'filled' : 'outlined'} />}
            actionsLabel="الإجراء"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <SectionCard title="رقابة الأغذية" subtitle={`${data?.food.imports ?? 0} وارد · ${data?.food.exports ?? 0} صادر`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<LocalShippingIcon fontSize="small" />} label="شحنات قيد المعالجة" value={data?.food.in_progress ?? 0} />
                <FlowStat icon={<StorefrontIcon fontSize="small" />} label="شحنات مفرج عنها" value={data?.food.released ?? 0} />
                <FlowStat icon={<CloseIcon fontSize="small" />} label="شحنات مرفوضة / محجوزة" value={data?.food.rejected ?? 0} />
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="عينات مختبرات" value={data?.food.samples ?? 0} />
                {topProducts.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      الأكثر رفضاً:
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {topProducts.map((p) => (
                        <Stack key={p.name} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{p.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{p.count}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="الترصد الوبائي" subtitle={`متوسط زمن النتيجة ${data?.labs.avg_turnover_days ?? 0} يوم`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<PersonSearchIcon fontSize="small" />} label="حالات مشتبهة" value={data?.surveillance.suspected ?? 0} />
                <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="حالات مؤكدة" value={data?.surveillance.confirmed ?? 0} />
                <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="إنذارات نشطة" value={data?.surveillance.active_alerts ?? 0} />
                {data && (
                  <Chip
                    label={`مستوى الخطر: ${data.surveillance.risk_level}`}
                    size="small"
                    color={data.surveillance.risk_level === 'CRITICAL' ? 'error' : data.surveillance.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                    variant="filled"
                    sx={{ mt: 0.5, alignSelf: 'flex-start' }}
                  />
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="المنافذ والحركة" subtitle="مطارات وموانئ ومعابر برية">
              <Stack spacing={1.5}>
                <FlowStat icon={<ApartmentIcon fontSize="small" />} label="رحلات اليوم (مطارات)" value={data?.airports.flights_today ?? 0} />
                <FlowStat icon={<AgricultureIcon fontSize="small" />} label="فحوصات المطارات" value={data?.airports.screenings ?? 0} />
                <FlowStat icon={<LocalShippingIcon fontSize="small" />} label="سفن الموانئ" value={data?.seaports.ships ?? 0} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="إجازات صحية (فري براتيك)" value={data?.seaports.free_pratique ?? 0} />
                <FlowStat icon={<GroupsIcon fontSize="small" />} label="فحوصات المعابر البرية" value={data?.land_borders.screenings ?? 0} />
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
      </Box>

      <Box component="section" ref={register('labs')} data-section="labs" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="أداء المختبرات"
            subtitle={`متوسط زمن الإنجاز ${data?.labs.avg_turnover_days ?? 0} يوم`}
          >
            <Stack spacing={1.5}>
              <FlowStat icon={<ScienceIcon fontSize="small" />} label="عينات مستلمة" value={data?.labs.received ?? 0} />
              <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="قيد المعالجة" value={data?.labs.processing ?? 0} />
              <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="مكتملة" value={data?.labs.completed ?? 0} />
              <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="نتائج معلقة الاعتماد" value={data?.labs.pending_results ?? 0} />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: { lg: 'sticky' }, top: 96 }}>
            <NotificationPanel height={340} subtitle="آخر إنذارات النظام" />
          </Box>
        </Grid>
      </Grid>
      </Box>
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

export default GeneralDirectorPage;