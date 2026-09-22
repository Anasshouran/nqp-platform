import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../../hooks/useAuth';
import {
  AppButton,
  DataTable,
  FormDialog,
  FormSelect,
  FormTextField,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useServerTable } from '../../hooks/useServerTable';
import {
  assignSampleAnalyst,
  getApplicableLimits,
  getLabParameters,
  getLabSampleTests,
  getLabSamples,
  getMicroBiologyDashboard,
  getMicroSpecifications,
  getMicroWorkload,
  markSampleTestQC,
  returnSampleTest,
  reviewSampleTest,
  setSampleParameters,
  setSamplePriority,
} from '../../api/endpoints/foodlab';
import { getUsers } from '../../api/endpoints/users';
import type {
  ApplicableLimits,
  FoodSample,
  LabParameter,
  MicrobiologicalSpecification,
  MicroDashboard,
  SampleTest,
  WorkloadItem,
} from '../../types/food';
import type { User } from '../../types/user';
import { labDecision, labPriority, labQc, labSampleStatus, labSla, labTestStatus } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { SampleDetailDialog } from './FoodLabPage';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const RETURN_REASONS = [
  { value: 'exceeded_M', label: 'تجاوز M (الحد الأعلى)' },
  { value: 'exceeded_c', label: 'تجاوز عدد c المسموح' },
  { value: 'method', label: 'مشكلة في طريقة الاختبار' },
  { value: 'qc', label: 'مشكلة في مراقبة الجودة (QC)' },
  { value: 'sample', label: 'مشكلة في العينة' },
  { value: 'other', label: 'أخرى' },
];

const NON_COMPLIANCE_REASONS = [
  { value: 'exceeded_M', label: 'تجاوز قيمة M (الحد الأعلى)' },
  { value: 'exceeded_c', label: 'تجاوز الحد المسموح c لعدد الوحدات' },
  { value: 'pathogen_detected', label: 'الكشف عن كائن ممرض في العينة' },
  { value: 'method', label: 'انحراف عن الطريقة المعتمدة أثناء التحليل' },
  { value: 'documentation', label: 'قصور في التوثيق / سلسلة الحيازة' },
  { value: 'other', label: 'أسباب أخرى' },
];

const LOAD_LEVEL: Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' }> = {
  idle: { label: 'بدون عبء', tone: 'neutral' },
  normal: { label: 'طبيعي', tone: 'success' },
  high: { label: 'مرتفع', tone: 'warning' },
  overloaded: { label: 'مثقل', tone: 'error' },
};

const PATHOGEN_LIST: Array<{ key: string; label: string; keyword: string }> = [
  { key: 'analysis.salmonella', label: 'السالمونيلا Salmonella', keyword: 'salmonella' },
  { key: 'analysis.ecoli', label: 'القولونية البرازية E. coli', keyword: 'coli' },
  { key: 'analysis.coliform', label: 'الكوليفورم Coliform', keyword: 'coliform' },
  { key: 'analysis.listeria', label: 'الليستيريا Listeria', keyword: 'listeria' },
  { key: 'analysis.other', label: 'فحوصات ميكروبية أخرى', keyword: '' },
];

/* ---------- مفاتيح التنقل (تُقرأ من الـhash عبر الـlayout) ---------- */

type NavKey =
  | 'home'
  | 'samples.arrived' | 'samples.inprogress' | 'samples.review' | 'samples.completed' | 'samples.overdue'
  | 'analysts.list' | 'analysts.workload'
  | 'analysis.salmonella' | 'analysis.ecoli' | 'analysis.coliform' | 'analysis.listeria' | 'analysis.other'
  | 'specs' | 'qc' | 'sla' | 'results' | 'reports' | 'alerts' | 'settings' | 'help';

const SAMPLES_NAV_TITLES: Record<string, string> = {
  'samples.arrived': 'عينات الأحياء الدقيقة الواردة — وصلت للقسم وبانتظار التوزيع على المحللين',
  'samples.inprogress': 'عينات الأحياء الدقيقة قيد التحليل — يجري تنفيذ الفحوصات حالياً',
  'samples.review': 'عينات الأحياء الدقيقة للمراجعة — الفحوصات أُرسلت وبانتظار المراجعة / الاعتماد',
  'samples.completed': 'عينات الأحياء الدقيقة المكتملة — وصلت مرحلة الإنجاز',
};

const SAMPLE_STATUS_GROUPS: Record<string, string[]> = {
  'samples.arrived': ['RECEIVED', 'COORDINATED', 'ASSIGNED'],
  'samples.inprogress': ['UNDER_TESTING'],
  'samples.review': ['READY_FOR_APPROVAL'],
  'samples.completed': ['APPROVED', 'DISPATCHED', 'COMPLETED'],
};

const SETTINGS_ALLOWED = [
  { label: 'توزيع العينات على المحللين وتحديد الأولوية' },
  { label: 'مراجعة النتائج وإحالتها للاعتماد أو الإعادة للمحلل' },
  { label: 'مراجعة الجودة (QC) قبل الاعتماد النهائي' },
  { label: 'متابعة مؤشرات SLA وعبء العمل واتخاذ الإجراءات' },
  { label: 'الاطلاع على المواصفات والحدود الميكروبيولوجية' },
];

const SETTINGS_BLOCKED = [
  { label: 'الاعتماد النهائي للنتائج — من اختصاص مدير المختبر' },
  { label: 'إدخال أو تعديل الحدود الميكروبيولوجية — مدير التقييم' },
  { label: 'إدارة المستخدمين والصلاحيات' },
  { label: 'تحصيل الرسوم وإدارة الفواتير' },
];

