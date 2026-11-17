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
import { useTranslation } from 'react-i18next';
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

const RETURN_REASONS = (i18nT: (key: string) => string) => [
  { value: 'exceeded_M', label: i18nT('food.microbiologyLab.str143') },
  { value: 'exceeded_c', label: i18nT('food.microbiologyLab.str144') },
  { value: 'method', label: i18nT('food.microbiologyLab.str145') },
  { value: 'qc', label: i18nT('food.microbiologyLab.str146') },
  { value: 'sample', label: i18nT('food.microbiologyLab.str147') },
  { value: 'other', label: i18nT('food.microbiologyLab.str148') },
];

const NON_COMPLIANCE_REASONS = (i18nT: (key: string) => string) => [
  { value: 'exceeded_M', label: i18nT('food.microbiologyLab.str149') },
  { value: 'exceeded_c', label: i18nT('food.microbiologyLab.str150') },
  { value: 'pathogen_detected', label: i18nT('food.microbiologyLab.str151') },
  { value: 'method', label: i18nT('food.microbiologyLab.str152') },
  { value: 'documentation', label: i18nT('food.microbiologyLab.str153') },
  { value: 'other', label: i18nT('food.microbiologyLab.str154') },
];

const LOAD_LEVEL = (i18nT: (key: string) => string): Record<string, { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' }> => ({
  idle: { label: i18nT('food.microbiologyLab.str155'), tone: 'neutral' },
  normal: { label: i18nT('food.microbiologyLab.str156'), tone: 'success' },
  high: { label: i18nT('food.microbiologyLab.str157'), tone: 'warning' },
  overloaded: { label: i18nT('food.microbiologyLab.str158'), tone: 'error' as const },
});

const PATHOGEN_LIST = (i18nT: (key: string) => string): Array<{ key: string; label: string; keyword: string }> => [
  { key: 'analysis.salmonella', label: i18nT('food.microbiologyLab.str159'), keyword: 'salmonella' },
  { key: 'analysis.ecoli', label: i18nT('food.microbiologyLab.str160'), keyword: 'coli' },
  { key: 'analysis.coliform', label: i18nT('food.microbiologyLab.str161'), keyword: 'coliform' },
  { key: 'analysis.listeria', label: i18nT('food.microbiologyLab.str162'), keyword: 'listeria' },
  { key: 'analysis.other', label: i18nT('food.microbiologyLab.str163'), keyword: '' },
];

/* ---------- مفاتيح التنقل (تُقرأ من الـhash عبر الـlayout) ---------- */

type NavKey =
  | 'home'
  | 'samples.arrived' | 'samples.inprogress' | 'samples.review' | 'samples.completed' | 'samples.overdue'
  | 'analysts.list' | 'analysts.workload'
  | 'analysis.salmonella' | 'analysis.ecoli' | 'analysis.coliform' | 'analysis.listeria' | 'analysis.other'
  | 'specs' | 'qc' | 'sla' | 'results' | 'reports' | 'alerts' | 'settings' | 'help';

const SAMPLES_NAV_TITLES = (i18nT: (key: string) => string): Record<string, string> => ({
  'samples.arrived': i18nT('food.microbiologyLab.str185'),
  'samples.inprogress': i18nT('food.microbiologyLab.str186'),
  'samples.review': i18nT('food.microbiologyLab.str187'),
  'samples.completed': i18nT('food.microbiologyLab.str258'),
});

const SAMPLE_STATUS_GROUPS: Record<string, string[]> = {
  'samples.arrived': ['RECEIVED', 'COORDINATED', 'ASSIGNED'],
  'samples.inprogress': ['UNDER_TESTING'],
  'samples.review': ['READY_FOR_APPROVAL'],
  'samples.completed': ['APPROVED', 'DISPATCHED', 'COMPLETED'],
};

const SETTINGS_ALLOWED = (i18nT: (key: string) => string) => [
  { label: i18nT('food.microbiologyLab.str164') },
  { label: i18nT('food.microbiologyLab.str165') },
  { label: i18nT('food.microbiologyLab.str166') },
  { label: i18nT('food.microbiologyLab.str167') },
  { label: i18nT('food.microbiologyLab.str168') },
];

const SETTINGS_BLOCKED = (i18nT: (key: string) => string) => [
  { label: i18nT('food.microbiologyLab.str169') },
  { label: i18nT('food.microbiologyLab.str170') },
  { label: i18nT('food.microbiologyLab.str171') },
  { label: i18nT('food.microbiologyLab.str172') },
];

