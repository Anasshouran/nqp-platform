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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BuildIcon from '@mui/icons-material/Build';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import GppGoodIcon from '@mui/icons-material/GppGood';
import GppBadIcon from '@mui/icons-material/GppBad';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import {
  AppButton,
  DataTable,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  getAuditLogs,
  getCapaRecords,
  getLabEquipment,
  getLabSampleTests,
  getMicroSpecifications,
  getNonConformities,
  getQaDashboard,
  getQcRecords,
  getReagents,
} from '../../api/endpoints/foodlab';
import type {
  AuditLog,
  CpaRecord,
  LabEquipment,
  MicrobiologicalSpecification,
  NonConformity,
  QaDashboard,
  QCRecord,
  Reagent,
  SampleTest,
} from '../../types/food';
import { labBench, labQc } from '../../utils/status';
import { formatDate } from '../../utils/formatters';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

type NavKey =
  | 'home'
  | 'specs' | 'specs.micro' | 'specs.chemical' | 'specs.plans' | 'specs.versions'
  | 'qc.dashboard' | 'qc.results' | 'qc.failures'
  | 'methods'
  | 'equipment.calibration' | 'equipment.maintenance'
  | 'reagents'
  | 'nc.open' | 'nc.investigation' | 'nc.capa'
  | 'documents'
  | 'audit'
  | 'reports'
  | 'alerts' | 'settings' | 'help';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });


const QualityAssurancePage = () => {
  const { t } = useTranslation();
  const [dash, setDash] = useState<QaDashboard | null>(null);
  const [nav, setNav] = useState<NavKey>(() =>
    (typeof window !== 'undefined' && window.location.hash.replace('#', '')
      ? (window.location.hash.replace('#', '') as NavKey)
      : 'home'),
  );

  useEffect(() => {
    const onHash = () => {
      const key = window.location.hash.replace('#', '');
      if (key) setNav(key as NavKey);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navTitles = useMemo<Record<string, string>>(() => ({
    home: t('quality.nav.home'),
    specs: t('quality.nav.specs'),
    'specs.micro': t('quality.nav.specs.micro'),
    'specs.chemical': t('quality.nav.specs.chemical'),
    'specs.plans': t('quality.nav.specs.plans'),
    'specs.versions': t('quality.nav.specs.versions'),
    'qc.dashboard': t('quality.nav.qc.dashboard'),
    'qc.results': t('quality.nav.qc.results'),
    'qc.failures': t('quality.nav.qc.failures'),
    methods: t('quality.nav.methods'),
    'equipment.calibration': t('quality.nav.equipment.calibration'),
    'equipment.maintenance': t('quality.nav.equipment.maintenance'),
    reagents: t('quality.nav.reagents'),
    'nc.open': t('quality.nav.nc.open'),
    'nc.investigation': t('quality.nav.nc.investigation'),
    'nc.capa': t('quality.nav.nc.capa'),
    documents: t('quality.nav.documents'),
    audit: t('quality.nav.audit'),
    reports: t('quality.nav.reports'),
    alerts: t('quality.nav.alerts'),
  }), [t]);

  const ncTypeLabels = useMemo<Record<string, string>>(() => ({
    SAMPLE: t('quality.ncType.sample'),
    TEST: t('quality.ncType.test'),
    QC: t('quality.ncType.qc'),
    EQUIPMENT: t('quality.ncType.equipment'),
    REAGENT: t('quality.ncType.reagent'),
    METHOD: t('quality.ncType.method'),
    PERSONNEL: t('quality.ncType.personnel'),
    DOCUMENTATION: t('quality.ncType.documentation'),
    RESULT: t('quality.ncType.result'),
    SLA: t('quality.ncType.sla'),
  }), [t]);

  const severityLabels = useMemo<Record<string, { label: string; tone: 'success' | 'warning' | 'error' }>>(() => ({
    MINOR: { label: t('quality.severity.minor'), tone: 'success' },
    MAJOR: { label: t('quality.severity.major'), tone: 'warning' },
    CRITICAL: { label: t('quality.severity.critical'), tone: 'error' },
  }), [t]);

  const ncStatusLabels = useMemo<Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' }>>(() => ({
    OPEN: { label: t('quality.ncStatus.open'), tone: 'error' },
    UNDER_INVESTIGATION: { label: t('quality.ncStatus.underInvestigation'), tone: 'warning' },
    AWAITING_CAPA: { label: t('quality.ncStatus.awaitingCapa'), tone: 'primary' },
    CLOSED: { label: t('quality.ncStatus.closed'), tone: 'success' },
  }), [t]);

  const capaStatusLabels = useMemo<Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' }>>(() => ({
    OPEN: { label: t('quality.capaStatus.open'), tone: 'error' },
    IN_PROGRESS: { label: t('quality.capaStatus.inProgress'), tone: 'warning' },
    VERIFICATION: { label: t('quality.capaStatus.verification'), tone: 'primary' },
    CLOSED: { label: t('quality.capaStatus.closed'), tone: 'success' },
  }), [t]);

  const sections = useMemo(() => [
    { id: 'overview', label: t('quality.sections.overview'), icon: <AssessmentIcon fontSize="small" /> },
    { id: 'specs', label: t('quality.sections.specs'), icon: <FindInPageIcon fontSize="small" /> },
    { id: 'qc', label: t('quality.sections.qc'), icon: <FactCheckIcon fontSize="small" /> },
    { id: 'methods', label: t('quality.sections.methods'), icon: <ScienceIcon fontSize="small" /> },
    { id: 'equipment', label: t('quality.sections.equipment'), icon: <BuildIcon fontSize="small" /> },
    { id: 'reagents', label: t('quality.sections.reagents'), icon: <BiotechIcon fontSize="small" /> },
    { id: 'nc', label: t('quality.sections.nc'), icon: <WarningAmberIcon fontSize="small" /> },
    { id: 'documents', label: t('quality.sections.documents'), icon: <FolderSharedIcon fontSize="small" /> },
    { id: 'audit', label: t('quality.sections.audit'), icon: <HistoryIcon fontSize="small" /> },
    { id: 'reports', label: t('quality.sections.reports'), icon: <VerifiedIcon fontSize="small" /> },
    { id: 'alerts', label: t('quality.sections.alerts'), icon: <GppBadIcon fontSize="small" /> },
  ], [t]);

  const selectNav = (key: NavKey) => {
    setNav(key);
    if (typeof window !== 'undefined') window.location.hash = key;
  };

  const specs = useServerTable<MicrobiologicalSpecification>({ fetchData: getMicroSpecifications });
  const qcRecords = useServerTable<QCRecord>({ fetchData: getQcRecords });
  const reagents = useServerTable<Reagent>({ fetchData: getReagents });
  const ncs = useServerTable<NonConformity>({ fetchData: getNonConformities });
  const capas = useServerTable<CpaRecord>({ fetchData: getCapaRecords });
  const audits = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });
  const equipment = useServerTable<LabEquipment>({ fetchData: getLabEquipment });

  const { active, register, scrollTo } = useCommandSections(sections as unknown as CommandSectionDef[], [!dash]);

  const refreshDash = useCallback(() => {
    getQaDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    specs.refresh();
    qcRecords.refresh();
    reagents.refresh();
    ncs.refresh();
    capas.refresh();
    audits.refresh();
    tests.refresh();
    equipment.refresh();
  }, [refreshDash, specs, qcRecords, reagents, ncs, capas, audits, tests, equipment]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const stat = (label: string, value: number | string, icon: React.ReactNode, accent?: string) => (
    <Grid item xs={6} sm={4} md={3}>
      <KpiCard label={label} value={value ?? '—'} icon={icon} accent={accent} />
    </Grid>
  );

  const specColumns: DataTableColumn<MicrobiologicalSpecification>[] = useMemo(() => [
    { key: 'code', label: t('quality.columns.code'), render: (s) => <b>{s.code}</b> },
    { key: 'product', label: t('quality.columns.product'), render: (s) => s.product_name ?? s.name_ar ?? '—' },
    { key: 'category', label: t('quality.columns.category'), render: (s) => s.product_category_name ?? '—' },
    { key: 'status', label: t('quality.columns.status'), render: (s) => <StatusChip label={s.status_label ?? s.status} tone={s.status === 'ACTIVE' ? 'success' : 'warning'} /> },
    { key: 'version', label: t('quality.columns.version'), render: (s) => s.current_version?.label ?? s.current_version?.version ?? '—' },
    { key: 'approval_date', label: t('quality.columns.approval_date'), render: (s) => (s.approval_date ? formatDate(s.approval_date) : '—') },
  ], [t]);

  const qcColumns: DataTableColumn<QCRecord>[] = useMemo(() => [
    { key: 'qc_number', label: t('quality.columns.qcNumber'), render: (q) => <b>{q.qc_number}</b> },
    { key: 'bench', label: t('quality.columns.bench'), render: (q) => (labBench[q.bench]?.label ?? q.bench) },
    { key: 'control_type', label: t('quality.columns.controlType'), render: (q) => q.control_type },
    { key: 'status', label: t('quality.columns.status'), render: (q) => <StatusChip label={labQc[q.status]?.label ?? q.status} tone={labQc[q.status]?.tone} /> },
    { key: 'severity', label: t('quality.columns.severity'), render: (q) => <StatusChip label={severityLabels[q.severity]?.label ?? q.severity} tone={severityLabels[q.severity]?.tone} /> },
    { key: 'affected_tests_count', label: t('quality.columns.affectedTestsCount'), render: (q) => q.affected_tests_count },
    { key: 'reviewed_at', label: t('quality.columns.reviewedAt'), render: (q) => (q.reviewed_at ? formatDate(q.reviewed_at) : '—') },
  ], [t, severityLabels]);

  const reagentColumns: DataTableColumn<Reagent>[] = useMemo(() => [
    { key: 'name_ar', label: t('quality.columns.reagent'), render: (r) => <b>{r.name_ar}</b> },
    { key: 'bench', label: t('quality.columns.bench'), render: (r) => (labBench[r.bench]?.label ?? r.bench) },
    { key: 'lot_number', label: t('quality.columns.lotNumber'), render: (r) => r.lot_number },
    { key: 'expiry_date', label: t('quality.columns.expiryDate'), render: (r) => (r.expiry_date ? formatDate(r.expiry_date) : '—') },
    { key: 'quantity', label: t('quality.columns.quantity'), render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'status', label: t('quality.columns.status'), render: (r) => (
      <StatusChip
        label={r.status === 'AVAILABLE' ? t('quality.status.available') : r.status === 'LOW' ? t('quality.status.low') : r.status === 'EXPIRED' ? t('quality.status.expired') : r.status}
        tone={r.status === 'AVAILABLE' ? 'success' : r.status === 'LOW' ? 'warning' : 'error'}
      />
    ) },
  ], [t]);

  const ncColumns: DataTableColumn<NonConformity>[] = useMemo(() => [
    { key: 'nc_number', label: t('quality.columns.ncNumber'), render: (n) => <b>{n.nc_number}</b> },
    { key: 'nc_type', label: t('quality.columns.ncType'), render: (n) => <Chip size="small" label={ncTypeLabels[n.nc_type] ?? n.nc_type} /> },
    { key: 'title', label: t('quality.columns.title'), render: (n) => <b>{n.title}</b> },
    { key: 'severity', label: t('quality.columns.severity'), render: (n) => <StatusChip label={severityLabels[n.severity]?.label ?? n.severity} tone={severityLabels[n.severity]?.tone} /> },
    { key: 'status', label: t('quality.columns.status'), render: (n) => <StatusChip label={ncStatusLabels[n.status]?.label ?? n.status} tone={ncStatusLabels[n.status]?.tone} /> },
    { key: 'capa_count', label: t('quality.columns.capaCount'), render: (n) => n.capa_count },
  ], [t, ncTypeLabels, severityLabels, ncStatusLabels]);

  const capaColumns: DataTableColumn<CpaRecord>[] = useMemo(() => [
    { key: 'title', label: t('quality.columns.title'), render: (c) => <b>{c.title}</b> },
    { key: 'nc_number', label: t('quality.columns.ncNumber'), render: (c) => c.nc_number ?? '—' },
    { key: 'responsible_user_name', label: t('quality.columns.responsibleUserName'), render: (c) => c.responsible_user_name ?? '—' },
    { key: 'due_date', label: t('quality.columns.dueDate'), render: (c) => (c.due_date ? formatDate(c.due_date) : '—') },
    { key: 'status', label: t('quality.columns.status'), render: (c) => <StatusChip label={capaStatusLabels[c.status]?.label ?? c.status} tone={capaStatusLabels[c.status]?.tone} /> },
  ], [t, capaStatusLabels]);

  const auditColumns: DataTableColumn<AuditLog>[] = useMemo(() => [
    { key: 'user_name', label: t('quality.columns.userName'), render: (a) => a.user_name ?? '—' },
    { key: 'action', label: t('quality.columns.action'), render: (a) => <StatusChip label={a.action} tone={a.action === 'CREATE' ? 'success' : a.action === 'DELETE' ? 'error' : 'primary'} /> },
    { key: 'object_type', label: t('quality.columns.objectType'), render: (a) => a.object_label || '—' },
    { key: 'object_label', label: t('quality.columns.objectLabel'), render: (a) => a.object_label || '—' },
    { key: 'created_at', label: t('quality.columns.createdAt'), render: (a) => formatDate(a.created_at) },
  ], [t]);

  const equipmentColumns: DataTableColumn<LabEquipment>[] = useMemo(() => [
    { key: 'name_ar', label: t('quality.columns.device'), render: (e) => <b>{e.name_ar}</b> },
    { key: 'bench', label: t('quality.columns.bench'), render: (e) => (labBench[e.bench]?.label ?? e.bench) },
    { key: 'status', label: t('quality.columns.status'), render: (e) => <StatusChip label={e.status_label ?? e.status} tone={e.status === 'OPERATIONAL' ? 'success' : e.status === 'UNDER_MAINTENANCE' ? 'warning' : 'error'} /> },
    { key: 'last_calibrated', label: t('quality.columns.lastCalibrated'), render: (e) => (e.last_calibrated ? formatDate(e.last_calibrated) : '—') },
    { key: 'next_calibration_due', label: t('quality.columns.nextCalibrationDue'), render: (e) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {e.next_calibration_due ? formatDate(e.next_calibration_due) : '—'}
        {e.calibration_overdue && <GppBadIcon fontSize="small" color="error" />}
      </Stack>
    ) },
  ], [t]);

  const qcSummary = useMemo(() => {
    const rows = qcRecords.rows;
    return {
      micro: {
        passed: rows.filter((r) => r.bench === 'MICROBIOLOGY' && r.status === 'PASSED').length,
        failed: rows.filter((r) => r.bench === 'MICROBIOLOGY' && r.status === 'FAILED').length,
        pending: rows.filter((r) => r.bench === 'MICROBIOLOGY' && r.status === 'PENDING').length,
      },
      chem: {
        passed: rows.filter((r) => r.bench === 'CHEMISTRY' && r.status === 'PASSED').length,
        failed: rows.filter((r) => r.bench === 'CHEMISTRY' && r.status === 'FAILED').length,
        pending: rows.filter((r) => r.bench === 'CHEMISTRY' && r.status === 'PENDING').length,
      },
    };
  }, [qcRecords.rows]);

  const qcFailures = useMemo(() => qcRecords.rows.filter((q) => q.status === 'FAILED'), [qcRecords.rows]);

  const renderDashboard = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat(t('quality.dashboard.stats.specsActive'), dash?.specs.active ?? '—', <VerifiedIcon />)}
        {stat(t('quality.dashboard.stats.qcFailed'), dash?.qc.failed ?? '—', <GppBadIcon />, 'error.main')}
        {stat(t('quality.dashboard.stats.calibrationDue'), (dash?.equipment.overdue ?? 0) + (dash?.equipment.due_soon ?? 0) || '—', <BuildIcon />, 'warning.main')}
        {stat(t('quality.dashboard.stats.ncOpen'), dash?.nonconformity.open ?? '—', <WarningAmberIcon />, 'error.main')}
        {stat(t('quality.dashboard.stats.capaOpen'), dash?.nonconformity.capa_open ?? '—', <FindInPageIcon />, 'primary.main')}
        {stat(t('quality.dashboard.stats.reagentsExpired'), dash?.reagents.expired ?? '—', <BiotechIcon />, 'error.main')}
        {stat(t('quality.dashboard.stats.auditToday'), dash?.audit.today ?? '—', <HistoryIcon />, 'info.main')}
        {stat(t('quality.dashboard.stats.methodsActive'), dash?.methods.active ?? '—', <ScienceIcon />)}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <GppGoodIcon color="primary" />
              <Typography variant="h6">{t('quality.kpi.title')}</Typography>
            </Stack>
            {[
              { label: t('quality.kpi.resultCompliance'), value: dash?.compliance.result_pct },
              { label: t('quality.kpi.qcPassRate'), value: dash?.qc.pass_rate },
              { label: t('quality.kpi.calibrationPct'), value: dash?.equipment.calibration_pct },
              { label: t('quality.kpi.methodCompliance'), value: dash?.methods.compliance_pct },
              { label: t('quality.kpi.reagentValidity'), value: dash?.reagents.valid_pct },
              { label: t('quality.kpi.ncClosedPct'), value: dash?.nonconformity.closed_pct },
            ].map((kpi) => {
              const pct = kpi.value ?? 0;
              return (
                <Box key={kpi.label} sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{kpi.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: pct >= 90 ? 'success.main' : pct >= 75 ? 'warning.main' : 'error.main' }}>
                      {kpi.value != null ? `${pct}%` : '—'}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={kpi.value != null ? Math.min(pct, 100) : 0}
                    color={pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'error'}
                    sx={{ height: 8, borderRadius: 2 }}
                  />
                </Box>
              );
            })}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <WarningAmberIcon color="warning" />
              <Typography variant="h6">{t('quality.dashboard.alerts.title')}</Typography>
            </Stack>
            <Stack spacing={1}>
              {dash?.qc.failed ? (
                <AlertRow icon={<GppBadIcon color="error" />} text={t('quality.dashboard.alerts.qcFailed', { count: dash.qc.failed })} onClick={() => selectNav('qc.failures')} />
              ) : null}
              {dash?.equipment.overdue ? (
                <AlertRow icon={<EventBusyIcon color="error" />} text={t('quality.dashboard.alerts.calibrationOverdue', { count: dash.equipment.overdue })} onClick={() => selectNav('equipment.calibration')} />
              ) : null}
              {dash?.reagents.expired ? (
                <AlertRow icon={<EventBusyIcon color="error" />} text={t('quality.dashboard.alerts.reagentsExpired', { count: dash.reagents.expired })} onClick={() => selectNav('reagents')} />
              ) : null}
              {dash?.nonconformity.open ? (
                <AlertRow icon={<WarningAmberIcon color="warning" />} text={t('quality.dashboard.alerts.ncOpen', { count: dash.nonconformity.open })} onClick={() => selectNav('nc.open')} />
              ) : null}
              {dash?.nonconformity.capa_open ? (
                <AlertRow icon={<FindInPageIcon color="primary" />} text={t('quality.dashboard.alerts.capaOpen', { count: dash.nonconformity.capa_open })} onClick={() => selectNav('nc.capa')} />
              ) : null}
              {dash && (dash.qc.failed || dash.equipment.overdue || dash.reagents.expired || dash.nonconformity.open || dash.nonconformity.capa_open) === 0 ? (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ {t('quality.dashboard.alerts.noCritical')}</Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FactCheckIcon color="primary" />
              <Typography variant="h6">{t('quality.qcOverview.title')}</Typography>
            </Stack>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{t('quality.qcOverview.microbiology')}</Typography>
              <QCBar label="Passed" count={qcSummary.micro.passed} color="success.main" />
              <QCBar label="Failed" count={qcSummary.micro.failed} color="error.main" />
              <QCBar label="Pending" count={qcSummary.micro.pending} color="warning.main" />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{t('quality.qcOverview.chemistry')}</Typography>
              <QCBar label="Passed" count={qcSummary.chem.passed} color="success.main" />
              <QCBar label="Failed" count={qcSummary.chem.failed} color="error.main" />
              <QCBar label="Pending" count={qcSummary.chem.pending} color="warning.main" />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FindInPageIcon color="primary" />
              <Typography variant="h6">{t('quality.audit.title')}</Typography>
            </Stack>
            <Stack spacing={1}>
              {audits.rows.slice(0, 6).map((a) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={1}>
                  <StatusChip label={a.action} tone={a.action === 'CREATE' ? 'success' : a.action === 'DELETE' ? 'error' : 'primary'} />
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{a.user_name ?? a.user_email ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.object_label || a.object_type}</Typography>
                </Stack>
              ))}
              {audits.rows.length === 0 && (
                <Typography variant="body2" color="text.secondary">{t('quality.audit.noEvents')}</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderQcOverview = () => (
    <Box>
      <Grid container spacing={1.5}>
        {stat('QC Passed', dash?.qc.passed ?? '—', <GppGoodIcon />, 'success.main')}
        {stat('QC Failed', dash?.qc.failed ?? '—', <GppBadIcon />, 'error.main')}
        {stat('QC Pending', dash?.qc.pending ?? '—', <FactCheckIcon />, 'warning.main')}
        {stat(t('quality.qcOverview.successRate'), dash?.qc.pass_rate != null ? `${dash.qc.pass_rate}%` : '—', <VerifiedIcon />, 'info.main')}
      </Grid>
      <Box sx={{ mt: 2 }}>
        <DataTable<QCRecord>
          columns={qcColumns}
          rows={qcRecords.rows}
          rowKey={(r) => r.id}
          count={qcRecords.count}
          page={qcRecords.page}
          rowsPerPage={qcRecords.rowsPerPage}
          pageSizeOptions={qcRecords.pageSizeOptions}
          loading={qcRecords.loading}
          error={qcRecords.error}
          title={t('quality.qcOverview.tableTitle')}
          search={qcRecords.search}
          searchInput={qcRecords.searchInput}
          onSearchChange={qcRecords.setSearchInput}
          sortBy={qcRecords.sortBy}
          sortOrder={qcRecords.sortOrder}
          onSortChange={qcRecords.setSorting}
          onPageChange={qcRecords.setPage}
          onRowsPerPageChange={qcRecords.setRowsPerPage}
          onRefresh={qcRecords.refresh}
        />
      </Box>
    </Box>
  );

  const renderQcFailures = () => (
    <Box>
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        action={<AppButton size="small" variant="secondary" onClick={() => selectNav('nc.open')}>{t('quality.qcFailures.openNc')}</AppButton>}
      >
        {t('quality.qcFailures.warning')}
      </Alert>
      {qcFailures.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t('quality.qcFailures.noFailures')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {qcFailures.map((q) => (
            <Grid item xs={12} md={6} key={q.id}>
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'error.light' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <GppBadIcon color="error" />
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{q.qc_number}</Typography>
                </Stack>
                <Typography variant="body2"><b>{t('quality.qcFailures.section')}:</b> {labBench[q.bench]?.label ?? q.bench}</Typography>
                <Typography variant="body2"><b>{t('quality.qcFailures.officer')}:</b> {q.control_type}</Typography>
                {q.test_label && <Typography variant="body2"><b>{t('quality.qcFailures.test')}:</b> {q.test_label}</Typography>}
                <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                  <b>{t('quality.qcFailures.status')}:</b> FAILED — {q.affected_tests_count} {t('quality.qcFailures.testsAffected')}
                </Typography>
                <Box sx={{ mt: 1.5 }}>
                  <AppButton size="small" variant="secondary" onClick={() => selectNav('nc.open')}>{t('quality.qcFailures.openNc')}</AppButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderNonConformity = () => (
    <Box>
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
        title={t('quality.nonConformity.title')}
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

  const renderCapa = () => (
    <Box>
      <DataTable<CpaRecord>
        columns={capaColumns}
        rows={capas.rows}
        rowKey={(r) => r.id}
        count={capas.count}
        page={capas.page}
        rowsPerPage={capas.rowsPerPage}
        pageSizeOptions={capas.pageSizeOptions}
        loading={capas.loading}
        error={capas.error}
        title={t('quality.capa.title')}
        search={capas.search}
        searchInput={capas.searchInput}
        onSearchChange={capas.setSearchInput}
        sortBy={capas.sortBy}
        sortOrder={capas.sortOrder}
        onSortChange={capas.setSorting}
        onPageChange={capas.setPage}
        onRowsPerPageChange={capas.setRowsPerPage}
        onRefresh={capas.refresh}
      />
    </Box>
  );

  const renderMethods = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('quality.methods.description')}
      </Alert>
      <Typography variant="body2" color="text.secondary">
        {t('quality.methods.activeCount', { active: dash?.methods.active ?? 0, total: dash?.methods.total ?? 0, compliance: dash?.methods.compliance_pct ?? '—' })}
      </Typography>
    </Box>
  );

  const renderDocuments = () => (
    <Box>
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <FolderSharedIcon color="primary" />
          <Typography variant="h6">{t('quality.documents.title')}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('quality.documents.description')}
        </Typography>
        <Grid container spacing={1.5}>
          {[
            t('quality.documents.sop'),
            t('quality.documents.workInstructions'),
            t('quality.documents.testMethods'),
            t('quality.documents.qualityGuide'),
            t('quality.documents.forms'),
            t('quality.documents.specifications'),
            t('quality.documents.calibrationCertificates'),
            t('quality.documents.qcProcedures'),
          ].map((d) => (
            <Grid item xs={12} sm={6} md={3} key={d}>
              <Paper sx={{ p: 1.5, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{d}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );

  const renderReports = () => (
    <Box>
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6">{t('quality.reports.title')}</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {[
            t('quality.reports.qcPerformance'),
            t('quality.reports.nonConformity'),
            t('quality.reports.capa'),
            t('quality.reports.equipmentCalibration'),
            t('quality.reports.reagentsExpired'),
            t('quality.reports.methodCompliance'),
            t('quality.reports.specChanges'),
            t('quality.reports.auditTrail'),
            t('quality.reports.documentReview'),
            t('quality.reports.labQualityIndicators'),
          ].map((r) => (
            <Grid item xs={12} sm={6} md={4} key={r}>
              <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>📊 {r}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );

  const renderAudit = () => (
    <Box>
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
        title={t('quality.audit.tableTitle')}
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
    </Box>
  );

  const renderAlerts = () => (
    <Box>
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6">{t('quality.alerts.title')}</Typography>
        </Stack>
        <Stack spacing={1}>
          {dash?.qc.failed ? <AlertRow icon={<GppBadIcon color="error" />} text={t('quality.alerts.qcFailed', { count: dash.qc.failed })} onClick={() => selectNav('qc.failures')} /> : null}
          {dash?.equipment.overdue ? <AlertRow icon={<EventBusyIcon color="error" />} text={t('quality.alerts.calibrationOverdue', { count: dash.equipment.overdue })} onClick={() => selectNav('equipment.calibration')} /> : null}
          {dash?.equipment.due_soon ? <AlertRow icon={<BuildIcon color="warning" />} text={t('quality.alerts.calibrationDueSoon', { count: dash.equipment.due_soon })} onClick={() => selectNav('equipment.calibration')} /> : null}
          {dash?.reagents.expired ? <AlertRow icon={<BiotechIcon color="error" />} text={t('quality.alerts.reagentsExpired', { count: dash.reagents.expired })} onClick={() => selectNav('reagents')} /> : null}
          {dash?.reagents.low ? <AlertRow icon={<BiotechIcon color="warning" />} text={t('quality.alerts.reagentsLow', { count: dash.reagents.low })} onClick={() => selectNav('reagents')} /> : null}
          {dash?.nonconformity.open ? <AlertRow icon={<WarningAmberIcon color="error" />} text={t('quality.alerts.ncOpen', { count: dash.nonconformity.open })} onClick={() => selectNav('nc.open')} /> : null}
          {!dash ? <Typography variant="body2" color="text.secondary">{t('quality.alerts.loading')}</Typography> : null}
        </Stack>
      </Paper>
    </Box>
  );

  const renderContent = () => {
    const sectionId = nav === 'home' ? 'overview'
      : nav.startsWith('specs') ? 'specs'
      : nav.startsWith('qc') ? 'qc'
      : nav === 'methods' ? 'methods'
      : nav.startsWith('equipment') ? 'equipment'
      : nav === 'reagents' ? 'reagents'
      : nav.startsWith('nc') ? 'nc'
      : nav === 'documents' ? 'documents'
      : nav === 'audit' ? 'audit'
      : nav === 'reports' ? 'reports'
      : nav === 'alerts' ? 'alerts'
      : 'overview';

    let content: React.ReactNode;
    switch (nav) {
      case 'home': content = renderDashboard(); break;
      case 'specs':
      case 'specs.micro': content = (
        <DataTable<MicrobiologicalSpecification>
          columns={specColumns}
          rows={specs.rows}
          rowKey={(r) => r.id}
          count={specs.count}
          page={specs.page}
          rowsPerPage={specs.rowsPerPage}
          pageSizeOptions={specs.pageSizeOptions}
          loading={specs.loading}
          error={specs.error}
          title={t('quality.pages.specs.micro')}
          search={specs.search}
          searchInput={specs.searchInput}
          onSearchChange={specs.setSearchInput}
          sortBy={specs.sortBy}
          sortOrder={specs.sortOrder}
          onSortChange={specs.setSorting}
          onPageChange={specs.setPage}
          onRowsPerPageChange={specs.setRowsPerPage}
          onRefresh={specs.refresh}
        />
      ); break;
      case 'specs.chemical': content = <SpecsPlaceholder title={t('quality.pages.specs.chemical.title')} text={t('quality.pages.specs.chemical.text')} />; break;
      case 'specs.plans': content = <SpecsPlaceholder title={t('quality.pages.specs.plans.title')} text={t('quality.pages.specs.plans.text')} />; break;
      case 'specs.versions': content = <SpecsPlaceholder title={t('quality.pages.specs.versions.title')} text={t('quality.pages.specs.versions.text')} />; break;
      case 'qc.dashboard': content = renderQcOverview(); break;
      case 'qc.results': content = renderQcOverview(); break;
      case 'qc.failures': content = renderQcFailures(); break;
      case 'methods': content = renderMethods(); break;
      case 'equipment.calibration':
      case 'equipment.maintenance': content = (
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
          title={t('quality.pages.equipment.title')}
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
      ); break;
      case 'reagents': content = (
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
          title={t('quality.pages.reagents.title')}
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
      ); break;
      case 'nc.open': content = renderNonConformity(); break;
      case 'nc.investigation': content = renderNonConformity(); break;
      case 'nc.capa': content = renderCapa(); break;
      case 'documents': content = renderDocuments(); break;
      case 'audit': content = renderAudit(); break;
      case 'reports': content = renderReports(); break;
      case 'alerts': content = renderAlerts(); break;
      case 'settings': content = <SpecsPlaceholder title={t('quality.pages.settings.title')} text={t('quality.pages.settings.text')} />; break;
      case 'help': content = <SpecsPlaceholder title={t('quality.pages.help.title')} text={t('quality.pages.help.text')} />; break;
      default: content = renderDashboard(); break;
    }

    return (
      <Box component="section" ref={register(sectionId)} data-section={sectionId} sx={{ scrollMarginTop: '80px' }}>
        {content}
      </Box>
    );
  };

  return (
    <Box>
      <DashboardHero
        eyebrow={t('quality.dashboard.eyebrow')}
        title={t('quality.dashboard.title')}
        subtitle={navTitles[nav] ?? t('quality.dashboard.subtitle')}
        gradient="emerald"
        avatarLabel="ل"
        action={<AppButton variant="secondary" onClick={refreshAll}>{t('quality.dashboard.refresh')} 🔄</AppButton>}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('quality.dashboard.liveStatus')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('quality.dashboard.sectionsLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {renderContent()}
        </Grid>
      </Grid>
    </Box>
  );
};

const QCBar = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, width: 80 }}>{label}</Typography>
    <Box sx={{ flex: 1, height: 18, bgcolor: '#EEF2F6', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: Math.min(count * 10, 100), height: '100%', bgcolor: color, borderRadius: 1.5 }} />
      </Box>
    </Box>
    <Typography variant="body2" sx={{ fontWeight: 700, width: 36 }}>{count}</Typography>
  </Stack>
);

const AlertRow = ({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{text}</Typography>
    </Stack>
  </Paper>
);

const SpecsPlaceholder = ({ title, text }: { title: string; text: string }) => (
  <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
    <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    <Typography variant="body2" color="text.secondary">{text}</Typography>
  </Paper>
);

export default QualityAssurancePage;