import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaidIcon from '@mui/icons-material/Paid';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { AxiosError } from 'axios';
import {
  getFinanceSummary,
  getFinanceMonthly,
  getFinanceNational,
  getFinanceByChannel,
  getFinanceVariation,
  getFinanceMatrix,
  getFinanceArrearsAging,
  getFinanceReportsExport,
} from '../../api/endpoints/finance';
import type {
  FinanceSummaryReport,
  MonthlyRevenueReport,
  NationalRevenueTree,
  ByChannelReport,
  VariationReport,
  MatrixReport,
  ArrearsAgingReport,
} from '../../types/finance';
import SectionTitle from '../../components/common/SectionTitle';
import StatCard from '../../components/common/StatCard';

const REPORT_PERMISSION_MSG = 'لا تملك صلاحية التقارير المالية';

const fmtMoney = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('ar-SD').format(Number(v ?? 0));

export default function ReportsView(): React.JSX.Element {
  const [summary, setSummary] = useState<FinanceSummaryReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRevenueReport>({ series: [], by_sector: [] });
  const [national, setNational] = useState<NationalRevenueTree>({});
  const [byChannel, setByChannel] = useState<ByChannelReport | null>(null);
  const [variation, setVariation] = useState<VariationReport | null>(null);
  const [matrix, setMatrix] = useState<MatrixReport | null>(null);
  const [aging, setAging] = useState<ArrearsAgingReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const reportError = (e: unknown, fallback = REPORT_PERMISSION_MSG) =>
    (e as AxiosError<{ message?: string }>).response?.data?.message ?? fallback;

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const results = await Promise.allSettled([
        getFinanceSummary(),
        getFinanceMonthly(),
        getFinanceNational(),
        getFinanceByChannel(),
        getFinanceVariation(),
        getFinanceMatrix(),
        getFinanceArrearsAging(),
      ]);
      const [s, m, n, c, v, mx, ag] = results;
      if (s.status === 'fulfilled') setSummary(s.value.data.data);
      if (m.status === 'fulfilled') setMonthly(m.value.data.data);
      if (n.status === 'fulfilled') setNational(n.value.data.data);
      if (c.status === 'fulfilled') setByChannel(c.value.data.data);
      if (v.status === 'fulfilled') setVariation(v.value.data.data);
      if (mx.status === 'fulfilled') setMatrix(mx.value.data.data);
      if (ag.status === 'fulfilled') setAging(ag.value.data.data);
      const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (firstError) setErrorMsg(reportError(firstError.reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    try {
      const res = await getFinanceReportsExport();
      const blob = res.data as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nqp_revenue.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg(reportError(e));
    }
  };

  const totalDiff = variation
    ? Number(variation.paid.amount) - Number(variation.refunded.amount)
    : 0;

  return (
    <>
      <SectionTitle
        title="التقارير المالية"
        subtitle="قائمة الإيرادات القومية، التوزيع حسب الوسيلة والقطاع، والمتأخرات"
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {errorMsg && <Typography color="error" sx={{ mb: 2 }}>{errorMsg}</Typography>}

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2.5 }}>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
          تصدير CSV
        </Button>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <StatCard label="إجمالي الإيرادات" value={`${fmtMoney(summary?.revenue.total)} SDG`} trend={{ label: `${fmtMoney(summary?.revenue.count)} فاتورة مدفوعة` }} icon={<AssessmentIcon />} accent="primary.main" />
        <StatCard label="محصل اليوم" value={`${fmtMoney(summary?.today.collected)} SDG`} trend={{ label: `${fmtMoney(summary?.today.count)} عملية` }} icon={<PaidIcon />} accent="success.main" />
        <StatCard label="متأخرات" value={fmtMoney(summary?.overdue.count)} trend={{ label: `${fmtMoney(summary?.overdue.amount)} SDG` }} icon={<WarningAmberIcon />} accent="error.main" />
        <StatCard label="صافي الإيراد (بعد الاستردادات)" value={`${fmtMoney(totalDiff)} SDG`} trend={{ label: `${fmtMoney(variation?.refunded.count)} استرداد` }} icon={<DynamicFeedIcon />} accent="secondary.main" />
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>الإيرادات الشهرية (آخر 12 شهراً)</Typography>
              <BarChart data={monthly.series} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>الإيرادات حسب القطاع</Typography>
              {monthly.by_sector.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات بعد</Typography>
              ) : (
                <SectorBreakdown rows={monthly.by_sector} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>الإيراد المحصّل حسب وسيلة الدفع</Typography>
              <ChannelSplit report={byChannel} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>توزيع المتأخرات حسب فترة التأخير</Typography>
              <ArrearsAging report={aging} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>مصفوفة الإيرادات القومية — قطاع ← منفذ</Typography>
            <SectorPortMatrix report={matrix} />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>شجرة الإيرادات القومية — قطاع ← منفذ ← خدمة</Typography>
            <NationalTreeDisplay tree={national} />
          </CardContent>
        </Card>
      </Box>
    </>
  );
}

