import { useTranslation } from 'react-i18next';
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
      fontWeight: 700,
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
        fontWeight: 700,
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
  const { t } = useTranslation();
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `airport-screenings-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [t('borders.airport.cols.traveler'), t('borders.airport.cols.passport'), t('borders.airport.cols.point'), t('borders.airport.cols.flight'), t('borders.airport.cols.type'), t('borders.airport.cols.risk'), t('borders.airport.cols.status'), t('borders.airport.cols.time')],
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
    message: t('borders.airport.export.screenings'),
  });

  return (
    <DataTable<AirportScreening>
      columns={[
        { key: 'traveler_name', label: t('borders.airport.cols.traveler'), render: (r) => <PersonCell name={r.traveler_name} id={r.traveler} /> },
        { key: 'point_name', label: t('borders.airport.cols.pointName'), render: (r) => r.point_name || '—' },
        { key: 'flight_number', label: t('borders.airport.cols.flight'), render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        {
          key: 'screening_type',
          label: t('borders.airport.cols.type'),
          render: (r) => {
            const m = screeningType[r.screening_type];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.screening_type;
          },
          hideOnMobile: true,
        },
        {
          key: 'risk_level',
          label: t('borders.airport.cols.risk'),
          render: (r) => {
            const m = riskLevel[r.risk_level];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.risk_level;
          },
        },
        {
          key: 'status',
          label: t('borders.airport.cols.status'),
          render: (r) => {
            const m = airportScreeningStatus[r.status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status;
          },
        },
        { key: 'screened_at', label: t('borders.airport.cols.screenedAt'), sortable: true, render: (r) => formatDateTime(r.screened_at), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('borders.airport.table.screenings.title')}
      subtitle={t('borders.airport.table.screenings.subtitle').replace('{count}', String(count))}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('borders.airport.table.screenings.searchPlaceholder')}
      filters={[
        { key: 'status', label: t('borders.airport.cols.status'), options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        { key: 'risk_level', label: t('borders.airport.cols.risk'), options: riskOptions, value: '', onChange: (v) => setFilter('risk_level', v) },
        { key: 'screening_type', label: t('borders.airport.cols.type'), options: typeOptions, value: '', onChange: (v) => setFilter('screening_type', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle={t('borders.airport.table.screenings.emptyTitle')}
      emptyDescription={t('borders.airport.table.screenings.emptyDescription')}
    />
  );
};

const InspectionsTab = () => {
  const table = useServerTable<AircraftInspection>({ fetchData: getAircraftInspections });
  const { t } = useTranslation();
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `airport-inspections-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [t('borders.airport.cols.aircraft'), t('borders.airport.cols.flight'), t('borders.airport.cols.inspector'), t('borders.airport.cols.cleanliness'), t('borders.airport.cols.waterQuality'), t('borders.airport.cols.overallStatus'), t('borders.airport.cols.certificate')],
    mapRow: (r) => [
      r.aircraft_registration,
      r.flight_number || '',
      r.inspector_name || '',
      r.cleanliness_status,
      r.water_quality_status,
      inspectionOverall[r.overall_status]?.label || r.overall_status,
      r.certificate_issued ? t('borders.labels.yes') : t('borders.labels.no'),
    ],
    message: t('borders.airport.export.inspections'),
  });

  return (
    <DataTable<AircraftInspection>
      columns={[
        { key: 'aircraft_registration', label: t('borders.airport.cols.aircraftReg'), render: (r) => <CodeChip code={r.aircraft_registration} /> },
        { key: 'flight_number', label: t('borders.airport.cols.flight'), render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        { key: 'inspector_name', label: t('borders.airport.cols.inspector'), render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'cleanliness_status', label: t('borders.airport.cols.cleanliness'), render: (r) => { const m = inspectionStatus[r.cleanliness_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.cleanliness_status; } },
        { key: 'water_quality_status', label: t('borders.airport.cols.waterQuality'), render: (r) => { const m = inspectionStatus[r.water_quality_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.water_quality_status; }, hideOnMobile: true },
        {
          key: 'overall_status',
          label: t('borders.airport.cols.overallStatus'),
          render: (r) => {
            const m = inspectionOverall[r.overall_status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status;
          },
        },
        { key: 'inspection_date', label: t('borders.airport.cols.inspectionDate'), sortable: true, render: (r) => formatDateTime(r.inspection_date), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('borders.airport.table.aircraft.title')}
      subtitle={t('borders.airport.table.aircraft.subtitle').replace('{count}', String(count))}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('borders.airport.table.aircraft.searchPlaceholder')}
      filters={[
        { key: 'overall_status', label: t('borders.airport.cols.status'), options: Object.entries(inspectionOverall).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('overall_status', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle={t('borders.airport.table.aircraft.emptyTitle')}
      emptyDescription={t('borders.airport.table.aircraft.emptyDescription')}
    />
  );
};

const CrewTab = () => {
  const table = useServerTable<CrewHealthRecord>({ fetchData: getCrewHealthRecords });
  const { t } = useTranslation();
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<CrewHealthRecord>
      columns={[
        { key: 'crew_name', label: t('borders.airport.cols.crewMember'), render: (r) => <PersonCell name={r.crew_name} /> },
        { key: 'flight_number', label: t('borders.airport.cols.flight'), render: (r) => (r.flight_number ? <CodeChip code={r.flight_number} /> : '—'), hideOnMobile: true },
        {
          key: 'health_status',
          label: t('borders.airport.cols.healthStatus'),
          render: (r) => {
            const m = crewHealthStatus[r.health_status];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status;
          },
        },
        { key: 'temperature', label: t('borders.airport.cols.temperature'), render: (r) => (r.temperature != null ? `${r.temperature}°` : '—'), hideOnMobile: true },
        { key: 'medical_clearance_date', label: t('borders.airport.cols.clearance'), render: (r) => r.medical_clearance_date || '—', hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('borders.airport.table.crew.title')}
      subtitle={t('borders.airport.table.crew.subtitle').replace('{count}', String(count))}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('borders.airport.table.crew.searchPlaceholder')}
      filters={[
        { key: 'health_status', label: t('borders.airport.cols.status'), options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('health_status', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('borders.airport.table.crew.emptyTitle')}
      emptyDescription={t('borders.airport.table.crew.emptyDescription')}
    />
  );
};

const TerminalsTab = () => {
  const table = useServerTable<AirportTerminal>({ fetchData: getAirportTerminals });
  const { t } = useTranslation();
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<AirportTerminal>
      columns={[
        { key: 'terminal_code', label: t('borders.airport.cols.code'), render: (r) => <CodeChip code={r.terminal_code} /> },
        { key: 'name_ar', label: t('borders.airport.cols.terminal') },
        { key: 'port_name', label: t('borders.airport.cols.port'), render: (r) => r.port_name || '—', hideOnMobile: true },
        { key: 'capacity', label: t('borders.airport.cols.capacity'), render: (r) => r.capacity ?? '—', hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('borders.airport.table.terminals.title')}
      subtitle={t('borders.airport.table.terminals.subtitle').replace('{count}', String(count))}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('borders.airport.table.terminals.searchPlaceholder')}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('borders.airport.table.terminals.emptyTitle')}
      emptyDescription={t('borders.airport.table.terminals.emptyDescription')}
    />
  );
};

const PointsTab = () => {
  const table = useServerTable<ScreeningPoint>({ fetchData: getScreeningPoints });
  const { t } = useTranslation();
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<ScreeningPoint>
      columns={[
        { key: 'point_code', label: t('borders.airport.cols.pointCode'), render: (r) => <CodeChip code={r.point_code} /> },
        { key: 'terminal_name', label: t('borders.airport.cols.terminal'), render: (r) => r.terminal_name || '—' },
        {
          key: 'point_type',
          label: t('borders.airport.cols.type'),
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
      title={t('borders.airport.table.points.title')}
      subtitle={t('borders.airport.table.points.subtitle').replace('{count}', String(count))}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('borders.airport.table.points.searchPlaceholder')}
      filters={[
        { key: 'point_type', label: t('borders.airport.cols.type'), options: typeOptions, value: '', onChange: (v) => setFilter('point_type', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('borders.airport.table.points.emptyTitle')}
      emptyDescription={t('borders.airport.table.points.emptyDescription')}
    />
  );
};

const AirportPage = () => {
  const { t } = useTranslation();
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
        title={t('borders.airport.title')}
        subtitle={t('borders.airport.subtitle')}
        eyebrow={t('borders.airport.eyebrow')}
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
          <Tab label={t('borders.airport.tabs.main')} />
          <Tab label={t('borders.airport.tabs.screenings')} />
          <Tab label={t('borders.airport.tabs.aircraft')} />
          <Tab label={t('borders.airport.tabs.crew')} />
          <Tab label={t('borders.airport.tabs.terminals')} />
          <Tab label={t('borders.airport.tabs.points')} />
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