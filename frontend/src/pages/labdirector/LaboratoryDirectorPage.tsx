import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import VerifiedIcon from '@mui/icons-material/Verified';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimelineIcon from '@mui/icons-material/Timeline';
import BuildIcon from '@mui/icons-material/Build';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import GppGoodIcon from '@mui/icons-material/GppGood';
import GppBadIcon from '@mui/icons-material/GppBad';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import {
  AppButton,
  DataTable,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  approveSample,
  getAuditLogs,
  getCertificates,
  getLabDirectorDashboard,
  getLabEquipment,
  getLabSamples,
  getNonConformities,
  getReagents,
} from '../../api/endpoints/foodlab';
import type {
  AnalysisCertificate,
  AuditLog,
  FoodSample,
  LabDirectorDashboard,
  LabEquipment,
  NonConformity,
  Reagent,
} from '../../types/food';
import { labApproval, labBench } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

type NavKey =
  | 'home'
  | 'approval' | 'approval.queue' | 'approval.approved' | 'approval.rejected'
  | 'samples.all' | 'samples.today' | 'samples.overdue'
  | 'departments.microbiology' | 'departments.chemistry' | 'departments.physical'
  | 'sla.overview' | 'sla.at_risk'
  | 'equipment.calibration' | 'equipment.status'
  | 'reagents'
  | 'nc.open' | 'nc.capa'
  | 'reports'
  | 'notifications' | 'settings' | 'help';

const NAV_TITLES: Record<string, string> = {
  home: 'labDirector.nav.home',
  approval: 'labDirector.nav.approval',
  'approval.queue': 'labDirector.nav.approvalQueue',
  'approval.approved': 'labDirector.nav.approvalApproved',
  'approval.rejected': 'labDirector.nav.approvalRejected',
  'samples.all': 'labDirector.nav.samplesAll',
  'samples.today': 'labDirector.nav.samplesToday',
  'samples.overdue': 'labDirector.nav.samplesOverdue',
  'departments.microbiology': 'labDirector.nav.departmentsMicrobiology',
  'departments.chemistry': 'labDirector.nav.departmentsChemistry',
  'departments.physical': 'labDirector.nav.departmentsPhysical',
  'sla.overview': 'labDirector.nav.slaOverview',
  'sla.at_risk': 'labDirector.nav.slaAtRisk',
  'equipment.calibration': 'labDirector.nav.equipmentCalibration',
  'equipment.status': 'labDirector.nav.equipmentStatus',
  reagents: 'labDirector.nav.reagents',
  'nc.open': 'labDirector.nav.ncOpen',
  'nc.capa': 'labDirector.nav.ncCapa',
  reports: 'labDirector.nav.reports',
  notifications: 'labDirector.nav.notifications',
};

const NC_STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' }> = {
  OPEN: { label: 'labDirector.ncStatus.open', tone: 'error' },
  UNDER_INVESTIGATION: { label: 'labDirector.ncStatus.underInvestigation', tone: 'warning' },
  AWAITING_CAPA: { label: 'labDirector.ncStatus.awaitingCapa', tone: 'primary' },
  CLOSED: { label: 'labDirector.ncStatus.closed', tone: 'success' },
};

const SAMPLE_STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' | 'info' }> = {
  REGISTERED: { label: 'labDirector.sampleStatus.registered', tone: 'info' },
  PROCESSING: { label: 'labDirector.sampleStatus.processing', tone: 'warning' },
  COMPLETED: { label: 'labDirector.sampleStatus.completed', tone: 'success' },
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'labDirector.sections.overview', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'approval', label: 'labDirector.sections.approval', icon: <VerifiedIcon fontSize="small" /> },
  { id: 'sla', label: 'labDirector.sections.sla', icon: <TimelineIcon fontSize="small" /> },
  { id: 'departments', label: 'labDirector.sections.departments', icon: <AccountTreeIcon fontSize="small" /> },
  { id: 'alerts', label: 'labDirector.sections.alerts', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'quality', label: 'labDirector.sections.quality', icon: <FindInPageIcon fontSize="small" /> },
] as const;

