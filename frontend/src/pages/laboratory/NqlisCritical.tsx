import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
  type StatusTone,
} from '../../components/uikit';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  acknowledgeCritical,
  getCriticalResults,
} from '../../api/endpoints/laboratory';
import type { CriticalResultNotification } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { useTranslation } from 'react-i18next';

const NqlisCritical = () => {
  const { t } = useTranslation();
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

  const outcomeMeta = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => ({
      POSITIVE: { label: t('laboratory.nqlisCritical.outcomePositive'), tone: 'error' },
      NEGATIVE: { label: t('laboratory.nqlisCritical.outcomeNegative'), tone: 'success' },
      INCONCLUSIVE: { label: t('laboratory.nqlisCritical.outcomeInconclusive'), tone: 'warning' },
    }),
    [t],
  );

  const handleAck = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      await acknowledgeCritical(active.id, note || '');
      notifySuccess(t('laboratory.nqlisCritical.ackSuccess'));
      setOpen(false);
      refresh();
    } catch {
      notifyError(t('laboratory.nqlisCritical.ackError'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<CriticalResultNotification>[] = [
    { key: 'sample_number', label: t('laboratory.nqlisCritical.colSampleNumber'), render: (c) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.sample_number}</Typography> },
    { key: 'test_name', label: t('laboratory.nqlisCritical.colTestName'), render: (c) => <Typography fontWeight={700}>{c.test_name}</Typography> },
    { key: 'outcome', label: t('laboratory.nqlisCritical.colOutcome'), render: (c) => { const m = outcomeMeta[c.outcome]; return m ? <StatusChip label={m.label} tone={m.tone} /> : null; } },
    { key: 'channel', label: t('laboratory.nqlisCritical.colChannel'), render: (c) => c.channel, hideOnMobile: true },
    { key: 'notified_at', label: t('laboratory.nqlisCritical.colNotifiedAt'), render: (c) => formatDateTime(c.notified_at) },
    { key: 'acknowledged_name', label: t('laboratory.nqlisCritical.colAcknowledgedBy'), render: (c) => c.acknowledged_name || '—', hideOnMobile: true },
    { key: 'actions', label: t('laboratory.nqlisCritical.colAction'), render: (c) => c.acknowledged_at ? (
        <StatusChip label={t('laboratory.nqlisCritical.acknowledged')} tone="success" />
      ) : (
        <Tooltip title={t('laboratory.nqlisCritical.tooltipAck')}>
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
        title={t('laboratory.nqlisCritical.pageTitle')}
        subtitle={t('laboratory.nqlisCritical.pageSubtitle')}
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
        title={t('laboratory.nqlisCritical.tableTitle')}
        subtitle={t('laboratory.nqlisCritical.tableSubtitle', { count })}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('laboratory.nqlisCritical.emptyTitle')}
        emptyDescription={t('laboratory.nqlisCritical.emptyDescription')}
      />

      <FormDialog
        open={open}
        title={t('laboratory.nqlisCritical.dialogTitle')}
        subtitle={active ? `${active.sample_number} · ${active.test_name}` : ''}
        icon={<WarningAmberIcon />}
        onClose={() => setOpen(false)}
        onSubmit={handleAck}
        loading={submitting}
      >
        <FormTextField label={t('laboratory.nqlisCritical.dialogNoteLabel')} multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormDialog>
    </Box>
  );
};

export default NqlisCritical;
