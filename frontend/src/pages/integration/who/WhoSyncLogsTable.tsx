import { useEffect } from 'react';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { getWhoSyncLogs } from '../../../api/endpoints/who';
import { formatDateTime } from '../../../utils/formatters';
import { WHO_SYNC_OPERATION_LABELS, WHO_SYNC_STATUS_LABELS, type WhoSyncLog } from '../../../types/who';

const STATUS_TONE: Record<string, 'success' | 'error' | 'warning' | 'neutral' | 'info' | 'primary'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  RETRY: 'warning',
  PENDING: 'info',
  PROCESSING: 'info',
  CANCELLED: 'neutral',
};

/**
 * جدول سجلات مزامنة WHO — العنصر الوحيد المرسوم لهذه السجلات.
 *
 * كان معرّفاً محلياً داخل ``WhoDashboardPage``، فلم تكن له صفحة مستقلة، ولم
 * يملك دورٌ يملك ``who_logs:view`` دون ``who_integration:view`` (مثل
 * ``IHR_NFP`` و``DG_MANAGER``) أي طريق للوصول إليه: مساره كان داخل لوحة
 * تُرجع 403 على جدول التكاملات. استخراجه هنا يجعل ``who_logs:view``-fermi
 * معلنة وصلاحية قائمة بذاتها.
 *
 * يُستخدم في اللوحة كُلوحة سفلية، وفي ``WhoSyncLogsPage`` كصفحة مستقلة.
 */
const WhoSyncLogsTable = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const table = useServerTable<WhoSyncLog>({ fetchData: getWhoSyncLogs });
  const {
    rows, count, loading, error, searchInput, setSearchInput,
    sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage,
    refresh, page, pageSizeOptions,
  } = table;

  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  return (
    <DataTable<WhoSyncLog>
      columns={[
        {
          key: 'operation',
          label: 'العملية',
          sortable: true,
          render: (l) => <StatusChip label={WHO_SYNC_OPERATION_LABELS[l.operation] ?? l.operation} tone="primary" variant="outlined" />,
        },
        {
          key: 'status',
          label: 'الحالة',
          sortable: true,
          render: (l) => <StatusChip label={WHO_SYNC_STATUS_LABELS[l.status] ?? l.status} tone={STATUS_TONE[l.status] ?? 'neutral'} />,
        },
        { key: 'http_status', label: 'HTTP', render: (l) => (l.http_status ? String(l.http_status) : '—'), hideOnMobile: true },
        {
          key: 'started_at',
          label: 'الوقت',
          sortable: true,
          render: (l) => formatDateTime(l.started_at),
        },
      ]}
      rows={rows}
      rowKey={(l) => l.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="سجلات المزامنة"
      subtitle={`${count} عملية`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث في السجلات..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد سجلات مزامنة"
      emptyDescription="عمليات الاتصال بمنظمة الصحة العالمية تظهر هنا"
    />
  );
};

export default WhoSyncLogsTable;
