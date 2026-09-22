import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AnchorIcon from '@mui/icons-material/Anchor';
import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BiotechIcon from '@mui/icons-material/Biotech';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import VerifiedIcon from '@mui/icons-material/Verified';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PestControlIcon from '@mui/icons-material/PestControl';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import ShipInspectionForm from './ShipInspectionForm';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import {
  getCargoInspections,
  getCrewMembers,
  getFoodWaterInspections,
  getHealthCertificates,
  getHealthDeclarations,
  getIsolationRecords,
  getPassengers,
  getPortEmergencies,
  getPortHealthOverview,
  getSanitationCertificates,
  getSeaPorts,
  getShipInspections,
  getSurveillanceCases,
  getVectorControls,
  getVessels,
  getWasteInspections,
} from '../../api/endpoints/portHealth';
import type {
  CargoInspection,
  CrewMember,
  FoodWaterInspection,
  HealthCertificate,
  HealthDeclaration,
  IsolationRecord,
  Passenger,
  PortEmergency,
  PortHealthOverview,
  SanitationCertificate,
  SeaPort,
  ShipInspection,
  SurveillanceCase,
  VectorControl,
  Vessel,
  WasteInspection,
} from '../../types/portHealth';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  cargoStatus,
  cargoType,
  certificateStatus,
  crewHealthStatus,
  declarationStatus,
  emergencySeverity,
  emergencyStatus,
  healthCertType,
  inspectionOverall,
  isolationStatus,
  personType,
  sampleSendStatus,
  sanitationCertType,
  surveillanceStatus,
  vectorControlType,
  vesselStatus,
  vesselType,
} from '../../utils/status';

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة المؤشرات', icon: <AnchorIcon fontSize="small" /> },
  { id: 'seaports', label: 'الموانئ', icon: <AnchorIcon fontSize="small" /> },
  { id: 'vessels', label: 'السفن', icon: <DirectionsBoatIcon fontSize="small" /> },
  { id: 'crew', label: 'الطاقم', icon: <GroupsIcon fontSize="small" /> },
  { id: 'passengers', label: 'الركاب', icon: <GroupsIcon fontSize="small" /> },
  { id: 'declarations', label: 'الإقرار الصحي', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'inspections', label: 'التفتيش الصحي', icon: <BiotechIcon fontSize="small" /> },
  { id: 'ship-inspection', label: 'تفتيش ميداني', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'food-water', label: 'الأغذية والمياه', icon: <RestaurantIcon fontSize="small" /> },
  { id: 'sanitation', label: 'شهادات صحة السفن', icon: <VerifiedIcon fontSize="small" /> },
  { id: 'isolation', label: 'العزل والحجر', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'surveillance', label: 'الترصد الوبائي', icon: <LocalHospitalIcon fontSize="small" /> },
  { id: 'vectors', label: 'النواقل', icon: <PestControlIcon fontSize="small" /> },
  { id: 'cargo', label: 'الشحنات', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'waste', label: 'النفايات', icon: <DeleteSweepIcon fontSize="small" /> },
  { id: 'emergencies', label: 'الطوارئ', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'health-certs', label: 'الشهادات', icon: <BadgeIcon fontSize="small" /> },
] as const;

