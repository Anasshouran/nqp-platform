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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import ScienceIcon from '@mui/icons-material/Science';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import BugReportIcon from '@mui/icons-material/BugReport';
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
} from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';
import { getSectorDashboard } from '../../api/endpoints/reports';
import type { SectorDashboard, SectorStation, DashboardWindow } from '../../api/endpoints/reports';
import { getSectors } from '../../api/endpoints/organization';
import type { Sector } from '../../types/organization';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const stationMeta: Record<SectorStation['status'], { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STABLE: { label: 'جاهزة', tone: 'success' },
  WATCH: { label: 'انتباه', tone: 'warning' },
  CRITICAL: { label: 'حرجة', tone: 'error' },
};

const portTypeLabels: Record<SectorStation['type'], string> = {
  AIRPORT: 'مطار',
  SEAPORT: 'ميناء بحري',
  LAND_PORT: 'معبر',
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
  { id: 'charts', label: 'التحليلات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'stations', label: 'المحطات', icon: <AccountTreeIcon fontSize="small" /> },
  { id: 'performance', label: 'الأداء', icon: <ScienceIcon fontSize="small" /> },
] as const;

const SectorManagerPage = () => {
  const [page, setPage] = useState(1);
  const [window, setWindow] = useState<DashboardWindow>('month');
  const [sectorId, setSectorId] = useState<string>('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<SectorDashboard['alerts']>([]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let cancelled = false;
    getSectors()
      .then((res) => {
        if (cancelled) return;
        const list = (res.data.data as { results?: Sector[] }).results ?? (res.data.data as unknown as Sector[]);
        const items = Array.isArray(list) ? list : [];
        setSectors(items);
        if (items.length > 0 && !sectorId) setSectorId(items[0].id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sectorId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSectorDashboard({ window, sector_id: sectorId })
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setQueue(res.data.data.alerts);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('تعذر تحميل لوحة القطاع');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window, sectorId]);

  const stations = useMemo(() => data?.stations ?? [], [data]);
  const depts = useMemo(
    () => [...(data?.departments ?? [])].sort((a, b) => b.score - a.score),
    [data],
  );

  const criticalCount = stations.filter((s) => s.status === 'CRITICAL').length;
  const readyCount = stations.filter((s) => s.status === 'STABLE').length;
  const sectorName = data?.sector?.name_ar ?? sectors.find((s) => s.id === sectorId)?.name_ar ?? 'قطاع';

  const resolve = (id: string, approved: boolean) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
    notifySuccess(approved ? 'تمت الموافقة' : 'تم الرفض');
  };

  const kpis = [
    {
      icon: <AccountTreeIcon />,
      value: data?.kpis.stations ?? 0,
      label: 'محطات القطاع',
      accent: 'primary.main',
    },
    {
      icon: <GroupsIcon />,
      value: data?.kpis.staff ?? 0,
      label: 'مفتشون وموظفون',
      accent: 'info.main',
    },
    {
      icon: <AgricultureIcon />,
      value: data?.kpis.shipments ?? 0,
      label: 'شحنات غذائية',
      accent: 'success.main',
      trend: { label: `${data?.kpis.imports ?? 0} وارد · ${data?.kpis.exports ?? 0} صادر`, positive: true },
    },
    {
      icon: <ScienceIcon />,
      value: data?.kpis.samples ?? 0,
      label: 'عينات',
      accent: 'info.main',
      trend: { label: `${data?.food.noncomplying ?? 0} غير مطابقة`, positive: false },
    },
    {
      icon: <PersonSearchIcon />,
      value: data?.kpis.passengers ?? 0,
      label: 'المسافرون',
      accent: 'success.main',
      trend: { label: `${data?.kpis.suspected ?? 0} مشتبهة`, positive: false },
    },
    {
      icon: <WarningAmberIcon />,
      value: criticalCount,
      label: 'محطات بحاجة تدخل',
      accent: 'error.main',
      trend: { label: `${readyCount} جاهزة`, positive: true },
    },
  ];

  const perfLabels = (data?.performance ?? []).map((p) => p.label);
  const perfValues = (data?.performance ?? []).map((p) => p.value);

  return (
    <Box>
      <DashboardHero
        eyebrow="Sector Command"
        title={`لوحة مدير القطاع — ${sectorName}`}
        subtitle="الإشراف على المحطات، رقابة الأغذية، المختبر، المنافذ، والترصد ضمن قطاع واحد"
        gradient="amber"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              sx={{ minWidth: 180, bgcolor: 'background.paper' }}
              inputProps={{ 'aria-label': 'القطاع' }}
            >
              {sectors.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name_ar}
                </MenuItem>
              ))}
            </TextField>
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
              filename="sector-dashboard"
              headers={['المحطة', 'النوع', 'الفحوصات', 'المشتبهة', 'الجاهزية%', 'الحالة']}
              rows={stations.map((s) => [s.name, portTypeLabels[s.type], s.screens, s.suspected, s.readiness, stationMeta[s.status].label])}
              disabled={loading}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{sectorName}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
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
          <Grid item xs={12} sm={6} md={2.4} key={k.label}>
            {loading ? (
              <Skeleton variant="rounded" height={124} />
            ) : (
              <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }} ref={register('charts')} data-section="charts">
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  أداء القطاع خلال الفترة
                </Typography>
                <TrendingUpIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                مؤشرات تشغيل القطاع الرئيسية
              </Typography>
              <Box sx={{ height: 270, mt: 2 }}>
                {loading ? (
                  <Skeleton variant="rounded" height={270} />
                ) : (
                  <Bar
                    data={{
                      labels: perfLabels,
                      datasets: [
                        {
                          label: 'القيمة',
                          data: perfValues,
                          backgroundColor: 'rgba(12,127,106,0.75)',
                          borderRadius: 8,
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
                أعباء المحطات
              </Typography>
              <Typography variant="caption" color="text.secondary">
                توزيع الفحوصات على محطات القطاع
              </Typography>
              <Box sx={{ height: 220, mt: 2, display: 'grid', placeItems: 'center' }}>
                {loading ? (
                  <Skeleton variant="circular" width={170} height={170} />
                ) : (
                  <Doughnut
                    data={{
                      labels: stations.map((s) => s.name),
                      datasets: [
                        {
                          data: stations.map((s) => s.screens || 1),
                          backgroundColor: ['#0c7f6a', '#2f6dd0', '#8a5a00', '#c63a3a', '#425a53', '#7a5aa0', '#0e8b9e'],
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

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <SectionCard
            title="تنبيهات القطاع"
            subtitle={`${queue.length} تنبيه`}
            action={<Chip label="استعراض القطاع" size="small" color="warning" variant="outlined" />}
          >
            <Stack spacing={1.25}>
              {queue.length === 0 ? (
                <Typography color="success.main" sx={{ fontWeight: 700 }}>
                  لا توجد تنبيهات معلقة في القطاع. ✓
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
                    <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: item.severity === 'critical' ? 'error.main' : item.severity === 'medium' ? 'warning.main' : 'primary.main', bgcolor: item.severity === 'critical' ? 'error.light' : 'primary.light', flexShrink: 0 }}>
                      <WarningAmberIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={item.severity} size="small" variant="outlined" color={item.severity === 'critical' ? 'error' : item.severity === 'medium' ? 'warning' : 'primary'} />
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

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <DataTable
            columns={[
              { key: 'name', label: 'المحطة', render: (r: SectorStation) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
              { key: 'type', label: 'النوع', render: (r: SectorStation) => <Chip label={portTypeLabels[r.type]} size="small" variant="outlined" color="primary" /> },
              { key: 'screens', label: 'فحوصات', align: 'center' },
              { key: 'suspected', label: 'مشتبهة', align: 'center', hideOnMobile: true },
              { key: 'readiness', label: 'الجاهزية%', align: 'center', render: (r: SectorStation) => <StatusChip label={`${r.readiness}%`} tone={r.readiness >= 90 ? 'success' : r.readiness >= 75 ? 'warning' : 'error'} /> },
              { key: 'status', label: 'الحالة', render: (r: SectorStation) => <StatusChip label={stationMeta[r.status].label} tone={stationMeta[r.status].tone} /> },
            ]}
            rows={stations}
            rowKey={(r: SectorStation) => r.id}
            count={stations.length}
            page={page}
            rowsPerPage={10}
            onPageChange={setPage}
            title="حالة المحطات"
            subtitle="جاهزية ومستوى العبء لكل محطة في القطاع"
            emptyTitle="لا توجد محطات"
            emptyDescription="لا توجد بيانات مطابقة"
            actions={(r: SectorStation) => <Chip label={r.status === 'CRITICAL' ? 'خطة تدخل' : 'تفاصيل'} size="small" color={r.status === 'CRITICAL' ? 'error' : 'primary'} variant={r.status === 'CRITICAL' ? 'filled' : 'outlined'} />}
            actionsLabel="الإجراء"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <SectionCard
              title="🍎 رقابة الأغذية"
              subtitle={`${data?.food.imports ?? 0} وارد · ${data?.food.exports ?? 0} صادر`}
            >
              <Stack spacing={1.5}>
                <FlowStat icon={<LocalShippingIcon fontSize="small" />} label="شحنات قيد الإجراء" value={data?.food.in_progress ?? 0} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="شحنات مفرج عنها" value={data?.food.released ?? 0} />
                <FlowStat icon={<CloseIcon fontSize="small" />} label="مرفوضة / محجوزة" value={data?.food.rejected ?? 0} />
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="عينات غير مطابقة" value={data?.food.noncomplying ?? 0} />
              </Stack>
            </SectionCard>
            <SectionCard title="🧪 المختبر" subtitle={`متوسط زمن التحليل ${data?.lab.avg_turnover_days ?? 0} يوم`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="عينات مستلمة" value={data?.lab.received ?? 0} />
                <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="قيد التحليل" value={data?.lab.processing ?? 0} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="مكتملة" value={data?.lab.completed ?? 0} />
                <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="نتائج غير مطابقة" value={data?.lab.noncomplying ?? 0} />
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={3}>
          <SectionCard title="✈️ المطارات" subtitle={`${data?.airports.count ?? 0} مطار`}>
            <Stack spacing={1.5}>
              <FlowStat icon={<PersonSearchIcon fontSize="small" />} label="المسافرون" value={data?.airports.passengers ?? 0} />
              <FlowStat icon={<ApartmentIcon fontSize="small" />} label="الرحلات اليوم" value={data?.airports.flights_today ?? 0} />
              <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="الفحوصات الصحية" value={data?.airports.screenings ?? 0} />
              <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="حالات محالة" value={data?.airports.suspected ?? 0} />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <SectionCard title="⚓ الموانئ" subtitle={`${data?.seaports.ships ?? 0} سفينة`}>
            <Stack spacing={1.5}>
              <FlowStat icon={<LocalShippingIcon fontSize="small" />} label="السفن القادمة" value={data?.seaports.ships ?? 0} />
              <FlowStat icon={<FactCheckIcon fontSize="small" />} label="السفن المفحوصة" value={data?.seaports.inspected ?? 0} />
              <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="تصاريح صحية" value={data?.seaports.free_pratique ?? 0} />
              <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="حالات اشتباه" value={data?.seaports.suspected ?? 0} />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <SectionCard title="🦠 الترصد" subtitle={`مستوى الخطر ${data?.surveillance.risk_level ?? 'STABLE'}`}>
            <Stack spacing={1.5}>
              <FlowStat icon={<PersonSearchIcon fontSize="small" />} label="حالات مشتبهة" value={data?.surveillance.suspected ?? 0} />
              <FlowStat icon={<MonitorHeartIcon fontSize="small" />} label="حالات مؤكدة" value={data?.surveillance.confirmed ?? 0} />
              <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="إنذارات نشطة" value={data?.surveillance.active_alerts ?? 0} />
              <FlowStat icon={<CurrencyExchangeIcon fontSize="small" />} label="الإيرادات" value={Math.round(data?.revenue.total ?? 0)} />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <SectionCard title="🦟 مكافحة النواقل" subtitle="لا يوجد مصدر بيانات">
            <Stack spacing={1.5}>
              <FlowStat icon={<BugReportIcon fontSize="small" />} label="البلاغات" value={data?.vectors.reports ?? 0} />
              <FlowStat icon={<FactCheckIcon fontSize="small" />} label="حملات نشطة" value={data?.vectors.active_campaigns ?? 0} />
              <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="مواقع عالية الخطورة" value={data?.vectors.high_risk_sites ?? 0} />
              <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="عمليات رش مكتملة" value={data?.vectors.completed_sprays ?? 0} />
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="أداء الإدارات"
            subtitle="تقييم تقديري حسب عدد الموظفين النشطين"
          >
            <Stack spacing={1.5}>
              {depts.length === 0 ? (
                <Typography color="text.secondary">لا توجد إدارات مسجلة في هذا القطاع</Typography>
              ) : (
                depts.map((d) => (
                  <Stack key={d.id} direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="body2" sx={{ width: { xs: 120, sm: 180 }, fontWeight: 700 }}>
                      {d.name}
                    </Typography>
                    <Box sx={{ flex: 1, bgcolor: 'rgba(16,40,34,0.06)', borderRadius: 1.5, height: 10, overflow: 'hidden' }}>
                      <Box sx={{ width: `${d.score}%`, height: '100%', bgcolor: d.score >= 85 ? '#0c7f6a' : d.score >= 70 ? '#b98a2e' : '#c63a3a', borderRadius: 1.5 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ width: 40, textAlign: 'right', fontWeight: 700 }}>
                      {d.score}%
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="الموظفون في القطاع" subtitle="تعيينات هيكلية نشطة">
            <Stack spacing={1.25}>
              {data?.staff.length ? (
                data.staff.slice(0, 10).map((s) => (
                  <Stack key={s.id} direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                      <GroupsIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.department} {s.station ? ` · ${s.station}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              ) : (
                <Typography color="text.secondary">لا توجد تعيينات مسجلة</Typography>
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

export default SectorManagerPage;