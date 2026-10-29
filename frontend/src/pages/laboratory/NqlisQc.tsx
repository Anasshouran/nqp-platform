import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import { createQcRecord, getQcRecords, reviewQcRecord } from '../../api/endpoints/laboratory';
import type { QCRecord } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const qcStatusTone: Record<string, { tone: 'info' | 'success' | 'error' }> = {
  PENDING: { tone: 'info' },
  PASSED: { tone: 'success' },
  FAILED: { tone: 'error' },
};

const severityTone: Record<string, { tone: 'success' | 'warning' | 'error' }> = {
  MINOR: { tone: 'success' },
  MAJOR: { tone: 'warning' },
  CRITICAL: { tone: 'error' },
};

const NqlisQc = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const table = useServerTable<QCRecord>({ fetchData: getQcRecords });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const statusLabels = useMemo(
    () => ({
      PENDING: t('laboratory.nqlisQc.pending'),
      PASSED: t('laboratory.nqlisQc.passed'),
      FAILED: t('laboratory.nqlisQc.failed'),
    }),
    [t],
  );

  const severityLabels = useMemo(
    () => ({
      MINOR: t('laboratory.shared.minor'),
      MAJOR: t('laboratory.shared.major'),
      CRITICAL: t('laboratory.shared.critical'),
    }),
    [t],
  );

  const severityOptions = useMemo(
    () => Object.keys(severityTone).map((v) => ({ value: v, label: severityLabels[v as keyof typeof severityLabels] })),
    [severityLabels],
  );

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ control_type: '', lot_number: '', result_value: '', expected_value: '', tolerance: '', qc_notes: '' });

  const [reviewTarget, setReviewTarget] = useState<QCRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState('PASSED');
  const [severity, setSeverity] = useState('MINOR');
  const [reviewNotes, setReviewNotes] = useState('');

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createQcRecord({
        ...form,
        result_value: form.result_value ? Number(form.result_value) : null,
        expected_value: form.expected_value ? Number(form.expected_value) : null,
        tolerance: form.tolerance ? Number(form.tolerance) : null,
        severity,
      });
      notifySuccess(t('laboratory.nqlisQc.created'));
      setForm({ control_type: '', lot_number: '', result_value: '', expected_value: '', tolerance: '', qc_notes: '' });
      setOpen(false);
      refresh();
    } catch {
      notifyError(t('laboratory.shared.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await reviewQcRecord(reviewTarget.id, { status: reviewStatus, severity, qc_notes: reviewNotes });
      notifySuccess(t('laboratory.nqlisQc.approved'));
      setReviewTarget(null);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisQc.approveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<QCRecord>[] = [
    { key: 'qc_number', label: t('laboratory.shared.colNumber'), render: (q) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{q.qc_number}</Typography> },
    { key: 'control_type', label: t('laboratory.nqlisQc.colControl'), render: (q) => <Typography fontWeight={700}>{q.control_type}</Typography> },
    { key: 'section_name', label: t('laboratory.shared.colSection'), hideOnMobile: true },
    { key: 'status', label: t('laboratory.shared.colStatus'), render: (q) => { const m = qcStatusTone[q.status]; return m ? <StatusChip label={statusLabels[q.status as keyof typeof statusLabels] ?? q.status} tone={m.tone} /> : <StatusChip label={q.status} tone="neutral" />; } },
    { key: 'severity', label: t('laboratory.shared.colSeverity'), render: (q) => { const m = severityTone[q.severity]; return m ? <StatusChip label={severityLabels[q.severity as keyof typeof severityLabels] ?? q.severity} tone={m.tone} /> : q.severity; } },
    { key: 'result_value', label: t('laboratory.nqlisQc.colResult'), render: (q) => q.result_value != null ? `${q.result_value} / ${q.expected_value ?? '—'}` : '—' },
    { key: 'reviewed_name', label: t('laboratory.nqlisQc.colReviewer'), render: (q) => q.reviewed_name || '—', hideOnMobile: true },
    { key: 'actions', label: t('laboratory.shared.colAction'), render: (q) => q.status === 'PENDING' ? (
        <AppButton size="small" variant="secondary" onClick={() => { setReviewTarget(q); setReviewStatus('PASSED'); setSeverity(q.severity || 'MINOR'); setReviewNotes(q.qc_notes || ''); }}>
          {t('laboratory.nqlisQc.reviewAction')}
        </AppButton>
      ) : (
        <Typography variant="body2" color="text.secondary">{formatDateTime(q.reviewed_at)}</Typography>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisQc.title')}
        subtitle={t('laboratory.nqlisQc.subtitle')}
        eyebrow="NQLIS"
      />
      <DataTable<QCRecord>
        columns={columns}
        rows={rows}
        rowKey={(q) => q.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('laboratory.nqlisQc.tableTitle')}
        subtitle={t('laboratory.shared.recordsCount', { count })}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('laboratory.shared.newRecord')}</AppButton>
        }
        emptyTitle={t('laboratory.nqlisQc.emptyTitle')}
        emptyDescription={t('laboratory.nqlisQc.emptyDescription')}
      />

      <FormDialog
        open={open}
        title={t('laboratory.nqlisQc.createTitle')}
        icon={<AddIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        <FormTextField label={t('laboratory.nqlisQc.colControl')} value={form.control_type} onChange={(e) => setForm({ ...form, control_type: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.shared.batchNumber')} value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormTextField label={t('laboratory.nqlisQc.lblResult')} value={form.result_value} onChange={(e) => setForm({ ...form, result_value: e.target.value })} />
          <FormTextField label={t('laboratory.nqlisQc.lblExpected')} value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} />
          <FormTextField label={t('laboratory.nqlisQc.lblTolerance')} value={form.tolerance} onChange={(e) => setForm({ ...form, tolerance: e.target.value })} />
        </Box>
        <Box sx={{ height: 16 }} />
        <FormSelect label={t('laboratory.shared.colSeverity')} value={severity} options={severityOptions} onChange={setSeverity} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisQc.lblNotes')} multiline minRows={2} value={form.qc_notes} onChange={(e) => setForm({ ...form, qc_notes: e.target.value })} />
      </FormDialog>

      <FormDialog
        open={Boolean(reviewTarget)}
        title={t('laboratory.nqlisQc.reviewTitle')}
        subtitle={reviewTarget?.qc_number}
        onClose={() => setReviewTarget(null)}
        onSubmit={handleReview}
        loading={submitting}
      >
        <FormSelect label={t('laboratory.nqlisQc.lblResult')} value={reviewStatus} options={[{ value: 'PASSED', label: statusLabels.PASSED }, { value: 'FAILED', label: statusLabels.FAILED }]} onChange={setReviewStatus} />
        <Box sx={{ height: 16 }} />
        <FormSelect label={t('laboratory.shared.colSeverity')} value={severity} options={severityOptions} onChange={setSeverity} />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisQc.lblReviewNotes')} multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisQc;