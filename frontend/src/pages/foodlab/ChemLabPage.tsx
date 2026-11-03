import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BugReportIcon from '@mui/icons-material/BugReport';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SendIcon from '@mui/icons-material/Send';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TodayIcon from '@mui/icons-material/Today';
import UndoIcon from '@mui/icons-material/Undo';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BuildIcon from '@mui/icons-material/Build';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { logout as logoutApi } from '../../api/endpoints/auth';
import type { AppDispatch } from '../../store/store';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
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
import { useServerTable } from '../../hooks/useServerTable';
import {
  getLabEquipment,
  getLabParameters,
  getLabSample,
  getLabSampleTests,
  getLabSamples,
  enterSampleTestResult,
  saveSampleTestResult,
  startSampleTest,
  markSampleTestQC,
} from '../../api/endpoints/foodlab';
import { getUsers } from '../../api/endpoints/users';
import type {
  FoodSample,
  LabEquipment,
  LabParameter,
  SampleTest,
} from '../../types/food';
import type { User } from '../../types/user';
import { labDecision, labEquipmentStatus, labPriority, labQc, labSampleStatus, labSla, labTestStatus } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { SampleDetailDialog } from './FoodLabPage';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const RETURN_MARKER = /\u005B\u0625\u0639\u0627\u062F\u0629/;

type NavKey =
  | 'home'
  | 'samples.new' | 'samples.progress' | 'samples.review' | 'samples.returned' | 'samples.completed'
  | 'analysis.tests' | 'analysis.queue' | 'analysis.history'
  | 'qc.tasks' | 'qc.results'
  | 'equipment' | 'reagents' | 'specs' | 'sla' | 'results' | 'alerts' | 'settings' | 'help' | 'reports';

interface NavLeaf { key: NavKey; label: string; }
interface NavGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: NavLeaf[];
}

interface AnalystTestRow extends SampleTest {
  sampleNumber?: string;
  sampleType?: string;
  priority?: string;
  collectionStatus?: string;
}

