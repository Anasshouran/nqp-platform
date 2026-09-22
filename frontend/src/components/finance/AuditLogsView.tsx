import { useCallback, useState } from 'react';
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
import { AUDIT_ACTION_LABELS, type FinanceAuditLog } from '../../types/finance';

const RESOURCE_OPTIONS = [
  { value: 'Invoice', label: 'فاتورة' },
  { value: 'Reconciliation', label: 'تسوية' },
];

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }));

const shortId = (id?: string | null) => (id ? id.slice(0, 8).toUpperCase() : '—');

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('ar-SD');

const auditLabel = (a?: string) => AUDIT_ACTION_LABELS[a ?? ''] ?? a ?? '—';

function AuditDetailDialog({ log, onClose }: { log: FinanceAuditLog; onClose: () => void }): React.JSX.Element {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>تفاصيل التدقيق</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="إغلاق" sx={{ borderRadius: 2 }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Row label="التوقيت" value={fmtDateTime(log.occurred_at)} />
            <Row label="المستخدم" value={log.actor_name || '—'} />
            <Row label="الدور" value={auditLabel(log.actor_role) || log.actor_role || '—'} />
            <Row label="الإجراء" value={auditLabel(log.action)} />
            <Row label="نوع المورد" value={log.resource_type} />
            <Row label="رقم المورد" value={shortId(log.resource_id)} />
            <Row label="مرجع الفاتورة" value={log.invoice_ref || '—'} />
            {log.field_name && <Row label="الحقل" value={log.field_name} />}
          </Box>
          {(log.old_value || log.new_value) && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: -0.5 }}>التغيير</Typography>
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
          {log.ip_address && <Row label="عنوان IP" value={log.ip_address} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
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
      key: 'action', label: 'الإجراء', options: ACTION_OPTIONS,
      value: actionValue,
      onChange: (v: string) => { setActionValue(v); setFilter('action', v); },
    },
    {
      key: 'resource_type', label: 'نوع المورد', options: RESOURCE_OPTIONS,
      value: resourceValue,
      onChange: (v: string) => { setResourceValue(v); setFilter('resource_type', v); },
    },
  ], [setFilter, actionValue, resourceValue]);

  return (
    <>
      <SectionTitle
        title="سجل التدقيق المالي"
        subtitle="كل عملية موثقة: المستخدم، الدور، الإجراء، قبل/بعد، IP"
      />

      <DataTable<FinanceAuditLog>
        columns={[
          { key: 'occurred_at', label: 'التوقيت', sortable: true, render: (l) => <Typography sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{fmtDateTime(l.occurred_at)}</Typography> },
          { key: 'actor_name', label: 'المستخدم', render: (l) => <Typography sx={{ fontWeight: 600 }}>{l.actor_name || '—'}</Typography> },
          { key: 'actor_role', label: 'الدور', render: (l) => auditLabel(l.actor_role) || l.actor_role || '—' },
          { key: 'action', label: 'الإجراء', render: (l) => <Chip size="small" variant="outlined" label={auditLabel(l.action)} /> },
          { key: 'resource_type', label: 'المورد' },
          { key: 'invoice_ref', label: 'الفاتورة', render: (l) => <Typography sx={{ fontWeight: 700 }}>{l.invoice_ref || shortId(l.resource_id)}</Typography> },
          { key: 'change', label: 'التغيير', hideOnMobile: true, render: (l) => (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 90 }}>{l.old_value || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">→</Typography>
              <Typography variant="caption" color="primary.main" noWrap sx={{ maxWidth: 90, fontWeight: 700 }}>{l.new_value || '—'}</Typography>
            </Stack>
          )},
          { key: 'ip_address', label: 'IP', hideOnMobile: true, render: (l) => <Typography sx={{ fontFamily: 'monospace', fontSize: 11 }}>{l.ip_address || '—'}</Typography> },
        ]}
        rows={rows}
        rowKey={(l) => l.id}
        count={count}
        page={page}
        rowsPerPage={table.rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="سجل التدقيق"
        subtitle={`${count} سجل`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالمرجع أو المعرف..."
        filters={buildFilterDefs()}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        actionsLabel="عرض"
        actions={(l) => (
          <Tooltip title="عرض التفاصيل">
            <IconButton size="small" aria-label="عرض" onClick={() => setDetail(l)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle="لا توجد سجلات"
        emptyDescription="لم يتم توثيق عمليات مالية بعد"
      />

      {detail && (
        <AuditDetailDialog log={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}
