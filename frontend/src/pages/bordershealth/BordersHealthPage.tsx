import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import PublicIcon from '@mui/icons-material/Public';
import GroupsIcon from '@mui/icons-material/Groups';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BiotechIcon from '@mui/icons-material/Biotech';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CoronaIcon from '@mui/icons-material/Coronavirus';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import {
  changeCrossingStatus,
  decideCargoInspection,
  getBorderStaff,
  getBordersHealthOverview,
  getCargoInspections,
  getCertificates,
  getContactTracingCases,
  getContacts,
  getCrossingPerformance,
  getCrossings,
  getDeclarations,
  refreshDailyStatistics,
  getDailyStatistics,
  getNotifications,
  getDecisions,
  getEmergencies,
  getFacilities,
  getIncidents,
  getIsolationCases,
  getQuarantineCases,
  getSamples,
  getScreenings,
  getShifts,
  getTrafficTrend,
  getTravelerRecords,
  getVehicleInspections,
  getVehicles,
  issueCertificate,
  reassessScreening,
} from '../../api/endpoints/bordersHealth';
import type {
  BorderCertificate,
  BorderCrossing,
  BorderNotification,
  BorderDecision,
  BorderDailyStatistics,
  BorderEmergency,
  BorderFacility,
  BorderHealthIncident,
  BorderSample,
  BorderScreening,
  BorderShift,
  BorderStaff,
  BordersHealthOverview,
  CargoInspection,
  Contact,
  ContactTracingCase,
  CrossingPerformanceRow,
  HealthDeclaration,
  IsolationCase,
  QuarantineCase,
  TrafficTrendRow,
  TravelerHealthRecord,
  Vehicle,
  VehicleInspection,
} from '../../types/bordersHealth';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import {
  borderIncidentSeverity,
  borderNotificationDeliveryStatus,
  borderNotificationChannel,
  borderDecisionOutcome,
  borderIncidentStatus,
  borderInspectionType,
  borderOperatingStatus,
  borderRiskLevel,
  borderSampleStatus,
  borderScreeningDecision,
  borderShiftType,
  borderTravelerDecision,
  borderCertificateStatus,
  borderCertificateType,
  borderCargoOutcome,
  borderCargoScope,
  borderCargoStatus,
  borderComplianceStatus,
  borderContactStatus,
  borderContactTracingStatus,
  borderDeclarationStatus,
  borderFacilityKind,
  borderInspectionOverall,
  borderIsolationStatus,
  borderQuarantinePhase,
  borderQuarantineStatus,
  borderRestrictionLevel,
  borderTravelDirection,
  borderVehicleStatus,
  borderVehicleType,
} from '../../utils/status';

