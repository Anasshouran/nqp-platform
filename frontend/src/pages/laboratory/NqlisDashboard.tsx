import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmergencyShareIcon from '@mui/icons-material/EmergencyShare';
import MedicationIcon from '@mui/icons-material/Medication';
import VerifiedIcon from '@mui/icons-material/Verified';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { SectionCard, StatusChip, DataTable, ExportButton, NotificationPanel } from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { getLabDashboard, getLabSamples } from '../../api/endpoints/laboratory';
import { useLabScope } from '../../hooks/useLabSectors';
import type { LabDashboard, LabSample } from '../../types/laboratory';
import { sampleStatus, sampleType, sampleSource, samplePriority } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const PRA = '#0c7f6a';
const WARN = '#a98a2e';
const DANGER = '#c63a3a';
const INFO = '#2f6dd0';
const ASH = '#5b6f68';

const toneHex: Record<string, string> = {
  success: PRA,
  warning: WARN,
  error: DANGER,
  info: INFO,
  primary: PRA,
  neutral: ASH,
};

const PIE_COLORS = [PRA, INFO, WARN, '#8a5a00', '#7c3aed', '#425a53', DANGER, '#2c7fbe'];

const chartTooltipStyle = {
  rtl: true as const,
  backgroundColor: '#14312a',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontFamily: 'IBM Plex Sans Arabic',
  fontSize: 12,
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'tests', label: 'مسار الاختبارات', icon: <ScienceIcon fontSize="small" /> },
  { id: 'samples', label: 'توزيع العينات', icon: <BiotechIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات والمخاطر', icon: <WarningAmberIcon fontSize="small" /> },
] as const;

