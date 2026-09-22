import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getAlerts, getKillSwitchStatus } from '../../api/endpoints/emergency';
import type { EmergencyAlert } from '../../types/emergency';
import { alertStatus, alertType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const alertStatusOptions = Object.entries(alertStatus).map(([value, meta]) => ({ value, label: meta.label }));
const alertTypeOptions = Object.entries(alertType).map(([value, meta]) => ({ value, label: meta.label }));

const EmergencyPage = () => {
  const [killSwitch, setKillSwitch] = useState<{ active: boolean; reason?: string; port?: string; activatedAt?: string } | null>(null);

  const table = useServerTable<EmergencyAlert>({ fetchData: getAlerts });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  useEffect(() => {
    getKillSwitchStatus()
      .then((res) => {
        const sw = res.data.data.switch;
        setKillSwitch({
          active: res.data.data.active,
          reason: sw?.reason,
          port: sw?.port,
          activatedAt: sw?.activated_at,
        });
      })
      .catch(() => {});
  }, []);

  const handleExport = () => exportAll({
    filename: `alerts-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['النوع', 'الوصف', 'الحالة', 'وقت الإطلاق'],
    mapRow: (a) => [
      alertType[a.alert_type]?.label || a.alert_type,
      a.description,
      alertStatus[a.status]?.label || a.status,
      formatDateTime(a.triggered_at),
    ],
    message: 'تم تصدير الإنذارات',
  });

  return (
    <Box>
      <PageHeader
        title="غرفة العمليات الطارئة"
        subtitle="الإنذارات الصحية وحالات الطوارئ"
        eyebrow="الطوارئ والتقارير"
      />

      {killSwitch && (
        <Alert
          severity={killSwitch.active ? 'error' : 'success'}
          icon={<PowerSettingsNewIcon />}
          sx={{ mb: 3, borderRadius: 3 }}
        >
          {killSwitch.active ? (
            <>
              <strong>المفتاح الرئيسي مفعل</strong>{" "}تم تفعيل إيقاف التشغيل {killSwitch.port ? `للمنفذ ${killSwitch.port}` : 'للمنشأة'}
              {killSwitch.activatedAt ? ` في ${formatDateTime(killSwitch.activatedAt)}` : ''}
              {killSwitch.reason ? ` (السبب: ${killSwitch.reason})` : ''}
            </>
          ) : (
            <strong>المفتاح الرئيسي غير مفعل</strong>
          )}
        </Alert>
      )}

      <DataTable<EmergencyAlert>
        columns={[
          { key: 'alert_type', label: 'النوع', render: (a) => { const m = alertType[a.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.alert_type; } },
          { key: 'description', label: 'الوصف', render: (a) => <Typography sx={{ maxWidth: 420 }}>{a.description}</Typography> },
          { key: 'port', label: 'المنفذ', render: (a) => a.port || '—', hideOnMobile: true },
          { key: 'status', label: 'الحالة', sortable: true, render: (a) => { const m = alertStatus[a.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={a.status} tone="neutral" />; } },
          { key: 'triggered_at', label: 'وقت الإطلاق', sortable: true, render: (a) => formatDateTime(a.triggered_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الإنذارات"
        subtitle={`${count} إنذار`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالوصف..."
        filters={[
          { key: 'alert_type', label: 'النوع', options: alertTypeOptions, value: '', onChange: (v) => setFilter('alert_type', v) },
          { key: 'status', label: 'الحالة', options: alertStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد إنذارات"
        emptyDescription="الإنذارات الصحية تظهر هنا عند رصدها"
      />
    </Box>
  );
};

export default EmergencyPage;