const DashboardTab = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<PortHealthOverview | null>(null);
  useEffect(() => {
    getPortHealthOverview().then((r) => setOverview(r.data.data)).catch(() => undefined);
  }, []);

  const cards = [
    { icon: <AnchorIcon />, value: overview?.seaports ?? 0, label: 'الموانئ البحرية', accent: 'primary.main' },
    { icon: <DirectionsBoatIcon />, value: overview?.vessels ?? 0, label: 'إجمالي السفن', accent: 'info.main' },
    { icon: <DirectionsBoatIcon />, value: overview?.arrived_vessels ?? 0, label: 'سفن وصلت', accent: 'primary.main' },
    { icon: <BiotechIcon />, value: overview?.inspections ?? 0, label: 'عمليات التفتيش', accent: 'info.main' },
    { icon: <VerifiedIcon />, value: overview?.pending_certificates ?? 0, label: 'شهادات صادرة', accent: 'secondary.main' },
    { icon: <LocalHospitalIcon />, value: overview?.suspected_cases ?? 0, label: 'حالات مشتبه بها', accent: 'error.main' },
    { icon: <HealthAndSafetyIcon />, value: overview?.active_isolation ?? 0, label: 'عزل نشط', accent: 'warning.main' },
    { icon: <WarningAmberIcon />, value: overview?.open_emergencies ?? 0, label: 'طوارئ مفتوحة', accent: 'error.main' },
  ];

  return (
    <Stack spacing={2.5}>
      <DashboardHero
        eyebrow="لوحة المؤشرات — صحة الموانئ"
        title={`مرحباً، ${user?.full_name || 'المشرف'}`}
        subtitle="مؤشرات الحجر الصحي في الموانئ البحرية وفق لوائح الصحة الدولية IHR 2005"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        gradient="ocean"
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={1.5}>
        {cards.map((c, i) => (
          <Grid item xs={6} sm={4} md={3} key={i}>
            <KpiCard icon={<Box color="inherit">{c.icon}</Box>} value={c.value} label={c.label} accent={c.accent} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

const VesselsTab = () => {
  const t = useServerTable<Vessel>({ fetchData: getVessels });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `port-vessels-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['السفينة', 'رقم IMO', 'العلم', 'الشركة', 'النوع', 'الحالة', 'الوصول'],
    mapRow: (row: Vessel) => [row.vessel_name, row.imo_number, row.flag_state, row.shipping_company, vesselType[row.vessel_type]?.label || row.vessel_type, vesselStatus[row.status]?.label || row.status, row.arrival_date || ''],
    message: 'تم تصدير السفن',
  });
  return (
    <DataTable<Vessel>
      columns={[
        { key: 'vessel_name', label: 'اسم السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name}</Typography> },
        { key: 'imo_number', label: 'رقم IMO', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.imo_number}</Typography>, hideOnMobile: true },
        { key: 'flag_state', label: 'العلم', hideOnMobile: true },
        { key: 'shipping_company', label: 'الشركة', render: (r) => r.shipping_company || '—', hideOnMobile: true },
        { key: 'vessel_type', label: 'النوع', render: (r) => { const m = vesselType[r.vessel_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.vessel_type; }, hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = vesselStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'arrival_date', label: 'الوصول', render: (r) => r.arrival_date ? formatDate(r.arrival_date) : '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="السفن" subtitle={`${t.count} سفينة`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو رقم IMO أو العلم..."
      filters={[{ key: 'status', label: 'الحالة', options: Object.entries(vesselStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
      emptyTitle="لا توجد سفن" emptyDescription="السفن القادمة والمغادرة تظهر هنا"
    />
  );
};

const SeaPortsTab = () => {
  const t = useServerTable<SeaPort>({ fetchData: getSeaPorts });
  return (
    <DataTable<SeaPort>
      columns={[
        { key: 'code', label: 'الكود', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.code}</Typography> },
        { key: 'name_ar', label: 'الميناء' },
        { key: 'location', label: 'الموقع', render: (r) => r.location || '—', hideOnMobile: true },
        { key: 'capacity', label: 'الطاقة الاستيعابية', render: (r) => r.capacity ?? '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الموانئ البحرية" subtitle={`${t.count} ميناء`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو الكود..."
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد موانئ" emptyDescription="موانئ بورتسودان وسواكن ومحطات الحجر الصحي تظهر هنا"
    />
  );
};

const CrewTab = () => {
  const t = useServerTable<CrewMember>({ fetchData: getCrewMembers });
  return (
    <DataTable<CrewMember>
      columns={[
        { key: 'full_name', label: 'عضو الطاقم', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.full_name}</Typography> },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'nationality', label: 'الجنسية', render: (r) => r.nationality || '—', hideOnMobile: true },
        { key: 'job_title', label: 'الوظيفة', render: (r) => r.job_title || '—', hideOnMobile: true },
        { key: 'health_status', label: 'الحالة الصحية', render: (r) => { const m = crewHealthStatus[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
        { key: 'temperature', label: 'الحرارة', render: (r) => (r.temperature != null ? `${r.temperature}°` : '—'), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="أفراد الطاقم" subtitle={`${t.count} فرد`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو الجواز..."
      filters={[{ key: 'health_status', label: 'الحالة', options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('health_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا يوجد طاقم" emptyDescription="أفراد طاقم السفن يظهرون هنا"
    />
  );
};

const PassengersTab = () => {
  const t = useServerTable<Passenger>({ fetchData: getPassengers });
  return (
    <DataTable<Passenger>
      columns={[
        { key: 'full_name', label: 'الراكب', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.full_name}</Typography> },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'nationality', label: 'الجنسية', render: (r) => r.nationality || '—', hideOnMobile: true },
        { key: 'cabin_number', label: 'المقصورة', render: (r) => r.cabin_number || '—', hideOnMobile: true },
        { key: 'health_status', label: 'الحالة الصحية', render: (r) => { const m = crewHealthStatus[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الركاب" subtitle={`${t.count} راكب`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو الجواز..."
      filters={[{ key: 'health_status', label: 'الحالة', options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('health_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا يوجد ركاب" emptyDescription="ركاب السفن يظهرون هنا"
    />
  );
};

const DeclarationsTab = () => {
  const t = useServerTable<HealthDeclaration>({ fetchData: getHealthDeclarations });
  return (
    <DataTable<HealthDeclaration>
      columns={[
        { key: 'vessel_name', label: 'السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'captain_name', label: 'الربان', hideOnMobile: true },
        { key: 'declaration_date', label: 'التاريخ', render: (r) => formatDate(r.declaration_date), hideOnMobile: true },
        { key: 'illness_on_board', label: 'حالات مرضية', render: (r) => (r.illness_on_board ? 'نعم' : 'لا'), hideOnMobile: true },
        { key: 'deaths_on_board', label: 'الوفيات', render: (r) => r.deaths_on_board, hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = declarationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الإقرارات الصحية البحرية" subtitle={`${t.count} إقرار`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالسفينة أو الربان..."
      filters={[{ key: 'status', label: 'الحالة', options: Object.entries(declarationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد إقرارات" emptyDescription="الإقرارات الصحية (MDH) المقدمة من ربان السفينة تظهر هنا"
    />
  );
};

const InspectionsTab = () => {
  const t = useServerTable<ShipInspection>({ fetchData: getShipInspections });
  return (
    <DataTable<ShipInspection>
      columns={[
        { key: 'vessel_name', label: 'السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: 'المفتش', render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'cleanliness_status', label: 'النظافة', render: (r) => <StatusChip label={r.cleanliness_status === 'COMPLIANT' ? 'مطابق' : 'غير مطابق'} tone={r.cleanliness_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'overall_status', label: 'الحالة العامة', render: (r) => { const m = inspectionOverall[r.overall_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status; } },
        { key: 'certificate_issued', label: 'الشهادة', render: (r) => (r.certificate_issued ? 'نعم' : 'لا'), hideOnMobile: true },
        { key: 'inspection_date', label: 'تاريخ التفتيش', render: (r) => formatDateTime(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="التفتيش الصحي للسفن" subtitle={`${t.count} تفتيش`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالسفينة..."
      filters={[{ key: 'overall_status', label: 'الحالة', options: Object.entries(inspectionOverall).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('overall_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد تفتيشات" emptyDescription="تفتيش أماكن الإقامة والمطابخ والمخازن والعيادة تظهر هنا"
    />
  );
};

const FoodWaterTab = () => {
  const t = useServerTable<FoodWaterInspection>({ fetchData: getFoodWaterInspections });
  return (
    <DataTable<FoodWaterInspection>
      columns={[
        { key: 'vessel_name', label: 'السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: 'المفتش', render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'food_safety_status', label: 'سلامة الأغذية', render: (r) => <StatusChip label={r.food_safety_status === 'COMPLIANT' ? 'مطابق' : 'غير مطابق'} tone={r.food_safety_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'samples_collected', label: 'العينات', render: (r) => r.samples_collected },
        { key: 'sample_status', label: 'حالة العينات', render: (r) => { const m = sampleSendStatus[r.sample_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.sample_status; } },
        { key: 'inspection_date', label: 'التاريخ', render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="تفتيش الأغذية والمياه" subtitle={`${t.count} تفتيش`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالسفينة..."
      filters={[{ key: 'sample_status', label: 'حالة العينات', options: Object.entries(sampleSendStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('sample_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد تفتيشات أغذية" emptyDescription="تفتيش الأغذية ومياه الشرب على متن السفن يظهر هنا"
    />
  );
};

const SanitationCertTab = () => {
  const t = useServerTable<SanitationCertificate>({ fetchData: getSanitationCertificates });
  return (
    <DataTable<SanitationCertificate>
      columns={[
        { key: 'certificate_number', label: 'رقم الشهادة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.certificate_number}</Typography> },
        { key: 'certificate_type', label: 'النوع', render: (r) => { const m = sanitationCertType[r.certificate_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.certificate_type; } },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'issue_date', label: 'الإصدار', render: (r) => formatDate(r.issue_date), hideOnMobile: true },
        { key: 'expiry_date', label: 'الانتهاء', render: (r) => formatDate(r.expiry_date), hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = certificateStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="شهادات صحة السفن" subtitle={`${t.count} شهادة`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث برقم الشهادة..."
      filters={[
        { key: 'certificate_type', label: 'النوع', options: Object.entries(sanitationCertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('certificate_type', v) },
        { key: 'status', label: 'الحالة', options: Object.entries(certificateStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد شهادات" emptyDescription="شهادات SSCC و SSCEC تظهر هنا"
    />
  );
};

const IsolationTab = () => {
  const t = useServerTable<IsolationRecord>({ fetchData: getIsolationRecords });
  return (
    <DataTable<IsolationRecord>
      columns={[
        { key: 'person_name', label: 'الحالة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.person_name}</Typography> },
        { key: 'person_type', label: 'النوع', render: (r) => { const m = personType[r.person_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.person_type; } },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'start_date', label: 'البداية', render: (r) => formatDate(r.start_date), hideOnMobile: true },
        { key: 'end_date', label: 'النهاية', render: (r) => r.end_date ? formatDate(r.end_date) : '—', hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = isolationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="العزل والحجر الصحي" subtitle={`${t.count} سجل`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو السفينة..."
      filters={[{ key: 'status', label: 'الحالة', options: Object.entries(isolationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد سجلات عزل" emptyDescription="حالات العزل والحجر الصحي على السفن تظهر هنا"
    />
  );
};

const SurveillanceTab = () => {
  const t = useServerTable<SurveillanceCase>({ fetchData: getSurveillanceCases });
  return (
    <DataTable<SurveillanceCase>
      columns={[
        { key: 'disease_name', label: 'المرض', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.disease_name}</Typography> },
        { key: 'person_name', label: 'الحالة', hideOnMobile: true },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'report_date', label: 'البلاغ', render: (r) => formatDate(r.report_date), hideOnMobile: true },
        { key: 'international_alert', label: 'تنبيه دولي', render: (r) => (r.international_alert ? 'نعم' : 'لا'), hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = surveillanceStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الترصد الوبائي" subtitle={`${t.count} حالة`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالمرض أو الحالة..."
      filters={[{ key: 'status', label: 'الحالة', options: Object.entries(surveillanceStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد حالات" emptyDescription="حالات الترصد الوبائي في الموانئ تظهر هنا"
    />
  );
};

const VectorTab = () => {
  const t = useServerTable<VectorControl>({ fetchData: getVectorControls });
  return (
    <DataTable<VectorControl>
      columns={[
        { key: 'vessel_name', label: 'السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'control_type', label: 'النوع', render: (r) => { const m = vectorControlType[r.control_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.control_type; } },
        { key: 'evidence_found', label: 'دلائل', render: (r) => (r.evidence_found ? 'نعم' : 'لا'), hideOnMobile: true },
        { key: 'treatment_applied', label: 'المكافحة', render: (r) => (r.treatment_applied ? 'نُفذت' : 'لا'), hideOnMobile: true },
        { key: 'campaign_name', label: 'الحملة', render: (r) => r.campaign_name || '—', hideOnMobile: true },
        { key: 'inspection_date', label: 'التاريخ', render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="ترصد ومكافحة النواقل" subtitle={`${t.count} سجل`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالسفينة أو الحملة..."
      filters={[{ key: 'control_type', label: 'النوع', options: Object.entries(vectorControlType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('control_type', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد سجلات نواقل" emptyDescription="ترصد ومكافحة البعوض والقوارض والحشرات تظهر هنا"
    />
  );
};

const CargoTab = () => {
  const t = useServerTable<CargoInspection>({ fetchData: getCargoInspections });
  return (
    <DataTable<CargoInspection>
      columns={[
        { key: 'declaration_number', label: 'رقم الإقرار', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.declaration_number || '—'}</Typography> },
        { key: 'cargo_type', label: 'النوع', render: (r) => { const m = cargoType[r.cargo_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.cargo_type; } },
        { key: 'country_of_origin', label: 'بلد المنشأ', render: (r) => r.country_of_origin || '—', hideOnMobile: true },
        { key: 'status', label: 'حالة الفحص', render: (r) => { const m = cargoStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'decision', label: 'القرار', render: (r) => r.decision || '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="تفتيش الشحنات" subtitle={`${t.count} شحنة`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث برقم الإقرار أو المنشأ..."
      filters={[
        { key: 'cargo_type', label: 'النوع', options: Object.entries(cargoType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('cargo_type', v) },
        { key: 'status', label: 'الحالة', options: Object.entries(cargoStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد شحنات" emptyDescription="تفتيش الأغذية والأدوية والمواد الكيميائية على السفن يظهر هنا"
    />
  );
};

const WasteTab = () => {
  const t = useServerTable<WasteInspection>({ fetchData: getWasteInspections });
  return (
    <DataTable<WasteInspection>
      columns={[
        { key: 'vessel_name', label: 'السفينة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: 'المفتش', render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'medical_waste_status', label: 'النفايات الطبية', render: (r) => <StatusChip label={r.medical_waste_status === 'COMPLIANT' ? 'مطابق' : 'غير مطابق'} tone={r.medical_waste_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'wastewater_status', label: 'مياه الصرف', render: (r) => <StatusChip label={r.wastewater_status === 'COMPLIANT' ? 'مطابق' : 'غير مطابق'} tone={r.wastewater_status === 'COMPLIANT' ? 'success' : 'error'} /> },
        { key: 'inspection_date', label: 'التاريخ', render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="تفتيش النفايات" subtitle={`${t.count} تفتيش`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالسفينة..."
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد تفتيشات نفايات" emptyDescription="النفايات الطبية والغذائية ومياه الصرف على السفن تظهر هنا"
    />
  );
};

const EmergenciesTab = () => {
  const t = useServerTable<PortEmergency>({ fetchData: getPortEmergencies });
  return (
    <DataTable<PortEmergency>
      columns={[
        { key: 'title', label: 'العنوان', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography> },
        { key: 'port_name', label: 'الميناء', render: (r) => r.port_name || '—', hideOnMobile: true },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'severity', label: 'الخطورة', render: (r) => { const m = emergencySeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
        { key: 'vessel_restricted', label: 'تقييد الحركة', render: (r) => (r.vessel_restricted ? 'نعم' : 'لا'), hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = emergencyStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'reported_at', label: 'البلاغ', render: (r) => formatDateTime(r.reported_at), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الطوارئ الصحية" subtitle={`${t.count} طوارئ`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالعنوان..."
      filters={[
        { key: 'severity', label: 'الخطورة', options: Object.entries(emergencySeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('severity', v) },
        { key: 'status', label: 'الحالة', options: Object.entries(emergencyStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد طوارئ" emptyDescription="البلاغات الصحية والاستجابة السريعة في الموانئ تظهر هنا"
    />
  );
};

const HealthCertsTab = () => {
  const t = useServerTable<HealthCertificate>({ fetchData: getHealthCertificates });
  return (
    <DataTable<HealthCertificate>
      columns={[
        { key: 'certificate_number', label: 'رقم الشهادة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.certificate_number}</Typography> },
        { key: 'certificate_type', label: 'النوع', render: (r) => { const m = healthCertType[r.certificate_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.certificate_type; } },
        { key: 'vessel_name', label: 'السفينة', render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'issue_date', label: 'الإصدار', render: (r) => formatDate(r.issue_date), hideOnMobile: true },
        { key: 'expiry_date', label: 'الانتهاء', render: (r) => r.expiry_date ? formatDate(r.expiry_date) : '—', hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => { const m = certificateStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="الشهادات الصحية" subtitle={`${t.count} شهادة`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث برقم الشهادة..."
      filters={[
        { key: 'certificate_type', label: 'النوع', options: Object.entries(healthCertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('certificate_type', v) },
        { key: 'status', label: 'الحالة', options: Object.entries(certificateStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد شهادات" emptyDescription="شهادات صحة السفينة والتفتيش والإفراج الصحي تظهر هنا"
    />
  );
};

const PortHealthPage = () => {
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  return (
    <Box>
      <PageHeader
        title="صحة الموانئ"
        subtitle="إدارة الحجر الصحي في الموانئ البحرية — السفن والطاقم والركاب والتفتيش والشهادات وفق IHR 2005"
        eyebrow="العمليات"
      />
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DashboardTab />
          </Box>
          <Box component="section" ref={register('seaports')} data-section="seaports" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <SeaPortsTab />
          </Box>
          <Box component="section" ref={register('vessels')} data-section="vessels" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <VesselsTab />
          </Box>
          <Box component="section" ref={register('crew')} data-section="crew" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <CrewTab />
          </Box>
          <Box component="section" ref={register('passengers')} data-section="passengers" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <PassengersTab />
          </Box>
          <Box component="section" ref={register('declarations')} data-section="declarations" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DeclarationsTab />
          </Box>
          <Box component="section" ref={register('inspections')} data-section="inspections" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <InspectionsTab />
          </Box>
          <Box component="section" ref={register('ship-inspection')} data-section="ship-inspection" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ShipInspectionForm />
          </Box>
          <Box component="section" ref={register('food-water')} data-section="food-water" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <FoodWaterTab />
          </Box>
          <Box component="section" ref={register('sanitation')} data-section="sanitation" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <SanitationCertTab />
          </Box>
          <Box component="section" ref={register('isolation')} data-section="isolation" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <IsolationTab />
          </Box>
          <Box component="section" ref={register('surveillance')} data-section="surveillance" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <SurveillanceTab />
          </Box>
          <Box component="section" ref={register('vectors')} data-section="vectors" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <VectorTab />
          </Box>
          <Box component="section" ref={register('cargo')} data-section="cargo" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <CargoTab />
          </Box>
          <Box component="section" ref={register('waste')} data-section="waste" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <WasteTab />
          </Box>
          <Box component="section" ref={register('emergencies')} data-section="emergencies" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <EmergenciesTab />
          </Box>
          <Box component="section" ref={register('health-certs')} data-section="health-certs" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <HealthCertsTab />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PortHealthPage;