import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
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
import Badge from '@mui/material/Badge';
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

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const RETURN_MARKER = /\[إعادة/;

const ANALYST_TEST_GROUPS: Record<string, (t: SampleTest) => boolean> = {
  'samples.new': (t) => t.status === 'PENDING',
  'samples.progress': (t) => t.status === 'IN_PROGRESS' || (t.status === 'DRAFT' && !RETURN_MARKER.test(t.notes || '')),
  'samples.review': (t) => t.status === 'SUBMITTED' || t.status === 'REVIEWED',
  'samples.returned': (t) => t.status === 'DRAFT' && RETURN_MARKER.test(t.notes || ''),
  'samples.completed': (t) => t.status === 'APPROVED' || t.status === 'COMPLETED',
};

const SAMPLES_NAV_TITLES: Record<string, string> = {
  'samples.new': 'عيناتي الجديدة — بانتظار بدء التحليل',
  'samples.progress': 'قيد التحليل — فحوصات بدأت التنفيذ أو كمسودات',
  'samples.review': 'للمراجعة — نتائج أُرسلت لرئيس قسم الكيمياء',
  'samples.returned': 'المعادة من رئيس القسم — مطلوب تصحيح وإعادة إرسال',
  'samples.completed': 'المكتملة — اعتمدت وجاهزة للتسليم',
};

/* ---------- هيكل الشريط الجانبي ---------- */

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

const SIDEBAR_GROUPS: NavGroup[] = [
  { key: 'home', label: 'لوحة المحلل', icon: <DashboardIcon />, children: [{ key: 'home', label: 'اللوحة العامة' }] },
  {
    key: 'samples', label: 'عيناتي', icon: <BiotechIcon />, children: [
      { key: 'samples.new', label: 'جديدة' },
      { key: 'samples.progress', label: 'قيد التحليل' },
      { key: 'samples.review', label: 'للمراجعة' },
      { key: 'samples.returned', label: 'المعادة' },
      { key: 'samples.completed', label: 'المكتملة' },
    ],
  },
  {
    key: 'analysis', label: 'التحاليل', icon: <ScienceIcon />, children: [
      { key: 'analysis.tests', label: 'Chemistry Tests' },
      { key: 'analysis.queue', label: 'My Work Queue' },
      { key: 'analysis.history', label: 'Test History' },
    ],
  },
  {
    key: 'qc', label: 'الجودة QC', icon: <FactCheckIcon />, children: [
      { key: 'qc.tasks', label: 'مهام QC' },
      { key: 'qc.results', label: 'نتائج QC' },
    ],
  },
  { key: 'equipment', label: 'الأجهزة', icon: <BuildIcon />, children: [{ key: 'equipment', label: 'الأجهزة المتاحة' }] },
  { key: 'reagents', label: 'الكواشف', icon: <Inventory2Icon />, children: [{ key: 'reagents', label: 'سجل الكواشف' }] },
  { key: 'specs', label: 'المواصفات', icon: <VerifiedIcon />, children: [{ key: 'specs', label: 'المواصفات المطبقة' }] },
  { key: 'sla', label: 'متابعة SLA', icon: <TimerIcon />, children: [{ key: 'sla', label: 'مؤشر الالتزام' }] },
  { key: 'results', label: 'النتائج', icon: <AssignmentTurnedInIcon />, children: [{ key: 'results', label: 'سجل النتائج' }] },
  { key: 'alerts', label: 'التنبيهات', icon: <NotificationsActiveIcon />, children: [{ key: 'alerts', label: 'التنبيهات' }] },
];

const FOOTER_NAV_ITEMS: NavLeaf[] = [
  { key: 'settings', label: 'الإعدادات' },
  { key: 'help', label: 'المساعدة' },
];

const groupOf = (key: NavKey): NavGroup | undefined => SIDEBAR_GROUPS.find((g) => g.children.some((c) => c.key === key));

const SETTINGS_ALLOWED = [
  { label: 'مشاهدة عيناتي الموكلة إليّ فقط' },
  { label: 'بدء التحليل وتنفيذ الاختبار وإدخال النتيجة' },
  { label: 'حفظ مسودة وتعديل نتيجة غير معتمدة وإرسالها للمراجعة' },
  { label: 'تسجيل الجهاز والكاشف المستخدمين أثناء التحليل (Traceability)' },
  { label: 'تنفيذ مهام QC المسموح لي بها ومشاهدة المواصفات المطبقة' },
];

const SETTINGS_BLOCKED = [
  { label: 'الاعتماد النهائي للنتيجة أو اعتماد نتيجة القسم — لرئيس القسم/مدير المختبر' },
  { label: 'تعديل المواصفة والحدود المرجعية أو سعر التحليل' },
  { label: 'تحويل نتيجة غير مطابقة إلى مطابقة يدوياً' },
  { label: 'حذف عينة أو نتيجة أو تعديل سجل التدقيق (Audit Trail)' },
  { label: 'إدارة المستخدمين والصلاحيات' },
];

const HELP_STEPS = [
  { title: '١. ابدأ التحليل', text: 'من نبض عيناتي اختر «بدء التحليل» — يتأكد النظام تلقائياً من صحة العينة والسداد والطريقة والجهاز والكاشف وحالة QC.' },
  { title: '٢. نفّذ الاختبار', text: 'سجّل الجهاز والكاشف (LOT + تاريخ الانتهاء) ثم ادخل النتيجة بزر الرقم أو النوعي أو النطاق مع وحدة القياس.' },
  { title: '٣. التقييم التلقائي', text: 'يحسب النظام المطابقة تلقائياً مقابل الحد المرجعي — لا يمكنك تغييرها يدوياً.' },
  { title: '٤. احفظ أو أرسل', text: 'احفظ كمسودة للتعديل، أو أرسل للمراجعة لتصل لرئيس قسم الكيمياء ثم مدير المختبر.' },
  { title: '٥. إذا أُعيدت النتيجة', text: 'تظهر في «المعادة» مع سبب الإعادة من رئيس القسم — صحّحها وأعد الإرسال.' },
];

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <DashboardIcon fontSize="small" /> },
  { id: 'samples', label: 'عيناتي', icon: <BiotechIcon fontSize="small" /> },
  { id: 'analysis', label: 'التحاليل', icon: <ScienceIcon fontSize="small" /> },
  { id: 'qc', label: 'الجودة', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'equipment', label: 'الأجهزة', icon: <BuildIcon fontSize="small" /> },
  { id: 'results', label: 'النتائج', icon: <AssignmentTurnedInIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <NotificationsActiveIcon fontSize="small" /> },
] as const;

