import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import GroupsIcon from '@mui/icons-material/Groups';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import { KpiCard, PageTitle, SurfaceCard } from '../shared';
import { DataTable, EmptyState, StatusChip, type StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { useTableExport } from '../../../hooks/useTableExport';
import { getAircraftInspections, getAirportDashboard } from '../../../api/endpoints/airport';
import type { AircraftInspection, AirportDashboard } from '../../../types/airport';
import { formatDate, formatDateTime, formatNumber } from '../../../utils/formatters';

/* ============================ تسميات حالات التفتيش ============================ */

const INSPECTION_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PASSED: { label: 'مطابقة', tone: 'success' },
  CONDITIONAL: { label: 'مشروطة', tone: 'warning' },
  FAILED: { label: 'غير مطابقة', tone: 'error' },
};

/* ============================ 13. تفتيش الطائرات ============================ */

export const Inspection = () => {
  const { t } = useTranslation();
  const table = useServerTable<AircraftInspection>({ fetchData: getAircraftInspections });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `aircraft-inspections-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['تسجيل الطائرة', 'الرحلة', 'المفتش', 'الحالة العامة', 'الشهادة', 'تاريخ التفتيش'],
    mapRow: (r: AircraftInspection) => [
      r.aircraft_registration,
      r.flight_number || '',
      r.inspector_name || '',
      INSPECTION_STATUS[r.overall_status]?.label || r.overall_status,
      r.certificate_issued ? 'صادرة' : 'غير صادرة',
      r.inspection_date ? formatDateTime(r.inspection_date) : '',
    ],
    message: 'تم تصدير تفتيش الطائرات',
  });

  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.aircraftInspection.title')} subtitle={t('airporthealth.screens.inspection.aircraftInspection.subtitle')} />
      <DataTable<AircraftInspection>
        columns={[
          { key: 'aircraft_registration', label: 'تسجيل الطائرة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.aircraft_registration}</Typography> },
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.flight_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'inspector_name', label: 'المفتش', render: (r) => r.inspector_name || '—', hideOnMobile: true },
          { key: 'overall_status', label: 'الحالة العامة', render: (r) => { const m = INSPECTION_STATUS[r.overall_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status; } },
          { key: 'certificate_issued', label: 'الشهادة', render: (r) => <StatusChip label={r.certificate_issued ? 'صادرة' : 'غير صادرة'} tone={r.certificate_issued ? 'success' : 'neutral'} />, hideOnMobile: true },
          { key: 'inspection_date', label: 'تاريخ التفتيش', render: (r) => (r.inspection_date ? formatDateTime(r.inspection_date) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="سجل تفتيش الطائرات" subtitle={`${table.count} تفتيش مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بتسجيل الطائرة أو رقم الرحلة"
        filters={[{ key: 'overall_status', label: 'الحالة العامة', options: Object.entries(INSPECTION_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('overall_status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد تفتيشات" emptyDescription="لم تُسجَّل عمليات تفتيش للطائرات مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================== 14. التحليلات ============================== */

export const Analytics = () => {
  const { t } = useTranslation();
  const [live, setLive] = useState<AirportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAirportDashboard()
      .then((res) => { if (mounted) { setLive(res.data.data); setLoading(false); } })
      .catch(() => { if (mounted) { setError(true); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const report = live?.report;
  const cards = [
    { icon: <FlightTakeoffIcon />, value: report?.flights ?? 0, label: 'إجمالي الرحلات' },
    { icon: <GroupsIcon />, value: report?.travelers ?? 0, label: 'إجمالي المسافرين' },
    { icon: <ManageSearchIcon />, value: report?.screened ?? 0, label: 'إجمالي الفحوص' },
    { icon: <LocalHospitalIcon />, value: report?.referrals ?? 0, label: 'إجمالي الإحالات' },
    { icon: <WarningAmberIcon />, value: report?.suspected ?? 0, label: 'حالات مشتبهة اليوم' },
  ];
  const byFlight = report?.screenings_by_flight ?? [];
  const recentInspections = live?.recent_inspections ?? [];

  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.analytics.title')} subtitle={t('airporthealth.screens.inspection.analytics.subtitle')} />

      {error ? (
        <EmptyState title="تعذر التحميل" description="لم يتمكن النظام من جلب بيانات التحليلات. يُرجى المحاولة لاحقًا." />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {loading ? (
              <Grid item xs={12}>
                <EmptyState title="قيد الإعداد" description="يتم تحميل بيانات التحليلات من النظام." />
              </Grid>
            ) : (
              cards.map((c) => (
                <Grid item xs={12} sm={6} md={4} xl={2.4} key={c.label}>
                  <KpiCard icon={c.icon} value={formatNumber(c.value)} label={c.label} trend="flat" trendLabel="مباشر" />
                </Grid>
              ))
            )}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={5}>
              <SurfaceCard title="توزيع الفحوص حسب الرحلة" subtitle="أكثر الرحلات فحصاً اليوم">
                {byFlight.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ py: 2, display: 'block', textAlign: 'center' }}>لا توجد فحوص مسجّلة اليوم</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الرحلة</TableCell>
                          <TableCell align="center">عدد الفحوص</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {byFlight.map((row) => (
                          <TableRow key={row.flight_number} hover>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.flight_number}</TableCell>
                            <TableCell align="center">{formatNumber(row.count)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} lg={7}>
              <SurfaceCard title="أحدث عمليات التفتيش" subtitle="آخر التفتيشات المسجّلة للطائرات">
                {recentInspections.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ py: 2, display: 'block', textAlign: 'center' }}>لا توجد تفتيشات مسجّلة</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الطائرة</TableCell>
                          <TableCell>الرحلة</TableCell>
                          <TableCell align="center">الحالة</TableCell>
                          <TableCell align="center">التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentInspections.map((row) => {
                          const m = INSPECTION_STATUS[row.overall_status];
                          return (
                            <TableRow key={row.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.aircraft_registration}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{row.flight_number}</TableCell>
                              <TableCell align="center">{m ? <StatusChip label={m.label} tone={m.tone} /> : row.overall_status}</TableCell>
                              <TableCell align="center">{formatDate(row.inspection_date)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </SurfaceCard>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

/* ============================= 15. الشهادات ============================= */

/** الشهادات مشتقة من تفتيش الطائرات: كل تفتيش صدرت له شهادة يظهر هنا. */
const fetchIssuedCertificates = (params: Record<string, unknown>) =>
  getAircraftInspections({ ...params, certificate_issued: true });

export const Certificates = () => {
  const { t } = useTranslation();
  const table = useServerTable<AircraftInspection>({ fetchData: fetchIssuedCertificates });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `aircraft-certificates-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['تسجيل الطائرة', 'الرحلة', 'الحالة العامة', 'تاريخ الإصدار'],
    mapRow: (r: AircraftInspection) => [
      r.aircraft_registration,
      r.flight_number || '',
      INSPECTION_STATUS[r.overall_status]?.label || r.overall_status,
      r.inspection_date ? formatDateTime(r.inspection_date) : '',
    ],
    message: 'تم تصدير الشهادات',
  });

  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.certificates.title')} subtitle={t('airporthealth.screens.inspection.certificates.subtitle')} />
      <DataTable<AircraftInspection>
        columns={[
          { key: 'aircraft_registration', label: 'تسجيل الطائرة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.aircraft_registration}</Typography> },
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.flight_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'overall_status', label: 'الحالة العامة', render: (r) => { const m = INSPECTION_STATUS[r.overall_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status; } },
          { key: 'certificate_issued', label: 'الشهادة', render: () => <StatusChip label="صادرة" tone="success" /> },
          { key: 'inspection_date', label: 'تاريخ الإصدار', render: (r) => (r.inspection_date ? formatDateTime(r.inspection_date) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="الشهادات الصادرة للطائرات" subtitle={`${table.count} شهادة صادرة`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بتسجيل الطائرة أو رقم الرحلة"
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد شهادات صادرة" emptyDescription="لم تُصدر شهادات لتفتيشات الطائرات مطابقة لهذه المعايير بعد."
      />
    </Box>
  );
};
