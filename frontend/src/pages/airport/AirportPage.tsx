import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import InspectorDashboard from './InspectorDashboard';
import {
  getAircraftInspections,
  getAirportScreenings,
  getAirportTerminals,
  getCrewHealthRecords,
  getScreeningPoints,
} from '../../api/endpoints/airport';
import type { AircraftInspection, AirportScreening, AirportTerminal, CrewHealthRecord, ScreeningPoint } from '../../types/airport';
import {
  airportScreeningStatus,
  crewHealthStatus,
  inspectionOverall,
  inspectionStatus,
  riskLevel,
  screeningType,
} from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const riskOptions = Object.entries(riskLevel).map(([v, m]) => ({ value: v, label: m.label }));
const statusOptions = Object.entries(airportScreeningStatus).map(([v, m]) => ({ value: v, label: m.label }));
const typeOptions = Object.entries(screeningType).map(([v, m]) => ({ value: v, label: m.label }));

const CodeChip = ({ code }: { code: string }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 1,
      py: 0.35,
      borderRadius: 1.5,
      bgcolor: 'primary.light',
      color: 'primary.dark',
      fontFamily: 'monospace',
      fontWeight: 800,
      fontSize: 12,
    }}
  >
    {code}
  </Box>
);

const PersonCell = ({ name, id }: { name?: string; id?: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Avatar
      sx={{
        width: 36,
        height: 36,
        fontSize: 14,
        fontWeight: 800,
        bgcolor: 'primary.light',
        color: 'primary.dark',
        flexShrink: 0,
      }}
    >
      {(name || '؟').slice(0, 1)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{name || '—'}</Typography>
      {id ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
          {id}
        </Typography>
      ) : null}
    </Box>
  </Stack>
);

const ScreeningsTab = () => {
  const table = useServerTable<AirportScreening>({ fetchData: getAirportScreenings });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `airport-screenings-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['المسافر', 'جواز السفر', 'النقطة', 'الرحلة', 'النوع', 'المخاطر', 'الحالة', 'الوقت'],
    mapRow: (r) => [
      r.traveler_name || '',
      r.traveler,
      r.point_name || '',
      r.flight_number || '',
      screeningType[r.screening_type]?.label || r.screening_type,
      riskLevel[r.risk_level]?.label || r.risk_level,
      airportScreeningStatus[r.status]?.label || r.status,
      formatDateTime(r.screened_at),
    ],
    message: 'تم تصدير الفحوصات',
  });

  return (
    <DataTable<AirportScreening>
      columns={[
        { key: 'traveler_name', label: 'المسافر', render: (r) => <PersonCell name={r.traveler_name} id={r.traveler} /> },
        { key: 'point_name', label: 'نقطة الفحص', render: (r) => r.point_name || '—' },
        { key: 'flight_number', label: 'الرحلة', render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        {
          key: 'screening_type',
          label: 'النوع',
          render: (r) => {
            const m = screeningType[r.screening_type];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.screening_type;
          },
          hideOnMobile: true,
        },
        {
          key: 'risk_level',
          label: 'المخاطر',
          render: (r) => {
            const m = riskLevel[r.risk_level];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.risk_level;
          },
        },
        {
          key: 'status',
          label: 'الحالة',
          render: (r) => {
            const m = airportScreeningStatus[r.status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status;
          },
        },
        { key: 'screened_at', label: 'وقت الفحص', sortable: true, render: (r) => formatDateTime(r.screened_at), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="فحوصات المطارات"
      subtitle={`${count} فحص`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم أو جواز السفر..."
      filters={[
        { key: 'status', label: 'الحالة', options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        { key: 'risk_level', label: 'المخاطر', options: riskOptions, value: '', onChange: (v) => setFilter('risk_level', v) },
        { key: 'screening_type', label: 'النوع', options: typeOptions, value: '', onChange: (v) => setFilter('screening_type', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle="لا توجد فحوصات مطار"
      emptyDescription="فحوصات المسافرين في المطار تظهر هنا"
    />
  );
};

const InspectionsTab = () => {
  const table = useServerTable<AircraftInspection>({ fetchData: getAircraftInspections });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `airport-inspections-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الطائرة', 'الرحلة', 'المفتش', 'النظافة', 'جودة المياه', 'الحالة العامة', 'شهادة'],
    mapRow: (r) => [
      r.aircraft_registration,
      r.flight_number || '',
      r.inspector_name || '',
      r.cleanliness_status,
      r.water_quality_status,
      inspectionOverall[r.overall_status]?.label || r.overall_status,
      r.certificate_issued ? 'نعم' : 'لا',
    ],
    message: 'تم تصدير التفتيشات',
  });

  return (
    <DataTable<AircraftInspection>
      columns={[
        { key: 'aircraft_registration', label: 'تسجيل الطائرة', render: (r) => <CodeChip code={r.aircraft_registration} /> },
        { key: 'flight_number', label: 'الرحلة', render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        { key: 'inspector_name', label: 'المفتش', render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'cleanliness_status', label: 'النظافة', render: (r) => { const m = inspectionStatus[r.cleanliness_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.cleanliness_status; } },
        { key: 'water_quality_status', label: 'جودة المياه', render: (r) => { const m = inspectionStatus[r.water_quality_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.water_quality_status; }, hideOnMobile: true },
        {
          key: 'overall_status',
          label: 'الحالة العامة',
          render: (r) => {
            const m = inspectionOverall[r.overall_status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status;
          },
        },
        { key: 'inspection_date', label: 'تاريخ التفتيش', sortable: true, render: (r) => formatDateTime(r.inspection_date), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="تفتيش الطائرات"
      subtitle={`${count} تفتيش`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث برقم التسجيل أو الرحلة..."
      filters={[
        { key: 'overall_status', label: 'الحالة', options: Object.entries(inspectionOverall).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('overall_status', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle="لا توجد تفتيشات"
      emptyDescription="تفتيش الطائرات حسب المعايير الصحية يظهر هنا"
    />
  );
};

const CrewTab = () => {
  const table = useServerTable<CrewHealthRecord>({ fetchData: getCrewHealthRecords });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<CrewHealthRecord>
      columns={[
        { key: 'crew_name', label: 'عضو الطاقم', render: (r) => <PersonCell name={r.crew_name} /> },
        { key: 'flight_number', label: 'الرحلة', render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        {
          key: 'health_status',
          label: 'الحالة الصحية',
          render: (r) => {
            const m = crewHealthStatus[r.health_status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status;
          },
        },
        { key: 'temperature', label: 'درجة الحرارة', render: (r) => (r.temperature != null ? `${r.temperature}°` : '—'), hideOnMobile: true },
        { key: 'medical_clearance_date', label: 'التصريح', render: (r) => r.medical_clearance_date || '—', hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="سجلات صحة الأطقم"
      subtitle={`${count} سجل`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم أو الرحلة..."
      filters={[
        { key: 'health_status', label: 'الحالة', options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('health_status', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد سجلات أطقم"
      emptyDescription="سجلات صحة أطقم الطائرات تظهر هنا"
    />
  );
};

const TerminalsTab = () => {
  const table = useServerTable<AirportTerminal>({ fetchData: getAirportTerminals });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<AirportTerminal>
      columns={[
        { key: 'terminal_code', label: 'الرمز', render: (r) => <CodeChip code={r.terminal_code} /> },
        { key: 'name_ar', label: 'الصالة' },
        { key: 'port_name', label: 'المنفذ', render: (r) => r.port_name || '—', hideOnMobile: true },
        { key: 'capacity', label: 'السعة', render: (r) => r.capacity ?? '—', hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="صالات المطارات"
      subtitle={`${count} صالة`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم أو الرمز..."
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد صالات"
      emptyDescription="صالات المطارات ونقاطها تظهر هنا"
    />
  );
};

const PointsTab = () => {
  const table = useServerTable<ScreeningPoint>({ fetchData: getScreeningPoints });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<ScreeningPoint>
      columns={[
        { key: 'point_code', label: 'رمز النقطة', render: (r) => <CodeChip code={r.point_code} /> },
        { key: 'terminal_name', label: 'الصالة', render: (r) => r.terminal_name || '—' },
        {
          key: 'point_type',
          label: 'النوع',
          render: (r) => {
            const m = screeningType[r.point_type];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.point_type;
          },
        },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="نقاط الفحص"
      subtitle={`${count} نقطة`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث برمز النقطة..."
      filters={[
        { key: 'point_type', label: 'النوع', options: typeOptions, value: '', onChange: (v) => setFilter('point_type', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد نقاط فحص"
      emptyDescription="نقاط فحص المسافرين في الصالات تظهر هنا"
    />
  );
};

const AirportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = Number(searchParams.get('tab') ?? '0');
  const [tab, setTab] = useState<number>(Number.isInteger(rawTab) && rawTab >= 0 && rawTab <= 5 ? rawTab : 0);
  const [visited, setVisited] = useState<number[]>([tab]);

  const handleTabChange = (_: unknown, next: number) => {
    setTab(next);
    setSearchParams(next === 0 ? {} : { tab: String(next) }, { replace: true });
    setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]));
  };

  const tabContent = [<InspectorDashboard />, <ScreeningsTab />, <InspectionsTab />, <CrewTab />, <TerminalsTab />, <PointsTab />];

  return (
    <Box>
      <PageHeader
        title="صحة المطارات"
        subtitle="إدارة فحوصات المسافرين وتفتيش الطائرات وسجلات الأطقم في المطارات"
        eyebrow="العمليات"
      />

      <Box
        sx={{
          mb: 3,
          p: 0.75,
          borderRadius: 4,
          border: '1px solid rgba(16,40,34,0.06)',
          bgcolor: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(18px) saturate(1.35)',
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons={false}
          sx={{ minHeight: 44 }}
        >
          <Tab label="الرئيسية" />
          <Tab label="فحوصات المطارات" />
          <Tab label="تفتيش الطائرات" />
          <Tab label="صحة الأطقم" />
          <Tab label="الصالات" />
          <Tab label="نقاط الفحص" />
        </Tabs>
      </Box>

      {tabContent.map((content, i) => (
        <Box key={i} sx={{ display: tab === i ? 'block' : 'none' }}>
          {visited.includes(i) ? content : null}
        </Box>
      ))}
    </Box>
  );
};

export default AirportPage;