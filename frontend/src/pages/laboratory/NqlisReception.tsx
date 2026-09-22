import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
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
import {
  acceptSample,
  conditionalAcceptSample,
  createLabSample,
  getReceptionQueue,
  rejectSample,
} from '../../api/endpoints/laboratory';
import type { LabSample } from '../../types/laboratory';
import { receptionStatus, samplePriority, sampleSource, sampleStatus, sampleType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const typeOptions = Object.entries(sampleType).map(([v, m]) => ({ value: v, label: m.label }));
const sourceOptions = Object.entries(sampleSource).map(([v, m]) => ({ value: v, label: m.label }));
const priorityOptions = Object.entries(samplePriority).map(([v, m]) => ({ value: v, label: m.label }));

const NqlisReception = () => {
  const { sector } = useLabScope();
  const table = useServerTable<LabSample>({ fetchData: getReceptionQueue });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ sample_type: 'SWAB', source: 'CLINIC', priority: 'ROUTINE' });

  const [active, setActive] = useState<LabSample | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionKind, setDecisionKind] = useState<'accept' | 'conditional' | 'reject'>('accept');
  const [decisionNote, setDecisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createLabSample(form);
      notifySuccess('تم تسجيل العينة بنجاح');
      setCreateOpen(false);
      setForm({ sample_type: 'SWAB', source: 'CLINIC', priority: 'ROUTINE' });
      refresh();
    } catch {
      notifyError('تعذر تسجيل العينة');
    } finally {
      setCreating(false);
    }
  };

  const openDecision = (sample: LabSample, kind: 'accept' | 'conditional' | 'reject') => {
    setActive(sample);
    setDecisionKind(kind);
    setDecisionNote('');
    setDecisionOpen(true);
  };

  const handleDecision = async () => {
    if (!active) return;
    setDeciding(true);
    try {
      const payload = { reception_note: decisionNote || undefined };
      if (decisionKind === 'accept') await acceptSample(active.id, payload);
      else if (decisionKind === 'conditional') await conditionalAcceptSample(active.id, payload);
      else await rejectSample(active.id, { ...payload, rejection_reason: decisionNote || 'عينة غير مطابقة' });
      notifySuccess('تم تحديث قرار الاستقبال');
      setDecisionOpen(false);
      refresh();
    } catch {
      notifyError('تعذر تنفيذ القرار');
    } finally {
      setDeciding(false);
    }
  };

  const columns: DataTableColumn<LabSample>[] = [
    { key: 'sample_number', label: 'رقم العينة', render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.sample_number}</Typography> },
    { key: 'sample_barcode', label: 'الباركود', render: (s) => <Typography sx={{ fontFamily: 'monospace' }}>{s.sample_barcode}</Typography>, hideOnMobile: true },
    { key: 'sample_type', label: 'النوع', render: (s) => { const m = sampleType[s.sample_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.sample_type; } },
    { key: 'source', label: 'المصدر', render: (s) => { const m = sampleSource[s.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.source; }, hideOnMobile: true },
    { key: 'priority', label: 'الأولوية', render: (s) => { const m = samplePriority[s.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.priority; } },
    { key: 'reception_status', label: 'حالة الاستقبال', render: (s) => { const m = receptionStatus[s.reception_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
    { key: 'received_at', label: 'وقت الاستلام', render: (s) => formatDateTime(s.collected_at || s.created_at), hideOnMobile: true },
    { key: 'actions', label: 'إجراءات', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          {s.reception_status === 'RECEIVED' && (
            <>
              <Tooltip title="قبول"><IconButton size="small" color="success" onClick={() => openDecision(s, 'accept')}><VerifiedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="قبول مشروط"><IconButton size="small" color="warning" onClick={() => openDecision(s, 'conditional')}><WarningAmberIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="رفض"><IconButton size="small" color="error" onClick={() => openDecision(s, 'reject')}><CancelIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="استقبال العينات"
        subtitle="مراجعة وقبول عينات NQLIS الواردة"
        eyebrow="NQLIS"
      />
      <DataTable<LabSample>
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="طابور الاستقبال"
        subtitle={`${count} عينة`}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            عينة جديدة
          </AppButton>
        }
        emptyTitle="لا توجد عينات بانتظار الاستقبال"
        emptyDescription="العينات الجديدة تظهر هنا"
      />

      <FormDialog
        open={createOpen}
        title="تسجيل عينة جديدة"
        subtitle="إنشاء عينة NQLIS يدوياً"
        icon={<AddIcon />}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={creating}
      >
        <FormSelect label="نوع العينة" value={form.sample_type} onChange={(v) => setForm({ ...form, sample_type: v })} options={typeOptions} />
        <Box sx={{ height: 16 }} />
        <FormSelect label="المصدر" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={sourceOptions} />
        <Box sx={{ height: 16 }} />
        <FormSelect label="الأولوية" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorityOptions} />
      </FormDialog>

      <FormDialog
        open={decisionOpen}
        title={
          decisionKind === 'accept' ? 'قبول العينة' : decisionKind === 'conditional' ? 'قبول مشروط' : 'رفض العينة'
        }
        subtitle={active ? `العينة ${active.sample_number || active.sample_barcode}` : ''}
        icon={decisionKind === 'accept' ? <VerifiedIcon /> : decisionKind === 'reject' ? <CancelIcon /> : <WarningAmberIcon />}
        onClose={() => setDecisionOpen(false)}
        onSubmit={handleDecision}
        loading={deciding}
        submitLabel={decisionKind === 'reject' ? 'رفض' : 'تأكيد'}
      >
        <FormTextField label={decisionKind === 'reject' ? 'سبب الرفض' : 'ملاحظة الاستقبال'} multiline minRows={3} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisReception;
