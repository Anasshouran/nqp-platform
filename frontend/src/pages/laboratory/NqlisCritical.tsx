import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormTextField,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  acknowledgeCritical,
  getCriticalResults,
} from '../../api/endpoints/laboratory';
import type { CriticalResultNotification } from '../../types/laboratory';
import { sampleOutcome } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const NqlisCritical = () => {
  const { sector } = useLabScope();
  const table = useServerTable<CriticalResultNotification>({ fetchData: getCriticalResults });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [active, setActive] = useState<CriticalResultNotification | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAck = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      await acknowledgeCritical(active.id, note || '');
      notifySuccess('تم الإقرار بالنتيجة الحرجة');
      setOpen(false);
      refresh();
    } catch {
      notifyError('تعذر الإقرار');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<CriticalResultNotification>[] = [
    { key: 'sample_number', label: 'رقم العينة', render: (c) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.sample_number}</Typography> },
    { key: 'test_name', label: 'الفحص', render: (c) => <Typography fontWeight={700}>{c.test_name}</Typography> },
    { key: 'outcome', label: 'النتيجة', render: (c) => { const m = sampleOutcome[c.outcome]; return m ? <StatusChip label={m.label} tone="error" /> : null; } },
    { key: 'channel', label: 'القناة', render: (c) => c.channel, hideOnMobile: true },
    { key: 'notified_at', label: 'وقت الإخطار', render: (c) => formatDateTime(c.notified_at) },
    { key: 'acknowledged_name', label: 'أقرّ به', render: (c) => c.acknowledged_name || '—', hideOnMobile: true },
    { key: 'actions', label: 'إجراء', render: (c) => c.acknowledged_at ? (
        <StatusChip label="تم الإقرار" tone="success" />
      ) : (
        <Tooltip title="إقرار">
          <IconButton size="small" color="success" onClick={() => { setActive(c); setNote(''); setOpen(true); }}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="النتائج الحرجة"
        subtitle="إخطارات النتائج الحرجة واستجابتها"
        eyebrow="NQLIS"
      />
      <DataTable<CriticalResultNotification>
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="إخطارات النتائج الحرجة"
        subtitle={`${count} إخطار`}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد نتائج حرجة"
        emptyDescription="سيتم إنشاء إخطار تلقائياً عند اعتماد نتيجة حرجة"
      />

      <FormDialog
        open={open}
        title="الإقرار بنتيجة حرجة"
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<WarningAmberIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleAck}
        loading={submitting}
      >
        <FormTextField label="ملاحظة الإقرار" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisCritical;
