import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import EditIcon from '@mui/icons-material/Edit';
import ReviewIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  addSampleTest,
  approveTest,
  enterTestResult,
  getWorklist,
  returnTestResult,
  reviewTest,
  reviseTest,
  saveTestResult,
  startTest,
} from '../../api/endpoints/laboratory';
import type { SampleTest } from '../../types/laboratory';
import { sampleOutcome, samplePriority, sampleTestStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const statusOptions = Object.entries(sampleTestStatus).map(([v, m]) => ({ value: v, label: m.label }));
const outcomeOptions = Object.entries(sampleOutcome).map(([v, m]) => ({ value: v, label: m.label }));

const NqlisWorklist = () => {
  const { sector } = useLabScope();
  const table = useServerTable<SampleTest>({ fetchData: getWorklist });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [active, setActive] = useState<SampleTest | null>(null);
  const [dialogKind, setDialogKind] = useState<'result' | 'addtest' | 'return'>('result');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [outcome, setOutcome] = useState('POSITIVE');
  const [resultValue, setResultValue] = useState('');
  const [resultText, setResultText] = useState('');
  const [unit, setUnit] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [addTestName, setAddTestName] = useState('');
  const [addTestMethod, setAddTestMethod] = useState('');

  const openResult = (t: SampleTest) => {
    setActive(t);
    setDialogKind('result');
    setOutcome(t.outcome || 'POSITIVE');
    setResultValue(t.result_value != null ? String(t.result_value) : '');
    setResultText(t.result_text || '');
    setUnit(t.unit || '');
    setReferenceRange(t.reference_range || '');
    setNotes(t.notes || '');
    setOpen(true);
  };

  const openReturn = (t: SampleTest) => {
    setActive(t);
    setDialogKind('return');
    setReason('');
    setOpen(true);
  };

  const runStep = async (t: SampleTest, step: 'start' | 'enter' | 'review' | 'approve' | 'revise') => {
    try {
      const map = { start: startTest, enter: enterTestResult, review: reviewTest, approve: approveTest, revise: reviseTest };
      await map[step](t.id);
      notifySuccess('تم تنفيذ الخطوة');
      refresh();
    } catch {
      notifyError('تعذر تنفيذ الخطوة');
    }
  };

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      if (dialogKind === 'result') {
        await saveTestResult(active.id, {
          outcome,
          result_value: resultValue ? Number(resultValue) : null,
          result_text: resultText || undefined,
          unit: unit || undefined,
          reference_range: referenceRange || undefined,
          notes: notes || undefined,
        });
        notifySuccess('تم حفظ النتيجة');
      } else if (dialogKind === 'return') {
        await returnTestResult(active.id, reason || 'إعادة');
        notifySuccess('تمت إعادة الفحص للمراجعة');
      } else if (dialogKind === 'addtest' && active) {
        await addSampleTest(active.sample, { test_name: addTestName, method: addTestMethod || undefined });
        notifySuccess('تمت إضافة الفحص');
      }
      setOpen(false);
      refresh();
    } catch {
      notifyError('تعذر حفظ العملية');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<SampleTest>[] = [
    { key: 'sample_number', label: 'رقم العينة', render: (t) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{t.sample_number}</Typography> },
    { key: 'test_name', label: 'الفحص', render: (t) => <Typography fontWeight={700}>{t.test_name}</Typography> },
    { key: 'disease_name', label: 'المرض', render: (t) => t.disease_name || '—', hideOnMobile: true },
    { key: 'section_name', label: 'القسم', render: (t) => t.section_name || '—', hideOnMobile: true },
    { key: 'priority', label: 'الأولوية', render: (t) => { const m = samplePriority[t.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : t.priority; } },
    { key: 'status', label: 'الحالة', render: (t) => { const m = sampleTestStatus[t.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={t.status} tone="neutral" />; } },
    { key: 'is_critical', label: 'حرج', render: (t) => t.is_critical ? <StatusChip label="حرج" tone="error" /> : null },
    { key: 'assigned_name', label: 'المسؤول', render: (t) => t.assigned_name || '—', hideOnMobile: true },
    { key: 'actions', label: 'إجراءات', render: (t) => (
        <Stack direction="row" spacing={0.5}>
          {t.status === 'PENDING' && (
            <Tooltip title="بدء"><IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); runStep(t, 'start'); }}><PlayCircleIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {(t.status === 'IN_PROGRESS' || t.status === 'DRAFT') && (
            <Tooltip title="إدخال النتيجة"><IconButton size="small" color="primary" onClick={() => openResult(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {t.status === 'DRAFT' && (
            <Tooltip title="إرسال للمراجعة"><IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); runStep(t, 'enter'); }}><AddIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {t.status === 'SUBMITTED' && (
            <Tooltip title="مراجعة"><IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); runStep(t, 'review'); }}><ReviewIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {t.status === 'REVIEWED' && (
            <Tooltip title="اعتماد"><IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); runStep(t, 'approve'); }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {t.status === 'SUBMITTED' && (
            <Tooltip title="إعادة"><IconButton size="small" color="warning" onClick={() => openReturn(t)}><ReplayIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {t.status === 'COMPLETED' && (
            <Tooltip title="مراجعة إصدار جديد"><IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); runStep(t, 'revise'); }}><WarningAmberIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="قائمة العمل"
        subtitle="مهام فحص عينات NQLIS"
        eyebrow="NQLIS"
      />
      <DataTable<SampleTest>
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة العمل"
        subtitle={`${count} فحص`}
        filters={[
          { key: 'status', label: 'الحالة', options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد مهام"
        emptyDescription="المهام الجديدة تظهر هنا"
      />

      <FormDialog
        open={open && dialogKind === 'result'}
        title="إدخال نتيجة الفحص"
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<EditIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormSelect label="النتيجة" value={outcome} onChange={setOutcome} options={outcomeOptions} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="القيمة" value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
        <Box sx={{ height: 16 }} />
        <Stack direction="row" spacing={2}>
          <FormTextField label="الوحدة" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <FormTextField label="المدى المرجعي" value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} />
        </Stack>
        <Box sx={{ height: 16 }} />
        <FormTextField label="النتيجة النصية" multiline minRows={2} value={resultText} onChange={(e) => setResultText(e.target.value)} />
        <Box sx={{ height: 16 }} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormDialog>

      <FormDialog
        open={open && dialogKind === 'return'}
        title="إعادة الفحص"
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<ReplayIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormTextField label="سبب الإعادة" multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisWorklist;