const SECTION_NAV_MAP: Record<string, NavKey> = {
  overview: 'home',
  samples: 'samples.new',
  analysis: 'analysis.tests',
  qc: 'qc.tasks',
  equipment: 'equipment',
  results: 'results',
  alerts: 'alerts',
};

const NAV_SECTION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_NAV_MAP).map(([s, n]) => [n, s]),
);

interface AnalystTestRow extends SampleTest {
  sampleNumber?: string;
  sampleType?: string;
  priority?: string;
  collectionStatus?: string;
}

const ChemistryAnalystPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const [nav, setNav] = useState<NavKey>('home');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map((g) => [g.key, true])),
  );
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

  const readiness = (t: AnalystTestRow) => {
    const reasons: string[] = [];
    const sample = sampleById.get(t.sample);
    if (!sample) reasons.push('لا تتوفر بيانات العينة');
    else if (sample.status === 'REJECTED') reasons.push('العينة مرفوضة');
    const paid = sample?.collection_status === 'PAID' || (sample?.lab_invoice && sample.lab_invoice.status === 'PAID') || Number(sample?.fee_amount ?? 0) === 0;
    if (sample && !paid) reasons.push('يجب سداد رسوم التحليل قبل البدء');
    const method = t.parameter.method || t.method_used;
    if (!method) reasons.push('لا توجد طريقة معتمدة للفحص');
    const param = specActive.get(t.parameter.id);
    if (param && !param.is_active) reasons.push('الفحص غير مفعّل حالياً');
    const hasEquip = equipment.some((e) => e.status === 'OPERATIONAL');
    if (!hasEquip) reasons.push('لا يوجد جهاز متاح (تشغيلي) في قسم الكيمياء');
    if (t.qc_status === 'FAILED') reasons.push('فحص QC فشل — تواصل مع رئيس القسم');
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
    if (overdue > 0) list.push({ severity: 'error', text: `${overdue} فحص تجاوز مدة SLA المطلوبة`, nav: 'sla' });
    if (kpi.returned > 0) list.push({ severity: 'warning', text: `${kpi.returned} نتيجة أُعيدت من رئيس القسم — مطلوب تصحيح`, nav: 'samples.returned' });
    if (kpi.qcRequired > 0) list.push({ severity: 'warning', text: `${kpi.qcRequired} نتيجة تتطلب مراجعة QC قبل الاعتماد`, nav: 'qc.tasks' });
    if (kpi.urgent > 0) list.push({ severity: 'error', text: `${kpi.urgent} فحص عاجل/عالٍ الأولوية`, nav: 'samples.new' });
    if (kpi.dueToday > 0) list.push({ severity: 'info', text: `${kpi.dueToday} فحص مستحق اليوم`, nav: 'sla' });
    const calDue = equipment.filter((e) => e.next_calibration_due && new Date(e.next_calibration_due) <= new Date(Date.now() + 30 * 86400000));
    if (calDue.length > 0) list.push({ severity: 'warning', text: `${calDue.length} جهاز قرب موعد المعايرة (خلال 30 يوماً)`, nav: 'equipment' });
    const expiredReagents = myTests.filter((t) => /expired|منتهي/i.test(t.notes || ''));
    if (expiredReagents.length > 0) list.push({ severity: 'warning', text: `${expiredReagents.length} تسجيل كاشف منتهي — تحقق من الصلاحية`, nav: 'reagents' });
    if (list.length === 0) list.push({ severity: 'success', text: 'لا تنبيهات حالياً — أعمالك ضمن المؤشرات' });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi, myTests, equipment]);

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
        /* تجاهل */ 
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
      notifyError(`لا يمكن بدء التحليل: ${reasons[0]}`);
      return;
    }
    try {
      await startSampleTest(startTest.id);
      notifySuccess('بدأ التحليل — سُجِّل التوقيت تلقائياً');
      setStartTest(null);
      tests.refresh();
      samples.refresh();
    } catch {
      notifyError('تعذر بدء التحليل');
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
    else if (exResultType === 'numeric' && value == null) resultText = 'غير مسجلة';
    return {
      result_value: value,
      result_text: resultText,
      unit: p.unit,
      reference_limit: p.reference_limit,
      method_used: p.method,
      device_used: exEquip,
      reagent_lot: [exLot, exExpiry ? `صلاحية ${exExpiry}` : '', exQuantityUsed ? `كمية ${exQuantityUsed}` : ''].filter(Boolean).join(' / ') || '',
      notes: [resultText ? `نوع النتيجة: ${exResultType}` : '', exNotes].filter(Boolean).join('\n'),
      decision: resultDecision || 'COMPLIANT',
    };
  };

  const saveDraft = async () => {
    if (!resultTest) return;
    try {
      await saveSampleTestResult(resultTest.id, buildResultPayload());
      notifySuccess('حُفظت النتيجة كمسودة');
      setResultTest(null);
      tests.refresh();
    } catch {
      notifyError('تعذر حفظ المسودة');
    }
  };

  const submitResult = async () => {
    if (!resultTest) return;
    if (resultTest.qc_status === 'FAILED') {
      notifyError('فشل QC — لا يمكن إرسال النتيجة، تواصل مع رئيس القسم');
      return;
    }
    if (exResultType === 'numeric' && (exValue === '' || !Number.isFinite(Number(exValue)))) {
      return notifyError('أدخل قيمة النتيجة الرقمية');
    }
    try {
      await enterSampleTestResult(resultTest.id, buildResultPayload());
      notifySuccess('أُرسلت النتيجة لمراجعة رئيس قسم الكيمياء');
      setResultTest(null);
      tests.refresh();
      samples.refresh();
    } catch {
      notifyError('تعذر إرسال النتيجة للمراجعة');
    }
  };

  const submitQc = async () => {
    if (!qcTest) return;
    try {
      await markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes });
      notifySuccess(qcStatus === 'PASSED' ? 'تم اعتماد الجودة (QC)' : 'سُجِّلت مخالفة جودة (QC)');
      setQcTest(null);
      setQcNotes('');
      tests.refresh();
    } catch {
      notifyError('تعذر تسجيل مراجعة الجودة');
    }
  };

  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={3} lg={2}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );

  /* ---------- أعمدة الجداول ---------- */

  const actionCell = (t: AnalystTestRow) => (
    <Stack direction="row" spacing={0.5}>
      <AppButton size="small" variant="secondary" onClick={() => setDetailId(t.sample)}>عرض</AppButton>
      {t.status === 'PENDING' && (
        <AppButton size="small" variant="secondary" startIcon={<PlayArrowIcon fontSize="small" />} onClick={() => openStart(t)}>بدء</AppButton>
      )}
      {(t.status === 'IN_PROGRESS' || t.status === 'DRAFT') && (
        <AppButton size="small" onClick={() => openResult(t)}>نتيجة</AppButton>
      )}
      {t.status === 'DRAFT' && (
        <AppButton size="small" variant="secondary" onClick={() => openResult(t)}>تحرير</AppButton>
      )}
      {t.status === 'SUBMITTED' && (
        <AppButton size="small" variant="ghost" disabled>بانتظار المراجعة</AppButton>
      )}
      {(t.status === 'SUBMITTED' || t.status === 'REVIEWED' || t.status === 'APPROVED' || t.status === 'COMPLETED') && (
        <AppButton size="small" variant="secondary" onClick={() => openResult(t)}>سجل</AppButton>
      )}
    </Stack>
  );

  const workColumns: DataTableColumn<AnalystTestRow>[] = useMemo(() => [
    { key: 'sampleNumber', label: 'العينة', render: (t) => <b>{t.sampleNumber ?? '—'}</b> },
    { key: 'sampleType', label: 'المنتج', render: (t) => t.sampleType ?? '—' },
    { key: 'parameter', label: 'الفحص', render: (t) => <b>{t.parameter.name_ar}</b> },
    { key: 'priority', label: 'الأولوية', render: (t) => <StatusChip label={labPriority[t.priority ?? 'NORMAL']?.label ?? '—'} tone={labPriority[t.priority ?? 'NORMAL']?.tone} /> },
    { key: 'sla', label: 'SLA', render: (t) => (t.sla?.status ? <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} /> : '—') },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    {
      key: 'actions', label: '', render: (t) => actionCell(t),
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const resultColumns: DataTableColumn<AnalystTestRow>[] = useMemo(() => [
    { key: 'sampleNumber', label: 'العينة', render: (t) => <b>{t.sampleNumber ?? '—'}</b> },
    { key: 'parameter', label: 'الفحص', render: (t) => <b>{t.parameter.name_ar}</b> },
    { key: 'result', label: 'النتيجة', render: (t) => (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—') },
    { key: 'decision', label: 'القرار', render: (t) => <StatusChip label={labDecision[t.decision]?.label ?? t.decision} tone={labDecision[t.decision]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'entered_at', label: 'سُجِّلت', render: (t) => (t.entered_at ? formatDateTime(t.entered_at) : '—') },
    { key: 'device_used', label: 'الجهاز', render: (t) => t.device_used || '—' },
    { key: 'qs', label: 'QC', render: (t) => <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (t) => actionCell(t),
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const reagentRows = useMemo(
    () => myTests.filter((t) => t.reagent_lot).map((t) => ({ ...t })),
    [myTests],
  );

  const returnReasonOf = (t: SampleTest) => {
    const m = (t.notes || '').match(/\[إعادة للتحليل\]\s*(.*)/);
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
          {user?.full_name || 'مستخدم'}
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
        تسجيل الخروج
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
            {(user?.full_name || user?.email || '؟').charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'محلل كيمياء'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontWeight: 700 }}>
              <CircleIcon sx={{ fontSize: 10 }} /> متصل
            </Typography>
          </Box>
        </Stack>
        <AppButton fullWidth size="small" variant="ghost" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ mt: 1, color: 'error.main' }}>
          تسجيل الخروج
        </AppButton>
      </Box>
    </Box>
  );

  /* ---------- أدوات عرض ---------- */

  const groupOf = (key: NavKey) =>
    SIDEBAR_GROUPS.find((g) => g.key === key || g.children.some((c) => c.key === key));

  const SUB_TITLES: Record<string, string> = {
    home: 'نظرة عامة على الفحوصات المسندة إليك في قسم الكيمياء',
    'samples.new': 'فُحوصات بانتظار البدء',
    'samples.progress': 'تحاليل قيد التنفيذ',
    'samples.review': 'نتائج بانتظار مراجعة رئيس القسم',
    'samples.returned': 'نتائج أُعيدت إليك لتصحيحها',
    'samples.completed': 'النتائج المعتمدة والمكتملة',
    'analysis.tests': 'قائمة فحوصات قسم الكيمياء المتاحة',
    'analysis.queue': 'كل أعمالك قيد التنفيذ حسب الأولوية',
    'analysis.history': 'سجل النتائج التي أدخلتها',
    'qc.tasks': 'النتائج التي تتطلب مراجعة جودة',
    'qc.results': 'نتائج فحوصات الجودة المُسجَّلة',
    equipment: 'أجهزة قسم الكيمياء وحالة جاهزيتها',
    reagents: 'الكواشف والمواد المحتجزة في النتائج',
    specs: 'المواصفات المرجعية للفحوصات (عرض فقط)',
    sla: 'متابعة مؤشرات مدة إنهاء الفحص (SLA)',
    results: 'نتائج فحوصاتك المُرتفعة للاعتماد',
    alerts: 'التنبيهات والإشعارات المهمة',
    reports: 'تقارير القسم — متاحة لرئيس القسم',
    settings: 'الإعدادات والصلاحيات المحدودة',
    help: 'دليل استخدام شاشة المحلل',
  };

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
        title="بدء التحليل"
        subtitle={startTest ? `${startTest.sampleNumber ?? ''} — ${startTest.parameter.name_ar}` : ''}
        icon={<PlayArrowIcon />}
        onClose={() => setStartTest(null)}
        onSubmit={confirmStart}
        submitLabel="بدء الآن"
      >
        {startTest && (
          <>
            <Alert severity="info">
              سيتم تسجيل وقت البدء تلقائياً، ويتطلب التحليل إدارة محكمة لآلية التعامل (SOP).
            </Alert>
            {readiness(startTest).length > 0 ? (
              <Alert severity="error">لا يمكن بدء التحليل: {readiness(startTest)[0]}</Alert>
            ) : (
              <Alert severity="success">كافة شروط البدء متوفرة — جاهز للتنفيذ.</Alert>
            )}
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" fontWeight={700}>الفحص</Typography>
                <Typography variant="body2" color="text.secondary">{startTest.parameter.name_ar}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" fontWeight={700}>الجهاز</Typography>
                <FormSelect
                  label=""
                  value={exEquip}
                  onChange={setExEquip}
                  placeholder="اختر الجهاز (اختياري)"
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
        title="إدخال نتيجة الفحص"
        subtitle={resultTest ? `${resultTest.sampleNumber ?? ''} — ${resultTest.parameter.name_ar}` : ''}
        icon={<FactCheckIcon />}
        onClose={() => setResultTest(null)}
        onSubmit={submitResult}
        submitLabel="إرسال النتيجة للمراجعة"
        maxWidth="md"
      >
        {resultTest && (
          <>
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              المواصفة المرجعية: <b>{resultTest.parameter.reference_limit || '—'}</b>{' '}
              {resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''} — الطريقة:{' '}
              {resultTest.parameter.method || '—'}
            </Alert>
            <FormSelect
              label="نوع النتيجة"
              value={exResultType}
              onChange={setExResultType}
              options={[
                { value: 'numeric', label: 'رقمية' },
                { value: 'qualitative', label: 'نوعية (سالب/موجب)' },
                { value: 'range', label: 'مدى (من - إلى)' },
              ]}
            />
            {exResultType === 'numeric' && (
              <Stack direction="row" spacing={2}>
                <FormTextField
                  label={`النتيجة ${resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''}`}
                  type="number"
                  value={exValue}
                  onChange={(e) => setExValue(e.target.value)}
                  helperText={`الحد المرجعي: ${resultTest.parameter.reference_limit || '—'}`}
                />
              </Stack>
            )}
            {exResultType === 'qualitative' && (
              <FormSelect
                label="النتيجة النوعية"
                value={exQual}
                onChange={setExQual}
                options={[
                  { value: 'Negative', label: 'سالب (Negative)' },
                  { value: 'Positive', label: 'موجب (Positive)' },
                ]}
              />
            )}
            {exResultType === 'range' && (
              <Stack direction="row" spacing={2}>
                <FormTextField label="من" type="number" value={exMin} onChange={(e) => setExMin(e.target.value)} />
                <FormTextField label="إلى" type="number" value={exMax} onChange={(e) => setExMax(e.target.value)} />
              </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormSelect
                  label="الجهاز المستخدم"
                  value={exEquip}
                  onChange={setExEquip}
                  placeholder="اختر الجهاز"
                  options={equipment.map((e) => ({ value: e.id, label: e.name_ar }))}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label="رقم دفعة الكاشف (Lot)" value={exLot} onChange={(e) => setExLot(e.target.value)} />
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label="تاريخ صلاحية الكاشف" type="date" value={exExpiry} onChange={(e) => setExExpiry(e.target.value)} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <FormTextField label="الكمية المستخدمة" value={exQuantityUsed} onChange={(e) => setExQuantityUsed(e.target.value)} />
              </Box>
            </Stack>
            <FormTextField
              label="ملاحظات"
              multiline
              minRows={2}
              value={exNotes}
              onChange={(e) => setExNotes(e.target.value)}
            />

            <Alert
              severity={resultDecision === 'NON_COMPLIANT' ? 'error' : resultDecision ? 'success' : 'info'}
            >
              التقييم التلقائي: {resultDecision ? labDecision[resultDecision]?.label ?? resultDecision : 'يُحسب بعد إدخال النتيجة'}{' '}
              — لا يمكن للمحلل تجاوز التقييم الأوتوماتيكي مقابل المواصفة.
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <AppButton variant="secondary" onClick={saveDraft}>حفظ كمسودة</AppButton>
            </Stack>
          </>
        )}
      </FormDialog>

      {/* مراجعة الجودة QC */}
      <FormDialog
        open={Boolean(qcTest)}
        title="مراجعة الجودة (QC)"
        subtitle={qcTest ? `${qcTest.sampleNumber ?? ''} — ${qcTest.parameter.name_ar}` : ''}
        icon={<VerifiedIcon />}
        onClose={() => setQcTest(null)}
        onSubmit={submitQc}
        submitLabel="اعتماد QC"
      >
        {qcTest && (
          <>
            <Alert severity="info">
              راجع صحة قراءة النتيجة بالمقارنة مع الكاشف الضابط قبل الاعتماد.
            </Alert>
            <Box>
              <Typography variant="body2" fontWeight={800} mb={1}>
                النتيجة المسجلة
              </Typography>
              <Typography variant="h6" fontWeight={900} color="primary.main">
                {qcTest.result_value != null ? `${qcTest.result_value} ${qcTest.unit}` : qcTest.result_text || '—'}
              </Typography>
              {qcTest.reference_limit && (
                <Typography variant="body2" color="text.secondary">الحد المرجعي: {qcTest.reference_limit}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">القرار: {labDecision[qcTest.decision]?.label ?? qcTest.decision}</Typography>
            </Box>
            <FormSelect
              label="قرار الجودة"
              value={qcStatus}
              onChange={(v) => setQcStatus(v)}
              options={[
                { value: 'PASSED', label: 'مطابق — معتمد' },
                { value: 'FAILED', label: 'غير مطابق — يلزم التحقيق' },
              ]}
            />
            <FormTextField
              label="ملاحظات الجودة"
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
        emptyDescription="ستظهر البيانات هنا فور توفرها"
      />
    );
  };

  const renderSection = (key: NavKey) => {
    switch (key) {
      case 'home':
        return (
          <Stack spacing={2.5}>
            <Grid container spacing={1.5}>
              {stat('فحوصات جديدة', kpi.newTests, <AssignmentTurnedInIcon sx={{ color: 'primary.main' }} />)}
              {stat('قيد التنفيذ', kpi.inProgress, <PlayCircleIcon sx={{ color: 'info.main' }} />)}
              {stat('بانتظار المراجعة', kpi.submitted, <SendIcon sx={{ color: 'warning.main' }} />)}
              {stat('متأخرة (SLA)', kpi.overdue, <ScheduleIcon sx={{ color: 'error.main' }} />)}
              {stat('معتمدة', kpi.completed, <CheckCircleIcon sx={{ color: 'success.main' }} />)}
              {stat('مطلوبة QC', kpi.qcRequired, <FactCheckIcon sx={{ color: 'warning.main' }} />)}
              {stat('عاجلة', kpi.urgent, <LocalFireDepartmentIcon sx={{ color: 'error.main' }} />)}
              {stat('مستحقة اليوم', kpi.dueToday, <TodayIcon sx={{ color: 'info.main' }} />)}
              {stat('مُعادة للتصحيح', kpi.returned, <UndoIcon sx={{ color: 'warning.main' }} />)}
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1.5}>
                إجراءات سريعة
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <AppButton startIcon={<PlayArrowIcon />} onClick={() => setNav('samples.new')}>بدء فحص جديد</AppButton>
                <AppButton variant="secondary" startIcon={<FactCheckIcon />} onClick={() => setNav('qc.tasks')}>مهام الجودة</AppButton>
                <AppButton variant="secondary" startIcon={<ScheduleIcon />} onClick={() => setNav('sla')}>متابعة SLA</AppButton>
                <AppButton variant="secondary" startIcon={<PrecisionManufacturingIcon />} onClick={() => setNav('equipment')}>الأجهزة</AppButton>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>
                التنبيهات
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
                أقرب الاستحقاقات
              </Typography>
              {renderTestsTable(dueSoonRows.slice(0, 5), 'لا توجد فحوصات قريبة الاستحقاق', workColumns)}
            </Box>
          </Stack>
        );

      case 'samples.new':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS.new), 'لا توجد فحوصات جديدة بانتظار البدء');

      case 'samples.progress':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS.progress), 'لا توجد تحاليل قيد التنفيذ');

      case 'samples.review':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS.review), 'لا توجد نتائج بانتظار مراجعة رئيس القسم');

      case 'samples.returned':
        return (
          <Stack spacing={2}>
            {renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS.returned), 'لا توجد نتائج مُعادة لتصحيحها')}
            {myTests.filter(ANALYST_TEST_GROUPS.returned).length > 0 && (
              <Stack spacing={1}>
                {myTests.filter(ANALYST_TEST_GROUPS.returned).map((t) => (
                  <Alert key={t.id} severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography fontWeight={800} variant="body2">
                          {t.sampleNumber ?? ''} — {t.parameter.name_ar}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          سبب الإعادة: {returnReasonOf(t) || '—'}
                        </Typography>
                      </Box>
                      <AppButton size="small" onClick={() => openResult(t)}>تصحيح وإعادة</AppButton>
                    </Stack>
                  </Alert>
                ))}
              </Stack>
            )}
          </Stack>
        );

      case 'samples.completed':
        return renderTestsTable(myTests.filter(ANALYST_TEST_GROUPS.completed), 'لا توجد نتائج معتمدة بعد');

      case 'analysis.tests':
        return (
          <Grid container spacing={2}>
            {parameters.length === 0 && (
              <Grid item xs={12}>
                {renderEmpty('لا توجد فحوصات مسجلة في قسم الكيمياء')}
              </Grid>
            )}
            {parameters.map((p) => (
              <Grid item xs={12} sm={6} lg={4} key={p.id}>
                <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography fontWeight={900} variant="subtitle1">{p.name_ar}</Typography>
                    <StatusChip
                      label={p.is_active ? 'مفعّل' : 'موقوف'}
                      tone={p.is_active ? 'success' : 'error'}
                    />
                  </Stack>
                  {p.code && <Typography variant="caption" color="text.secondary">الكود: {p.code}</Typography>}
                  <Stack spacing={0.5} mt={1}>
                    {p.method && (
                      <Typography variant="body2" color="text.secondary">الطريقة: {p.method}</Typography>
                    )}
                    {p.unit && (
                      <Typography variant="body2" color="text.secondary">الوحدة: {p.unit}</Typography>
                    )}
                    {p.reference_limit && (
                      <Typography variant="body2" color="text.secondary">
                        الحد المرجعي: <b>{p.reference_limit}</b>
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        );

      case 'analysis.queue':
        return renderTestsTable(queueRows, 'لا توجد أعمال في قائمة الانتظار');

      case 'analysis.history':
        return renderTestsTable(historyRows, 'لا يوجد سجل نتائج بعد', resultColumns);

      case 'qc.tasks':
        return renderTestsTable(qcTasks, 'لا توجد مهام جودة حالياً');

      case 'qc.results':
        return renderTestsTable(qcDone, 'لا توجد نتائج جودة مسجلة بعد', resultColumns);

      case 'equipment':
        return (
          <Grid container spacing={2}>
            {equipment.length === 0 && (
              <Grid item xs={12}>
                {renderEmpty('لا توجد أجهزة مسجلة')}
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
                    {e.model_number && <Typography variant="caption" color="text.secondary">الموديل: {e.model_number}</Typography>}
                    <Stack spacing={0.5} mt={1}>
                      <Typography variant="body2" color="text.secondary">آخر معايرة: {e.last_calibrated ? formatDateTime(e.last_calibrated) : '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">المعايرة القادمة: {e.next_calibration_due ? formatDate(e.next_calibration_due) : '—'}</Typography>
                      {dueSoon && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                          قرب موعد المعايرة — راجع المسؤول
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
        return renderTestsTable(reagentRows, 'لا توجد كواشف مسجلة في النتائج', resultColumns);

      case 'specs':
        return (
          <Stack spacing={1.5}>
            <Alert severity="info">
              هذه المواصفات معتمدة ومرجعية للعرض فقط — لا يمكن تعديلها من شاشة المحلل.
            </Alert>
            {parameters.filter((p) => p.reference_limit).map((p) => (
              <Paper key={p.id} sx={{ p: 2, borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography fontWeight={900} variant="subtitle2">{p.name_ar}</Typography>
                    {p.method && <Typography variant="body2" color="text.secondary">الطريقة: {p.method}</Typography>}
                  </Box>
                  <Box textAlign="left">
                    <Typography fontWeight={900} color="primary.main">{p.reference_limit}{p.unit ? ` ${p.unit}` : ''}</Typography>
                    <Typography variant="caption" color="text.secondary">الحد المرجعي المعتمد</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
            {parameters.filter((p) => p.reference_limit).length === 0 && renderEmpty('لا توجد مواصفات مرجعية مسجلة')}
          </Stack>
        );

      case 'sla':
        return (
          <Stack spacing={2}>
            <Grid container spacing={1.5}>
              {stat('في الموعد', myTests.filter((t) => t.sla?.status === 'ON_TIME' || t.sla?.status === 'COMPLETED').length, <CheckCircleIcon sx={{ color: 'success.main' }} />)}
              {stat('قريب الاستحقاق', myTests.filter((t) => t.sla?.status === 'DUE_SOON').length, <ScheduleIcon sx={{ color: 'warning.main' }} />)}
              {stat('متأخرة', kpi.overdue, <ScheduleIcon sx={{ color: 'error.main' }} />)}
              {stat('مستحقة اليوم', kpi.dueToday, <TodayIcon sx={{ color: 'info.main' }} />)}
            </Grid>
            <Box>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>
                فحوصات قريبة/متجاوزة الاستحقاق
              </Typography>
              {renderTestsTable(dueSoonRows, 'لا توجد فحوصات قريبة الاستحقاق')}
            </Box>
          </Stack>
        );

      case 'results':
        return renderTestsTable(historyRows, 'لا توجد نتائج مُسجَّلة بعد', resultColumns);

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
              التقارير الرسمية وإصدار شهادات التحليل من اختصاص رئيس القسم — المحلل يعمل على تنفيذ الفحوصات فقط.
            </Alert>
            {renderEmpty('التقارير والشهادات غير متاحة في شاشة المحلل')}
          </Stack>
        );

      case 'settings':
        return (
          <Stack spacing={2}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={900} mb={1}>التفضيلات المتاحة</Typography>
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
              <Typography variant="subtitle1" fontWeight={900} mb={1.5}>صلاحيات مقيدة على شاشة المحلل</Typography>
              {SETTINGS_BLOCKED.map((s, i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <StatusChip label="مقيد" tone="error" />
                  <Typography variant="body2">{s.label}</Typography>
                </Stack>
              ))}
              <Alert severity="warning" sx={{ mt: 1 }}>
                هذه الإجراءات من اختصاص رئيس القسم / مدير المختبر وتُطبَّق تلقائياً على الحساب.
              </Alert>
            </Paper>
          </Stack>
        );

      case 'help':
        return (
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={900} mb={1.5}>دليل استخدام شاشة محلل قسم الكيمياء</Typography>
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
                قسم الكيمياء — واجهة المحلل
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label="الكيمياء"
            sx={{ fontWeight: 700, bgcolor: 'secondary.main', color: 'white' }}
          />
          <Chip
            size="small"
            icon={<CircleIcon sx={{ fontSize: 11, color: 'success.main' }} />}
            label="متصل"
            sx={{ fontWeight: 700, display: { xs: 'none', sm: 'flex' } }}
          />
          <IconButton aria-label="الحساب"
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
              {(user?.full_name || user?.email || '؟').charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, px: { xs: 1.5, md: 3 }, py: 2.5 }}>
        <DashboardHero
          eyebrow="قسم الكيمياء"
          title={groupOf(nav)?.label ?? 'لوحة المحلل'}
          subtitle={SUB_TITLES[nav]}
          gradient="emerald"
          avatarLabel={(user?.full_name || 'م').slice(0, 1)}
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
      title="تفاصيل العينة"
      subtitle={sample?.analysis_request_number ? `طلب: ${sample.analysis_request_number}` : ''}
      onClose={onClose}
      onSubmit={onClose}
      submitLabel="إغلاق"
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
            ['رقم العينة', sample.sample_number],
            ['نوع العينة', sample.sample_type],
            ['الأولوية', sample.priority_label || labPriority[sample.priority]?.label || sample.priority],
            ['سبب أخذ العينة', sample.sampling_reason_label || sample.sampling_reason],
            ['الجهة الطالبة', sample.requesting_department],
            ['المصدر', sample.source_name],
            ['حالة العينة', labSampleStatus[sample.status]?.label ?? sample.status],
            ['حالة المجموعة', sample.collection_status],
            ['الارتباط', sample.batch_number ? `دفعة: ${sample.batch_number}` : '—'],
            ['بلد المنشأ', sample.origin_country || '—'],
            ['الماركة', sample.brand || '—'],
            ['تاريخ الاستلام', sample.received_at ? formatDateTime(sample.received_at) : '—'],
          ].map(([k, v]) => (
            <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
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
