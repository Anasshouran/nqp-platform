import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getAirportScreenings, getAirportPortIds } from '../../../api/endpoints/airport';
import { getIsolations } from '../../../api/endpoints/clinic';
import { getLabSamples } from '../../../api/endpoints/laboratory';
import { listContacts } from '../../../api/endpoints/surveillance';
import { getAlerts } from '../../../api/endpoints/emergency';
import type { AirportScreening } from '../../../types/airport';
import type { IsolationRow } from '../../../types/clinic';
import type { LabSample } from '../../../types/laboratory';
import type { ContactTrace } from '../../../types/surveillance';
import type { EmergencyAlert } from '../../../types/emergency';
import { PageTitle } from '../shared';
import { DataTable, StatusChip, type StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { useTableExport } from '../../../hooks/useTableExport';
import { formatDate, formatDateTime } from '../../../utils/formatters';

/* ============================ تسميات الحالات ============================ */

const RISK_LEVEL: Record<string, { label: string; tone: StatusTone }> = {
  GREEN: { label: 'أخضر', tone: 'success' },
  YELLOW: { label: 'أصفر', tone: 'warning' },
  RED: { label: 'أحمر', tone: 'error' },
};

const SCREENING_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'قيد الانتظار', tone: 'warning' },
  CLEARED: { label: 'مؤهل', tone: 'success' },
  QUARANTINED: { label: 'محجور', tone: 'error' },
  REFERRED: { label: 'مُحال', tone: 'info' },
};

const ISOLATION_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: 'جاري', tone: 'warning' },
  RELEASED: { label: 'خروج', tone: 'success' },
  REMOVED: { label: 'إنهاء/إلغاء', tone: 'neutral' },
};

const ISOLATION_TYPE: Record<string, string> = {
  HOSPITAL: 'تحويل للمستشفى',
  CLINIC_ISOLATION: 'عزل بالعيادة',
  QUARANTINE: 'حجر صحي إجباري',
};

const HEALTH_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  STABLE: { label: 'مستقر', tone: 'info' },
  IMPROVING: { label: 'أفضل', tone: 'success' },
  WORSENING: { label: 'تدهور', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

const CONTACT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  UNDER_MONITORING: { label: 'تحت المراقبة', tone: 'info' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  SYMPTOMATIC: { label: 'ظهور أعراض', tone: 'warning' },
  CONVERTED_CASE: { label: 'تحوّل لحالة', tone: 'error' },
  LOST: { label: 'مفقود', tone: 'neutral' },
};

const ALERT_TYPE: Record<string, string> = {
  RED_ALERT: 'إنذار أحمر',
  OUTBREAK: 'تفشٍ',
};

const ALERT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  NEW: { label: 'جديد', tone: 'error' },
  PROCESSING: { label: 'قيد المعالجة', tone: 'warning' },
  RESOLVED: { label: 'تم الحل', tone: 'success' },
};

/* ========================== 8. الحالات المشتبهة ========================== */

/** الحالات المشتبهة مشتقة من فحوصات المطار ذات مستوى الخطر الأحمر (RED). */
const fetchSuspected = (params: Record<string, unknown>) =>
  getAirportScreenings({ ...params, risk_level: 'RED' });

