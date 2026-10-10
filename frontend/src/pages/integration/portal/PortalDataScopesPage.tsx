import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../../../components/common';
import { DataTable, ConfirmDialog } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import { deleteDataScope, getDataScopes } from '../../../api/endpoints/integration';
import type { DataScope } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError, notifySuccess } from '../../../utils/toast';

const PortalDataScopesPage = () => {
  const table = useServerTable<DataScope>({ fetchData: getDataScopes });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataScope | null>(null);

  const handleDelete = async (row: DataScope) => {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteDataScope(row.id);
      notifySuccess('تم حذف النطاق');
      refresh();
    } catch {
      notifyError('تعذّر حذف النطاق');
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<DataScope>[] = [
    { key: 'organization_name', label: 'المنظمة', sortable: true },
    { key: 'endpoint_code', label: 'نقطة API', sortable: true },
    {
      key: 'direction', label: 'الاتجاه', sortable: true,
      render: (row) => (
        <Chip size="small" color={row.direction === 'READ' ? 'info' : 'warning'} label={row.direction === 'READ' ? 'قراءة' : 'كتابة'} />
      ),
    },
    { key: 'resource', label: 'المورد', sortable: true },
    { key: 'granted_by_name', label: 'الممنوح من', hideOnMobile: true },
    {
      key: 'granted_at', label: 'تاريخ المنح', sortable: true,
      render: (row) => (row.granted_at ? formatDateTime(row.granted_at) : '—'),
      hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="نطاقات البيانات"
        subtitle="ما يُسمح بتبادله مع كل منظمة (قراءة/كتابة)"
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
        searchPlaceholder="ابحث بالمنظمة أو المورد"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="لا توجد نطاقات"
        emptyDescription="امنح صلاحية تبادل البيانات لمنظمة"
        actions={(row) => (
          <Tooltip title="حذف">
            <IconButton size="small" color="error" disabled={deletingId === row.id} onClick={() => setDeleteTarget(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={deleteTarget ? `حذف نطاق «${deleteTarget.organization_name} / ${deleteTarget.resource}»؟` : ''}
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

export default PortalDataScopesPage;