const HELP_STEPS = [
  { title: '١. استلام العينات', text: 'العينات الواردة تُعرض في قسم «العينات › الواردة» — وزِّعها على المحللين مع الفحوصات والأولوية.' },
  { title: '٢. تنفيذ الفحوصات', text: 'المحللون ينفّذون الفحوصات ويسجلون النتائج وفق المواصفة، وتُقيَّم آلياً بـ (n/c/m/M).' },
  { title: '٣. مراجعة رئيس القسم', text: 'راجع النتيجة وفق الحدود المطبَّقة في قسم «النتائج» — اعتمدها أو أعدها للمحلل مع سبب الإعادة.' },
  { title: '٤. حالات عدم المطابقة', text: 'عند عدم المطابقة، حدد الأسباب وسيُبلَّغ مدير المختبر عند الإحالة للاعتماد النهائي.' },
  { title: '٥. الاعتماد النهائي', text: 'مدير المختبر يعتمد النتيجة نهائياً (بعد مراجعة الجودة QC) ثم تُرسل النتائج.' },
];

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <GroupsIcon fontSize="small" /> },
  { id: 'samples', label: 'عينات المايكرو', icon: <BiotechIcon fontSize="small" /> },
  { id: 'analysts', label: 'المحللون', icon: <VerifiedIcon fontSize="small" /> },
  { id: 'analysis', label: 'فحوصات الملوثات', icon: <ScienceIcon fontSize="small" /> },
  { id: 'specs', label: 'المواصفات والحدود', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'qc', label: 'مراجعة الجودة', icon: <CheckCircleIcon fontSize="small" /> },
  { id: 'sla', label: 'متابعة SLA', icon: <TimerIcon fontSize="small" /> },
  { id: 'results', label: 'النتائج', icon: <AssignmentTurnedInIcon fontSize="small" /> },
  { id: 'reports', label: 'التقارير', icon: <RemoveRedEyeIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'settings', label: 'الإعدادات', icon: <BlockIcon fontSize="small" /> },
  { id: 'help', label: 'المساعدة', icon: <ErrorOutlineIcon fontSize="small" /> },
] as const;

const SECTION_NAV_MAP: Record<string, NavKey> = {
  overview: 'home',
  samples: 'samples.arrived',
  analysts: 'analysts.list',
  analysis: 'analysis.salmonella',
  specs: 'specs',
  qc: 'qc',
  sla: 'sla',
  results: 'results',
  reports: 'reports',
  alerts: 'alerts',
  settings: 'settings',
  help: 'help',
};

interface AnalystRow { user: User; workload?: WorkloadItem; }

