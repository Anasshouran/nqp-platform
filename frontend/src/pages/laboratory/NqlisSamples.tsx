import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import CircleIcon from '@mui/icons-material/Circle';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import QrCodeIcon from '@mui/icons-material/QrCode';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormSelect,
  FormDialog,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  assignSample,
  getLabSamples,
  getSampleTrack,
} from '../../api/endpoints/laboratory';
import type { LabSample, SampleMovement } from '../../types/laboratory';
import { samplePriority, sampleSource, sampleStatus, sampleType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const typeOptions = Object.entries(sampleType).map(([v, m]) => ({ value: v, label: m.label }));
const statusOptions = Object.entries(sampleStatus).map(([v, m]) => ({ value: v, label: m.label }));

const NqlisSamples = () => {
  const { sector } = useLabScope();
  const table = useServerTable<LabSample>({ fetchData: getLabSamples });
  const { rows, count, loading, error, searchInput, setSearchInput, setFilter, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [trackSample, setTrackSample] = useState<LabSample | null>(null);
  const [movements, setMovements] = useState<SampleMovement[]>([]);
  const [trackLoading, setTrackLoading] = useState(false);

  const [assignSampleState, setAssignSampleState] = useState<LabSample | null>(null);
  const [sections, setSections] = useState<{ value: string; label: string }[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const openTrack = async (sample: LabSample) => {
    setTrackSample(sample);
    setTrackLoading(true);
    try {
      const res = await getSampleTrack(sample.id);
      setMovements(res.data.data.movements || []);
    } catch {
      notifyError('تعذر تحميل سجل التتبع');
      setMovements([]);
    } finally {
      setTrackLoading(false);
    }
  };

  const openAssign = async (sample: LabSample) => {
    setAssignSampleState(sample);
    setSectionId('');
    setSections([]);
    try {
      const mod = await import('../../api/endpoints/laboratory');
      const res = await mod.getSections({ is_active: true });
      setSections(res.data.data.results.map((s) => ({ value: s.id, label: s.name_ar })));
    } catch {
      notifyError('تعذر تحميل الأقسام');
    }
  };

  const handleAssign = async () => {
    if (!assignSampleState || !sectionId) return;
    setAssigning(true);
    try {
      await assignSample(assignSampleState.id, sectionId);
      notifySuccess('تم توزيع العينة على القسم');
      setAssignSampleState(null);
      refresh();
    } catch {
      notifyError('تعذر توزيع العينة');
    } finally {
      setAssigning(false);
    }
  };

  const columns: DataTableColumn<LabSample>[] = [
    { key: 'sample_number', label: 'رقم العينة', render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.sample_number}</Typography> },
    { key: 'sample_barcode', label: 'الباركود', render: (s) => <Typography sx={{ fontFamily: 'monospace' }}>{s.sample_barcode}</Typography>, hideOnMobile: true },
    { key: 'sample_type', label: 'النوع', render: (s) => { const m = sampleType[s.sample_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.sample_type; } },
    { key: 'source', label: 'المصدر', render: (s) => { const m = sampleSource[s.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.source; }, hideOnMobile: true },
    { key: 'priority', label: 'الأولوية', render: (s) => { const m = samplePriority[s.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.priority; } },
    { key: 'section_name', label: 'القسم', render: (s) => s.section_name || '—', hideOnMobile: true },
    { key: 'status', label: 'الحالة', render: (s) => { const m = sampleStatus[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
    { key: 'test_count', label: 'الفحوصات', render: (s) => s.test_count, hideOnMobile: true },
    { key: 'actions', label: 'إجراءات', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" title="تتبع" onClick={() => openTrack(s)}><HistoryIcon fontSize="small" /></IconButton>
          {s.status === 'ACCEPTED' && (
            <IconButton size="small" title="توزيع" color="primary" onClick={() => openAssign(s)}><QrCodeIcon fontSize="small" /></IconButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="سجل العينات"
        subtitle="عرض وتتبع عينات NQLIS"
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
        title="العينات"
        subtitle={`${count} عينة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالرقم أو الباركود..."
        filters={[
          { key: 'sample_type', label: 'النوع', options: typeOptions, value: '', onChange: (v) => setFilter('sample_type', v) },
          { key: 'status', label: 'الحالة', options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد عينات"
        emptyDescription="سجل عينات NQLIS فارغ"
      />

      <Dialog open={Boolean(trackSample)} onClose={() => setTrackSample(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          سجل تتبع العينة {trackSample?.sample_number}
          <IconButton onClick={() => setTrackSample(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {trackSample && (
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="body2">الحالة: <StatusChip label={sampleStatus[trackSample.status]?.label || trackSample.status} tone={sampleStatus[trackSample.status]?.tone || 'neutral'} /></Typography>
              <Typography variant="body2">القسم: {trackSample.section_name || '—'}</Typography>
            </Stack>
          )}
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {movements.length === 0 && (
              <Typography color="text.secondary">{trackLoading ? 'جارِ التحميل...' : 'لا يوجد سجل حركة'}</Typography>
            )}
            {movements.map((m) => (
              <ListItem key={m.id} divider>
                <ListItemIcon><CircleIcon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText
                  primary={m.action_label}
                  secondary={
                    <span>
                      {m.department && `${m.department} · `}
                      {m.user_name && `${m.user_name} · `}
                      {formatDateTime(m.created_at)}
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={Boolean(assignSampleState)}
        title="توزيع العينة على قسم"
        subtitle={assignSampleState ? assignSampleState.sample_number : ''}
        onClose={() => setAssignSampleState(null)}
        onSubmit={handleAssign}
        loading={assigning}
        submitDisabled={!sectionId}
      >
        <FormSelect label="القسم" value={sectionId} onChange={setSectionId} options={sections} placeholder="اختر القسم" />
      </FormDialog>
    </Box>
  );
};

export default NqlisSamples;
