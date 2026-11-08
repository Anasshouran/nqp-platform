import { notifyError } from '../../../utils/toast';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const table = useServerTable<VectorAlert>({ fetchData: getAlerts });

  const act = (p: Promise<unknown>) => p.then(() => table.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) notifyError(t('vectorcontrol.alerts.messages.actionFailed')); });

  return (
    <SectionCard id="alerts">
      <SectionHeading
        icon={<NotificationsActiveIcon color="warning" />}
        title={t('vectorcontrol.alerts.autoAlertsTitle')}
        subtitle={t('vectorcontrol.alerts.autoAlertsSubtitle')}
        action={
          <Button size="small" variant="outlined" onClick={() => act(markAllAlertsRead())}>
            {t('vectorcontrol.alerts.actions.markAllRead')}
          </Button>
        }
      />
      <DataTable<VectorAlert>
        columns={[
          { key: 'severity', label: t('vectorcontrol.alerts.columns.severity'), render: (r) => { const m = vectorAlertSeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
          { key: 'alert_type', label: t('vectorcontrol.alerts.columns.type'), render: (r) => { const m = vectorAlertType[r.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.alert_type_display || r.alert_type; } },
          { key: 'title_ar', label: t('vectorcontrol.alerts.columns.title'), render: (r) => <Typography sx={{ fontWeight: r.is_read ? 400 : 700 }}>{r.title_ar}</Typography> },
          { key: 'created_at', label: t('vectorcontrol.alerts.columns.date'), render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
          {
            key: 'actions', label: '', sortable: false,
            render: (r) => !r.is_read && (
              <Button size="small" variant="outlined" onClick={() => act(markAlertRead(r.id))}>{t('vectorcontrol.alerts.actions.markRead')}</Button>
            ),
          },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title={t('vectorcontrol.alerts.title')} subtitle={t('vectorcontrol.alerts.alertCount', { count: table.count })}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder={t('vectorcontrol.alerts.searchPlaceholder')}
        filters={[
          { key: 'alert_type', label: t('vectorcontrol.alerts.columns.type'), options: Object.entries(vectorAlertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('alert_type', v) },
          { key: 'severity', label: t('vectorcontrol.alerts.columns.severity'), options: Object.entries(vectorAlertSeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('severity', v) },
        ]}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onRefresh={table.refresh}
        emptyTitle={t('vectorcontrol.alerts.emptyTitle')} emptyDescription={t('vectorcontrol.alerts.emptyDescription')}
      />
    </SectionCard>
  );
};

export default AlertsSection;