const MicrobiologyLabPage = () => {
  const { user } = useAuth();
  const isSectionHead = user?.role === 'MICRO_SECTION_HEAD';
  const isManager = user?.role === 'LAB_MANAGER' || user?.role === 'ADMIN';

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

  const [dash, setDash] = useState<MicroDashboard | null>(null);
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [analysts, setAnalysts] = useState<User[]>([]);
  const [specs, setSpecs] = useState<MicrobiologicalSpecification[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [detailId, setDetailId] = useState<string | null>(null);

  const [assignSample, setAssignSample] = useState<FoodSample | null>(null);
  const [assignAnalyst, setAssignAnalyst] = useState('');
  const [assignPriority, setAssignPriority] = useState('NORMAL');
  const [assignTests, setAssignTests] = useState<string[]>([]);
  const [assignOriginalTests, setAssignOriginalTests] = useState<string[]>([]);

  const [reviewTest, setReviewTest] = useState<SampleTest | null>(null);
  const [reviewLimits, setReviewLimits] = useState<ApplicableLimits | null>(null);
  const [reviewDecision, setReviewDecision] = useState('COMPLIANT');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewReasons, setReviewReasons] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [reviewMode, setReviewMode] = useState<'approve' | 'return'>('approve');

  const [qcTest, setQcTest] = useState<SampleTest | null>(null);
  const [qcStatus, setQcStatus] = useState('PASSED');
  const [qcNotes, setQcNotes] = useState('');

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples, initialPageSize: 100 });
  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });
  const qcTests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });
  const pathoTests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });

  useEffect(() => {
    samples.setFilter('bench', 'MICROBIOLOGY');
    samples.setFilter('ordering', '-created_at');
    tests.setFilter('bench', 'MICROBIOLOGY');
    tests.setFilter('ordering', '-created_at');
    qcTests.setFilter('bench', 'MICROBIOLOGY');
    qcTests.setFilter('qc_status', 'PENDING');
    qcTests.setFilter('ordering', '-created_at');
    pathoTests.setFilter('bench', 'MICROBIOLOGY');
    pathoTests.setFilter('ordering', '-created_at');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDash = useCallback(() => {
    getMicroBiologyDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshWorkload = useCallback(() => {
    getMicroWorkload({ bench: 'MICROBIOLOGY' })
      .then((r) => setWorkload(r.data.data.workload))
      .catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    refreshWorkload();
    samples.refresh();
    tests.refresh();
    qcTests.refresh();
    pathoTests.refresh();
  }, [refreshDash, refreshWorkload, samples.refresh, tests.refresh, qcTests.refresh, pathoTests.refresh]);

  useEffect(() => {
    getLabParameters({ bench: 'MICROBIOLOGY', page_size: 100 })
      .then((r) => setParameters(r.data.data.results))
      .catch(() => undefined);
    getUsers({ page_size: 100 })
      .then((r) => {
        const rows = r.data.data.results;
        setUsers(rows);
        const lab = rows.filter((u) => u.role === 'LAB_TECHNICIAN' || u.role === 'LAB_MANAGER');
        setAnalysts(lab.length ? lab : rows.filter((u) => u.is_active));
      })
      .catch(() => undefined);
    getMicroSpecifications({ page_size: 100 })
      .then((r) => setSpecs(r.data.data.results))
      .catch(() => undefined);
    refreshAll();
  }, [refreshAll]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [nav]);

  const parameterIdFor = (keyword: string) => {
    if (!keyword) return '';
    return parameters.find((p) => `${p.name_ar} ${p.name_en} ${p.code}`.toLowerCase().includes(keyword))?.id ?? '';
  };

  const selectNav = (key: NavKey) => {
    setNav(key);
    if (typeof window !== 'undefined') window.location.hash = key;
    const pathogen = PATHOGEN_LIST.find((p) => p.key === key);
    if (pathogen) {
      pathoTests.setFilter('parameter', parameterIdFor(pathogen.keyword));
      return;
    }
  };

  const handleSectionNav = (id: string) => {
    const navKey = SECTION_NAV_MAP[id];
    if (navKey && navKey !== nav) {
      selectNav(navKey);
      requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(id)));
    } else {
      scrollTo(id);
    }
  };

  const openAssign = (s: FoodSample) => {
    setAssignSample(s);
    setAssignAnalyst(s.analyst ?? '');
    setAssignPriority(s.priority ?? 'NORMAL');
    const original = (s.tests ?? []).map((t) => t.parameter.id);
    setAssignOriginalTests(original);
    setAssignTests(original);
  };

  const submitAssign = async () => {
    if (!assignSample) return;
    if (!assignAnalyst) return notifyError('حدد المَحلِّل المسؤول عن التنفيذ');
    const id = assignSample.id;
    const testsChanged = assignTests.length !== assignOriginalTests.length ||
      assignTests.some((t) => !assignOriginalTests.includes(t));
    try {
      if (assignAnalyst !== assignSample.analyst) await assignSampleAnalyst(id, assignAnalyst);
      if (assignPriority && assignPriority !== assignSample.priority) await setSamplePriority(id, assignPriority);
      if (testsChanged) await setSampleParameters(id, assignTests);
      notifySuccess('تم توزيع العينة على المحلل وتحديد الأولوية');
      setAssignSample(null);
      refreshAll();
    } catch {
      notifyError('تعذر توزيع العينة');
    }
  };

  const openReview = async (t: SampleTest) => {
    setReviewTest(t);
    setReviewDecision(t.decision && t.decision !== 'PENDING' ? t.decision : 'COMPLIANT');
    setReviewNotes('');
    setReviewReasons([]);
    setReturnReason('');
    setReviewMode('approve');
    setReviewLimits(null);
    try {
      const r = await getApplicableLimits(t.id);
      setReviewLimits(r.data.data);
    } catch {
      setReviewLimits(null);
    }
  };

  const submitReviewApprove = async () => {
    if (!reviewTest) return;
    const reasonsLabel = NON_COMPLIANCE_REASONS
      .filter((r) => reviewReasons.includes(r.value))
      .map((r) => r.label)
      .join('، ');
    let notes = reviewNotes;
    if (reviewDecision === 'NON_COMPLIANT' && reasonsLabel) {
      notes = `${notes ? `${notes}\n` : ''}[عدم مطابقة] أسباب: ${reasonsLabel}.`;
    }
    try {
      await reviewSampleTest(reviewTest.id, { decision: reviewDecision, notes });
      notifySuccess('تمت مراجعة النتيجة وإحالتها لاعتماد مدير المختبر');
      setReviewTest(null);
      refreshAll();
    } catch {
      notifyError('تعذر إحالة النتيجة للاعتماد');
    }
  };

  const submitReturn = async () => {
    if (!reviewTest) return;
    if (!returnReason) return notifyError('اذكر سبب الإعادة للمحلل');
    const label = RETURN_REASONS.find((r) => r.value === returnReason)?.label ?? returnReason;
    try {
      await returnSampleTest(reviewTest.id, `${label}${reviewNotes ? ` — ${reviewNotes}` : ''}`);
      notifySuccess('أُعيدت النتيجة للمحلل للتصحيح');
      setReviewTest(null);
      refreshAll();
    } catch {
      notifyError('تعذر إعادة النتيجة للمحلل');
    }
  };

  const submitQc = async () => {
    if (!qcTest) return;
    try {
      await markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes });
      notifySuccess(qcStatus === 'PASSED' ? 'تم اعتماد الجودة (QC)' : 'سُجِّلت مخالفة جودة (QC)');
      setQcTest(null);
      setQcNotes('');
      refreshAll();
    } catch {
      notifyError('تعذر تسجيل مراجعة الجودة');
    }
  };

  const toggleReviewReason = (value: string) =>
    setReviewReasons((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  /* ---------- أعمدة الجداول ---------- */

  const sampleColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج', noWrap: false },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'analyst_name', label: 'المحلل', render: (s) => s.analyst_name ?? '—' },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => setDetailId(s.id)}>فتح</AppButton>
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => openAssign(s)}>توزيع</AppButton>
          )}
        </Stack>
      ),
    },
  ], [isSectionHead, isManager]);

  const testColumns: DataTableColumn<SampleTest>[] = useMemo(() => [
    { key: 'parameter', label: 'الفحص', noWrap: false, render: (t) => <b>{t.parameter.name_ar}</b> },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'result', label: 'النتيجة', render: (t) => (
      t.unit_results.length
        ? `${t.unit_results.length} وحدات`
        : (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—')
    ) },
    { key: 'decision', label: 'القرار', render: (t) => <StatusChip label={labDecision[t.decision]?.label ?? t.decision} tone={labDecision[t.decision]?.tone} /> },
    { key: 'evaluation', label: 'التقييم', render: (t) => (
      t.evaluation ? <StatusChip label={labDecision[t.evaluation]?.label ?? t.evaluation} tone={labDecision[t.evaluation]?.tone} /> : '—'
    ) },
    { key: 'qc_status', label: 'QC', render: (t) => <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} /> },
    { key: 'sla', label: 'SLA', render: (t) => (t.sla?.status ? <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} /> : '—') },
    {
      key: 'actions', label: '', render: (t) => (
        <Stack direction="row" spacing={0.5}>
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => openReview(t)}>مراجعة</AppButton>
          )}
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => { setQcTest(t); setQcStatus('PASSED'); setQcNotes(''); }}>QC</AppButton>
          )}
        </Stack>
      ),
    },
  ], [isSectionHead, isManager]);

  const workloadColumns: DataTableColumn<WorkloadItem>[] = useMemo(() => [
    { key: 'full_name', label: 'المحلل', render: (w) => <b>{w.full_name}</b> },
    { key: 'in_progress', label: 'قيد التنفيذ' },
    { key: 'draft', label: 'مسودة' },
    { key: 'review', label: 'للمراجعة' },
    { key: 'overdue', label: 'متأخر', render: (w) => (w.overdue > 0 ? <Box component="b" sx={{ color: 'error.main' }}>{w.overdue}</Box> : '0') },
    { key: 'completed', label: 'مكتمل' },
    { key: 'total', label: 'الإجمالي' },
    { key: 'load', label: 'مؤشر العبء', render: (w) => <StatusChip label={LOAD_LEVEL[w.load_level]?.label ?? w.load_level} tone={LOAD_LEVEL[w.load_level]?.tone} /> },
  ], []);

  const analystRows = useMemo<AnalystRow[]>(
    () => analysts.map((u) => ({ user: u, workload: workload.find((w) => w.id === u.id) })),
    [analysts, workload],
  );

  const analystColumns: DataTableColumn<AnalystRow>[] = useMemo(() => [
    { key: 'full_name', label: 'المحلل', render: (r) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontWeight: 700, fontSize: 13 }}>
          {(r.user.full_name || r.user.email || '؟').charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{r.user.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">{r.user.email}</Typography>
        </Box>
      </Stack>
    ) },
    { key: 'active', label: 'الحالة', render: (r) => (
      <StatusChip label={r.user.is_active ? 'نشط' : 'غير نشط'} tone={r.user.is_active ? 'success' : 'neutral'} />
    ) },
    { key: 'in_progress', label: 'قيد التنفيذ', render: (r) => r.workload?.in_progress ?? 0 },
    { key: 'review', label: 'للمراجعة', render: (r) => r.workload?.review ?? 0 },
    { key: 'overdue', label: 'متأخر', render: (r) => (
      r.workload && r.workload.overdue > 0 ? <Box component="b" sx={{ color: 'error.main' }}>{r.workload.overdue}</Box> : '0'
    ) },
    { key: 'total', label: 'الإجمالي', render: (r) => r.workload?.total ?? 0 },
    { key: 'load', label: 'مؤشر العبء', render: (r) => (
      r.workload
        ? <StatusChip label={LOAD_LEVEL[r.workload.load_level]?.label ?? r.workload.load_level} tone={LOAD_LEVEL[r.workload.load_level]?.tone} />
        : '—'
    ) },
  ], []);

  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={3} lg={2}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );

  const statGroup = (title: string, items: React.ReactNode[]) => (
    <Grid container spacing={1.5} sx={{ mb: 3 }}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
        </Typography>
      </Grid>
      {items}
    </Grid>
  );

  const alerts = useMemo(() => {
    if (!dash) return [];
    const list: Array<{ severity: 'error' | 'warning' | 'info' | 'success'; text: string; nav?: NavKey }> = [];
    if (dash.overdue_tests > 0) list.push({ severity: 'error', text: `${dash.overdue_tests} فحص تجاوز مدة SLA المطلوبة`, nav: 'sla' });
    if (dash.urgent > 0) list.push({ severity: 'error', text: `${dash.urgent} عينة عاجلة/عالية الأولوية قيد التحليل`, nav: 'samples.inprogress' });
    if (dash.submitted > 0) list.push({ severity: 'warning', text: `${dash.submitted} نتيجة بانتظار مراجعتك`, nav: 'results' });
    if (dash.reviewed > 0) list.push({ severity: 'warning', text: `${dash.reviewed} نتيجة راجعتَها وبانتظار اعتماد مدير المختبر` });
    if (dash.at_risk_tests > 0) list.push({ severity: 'warning', text: `${dash.at_risk_tests} فحص قرب استحقاق المدة (خلال 24 ساعة)`, nav: 'sla' });
    if (dash.qc_pending > 0) list.push({ severity: 'info', text: `${dash.qc_pending} نتيجة بانتظار مراجعة الجودة`, nav: 'qc' });
    if (dash.qc_failed > 0) list.push({ severity: 'error', text: `${dash.qc_failed} مخالفة جودة (QC) تتطلب إجراء`, nav: 'qc' });
    if (dash.non_compliant > 0) list.push({ severity: 'warning', text: `${dash.non_compliant} نتيجة غير مطابقة للمواصفة`, nav: 'results' });
    if (list.length === 0) list.push({ severity: 'success', text: 'لا تنبيهات حالياً — أداء القسم ضمن المؤشرات' });
    return list;
  }, [dash]);

  const specLimitRows = (spec: MicrobiologicalSpecification) =>
    (spec.current_version?.limits ?? []).filter((l) => l.active);

  const slaRows = useMemo(
    () => tests.rows.filter((t) => t.sla?.status && t.sla.status !== 'ON_TIME' && t.sla.status !== 'COMPLETED'),
    [tests.rows],
  );

  const delayedRows = useMemo(
    () => tests.rows.filter((t) => t.sla?.status === 'DELAYED'),
    [tests.rows],
  );

  const samplesGroupRows = useMemo(() => {
    const statuses = SAMPLE_STATUS_GROUPS[nav];
    if (!statuses) return [];
    return samples.rows.filter((s) => statuses.includes(s.status));
  }, [samples.rows, nav]);

  const slaPct = Math.min(Math.max(dash?.sla_compliance?.percent ?? 0, 0), 100);

  const pathogenLabel = PATHOGEN_LIST.find((p) => p.key === nav)?.label ?? 'التحاليل';


  return (
    <Box>
      <DashboardHero
        eyebrow="Microbiology Lab"
        title="قسم الأحياء الدقيقة — لوحة رئيس القسم"
        subtitle="توزيع العينات، متابعة التحاليل، مراجعة النتائج وفق المواصفة (n/c/m/M)، مراجعة الجودة، SLA وعبء العمل"
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        action={
          <Stack direction="row" spacing={1}>
            <Chip icon={<GroupsIcon />} label={dash ? `${dash.analysts_count} محللين` : '—'} size="small" variant="outlined" />
            <Chip icon={<ScienceIcon />} label={dash ? `${dash.specs_active} مواصفة فعالة` : '—'} size="small" variant="outlined" />
            <AppButton startIcon={<NotificationsActiveIcon />} variant="secondary" onClick={() => selectNav('alerts')}>
              التنبيهات {alerts.length > 0 ? `(${alerts.length})` : ''}
            </AppButton>
          </Stack>
        }
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
            onNavigate={handleSectionNav}
            accent="primary.main"
            label="أقسام المختبر"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box>
        {nav === 'home' && (
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <>
                {statGroup('العمليات — سير العينات والتحاليل', [
                  stat('عينات المايكرو', dash?.total_samples ?? '—', <BiotechIcon />),
                  stat('اليوم', dash?.today_tests ?? '—', <TimerIcon />),
                  stat('قيد التحليل', dash?.under_testing ?? '—', <AssignmentTurnedInIcon />),
                  stat('مكتملة', dash?.completed ?? '—', <CheckCircleIcon />),
                ])}
                {statGroup('المراجعة والاعتماد', [
                  stat('للمراجعة', dash?.submitted ?? '—', <RemoveRedEyeIcon />),
                  stat('رشحت للمدير', dash?.reviewed ?? '—', <VerifiedIcon />),
                  stat('جاهزة للاعتماد', dash?.ready_for_approval ?? '—', <FactCheckIcon />),
                  stat('معتمدة', dash?.approved ?? '—', <CheckCircleIcon />),
                  stat('بانتظار QC', dash?.qc_pending ?? '—', <FactCheckIcon />),
                  stat('مخالفات QC', dash?.qc_failed ?? '—', <ErrorOutlineIcon />),
                ])}
                {statGroup('الالتزام والأداء', [
                  stat('غير مطابقة', dash?.non_compliant ?? '—', <ErrorOutlineIcon />),
                  stat('متأخرة SLA', dash?.overdue_tests ?? '—', <WarningAmberIcon />),
                  stat('قرب الاستحقاق', dash?.at_risk_tests ?? '—', <TimerIcon />),
                  stat('معدل TAT', dash?.avg_tat_hours != null ? `${dash.avg_tat_hours} س` : '—', <TimerIcon />),
                  stat('التزام SLA', dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />),
                ])}

                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <DataTable<WorkloadItem>
                      columns={workloadColumns}
                      rows={workload}
                      rowKey={(w) => w.id}
                      count={workload.length}
                      page={1}
                      rowsPerPage={10}
                      pageSizeOptions={[10]}
                      loading={false}
                      hidePagination
                      title="عبء عمل المحللين — توزيع حي"
                      onRefresh={refreshWorkload}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="h6" sx={{ mb: 1.5 }}>خلاصة العمليات</Typography>
                      <Stack spacing={1}>
                        <Alert severity="info">إجمالي النتائج بانتظار المراجعة/الاعتماد: {dash?.pending_results ?? 0}</Alert>
                        <Alert severity="warning">تقييمات آلية مسجلة وفق المواصفة: {dash?.evaluated_tests ?? 0}</Alert>
                        <Alert severity="success">الالتزام بمدة الإنجاز: {dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}% (${dash.sla_compliance.on_time}/${dash.sla_compliance.count})` : 'لا بيانات بعد'}</Alert>
                        <Divider sx={{ my: 1 }} />
                        {alerts.slice(0, 4).map((a, i) => <Alert key={i} severity={a.severity}>{a.text}</Alert>)}
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>
              </>
              </Box>
            )}

            {nav.startsWith('samples.') && (
              <Box component="section" ref={register('samples')} data-section="samples" sx={{ scrollMarginTop: '80px' }}>
                {nav === 'samples.overdue'
                ? (
                  <>
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      {stat('فحوصات متأخرة SLA', dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                      {stat('قرب الاستحقاق (24س)', dash?.at_risk_tests ?? '—', <TimerIcon />)}
                    </Grid>
                    <DataTable<SampleTest>
                      columns={testColumns}
                      rows={delayedRows}
                      rowKey={(r) => r.id}
                      count={delayedRows.length}
                      page={1}
                      rowsPerPage={10}
                      pageSizeOptions={[10, 25]}
                      loading={tests.loading}
                      error={tests.error}
                      title="العينات المتأخرة — فحوصات تجاوزت مدة SLA"
                      subtitle="يعرض الفحوصات المتأخرة من صفحة النتائج الحالية — استخدم قسم «متابعة SLA» للمتابعة الكاملة"
                      hidePagination
                      onRefresh={tests.refresh}
                    />
                  </>
                )
                : (
                  <DataTable<FoodSample>
                    columns={sampleColumns}
                    rows={samplesGroupRows}
                    rowKey={(r) => r.id}
                    count={samplesGroupRows.length}
                    page={1}
                    rowsPerPage={samples.rowsPerPage}
                    pageSizeOptions={samples.pageSizeOptions}
                    loading={samples.loading}
                    error={samples.error}
                    title={SAMPLES_NAV_TITLES[nav]}
                    subtitle="الفلترة تخص قسم الأحياء الدقيقة فقط (المختبر: MICROBIOLOGY) — تُستعرض العينات حسب حالة دورة العمل"
                    search={samples.search}
                    searchInput={samples.searchInput}
                    onSearchChange={samples.setSearchInput}
                    sortBy={samples.sortBy}
                    sortOrder={samples.sortOrder}
                    onSortChange={samples.setSorting}
                    hidePagination
                    onRefresh={samples.refresh}
                  />
                )}
              </Box>
            )}

            {nav.startsWith('analysts.') && (
              <Box component="section" ref={register('analysts')} data-section="analysts" sx={{ scrollMarginTop: '80px' }}>
            {nav === 'analysts.list' && (
              <DataTable<AnalystRow>
                columns={analystColumns}
                rows={analystRows}
                rowKey={(r) => r.user.id}
                count={analystRows.length}
                page={1}
                rowsPerPage={10}
                pageSizeOptions={[10, 25]}
                loading={false}
                hidePagination
                title="قائمة المحللين — فريق قسم الأحياء الدقيقة"
                subtitle="العبء والمؤشرات تُحسب من توزيع الفحوصات الحالي على كل محلل"
                onRefresh={refreshWorkload}
              />
            )}

            {nav === 'analysts.workload' && (
              <DataTable<WorkloadItem>
                columns={workloadColumns}
                rows={workload}
                rowKey={(w) => w.id}
                count={workload.length}
                page={1}
                rowsPerPage={10}
                pageSizeOptions={[10]}
                loading={false}
                hidePagination
                title="عبء عمل المحللين"
                subtitle="مؤشر العبء يُحتسب من: متأخر ×4 + للمراجعة ×3 + قيد التنفيذ ×2 + المسودات"
                onRefresh={refreshWorkload}
              />
            )}
            </Box>
            )}

            {nav.startsWith('analysis.') && (
              <Box component="section" ref={register('analysis')} data-section="analysis" sx={{ scrollMarginTop: '80px' }}>
              <DataTable<SampleTest>
                columns={testColumns}
                rows={pathoTests.rows}
                rowKey={(r) => r.id}
                count={pathoTests.count}
                page={pathoTests.page}
                rowsPerPage={pathoTests.rowsPerPage}
                pageSizeOptions={pathoTests.pageSizeOptions}
                loading={pathoTests.loading}
                error={pathoTests.error}
                title={`فحوصات ${pathogenLabel}`}
                subtitle="اجتياز حسب الفحص المؤشر — تُطبَّق المواصفة (n/c/m/M) على نتائج الوحدات المسجلة"
                search={pathoTests.search}
                searchInput={pathoTests.searchInput}
                onSearchChange={pathoTests.setSearchInput}
                sortBy={pathoTests.sortBy}
                sortOrder={pathoTests.sortOrder}
                onSortChange={pathoTests.setSorting}
                onPageChange={pathoTests.setPage}
                onRowsPerPageChange={pathoTests.setRowsPerPage}
                onRefresh={pathoTests.refresh}
              />
              </Box>
            )}

            {nav === 'specs' && (
              <Box component="section" ref={register('specs')} data-section="specs" sx={{ scrollMarginTop: '80px' }}>
              <Grid container spacing={2}>
                {specs.map((s) => (
                  <Grid item xs={12} md={6} lg={4} key={s.id}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.code} {s.product_name ? `• ${s.product_name}` : ''}</Typography>
                        </Box>
                        <StatusChip label={s.status_label ?? s.status} tone={s.status === 'ACTIVE' ? 'success' : s.status === 'DRAFT' ? 'warning' : 'neutral'} />
                      </Stack>
                      {s.reference && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>المرجع: {s.reference}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        الإصدار الحالي:
                        {s.current_version ? ` v${s.current_version.version} (ساري من ${formatDate(s.current_version.effective_from ?? '')})` : '—'}
                      </Typography>
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>الكائن</TableCell>
                            <TableCell align="center">n</TableCell>
                            <TableCell align="center">c</TableCell>
                            <TableCell align="center">m</TableCell>
                            <TableCell align="center">M</TableCell>
                            <TableCell>الخطة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {specLimitRows(s).map((l) => (
                            <TableRow key={l.id}>
                              <TableCell>{l.microorganism_name ?? '—'}</TableCell>
                              <TableCell align="center">{l.n}</TableCell>
                              <TableCell align="center">{l.c}</TableCell>
                              <TableCell align="center">{l.m ?? '—'}</TableCell>
                              <TableCell align="center">{l.M ?? '—'}</TableCell>
                              <TableCell>{l.plan_label ?? l.plan}</TableCell>
                            </TableRow>
                          ))}
                          {specLimitRows(s).length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center">لا حدود مفعّلة في الإصدار الحالي</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        نسخ: {s.versions.length} — القراءة فقط، التعديل لدى مدير التقييم
                      </Typography>
                    </Box>
                  </Grid>
                ))}
                {specs.length === 0 && (
                  <Grid item xs={12}><Typography variant="body2" color="text.secondary">لا توجد مواصفات مسجلة.</Typography></Grid>
                )}
              </Grid>
              </Box>
            )}

            {nav === 'qc' && (
              <Box component="section" ref={register('qc')} data-section="qc" sx={{ scrollMarginTop: '80px' }}>
              <>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {stat('بانتظار مراجعة QC', dash?.qc_pending ?? '—', <FactCheckIcon />)}
                  {stat('مخالفات QC', dash?.qc_failed ?? '—', <ErrorOutlineIcon />)}
                  {stat('في قائمة المراجعة', qcTests.count ?? '—', <FactCheckIcon />)}
                </Grid>
                <DataTable<SampleTest>
                  columns={testColumns}
                  rows={qcTests.rows}
                  rowKey={(r) => r.id}
                  count={qcTests.count}
                  page={qcTests.page}
                  rowsPerPage={qcTests.rowsPerPage}
                  pageSizeOptions={qcTests.pageSizeOptions}
                  loading={qcTests.loading}
                  error={qcTests.error}
                  title="مراجعة الجودة QC — النتائج بانتظار المراجعة"
                  subtitle="اعتماد مطابقة النتيجة للمواصفة قبل الاعتماد النهائي من مدير المختبر"
                  search={qcTests.search}
                  searchInput={qcTests.searchInput}
                  onSearchChange={qcTests.setSearchInput}
                  sortBy={qcTests.sortBy}
                  sortOrder={qcTests.sortOrder}
                  onSortChange={qcTests.setSorting}
                  onPageChange={qcTests.setPage}
                  onRowsPerPageChange={qcTests.setRowsPerPage}
                  onRefresh={qcTests.refresh}
                />
              </>
              </Box>
            )}

            {nav === 'sla' && (
              <Box component="section" ref={register('sla')} data-section="sla" sx={{ scrollMarginTop: '80px' }}>
              <>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {stat('التزام SLA', dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />)}
                  {stat('ضمن المدة', dash?.sla_compliance?.on_time ?? '—', <CheckCircleIcon />)}
                  {stat('إجمالي المقاس', dash?.sla_compliance?.count ?? '—', <TimerIcon />)}
                  {stat('متأخرة', dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                  {stat('قرب الاستحقاق', dash?.at_risk_tests ?? '—', <TimerIcon />)}
                </Grid>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>نسبة الالتزام بمدة الإنجاز (SLA)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }}>
                      {slaPct}%
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 10, borderRadius: 10, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ width: `${slaPct}%`, height: '100%', borderRadius: 10, bgcolor: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {dash?.sla_compliance?.count != null
                      ? `${dash.sla_compliance.on_time} فحصاً من أصل ${dash.sla_compliance.count} أُنجزت ضمن المدة المطلوبة`
                      : 'لا توجد بيانات كافية بعد'}
                  </Typography>
                </Box>
                <DataTable<SampleTest>
                  columns={testColumns}
                  rows={slaRows}
                  rowKey={(r) => r.id}
                  count={slaRows.length}
                  page={1}
                  rowsPerPage={10}
                  pageSizeOptions={[10, 25, 50, 100]}
                  loading={tests.loading}
                  error={tests.error}
                  title="متابعة SLA — فحوصات قرب الاستحقاق أو المتأخرة"
                  subtitle="يعرض الفحوصات بخلاف حالة «ضمن المدة» من صفحة النتائج الحالية"
                  hidePagination
                  onRefresh={tests.refresh}
                />
              </>
              </Box>
            )}

            {nav === 'results' && (
              <Box component="section" ref={register('results')} data-section="results" sx={{ scrollMarginTop: '80px' }}>
              <DataTable<SampleTest>
                columns={testColumns}
                rows={tests.rows}
                rowKey={(r) => r.id}
                count={tests.count}
                page={tests.page}
                rowsPerPage={tests.rowsPerPage}
                pageSizeOptions={tests.pageSizeOptions}
                loading={tests.loading}
                error={tests.error}
                title="نتائج فحوصات المايكرو — المراجعة والتقييم"
                subtitle="مراجعة رئيس القسم ثم الإحالة لاعتماد مدير المختبر — أو الإعادة للمحلل مع السبب"
                search={tests.search}
                searchInput={tests.searchInput}
                onSearchChange={tests.setSearchInput}
                sortBy={tests.sortBy}
                sortOrder={tests.sortOrder}
                onSortChange={tests.setSorting}
                onPageChange={tests.setPage}
                onRowsPerPageChange={tests.setRowsPerPage}
                onRefresh={tests.refresh}
              />
              </Box>
            )}

            {nav === 'reports' && (
              <Box component="section" ref={register('reports')} data-section="reports" sx={{ scrollMarginTop: '80px' }}>
              <>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {stat('عينات المايكرو', dash?.total_samples ?? '—', <BiotechIcon />)}
                  {stat('قيد التحليل', dash?.under_testing ?? '—', <AssignmentTurnedInIcon />)}
                  {stat('للمراجعة', dash?.submitted ?? '—', <RemoveRedEyeIcon />)}
                  {stat('مكتملة', dash?.completed ?? '—', <CheckCircleIcon />)}
                  {stat('غير مطابقة', dash?.non_compliant ?? '—', <ErrorOutlineIcon />)}
                  {stat('تقييمات آلية', dash?.evaluated_tests ?? '—', <FactCheckIcon />)}
                  {stat('متأخرة SLA', dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                  {stat('مخالفات QC', dash?.qc_failed ?? '—', <ErrorOutlineIcon />)}
                  {stat('معدل TAT', dash?.avg_tat_hours != null ? `${dash.avg_tat_hours} س` : '—', <TimerIcon />)}
                  {stat('التزام SLA', dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />)}
                </Grid>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <DataTable<WorkloadItem>
                      columns={workloadColumns}
                      rows={workload}
                      rowKey={(w) => w.id}
                      count={workload.length}
                      page={1}
                      rowsPerPage={10}
                      pageSizeOptions={[10]}
                      loading={false}
                      hidePagination
                      title="توزيع عبء العمل"
                      onRefresh={refreshWorkload}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="h6" sx={{ mb: 1.5 }}>ملخص تقارير القسم</Typography>
                      <Stack spacing={1}>
                        <Alert severity="info">نتائج بانتظار المراجعة/الاعتماد: {dash?.pending_results ?? 0}</Alert>
                        <Alert severity="warning">نتائج غير مطابقة تستوجب إشعار الجهات: {dash?.non_compliant ?? 0}</Alert>
                        <Alert severity="success">مواصفات فعالة مطبقة: {dash?.specs_active ?? 0}</Alert>
                        <Alert severity="info">عدد المحللين النشطين: {dash?.analysts_count ?? 0}</Alert>
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>
              </>
              </Box>
            )}

            {nav === 'alerts' && (
              <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Stack spacing={1.5}>
                  {alerts.map((a, i) => (
                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                      <Alert severity={a.severity} sx={{ flex: 1 }}>{a.text}</Alert>
                      {a.nav && <AppButton size="small" variant="secondary" onClick={() => selectNav(a.nav!)}>افتتاح</AppButton>}
                    </Stack>
                  ))}
                </Stack>
              </Box>
              </Box>
            )}

            {nav === 'settings' && (
              <Box component="section" ref={register('settings')} data-section="settings" sx={{ scrollMarginTop: '80px' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>صلاحيات رئيس القسم المتاحة</Typography>
                    <Stack spacing={1}>
                      {SETTINGS_ALLOWED.map((s) => (
                        <Stack key={s.label} direction="row" alignItems="center" spacing={1}>
                          <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                          <Typography variant="body2">
                            <b>{s.label}</b>
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>خارج نطاق صلاحيات الرئيس</Typography>
                    <Stack spacing={1}>
                      {SETTINGS_BLOCKED.map((s) => (
                        <Stack key={s.label} direction="row" alignItems="center" spacing={1}>
                          <BlockIcon fontSize="small" sx={{ color: 'error.main' }} />
                          <Typography variant="body2">
                            <b>{s.label}</b>
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
              </Box>
            )}

            {nav === 'help' && (
              <Box component="section" ref={register('help')} data-section="help" sx={{ scrollMarginTop: '80px' }}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>دورة عمل قسم الأحياء الدقيقة</Typography>
                <Grid container spacing={2}>
                  {HELP_STEPS.map((s) => (
                    <Grid item xs={12} md={4} key={s.title}>
                      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>{s.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{s.text}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {detailId && (
        <SampleDetailDialog
          sampleId={detailId}
          parameters={parameters}
          usersFetch={getUsers}
          onClose={() => setDetailId(null)}
          onChanged={refreshAll}
        />
      )}

      <FormDialog open={Boolean(assignSample)} onClose={() => setAssignSample(null)} onSubmit={submitAssign} title="توزيع عينة على المحلل" subtitle="اختر المحلل والفحوصات والأولوية — التوزيع يرفع العينة لحالة الإسناد" maxWidth="sm" submitLabel="توزيع">
        {assignSample && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {assignSample.sample_number} — {assignSample.sample_type}
            </Typography>
            <FormSelect
              label="المحلل"
              value={assignAnalyst}
              onChange={setAssignAnalyst}
              options={analysts.map((u) => ({ value: u.id, label: u.full_name }))}
            />
            <FormSelect
              label="الأولوية"
              value={assignPriority}
              onChange={setAssignPriority}
              options={Object.entries(labPriority).map(([v, m]) => ({ value: v, label: m.label }))}
            />
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>الفحوصات الموزَّعة</Typography>
            {parameters.map((p) => {
              const checked = assignTests.includes(p.id);
              return (
                <Stack key={p.id} direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    checked={checked}
                    onChange={() => setAssignTests((prev) => (checked ? prev.filter((id) => id !== p.id) : [...prev, p.id]))}
                    size="small"
                  />
                  <Typography variant="body2">{p.name_ar}</Typography>
                </Stack>
              );
            })}
            {parameters.length === 0 && (
              <Typography variant="body2" color="text.secondary">لا توجد فحوصات ميكروبيولوجية مسجلة.</Typography>
            )}
          </>
        )}
      </FormDialog>

      <FormDialog open={Boolean(reviewTest)} onClose={() => setReviewTest(null)} onSubmit={reviewMode === 'approve' ? submitReviewApprove : submitReturn} title="مراجعة نتيجة — رئيس قسم الأحياء الدقيقة" subtitle="المراجعة وفق المواصفة المطبَّقة (n/c/m/M) ثم إحالة لاعتماد مدير المختبر" maxWidth="md" submitLabel={reviewMode === 'approve' ? 'اعتماد المراجعة وإحالة للمدير' : 'إعادة للمحلل'}>
        {reviewTest && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{reviewTest.parameter.name_ar}</Typography>
              <StatusChip label={labTestStatus[reviewTest.status]?.label ?? reviewTest.status} tone={labTestStatus[reviewTest.status]?.tone} />
              <StatusChip label={labDecision[reviewTest.decision]?.label ?? reviewTest.decision} tone={labDecision[reviewTest.decision]?.tone} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              النتيجة: {reviewTest.unit_results.length
                ? `${reviewTest.unit_results.length} وحدة`
                : (reviewTest.result_value != null ? `${reviewTest.result_value} ${reviewTest.unit}` : reviewTest.result_text || '—')}
              {' '}— المحلل: {reviewTest.assigned_to_name ?? '—'}
              {reviewTest.evaluated_at ? ` — تقييم آلي: ${formatDateTime(reviewTest.evaluated_at)}` : ''}
            </Typography>
            {reviewTest.unit_results.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: 'wrap' }}>
                {reviewTest.unit_results.map((u) => (
                  <Chip key={u.id} size="small" variant="outlined" label={`${u.unit_number}: ${u.result_value ?? '—'} ${u.qualifier ?? ''}`} />
                ))}
              </Stack>
            )}
            {reviewTest.evaluation_reason && (
              <Alert severity={reviewTest.evaluation === 'NON_COMPLIANT' ? 'error' : reviewTest.evaluation === 'COMPLIANT' ? 'success' : 'info'} sx={{ mb: 1 }}>
                التقييم الآلي ({reviewTest.evaluation ?? '—'}): {reviewTest.evaluation_reason}
              </Alert>
            )}
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>الحدود المطبَّقة حسب المواصفة</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الكائن</TableCell>
                  <TableCell align="center">n</TableCell>
                  <TableCell align="center">c</TableCell>
                  <TableCell align="center">m</TableCell>
                  <TableCell align="center">M</TableCell>
                  <TableCell>الخطة</TableCell>
                  <TableCell>الوحدة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reviewLimits?.limits ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.microorganism_name ?? '—'}</TableCell>
                    <TableCell align="center">{l.n}</TableCell>
                    <TableCell align="center">{l.c}</TableCell>
                    <TableCell align="center">{l.m ?? '—'}</TableCell>
                    <TableCell align="center">{l.M ?? '—'}</TableCell>
                    <TableCell>{l.plan_label ?? l.plan}</TableCell>
                    <TableCell>{l.unit}</TableCell>
                  </TableRow>
                ))}
                {(reviewLimits?.limits ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center">لم تُحدَّد حدود مطبَّقة لهذه العينة</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {reviewLimits?.spec_version?.label && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                المواصفة: {reviewLimits.spec_version.spec_name} {reviewLimits.spec_version.label}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>إجراء المراجعة</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <AppButton variant={reviewMode === 'approve' ? 'primary' : 'secondary'} onClick={() => setReviewMode('approve')}>
                إحالة للاعتماد
              </AppButton>
              <AppButton variant={reviewMode === 'return' ? 'primary' : 'secondary'} onClick={() => setReviewMode('return')}>
                إعادة للمحلل
              </AppButton>
            </Stack>
            {reviewMode === 'approve' ? (
              <>
                <FormSelect
                  label="قرار المراجعة"
                  value={reviewDecision}
                  onChange={setReviewDecision}
                  options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))}
                />
                {reviewDecision === 'NON_COMPLIANT' && (
                  <Box sx={{ p: 1.5, mt: 1, borderRadius: 2, border: '1px solid', borderColor: 'error.main', bgcolor: 'rgba(198,58,58,0.08)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
                      أسباب عدم المطابقة — اختر واحداً أو أكثر
                    </Typography>
                    {NON_COMPLIANCE_REASONS.map((r) => {
                      const checked = reviewReasons.includes(r.value);
                      return (
                        <Stack key={r.value} direction="row" alignItems="center" spacing={1}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => toggleReviewReason(r.value)}
                            sx={{ '&.Mui-checked': { color: 'error.main' } }}
                          />
                          <Typography variant="body2">{r.label}</Typography>
                        </Stack>
                      );
                    })}
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      سَتُرفق هذه الأسباب مع النتيجة، ويُبلَّغ مدير المختبر عند الإحالة للاعتماد النهائي لاتخاذ إجراءات تصحيحية.
                    </Alert>
                  </Box>
                )}
              </>
            ) : (
              <FormSelect
                label="سبب الإعادة"
                value={returnReason}
                onChange={setReturnReason}
                options={RETURN_REASONS.map((r) => ({ value: r.value, label: r.label }))}
              />
            )}
            <FormTextField label="ملاحظات المراجعة" multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      <FormDialog open={Boolean(qcTest)} onClose={() => setQcTest(null)} onSubmit={submitQc} title="مراجعة الجودة — QC" subtitle="اعتماد مطابقة النتيجة للمواصفة قبل الاعتماد النهائي من مدير المختبر" maxWidth="xs" submitLabel="تسجيل المراجعة">
        {qcTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{qcTest.parameter.name_ar}</Typography>
            <FormSelect
              label="نتيجة مراجعة الجودة"
              value={qcStatus}
              onChange={setQcStatus}
              options={Object.entries(labQc).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))}
            />
            <FormTextField label="ملاحظات QC" multiline minRows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

export default MicrobiologyLabPage;
