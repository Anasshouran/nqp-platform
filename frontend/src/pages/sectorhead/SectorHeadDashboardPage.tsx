import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BlockIcon from '@mui/icons-material/Block';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import TimerIcon from '@mui/icons-material/Timer';
import PaymentsIcon from '@mui/icons-material/Payments';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupsIcon from '@mui/icons-material/Groups';
import MapIcon from '@mui/icons-material/Map';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getSectorHeadDashboard } from '../../api/endpoints/food';
import type { SectorHeadDashboard } from '../../types/food';

const PERIODS = [
  { value: 'DAY', label: 'اليوم' },
  { value: 'WEEK', label: 'أسبوع' },
  { value: 'MONTH', label: 'شهر' },
  { value: 'QUARTER', label: 'ربع' },
  { value: 'YEAR', label: 'سنة' },
];

const PORT_KIND_LABELS: Record<string, string> = {
  SEAPORT: 'ميناء بحري',
  AIRPORT: 'مطار',
  LAND_PORT: 'منفذ بري',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: '#6c757d' },
  SUBMITTED: { label: 'قيد المراجعة', color: '#0dcaf0' },
  FEES_DUE: { label: 'مستحقة الرسوم', color: '#ffc107' },
  AWAITING_INSPECTION: { label: 'بانتظار التفتيش', color: '#fd7e14' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', color: '#0d6efd' },
  AWAITING_DECISION: { label: 'بانتظار القرار', color: '#ab8208' },
  HOLD: { label: 'محتجزة', color: '#c63a3a' },
  RE_EXPORT: { label: 'إعادة تصدير', color: '#e83e8c' },
  RELEASED: { label: 'مفرج عنها', color: '#1d7a54' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', color: '#20c997' },
  REJECTED: { label: 'مرفوضة', color: '#b02a37' },
  DESTROYED: { label: 'متلفة', color: '#6f2da8' },
};

const fmtTime = (d: Date) => d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
const fmtNum = (n: number) => new Intl.NumberFormat('ar-EG').format(n);
const fmtSdg = (n: number) => new Intl.NumberFormat('en-US').format(n);

const getErrMessage = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};
const notifyError = (m: string) => console.error(m);

const SectorHeadDashboardPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('MONTH');
  const [dash, setDash] = useState<SectorHeadDashboard | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const periodRef = useRef(period);

  const loadData = useCallback(async (p: string) => {
    try {
      const res = await getSectorHeadDashboard(p);
      setDash(res.data.data);
      setLastUpdated(new Date());
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل لوحة القطاع'));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    periodRef.current = period;
    setLoadingData(true);
    loadData(period);
  }, [period, loadData]);

  // تحديث تلقائي كل 60 ثانية
  useEffect(() => {
    const t = setInterval(() => loadData(periodRef.current), 60_000);
    return () => clearInterval(t);
  }, [loadData]);

  const statusChartData = dash
    ? Object.entries(dash.status_breakdown)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_META[k]?.label || k, value: v }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', pb: 4 }}>
      {/* ===== الترويسة ===== */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            🏛️ وزارة الصحة الاتحادية — الحجر الصحي القومي
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            🍎 إدارة رقابة الأغذية {dash ? `— ${dash.sector.name_ar}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لوحة قيادة القطاع · آخر تحديث {fmtTime(lastUpdated)} · تحديث تلقائي كل دقيقة
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v) => v && setPeriod(v)}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: '10px !important', px: 1.5 } }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Chip
            size="small"
            color={loadingData ? 'default' : 'success'}
            icon={loadingData ? <WarningAmberIcon /> : <CheckCircleIcon />}
            label={loadingData ? 'جارٍ التحديث…' : 'محدَث'}
            variant="outlined"
          />
        </Stack>
      </Stack>

      {dash && (
        <>
          {/* ===== الصف الأول: مؤشرات رئيسية ===== */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <KpiCard title="الشحنات" value={dash.kpis.shipments_period} sub="خلال الفترة" icon={<Inventory2Icon />} accent="#0d6efd" />
            <KpiCard title="التفتيش المكتمل" value={dash.kpis.inspections_completed} sub="خلال الفترة" icon={<SearchIcon />} accent="#b45309" />
            <KpiCard title="عينات للمختبر" value={dash.kpis.samples_lab} sub="خلال الفترة" icon={<ScienceIcon />} accent="#6f42c1" />
            <KpiCard title="مخالفات مفتوحة" value={dash.kpis.violations_open} sub="تحتاج متابعة" icon={<ReportProblemIcon />} accent="#c63a3a" bad={dash.kpis.violations_open > 0} />
          </Grid>

          {/* ===== الصف الثاني: النتائج ===== */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <KpiCard title="الإفراج" value={dash.outcomes.released} sub="خلال الفترة" icon={<TaskAltIcon />} accent="#1d7a54" />
            <KpiCard title="الرفض" value={dash.outcomes.rejected} sub="خلال الفترة" icon={<BlockIcon />} accent="#c63a3a" />
            <KpiCard title="الاحتجاز" value={dash.outcomes.holds} sub="حجز وإعادة تصدير" icon={<PauseCircleIcon />} accent="#fd7e14" />
            <KpiCard title="التزام SLA" value={`${dash.outcomes.sla_pct}%`} sub="المختبر — 48 ساعة" icon={<TimerIcon />} accent="#0dcaf0" good={dash.outcomes.sla_pct >= 90} bad={dash.outcomes.sla_pct < 80} />
          </Grid>

          {/* ===== التنبيهات القطاعية ===== */}
          {dash.alerts.length > 0 && (
            <Paper elevation={0} sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(198,58,58,.35)', bgcolor: 'rgba(198,58,58,.04)', mb: 3 }}>
              <Stack spacing={0.75}>
                {dash.alerts.map((a, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 14 }}>{a.level === 'critical' ? '🔴' : a.level === 'warning' ? '⚠️' : 'ℹ️'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: a.level === 'critical' ? 800 : 600 }}>
                      {a.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* ===== قسم 1: نظرة القطاع ===== */}
          <SectionTitle title="🗺️ نظرة القطاع — أداء المنافذ" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>المنفذ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الشحنات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>التفتيش</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>العينات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الرفض</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SLA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dash.ports_overview.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    onClick={() => navigate('/app/station-dashboard')}
                    sx={{ cursor: 'pointer', '&:hover td': { bgcolor: 'rgba(124,58,237,.04)' } }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <MapIcon fontSize="small" sx={{ color: '#7c3aed' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name_ar}</Typography>
                          <Typography variant="caption" color="text.disabled">{p.code}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Typography variant="caption">{PORT_KIND_LABELS[p.kind] || p.kind}</Typography></TableCell>
                    <TableCell align="center">{fmtNum(p.shipments)}</TableCell>
                    <TableCell align="center">{fmtNum(p.inspections)}</TableCell>
                    <TableCell align="center">{fmtNum(p.samples)}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: p.rejected > 0 ? '#c63a3a' : undefined }}>
                        {fmtNum(p.rejected)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" variant="outlined"
                        label={`${p.sla_pct}%`}
                        color={p.sla_pct >= 90 ? 'success' : p.sla_pct >= 80 ? 'warning' : 'error'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {dash.ports_overview.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        لا توجد منافذ مرتبطة بالقطاع
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ===== قسم 2: توزيع الحالات + قسم 3: إدارة التفتيش ===== */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <SectionTitle title="📊 حالة الشحنات في القطاع" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ height: 260, direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} orientation="right" />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={16} name="عدد الشحنات" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <SectionTitle title="🔍 أداء التفتيش حسب المنفذ" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="مهام الفترة" value={fmtNum(dash.inspection_board.tasks_assigned)} />
                  <DetailCell label="مكتملة" value={fmtNum(dash.inspection_board.completed)} good />
                  <DetailCell label="قيد التنفيذ" value={fmtNum(dash.inspection_board.in_progress)} />
                  <DetailCell label="متأخرة" value={fmtNum(dash.inspection_board.late)} bad={dash.inspection_board.late > 0} />
                </Grid>
              </Paper>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>القسم/المنفذ</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>المهام</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>مكتملة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>متأخرة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الأداء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dash.inspection_board.per_port.map((r) => (
                      <TableRow key={r.port_name} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{r.port_name}</Typography></TableCell>
                        <TableCell align="center">{fmtNum(r.tasks)}</TableCell>
                        <TableCell align="center">{fmtNum(r.completed)}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: r.late > 0 ? '#c63a3a' : undefined }}>{fmtNum(r.late)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" variant="outlined" label={`${r.performance_pct}%`}
                            color={r.performance_pct >= 90 ? 'success' : r.performance_pct >= 70 ? 'warning' : 'error'}
                            sx={{ fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {/* ===== قسم 4: العينات والمختبر + قسم 10: الموارد البشرية ===== */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <SectionTitle title="🧪 العينات والمختبر" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack spacing={1.25}>
                  <Row label="العينات المسحوبة" value={dash.samples_board.collected} />
                  <Row label="وصلت المختبر" value={dash.samples_board.at_lab} />
                  <Row label="قيد التحليل" value={dash.samples_board.under_analysis} />
                  <Row label="نتائج جاهزة" value={dash.samples_board.results_ready} good />
                  <Row label="غير مطابقة" value={dash.samples_board.non_compliant} bad={dash.samples_board.non_compliant > 0} />
                </Stack>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>مراقبة SLA</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Row label="🟢 ضمن SLA" value={dash.samples_board.sla_within} good />
                  <Row label="🟠 قريبة من SLA (36–48 ساعة)" value={dash.samples_board.sla_near} />
                  {dash.samples_board.sla_exceeded > 0 ? (
                    <Row label={`🔴 متجاوزة SLA (${dash.samples_board.late_sla})`} value={dash.samples_board.sla_exceeded} danger />
                  ) : (
                    <Row label="🔴 متجاوزة SLA" value={0} good />
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <SectionTitle title="👥 الموارد البشرية — عبء عمل المفتشين" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="المفتشون" value={fmtNum(dash.staff.total)} />
                  <DetailCell label="مشغولون (≥3 مهام)" value={fmtNum(dash.staff.busy)} bad={dash.staff.busy > dash.staff.available} />
                  <DetailCell label="متاحون" value={fmtNum(dash.staff.available)} good />
                  <DetailCell label="بلا مهام" value={fmtNum(dash.staff.idle)} />
                </Grid>
              </Paper>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>المفتش</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>مهام مفتوحة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>أنجز الفترة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dash.staff.workload.map((w) => (
                      <TableRow key={w.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{w.full_name}</Typography></TableCell>
                        <TableCell align="center">{w.open_tasks}</TableCell>
                        <TableCell align="center">{w.completed_period}</TableCell>
                        <TableCell align="center">{w.total_inspections}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" variant="outlined"
                            label={w.status === 'BUSY' ? 'مشغول' : w.status === 'AVAILABLE' ? 'متاح' : 'غير متاح'}
                            color={w.status === 'BUSY' ? 'warning' : w.status === 'AVAILABLE' ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {dash.staff.workload.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>لا يوجد مفتشون</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {/* ===== قسم 9: الشهادات + قسم 12: الإيرادات ===== */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SectionTitle title="📜 شهادات القطاع" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: { xs: 3, md: 0 } }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="صادرة اليوم" value={fmtNum(dash.certificates.issued_today)} />
                  <DetailCell label="خلال الفترة" value={fmtNum(dash.certificates.issued_period)} />
                  <DetailCell label="بانتظار قرار" value={fmtNum(dash.certificates.awaiting_decision)} />
                </Grid>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  <WorkspacePremiumIcon fontSize="small" sx={{ color: '#7c3aed' }} />
                  <Typography variant="caption" color="text.secondary">شهادات FCER قابلة للتحقق عبر QR من كل منافذ القطاع</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <SectionTitle title="💰 الإيرادات (الشهر الحالي — قراءة فقط)" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <FinanceRow label="رسوم التفتيش" value={dash.finance.inspection_fees} />
                  <FinanceRow label="رسوم المختبر والعينات" value={dash.finance.lab_fees} />
                  <FinanceRow label="رسوم الشهادات" value={dash.finance.certificate_fees} />
                  <Divider />
                  <FinanceRow label="الإجمالي" value={dash.finance.total} bold />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  <PaymentsIcon fontSize="small" sx={{ color: '#1d7a54' }} />
                  <Typography variant="caption" color="text.secondary">فواتير محصّلة بالجنيه السوداني (SDG) — للانتقال إلى النظام المالي دون تعديل القيود</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* ===== أقسام قيد التطوير ===== */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px dashed rgba(124,58,237,.4)', bgcolor: 'rgba(124,58,237,.03)', mt: 3 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <InfoIcon fontSize="small" sx={{ color: '#7c3aed', mt: 0.3 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#5b21b6' }}>أقسام قيد التطوير في لوحة القطاع</Typography>
                <Typography variant="caption" color="text.secondary">
                  إدارة المخاطر (Risk Engine) · المخالفات والإنفاذ · Food Recall · التقارير المجدولة (PDF/Excel) — ستُفعَّل بعد بناء نماذجها الخلفية.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
};

/* ===================== عناصر مساعدة ===================== */

const SectionTitle = ({ title }: { title: string }) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
);

const KpiCard = ({
  title, value, sub, icon, accent, good, bad,
}: {
  title: string; value: number | string; sub: string; icon?: ReactNode; accent?: string; good?: boolean; bad?: boolean;
}) => (
  <Grid item xs={6} sm={4} md={3}>
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: `${accent}14`, color: accent, borderRadius: 2.5 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, lineHeight: 1.2, color: bad ? '#c63a3a' : good ? '#1d7a54' : undefined }}
          >
            {typeof value === 'number' ? fmtNum(value) : value}
          </Typography>
          <Typography variant="caption" color="text.disabled">{sub}</Typography>
        </Box>
      </CardContent>
    </Card>
  </Grid>
);

const DetailCell = ({ label, value, good, bad }: { label: string; value: string | number; good?: boolean; bad?: boolean }) => (
  <Grid item xs={6} sm={3}>
    <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, color: bad ? '#c63a3a' : good ? '#1d7a54' : undefined }}>
        {typeof value === 'number' ? fmtNum(value) : value}
      </Typography>
    </Box>
  </Grid>
);

const Row = ({ label, value, good, danger, bad }: { label: string; value: number; good?: boolean; danger?: boolean; bad?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: danger || bad ? 800 : 600, color: danger || bad ? '#b02a37' : undefined }}>
      {label}
    </Typography>
    <Chip
      size="small"
      label={fmtNum(value)}
      color={danger || bad ? 'error' : good ? 'success' : 'default'}
      variant="outlined"
      sx={{ fontWeight: 700 }}
    />
  </Stack>
);

const FinanceRow = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 500 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 700, color: bold ? '#1d7a54' : undefined }} dir="ltr">
      {fmtSdg(value)} SDG
    </Typography>
  </Stack>
);

export default SectorHeadDashboardPage;