const LaboratoryDirectorPage = () => {
  const { t } = useTranslation();
  const [dash, setDash] = useState<LabDirectorDashboard | null>(null);
  const [nav, setNav] = useState<NavKey>(() =>
    (typeof window !== 'undefined' && window.location.hash.replace('#', '')
      ? (window.location.hash.replace('#', '') as NavKey)
      : 'home'),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const key = window.location.hash.replace('#', '');
      if (key) setNav(key as NavKey);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectNav = (key: NavKey) => {
    setNav(key);
    if (typeof window !== 'undefined') window.location.hash = key;
  };

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples });
  const equipment = useServerTable<LabEquipment>({ fetchData: getLabEquipment });
  const reagents = useServerTable<Reagent>({ fetchData: getReagents });
  const ncs = useServerTable<NonConformity>({ fetchData: getNonConformities });
  const audits = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const certificates = useServerTable<AnalysisCertificate>({ fetchData: getCertificates });

  const refreshDash = useCallback(() => {
    getLabDirectorDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    samples.refresh();
    equipment.refresh();
    reagents.refresh();
    ncs.refresh();
    audits.refresh();
    certificates.refresh();
  }, [refreshDash, samples, equipment, reagents, ncs, audits, certificates]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [dash]);

  const runApprove = async (id: string) => {
    setBusy(true);
    try {
      await approveSample(id);
      notifySuccess(t('labDirector.messages.approveSuccess'));
      refreshAll();
    } catch {
      notifyError(t('labDirector.messages.approveError'));
    } finally {
      setBusy(false);
    }
  };

  const stat = (label: string, value: number | string, icon: React.ReactNode, accent?: string) => (
    <Grid item xs={6} sm={4} md={3}>
      <KpiCard label={label} value={value ?? '—'} icon={icon} accent={accent} />
    </Grid>
  );

  const sampleColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: t('labDirector.columns.sampleNumber'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'source_name', label: t('labDirector.columns.source'), render: (s) => s.source_name ?? '—' },
    { key: 'sample_type', label: t('labDirector.columns.type'), render: (s) => s.sample_type || '—' },
    { key: 'bench', label: t('labDirector.columns.bench'), render: (s) => <StatusChip label={labBench[s.bench]?.label ?? s.bench} tone={labBench[s.bench]?.tone} /> },
    { key: 'status', label: t('labDirector.columns.status'), render: (s) => <StatusChip label={SAMPLE_STATUS_LABELS[s.status]?.label ? t(SAMPLE_STATUS_LABELS[s.status].label) : s.status} tone={SAMPLE_STATUS_LABELS[s.status]?.tone} /> },
    { key: 'approval_status', label: t('labDirector.columns.approval'), render: (s) => <StatusChip label={labApproval[s.approval_status]?.label ?? s.approval_status} tone={labApproval[s.approval_status]?.tone} /> },
    { key: 'received_at', label: t('labDirector.columns.receivedAt'), render: (s) => formatDate(s.received_at) },
  ], [t]);

  const approvalColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: t('labDirector.columns.sampleNumber'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'source_name', label: t('labDirector.columns.source'), render: (s) => s.source_name ?? '—' },
    { key: 'sample_type', label: t('labDirector.columns.type'), render: (s) => s.sample_type || '—' },
    { key: 'bench', label: t('labDirector.columns.bench'), render: (s) => <StatusChip label={labBench[s.bench]?.label ?? s.bench} tone={labBench[s.bench]?.tone} /> },
    { key: 'received_at', label: t('labDirector.columns.uploadedAt'), render: (s) => formatDateTime(s.received_at) },
    {
      key: 'actions', label: t('labDirector.columns.action'), render: (s) => (
        <AppButton size="small" variant="primary" onClick={() => runApprove(s.id)} disabled={busy}>{t('labDirector.actions.approve')}</AppButton>
      ),
    },
  ], [busy, t]);

  const equipmentColumns: DataTableColumn<LabEquipment>[] = useMemo(() => [
    { key: 'name_ar', label: t('labDirector.columns.equipment'), render: (e) => <b>{e.name_ar}</b> },
    { key: 'bench', label: t('labDirector.columns.bench'), render: (e) => (labBench[e.bench]?.label ?? e.bench) },
    { key: 'status', label: t('labDirector.columns.status'), render: (e) => (
      <StatusChip
        label={e.status_label ?? e.status}
        tone={e.status === 'OPERATIONAL' ? 'success' : e.status === 'UNDER_MAINTENANCE' ? 'warning' : 'error'}
      />
    ) },
    { key: 'last_calibrated', label: t('labDirector.columns.lastCalibrated'), render: (e) => (e.last_calibrated ? formatDate(e.last_calibrated) : '—') },
    { key: 'next_calibration_due', label: t('labDirector.columns.nextCalibration'), render: (e) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {e.next_calibration_due ? formatDate(e.next_calibration_due) : '—'}
        {e.calibration_overdue && <GppBadIcon fontSize="small" color="error" />}
      </Stack>
    ) },
  ], [t]);

  const reagentColumns: DataTableColumn<Reagent>[] = useMemo(() => [
    { key: 'name_ar', label: t('labDirector.columns.reagent'), render: (r) => <b>{r.name_ar}</b> },
    { key: 'bench', label: t('labDirector.columns.bench'), render: (r) => (labBench[r.bench]?.label ?? r.bench) },
    { key: 'lot_number', label: t('labDirector.columns.lotNumber') },
    { key: 'expiry_date', label: t('labDirector.columns.expiryDate'), render: (r) => (r.expiry_date ? formatDate(r.expiry_date) : '—') },
    { key: 'quantity', label: t('labDirector.columns.quantity'), render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'status', label: t('labDirector.columns.status'), render: (r) => (
      <StatusChip
        label={r.status === 'AVAILABLE' ? t('labDirector.reagentStatus.available') : r.status === 'LOW' ? t('labDirector.reagentStatus.low') : r.status === 'EXPIRED' ? t('labDirector.reagentStatus.expired') : r.status}
        tone={r.status === 'AVAILABLE' ? 'success' : r.status === 'LOW' ? 'warning' : 'error'}
      />
    ) },
  ], [t]);

  const ncColumns: DataTableColumn<NonConformity>[] = useMemo(() => [
    { key: 'nc_number', label: t('labDirector.columns.number'), render: (n) => <b>{n.nc_number}</b> },
    { key: 'title', label: t('labDirector.columns.title') },
    { key: 'nc_type', label: t('labDirector.columns.type'), render: (n) => <Chip size="small" label={n.nc_type} /> },
    { key: 'severity', label: t('labDirector.columns.severity'), render: (n) => <StatusChip label={n.severity} tone={n.severity === 'CRITICAL' ? 'error' : n.severity === 'MAJOR' ? 'warning' : 'success'} /> },
    { key: 'status', label: t('labDirector.columns.status'), render: (n) => <StatusChip label={NC_STATUS_LABELS[n.status]?.label ? t(NC_STATUS_LABELS[n.status].label) : n.status} tone={NC_STATUS_LABELS[n.status]?.tone} /> },
  ], [t]);

  const auditColumns: DataTableColumn<AuditLog>[] = useMemo(() => [
    { key: 'user_name', label: t('labDirector.columns.user'), render: (a) => a.user_name ?? '—' },
    { key: 'action', label: t('labDirector.columns.actionType'), render: (a) => <StatusChip label={a.action} tone={a.action === 'CREATE' ? 'success' : a.action === 'DELETE' ? 'error' : 'primary'} /> },
    { key: 'object_type', label: t('labDirector.columns.objectType') },
    { key: 'object_label', label: t('labDirector.columns.description'), render: (a) => a.object_label || '—' },
    { key: 'created_at', label: t('labDirector.columns.time'), render: (a) => formatDateTime(a.created_at) },
  ], [t]);

  const certColumns: DataTableColumn<AnalysisCertificate>[] = useMemo(() => [
    { key: 'certificate_number', label: t('labDirector.columns.number'), render: (c) => <b>{c.certificate_number}</b> },
    { key: 'sample_number', label: t('labDirector.columns.sample'), render: (c) => c.sample_number ?? '—' },
    { key: 'status', label: t('labDirector.columns.status'), render: (c) => <StatusChip label={c.status} tone={c.status === 'ISSUED' ? 'success' : 'warning'} /> },
    { key: 'issued_at', label: t('labDirector.columns.issuedAt'), render: (c) => (c.issued_at ? formatDate(c.issued_at) : '—') },
  ], [t]);

  const renderKpiProgress = (label: string, value: number | null | undefined, color?: string) => {
    const pct = value ?? 0;
    return (
      <Box sx={{ mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color }}>
            {value != null ? `${pct}%` : '—'}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={value != null ? Math.min(pct, 100) : 0}
          color={pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'error'}
          sx={{ height: 8, borderRadius: 2 }}
        />
      </Box>
    );
  };

  const renderDeptCard = (label: string, dept: { total: number; completed: number; performance_pct: number; under_testing: number; ready_for_approval: number; tests_total: number }) => (
    <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="h6">{label}</Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={6}><Typography variant="h4" sx={{ fontWeight: 700 }}>{dept.total}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.dept.totalSamples')}</Typography></Grid>
        <Grid item xs={6}><Typography variant="h4" sx={{ fontWeight: 700 }}>{dept.completed}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.dept.completed')}</Typography></Grid>
        <Grid item xs={6}><Typography variant="h4" sx={{ fontWeight: 700 }}>{dept.under_testing}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.dept.underTesting')}</Typography></Grid>
        <Grid item xs={6}><Typography variant="h4" sx={{ fontWeight: 700 }}>{dept.ready_for_approval}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.dept.awaitingApproval')}</Typography></Grid>
      </Grid>
      <Divider sx={{ my: 1.5 }} />
      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('labDirector.dept.performance')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: dept.performance_pct >= 90 ? 'success.main' : dept.performance_pct >= 75 ? 'warning.main' : 'error.main' }}>
            {dept.performance_pct}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(dept.performance_pct, 100)}
          color={dept.performance_pct >= 90 ? 'success' : dept.performance_pct >= 75 ? 'warning' : 'error'}
          sx={{ height: 8, borderRadius: 2 }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('labDirector.dept.tests')}: {dept.tests_total}
      </Typography>
    </Paper>
  );

  const renderDashboard = () => (
    <Box>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.kpi.totalSamples'), dash?.kpis.total_samples ?? '—', <Inventory2Icon />)}
        {stat(t('labDirector.kpi.samplesToday'), dash?.kpis.samples_today ?? '—', <HistoryIcon />, 'info.main')}
        {stat(t('labDirector.kpi.underTesting'), dash?.kpis.under_testing ?? '—', <BuildIcon />, 'warning.main')}
        {stat(t('labDirector.kpi.awaitingApproval'), dash?.kpis.ready_for_approval ?? '—', <VerifiedIcon />, 'primary.main')}
        {stat(t('labDirector.kpi.overdue'), dash?.kpis.overdue ?? '—', <EventBusyIcon />, 'error.main')}
        {stat(t('labDirector.kpi.approved'), dash?.kpis.approved ?? '—', <CheckCircleIcon />, 'success.main')}
        {stat(t('labDirector.kpi.openNc'), dash?.nonconformity.open ?? '—', <WarningAmberIcon />, 'error.main')}
        {stat(t('labDirector.kpi.overdueCalibration'), dash?.equipment.overdue ?? '—', <BuildIcon />, 'error.main')}
      </Grid>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box component="section" ref={register('approval')} data-section="approval" sx={{ scrollMarginTop: '80px' }}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <VerifiedIcon color="primary" />
                <Typography variant="h6">{t('labDirector.approvalQueue.title')}</Typography>
              </Stack>
              <AppButton size="small" variant="secondary" onClick={() => selectNav('approval.queue')}>{t('labDirector.actions.viewAll')}</AppButton>
            </Stack>
            {dash && dash.approval_queue.samples.length > 0 ? (
              <Stack spacing={1}>
                {dash.approval_queue.samples.map((s) => (
                  <Paper key={s.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.sample_number}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.sample_type || '—'} · {s.bench_label} · {s.source}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={labBench[s.bench]?.label ?? s.bench} color="primary" variant="outlined" />
                        <AppButton size="small" variant="primary" onClick={() => runApprove(s.id)} disabled={busy}>{t('labDirector.actions.approve')}</AppButton>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ {t('labDirector.approvalQueue.empty')}</Typography>
            )}
          </Paper>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box component="section" ref={register('sla')} data-section="sla" sx={{ scrollMarginTop: '80px' }}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TimelineIcon color="primary" />
              <Typography variant="h6">{t('labDirector.sla.title')}</Typography>
            </Stack>
            {renderKpiProgress(t('labDirector.sla.compliance'), dash?.sla.sla_compliance_pct)}
            {renderKpiProgress(t('labDirector.sla.decisionCompliance'), dash?.decisions.compliant_pct)}
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <EventBusyIcon color="error" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('labDirector.sla.overdueTests', { count: dash?.sla.overdue_tests ?? 0 })}</Typography>
                  </Stack>
                </Paper>
                <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('labDirector.sla.atRiskTests', { count: dash?.sla.at_risk_tests ?? 0 })}</Typography>
                  </Stack>
                </Paper>
                <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HistoryIcon color="info" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{dash?.sla.avg_tat_hours != null ? t('labDirector.sla.avgTatHours', { hours: dash.sla.avg_tat_hours }) : t('labDirector.sla.avgTatNone')}</Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Paper>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box component="section" ref={register('departments')} data-section="departments" sx={{ scrollMarginTop: '80px' }}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <AccountTreeIcon color="primary" />
              <Typography variant="h6">{t('labDirector.dept.sectionTitle')}</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.microbiology'), dash.departments.microbiology)}</Grid>
              <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.chemistry'), dash.departments.chemistry)}</Grid>
              <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.physical'), dash.departments.physical)}</Grid>
            </Grid>
          </Paper>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <WarningAmberIcon color="warning" />
              <Typography variant="h6">{t('labDirector.alerts.title')}</Typography>
            </Stack>
            <Stack spacing={1}>
              {dash?.sla.overdue_tests ? (
                <Alert severity="error" onClick={() => selectNav('sla.at_risk')} sx={{ cursor: 'pointer' }}>
                  {t('labDirector.alerts.overdueTests', { count: dash.sla.overdue_tests })}
                </Alert>
              ) : null}
              {dash?.equipment.overdue ? (
                <Alert severity="warning" onClick={() => selectNav('equipment.calibration')} sx={{ cursor: 'pointer' }}>
                  {t('labDirector.alerts.overdueCalibration', { count: dash.equipment.overdue })}
                </Alert>
              ) : null}
              {dash?.reagents.expired ? (
                <Alert severity="error" onClick={() => selectNav('reagents')} sx={{ cursor: 'pointer' }}>
                  {t('labDirector.alerts.expiredReagents', { count: dash.reagents.expired })}
                </Alert>
              ) : null}
              {dash?.nonconformity.open ? (
                <Alert severity="warning" onClick={() => selectNav('nc.open')} sx={{ cursor: 'pointer' }}>
                  {t('labDirector.alerts.openNc', { count: dash.nonconformity.open })}
                </Alert>
              ) : null}
              {dash && (dash.sla.overdue_tests || dash.equipment.overdue || dash.reagents.expired || dash.nonconformity.open) === 0 ? (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ {t('labDirector.quality.noneCriticalAlerts')}</Typography>
              ) : null}
            </Stack>
          </Paper>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('quality')} data-section="quality" sx={{ scrollMarginTop: '80px' }}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FindInPageIcon color="primary" />
              <Typography variant="h6">{t('labDirector.quality.title')}</Typography>
            </Stack>
            {(() => {
              const totalNc = (dash?.nonconformity.open ?? 0) + (dash?.nonconformity.closed ?? 0);
              const closedPct = totalNc ? Math.round(((dash?.nonconformity.closed ?? 0) * 100) / totalNc) : null;
              return renderKpiProgress(t('labDirector.quality.ncClosure'), closedPct, closedPct != null && closedPct >= 90 ? 'success.main' : closedPct != null && closedPct >= 75 ? 'warning.main' : 'error.main');
            })()}
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <KpiCard label={t('labDirector.quality.auditEventsToday')} value={dash?.audit.today ?? '—'} icon={<HistoryIcon />} accent="info.main" />
              </Grid>
              <Grid item xs={6}>
                <KpiCard label={t('labDirector.quality.totalAudit')} value={dash?.audit.total ?? '—'} icon={<FindInPageIcon />} />
              </Grid>
              <Grid item xs={6}>
                <KpiCard label={t('labDirector.quality.lowReagents')} value={dash?.reagents.low ?? '—'} icon={<BiotechIcon />} accent="warning.main" />
              </Grid>
              <Grid item xs={6}>
                <KpiCard label={t('labDirector.quality.openCapa')} value={dash?.nonconformity.capa_open ?? '—'} icon={<GppGoodIcon />} accent="primary.main" />
              </Grid>
            </Grid>
          </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderApprovalQueue = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.kpi.awaitingApproval'), dash?.kpis.approval_queue ?? '—', <VerifiedIcon />, 'primary.main')}
        {stat(t('labDirector.kpi.approved'), dash?.kpis.approved ?? '—', <CheckCircleIcon />, 'success.main')}
        {stat(t('labDirector.kpi.rejected'), dash?.kpis.rejected ?? '—', <GppBadIcon />, 'error.main')}
      </Grid>
      <DataTable<FoodSample>
        columns={approvalColumns}
        rows={samples.rows.filter((s) => s.status === 'READY_FOR_APPROVAL')}
        rowKey={(r) => r.id}
        count={dash?.kpis.approval_queue ?? 0}
        page={samples.page}
        rowsPerPage={samples.rowsPerPage}
        pageSizeOptions={samples.pageSizeOptions}
        loading={samples.loading}
        error={samples.error}
        title={t('labDirector.approvalQueue.title')}
        search={samples.search}
        searchInput={samples.searchInput}
        onSearchChange={samples.setSearchInput}
        sortBy={samples.sortBy}
        sortOrder={samples.sortOrder}
        onSortChange={samples.setSorting}
        onPageChange={samples.setPage}
        onRowsPerPageChange={samples.setRowsPerPage}
        onRefresh={samples.refresh}
      />
    </Box>
  );

  const renderSamples = (filter?: 'today' | 'overdue') => {
    let rows = samples.rows;
    if (filter === 'today') {
      const today = new Date().toDateString();
      rows = rows.filter((s) => s.received_at && new Date(s.received_at).toDateString() === today);
    }
    if (filter === 'overdue') {
      rows = rows.filter((s) => s.status === 'OVERDUE');
    }
    return (
      <Box>
        <DataTable<FoodSample>
          columns={sampleColumns}
          rows={rows}
          rowKey={(r) => r.id}
          count={samples.count}
          page={samples.page}
          rowsPerPage={samples.rowsPerPage}
          pageSizeOptions={samples.pageSizeOptions}
          loading={samples.loading}
          error={samples.error}
          title={t(NAV_TITLES[nav] ?? 'labDirector.nav.home')}
          search={samples.search}
          searchInput={samples.searchInput}
          onSearchChange={samples.setSearchInput}
          sortBy={samples.sortBy}
          sortOrder={samples.sortOrder}
          onSortChange={samples.setSorting}
          onPageChange={samples.setPage}
          onRowsPerPageChange={samples.setRowsPerPage}
          onRefresh={samples.refresh}
        />
      </Box>
    );
  };

  const renderDepartments = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.dept.microbiology'), dash?.departments.microbiology.total ?? '—', <AccountTreeIcon />, 'info.main')}
        {stat(t('labDirector.dept.chemistry'), dash?.departments.chemistry.total ?? '—', <AccountTreeIcon />, 'primary.main')}
        {stat(t('labDirector.dept.physical'), dash?.departments.physical.total ?? '—', <AccountTreeIcon />, 'warning.main')}
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.microbiology'), dash.departments.microbiology)}</Grid>
        <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.chemistry'), dash.departments.chemistry)}</Grid>
        <Grid item xs={12} md={4}>{dash && renderDeptCard(t('labDirector.dept.physical'), dash.departments.physical)}</Grid>
      </Grid>
    </Box>
  );

  const renderSla = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.sla.overdueTests'), dash?.sla.overdue_tests ?? '—', <EventBusyIcon />, 'error.main')}
        {stat(t('labDirector.sla.atRiskTests'), dash?.sla.at_risk_tests ?? '—', <WarningAmberIcon />, 'warning.main')}
        {stat(t('labDirector.sla.avgTatHours', { hours: dash?.sla.avg_tat_hours ?? '—' }), dash?.sla.avg_tat_hours != null ? t('labDirector.sla.avgTatHoursUnit', { hours: dash.sla.avg_tat_hours }) : '—', <TimelineIcon />, 'info.main')}
        {stat(t('labDirector.sla.slaCompliance'), dash?.sla.sla_compliance_pct != null ? `${dash.sla.sla_compliance_pct}%` : '—', <GppGoodIcon />, 'success.main')}
      </Grid>
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <TimelineIcon color="primary" />
          <Typography variant="h6">{t('labDirector.sla.indicators')}</Typography>
        </Stack>
        {renderKpiProgress(t('labDirector.sla.compliance'), dash?.sla.sla_compliance_pct)}
        {renderKpiProgress(t('labDirector.sla.decisionCompliance'), dash?.decisions.compliant_pct)}
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={1.5}>
          <Grid item xs={6} md={3}>
            <KpiCard label={t('labDirector.kpi.overdueSamples')} value={dash?.kpis.overdue ?? '—'} icon={<EventBusyIcon />} accent="error.main" />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label={t('labDirector.kpi.avgCompletionTime')} value={dash?.avg_completion_hours != null ? t('labDirector.kpi.avgCompletionTimeValue', { hours: dash.avg_completion_hours }) : '—'} icon={<HistoryIcon />} accent="info.main" />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderNonConformity = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.nc.open'), dash?.nonconformity.open ?? '—', <WarningAmberIcon />, 'error.main')}
        {stat(t('labDirector.nc.closed'), dash?.nonconformity.closed ?? '—', <CheckCircleIcon />, 'success.main')}
        {stat(t('labDirector.nc.openCapa'), dash?.nonconformity.capa_open ?? '—', <GppGoodIcon />, 'primary.main')}
      </Grid>
      <DataTable<NonConformity>
        columns={ncColumns}
        rows={ncs.rows}
        rowKey={(r) => r.id}
        count={ncs.count}
        page={ncs.page}
        rowsPerPage={ncs.rowsPerPage}
        pageSizeOptions={ncs.pageSizeOptions}
        loading={ncs.loading}
        error={ncs.error}
        title={t('labDirector.nc.title')}
        search={ncs.search}
        searchInput={ncs.searchInput}
        onSearchChange={ncs.setSearchInput}
        sortBy={ncs.sortBy}
        sortOrder={ncs.sortOrder}
        onSortChange={ncs.setSorting}
        onPageChange={ncs.setPage}
        onRowsPerPageChange={ncs.setRowsPerPage}
        onRefresh={ncs.refresh}
      />
    </Box>
  );

  const renderReports = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.certificates.title'), certificates.count ?? '—', <AssessmentIcon />, 'primary.main')}
        {stat(t('labDirector.decisions.approved'), dash?.decisions.approved ?? '—', <GppGoodIcon />, 'success.main')}
        {stat(t('labDirector.decisions.rejected'), dash?.decisions.rejected ?? '—', <GppBadIcon />, 'error.main')}
      </Grid>
      <DataTable<AnalysisCertificate>
        columns={certColumns}
        rows={certificates.rows}
        rowKey={(r) => r.id}
        count={certificates.count}
        page={certificates.page}
        rowsPerPage={certificates.rowsPerPage}
        pageSizeOptions={certificates.pageSizeOptions}
        loading={certificates.loading}
        error={certificates.error}
        title={t('labDirector.certificates.sectionTitle')}
        search={certificates.search}
        searchInput={certificates.searchInput}
        onSearchChange={certificates.setSearchInput}
        sortBy={certificates.sortBy}
        sortOrder={certificates.sortOrder}
        onSortChange={certificates.setSorting}
        onPageChange={certificates.setPage}
        onRowsPerPageChange={certificates.setRowsPerPage}
        onRefresh={certificates.refresh}
      />
    </Box>
  );

  const renderAudit = () => (
    <DataTable<AuditLog>
      columns={auditColumns}
      rows={audits.rows}
      rowKey={(r) => r.id}
      count={audits.count}
      page={audits.page}
      rowsPerPage={audits.rowsPerPage}
      pageSizeOptions={audits.pageSizeOptions}
      loading={audits.loading}
      error={audits.error}
      title={t('labDirector.audit.title')}
      search={audits.search}
      searchInput={audits.searchInput}
      onSearchChange={audits.setSearchInput}
      sortBy={audits.sortBy}
      sortOrder={audits.sortOrder}
      onSortChange={audits.setSorting}
      onPageChange={audits.setPage}
      onRowsPerPageChange={audits.setRowsPerPage}
      onRefresh={audits.refresh}
    />
  );

  const renderNotifications = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('labDirector.alerts.overdueTests'), dash?.sla.overdue_tests ?? '—', <EventBusyIcon />, 'error.main')}
        {stat(t('labDirector.alerts.overdueCalibration'), dash?.equipment.overdue ?? '—', <BuildIcon />, 'error.main')}
        {stat(t('labDirector.alerts.expiredReagents'), dash?.reagents.expired ?? '—', <BiotechIcon />, 'error.main')}
        {stat(t('labDirector.alerts.openNc'), dash?.nonconformity.open ?? '—', <WarningAmberIcon />, 'error.main')}
      </Grid>
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <GppGoodIcon color="primary" />
          <Typography variant="h6">{t('labDirector.alerts.sectionTitle')}</Typography>
        </Stack>
        <Stack spacing={1}>
          {dash?.sla.overdue_tests ? (
            <Alert severity="error" onClick={() => selectNav('sla.at_risk')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.overdueTestsUrgent', { count: dash.sla.overdue_tests })}
            </Alert>
          ) : null}
          {dash?.equipment.overdue ? (
            <Alert severity="warning" onClick={() => selectNav('equipment.calibration')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.overdueCalibration', { count: dash.equipment.overdue })}
            </Alert>
          ) : null}
          {dash?.equipment.due_soon ? (
            <Alert severity="info" onClick={() => selectNav('equipment.calibration')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.upcomingCalibration', { count: dash.equipment.due_soon })}
            </Alert>
          ) : null}
          {dash?.reagents.expired ? (
            <Alert severity="error" onClick={() => selectNav('reagents')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.expiredReagentsWarning', { count: dash.reagents.expired })}
            </Alert>
          ) : null}
          {dash?.reagents.low ? (
            <Alert severity="warning" onClick={() => selectNav('reagents')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.lowReagents', { count: dash.reagents.low })}
            </Alert>
          ) : null}
          {dash?.nonconformity.open ? (
            <Alert severity="warning" onClick={() => selectNav('nc.open')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.openNc', { count: dash.nonconformity.open })}
            </Alert>
          ) : null}
          {dash?.nonconformity.capa_open ? (
            <Alert severity="info" onClick={() => selectNav('nc.capa')} sx={{ cursor: 'pointer' }}>
              {t('labDirector.alerts.capaInProgress', { count: dash.nonconformity.capa_open })}
            </Alert>
          ) : null}
          {dash && (dash.sla.overdue_tests || dash.equipment.overdue || dash.reagents.expired || dash.nonconformity.open) === 0 ? (
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ {t('labDirector.alerts.noneCritical')}</Typography>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );

  const renderContent = () => {
    switch (nav) {
      case 'home': return renderDashboard();
      case 'approval':
      case 'approval.queue': return renderApprovalQueue();
      case 'approval.approved': return renderSamples();
      case 'approval.rejected': return renderSamples();
      case 'samples.all': return renderSamples();
      case 'samples.today': return renderSamples('today');
      case 'samples.overdue': return renderSamples('overdue');
      case 'departments.microbiology':
      case 'departments.chemistry':
      case 'departments.physical': return renderDepartments();
      case 'sla.overview':
      case 'sla.at_risk': return renderSla();
      case 'equipment.calibration':
      case 'equipment.status': return (
        <Box>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {stat(t('labDirector.equipment.total'), dash?.equipment.total ?? '—', <BuildIcon />)}
            {stat(t('labDirector.equipment.overdueCalibration'), dash?.equipment.overdue ?? '—', <EventBusyIcon />, 'error.main')}
            {stat(t('labDirector.equipment.upcomingCalibration'), dash?.equipment.due_soon ?? '—', <WarningAmberIcon />, 'warning.main')}
          </Grid>
          <DataTable<LabEquipment>
            columns={equipmentColumns}
            rows={equipment.rows}
            rowKey={(r) => r.id}
            count={equipment.count}
            page={equipment.page}
            rowsPerPage={equipment.rowsPerPage}
            pageSizeOptions={equipment.pageSizeOptions}
            loading={equipment.loading}
            error={equipment.error}
            title={t('labDirector.equipment.title')}
            search={equipment.search}
            searchInput={equipment.searchInput}
            onSearchChange={equipment.setSearchInput}
            sortBy={equipment.sortBy}
            sortOrder={equipment.sortOrder}
            onSortChange={equipment.setSorting}
            onPageChange={equipment.setPage}
            onRowsPerPageChange={equipment.setRowsPerPage}
            onRefresh={equipment.refresh}
          />
        </Box>
      );
      case 'reagents': return (
        <Box>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {stat(t('labDirector.reagents.total'), dash?.reagents.total ?? '—', <BiotechIcon />)}
            {stat(t('labDirector.reagents.expired'), dash?.reagents.expired ?? '—', <EventBusyIcon />, 'error.main')}
            {stat(t('labDirector.reagents.low'), dash?.reagents.low ?? '—', <WarningAmberIcon />, 'warning.main')}
          </Grid>
          <DataTable<Reagent>
            columns={reagentColumns}
            rows={reagents.rows}
            rowKey={(r) => r.id}
            count={reagents.count}
            page={reagents.page}
            rowsPerPage={reagents.rowsPerPage}
            pageSizeOptions={reagents.pageSizeOptions}
            loading={reagents.loading}
            error={reagents.error}
            title={t('labDirector.reagents.title')}
            search={reagents.search}
            searchInput={reagents.searchInput}
            onSearchChange={reagents.setSearchInput}
            sortBy={reagents.sortBy}
            sortOrder={reagents.sortOrder}
            onSortChange={reagents.setSorting}
            onPageChange={reagents.setPage}
            onRowsPerPageChange={reagents.setRowsPerPage}
            onRefresh={reagents.refresh}
          />
        </Box>
      );
      case 'nc.open':
      case 'nc.capa': return renderNonConformity();
      case 'reports': return renderReports();
      case 'notifications': return renderNotifications();
       case 'settings': return <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}><Typography variant="h6">{t('labDirector.settings.title')}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.settings.description')}</Typography></Paper>;
       case 'help': return <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}><Typography variant="h6">{t('labDirector.help.title')}</Typography><Typography variant="body2" color="text.secondary">{t('labDirector.help.description')}</Typography></Paper>;
      default: return renderDashboard();
    }
  };

  return (
    <Box>
      <DashboardHero
        eyebrow={t('labDirector.pageHeader.eyebrow')}
        title={t('labDirector.pageHeader.title')}
        subtitle={NAV_TITLES[nav] ? t(NAV_TITLES[nav]) : t('labDirector.pageHeader.subtitle')}
        gradient="emerald"
        avatarLabel={t('labDirector.pageHeader.avatarLabel')}
        action={<AppButton variant="secondary" onClick={refreshAll}>{t('labDirector.pageHeader.refresh')}</AppButton>}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
             {t('labDirector.pageHeader.live')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
             label={t('labDirector.pageHeader.sectionsLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box>{renderContent()}</Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LaboratoryDirectorPage;