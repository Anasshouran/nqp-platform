import { useCallback, useEffect, useState } from 'react';
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

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: <PublicIcon fontSize="small" /> },
  { id: 'crossings', label: 'المعابر', icon: <PublicIcon fontSize="small" /> },
  { id: 'facilities', label: 'المرافق', icon: <ApartmentIcon fontSize="small" /> },
  { id: 'shifts', label: 'الورديات', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'staff', label: 'الكادر', icon: <GroupsIcon fontSize="small" /> },
  { id: 'travelers', label: 'المسافرون', icon: <GroupsIcon fontSize="small" /> },
  { id: 'declarations', label: 'الإقرارات', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'screenings', label: 'الفحوصات', icon: <FactCheckOutlinedIcon fontSize="small" /> },
  { id: 'vehicles', label: 'المركبات', icon: <DirectionsBusIcon fontSize="small" /> },
  { id: 'vehicle-inspections', label: 'تفتيش المركبات', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'cargo', label: 'الشحنات', icon: <LocalShippingIcon fontSize="small" /> },
  { id: 'samples', label: 'العيّنات', icon: <BiotechIcon fontSize="small" /> },
  { id: 'quarantine', label: 'الحجر', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'isolation', label: 'العزل', icon: <CoronaIcon fontSize="small" /> },
  { id: 'tracing', label: 'تتبع المخالطين', icon: <ContactMailIcon fontSize="small" /> },
  { id: 'emergencies', label: 'الطوارئ', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'certificates', label: 'الشهادات', icon: <BadgeIcon fontSize="small" /> },
  { id: 'decisions', label: 'القرارات', icon: <GavelIcon fontSize="small" /> },
  { id: 'notifications', label: 'الإشعارات', icon: <NotificationsIcon fontSize="small" /> },
  { id: 'statistics', label: 'الحصيلة اليومية', icon: <TrendingUpIcon fontSize="small" /> },
] as const;

