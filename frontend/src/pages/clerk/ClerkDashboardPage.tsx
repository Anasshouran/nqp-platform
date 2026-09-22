import { useCallback, useMemo, useRef, useState, useEffect, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import HomeIcon from '@mui/icons-material/Home';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ScienceIcon from '@mui/icons-material/Science';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import {
  createShipment,
  deleteShipment,
  getClerkStats,
  getPublicPorts,
  getShipments,
  getShipmentTimeline,
  submitShipment,
  uploadAttachment,
} from '../../api/endpoints/food';
import type { ClerkDashboardData, ClerkStats, FoodShipment, FoodShipmentEvent, PublicPort, ShipmentAttachment } from '../../types/food';
import type { PaginatedResponse } from '../../types/api';
import type { AxiosError } from 'axios';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess, notifyError } from '../../utils/toast';
import { resolveSamplingPolicy, riskGroupMeta } from './samplingPolicy';
import type { SamplingMatch } from './samplingPolicy';
import KpiCard from '../../components/dashboard/KpiCard';
import { DataTable, StatusChip } from '../../components/uikit';
import type { StatusTone } from '../../components/ui/StatusChip';
import { useServerTable, type DataTableFilterDef, type UseServerTableResult } from '../../hooks/useServerTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';

const SIDEBAR_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: <HomeIcon /> },
  { key: 'import', label: 'الوارد', icon: <MoveToInboxIcon /> },
  { key: 'export', label: 'الصادر', icon: <SendIcon /> },
  { key: 'requests', label: 'كل الطلبات', icon: <DescriptionIcon /> },
  { key: 'search', label: 'البحث', icon: <SearchIcon /> },
  { key: 'reports', label: 'التقارير', icon: <ReceiptLongIcon /> },
  { key: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
];

const WIZARD_STEPS = ['نوع الطلب', 'بيانات الشحنة', 'البيانات الحكومية', 'المستورد/المصدر', 'الأصناف', 'المستندات', 'الرسوم والعينات', 'المراجعة'];

type WizardStep = number;

type RequestType = 'IMPORT' | 'EXPORT';

const STATUS_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  DRAFT: { label: 'مسودة', color: 'default' },
  RECEIVED: { label: 'مستلم', color: 'info' },
  FEES_DUE: { label: 'بانتظار الرسوم', color: 'warning' },
  AWAITING_INSPECTION: { label: 'بانتظار التفتيش', color: 'primary' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', color: 'primary' },
  AWAITING_LAB_RESULTS: { label: 'بانتظار نتائج المعمل', color: 'info' },
  AWAITING_DECISION: { label: 'بانتظار القرار', color: 'warning' },
  RELEASED: { label: 'مُفرج عنه', color: 'success' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', color: 'success' },
  REJECTED: { label: 'مرفوض', color: 'error' },
  HOLD: { label: 'محجوز', color: 'warning' },
  RE_EXPORT: { label: 'إعادة تصدير', color: 'default' },
  DESTROYED: { label: 'متلف', color: 'error' },
};

const LIST_VIEW_META: Record<string, { title: string; subtitle: string }> = {
  requests: { title: 'كل الطلبات', subtitle: 'جميع طلبات رقابة الأغذية' },
  import: { title: 'الوارد', subtitle: 'طلبات استيراد المواد الغذائية' },
  export: { title: 'الصادر', subtitle: 'طلبات تصدير المواد الغذائية' },
};

const REQUESTS_PRESETS: Record<string, { label: string; status: string; fees_paid?: string }> = {
  drafts: { label: 'المسودات', status: 'DRAFT' },
  submitted: { label: 'بانتظار الرسوم', status: 'RECEIVED,FEES_DUE', fees_paid: 'false' },
  'under-review': { label: 'بانتظار المراجعة', status: 'FEES_DUE,RECEIVED', fees_paid: 'true' },
  inspection: { label: 'قيد الفحص', status: 'AWAITING_INSPECTION,UNDER_INSPECTION,AWAITING_LAB_RESULTS' },
  completed: { label: 'المُفرج عنها', status: 'RELEASED,CONDITIONAL_RELEASE,RE_EXPORT' },
  rejected: { label: 'المرفوضة', status: 'REJECTED,DESTROYED' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'RECEIVED', label: 'مستلم' },
  { value: 'FEES_DUE', label: 'بانتظار الرسوم' },
  { value: 'AWAITING_INSPECTION,UNDER_INSPECTION,AWAITING_LAB_RESULTS', label: 'قيد الفحص' },
  { value: 'AWAITING_DECISION', label: 'بانتظار القرار' },
  { value: 'RELEASED,CONDITIONAL_RELEASE,RE_EXPORT', label: 'مُفرج عنه / إفراج مشروط / إعادة تصدير' },
  { value: 'REJECTED,DESTROYED', label: 'مرفوض / متلف' },
  { value: 'HOLD', label: 'محجوز' },
];

const DOC_STATUS_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  UPLOADED: { label: 'مرفوع', color: 'default' },
  RECEIVED: { label: 'مستلم', color: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', color: 'primary' },
  ACCEPTED: { label: 'مقبول', color: 'success' },
  REJECTED: { label: 'مرفوض', color: 'error' },
  CORRECTION_REQUIRED: { label: 'يلزم تصحيح', color: 'warning' },
};

const STAGE_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  CREATED: { label: 'إنشاء', color: 'default' },
  DOCS_UPLOADED: { label: 'رفع المستندات', color: 'info' },
  DOCS_COMPLETE: { label: 'اكتمال المستندات', color: 'success' },
  SUBMITTED: { label: 'الإرسال', color: 'primary' },
  ADMIN_REVIEW: { label: 'مراجعة إدارية', color: 'primary' },
  REFERRED_TO_ACCOUNTANT: { label: 'إحالة للمحاسب', color: 'warning' },
  FEES_ASSESSED: { label: 'احتساب الرسوم', color: 'warning' },
  FEES_CONFIRMED: { label: 'تحصيل الرسوم', color: 'success' },
  REFERRED_TO_INSPECTOR: { label: 'إحالة للتفتيش', color: 'info' },
  INSPECTION: { label: 'تفتيش', color: 'primary' },
  SAMPLING: { label: 'سحب عينات', color: 'info' },
  LABORATORY: { label: 'المختبر', color: 'info' },
  AWAITING_DECISION: { label: 'بانتظار القرار', color: 'warning' },
  DECISION: { label: 'القرار النهائي', color: 'primary' },
  RELEASED: { label: 'إفراج', color: 'success' },
  REJECTED: { label: 'رفض', color: 'error' },
  CORRECTION: { label: 'تصحيح', color: 'warning' },
  OTHER: { label: 'أخرى', color: 'default' },
};

const counterpartyOf = (r: FoodShipment) =>
  (r.shipment_type === 'IMPORT' ? r.supplier_name : r.exporter_name) || r.supplier_name || '—';

const getErrMessage = (e: unknown, fallback: string) => {
  const err = e as AxiosError<{ message?: string }>;
  return err.response?.data?.message || fallback;
};

const statusTone = (s: string): StatusTone => {
  switch (s) {
    case 'DRAFT':
      return 'neutral';
    case 'RECEIVED':
    case 'AWAITING_LAB_RESULTS':
      return 'info';
    case 'FEES_DUE':
    case 'AWAITING_DECISION':
    case 'HOLD':
      return 'warning';
    case 'AWAITING_INSPECTION':
    case 'UNDER_INSPECTION':
      return 'primary';
    case 'RELEASED':
    case 'CONDITIONAL_RELEASE':
      return 'success';
    case 'REJECTED':
    case 'DESTROYED':
      return 'error';
    default:
      return 'neutral';
  }
};

const statusLabel = (s: string) => STATUS_META[s]?.label ?? s;

const shipmentTypeChip = (type: string) => (
  <StatusChip
    label={type === 'IMPORT' ? 'وارد' : 'صادر'}
    tone={type === 'IMPORT' ? 'primary' : 'info'}
    variant="outlined"
    showIcon={false}
  />
);

const isDraftRow = (r: FoodShipment) => r.status === 'DRAFT';

const ALERT_PRESET: Record<string, string> = {
  drafts: 'drafts',
  submitted: 'submitted',
  under_review: 'under-review',
  inspection: 'inspection',
  rejected: 'rejected',
};

const HEADER_META: Record<string, { title: string; subtitle: string }> = {
  search: { title: 'البحث', subtitle: 'ابحث في كل الطلبات برقم البيان، جمركي، بوليصة، مورد، باخرة…' },
  reports: { title: 'التقارير', subtitle: 'مؤشرات رقابة الأغذية من بيانات الطلبات' },
  settings: { title: 'الإعدادات', subtitle: 'تفضيلات الحساب والواجهة' },
};

const WORKLIST_COLUMNS: DataTableColumn<FoodShipment>[] = [
  {
    key: 'manifest_number',
    label: 'رقم البيان',
    sortable: true,
    render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</Typography>,
  },
  { key: 'shipment_type', label: 'النوع', render: (r) => shipmentTypeChip(r.shipment_type) },
  { key: 'counterparty', label: 'المستورد / المصدر', render: (r) => counterpartyOf(r), noWrap: true },
  { key: 'items', label: 'الأصناف', align: 'center', hideOnMobile: true, render: (r) => r.items.length },
  { key: 'total_weight_kg', label: 'الوزن (كجم)', sortable: true, align: 'center', hideOnMobile: true, render: (r) => Number(r.total_weight_kg || 0).toLocaleString('ar-EG') },
  { key: 'arrival_date', label: 'تاريخ الوصول', sortable: true, render: (r) => (r.arrival_date || '—').slice(0, 10) },
  {
    key: 'status',
    label: 'الحالة',
    render: (r) => <StatusChip label={statusLabel(r.status)} tone={statusTone(r.status)} />,
  },
];

const ClerkDashboardPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get('view') || 'home';
  const [activeView, setActiveViewState] = useState(urlView);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1000px)');
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');
  const [searchInput, setSearchInputLocal] = useState('');
  const [searchResults, setSearchResults] = useState<FoodShipment[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRun = useRef(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<RequestType>('IMPORT');
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<WizardStep>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const wizardContentRef = useRef<HTMLDivElement>(null);
  const [wizardItems, setWizardItems] = useState<WizardItem[]>([
    { name: 'أرز', brand: '—', origin: 'الهند', weight: '25 طن', quantity: '1,000', packageType: 'جوال', sampling: resolveSamplingPolicy('أرز', 'جوال') },
  ]);
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [stats, setStats] = useState<ClerkStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [wizardForm, setWizardForm] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<FoodShipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailView, setDetailView] = useState<FoodShipment | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const setActiveView = useCallback(
    (view: string) => {
      setActiveViewState(view);
      setSearchParams(view === 'home' ? {} : { view }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (urlView && urlView !== activeView) setActiveViewState(urlView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [statsRes, shipRes, portsRes] = await Promise.all([
        getClerkStats(),
        getShipments({ page_size: 100 }),
        getPublicPorts(),
      ]);
      setStats((statsRes.data.data as ClerkDashboardData).stats);
      const page = shipRes.data.data as PaginatedResponse<FoodShipment>;
      setShipments(page.results ?? []);
      if (Array.isArray(portsRes.data.data)) setPorts(portsRes.data.data as unknown as PublicPort[]);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل بيانات لوحة الكاتب'));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    wizardContentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [step]);

  const firstName = (user?.full_name || 'أحمد').split(' ')[0];
  const clerkName = user?.full_name || 'أحمد';

  const counts = useMemo(
    () => ({
      drafts: stats?.drafts ?? 0,
      submitted: stats?.submitted ?? 0,
      underReview: stats?.under_review ?? 0,
      inspection: stats?.inspection ?? 0,
      sampling: stats?.sampling ?? 0,
      labTesting: stats?.lab_testing ?? 0,
      finalReview: stats?.final_review ?? 0,
      completedToday: stats?.completed_today ?? 0,
      rejected: stats?.rejected ?? 0,
    }),
    [stats],
  );

  const table = useServerTable<FoodShipment>({ fetchData: getShipments });

  const [reqType, setReqType] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqFees, setReqFees] = useState('');
  const presetRef = useRef<string | null>(null);

  const changeReqType = (v: string) => { setReqType(v); table.setFilter('shipment_type', v); };
  const changeReqStatus = (v: string) => { setReqStatus(v); table.setFilter('status', v); };
  const changeReqFees = (v: string) => { setReqFees(v); table.setFilter('fees_paid', v); };

  const goToRequests = (preset?: string) => {
    presetRef.current = preset ?? null;
    setActiveView('requests');
  };

  const applyRequestsPreset = (key: string) => {
    const preset = REQUESTS_PRESETS[key];
    if (!preset) return;
    setReqStatus(preset.status);
    setReqFees(preset.fees_paid ?? '');
    setReqType('');
    table.setFilter('status', preset.status);
    if (preset.fees_paid) table.setFilter('fees_paid', preset.fees_paid);
  };

  const requestFilters: DataTableFilterDef[] =
    activeView === 'requests'
      ? [
          {
            key: 'shipment_type',
            label: 'النوع',
            value: reqType,
            onChange: changeReqType,
            options: [
              { value: '', label: 'النوع: الكل' },
              { value: 'IMPORT', label: 'وارد' },
              { value: 'EXPORT', label: 'صادر' },
            ],
          },
          {
            key: 'status',
            label: 'الحالة',
            value: reqStatus,
            onChange: changeReqStatus,
            options: STATUS_FILTER_OPTIONS,
          },
          {
            key: 'fees_paid',
            label: 'الرسوم',
            value: reqFees,
            onChange: changeReqFees,
            options: [
              { value: '', label: 'الرسوم: الكل' },
              { value: 'true', label: 'مسددة' },
              { value: 'false', label: 'غير مسددة' },
            ],
          },
        ]
      : [];

  const tabParams = (view: string): Record<string, string> => {
    switch (view) {
      case 'import':
        return { shipment_type: 'IMPORT' };
      case 'export':
        return { shipment_type: 'EXPORT' };
      default:
        return {};
    }
  };

  useEffect(() => {
    if (!['import', 'export', 'requests'].includes(activeView)) return;
    table.resetFilters();
    setReqType('');
    setReqStatus('');
    setReqFees('');
    const preset = activeView === 'requests' ? (presetRef.current ?? null) : null;
    presetRef.current = null;
    if (preset) {
      applyRequestsPreset(preset);
    } else {
      Object.entries(tabParams(activeView)).forEach(([key, value]) => table.setFilter(key, value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const q = searchInput.trim();
      if (!q) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
        return;
      }
      const runId = ++searchRun.current;
      setSearchLoading(true);
      setSearchError(null);
      try {
        const res = await getShipments({ search: q, page_size: 20 });
        if (searchRun.current !== runId) return;
        setSearchResults(res.data.data.results ?? []);
      } catch {
        if (searchRun.current !== runId) return;
        setSearchResults([]);
        setSearchError('تعذر البحث — تحقق من الاتصال بالخادم وحاول مجددًا');
      } finally {
        if (searchRun.current === runId) setSearchLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  })();

  const clerkAlerts = useMemo(
    () => [
      ...(stats?.drafts
        ? [{ id: 'drafts', tone: 'info' as const, title: 'مسودات غير مُرسلة', body: `${stats.drafts} مسودة بحاجة إلى إكمال وإرسال` }]
        : []),
      ...(stats?.submitted
        ? [{ id: 'submitted', tone: 'info' as const, title: 'طلبات مرسلة', body: `${stats.submitted} طلب بانتظار المحاسب` }]
        : []),
      ...(stats?.under_review
        ? [{ id: 'under_review', tone: 'warning' as const, title: 'تحتاج مراجعة', body: `${stats.under_review} طلب بانتظار مدير القسم` }]
        : []),
      ...(stats?.inspection
        ? [{ id: 'inspection', tone: 'success' as const, title: 'قيد الفحص', body: `${stats.inspection} طلب جاري فحصه حاليًا` }]
        : []),
      ...(stats?.rejected
        ? [{ id: 'rejected', tone: 'error' as const, title: 'طلبات مرفوضة', body: `${stats.rejected} طلب مرفوض يتطلب متابعة` }]
        : []),
      ...(!stats && !loadingData
        ? [{ id: 'none', tone: 'error' as const, title: 'لا توجد بيانات', body: 'تعذر جلب الإحصائيات من الخادم' }]
        : []),
    ],
    [stats, loadingData],
  );

  const openWizard = (type: RequestType) => {
    setWizardType(type);
    setStep(0);
    setWizardErrors({});
    setWizardOpen(true);
  };

  const requiredFieldsForStep = (s: number): Array<{ key: string; label: string }> => {
    if (s === 1) {
      const list: Array<{ key: string; label: string }> = [
        { key: 'port', label: 'ميناء الدخول/التخليص' },
        { key: 'origin_country', label: 'بلد المنشأ/الوجهة' },
        { key: 'arrival_date', label: wizardType === 'IMPORT' ? 'تاريخ الوصول' : 'تاريخ الشحن' },
      ];
      if (wizardType === 'IMPORT') {
        list.push({ key: 'vessel_name', label: 'اسم الباخرة/وسيلة النقل' });
        list.push({ key: 'bill_of_lading', label: 'رقم البوليصة' });
      }
      return list;
    }
    if (s === 3) {
      return [
        { key: 'supplier_name', label: 'اسم المورد/المصدر' },
        { key: 'exporter_name', label: 'اسم المستورد/الجهة المستوردة' },
      ];
    }
    return [];
  };

  const validateWizardStep = (s: number): boolean => {
    const errors: Record<string, string> = {};
    requiredFieldsForStep(s).forEach((f) => {
      if (!wizardForm[f.key]?.trim()) errors[f.key] = 'حقل إلزامي';
    });
    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearWizardError = (key: string) => {
    setWizardErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleWizardNext = () => {
    if (step === WIZARD_STEPS.length - 1) {
      setConfirmOpen(true);
      return;
    }
    if (!validateWizardStep(step)) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setRequesting(true);
    try {
      const payload: Record<string, unknown> = {
        shipment_type: wizardType,
        manifest_number: wizardForm.manifest_number?.trim() || '',
        port: wizardForm.port || undefined,
        supplier_name: wizardForm.supplier_name?.trim(),
        origin_country: wizardForm.origin_country?.trim(),
        arrival_date: wizardForm.arrival_date || undefined,
        customs_number: wizardForm.customs_number?.trim() || '',
        certificate_no: wizardForm.certificate_no?.trim() || '',
        vessel_name: wizardForm.vessel_name?.trim() || '',
        clearing_agent: wizardForm.clearing_agent?.trim() || '',
        bill_of_lading: wizardForm.bill_of_lading?.trim() || '',
        exporter_name: wizardForm.exporter_name?.trim() || '',
        transport_data: {},
        items: wizardItems
          .filter((it) => it.name && it.name !== '—')
          .map((it) => ({
            product_name: it.name,
            brand: it.brand === '—' ? '' : it.brand,
            origin: it.origin === '—' ? '' : it.origin,
            weight_kg: parseFloat(it.weight.replace(/[^\d.]/g, '')) || 0,
            package_count: parseInt(it.quantity.replace(/[^\d]/g, ''), 10) || 0,
            package_type: it.packageType,
          })),
      };
      const res = await createShipment(payload, true);
      await submitShipment(res.data.data.id, payload.items as never[]);
      notifySuccess(`تم إرسال طلب ${wizardType === 'IMPORT' ? 'الوارد' : 'الصادر'} — سيتم إشعار قسم الحسابات`);
      setConfirmOpen(false);
      setWizardOpen(false);
      setWizardForm({});
      setWizardErrors({});
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر إنشاء الطلب — تحقق من الحقول الإلزامية'));
    } finally {
      setRequesting(false);
    }
  };

  const submitAction = async (r: FoodShipment) => {
    if (isDraftRow(r)) {
      try {
        await submitShipment(r.id);
        notifySuccess(`تم إرسال الطلب ${r.manifest_number} لتحصيل الرسوم`);
        loadData();
        table.refresh();
      } catch (e) {
        notifyError(getErrMessage(e, 'تعذر إرسال الطلب'));
      }
      return;
    }
    setDetailView(r);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShipment(deleteTarget.id);
      notifySuccess('تم حذف المسودة');
      setDeleteTarget(null);
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'يمكن حذف المسودات فقط'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDocUpload = async (docType: string, file: File, shipmentId?: string) => {
    if (!shipmentId) {
      // إذا لم يكن هناك shipment بعد، نسجل فقط محلياً
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      notifySuccess(`تم تسجيل ${docType} — سيتم رفع الملف بعد إنشاء الطلب`);
      return;
    }
    setUploadingDoc(docType);
    try {
      await uploadAttachment(shipmentId, file, docType);
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      notifySuccess(`تم رفع ${docType} بنجاح`);
    } catch (e) {
      notifyError(getErrMessage(e, `تعذر رفع ${docType}`));
    } finally {
      setUploadingDoc(null);
    }
  };

  const docFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);

  const triggerDocFilePicker = (docType: string) => {
    if (uploadingDoc) return;
    setPendingDocType(docType);
    docFileRef.current?.click();
  };

  const handleDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docType = pendingDocType;
    e.target.value = '';
    setPendingDocType(null);
    if (file && docType) {
      void handleDocUpload(docType, file);
    }
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore logout API errors
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const isHome = activeView === 'home';
  const headerTitle = isHome ? 'الرئيسية' : (LIST_VIEW_META[activeView]?.title ?? HEADER_META[activeView]?.title ?? 'الرئيسية');
  const headerSubtitle = isHome ? `${greeting}، ${firstName} — رقابة المواد الغذائية` : (LIST_VIEW_META[activeView]?.subtitle ?? HEADER_META[activeView]?.subtitle ?? '');

  const actionCount = counts.drafts + counts.submitted + counts.underReview + counts.inspection + counts.rejected;

  const navItems = (collapsed: boolean) => (
    <>
      {SIDEBAR_ITEMS.filter((i) => i.key !== 'settings').map((item) => (
        <SidebarItem
          key={item.key}
          item={item}
          active={activeView === item.key}
          collapsed={collapsed}
          badge={item.key === 'requests' ? actionCount : undefined}
          onClick={() => { setActiveView(item.key); setMobileNavOpen(false); }}
        />
      ))}
      <Divider sx={{ my: 1 }} />
      {SIDEBAR_ITEMS.filter((i) => i.key === 'settings').map((item) => (
        <SidebarItem
          key={item.key}
          item={item}
          active={activeView === item.key}
          collapsed={collapsed}
          onClick={() => { setActiveView(item.key); setMobileNavOpen(false); }}
        />
      ))}
    </>
  );

  const notificationRail = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, minHeight: 56, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>التنبيهات</Typography>
        <IconButton size="small" onClick={() => setRailOpen(false)} aria-label="إغلاق لوحة التنبيهات" sx={{ borderRadius: 2 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
        <Stack spacing={1.25}>
          {clerkAlerts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>لا توجد تنبيهات حاليًا.</Typography>
          ) : (
            clerkAlerts.map((a) => (
              <Stack
                key={a.id}
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
                sx={{
                  p: 1.25,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(255,255,255,0.6)',
                  cursor: ALERT_PRESET[a.id] ? 'pointer' : 'default',
                  transition: 'border-color .15s ease',
                  '&:hover': ALERT_PRESET[a.id] ? { borderColor: 'primary.main' } : {},
                }}
                onClick={() => {
                  const preset = ALERT_PRESET[a.id];
                  if (preset) { setRailOpen(false); goToRequests(preset); }
                  if (a.id === 'none') { setRailOpen(false); loadData(); }
                }}
              >
                <NotificationDot tone={a.tone} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{a.body}</Typography>
                </Box>
              </Stack>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'rgba(16,40,34,0.02)' }}>
      {/* الشريط الجانبي — سطح المكتب */}
      {isDesktop && (
        <Box
          component="aside"
          sx={{
            width: navCollapsed ? 72 : 248,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderLeftColor: 'divider',
            bgcolor: 'background.paper',
            transition: 'width .18s ease',
            overflow: 'hidden',
          }}
        >
          {/* الشعار */}
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: navCollapsed ? 1 : 1.75, py: 1.5, minHeight: 64, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', flexShrink: 0 }}>
              <ScienceIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>رقابة الأغذية</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>لوحة الكاتب</Typography>
              </Box>
            )}
          </Stack>

          {/* التنقل */}
          <Stack sx={{ p: 1, gap: 0.5, flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
            {navItems(navCollapsed)}
          </Stack>

          {/* طي / تمديد */}
          <Stack direction="row" justifyContent="center" sx={{ p: 1, borderTop: '1px solid', borderTopColor: 'divider', flexShrink: 0 }}>
            <Tooltip title={navCollapsed ? 'توسيع الشريط' : 'طي الشريط'}>
              <IconButton onClick={() => setNavCollapsed((v) => !v)} size="small" aria-label={navCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'} sx={{ borderRadius: 2 }}>
                <MenuOpenIcon sx={{ transform: navCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* الشريط الجانبي — الجوال */}
      <Drawer open={!isDesktop && mobileNavOpen} onClose={() => setMobileNavOpen(false)} anchor="left" PaperProps={{ sx: { width: 252 } }}>
        <Stack sx={{ p: 1, pt: 1.5 }}>{navItems(false)}</Stack>
      </Drawer>

      {/* عمود المحتوى */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* الرأس */}
        <Paper
          elevation={0}
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            borderRadius: 0,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ px: { xs: 1.5, md: 2 }, py: 1, minHeight: 64 }}>
            {!isDesktop && (
              <IconButton size="small" onClick={() => setMobileNavOpen(true)} aria-label="فتح القائمة" sx={{ borderRadius: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, sm: 22 } }} noWrap>{headerTitle}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{headerSubtitle}</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="بحث سريع…"
              value={searchInput}
              onChange={(e) => { setSearchInputLocal(e.target.value); if (activeView !== 'search') setActiveView('search'); }}
              sx={{ width: { xs: '100%', sm: 240, md: 280 }, '& fieldset': { borderRadius: 2.5 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInputLocal('')} aria-label="مسح البحث" sx={{ borderRadius: 1.5 }}><CloseIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <Tooltip title={clerkAlerts.length ? `${clerkAlerts.length} تنبيه` : 'لا توجد تنبيهات'}>
              <IconButton size="medium" aria-label={`التنبيهات — ${clerkAlerts.length}`} onClick={() => setRailOpen((v) => !v)} sx={{ borderRadius: 2 }}>
                <Badge badgeContent={clerkAlerts.length} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon />}
              onClick={(e) => setNewMenuAnchor(e.currentTarget)}
              sx={{ borderRadius: 2.5, whiteSpace: 'nowrap' }}
            >
              طلب جديد
            </Button>
            <Menu
              anchorEl={newMenuAnchor}
              open={Boolean(newMenuAnchor)}
              onClose={() => setNewMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 180 } } }}
            >
              <MenuItem onClick={() => { setNewMenuAnchor(null); openWizard('IMPORT'); }}>
                <MoveToInboxIcon fontSize="small" sx={{ mr: 1.25, color: 'primary.main' }} /> طلب وارد
              </MenuItem>
              <MenuItem onClick={() => { setNewMenuAnchor(null); openWizard('EXPORT'); }}>
                <SendIcon fontSize="small" sx={{ mr: 1.25, color: '#8c6d1f' }} /> طلب صادر
              </MenuItem>
            </Menu>
            <Tooltip title="الملف الشخصي">
              <IconButton aria-label="قائمة المستخدم" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 700 }}>
                  {(user?.full_name || user?.email || '؟').charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 1.5, borderRadius: 3, minWidth: 220 } } }}
            >
              <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>{(user?.full_name || user?.email || '؟').charAt(0)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || 'كاتب رقابة الأغذية'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Food Control Clerk'}</Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/app/account'); }} sx={{ fontWeight: 700 }}>
                <AccountCircleIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} /> الملف الشخصي
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} /> تسجيل الخروج
              </MenuItem>
            </Menu>
          </Stack>
        </Paper>

        {/* المحتوى */}
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 }, maxWidth: 1600, width: '100%', mx: 'auto' }}>
          {activeView === 'home' && (
            <>
              {/* بطاقات الإحصائيات */}
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                <Grid item xs={12} sm={6} lg={3}>
                  <KpiCard label="المسودات" value={counts.drafts} icon={<DescriptionIcon />} hint="طلبات لم تُرسل" accent="#0c7f6a" onClick={() => goToRequests('drafts')} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <KpiCard label="بانتظار الرسوم" value={counts.submitted} icon={<PaidIcon />} hint="مرسلة للمحاسب" accent="#8c6d1f" onClick={() => goToRequests('submitted')} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <KpiCard label="بانتظار المراجعة" value={counts.underReview} icon={<FindInPageIcon />} hint="سُددت رسومها — لدى مدير القسم" accent="#6f5516" onClick={() => goToRequests('under-review')} />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <KpiCard label="قيد الفحص" value={counts.inspection} icon={<ScienceIcon />} hint="تفتيش ميداني ومعمل" accent="#12a585" onClick={() => goToRequests('inspection')} />
                </Grid>
              </Grid>

              {/* الرسوم البيانية */}
              <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid item xs={12} md={7}><PipelineCard counts={counts} /></Grid>
                <Grid item xs={12} md={5}><WeeklyActivityCard shipments={shipments} /></Grid>
              </Grid>

              {/* قائمة العمل */}
              <WorklistTable
                table={table}
                filters={requestFilters}
                title="جميع الطلبات"
                subtitle={`${table.count} طلب`}
                onAction={submitAction}
                onDelete={(r) => setDeleteTarget(r)}
                onSend={submitAction}
              />
            </>
          )}

          {LIST_VIEW_META[activeView] && (
            <WorklistTable
              table={table}
              filters={requestFilters}
              title={LIST_VIEW_META[activeView].title}
              subtitle={`${table.count} طلب`}
              onAction={submitAction}
              onDelete={(r) => setDeleteTarget(r)}
              onSend={submitAction}
            />
          )}

          {activeView === 'search' && (
            <>
              <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720, mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>البحث عن طلب</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    label="رقم الطلب، جمركي، بوليصة، مستورد، مصدر، باخرة"
                    value={searchInput}
                    onChange={(e) => setSearchInputLocal(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {recentSearches.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }} alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>عمليات البحث الأخيرة:</Typography>
                      {recentSearches.map((q) => (
                        <Chip key={q} label={q} size="small" variant="outlined" onClick={() => setSearchInputLocal(q)} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {searchInput.trim() && searchError && (
                <Alert severity="error" sx={{ mb: 2, maxWidth: 720 }}>{searchError}</Alert>
              )}

              {searchLoading ? (
                <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, maxWidth: 720 }}>
                  <Stack spacing={1.5}>
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} variant="rounded" height={64} />
                    ))}
                  </Stack>
                </Paper>
              ) : searchResults.length > 0 ? (
                <Stack spacing={1.25} sx={{ maxWidth: 720 }}>
                  {searchResults.map((r) => (
                    <Paper
                      key={r.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
                      }}
                      onClick={() => { setDetailView(r); setRecentSearches((prev) => Array.from(new Set([searchInput.trim(), ...prev])).slice(0, 5)); }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {counterpartyOf(r)} · {r.items.length} أصناف · {Number(r.total_weight_kg || 0).toLocaleString('ar-EG')} كجم · {(r.arrival_date || '—').slice(0, 10)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {shipmentTypeChip(r.shipment_type)}
                          <StatusChip label={statusLabel(r.status)} tone={statusTone(r.status)} />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : searchInput.trim() ? (
                <Box sx={{ maxWidth: 720, p: 3, textAlign: 'center' }}>
                  <Inventory2Icon sx={{ fontSize: 40, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>لا توجد نتائج مطابقة لـ «{searchInput.trim()}»</Typography>
                </Box>
              ) : null}
            </>
          )}

          {activeView === 'settings' && (
            <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الإعدادات</Typography>
                <Stack spacing={1}>
                  <SettingRow label="اللغة" value={lang === 'AR' ? 'العربية' : 'English'} onToggle={() => setLang(lang === 'AR' ? 'EN' : 'AR')} />
                  <SettingRow label="إشعارات الطلبات" value="مفعّلة" onToggle={() => notifySuccess('تم تبديل الإشعارات')} />
                  <SettingRow label="تنسيق الأرقام" value="عربي (ar-EG)" onToggle={() => notifySuccess('تم تبديل التنسيق')} />
                </Stack>
              </CardContent>
            </Card>
          )}

          {activeView === 'reports' && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التقارير — رقابة الأغذية</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>مؤشرات محسوبة من بيانات الطلبات الحالية.</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 3, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.04)' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <InfoIcon fontSize="small" color="info" />
                        <Typography variant="caption" color="text.secondary">
                          مؤشرات الوارد والصادر والرسوم تُحسب من أحدث {shipments.length} طلب محمّل في اللوحة.
                        </Typography>
                      </Stack>
                    </Paper>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6} lg={3}>
                        <KpiCard
                          label="الوارد"
                          value={shipments.filter((s) => s.shipment_type === 'IMPORT').length}
                          icon={<MoveToInboxIcon />}
                          hint="من الطلبات المحمّلة"
                          accent="#0c7f6a"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <KpiCard
                          label="الصادر"
                          value={shipments.filter((s) => s.shipment_type === 'EXPORT').length}
                          icon={<SendIcon />}
                          hint="من الطلبات المحمّلة"
                          accent="#0a6b58"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <KpiCard label="المسودات" value={counts.drafts} icon={<EditIcon />} hint="بانتظار الإرسال" accent="#8c6d1f" />
                      </Grid>
                      <Grid item xs={12} sm={6} lg={3}>
                        <KpiCard
                          label="إجمالي الرسوم"
                          value={`${shipments.reduce((sum, s) => sum + Number(s.fee_preview?.total ?? 0), 0).toLocaleString('ar-EG')} ج.س`}
                          icon={<PaidIcon />}
                          hint="تقديرية — من الطلبات المحمّلة"
                          accent="#6f5516"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التوزيع حسب الحالة</Typography>
                    <Stack spacing={1.5}>
                      {[
                        { label: 'مسودات', value: counts.drafts, color: '#8c6d1f' },
                        { label: 'بانتظار الرسوم', value: counts.submitted, color: '#6f5516' },
                        { label: 'بانتظار المراجعة', value: counts.underReview, color: '#a86400' },
                        { label: 'قيد الفحص', value: counts.inspection, color: '#0c7f6a' },
                        { label: 'بانتظار المعدل', value: counts.sampling, color: '#12a585' },
                        { label: 'مرفوضة', value: counts.rejected, color: '#c63a3a' },
                      ].map((row) => (
                        <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التوزيع حسب وسيلة النقل</Typography>
                    <Stack spacing={1.5}>
                      {[
                        { label: 'بحري (باخرة)', icon: <DirectionsBoatIcon />, count: shipments.filter((s) => s.vessel_name && !s.vessel_name.includes('شاحنة') && !s.vessel_name.includes('طائرة') && !s.vessel_name.includes('جوي')).length },
                        { label: 'بري (شاحنة)', icon: <LocalShippingIcon />, count: shipments.filter((s) => s.vessel_name?.includes('شاحنة')).length },
                        { label: 'جوي (طائرة)', icon: <FlightIcon />, count: shipments.filter((s) => s.vessel_name?.includes('طائرة') || s.vessel_name?.includes('جوي') || s.vessel_name?.includes('طيران')).length },
                      ].map((row) => (
                        <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{row.icon}</Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.count}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Paper variant="outlined" sx={{ p: 1.5, mt: 2, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.04)' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <InfoIcon fontSize="small" color="info" />
                        <Typography variant="caption" color="text.secondary">التقارير مبنية على بيانات الطلبات الحالية — يمكن تصديرها كـ PDF أو Excel.</Typography>
                      </Stack>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

        </Box>
      </Box>

      {/* لوحة التنبيهات — سطح المكتب */}
      {isDesktop && (
        <Box
          component="aside"
          sx={{
            width: railOpen ? 320 : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width .2s ease',
            position: 'sticky',
            top: 0,
            height: '100vh',
            borderRight: railOpen ? '1px solid' : 'none',
            borderRightColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {notificationRail}
        </Box>
      )}

      {/* لوحة التنبيهات — الجوال */}
      <Drawer open={!isDesktop && railOpen} onClose={() => setRailOpen(false)} anchor="left" PaperProps={{ sx: { width: 320 } }}>
        {notificationRail}
      </Drawer>

      {/* Wizard إنشاء الطلب */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: wizardType === 'IMPORT' ? 'primary.main' : 'secondary.main' }}>
              {wizardType === 'IMPORT' ? <MoveToInboxIcon fontSize="small" /> : <SendIcon fontSize="small" />}
            </Box>
            إنشاء طلب {wizardType === 'IMPORT' ? 'وارد' : 'صادر'} — {clerkName}
          </Stack>
          <IconButton aria-label="إغلاق" onClick={() => setWizardOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers ref={wizardContentRef}>
          <Stepper
            activeStep={step}
            alternativeLabel
            sx={{
              mb: 3,
              '& .MuiStepLabel-label': { fontWeight: 700 },
              '& .MuiStepLabel-iconContainer .MuiSvgIcon-root': { fontSize: 26 },
              '& .MuiStepConnector-line': { borderTopWidth: 2 },
            }}
          >
            {WIZARD_STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
          <LinearProgress
            variant="determinate"
            value={((step + 1) / WIZARD_STEPS.length) * 100}
            sx={{
              mb: 3,
              borderRadius: 2,
              height: 8,
              bgcolor: 'rgba(16,40,34,0.06)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: wizardType === 'IMPORT' ? 'linear-gradient(90deg,#0c7f6a,#12a585)' : 'linear-gradient(90deg,#8c6d1f,#b18b2f)',
              },
            }}
          />

          {step === 0 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">اختر نوع الطلب لتظهر الحقول الخاصة به:</Typography>
              <Grid container spacing={2}>
                {([
                  { key: 'IMPORT', icon: <MoveToInboxIcon />, title: 'طلب وارد', desc: 'استيراد مواد غذائية إلى البلاد — شهادات منشأ وصحية وجمركية', selected: wizardType === 'IMPORT', accent: 'primary' },
                  { key: 'EXPORT', icon: <SendIcon />, title: 'طلب صادر', desc: 'تصدير مواد غذائية للخارج — توثيق الشحنات الصادرة', selected: wizardType === 'EXPORT', accent: 'secondary' },
                ] as const).map((c) => (
                  <Grid key={c.key} item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant={c.selected ? 'contained' : 'outlined'}
                      color={c.accent}
                      onClick={() => setWizardType(c.key)}
                      sx={{
                        py: 3,
                        px: 2.5,
                        borderRadius: 3.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.25,
                        textTransform: 'none',
                        background: c.selected
                          ? c.key === 'IMPORT'
                            ? 'linear-gradient(135deg,#0c7f6a,#12a585)'
                            : 'linear-gradient(135deg,#8c6d1f,#b18b2f)'
                          : undefined,
                        boxShadow: c.selected ? (c.key === 'IMPORT' ? '0 10px 24px rgba(12,127,106,0.3)' : '0 10px 24px rgba(140,109,31,0.3)') : 'none',
                        transition: 'all .15s ease',
                        '&:hover': { transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ fontSize: 34, lineHeight: 1 }}>{c.icon}</Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.title}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.25 }}>{c.desc}</Typography>
                      </Box>
                      {c.selected && <Chip size="small" label="مُختار" sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.22)' }} />}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>بيانات الشحنة والنقل</Typography>
              <Grid container spacing={2}>
                {wizardType === 'IMPORT' ? (
                  <>
                    <WizardField label="رقم البيان" placeholder="IMP-2026-00001 (اختياري — يُولَّد تلقائيًا)" fieldKey="manifest_number" form={wizardForm} onChange={setWizardForm} />
                    <WizardField label="اسم الباخرة / وسيلة النقل" placeholder="مثال: SSV Nile Crown" required fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.vessel_name} clearError={clearWizardError} />
                    <WizardField label="رقم البوليصة" placeholder="BL-XXXXX" required fieldKey="bill_of_lading" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.bill_of_lading} clearError={clearWizardError} />
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        type="date"
                        label="تاريخ الوصول"
                        fullWidth
                        required
                        error={Boolean(wizardErrors.arrival_date)}
                        helperText={wizardErrors.arrival_date}
                        InputLabelProps={{ shrink: true }}
                        value={wizardForm.arrival_date ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="ميناء الدخول"
                        select
                        required
                        fullWidth
                        error={Boolean(wizardErrors.port)}
                        value={wizardForm.port ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                        helperText={wizardErrors.port || 'حقل إلزامي — يُملأ من نطاق حسابك'}
                      >
                        {ports.map((p) => (
                          <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <WizardField label="بلد المنشأ" placeholder="مثال: الهند" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                  </>
                ) : (
                  <>
                    <WizardField label="وسيلة النقل" placeholder="باخرة / شاحنة / قطار / طائرة" fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} />
                    <WizardField label="بلد الوجهة" placeholder="المرسل إليه" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        type="date"
                        label="تاريخ الشحن"
                        fullWidth
                        required
                        error={Boolean(wizardErrors.arrival_date)}
                        helperText={wizardErrors.arrival_date}
                        InputLabelProps={{ shrink: true }}
                        value={wizardForm.arrival_date ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="ميناء التخليص"
                        select
                        required
                        fullWidth
                        error={Boolean(wizardErrors.port)}
                        value={wizardForm.port ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                        helperText={wizardErrors.port || 'حقل إلزامي'}
                      >
                        {ports.map((p) => (
                          <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </>
                )}
              </Grid>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>البيانات الحكومية والجمركية</Typography>
              <Typography variant="body2" color="text.secondary">البيانات الحكومية مطلوبة لاعتماد المعاملة — يُفضل مراجعة المستندات الأصلية.</Typography>
              <Grid container spacing={2}>
                <WizardField label="رقم البيان الجمركي" placeholder="C-XXXXX" fieldKey="customs_number" form={wizardForm} onChange={setWizardForm} />
                <WizardField label="رقم الشهادة الصحية / الاعتماد" placeholder="CC-XXXXX" fieldKey="certificate_no" form={wizardForm} onChange={setWizardForm} />
                <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
              </Grid>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(140,109,31,0.05)', borderColor: 'rgba(140,109,31,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    رقم البيان الجمركي يُدخل يدويًا حالياً — سيتم ربطه تلقائيًا مع customs API في الإصدار القادم.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>بيانات المستورد / المصدر</Typography>
              <Grid container spacing={2}>
                {wizardType === 'IMPORT' ? (
                  <>
                    <WizardField label="اسم المورد / الشركة الموردة" placeholder="ابحث في دليل المؤسسات أو اكتب الاسم مباشرة" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                    <WizardField label="اسم المستورد (الشركة المستوردة)" placeholder="اسم الجهة المستوردة" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                    <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
                  </>
                ) : (
                  <>
                    <WizardField label="اسم المصدر / الشركة المصدرة" placeholder="ابحث في دليل المؤسسات" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                    <WizardField label="اسم المستورد (الجهة المستوردة)" placeholder="المرسل إليه" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                  </>
                )}
              </Grid>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary">
                    يُنصح بإدخال الاسم التجاري + الرقم الضريبي للربط المستقبلي بمحرك المخاطر.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 4 && (
            <WizardItems items={wizardItems} setItems={setWizardItems} />
          )}

          {step === 5 && (
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>المستندات المطلوبة</Typography>
              <Typography variant="body2" color="text.secondary">المستندات الإلزامية الناقصة تمنع الإرسال — يُمكنك رفع الملفات لاحقًا.</Typography>
              {[
                { name: 'البيان الجمركي', docType: 'CUSTOMS_DECLARATION', required: true },
                { name: 'الشهادة الصحية', docType: 'HEALTH_CERT', required: true },
                { name: 'شهادة المنشأ', docType: 'ORIGIN_CERT', required: true },
                { name: 'الفاتورة التجارية', docType: 'INVOICE', required: true },
                { name: 'Packing List', docType: 'PACKING_LIST', required: true },
                { name: 'بوليصة الشحن (AWB/B/L)', docType: 'BILL_OF_LADING', required: true },
                { name: 'شهادة التحليل المعملي', docType: 'LAB_REPORT', required: false },
                { name: 'مستند إضافي', docType: 'OTHER', required: false },
              ].map((d) => {
                const isUploaded = uploadedDocs[d.docType];
                const isUploading = uploadingDoc === d.docType;
                return (
                <Stack key={d.name} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AttachFileIcon fontSize="small" color={isUploaded ? 'success' : d.required ? 'warning' : 'disabled'} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                    {d.required && !isUploaded && <Chip label="إلزامي" size="small" color="warning" variant="outlined" sx={{ ml: 0.5 }} />}
                  </Stack>
                  {isUploaded ? (
                    <Chip label="مرفوع" size="small" color="success" variant="outlined" />
                   ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<AttachFileIcon />}
                      disabled={isUploading}
                      onClick={() => triggerDocFilePicker(d.docType)}
                    >
                      {isUploading ? 'جارٍ الرفع...' : 'رفع ملف'}
                    </Button>
                  )}
                </Stack>
              );
              })}
              <input
                ref={docFileRef}
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={handleDocFileChange}
              />
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="info" />
                  <Typography variant="caption" color="text.secondary">
                    يُمكنك الإرسال بدون المستندات الاختيارية — سيتم طلبها من المفتش لاحقًا إذا لزم الأمر.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 6 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'info.main' }}>الرسوم (حساب تلقائي — النظام)</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', borderColor: 'rgba(12,127,106,0.4)', bgcolor: 'rgba(12,127,106,0.04)' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <PaidIcon fontSize="small" color="info" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>تُحتسب تلقائيًا بعد الإرسال</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    تُحسب الرسوم حسب نوع الشحنة والكميات عند استلام الطلب في قسم الحسابات — لا يمكن تعديلها يدويًا، وتظهر هنا وفي صفحة الطلب فور احتسابها.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>سياسة العينات (حساب تلقائي — النظام)</Typography>
                {wizardItems.length === 0 ? (
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed rgba(16,40,34,0.2)' }}>
                    <Typography variant="body2" color="text.secondary">لم تُضف أصناف بعد — تُحسب سياسة العينات تلقائيًا لكل صنف.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {wizardItems.map((it, i) => {
                      const s = it.sampling;
                      return (
                        <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.6)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {it.name}</Typography>
                            {s && <Chip size="small" color={riskGroupMeta(s.risk_group).color} label={`${s.sampling_rate} — ${riskGroupMeta(s.risk_group).label}`} sx={{ bgcolor: 'transparent', fontWeight: 700 }} />}
                          </Stack>
                          {s ? (
                            <>
                              <Typography variant="body2">عدد العينات: <b>{s.quantity}</b></Typography>
                              {s.package_size && <Typography variant="body2">حجم العبوة المعتمدة: {s.package_size}</Typography>}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{s.sampling_conditions}</Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">لا تتطلب عينة — فحص ظاهري فقط</Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Grid>
            </Grid>
          )}

          {step === 7 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>مراجعة الطلب والإرسال</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1, bgcolor: 'rgba(12,127,106,0.04)' }}>
                <Stack spacing={0.75}>
                  {['بيانات الشحنة والنقل', 'البيانات الحكومية', 'المستورد / المصدر', 'الأصناف والمنتجات', 'المستندات المرفوعة', 'الرسوم المستحقة', 'سياسة العينات'].map((item) => (
                    <Stack key={item} direction="row" alignItems="center" spacing={1}>
                      <CheckCircleIcon fontSize="small" color="success" />
                      <Typography variant="body2">{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <WarningAmberIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>بعض المستندات الإلزامية غير مرفوعة — سيتم طلبها من المفتش بعد الإرسال.</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>السابق</Button>
          <Box sx={{ flexGrow: 1 }} />
          {step < WIZARD_STEPS.length - 1 && (
            <Button variant="contained" onClick={handleWizardNext}>التالي</Button>
          )}
          {step === WIZARD_STEPS.length - 1 && (
            <Button variant="contained" color="success" startIcon={<SendIcon />} onClick={handleWizardNext}>
              إرسال للمراجعة
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* تأكيد الإرسال */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>تأكيد إرسال الطلب</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            سيتم إنشاء البيان وإرساله لتحصيل الرسوم مع إشعار قسم الحسابات. بعد الإرسال لن تتمكن من تعديل الطلب. هل أنت متأكد؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={requesting}>إلغاء</Button>
          <Button variant="contained" color="success" startIcon={<SendIcon />} disabled={requesting} onClick={handleSubmit}>
            {requesting ? 'جارٍ الإرسال…' : 'تأكيد الإرسال'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد حذف المسودة */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف المسودة"
        message={`هل أنت متأكد من حذف المسودة «${deleteTarget?.manifest_number ?? ''}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* عرض تفصيلي للطلب */}
      <ShipmentDetailView shipment={detailView} onClose={() => setDetailView(null)} onAction={submitAction} />
    </Box>
  );
};

/* ============================ قطع فرعية ============================ */

const NotificationDot = ({ tone }: { tone: 'error' | 'warning' | 'success' | 'info' }) => {
  const meta = {
    error: { color: 'error.main', label: 'خطأ', Icon: ErrorOutlineIcon },
    warning: { color: 'warning.main', label: 'تنبيه', Icon: WarningAmberIcon },
    success: { color: 'success.main', label: 'نجاح', Icon: CheckCircleIcon },
    info: { color: 'info.main', label: 'معلومة', Icon: InfoIcon },
  }[tone];
  return (
    <Tooltip title={meta.label}>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          mt: 0.35,
          flexShrink: 0,
          color: meta.color,
          bgcolor: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        }}
      >
        <meta.Icon sx={{ fontSize: 15 }} aria-hidden="true" />
      </Box>
    </Tooltip>
  );
};

const SidebarItem = ({
  item,
  active,
  collapsed,
  onClick,
  badge,
}: {
  item: { key: string; label: string; icon: React.ReactNode };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number | undefined;
}) => (
  <Tooltip title={collapsed ? item.label : ''} placement="left-start">
    <Button
      fullWidth
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      variant={active ? 'contained' : 'text'}
      color={active ? 'primary' : 'inherit'}
      startIcon={item.icon}
      sx={{
        justifyContent: collapsed ? 'center' : 'space-between',
        px: collapsed ? 0 : 1.25,
        minHeight: 42,
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: active ? 800 : 700,
        fontSize: 13.5,
        '& .MuiButton-startIcon': { ml: collapsed ? 0 : -0.5 },
      }}
    >
      {!collapsed && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, textAlign: 'right' }}>
          <span>{item.label}</span>
          {badge != null && badge > 0 && (
            <Chip size="small" color="warning" label={badge} sx={{ height: 20, minWidth: 20, fontSize: 11, fontWeight: 700 }} />
          )}
        </Box>
      )}
      {collapsed && badge != null && badge > 0 && <Badge color="warning" variant="dot" />}
    </Button>
  </Tooltip>
);

type QueueCounts = { drafts: number; submitted: number; underReview: number; inspection: number; rejected: number };

const PIPELINE_STAGES: Array<{ key: keyof QueueCounts; label: string; color: string }> = [
  { key: 'drafts', label: 'مسودات', color: '#0c7f6a' },
  { key: 'submitted', label: 'بانتظار الرسوم', color: '#8c6d1f' },
  { key: 'underReview', label: 'بانتظار المراجعة', color: '#a86400' },
  { key: 'inspection', label: 'قيد الفحص', color: '#12a585' },
  { key: 'rejected', label: 'مرفوضة', color: '#c63a3a' },
];

const PipelineCard = ({ counts }: { counts: QueueCounts }) => {
  const total = PIPELINE_STAGES.reduce((s, st) => s + (counts[st.key] ?? 0), 0);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>مسار الطلبات</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>توزيع الطلبات الجارية حسب المرحلة</Typography>
        {total === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>لا توجد طلبات جارية حاليًا.</Typography>
        ) : (
          <>
            <Stack direction="row" sx={{ height: 14, borderRadius: 3, overflow: 'hidden', mb: 1.75 }}>
              {PIPELINE_STAGES.map((st) => {
                const v = counts[st.key] ?? 0;
                return v > 0 ? <Box key={st.key} sx={{ width: `${(v / total) * 100}%`, bgcolor: st.color }} /> : null;
              })}
            </Stack>
            <Stack spacing={1}>
              {PIPELINE_STAGES.map((st) => {
                const v = counts[st.key] ?? 0;
                return (
                  <Stack key={st.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: st.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{st.label}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {v} <Typography component="span" variant="caption" color="text.secondary">({total ? Math.round((v / total) * 100) : 0}٪)</Typography>
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const WEEK_LABEL = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' });

const WeeklyActivityCard = ({ shipments }: { shipments: FoodShipment[] }) => {
  const week = useMemo(() => {
    const days: Array<{ label: string; count: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = shipments.filter((s) => (s.submitted_at || '').slice(0, 10) === key).length;
      days.push({ label: WEEK_LABEL.format(d), count });
    }
    return days;
  }, [shipments]);
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>نشاط الأسبوع</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>الطلبات المُرسلة خلال آخر 7 أيام</Typography>
        <Stack direction="row" alignItems="flex-end" spacing={1.25} useFlexGap sx={{ flex: 1, minHeight: 120, mt: 'auto' }}>
          {week.map((d) => (
            <Stack key={d.label + d.count} sx={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }} spacing={0.5}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.count}</Typography>
              <Box
                sx={{
                  width: '62%',
                  height: d.count ? Math.max(6, Math.round((d.count / max) * 88)) : 4,
                  borderRadius: 2,
                  bgcolor: d.count ? 'primary.main' : 'rgba(16,40,34,0.08)',
                }}
                title={`${d.label}: ${d.count}`}
              />
              <Typography variant="caption" color="text.secondary" noWrap>{d.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

const WorklistTable = ({
  table,
  filters,
  title,
  subtitle,
  onAction,
  onDelete,
  onSend,
}: {
  table: UseServerTableResult<FoodShipment>;
  filters: DataTableFilterDef[];
  title: string;
  subtitle: string;
  onAction: (r: FoodShipment) => void;
  onDelete: (r: FoodShipment) => void;
  onSend: (r: FoodShipment) => void;
}) => (
  <DataTable<FoodShipment>
    columns={WORKLIST_COLUMNS}
    rows={table.rows}
    rowKey={(r) => r.id}
    count={table.count}
    page={table.page}
    rowsPerPage={table.rowsPerPage}
    pageSizeOptions={table.pageSizeOptions}
    loading={table.loading}
    error={table.error}
    filters={filters}
    title={title}
    subtitle={subtitle}
    searchInput={table.searchInput}
    onSearchChange={table.setSearchInput}
    searchPlaceholder="بحث برقم البيان، جمركي، بوليصة، مورد، باخرة…"
    sortBy={table.sortBy}
    sortOrder={table.sortOrder}
    onSortChange={table.setSorting}
    onPageChange={table.setPage}
    onRowsPerPageChange={table.setRowsPerPage}
    onRefresh={table.refresh}
    emptyTitle="لا توجد طلبات"
    emptyDescription="لم يتم العثور على طلبات تطابق هذه المعايير"
    actions={(r) => (
      <>
        {isDraftRow(r) && (
          <Tooltip title="إرسال لتحصيل الرسوم">
            <IconButton aria-label="إرسال" size="medium" color="success" onClick={() => onSend(r)} sx={{ borderRadius: 2 }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isDraftRow(r) ? 'مسودة — قابلة للتعديل والحذف' : 'مشاهدة'}>
          <IconButton aria-label="تعديل" size="medium" color={isDraftRow(r) ? 'primary' : 'default'} onClick={() => onAction(r)} sx={{ borderRadius: 2 }}>
            {isDraftRow(r) ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        {isDraftRow(r) && (
          <IconButton aria-label="حذف" size="medium" color="error" onClick={() => onDelete(r)} sx={{ borderRadius: 2 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </>
    )}
  />
);

const ShipmentDetailView = ({
  shipment,
  onClose,
  onAction,
}: {
  shipment: FoodShipment | null;
  onClose: () => void;
  onAction: (r: FoodShipment) => void;
}) => {
  const canEditShipment = Boolean(shipment && shipment.status === 'DRAFT');

  return (
    <Dialog open={Boolean(shipment)} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: shipment?.shipment_type === 'IMPORT' ? 'primary.main' : 'secondary.main' }}>
            {shipment?.shipment_type === 'IMPORT' ? <MoveToInboxIcon fontSize="small" /> : <SendIcon fontSize="small" />}
          </Box>
          <Box>
            <Typography>طلب {shipment?.shipment_type === 'IMPORT' ? 'وارد' : 'صادر'}</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{shipment?.manifest_number}</Typography>
          </Box>
        </Stack>
        <IconButton aria-label="إغلاق" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {shipment && (
          <>
            {/* الحالة */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <StatusChip label={statusLabel(shipment.status)} tone={statusTone(shipment.status)} />
              {shipment.submitted_at && (
                <Typography variant="body2" color="text.secondary">
                  تم الإرسال: {shipment.submitted_at.slice(0, 16).replace('T', ' ')}
                </Typography>
              )}
              {shipment.fees_paid && <Chip size="small" color="success" variant="outlined" label="الرسوم مسددة" />}
            </Stack>

            {/* البيانات الأساسية */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>البيانات الأساسية</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">المنفذ: <b>{shipment.port_name || shipment.port || '—'}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">{shipment.shipment_type === 'IMPORT' ? 'المورد' : 'المستورد'}: <b>{counterpartyOf(shipment)}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">بلد المنشأ: <b>{shipment.origin_country || '—'}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">تاريخ الوصول: <b>{(shipment.arrival_date || '—').slice(0, 10)}</b></Typography>
                </Grid>
                {shipment.vessel_name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">الباخرة/الوسيلة: <b>{shipment.vessel_name}</b></Typography>
                  </Grid>
                )}
                {shipment.bill_of_lading && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">رقم البوليصة: <b>{shipment.bill_of_lading}</b></Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* الأصناف */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>الأصناف ({shipment.items.length})</Typography>
                <Chip size="small" variant="outlined" color={shipment.samples_required ? 'warning' : 'success'} label={`${shipment.samples_required} عينة مطلوبة`} />
              </Stack>
              <Stack spacing={1}>
                {shipment.items.map((item, index) => (
                  <Stack key={item.id || index} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{index + 1}. {item.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[item.brand, item.origin, item.package_type, `عدد ${item.package_count}`, `${Number(item.weight_kg || 0).toLocaleString('ar-EG')} كجم`].filter((v) => v && v !== '—').join(' · ')}
                      </Typography>
                    </Box>
                    <Badge badgeContent={item.package_count} color="info">
                      <Chip label={item.package_type} size="small" variant="outlined" />
                    </Badge>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* المستندات */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>المستندات ({shipment.attachments.length})</Typography>
              <Stack spacing={0.5}>
                {shipment.attachments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">لا توجد مرفقات.</Typography>
                ) : (
                  shipment.attachments.map((a) => <DocRow key={a.id} doc={a} />)
                )}
                {!shipment.attachments.some((a) => a.doc_type === 'INVOICE') && <DocRow name="الفاتورة التجارية" required />}
                {!shipment.attachments.some((a) => a.doc_type === 'ORIGIN_CERT') && <DocRow name="شهادة المنشأ" required />}
              </Stack>
            </Paper>

            {/* التسلسل الزمني للطلب */}
            <RequestTimeline shipmentId={shipment.id} />

            {/* الرسوم */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>الرسوم (تلقائي)</Typography>
              {shipment.fee_preview.exempt ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Typography variant="body2">معفاة من الرسوم حسب نوع الرسالة</Typography>
                </Stack>
              ) : (
                <Stack spacing={0.5}>
                  {shipment.fee_preview.lines.map((line, i) => (
                    <FeeRow key={i} label={line.name} value={`${Number(line.fee).toLocaleString('ar-EG')} جنيه`} />
                  ))}
                  <Divider sx={{ my: 0.5 }} />
                  <FeeRow label="الإجمالي" value={`${Number(shipment.fee_preview.total).toLocaleString('ar-EG')} جنيه`} bold />
                </Stack>
              )}
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        {shipment && canEditShipment && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => { onClose(); onAction(shipment); }}>
            تعديل
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const DocRow = ({ doc, name, required }: { doc?: ShipmentAttachment; name?: string; required?: boolean }) => {
  const label = name || doc?.doc_type_label || doc?.doc_type || '';
  const status = doc?.status;
  const meta = status ? (DOC_STATUS_META[status] ?? { label: status, color: 'default' as const }) : null;
  const uploaded = Boolean(doc);
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: '1px solid rgba(16,40,34,0.08)',
        bgcolor: uploaded ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'all .15s ease',
        '&:hover': { borderColor: meta?.color === 'error' ? 'error.main' : 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: uploaded ? (meta?.color === 'error' ? 'error.main' : 'success.main') : required ? 'warning.main' : 'text.disabled',
            bgcolor: 'rgba(16,40,34,0.04)',
          }}
        >
          <AttachFileIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{label}</Typography>
          {required && !uploaded && (
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>مستند إلزامي ناقص</Typography>
          )}
        </Box>
      </Stack>
      {meta ? (
        <Chip label={meta.label} size="small" color={meta.color} variant={uploaded ? 'filled' : 'outlined'} sx={{ fontWeight: 700, flexShrink: 0 }} />
      ) : (
        <Chip
          size="small"
          variant="outlined"
          color={uploaded ? 'success' : required ? 'warning' : 'default'}
          label={uploaded ? 'مرفوع' : required ? 'مطلوب' : 'غير مرفوع'}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        />
      )}
    </Stack>
    {doc?.rejected_reason && (
      <Typography
        variant="caption"
        color="error"
        sx={{ display: 'block', mt: 0.75, pr: 2, bgcolor: 'rgba(198,58,58,0.05)', borderRadius: 1.5, p: 1, border: '1px solid rgba(198,58,58,0.15)' }}
      >
        سبب الرفض: {doc.rejected_reason}
      </Typography>
    )}
    </>
  );
};

const RequestTimeline = ({ shipmentId }: { shipmentId: string }) => {
  const [events, setEvents] = useState<FoodShipmentEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getShipmentTimeline(shipmentId);
      const data = res.data?.data ?? res.data ?? [];
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (shipmentId) loadTimeline();
  }, [shipmentId, loadTimeline]);

  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at || a.id).getTime() - new Date(b.occurred_at || b.id).getTime(),
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid rgba(16,40,34,0.07)' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(27,122,110,0.12)', color: 'primary.main' }}>
            <ReceiptLongIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>التسلسل الزمني للطلب</Typography>
        </Stack>
        <Tooltip title="تحديث">
          <IconButton size="small" onClick={loadTimeline} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {loading ? 'جارٍ التحميل…' : 'لا توجد أحداث بعد.'}
        </Typography>
      ) : (
        <Stack spacing={0} sx={{ mt: 0.5 }}>
          {sorted.map((e, i) => {
            const meta = STAGE_META[e.stage] ?? { label: e.stage_label || e.stage, color: 'default' as const };
            const isLast = i === sorted.length - 1;
            return (
              <Stack key={e.id} direction="row" spacing={2}>
                <Stack alignItems="center" sx={{ minWidth: 18 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      mt: 0.7,
                      border: '3px solid',
                      borderColor: `${meta.color}.main`,
                      bgcolor: isLast ? `${meta.color}.main` : '#fff',
                      boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color}.main 15%, transparent)`,
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && (
                    <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', borderRadius: 2, my: 0.5 }} />
                  )}
                </Stack>
                <Box
                  sx={{
                    pb: isLast ? 0 : 2,
                    minWidth: 0,
                    flexGrow: 1,
                    ...(i % 2 === 1
                      ? {
                          p: 1.25,
                          borderRadius: 2.5,
                          mb: isLast ? 0 : 1,
                          bgcolor: 'rgba(16,40,34,0.03)',
                          border: '1px solid rgba(16,40,34,0.06)',
                        }
                      : {}),
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={meta.label} size="small" color={meta.color} sx={{ fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary">
                      {e.occurred_at ? new Date(e.occurred_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </Typography>
                  </Stack>
                  {e.message && (
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary' }}>{e.message}</Typography>
                  )}
                  {e.actor_name && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">بواسطة:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{e.actor_name}</Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};

const FeeRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>{label}</Typography>
    <Typography variant={bold ? 'h6' : 'body2'} sx={{ fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Stack>
);

const SettingRow = ({ label, value, onToggle }: { label: string; value: string; onToggle: () => void }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)' }}>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Button size="small" variant="outlined" onClick={onToggle} sx={{ borderRadius: 2 }}>
      {value}
    </Button>
  </Stack>
);

const WizardField = ({
  label,
  placeholder,
  fieldKey,
  form,
  onChange,
  required,
  errorText,
  clearError,
}: {
  label: string;
  placeholder?: string;
  fieldKey: string;
  form: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  required?: boolean;
  errorText?: string;
  clearError?: (key: string) => void;
}) => (
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      size="small"
      label={label}
      placeholder={placeholder}
      value={form[fieldKey] ?? ''}
      onChange={(e) => {
        onChange((p) => ({ ...p, [fieldKey]: e.target.value }));
        clearError?.(fieldKey);
      }}
      required={required}
      error={Boolean(errorText)}
      helperText={errorText || (required ? 'حقل إلزامي' : undefined)}
    />
  </Grid>
);

const PACKAGE_OPTIONS = ['جوال', 'براميل', 'طرد', 'كرتون', 'عبوة', 'صندوق', 'أخرى'];

const SMART_ITEMS: string[] = ['أرز', 'زيت عباد الشمس', 'سكر', 'دقيق قمح', 'شاي', 'عدس', 'فول', 'قهوة', 'مكرونة', 'سمن', 'لحوم مجمدة', 'دواجن مجمدة', 'حليب مجفف', 'صلصة طماطم', 'تمر'];

const SMART_BRANDS: Record<string, string[]> = {
  أرز: ['بسمتي', 'سيلا', 'الأصيل', 'أمة الري'],
  'زيت عباد الشمس': ['الشروق', 'عافية', 'سنبلة'],
  سكر: ['الكنانة', 'العربي', 'السكر السوداني'],
  'دقيق قمح': ['الفاخر', 'قوطة', 'كواكر'],
  شاي: ['الليبتون', 'أحمد', 'المصنع'],
  عدس: ['فرسان', 'الهلال'],
  فول: ['النيل الأزرق', 'السمراء'],
  قهوة: ['شركوب', 'سودانيز'],
  'مكرونة': ['رويال', 'جلال'],
  تمر: ['خلاص', 'برحي', 'بارنس'],
  'حليب مجفف': ['نيدو', 'الرهيب'],
  'لحوم مجمدة': ['علياء', 'سوكورو'],
  'دواجن مجمدة': ['الجوهرة', 'الفرح'],
  'صلصة طماطم': ['الطازج', 'راما'],
};

const SUGGESTION_BANNER_ITEMS: Array<{ item: string; brand: string; origin: string }> = [
  { item: 'أرز', brand: 'بسمتي', origin: 'الهند' },
  { item: 'زيت عباد الشمس', brand: 'الشروق', origin: 'السودان' },
  { item: 'سكر', brand: 'الكنانة', origin: 'السودان' },
  { item: 'دقيق قمح', brand: 'الفاخر', origin: 'تركيا' },
  { item: 'شاي', brand: 'الليبتون', origin: 'كينيا' },
];

type WizardItem = { name: string; brand: string; origin: string; weight: string; quantity: string; packageType: string; sampling?: SamplingMatch | null };

const WizardItems = ({ items, setItems }: { items: WizardItem[]; setItems: React.Dispatch<React.SetStateAction<WizardItem[]>> }) => {
  const [form, setForm] = useState<WizardItem>({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [itemsErrors, setItemsErrors] = useState<{ name?: string; quantity?: string }>({});

  const update = (key: keyof WizardItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (key === 'name' || key === 'quantity') setItemsErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const smartBrands = useMemo(() => {
    const fromCatalog = SMART_BRANDS[form.name.trim()] ?? [];
    const prompt = form.brand.trim().toLowerCase();
    const fromPrompt = prompt
      ? SMART_ITEMS.flatMap((it) => SMART_BRANDS[it] ?? []).filter((b) => b.toLowerCase().includes(prompt))
      : [];
    return Array.from(new Set([...fromCatalog, ...fromPrompt])).slice(0, 12);
  }, [form.name, form.brand]);

  const smartItems = useMemo(() => {
    const prompt = form.name.trim().toLowerCase();
    return prompt
      ? SMART_ITEMS.filter((it) => it.toLowerCase().includes(prompt)).slice(0, 12)
      : SMART_ITEMS.slice(0, 8);
  }, [form.name]);

  const applySuggestion = (s: { item: string; brand: string; origin: string }) => {
    setForm((prev) => ({ ...prev, ...s }));
    notifySuccess(`اقتراح ذكي: ${s.item} — ${s.brand}`);
  };

  const add = () => {
    const errors: { name?: string; quantity?: string } = {};
    if (!form.name.trim()) errors.name = 'يرجى إدخال اسم الصنف';
    if (!form.quantity.trim()) errors.quantity = 'يرجى إدخال العدد';
    setItemsErrors(errors);
    if (errors.name || errors.quantity) return;
    const next: WizardItem = {
      name: form.name.trim(),
      brand: form.brand.trim() || '—',
      origin: form.origin.trim() || '—',
      weight: form.weight.trim() || '—',
      quantity: form.quantity.trim(),
      packageType: form.packageType || PACKAGE_OPTIONS[0],
      sampling: resolveSamplingPolicy(form.name.trim(), form.packageType || PACKAGE_OPTIONS[0]),
    };
    if (editingIndex !== null) {
      setItems((prev) => prev.map((it, i) => (i === editingIndex ? next : it)));
      setEditingIndex(null);
      notifySuccess('تم تعديل الصنف');
    } else {
      setItems((prev) => [...prev, next]);
      notifySuccess('تمت إضافة الصنف');
    }
    setForm({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
    setItemsErrors({});
  };

  const startEdit = (index: number) => {
    const it = items[index];
    setForm({ ...it });
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setForm({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
  };

  const confirmDelete = () => {
    if (deleteIndex === null) return;
    setItems((prev) => prev.filter((_, idx) => idx !== deleteIndex));
    if (editingIndex === deleteIndex) cancelEdit();
    setDeleteIndex(null);
    notifySuccess('تم حذف الصنف');
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length > 0) {
      listRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [items.length]);

  return (
    <Stack spacing={2}>
      {/* اقتراحات ذكية */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(12,127,106,0.04)', borderColor: 'rgba(12,127,106,0.25)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main' }}>
            <ScienceIcon fontSize="small" />
          </Box>
          <Stack>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>اقتراحات ذكية</Typography>
            <Typography variant="caption" color="text.secondary">اقتراح أصناف متكررة تلقائيًا — اضغط لملء الحقول بسرعة</Typography>
          </Stack>
        </Stack>
        <Grid container spacing={1}>
          {SUGGESTION_BANNER_ITEMS.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.item}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="info"
                onClick={() => applySuggestion(s)}
                sx={{ justifyContent: 'space-between', borderRadius: 2, textTransform: 'none' }}
              >
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.item}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.brand} · {s.origin}</Typography>
                </Box>
                <AddIcon fontSize="small" />
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.6)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>إضافة صنف</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              size="small"
              value={form.name}
              onInputChange={(_, v) => {
                setForm((p) => ({ ...p, name: v }));
                if (v.trim()) setItemsErrors((p) => ({ ...p, name: undefined }));
              }}
              options={smartItems}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="اسم الصنف"
                  required
                  error={Boolean(itemsErrors.name)}
                  helperText={itemsErrors.name || 'حقل إلزامي'}
                  placeholder="ابدأ الكتابة لعرض الاقتراحات…"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              size="small"
              value={form.brand}
              onInputChange={(_, v) => setForm((p) => ({ ...p, brand: v }))}
              options={smartBrands}
              renderInput={(params) => <TextField {...params} label="الماركة" placeholder="مثال: بسمتي" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="المنشأ" value={form.origin} onChange={update('origin')} fullWidth placeholder="مثال: الهند" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="الوزن" value={form.weight} onChange={update('weight')} fullWidth placeholder="مثال: 25 طن" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="العدد" value={form.quantity} onChange={update('quantity')} fullWidth required error={Boolean(itemsErrors.quantity)} helperText={itemsErrors.quantity || 'حقل إلزامي'} placeholder="مثال: 1,000" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="نوع العبوة" value={form.packageType} onChange={update('packageType')} fullWidth select>
              {PACKAGE_OPTIONS.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              {editingIndex !== null && (
                <Button variant="outlined" color="inherit" onClick={cancelEdit} sx={{ borderRadius: 2.5 }}>
                  إلغاء التعديل
                </Button>
              )}
              <Button variant="contained" fullWidth startIcon={editingIndex !== null ? <EditIcon /> : <AddIcon />} onClick={add} sx={{ borderRadius: 2.5 }}>
                {editingIndex !== null ? 'حفظ تعديلات الصنف' : 'إضافة الصنف'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {items.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Inventory2Icon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">لم تُضف أي أصناف بعد.</Typography>
        </Box>
      ) : (
        <Stack spacing={1} ref={listRef}>
          {items.map((it, i) => (
            <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {it.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[it.brand, it.origin, it.packageType, `عدد ${it.quantity}`, it.weight].filter((v) => v && v !== '—').join(' · ')}
                </Typography>
                {it.sampling ? (
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      color={riskGroupMeta(it.sampling.risk_group).color}
                      label={`${it.sampling.sampling_rate} — ${riskGroupMeta(it.sampling.risk_group).label}`}
                      sx={{ bgcolor: 'transparent', fontWeight: 700 }}
                    />
                    <Chip size="small" variant="outlined" label={`${it.sampling.quantity} عينة`} />
                  </Stack>
                ) : (
                  <Chip size="small" variant="outlined" label="لا تتطلب عينة (فحص ظاهري)" sx={{ mt: 0.5 }} />
                )}
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Badge badgeContent={it.quantity} color="info">
                  <Chip label={it.packageType} size="small" variant="outlined" />
                </Badge>
                <IconButton aria-label="تعديل" size="small" color={editingIndex === i ? 'primary' : 'default'} onClick={() => startEdit(i)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteIndex(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>حذف الصنف</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            هل أنت متأكد من حذف الصنف «{deleteIndex !== null ? items[deleteIndex]?.name : ''}»؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteIndex(null)}>إلغاء</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={confirmDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ClerkDashboardPage;
