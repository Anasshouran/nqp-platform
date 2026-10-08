import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common';
import { DataTable, ConfirmDialog } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  createIntegration,
  deleteIntegration,
  getIntegrations,
  updateIntegration,
} from '../../../api/endpoints/integration';
import type { Integration, IntegrationFormData } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError, notifySuccess } from '../../../utils/toast';
import IntegrationDialog from './IntegrationDialog';

const ENV_LABELS: Record<string, string> = {
  DEV: 'تطويري',
  SANDBOX: 'تجريبي',
  PRODUCTION: 'إنتاجي',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_CONFIGURED: 'غير مُعدّ',
  PENDING: 'معلق',
  CONFIGURED: 'مُعدّ',
  VERIFIED: 'موثَّق',
  FAILED: 'فشل',
  DISABLED: 'معطّل',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  VERIFIED: 'success',
  CONFIGURED: 'info',
  PENDING: 'warning',
  FAILED: 'error',
  NOT_CONFIGURED: 'default',
  DISABLED: 'default',
};

const PortalIntegrationsPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<Integration>({ fetchData: getIntegrations });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: IntegrationFormData) => {
    setSaving(true);
    try {
      if (editing) {
        await updateIntegration(editing.id, data);
        notifySuccess('تم تحديث التكامل');
      } else {
        await createIntegration(data);
        notifySuccess('تم إنشاء التكامل');
      }
      setDialogOpen(false);
      setEditing(null);
      refresh();
    } catch {
      notifyError('تعذّر حفظ التكامل');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Integration) => {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteIntegration(row.id);
      notifySuccess('تم حذف التكامل');
      refresh();
    } catch {
      notifyError('تعذّر حذف التكامل');
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<Integration>[] = [
    { key: 'organization_name', label: 'المنظمة', sortable: true },
    { key: 'endpoint_code', label: 'نقطة API', sortable: true },
    {
      key: 'environment', label: 'البيئة', sortable: true,
      render: (row) => <Chip size="small" variant="outlined" label={ENV_LABELS[row.environment] ?? row.environment} />,
    },
    {
      key: 'status', label: 'الحالة', sortable: true,
      render: (row) => (
        <Chip size="small" color={STATUS_COLORS[row.status] ?? 'default'} label={STATUS_LABELS[row.status] ?? row.status} />
      ),
    },
    {
      key: 'verified_at', label: 'آخر توثيق', sortable: true,
      render: (row) => (row.verified_at ? formatDateTime(row.verified_at) : '—'),
      hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="التكاملات"
        subtitle="ربط المنظمة(point) بخدمة خارجية محددة"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            إضافة تكامل
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث باسم المنظمة أو نقطة الـAPI"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="لا توجد تكاملات"
        emptyDescription="اربط منظمة بنقطة API لإنشاء أول تكامل"
        actions={(row) => (
          <>
            <Tooltip title="التفاصيل">
              <IconButton size="small" onClick={() => navigate(`/app/integration/portal/integrations/${row.id}`)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" disabled={deletingId === row.id} onClick={() => setDeleteTarget(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={deleteTarget ? `حذف تكامل «${deleteTarget.organization_name} / ${deleteTarget.endpoint_code}»؟` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        tone="error"
        loading={deletingId !== null}
        onConfirm={() => {
          if (deleteTarget) {
            const target = deleteTarget;
            setDeleteTarget(null);
            void handleDelete(target);
          }
        }}
        onClose={() => { if (!deletingId) setDeleteTarget(null); }}
      />

      <IntegrationDialog
        open={dialogOpen}
        integration={editing}
        saving={saving}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default PortalIntegrationsPage;