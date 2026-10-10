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
  const table = useServerTable<IntegrationHealth>({
    fetchData: getIntegrationHealthRecords,
  });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const columns: DataTableColumn<IntegrationHealth>[] = [
    { key: 'integration_name', label: 'التكامل', sortable: true },
    { key: 'check_type', label: 'نوع الفحص', sortable: true },
    {
      key: 'passed', label: 'النتيجة', sortable: true,
      render: (row) => (
        <Chip size="small" color={row.passed ? 'success' : 'error'} label={row.passed ? 'ناجح' : 'فاشل'} />
      ),
    },
    { key: 'checked_by', label: 'الفاحص' },
    { key: 'detail', label: 'التفاصيل', hideOnMobile: true },
    {
      key: 'checked_at', label: 'وقت الفحص', sortable: true,
      render: (row) => formatDateTime(row.checked_at), hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="الصحة والمراقبة"
        subtitle="نتائج فحوصات الاتصال الموثّقة لكل تكامل"
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
        searchPlaceholder="ابحث باسم التكامل أو نوع الفحص"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="لا توجد سجلات صحة"
        emptyDescription="تُسجَّل نتائج الفحص هنا عند تشغيل فحص تكامل"
      />
    </Box>
  );
};

export default PortalHealthPage;