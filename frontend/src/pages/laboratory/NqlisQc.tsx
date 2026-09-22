import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
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

const qcStatus: Record<string, { label: string; tone: 'info' | 'success' | 'error' }> = {
  PENDING: { label: 'قيد المراجعة', tone: 'info' },
  PASSED: { label: 'مطابق', tone: 'success' },
  FAILED: { label: 'غير مطابق', tone: 'error' },
};

const severityMap: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  MINOR: { label: 'طفيف', tone: 'success' },
  MAJOR: { label: 'جوهري', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

const NqlisQc = () => {
  const { sector } = useLabScope();
  const table = useServerTable<QCRecord>({ fetchData: getQcRecords });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

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
      notifySuccess('تم إنشاء سجل مراقبة الجودة');
      setForm({ control_type: '', lot_number: '', result_value: '', expected_value: '', tolerance: '', qc_notes: '' });
      setOpen(false);
      refresh();
    } catch {
      notifyError('تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await reviewQcRecord(reviewTarget.id, { status: reviewStatus, severity, qc_notes: reviewNotes });
      notifySuccess('تم اعتماد المراقبة');
      setReviewTarget(null);
      refresh();
    } catch {
      notifyError('تعذر الاعتماد');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<QCRecord>[] = [
    { key: 'qc_number', label: 'الرقم', render: (q) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{q.qc_number}</Typography> },
    { key: 'control_type', label: 'نوع المراقب', render: (q) => <Typography fontWeight={700}>{q.control_type}</Typography> },
    { key: 'section_name', label: 'القسم', hideOnMobile: true },
    { key: 'status', label: 'الحالة', render: (q) => { const m = qcStatus[q.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={q.status} tone="neutral" />; } },
    { key: 'severity', label: 'الخطورة', render: (q) => { const m = severityMap[q.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : q.severity; } },
    { key: 'result_value', label: 'النتيجة/المتوقع', render: (q) => q.result_value != null ? `${q.result_value} / ${q.expected_value ?? '—'}` : '—' },
    { key: 'reviewed_name', label: 'المراجِع', render: (q) => q.reviewed_name || '—', hideOnMobile: true },
    { key: 'actions', label: 'إجراء', render: (q) => q.status === 'PENDING' ? (
        <AppButton size="small" variant="secondary" onClick={() => { setReviewTarget(q); setReviewStatus('PASSED'); setSeverity(q.severity || 'MINOR'); setReviewNotes(q.qc_notes || ''); }}>
          مراجعة
        </AppButton>
      ) : (
        <Typography variant="body2" color="text.secondary">{formatDateTime(q.reviewed_at)}</Typography>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="مراقبة الجودة"
        subtitle="سجلات مراقبة الجودة واعتمادها"
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
        title="سجلات مراقبة الجودة"
        subtitle={`${count} سجل`}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>سجل جديد</AppButton>
        }
        emptyTitle="لا توجد سجلات مراقبة جودة"
        emptyDescription="سجلات مراقبة الجودة تظهر هنا"
      />

      <FormDialog
        open={open}
        title="إنشاء سجل مراقبة جودة"
        icon={<AddIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        <FormTextField label="نوع المراقب" value={form.control_type} onChange={(e) => setForm({ ...form, control_type: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="رقم التشغيلة" value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormTextField label="النتيجة" value={form.result_value} onChange={(e) => setForm({ ...form, result_value: e.target.value })} />
          <FormTextField label="القيمة المتوقعة" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} />
          <FormTextField label="التفاوت" value={form.tolerance} onChange={(e) => setForm({ ...form, tolerance: e.target.value })} />
        </Box>
        <Box sx={{ height: 16 }} />
        <FormSelect label="الخطورة" value={severity} options={Object.entries(severityMap).map(([v, m]) => ({ value: v, label: m.label }))} onChange={setSeverity} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={form.qc_notes} onChange={(e) => setForm({ ...form, qc_notes: e.target.value })} />
      </FormDialog>

      <FormDialog
        open={Boolean(reviewTarget)}
        title="مراجعة سجل مراقبة الجودة"
        subtitle={reviewTarget?.qc_number}
        onClose={() => setReviewTarget(null)}
        onSubmit={handleReview}
        loading={submitting}
      >
        <FormSelect label="النتيجة" value={reviewStatus} options={[{ value: 'PASSED', label: 'مطابق' }, { value: 'FAILED', label: 'غير مطابق' }]} onChange={setReviewStatus} />
        <Box sx={{ height: 16 }} />
        <FormSelect label="الخطورة" value={severity} options={Object.entries(severityMap).map(([v, m]) => ({ value: v, label: m.label }))} onChange={setSeverity} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="ملاحظات المراجعة" multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisQc;