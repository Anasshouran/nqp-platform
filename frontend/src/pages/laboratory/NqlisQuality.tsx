import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import PendingIcon from '@mui/icons-material/PendingActions';
import CloseIcon from '@mui/icons-material/Cancel';
import RocketIcon from '@mui/icons-material/RocketLaunch';
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
  createCapaRecord,
  createNonConformity,
  getCapaRecords,
  getNonConformities,
  setCapaStatus,
  setNonConformityStatus,
} from '../../api/endpoints/laboratory';
import type { CapaRecord, NonConformity } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const ncStatusTone: Record<string, { tone: 'info' | 'warning' | 'error' | 'success' }> = {
  OPEN: { tone: 'error' },
  UNDER_INVESTIGATION: { tone: 'warning' },
  AWAITING_CAPA: { tone: 'warning' },
  CLOSED: { tone: 'success' },
};

const NcTypeCodes = ['SAMPLE', 'TEST', 'QC', 'EQUIPMENT', 'REAGENT', 'METHOD', 'PERSONNEL', 'DOCUMENTATION', 'RESULT', 'SLA'] as const;

const capaStatusTone: Record<string, { tone: 'info' | 'warning' | 'success' }> = {
  OPEN: { tone: 'info' },
  IN_PROGRESS: { tone: 'warning' },
  VERIFICATION: { tone: 'warning' },
  CLOSED: { tone: 'success' },
};

const SeverityCodes = ['MINOR', 'MAJOR', 'CRITICAL'] as const;