function ChannelSplit({ report }: { report: ByChannelReport | null }): React.JSX.Element {
  if (!report || report.items.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات بعد</Typography>;
  }
  const max = Math.max(1, ...report.items.map((i) => i.amount));
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>الوسيلة</TableCell>
            <TableCell align="center">النسبة</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>العدد</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {report.items.map((i) => (
            <TableRow key={i.method}>
              <TableCell sx={{ fontWeight: 700 }}>{i.method_label}</TableCell>
              <TableCell sx={{ minWidth: 160 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(Number(i.amount) / max) * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 2 }}
                  />
                  <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {report.total ? Math.round((Number(i.amount) / report.total) * 100) : 0}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(i.amount)}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{i.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ArrearsAging({ report }: { report: ArrearsAgingReport | null }): React.JSX.Element {
  if (!report || report.buckets.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد متأخرات</Typography>;
  }
  const max = Math.max(1, ...report.buckets.map((b) => b.amount));
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>الفترة</TableCell>
            <TableCell align="center">الوزن النسبي</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>العدد</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {report.buckets.map((b) => (
            <TableRow key={b.label}>
              <TableCell sx={{ fontWeight: 700 }}>{b.label}</TableCell>
              <TableCell sx={{ minWidth: 160 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress variant="determinate" value={(Number(b.amount) / max) * 100} sx={{ flex: 1, height: 8, borderRadius: 2 }} color={b.amount > 0 ? 'warning' : 'success'} />
                  <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {report.total_amount ? Math.round((Number(b.amount) / report.total_amount) * 100) : 0}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main', fontWeight: 700 }}>{fmtMoney(b.amount)}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{b.count}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={2} sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
            <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtMoney(report.total_amount)}</TableCell>
            <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{report.total_count}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SectorPortMatrix({ report }: { report: MatrixReport | null }): React.JSX.Element {
  if (!report || report.rows.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد إيرادات من المنافذ بعد</Typography>;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>القطاع</TableCell>
            <TableCell>المنفذ</TableCell>
            <TableCell align="center">المبلغ</TableCell>
            <TableCell align="center">عدد الفواتير</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {report.rows.map((r, idx) => (
            <TableRow key={idx}>
              <TableCell sx={{ fontWeight: 700 }}>{r.sector}</TableCell>
              <TableCell>{r.port}</TableCell>
              <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.amount)}</TableCell>
              <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function BarChart({ data }: { data: Array<{ month: string | null; amount: number }> }): React.JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'flex-end', gap: 1, overflowX: 'auto' }}>
      {data.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, width: '100%', textAlign: 'center' }}>لا توجد بيانات بعد</Typography>
      )}
      {data.map((d, i) => (
        <Box key={d.month ?? `m-${i}`} sx={{ flex: '1 1 0', minWidth: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(d.amount)}</Typography>
          <Box
            sx={{
              width: '100%',
              height: Math.max(4, (d.amount / max) * 160),
              borderRadius: 1.5,
              background: (t) => `linear-gradient(180deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
            }}
          />
          <Typography variant="caption" sx={{ whiteSpace: 'nowrap', fontSize: 10 }}>{d.month ?? '—'}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function SectorBreakdown({ rows }: { rows: Array<{ name: string; amount: number }> }): React.JSX.Element {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rows.map((r) => (
        <Box key={r.name}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.amount)}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={(r.amount / max) * 100} sx={{ height: 8, borderRadius: 2 }} />
        </Box>
      ))}
    </Box>
  );
}

function NationalTreeDisplay({ tree }: { tree: NationalRevenueTree }): React.JSX.Element {
  const sectors = Object.entries(tree);
  if (sectors.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات بعد</Typography>;
  }
  return (
    <Stack spacing={1.5}>
      {sectors.map(([sector, ports]) => {
        const sectorTotal = Object.values(ports).reduce(
          (sum, svcMap) => sum + Object.values(svcMap).reduce((a, v) => a + v.amount, 0),
          0,
        );
        return (
          <Box key={sector} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{sector}</Typography>
              <Chip size="small" variant="outlined" label={`${fmtMoney(sectorTotal)} SDG`} />
            </Stack>
            {Object.entries(ports).map(([port, services]) => (
              <Box key={port} sx={{ pr: 2, mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>◂ {port}</Typography>
                {Object.entries(services).map(([svc, meta]) => (
                  <Stack key={svc} direction="row" justifyContent="space-between" sx={{ pr: 2 }}>
                    <Typography variant="body2" color="text.secondary">{svc}</Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(meta.amount)} ({meta.count})</Typography>
                  </Stack>
                ))}
              </Box>
            ))}
          </Box>
        );
      })}
    </Stack>
  );
}