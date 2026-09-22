import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { extractErrorMessage, notifyError, notifySuccess } from '../../../utils/toast';
import {
  createSparAssessment,
  getSparAssessments,
  getSparIndicators,
  getSparYearReport,
} from '../../../api/endpoints/ihr';
import type { SPARAssessment, SPARIndicator, SPARYearReport } from '../../../types/ihr';

const scoreTone = (score: number) => {
  if (score >= 3.5) return 'success';
  if (score >= 2.5) return 'info';
  if (score >= 1.5) return 'warning';
  return 'error';
};

const AssessmentForm = ({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [indicator, setIndicator] = useState('');
  const [score, setScore] = useState('');
  const [gaps, setGaps] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const indicatorsTable = useServerTable<SPARIndicator>({ fetchData: getSparIndicators });
  const indicators = indicatorsTable.rows;

  useEffect(() => {
    if (open) indicatorsTable.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!indicator) {
      notifyError('اختر المؤشر');
      return;
    }
    setBusy(true);
    try {
      await createSparAssessment({ year, indicator, score: Number(score), gaps, evidence });
      notifySuccess(`سُجِّل تقييم المؤشر عن عام ${year}`);
      onSaved();
      onClose();
      setScore('');
      setGaps('');
      setEvidence('');
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل حفظ التقييم'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>تقييم قدرة SPAR</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            select
            label="المؤشر"
            fullWidth
            required
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
          >
            {indicators.map((ind) => (
              <MenuItem key={ind.id} value={ind.id}>{ind.code} — {ind.name_ar}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField
              label="السنة"
              type="number"
              fullWidth
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <TextField
              label="الدرجة (0-4)"
              type="number"
              inputProps={{ min: 0, max: 4, step: 0.2 }}
              fullWidth
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </Stack>
          <TextField label="الفجوات" fullWidth value={gaps} onChange={(e) => setGaps(e.target.value)} />
          <TextField label="الأدلة" fullWidth multiline rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const SparPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [report, setReport] = useState<SPARYearReport | null>(null);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);
  const assessmentsTable = useServerTable<SPARAssessment>({ fetchData: getSparAssessments });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting,
    setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter,
  } = assessmentsTable;

  const loadReport = async (year: number) => {
    setReportLoading(true);
    try {
      const res = await getSparYearReport(year);
      setReport(res.data.data);
    } catch {
      setReport(null);
      notifyError('لا يوجد تقرير لهذه السنة');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    void loadReport(reportYear);
  }, [reportYear]);

  return (
    <Box>
      <PageHeader
        title="مؤشرات الاستعداد والترصد (SPAR)"
        subtitle="تقييم 15 قدرة وطنية وفق إطار اللائحة الصحية الدولية (2019)"
        eyebrow="IHR / SPAR"
        action={
          <Button variant="contained" startIcon={<AssessmentIcon />} onClick={() => setFormOpen(true)}>
            تقييم جديد
          </Button>
        }
      />

      {report && (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ fontWeight: 700 }}>تقرير عام {report.year}</Typography>
                <StatusChip
                  label={`الدرجة الكلية: ${report.overall_score.toFixed(2)}`}
                  tone={scoreTone(report.overall_score)}
                />
                <StatusChip label={`${report.assessment_count} مؤشر مقيّم`} tone="primary" variant="outlined" />
              </Stack>
              <TextField
                select
                size="small"
                defaultValue={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
              >
                {[reportYear, reportYear - 1, reportYear - 2, reportYear - 3].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Stack>
            {reportLoading && <Typography variant="caption" color="text.secondary">جارٍ تحميل التقرير…</Typography>}
            {report.indicators.length > 0 && (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المؤشر</TableCell>
                      <TableCell align="center">الدرجة</TableCell>
                      <TableCell>الفجوات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.indicators.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{a.indicator_code}</Typography>
                            <Typography variant="body2">{a.indicator_name_ar}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <StatusChip label={String(a.score)} tone={scoreTone(a.score)} variant="outlined" />
                        </TableCell>
                        <TableCell>{a.gaps || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {report.indicators.length === 0 && !reportLoading && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>لا تقييمات مسجلة عن هذه السنة.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <DataTable<SPARAssessment>
        columns={[
          {
            key: 'indicator_code',
            label: 'المؤشر',
            sortable: true,
            render: (a) => (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{a.indicator_code}</Typography>
                <Typography variant="body2">{a.indicator_name_ar}</Typography>
              </Stack>
            ),
          },
          { key: 'year', label: 'السنة', sortable: true, render: (a) => a.year },
          {
            key: 'score',
            label: 'الدرجة',
            sortable: true,
            render: (a) => <StatusChip label={String(a.score)} tone={scoreTone(a.score)} />,
          },
          { key: 'gaps', label: 'الفجوات', render: (a) => a.gaps || '—', hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="التقييمات"
        subtitle={`${count} تقييم`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث..."
        filters={[
          {
            key: 'year',
            label: 'السنة',
            options: [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => ({ value: String(y), label: String(y) })),
            value: '',
            onChange: (v) => setFilter('year', v),
          },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد تقييمات SPAR"
        emptyDescription="قيّم أول قدرة وطنية من زر «تقييم جديد»"
      />

      <AssessmentForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} />
    </Box>
  );
};

export default SparPage;