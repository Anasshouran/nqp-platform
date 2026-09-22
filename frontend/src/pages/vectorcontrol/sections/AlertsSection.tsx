import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../../../api/endpoints/vectorControl';
import type { VectorAlert } from '../../../types/vectorControl';
import { vectorAlertSeverity, vectorAlertType } from '../../../utils/status';
import { SectionCard, SectionHeading } from './common';
import { formatDateTime } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const AlertsSection = () => {
  const t = useServerTable<VectorAlert>({ fetchData: getAlerts });

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  return (
    <SectionCard id="alerts">
      <SectionHeading
        icon={<NotificationsActiveIcon color="warning" />}
        title="التنبيهات التلقائية"
        subtitle="بؤر عالية الخطورة، نتائج موجبة، نقص مخزون، وتأخر عمليات"
        action={
          <Button size="small" variant="outlined" onClick={() => act(markAllAlertsRead())}>
            تحديد الكل كمقروء
          </Button>
        }
      />
      <DataTable<VectorAlert>
        columns={[
          { key: 'severity', label: 'الخطورة', render: (r) => { const m = vectorAlertSeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
          { key: 'alert_type', label: 'النوع', render: (r) => { const m = vectorAlertType[r.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.alert_type_display || r.alert_type; } },
          { key: 'title_ar', label: 'العنوان', render: (r) => <Typography sx={{ fontWeight: r.is_read ? 400 : 700 }}>{r.title_ar}</Typography> },
          { key: 'created_at', label: 'التاريخ', render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
          {
            key: 'actions', label: '', sortable: false,
            render: (r) => !r.is_read && (
              <Button size="small" variant="outlined" onClick={() => act(markAlertRead(r.id))}>تم</Button>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="التنبيهات" subtitle={`${t.count} تنبيه`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالعنوان..."
        filters={[
          { key: 'alert_type', label: 'النوع', options: Object.entries(vectorAlertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('alert_type', v) },
          { key: 'severity', label: 'الخطورة', options: Object.entries(vectorAlertSeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('severity', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد تنبيهات" emptyDescription="التنبيهات التلقائية تظهر هنا"
      />
    </SectionCard>
  );
};

export default AlertsSection;