const DashboardTab = () => {
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
        eyebrow="مركز قيادة المعابر البرية"
        title="الحجر الصحي القومي — المعابر البرية"
        subtitle="مؤشرات وطنية لحركة المسافرين والمركبات والشحنات والحجر عبر المعابر"
        avatarLabel="المعابر"
      />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PublicIcon />} value={overview?.open_crossings ?? 0} label="معابر عاملة" accent="success.main" hint={`من ${overview?.crossings ?? 0}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<GroupsIcon />} value={overview?.travelers_today ?? 0} label="مسافرون اليوم" accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<DirectionsBusIcon />} value={overview?.vehicles_inspected ?? 0} label="مركبات مفتّشة" accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<LocalShippingIcon />} value={overview?.cargo_inspections ?? 0} label="شحنات مفتّشة" accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<HealthAndSafetyIcon />} value={overview?.active_quarantine ?? 0} label="حالات حجر نشطة" accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<CoronaIcon />} value={overview?.active_isolation ?? 0} label="حالات عزل" accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<WarningAmberIcon />} value={overview?.suspected_cases ?? 0} label="حالات مشتبه بها" accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BadgeIcon />} value={overview?.certificates_issued ?? 0} label="شهادات صادرة" accent="primary.main" />
        </Grid>
      </Grid>

      <DataTable<CrossingPerformanceRow>
        columns={[
          { key: 'entry_point__name_ar', label: 'المعبر', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.entry_point__name_ar}</Typography> },
          { key: 'entry_point__code', label: 'الكود', hideOnMobile: true, render: (r) => (
            <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.entry_point__code}</Typography>
          ) },
          { key: 'neighbor_country', label: 'الدولة المجاورة', hideOnMobile: true, render: (r) => r.neighbor_country || '—' },
          { key: 'operating_status', label: 'الحالة', render: (r) => (
            <StatusChip
              label={borderOperatingStatus[r.operating_status]?.label ?? r.operating_status}
              tone={borderOperatingStatus[r.operating_status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'records_count', label: 'حركة المسافرين', align: 'center', render: (r) => r.records_count },
          { key: 'vehicle_inspections_count', label: 'مركبات', align: 'center', hideOnMobile: true, render: (r) => r.vehicle_inspections_count },
          { key: 'cargo_count', label: 'شحنات', align: 'center', hideOnMobile: true, render: (r) => r.cargo_count },
          { key: 'quarantine_count', label: 'حجر', align: 'center', render: (r) => r.quarantine_count },
        ]}
        rows={performance}
        rowKey={(r) => r.id}
        count={performance.length}
        page={0}
        rowsPerPage={Math.max(performance.length, 10)}
        hidePagination
        title="أداء المعابر"
        subtitle="مقارنة الحركة والتفتيش والحجر بين المعابر"
        emptyTitle="لا توجد بيانات أداء"
        emptyDescription="تظهر المقارنة بعد تسجيل حركة عبر المعابر."
      />

      {trend.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            اتجاه الحركة (7 أيام)
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">
              داخل: <b>{inbound.toLocaleString('ar')}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              خارج: <b>{outbound.toLocaleString('ar')}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              أيام مسجّلة: <b>{trend.length}</b>
            </Typography>
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

const CrossingsTab = () => {
  const t = useServerTable<BorderCrossing>({ fetchData: getCrossings });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const [statusTarget, setStatusTarget] = useState<BorderCrossing | null>(null);
  const [nextStatus, setNextStatus] = useState('CLOSED');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const applyStatus = async () => {
    if (!statusTarget || saving) return;
    setSaving(true);
    try {
      await changeCrossingStatus(statusTarget.id, nextStatus, reason || undefined);
      notifySuccess('تم تحديث حالة المعبر');
      setStatusTarget(null);
      setReason('');
      t.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تحديث حالة المعبر'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DataTable<BorderCrossing>
        columns={[
          { key: 'name_ar', label: 'المعبر', render: (v) => (
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {v.entry_point_code}
              </Typography>
            </Stack>
          ) },
          { key: 'neighbor_country', label: 'الدولة المجاورة', hideOnMobile: true, render: (v) => v.neighbor_country || '—' },
          { key: 'neighbor_state', label: 'الولاية', hideOnMobile: true, render: (v) => v.neighbor_state || '—' },
          { key: 'operating_status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderOperatingStatus[v.operating_status]?.label ?? v.operating_status}
              tone={borderOperatingStatus[v.operating_status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'daily_capacity', label: 'السعة اليومية', align: 'center', hideOnMobile: true, render: (v) => v.daily_capacity?.toLocaleString('ar') ?? '—' },
          { key: 'has_laboratory', label: 'مختبر', align: 'center', render: (v) => (
            <StatusChip label={v.has_laboratory ? 'نعم' : 'لا'} tone={v.has_laboratory ? 'success' : 'neutral'} />
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
        title="إدارة المعابر"
        subtitle={`${t.count} معبر`}
        searchInput={t.searchInput}
        onSearchChange={t.setSearchInput}
        searchPlaceholder="بحث باسم المعبر أو كوده أو الدولة المجاورة..."
        filters={[
          {
            key: 'operating_status',
            label: 'الحالة',
            options: Object.entries(borderOperatingStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('operating_status', v),
          },
        ]}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onExport={() => exportAll({
          filename: 'border-crossings',
          headers: ['الكود', 'الاسم', 'الدولة', 'الحالة'],
          mapRow: (v) => [v.entry_point_code ?? '', v.name_ar ?? '', v.neighbor_country, v.operating_status],
          message: 'تم تصدير بيانات المعابر',
        })}
        exporting={exporting}
        onRefresh={t.refresh}
        emptyTitle="لا توجد معابر"
        emptyDescription="شغّل أمر بذر المعابر لإنشاء الملفات التشغيلية."
        actions={(v) => (
          <Tooltip title="تغيير حالة التشغيل">
            <IconButton
              aria-label="تغيير حالة المعبر"
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
        <DialogTitle sx={{ fontWeight: 700 }}>تغيير حالة المعبر</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {statusTarget?.name_ar}
            </Typography>
            <TextField
              select
              fullWidth
              label="الحالة الجديدة"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              {Object.entries(borderOperatingStatus).map(([value, meta]) => (
                <MenuItem key={value} value={value}>{meta.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="سبب الإغلاق / التقييد"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusTarget(null)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={applyStatus}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const FacilitiesTab = () => {
  const t = useServerTable<BorderFacility>({ fetchData: getFacilities });
  return (
    <DataTable<BorderFacility>
      columns={[
        { key: 'name_ar', label: 'المرفق', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.name_ar}</Typography> },
        { key: 'kind', label: 'النوع', render: (v) => (
          <StatusChip
            label={borderFacilityKind[v.kind]?.label ?? v.kind}
            tone={borderFacilityKind[v.kind]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'capacity', label: 'السعة', align: 'center', render: (v) => v.capacity || '—' },
        { key: 'staff_count', label: 'الكادر', align: 'center', hideOnMobile: true, render: (v) => v.staff_count || '—' },
        { key: 'is_operational', label: 'التشغيل', render: (v) => (
          <StatusChip label={v.is_operational ? 'يعمل' : 'متوقف'} tone={v.is_operational ? 'success' : 'error'} />
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
      title="مرافق المعابر"
      subtitle={`${t.count} مرفق`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث باسم المرفق..."
      filters={[
        {
          key: 'kind',
          label: 'نوع المرفق',
          options: Object.entries(borderFacilityKind).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('kind', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد مرافق"
      emptyDescription="سجّل مرافق المعبر: مختبر، وحدة حجر، مخزن."
    />
  );
};

const ShiftsTab = () => {
  const t = useServerTable<BorderShift>({ fetchData: getShifts });
  return (
    <DataTable<BorderShift>
      columns={[
        { key: 'shift_date', label: 'التاريخ', render: (v) => formatDate(v.shift_date) },
        { key: 'shift_type', label: 'الوردية', render: (v) => (
          <StatusChip
            label={borderShiftType[v.shift_type]?.label ?? v.shift_type}
            tone={borderShiftType[v.shift_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'started_at', label: 'البداية', align: 'center', render: (v) => v.started_at || '—' },
        { key: 'ended_at', label: 'النهاية', align: 'center', hideOnMobile: true, render: (v) => v.ended_at || '—' },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'supervisor_name', label: 'المشرف', render: (v) => v.supervisor_name || '—' },
        { key: 'is_staffed', label: 'مؤمَّنة', render: (v) => (
          <StatusChip label={v.is_staffed ? 'نعم' : 'لا'} tone={v.is_staffed ? 'success' : 'warning'} />
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
      title="الورديات"
      subtitle={`${t.count} وردية`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث في الملاحظات..."
      filters={[
        {
          key: 'shift_type',
          label: 'نوع الوردية',
          options: Object.entries(borderShiftType).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('shift_type', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد ورديات"
      emptyDescription="سجّل ورديات العمل اليومية لكل معبر."
    />
  );
};

const StaffTab = () => {
  const t = useServerTable<BorderStaff>({ fetchData: getBorderStaff });
  return (
    <DataTable<BorderStaff>
      columns={[
        { key: 'user_name', label: 'الموظف', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.user_name}</Typography> },
        { key: 'role', label: 'الدور', render: (v) => v.role },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'assignment_type', label: 'نوع الإسناد', hideOnMobile: true, render: (v) => v.assignment_type },
        { key: 'starts_on', label: 'يبدأ', render: (v) => formatDate(v.starts_on) },
        { key: 'ends_on', label: 'ينتهي', hideOnMobile: true, render: (v) => (v.ends_on ? formatDate(v.ends_on) : 'مستمر') },
        { key: 'is_active', label: 'نشط', render: (v) => (
          <StatusChip label={v.is_active ? 'نشط' : 'منتهٍ'} tone={v.is_active ? 'success' : 'neutral'} />
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
      title="كادر المعابر"
      subtitle={`${t.count} إسناد`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث باسم الموظف..."
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا يوجد كادر مسجَّل"
      emptyDescription="أسند الموظفين إلى المعابر من صفحة الأدوار والصلاحيات."
    />
  );
};

const TravelersTab = () => {
  const t = useServerTable<TravelerHealthRecord>({ fetchData: getTravelerRecords });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  return (
    <DataTable<TravelerHealthRecord>
      columns={[
        { key: 'traveler_name', label: 'المسافر', render: (v) => (
          <Stack>
            <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.passport_number}
            </Typography>
          </Stack>
        ) },
        { key: 'direction', label: 'الاتجاه', render: (v) => (
          <StatusChip
            label={borderTravelDirection[v.direction]?.label ?? v.direction}
            tone={borderTravelDirection[v.direction]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'entry_at', label: 'وقت العبور', render: (v) => formatDateTime(v.entry_at) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'risk_level', label: 'الخطورة', render: (v) => (
          <StatusChip
            label={borderRiskLevel[v.risk_level]?.label ?? v.risk_level}
            tone={borderRiskLevel[v.risk_level]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'decision', label: 'القرار', render: (v) => (
          <StatusChip
            label={borderTravelerDecision[v.decision]?.label ?? v.decision}
            tone={borderTravelerDecision[v.decision]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'assessed_by_name', label: 'المُقيِّم', hideOnMobile: true, render: (v) => v.assessed_by_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="المسافرون"
      subtitle={`${t.count} مسافر`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث بالاسم أو رقم الجواز..."
      filters={[
        {
          key: 'direction',
          label: 'الاتجاه',
          options: Object.entries(borderTravelDirection).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('direction', v),
        },
        {
          key: 'risk_level',
          label: 'الخطورة',
          options: Object.entries(borderRiskLevel).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('risk_level', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onExport={() => exportAll({
        filename: 'border-travelers',
        headers: ['المسافر', 'الجواز', 'الاتجاه', 'الخطورة', 'القرار'],
        mapRow: (v) => [v.traveler_name ?? '', v.passport_number ?? '', v.direction, v.risk_level, v.decision],
        message: 'تم تصدير حركة المسافرين',
      })}
      exporting={exporting}
      onRefresh={t.refresh}
      emptyTitle="لا توجد حركة مسافرين"
      emptyDescription="سجّل حركة المسافرين من صفحة الفحص الصحي."
    />
  );
};

const DeclarationsTab = () => {
  const t = useServerTable<HealthDeclaration>({ fetchData: getDeclarations });
  return (
    <DataTable<HealthDeclaration>
      columns={[
        { key: 'traveler_name', label: 'المسافر', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography> },
        { key: 'departure_country', label: 'بلد المغادرة', hideOnMobile: true, render: (v) => v.departure_country || '—' },
        { key: 'departure_date', label: 'تاريخ المغادرة', render: (v) => formatDate(v.departure_date) },
        { key: 'current_symptoms', label: 'الأعراض', render: (v) => v.current_symptoms || 'لا يوجد' },
        { key: 'status', label: 'الحالة', render: (v) => (
          <StatusChip
            label={borderDeclarationStatus[v.status]?.label ?? v.status}
            tone={borderDeclarationStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'declared_at', label: 'تاريخ الإقرار', hideOnMobile: true, render: (v) => formatDateTime(v.declared_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="الإقرارات الصحية"
      subtitle={`${t.count} إقرار`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث بالاسم أو الجواز..."
      filters={[
        {
          key: 'status',
          label: 'الحالة',
          options: Object.entries(borderDeclarationStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد إقرارات"
      emptyDescription="تُسجَّل الإقرارات الصحية من بوابة المسافرين أو عند المعبر."
    />
  );
};

const ScreeningsTab = () => {
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
      notifySuccess('أُعيد تقييم الفحص وحُدِّث القرار');
      setTarget(null);
      t.refresh();
    } catch (e) {
      notifyError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [target, temperature, oxygen, t]);

  return (
    <>
    <DataTable<BorderScreening>
      columns={[
        { key: 'traveler_name', label: 'المسافر', render: (v) => (
          <Stack>
            <Typography sx={{ fontWeight: 700 }}>{v.traveler_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.passport_number}
            </Typography>
          </Stack>
        ) },
        { key: 'body_temperature', label: 'الحرارة', align: 'center', render: (v) => (
          v.body_temperature ? `${v.body_temperature}°C` : '—'
        ) },
        { key: 'oxygen_saturation', label: 'الأكسجين', align: 'center', hideOnMobile: true, render: (v) => (
          v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'
        ) },
        { key: 'risk_level', label: 'الخطورة', render: (v) => (
          <StatusChip
            label={borderRiskLevel[v.risk_level]?.label ?? v.risk_level}
            tone={borderRiskLevel[v.risk_level]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'decision', label: 'القرار', render: (v) => (
          <StatusChip
            label={borderScreeningDecision[v.decision]?.label ?? v.decision}
            tone={borderScreeningDecision[v.decision]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'document_verified', label: 'الوثائق', align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip label={v.document_verified ? 'مُتحقَّق' : 'ناقصة'} tone={v.document_verified ? 'success' : 'warning'} />
        ) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'screened_at', label: 'وقت الفحص', hideOnMobile: true, render: (v) => formatDateTime(v.screened_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="الفحص الصحي"
      subtitle={`${t.count} فحص`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث بالاسم أو رقم الجواز..."
      filters={[
        {
          key: 'decision',
          label: 'القرار',
          options: Object.entries(borderScreeningDecision).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('decision', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد فحوصات"
      emptyDescription="سجّل الفحص الحراري مع قرار الإفراج."
      actions={(v) => (
        <Tooltip title="إعادة التقييم بقياسات جديدة">
          <IconButton
            aria-label="إعادة تقييم الفحص"
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
      <DialogTitle sx={{ fontWeight: 700 }}>إعادة تقييم الفحص</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            تُعاد قراءة القواعد على القياسات أدناه: حمّى ≥ 38 أو أكسجين &lt; 92
            ⇒ خطورة حمراء وحجر، أعراض ⇒ إحالة، وثائق غير متحقَّق منها ⇒ حجز.
          </Typography>
          {target && (
            <Typography variant="body2">
              {target.traveler_name || '—'} · القرار الحالي:{' '}
              <b>{borderScreeningDecision[target.decision]?.label ?? target.decision}</b>
            </Typography>
          )}
          <TextField
            label="درجة الحرارة (°C)"
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            inputProps={{ step: '0.1' }}
          />
          <TextField
            label="إشباع الأكسجين (%)"
            type="number"
            value={oxygen}
            onChange={(e) => setOxygen(e.target.value)}
            inputProps={{ step: '1' }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={() => setTarget(null)} sx={{ fontWeight: 700 }}>إلغاء</Button>
        <Button onClick={reassess} disabled={busy} variant="contained" sx={{ fontWeight: 700 }}>
          {busy ? 'جارٍ...' : 'إعادة التقييم'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

const VehiclesTab = () => {
  const t = useServerTable<Vehicle>({ fetchData: getVehicles });
  return (
    <DataTable<Vehicle>
      columns={[
        { key: 'plate_number', label: 'اللوحة', render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{v.plate_number}</Typography>
        ) },
        { key: 'vehicle_type', label: 'النوع', render: (v) => (
          <StatusChip
            label={borderVehicleType[v.vehicle_type]?.label ?? v.vehicle_type}
            tone={borderVehicleType[v.vehicle_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'make_model', label: 'الطراز', hideOnMobile: true, render: (v) => v.make_model || '—' },
        { key: 'driver_name', label: 'السائق', render: (v) => v.driver_name || '—' },
        { key: 'status', label: 'الحالة', render: (v) => (
          <StatusChip
            label={borderVehicleStatus[v.status]?.label ?? v.status}
            tone={borderVehicleStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="المركبات"
      subtitle={`${t.count} مركبة`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث باللوحة أو الهيكل أو اسم السائق..."
      filters={[
        {
          key: 'vehicle_type',
          label: 'نوع المركبة',
          options: Object.entries(borderVehicleType).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('vehicle_type', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد مركبات"
      emptyDescription="سجّل المركبات العابرة مع بيانات السائق."
    />
  );
};

const VehicleInspectionsTab = () => {
  const t = useServerTable<VehicleInspection>({ fetchData: getVehicleInspections });
  return (
    <DataTable<VehicleInspection>
      columns={[
        { key: 'plate_number', label: 'اللوحة', render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{v.plate_number || '—'}</Typography>
        ) },
        { key: 'inspection_type', label: 'نوع التفتيش', render: (v) => (
          <StatusChip
            label={borderInspectionType[v.inspection_type]?.label ?? v.inspection_type}
            tone={borderInspectionType[v.inspection_type]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'cleanliness_status', label: 'النظافة', align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip
            label={borderComplianceStatus[v.cleanliness_status]?.label ?? v.cleanliness_status}
            tone={borderComplianceStatus[v.cleanliness_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'pest_control_status', label: 'الحشرات', align: 'center', hideOnMobile: true, render: (v) => (
          <StatusChip
            label={borderComplianceStatus[v.pest_control_status]?.label ?? v.pest_control_status}
            tone={borderComplianceStatus[v.pest_control_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'overall_status', label: 'الحكم', render: (v) => (
          <StatusChip
            label={borderInspectionOverall[v.overall_status]?.label ?? v.overall_status}
            tone={borderInspectionOverall[v.overall_status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'inspection_date', label: 'التاريخ', hideOnMobile: true, render: (v) => formatDateTime(v.inspection_date) },
        { key: 'inspector_name', label: 'المفتش', hideOnMobile: true, render: (v) => v.inspector_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="تفتيش المركبات"
      subtitle={`${t.count} عملية تفتيش`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث باللوحة أو الملاحظات..."
      filters={[
        {
          key: 'overall_status',
          label: 'الحكم',
          options: Object.entries(borderInspectionOverall).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('overall_status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد عمليات تفتيش"
      emptyDescription="سجّل نتائج تفتيش المركبات."
    />
  );
};

const CargoTab = () => {
  const t = useServerTable<CargoInspection>({ fetchData: getCargoInspections });
  const [target, setTarget] = useState<CargoInspection | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = useCallback(async (id: string, decision?: string) => {
    setBusy(true);
    try {
      await decideCargoInspection(id, decision);
      notifySuccess('تم تسجيل قرار الشحنة');
      setTarget(null);
      t.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تسجيل القرار'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  return (
    <>
      <DataTable<CargoInspection>
        columns={[
          { key: 'declaration_number', label: 'رقم الإقرار', render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.declaration_number || '—'}</Typography>
          ) },
          { key: 'scope', label: 'النطاق', render: (v) => (
            <StatusChip
              label={borderCargoScope[v.scope]?.label ?? v.scope}
              tone={borderCargoScope[v.scope]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'product_type', label: 'الصنف', render: (v) => v.product_type || '—' },
          { key: 'country_of_origin', label: 'المنشأ', hideOnMobile: true, render: (v) => v.country_of_origin || '—' },
          { key: 'plate_number', label: 'اللوحة', hideOnMobile: true, render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', direction: 'ltr' }}>{v.plate_number || '—'}</Typography>
          ) },
          { key: 'status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderCargoStatus[v.status]?.label ?? v.status}
              tone={borderCargoStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'decision', label: 'القرار', render: (v) => (
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
        title="تفتيش الشحنات"
        subtitle={`${t.count} شحنة`}
        searchInput={t.searchInput}
        onSearchChange={t.setSearchInput}
        searchPlaceholder="بحث برقم الإقرار أو الصنف أو المنشأ..."
        filters={[
          {
            key: 'scope',
            label: 'النطاق',
            options: Object.entries(borderCargoScope).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('scope', v),
          },
          {
            key: 'status',
            label: 'الحالة',
            options: Object.entries(borderCargoStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('status', v),
          },
        ]}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onRefresh={t.refresh}
        emptyTitle="لا توجد شحنات"
        emptyDescription="سجّل تفتيش الشحنات العامة والغذائية."
        actions={(v) => (
          <Tooltip title="حساب القرار من العيّنات">
            <IconButton
              aria-label="تسجيل قرار الشحنة"
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
        <DialogTitle sx={{ fontWeight: 700 }}>تسجيل قرار الشحنة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              يجمع النظام القرار من نتائج العيّنات المرتبطة. يمكنك تجاوزه بقرار صريح.
            </Typography>
            {target && (
              <Typography variant="body2">
                الإقرار: <b>{target.declaration_number || '—'}</b> · {borderCargoScope[target.scope]?.label ?? target.scope}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setTarget(null)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          {target && (
            <>
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => decide(target.id, 'REJECTED')}
                sx={{ fontWeight: 700 }}
              >
                رفض
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={busy}
                onClick={() => decide(target.id, 'HOLD')}
                sx={{ fontWeight: 700 }}
              >
                حجز
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                onClick={() => decide(target.id)}
                sx={{ fontWeight: 700 }}
              >
                احتساب من العيّنات
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

const SamplesTab = () => {
  const t = useServerTable<BorderSample>({ fetchData: getSamples });
  return (
    <DataTable<BorderSample>
      columns={[
        { key: 'sample_code', label: 'كود العيّنة', render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.sample_code || '—'}</Typography>
        ) },
        { key: 'sample_type', label: 'نوع العيّنة', render: (v) => v.sample_type },
        { key: 'status', label: 'الحالة', render: (v) => (
          <StatusChip
            label={borderSampleStatus[v.status]?.label ?? v.status}
            tone={borderSampleStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'result', label: 'النتيجة', render: (v) => v.result || '—' },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'collected_by_name', label: 'المسحوب', hideOnMobile: true, render: (v) => v.collected_by_name || '—' },
        { key: 'collected_at', label: 'التاريخ', hideOnMobile: true, render: (v) => formatDateTime(v.collected_at) },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="العيّنات"
      subtitle={`${t.count} عيّنة`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث بكود العيّنة أو نوعها..."
      filters={[
        {
          key: 'status',
          label: 'الحالة',
          options: Object.entries(borderSampleStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد عيّنات"
      emptyDescription="سجّل عيّنات الشحنات الغذائية والمياه."
    />
  );
};

const QuarantineTab = () => {
  const t = useServerTable<QuarantineCase>({ fetchData: getQuarantineCases });
  return (
    <DataTable<QuarantineCase>
      columns={[
        { key: 'case_number', label: 'رقم الحالة', render: (v) => (
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.case_number}</Typography>
        ) },
        { key: 'person_name', label: 'الحالة', render: (v) => v.person_name || '—' },
        { key: 'entry_at', label: 'تاريخ الدخول', render: (v) => formatDateTime(v.entry_at) },
        { key: 'required_days', label: 'المدة', align: 'center', hideOnMobile: true, render: (v) => `${v.required_days} يوم` },
        { key: 'expected_end_date', label: 'النهاية المتوقعة', render: (v) => (v.expected_end_date ? formatDate(v.expected_end_date) : '—') },
        { key: 'phase', label: 'المرحلة', render: (v) => (
          <StatusChip
            label={borderQuarantinePhase[v.phase]?.label ?? v.phase}
            tone={borderQuarantinePhase[v.phase]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'status', label: 'الحالة', render: (v) => (
          <StatusChip
            label={borderQuarantineStatus[v.status]?.label ?? v.status}
            tone={borderQuarantineStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="حالات الحجر"
      subtitle={`${t.count} حالة`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث برقم الحالة أو الاسم..."
      filters={[
        {
          key: 'status',
          label: 'الحالة',
          options: Object.entries(borderQuarantineStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
        {
          key: 'phase',
          label: 'المرحلة',
          options: Object.entries(borderQuarantinePhase).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('phase', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد حالات حجر"
      emptyDescription="تُفتح حالة حجر من قرار الفحص أو الإحالة الطبية."
    />
  );
};

const IsolationTab = () => {
  const t = useServerTable<IsolationCase>({ fetchData: getIsolationCases });
  return (
    <DataTable<IsolationCase>
      columns={[
        { key: 'start_date', label: 'تاريخ البدء', render: (v) => formatDate(v.start_date) },
        { key: 'expected_end_date', label: 'النهاية المتوقعة', render: (v) => (v.expected_end_date ? formatDate(v.expected_end_date) : '—') },
        { key: 'end_date', label: 'النهاية الفعلية', hideOnMobile: true, render: (v) => (v.end_date ? formatDate(v.end_date) : 'مستمر') },
        { key: 'status', label: 'الحالة', render: (v) => (
          <StatusChip
            label={borderIsolationStatus[v.status]?.label ?? v.status}
            tone={borderIsolationStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'started_by_name', label: 'بدأها', hideOnMobile: true, render: (v) => v.started_by_name || '—' },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        { key: 'notes', label: 'ملاحظات', hideOnMobile: true, render: (v) => v.notes || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="حالات العزل"
      subtitle={`${t.count} حالة`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث في الملاحظات..."
      filters={[
        {
          key: 'status',
          label: 'الحالة',
          options: Object.entries(borderIsolationStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
      ]}
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      emptyTitle="لا توجد حالات عزل"
      emptyDescription="سجّل العزل للحالات المشتبه بها أو المصابة."
    />
  );
};

const TracingTab = () => {
  const cases = useServerTable<ContactTracingCase>({ fetchData: getContactTracingCases });
  const contacts = useServerTable<Contact>({ fetchData: getContacts });

  return (
    <Stack spacing={2.5}>
      <DataTable<ContactTracingCase>
        columns={[
          { key: 'index_case_name', label: 'الحالة الأصل', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.index_case_name || '—'}</Typography> },
          { key: 'transport_mode', label: 'وسيلة النقل', hideOnMobile: true, render: (v) => v.transport_mode || '—' },
          { key: 'follow_up_days', label: 'أيام المتابعة', align: 'center', render: (v) => v.follow_up_days || '—' },
          { key: 'started_at', label: 'تاريخ البدء', render: (v) => formatDateTime(v.started_at) },
          { key: 'status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderContactTracingStatus[v.status]?.label ?? v.status}
              tone={borderContactTracingStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={cases.rows}
        rowKey={(v) => v.id}
        count={cases.count}
        page={cases.page}
        rowsPerPage={cases.rowsPerPage}
        pageSizeOptions={cases.pageSizeOptions}
        loading={cases.loading}
        error={cases.error}
        title="حالات التتبع"
        subtitle={`${cases.count} حالة`}
        searchInput={cases.searchInput}
        onSearchChange={cases.setSearchInput}
        searchPlaceholder="بحث باسم الحالة الأصل..."
        onPageChange={cases.setPage}
        onRowsPerPageChange={cases.setRowsPerPage}
        onRefresh={cases.refresh}
        emptyTitle="لا توجد حالات تتبع"
        emptyDescription="تُفتح حالة تتبع من تسجيل مخالفي وسيلة نقل وارد."
      />

      <DataTable<Contact>
        columns={[
          { key: 'full_name', label: 'المخاطَب', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.full_name}</Typography> },
          { key: 'passport_number', label: 'الجواز', render: (v) => (
            <Typography sx={{ fontFamily: 'monospace' }}>{v.passport_number || '—'}</Typography>
          ) },
          { key: 'phone', label: 'الهاتف', hideOnMobile: true, render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', direction: 'ltr' }}>{v.phone || '—'}</Typography>
          ) },
          { key: 'seat_or_relation', label: 'المقعد / الصلة', hideOnMobile: true, render: (v) => v.seat_or_relation || '—' },
          { key: 'follow_up_day', label: 'يوم المتابعة', align: 'center', render: (v) => v.follow_up_day ?? '—' },
          { key: 'status', label: 'الحالة', render: (v) => (
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
        title="المخالطون"
        subtitle={`${contacts.count} مخاطَب`}
        searchInput={contacts.searchInput}
        onSearchChange={contacts.setSearchInput}
        searchPlaceholder="بحث بالاسم أو الجواز أو الهاتف..."
        onPageChange={contacts.setPage}
        onRowsPerPageChange={contacts.setRowsPerPage}
        onRefresh={contacts.refresh}
        emptyTitle="لا يوجد مخالطون"
        emptyDescription="سجّل بيانات المخالطين لكل حالة تتبع."
      />
    </Stack>
  );
};

const EmergenciesTab = () => {
  const incidents = useServerTable<BorderHealthIncident>({ fetchData: getIncidents });
  const emergencies = useServerTable<BorderEmergency>({ fetchData: getEmergencies });

  return (
    <Stack spacing={2.5}>
      <DataTable<BorderHealthIncident>
        columns={[
          { key: 'title', label: 'الحادثة', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
          { key: 'severity', label: 'الخطورة', render: (v) => (
            <StatusChip
              label={borderIncidentSeverity[v.severity]?.label ?? v.severity}
              tone={borderIncidentSeverity[v.severity]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderIncidentStatus[v.status]?.label ?? v.status}
              tone={borderIncidentStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'reported_at', label: 'تاريخ البلاغ', render: (v) => formatDateTime(v.reported_at) },
          { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={incidents.rows}
        rowKey={(v) => v.id}
        count={incidents.count}
        page={incidents.page}
        rowsPerPage={incidents.rowsPerPage}
        pageSizeOptions={incidents.pageSizeOptions}
        loading={incidents.loading}
        error={incidents.error}
        title="الحوادث الصحية"
        subtitle={`${incidents.count} حادثة`}
        searchInput={incidents.searchInput}
        onSearchChange={incidents.setSearchInput}
        searchPlaceholder="بحث بعنوان الحادثة أو الوصف..."
        filters={[
          {
            key: 'severity',
            label: 'الخطورة',
            options: Object.entries(borderIncidentSeverity).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => incidents.setFilter('severity', v),
          },
        ]}
        onPageChange={incidents.setPage}
        onRowsPerPageChange={incidents.setRowsPerPage}
        onRefresh={incidents.refresh}
        emptyTitle="لا توجد حوادث"
        emptyDescription="بلّغ عن الحوادث الصحية عند المعبر."
      />

      <DataTable<BorderEmergency>
        columns={[
          { key: 'title', label: 'الطوارئ', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
          { key: 'restriction_level', label: 'مستوى التقييد', render: (v) => (
            <StatusChip
              label={borderRestrictionLevel[v.restriction_level]?.label ?? v.restriction_level}
              tone={borderRestrictionLevel[v.restriction_level]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderIncidentStatus[v.status]?.label ?? v.status}
              tone={borderIncidentStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'reported_at', label: 'تاريخ البلاغ', render: (v) => formatDateTime(v.reported_at) },
          { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
        ]}
        rows={emergencies.rows}
        rowKey={(v) => v.id}
        count={emergencies.count}
        page={emergencies.page}
        rowsPerPage={emergencies.rowsPerPage}
        pageSizeOptions={emergencies.pageSizeOptions}
        loading={emergencies.loading}
        error={emergencies.error}
        title="حالات الطوارئ"
        subtitle={`${emergencies.count} حالة`}
        searchInput={emergencies.searchInput}
        onSearchChange={emergencies.setSearchInput}
        searchPlaceholder="بحث بالعنوان أو الوصف..."
        onPageChange={emergencies.setPage}
        onRowsPerPageChange={emergencies.setRowsPerPage}
        onRefresh={emergencies.refresh}
        emptyTitle="لا توجد طوارئ"
        emptyDescription="سجّل حالات الطوارئ مع مستوى التقييد والمرض."
      />
    </Stack>
  );
};

const DecisionsTab = () => {
  const t = useServerTable<BorderDecision>({ fetchData: getDecisions });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);

  return (
    <DataTable<BorderDecision>
      columns={[
        { key: 'decided_at', label: 'تاريخ القرار', render: (v) => formatDateTime(v.decided_at) },
        { key: 'subject_type', label: 'الموضوع', render: (v) => v.subject_type },
        { key: 'outcome', label: 'النتيجة', render: (v) => (
          <StatusChip
            label={borderDecisionOutcome[v.outcome]?.label ?? v.outcome}
            tone={borderDecisionOutcome[v.outcome]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'reason', label: 'السبب', render: (v) => v.reason || '—' },
        { key: 'decided_by_name', label: 'اتخذ القرار', render: (v) => v.decided_by_name || '—' },
        { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="القرارات"
      subtitle={`${t.count} قرار`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث في سبب القرار..."
      onPageChange={t.setPage}
      onRowsPerPageChange={t.setRowsPerPage}
      onRefresh={t.refresh}
      onExport={() => exportAll({
        filename: 'border-decisions',
        headers: ['التاريخ', 'الموضوع', 'النتيجة', 'السبب', 'المعبر'],
        mapRow: (v) => [v.decided_at, v.subject_type, v.outcome, v.reason, v.crossing_name ?? ''],
        message: 'تم تصدير القرارات',
      })}
      exporting={exporting}
      emptyTitle="لا توجد قرارات"
      emptyDescription="تُسجَّل قرارات الإفراج والتوجيه تلقائياً عند الفحص والتخليص."
    />
  );
};

const NotificationsTab = () => {
  const t = useServerTable<BorderNotification>({ fetchData: getNotifications });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);

  return (
    <DataTable<BorderNotification>
      columns={[
        { key: 'sent_at', label: 'تاريخ الإرسال', render: (v) => (v.sent_at ? formatDateTime(v.sent_at) : '—') },
        { key: 'title', label: 'العنوان', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.title}</Typography> },
        { key: 'channel', label: 'القناة', render: (v) => (
          <StatusChip
            label={borderNotificationChannel[v.channel]?.label ?? v.channel}
            tone={borderNotificationChannel[v.channel]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'status', label: 'التسليم', render: (v) => (
          <StatusChip
            label={borderNotificationDeliveryStatus[v.status]?.label ?? v.status}
            tone={borderNotificationDeliveryStatus[v.status]?.tone ?? 'neutral'}
          />
        ) },
        { key: 'recipient_role', label: 'المستلم', render: (v) => v.recipient_role },
        { key: 'recipient_contact', label: 'وسيلة التواصل', hideOnMobile: true, render: (v) => v.recipient_contact || '—' },
      ]}
      rows={t.rows}
      rowKey={(v) => v.id}
      count={t.count}
      page={t.page}
      rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions}
      loading={t.loading}
      error={t.error}
      title="الإشعارات"
      subtitle={`${t.count} إشعار`}
      searchInput={t.searchInput}
      onSearchChange={t.setSearchInput}
      searchPlaceholder="بحث في العنوان أو النص..."
      filters={[
        {
          key: 'status',
          label: 'التسليم',
          options: Object.entries(borderNotificationDeliveryStatus).map(([value, meta]) => ({ value, label: meta.label })),
          value: '',
          onChange: (v) => t.setFilter('status', v),
        },
        {
          key: 'channel',
          label: 'القناة',
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
        headers: ['التاريخ', 'العنوان', 'القناة', 'التسليم', 'المستلم'],
        mapRow: (v) => [v.sent_at ?? '', v.title, v.channel, v.status, v.recipient_role],
        message: 'تم تصدير الإشعارات',
      })}
      exporting={exporting}
      emptyTitle="لا توجد إشعارات"
      emptyDescription="تُرسل إشعارات تنبيه للكادر عند الطوارئ والقرارات."
    />
  );
};

const StatisticsTab = () => {
  const t = useServerTable<BorderDailyStatistics>({ fetchData: getDailyStatistics });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshDailyStatistics();
      notifySuccess('تم تحديثحصيلة اليوم لكل المعابر');
      t.refresh();
    } catch {
      notifyError('تعذّر تحديث الإحصاءات — قد تحتاج صلاحية لوحة القيادة');
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
        {refreshing ? 'جارٍ التحديث...' : 'تحديث حصيلة اليوم'}
      </Button>

      <DataTable<BorderDailyStatistics>
        columns={[
          { key: 'stat_date', label: 'التاريخ', render: (v) => formatDate(v.stat_date) },
          { key: 'crossing_name', label: 'المعبر', render: (v) => <Typography sx={{ fontWeight: 700 }}>{v.crossing_name || '—'}</Typography> },
          { key: 'travelers_inbound', label: 'داخل', align: 'center', render: (v) => v.travelers_inbound.toLocaleString('ar') },
          { key: 'travelers_outbound', label: 'خارج', align: 'center', render: (v) => v.travelers_outbound.toLocaleString('ar') },
          { key: 'vehicles_inspected', label: 'مركبات', align: 'center', hideOnMobile: true, render: (v) => v.vehicles_inspected },
          { key: 'quarantine_cases', label: 'حجر', align: 'center', render: (v) => v.quarantine_cases },
          { key: 'samples_collected', label: 'عيّنات', align: 'center', hideOnMobile: true, render: (v) => v.samples_collected },
          { key: 'average_processing_minutes', label: 'متوسط المعالجة', align: 'center', render: (v) => (
            v.average_processing_minutes == null ? '—' : `${v.average_processing_minutes} د`
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
        title="الحصيلة اليومية"
        subtitle={`${t.count} سجل`}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onRefresh={t.refresh}
        emptyTitle="لا توجد حصيلة"
        emptyDescription="اضغط «تحديث حصيلة اليوم» لحساب أرقام اليوم من سجلات الفحص والشحنات."
      />
    </Stack>
  );
};

const CertificatesTab = () => {
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
      notifyError('اختر المعبر أولاً');
      return;
    }
    setIssuing(true);
    try {
      const res = await issueCertificate({
        crossing: crossingId,
        certificate_type: certType as BorderCertificate['certificate_type'],
        expiry_days: expiryDays,
      });
      notifySuccess(`صدرت الشهادة ${res.data.data.certificate_number}`);
      setIssueOpen(false);
      t.refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر إصدار الشهادة'));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <DataTable<BorderCertificate>
        columns={[
          { key: 'certificate_number', label: 'رقم الشهادة', render: (v) => (
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.certificate_number}</Typography>
          ) },
          { key: 'certificate_type', label: 'النوع', render: (v) => (
            <StatusChip
              label={borderCertificateType[v.certificate_type]?.label ?? v.certificate_type}
              tone={borderCertificateType[v.certificate_type]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'issue_date', label: 'تاريخ الإصدار', render: (v) => formatDate(v.issue_date) },
          { key: 'expiry_date', label: 'ينتهي', hideOnMobile: true, render: (v) => (v.expiry_date ? formatDate(v.expiry_date) : '—') },
          { key: 'status', label: 'الحالة', render: (v) => (
            <StatusChip
              label={borderCertificateStatus[v.status]?.label ?? v.status}
              tone={borderCertificateStatus[v.status]?.tone ?? 'neutral'}
            />
          ) },
          { key: 'crossing_name', label: 'المعبر', hideOnMobile: true, render: (v) => v.crossing_name || '—' },
          { key: 'issued_by_name', label: 'أصدرها', hideOnMobile: true, render: (v) => v.issued_by_name || '—' },
        ]}
        rows={t.rows}
        rowKey={(v) => v.id}
        count={t.count}
        page={t.page}
        rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions}
        loading={t.loading}
        error={t.error}
        title="الشهادات"
        subtitle={`${t.count} شهادة`}
        searchInput={t.searchInput}
        onSearchChange={t.setSearchInput}
        searchPlaceholder="بحث برقم الشهادة..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: Object.entries(borderCertificateStatus).map(([value, meta]) => ({ value, label: meta.label })),
            value: '',
            onChange: (v) => t.setFilter('status', v),
          },
        ]}
        onPageChange={t.setPage}
        onRowsPerPageChange={t.setRowsPerPage}
        onExport={() => exportAll({
          filename: 'border-certificates',
          headers: ['الرقم', 'النوع', 'الإصدار', 'الانتهاء', 'الحالة'],
          mapRow: (v) => [v.certificate_number, v.certificate_type, v.issue_date, v.expiry_date ?? '', v.status],
          message: 'تم تصدير الشهادات',
        })}
        exporting={exporting}
        onRefresh={t.refresh}
        emptyTitle="لا توجد شهادات"
        emptyDescription="أصدر شهادة إفراج أو تصريح عبور من زر الإصدار."
        actions={() => (
          <Tooltip title="إصدار شهادة">
            <IconButton
              aria-label="إصدار شهادة"
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
            إصدار شهادة
          </Button>
        }
      />

      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إصدار شهادة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label="المعبر *"
              value={crossingId}
              onChange={(e) => setCrossingId(e.target.value)}
            >
              {crossings.rows.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name_ar} ({c.entry_point_code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="نوع الشهادة"
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
              label="مدة الصلاحية (يوم)"
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIssueOpen(false)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={issue}
            disabled={issuing}
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            إصدار
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const BordersHealthPage = () => {
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  return (
    <Box>
      <PageHeader
        title="صحة المعابر البرية"
        subtitle="إدارة المعابر البرية: الحركة، الفحص، المركبات، الشحنات، الحجر والعزل، والتتبع"
        eyebrow="مركز قيادة المعابر"
      />
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.4} lg={2}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
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
