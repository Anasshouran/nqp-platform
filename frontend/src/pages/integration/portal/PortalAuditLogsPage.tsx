import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { PageHeader } from '../../../components/common';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import { getAuditLogs } from '../../../api/endpoints/integration';
import type { AuditLog } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';

const RESULT_LABELS: Record<string, string> = {
  SUCCESS: 'portal.auditLogs.result.success',
  FAILURE: 'portal.auditLogs.result.failure',
  BLOCKED: 'portal.auditLogs.result.blocked',
};

const RESULT_COLORS: Record<string, 'success' | 'error' | 'warning'> = {
  SUCCESS: 'success',
  FAILURE: 'error',
  BLOCKED: 'warning',
};

const PortalAuditLogsPage = () => {
  const { t } = useTranslation();
  const table = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const columns: DataTableColumn<AuditLog>[] = [
    { key: 'created_at', label: t('portal.auditLogs.columns.time'), sortable: true, render: (row) => formatDateTime(row.created_at) },
    { key: 'user', label: t('portal.auditLogs.columns.user'), sortable: true },
    { key: 'action', label: t('portal.auditLogs.columns.action'), sortable: true },
    { key: 'resource_type', label: t('portal.auditLogs.columns.resource'), sortable: true },
    {
      key: 'result', label: t('portal.auditLogs.columns.result'), sortable: true,
      render: (row) => (
        <Chip
          size="small"
          color={RESULT_COLORS[row.result] ?? 'default'}
          label={t(RESULT_LABELS[row.result] ?? row.result)}
        />
      ),
    },
    { key: 'ip_address', label: 'IP', hideOnMobile: true },
  ];

  return (
    <Box>
      <PageHeader
        title={t('portal.auditLogs.title')}
        subtitle={t('portal.auditLogs.subtitle')}
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
        searchPlaceholder={t('portal.auditLogs.searchPlaceholder')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle={t('portal.auditLogs.emptyTitle')}
        emptyDescription={t('portal.auditLogs.emptyDescription')}
      />
    </Box>
  );
};

export default PortalAuditLogsPage;