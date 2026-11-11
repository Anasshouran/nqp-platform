import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      notifySuccess(t('portal.dataScopes.deleteSuccess'));
      refresh();
    } catch {
      notifyError(t('portal.dataScopes.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<DataScope>[] = [
    { key: 'organization_name', label: t('portal.dataScopes.orgColumn'), sortable: true },
    { key: 'endpoint_code', label: t('portal.dataScopes.apiPointColumn'), sortable: true },
    {
      key: 'direction', label: t('portal.dataScopes.directionColumn'), sortable: true,
      render: (row) => (
        <Chip size="small" color={row.direction === 'READ' ? 'info' : 'warning'} label={row.direction === 'READ' ? t('portal.dataScopes.directionRead') : t('portal.dataScopes.directionWrite')} />
      ),
    },
    { key: 'resource', label: t('portal.dataScopes.resourceColumn'), sortable: true },
    { key: 'granted_by_name', label: t('portal.dataScopes.grantedByColumn'), hideOnMobile: true },
    {
      key: 'granted_at', label: t('portal.dataScopes.grantedAtColumn'), sortable: true,
      render: (row) => (row.granted_at ? formatDateTime(row.granted_at) : '—'),
      hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('portal.dataScopes.pageTitle')}
        subtitle={t('portal.dataScopes.pageSubtitle')}
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
        searchPlaceholder={t('portal.dataScopes.searchPlaceholder')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle={t('portal.dataScopes.emptyTitle')}
        emptyDescription={t('portal.dataScopes.emptyDescription')}
        actions={(row) => (
          <Tooltip title={t('portal.dataScopes.deleteAction')}>
            <IconButton size="small" color="error" disabled={deletingId === row.id} onClick={() => setDeleteTarget(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('portal.dataScopes.confirmDeleteTitle')}
        message={deleteTarget ? t('portal.dataScopes.confirmDeleteMessage', { organization: deleteTarget.organization_name, resource: deleteTarget.resource }) : ''}
        confirmLabel={t('portal.dataScopes.deleteAction')}
        cancelLabel={t('portal.dataScopes.cancelDeleteLabel')}
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