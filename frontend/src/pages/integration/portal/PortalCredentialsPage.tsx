import { useState } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { PageHeader } from '../../../components/common';
import { DataTable, ConfirmDialog } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import { deleteCredential, getCredentials } from '../../../api/endpoints/integration';
import type { Credential } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError, notifySuccess } from '../../../utils/toast';
import CredentialDialog from './CredentialDialog';

const KEY_TYPE_LABELS: Record<string, string> = {
  API_KEY: 'مفتاح API',
  OAUTH_SECRET: 'سر OAuth',
  CERTIFICATE: 'شهادة',
  TOKEN: 'توكن',
  OTHER: 'أخرى',
};

const PortalCredentialsPage = () => {
  const table = useServerTable<Credential>({ fetchData: getCredentials });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);

  const handleDelete = async (row: Credential) => {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteCredential(row.id);
      notifySuccess('تم حذف الاعتماد');
      refresh();
    } catch {
      notifyError('تعذّر حذف الاعتماد');
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<Credential>[] = [
    { key: 'integration_name', label: 'التكامل', sortable: true },
    { key: 'key_name', label: 'اسم المفتاح', sortable: true },
    {
      key: 'key_type', label: 'النوع', sortable: true,
      render: (row) => <Chip size="small" label={KEY_TYPE_LABELS[row.key_type] ?? row.key_type} />,
    },
    {
      key: 'created_at', label: 'تاريخ الإضافة', sortable: true,
      render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
      hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="بيانات الاعتماد"
        subtitle="أسرار التكاملات — تُخزَّن مشفّرة ولا تُعرض أبداً"
        action={
          <Button variant="contained" startIcon={<VpnKeyIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            إضافة اعتماد
          </Button>
        }
      />

      <Alert severity="warning" sx={{ mb: 2 }}>
        القيم المشفّرة لا تُعاد من الخادم. عند التعديل، أعد إدخال القيمة كاملة.
      </Alert>

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
        searchPlaceholder="ابحث باسم المفتاح"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد بيانات اعتماد"
        emptyDescription="أضف مفتاح تكامل لتخزينه مشفّراً"
        actions={(row) => (
          <>
            <Tooltip title="تعديل (تدوير)">
              <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
                <VpnKeyIcon fontSize="small" />
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

      <CredentialDialog
        open={dialogOpen}
        credential={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSaved={() => { setDialogOpen(false); setEditing(null); refresh(); }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={deleteTarget ? `حذف الاعتماد «${deleteTarget.key_name}»؟` : ''}
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
    </Box>
  );
};

export default PortalCredentialsPage;