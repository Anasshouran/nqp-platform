import { useEffect, useState } from 'react';
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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScienceIcon from '@mui/icons-material/Science';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import GppBadIcon from '@mui/icons-material/GppBad';
import FactoryIcon from '@mui/icons-material/Factory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
import { Line, Bar } from 'react-chartjs-2';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { formatDateTime } from '../../utils/formatters';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
import { fssRiskLevel, fssAlertStatus, fssAlertReason, fssNonConformityStatus, fssRecallStatus, fssRecallType } from '../../utils/status';
import { getFoodSurveillanceDashboard } from '../../api/endpoints/foodSurveillance';
import type { FssDashboard, FssAlert, FssNonConformity, FssRecall } from '../../api/endpoints/foodSurveillance';
import type { DashboardWindow } from '../../api/endpoints/reports';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const WINDOWS: Array<{ key: DashboardWindow; label: string }> = [
  { key: 'day', label: 'اليوم' },
  { key: 'week', label: 'الأسبوع' },
  { key: 'month', label: 'الشهر' },
  { key: 'year', label: 'السنة' },
  { key: 'all', label: 'الكل' },
];

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'alerts', label: 'الإنذارات', icon: <NotificationsActiveIcon fontSize="small" /> },
  { id: 'nonconformity', label: 'عدم المطابقة', icon: <GppBadIcon fontSize="small" /> },
  { id: 'recalls', label: 'السحبات', icon: <FactoryIcon fontSize="small" /> },
] as const;

const LEVELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  LEVEL_0: { label: 'مستوى 0 — الوضع طبيعي', tone: 'success' },
  LEVEL_1: { label: 'مستوى 1 — مراقبة معززة', tone: 'success' },
  LEVEL_2: { label: 'مستوى 2 — إنذار مبكر', tone: 'warning' },
  LEVEL_3: { label: 'مستوى 3 — استجابة شاملة', tone: 'error' },
};

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

const barOptions = {
  ...lineOptions,
  plugins: {
    ...lineOptions.plugins,
    legend: { ...lineOptions.plugins.legend, display: true },
  },
};

const riskTone = (score: number): 'success' | 'warning' | 'error' => (score >= 60 ? 'error' : score >= 30 ? 'warning' : 'success');

const scoreColor = (score: number): string => (score >= 60 ? '#c63a3a' : score >= 30 ? '#b98a2e' : '#0c7f6a');

const RiskItem = ({ item }: { item: { name: string; count: number; rejected: number; score: number } }) => (
  <Stack spacing={0.5}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
      <StatusChip label={`${item.score}`} tone={riskTone(item.score)} />
    </Stack>
    <Box sx={{ bgcolor: 'rgba(16,40,34,0.06)', borderRadius: 1.5, height: 8, overflow: 'hidden' }}>
      <Box sx={{ width: `${item.score}%`, height: '100%', bgcolor: scoreColor(item.score), borderRadius: 1.5 }} />
    </Box>
    <Typography variant="caption" color="text.secondary">
      {item.rejected} مرفوضة من {item.count} شحنة
    </Typography>
  </Stack>
);

