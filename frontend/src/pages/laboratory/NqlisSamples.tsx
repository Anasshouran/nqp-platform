import { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormSelect,
  FormDialog,
  type StatusTone,
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

const NqlisSamples = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const table = useServerTable<LabSample>({ fetchData: getLabSamples });
  const { rows, count, loading, error, searchInput, setSearchInput, setFilter, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const typeMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(sampleType).map(([k, v]) => [k, { label: t(`laboratory.nqlisSamples.type.${k}`), tone: v.tone }])),
    [t],
  );
  const sourceMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(sampleSource).map(([k, v]) => [k, { label: t(`laboratory.nqlisSamples.source.${k}`), tone: v.tone }])),
    [t],
  );
  const priorityMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(samplePriority).map(([k, v]) => [k, { label: t(`laboratory.nqlisSamples.priority.${k}`), tone: v.tone }])),
    [t],
  );
  const statusMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => Object.fromEntries(Object.entries(sampleStatus).map(([k, v]) => [k, { label: t(`laboratory.nqlisSamples.status.${k}`), tone: v.tone }])),
    [t],
  );

  const typeOptions = Object.entries(sampleType).map(([v]) => ({ value: v, label: typeMeta[v].label }));
  const statusOptions = Object.entries(sampleStatus).map(([v]) => ({ value: v, label: statusMeta[v].label }));

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
      notifyError(t('laboratory.nqlisSamples.trackError'));
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
      notifyError(t('laboratory.nqlisSamples.sectionsError'));
    }
  };

  const handleAssign = async () => {
    if (!assignSampleState || !sectionId) return;
    setAssigning(true);
    try {
      await assignSample(assignSampleState.id, sectionId);
      notifySuccess(t('laboratory.nqlisSamples.assignSuccess'));
      setAssignSampleState(null);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisSamples.assignError'));
    } finally {
      setAssigning(false);
    }
  };

  const columns: DataTableColumn<LabSample>[] = [
    { key: 'sample_number', label: t('laboratory.nqlisSamples.colSampleNumber'), render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.sample_number}</Typography> },
    { key: 'sample_barcode', label: t('laboratory.nqlisSamples.colBarcode'), render: (s) => <Typography sx={{ fontFamily: 'monospace' }}>{s.sample_barcode}</Typography>, hideOnMobile: true },
    { key: 'sample_type', label: t('laboratory.nqlisSamples.colType'), render: (s) => { const m = typeMeta[s.sample_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.sample_type; } },
    { key: 'source', label: t('laboratory.nqlisSamples.colSource'), render: (s) => { const m = sourceMeta[s.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.source; }, hideOnMobile: true },
    { key: 'priority', label: t('laboratory.nqlisSamples.colPriority'), render: (s) => { const m = priorityMeta[s.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.priority; } },
    { key: 'section_name', label: t('laboratory.nqlisSamples.colSectionName'), render: (s) => s.section_name || '—', hideOnMobile: true },
    { key: 'status', label: t('laboratory.nqlisSamples.colStatus'), render: (s) => { const m = statusMeta[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
    { key: 'test_count', label: t('laboratory.nqlisSamples.colTestCount'), render: (s) => s.test_count, hideOnMobile: true },
    { key: 'actions', label: t('laboratory.nqlisSamples.colActions'), render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" title={t('laboratory.nqlisSamples.actionTrack')} onClick={() => openTrack(s)}><HistoryIcon fontSize="small" /></IconButton>
          {s.status === 'ACCEPTED' && (
            <IconButton size="small" title={t('laboratory.nqlisSamples.actionDistribute')} color="primary" onClick={() => openAssign(s)}><QrCodeIcon fontSize="small" /></IconButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisSamples.pageTitle')}
        subtitle={t('laboratory.nqlisSamples.pageSubtitle')}
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
        title={t('laboratory.nqlisSamples.tableTitle')}
        subtitle={t('laboratory.nqlisSamples.tableSubtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('laboratory.nqlisSamples.searchPlaceholder')}
        filters={[
          { key: 'sample_type', label: t('laboratory.nqlisSamples.filterType'), options: typeOptions, value: '', onChange: (v) => setFilter('sample_type', v) },
          { key: 'status', label: t('laboratory.nqlisSamples.filterStatus'), options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('laboratory.nqlisSamples.emptyTitle')}
        emptyDescription={t('laboratory.nqlisSamples.emptyDescription')}
      />

      <Dialog open={Boolean(trackSample)} onClose={() => setTrackSample(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('laboratory.nqlisSamples.trackTitle', { sampleNumber: trackSample?.sample_number })}
          <IconButton onClick={() => setTrackSample(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {trackSample && (
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="body2">{t('laboratory.nqlisSamples.trackStatusLabel')}: <StatusChip label={statusMeta[trackSample.status]?.label || trackSample.status} tone={statusMeta[trackSample.status]?.tone || 'neutral'} /></Typography>
              <Typography variant="body2">{t('laboratory.nqlisSamples.trackSectionLabel')}: {trackSample.section_name || '—'}</Typography>
            </Stack>
          )}
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {movements.length === 0 && (
              <Typography color="text.secondary">{trackLoading ? t('laboratory.nqlisSamples.trackLoading') : t('laboratory.nqlisSamples.trackNoMovements')}</Typography>
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
        title={t('laboratory.nqlisSamples.dialogTitle')}
        subtitle={assignSampleState ? assignSampleState.sample_number : ''}
        onClose={() => setAssignSampleState(null)}
        onSubmit={handleAssign}
        loading={assigning}
        submitDisabled={!sectionId}
      >
        <FormSelect label={t('laboratory.nqlisSamples.formSection')} value={sectionId} onChange={setSectionId} options={sections} placeholder={t('laboratory.nqlisSamples.formSectionPlaceholder')} />
      </FormDialog>
    </Box>
  );
};

export default NqlisSamples;
