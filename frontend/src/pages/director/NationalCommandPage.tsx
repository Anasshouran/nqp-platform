import { labelOf, colorOf } from '../../utils/labels';
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
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
} from 'recharts';
import { SectionCard, NotificationPanel, EmptyState } from '../../components/uikit';
import {
  CommandSectionRail,
  useCommandSections,
  type CommandSectionDef,
} from '../../components/command';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { getExecutiveDashboard } from '../../api/endpoints/reports';
import type { ExecutiveDashboard, SectorRow as DashSector } from '../../api/endpoints/reports';
import type { OpsStatus } from '../../types/commandCenter';
import { statusMeta } from '../../types/commandCenter';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';

/* ============================= ثوابت ============================= */

const PRA = '#0c7f6a';
const DANGER = '#c63a3a';
const WARN = '#a98a2e';
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

const SECTOR_STATUS: Record<string, OpsStatus> = { STABLE: 'NORMAL', WATCH: 'WATCH', CRITICAL: 'CRITICAL' };

/* ============================= الصفحة الرئيسية ============================= */

const NationalCommandPage = () => {
  const [dash, setDash] = useState<ExecutiveDashboard | null>(null);
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
      setDash(response.data.data);
    } catch {
      setDash(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdate(new Date());
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    const k = dash?.kpis;
    return [
      { icon: <AccountTreeIcon />, value: String(k?.sectors ?? 0), label: 'القطاعات', accent: 'primary.main' },
      { icon: <AnchorIcon />, value: `${k?.ports?.total ?? 0}`, label: 'المنافذ النشطة', accent: 'success.main' },
      { icon: <GroupsIcon />, value: (k?.passengers ?? 0).toLocaleString('en-US'), label: 'المسافرون', accent: 'info.main', trend: { label: 'اليوم', positive: true } },
      { icon: <Inventory2Icon />, value: (dash?.food?.imports ?? 0) + (dash?.food?.exports ?? 0), label: 'شحنات الأغذية', accent: 'warning.main' },
      { icon: <ScienceIcon />, value: k?.samples ?? 0, label: 'العينات في المعمل', accent: 'info.main' },
      { icon: <HealthAndSafetyIcon />, value: k?.suspected ?? 0, label: 'الحالات المشتبه بها', accent: 'error.main' },
      { icon: <EmergencyShareIcon />, value: dash?.surveillance?.active_alerts ?? 0, label: 'التنبيهات الوبائية', accent: 'error.main' },
      { icon: <AssignmentIcon />, value: k?.screenings?.pending ?? 0, label: 'الفحوصات قيد المراجعة', accent: 'secondary.main' },
    ];
  }, [dash]);

  const sectors = useMemo(() => dash?.sectors ?? [], [dash]);
  const performanceData = useMemo(() => sectors.map((s) => ({ name: s.name, score: s.readiness })), [sectors]);
  const alerts = useMemo(() => dash?.alerts ?? [], [dash]);
  const pendingCount = dash?.kpis?.screenings?.pending ?? 0;

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
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorOf(statusMeta, status, 'color') }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {labelOf(statusMeta, status)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                }
              >
                {loading
                  ? <Skeleton variant="rounded" height={520} />
                  : <EmptyState title="قيد الإعداد" description="ستظهر الخريطة الصحية للقطاعات عند توفّر إحداثياتها من المصدر الرسمي." />}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={4}>
              <SectionCard title="حالة القطاعات" subtitle="القطاعات الخاضعة للرقابة القومية" sx={{ height: '100%' }}>
                <Stack spacing={1.25}>
                  {sectors.map((s) => (
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
                  <EmptyState title="قيد الإعداد" description="سيظهر منحنى الفحص اليومي عند توفّر بيانات الفحوصات الزمنية من المصدر الرسمي." />
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="مخرجات الفحص" subtitle="التوزيع الوطني للنتائج">
                {loading ? <Skeleton variant="rounded" height={280} /> : (
                  <EmptyState title="قيد الإعداد" description="سيظهر توزيع مخرجات الفحص عند توفّر بيانات النتائج من المصدر الرسمي." />
                )}
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="الحالات حسب القطاع" subtitle="التوزيع الوبائي حسب القطاع الجغرافي">
                {loading ? <Skeleton variant="rounded" height={260} /> : (
                  <EmptyState title="قيد الإعداد" description="سيظهر توزيع الحالات حسب القطاع عند توفّر بيانات الترصد من المصدر الرسمي." />
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <SectionCard title="الأعراض السائدة" subtitle="أكثر الأعراض تسجيلاً وطنياً">
                {loading ? <Skeleton variant="rounded" height={260} /> : (
                  <EmptyState title="قيد الإعداد" description="ستظهر الأعراض السائدة عند توفّر بيانات الأعراض من المصدر الرسمي." />
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
              action={<Chip label={`${pendingCount} قيد المراجعة`} size="small" color="warning" variant="outlined" />}
            >
              {loading ? <Skeleton variant="rounded" height={180} /> : (
                <EmptyState title="قيد الإعداد" description="ستظهر مراحل سير المعاملات عند توفّر بيانات التدفق من المصدر الرسمي." />
              )}
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
                {loading ? <Skeleton variant="rounded" height={320} /> : (
                  <EmptyState title="قيد الإعداد" description="ستظهر الحالات الحرجة عند توفّر بيانات الحالات من المصدر الرسمي." />
                )}
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
                {loading ? <Skeleton variant="rounded" height={320} /> : alerts.length === 0 ? (
                  <EmptyState title="لا توجد تنبيهات" description="لا توجد تنبيهات حرجة مسجّلة حاليًا." />
                ) : (
                  <Stack spacing={1.5}>
                    {alerts.slice(0, 4).map((a) => {
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
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              {loading ? <Skeleton variant="rounded" height={320} /> : (
                <SectionCard title="غرفة العمليات" subtitle="حالة طارئة نشطة">
                  <EmptyState title="قيد الإعداد" description="ستظهر حالة غرفة العمليات عند توفّر بيانات الطوارئ من المصدر الرسمي." />
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

const SectorRow = ({ sector }: { sector: DashSector }) => {
  const status = SECTOR_STATUS[sector.status] ?? 'NORMAL';
  const meta = statusMeta[status];
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
            {sector.stations} محطة · {sector.screens.toLocaleString('en-US')} شاشة · {sector.suspected} مشتبه
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{sector.readiness}%</Typography>
        </Stack>
        <Box sx={{ mt: 0.75, height: 5, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.08)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${sector.readiness}%`, borderRadius: 4, bgcolor: meta.color }} />
        </Box>
      </Box>
    </Stack>
  );
};

const FooterIndicator = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Stack direction="row" alignItems="center" spacing={1}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color || 'primary.main' }} />
    <Typography variant="caption" color="text.secondary">{label}:</Typography>
    <Typography variant="caption" sx={{ fontWeight: 700, color: color || 'text.primary' }}>{value}</Typography>
  </Stack>
);

export default NationalCommandPage;
