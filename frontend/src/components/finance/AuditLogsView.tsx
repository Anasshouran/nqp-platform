import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useServerTable } from '../../hooks/useServerTable';
import { getFinanceAuditLogs } from '../../api/endpoints/finance';
import { DataTable } from '../../components/uikit';
import SectionTitle from '../../components/common/SectionTitle';
import { labelOf, optionsOf, AUDIT_ACTION_LABELS, type FinanceAuditLog, type Locale } from '../../types/finance';

const shortId = (id?: string | null) => (id ? id.slice(0, 8).toUpperCase() : '—');

const fmtDateTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'ar-SD');

const auditLabel = (a: string | undefined, locale: Locale) => labelOf(AUDIT_ACTION_LABELS, a, locale);

function AuditDetailDialog({ log, onClose, locale }: { log: FinanceAuditLog; onClose: () => void; locale: Locale }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('finance.audit.detail.title')}</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label={t('finance.audit.detail.close')} sx={{ borderRadius: 2 }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Row label={t('finance.audit.detail.fields.time')} value={fmtDateTime(log.occurred_at, locale)} />
            <Row label={t('finance.audit.detail.fields.user')} value={log.actor_name || '—'} />
            <Row label={t('finance.audit.detail.fields.role')} value={auditLabel(log.actor_role, locale) || log.actor_role || '—'} />
            <Row label={t('finance.audit.detail.fields.action')} value={auditLabel(log.action, locale)} />
            <Row label={t('finance.audit.detail.fields.resourceType')} value={log.resource_type} />
            <Row label={t('finance.audit.detail.fields.resourceId')} value={shortId(log.resource_id)} />
            <Row label={t('finance.audit.detail.fields.invoiceRef')} value={log.invoice_ref || '—'} />
            {log.field_name && <Row label={t('finance.audit.detail.fields.field')} value={log.field_name} />}
          </Box>
          {(log.old_value || log.new_value) && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: -0.5 }}>{t('finance.audit.detail.fields.change')}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {log.old_value && (
                  <Chip
                    size="small"
                    label={log.old_value}
                    sx={{ maxWidth: 220, height: 'auto', '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  />
                )}
                {log.old_value && log.new_value && (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>→</Typography>
                )}
                {log.new_value && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={log.new_value}
                    sx={{ maxWidth: 220, height: 'auto', '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  />
                )}
              </Stack>
            </>
          )}
          {log.ip_address && <Row label={t('finance.audit.detail.fields.ip')} value={log.ip_address} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{t('finance.audit.detail.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={1}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

export default function AuditLogsView(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n?.language === 'en' ? 'en' : 'ar';
  const actionOptions = useMemo(() => optionsOf(AUDIT_ACTION_LABELS, locale), [locale]);
  const resourceOptions = useMemo(
    () => [
      { value: 'Invoice', label: t('finance.audit.resourceOptions.invoice') },
      { value: 'Reconciliation', label: t('finance.audit.resourceOptions.reconciliation') },
    ],
    [t],
  );

  const table = useServerTable<FinanceAuditLog>({
    fetchData: getFinanceAuditLogs,
    initialPageSize: 25,
  });
  const {
    rows, count, loading, error, page, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, refresh, setFilter,
  } = table;

  const [detail, setDetail] = useState<FinanceAuditLog | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [resourceValue, setResourceValue] = useState('');

  const buildFilterDefs = useCallback(() => [
    {
      key: 'action', label: t('finance.audit.filters.action'), options: actionOptions,
      value: actionValue,
      onChange: (v: string) => { setActionValue(v); setFilter('action', v); },
    },
    {
      key: 'resource_type', label: t('finance.audit.filters.resourceType'), options: resourceOptions,
      value: resourceValue,
      onChange: (v: string) => { setResourceValue(v); setFilter('resource_type', v); },
    },
  ], [setFilter, actionValue, resourceValue, actionOptions, resourceOptions, t]);

  const columns = useMemo(() => [
    { key: 'occurred_at', label: t('finance.audit.columns.time'), sortable: true, render: (l: FinanceAuditLog) => <Typography sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{fmtDateTime(l.occurred_at, locale)}</Typography> },
    { key: 'actor_name', label: t('finance.audit.columns.user'), render: (l: FinanceAuditLog) => <Typography sx={{ fontWeight: 600 }}>{l.actor_name || '—'}</Typography> },
    { key: 'actor_role', label: t('finance.audit.columns.role'), render: (l: FinanceAuditLog) => auditLabel(l.actor_role, locale) || l.actor_role || '—' },
    { key: 'action', label: t('finance.audit.columns.action'), render: (l: FinanceAuditLog) => <Chip size="small" variant="outlined" label={auditLabel(l.action, locale)} /> },
    { key: 'resource_type', label: t('finance.audit.columns.resource') },
    { key: 'invoice_ref', label: t('finance.audit.columns.invoice'), render: (l: FinanceAuditLog) => <Typography sx={{ fontWeight: 700 }}>{l.invoice_ref || shortId(l.resource_id)}</Typography> },
    { key: 'change', label: t('finance.audit.columns.change'), hideOnMobile: true, render: (l: FinanceAuditLog) => (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 90 }}>{l.old_value || '—'}</Typography>
        <Typography variant="caption" color="text.secondary">→</Typography>
        <Typography variant="caption" color="primary.main" noWrap sx={{ maxWidth: 90, fontWeight: 700 }}>{l.new_value || '—'}</Typography>
      </Stack>
    ) },
    { key: 'ip_address', label: t('finance.audit.columns.ip'), hideOnMobile: true, render: (l: FinanceAuditLog) => <Typography sx={{ fontFamily: 'monospace', fontSize: 11 }}>{l.ip_address || '—'}</Typography> },
  ], [t, locale]);

  return (
    <>
      <SectionTitle
        title={t('finance.audit.section.title')}
        subtitle={t('finance.audit.section.subtitle')}
      />

      <DataTable<FinanceAuditLog>
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        count={count}
        page={page}
        rowsPerPage={table.rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('finance.audit.table.title')}
        subtitle={t('finance.audit.table.count', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('finance.audit.table.search')}
        filters={buildFilterDefs()}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        actionsLabel={t('finance.audit.actions.view')}
        actions={(l) => (
          <Tooltip title={t('finance.audit.actions.viewDetails')}>
            <IconButton size="small" aria-label={t('finance.audit.actions.view')} onClick={() => setDetail(l)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle={t('finance.audit.table.empty.title')}
        emptyDescription={t('finance.audit.table.empty.description')}
      />

      {detail && (
        <AuditDetailDialog log={detail} onClose={() => setDetail(null)} locale={locale} />
      )}
    </>
  );
}
