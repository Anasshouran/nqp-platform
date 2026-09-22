import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnchorIcon from '@mui/icons-material/Anchor';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InsightsIcon from '@mui/icons-material/Insights';
import EmergencyShareIcon from '@mui/icons-material/EmergencyShare';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PaidIcon from '@mui/icons-material/Paid';
import PolicyIcon from '@mui/icons-material/Policy';
import CampaignIcon from '@mui/icons-material/Campaign';
import PeopleIcon from '@mui/icons-material/People';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from 'recharts';
import { SectionCard, DataTable, NotificationPanel } from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import {
  CommandSectionRail,
  useCommandSections,
  type CommandSectionDef,
} from '../../components/command';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import StatusChipBase from '../../components/ui/StatusChip';
import SudanMap from './SudanMap';
import { getExecutiveDashboard } from '../../api/endpoints/reports';
import { buildNationalReport } from './nationalData';
import type { NationalCommandReport, OpsStatus, SectorOps, CriticalCase } from '../../types/commandCenter';
import { statusMeta } from '../../types/commandCenter';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';

/* ============================= ثوابت ============================= */

const PRA = '#0c7f6a';
const DANGER = '#c63a3a';
const WARN = '#a98a2e';
const INFO = '#2f6dd0';
const ASH = '#5b6f68';

const chartTooltipStyle = {
  rtl: true as const,
  backgroundColor: '#14312a',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontFamily: 'IBM Plex Sans Arabic',
  fontSize: 12,
};

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

type PeriodKey = 'day' | 'week' | 'month';

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'sectors', label: 'القطاعات', icon: <AccountTreeIcon fontSize="small" /> },
  { id: 'charts', label: 'الترصد', icon: <InsightsIcon fontSize="small" /> },
  { id: 'workflow', label: 'سير المعاملات', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'cases', label: 'الحالات الحرجة', icon: <LocalHospitalIcon fontSize="small" /> },
  { id: 'reports', label: 'التقارير', icon: <AssessmentIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <EmergencyShareIcon fontSize="small" /> },
] as const;

const NATIONAL_REPORTS = [
  { label: 'تقرير الحجر الصحي اليومي', icon: <AssessmentIcon />, color: 'primary.main' },
  { label: 'تقرير الترصد الوبائي', icon: <InsightsIcon />, color: 'error.main' },
  { label: 'تقرير المختبرات', icon: <ScienceIcon />, color: 'info.main' },
  { label: 'تقرير الموانئ', icon: <AnchorIcon />, color: 'info.main' },
  { label: 'تقرير المطارات', icon: <FlightTakeoffIcon />, color: 'info.main' },
  { label: 'تقرير رقابة الأغذية', icon: <RestaurantIcon />, color: 'warning.main' },
  { label: 'تقرير الإيرادات', icon: <PaidIcon />, color: 'success.main' },
  { label: 'مقارنة القطاعات', icon: <AccountTreeIcon />, color: 'primary.main' },
  { label: 'التقارير الشهرية والسنوية', icon: <CalendarMonthIcon />, color: 'secondary.main' },
];

const DIRECTOR_PERMISSIONS = [
  { label: 'إدارة جميع القطاعات', icon: <AccountTreeIcon /> },
  { label: 'مراقبة جميع المحطات', icon: <AnchorIcon /> },
  { label: 'اعتماد القرارات المهمة', icon: <VerifiedIcon /> },
  { label: 'مراجعة الحالات الحرجة', icon: <HealthAndSafetyIcon /> },
  { label: 'متابعة الأوبئة', icon: <EmergencyShareIcon /> },
  { label: 'متابعة أداء المفتشين', icon: <SearchIcon /> },
  { label: 'متابعة المختبرات', icon: <ScienceIcon /> },
  { label: 'الاطلاع على الإيرادات', icon: <PaidIcon /> },
  { label: 'إصدار التقارير القومية', icon: <AssignmentIcon /> },
  { label: 'إدارة السياسات والإجراءات', icon: <PolicyIcon /> },
  { label: 'إرسال تعميمات للقطاعات', icon: <CampaignIcon /> },
  { label: 'إدارة المستخدمين والصلاحيات', icon: <PeopleIcon /> },
  { label: 'متابعة التكامل مع الجهات الحكومية', icon: <SyncAltIcon /> },
];

const OUTCOME_COLORS = [PRA, WARN, DANGER];

/* ============================= الصفحة الرئيسية ============================= */

const NationalCommandPage = () => {
  const [report, setReport] = useState<NationalCommandReport>(() => buildNationalReport());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('day');
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const { active: activeSection, register, scrollTo } = useCommandSections(
    SECTIONS as unknown as CommandSectionDef[],
    [loading],
  );

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getExecutiveDashboard(period);
      const data = response.data.data as { kpis?: { passengers?: number; suspected?: number } };
      setReport(buildNationalReport(data));
    } catch {
      setReport(buildNationalReport());
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdate(new Date());
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => [
    { icon: <AccountTreeIcon />, value: String(report.kpis.sectors), label: 'القطاعات', accent: 'primary.main' },
    { icon: <AnchorIcon />, value: `${report.kpis.stations}+`, label: 'المحطات النشطة', accent: 'success.main' },
    { icon: <GroupsIcon />, value: report.kpis.total_screened.toLocaleString('en-US'), label: 'المسافرون المفحوصون', accent: 'info.main', trend: { label: 'اليوم', positive: true } },
    { icon: <Inventory2Icon />, value: report.kpis.food_shipments, label: 'شحنات الأغذية', accent: 'warning.main' },
    { icon: <ScienceIcon />, value: report.kpis.samples, label: 'العينات في المعمل', accent: 'info.main' },
    { icon: <HealthAndSafetyIcon />, value: report.kpis.critical_cases, label: 'الحالات الحرجة', accent: 'error.main' },
    { icon: <EmergencyShareIcon />, value: report.kpis.epidemic_alerts, label: 'التنبيهات الوبائية', accent: 'error.main' },
    { icon: <AssignmentIcon />, value: report.kpis.pending_transactions, label: 'المعاملات قيد المراجعة', accent: 'secondary.main' },
  ], [report]);

  const screenAreaData = useMemo(() => report.screening.daily_curve.map((d) => ({ name: d.date, 'الفحوصات': d.screened, 'المشتبه بها': d.suspected })), [report]);
  const casesBySectorData = useMemo(() => report.surveillance.cases_by_sector.map((d) => ({ name: d.sector, count: d.count })), [report]);
  const symptomsData = useMemo(() => report.surveillance.top_symptoms.map((d) => ({ name: d.name, count: d.count })), [report]);
  const outcomeData = useMemo(() => [
    { name: 'سليم', value: report.screening.outcome_dist.healthy, color: PRA },
    { name: 'مشتبه', value: report.screening.outcome_dist.suspected, color: WARN },
    { name: 'محوّل', value: report.screening.outcome_dist.referred, color: DANGER },
  ], [report]);
  const performanceData = useMemo(() => report.performance.sector_scores.map((d) => ({ name: d.name, score: d.score })), [report]);

  const criticalCaseColumns: DataTableColumn<CriticalCase>[] = useMemo(() => [
    { key: 'number', label: 'رقم الحالة', width: 130 },
    { key: 'port', label: 'المنفذ' },
    { key: 'case_type', label: 'نوع الحالة' },
    {
      key: 'severity', label: 'الخطورة', width: 120,
      render: (row) => <StatusChipBase label={row.severity === 'CRITICAL' ? 'حرج' : 'مرتفع'} tone={row.severity === 'CRITICAL' ? 'error' : 'warning'} size="small" />,
    },
    {
      key: 'registered_at', label: 'التاريخ', width: 160,
      render: (row) => <Typography variant="caption" color="text.secondary">{formatDateTime(row.registered_at)}</Typography>,
    },
    { key: 'action', label: 'الإجراء', noWrap: false },
    {
      key: 'follow_up', label: 'المتابعة', width: 120,
      render: (row) => {
        const toneMap: Record<string, 'error' | 'warning' | 'info' | 'success'> = { OPEN: 'error', IN_PROGRESS: 'warning', ESCALATED: 'error' };
        const labelMap: Record<string, string> = { OPEN: 'مفتوحة', IN_PROGRESS: 'قيد المتابعة', ESCALATED: 'تصعيد' };
        return <StatusChipBase label={labelMap[row.follow_up] || row.follow_up} tone={toneMap[row.follow_up] || 'info'} size="small" />;
      },
    },
  ], []);

  return (
    <Box>
      {/* ===== رأس الصفحة + أدوات التحكم ===== */}
      <DashboardHero
        eyebrow="القيادة الوطنية"
        title="لوحة قيادة الحجر الصحي القومي"
        subtitle="إشراف قومي على القطاعات والمحطات والمختبرات — مؤشرات تشغيلية لحظية لقرار سريع"
        gradient="amber"
        avatarLabel="ل"
        chips={[
          <Box component="span" key="date" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" key="live" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, v) => v && setPeriod(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.25)', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } } }}
            >
              <ToggleButton value="day">يوم</ToggleButton>
              <ToggleButton value="week">أسبوع</ToggleButton>
              <ToggleButton value="month">شهر</ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="تحديث البيانات">
              <IconButton
                aria-label="تحديث"
                onClick={() => load(true)}
                disabled={refreshing}
                sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : undefined, '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* ===== التخطيط الرئيسي: قائمة أقسام + محتوى ===== */}
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        {/* --- الشريط الجانبي للـ Sections --- */}
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={activeSection}
            onNavigate={scrollTo}
            accent="#8c6d1f"
            label="أقسام القيادة"
          />
        </Grid>

        {/* --- المحتوى الرئيسي --- */}
        <Grid item xs={12} md={9.8} lg={10.2}>
          {/* KPI Cards */}
          <Grid container ref={register('overview')} data-section="overview" spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <Grid item xs={6} sm={4} md={3} key={i}><Skeleton variant="rounded" height={118} /></Grid>
              ))
              : kpis.map((k) => (
                <Grid item xs={6} sm={4} md={3} key={k.label}>
                  <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={'trend' in k ? k.trend : undefined} />
                </Grid>
              ))}
          </Grid>

          {/* خريطة السودان + حالة القطاعات */}
          <Grid container ref={register('sectors')} data-section="sectors" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid item xs={12} lg={8}>
              <SectionCard
                title="خريطة السودان الصحية"
                subtitle="اضغط على القطاع لعرض مؤشراته — 🟢 طبيعي · 🟡 يحتاج متابعة · 🔴 حالة طوارئ"
                action={
                  <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignItems="center">
                    {(['NORMAL', 'WATCH', 'CRITICAL'] as OpsStatus[]).map((status) => (
                      <Stack key={status} direction="row" spacing={0.6} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusMeta[status].color }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {statusMeta[status].label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                }
              >
                {loading ? <Skeleton variant="rounded" height={520} /> : <SudanMap sectors={report.sectors} />}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <SectionCard title="حالة القطاعات" subtitle="القطاعات الخاضعة للرقابة القومية" sx={{ height: '100%' }}>
                <Stack spacing={1.25}>
                  {report.sectors.map((s) => (
                    <SectorRow key={s.id} sector={s} />
                  ))}
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>

          {/* الرسوم البيانية */}
          <Grid container ref={register('charts')} data-section="charts" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid item xs={12} lg={8}>
              <SectionCard
                title="منحنى الفحص اليومي"
                subtitle="عدد الفحوصات والمشتبه بها خلال أسبوع"
                action={<Chip label="آخر 7 أيام" size="small" variant="outlined" />}
              >
                {loading ? <Skeleton variant="rounded" height={280} /> : (
                  <Box sx={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={screenAreaData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradScreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PRA} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={PRA} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} width={32} />
                        <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.06)' }} contentStyle={chartTooltipStyle} />
                        <Area type="monotone" dataKey="الفحوصات" stroke={PRA} strokeWidth={2.5} fill="url(#gradScreen)" />
                        <Area type="monotone" dataKey="المشتبه بها" stroke={DANGER} strokeWidth={2} fill={DANGER} fillOpacity={0.12} />
                        <Legend wrapperStyle={{ fontFamily: 'IBM Plex Sans Arabic', fontSize: 12 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="مخرجات الفحص" subtitle="التوزيع الوطني للنتائج">
                {loading ? <Skeleton variant="rounded" height={280} /> : (
                  <Box sx={{ width: '100%', height: 280, display: 'grid', placeItems: 'center', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={2} stroke="rgba(255,255,255,0.9)" strokeWidth={2}>
                          {outcomeData.map((entry, i) => (
                            <Cell key={entry.name} fill={OUTCOME_COLORS[i]} />
                          ))}
                        </Pie>
                        <ChartTooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{report.screening.total_screened.toLocaleString('en-US')}</Typography>
                      <Typography variant="caption" color="text.secondary">فحص</Typography>
                    </Box>
                  </Box>
                )}
                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 1, gap: 1 }}>
                  {outcomeData.map((d) => (
                    <Stack key={d.name} direction="row" spacing={0.5} alignItems="center">
                      <FiberManualRecordIcon sx={{ fontSize: 8, color: d.color }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="الحالات حسب القطاع" subtitle="التوزيع الوبائي حسب القطاع الجغرافي">
                {loading ? <Skeleton variant="rounded" height={260} /> : (
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={casesBySectorData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} width={28} />
                        <ChartTooltip cursor={{ fill: 'rgba(198,58,58,0.06)' }} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" name="حالات" radius={[6, 6, 0, 0]} maxBarSize={38}>
                          {casesBySectorData.map((_, i) => (
                            <Cell key={i} fill={i % 2 === 0 ? DANGER : WARN} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="الأعراض السائدة" subtitle="أكثر الأعراض تسجيلاً وطنياً">
                {loading ? <Skeleton variant="rounded" height={260} /> : (
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symptomsData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} width={60} />
                        <ChartTooltip cursor={{ fill: 'rgba(47,109,208,0.06)' }} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" name="حالات" radius={[0, 6, 6, 0]} maxBarSize={22} fill={INFO} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <SectionCard title="مؤشر الجاهزية" subtitle="تصنيف القطاعات حسب الأداء">
                {loading ? <Skeleton variant="rounded" height={260} /> : (
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} width={28} />
                        <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.06)' }} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="score" name="الجاهزية %" radius={[6, 6, 0, 0]} maxBarSize={34}>
                          {performanceData.map((d) => (
                            <Cell key={d.name} fill={d.score >= 92 ? PRA : d.score >= 88 ? WARN : DANGER} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* سير المعاملات */}
          <Box ref={register('workflow')} data-section="workflow" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard
              title="سير المعاملات"
              subtitle="النسب المتوقفة عند كل مرحلة — متابعة مباشرة من المدير"
              action={<Chip label={`${report.kpis.pending_transactions} قيد المراجعة`} size="small" color="warning" variant="outlined" />}
            >
              <Grid container spacing={2}>
                {[
                  { stage: 'التسجيل', total: 620, stalled: 12 },
                  { stage: 'الفحص الصحي', total: 480, stalled: 8 },
                  { stage: 'العينات والمختبر', total: 286, stalled: 15 },
                  { stage: 'الاعتماد', total: 210, stalled: 6 },
                  { stage: 'إصدار المستندات', total: 168, stalled: 1 },
                ].map((t) => (
                  <Grid item xs={12} sm={6} md={2.4} key={t.stage}>
                    <Box sx={{ p: 1.75, borderRadius: 3, border: '1px solid rgba(16,40,34,0.08)', bgcolor: 'rgba(255,255,255,0.55)', textAlign: 'center', height: '100%' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>مرحلة {t.stage}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{t.total.toLocaleString('en-US')}</Typography>
                      <Typography variant="caption" color="text.secondary">إجمالي المعاملات</Typography>
                      <Box sx={{ mt: 1.25, p: 1, borderRadius: 2.5, bgcolor: t.stalled > 0 ? 'error.light' : 'success.light' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: t.stalled > 0 ? 'error.main' : 'success.main' }}>
                          {t.stalled > 0 ? `متوقفة: ${t.stalled}` : 'لا توجد متوقفة'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Box>

          {/* الحالات الحرجة + الإشعارات */}
          <Grid container ref={register('cases')} data-section="cases" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid item xs={12} lg={7}>
              <SectionCard
                title="الحالات الحرجة"
                subtitle="الحالات التي تتطلب تدخلاً عاجلاً"
                action={
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<EmergencyShareIcon />}
                    onClick={() => notifySuccess('جارٍ فتح غرفة العمليات القومية')}
                  >
                    فتح غرفة العمليات
                  </Button>
                }
              >
                <DataTable<CriticalCase>
                  columns={criticalCaseColumns}
                  rows={report.critical_cases}
                  rowKey={(r) => r.id}
                  count={report.critical_cases.length}
                  page={1}
                  rowsPerPage={report.critical_cases.length}
                  hidePagination
                />
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <NotificationPanel
                title="الإشعارات والتنبيهات"
                subtitle="آخر تنبيهات النظام"
                height={420}
              />
            </Grid>
          </Grid>

          {/* التنبيهات الحرجة + طوارئ */}
          <Grid container ref={register('alerts')} data-section="alerts" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid item xs={12} lg={7}>
              <SectionCard title="التنبيهات الحرجة" subtitle="أحداث تتطلب نظر المدير القومي الآن">
                <Stack spacing={1.5}>
                  {report.alerts.slice(0, 4).map((a) => {
                    const sevColor = a.severity === 'CRITICAL' ? DANGER : a.severity === 'HIGH' ? WARN : ASH;
                    return (
                      <Box key={a.id} sx={{ p: 2, borderRadius: 3, border: `1px solid ${sevColor}22`, bgcolor: `${sevColor}08` }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sevColor }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: sevColor }}>{a.title}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ mr: 'auto' }}>{a.time}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{a.body}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              {report.emergency && (
                <SectionCard title="غرفة العمليات" subtitle="حالة طارئة نشطة">
                  <Box sx={{ p: 2, borderRadius: 3, border: `2px solid ${DANGER}33`, bgcolor: '#fdeaea' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: DANGER, mb: 1 }}>{report.emergency.title}</Typography>
                    <Stack spacing={0.75}>
                      <EmergencyRow label="النوع" value={report.emergency.case_type} />
                      <EmergencyRow label="العدد" value={`${report.emergency.cases_count} حالات`} />
                      <EmergencyRow label="المنفذ" value={report.emergency.port} />
                      <EmergencyRow label="المسؤول" value={report.emergency.responsible} />
                      <EmergencyRow label="الإجراء" value={report.emergency.action} />
                      <EmergencyRow label="الحالة" value="جاري الاستجابة" color={WARN} />
                    </Stack>
                  </Box>
                </SectionCard>
              )}
            </Grid>
          </Grid>

          {/* التقارير القومية */}
          <Box ref={register('reports')} data-section="reports" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard
              title="التقارير القومية"
              subtitle="تقارير جاهزة للاستخراج على مستوى السودان"
              action={
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => notifySuccess('جارٍ تجهيز تقرير PDF')}>PDF</Button>
                  <Button size="small" variant="contained" color="success" startIcon={<FileDownloadIcon />} onClick={() => notifySuccess('جارٍ تجهيز تقرير Excel')}>Excel</Button>
                  <Button size="small" variant="outlined" color="inherit" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
                </Stack>
              }
            >
              <Grid container spacing={2}>
                {NATIONAL_REPORTS.map((r) => (
                  <Grid item xs={6} sm={4} md={2.6} key={r.label}>
                    <Box
                      onClick={() => notifySuccess(`جارٍ تجهيز ${r.label}`)}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid rgba(16,40,34,0.08)',
                        bgcolor: 'rgba(255,255,255,0.55)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(16,40,34,0.1)', borderColor: r.color },
                      }}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: r.color, bgcolor: `${r.color}1a`, mx: 'auto', mb: 1 }}>
                        {r.icon}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Box>

          {/* صلاحيات المدير */}
          <Box sx={{ mb: 3 }}>
            <SectionCard
              title="صلاحيات المدير"
              subtitle="اختصاصات مدير الحجر الصحي القومي"
              action={<Chip label="National Quarantine Director" size="small" color="primary" variant="outlined" />}
            >
              <Grid container spacing={1.5}>
                {DIRECTOR_PERMISSIONS.map((p) => (
                  <Grid item xs={12} sm={6} md={4} key={p.label}>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', height: '100%' }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>{p.icon}</Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.label}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Box>

          {/* الفوتر */}
          <Card sx={{ p: 2.5, textAlign: 'center', borderRadius: 4, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              الحجر الصحي القومي — ننقذ الأرواح ونحمي الصحة
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="center" spacing={3} sx={{ mt: 1.5 }} flexWrap="wrap">
              <FooterIndicator label="آخر تحديث" value={formatDateTime(lastUpdate.toISOString())} />
              <FooterIndicator label="حالة النظام" value="مستقر" color="success.main" />
              <FooterIndicator label="التكاملات الحكومية" value="8/9 متصلة" color="success.main" />
              <FooterIndicator label="مصدر البيانات" value="منصة NQP + تبادل إلكتروني" />
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= المكونات الفرعية ============================= */

const SectorRow = ({ sector }: { sector: SectorOps }) => {
  const meta = statusMeta[sector.status];
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)' }}
    >
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: meta.color, boxShadow: `0 0 0 4px ${meta.soft}`, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{sector.name}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>{meta.label}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {sector.ports} منفذ · {sector.screenings.toLocaleString('en-US')} فحص · {sector.suspected} مشتبه
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{sector.readiness}%</Typography>
        </Stack>
        <Box sx={{ mt: 0.75, height: 5, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.08)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${sector.readiness}%`, borderRadius: 4, bgcolor: sector.status === 'CRITICAL' ? 'error.main' : sector.status === 'WATCH' ? 'warning.main' : 'success.main' }} />
        </Box>
      </Box>
    </Stack>
  );
};

const EmergencyRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="caption" sx={{ fontWeight: 700, color: color || 'text.primary', textAlign: 'end', maxWidth: '60%' }}>{value}</Typography>
  </Stack>
);

const FooterIndicator = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Stack direction="row" alignItems="center" spacing={1}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color || 'primary.main' }} />
    <Typography variant="caption" color="text.secondary">{label}:</Typography>
    <Typography variant="caption" sx={{ fontWeight: 700, color: color || 'text.primary' }}>{value}</Typography>
  </Stack>
);

export default NationalCommandPage;
