import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
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
import { notifyError, notifySuccess } from '../../utils/toast';
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
  submitDeclarationReview,
  approveDeclaration,
  rejectDeclaration,
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

const getSections = (t: (key: string) => string) => [
  { id: 'dashboard', label: t('borders.portHealth.nav.dashboard'), icon: <AnchorIcon fontSize="small" /> },
  { id: 'seaports', label: t('borders.portHealth.nav.seaports'), icon: <AnchorIcon fontSize="small" /> },
  { id: 'vessels', label: t('borders.portHealth.nav.vessels'), icon: <DirectionsBoatIcon fontSize="small" /> },
  { id: 'crew', label: t('borders.portHealth.nav.crew'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'passengers', label: t('borders.portHealth.nav.passengers'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'declarations', label: t('borders.portHealth.nav.declarations'), icon: <AssignmentIcon fontSize="small" /> },
  { id: 'inspections', label: t('borders.portHealth.nav.inspections'), icon: <BiotechIcon fontSize="small" /> },
  { id: 'ship-inspection', label: t('borders.portHealth.nav.shipInspection'), icon: <FactCheckIcon fontSize="small" /> },
  { id: 'food-water', label: t('borders.portHealth.nav.foodWater'), icon: <RestaurantIcon fontSize="small" /> },
  { id: 'sanitation', label: t('borders.portHealth.nav.sanitation'), icon: <VerifiedIcon fontSize="small" /> },
  { id: 'isolation', label: t('borders.portHealth.nav.isolation'), icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'surveillance', label: t('borders.portHealth.nav.surveillance'), icon: <LocalHospitalIcon fontSize="small" /> },
  { id: 'vectors', label: t('borders.portHealth.nav.vectors'), icon: <PestControlIcon fontSize="small" /> },
  { id: 'cargo', label: t('borders.portHealth.nav.cargo'), icon: <Inventory2Icon fontSize="small" /> },
  { id: 'waste', label: t('borders.portHealth.nav.waste'), icon: <DeleteSweepIcon fontSize="small" /> },
  { id: 'emergencies', label: t('borders.portHealth.nav.emergencies'), icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'health-certs', label: t('borders.portHealth.nav.healthCerts'), icon: <BadgeIcon fontSize="small" /> },
] as const;

const DashboardTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [overview, setOverview] = useState<PortHealthOverview | null>(null);
  useEffect(() => {
    getPortHealthOverview().then((r) => setOverview(r.data.data)).catch(() => undefined);
  }, []);

  const cards = [
    { icon: <AnchorIcon />, value: overview?.seaports ?? 0, label: t('borders.portHealth.kpi.seaports'), accent: 'primary.main' },
    { icon: <DirectionsBoatIcon />, value: overview?.vessels ?? 0, label: t('borders.portHealth.kpi.totalVessels'), accent: 'info.main' },
    { icon: <DirectionsBoatIcon />, value: overview?.arrived_vessels ?? 0, label: t('borders.portHealth.kpi.arrivedVessels'), accent: 'primary.main' },
    { icon: <BiotechIcon />, value: overview?.inspections ?? 0, label: t('borders.portHealth.kpi.inspections'), accent: 'info.main' },
    { icon: <VerifiedIcon />, value: overview?.pending_certificates ?? 0, label: t('borders.portHealth.kpi.certificatesIssued'), accent: 'secondary.main' },
    { icon: <LocalHospitalIcon />, value: overview?.suspected_cases ?? 0, label: t('borders.portHealth.kpi.suspectedCases'), accent: 'error.main' },
    { icon: <HealthAndSafetyIcon />, value: overview?.active_isolation ?? 0, label: t('borders.portHealth.kpi.activeIsolation'), accent: 'warning.main' },
    { icon: <WarningAmberIcon />, value: overview?.open_emergencies ?? 0, label: t('borders.portHealth.kpi.openEmergencies'), accent: 'error.main' },
  ];

  return (
    <Stack spacing={2.5}>
      <DashboardHero
        eyebrow={t('borders.portHealth.dashboard.eyebrow')}
        title={`${t('borders.portHealth.dashboard.welcome')}${user?.full_name || t('borders.portHealth.dashboard.supervisor')}`}
        subtitle={t('borders.portHealth.subtitle')}
        avatarLabel={(user?.full_name || t('borders.portHealth.dashboard.avatar')).slice(0, 1)}
        gradient="ocean"
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('borders.portHealth.dashboard.live')}
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
  const { t: tt } = useTranslation();
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `port-vessels-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [tt('borders.portHealth.cols.vessel'), tt('borders.portHealth.cols.imo'), tt('borders.portHealth.cols.flag'), tt('borders.portHealth.cols.company'), tt('borders.portHealth.cols.type'), tt('borders.portHealth.cols.status'), tt('borders.portHealth.cols.arrival')],
    mapRow: (row: Vessel) => [row.vessel_name, row.imo_number, row.flag_state, row.shipping_company, vesselType[row.vessel_type]?.label || row.vessel_type, vesselStatus[row.status]?.label || row.status, row.arrival_date || ''],
    message: tt('borders.portHealth.tables.vessels.exported'),
  });
  return (
    <DataTable<Vessel>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vesselName'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name}</Typography> },
        { key: 'imo_number', label: tt('borders.portHealth.cols.imo'), render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.imo_number}</Typography>, hideOnMobile: true },
        { key: 'flag_state', label: tt('borders.portHealth.cols.flag'), hideOnMobile: true },
        { key: 'shipping_company', label: tt('borders.portHealth.cols.company'), render: (r) => r.shipping_company || '—', hideOnMobile: true },
        { key: 'vessel_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = vesselType[r.vessel_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.vessel_type; }, hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = vesselStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'arrival_date', label: tt('borders.portHealth.cols.arrival'), render: (r) => r.arrival_date ? formatDate(r.arrival_date) : '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.vessels.title')} subtitle={tt('borders.portHealth.tables.vessels.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.vessels.searchPlaceholder')}
      filters={[{ key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(vesselStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.vessels.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.vessels.emptyDescription')}
    />
  );
};

const SeaPortsTab = () => {
  const t = useServerTable<SeaPort>({ fetchData: getSeaPorts });
  const { t: tt } = useTranslation();
  return (
    <DataTable<SeaPort>
      columns={[
        { key: 'code', label: tt('borders.portHealth.cols.code'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.code}</Typography> },
        { key: 'name_ar', label: tt('borders.portHealth.cols.port') },
        { key: 'location', label: tt('borders.portHealth.cols.location'), render: (r) => r.location || '—', hideOnMobile: true },
        { key: 'capacity', label: tt('borders.portHealth.cols.capacity'), render: (r) => r.capacity ?? '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.seaports.title')} subtitle={tt('borders.portHealth.tables.seaports.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.seaports.searchPlaceholder')}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.seaports.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.seaports.emptyDescription')}
    />
  );
};

const CrewTab = () => {
  const t = useServerTable<CrewMember>({ fetchData: getCrewMembers });
  const { t: tt } = useTranslation();
  return (
    <DataTable<CrewMember>
      columns={[
        { key: 'full_name', label: tt('borders.portHealth.cols.crewMember'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.full_name}</Typography> },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'nationality', label: tt('borders.portHealth.cols.nationality'), render: (r) => r.nationality || '—', hideOnMobile: true },
        { key: 'job_title', label: tt('borders.portHealth.cols.jobTitle'), render: (r) => r.job_title || '—', hideOnMobile: true },
        { key: 'health_status', label: tt('borders.portHealth.cols.healthStatus'), render: (r) => { const m = crewHealthStatus[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
        { key: 'temperature', label: tt('borders.portHealth.cols.temperature'), render: (r) => (r.temperature != null ? `${r.temperature}°` : '—'), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.crew.title')} subtitle={tt('borders.portHealth.tables.crew.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.crew.searchPlaceholder')}
      filters={[{ key: 'health_status', label: tt('borders.portHealth.cols.status'), options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('health_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.crew.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.crew.emptyDescription')}
    />
  );
};

const PassengersTab = () => {
  const t = useServerTable<Passenger>({ fetchData: getPassengers });
  const { t: tt } = useTranslation();
  return (
    <DataTable<Passenger>
      columns={[
        { key: 'full_name', label: tt('borders.portHealth.cols.passenger'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.full_name}</Typography> },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'nationality', label: tt('borders.portHealth.cols.nationality'), render: (r) => r.nationality || '—', hideOnMobile: true },
        { key: 'cabin_number', label: tt('borders.portHealth.cols.cabin'), render: (r) => r.cabin_number || '—', hideOnMobile: true },
        { key: 'health_status', label: tt('borders.portHealth.cols.healthStatus'), render: (r) => { const m = crewHealthStatus[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.passengers.title')} subtitle={tt('borders.portHealth.tables.passengers.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.passengers.searchPlaceholder')}
      filters={[{ key: 'health_status', label: tt('borders.portHealth.cols.status'), options: Object.entries(crewHealthStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('health_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.passengers.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.passengers.emptyDescription')}
    />
  );
};

/**
 * Phase 1D-6B lifecycle actions. Only the transitions the frozen state machine
 * allows are offered: RECEIVED -> REVIEWED -> {APPROVED, REJECTED}. APPROVED and
 * REJECTED are terminal — a rejected declaration is never revived in place;
 * re-submission means creating a new declaration.
 */
const DeclarationActions = ({ row, onDone }: { row: HealthDeclaration; onDone: () => void }) => {
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { t: tt } = useTranslation();

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(okMsg);
      setRejectOpen(false);
      setReason('');
      onDone();
    } catch {
      notifyError(tt('borders.portHealth.messages.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (row.status !== 'RECEIVED' && row.status !== 'REVIEWED') return null;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {row.status === 'RECEIVED' && (
        <Button size="small" variant="outlined" disabled={busy}
          onClick={() => run(() => submitDeclarationReview(row.id), tt('borders.portHealth.messages.reviewStarted'))}>
          {tt('borders.portHealth.actions.startReview')}
        </Button>
      )}
      {row.status === 'REVIEWED' && (
        <>
          <Button size="small" variant="contained" color="success" disabled={busy}
            onClick={() => run(() => approveDeclaration(row.id), tt('borders.portHealth.messages.approved'))}>
            {tt('borders.portHealth.actions.approve')}
          </Button>
          <Button size="small" variant="outlined" color="error" disabled={busy || rejectOpen}
            onClick={() => setRejectOpen((v) => !v)}>
            {tt('borders.portHealth.actions.reject')}
          </Button>
        </>
      )}
      {rejectOpen && (
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" label={tt('borders.portHealth.actions.rejectReason')} value={reason}
            onChange={(e) => setReason(e.target.value)} />
          <Button size="small" variant="contained" color="error" disabled={busy || !reason.trim()}
            onClick={() => run(() => rejectDeclaration(row.id, reason.trim()), tt('borders.portHealth.messages.rejected'))}>
            {tt('borders.portHealth.actions.confirmReject')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
};

const DeclarationsTab = () => {
  const t = useServerTable<HealthDeclaration>({ fetchData: getHealthDeclarations });
  const { t: tt } = useTranslation();
  return (
    <DataTable<HealthDeclaration>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'captain_name', label: tt('borders.portHealth.cols.captain'), hideOnMobile: true },
        { key: 'declaration_date', label: tt('borders.portHealth.cols.date'), render: (r) => formatDate(r.declaration_date), hideOnMobile: true },
        { key: 'illness_on_board', label: tt('borders.portHealth.cols.illnesses'), render: (r) => (r.illness_on_board ? tt('borders.labels.yes') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'deaths_on_board', label: tt('borders.portHealth.cols.deaths'), render: (r) => r.deaths_on_board, hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = declarationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        {
          key: 'actions',
          label: tt('borders.portHealth.cols.actions'),
          render: (r) => <DeclarationActions row={r} onDone={t.refresh} />,
        },
        {
          key: 'reviewed',
          label: tt('borders.portHealth.cols.review'),
          hideOnMobile: true,
          render: (r) => (r.reviewed_by_name ? (
            <Typography variant="caption">{r.reviewed_by_name} · {r.reviewed_at ? formatDate(r.reviewed_at) : '—'}</Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">{r.rejection_reason || '—'}</Typography>
          )),
        },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.declarations.title')} subtitle={tt('borders.portHealth.tables.declarations.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.declarations.searchPlaceholder')}
      filters={[{ key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(declarationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.declarations.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.declarations.emptyDescription')}
    />
  );
};

const InspectionsTab = () => {
  const t = useServerTable<ShipInspection>({ fetchData: getShipInspections });
  const { t: tt } = useTranslation();
  return (
    <DataTable<ShipInspection>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: tt('borders.portHealth.cols.inspector'), render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'cleanliness_status', label: tt('borders.portHealth.cols.cleanliness'), render: (r) => <StatusChip label={r.cleanliness_status === 'COMPLIANT' ? tt('borders.portHealth.labels.compliant') : tt('borders.portHealth.labels.notCompliant')} tone={r.cleanliness_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'overall_status', label: tt('borders.portHealth.cols.overallStatus'), render: (r) => { const m = inspectionOverall[r.overall_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.overall_status; } },
        { key: 'certificate_issued', label: tt('borders.portHealth.cols.certificate'), render: (r) => (r.certificate_issued ? tt('borders.labels.yes') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'inspection_date', label: tt('borders.portHealth.cols.inspectionDate'), render: (r) => formatDateTime(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.inspections.title')} subtitle={tt('borders.portHealth.tables.inspections.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.inspections.searchPlaceholder')}
      filters={[{ key: 'overall_status', label: tt('borders.portHealth.cols.status'), options: Object.entries(inspectionOverall).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('overall_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.inspections.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.inspections.emptyDescription')}
    />
  );
};

const FoodWaterTab = () => {
  const t = useServerTable<FoodWaterInspection>({ fetchData: getFoodWaterInspections });
  const { t: tt } = useTranslation();
  return (
    <DataTable<FoodWaterInspection>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: tt('borders.portHealth.cols.inspector'), render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'food_safety_status', label: tt('borders.portHealth.cols.foodSafety'), render: (r) => <StatusChip label={r.food_safety_status === 'COMPLIANT' ? tt('borders.portHealth.labels.compliant') : tt('borders.portHealth.labels.notCompliant')} tone={r.food_safety_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'samples_collected', label: tt('borders.portHealth.cols.samples'), render: (r) => r.samples_collected },
        { key: 'sample_status', label: tt('borders.portHealth.cols.sampleStatus'), render: (r) => { const m = sampleSendStatus[r.sample_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.sample_status; } },
        { key: 'inspection_date', label: tt('borders.portHealth.cols.date'), render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.foodWater.title')} subtitle={tt('borders.portHealth.tables.foodWater.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.foodWater.searchPlaceholder')}
      filters={[{ key: 'sample_status', label: tt('borders.portHealth.cols.sampleStatus'), options: Object.entries(sampleSendStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('sample_status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.foodWater.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.foodWater.emptyDescription')}
    />
  );
};

const SanitationCertTab = () => {
  const t = useServerTable<SanitationCertificate>({ fetchData: getSanitationCertificates });
  const { t: tt } = useTranslation();
  return (
    <DataTable<SanitationCertificate>
      columns={[
        { key: 'certificate_number', label: tt('borders.portHealth.cols.certificateNumber'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.certificate_number}</Typography> },
        { key: 'certificate_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = sanitationCertType[r.certificate_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.certificate_type; } },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'issue_date', label: tt('borders.portHealth.cols.issueDate'), render: (r) => formatDate(r.issue_date), hideOnMobile: true },
        { key: 'expiry_date', label: tt('borders.portHealth.cols.expiryDate'), render: (r) => formatDate(r.expiry_date), hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = certificateStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.sanitation.title')} subtitle={tt('borders.portHealth.tables.sanitation.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.sanitation.searchPlaceholder')}
      filters={[
        { key: 'certificate_type', label: tt('borders.portHealth.cols.type'), options: Object.entries(sanitationCertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('certificate_type', v) },
        { key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(certificateStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.sanitation.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.sanitation.emptyDescription')}
    />
  );
};

const IsolationTab = () => {
  const t = useServerTable<IsolationRecord>({ fetchData: getIsolationRecords });
  const { t: tt } = useTranslation();
  return (
    <DataTable<IsolationRecord>
      columns={[
        { key: 'person_name', label: tt('borders.portHealth.cols.status'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.person_name}</Typography> },
        { key: 'person_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = personType[r.person_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.person_type; } },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'start_date', label: tt('borders.portHealth.cols.startDate'), render: (r) => formatDate(r.start_date), hideOnMobile: true },
        { key: 'end_date', label: tt('borders.portHealth.cols.endDate'), render: (r) => r.end_date ? formatDate(r.end_date) : '—', hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = isolationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.isolation.title')} subtitle={tt('borders.portHealth.tables.isolation.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.isolation.searchPlaceholder')}
      filters={[{ key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(isolationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.isolation.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.isolation.emptyDescription')}
    />
  );
};

const SurveillanceTab = () => {
  const t = useServerTable<SurveillanceCase>({ fetchData: getSurveillanceCases });
  const { t: tt } = useTranslation();
  return (
    <DataTable<SurveillanceCase>
      columns={[
        { key: 'disease_name', label: tt('borders.portHealth.cols.disease'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.disease_name}</Typography> },
        { key: 'person_name', label: tt('borders.portHealth.cols.status'), hideOnMobile: true },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'report_date', label: tt('borders.portHealth.cols.report'), render: (r) => formatDate(r.report_date), hideOnMobile: true },
        { key: 'international_alert', label: tt('borders.portHealth.cols.internationalAlert'), render: (r) => (r.international_alert ? tt('borders.labels.yes') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = surveillanceStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.surveillance.title')} subtitle={tt('borders.portHealth.tables.surveillance.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.surveillance.searchPlaceholder')}
      filters={[{ key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(surveillanceStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.surveillance.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.surveillance.emptyDescription')}
    />
  );
};

const VectorTab = () => {
  const t = useServerTable<VectorControl>({ fetchData: getVectorControls });
  const { t: tt } = useTranslation();
  return (
    <DataTable<VectorControl>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'control_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = vectorControlType[r.control_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.control_type; } },
        { key: 'evidence_found', label: tt('borders.portHealth.cols.evidence'), render: (r) => (r.evidence_found ? tt('borders.labels.yes') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'treatment_applied', label: tt('borders.portHealth.cols.treatment'), render: (r) => (r.treatment_applied ? tt('borders.portHealth.labels.done') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'campaign_name', label: tt('borders.portHealth.cols.campaign'), render: (r) => r.campaign_name || '—', hideOnMobile: true },
        { key: 'inspection_date', label: tt('borders.portHealth.cols.date'), render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.vectors.title')} subtitle={tt('borders.portHealth.tables.vectors.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.vectors.searchPlaceholder')}
      filters={[{ key: 'control_type', label: tt('borders.portHealth.cols.type'), options: Object.entries(vectorControlType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('control_type', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.vectors.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.vectors.emptyDescription')}
    />
  );
};

const CargoTab = () => {
  const t = useServerTable<CargoInspection>({ fetchData: getCargoInspections });
  const { t: tt } = useTranslation();
  return (
    <DataTable<CargoInspection>
      columns={[
        { key: 'declaration_number', label: tt('borders.portHealth.cols.declarationNumber'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.declaration_number || '—'}</Typography> },
        { key: 'cargo_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = cargoType[r.cargo_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.cargo_type; } },
        { key: 'country_of_origin', label: tt('borders.portHealth.cols.originCountry'), render: (r) => r.country_of_origin || '—', hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.inspectionStatus'), render: (r) => { const m = cargoStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'decision', label: tt('borders.portHealth.cols.decision'), render: (r) => r.decision || '—', hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.cargo.title')} subtitle={tt('borders.portHealth.tables.cargo.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.cargo.searchPlaceholder')}
      filters={[
        { key: 'cargo_type', label: tt('borders.portHealth.cols.type'), options: Object.entries(cargoType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('cargo_type', v) },
        { key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(cargoStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.cargo.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.cargo.emptyDescription')}
    />
  );
};

const WasteTab = () => {
  const t = useServerTable<WasteInspection>({ fetchData: getWasteInspections });
  const { t: tt } = useTranslation();
  return (
    <DataTable<WasteInspection>
      columns={[
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography> },
        { key: 'inspector_name', label: tt('borders.portHealth.cols.inspector'), render: (r) => r.inspector_name || '—', hideOnMobile: true },
        { key: 'medical_waste_status', label: tt('borders.portHealth.cols.medicalWaste'), render: (r) => <StatusChip label={r.medical_waste_status === 'COMPLIANT' ? tt('borders.portHealth.labels.compliant') : tt('borders.portHealth.labels.notCompliant')} tone={r.medical_waste_status === 'COMPLIANT' ? 'success' : 'error'} />, hideOnMobile: true },
        { key: 'wastewater_status', label: tt('borders.portHealth.cols.wastewater'), render: (r) => <StatusChip label={r.wastewater_status === 'COMPLIANT' ? tt('borders.portHealth.labels.compliant') : tt('borders.portHealth.labels.notCompliant')} tone={r.wastewater_status === 'COMPLIANT' ? 'success' : 'error'} /> },
        { key: 'inspection_date', label: tt('borders.portHealth.cols.date'), render: (r) => formatDate(r.inspection_date), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.waste.title')} subtitle={tt('borders.portHealth.tables.waste.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.waste.searchPlaceholder')}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.waste.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.waste.emptyDescription')}
    />
  );
};

const EmergenciesTab = () => {
  const t = useServerTable<PortEmergency>({ fetchData: getPortEmergencies });
  const { t: tt } = useTranslation();
  return (
    <DataTable<PortEmergency>
      columns={[
        { key: 'title', label: tt('borders.portHealth.cols.title'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography> },
        { key: 'port_name', label: tt('borders.portHealth.cols.port'), render: (r) => r.port_name || '—', hideOnMobile: true },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'severity', label: tt('borders.portHealth.cols.severity'), render: (r) => { const m = emergencySeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
        { key: 'vessel_restricted', label: tt('borders.portHealth.cols.vesselRestricted'), render: (r) => (r.vessel_restricted ? tt('borders.labels.yes') : tt('borders.labels.no')), hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = emergencyStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        { key: 'reported_at', label: tt('borders.portHealth.cols.report'), render: (r) => formatDateTime(r.reported_at), hideOnMobile: true },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.emergencies.title')} subtitle={tt('borders.portHealth.tables.emergencies.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.emergencies.searchPlaceholder')}
      filters={[
        { key: 'severity', label: tt('borders.portHealth.cols.severity'), options: Object.entries(emergencySeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('severity', v) },
        { key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(emergencyStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.emergencies.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.emergencies.emptyDescription')}
    />
  );
};

const HealthCertsTab = () => {
  const t = useServerTable<HealthCertificate>({ fetchData: getHealthCertificates });
  const { t: tt } = useTranslation();
  return (
    <DataTable<HealthCertificate>
      columns={[
        { key: 'certificate_number', label: tt('borders.portHealth.cols.certificateNumber'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.certificate_number}</Typography> },
        { key: 'certificate_type', label: tt('borders.portHealth.cols.type'), render: (r) => { const m = healthCertType[r.certificate_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.certificate_type; } },
        { key: 'vessel_name', label: tt('borders.portHealth.cols.vessel'), render: (r) => r.vessel_name || '—', hideOnMobile: true },
        { key: 'issue_date', label: tt('borders.portHealth.cols.issueDate'), render: (r) => formatDate(r.issue_date), hideOnMobile: true },
        { key: 'expiry_date', label: tt('borders.portHealth.cols.expiryDate'), render: (r) => r.expiry_date ? formatDate(r.expiry_date) : '—', hideOnMobile: true },
        { key: 'status', label: tt('borders.portHealth.cols.status'), render: (r) => { const m = certificateStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title={tt('borders.portHealth.tables.healthCerts.title')} subtitle={tt('borders.portHealth.tables.healthCerts.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder={tt('borders.portHealth.tables.healthCerts.searchPlaceholder')}
      filters={[
        { key: 'certificate_type', label: tt('borders.portHealth.cols.type'), options: Object.entries(healthCertType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('certificate_type', v) },
        { key: 'status', label: tt('borders.portHealth.cols.status'), options: Object.entries(certificateStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
      ]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle={tt('borders.portHealth.tables.healthCerts.emptyTitle')} emptyDescription={tt('borders.portHealth.tables.healthCerts.emptyDescription')}
    />
  );
};

const PortHealthPage = () => {
  const { t } = useTranslation();
  const SECTIONS = useMemo(() => getSections(t) as unknown as CommandSectionDef[], [t]);
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  return (
    <Box>
      <PageHeader
        title={t('borders.portHealth.title')}
        subtitle={t('borders.portHealth.subtitle')}
        eyebrow={t('borders.portHealth.eyebrow')}
      />
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('borders.portHealth.dashboard.eyebrow')}
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