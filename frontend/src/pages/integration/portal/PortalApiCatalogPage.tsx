import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common';
import { DataTable, ConfirmDialog } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  createApiEndpoint,
  deleteApiEndpoint,
  getApiEndpoints,
  updateApiEndpoint,
} from '../../../api/endpoints/integration';
import type { ApiEndpoint, ApiEndpointFormData } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError, notifySuccess } from '../../../utils/toast';
import ApiEndpointDialog from './ApiEndpointDialog';

const SCOPE_LABELS: Record<string, string> = {
  DISEASE: 'أمراض',
  SURVEILLANCE: 'ترصد',
  VACCINATION: 'تحصين',
  IHR: 'IHR',
  LABORATORY: 'مختبر',
  HEALTH_EVENT: 'حدث صحي',
  REFERENCE: 'بيانات مرجعية',
};

const PortalApiCatalogPage = () => {
  const table = useServerTable<ApiEndpoint>({ fetchData: getApiEndpoints });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiEndpoint | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEndpoint | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: ApiEndpointFormData) => {
    setSaving(true);
    try {
      if (editing) {
        await updateApiEndpoint(editing.id, data);
        notifySuccess('تم تحديث نقطة الـAPI');
      } else {
        await createApiEndpoint(data);
        notifySuccess('تم إنشاء نقطة الـAPI');
      }
      setDialogOpen(false);
      setEditing(null);
      refresh();
    } catch {
      notifyError('تعذّر حفظ نقطة الـAPI');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ApiEndpoint) => {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteApiEndpoint(row.id);
      notifySuccess('تم الحذف');
      refresh();
    } catch {
      notifyError('تعذّر الحذف');
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<ApiEndpoint>[] = [
    { key: 'code', label: 'الكود', sortable: true },
    { key: 'name_ar', label: 'الاسم', sortable: true },
    { key: 'organization_name', label: 'المنظمة', sortable: true },
    {
      key: 'protocol', label: 'البروتوكول',
      render: (row) => <Chip size="small" variant="outlined" label={row.protocol} />,
    },
    {
      key: 'scope', label: 'التصنيف', sortable: true,
      render: (row) => <Chip size="small" label={SCOPE_LABELS[row.scope] ?? row.scope} />,
    },
    {
      key: 'verified_at', label: 'آخر تحقق', sortable: true,
      render: (row) => (row.verified_at ? formatDateTime(row.verified_at) : '—'),
      hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="كتالوج الـAPI"
        subtitle="الخدمات الخارجية المتاحة للتبادل"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            إضافة نقطة API
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
        searchPlaceholder="ابحث بالكود أو الاسم"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="كتالوج الـAPI فارغ"
        emptyDescription="أضف أول خدمة خارجية"
        actions={(row) => (
          <>
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
        message={deleteTarget ? `حذف «${deleteTarget.name_ar || deleteTarget.name_en}»؟` : ''}
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

      <ApiEndpointDialog
        open={dialogOpen}
        endpoint={editing}
        saving={saving}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default PortalApiCatalogPage;