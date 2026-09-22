import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormDialog,
  FormSelect,
  FormTextField,
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

const NAV_TITLES: Record<string, string> = {
  home: 'لوحة الجودة الشاملة — رصد سلامة النظام الفني للمختبر',
  specs: 'المواصفات المعتمدة (n/c/m/M) — المصدر الوحيد للحقيقة',
  'specs.micro': 'المواصفات الميكروبيولوجية — المنتج، الكائن، خطة السحب (n/c/m/M)',
  'specs.chemical': 'المواصفات الكيميائية — حدود التركيز للمنتجات الغذائية',
  'specs.plans': 'خطط السحب Sampling Plans — عدد الوحدات (n) وقبول الدفعة (c)',
  'specs.versions': 'إدارة إصدارات المواصفات — بدون تعديل النسخة النشطة مباشرة',
  'qc.dashboard': 'نظرة عامة على مراجعة الجودة QC حسب الأقسام',
  'qc.results': 'سجلات مراجعة الجودة QC — الضوابط والنتائج المتأثرة',
  'qc.failures': 'فشل الجودة QC Failures — النتائج المتأثرة بفشل ضابط',
  methods: 'طرق الاختبار المعتمدة — الإصدار، السريان، الأجهزة والكواشف المطلوبة',
  'equipment.calibration': 'معايرة الأجهزة — الجاهزية والمواعيد القادمة',
  'equipment.maintenance': 'صيانة الأجهزة — الحالة التشغيلية',
  reagents: 'الكواشف — الصلاحية والكمية ومنع استخدام المنتهي',
  'nc.open': 'عدم المطابقة — الحالات المفتوحة',
  'nc.investigation': 'التحقيق في عدم المطابقة — تحديد السبب الجذري',
  'nc.capa': 'الإجراءات التصحيحية والوقائية CAPA',
  documents: 'التحكم في الوثائق — SOP، التعليمات، طرق الاختبار، الجودة',
  audit: 'سجل التدقيق — من فعل ماذا ومتى (Audit Trail)',
  reports: 'تقارير الجودة المتقدمة',
  alerts: 'تنبيهات الجودة',
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const NC_TYPE_LABELS: Record<string, string> = {
  SAMPLE: 'عينة', TEST: 'اختبار', QC: 'جودة', EQUIPMENT: 'جهاز',
  REAGENT: 'كاشف', METHOD: 'طريقة', PERSONNEL: 'موظف',
  DOCUMENTATION: 'توثيق', RESULT: 'نتيجة', SLA: 'التزام زمني',
};

const SEVERITY_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  MINOR: { label: 'طفيف', tone: 'success' },
  MAJOR: { label: 'جوهري', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

const NC_STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' }> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  UNDER_INVESTIGATION: { label: 'قيد التحقيق', tone: 'warning' },
  AWAITING_CAPA: { label: 'بانتظار CAPA', tone: 'primary' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

const CAPA_STATUS_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'primary' }> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'warning' },
  VERIFICATION: { label: 'قيد التحقق', tone: 'primary' },
  CLOSED: { label: 'مغلقة', tone: 'success' },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <AssessmentIcon fontSize="small" /> },
  { id: 'specs', label: 'المواصفات', icon: <FindInPageIcon fontSize="small" /> },
  { id: 'qc', label: 'مراجعة الجودة', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'methods', label: 'طرق الاختبار', icon: <ScienceIcon fontSize="small" /> },
  { id: 'equipment', label: 'الأجهزة', icon: <BuildIcon fontSize="small" /> },
  { id: 'reagents', label: 'الكواشف', icon: <BiotechIcon fontSize="small" /> },
  { id: 'nc', label: 'عدم المطابقة', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'documents', label: 'الوثائق', icon: <FolderSharedIcon fontSize="small" /> },
  { id: 'audit', label: 'سجل التدقيق', icon: <HistoryIcon fontSize="small" /> },
  { id: 'reports', label: 'التقارير', icon: <VerifiedIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <GppBadIcon fontSize="small" /> },
] as const;

