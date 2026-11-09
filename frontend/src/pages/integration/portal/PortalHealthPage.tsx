import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { PageHeader } from '../../../components/common';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import { getIntegrationHealthRecords } from '../../../api/endpoints/integration';
import type { IntegrationHealth } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';

const PortalHealthPage = () => {
  const { t } = useTranslation();
  const table = useServerTable<IntegrationHealth>({
    fetchData: getIntegrationHealthRecords,
  });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const columns: DataTableColumn<IntegrationHealth>[] = [
    { key: 'integration_name', label: t('portal.health.columns.integration'), sortable: true },
    { key: 'check_type', label: t('portal.health.columns.checkType'), sortable: true },
    {
      key: 'passed', label: t('portal.health.columns.result'), sortable: true,
      render: (row) => (
        <Chip size="small" color={row.passed ? 'success' : 'error'} label={row.passed ? t('portal.health.columns.passed') : t('portal.health.columns.failed')} />
      ),
    },
    { key: 'checked_by', label: t('portal.health.columns.checkedBy') },
    { key: 'detail', label: t('portal.health.columns.detail'), hideOnMobile: true },
    {
      key: 'checked_at', label: t('portal.health.columns.checkedAt'), sortable: true,
      render: (row) => formatDateTime(row.checked_at), hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('portal.health.title')}
        subtitle={t('portal.health.subtitle')}
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
        searchPlaceholder={t('portal.health.searchPlaceholder')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle={t('portal.health.emptyTitle')}
        emptyDescription={t('portal.health.emptyDescription')}
      />
    </Box>
  );
};

export default PortalHealthPage;