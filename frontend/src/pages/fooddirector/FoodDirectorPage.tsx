import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BlockIcon from '@mui/icons-material/Block';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TimerIcon from '@mui/icons-material/Timer';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupsIcon from '@mui/icons-material/Groups';
import PublicIcon from '@mui/icons-material/Public';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getFoodDirectorDashboard } from '../../api/endpoints/food';
import type { FoodDirectorDashboard } from '../../types/food';

const PERIODS = [
  { value: 'DAY', label: 'اليوم' },
  { value: 'WEEK', label: 'أسبوع' },
  { value: 'MONTH', label: 'شهر' },
  { value: 'QUARTER', label: 'ربع' },
  { value: 'YEAR', label: 'سنة' },
];

const DOT_META = {
  green: { emoji: '🟢', color: '#1d7a54' },
  yellow: { emoji: '🟡', color: '#f0ad4e' },
  red: { emoji: '🔴', color: '#c63a3a' },
} as const;

const fmtTime = (d: Date) => d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
const fmtNum = (n: number) => new Intl.NumberFormat('ar-EG').format(n);
const fmtSdg = (n: number) => new Intl.NumberFormat('en-US').format(n);
const getErrMessage = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};
const notifyError = (m: string) => console.error(m);

const FoodDirectorPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('MONTH');
  const [dash, setDash] = useState<FoodDirectorDashboard | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const periodRef = useRef(period);

  const loadData = useCallback(async (p: string) => {
    try {
      const res = await getFoodDirectorDashboard(p);
      setDash(res.data.data);
      setLastUpdated(new Date());
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل اللوحة القومية'));
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

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', pb: 4 }}>
      {/* ===== الترويسة القومية ===== */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            🇸🇩 وزارة الصحة الاتحادية — الإدارة العامة للحجر الصحي القومي
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            🍎 National Food Safety Command — الإدارة العامة لرقابة الأغذية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مركز القيادة التنفيذي القومي · آخر تحديث {fmtTime(lastUpdated)} · تحديث تلقائي كل دقيقة
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
              <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
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
          {/* ===== الصف الأول: الحجم التشغيلي ===== */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <KpiCard title="الشحنات" value={fmtNum(dash.kpis.shipments_period)} sub="خلال الفترة — قومي" icon={<Inventory2Icon />} accent="#0a6b58" />
            <KpiCard title="التفتيش المكتمل" value={fmtNum(dash.kpis.inspections_completed)} sub="خلال الفترة" icon={<SearchIcon />} accent="#b45309" />
            <KpiCard title="عينات للمختبر" value={fmtNum(dash.kpis.samples_lab)} sub="خلال الفترة" icon={<ScienceIcon />} accent="#6f42c1" />
            <KpiCard title="شهادات صادرة" value={fmtNum(dash.kpis.certificates_issued)} sub="FCER قوميًا" icon={<WorkspacePremiumIcon />} accent="#0d6efd" />
          </Grid>

          {/* ===== الصف الثاني: النسب الوطنية ===== */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <KpiCard title="الإفراج" value={`${dash.outcomes.released_pct}%`} sub="من شحنات الفترة" icon={<TaskAltIcon />} accent="#1d7a54" good={dash.outcomes.released_pct >= 80} />
            <KpiCard title="الرفض" value={`${dash.outcomes.rejected_pct}%`} sub="من شحنات الفترة" icon={<BlockIcon />} accent="#c63a3a" bad={dash.outcomes.rejected_pct > 10} />
            <KpiCard title="عالية الخطورة" value={`${dash.outcomes.high_risk_pct}%`} sub="نتائج غير مطابقة" icon={<ReportProblemIcon />} accent="#f0ad4e" bad={dash.outcomes.high_risk_pct > 8} />
            <KpiCard title="SLA المختبر" value={`${dash.outcomes.sla_pct}%`} sub="هدف >90%" icon={<TimerIcon />} accent="#0dcaf0" good={dash.outcomes.sla_pct >= 90} bad={dash.outcomes.sla_pct < 80} />
          </Grid>

          {/* ===== قسم 4: التنبيهات القومية ===== */}
          {dash.alerts.length > 0 && (
            <Paper elevation={0} sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(198,58,58,.35)', bgcolor: 'rgba(198,58,58,.04)', mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#b02a37' }}>🚨 التنبيهات الغذائية القومية</Typography>
              <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                {dash.alerts.map((a, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 14 }}>{a.level === 'critical' ? '🔴' : a.level === 'warning' ? '⚠️' : 'ℹ️'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: a.level === 'critical' ? 800 : 600 }}>{a.text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* ===== قسم 2: أداء القطاعات ===== */}
          <SectionTitle title="🗺️ أداء القطاعات — اضغط القطاع لفتح لوحته" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>القطاع</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الشحنات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>التفتيش</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>العينات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الرفض</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SLA</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الأداء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dash.sectors_overview.map((s) => (
                  <TableRow
                    key={s.id}
                    hover
                    onClick={() => navigate('/app/sector-dashboard')}
                    sx={{ cursor: 'pointer', '&:hover td': { bgcolor: 'rgba(10,107,88,.05)' } }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PublicIcon fontSize="small" sx={{ color: '#0a6b58' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">{fmtNum(s.shipments)}</TableCell>
                    <TableCell align="center">{fmtNum(s.inspections)}</TableCell>
                    <TableCell align="center">{fmtNum(s.samples)}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: s.rejected > 0 ? '#c63a3a' : undefined }}>
                        {fmtNum(s.rejected)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" variant="outlined" label={`${s.sla_pct}%`}
                        color={s.sla_pct >= 90 ? 'success' : s.sla_pct >= 80 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small"
                        label={`${DOT_META[s.performance_dot].emoji} ${s.performance_score}%`}
                        sx={{ bgcolor: `${DOT_META[s.performance_dot].color}14`, color: DOT_META[s.performance_dot].color, fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {dash.sectors_overview.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>لا توجد قطاعات مرتبطة بمنافذ</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ===== قسم 7: مؤشرات الأداء القومية + قسم 8: الوارد والصادر ===== */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <SectionTitle title="📊 مؤشرات الأداء القومية مقابل الأهداف" />
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>المؤشر</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الحالي</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الهدف</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dash.kpi_table.map((k) => (
                      <TableRow key={k.name} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{k.name}</Typography></TableCell>
                        <TableCell align="center">{k.current}</TableCell>
                        <TableCell align="center"><Typography variant="caption" color="text.secondary">{k.target}</Typography></TableCell>
                        <TableCell align="center">
                          {k.ok ? '✅' : '⚠️'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionTitle title="📦 مراقبة التجارة الغذائية — وارد/صادر" />
              <Grid container spacing={2}>
                <TradeCard kind="import" data={dash.trade.import} accent="#0d6efd" />
                <TradeCard kind="export" data={dash.trade.export} accent="#1d7a54" />
              </Grid>
            </Grid>
          </Grid>

          {/* ===== قسم 6: أداء المختبرات القومي ===== */}
          <SectionTitle title="🔬 أداء المختبرات القومي" />
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Grid container spacing={1.5}>
              <DetailCell label="عينات مستلمة" value={fmtNum(dash.lab_performance.samples_received)} />
              <DetailCell label="قيد التحليل" value={fmtNum(dash.lab_performance.under_analysis)} />
              <DetailCell label="نتائج مكتملة" value={fmtNum(dash.lab_performance.results_completed)} good />
              <DetailCell label="متأخرة (48 ساعة)" value={fmtNum(dash.lab_performance.delayed)} bad={dash.lab_performance.delayed > 0} />
              <DetailCell label="غير مطابقة" value={fmtNum(dash.lab_performance.non_conforming)} bad={dash.lab_performance.non_conforming > 0} />
              <DetailCell label="🟢 ضمن SLA" value={fmtNum(dash.lab_performance.sla_within)} good />
              <DetailCell label="🟠 قريبة من SLA" value={fmtNum(dash.lab_performance.sla_near)} />
              <DetailCell label="🔴 متجاوزة SLA" value={fmtNum(dash.lab_performance.sla_exceeded)} bad={dash.lab_performance.sla_exceeded > 0} />
            </Grid>
          </Paper>

          {/* ===== قسم 12+13+شهادات: موارد ومال وشهادات ===== */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <SectionTitle title="👥 الموارد القومية" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: { xs: 3, md: 0 } }}>
                <Stack spacing={1.25}>
                  <Row label="مفتشو رقابة الأغذية" value={dash.staff.inspectors} icon={<GroupsIcon fontSize="small" />} />
                  <Row label="مشغولون (≥3 مهام)" value={dash.staff.busy} />
                  <Row label="متاحون" value={dash.staff.available} good />
                  <Row label="بلا مهام" value={dash.staff.idle} />
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <SectionTitle title="📜 الشهادات القومية" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: { xs: 3, md: 0 } }}>
                <Stack spacing={1.25}>
                  <Row label="صادرة اليوم" value={dash.certificates.issued_today} />
                  <Row label="خلال الفترة" value={dash.certificates.issued_period} good />
                  <Row label="بانتظار قرار" value={dash.certificates.awaiting_decision} bad={dash.certificates.awaiting_decision > 10} />
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <SectionTitle title="💰 الإيرادات (الشهر — قراءة فقط)" />
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
                  <Typography variant="caption" color="text.secondary">فواتير محصّلة SDG — الانتقال للنظام المالي دون تعديل قيود</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* ===== أقسام قيد التطوير ===== */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px dashed rgba(10,107,88,.45)', bgcolor: 'rgba(10,107,88,.03)', mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#085c4b' }}>أقسام قيد التطوير في مركز القيادة القومي</Typography>
            <Typography variant="caption" color="text.secondary">
              National Risk Command Center (Risk Engine) · Food Alerts & Recall · المخالفات والإنفاذ · المستوردون والمنتجات الأعلى رفضًا · التحليل الزمني · التقارير التنفيذية PDF/Excel · القرارات الاستراتيجية — تُفعَّل بعد بناء نماذجها الخلفية.
            </Typography>
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

const KpiCard = ({ title, value, sub, icon, accent, good, bad }: {
  title: string; value: string; sub: string; icon?: ReactNode; accent?: string; good?: boolean; bad?: boolean;
}) => (
  <Grid item xs={6} sm={4} md={3}>
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: `${accent}14`, color: accent, borderRadius: 2.5 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: bad ? '#c63a3a' : good ? '#1d7a54' : undefined }}>
            {value}
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

const Row = ({ label, value, good, bad, icon }: { label: string; value: number; good?: boolean; bad?: boolean; icon?: ReactNode }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Stack direction="row" spacing={0.75} alignItems="center">
      {icon}
      <Typography variant="body2" sx={{ fontWeight: bad ? 800 : 600, color: bad ? '#b02a37' : undefined }}>{label}</Typography>
    </Stack>
    <Chip size="small" label={fmtNum(value)}
      color={bad ? 'error' : good ? 'success' : 'default'} variant="outlined" sx={{ fontWeight: 700 }} />
  </Stack>
);

const TradeCard = ({ kind, data, accent }: {
  kind: 'import' | 'export';
  data: { total: number; released_pct: number; rejected_pct: number; hold_pct: number };
  accent: string;
}) => (
  <Grid item xs={12} sm={6}>
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{kind === 'import' ? '⬅️ الوارد IMPORT' : '➡️ الصادر EXPORT'}</Typography>
        <Chip size="small" label={`${fmtNum(data.total)} شحنة`} sx={{ bgcolor: `${accent}14`, color: accent, fontWeight: 700 }} />
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1d7a54' }}>✅ إفراج / اعتماد</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1d7a54' }}>{data.released_pct}%</Typography>
      </Stack>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#e9ecef', overflow: 'hidden', mb: 1 }}>
        <Box sx={{ width: `${data.released_pct}%`, height: '100%', bgcolor: '#1d7a54' }} />
      </Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>🚫 رفض {data.rejected_pct}%</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#fd7e14' }}>⏸️ احتجاز {data.hold_pct}%</Typography>
      </Stack>
    </Paper>
  </Grid>
);

const FinanceRow = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 500 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 700, color: bold ? '#1d7a54' : undefined }} dir="ltr">
      {fmtSdg(value)} SDG
    </Typography>
  </Stack>
);

export default FoodDirectorPage;