const QualityAssurancePage = () => {
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

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [!dash]);

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
    { key: 'code', label: 'الكود', render: (s) => <b>{s.code}</b> },
    { key: 'product', label: 'المنتج', render: (s) => s.product_name ?? s.name_ar ?? '—' },
    { key: 'category', label: 'الفئة', render: (s) => s.product_category_name ?? '—' },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={s.status_label ?? s.status} tone={s.status === 'ACTIVE' ? 'success' : 'warning'} /> },
    { key: 'version', label: 'الإصدار الحالي', render: (s) => s.current_version?.label ?? s.current_version?.version ?? '—' },
    { key: 'approval_date', label: 'الاعتماد', render: (s) => (s.approval_date ? formatDate(s.approval_date) : '—') },
  ], []);

  const qcColumns: DataTableColumn<QCRecord>[] = useMemo(() => [
    { key: 'qc_number', label: 'رقم QC', render: (q) => <b>{q.qc_number}</b> },
    { key: 'bench', label: 'القسم', render: (q) => (labBench[q.bench]?.label ?? q.bench) },
    { key: 'control_type', label: 'الضابط' },
    { key: 'status', label: 'الحالة', render: (q) => <StatusChip label={labQc[q.status]?.label ?? q.status} tone={labQc[q.status]?.tone} /> },
    { key: 'severity', label: 'الخطورة', render: (q) => <StatusChip label={SEVERITY_LABELS[q.severity]?.label ?? q.severity} tone={SEVERITY_LABELS[q.severity]?.tone} /> },
    { key: 'affected_tests_count', label: 'متأثر', render: (q) => q.affected_tests_count },
    { key: 'reviewed_at', label: 'المراجعة', render: (q) => (q.reviewed_at ? formatDate(q.reviewed_at) : '—') },
  ], []);

  const reagentColumns: DataTableColumn<Reagent>[] = useMemo(() => [
    { key: 'name_ar', label: 'الكاشف', render: (r) => <b>{r.name_ar}</b> },
    { key: 'bench', label: 'القسم', render: (r) => (labBench[r.bench]?.label ?? r.bench) },
    { key: 'lot_number', label: 'التشغيلة' },
    { key: 'expiry_date', label: 'الصلاحية', render: (r) => (r.expiry_date ? formatDate(r.expiry_date) : '—') },
    { key: 'quantity', label: 'الكمية', render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'status', label: 'الحالة', render: (r) => (
      <StatusChip
        label={r.status === 'AVAILABLE' ? 'متوفر' : r.status === 'LOW' ? 'منخفض' : r.status === 'EXPIRED' ? 'منتهي' : r.status}
        tone={r.status === 'AVAILABLE' ? 'success' : r.status === 'LOW' ? 'warning' : 'error'}
      />
    ) },
  ], []);

  const ncColumns: DataTableColumn<NonConformity>[] = useMemo(() => [
    { key: 'nc_number', label: 'الرقم', render: (n) => <b>{n.nc_number}</b> },
    { key: 'nc_type', label: 'النوع', render: (n) => <Chip size="small" label={NC_TYPE_LABELS[n.nc_type] ?? n.nc_type} /> },
    { key: 'title', label: 'العنوان' },
    { key: 'severity', label: 'الخطورة', render: (n) => <StatusChip label={SEVERITY_LABELS[n.severity]?.label ?? n.severity} tone={SEVERITY_LABELS[n.severity]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (n) => <StatusChip label={NC_STATUS_LABELS[n.status]?.label ?? n.status} tone={NC_STATUS_LABELS[n.status]?.tone} /> },
    { key: 'capa_count', label: 'CAPA', render: (n) => n.capa_count },
  ], []);

  const capaColumns: DataTableColumn<CpaRecord>[] = useMemo(() => [
    { key: 'title', label: 'العنوان', render: (c) => <b>{c.title}</b> },
    { key: 'nc_number', label: 'عدم المطابقة', render: (c) => c.nc_number ?? '—' },
    { key: 'responsible_user_name', label: 'المسؤول', render: (c) => c.responsible_user_name ?? '—' },
    { key: 'due_date', label: 'الاستحقاق', render: (c) => (c.due_date ? formatDate(c.due_date) : '—') },
    { key: 'status', label: 'الحالة', render: (c) => <StatusChip label={CAPA_STATUS_LABELS[c.status]?.label ?? c.status} tone={CAPA_STATUS_LABELS[c.status]?.tone} /> },
  ], []);

  const auditColumns: DataTableColumn<AuditLog>[] = useMemo(() => [
    { key: 'user_name', label: 'المستخدم', render: (a) => a.user_name ?? '—' },
    { key: 'action', label: 'الفعل', render: (a) => <StatusChip label={a.action} tone={a.action === 'CREATE' ? 'success' : a.action === 'DELETE' ? 'error' : 'primary'} /> },
    { key: 'object_type', label: 'الكائن' },
    { key: 'object_label', label: 'الوصف', render: (a) => a.object_label || '—' },
    { key: 'created_at', label: 'الوقت', render: (a) => formatDate(a.created_at) },
  ], []);

  const equipmentColumns: DataTableColumn<LabEquipment>[] = useMemo(() => [
    { key: 'name_ar', label: 'الجهاز', render: (e) => <b>{e.name_ar}</b> },
    { key: 'bench', label: 'القسم', render: (e) => (labBench[e.bench]?.label ?? e.bench) },
    { key: 'status', label: 'الحالة', render: (e) => <StatusChip label={e.status_label ?? e.status} tone={e.status === 'OPERATIONAL' ? 'success' : e.status === 'UNDER_MAINTENANCE' ? 'warning' : 'error'} /> },
    { key: 'last_calibrated', label: 'آخر معايرة', render: (e) => (e.last_calibrated ? formatDate(e.last_calibrated) : '—') },
    { key: 'next_calibration_due', label: 'المعايرة القادمة', render: (e) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {e.next_calibration_due ? formatDate(e.next_calibration_due) : '—'}
        {e.calibration_overdue && <GppBadIcon fontSize="small" color="error" />}
      </Stack>
    ) },
  ], []);

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
        {stat('مواصفات فعالة', dash?.specs.active ?? '—', <VerifiedIcon />)}
        {stat('QC فاشل', dash?.qc.failed ?? '—', <GppBadIcon />, 'error.main')}
        {stat('معايرة مستحقة', (dash?.equipment.overdue ?? 0) + (dash?.equipment.due_soon ?? 0) || '—', <BuildIcon />, 'warning.main')}
        {stat('عدم مطابقة مفتوح', dash?.nonconformity.open ?? '—', <WarningAmberIcon />, 'error.main')}
        {stat('CAPA مفتوح', dash?.nonconformity.capa_open ?? '—', <FindInPageIcon />, 'primary.main')}
        {stat('كواشف منتهية', dash?.reagents.expired ?? '—', <BiotechIcon />, 'error.main')}
        {stat('أحداث تدقيق اليوم', dash?.audit.today ?? '—', <HistoryIcon />, 'info.main')}
        {stat('طرق اختبار نشطة', dash?.methods.active ?? '—', <ScienceIcon />)}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <GppGoodIcon color="primary" />
              <Typography variant="h6">مؤشرات الجودة Quality Indicators</Typography>
            </Stack>
            {[
              { label: 'امتثال النتائج (Result Compliance)', value: dash?.compliance.result_pct },
              { label: 'معدل نجاح QC (QC Pass Rate)', value: dash?.qc.pass_rate },
              { label: 'معايرة الأجهزة (Calibration)', value: dash?.equipment.calibration_pct },
              { label: 'امتثال طرق الاختبار (Method Compliance)', value: dash?.methods.compliance_pct },
              { label: 'صلاحية الكواشف (Reagent Validity)', value: dash?.reagents.valid_pct },
              { label: 'إغلاق عدم المطابقة (NC Closed)', value: dash?.nonconformity.closed_pct },
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
              <Typography variant="h6">تنبيهات الجودة Quality Alerts</Typography>
            </Stack>
            <Stack spacing={1}>
              {dash?.qc.failed ? (
                <AlertRow icon={<GppBadIcon color="error" />} text={`فشل QC — راجع النتائج المتأثرة (${dash.qc.failed})`} onClick={() => selectNav('qc.failures')} />
              ) : null}
              {dash?.equipment.overdue ? (
                <AlertRow icon={<EventBusyIcon color="error" />} text={`معايرة متأخرة لـ ${dash.equipment.overdue} جهاز — يُمنع الاستخدام`} onClick={() => selectNav('equipment.calibration')} />
              ) : null}
              {dash?.reagents.expired ? (
                <AlertRow icon={<EventBusyIcon color="error" />} text={`كواشف منتهية الصلاحية (${dash.reagents.expired}) — لا تُستخدم في اختبارات جديدة`} onClick={() => selectNav('reagents')} />
              ) : null}
              {dash?.nonconformity.open ? (
                <AlertRow icon={<WarningAmberIcon color="warning" />} text={`عدم مطابقة مفتوح: ${dash.nonconformity.open}`} onClick={() => selectNav('nc.open')} />
              ) : null}
              {dash?.nonconformity.capa_open ? (
                <AlertRow icon={<FindInPageIcon color="primary" />} text={`CAPA قيد التنفيذ: ${dash.nonconformity.capa_open}`} onClick={() => selectNav('nc.capa')} />
              ) : null}
              {dash && (dash.qc.failed || dash.equipment.overdue || dash.reagents.expired || dash.nonconformity.open || dash.nonconformity.capa_open) === 0 ? (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ لا توجد تنبيهات حرجة حالياً</Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <FactCheckIcon color="primary" />
              <Typography variant="h6">نظرة عامة QC Overview</Typography>
            </Stack>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>الأحياء الدقيقة Microbiology</Typography>
              <QCBar label="Passed" count={qcSummary.micro.passed} color="success.main" />
              <QCBar label="Failed" count={qcSummary.micro.failed} color="error.main" />
              <QCBar label="Pending" count={qcSummary.micro.pending} color="warning.main" />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>الكيمياء Chemistry</Typography>
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
              <Typography variant="h6">سجل التدقيق Audit Trail</Typography>
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
                <Typography variant="body2" color="text.secondary">لا توجد أحداث تدقيق مسجلة بعد.</Typography>
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
        {stat('معدل النجاح', dash?.qc.pass_rate != null ? `${dash.qc.pass_rate}%` : '—', <VerifiedIcon />, 'info.main')}
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
          title="سجلات مراجعة الجودة QC"
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
        action={<AppButton size="small" variant="secondary" onClick={() => selectNav('nc.open')}>فتح عدم مطابقة</AppButton>}
      >
        النتائج المدرجة قد تكون متأثرة بفشل الضابط — أعد الفحص قبل اعتماد النتيجة النهائية.
      </Alert>
      {qcFailures.length === 0 ? (
        <Typography variant="body2" color="text.secondary">لا توجد حالات فشل QC حالياً.</Typography>
      ) : (
        <Grid container spacing={2}>
          {qcFailures.map((q) => (
            <Grid item xs={12} md={6} key={q.id}>
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'error.light' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <GppBadIcon color="error" />
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{q.qc_number}</Typography>
                </Stack>
                <Typography variant="body2"><b>القسم:</b> {labBench[q.bench]?.label ?? q.bench}</Typography>
                <Typography variant="body2"><b>الضابط:</b> {q.control_type}</Typography>
                {q.test_label && <Typography variant="body2"><b>الفحص:</b> {q.test_label}</Typography>}
                <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                  <b>الحالة:</b> FAILED — {q.affected_tests_count} نتائج متأثرة
                </Typography>
                <Box sx={{ mt: 1.5 }}>
                  <AppButton size="small" variant="secondary" onClick={() => selectNav('nc.open')}>فتح NC</AppButton>
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
        title="عدم المطابقة Non-Conformity"
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
        title="الإجراءات التصحيحية والوقائية CAPA"
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
        طرق الاختبار المعتمدة — كل طريقة لها إصدار وتاريخ سريان وأجهزة وكواشف وكمية عينة وحدود اكتشاف ومرجع.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        {dash?.methods.active ?? 0} من {dash?.methods.total ?? 0} طريقة نشطة ({dash?.methods.compliance_pct ?? '—'}%).
      </Typography>
    </Box>
  );

  const renderDocuments = () => (
    <Box>
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <FolderSharedIcon color="primary" />
          <Typography variant="h6">التحكم في الوثائق Document Control</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          كل وثيقة تحمل: كود الوثيقة، الإصدار، المالك، تاريخ السريان، تاريخ المراجعة، الحالة، والمعتمِد.
        </Typography>
        <Grid container spacing={1.5}>
          {[
            'SOP', 'تعليمات العمل', 'طرق الاختبار', 'دليل الجودة', 'النماذج', 'المواصفات', 'شهادات المعايرة', 'إجراءات QC',
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
          <Typography variant="h6">تقارير الجودة Quality Reports</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {[
            'أداء QC', 'عدم المطابقة', 'CAPA', 'معايرة الأجهزة', 'انتهاء الكواشف',
            'امتثال الطرق', 'تغييرات المواصفات', 'سجل التدقيق', 'مراجعة الوثائق', 'مؤشرات جودة المختبر',
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
        title="سجل التدقيق Audit Trail"
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
          <Typography variant="h6">تنبيهات الجودة</Typography>
        </Stack>
        <Stack spacing={1}>
          {dash?.qc.failed ? <AlertRow icon={<GppBadIcon color="error" />} text={`فشل QC (${dash.qc.failed})`} onClick={() => selectNav('qc.failures')} /> : null}
          {dash?.equipment.overdue ? <AlertRow icon={<EventBusyIcon color="error" />} text={`معايرة متأخرة (${dash.equipment.overdue})`} onClick={() => selectNav('equipment.calibration')} /> : null}
          {dash?.equipment.due_soon ? <AlertRow icon={<BuildIcon color="warning" />} text={`معايرة قريبة (${dash.equipment.due_soon}) خلال 30 يوماً`} onClick={() => selectNav('equipment.calibration')} /> : null}
          {dash?.reagents.expired ? <AlertRow icon={<BiotechIcon color="error" />} text={`كواشف منتهية (${dash.reagents.expired})`} onClick={() => selectNav('reagents')} /> : null}
          {dash?.reagents.low ? <AlertRow icon={<BiotechIcon color="warning" />} text={`كواشف بكمية منخفضة (${dash.reagents.low})`} onClick={() => selectNav('reagents')} /> : null}
          {dash?.nonconformity.open ? <AlertRow icon={<WarningAmberIcon color="error" />} text={`عدم مطابقة مفتوح (${dash.nonconformity.open})`} onClick={() => selectNav('nc.open')} /> : null}
          {!dash ? <Typography variant="body2" color="text.secondary">جارٍ التحميل…</Typography> : null}
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
          title="المواصفات الميكروبيولوجية"
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
      case 'specs.chemical': content = <SpecsPlaceholder title="المواصفات الكيميائية" text="حدود التركيز الكيميائي للمنتجات الغذائية — تُدار بنفس منطق الإصدارات." />; break;
      case 'specs.plans': content = <SpecsPlaceholder title="خطط السحب Sampling Plans" text="عدد الوحدات (n) وحدود القبول (c) حسب نظام السحب الثنائي/الثلاثي للدفعة." />; break;
      case 'specs.versions': content = <SpecsPlaceholder title="إصدارات المواصفات Versions" text="لا يُعدَّل الإصدار النشط مباشرة — يُنشأ إصدار جديد ويُؤرشف القديم حفاظاً على تاريخ النتائج." />; break;
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
          title="الأجهزة والمعايرة"
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
          title="الكواشف Reagents"
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
      case 'settings': content = <SpecsPlaceholder title="الإعدادات" text="إعدادات الجودة والامتثال." />; break;
      case 'help': content = <SpecsPlaceholder title="المساعدة" text="دليل استخدام واجهة الجودة." />; break;
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
        eyebrow="مراقبة الجودة"
        title="لوحة مسؤول الجودة"
        subtitle={NAV_TITLES[nav] ?? 'إدارة الجودة والامتثال الفني'}
        gradient="emerald"
        avatarLabel="ل"
        action={<AppButton variant="secondary" onClick={refreshAll}>🔄 تحديث</AppButton>}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
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
            label="أقسام اللوحة"
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