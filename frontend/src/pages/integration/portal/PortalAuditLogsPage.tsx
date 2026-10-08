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
  SUCCESS: 'نجح',
  FAILURE: 'فشل',
  BLOCKED: 'محظور',
};

const RESULT_COLORS: Record<string, 'success' | 'error' | 'warning'> = {
  SUCCESS: 'success',
  FAILURE: 'error',
  BLOCKED: 'warning',
};

const PortalAuditLogsPage = () => {
  const table = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const columns: DataTableColumn<AuditLog>[] = [
    { key: 'created_at', label: 'الوقت', sortable: true, render: (row) => formatDateTime(row.created_at) },
    { key: 'user', label: 'المستخدم', sortable: true },
    { key: 'action', label: 'الإجراء', sortable: true },
    { key: 'resource_type', label: 'المورد', sortable: true },
    {
      key: 'result', label: 'النتيجة', sortable: true,
      render: (row) => (
        <Chip
          size="small"
          color={RESULT_COLORS[row.result] ?? 'default'}
          label={RESULT_LABELS[row.result] ?? row.result}
        />
      ),
    },
    { key: 'ip_address', label: 'IP', hideOnMobile: true },
  ];

  return (
    <Box>
      <PageHeader
        title="سجلات المراجعة"
        subtitle="تتبّع العمليات الحساسة على البوابة"
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
        searchPlaceholder="ابحث بالمستخدم أو الإجراء"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="لا توجد سجلات"
        emptyDescription="ستظهر هنا عمليات البوابة المسجّلة"
      />
    </Box>
  );
};

export default PortalAuditLogsPage;