export const Suspected = () => {
  const table = useServerTable<AirportScreening>({ fetchData: fetchSuspected });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-suspected-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'الرحلة', 'الحرارة', 'الأعراض', 'المستوى', 'الحالة', 'وقت الفحص'],
    mapRow: (r: AirportScreening) => [
      r.traveler_name || r.traveler,
      r.flight_number || '',
      r.body_temperature != null ? String(r.body_temperature) : '',
      (r.symptoms ?? []).join('، '),
      RISK_LEVEL[r.risk_level]?.label || r.risk_level,
      SCREENING_STATUS[r.status]?.label || r.status,
      r.screened_at ? formatDateTime(r.screened_at) : '',
    ],
    message: 'تم تصدير الحالات المشتبهة',
  });

  return (
    <Box>
      <PageTitle title="الحالات المشتبهة" subtitle="المسافرون ذوو مستوى الخطر الأحمر (RED) — يتطلبون تقييماً طبياً" />
      <DataTable<AirportScreening>
        columns={[
          { key: 'traveler_name', label: 'المسافر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.traveler_name || r.traveler}</Typography> },
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.flight_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'body_temperature', label: 'الحرارة', render: (r) => (r.body_temperature != null ? `${r.body_temperature}°` : '—'), align: 'center' },
          { key: 'symptoms', label: 'الأعراض', render: (r) => (r.symptoms?.length ? r.symptoms.join('، ') : '—'), noWrap: false },
          { key: 'risk_level', label: 'المستوى', render: (r) => { const m = RISK_LEVEL[r.risk_level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.risk_level; }, hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = SCREENING_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'screened_at', label: 'وقت الفحص', render: (r) => (r.screened_at ? formatDateTime(r.screened_at) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="الحالات المشتبهة" subtitle={`${table.count} حالة مشتبهة`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالاسم أو رقم الرحلة"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(SCREENING_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد حالات مشتبهة" emptyDescription="لم تُسجَّل حالات بمستوى خطر أحمر مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================= 9. العزل ============================= */

export const Isolation = () => {
  const table = useServerTable<IsolationRow>({ fetchData: getIsolations });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-isolation-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'رقم الجواز', 'نوع العزل', 'الحالة الصحية', 'الخطورة', 'الحالة', 'تاريخ البدء', 'الخروج المتوقع', 'العيادة'],
    mapRow: (r: IsolationRow) => [
      r.traveler_name || '',
      r.passport_number || '',
      ISOLATION_TYPE[r.isolation_type] || r.isolation_type,
      HEALTH_STATUS[r.health_status]?.label || r.health_status,
      r.severity || '',
      ISOLATION_STATUS[r.status]?.label || r.status,
      r.start_date ? formatDate(r.start_date) : '',
      r.expected_end_date ? formatDate(r.expected_end_date) : '',
      r.clinic_name || '',
    ],
    message: 'تم تصدير سجلات العزل',
  });

  return (
    <Box>
      <PageTitle title="العزل" subtitle="سجلات العزل الصحي النشطة والمنتهية في عيادات المطار" />
      <DataTable<IsolationRow>
        columns={[
          { key: 'traveler_name', label: 'المسافر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.traveler_name || '—'}</Typography> },
          { key: 'passport_number', label: 'رقم الجواز', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.passport_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'isolation_type', label: 'نوع العزل', render: (r) => ISOLATION_TYPE[r.isolation_type] || r.isolation_type, hideOnMobile: true },
          { key: 'health_status', label: 'الحالة الصحية', render: (r) => { const m = HEALTH_STATUS[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
          { key: 'start_date', label: 'تاريخ البدء', render: (r) => (r.start_date ? formatDate(r.start_date) : '—'), hideOnMobile: true },
          { key: 'expected_end_date', label: 'الخروج المتوقع', render: (r) => (r.expected_end_date ? formatDate(r.expected_end_date) : '—'), hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = ISOLATION_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="سجلات العزل" subtitle={`${table.count} سجل عزل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالاسم أو رقم الجواز"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(ISOLATION_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد سجلات عزل" emptyDescription="لم تُسجَّل حالات عزل مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================= 10. المختبر ============================= */

export const Lab = () => {
  const table = useServerTable<LabSample>({ fetchData: getLabSamples });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-lab-samples-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الباركود', 'المسافر', 'نوع العينة', 'المصدر', 'الأولوية', 'حالة الاستلام', 'الحالة', 'المنفذ', 'وقت الجمع'],
    mapRow: (r: LabSample) => [
      r.sample_barcode,
      r.visit_traveler_name || '',
      r.sample_type_label || r.sample_type,
      r.source_label || r.source,
      r.priority_label || r.priority,
      r.reception_status_label || r.reception_status,
      r.status_label || r.status,
      r.entry_point_name || '',
      r.collected_at ? formatDateTime(r.collected_at) : '',
    ],
    message: 'تم تصدير عينات المختبر',
  });

  return (
    <Box>
      <PageTitle title="المختبر" subtitle="العينات المخبرية الواردة من بوابة المطار وحالة معالجتها" />
      <DataTable<LabSample>
        columns={[
          { key: 'sample_barcode', label: 'الباركود', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.sample_barcode}</Typography> },
          { key: 'visit_traveler_name', label: 'المسافر', render: (r) => r.visit_traveler_name || '—', hideOnMobile: true },
          { key: 'sample_type_label', label: 'نوع العينة', render: (r) => r.sample_type_label || r.sample_type },
          { key: 'priority_label', label: 'الأولوية', render: (r) => { const p = r.priority_label || r.priority; const tone: StatusTone = r.priority === 'URGENT' || r.priority === 'STAT' ? 'error' : 'neutral'; return <StatusChip label={p} tone={tone} />; }, hideOnMobile: true },
          { key: 'reception_status_label', label: 'حالة الاستلام', render: (r) => r.reception_status_label || r.reception_status, hideOnMobile: true },
          { key: 'status_label', label: 'الحالة', render: (r) => r.status_label || r.status },
          { key: 'collected_at', label: 'وقت الجمع', render: (r) => (r.collected_at ? formatDateTime(r.collected_at) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="عينات المختبر" subtitle={`${table.count} عينة مسجّلة`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالباركود أو اسم المسافر"
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد عينات" emptyDescription="لم تُسجَّل عينات مخبرية مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ========================= 11. تتبع المخالطين ========================= */

/**
 * تتبع المخالطين مورد وطني عبر قطاعات؛ نقصّ النطاق هنا على منافذ المطار
 * عبر فلتر `port` (يقبل قائمة معرّفات مفصولة بفواصل → `port__in`).
 */
const fetchAirportContacts = async (params: Record<string, unknown>) => {
  const portIds = await getAirportPortIds();
  if (portIds.length === 0) {
    return { data: { status: 'success', data: { count: 0, next: null, previous: null, results: [] } } };
  }
  return listContacts({ ...params, port: portIds.join(',') });
};

export const ContactTracing = () => {
  const table = useServerTable<ContactTrace>({ fetchData: fetchAirportContacts });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم المخالط', 'الاسم', 'الهاتف', 'الحالة الأساسية', 'نوع المخالطة', 'أيام المتابعة', 'المنفذ', 'الحالة'],
    mapRow: (r: ContactTrace) => [
      r.contact_number,
      r.person_name,
      r.phone || '',
      r.index_case_number || '',
      r.contact_type || '',
      String(r.follow_up_days),
      r.port_code || '',
      CONTACT_STATUS[r.status]?.label || r.status,
    ],
    message: 'تم تصدير المخالطين',
  });

  return (
    <Box>
      <PageTitle title="تتبع المخالطين" subtitle="مخالطو الحالات المسجّلة في منافذ المطار وحالة متابعتهم" />
      <DataTable<ContactTrace>
        columns={[
          { key: 'contact_number', label: 'رقم المخالط', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.contact_number}</Typography> },
          { key: 'person_name', label: 'الاسم', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.person_name}</Typography> },
          { key: 'phone', label: 'الهاتف', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.phone || '—'}</Typography>, hideOnMobile: true },
          { key: 'index_case_number', label: 'الحالة الأساسية', render: (r) => r.index_case_number || '—', hideOnMobile: true },
          { key: 'follow_up_days', label: 'أيام المتابعة', render: (r) => String(r.follow_up_days), align: 'center', hideOnMobile: true },
          { key: 'port_code', label: 'المنفذ', render: (r) => r.port_code || '—', hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = CONTACT_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="المخالطون في منافذ المطار" subtitle={`${table.count} مخالط مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث بالاسم أو الهاتف أو رقم المخالط"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(CONTACT_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا يوجد مخالطون" emptyDescription="لم تُسجَّل حالات تتبع مخالطين في منافذ المطار مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================= 12. الطوارئ ============================= */

/** إنذارات الطوارئ مقصورة على منافذ المطار عبر فلتر `port`. */
const fetchAirportAlerts = async (params: Record<string, unknown>) => {
  const portIds = await getAirportPortIds();
  if (portIds.length === 0) {
    return { data: { status: 'success', data: { count: 0, next: null, previous: null, results: [] } } };
  }
  return getAlerts({ ...params, port: portIds.join(',') });
};

export const Emergency = () => {
  const table = useServerTable<EmergencyAlert>({ fetchData: fetchAirportAlerts });
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-emergency-alerts-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['النوع', 'الوصف', 'الحالة', 'وقت الإطلاق', 'وقت الحل'],
    mapRow: (r: EmergencyAlert) => [
      ALERT_TYPE[r.alert_type] || r.alert_type,
      r.description || '',
      ALERT_STATUS[r.status]?.label || r.status,
      r.triggered_at ? formatDateTime(r.triggered_at) : '',
      r.resolved_at ? formatDateTime(r.resolved_at) : '',
    ],
    message: 'تم تصدير إنذارات الطوارئ',
  });

  return (
    <Box>
      <PageTitle title="غرفة الطوارئ" subtitle="إنذارات الطوارئ الصحية الصادرة في منافذ المطار" />
      <DataTable<EmergencyAlert>
        columns={[
          { key: 'alert_type', label: 'النوع', render: (r) => <StatusChip label={ALERT_TYPE[r.alert_type] || r.alert_type} tone="error" /> },
          { key: 'description', label: 'الوصف', render: (r) => r.description || '—', noWrap: false },
          { key: 'status', label: 'الحالة', render: (r) => { const m = ALERT_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'triggered_at', label: 'وقت الإطلاق', render: (r) => (r.triggered_at ? formatDateTime(r.triggered_at) : '—'), hideOnMobile: true },
          { key: 'resolved_at', label: 'وقت الحل', render: (r) => (r.resolved_at ? formatDateTime(r.resolved_at) : '—'), hideOnMobile: true },
        ]}
        rows={table.rows} rowKey={(r) => r.id} count={table.count} page={table.page} rowsPerPage={table.rowsPerPage}
        pageSizeOptions={table.pageSizeOptions} loading={table.loading} error={table.error}
        title="إنذارات الطوارئ" subtitle={`${table.count} إنذار مسجّل`}
        searchInput={table.searchInput} onSearchChange={table.setSearchInput} searchPlaceholder="بحث في الوصف"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(ALERT_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => table.setFilter('status', v) }]}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onSortChange={table.setSorting}
        onPageChange={table.setPage} onRowsPerPageChange={table.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={table.refresh}
        emptyTitle="لا توجد إنذارات" emptyDescription="لم تُسجَّل إنذارات طوارئ في منافذ المطار مطابقة لهذه المعايير."
      />
    </Box>
  );
};