const HELP_STEPS = (i18nT: (key: string) => string) => [
  { title: i18nT('food.microbiologyLab.str188'), text: i18nT('food.microbiologyLab.str189') },
  { title: i18nT('food.microbiologyLab.str190'), text: i18nT('food.microbiologyLab.str191') },
  { title: i18nT('food.microbiologyLab.str192'), text: i18nT('food.microbiologyLab.str193') },
  { title: i18nT('food.microbiologyLab.str194'), text: i18nT('food.microbiologyLab.str195') },
  { title: i18nT('food.microbiologyLab.str196'), text: i18nT('food.microbiologyLab.str197') },
];

const SECTIONS = (i18nT: (key: string) => string) => [
  { id: 'overview', label: i18nT('food.microbiologyLab.str173'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'samples', label: i18nT('food.microbiologyLab.str10'), icon: <BiotechIcon fontSize="small" /> },
  { id: 'analysts', label: i18nT('food.microbiologyLab.str174'), icon: <VerifiedIcon fontSize="small" /> },
  { id: 'analysis', label: i18nT('food.microbiologyLab.str175'), icon: <ScienceIcon fontSize="small" /> },
  { id: 'specs', label: i18nT('food.microbiologyLab.str176'), icon: <FactCheckIcon fontSize="small" /> },
  { id: 'qc', label: i18nT('food.microbiologyLab.str177'), icon: <CheckCircleIcon fontSize="small" /> },
  { id: 'sla', label: i18nT('food.microbiologyLab.str178'), icon: <TimerIcon fontSize="small" /> },
  { id: 'results', label: i18nT('food.microbiologyLab.str179'), icon: <AssignmentTurnedInIcon fontSize="small" /> },
  { id: 'reports', label: i18nT('food.microbiologyLab.str180'), icon: <RemoveRedEyeIcon fontSize="small" /> },
  { id: 'alerts', label: i18nT('food.microbiologyLab.str181'), icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'settings', label: i18nT('food.microbiologyLab.str182'), icon: <BlockIcon fontSize="small" /> },
  { id: 'help', label: i18nT('food.microbiologyLab.str183'), icon: <ErrorOutlineIcon fontSize="small" /> },
];

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

  const { t: i18nT } = useTranslation();

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
  const [, setUsers] = useState<User[]>([]);

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
  }, [refreshDash, refreshWorkload, samples, tests, qcTests, pathoTests]);

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

  const { active, register, scrollTo } = useCommandSections(SECTIONS(i18nT) as unknown as CommandSectionDef[], [nav]);

  const parameterIdFor = (keyword: string) => {
    if (!keyword) return '';
    return parameters.find((p) => `${p.name_ar} ${p.name_en} ${p.code}`.toLowerCase().includes(keyword))?.id ?? '';
  };

  const selectNav = (key: NavKey) => {
    setNav(key);
    if (typeof window !== 'undefined') window.location.hash = key;
    const pathogen = PATHOGEN_LIST(i18nT).find((p) => p.key === key);
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
    if (!assignAnalyst) return notifyError(i18nT('food.microbiologyLab.str1'));
    const id = assignSample.id;
    const testsChanged = assignTests.length !== assignOriginalTests.length ||
      assignTests.some((t) => !assignOriginalTests.includes(t));
    try {
      if (assignAnalyst !== assignSample.analyst) await assignSampleAnalyst(id, assignAnalyst);
      if (assignPriority && assignPriority !== assignSample.priority) await setSamplePriority(id, assignPriority);
      if (testsChanged) await setSampleParameters(id, assignTests);
      notifySuccess(i18nT('food.microbiologyLab.str2'));
      setAssignSample(null);
      refreshAll();
    } catch {
      notifyError(i18nT('food.microbiologyLab.str3'));
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
    const reasonsLabel = NON_COMPLIANCE_REASONS(i18nT)
      .filter((r) => reviewReasons.includes(r.value))
      .map((r) => r.label)
      .join(i18nT('food.microbiologyLab.str198'));
    let notes = reviewNotes;
    if (reviewDecision === 'NON_COMPLIANT' && reasonsLabel) {
      notes = notes ? notes + '\n' : '';
      notes = notes + i18nT('food.microbiologyLab.nonCompliance.notePrefix') + ' ' + reasonsLabel + '.';
    }
    try {
      await reviewSampleTest(reviewTest.id, { decision: reviewDecision, notes });
      notifySuccess(i18nT('food.microbiologyLab.str4'));
      setReviewTest(null);
      refreshAll();
    } catch {
      notifyError(i18nT('food.microbiologyLab.str5'));
    }
  };

  const submitReturn = async () => {
    if (!reviewTest) return;
    if (!returnReason) return notifyError(i18nT('food.microbiologyLab.str6'));
    const label = RETURN_REASONS(i18nT).find((r) => r.value === returnReason)?.label ?? returnReason;
    try {
      await returnSampleTest(reviewTest.id, `${label}${reviewNotes ? ` — ${reviewNotes}` : ''}`);
      notifySuccess(i18nT('food.microbiologyLab.str7'));
      setReviewTest(null);
      refreshAll();
    } catch {
      notifyError(i18nT('food.microbiologyLab.str8'));
    }
  };

  const submitQc = async () => {
    if (!qcTest) return;
    try {
      await markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes });
      notifySuccess(qcStatus === 'PASSED' ? i18nT('food.microbiologyLab.str126') : i18nT('food.microbiologyLab.str127'));
      setQcTest(null);
      setQcNotes('');
      refreshAll();
    } catch {
      notifyError(i18nT('food.microbiologyLab.str9'));
    }
  };

  const toggleReviewReason = (value: string) =>
    setReviewReasons((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  /* ---------- أعمدة الجداول ---------- */

  const sampleColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.microbiologyLab.str64'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.microbiologyLab.str65'), noWrap: false },
    { key: 'source_name', label: i18nT('food.microbiologyLab.str66'), render: (s) => s.source_name ?? '—' },
    { key: 'priority', label: i18nT('food.microbiologyLab.str58'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: i18nT('food.microbiologyLab.str67'), render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'analyst_name', label: i18nT('food.microbiologyLab.str57'), render: (s) => s.analyst_name ?? '—' },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => setDetailId(s.id)}>{i18nT('food.microbiologyLab.button.open')}</AppButton>
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => openAssign(s)}>{i18nT('food.microbiologyLab.button.assign')}</AppButton>
          )}
        </Stack>
      ),
    },
  ], [isSectionHead, isManager, i18nT]);

  const testColumns: DataTableColumn<SampleTest>[] = useMemo(() => [
    { key: 'parameter', label: i18nT('food.microbiologyLab.str68'), noWrap: false, render: (t) => <b>{t.parameter.name_ar}</b> },
    { key: 'status', label: i18nT('food.microbiologyLab.str67'), render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'result', label: i18nT('food.microbiologyLab.str69'), render: (t) => (
      t.unit_results.length
        ? i18nT('food.microbiologyLab.units.count', { count: t.unit_results.length })
        : (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—')
    ) },
    { key: 'decision', label: i18nT('food.microbiologyLab.str70'), render: (t) => <StatusChip label={labDecision[t.decision]?.label ?? t.decision} tone={labDecision[t.decision]?.tone} /> },
    { key: 'evaluation', label: i18nT('food.microbiologyLab.str71'), render: (t) => (
      t.evaluation ? <StatusChip label={labDecision[t.evaluation]?.label ?? t.evaluation} tone={labDecision[t.evaluation]?.tone} /> : '—'
    ) },
    { key: 'qc_status', label: 'QC', render: (t) => <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} /> },
    { key: 'sla', label: 'SLA', render: (t) => (t.sla?.status ? <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} /> : '—') },
    {
      key: 'actions', label: '', render: (t) => (
        <Stack direction="row" spacing={0.5}>
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => openReview(t)}>{i18nT('food.microbiologyLab.button.review')}</AppButton>
          )}
          {(isSectionHead || isManager) && (
            <AppButton size="small" variant="secondary" onClick={() => { setQcTest(t); setQcStatus('PASSED'); setQcNotes(''); }}>QC</AppButton>
          )}
        </Stack>
      ),
    },
  ], [isSectionHead, isManager, i18nT]);

  const workloadColumns: DataTableColumn<WorkloadItem>[] = useMemo(() => [
    { key: 'full_name', label: i18nT('food.microbiologyLab.str57'), render: (w) => <b>{w.full_name}</b> },
    { key: 'in_progress', label: i18nT('food.microbiologyLab.str72') },
    { key: 'draft', label: i18nT('food.microbiologyLab.str73') },
    { key: 'review', label: i18nT('food.microbiologyLab.str14') },
    { key: 'overdue', label: i18nT('food.microbiologyLab.str74'), render: (w) => (w.overdue > 0 ? <Box component="b" sx={{ color: 'error.main' }}>{w.overdue}</Box> : '0') },
    { key: 'completed', label: i18nT('food.microbiologyLab.str75') },
    { key: 'total', label: i18nT('food.microbiologyLab.str76') },
    { key: 'load', label: i18nT('food.microbiologyLab.str77'), render: (w) => <StatusChip label={LOAD_LEVEL(i18nT)[w.load_level]?.label ?? w.load_level} tone={LOAD_LEVEL(i18nT)[w.load_level]?.tone} /> },
  ], [i18nT]);

  const analystRows = useMemo<AnalystRow[]>(
    () => analysts.map((u) => ({ user: u, workload: workload.find((w) => w.id === u.id) })),
    [analysts, workload],
  );

  const analystColumns: DataTableColumn<AnalystRow>[] = useMemo(() => [
    { key: 'full_name', label: i18nT('food.microbiologyLab.str57'), render: (r) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontWeight: 700, fontSize: 13 }}>
          {(r.user.full_name || r.user.email || i18nT('food.microbiologyLab.str202')).charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{r.user.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">{r.user.email}</Typography>
        </Box>
      </Stack>
    ) },
    { key: 'active', label: i18nT('food.microbiologyLab.str67'), render: (r) => (
      <StatusChip label={r.user.is_active ? i18nT('food.microbiologyLab.str128') : i18nT('food.microbiologyLab.str129')} tone={r.user.is_active ? 'success' : 'neutral'} />
    ) },
    { key: 'in_progress', label: i18nT('food.microbiologyLab.str72'), render: (r) => r.workload?.in_progress ?? 0 },
    { key: 'review', label: i18nT('food.microbiologyLab.str14'), render: (r) => r.workload?.review ?? 0 },
    { key: 'overdue', label: i18nT('food.microbiologyLab.str74'), render: (r) => (
      r.workload && r.workload.overdue > 0 ? <Box component="b" sx={{ color: 'error.main' }}>{r.workload.overdue}</Box> : '0'
    ) },
    { key: 'total', label: i18nT('food.microbiologyLab.str76'), render: (r) => r.workload?.total ?? 0 },
    { key: 'load', label: i18nT('food.microbiologyLab.str77'), render: (r) => (
      r.workload
        ? <StatusChip label={LOAD_LEVEL(i18nT)[r.workload.load_level]?.label ?? r.workload.load_level} tone={LOAD_LEVEL(i18nT)[r.workload.load_level]?.tone} />
        : '—'
    ) },
  ], [i18nT]);

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
    if (dash.overdue_tests > 0) list.push({ severity: 'error', text: i18nT('food.microbiologyLab.alerts.overdueSla', { count: dash.overdue_tests }), nav: 'sla' });
    if (dash.urgent > 0) list.push({ severity: 'error', text: i18nT('food.microbiologyLab.alerts.urgentTests', { count: dash.urgent }), nav: 'samples.inprogress' });
    if (dash.submitted > 0) list.push({ severity: 'warning', text: i18nT('food.microbiologyLab.alerts.submittedResults', { count: dash.submitted }), nav: 'results' });
    if (dash.reviewed > 0) list.push({ severity: 'warning', text: i18nT('food.microbiologyLab.alerts.reviewedResults', { count: dash.reviewed }) });
    if (dash.at_risk_tests > 0) list.push({ severity: 'warning', text: i18nT('food.microbiologyLab.alerts.atRiskTests', { count: dash.at_risk_tests }), nav: 'sla' });
    if (dash.qc_pending > 0) list.push({ severity: 'info', text: i18nT('food.microbiologyLab.alerts.qcPending', { count: dash.qc_pending }), nav: 'qc' });
    if (dash.qc_failed > 0) list.push({ severity: 'error', text: i18nT('food.microbiologyLab.alerts.qcFailed', { count: dash.qc_failed }), nav: 'qc' });
    if (dash.non_compliant > 0) list.push({ severity: 'warning', text: i18nT('food.microbiologyLab.alerts.nonCompliant', { count: dash.non_compliant }), nav: 'results' });
    if (list.length === 0) list.push({ severity: 'success', text: i18nT('food.microbiologyLab.alerts.noAlerts') });
    return list;
  }, [dash, i18nT]);

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

  const pathogenLabel = PATHOGEN_LIST(i18nT).find((p) => p.key === nav)?.label ?? i18nT('food.microbiologyLab.str130');


  return (
    <Box>
      <DashboardHero
        eyebrow="Microbiology Lab"
        title={i18nT('food.microbiologyLab.str33')}
        subtitle={i18nT('food.microbiologyLab.str34')}
        gradient="emerald"
        avatarLabel={(user?.full_name || i18nT('food.microbiologyLab.str131')).slice(0, 1)}
        action={
          <Stack direction="row" spacing={1}>
            <Chip icon={<GroupsIcon />} label={dash ? i18nT('food.microbiologyLab.chips.analysts', { count: dash.analysts_count }) : '—'} size="small" variant="outlined" />
            <Chip icon={<ScienceIcon />} label={dash ? i18nT('food.microbiologyLab.chips.specs', { count: dash.specs_active }) : '—'} size="small" variant="outlined" />
            <AppButton startIcon={<NotificationsActiveIcon />} variant="secondary" onClick={() => selectNav('alerts')}>
              {i18nT('food.microbiologyLab.button.alerts')} {alerts.length > 0 ? `(${alerts.length})` : ''}
            </AppButton>
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {i18nT('food.microbiologyLab.liveStatus')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS(i18nT) as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={handleSectionNav}
            accent="primary.main"
            label={i18nT('food.microbiologyLab.str56')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box>
        {nav === 'home' && (
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <>
                {statGroup(i18nT('food.microbiologyLab.str215'), [
                  stat(i18nT('food.microbiologyLab.str10'), dash?.total_samples ?? '—', <BiotechIcon />),
                  stat(i18nT('food.microbiologyLab.str11'), dash?.today_tests ?? '—', <TimerIcon />),
                  stat(i18nT('food.microbiologyLab.str12'), dash?.under_testing ?? '—', <AssignmentTurnedInIcon />),
                  stat(i18nT('food.microbiologyLab.str13'), dash?.completed ?? '—', <CheckCircleIcon />),
                ])}
                {statGroup(i18nT('food.microbiologyLab.str216'), [
                  stat(i18nT('food.microbiologyLab.str14'), dash?.submitted ?? '—', <RemoveRedEyeIcon />),
                  stat(i18nT('food.microbiologyLab.str15'), dash?.reviewed ?? '—', <VerifiedIcon />),
                  stat(i18nT('food.microbiologyLab.str16'), dash?.ready_for_approval ?? '—', <FactCheckIcon />),
                  stat(i18nT('food.microbiologyLab.str17'), dash?.approved ?? '—', <CheckCircleIcon />),
                  stat(i18nT('food.microbiologyLab.str18'), dash?.qc_pending ?? '—', <FactCheckIcon />),
                  stat(i18nT('food.microbiologyLab.str19'), dash?.qc_failed ?? '—', <ErrorOutlineIcon />),
                ])}
                {statGroup(i18nT('food.microbiologyLab.str217'), [
                  stat(i18nT('food.microbiologyLab.str20'), dash?.non_compliant ?? '—', <ErrorOutlineIcon />),
                  stat(i18nT('food.microbiologyLab.str21'), dash?.overdue_tests ?? '—', <WarningAmberIcon />),
                  stat(i18nT('food.microbiologyLab.str22'), dash?.at_risk_tests ?? '—', <TimerIcon />),
                  stat(i18nT('food.microbiologyLab.str23'), dash?.avg_tat_hours != null ? i18nT('food.microbiologyLab.units.hours', { hours: dash.avg_tat_hours }) : '—', <TimerIcon />),
                  stat(i18nT('food.microbiologyLab.str24'), dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />),
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
                      title={i18nT('food.microbiologyLab.str35')}
                      onRefresh={refreshWorkload}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="h6" sx={{ mb: 1.5 }}>{i18nT('food.microbiologyLab.dashboard.summaryTitle')}</Typography>
                      <Stack spacing={1}>
                        <Alert severity="info">{i18nT('food.microbiologyLab.alerts.pendingResults')}: {dash?.pending_results ?? 0}</Alert>
                        <Alert severity="warning">{i18nT('food.microbiologyLab.alerts.evaluatedTests')}: {dash?.evaluated_tests ?? 0}</Alert>
                        <Alert severity="success">{i18nT('food.microbiologyLab.sla.complianceRate')}: {dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}% (${dash.sla_compliance.on_time}/${dash.sla_compliance.count})` : i18nT('food.microbiologyLab.sla.noData')}</Alert>
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
                      {stat(i18nT('food.microbiologyLab.str25'), dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                      {stat(i18nT('food.microbiologyLab.str26'), dash?.at_risk_tests ?? '—', <TimerIcon />)}
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
                      title={i18nT('food.microbiologyLab.str36')}
                      subtitle={i18nT('food.microbiologyLab.str37')}
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
                    title={SAMPLES_NAV_TITLES(i18nT)[nav]}
                    subtitle={i18nT('food.microbiologyLab.str38')}
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
                title={i18nT('food.microbiologyLab.str39')}
                subtitle={i18nT('food.microbiologyLab.str40')}
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
                title={i18nT('food.microbiologyLab.str41')}
                subtitle={i18nT('food.microbiologyLab.str42')}
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
                title={i18nT('food.microbiologyLab.analysis.pathogenTests', { label: pathogenLabel })}
                subtitle={i18nT('food.microbiologyLab.str43')}
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
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{i18nT('food.microbiologyLab.specs.reference')}: {s.reference}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {i18nT('food.microbiologyLab.specs.currentVersion')}:
                        {s.current_version ? i18nT('food.microbiologyLab.specs.versionInfo', { version: s.current_version.version, date: formatDate(s.current_version.effective_from ?? '') }) : '—'}
                      </Typography>
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>{i18nT('food.microbiologyLab.table.organism')}</TableCell>
                            <TableCell align="center">n</TableCell>
                            <TableCell align="center">c</TableCell>
                            <TableCell align="center">m</TableCell>
                            <TableCell align="center">M</TableCell>
                            <TableCell>{i18nT('food.microbiologyLab.table.plan')}</TableCell>
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
                            <TableRow><TableCell colSpan={6} align="center">{i18nT('food.microbiologyLab.empty.noActiveLimits')}</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {i18nT('food.microbiologyLab.specs.versionsNote', { count: s.versions.length })}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
                {specs.length === 0 && (
                  <Grid item xs={12}><Typography variant="body2" color="text.secondary">{i18nT('food.microbiologyLab.empty.noSpecs')}</Typography></Grid>
                )}
              </Grid>
              </Box>
            )}

            {nav === 'qc' && (
              <Box component="section" ref={register('qc')} data-section="qc" sx={{ scrollMarginTop: '80px' }}>
              <>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {stat(i18nT('food.microbiologyLab.str27'), dash?.qc_pending ?? '—', <FactCheckIcon />)}
                  {stat(i18nT('food.microbiologyLab.str19'), dash?.qc_failed ?? '—', <ErrorOutlineIcon />)}
                  {stat(i18nT('food.microbiologyLab.str28'), qcTests.count ?? '—', <FactCheckIcon />)}
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
                  title={i18nT('food.microbiologyLab.str44')}
                  subtitle={i18nT('food.microbiologyLab.str45')}
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
                  {stat(i18nT('food.microbiologyLab.str24'), dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />)}
                  {stat(i18nT('food.microbiologyLab.str29'), dash?.sla_compliance?.on_time ?? '—', <CheckCircleIcon />)}
                  {stat(i18nT('food.microbiologyLab.str30'), dash?.sla_compliance?.count ?? '—', <TimerIcon />)}
                  {stat(i18nT('food.microbiologyLab.str31'), dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                  {stat(i18nT('food.microbiologyLab.str22'), dash?.at_risk_tests ?? '—', <TimerIcon />)}
                </Grid>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{i18nT('food.microbiologyLab.sla.complianceRate')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }}>
                      {slaPct}%
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 10, borderRadius: 10, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ width: `${slaPct}%`, height: '100%', borderRadius: 10, bgcolor: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {dash?.sla_compliance?.count != null
                      ? i18nT('food.microbiologyLab.sla.completedWithin', { onTime: dash.sla_compliance.on_time, count: dash.sla_compliance.count })
                      : i18nT('food.microbiologyLab.str135')}
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
                  title={i18nT('food.microbiologyLab.str46')}
                  subtitle={i18nT('food.microbiologyLab.str47')}
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
                title={i18nT('food.microbiologyLab.str48')}
                subtitle={i18nT('food.microbiologyLab.str49')}
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
                  {stat(i18nT('food.microbiologyLab.str10'), dash?.total_samples ?? '—', <BiotechIcon />)}
                  {stat(i18nT('food.microbiologyLab.str12'), dash?.under_testing ?? '—', <AssignmentTurnedInIcon />)}
                  {stat(i18nT('food.microbiologyLab.str14'), dash?.submitted ?? '—', <RemoveRedEyeIcon />)}
                  {stat(i18nT('food.microbiologyLab.str13'), dash?.completed ?? '—', <CheckCircleIcon />)}
                  {stat(i18nT('food.microbiologyLab.str20'), dash?.non_compliant ?? '—', <ErrorOutlineIcon />)}
                  {stat(i18nT('food.microbiologyLab.str32'), dash?.evaluated_tests ?? '—', <FactCheckIcon />)}
                  {stat(i18nT('food.microbiologyLab.str21'), dash?.overdue_tests ?? '—', <WarningAmberIcon />)}
                  {stat(i18nT('food.microbiologyLab.str19'), dash?.qc_failed ?? '—', <ErrorOutlineIcon />)}
                  {stat(i18nT('food.microbiologyLab.str23'), dash?.avg_tat_hours != null ? i18nT('food.microbiologyLab.units.hours', { hours: dash.avg_tat_hours }) : '—', <TimerIcon />)}
                  {stat(i18nT('food.microbiologyLab.str24'), dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />)}
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
                      title={i18nT('food.microbiologyLab.str50')}
                      onRefresh={refreshWorkload}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="h6" sx={{ mb: 1.5 }}>{i18nT('food.microbiologyLab.reports.summaryTitle')}</Typography>
                      <Stack spacing={1}>
                        <Alert severity="info">{i18nT('food.microbiologyLab.alerts.pendingResults')}: {dash?.pending_results ?? 0}</Alert>
                        <Alert severity="warning">{i18nT('food.microbiologyLab.alerts.nonCompliantNotify')}: {dash?.non_compliant ?? 0}</Alert>
                        <Alert severity="success">{i18nT('food.microbiologyLab.alerts.activeSpecs')}: {dash?.specs_active ?? 0}</Alert>
                        <Alert severity="info">{i18nT('food.microbiologyLab.alerts.activeAnalysts')}: {dash?.analysts_count ?? 0}</Alert>
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
                      {a.nav && <AppButton size="small" variant="secondary" onClick={() => selectNav(a.nav!)}>{i18nT('food.microbiologyLab.button.open')}</AppButton>}
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
                    <Typography variant="h6" sx={{ mb: 1.5 }}>{i18nT('food.microbiologyLab.settings.allowedTitle')}</Typography>
                    <Stack spacing={1}>
                      {SETTINGS_ALLOWED(i18nT).map((s) => (
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
                    <Typography variant="h6" sx={{ mb: 1.5 }}>{i18nT('food.microbiologyLab.settings.blockedTitle')}</Typography>
                    <Stack spacing={1}>
                      {SETTINGS_BLOCKED(i18nT).map((s) => (
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
                <Typography variant="h6" sx={{ mb: 2 }}>{i18nT('food.microbiologyLab.help.title')}</Typography>
                <Grid container spacing={2}>
                  {HELP_STEPS(i18nT).map((s) => (
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

      <FormDialog open={Boolean(assignSample)} onClose={() => setAssignSample(null)} onSubmit={submitAssign} title={i18nT('food.microbiologyLab.str51')} subtitle={i18nT('food.microbiologyLab.str52')} maxWidth="sm" submitLabel={i18nT('food.microbiologyLab.str260')}>
        {assignSample && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {assignSample.sample_number} — {assignSample.sample_type}
            </Typography>
            <FormSelect
              label={i18nT('food.microbiologyLab.str57')}
              value={assignAnalyst}
              onChange={setAssignAnalyst}
              options={analysts.map((u) => ({ value: u.id, label: u.full_name }))}
            />
            <FormSelect
              label={i18nT('food.microbiologyLab.str58')}
              value={assignPriority}
              onChange={setAssignPriority}
              options={Object.entries(labPriority).map(([v, m]) => ({ value: v, label: m.label }))}
            />
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>{i18nT('food.microbiologyLab.assign.testsLabel')}</Typography>
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
              <Typography variant="body2" color="text.secondary">{i18nT('food.microbiologyLab.empty.noParameters')}</Typography>
            )}
          </>
        )}
      </FormDialog>

      <FormDialog open={Boolean(reviewTest)} onClose={() => setReviewTest(null)} onSubmit={reviewMode === 'approve' ? submitReviewApprove : submitReturn} title={i18nT('food.microbiologyLab.str53')} subtitle={i18nT('food.microbiologyLab.str54')} maxWidth="md" submitLabel={reviewMode === 'approve' ? i18nT('food.microbiologyLab.str144') : i18nT('food.microbiologyLab.str145')}>
        {reviewTest && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{reviewTest.parameter.name_ar}</Typography>
              <StatusChip label={labTestStatus[reviewTest.status]?.label ?? reviewTest.status} tone={labTestStatus[reviewTest.status]?.tone} />
              <StatusChip label={labDecision[reviewTest.decision]?.label ?? reviewTest.decision} tone={labDecision[reviewTest.decision]?.tone} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {i18nT('food.microbiologyLab.result.label')}: {reviewTest.unit_results.length
                ? i18nT('food.microbiologyLab.units.single', { count: reviewTest.unit_results.length })
                : (reviewTest.result_value != null ? `${reviewTest.result_value} ${reviewTest.unit}` : reviewTest.result_text || '—')}
              {' '}{i18nT('food.microbiologyLab.review.specification')}: {reviewLimits?.spec_version?.spec_name} {reviewLimits?.spec_version?.label}
              {reviewTest.evaluated_at ? i18nT('food.microbiologyLab.result.evaluatedAt', { date: formatDateTime(reviewTest.evaluated_at) }) : ''}
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
                {i18nT('food.microbiologyLab.review.autoEvaluation', { evaluation: reviewTest.evaluation ?? '—' })}: {reviewTest.evaluation_reason}
              </Alert>
            )}
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{i18nT('food.microbiologyLab.review.limitsLabel')}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{i18nT('food.microbiologyLab.table.organism')}</TableCell>
                  <TableCell align="center">n</TableCell>
                  <TableCell align="center">c</TableCell>
                  <TableCell align="center">m</TableCell>
                  <TableCell align="center">M</TableCell>
                  <TableCell>{i18nT('food.microbiologyLab.table.plan')}</TableCell>
                  <TableCell>{i18nT('food.microbiologyLab.table.unit')}</TableCell>
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
                  <TableRow><TableCell colSpan={7} align="center">{i18nT('food.microbiologyLab.empty.noLimits')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {reviewLimits?.spec_version?.label && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {i18nT('food.microbiologyLab.review.specification')}: {reviewLimits.spec_version.spec_name} {reviewLimits.spec_version.label}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{i18nT('food.microbiologyLab.review.actionLabel')}</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <AppButton variant={reviewMode === 'approve' ? 'primary' : 'secondary'} onClick={() => setReviewMode('approve')}>
                {i18nT('food.microbiologyLab.review.approveButton')}
              </AppButton>
              <AppButton variant={reviewMode === 'return' ? 'primary' : 'secondary'} onClick={() => setReviewMode('return')}>
                {i18nT('food.microbiologyLab.review.returnButton')}
              </AppButton>
            </Stack>
            {reviewMode === 'approve' ? (
              <>
                <FormSelect
                  label={i18nT('food.microbiologyLab.str59')}
                  value={reviewDecision}
                  onChange={setReviewDecision}
                  options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))}
                />
                {reviewDecision === 'NON_COMPLIANT' && (
                  <Box sx={{ p: 1.5, mt: 1, borderRadius: 2, border: '1px solid', borderColor: 'error.main', bgcolor: 'rgba(198,58,58,0.08)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
                      {i18nT('food.microbiologyLab.review.nonComplianceReasons')}
                    </Typography>
                    {NON_COMPLIANCE_REASONS(i18nT).map((r) => {
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
                      {i18nT('food.microbiologyLab.review.nonComplianceNote')}
                    </Alert>
                  </Box>
                )}
              </>
            ) : (
              <FormSelect
                label={i18nT('food.microbiologyLab.str60')}
                value={returnReason}
                onChange={setReturnReason}
                options={RETURN_REASONS(i18nT).map((r) => ({ value: r.value, label: r.label }))}
              />
            )}
            <FormTextField label={i18nT('food.microbiologyLab.str61')} multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      <FormDialog open={Boolean(qcTest)} onClose={() => setQcTest(null)} onSubmit={submitQc} title={i18nT('food.microbiologyLab.str55')} subtitle={i18nT('food.microbiologyLab.str45')} maxWidth="xs" submitLabel={i18nT('food.microbiologyLab.str261')}>
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{qcTest?.parameter?.name_ar}</Typography>
            <FormSelect
              label={i18nT('food.microbiologyLab.str62')}
              value={qcStatus}
              onChange={setQcStatus}
              options={Object.entries(labQc).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))}
            />
            <FormTextField label={i18nT('food.microbiologyLab.str63')} multiline minRows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </>
        )
      </FormDialog>
    </Box>
  );
};

export default MicrobiologyLabPage;