const NqlisQuality = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const ncs = useServerTable<NonConformity>({ fetchData: getNonConformities });
  const capas = useServerTable<CapaRecord>({ fetchData: getCapaRecords });

  useEffect(() => {
    ncs.setFilter('sector', sector ?? '');
    capas.setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const ncStatusLabels = useMemo(
    () => ({
      OPEN: t('laboratory.nqlisQuality.ncOpen'),
      UNDER_INVESTIGATION: t('laboratory.nqlisQuality.ncInvestigating'),
      AWAITING_CAPA: t('laboratory.nqlisQuality.ncAwaitingCapa'),
      CLOSED: t('laboratory.nqlisQuality.ncClosed'),
    }),
    [t],
  );

  const ncTypeLabels = useMemo<Record<string, string>>(
    () => ({
      SAMPLE: t('laboratory.nqlisQuality.typeSample'),
      TEST: t('laboratory.nqlisQuality.typeTest'),
      QC: t('laboratory.nqlisQuality.typeQc'),
      EQUIPMENT: t('laboratory.nqlisQuality.typeEquipment'),
      REAGENT: t('laboratory.nqlisQuality.typeReagent'),
      METHOD: t('laboratory.nqlisQuality.typeMethod'),
      PERSONNEL: t('laboratory.nqlisQuality.typePersonnel'),
      DOCUMENTATION: t('laboratory.nqlisQuality.typeDocumentation'),
      RESULT: t('laboratory.nqlisQuality.typeResult'),
      SLA: t('laboratory.nqlisQuality.typeSla'),
    }),
    [t],
  );

  const ncTypeOptions = useMemo(() => NcTypeCodes.map((v) => ({ value: v, label: ncTypeLabels[v] })), [ncTypeLabels]);

  const capaStatusLabels = useMemo(
    () => ({
      OPEN: t('laboratory.nqlisQuality.capaOpen'),
      IN_PROGRESS: t('laboratory.nqlisQuality.capaInProgress'),
      VERIFICATION: t('laboratory.nqlisQuality.capaVerification'),
      CLOSED: t('laboratory.nqlisQuality.capaClosed'),
    }),
    [t],
  );

  const severityOptions = useMemo(
    () => SeverityCodes.map((v) => ({
      value: v,
      label: v === 'MINOR' ? t('laboratory.shared.minor') : v === 'MAJOR' ? t('laboratory.shared.major') : t('laboratory.shared.critical'),
    })),
    [t],
  );

  const severityLabel = (value: string) =>
    value === 'MINOR'
      ? t('laboratory.shared.minor')
      : value === 'MAJOR'
        ? t('laboratory.shared.major')
        : value === 'CRITICAL'
          ? t('laboratory.shared.critical')
          : value;

  const [tab, setTab] = useState<'nc' | 'capa'>('nc');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ncForm, setNcForm] = useState({ title: '', description: '', nc_type: 'SAMPLE', severity: 'MAJOR', reference_number: '' });
  const [capaForm, setCapaForm] = useState<{ title: string; corrective_action: string; preventive_action: string; due_date: string; non_conformity?: string }>({ title: '', corrective_action: '', preventive_action: '', due_date: '', non_conformity: '' });

  const ncOptions = ncs.rows.map((n) => ({ value: n.id, label: `${n.nc_number} — ${n.title}` }));

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      if (tab === 'nc') {
        await createNonConformity(ncForm);
        notifySuccess(t('laboratory.nqlisQuality.ncCreated'));
        setNcForm({ title: '', description: '', nc_type: 'SAMPLE', severity: 'MAJOR', reference_number: '' });
        ncs.refresh();
      } else {
        if (!capaForm.non_conformity) {
          notifyError(t('laboratory.shared.selectNc'));
          return;
        }
        await createCapaRecord(capaForm);
        notifySuccess(t('laboratory.nqlisQuality.capaCreated'));
        setCapaForm({ title: '', corrective_action: '', preventive_action: '', due_date: '', non_conformity: '' });
        capas.refresh();
        ncs.refresh();
      }
      setOpen(false);
    } catch {
      notifyError(t('laboratory.shared.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNcStatus = async (nc: NonConformity, status: string) => {
    try {
      await setNonConformityStatus(nc.id, status);
      notifySuccess(t('laboratory.nqlisQuality.ncStatusUpdated'));
      ncs.refresh();
    } catch {
      notifyError(t('laboratory.nqlisQuality.updateError'));
    }
  };

  const handleCapaStatus = async (capa: CapaRecord, status: string) => {
    try {
      await setCapaStatus(capa.id, status);
      notifySuccess(t('laboratory.nqlisQuality.capaStatusUpdated'));
      capas.refresh();
      ncs.refresh();
    } catch {
      notifyError(t('laboratory.nqlisQuality.updateError'));
    }
  };

  const ncColumns: DataTableColumn<NonConformity>[] = [
    { key: 'nc_number', label: t('laboratory.shared.colNumber'), render: (n) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{n.nc_number}</Typography> },
    { key: 'title', label: t('laboratory.nqlisQuality.colTitle'), render: (n) => <Typography fontWeight={700}>{n.title}</Typography> },
    { key: 'nc_type', label: t('laboratory.shared.colType'), render: (n) => ncTypeLabels[n.nc_type] || n.nc_type, hideOnMobile: true },
    { key: 'severity', label: t('laboratory.shared.colSeverity'), render: (n) => <StatusChip label={severityLabel(n.severity)} tone={n.severity === 'CRITICAL' ? 'error' : n.severity === 'MAJOR' ? 'warning' : 'success'} /> },
    { key: 'status', label: t('laboratory.shared.colStatus'), render: (n) => { const m = ncStatusTone[n.status]; return m ? <StatusChip label={ncStatusLabels[n.status as keyof typeof ncStatusLabels] ?? n.status} tone={m.tone} /> : <StatusChip label={n.status} tone="neutral" />; } },
    { key: 'capa_count', label: t('laboratory.nqlisQuality.colActions'), render: (n) => n.capa_count, hideOnMobile: true },
    { key: 'reported_by_name', label: t('laboratory.nqlisQuality.colReporter'), render: (n) => n.reported_by_name || '—', hideOnMobile: true },
    { key: 'actions', label: t('laboratory.shared.colAction'), render: (n) => (
        <Stack direction="row" spacing={0.5}>
          {n.status !== 'CLOSED' && (
            <Tooltip title={t('laboratory.nqlisQuality.ncInvestigating')}>
              <IconButton size="small" color="warning" onClick={() => handleNcStatus(n, 'UNDER_INVESTIGATION')}><PendingIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {(n.status === 'UNDER_INVESTIGATION' || n.status === 'AWAITING_CAPA') && (
            <Tooltip title={t('laboratory.nqlisQuality.close')}>
              <IconButton size="small" color="success" onClick={() => handleNcStatus(n, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const capaColumns: DataTableColumn<CapaRecord>[] = [
    { key: 'nc_number', label: t('laboratory.nqlisQuality.colNc'), render: (c) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.nc_number}</Typography> },
    { key: 'title', label: t('laboratory.nqlisQuality.colActionTitle'), render: (c) => <Typography fontWeight={700}>{c.title}</Typography> },
    { key: 'corrective_action', label: t('laboratory.nqlisQuality.colCorrective'), hideOnMobile: true },
    { key: 'responsible_name', label: t('laboratory.nqlisQuality.colResponsible'), render: (c) => c.responsible_name || '—', hideOnMobile: true },
    { key: 'due_date', label: t('laboratory.nqlisQuality.colDue'), render: (c) => c.due_date ? c.due_date.slice(0, 10) : '—' },
    { key: 'status', label: t('laboratory.shared.colStatus'), render: (c) => { const m = capaStatusTone[c.status]; return m ? <StatusChip label={capaStatusLabels[c.status as keyof typeof capaStatusLabels] ?? c.status} tone={m.tone} /> : <StatusChip label={c.status} tone="neutral" />; } },
    { key: 'actions', label: t('laboratory.shared.colAction'), render: (c) => (
        <Stack direction="row" spacing={0.5}>
          {c.status === 'OPEN' && (
            <Tooltip title={t('laboratory.nqlisQuality.startExecution')}>
              <IconButton size="small" color="primary" onClick={() => handleCapaStatus(c, 'IN_PROGRESS')}><RocketIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {c.status === 'IN_PROGRESS' && (
            <Tooltip title={t('laboratory.nqlisQuality.sendToVerify')}>
              <IconButton size="small" color="warning" onClick={() => handleCapaStatus(c, 'VERIFICATION')}><PendingIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          {c.status === 'VERIFICATION' && (
            <Tooltip title={t('laboratory.nqlisQuality.close')}>
              <IconButton size="small" color="success" onClick={() => handleCapaStatus(c, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('laboratory.nqlisQuality.title')}
        subtitle={t('laboratory.nqlisQuality.subtitle')}
        eyebrow="NQLIS"
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box
          onClick={() => setTab('nc')}
          sx={{ px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700, bgcolor: tab === 'nc' ? 'primary.main' : 'action.hover', color: tab === 'nc' ? 'primary.contrastText' : 'inherit' }}
        >
          {t('laboratory.nqlisQuality.tabNc', { count: ncs.count })}
        </Box>
        <Box
          onClick={() => setTab('capa')}
          sx={{ px: 2, py: 1, borderRadius: 2, cursor: 'pointer', fontWeight: 700, bgcolor: tab === 'capa' ? 'primary.main' : 'action.hover', color: tab === 'capa' ? 'primary.contrastText' : 'inherit' }}
        >
          {t('laboratory.nqlisQuality.tabCapa', { count: capas.count })}
        </Box>
      </Box>

      {tab === 'nc' ? (
        <DataTable<NonConformity>
          columns={ncColumns}
          rows={ncs.rows}
          rowKey={(n) => n.id}
          count={ncs.count}
          page={ncs.page}
          rowsPerPage={ncs.rowsPerPage}
          pageSizeOptions={ncs.pageSizeOptions}
          loading={ncs.loading}
          error={ncs.error}
          title={t('laboratory.nqlisQuality.colNc')}
          subtitle={t('laboratory.shared.recordsCount', { count: ncs.count })}
          onPageChange={ncs.setPage}
          onRowsPerPageChange={ncs.setRowsPerPage}
          onRefresh={ncs.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('laboratory.shared.newRecord')}</AppButton>
          }
        />
      ) : (
        <DataTable<CapaRecord>
          columns={capaColumns}
          rows={capas.rows}
          rowKey={(c) => c.id}
          count={capas.count}
          page={capas.page}
          rowsPerPage={capas.rowsPerPage}
          pageSizeOptions={capas.pageSizeOptions}
          loading={capas.loading}
          error={capas.error}
          title={t('laboratory.nqlisQuality.tableCapa')}
          subtitle={t('laboratory.nqlisQuality.actionsSub', { count: capas.count })}
          onPageChange={capas.setPage}
          onRowsPerPageChange={capas.setRowsPerPage}
          onRefresh={capas.refresh}
          toolbar={
            <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('laboratory.nqlisQuality.newAction')}</AppButton>
          }
        />
      )}

      <FormDialog
        open={open}
        title={tab === 'nc' ? t('laboratory.nqlisQuality.dialogNc') : t('laboratory.nqlisQuality.dialogCapa')}
        icon={<FactCheckIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        loading={submitting}
      >
        {tab === 'nc' ? (
          <>
            <FormTextField label={t('laboratory.nqlisQuality.colTitle')} value={ncForm.title} onChange={(e) => setNcForm({ ...ncForm, title: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblDescription')} multiline minRows={2} value={ncForm.description} onChange={(e) => setNcForm({ ...ncForm, description: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label={t('laboratory.shared.colType')} value={ncForm.nc_type} options={ncTypeOptions} onChange={(v) => setNcForm({ ...ncForm, nc_type: v })} />
            <Box sx={{ height: 16 }} />
            <FormSelect label={t('laboratory.shared.colSeverity')} value={ncForm.severity} options={severityOptions} onChange={(v) => setNcForm({ ...ncForm, severity: v })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblRef')} value={ncForm.reference_number} onChange={(e) => setNcForm({ ...ncForm, reference_number: e.target.value })} />
          </>
        ) : (
          <>
            <FormSelect label={t('laboratory.nqlisQuality.colNc')} value={capaForm.non_conformity || ''} options={ncOptions} onChange={(v) => setCapaForm({ ...capaForm, non_conformity: v })} placeholder={t('laboratory.shared.selectNc')} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblActionTitle')} value={capaForm.title} onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblCorrective')} multiline minRows={2} value={capaForm.corrective_action} onChange={(e) => setCapaForm({ ...capaForm, corrective_action: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblPreventive')} multiline minRows={2} value={capaForm.preventive_action} onChange={(e) => setCapaForm({ ...capaForm, preventive_action: e.target.value })} />
            <Box sx={{ height: 16 }} />
            <FormTextField label={t('laboratory.nqlisQuality.lblDue')} type="date" value={capaForm.due_date} onChange={(e) => setCapaForm({ ...capaForm, due_date: e.target.value })} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

export default NqlisQuality;