const FoodSurveillancePage = () => {
  const [page, setPage] = useState(1);
  const [window, setWindow] = useState<DashboardWindow>('month');
  const [data, setData] = useState<FssDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFoodSurveillanceDashboard(window)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('تعذر تحميل لوحة الترصد الغذائي');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const kpis = [
    { icon: <LocalShippingIcon />, value: data?.kpis.shipments ?? 0, label: 'الشحنات', accent: 'info.main', trend: { label: `${data?.kpis.imports ?? 0} وارد · ${data?.kpis.exports ?? 0} صادر`, positive: true } },
    { icon: <ScienceIcon />, value: data?.kpis.samples ?? 0, label: 'العينات', accent: 'primary.main' },
    { icon: <GppBadIcon />, value: data?.kpis.nonconforming ?? 0, label: 'غير المطابقة', accent: 'error.main', trend: { label: `${data?.kpis.rejected ?? 0} مرفوضة`, positive: false } },
    { icon: <NotificationsActiveIcon />, value: data?.kpis.alerts ?? 0, label: 'إنذارات نشطة', accent: 'warning.main' },
    { icon: <FactoryIcon />, value: data?.kpis.recalls_active ?? 0, label: 'سحبات نشطة', accent: 'error.main' },
    { icon: <GppBadIcon />, value: data?.kpis.non_conformities_open ?? 0, label: 'عدم مطابقة مفتوح', accent: 'warning.main' },
  ];

  const levelMeta = LEVELS[data?.response_level ?? 'LEVEL_0'];
  const nonConformingPct = data && data.kpis.samples > 0 ? Math.round((data.kpis.nonconforming / data.kpis.samples) * 100) : 0;

  return (
    <Box>
      <DashboardHero
        eyebrow="Food Surveillance System"
        title="الترصد الغذائي"
        subtitle="التحليل المبكر لمخاطر الغذاء والاتجاهات والإنذار"
        gradient="emerald"
        avatarLabel="ا"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={levelMeta.label} color={levelMeta.tone === 'error' ? 'error' : levelMeta.tone === 'warning' ? 'warning' : 'success'} sx={{ fontWeight: 700, px: 1 }} />
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
              filename="food-surveillance"
              headers={['المنتج', 'الشحنات', 'المرفوضة', 'درجة المخاطر']}
              rows={(data?.risk.products ?? []).map((p) => [p.name, p.count, p.rejected, p.score])}
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
            label="أقسام الترصد"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {/*نظرة عامة*/}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            {!loading && data && (
              <SectionCard title="قراءة تحليلية" subtitle={`نسبة العينات غير المطابقة ${nonConformingPct}%`} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${data.kpis.shipments} شحنة`} size="small" variant="outlined" color="primary" />
                  <Chip label={`${data.kpis.samples} عينة`} size="small" variant="outlined" color="primary" />
                  <Chip label={`${data.kpis.imports} وارد`} size="small" variant="outlined" />
                  <Chip label={`${data.kpis.exports} صادر`} size="small" variant="outlined" />
                  <Chip label={`${data.kpis.released} مفرج عنها`} size="small" variant="outlined" color="success" />
                  <Chip label={`${data.kpis.rejected} مرفوضة`} size="small" variant="outlined" color="error" />
                </Stack>
              </SectionCard>
            )}

            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {kpis.map((k) => (
                <Grid item xs={12} sm={6} md={2.4} key={k.label}>
                  {loading ? <Skeleton variant="rounded" height={124} /> : <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />}
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} lg={7}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>العينات غير المطابقة</Typography>
                      <TrendingUpIcon color="primary" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">الاتجاه الزمني خلال الفترة المحددة</Typography>
                    <Box sx={{ height: 260, mt: 2 }}>
                      {loading ? (
                        <Skeleton variant="rounded" height={260} />
                      ) : (
                        <Line
                          data={{
                            labels: (data?.trend ?? []).map((t) => t.date),
                            datasets: [
                              {
                                label: 'عينات غير مطابقة',
                                data: (data?.trend ?? []).map((t) => t.count),
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
              <Grid item xs={12} lg={5}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>توزيع حالات عدم المطابقة</Typography>
                    <Typography variant="caption" color="text.secondary">حسب مرحلة المعالجة</Typography>
                    <Box sx={{ height: 250, mt: 2 }}>
                      {loading ? (
                        <Skeleton variant="rounded" height={250} />
                      ) : (
                        <Bar
                          data={{
                            labels: ['مفتوحة', 'قيد التحقيق', 'إجراء تصحيحي', 'تم الحل', 'مغلقة'],
                            datasets: [
                              {
                                label: 'الحالات',
                                data: [
                                  data?.nc_distribution.open ?? 0,
                                  data?.nc_distribution.under_investigation ?? 0,
                                  data?.nc_distribution.corrective_action ?? 0,
                                  data?.nc_distribution.resolved ?? 0,
                                  data?.nc_distribution.closed ?? 0,
                                ],
                                backgroundColor: ['#c63a3a', '#2f6dd0', '#e07a1f', '#0e8b9e', '#0c7f6a'],
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
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title="🌍 الدول عالية الخطورة" subtitle="محرك المخاطر حسب بلد المنشأ">
                  <Stack spacing={1.75}>
                    {(data?.risk.countries ?? []).length === 0 ? <Typography color="text.secondary">لا توجد بيانات</Typography> : data?.risk.countries.map((c) => <RiskItem key={c.name} item={c} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title="🏭 الموردون عاليو الخطورة" subtitle="سجل الرفض السابق">
                  <Stack spacing={1.75}>
                    {(data?.risk.suppliers ?? []).length === 0 ? <Typography color="text.secondary">لا توجد بيانات</Typography> : data?.risk.suppliers.map((c) => <RiskItem key={c.name} item={c} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title="🍎 المنتجات عالية الخطورة" subtitle="نسبة الرفض للشحنات">
                  <Stack spacing={1.75}>
                    {(data?.risk.products ?? []).length === 0 ? <Typography color="text.secondary">لا توجد بيانات</Typography> : data?.risk.products.map((c) => <RiskItem key={c.name} item={c} />)}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <SectionCard title="🧪 ترصد المختبر" subtitle="أكثر المعاملات مخالفة">
                  <Stack spacing={1.25}>
                    {(data?.lab_top ?? []).length === 0 ? <Typography color="text.secondary">لا توجد نتائج</Typography> : data?.lab_top.map((p) => (
                      <Stack key={p.code} direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'error.main', bgcolor: 'error.light', flexShrink: 0 }}>
                          <ScienceIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.code}</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.count}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          {/*الإنذارات*/}
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssAlert>
              columns={[
                { key: 'alert_number', label: 'الرقم', render: (a) => <Typography sx={{ fontWeight: 700 }}>{a.alert_number}</Typography> },
                { key: 'title', label: 'العنوان', render: (a) => <Typography sx={{ maxWidth: 300 }}>{a.title}</Typography> },
                { key: 'reason', label: 'السبب', render: (a) => { const m = fssAlertReason[a.reason]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.reason; }, hideOnMobile: true },
                { key: 'risk_level', label: 'المخاطر', render: (a) => { const m = fssRiskLevel[a.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.risk_level; } },
                { key: 'status', label: 'الحالة', render: (a) => { const m = fssAlertStatus[a.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={a.status} tone="neutral" />; } },
                { key: 'raised_at', label: 'وقت الإنشاء', render: (a) => formatDateTime(a.raised_at), hideOnMobile: true },
              ]}
              rows={data?.alerts ?? []}
              rowKey={(a) => a.id}
              count={data?.alerts.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title="الإنذارات الغذائية"
              subtitle="إنذارات الإنذار المبكر للسلامة الغذائية"
              emptyTitle="لا توجد إنذارات"
              emptyDescription="تُنشأ الإنذارات عند كشف اتجاهات أو تكرار عدم مطابقة"
            />
          </Box>

          {/*عدم المطابقة*/}
          <Box component="section" ref={register('nonconformity')} data-section="nonconformity" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssNonConformity>
              columns={[
                { key: 'nc_number', label: 'الرقم', render: (n) => <Typography sx={{ fontWeight: 700 }}>{n.nc_number}</Typography> },
                { key: 'product', label: 'المنتج', render: (n) => n.product || '—' },
                { key: 'origin_country', label: 'بلد المنشأ', render: (n) => n.origin_country || '—', hideOnMobile: true },
                { key: 'risk_level', label: 'المخاطر', render: (n) => { const m = fssRiskLevel[n.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : n.risk_level; } },
                { key: 'status', label: 'الحالة', render: (n) => { const m = fssNonConformityStatus[n.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={n.status} tone="neutral" />; } },
                { key: 'reported_at', label: 'وقت البلاغ', render: (n) => formatDateTime(n.reported_at), hideOnMobile: true },
              ]}
              rows={data?.non_conformities ?? []}
              rowKey={(n) => n.id}
              count={data?.non_conformities.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title="حالات عدم المطابقة"
              subtitle="دورة المعالجة من الفتح حتى الإغلاق"
              emptyTitle="لا توجد حالات"
              emptyDescription="لا توجد حالات عدم مطابقة مسجلة"
            />
          </Box>

          {/*السحبات*/}
          <Box component="section" ref={register('recalls')} data-section="recalls" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<FssRecall>
              columns={[
                { key: 'recall_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.recall_number}</Typography> },
                { key: 'product', label: 'المنتج', render: (r) => r.product },
                { key: 'recall_type', label: 'النوع', render: (r) => { const m = fssRecallType[r.recall_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.recall_type; } },
                { key: 'risk_level', label: 'المخاطر', render: (r) => { const m = fssRiskLevel[r.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.risk_level; } },
                { key: 'status', label: 'الحالة', render: (r) => { const m = fssRecallStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={r.status} tone="neutral" />; } },
                { key: 'decided_at', label: 'القرار', render: (r) => formatDateTime(r.decided_at), hideOnMobile: true },
              ]}
              rows={data?.recalls ?? []}
              rowKey={(r) => r.id}
              count={data?.recalls.length ?? 0}
              page={page}
              rowsPerPage={10}
              onPageChange={setPage}
              title="سحب المنتجات الغذائية"
              subtitle="عمليات الاستدعاء والانسحاب"
              emptyTitle="لا توجد سحبات"
              emptyDescription="لا توجد عمليات سحب نشطة"
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FoodSurveillancePage;