const NqlisDashboard = () => {
  const navigate = useNavigate();
  const { sector } = useLabScope();
  const [data, setData] = useState<LabDashboard | null>(null);
  const [recent, setRecent] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const goTab = useCallback((key: string) => navigate({ hash: `#${key}` }), [navigate]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [d, r] = await Promise.all([
        getLabDashboard(sector ?? undefined),
        getLabSamples({ page_size: 8, ordering: '-received_at', sector: sector ?? undefined }),
      ]);
      setData(d.data.data);
      setRecent(Array.isArray(r.data.data.results) ? r.data.data.results : []);
    } catch {
      notifyError('تعذر تحميل لوحة المختبر');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getLabDashboard(sector ?? undefined)
      .then((res) => mounted && setData(res.data.data))
      .catch(() => mounted && notifyError('تعذر تحميل لوحة المختبر'))
      .finally(() => mounted && setLoading(false));
    getLabSamples({ page_size: 8, ordering: '-received_at', sector: sector ?? undefined })
      .then((r) => mounted && setRecent(Array.isArray(r.data.data.results) ? r.data.data.results : []))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [sector]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const qualityIssues =
      data.quality.reagents.expired +
      data.quality.reagents.low_stock +
      data.quality.equipment.overdue +
      data.quality.non_conformities.open;
    return [
      { icon: <DashboardIcon />, value: data.totals.samples, label: 'إجمالي العينات', accent: 'primary.main', trend: { label: `+${data.totals.received_today} اليوم`, positive: true }, onClick: () => goTab('samples') },
      { icon: <PendingIcon />, value: data.totals.pending_reception, label: 'بانتظار الاستقبال', accent: 'warning.main', onClick: () => goTab('reception') },
      { icon: <ScienceIcon />, value: data.totals.under_testing, label: 'قيد التحليل', accent: 'info.main', onClick: () => goTab('worklist') },
      { icon: <FactCheckIcon />, value: data.totals.ready_for_approval, label: 'جاهزة للاعتماد', accent: 'info.main', onClick: () => goTab('worklist') },
      { icon: <VerifiedIcon />, value: data.totals.completed, label: 'مكتملة', accent: 'success.main', onClick: () => goTab('samples') },
      { icon: <WarningAmberIcon />, value: data.critical.open, label: 'نتائج حرجة مفتوحة', accent: 'error.main', onClick: () => goTab('critical') },
      { icon: <MonitorHeartIcon />, value: data.tests.submitted, label: 'اختبارات بانتظار المراجعة', accent: 'warning.main', trend: { label: `${data.tests.in_progress} قيد التنفيذ`, positive: true }, onClick: () => goTab('worklist') },
      { icon: <BuildIcon />, value: qualityIssues, label: 'مؤشرات جودة بانتظار المعالجة', accent: 'error.main', onClick: () => goTab('quality') },
    ];
  }, [data, goTab]);

  const testsPipeline = useMemo(() => {
    if (!data) return [];
    const t = data.tests;
    return [
      { label: 'بانتظار', value: t.pending, fill: WARN },
      { label: 'قيد التنفيذ', value: t.in_progress, fill: INFO },
      { label: 'مسودات', value: t.draft, fill: ASH },
      { label: 'بانتظار المراجعة', value: t.submitted, fill: '#8a5a00' },
      { label: 'معتمدة', value: t.approved, fill: PRA },
    ];
  }, [data]);

  const statusDonut = useMemo(() => {
    if (!data) return { items: [], total: 0 };
    const entries = Object.entries(data.by_status).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 5);
    const rest = entries.slice(5).reduce((acc, [, v]) => acc + v, 0);
    const items = top.map(([k, v]) => ({
      name: sampleStatus[k]?.label || k,
      value: v,
      color: toneHex[sampleStatus[k]?.tone || 'neutral'],
    }));
    if (rest > 0) items.push({ name: 'أخرى', value: rest, color: '#cbd5d1' });
    return { items, total: data.totals.samples };
  }, [data]);

  const sourceDonut = useMemo(() => {
    if (!data) return { items: [], total: 0 };
    const entries = data.by_source.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
    const top = entries.slice(0, 5);
    const rest = entries.slice(5).reduce((acc, s) => acc + s.count, 0);
    const items = top.map((s, i) => ({
      name: s.name,
      value: s.count,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
    if (rest > 0) items.push({ name: 'أخرى', value: rest, color: '#cbd5d1' });
    return { items, total: entries.reduce((acc, s) => acc + s.count, 0) };
  }, [data]);

  const sectionBars = useMemo(() => {
    if (!data) return [];
    return data.by_section
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((s) => ({ name: s.name, count: s.count }));
  }, [data]);

  const qualityRows = useMemo(() => {
    if (!data) return [];
    const q = data.quality;
    const eqTotal = q.equipment.total || 1;
    const rTotal = q.reagents.total || 1;
    return [
      { label: 'أجهزة معايرة متأخرة', value: q.equipment.overdue, total: eqTotal, color: DANGER },
      { label: 'أجهزة معايرة قريبة', value: q.equipment.due_soon, total: eqTotal, color: WARN },
      { label: 'مواد منتهية الصلاحية', value: q.reagents.expired, total: rTotal, color: DANGER },
      { label: 'مواد تنتهي قريباً', value: q.reagents.expiring_soon, total: rTotal, color: WARN },
      { label: 'مواد مخزون منخفض', value: q.reagents.low_stock, total: rTotal, color: INFO },
      { label: 'فحوصات جودة فاشلة', value: q.qc.failed, total: Math.max(q.qc.pending + q.qc.failed, 1), color: DANGER },
      { label: 'فحوصات جودة معلقة', value: q.qc.pending, total: Math.max(q.qc.pending + q.qc.failed, 1), color: WARN },
      { label: 'عدم مطابقة مفتوح', value: q.non_conformities.open, total: 12, color: DANGER },
    ];
  }, [data]);

  const alerts = useMemo(() => {
    if (!data) return [];
    const q = data.quality;
    const list: Array<{ icon: React.ReactElement; text: string; sub: string; color: string; bg: string; tab: string }> = [];
    if (data.critical.open > 0) list.push({ icon: <WarningAmberIcon />, text: `${data.critical.open} نتيجة حرجة مفتوحة`, sub: 'تتطلب إقراراً فورياً', color: DANGER, bg: '#fdeaea', tab: 'critical' });
    if (q.equipment.overdue > 0) list.push({ icon: <BuildIcon />, text: `${q.equipment.overdue} جهاز متأخر المعايرة`, sub: 'راجع جدول المعايرة', color: DANGER, bg: '#fdeaea', tab: 'equipment' });
    if (q.reagents.expired > 0) list.push({ icon: <MedicationIcon />, text: `${q.reagents.expired} مادة منتهية الصلاحية`, sub: 'حظر الاستخدام وإتلافها', color: DANGER, bg: '#fdeaea', tab: 'reagents' });
    if (q.qc.failed > 0) list.push({ icon: <FactCheckIcon />, text: `${q.qc.failed} فحص جودة فاشل`, sub: 'إجراء تصحيحي مطلوب', color: DANGER, bg: '#fdeaea', tab: 'qc' });
    if (q.non_conformities.open > 0) list.push({ icon: <BuildIcon />, text: `${q.non_conformities.open} عدم مطابقة مفتوح`, sub: 'أغلق منها أو أعد الفحص', color: WARN, bg: '#fdf3e0', tab: 'quality' });
    if (q.reagents.low_stock > 0) list.push({ icon: <LocalShippingIcon />, text: `${q.reagents.low_stock} مادة منخفضة المخزون`, sub: 'اطلب توريدها قريباً', color: WARN, bg: '#fdf3e0', tab: 'reagents' });
    if (q.reagents.expiring_soon > 0) list.push({ icon: <MedicationIcon />, text: `${q.reagents.expiring_soon} مادة تنتهي قريباً`, sub: 'استهلكها أولاً (FEFO)', color: WARN, bg: '#fdf3e0', tab: 'reagents' });
    if (q.equipment.due_soon > 0) list.push({ icon: <BuildIcon />, text: `${q.equipment.due_soon} جهاز معايرة قريبة`, sub: 'حدد موعد المعايرة', color: INFO, bg: '#e7f0fb', tab: 'equipment' });
    if (q.qc.pending > 0) list.push({ icon: <FactCheckIcon />, text: `${q.qc.pending} فحص جودة معلق`, sub: 'بانتظار التنفيذ', color: INFO, bg: '#e7f0fb', tab: 'qc' });
    return list.slice(0, 6);
  }, [data]);

  const columns = useMemo<DataTableColumn<LabSample>[]>(
    () => [
      { key: 'sample_number', label: 'رقم العينة', render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{s.sample_number || s.sample_barcode}</Typography> },
      { key: 'sample_type', label: 'النوع', render: (s) => <StatusChip label={s.sample_type_label || sampleType[s.sample_type]?.label || s.sample_type} tone="neutral" variant="outlined" />, hideOnMobile: true },
      { key: 'source', label: 'المصدر', render: (s) => s.source_label || sampleSource[s.source]?.label || s.source, hideOnMobile: true },
      { key: 'priority', label: 'الأولوية', render: (s) => { const m = samplePriority[s.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={s.priority} tone="neutral" />; } },
      { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={s.status_label || sampleStatus[s.status]?.label || s.status} tone={sampleStatus[s.status]?.tone || 'neutral'} /> },
      { key: 'received_at', label: 'الاستلام', render: (s) => (s.received_at ? formatDateTime(s.received_at) : '—'), hideOnMobile: true },
    ],
    []
  );

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 14 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) return null;

  const criticalCount = data.critical.open + alerts.filter((a) => a.color === DANGER).length;

  return (
    <Box>
      <DashboardHero
        eyebrow="نظام معلومات المختبر القومي — البيانات التشغيلية"
        title="لوحة قيادة المختبر القومي"
        subtitle="مراقبة لحظية لسير العينات والتحاليل والجودة — الاستقبال، الفحص، الاعتماد، وعدم المطابقة"
        gradient="emerald"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="تحديث البيانات">
              <IconButton aria-label="تحديث" size="small" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }} disabled={refreshing} onClick={() => load(true)}>
                <RefreshIcon fontSize="small" sx={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
              </IconButton>
            </Tooltip>
            <ExportButton
              filename={`nql-dashboard-${new Date().toISOString().slice(0, 10)}`}
              headers={['رقم العينة', 'النوع', 'المصدر', 'القسم', 'الأولوية', 'الحالة', 'الاستلام']}
              rows={recent.map((s) => [s.sample_number || s.sample_barcode, s.sample_type_label, s.source_label, s.section_name, s.priority_label, s.status_label, s.received_at ? formatDateTime(s.received_at) : ''])}
              disabled={loading || recent.length === 0}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      {criticalCount > 0 && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'error.light', background: 'linear-gradient(90deg, rgba(198,58,58,0.09), rgba(255,255,255,0.6))', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'error.main', flexShrink: 0 }}>
            <EmergencyShareIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`${criticalCount} إجراء عاجل`} size="small" color="error" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>تتطلب النتائج الحرجة وقضايا الجودة اهتماماً فورياً</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {data.critical.open} نتيجة حرجة مفتوحة · {data.quality.equipment.overdue} جهاز متأخر المعايرة · {data.quality.reagents.expired} مادة منتهية
            </Typography>
          </Box>
          <Chip label="عرض التفاصيل" size="small" color="error" clickable onClick={() => goTab('critical')} />
        </Box>
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
            <Grid item xs={6} sm={4} md={3} key={k.label}>
              {loading ? <Skeleton variant="rounded" height={118} /> : <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} onClick={k.onClick} />}
            </Grid>
          ))}
        </Grid>
      </Box>

      <Grid container spacing={3} ref={register('tests')} data-section="tests" sx={{ scrollMarginTop: '80px', mb: 3 }}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="مسار الاختبارات" subtitle={`${data.tests.total} اختباراً في السير`} action={
            <Chip icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} label="معتمدة وفقاً للحالة" size="small" color="primary" variant="outlined" onClick={() => goTab('worklist')} />
          }>
            <Box sx={{ width: '100%', height: 232 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testsPipeline} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11.5, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} width={28} />
                  <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.06)' }} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" name="اختبار" radius={[8, 8, 0, 0]} maxBarSize={46}>
                    {testsPipeline.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <SectionCard title="مصادر العينات" subtitle={`${sourceDonut.total} عينة موزعة حسب المصدر`}>
            <Box sx={{ width: '100%', height: 232, display: 'grid', placeItems: 'center', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceDonut.items} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="rgba(255,255,255,0.9)" strokeWidth={2}>
                    {sourceDonut.items.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{sourceDonut.total}</Typography>
                <Typography variant="caption" color="text.secondary">عينات</Typography>
              </Box>
            </Box>
            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 1, gap: 1 }}>
              {sourceDonut.items.map((s) => (
                <LegendDot key={s.name} color={s.color} label={s.name} value={s.value} />
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SectionCard title="جاهزية الجودة" subtitle="المعايرة والمواد ومراقبة الجودة" action={
            <Chip label="المزيد" size="small" color="primary" variant="outlined" onClick={() => goTab('quality')} />
          }>
            <Stack spacing={1.25}>
              {qualityRows.map((r) => (
                <ProgressRow key={r.label} label={r.label} value={r.value} total={r.total} color={r.color} />
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} ref={register('samples')} data-section="samples" sx={{ scrollMarginTop: '80px', mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="العينات حسب القسم" subtitle="التحميل العملي على أقسام المختبر" action={
            <Chip label="لوحة المعلومات" size="small" color="primary" variant="outlined" onClick={() => goTab('samples')} />
          }>
            {sectionBars.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات</Typography>
            ) : (
              <Box sx={{ width: '100%', height: 248 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionBars} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: ASH }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', fill: ASH }} axisLine={false} tickLine={false} />
                    <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.06)' }} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" name="عينات" fill={PRA} radius={[0, 8, 8, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <SectionCard title="حالة العينات" subtitle="التوزيع الكامل لحالة سجل العينات">
            <Box sx={{ width: '100%', height: 248, display: 'grid', placeItems: 'center', position: 'relative' }}>
              {statusDonut.items.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>لا توجد بيانات</Typography>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDonut.items} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="rgba(255,255,255,0.9)" strokeWidth={2}>
                        {statusDonut.items.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{statusDonut.total}</Typography>
                    <Typography variant="caption" color="text.secondary">عينة</Typography>
                  </Box>
                </>
              )}
            </Box>
            <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 1, gap: 1 }}>
              {statusDonut.items.map((s) => (
                <LegendDot key={s.name} color={s.color} label={s.name} value={s.value} />
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
        <Grid item xs={12} lg={8}>
          <DataTable<LabSample>
            columns={columns}
            rows={recent}
            rowKey={(s) => s.id}
            count={recent.length}
            page={1}
            rowsPerPage={recent.length}
            hidePagination
            loading={loading}
            title="آخر العينات المستلمة"
            subtitle={`${recent.length} عينة حديثة`}
            onRefresh={() => load(true)}
            refreshing={refreshing}
            toolbar={
              <Chip label="عرض كل العينات" size="small" color="primary" clickable onClick={() => goTab('samples')} />
            }
            emptyTitle="لا توجد عينات حديثة"
            emptyDescription="ستظهر العينات فور استلامها"
          />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <SectionCard
              title="مركز التنبيهات والمخاطر"
              subtitle="أولوية اتخاذ الإجراء حسب الخطورة"
              action={<Chip label="النتائج الحرجة" size="small" color="error" variant="outlined" onClick={() => goTab('critical')} />}
            >
              {alerts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <VerifiedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography color="text.secondary">لا توجد تنبيهات — كل المؤشرات سليمة</Typography>
                </Box>
              ) : (
                <Stack spacing={1.25}>
                  {alerts.map((a) => (
                    <Stack key={a.text} direction="row" spacing={1.25} alignItems="center" sx={{ p: 1.25, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.55)' }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: a.color, bgcolor: a.bg, flexShrink: 0 }}>
                        {a.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{a.text}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.sub}</Typography>
                      </Box>
                      <Chip label="فتح" size="small" variant="outlined" sx={{ color: a.color, borderColor: a.color }} onClick={() => goTab(a.tab)} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <Box>
              <NotificationPanel title="إشعارات النظام" subtitle="آخر رسائل المنصة" height={260} />
            </Box>
          </Stack>
        </Grid>
      </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

const ProgressRow = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((value / safeTotal) * 100));
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5 }}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12.5 }}>{value}</Typography>
      </Box>
      <Box sx={{ height: 7, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 2 }} />
      </Box>
    </Box>
  );
};

const LegendDot = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <Stack direction="row" alignItems="center" spacing={0.6}>
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
    <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>({value})</Typography>
  </Stack>
);

export default NqlisDashboard;