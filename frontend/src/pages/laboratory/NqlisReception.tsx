import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
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
import {
  acceptSample,
  conditionalAcceptSample,
  createLabSample,
  getReceptionQueue,
  rejectSample,
} from '../../api/endpoints/laboratory';
import type { LabSample } from '../../types/laboratory';
import { receptionStatus, samplePriority, sampleSource, sampleType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const NqlisReception = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const table = useServerTable<LabSample>({ fetchData: getReceptionQueue });
  const { rows, count, loading, error, refresh, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, setFilter } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const typeMeta = useMemo<Record<string, { label: string }>>(
    () => Object.fromEntries(Object.entries(sampleType).map(([k]) => [k, { label: t(`laboratory.nqlisReception.type.${k}`) }])),
    [t],
  );
  const sourceMeta = useMemo<Record<string, { label: string }>>(
    () => Object.fromEntries(Object.entries(sampleSource).map(([k]) => [k, { label: t(`laboratory.nqlisReception.source.${k}`) }])),
    [t],
  );
  const priorityMeta = useMemo<Record<string, { label: string }>>(
    () => Object.fromEntries(Object.entries(samplePriority).map(([k]) => [k, { label: t(`laboratory.nqlisReception.priority.${k}`) }])),
    [t],
  );

  const typeOptions = Object.entries(sampleType).map(([v]) => ({ value: v, label: typeMeta[v].label }));
  const sourceOptions = Object.entries(sampleSource).map(([v]) => ({ value: v, label: sourceMeta[v].label }));
  const priorityOptions = Object.entries(samplePriority).map(([v]) => ({ value: v, label: priorityMeta[v].label }));

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
      notifySuccess(t('laboratory.nqlisReception.createSuccess'));
      setCreateOpen(false);
      setForm({ sample_type: 'SWAB', source: 'CLINIC', priority: 'ROUTINE' });
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisReception.createError'));
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
      else await rejectSample(active.id, { ...payload, rejection_reason: decisionNote || t('laboratory.nqlisReception.defaultRejectionReason') });
      notifySuccess(t('laboratory.nqlisReception.decisionSuccess'));
      setDecisionOpen(false);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisReception.decisionError'));
    } finally {
      setDeciding(false);
    }
  };

  const columns: DataTableColumn<LabSample>[] = [
    { key: 'sample_number', label: t('laboratory.nqlisReception.colSampleNumber'), render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.sample_number}</Typography> },
    { key: 'sample_barcode', label: t('laboratory.nqlisReception.colBarcode'), render: (s) => <Typography sx={{ fontFamily: 'monospace' }}>{s.sample_barcode}</Typography>, hideOnMobile: true },
    { key: 'sample_type', label: t('laboratory.nqlisReception.colType'), render: (s) => { const m = typeMeta[s.sample_type]; return m ? <StatusChip label={m.label} /> : s.sample_type; } },
    { key: 'source', label: t('laboratory.nqlisReception.colSource'), render: (s) => { const m = sourceMeta[s.source]; return m ? <StatusChip label={m.label} /> : s.source; }, hideOnMobile: true },
    { key: 'priority', label: t('laboratory.nqlisReception.colPriority'), render: (s) => { const m = priorityMeta[s.priority]; return m ? <StatusChip label={m.label} /> : s.priority; } },
    { key: 'reception_status', label: t('laboratory.nqlisReception.colReceptionStatus'), render: (s) => { const m = receptionStatus[s.reception_status]; return m ? <StatusChip label={t(`laboratory.nqlisReception.receptionStatus.${s.reception_status}`)} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
    { key: 'received_at', label: t('laboratory.nqlisReception.colReceivedAt'), render: (s) => formatDateTime(s.collected_at || s.created_at), hideOnMobile: true },
    { key: 'actions', label: t('laboratory.nqlisReception.colActions'), render: (s) => (
        <Stack direction="row" spacing={0.5}>
          {s.reception_status === 'RECEIVED' && (
            <>
              <Tooltip title={t('laboratory.nqlisReception.tooltipAccept')}>
                <IconButton size="small" color="success" onClick={() => openDecision(s, 'accept')}><VerifiedIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title={t('laboratory.nqlisReception.tooltipConditional')}>
                <IconButton size="small" color="warning" onClick={() => openDecision(s, 'conditional')}><WarningAmberIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title={t('laboratory.nqlisReception.tooltipReject')}>
                <IconButton size="small" color="error" onClick={() => openDecision(s, 'reject')}><CancelIcon fontSize="small" /></IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisReception.pageTitle')}
        subtitle={t('laboratory.nqlisReception.pageSubtitle')}
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
        title={t('laboratory.nqlisReception.tableTitle')}
        subtitle={t('laboratory.nqlisReception.tableSubtitle', { count })}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t('laboratory.nqlisReception.btnNewSample')}
          </AppButton>
        }
        emptyTitle={t('laboratory.nqlisReception.emptyTitle')}
        emptyDescription={t('laboratory.nqlisReception.emptyDescription')}
      />

      <FormDialog
        open={createOpen}
        title={t('laboratory.nqlisReception.dialogCreateTitle')}
        subtitle={t('laboratory.nqlisReception.dialogCreateSubtitle')}
        icon={<AddIcon />}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={creating}
      >
        <FormSelect label={t('laboratory.nqlisReception.formSampleType')} value={form.sample_type} onChange={(v) => setForm({ ...form, sample_type: v })} options={typeOptions} />
        <Box sx={{ height: 16 }} />
        <FormSelect label={t('laboratory.nqlisReception.formSource')} value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={sourceOptions} />
        <Box sx={{ height: 16 }} />
        <FormSelect label={t('laboratory.nqlisReception.formPriority')} value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorityOptions} />
      </FormDialog>

      <FormDialog
        open={decisionOpen}
        title={
          decisionKind === 'accept' ? t('laboratory.nqlisReception.decisionTitleAccept') : decisionKind === 'conditional' ? t('laboratory.nqlisReception.decisionTitleConditional') : t('laboratory.nqlisReception.decisionTitleReject')
        }
        subtitle={active ? t('laboratory.nqlisReception.decisionSubtitle', { sampleNumber: active.sample_number || active.sample_barcode }) : ''}
        icon={decisionKind === 'accept' ? <VerifiedIcon /> : decisionKind === 'reject' ? <CancelIcon /> : <WarningAmberIcon />}
        onClose={() => setDecisionOpen(false)}
        onSubmit={handleDecision}
        loading={deciding}
        submitLabel={decisionKind === 'reject' ? t('laboratory.nqlisReception.submitReject') : t('laboratory.nqlisReception.submitConfirm')}
      >
        <FormTextField label={decisionKind === 'reject' ? t('laboratory.nqlisReception.labelRejectionReason') : t('laboratory.nqlisReception.labelReceptionNote')} multiline minRows={3} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisReception;