const getSections = (t: (key: string) => string) => [
  { id: 'dashboard', label: t('borders.bordersHealth.sections.dashboard'), icon: <PublicIcon fontSize="small" /> },
  { id: 'crossings', label: t('borders.bordersHealth.sections.crossings'), icon: <PublicIcon fontSize="small" /> },
  { id: 'facilities', label: t('borders.bordersHealth.sections.facilities'), icon: <ApartmentIcon fontSize="small" /> },
  { id: 'shifts', label: t('borders.bordersHealth.sections.shifts'), icon: <AssignmentIcon fontSize="small" /> },
  { id: 'staff', label: t('borders.bordersHealth.sections.staff'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'travelers', label: t('borders.bordersHealth.sections.travelers'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'declarations', label: t('borders.bordersHealth.sections.declarations'), icon: <AssignmentIcon fontSize="small" /> },
  { id: 'screenings', label: t('borders.bordersHealth.sections.screenings'), icon: <FactCheckOutlinedIcon fontSize="small" /> },
  { id: 'vehicles', label: t('borders.bordersHealth.sections.vehicles'), icon: <DirectionsBusIcon fontSize="small" /> },
  { id: 'vehicle-inspections', label: t('borders.bordersHealth.sections.vehicleInspections'), icon: <FactCheckIcon fontSize="small" /> },
  { id: 'cargo', label: t('borders.bordersHealth.sections.cargo'), icon: <LocalShippingIcon fontSize="small" /> },
  { id: 'samples', label: t('borders.bordersHealth.sections.samples'), icon: <BiotechIcon fontSize="small" /> },
  { id: 'quarantine', label: t('borders.bordersHealth.sections.quarantine'), icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'isolation', label: t('borders.bordersHealth.sections.isolation'), icon: <CoronaIcon fontSize="small" /> },
  { id: 'tracing', label: t('borders.bordersHealth.sections.tracing'), icon: <ContactMailIcon fontSize="small" /> },
  { id: 'emergencies', label: t('borders.bordersHealth.sections.emergencies'), icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'certificates', label: t('borders.bordersHealth.sections.certificates'), icon: <BadgeIcon fontSize="small" /> },
  { id: 'decisions', label: t('borders.bordersHealth.sections.decisions'), icon: <GavelIcon fontSize="small" /> },
  { id: 'notifications', label: t('borders.bordersHealth.sections.notifications'), icon: <NotificationsIcon fontSize="small" /> },
  { id: 'statistics', label: t('borders.bordersHealth.sections.statistics'), icon: <TrendingUpIcon fontSize="small" /> },
] as const;

const DashboardTab = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<BordersHealthOverview | null>(null);
  const [performance, setPerformance] = useState<CrossingPerformanceRow[]>([]);
  const [trend, setTrend] = useState<TrafficTrendRow[]>([]);

  useEffect(() => {
    getBordersHealthOverview().then((r) => setOverview(r.data.data)).catch(() => undefined);
    getCrossingPerformance()
      .then((r) => setPerformance(r.data.data.results ?? []))
      .catch(() => undefined);
    getTrafficTrend(7)
      .then((r) => setTrend(r.data.data.results ?? []))
      .catch(() => undefined);
  }, []);

  const inbound = trend.reduce((sum, row) => sum + (row.inbound ?? 0), 0);
  const outbound = trend.reduce((sum, row) => sum + (row.outbound ?? 0), 0);

  return (
    <Stack spacing={2.5}>
      <DashboardHero
        eyebrow={t('borders.bordersHealth.dashboard.eyebrow')}
        title={t('borders.bordersHealth.dashboard.title')}
        subtitle={t('borders.bordersHealth.dashboard.subtitle')}
        avatarLabel={t('borders.bordersHealth.dashboard.avatarLabel')}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PublicIcon />} value={overview?.open_crossings ?? 0} label={t('borders.bordersHealth.dashboard.kpi.openCrossings')} accent="success.main" hint={`${t('borders.bordersHealth.dashboard.kpi.from')} ${overview?.crossings ?? 0}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<GroupsIcon />} value={overview?.travelers_today ?? 0} label={t('borders.bordersHealth.dashboard.kpi.travelersToday')} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<DirectionsBusIcon />} value={overview?.vehicles_inspected ?? 0} label={t('borders.bordersHealth.dashboard.kpi.vehiclesInspected')} accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<LocalShippingIcon />} value={overview?.cargo_inspections ?? 0} label={t('borders.bordersHealth.dashboard.kpi.cargoInspections')} accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<HealthAndSafetyIcon />} value={overview?.active_quarantine ?? 0} label={t('borders.bordersHealth.dashboard.kpi.activeQuarantine')} accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<CoronaIcon />} value={overview?.active_isolation ?? 0} label={t('borders.bordersHealth.dashboard.kpi.activeIsolation')} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<WarningAmberIcon />} value={overview?.suspected_cases ?? 0} label={t('borders.bordersHealth.dashboard.kpi.suspectedCases')} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BadgeIcon />} value={overview?.certificates_issued ?? 0} label={t('borders.bordersHealth.dashboard.kpi.certificatesIssued')} accent="primary.main" />
        </Grid>
      </Grid>

      <DataTable<CrossingPerformanceRow>
        columns={[
          { key: 'entry_point__name_ar', label: t('borders.bordersHealth.dashboard.performance.cols.crossing'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.entry_point__name_ar}</Typography> },
          { key: 'entry_point__code', label: t('borders.bordersHealth.dashboard.performance.cols.code'), hideOnMobile: true, render: (r) => (
            <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.entry_point__code}</Typography>
          ) },
          { key: 'neighbor_country', label: t('borders.bordersHealth.dashboard.performance.cols.neighbor'), hideOnMobile: true, render: (r) => r.neighbor_country || '—' },
          { key: 'operating_status', label: t('borders.bordersHealth.dashboard.performance.cols.status'), render: (r) => (
            <StatusChip
              label={borderOperatingStatus[r.operating_status]?.label ?? r.operating_status}
              tone={borderOperatingStatus[r.operating_status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'records_count', label: t('borders.bordersHealth.dashboard.performance.cols.travelerFlow'), align: 'center', render: (r) => r.records_count },
          { key: 'vehicle_inspections_count', label: t('borders.bordersHealth.dashboard.performance.cols.vehicles'), align: 'center', hideOnMobile: true, render: (r) => r.vehicle_inspections_count },
          { key: 'cargo_count', label: t('borders.bordersHealth.dashboard.performance.cols.cargo'), align: 'center', hideOnMobile: true, render: (r) => r.cargo_count },
          { key: 'quarantine_count', label: t('borders.bordersHealth.dashboard.performance.cols.quarantine'), align: 'center', render: (r) => r.quarantine_count },
        ]}
        rows={performance}
        rowKey={(r) => r.id}
        count={performance.length}
        page={0}
        rowsPerPage={Math.max(performance.length, 10)}
        hidePagination
        title={t('borders.bordersHealth.dashboard.performance.title')}
        subtitle={t('borders.bordersHealth.dashboard.performance.subtitle')}
        emptyTitle={t('borders.bordersHealth.dashboard.performance.emptyTitle')}
        emptyDescription={t('borders.bordersHealth.dashboard.performance.emptyDescription')}
      />

      {trend.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('borders.bordersHealth.dashboard.trend.title')}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">
              {t('borders.bordersHealth.dashboard.trend.inbound')}: <b>{inbound.toLocaleString('ar')}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('borders.bordersHealth.dashboard.trend.outbound')}: <b>{outbound.toLocaleString('ar')}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('borders.bordersHealth.dashboard.trend.daysRecorded')}: <b>{trend.length}</b>
            </Typography>
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

const CrossingsTab = () => {
  const { t: translate } = useTranslation();
  const tt = useServerTable<BorderCrossing>({ fetchData: getCrossings });
  const { exporting, exportAll } = useTableExport(tt.fetchAllRows);
  const [statusTarget, setStatusTarget] = useState<BorderCrossing | null>(null);
  const [nextStatus, setNextStatus] = useState('CLOSED');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const applyStatus = async () => {
    if (!statusTarget || saving) return;
    setSaving(true);
    try {
      await changeCrossingStatus(statusTarget.id, nextStatus, reason || undefined);
      notifySuccess(translate('borders.bordersHealth.crossings.statusUpdated'));
      setStatusTarget(null);
      setReason('');
      tt.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, translate('borders.bordersHealth.crossings.statusUpdateFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DataTable<BorderCrossing>
        columns={[
          { key: 'name_ar', label: translate('borders.bordersHealth.crossings.cols.crossing'), render: (v) => (
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {v.entry_point_code}
              </Typography>
            </Stack>
          ) },
          { key: 'neighbor_country', label: translate('borders.bordersHealth.crossings.cols.neighbor'), hideOnMobile: true, render: (v) => v.neighbor_country || '—' },
          { key: 'neighbor_state', label: translate('borders.bordersHealth.crossings.cols.state'), hideOnMobile: true, render: (v) => v.neighbor_state || '—' },
          { key: 'operating_status', label: translate('borders.bordersHealth.crossings.cols.status'), render: (v) => (
            <StatusChip
              label={borderOperatingStatus[v.operating_status]?.label ?? v.operating_status}
              tone={borderOperatingStatus[v.operating_status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'daily_capacity', label: translate('borders.bordersHealth.crossings.cols.capacity'), align: 'center', hideOnMobile: true, render: (v) => v.daily_capacity?.toLocaleString('ar') ?? '—' },
          { key: 'has_laboratory', label: translate('borders.bordersHealth.crossings.cols.lab'), align: 'center', render: (v) => (
            <StatusChip label={v.has_laboratory ? translate('borders.labels.yes') : translate('borders.labels.no')} tone={v.has_laboratory ? 'success' : 'neutral'} />
          ) },
        ]}
        rows={tt.rows}
        rowKey={(v) => v.id}
        count={tt.count}
        page={tt.page}
        rowsPerPage={tt.rowsPerPage}
        pageSizeOptions={tt.pageSizeOptions}
        loading={tt.loading}
        error={tt.error}
        title={translate('borders.bordersHealth.crossings.title')}
        subtitle={translate('borders.bordersHealth.crossings.subtitle').replace('{count}', String(tt.count))}
        searchInput={tt.searchInput}
        onSearchChange={tt.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.crossings.searchPlaceholder')}
        filters={[
          {
            key: 'operating_status',
            label: translate('borders.bordersHealth.crossings.filterStatus'),
            options: Object.entries(borderOperatingStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => tt.setFilter('operating_status', v),
          },
        ]}
        onPageChange={tt.setPage}
        onRowsPerPageChange={tt.setRowsPerPage}
        onExport={() => exportAll({
          filename: 'border-crossings',
          headers: [translate('borders.bordersHealth.crossings.cols.code') || translate('borders.labels.code'), translate('borders.bordersHealth.crossings.cols.crossing'), translate('borders.bordersHealth.crossings.cols.neighbor'), translate('borders.bordersHealth.crossings.cols.status')],
          mapRow: (v: BorderCrossing) => [v.entry_point_code ?? '', v.name_ar ?? '', v.neighbor_country, v.operating_status],
          message: translate('borders.labels.export') || translate('borders.bordersHealth.crossings.exported'),
        })}
        exporting={exporting}
        onRefresh={tt.refresh}
        emptyTitle={translate('borders.bordersHealth.crossings.emptyTitle')}
        emptyDescription={translate('borders.bordersHealth.crossings.emptyDescription')}
        actions={(v) => (
          <Tooltip title={translate('borders.actions.changeStatus')}>
            <IconButton
              aria-label={translate('borders.actions.changeBorderStatus')}
              size="small"
              color="primary"
              onClick={() => { setStatusTarget(v); setNextStatus(v.operating_status); }}
              sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
            >
              <PublicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Dialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('borders.bordersHealth.dialogs.changeCrossing')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {statusTarget?.name_ar}
            </Typography>
            <TextField
              select
              fullWidth
              label={translate('borders.bordersHealth.dialogs.newStatus')}
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              {Object.entries(borderOperatingStatus).map(([value, meta]) => (
                <MenuItem key={value} value={value}>{meta.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label={translate('borders.bordersHealth.dialogs.reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusTarget(null)} sx={{ fontWeight: 700 }}>{translate('borders.actions.cancel')}</Button>
          <Button
            variant="contained"
            onClick={applyStatus}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {translate('borders.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const FacilitiesTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderFacility>({ fetchData: getFacilities });
  return (
    <DataTable<BorderFacility>
      columns={[
        { key: 'name_ar', label: translate('borders.bordersHealth.facilities.cols.name'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography> },
        { key: 'kind', label: translate('borders.bordersHealth.facilities.cols.type'), render: (v) => (
          <StatusChip
            label={borderFacilityKind[v.kind]?.label ?? v.kind}
            tone={borderFacilityKind[v.kind]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.facilities.cols.crossing'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'capacity', label: translate('borders.bordersHealth.facilities.cols.capacity'), align: 'center', render: (v) => v.capacity || '—' },
        { key: 'staff_count', label: translate('borders.bordersHealth.facilities.cols.staff'), align: 'center', hideOnMobile: true, render: (v) => v.staff_count || '—' },
        { key: 'is_operational', label: translate('borders.bordersHealth.facilities.cols.status'), render: (v) => (
          <StatusChip label={v.is_operational ? translate('borders.bordersHealth.common.operational') : translate('borders.bordersHealth.common.stopped')} tone={v.is_operational ? 'success' : 'error'} />
        ) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.facilities.title')}
      subtitle={translate('borders.bordersHealth.facilities.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.facilities.searchPlaceholder')}
      filters={[
        {
          key: 'kind',
          label: translate('borders.bordersHealth.facilities.filterKind'),
          options: Object.entries(borderFacilityKind).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('kind', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.facilities.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.facilities.emptyDescription')}
    />
  );
};

const ShiftsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderShift>({ fetchData: getShifts });
  return (
    <DataTable<BorderShift>
      columns={[
        { key: 'shift_date', label: translate('borders.bordersHealth.shifts.colsDate'), render: (v) => formatDate(v.shift_date) },
        { key: 'shift_type', label: translate('borders.bordersHealth.shifts.colsShiftType'), render: (v) => (
          <StatusChip
            label={borderShiftType[v.shift_type]?.label ?? v.shift_type}
            tone={borderShiftType[v.shift_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'started_at', label: translate('borders.bordersHealth.shifts.colsStart'), align: 'center', render: (v) => v.started_at || '—' },
        { key: 'ended_at', label: translate('borders.bordersHealth.shifts.colsEnd'), align: 'center', hideOnMobile: true, render: (v) => v.ended_at || '—' },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'supervisor_name', label: translate('borders.bordersHealth.shifts.colsSupervisor'), render: (v) => v.supervisor_name || '—' },
        { key: 'is_staffed', label: translate('borders.bordersHealth.shifts.colsIsStaffed'), render: (v) => (
          <StatusChip label={v.is_staffed ? translate('borders.labels.yes') : translate('borders.labels.no')} tone={v.is_staffed ? 'success' : 'warning'} />
        ) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.shifts.title')}
      subtitle={translate('borders.bordersHealth.shifts.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.shifts.searchPlaceholder')}
      filters={[
        {
          key: 'shift_type',
          label: translate('borders.bordersHealth.shifts.filterShiftType'),
          options: Object.entries(borderShiftType).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('shift_type', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.shifts.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.shifts.emptyDescription')}
    />
  );
};

const StaffTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderStaff>({ fetchData: getBorderStaff });
  return (
    <DataTable<BorderStaff>
      columns={[
        { key: 'user_name', label: translate('borders.bordersHealth.staff.colsUser'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.user_name}</Typography> },
        { key: 'role', label: translate('borders.bordersHealth.staff.colsRole'), render: (v) => v.role },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'assignment_type', label: translate('borders.bordersHealth.staff.colsAssignment'), hideOnMobile: true, render: (v) => v.assignment_type },
        { key: 'starts_on', label: translate('borders.bordersHealth.staff.colsStarts'), render: (v) => formatDate(v.starts_on) },
        { key: 'ends_on', label: translate('borders.bordersHealth.certificates.colsExpiryDate'), hideOnMobile: true, render: (v) => (v.ends_on ? formatDate(v.ends_on) : translate('borders.bordersHealth.statusLabels.ongoing')) },
        { key: 'is_active', label: translate('borders.bordersHealth.staff.colsIsActive'), render: (v) => (
          <StatusChip label={v.is_active ? translate('borders.bordersHealth.common.operational') : translate('borders.bordersHealth.common.ended')} tone={v.is_active ? 'success' : 'neutral'} />
        ) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.staff.title')}
      subtitle={translate('borders.bordersHealth.staff.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.staff.searchPlaceholder')}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.staff.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.staff.emptyDescription')}
    />
  );
};

const TravelersTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<TravelerHealthRecord>({ fetchData: getTravelerRecords });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  return (
    <DataTable<TravelerHealthRecord>
      columns={[
        { key: 'traveler_name', label: translate('borders.bordersHealth.travelers.colsTraveler'), render: (v) => (
          <Stack>
            <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.passport_number}
            </Typography>
          </Stack>
        ) },
        { key: 'direction', label: translate('borders.bordersHealth.travelers.colsDirection'), render: (v) => (
          <StatusChip
            label={borderTravelDirection[v.direction]?.label ?? v.direction}
            tone={borderTravelDirection[v.direction]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'entry_at', label: translate('borders.bordersHealth.travelers.colsEntryAt'), render: (v) => formatDateTime(v.entry_at) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'risk_level', label: translate('borders.bordersHealth.emergencies.colsSeverity'), render: (v) => (
          <StatusChip
            label={borderRiskLevel[v.risk_level]?.label ?? v.risk_level}
            tone={borderRiskLevel[v.risk_level]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'decision', label: translate('borders.bordersHealth.travelers.colsDecision'), render: (v) => (
          <StatusChip
            label={borderTravelerDecision[v.decision]?.label ?? v.decision}
            tone={borderTravelerDecision[v.decision]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'assessed_by_name', label: translate('borders.bordersHealth.travelers.colsAssessedBy'), hideOnMobile: true, render: (v) => v.assessed_by_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.travelers.title')}
      subtitle={translate('borders.bordersHealth.travelers.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.travelers.searchPlaceholder')}
      filters={[
        {
          key: 'direction',
          label: translate('borders.bordersHealth.travelers.colsDirection'),
          options: Object.entries(borderTravelDirection).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('direction', v),
        },
        {
          key: 'risk_level',
          label: translate('borders.bordersHealth.emergencies.colsSeverity'),
          options: Object.entries(borderRiskLevel).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('risk_level', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onExport={() => exportAll({
        filename: 'border-travelers',
        headers: [translate('borders.bordersHealth.travelers.cols.traveler'), translate('borders.bordersHealth.travelers.cols.traveler') === translate('borders.bordersHealth.travelers.colsTraveler') ? translate('borders.bordersHealth.tracing.colsPassportNumber') : 'Passport', translate('borders.bordersHealth.travelers.cols.direction'), translate('borders.bordersHealth.travelers.cols.risk'), translate('borders.bordersHealth.travelers.cols.decision')],
        mapRow: (v) => [v.traveler_name ?? '', v.passport_number ?? '', v.direction, v.risk_level, v.decision],
        message: translate('borders.bordersHealth.travelers.exported') || translate('borders.bordersHealth.travelers.exported'),
      })}
      exporting={exporting}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.travelers.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.travelers.emptyDescription')}
    />
  );
};

const DeclarationsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<HealthDeclaration>({ fetchData: getDeclarations });
  return (
    <DataTable<HealthDeclaration>
      columns={[
        { key: 'traveler_name', label: translate('borders.bordersHealth.travelers.colsTraveler'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography> },
        { key: 'departure_country', label: translate('borders.bordersHealth.declarations.colsDepartureCountry'), hideOnMobile: true, render: (v) => v.departure_country || '—' },
        { key: 'departure_date', label: translate('borders.bordersHealth.declarations.colsDepartureDate'), render: (v) => formatDate(v.departure_date) },
        { key: 'current_symptoms', label: translate('borders.bordersHealth.declarations.colsSymptoms'), render: (v) => v.current_symptoms || translate("borders.bordersHealth.declarations.colsSymptoms") },
        { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
          <StatusChip
            label={borderDeclarationStatus[v.status]?.label ?? v.status}
            tone={borderDeclarationStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'declared_at', label: translate('borders.bordersHealth.declarations.colsDeclaredAt'), hideOnMobile: true, render: (v) => formatDateTime(v.declared_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.declarations.title')}
      subtitle={translate('borders.bordersHealth.declarations.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.declarations.searchPlaceholder')}
      filters={[
        {
          key: 'status',
          label: translate('borders.bordersHealth.declarations.filterStatus'),
          options: Object.entries(borderDeclarationStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.declarations.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.declarations.emptyDescription')}
    />
  );
};

const ScreeningsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderScreening>({ fetchData: getScreenings });
  const [target, setTarget] = useState<BorderScreening | null>(null);
  const [temperature, setTemperature] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [busy, setBusy] = useState(false);

  // إعادة التقييم تعيد تشغيل قواعد القرار على قياسات جديدة دون إنشاء فحص.
  const reassess = useCallback(async () => {
    if (!target) return;
    setBusy(true);
    try {
      const body: Record<string, number> = {};
      if (temperature !== '') body.body_temperature = Number(temperature);
      if (oxygen !== '') body.oxygen_saturation = Number(oxygen);
      await reassessScreening(target.id, body);
      notifySuccess(translate('borders.bordersHealth.screenings.reassessed') || translate('borders.bordersHealth.screenings.reassessed'));
      setTarget(null);
      t.refresh();
    } catch (e) {
      notifyError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [target, temperature, oxygen, t, translate]);

  return (
    <>
    <DataTable<BorderScreening>
      columns={[
        { key: 'traveler_name', label: translate('borders.bordersHealth.travelers.colsTraveler'), render: (v) => (
          <Stack>
            <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.passport_number}
            </Typography>
          </Stack>
        ) },
        { key: 'body_temperature', label: translate('borders.bordersHealth.screenings.colsBodyTemperature'), align: 'center', render: (v) => (
          v.body_temperature ? `${v.body_temperature}°C` : '—'
        ) },
        { key: 'oxygen_saturation', label: translate('borders.bordersHealth.screenings.colsOxygenSaturation'), align: 'center', hideOnMobile: true, render: (v) => (
          v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'
        ) },
        { key: 'risk_level', label: translate('borders.bordersHealth.emergencies.colsSeverity'), render: (v) => (
          <StatusChip
            label={borderRiskLevel[v.risk_level]?.label ?? v.risk_level}
            tone={borderRiskLevel[v.risk_level]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'decision', label: translate('borders.bordersHealth.travelers.colsDecision'), render: (v) => (
          <StatusChip
            label={borderScreeningDecision[v.decision]?.label ?? v.decision}
            tone={borderScreeningDecision[v.decision]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'document_verified', label: translate('borders.bordersHealth.screenings.colsDocumentVerified'), align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip label={v.document_verified ? translate('borders.status.verified') || translate('borders.bordersHealth.screenings.statusVerified') : translate('borders.status.incomplete') || translate('borders.bordersHealth.screenings.statusIncomplete')} tone={v.document_verified ? 'success' : 'warning'} />
        ) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'screened_at', label: translate('borders.bordersHealth.screenings.colsScreenedAt'), hideOnMobile: true, render: (v) => formatDateTime(v.screened_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.screenings.title')}
      subtitle={translate('borders.bordersHealth.screenings.subtitle').replace('{count}', String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.travelers.searchPlaceholder')}
      filters={[
        {
          key: 'decision',
          label: translate('borders.bordersHealth.travelers.colsDecision'),
          options: Object.entries(borderScreeningDecision).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('decision', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.screenings.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.screenings.emptyDescription')}
      actions={(v) => (
        <Tooltip title={translate('borders.bordersHealth.screenings.tooltipReassess')}>
          <IconButton
            aria-label={translate('borders.bordersHealth.screenings.ariaReassess')}
            size="small"
            color="primary"
            onClick={() => {
              setTarget(v);
              setTemperature(v.body_temperature != null ? String(v.body_temperature) : '');
              setOxygen(v.oxygen_saturation != null ? String(v.oxygen_saturation) : '');
            }}
            sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    />

    <Dialog open={Boolean(target)} onClose={() => setTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{translate("borders.bordersHealth.screenings.dialogTitle")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {translate('borders.bordersHealth.screenings.ruleNote')}
            {translate("borders.bordersHealth.screenings.ruleNote")}
          </Typography>
          {target && (
            <Typography variant="body2">
              {target.traveler_name || '—'} · {translate('borders.bordersHealth.screenings.currentDecision')}{' '}
              <b>{borderScreeningDecision[target.decision]?.label ?? target.decision}</b>
            </Typography>
          )}
          <TextField
            label={translate('borders.bordersHealth.screenings.fields.temp')}
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            inputProps={{ step: '0.1' }}
          />
          <TextField
            label={translate('borders.bordersHealth.screenings.fields.oxygen')}
            type="number"
            value={oxygen}
            onChange={(e) => setOxygen(e.target.value)}
            inputProps={{ step: '1' }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={() => setTarget(null)} sx={{ fontWeight: 700 }}>{translate("borders.bordersHealth.screenings.cancelBtn")}</Button>
        <Button onClick={reassess} disabled={busy} variant="contained" sx={{ fontWeight: 700 }}>
          {busy ? translate('borders.bordersHealth.screenings.busy') : translate('borders.bordersHealth.screenings.reassessBtn')}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

const VehiclesTab = () => {
  const t = useServerTable<Vehicle>({ fetchData: getVehicles });
  const { t: translate } = useTranslation();
  return (
    <DataTable<Vehicle>
      columns={[
        { key: 'plate_number', label: translate('borders.bordersHealth.vehicles.colsPlate'), render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{v.plate_number}</Typography>
        ) },
        { key: 'vehicle_type', label: translate('borders.bordersHealth.vehicles.colsType'), render: (v) => (
          <StatusChip
            label={borderVehicleType[v.vehicle_type]?.label ?? v.vehicle_type}
            tone={borderVehicleType[v.vehicle_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'make_model', label: translate('borders.bordersHealth.vehicles.colsMakeModel'), hideOnMobile: true, render: (v) => v.make_model || '—' },
        { key: 'driver_name', label: translate('borders.bordersHealth.vehicles.colsDriver'), render: (v) => v.driver_name || '—' },
        { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
          <StatusChip
            label={borderVehicleStatus[v.status]?.label ?? v.status}
            tone={borderVehicleStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.vehicles.title')}
      subtitle={translate("borders.bordersHealth.vehicles.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.vehicles.searchPlaceholder')}
      filters={[
        {
          key: 'vehicle_type',
          label: translate('borders.bordersHealth.vehicles.filterType'),
          options: Object.entries(borderVehicleType).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('vehicle_type', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.vehicles.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.vehicles.emptyDescription')}
    />
  );
};

const VehicleInspectionsTab = () => {
  const { t: translate } = useTranslation();

  const t = useServerTable<VehicleInspection>({ fetchData: getVehicleInspections });
  return (
    <DataTable<VehicleInspection>
      columns={[
        { key: 'plate_number', label: translate('borders.bordersHealth.vehicles.colsPlate'), render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{v.plate_number || '—'}</Typography>
        ) },
        { key: 'inspection_type', label: translate('borders.bordersHealth.vehicleInspections.colsInspectionType'), render: (v) => (
          <StatusChip
            label={borderInspectionType[v.inspection_type]?.label ?? v.inspection_type}
            tone={borderInspectionType[v.inspection_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'cleanliness_status', label: translate('borders.bordersHealth.vehicleInspections.colsCleanliness'), align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip
            label={borderComplianceStatus[v.cleanliness_status]?.label ?? v.cleanliness_status}
            tone={borderComplianceStatus[v.cleanliness_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'pest_control_status', label: translate('borders.bordersHealth.vehicleInspections.colsPest'), align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip
            label={borderComplianceStatus[v.pest_control_status]?.label ?? v.pest_control_status}
            tone={borderComplianceStatus[v.pest_control_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'overall_status', label: translate('borders.bordersHealth.vehicleInspections.colsOverall'), render: (v) => (
          <StatusChip
            label={borderInspectionOverall[v.overall_status]?.label ?? v.overall_status}
            tone={borderInspectionOverall[v.overall_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'inspection_date', label: translate('borders.bordersHealth.shifts.colsDate'), hideOnMobile: true, render: (v) => formatDateTime(v.inspection_date) },
        { key: 'inspector_name', label: translate('borders.bordersHealth.vehicleInspections.colsInspector'), hideOnMobile: true, render: (v) => v.inspector_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.vehicleInspections.title')}
      subtitle={translate("borders.bordersHealth.vehicleInspections.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.vehicleInspections.searchPlaceholder')}
      filters={[
        {
          key: 'overall_status',
          label: translate('borders.bordersHealth.vehicleInspections.colsOverall'),
          options: Object.entries(borderInspectionOverall).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('overall_status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.vehicleInspections.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.vehicleInspections.emptyDescription')}
    />
  );
};

const CargoTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<CargoInspection>({ fetchData: getCargoInspections });
  const [target, setTarget] = useState<CargoInspection | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = useCallback(async (id: string, decision?: string) => {
    setBusy(true);
    try {
      await decideCargoInspection(id, decision);
      notifySuccess(translate('borders.bordersHealth.cargo.recorded') || translate('borders.bordersHealth.cargo.recorded'));
      setTarget(null);
      t.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, translate('borders.bordersHealth.cargo.failed') || translate('borders.bordersHealth.cargo.failed')));
    } finally {
      setBusy(false);
    }
  }, [t, translate]);

  return (
    <>
      <DataTable<CargoInspection>
        columns={[
          { key: 'declaration_number', label: translate('borders.bordersHealth.cargo.colsDeclarationNumber'), render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.declaration_number || '—'}</Typography>
          ) },
          { key: 'scope', label: translate('borders.bordersHealth.cargo.filterScope'), render: (v) => (
            <StatusChip
              label={borderCargoScope[v.scope]?.label ?? v.scope}
              tone={borderCargoScope[v.scope]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'product_type', label: translate('borders.bordersHealth.cargo.colsProductType'), render: (v) => v.product_type || '—' },
          { key: 'country_of_origin', label: translate('borders.bordersHealth.cargo.colsCountryOfOrigin'), hideOnMobile: true, render: (v) => v.country_of_origin || '—' },
          { key: 'plate_number', label: translate('borders.bordersHealth.vehicles.colsPlate'), hideOnMobile: true, render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', direction: 'ltr' }}>{v.plate_number || '—'}</Typography>
          ) },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderCargoStatus[v.status]?.label ?? v.status}
              tone={borderCargoStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'decision', label: translate('borders.bordersHealth.travelers.colsDecision'), render: (v) => (
            v.decision ? (
              <StatusChip
                label={borderCargoOutcome[v.decision]?.label ?? v.decision}
                tone={borderCargoOutcome[v.decision]?.tone ?? 'neutral'}
              />
            ) : '—'
          ) },
        ]}
        rows={t.rows}
        rowKey={(v) => v.id}
        count={t.count}
        page={t.page}
        rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions}
        loading={t.loading}
        error={t.error}
        title={translate('borders.bordersHealth.cargo.title')}
        subtitle={translate("borders.bordersHealth.cargo.subtitle").replace("{count}", String(t.count))}
        searchInput={t.searchInput}
        onSearchChange={t.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.cargo.searchPlaceholder')}
        filters={[
          {
            key: 'scope',
            label: translate('borders.bordersHealth.cargo.filterStatus'),
            options: Object.entries(borderCargoScope).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('scope', v),
          },
          {
            key: 'status',
            label: translate('borders.bordersHealth.tracing.colsStatus'),
            options: Object.entries(borderCargoStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('status', v),
          },
        ]}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onRefresh={t.refresh}
        emptyTitle={translate('borders.bordersHealth.cargo.emptyTitle')}
        emptyDescription={translate('borders.bordersHealth.cargo.emptyDescription')}
        actions={(v) => (
          <Tooltip title={translate('borders.bordersHealth.cargo.calcFromSamples')}>
            <IconButton
              aria-label={translate('borders.bordersHealth.cargo.dialogTitle')}
              size="small"
              color="primary"
              onClick={() => setTarget(v)}
              sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
            >
              <FactCheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('borders.bordersHealth.cargo.dialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {translate('borders.bordersHealth.cargo.note')}
            </Typography>
            {target && (
              <Typography variant="body2">
                {translate('borders.bordersHealth.cargo.declarationLabel')} <b>{target.declaration_number || '—'}</b> · {borderCargoScope[target.scope]?.label ?? target.scope}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setTarget(null)} sx={{ fontWeight: 700 }}>{translate('borders.actions.cancel')}</Button>
          {target && (
            <>
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => decide(target.id, 'REJECTED')}
                sx={{ fontWeight: 700 }}
              >
                {translate('borders.bordersHealth.cargo.reject')}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={busy}
                onClick={() => decide(target.id, 'HOLD')}
                sx={{ fontWeight: 700 }}
              >
                {translate('borders.bordersHealth.cargo.hold')}
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                onClick={() => decide(target.id)}
                sx={{ fontWeight: 700 }}
              >
                {translate('borders.bordersHealth.cargo.calcFromSamples')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

const SamplesTab = () => {
  const { t: translate } = useTranslation();

  const t = useServerTable<BorderSample>({ fetchData: getSamples });
  return (
    <DataTable<BorderSample>
      columns={[
        { key: 'sample_code', label: translate('borders.bordersHealth.samples.colsCode'), render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.sample_code || '—'}</Typography>
        ) },
        { key: 'sample_type', label: translate('borders.bordersHealth.samples.colsType'), render: (v) => v.sample_type },
        { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
          <StatusChip
            label={borderSampleStatus[v.status]?.label ?? v.status}
            tone={borderSampleStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'result', label: translate('borders.bordersHealth.decisions.colsOutcome'), render: (v) => v.result || '—' },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'collected_by_name', label: translate('borders.bordersHealth.samples.colsCollectedBy'), hideOnMobile: true, render: (v) => v.collected_by_name || '—' },
        { key: 'collected_at', label: translate('borders.bordersHealth.shifts.colsDate'), hideOnMobile: true, render: (v) => formatDateTime(v.collected_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.samples.title')}
      subtitle={translate("borders.bordersHealth.samples.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.samples.searchPlaceholder')}
      filters={[
        {
          key: 'status',
          label: translate('borders.bordersHealth.tracing.colsStatus'),
          options: Object.entries(borderSampleStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.samples.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.samples.emptyDescription')}
    />
  );
};

const QuarantineTab = () => {
  const { t: translate } = useTranslation();

  const t = useServerTable<QuarantineCase>({ fetchData: getQuarantineCases });
  return (
    <DataTable<QuarantineCase>
      columns={[
        { key: 'case_number', label: translate('borders.bordersHealth.quarantine.colsCaseNumber'), render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.case_number}</Typography>
        ) },
        { key: 'person_name', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => v.person_name || '—' },
        { key: 'entry_at', label: translate('borders.bordersHealth.quarantine.colsEntryAt'), render: (v) => formatDateTime(v.entry_at) },
        { key: 'required_days', label: translate('borders.bordersHealth.quarantine.colsRequiredDays'), align: 'center', hideOnMobile: true, render: (v) => `${v.required_days} ${translate('borders.bordersHealth.quarantine.colsRequiredDays')}` },
        { key: 'expected_end_date', label: translate('borders.bordersHealth.quarantine.colsExpectedEnd'), render: (v) => (v.expected_end_date ? formatDate(v.expected_end_date) : '—') },
        { key: 'phase', label: translate('borders.bordersHealth.quarantine.colsPhase'), render: (v) => (
          <StatusChip
            label={borderQuarantinePhase[v.phase]?.label ?? v.phase}
            tone={borderQuarantinePhase[v.phase]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
          <StatusChip
            label={borderQuarantineStatus[v.status]?.label ?? v.status}
            tone={borderQuarantineStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.quarantine.title')}
      subtitle={translate("borders.bordersHealth.quarantine.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.quarantine.searchPlaceholder')}
      filters={[
        {
          key: 'status',
          label: translate('borders.bordersHealth.tracing.colsStatus'),
          options: Object.entries(borderQuarantineStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
        {
          key: 'phase',
          label: translate('borders.bordersHealth.quarantine.colsPhase'),
          options: Object.entries(borderQuarantinePhase).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('phase', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.quarantine.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.quarantine.emptyDescription')}
    />
  );
};

const IsolationTab = () => {
  const { t: translate } = useTranslation();

  const t = useServerTable<IsolationCase>({ fetchData: getIsolationCases });
  return (
    <DataTable<IsolationCase>
      columns={[
        { key: 'start_date', label: translate('borders.bordersHealth.tracing.colsStartedAt'), render: (v) => formatDate(v.start_date) },
        { key: 'expected_end_date', label: translate('borders.bordersHealth.quarantine.colsExpectedEnd'), render: (v) => (v.expected_end_date ? formatDate(v.expected_end_date) : '—') },
        { key: 'end_date', label: translate('borders.bordersHealth.isolation.colsActualEnd'), hideOnMobile: true, render: (v) => (v.end_date ? formatDate(v.end_date) : translate('borders.bordersHealth.isolation.colsActualEnd')) },
        { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
          <StatusChip
            label={borderIsolationStatus[v.status]?.label ?? v.status}
            tone={borderIsolationStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'started_by_name', label: translate('borders.bordersHealth.isolation.colsStartedBy'), hideOnMobile: true, render: (v) => v.started_by_name || '—' },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'notes', label: translate('borders.bordersHealth.isolation.colsNotes'), hideOnMobile: true, render: (v) => v.notes || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.isolation.title')}
      subtitle={translate("borders.bordersHealth.quarantine.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.isolation.searchPlaceholder')}
      filters={[
        {
          key: 'status',
          label: translate('borders.bordersHealth.tracing.colsStatus'),
          options: Object.entries(borderIsolationStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle={translate('borders.bordersHealth.isolation.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.isolation.emptyDescription')}
    />
  );
};

const TracingTab = () => {
  const { t: translate } = useTranslation();

  const cases = useServerTable<ContactTracingCase>({ fetchData: getContactTracingCases });
  const contacts = useServerTable<Contact>({ fetchData: getContacts });

  return (
    <Stack spacing={2.5}>
      <DataTable<ContactTracingCase>
        columns={[
          { key: 'index_case_name', label: translate('borders.bordersHealth.tracing.colsIndexCaseName'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.index_case_name || '—'}</Typography> },
          { key: 'transport_mode', label: translate('borders.bordersHealth.tracing.colsTransportMode'), hideOnMobile: true, render: (v) => v.transport_mode || '—' },
          { key: 'follow_up_days', label: translate('borders.bordersHealth.tracing.colsFollowUpDays'), align: 'center', render: (v) => v.follow_up_days || '—' },
          { key: 'started_at', label: translate('borders.bordersHealth.tracing.colsStartedAt'), render: (v) => formatDateTime(v.started_at) },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderContactTracingStatus[v.status]?.label ?? v.status}
              tone={borderContactTracingStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={cases.rows}
        rowKey={(v) => v.id}
        count={cases.count}
        page={cases.page}
        rowsPerPage={cases.rowsPerPage}
        pageSizeOptions={cases.pageSizeOptions}
        loading={cases.loading}
        error={cases.error}
        title={translate('borders.bordersHealth.tracing.title')}
        subtitle={translate("borders.bordersHealth.tracing.subtitle").replace("{count}", String(cases.count))}
        searchInput={cases.searchInput}
        onSearchChange={cases.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.tracing.searchPlaceholder')}
        onPageChange={cases.setPage}
        onRowsPerPageChange={cases.setRowsPerPage}
        onRefresh={cases.refresh}
        emptyTitle={translate('borders.bordersHealth.tracing.emptyTitle')}
        emptyDescription={translate('borders.bordersHealth.tracing.emptyDescription')}
      />

      <DataTable<Contact>
        columns={[
          { key: 'full_name', label: translate('borders.bordersHealth.tracing.colsFullName'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.full_name}</Typography> },
          { key: 'passport_number', label: translate('borders.bordersHealth.tracing.colsPassportNumber'), render: (v) => (
            <Typography sx={{ fontFamily: 'monospace' }}>{v.passport_number || '—'}</Typography>
          ) },
          { key: 'phone', label: translate('borders.bordersHealth.tracing.colsPhone'), hideOnMobile: true, render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', direction: 'ltr' }}>{v.phone || '—'}</Typography>
          ) },
          { key: 'seat_or_relation', label: translate('borders.bordersHealth.tracing.colsSeatOrRelation'), hideOnMobile: true, render: (v) => v.seat_or_relation || '—' },
          { key: 'follow_up_day', label: translate('borders.bordersHealth.tracing.colsFollowUpDay'), align: 'center', render: (v) => v.follow_up_day ?? '—' },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderContactStatus[v.status]?.label ?? v.status}
              tone={borderContactStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
        ]}
        rows={contacts.rows}
        rowKey={(v) => v.id}
        count={contacts.count}
        page={contacts.page}
        rowsPerPage={contacts.rowsPerPage}
        pageSizeOptions={contacts.pageSizeOptions}
        loading={contacts.loading}
        error={contacts.error}
        title={translate('borders.bordersHealth.tracing.titleContacts')}
        subtitle={translate("borders.bordersHealth.tracing.subtitleContacts").replace("{count}", String(contacts.count))}
        searchInput={contacts.searchInput}
        onSearchChange={contacts.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.tracing.searchPlaceholderContacts')}
        onPageChange={contacts.setPage}
        onRowsPerPageChange={contacts.setRowsPerPage}
        onRefresh={contacts.refresh}
        emptyTitle={translate('borders.bordersHealth.tracing.emptyTitleContacts')}
        emptyDescription={translate('borders.bordersHealth.tracing.emptyDescriptionContacts')}
      />
    </Stack>
  );
};

const EmergenciesTab = () => {
  const { t: translate } = useTranslation();

  const incidents = useServerTable<BorderHealthIncident>({ fetchData: getIncidents });
  const emergencies = useServerTable<BorderEmergency>({ fetchData: getEmergencies });

  return (
    <Stack spacing={2.5}>
      <DataTable<BorderHealthIncident>
        columns={[
          { key: 'title', label: translate('borders.bordersHealth.emergencies.colsIncidentTitle'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
          { key: 'severity', label: translate('borders.bordersHealth.emergencies.colsSeverity'), render: (v) => (
            <StatusChip
              label={borderIncidentSeverity[v.severity]?.label ?? v.severity}
              tone={borderIncidentSeverity[v.severity]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderIncidentStatus[v.status]?.label ?? v.status}
              tone={borderIncidentStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'reported_at', label: translate('borders.bordersHealth.emergencies.colsReportedAt'), render: (v) => formatDateTime(v.reported_at) },
          { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={incidents.rows}
        rowKey={(v) => v.id}
        count={incidents.count}
        page={incidents.page}
        rowsPerPage={incidents.rowsPerPage}
        pageSizeOptions={incidents.pageSizeOptions}
        loading={incidents.loading}
        error={incidents.error}
        title={translate('borders.bordersHealth.emergencies.titleIncidents')}
        subtitle={translate("borders.bordersHealth.emergencies.subtitleIncidents").replace("{count}", String(incidents.count))}
        searchInput={incidents.searchInput}
        onSearchChange={incidents.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.emergencies.searchPlaceholderIncidents')}
        filters={[
          {
            key: 'severity',
            label: translate('borders.bordersHealth.emergencies.colsSeverity'),
            options: Object.entries(borderIncidentSeverity).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => incidents.setFilter('severity', v),
          },
        ]}
        onPageChange={incidents.setPage}
        onRowsPerPageChange={incidents.setRowsPerPage}
        onRefresh={incidents.refresh}
        emptyTitle={translate('borders.bordersHealth.emergencies.emptyTitleIncidents')}
        emptyDescription={translate('borders.bordersHealth.emergencies.emptyDescriptionIncidents')}
      />

      <DataTable<BorderEmergency>
        columns={[
          { key: 'title', label: translate('borders.bordersHealth.emergencies.colsEmergencyTitle'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
          { key: 'restriction_level', label: translate('borders.bordersHealth.emergencies.colsRestrictionLevel'), render: (v) => (
            <StatusChip
              label={borderRestrictionLevel[v.restriction_level]?.label ?? v.restriction_level}
              tone={borderRestrictionLevel[v.restriction_level]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderIncidentStatus[v.status]?.label ?? v.status}
              tone={borderIncidentStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'reported_at', label: translate('borders.bordersHealth.emergencies.colsReportedAt'), render: (v) => formatDateTime(v.reported_at) },
          { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={emergencies.rows}
        rowKey={(v) => v.id}
        count={emergencies.count}
        page={emergencies.page}
        rowsPerPage={emergencies.rowsPerPage}
        pageSizeOptions={emergencies.pageSizeOptions}
        loading={emergencies.loading}
        error={emergencies.error}
        title={translate('borders.bordersHealth.emergencies.titleEmergencies')}
        subtitle={translate("borders.bordersHealth.emergencies.subtitleEmergencies").replace("{count}", String(emergencies.count))}
        searchInput={emergencies.searchInput}
        onSearchChange={emergencies.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.emergencies.searchPlaceholderEmergencies')}
        onPageChange={emergencies.setPage}
        onRowsPerPageChange={emergencies.setRowsPerPage}
        onRefresh={emergencies.refresh}
        emptyTitle={translate('borders.bordersHealth.emergencies.emptyTitleEmergencies')}
        emptyDescription={translate('borders.bordersHealth.emergencies.emptyDescriptionEmergencies')}
      />
    </Stack>
  );
};

const DecisionsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderDecision>({ fetchData: getDecisions });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);

  return (
    <DataTable<BorderDecision>
      columns={[
        { key: 'decided_at', label: translate('borders.bordersHealth.decisions.colsDate'), render: (v) => formatDateTime(v.decided_at) },
        { key: 'subject_type', label: translate('borders.bordersHealth.decisions.colsSubject'), render: (v) => v.subject_type },
        { key: 'outcome', label: translate('borders.bordersHealth.decisions.colsOutcome'), render: (v) => (
          <StatusChip
            label={borderDecisionOutcome[v.outcome]?.label ?? v.outcome}
            tone={borderDecisionOutcome[v.outcome]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'reason', label: translate('borders.bordersHealth.decisions.colsReason'), render: (v) => v.reason || '—' },
        { key: 'decided_by_name', label: translate('borders.bordersHealth.decisions.colsDecidedBy'), render: (v) => v.decided_by_name || '—' },
        { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.decisions.title')}
      subtitle={translate("borders.bordersHealth.decisions.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.decisions.searchPlaceholder')}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      onExport={() => exportAll({
        filename: 'border-decisions',
        headers: [translate('borders.bordersHealth.shifts.colsDate'), translate('borders.bordersHealth.decisions.colsSubject'), translate('borders.bordersHealth.decisions.colsOutcome'), translate('borders.bordersHealth.decisions.colsReason'), translate('borders.bordersHealth.tracing.colsCrossingName')],
        mapRow: (v) => [v.decided_at, v.subject_type, v.outcome, v.reason, v.crossing_name ?? ''],
        message: translate('borders.bordersHealth.decisions.exported') || translate('borders.bordersHealth.decisions.exported'),
      })}
      exporting={exporting}
      emptyTitle={translate('borders.bordersHealth.decisions.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.decisions.emptyDescription')}
    />
  );
};

const NotificationsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderNotification>({ fetchData: getNotifications });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);

  return (
    <DataTable<BorderNotification>
      columns={[
        { key: 'sent_at', label: translate('borders.bordersHealth.notifications.colsSentAt'), render: (v) => (v.sent_at ? formatDateTime(v.sent_at) : '—') },
        { key: 'title', label: translate('borders.bordersHealth.notifications.colsTitle'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
        { key: 'channel', label: translate('borders.bordersHealth.notifications.colsChannel'), render: (v) => (
          <StatusChip
            label={borderNotificationChannel[v.channel]?.label ?? v.channel}
            tone={borderNotificationChannel[v.channel]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'status', label: translate('borders.bordersHealth.notifications.colsStatus'), render: (v) => (
          <StatusChip
            label={borderNotificationDeliveryStatus[v.status]?.label ?? v.status}
            tone={borderNotificationDeliveryStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'recipient_role', label: translate('borders.bordersHealth.notifications.colsRecipientRole'), render: (v) => v.recipient_role },
        { key: 'recipient_contact', label: translate('borders.bordersHealth.notifications.colsRecipientContact'), hideOnMobile: true, render: (v) => v.recipient_contact || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title={translate('borders.bordersHealth.notifications.title')}
      subtitle={translate("borders.bordersHealth.notifications.subtitle").replace("{count}", String(t.count))}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder={translate('borders.bordersHealth.notifications.searchPlaceholder')}
      filters={[
        {
          key: 'status',
          label: translate('borders.bordersHealth.notifications.colsStatus'),
          options: Object.entries(borderNotificationDeliveryStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
        {
          key: 'channel',
          label: translate('borders.bordersHealth.notifications.colsChannel'),
          options: Object.entries(borderNotificationChannel).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('channel', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      onExport={() => exportAll({
        filename: 'border-notifications',
        headers: [translate('borders.bordersHealth.shifts.colsDate'), translate('borders.bordersHealth.notifications.colsTitle'), translate('borders.bordersHealth.notifications.colsChannel'), translate('borders.bordersHealth.notifications.colsStatus'), translate('borders.bordersHealth.notifications.colsRecipientRole')],
        mapRow: (v) => [v.sent_at ?? '', v.title, v.channel, v.status, v.recipient_role],
        message: translate('borders.bordersHealth.notifications.exported') || translate('borders.bordersHealth.notifications.exported'),
      })}
      exporting={exporting}
      emptyTitle={translate('borders.bordersHealth.notifications.emptyTitle')}
      emptyDescription={translate('borders.bordersHealth.notifications.emptyDescription')}
    />
  );
};

const StatisticsTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderDailyStatistics>({ fetchData: getDailyStatistics });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshDailyStatistics();
      notifySuccess(translate('borders.bordersHealth.statistics.refreshed') || translate('borders.bordersHealth.statistics.refreshed'));
      t.refresh();
    } catch {
      notifyError(translate('borders.bordersHealth.statistics.refreshFailed') || translate('borders.bordersHealth.statistics.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Button
        onClick={refresh}
        disabled={refreshing}
        startIcon={<RefreshIcon />}
        sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
      >
        {refreshing ? translate('borders.bordersHealth.statistics.refreshing') : translate('borders.bordersHealth.statistics.refresh')}
      </Button>

      <DataTable<BorderDailyStatistics>
        columns={[
          { key: 'stat_date', label: translate('borders.bordersHealth.shifts.colsDate'), render: (v) => formatDate(v.stat_date) },
          { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.crossing_name || '—'}</Typography> },
          { key: 'travelers_inbound', label: translate('borders.bordersHealth.statistics.colsTravelersInbound'), align: 'center', render: (v) => v.travelers_inbound.toLocaleString('ar') },
          { key: 'travelers_outbound', label: translate('borders.bordersHealth.statistics.colsTravelersOutbound'), align: 'center', render: (v) => v.travelers_outbound.toLocaleString('ar') },
          { key: 'vehicles_inspected', label: translate('borders.bordersHealth.statistics.colsVehiclesInspected'), align: 'center', hideOnMobile: true, render: (v) => v.vehicles_inspected },
          { key: 'quarantine_cases', label: translate('borders.bordersHealth.statistics.colsQuarantineCases'), align: 'center', render: (v) => v.quarantine_cases },
          { key: 'samples_collected', label: translate('borders.bordersHealth.statistics.colsSamplesCollected'), align: 'center', hideOnMobile: true, render: (v) => v.samples_collected },
          { key: 'average_processing_minutes', label: translate('borders.bordersHealth.statistics.colsAvgProcessing'), align: 'center', render: (v) => (
            v.average_processing_minutes == null ? '—' : `translate('borders.bordersHealth.statistics.minAbbr').replace('{count}', String(v.average_processing_minutes))`
          ) },
        ]}
        rows={t.rows}
        rowKey={(v) => v.id}
        count={t.count}
        page={t.page}
        rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions}
        loading={t.loading}
        error={t.error}
        title={translate('borders.bordersHealth.statistics.title')}
        subtitle={translate("borders.bordersHealth.statistics.subtitle").replace("{count}", String(t.count))}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onRefresh={t.refresh}
        emptyTitle={translate('borders.bordersHealth.statistics.emptyTitle')}
        emptyDescription={translate('borders.bordersHealth.statistics.emptyDescription')}
      />
    </Stack>
  );
};

const CertificatesTab = () => {
  const { t: translate } = useTranslation();
  const t = useServerTable<BorderCertificate>({ fetchData: getCertificates });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const [issueOpen, setIssueOpen] = useState(false);
  const [crossingId, setCrossingId] = useState('');
  const [certType, setCertType] = useState('HEALTH_CLEARANCE');
  const [expiryDays, setExpiryDays] = useState(30);
  const [issuing, setIssuing] = useState(false);

  const crossings = useServerTable<BorderCrossing>({ fetchData: getCrossings, initialPageSize: 100 });

  const issue = async () => {
    if (!crossingId) {
      notifyError(translate('borders.bordersHealth.certificates.selectCrossing') || translate('borders.bordersHealth.certificates.selectCrossing'));
      return;
    }
    setIssuing(true);
    try {
      const res = await issueCertificate({
        crossing: crossingId,
        certificate_type: certType as BorderCertificate['certificate_type'],
        expiry_days: expiryDays,
      });
      notifySuccess((translate('borders.bordersHealth.certificates.issued') || translate('borders.bordersHealth.certificates.issued')).replace('{number}', res.data.data.certificate_number));
      setIssueOpen(false);
      t.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, translate('borders.bordersHealth.certificates.issueFailed') || translate('borders.bordersHealth.certificates.issueFailed')));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <DataTable<BorderCertificate>
        columns={[
          { key: 'certificate_number', label: translate('borders.bordersHealth.certificates.colsCertificateNumber'), render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.certificate_number}</Typography>
          ) },
          { key: 'certificate_type', label: translate('borders.bordersHealth.vehicles.colsType'), render: (v) => (
            <StatusChip
              label={borderCertificateType[v.certificate_type]?.label ?? v.certificate_type}
              tone={borderCertificateType[v.certificate_type]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'issue_date', label: translate('borders.bordersHealth.certificates.colsIssueDate'), render: (v) => formatDate(v.issue_date) },
          { key: 'expiry_date', label: translate('borders.bordersHealth.certificates.colsExpiryDate'), hideOnMobile: true, render: (v) => (v.expiry_date ? formatDate(v.expiry_date) : '—') },
          { key: 'status', label: translate('borders.bordersHealth.tracing.colsStatus'), render: (v) => (
            <StatusChip
              label={borderCertificateStatus[v.status]?.label ?? v.status}
              tone={borderCertificateStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'crossing_name', label: translate('borders.bordersHealth.tracing.colsCrossingName'), hideOnMobile: true, render: (v) => v.crossing_name || '—' },
          { key: 'issued_by_name', label: translate('borders.bordersHealth.certificates.colsIssuedBy'), hideOnMobile: true, render: (v) => v.issued_by_name || '—' },
        ]}
        rows={t.rows}
        rowKey={(v) => v.id}
        count={t.count}
        page={t.page}
        rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions}
        loading={t.loading}
        error={t.error}
        title={translate('borders.bordersHealth.certificates.title')}
        subtitle={translate("borders.bordersHealth.certificates.subtitle").replace("{count}", String(t.count))}
        searchInput={t.searchInput}
        onSearchChange={t.setSearchInput}
        searchPlaceholder={translate('borders.bordersHealth.certificates.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: translate('borders.bordersHealth.tracing.colsStatus'),
            options: Object.entries(borderCertificateStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('status', v),
          },
        ]}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onExport={() => exportAll({
          filename: 'border-certificates',
          headers: [translate('borders.bordersHealth.vehicles.colsPlate'), translate('borders.bordersHealth.vehicles.colsType'), translate('borders.bordersHealth.vehicles.colsMakeModel'), translate('borders.bordersHealth.vehicles.colsDriver'), translate('borders.bordersHealth.tracing.colsStatus')],
          mapRow: (v) => [v.certificate_number, v.certificate_type, v.issue_date, v.expiry_date ?? '', v.status],
          message: translate('borders.bordersHealth.certificates.exported') || translate('borders.bordersHealth.certificates.exported'),
        })}
        exporting={exporting}
        onRefresh={t.refresh}
        emptyTitle={translate('borders.bordersHealth.certificates.emptyTitle')}
        emptyDescription={translate('borders.bordersHealth.certificates.emptyDescription')}
        actions={() => (
          <Tooltip title={translate('borders.bordersHealth.dialogs.issueCert')}>
            <IconButton
              aria-label={translate('borders.bordersHealth.dialogs.issueCert')}
              size="small"
              color="secondary"
              onClick={() => setIssueOpen(true)}
              sx={{ bgcolor: 'secondary.light', '&:hover': { bgcolor: 'secondary.main', color: '#fff' } }}
            >
              <BadgeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        toolbar={
          <Button
            variant="contained"
            startIcon={<BadgeIcon />}
            onClick={() => setIssueOpen(true)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            {translate('borders.bordersHealth.dialogs.issueCert')}
          </Button>
        }
      />

      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{translate('borders.bordersHealth.dialogs.issueCert')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label={translate('borders.bordersHealth.dialogs.crossingLabel')}
              value={crossingId}
              onChange={(e) => setCrossingId(e.target.value)}
            >
              {(crossings.rows || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name_ar} ({c.entry_point_code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={translate('borders.bordersHealth.dialogs.certType')}
              value={certType}
              onChange={(e) => setCertType(e.target.value)}
            >
              {Object.entries(borderCertificateType).map(([value, meta]) => (
                <MenuItem key={value} value={value}>{meta.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label={translate('borders.bordersHealth.dialogs.validDays')}
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIssueOpen(false)} sx={{ fontWeight: 700 }}>{translate('borders.actions.cancel')}</Button>
          <Button
            variant="contained"
            onClick={issue}
            disabled={issuing}
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {translate('borders.bordersHealth.dialogs.issueBtn')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const BordersHealthPage = () => {
  const { t } = useTranslation();
  const SECTIONS = useMemo(() => getSections(t) as unknown as CommandSectionDef[], [t]);
  const { active, register, scrollTo } = useCommandSections(SECTIONS);

  return (
    <Box>
      <PageHeader
        title={t('borders.bordersHealth.title')}
        subtitle={t('borders.bordersHealth.subtitle')}
        eyebrow={t('borders.bordersHealth.eyebrow')}
      />
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.4} lg={2}>
          <CommandSectionRail
            sections={SECTIONS}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('borders.bordersHealth.dashboard.eyebrow')}
          />
        </Grid>
        <Grid item xs={12} md={9.6} lg={10}>
          <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DashboardTab />
          </Box>
          <Box component="section" ref={register('crossings')} data-section="crossings" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <CrossingsTab />
          </Box>
          <Box component="section" ref={register('facilities')} data-section="facilities" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <FacilitiesTab />
          </Box>
          <Box component="section" ref={register('shifts')} data-section="shifts" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ShiftsTab />
          </Box>
          <Box component="section" ref={register('staff')} data-section="staff" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <StaffTab />
          </Box>
          <Box component="section" ref={register('travelers')} data-section="travelers" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <TravelersTab />
          </Box>
          <Box component="section" ref={register('declarations')} data-section="declarations" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DeclarationsTab />
          </Box>
          <Box component="section" ref={register('screenings')} data-section="screenings" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ScreeningsTab />
          </Box>
          <Box component="section" ref={register('vehicles')} data-section="vehicles" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <VehiclesTab />
          </Box>
          <Box component="section" ref={register('vehicle-inspections')} data-section="vehicle-inspections" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <VehicleInspectionsTab />
          </Box>
          <Box component="section" ref={register('cargo')} data-section="cargo" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <CargoTab />
          </Box>
          <Box component="section" ref={register('samples')} data-section="samples" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <SamplesTab />
          </Box>
          <Box component="section" ref={register('quarantine')} data-section="quarantine" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <QuarantineTab />
          </Box>
          <Box component="section" ref={register('isolation')} data-section="isolation" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <IsolationTab />
          </Box>
          <Box component="section" ref={register('tracing')} data-section="tracing" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <TracingTab />
          </Box>
          <Box component="section" ref={register('emergencies')} data-section="emergencies" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <EmergenciesTab />
          </Box>
          <Box component="section" ref={register('certificates')} data-section="certificates" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <CertificatesTab />
          </Box>
          <Box component="section" ref={register('decisions')} data-section="decisions" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DecisionsTab />
          </Box>
          <Box component="section" ref={register('notifications')} data-section="notifications" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <NotificationsTab />
          </Box>
          <Box component="section" ref={register('statistics')} data-section="statistics" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <StatisticsTab />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BordersHealthPage;