const ChemistryAnalystPage = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');
  const todayArabic = () => new Date().toLocaleDateString(isArabic ? 'ar' : 'en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayLabel = isArabic ? todayArabic() : new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const ANALYST_TEST_GROUPS: Record<string, (ts: SampleTest) => boolean> = useMemo(() => ({
    'samples.new': (ts) => ts.status === 'PENDING',
    'samples.progress': (ts) => ts.status === 'IN_PROGRESS' || (ts.status === 'DRAFT' && !RETURN_MARKER.test(ts.notes || '')),
    'samples.review': (ts) => ts.status === 'SUBMITTED' || ts.status === 'REVIEWED',
    'samples.returned': (ts) => ts.status === 'DRAFT' && RETURN_MARKER.test(ts.notes || ''),
    'samples.completed': (ts) => ts.status === 'APPROVED' || ts.status === 'COMPLETED',
  }), []);

  // nav titles available via navTitles.samples.* keys if needed

  const SIDEBAR_GROUPS: NavGroup[] = useMemo(() => [
    { key: 'home', label: t('food.chemLab.sidebar.home.label'), icon: <DashboardIcon />, children: [{ key: 'home', label: t('food.chemLab.sidebar.home.children.0.label') }] },
    {
      key: 'samples', label: t('food.chemLab.sidebar.samples.label'), icon: <BiotechIcon />, children: [
        { key: 'samples.new', label: t('food.chemLab.sidebar.samples.children.0.label') },
        { key: 'samples.progress', label: t('food.chemLab.sidebar.samples.children.1.label') },
        { key: 'samples.review', label: t('food.chemLab.sidebar.samples.children.2.label') },
        { key: 'samples.returned', label: t('food.chemLab.sidebar.samples.children.3.label') },
        { key: 'samples.completed', label: t('food.chemLab.sidebar.samples.children.4.label') },
      ],
    },
    {
      key: 'analysis', label: t('food.chemLab.sidebar.analysis.label'), icon: <ScienceIcon />, children: [
        { key: 'analysis.tests', label: t('food.chemLab.sidebar.analysis.children.0.label') },
        { key: 'analysis.queue', label: t('food.chemLab.sidebar.analysis.children.1.label') },
        { key: 'analysis.history', label: t('food.chemLab.sidebar.analysis.children.2.label') },
      ],
    },
    {
      key: 'qc', label: t('food.chemLab.sidebar.qc.label'), icon: <FactCheckIcon />, children: [
        { key: 'qc.tasks', label: t('food.chemLab.sidebar.qc.children.0.label') },
        { key: 'qc.results', label: t('food.chemLab.sidebar.qc.children.1.label') },
      ],
    },
    { key: 'equipment', label: t('food.chemLab.sidebar.equipment.label'), icon: <BuildIcon />, children: [{ key: 'equipment', label: t('food.chemLab.sidebar.equipment.children.0.label') }] },
    { key: 'reagents', label: t('food.chemLab.sidebar.reagents.label'), icon: <Inventory2Icon />, children: [{ key: 'reagents', label: t('food.chemLab.sidebar.reagents.children.0.label') }] },
    { key: 'specs', label: t('food.chemLab.sidebar.specs.label'), icon: <VerifiedIcon />, children: [{ key: 'specs', label: t('food.chemLab.sidebar.specs.children.0.label') }] },
    { key: 'sla', label: t('food.chemLab.sidebar.sla.label'), icon: <TimerIcon />, children: [{ key: 'sla', label: t('food.chemLab.sidebar.sla.children.0.label') }] },
    { key: 'results', label: t('food.chemLab.sidebar.results.label'), icon: <AssignmentTurnedInIcon />, children: [{ key: 'results', label: t('food.chemLab.sidebar.results.children.0.label') }] },
    { key: 'alerts', label: t('food.chemLab.sidebar.alerts.label'), icon: <NotificationsActiveIcon />, children: [{ key: 'alerts', label: t('food.chemLab.sidebar.alerts.label') }] },
  ], [t]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map((g) => [g.key, true])),
  );

  const FOOTER_NAV_ITEMS: NavLeaf[] = useMemo(() => [
    { key: 'settings', label: t('food.chemLab.footer.settings.label') },
    { key: 'help', label: t('food.chemLab.footer.help.label') },
  ], [t]);

  const groupOf = useCallback((key: NavKey): NavGroup | undefined => SIDEBAR_GROUPS.find((g) => g.children.some((c) => c.key === key)), [SIDEBAR_GROUPS]);

  const SETTINGS_ALLOWED = useMemo(() => [
    { label: t('food.chemLab.settings.allowed.0') },
    { label: t('food.chemLab.settings.allowed.1') },
    { label: t('food.chemLab.settings.allowed.2') },
    { label: t('food.chemLab.settings.allowed.3') },
    { label: t('food.chemLab.settings.allowed.4') },
  ], [t]);

  const SETTINGS_BLOCKED = useMemo(() => [
    { label: t('food.chemLab.settings.blocked.0') },
    { label: t('food.chemLab.settings.blocked.1') },
    { label: t('food.chemLab.settings.blocked.2') },
    { label: t('food.chemLab.settings.blocked.3') },
    { label: t('food.chemLab.settings.blocked.4') },
  ], [t]);

  const HELP_STEPS = useMemo(() => [
    { title: t('food.chemLab.help.steps.0.title'), text: t('food.chemLab.help.steps.0.text') },
    { title: t('food.chemLab.help.steps.1.title'), text: t('food.chemLab.help.steps.1.text') },
    { title: t('food.chemLab.help.steps.2.title'), text: t('food.chemLab.help.steps.2.text') },
    { title: t('food.chemLab.help.steps.3.title'), text: t('food.chemLab.help.steps.3.text') },
    { title: t('food.chemLab.help.steps.4.title'), text: t('food.chemLab.help.steps.4.text') },
  ], [t]);

  const SECTIONS = useMemo(() => [
    { id: 'overview', label: t('food.chemLab.sections.overview.label'), icon: <DashboardIcon fontSize="small" /> },
    { id: 'samples', label: t('food.chemLab.sections.samples.label'), icon: <BiotechIcon fontSize="small" /> },
    { id: 'analysis', label: t('food.chemLab.sections.analysis.label'), icon: <ScienceIcon fontSize="small" /> },
    { id: 'qc', label: t('food.chemLab.sections.qc.label'), icon: <FactCheckIcon fontSize="small" /> },
    { id: 'equipment', label: t('food.chemLab.sections.equipment.label'), icon: <BuildIcon fontSize="small" /> },
    { id: 'results', label: t('food.chemLab.sections.results.label'), icon: <AssignmentTurnedInIcon fontSize="small" /> },
    { id: 'alerts', label: t('food.chemLab.sections.alerts.label'), icon: <NotificationsActiveIcon fontSize="small" /> },
  ] as const, [t]);

  const SECTION_NAV_MAP: Record<string, NavKey> = useMemo(() => ({
    overview: 'home',
    samples: 'samples.new',
    analysis: 'analysis.tests',
    qc: 'qc.tasks',
    equipment: 'equipment',
    results: 'results',
    alerts: 'alerts',
  }), []);

  const NAV_SECTION_MAP: Record<string, string> = useMemo(() => Object.fromEntries(
    Object.entries(SECTION_NAV_MAP).map(([s, n]) => [n, s]),
  ), [SECTION_NAV_MAP]);

  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const [nav, setNav] = useState<NavKey>('home');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);

  const [startTest, setStartTest] = useState<AnalystTestRow | null>(null);
  const [resultTest, setResultTest] = useState<AnalystTestRow | null>(null);
  const [qcTest, setQcTest] = useState<AnalystTestRow | null>(null);

  /* نموذج التنفيذ */
  const [exEquip, setExEquip] = useState('');
  const [exLot, setExLot] = useState('');
  const [exExpiry, setExExpiry] = useState('');
  const [exQuantityUsed, setExQuantityUsed] = useState('');
  const [exResultType, setExResultType] = useState('numeric');
  const [exValue, setExValue] = useState('');
  const [exQual, setExQual] = useState('Negative');
  const [exMin, setExMin] = useState('');
  const [exMax, setExMax] = useState('');
  const [exNotes, setExNotes] = useState('');

  const [qcStatus, setQcStatus] = useState('PASSED');
  const [qcNotes, setQcNotes] = useState('');

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples, initialPageSize: 100 });
  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests, initialPageSize: 100 });

  const loading = samples.loading || tests.loading;

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    samples.setFilter('bench', 'CHEMISTRY');
    samples.setFilter('ordering', '-created_at');
    tests.setFilter('bench', 'CHEMISTRY');
    tests.setFilter('ordering', '-created_at');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshEquipment = useCallback(() => {
    getLabEquipment({ bench: 'CHEMISTRY', page_size: 100 })
      .then((r) => setEquipment(r.data.data.results))
      .catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    samples.refresh();
    tests.refresh();
    refreshEquipment();
  }, [samples.refresh, tests.refresh, refreshEquipment]);

  useEffect(() => {
    getLabParameters({ bench: 'CHEMISTRY', page_size: 100 })
      .then((r) => setParameters(r.data.data.results))
      .catch(() => undefined);
    refreshAll();
  }, [refreshAll]);

  /* خريطة العينة (رقم العينة/المنتج) من جدول العينات لأغراض العرض */
  const sampleById = useMemo(() => {
    const map = new Map<string, FoodSample>();
    for (const s of samples.rows) map.set(s.id, s);
    return map;
  }, [samples.rows]);

  const myTests = useMemo<AnalystTestRow[]>(() => {
    const rows = tests.rows.filter((t) => t.assigned_to === userId);
    return rows.map((t) => {
      const s = sampleById.get(t.sample);
      return {
        ...t,
        sampleNumber: s?.sample_number,
        sampleType: s?.sample_type,
        priority: s?.priority,
        collectionStatus: s?.collection_status,
      };
    });
  }, [tests.rows, sampleById, userId]);

  const countBy = (pred: (t: SampleTest) => boolean) => myTests.filter(pred).length;
  const countStatus = (statuses: string[]) => myTests.filter((t) => statuses.includes(t.status)).length;

  const kpi = useMemo(() => {
    const c = (st: string[]) => countStatus(st);
    return {
      newTests: c(['PENDING']),
      inProgress: c(['IN_PROGRESS', 'DRAFT']),
      submitted: c(['SUBMITTED', 'REVIEWED']),
      overdue: myTests.filter((t) => t.sla?.status === 'DELAYED').length,
      completed: c(['APPROVED', 'COMPLETED']),
      qcRequired: myTests.filter((t) => t.qc_status === 'PENDING' && (t.status === 'SUBMITTED' || t.status === 'IN_PROGRESS' || t.status === 'DRAFT')).length,
      urgent: myTests.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length,
      dueToday: myTests.filter((t) => {
        const due = t.sla?.due_at;
        if (!due) return false;
        return due.slice(0, 10) === new Date().toISOString().slice(0, 10) && t.sla.status !== 'COMPLETED';
      }).length,
      returned: myTests.filter((t) => t.status === 'DRAFT' && RETURN_MARKER.test(t.notes || '')).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTests]);

  const specActive = useMemo(() => {
    const map = new Map<string, LabParameter>();
    for (const p of parameters) map.set(p.id, p);
    return map;
  }, [parameters]);

  const parseLimit = (ref?: string): number | null => {
    if (!ref) return null;
    const m = String(ref).replace(/[<>≤≥=]/g, ' ').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  const evaluateNumeric = (value: number | null | undefined, ref?: string) => {
    const limit = parseLimit(ref);
    if (value == null || limit == null) return null;
    return value <= limit ? 'COMPLIANT' : 'NON_COMPLIANT';
  };

  const readiness = (tr: AnalystTestRow) => {
    const reasons: string[] = [];
    const sample = sampleById.get(tr.sample);
    if (!sample) reasons.push(t('food.chemLab.readiness.noSampleData'));
    else if (sample.status === 'REJECTED') reasons.push(t('food.chemLab.readiness.sampleRejected'));
    const paid = sample?.collection_status === 'PAID' || (sample?.lab_invoice && sample.lab_invoice.status === 'PAID') || Number(sample?.fee_amount ?? 0) === 0;
    if (sample && !paid) reasons.push(t('food.chemLab.readiness.paymentRequired'));
    const method = tr.parameter.method || tr.method_used;
    if (!method) reasons.push(t('food.chemLab.readiness.noMethod'));
    const param = specActive.get(tr.parameter.id);
    if (param && !param.is_active) reasons.push(t('food.chemLab.readiness.testInactive'));
    const hasEquip = equipment.some((e) => e.status === 'OPERATIONAL');
    if (!hasEquip) reasons.push(t('food.chemLab.readiness.noEquipment'));
    if (tr.qc_status === 'FAILED') reasons.push(t('food.chemLab.readiness.qcFailed'));
    return reasons;
  };

  const mySubgroupRows = useMemo(() => {
    if (!ANALYST_TEST_GROUPS[nav]) return [];
    return myTests.filter(ANALYST_TEST_GROUPS[nav]);
  }, [myTests, nav]);

  const dueSoonRows = useMemo(
    () => myTests.filter((t) => t.sla?.status === 'DUE_SOON' || t.sla?.status === 'DELAYED'),
    [myTests],
  );

  const qcTasks = useMemo(() => myTests.filter((t) => t.qc_status === 'PENDING'), [myTests]);
  const qcDone = useMemo(() => myTests.filter((t) => t.qc_status === 'PASSED' || t.qc_status === 'FAILED'), [myTests]);
  const historyRows = useMemo(() => myTests.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED' || t.result_value != null), [myTests]);
  const queueRows = useMemo(() => myTests.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'DRAFT'), [myTests]);

  const alerts = useMemo(() => {
    const list: Array<{ severity: 'error' | 'warning' | 'info' | 'success'; text: string; nav?: NavKey }> = [];
    const overdue = kpi.overdue;
    if (overdue > 0) list.push({ severity: 'error', text: t('food.chemLab.alerts.overdueSla', { count: overdue }), nav: 'sla' });
    if (kpi.returned > 0) list.push({ severity: 'warning', text: t('food.chemLab.alerts.returnedResults', { count: kpi.returned }), nav: 'samples.returned' });
    if (kpi.qcRequired > 0) list.push({ severity: 'warning', text: t('food.chemLab.alerts.qcRequired', { count: kpi.qcRequired }), nav: 'qc.tasks' });
    if (kpi.urgent > 0) list.push({ severity: 'error', text: t('food.chemLab.alerts.urgentTests', { count: kpi.urgent }), nav: 'samples.new' });
    if (kpi.dueToday > 0) list.push({ severity: 'info', text: t('food.chemLab.alerts.dueToday', { count: kpi.dueToday }), nav: 'sla' });
    const calDue = equipment.filter((e) => e.next_calibration_due && new Date(e.next_calibration_due) <= new Date(Date.now() + 30 * 86400000));
    if (calDue.length > 0) list.push({ severity: 'warning', text: t('food.chemLab.alerts.calibrationDue', { count: calDue.length }), nav: 'equipment' });
    const expiredReagents = myTests.filter((tr) => /expired|\u0645\u0646\u062A\u0647\u064A/i.test(tr.notes || ''));
    if (expiredReagents.length > 0) list.push({ severity: 'warning', text: t('food.chemLab.alerts.expiredReagents', { count: expiredReagents.length }), nav: 'reagents' });
    if (list.length === 0) list.push({ severity: 'success', text: t('food.chemLab.alerts.noAlerts') });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi, myTests, equipment, t]);

  const selectNav = (key: NavKey) => {
    setNav(key);
    if (key === 'alerts') return;
  };

  const handleSectionNav = (id: string) => {
    const navKey = SECTION_NAV_MAP[id];
    if (navKey) setNav(navKey);
    scrollTo(id);
  };

  const toggleGroup = (key: string) => {
    const group = SIDEBAR_GROUPS.find((g) => g.key === key);
    if (!group || group.children.length === 1) return;
    const activeIn = groupOf(nav)?.key === key;
    if (activeIn) {
      setExpanded((e) => ({ ...e, [key]: !(e[key] ?? false) }));
    } else {
      setExpanded((e) => ({ ...e, [key]: true }));
      setNav(group.children[0].key);
    }
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        /* ignore */
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const openStart = (t: AnalystTestRow) => {
    setStartTest(t);
  };

  const confirmStart = async () => {
    if (!startTest) return;
    const reasons = readiness(startTest);
    if (reasons.length) {
      notifyError(t('food.chemLab.notify.cannotStart', { reason: reasons[0] }));
      return;
    }
    try {
      await startSampleTest(startTest.id);
      notifySuccess(t('food.chemLab.notify.started'));
      setStartTest(null);
      tests.refresh();
      samples.refresh();
    } catch {
      notifyError(t('food.chemLab.notify.startFailed'));
    }
  };

  const openResult = (t: AnalystTestRow) => {
    setResultTest(t);
    setExEquip(t.device_used || '');
    setExLot(t.reagent_lot || '');
    setExExpiry('');
    setExQuantityUsed('');
    setExResultType(t.result_value != null || t.result_text ? 'numeric' : 'numeric');
    setExValue(t.result_value != null ? String(t.result_value) : '');
    setExQual(t.result_text || 'Negative');
    setExMin('');
    setExMax('');
    setExNotes('');
  };

  const resultDecision = useMemo(() => {
    if (!resultTest) return null;
    if (exResultType === 'numeric' && exValue !== '') {
      const v = Number(exValue);
      return evaluateNumeric(Number.isFinite(v) ? v : null, resultTest.parameter.reference_limit);
    }
    if (exResultType === 'qualitative') {
      return exQual === 'Negative' ? 'COMPLIANT' : null;
    }
    return null;
  }, [resultTest, exResultType, exValue, exQual]);

  const buildResultPayload = () => {
    if (!resultTest) return {};
    const p = resultTest.parameter;
    const numericVal = exResultType === 'numeric' && exValue !== '' ? Number(exValue) : null;
    const value = Number.isFinite(numericVal ?? NaN) ? numericVal : null;
    let resultText = '';
    if (exResultType === 'qualitative') resultText = exQual;
    else if (exResultType === 'range') resultText = `${exMin} - ${exMax}`;
    else if (exResultType === 'numeric' && value == null) resultText = t('food.chemLab.result.unrecorded');
    return {
      result_value: value,
      result_text: resultText,
      unit: p.unit,
      reference_limit: p.reference_limit,
      method_used: p.method,
      device_used: exEquip,
      reagent_lot: [exLot, exExpiry, exQuantityUsed].filter(Boolean).join(' / ') || '',
      notes: [resultText ? `${exResultType}` : '', exNotes].filter(Boolean).join('\n'),
      decision: resultDecision || 'COMPLIANT',
    };
  };

  const saveDraft = async () => {
    if (!resultTest) return;
    try {
      await saveSampleTestResult(resultTest.id, buildResultPayload());
      notifySuccess(t('food.chemLab.notify.savedDraft'));
      setResultTest(null);
      tests.refresh();
    } catch {
      notifyError(t('food.chemLab.notify.saveDraftFailed'));
    }
  };

  const submitResult = async () => {
    if (!resultTest) return;
    if (resultTest.qc_status === 'FAILED') {
      notifyError(t('food.chemLab.notify.qcFailedCannotSubmit'));
      return;
    }
    if (exResultType === 'numeric' && (exValue === '' || !Number.isFinite(Number(exValue)))) {
      return notifyError(t('food.chemLab.notify.enterNumericValue'));
    }
    try {
      await enterSampleTestResult(resultTest.id, buildResultPayload());
      notifySuccess(t('food.chemLab.notify.submittedForReview'));
      setResultTest(null);
      tests.refresh();
      samples.refresh();
    } catch {
      notifyError(t('food.chemLab.notify.submitFailed'));
    }
  };

  const submitQc = async () => {
    if (!qcTest) return;
    try {
      await markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes });
      notifySuccess(qcStatus === 'PASSED' ? t('food.chemLab.notify.qcPassed') : t('food.chemLab.notify.qcFailed'));
      setQcTest(null);
      setQcNotes('');
      tests.refresh();
    } catch {
      notifyError(t('food.chemLab.notify.qcError'));
    }
  };

  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={3} lg={2}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );

  /* ---------- أعمدة الجداول ---------- */

  const actionCell = (tr: AnalystTestRow) => (
    <Stack direction="row" spacing={0.5}>
      <AppButton size="small" variant="secondary" onClick={() => setDetailId(tr.sample)}>{t('food.chemLab.button.view')}</AppButton>
      {tr.status === 'PENDING' && (
        <AppButton size="small" variant="secondary" startIcon={<PlayArrowIcon fontSize="small" />} onClick={() => openStart(tr)}>{t('food.chemLab.button.start')}</AppButton>
      )}
      {(tr.status === 'IN_PROGRESS' || tr.status === 'DRAFT') && (
        <AppButton size="small" onClick={() => openResult(tr)}>{t('food.chemLab.button.view')}</AppButton>
      )}
      {tr.status === 'DRAFT' && (
        <AppButton size="small" variant="secondary" onClick={() => openResult(tr)}>{t('food.chemLab.button.edit')}</AppButton>
      )}
      {tr.status === 'SUBMITTED' && (
        <AppButton size="small" variant="ghost" disabled>{t('food.chemLab.button.pendingReview')}</AppButton>
      )}
      {(tr.status === 'SUBMITTED' || tr.status === 'REVIEWED' || tr.status === 'APPROVED' || tr.status === 'COMPLETED') && (
        <AppButton size="small" variant="secondary" onClick={() => openResult(tr)}>{t('food.chemLab.button.record')}</AppButton>
      )}
    </Stack>
  );

  const workColumns: DataTableColumn<AnalystTestRow>[] = useMemo(() => [
    { key: 'sampleNumber', label: t('food.chemLab.table.columns.sampleNumber'), render: (tr) => <b>{tr.sampleNumber ?? '—'}</b> },
    { key: 'sampleType', label: t('food.chemLab.table.columns.sampleType'), render: (tr) => tr.sampleType ?? '—' },
    { key: 'parameter', label: t('food.chemLab.table.columns.parameter'), render: (tr) => <b>{tr.parameter.name_ar}</b> },
    { key: 'priority', label: t('food.chemLab.table.columns.priority'), render: (tr) => <StatusChip label={labPriority[tr.priority ?? 'NORMAL']?.label ?? '—'} tone={labPriority[tr.priority ?? 'NORMAL']?.tone} /> },
    { key: 'sla', label: t('food.chemLab.table.columns.status'), render: (tr) => (tr.sla?.status ? <StatusChip label={labSla[tr.sla.status]?.label ?? tr.sla.status} tone={labSla[tr.sla.status]?.tone} /> : '—') },
    { key: 'status', label: t('food.chemLab.table.columns.status'), render: (tr) => <StatusChip label={labTestStatus[tr.status]?.label ?? tr.status} tone={labTestStatus[tr.status]?.tone} /> },
    {
      key: 'actions', label: '', render: (tr) => actionCell(tr),
    },
  ], [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultColumns: DataTableColumn<AnalystTestRow>[] = useMemo(() => [
    { key: 'sampleNumber', label: t('food.chemLab.table.columns.sampleNumber'), render: (tr) => <b>{tr.sampleNumber ?? '—'}</b> },
    { key: 'parameter', label: t('food.chemLab.table.columns.parameter'), render: (tr) => <b>{tr.parameter.name_ar}</b> },
    { key: 'result', label: t('food.chemLab.table.columns.result'), render: (tr) => (tr.result_value != null ? `${tr.result_value} ${tr.unit}` : tr.result_text || '—') },
    { key: 'decision', label: t('food.chemLab.table.columns.decision'), render: (tr) => <StatusChip label={labDecision[tr.decision]?.label ?? tr.decision} tone={labDecision[tr.decision]?.tone} /> },
    { key: 'status', label: t('food.chemLab.table.columns.status'), render: (tr) => <StatusChip label={labTestStatus[tr.status]?.label ?? tr.status} tone={labTestStatus[tr.status]?.tone} /> },
    { key: 'entered_at', label: t('food.chemLab.table.columns.enteredAt'), render: (tr) => (tr.entered_at ? formatDateTime(tr.entered_at) : '—') },
    { key: 'device_used', label: t('food.chemLab.table.columns.deviceUsed'), render: (tr) => tr.device_used || '—' },
    { key: 'qs', label: t('food.chemLab.table.columns.status'), render: (tr) => <StatusChip label={labQc[tr.qc_status]?.label ?? tr.qc_status} tone={labQc[tr.qc_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (tr) => actionCell(tr),
    },
  ], [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const reagentRows = useMemo(
    () => myTests.filter((t) => t.reagent_lot).map((t) => ({ ...t })),
    [myTests],
  );

  const returnReasonOf = (tr: SampleTest) => {
    const m = (tr.notes || '').match(/\u005B\u0625\u0639\u0627\u062F\u0629 \u0644\u0644\u062A\u062D\u0644\u064A\u0644\u005D\s*(.*)/);
    return m && m[1] ? m[1] : '';
  };

  const renderUserMenu = () => (
    <Menu
      anchorEl={userMenuAnchor}
      open={Boolean(userMenuAnchor)}
      onClose={() => setUserMenuAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 200 } } }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {user?.full_name || t('food.chemLab.avatarFallback')}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {user?.email}
        </Typography>
      </Box>
      <Divider />
      <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
        <ListItemIcon sx={{ color: 'inherit' }}>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        {t('food.chemLab.accountLabel')}
      </MenuItem>
    </Menu>
  );

  const renderSidebar = () => (
    <Box
      sx={{
        width: 230,
        flexShrink: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 1,
        bgcolor: 'background.paper',
        height: 'fit-content',
        position: 'sticky',
        top: 96,
      }}
    >
      <List disablePadding>
        {SIDEBAR_GROUPS.map((group) => {
          const isOpen = expanded[group.key] ?? false;
          const activeGroup = groupOf(nav)?.key === group.key;
          if (group.children.length === 1) {
            const active = nav === group.children[0].key;
            return (
              <ListItem key={group.key} disablePadding sx={{ mb: 0.4 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => selectNav(group.children[0].key)}
                  sx={{
                    borderRadius: 2.5,
                    fontWeight: active ? 800 : 600,
                    color: active ? 'primary.main' : 'text.secondary',
                    '&.Mui-selected': { bgcolor: 'primary.light' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{group.icon}</ListItemIcon>
                  <ListItemText primary={group.label} primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 14 }} />
                </ListItemButton>
              </ListItem>
            );
          }
          return (
            <Box key={group.key} sx={{ mb: 0.4 }}>
              <ListItemButton
                selected={activeGroup}
                onClick={() => toggleGroup(group.key)}
                sx={{
                  borderRadius: 2.5,
                  fontWeight: activeGroup ? 800 : 600,
                  color: activeGroup ? 'primary.main' : 'text.secondary',
                  '&.Mui-selected': { bgcolor: 'primary.light' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{group.icon}</ListItemIcon>
                <ListItemText primary={group.label} primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 14 }} />
                {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </ListItemButton>
              {isOpen && (
                <List disablePadding sx={{ pl: 1.5 }}>
                  {group.children.map((child) => {
                    const childActive = nav === child.key;
                    return (
                      <ListItem key={child.key} disablePadding>
                        <ListItemButton
                          dense
                          selected={childActive}
                          onClick={() => selectNav(child.key)}
                          sx={{
                            borderRadius: 2,
                            py: 0.5,
                            fontWeight: childActive ? 800 : 600,
                            color: childActive ? 'primary.main' : 'text.secondary',
                            '&.Mui-selected': { bgcolor: 'primary.light' },
                          }}
                        >
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 13 }}
                            sx={{ pl: 3 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          );
        })}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <List disablePadding>
        {FOOTER_NAV_ITEMS.map((item) => {
          const active = nav === item.key;
          const Icon = item.key === 'settings' ? SettingsIcon : HelpOutlineIcon;
          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.4 }}>
              <ListItemButton
                selected={active}
                onClick={() => selectNav(item.key)}
                sx={{
                  borderRadius: 2.5,
                  fontWeight: active ? 800 : 600,
                  color: active ? 'primary.main' : 'text.secondary',
                  '&.Mui-selected': { bgcolor: 'primary.light' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 'inherit', fontSize: 14 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: '#F8FAFC' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontWeight: 700, fontSize: 14 }}>
            {(user?.full_name || user?.email || '?').charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.full_name || '—'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontWeight: 700 }}>
              <CircleIcon sx={{ fontSize: 10 }} /> {t('food.chemLab.connectedStatus')}
            </Typography>
          </Box>
        </Stack>
        <AppButton fullWidth size="small" variant="ghost" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ mt: 1, color: 'error.main' }}>
          {t('food.chemLab.accountLabel')}
        </AppButton>
      </Box>
    </Box>
  );

  /* ---------- أدوات عرض ---------- */

  const SUB_TITLES: Record<string, string> = useMemo(() => ({
    home: t('food.chemLab.subTitles.home'),
    'samples.new': t('food.chemLab.subTitles.samples.new'),
    'samples.progress': t('food.chemLab.subTitles.samples.progress'),
    'samples.review': t('food.chemLab.subTitles.samples.review'),
    'samples.returned': t('food.chemLab.subTitles.samples.returned'),
    'samples.completed': t('food.chemLab.subTitles.samples.completed'),
    'analysis.tests': t('food.chemLab.subTitles.analysis.tests'),
    'analysis.queue': t('food.chemLab.subTitles.analysis.queue'),
    'analysis.history': t('food.chemLab.subTitles.analysis.history'),
    'qc.tasks': t('food.chemLab.subTitles.qc.tasks'),
    'qc.results': t('food.chemLab.subTitles.qc.results'),
    equipment: t('food.chemLab.subTitles.equipment'),
    reagents: t('food.chemLab.subTitles.reagents'),
    specs: t('food.chemLab.subTitles.specs'),
    sla: t('food.chemLab.subTitles.sla'),
    results: t('food.chemLab.subTitles.results'),
    alerts: t('food.chemLab.subTitles.alerts'),
    reports: t('food.chemLab.subTitles.help'),
    settings: t('food.chemLab.subTitles.settings'),
    help: t('food.chemLab.subTitles.help'),
  }), [t]);

  const renderEmpty = (text: string) => (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body1" fontWeight={700} color="text.secondary">
        {text}
      </Typography>
    </Paper>
  );

  const renderDialogs = () => (
    <>
      <SimpleSampleDetailDialog
        open={Boolean(detailId)}
        sampleId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* بدء التحليل */}
      <FormDialog
        open={Boolean(startTest)}
        title={t('food.chemLab.dialog.startAnalysis.title')}
        subtitle={startTest ? `${startTest.sampleNumber ?? ''} — ${startTest.parameter.name_ar}` : ''}
        icon={<PlayArrowIcon />}
        onClose={() => setStartTest(null)}
        onSubmit={confirmStart}
        submitLabel={t('food.chemLab.dialog.startAnalysis.submitLabel')}
      >
        {startTest && (
          <>
            <Alert severity="info">
              {t('food.chemLab.dialog.startAnalysis.description')}
            </Alert>
            {readiness(startTest).length > 0 ? (
              <Alert severity="error">{t('food.chemLab.dialog.startAnalysis.cannotStart', { reason: readiness(startTest)[0] })}</Alert>
            ) : (
              <Alert severity="success">{t('food.chemLab.dialog.startAnalysis.ready')}</Alert>
            )}
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" fontWeight={700}>{t('food.chemLab.dialog.startAnalysis.parameterLabel')}</Typography>
                <Typography variant="body2" color="text.secondary">{startTest.parameter.name_ar}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" fontWeight={700}>{t('food.chemLab.dialog.startAnalysis.deviceLabel')}</Typography>
                <FormSelect
                  label=""
                  value={exEquip}
                  onChange={setExEquip}
                  placeholder={t('food.chemLab.dialog.startAnalysis.devicePlaceholder')}
                  options={equipment
                    .filter((e) => e.status === 'OPERATIONAL')
                    .map((e) => ({ value: e.id, label: `${e.name_ar}${e.model_number ? ` — ${e.model_number}` : ''}` }))}
                />
              </Box>
            </Stack>
          </>
        )}
      </FormDialog>

      {/* إدخال النتيجة */}
      <FormDialog
        open={Boolean(resultTest)}
        title={t('food.chemLab.dialog.result.title')}
        subtitle={resultTest ? `${resultTest.sampleNumber ?? ''} — ${resultTest.parameter.name_ar}` : ''}
        icon={<FactCheckIcon />}
        onClose={() => setResultTest(null)}
        onSubmit={submitResult}
        submitLabel={t('food.chemLab.dialog.result.submitLabel')}
        maxWidth="md"
      >
        {resultTest && (
          <>
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              {t('food.chemLab.dialog.result.referenceLimit')}: <b>{resultTest.parameter.reference_limit || '—'}</b>{' '}
              {resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''} — {t('food.chemLab.status.method')}:{' '}
              {resultTest.parameter.method || '—'}
            </Alert>
            <FormSelect
              label={t('food.chemLab.dialog.result.typeLabel')}
              value={exResultType}
              onChange={setExResultType}
              options={[
                { value: 'numeric', label: t('food.chemLab.dialog.result.type.numeric') },
                { value: 'qualitative', label: t('food.chemLab.dialog.result.type.qualitative') },
                { value: 'range', label: t('food.chemLab.dialog.result.type.range') },
              ]}
            />
            {exResultType === 'numeric' && (
              <Stack direction="row" spacing={2}>
                <FormTextField
                  label={`${t('food.chemLab.dialog.result.valueLabel')} ${resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''}`}
                  type="number"
                  value={exValue}
                  onChange={(e) => setExValue(e.target.value)}
                  helperText={`${t('food.chemLab.dialog.result.referenceLimit')}: ${resultTest.parameter.reference_limit || '—'}`}
                />
              </Stack>
            )}
            {exResultType === 'qualitative' && (
              <FormSelect
                label={t('food.chemLab.dialog.result.qualitativeLabel')}
                value={exQual}
                onChange={setExQual}
                options={[
                  { value: 'Negative', label: t('food.chemLab.dialog.result.qualitative.negative') },
                  { value: 'Positive', label: t('food.chemLab.dialog.result.qualitative.positive') },
                ]}
              />
            )}
            {exResultType === 'range' && (
              <Stack direction="row" spacing={2}>
                <FormTextField label={t('food.chemLab.dialog.result.range.from')} type="number" value={exMin} onChange={(e) => setExMin(e.target.value)} />
                <FormTextField label={t('food.chemLab.dialog.result.range.to')} type="number" value={exMax} onChange={(e) => setExMax(e.target.value)} />
              </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormSelect
                  label={t('food.chemLab.dialog.result.deviceLabel')}
                  value={exEquip}
                  onChange={setExEquip}
                  placeholder={t('food.chemLab.dialog.result.devicePlaceholder')}
                  options={equipment.map((e) => ({ value: e.id, label: e.name_ar }))}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label={t('food.chemLab.dialog.result.lotLabel')} value={exLot} onChange={(e) => setExLot(e.target.value)} />
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label={t('food.chemLab.dialog.result.expiryLabel')} type="date" value={exExpiry} onChange={(e) => setExExpiry(e.target.value)} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label={t('food.chemLab.dialog.result.quantityLabel')} value={exQuantityUsed} onChange={(e) => setExQuantityUsed(e.target.value)} />
              </Box>
            </Stack>
            <FormTextField
              label={t('food.chemLab.dialog.result.notesLabel')}
              multiline
              minRows={2}
              value={exNotes}
              onChange={(e) => setExNotes(e.target.value)}
            />

            <Alert
              severity={resultDecision === 'NON_COMPLIANT' ? 'error' : resultDecision ? 'success' : 'info'}
            >
              {t('food.chemLab.dialog.result.autoEvaluation')}: {resultDecision ? labDecision[resultDecision]?.label ?? resultDecision : t('food.chemLab.dialog.result.autoEvaluation')}{' '}
              — {t('food.chemLab.dialog.result.autoEvaluation')}
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <AppButton variant="secondary" onClick={saveDraft}>{t('food.chemLab.dialog.result.saveDraft')}</AppButton>
            </Stack>
          </>
        )}
      </FormDialog>

      {/* مراجعة الجودة QC */}
      <FormDialog
        open={Boolean(qcTest)}
        title={t('food.chemLab.dialog.qc.title')}
        subtitle={qcTest ? `${qcTest.sampleNumber ?? ''} — ${qcTest.parameter.name_ar}` : ''}
        icon={<VerifiedIcon />}
        onClose={() => setQcTest(null)}
        onSubmit={submitQc}
        submitLabel={t('food.chemLab.dialog.qc.submitLabel')}
      >
        {qcTest && (
          <>
            <Alert severity="info">
              {t('food.chemLab.dialog.qc.description')}
            </Alert>
            <Box>
              <Typography variant="body2" fontWeight={800} mb={1}>
                {t('food.chemLab.dialog.qc.recordedResult')}
              </Typography>
              <Typography variant="h6" fontWeight={900} color="primary.main">
                {qcTest.result_value != null ? `${qcTest.result_value} ${qcTest.unit}` : qcTest.result_text || '—'}
              </Typography>
              {qcTest.reference_limit && (
                <Typography variant="body2" color="text.secondary">{t('food.chemLab.dialog.qc.referenceLimit')}: {qcTest.reference_limit}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">{t('food.chemLab.dialog.qc.decision')}: {labDecision[qcTest.decision]?.label ?? qcTest.decision}</Typography>
            </Box>
            <FormSelect
              label={t('food.chemLab.dialog.qc.decisionLabel')}
              value={qcStatus}
              onChange={(v) => setQcStatus(v)}
              options={[
                { value: 'PASSED', label: t('food.chemLab.dialog.qc.decision.passed') },
                { value: 'FAILED', label: t('food.chemLab.dialog.qc.decision.failed') },
              ]}
            />
            <FormTextField
              label={t('food.chemLab.dialog.qc.notesLabel')}
              multiline
              minRows={2}
              value={qcNotes}
              onChange={(e) => setQcNotes(e.target.value)}
            />
          </>
        )}
      </FormDialog>
    </>
  );

  const renderTestsTable = (rows: AnalystTestRow[], emptyText: string, columns = workColumns) => {
    if (rows.length === 0) return renderEmpty(emptyText);
    return (
      <SimpleTable<AnalystTestRow>
        columns={columns}
        rows={rows}
        emptyTitle={emptyText}
        emptyDescription={t('food.chemLab.empty.noTestsInQueue')}
      />
    );
  };

  const renderSection = (key: NavKey) => {
    switch (key) {
      case 'home':
        return (
          <Stack spacing={2.5}>
            <Grid container spacing={1.5}>
              {stat(t('food.chemLab.kpi.newTests'), kpi.newTests, <AssignmentTurnedInIcon sx={{ color: 'primary.main' }} />)}
              {stat(t('food.chemLab.kpi.inProgress'), kpi.inProgress, <PlayCircleIcon sx={{ color: 'info.main' }} />)}
              {stat(t('food.chemLab.kpi.submitted'), kpi.submitted, <SendIcon sx={{ color: 'warning.main' }} />)}
              {stat(t('food.chemLab.kpi.overdue'), kpi.overdue, <ScheduleIcon sx={{ color: 'error.main' }} />)}
              {stat(t('food.chemLab.kpi.completed'), kpi.completed, <CheckCircleIcon sx={{ color: 'success.main' }} />)}
              {stat(t('food.chemLab.kpi.qcRequired'), kpi.qcRequired, <FactCheckIcon sx={{ color: 'warning.main' }} />)}
              {stat(t('food.chemLab.kpi.urgent'), kpi.urgent, <LocalFireDepartmentIcon sx={{ color: 'error.main' }} />)}
              {stat(t('food.chemLab.kpi.dueToday'), kpi.dueToday, <TodayIcon sx={{ color: 'info.main' }} />)}
              {stat(t('food.chemLab.kpi.returned'), kpi.returned, <UndoIcon sx={{ color: 'warning.main' }} />)}
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1.5}>
                {t('food.chemLab.button.quickActions')}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <AppButton startIcon={<PlayArrowIcon />} onClick={() => setNav('samples.new')}>{t('food.chemLab.button.startNewTest')}</AppButton>
                <AppButton variant="secondary" startIcon={<FactCheckIcon />} onClick={() => setNav('qc.tasks')}>{t('food.chemLab.button.qcTasks')}</AppButton>
                <AppButton variant="secondary" startIcon={<ScheduleIcon />} onClick={() => setNav('sla')}>{t('food.chemLab.button.slaTracking')}</AppButton>
                <AppButton variant="secondary" startIcon={<PrecisionManufacturingIcon />} onClick={() => setNav('equipment')}>{t('food.chemLab.button.equipment')}</AppButton>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>
                {t('food.chemLab.section.alerts')}
              </Typography>
              <Stack spacing={1}>
                {alerts.map((a, i) => (
                  <Alert
                    key={i}
                    severity={a.severity}
                    onClick={() => a.nav && setNav(a.nav)}
                    sx={{ cursor: a.nav ? 'pointer' : 'default' }}
                  >
                    {a.text}
                  </Alert>
                ))}
              </Stack>
            </Paper>

            <Box>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>
                {t('food.chemLab.section.dueSoon')}
              </Typography>
              {renderTestsTable(dueSoonRows.slice(0, 5), t('food.chemLab.empty.noTestsInQueue'), workColumns)}
            </Box>
          </Stack>
        );

      case 'samples.new':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS['samples.new']), t('food.chemLab.empty.noNewTests'));

      case 'samples.progress':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS['samples.progress']), t('food.chemLab.empty.noInProgress'));

      case 'samples.review':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS['samples.review']), t('food.chemLab.empty.noForReview'));

      case 'samples.returned':
        return (
          <Stack spacing={2}>
            {renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS['samples.returned']), t('food.chemLab.empty.noReturned'))}
            {myTests.filter(ANALYST_TEST_GROUPS['samples.returned']).length > 0 && (
              <Stack spacing={1}>
                {myTests.filter(ANALYST_TEST_GROUPS['samples.returned']).map((tr) => (
                  <Alert key={tr.id} severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography fontWeight={800} variant="body2">
                          {tr.sampleNumber ?? ''} — {tr.parameter.name_ar}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('food.chemLab.returnReasons.0')}: {returnReasonOf(tr) || '—'}
                        </Typography>
                      </Box>
                      <AppButton size="small" onClick={() => openResult(tr)}>{t('food.chemLab.button.correctAndResubmit')}</AppButton>
                    </Stack>
                  </Alert>
                ))}
              </Stack>
            )}
          </Stack>
        );

      case 'samples.completed':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS['samples.completed']), t('food.chemLab.empty.noCompleted'));

      case 'analysis.tests':
        return (
          <Grid container spacing={2}>
            {parameters.length === 0 && (
              <Grid item xs={12}>
                {renderEmpty(t('food.chemLab.empty.noTestsInChemistry'))}
              </Grid>
            )}
            {parameters.map((p) => (
              <Grid item xs={12} sm={6} lg={4} key={p.id}>
                <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography fontWeight={900} variant="subtitle1">{p.name_ar}</Typography>
                    <StatusChip
                      label={p.is_active ? t('food.chemLab.status.active') : t('food.chemLab.status.inactive')}
                      tone={p.is_active ? 'success' : 'error'}
                    />
                  </Stack>
                  {p.code && <Typography variant="caption" color="text.secondary">{t('food.chemLab.spec.table.code')}: {p.code}</Typography>}
                  <Stack spacing={0.5} mt={1}>
                    {p.method && (
                      <Typography variant="body2" color="text.secondary">{t('food.chemLab.status.method')}: {p.method}</Typography>
                    )}
                    {p.unit && (
                      <Typography variant="body2" color="text.secondary">{t('food.chemLab.status.unit')}: {p.unit}</Typography>
                    )}
                    {p.reference_limit && (
                      <Typography variant="body2" color="text.secondary">
                        {t('food.chemLab.status.referenceLimit')}: <b>{p.reference_limit}</b>
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        );

      case 'analysis.queue':
        return renderTestsTable(queueRows, t('food.chemLab.empty.noTestsInQueue'));

      case 'analysis.history':
        return renderTestsTable(historyRows, t('food.chemLab.empty.noHistoryResults'), resultColumns);

      case 'qc.tasks':
        return renderTestsTable(qcTasks, t('food.chemLab.empty.noQcTasks'));

      case 'qc.results':
        return renderTestsTable(qcDone, t('food.chemLab.empty.noQcResults'), resultColumns);

      case 'equipment':
        return (
          <Grid container spacing={2}>
            {equipment.length === 0 && (
              <Grid item xs={12}>
                {renderEmpty(t('food.chemLab.empty.noEquipment'))}
              </Grid>
            )}
            {equipment.map((e) => {
              const dueSoon = e.next_calibration_due && new Date(e.next_calibration_due) <= new Date(Date.now() + 30 * 86400000);
              return (
                <Grid item xs={12} sm={6} lg={4} key={e.id}>
                  <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight={900} variant="subtitle1">{e.name_ar}</Typography>
                      <StatusChip label={labEquipmentStatus[e.status]?.label ?? e.status} tone={labEquipmentStatus[e.status]?.tone} />
                    </Stack>
                    {e.model_number && <Typography variant="caption" color="text.secondary">{t('food.chemLab.equipment.model')}: {e.model_number}</Typography>}
                    <Stack spacing={0.5} mt={1}>
                      <Typography variant="body2" color="text.secondary">{t('food.chemLab.equipment.lastCalibrated')}: {e.last_calibrated ? formatDateTime(e.last_calibrated) : '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('food.chemLab.equipment.nextCalibration')}: {e.next_calibration_due ? formatDate(e.next_calibration_due) : '—'}</Typography>
                      {dueSoon && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                          {t('food.chemLab.equipment.calibrationDueSoon')}
                        </Alert>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        );

      case 'reagents':
        return renderTestsTable(reagentRows, t('food.chemLab.empty.noReagents'), resultColumns);

      case 'specs':
        return (
          <Stack spacing={1.5}>
            <Alert severity="info">
              {t('food.chemLab.status.specsNote')}
            </Alert>
            {parameters.filter((p) => p.reference_limit).map((p) => (
              <Paper key={p.id} sx={{ p: 2, borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography fontWeight={900} variant="subtitle2">{p.name_ar}</Typography>
                    {p.method && <Typography variant="body2" color="text.secondary">{t('food.chemLab.status.method')}: {p.method}</Typography>}
                  </Box>
                  <Box textAlign="left">
                    <Typography fontWeight={900} color="primary.main">{p.reference_limit}{p.unit ? ` ${p.unit}` : ''}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('food.chemLab.status.specsReference')}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
            {parameters.filter((p) => p.reference_limit).length === 0 && renderEmpty(t('food.chemLab.empty.noSpecs'))}
          </Stack>
        );

      case 'sla':
        return (
          <Stack spacing={2}>
            <Grid container spacing={1.5}>
              {stat(t('food.chemLab.section.slaStats.onTime'), myTests.filter((tr) => tr.sla?.status === 'ON_TIME' || tr.sla?.status === 'COMPLETED').length, <CheckCircleIcon sx={{ color: 'success.main' }} />)}
              {stat(t('food.chemLab.section.slaStats.dueSoon'), myTests.filter((tr) => tr.sla?.status === 'DUE_SOON').length, <ScheduleIcon sx={{ color: 'warning.main' }} />)}
              {stat(t('food.chemLab.section.slaStats.overdue'), kpi.overdue, <ScheduleIcon sx={{ color: 'error.main' }} />)}
              {stat(t('food.chemLab.section.slaStats.dueToday'), kpi.dueToday, <TodayIcon sx={{ color: 'info.main' }} />)}
            </Grid>
            <Box>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>
                {t('food.chemLab.section.nearOverdue')}
              </Typography>
              {renderTestsTable(dueSoonRows, t('food.chemLab.empty.noSlaHistory'))}
            </Box>
          </Stack>
        );

      case 'results':
        return renderTestsTable(historyRows, t('food.chemLab.empty.noHistoryResults'), resultColumns);

      case 'alerts':
        return (
          <Stack spacing={1}>
            {alerts.map((a, i) => (
              <Alert key={i} severity={a.severity} onClick={() => a.nav && setNav(a.nav)} sx={{ cursor: a.nav ? 'pointer' : 'default' }}>
                {a.text}
              </Alert>
            ))}
          </Stack>
        );

      case 'reports':
        return (
          <Stack spacing={2}>
            <Alert severity="warning">
              {t('food.chemLab.empty.noHistoryResults')}
            </Alert>
            {renderEmpty(t('food.chemLab.empty.noHistoryResults'))}
          </Stack>
        );

      case 'settings':
        return (
          <Stack spacing={2}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>{t('food.chemLab.settings.allowedTitle')}</Typography>
              {SETTINGS_ALLOWED.map((s, i) => (
                <FormControlLabel
                  key={i}
                  control={<Switch defaultChecked color="primary" />}
                  label={s.label}
                  sx={{ '& .MuiFormControlLabel-label': { fontWeight: 600 } }}
                />
              ))}
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1.5}>{t('food.chemLab.settings.blockedTitle')}</Typography>
              {SETTINGS_BLOCKED.map((s, i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <StatusChip label={t('food.chemLab.status.inactive')} tone="error" />
                  <Typography variant="body2">{s.label}</Typography>
                </Stack>
              ))}
              <Alert severity="warning" sx={{ mt: 1 }}>
                {t('food.chemLab.settings.restrictedNote')}
              </Alert>
            </Paper>
          </Stack>
        );

      case 'help':
        return (
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={900} mb={1.5}>{t('food.chemLab.help.title')}</Typography>
            <Stack spacing={1.5}>
              {HELP_STEPS.map((s, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 13, fontWeight: 700, bgcolor: 'primary.main' }}>
                    {i + 1}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={800}>{s.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F4F6F9' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <BrandLogo size="sm" />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>NQP Lab Platform</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>
                {t('food.chemLab.help.chemistryLab')}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label={t('food.chemLab.help.chemistryLab')}
            sx={{ fontWeight: 700, bgcolor: 'secondary.main', color: 'white' }}
          />
          <Chip
            size="small"
            icon={<CircleIcon sx={{ fontSize: 11, color: 'success.main' }} />}
            label={t('food.chemLab.connectedStatus')}
            sx={{ fontWeight: 700, display: { xs: 'none', sm: 'flex' } }}
          />
          <IconButton aria-label={t('food.chemLab.accountLabel')}
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
              {(user?.full_name || user?.email || '?').charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, px: { xs: 1.5, md: 3 }, py: 2.5 }}>
        <DashboardHero
          eyebrow={t('food.chemLab.help.chemistryLab')}
          title={groupOf(nav)?.label ?? t('food.chemLab.help.chemistryLab')}
          subtitle={SUB_TITLES[nav]}
          gradient="emerald"
          avatarLabel={(user?.full_name || t('food.chemLab.avatarFallback')).slice(0, 1)}
          chips={[
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayLabel}</Box>,
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
              {t('food.chemLab.liveStatus')}
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
              label={t('food.chemLab.sections.railLabel')}
            />
          </Grid>
          <Grid item xs={12} md={9.8} lg={10.2}>
            <Box component="section" ref={register(NAV_SECTION_MAP[nav] || 'overview')} data-section={NAV_SECTION_MAP[nav] || 'overview'} sx={{ scrollMarginTop: '80px' }}>
              {renderSection(nav)}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {renderDialogs()}
      {renderUserMenu()}
    </Box>
  );
};

/* ---------- أدوات مشتركة ---------- */

interface SimpleTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyTitle: string;
  emptyDescription?: string;
}

const SimpleTable = <T extends { id: string },>({ columns, rows, emptyTitle, emptyDescription }: SimpleTableProps<T>) => (
  <DataTable<T>
    columns={columns}
    rows={rows}
    rowKey={(r) => r.id}
    count={rows.length}
    page={0}
    rowsPerPage={rows.length}
    pageSizeOptions={[5, 10, 25, 50]}
    hidePagination
    emptyTitle={emptyTitle}
    emptyDescription={emptyDescription}
  />
);

interface SimpleDetailProps {
  open: boolean;
  sampleId: string | null;
  onClose: () => void;
}

const SimpleSampleDetailDialog = ({ open, sampleId, onClose }: SimpleDetailProps) => {
  const { t } = useTranslation();
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sampleId) {
      setSample(null);
      return;
    }
    setLoading(true);
    getLabSample(sampleId)
      .then((r) => setSample(r.data.data))
      .catch(() => setSample(null))
      .finally(() => setLoading(false));
  }, [open, sampleId]);

  return (
    <FormDialog
      open={open}
      title={t('food.chemLab.dialog.sampleDetails.title')}
      subtitle={sample?.analysis_request_number ? `${t('food.chemLab.dialog.sampleDetails.subtitle')}: ${sample.analysis_request_number}` : ''}
      onClose={onClose}
      onSubmit={onClose}
      submitLabel={t('food.chemLab.dialog.sampleDetails.close')}
      cancelLabel=""
    >
      {loading || !sample ? (
        <Stack spacing={1}>
          <Skeleton height={20} />
          <Skeleton height={20} />
          <Skeleton height={20} />
        </Stack>
      ) : (
        <Stack spacing={1}>
          {[
            [t('food.chemLab.dialog.sampleDetails.fields.sampleNumber'), sample.sample_number],
            [t('food.chemLab.dialog.sampleDetails.fields.sampleType'), sample.sample_type],
            [t('food.chemLab.dialog.sampleDetails.fields.priority'), sample.priority_label || labPriority[sample.priority]?.label || sample.priority],
            [t('food.chemLab.dialog.sampleDetails.fields.samplingReason'), sample.sampling_reason_label || sample.sampling_reason],
            [t('food.chemLab.dialog.sampleDetails.fields.requestingDept'), sample.requesting_department],
            [t('food.chemLab.dialog.sampleDetails.fields.source'), sample.source_name],
            [t('food.chemLab.dialog.sampleDetails.fields.sampleStatus'), labSampleStatus[sample.status]?.label ?? sample.status],
            [t('food.chemLab.dialog.sampleDetails.fields.collectionStatus'), sample.collection_status],
            [t('food.chemLab.dialog.sampleDetails.fields.batchNumber'), sample.batch_number ? `${t('food.chemLab.dialog.sampleDetails.fields.batchNumber')}: ${sample.batch_number}` : '—'],
            [t('food.chemLab.dialog.sampleDetails.fields.originCountry'), sample.origin_country || '—'],
            [t('food.chemLab.dialog.sampleDetails.fields.brand'), sample.brand || '—'],
            [t('food.chemLab.dialog.sampleDetails.fields.receivedAt'), sample.received_at ? formatDateTime(sample.received_at) : '—'],
          ].map(([k, v]) => (
            <Box key={String(k)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2" fontWeight={700}>{k}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left' }}>
                {v || '—'}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </FormDialog>
  );
};

export default ChemistryAnalystPage;
