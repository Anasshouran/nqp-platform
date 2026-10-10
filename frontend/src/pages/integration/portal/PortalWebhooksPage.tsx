import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { PageHeader } from '../../../components/common';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import { getWebhookDeliveries, getWebhookSubscriptions } from '../../../api/endpoints/integration';
import type { WebhookDelivery, WebhookSubscription } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';

const PortalWebhooksPage = () => {
  const subs = useServerTable<WebhookSubscription>({ fetchData: getWebhookSubscriptions });
  const deliveries = useServerTable<WebhookDelivery>({ fetchData: getWebhookDeliveries });

  const subColumns: DataTableColumn<WebhookSubscription>[] = [
    { key: 'organization_name', label: 'المنظمة', sortable: true },
    { key: 'event_type', label: 'نوع الحدث', sortable: true },
    { key: 'endpoint_url', label: 'رابط النقطة', hideOnMobile: true },
    {
      key: 'is_active', label: 'الحالة',
      render: (row) => (
        <Chip size="small" color={row.is_active ? 'success' : 'default'} label={row.is_active ? 'نشط' : 'معطّل'} />
      ),
    },
    { key: 'failure_count', label: 'الأعطال', sortable: true },
    {
      key: 'last_delivery_at', label: 'آخر توصيل', sortable: true,
      render: (row) => (row.last_delivery_at ? formatDateTime(row.last_delivery_at) : '—'),
      hideOnMobile: true,
    },
  ];

  const deliveryColumns: DataTableColumn<WebhookDelivery>[] = [
    { key: 'event_type', label: 'الحدث', sortable: true },
    {
      key: 'status', label: 'الحالة', sortable: true,
      render: (row) => (
        <Chip
          size="small"
          color={row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'warning'}
          label={row.status}
        />
      ),
    },
    { key: 'http_status', label: 'HTTP' },
    { key: 'error_message', label: 'الخطأ', hideOnMobile: true },
    { key: 'duration_ms', label: 'المدة (ms)', hideOnMobile: true },
    {
      key: 'fired_at', label: 'وقت الإرسال', sortable: true,
      render: (row) => formatDateTime(row.fired_at), hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="الويب هوك"
        subtitle="اشتراكات الأحداث ومحاولات توصيلها"
      />

      <Box sx={{ mb: 4 }}>
        <DataTable
          columns={subColumns}
          rows={subs.rows}
          rowKey={(row) => row.id}
          count={subs.count}
          page={subs.page}
          rowsPerPage={subs.rowsPerPage}
          pageSizeOptions={subs.pageSizeOptions}
          loading={subs.loading}
          error={subs.error}
          searchInput={subs.searchInput}
          onSearchChange={subs.setSearchInput}
          searchPlaceholder="ابحث بالمنظمة أو نوع الحدث"
          sortBy={subs.sortBy}
          sortOrder={subs.sortOrder}
          onSortChange={subs.setSorting}
          onPageChange={subs.setPage}
          onRowsPerPageChange={subs.setRowsPerPage}
          onRefresh={subs.refresh}
          title="الاشتراكات"
          emptyTitle="لا توجد اشتراكات"
          emptyDescription="أنشئ اشتراك webhook لاستقبال الأحداث"
        />
      </Box>

      <DataTable
        columns={deliveryColumns}
        rows={deliveries.rows}
        rowKey={(row) => row.id}
        count={deliveries.count}
        page={deliveries.page}
        rowsPerPage={deliveries.rowsPerPage}
        pageSizeOptions={deliveries.pageSizeOptions}
        loading={deliveries.loading}
        error={deliveries.error}
        searchInput={deliveries.searchInput}
        onSearchChange={deliveries.setSearchInput}
        searchPlaceholder="ابحث بنوع الحدث"
        sortBy={deliveries.sortBy}
        sortOrder={deliveries.sortOrder}
        onSortChange={deliveries.setSorting}
        onPageChange={deliveries.setPage}
        onRowsPerPageChange={deliveries.setRowsPerPage}
        onRefresh={deliveries.refresh}
        title="محاولات التوصيل"
        emptyTitle="لا توجد محاولات توصيل"
        emptyDescription="ستظهر هنا كل عملية إرسال"
      />
    </Box>
  );
};

export default PortalWebhooksPage;