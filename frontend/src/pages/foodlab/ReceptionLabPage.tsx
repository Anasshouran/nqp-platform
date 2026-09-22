import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import BiotechIcon from '@mui/icons-material/Biotech';
import ArchiveIcon from '@mui/icons-material/Archive';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';
import DeleteIcon from '@mui/icons-material/Delete';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BlockIcon from '@mui/icons-material/Block';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { logout as logoutApi } from '../../api/endpoints/auth';
import type { AppDispatch } from '../../store/store';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
import {
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  acceptSample,
  conditionalAcceptSample,
  createLabSample,
  createReferenceSample,
  discardReferenceSample,
  getCustodyEvents,
  getFoodProducts,
  getLabSample,
  getLabSamples,
  getReceptionDashboard,
  getReferenceSamples,
  getSampleSources,
  rejectSample,
  retrieveReferenceSample,
  transferSample,
} from '../../api/endpoints/foodlab';
import type {
  ChainOfCustody,
  FoodProduct,
  FoodSample,
  ReceptionDashboard,
  ReferenceSample,
  SampleSource,
} from '../../types/food';
import { labBench, labPriority, labReception, labSampleStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import PrintBarcodeDialog from './PrintBarcodeDialog';
import { SampleDetailDialog } from './FoodLabPage';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <DashboardIcon fontSize="small" /> },
  { id: 'workflow', label: 'سير العمل', icon: <ScheduleIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <NotificationsActiveIcon fontSize="small" /> },
] as const;

/* ---------- ثوابت الواجهة ---------- */

type NavKey =
  | 'home'
  | 'receive.incoming' | 'receive.register' | 'receive.pending'
  | 'verify.request' | 'verify.data'
  | 'barcode.create' | 'barcode.print'
  | 'deliver.ready' | 'deliver.log'
  | 'samples' | 'rejected' | 'alerts' | 'reports' | 'settings' | 'help';

interface NavLeaf { key: NavKey; label: string; }
interface NavGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: NavLeaf[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  { key: 'home', label: 'الرئيسية', icon: <DashboardIcon />, children: [{ key: 'home', label: 'لوحة الاستلام' }] },
  {
    key: 'receive', label: 'استلام العينات', icon: <AddIcon />, children: [
      { key: 'receive.incoming', label: 'العينات الواردة' },
      { key: 'receive.register', label: 'تسجيل عينة جديدة' },
      { key: 'receive.pending', label: 'العينات المعلقة' },
    ],
  },
  {
    key: 'verify', label: 'التحقق من العينات', icon: <FactCheckIcon />, children: [
      { key: 'verify.request', label: 'التحقق من الطلب' },
      { key: 'verify.data', label: 'التحقق من البيانات' },
    ],
  },
  {
    key: 'barcode', label: 'الباركود والملصقات', icon: <QrCode2Icon />, children: [
      { key: 'barcode.create', label: 'إنشاء Barcode' },
      { key: 'barcode.print', label: 'طباعة الملصق' },
    ],
  },
  {
    key: 'deliver', label: 'تسليم العينات', icon: <LocalShippingIcon />, children: [
      { key: 'deliver.ready', label: 'جاهزة للتسليم' },
      { key: 'deliver.log', label: 'سجل التسليم' },
    ],
  },
  { key: 'samples', label: 'سجل العينات', icon: <BiotechIcon />, children: [{ key: 'samples', label: 'السجل الكامل' }] },
  { key: 'rejected', label: 'العينات المرفوضة', icon: <BlockIcon />, children: [{ key: 'rejected', label: 'المرفوضة' }] },
  { key: 'alerts', label: 'التنبيهات', icon: <NotificationsActiveIcon />, children: [{ key: 'alerts', label: 'التنبيهات' }] },
  { key: 'reports', label: 'التقارير', icon: <AssessmentIcon />, children: [{ key: 'reports', label: 'التقارير' }] },
];

const FOOTER_NAV_ITEMS: NavLeaf[] = [
  { key: 'settings', label: 'الإعدادات' },
  { key: 'help', label: 'المساعدة' },
];

const groupOf = (key: NavKey): NavGroup | undefined => SIDEBAR_GROUPS.find((g) => g.children.some((c) => c.key === key));

const CHECKLIST_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'label', label: 'العينة تحمل بطاقة تعريف' },
  { key: 'package_intact', label: 'العبوة سليمة' },
  { key: 'no_leak', label: 'العينة غير متسربة' },
  { key: 'quantity_ok', label: 'الكمية كافية' },
  { key: 'data_match', label: 'بيانات العينة مطابقة للطلب' },
  { key: 'stored_ok', label: 'العينة محفوظة بطريقة مناسبة' },
  { key: 'seal_match', label: 'رقم العينة / الختم مطابق' },
];

const REJECT_REASONS = [
  'العبوة تالفة',
  'الكمية غير كافية',
  'بيانات غير مطابقة',
  'العينة منتهية',
  'درجة حرارة غير مناسبة',
  'لا يوجد طلب تحليل',
  'عدم وجود تعريف للعينة',
  'سبب آخر',
];

const CLASSIFICATION_OPTIONS = [
  { value: 'ANALYSIS', label: 'للتحليل' },
  { value: 'REFERENCE', label: 'مرجعية' },
];

const STATION_OPTIONS = ['المطار', 'المنطقة الحرة', 'الميناء الشمالي', 'الميناء الجنوبي', 'ميناء أوسيف', 'ميناء الأمير عثمان دقنة'].map((s) => ({ value: s, label: s }));

const PACKAGING_TYPES = ['أكياس', 'براميل', 'كراتين', 'عبوات زجاجية', 'عبوات معدنية', 'أخرى'].map((s) => ({ value: s, label: s }));

const PACKAGING_CONDITIONS = ['سليمة', 'ممتازة', 'تالفة جزئياً', 'تالفة'].map((s) => ({ value: s, label: s }));

const QUANTITY_UNITS = ['كجم', 'جم', 'لتر', 'مل', 'عدد'].map((u) => ({ value: u, label: u }));

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'عادية' },
  { value: 'HIGH', label: 'عالية' },
  { value: 'URGENT', label: 'عاجلة' },
];

const REF_RETENTION_REASONS = ['لإعادة الفحص عند الطعن', 'بدائل للمراجعة', 'أخرى'].map((s) => ({ value: s, label: s }));

const emptyChecklist = () => Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false]));

interface WizardState {
  open: boolean;
  step: 1 | 2 | 3;
  lookupKey: string;
  lookupBusy: boolean;
  matchedSample: FoodSample | null;
  lookupMessage: string;
  source: string;
  sampleType: string;
  analysisRequestNumber: string;
  requestingDepartment: string;
  classification: string;
  station: string;
  inspectorName: string;
  priority: string;
  brand: string;
  originCountry: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  quantity: string;
  quantityUnit: string;
  unitsCount: string;
  packagingType: string;
  packagingCondition: string;
  temperature: string;
  refOriginalNumber: string;
  refRetentionReason: string;
  refStorageTemp: string;
  refStorageLocation: string;
  refRetentionDuration: string;
  refQuantity: string;
  refNotes: string;
  checklist: Record<string, boolean>;
  decision: 'accept' | 'conditional' | 'reject';
  rejectionReason: string;
  rejectionNotes: string;
  receptionNotes: string;
  busy: boolean;
}

const emptyWizard = (sourceId: string): WizardState => ({
  open: false,
  step: 1,
  lookupKey: '',
  lookupBusy: false,
  matchedSample: null,
  lookupMessage: '',
  source: sourceId,
  sampleType: '',
  analysisRequestNumber: '',
  requestingDepartment: '',
  classification: 'ANALYSIS',
  station: '',
  inspectorName: '',
  priority: 'NORMAL',
  brand: '',
  originCountry: '',
  batchNumber: '',
  productionDate: '',
  expiryDate: '',
  quantity: '',
  quantityUnit: '',
  unitsCount: '',
  packagingType: '',
  packagingCondition: '',
  temperature: '',
  refOriginalNumber: '',
  refRetentionReason: '',
  refStorageTemp: '',
  refStorageLocation: '',
  refRetentionDuration: '',
  refQuantity: '',
  refNotes: '',
  checklist: emptyChecklist(),
  decision: 'accept',
  rejectionReason: '',
  rejectionNotes: '',
  receptionNotes: '',
  busy: false,
});

interface RefFormState {
  product: string;
  origin: string;
  originalSample: string;
  quantity: string;
  retentionReason: string;
  storageTemp: string;
  storage: string;
  seal: string;
  coding: string;
  remarks: string;
}

const emptyRefForm = (): RefFormState => ({
  product: '',
  origin: '',
  originalSample: '',
  quantity: '',
  retentionReason: '',
  storageTemp: '',
  storage: '',
  seal: '',
  coding: '',
  remarks: '',
});

const FoodDataTable = <T extends { id: string },>({
  columns, table, title,
}: {
  columns: DataTableColumn<T>[];
  table: ReturnType<typeof useServerTable<T>>;
  title?: string;
}) => (
  <DataTable<T>
    columns={columns}
    rows={table.rows}
    rowKey={(r) => r.id}
    count={table.count}
    page={table.page}
    rowsPerPage={table.rowsPerPage}
    pageSizeOptions={table.pageSizeOptions}
    loading={table.loading}
    error={table.error}
    title={title}
    search={table.search}
    searchInput={table.searchInput}
    onSearchChange={table.setSearchInput}
    sortBy={table.sortBy}
    sortOrder={table.sortOrder}
    onSortChange={table.setSorting}
    onPageChange={table.setPage}
    onRowsPerPageChange={table.setRowsPerPage}
    onRefresh={table.refresh}
  />
);

/* ---------- الصفحة الرئيسية ---------- */

const ReceptionLabPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [nav, setNav] = useState<NavKey>('home');
  const [dash, setDash] = useState<ReceptionDashboard | null>(null);
  const [sources, setSources] = useState<SampleSource[]>([]);
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [references, setReferences] = useState<ReferenceSample[]>([]);
  const [wizard, setWizard] = useState<WizardState>(() => emptyWizard(''));

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples });
  const pendingSamples = useServerTable<FoodSample>({ fetchData: (p) => getLabSamples({ ...p, reception_status: 'RECEIVED' }) });
  const rejectedSamples = useServerTable<FoodSample>({ fetchData: (p) => getLabSamples({ ...p, reception_status: 'REJECTED' }) });
  const readySamples = useServerTable<FoodSample>({ fetchData: (p) => getLabSamples({ ...p, reception_status: 'ACCEPTED' }) });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [barcodeSample, setBarcodeSample] = useState<FoodSample | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_GROUPS.map((g) => [g.key, true])),
  );

  const [refOpen, setRefOpen] = useState(false);
  const [refForm, setRefForm] = useState<RefFormState>(emptyRefForm);

  const refreshDash = useCallback(() => {
    getReceptionDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshSources = useCallback(() => {
    getSampleSources().then((r) => setSources(r.data.data)).catch(() => undefined);
  }, []);

  const refreshProducts = useCallback(() => {
    getFoodProducts({ is_active: true, page_size: 500 })
      .then((r) => setProducts(r.data.data.results))
      .catch(() => undefined);
  }, []);

  const refreshReferences = useCallback(() => {
    getReferenceSamples().then((r) => setReferences(r.data.data)).catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    samples.refresh();
    pendingSamples.refresh();
    rejectedSamples.refresh();
    readySamples.refresh();
    refreshReferences();
  }, [refreshDash, samples, pendingSamples, rejectedSamples, readySamples, refreshReferences]);

  useEffect(() => {
    refreshDash();
    refreshSources();
    refreshProducts();
    refreshReferences();
  }, [refreshDash, refreshSources, refreshProducts, refreshReferences]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [dash]);

  const alerts = useMemo(() => {
    const list: Array<{ sample: FoodSample; reason: string }> = [];
    for (const s of samples.rows) {
      if ((s.priority === 'HIGH' || s.priority === 'URGENT') && (s.reception_status === 'RECEIVED' || s.reception_status === 'CONDITIONALLY_ACCEPTED')) {
        list.push({
          sample: s,
          reason: s.priority === 'URGENT' ? 'عينة عاجلة بانتظار قرار الاستلام' : 'عينة عالية الأولوية بانتظار المراجعة',
        });
      }
    }
    return list;
  }, [samples.rows]);

  const receivedToday = useMemo(
    () => samples.rows.filter((s) => s.received_at && s.received_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    [samples.rows],
  );

  const openWizard = () => {
    setWizard({ ...emptyWizard(sources[0]?.id ?? ''), open: true });
  };

  const selectNav = (key: NavKey) => {
    if (key === 'receive.register') { openWizard(); return; }
    const group = groupOf(key);
    if (group && group.key === 'receive') setExpanded((e) => ({ ...e, receive: true }));
    setNav(key);
  };

  const toggleGroup = (key: string) => {
    const group = SIDEBAR_GROUPS.find((g) => g.key === key);
    if (!group) return;
    const activeIn = groupOf(nav)?.key === key;
    if (activeIn) {
      setExpanded((e) => ({ ...e, [key]: !(e[key] ?? false) }));
    } else {
      setExpanded((e) => ({ ...e, [key]: true }));
      setNav(group.children[0].key);
    }
  };

  const wizardField = (patch: Partial<WizardState>) => setWizard((w) => ({ ...w, ...patch }));

  const runLookup = async (raw?: string) => {
    const q = (raw ?? wizard.lookupKey).trim();
    if (!q) return notifyError('اكتب رقم الطلب أو امسح الباركود / QR أولاً');
    setWizard((w) => ({ ...w, lookupBusy: true, lookupMessage: '' }));
    try {
      const r = await getLabSamples({ search: q, page_size: 10 });
      const items = r.data.data.results;
      if (items.length === 0) {
        setWizard((w) => ({ ...w, lookupBusy: false, matchedSample: null, lookupMessage: 'لم يُعثر على طلب مطابق' }));
        return;
      }
      const m = items[0];
      setWizard((w) => ({
        ...w,
        lookupBusy: false,
        matchedSample: m,
        lookupMessage: `تم العثور على ${items.length} نتيجة — عرض أولها`,
        source: m.source ?? w.source,
        sampleType: m.sample_type || w.sampleType,
        analysisRequestNumber: m.analysis_request_number || w.analysisRequestNumber,
        requestingDepartment: m.requesting_department || w.requestingDepartment,
        station: m.station || w.station,
        inspectorName: m.inspector_name || w.inspectorName,
        priority: m.priority || w.priority,
        brand: m.brand || w.brand,
        originCountry: m.origin_country || w.originCountry,
        batchNumber: m.batch_number || w.batchNumber,
        productionDate: m.production_date ?? w.productionDate,
        expiryDate: m.expiry_date ?? w.expiryDate,
        quantity: m.quantity != null ? String(m.quantity) : w.quantity,
        quantityUnit: m.quantity_unit || w.quantityUnit,
        unitsCount: m.units_count != null ? String(m.units_count) : w.unitsCount,
        packagingType: m.packaging_type || w.packagingType,
        packagingCondition: m.packaging_condition || w.packagingCondition,
        temperature: m.temperature != null ? String(m.temperature) : w.temperature,
        refOriginalNumber: m.sample_number || w.refOriginalNumber,
      }));
    } catch {
      setWizard((w) => ({ ...w, lookupBusy: false, matchedSample: null, lookupMessage: 'تعذر البحث — حاول مرة أخرى' }));
    }
  };

  const applyProduct = (p: FoodProduct) => {
    setWizard((w) => ({
      ...w,
      sampleType: p.name_ar,
      brand: w.brand || p.name_en,
    }));
  };

  const nextStep = () => {
    if (wizard.step === 1) {
      if (!wizard.sampleType.trim()) return notifyError('اكتب نوع / اسم العينة');
      if (!wizard.source) return notifyError('حدد مصدر العينة');
      if (wizard.classification === 'REFERENCE' && !wizard.refRetentionReason) return notifyError('حدد سبب حفظ العينة المرجعية');
    }
    setWizard((w) => ({ ...w, step: (w.step + 1) as 1 | 2 | 3 }));
  };

  const toggleChecklist = (key: string) => {
    setWizard((w) => ({ ...w, checklist: { ...w.checklist, [key]: !w.checklist[key] } }));
  };

  const submitWizard = async () => {
    if (!wizard.sampleType.trim()) return notifyError('اكتب نوع/اسم العينة');
    if (!wizard.source) return notifyError('حدد مصدر العينة');
    if (wizard.decision === 'reject' && !wizard.rejectionReason) return notifyError('لا يمكن رفض العينة بدون ذكر سبب الرفض');
    if (wizard.decision !== 'reject') {
      const unchecked = CHECKLIST_ITEMS.filter((c) => !wizard.checklist[c.key]);
      if (unchecked.length > 0) return notifyError('أكمل نموذج فحص العينة قبل قبولها');
    }
    setWizard((w) => ({ ...w, busy: true }));
    try {
      const payload: Record<string, unknown> = {
        source: wizard.source,
        classification: wizard.classification,
        sample_type: wizard.sampleType.trim(),
        requesting_department: wizard.requestingDepartment,
        analysis_request_number: wizard.analysisRequestNumber,
        station: wizard.station,
        inspector_name: wizard.inspectorName,
        brand: wizard.brand,
        origin_country: wizard.originCountry,
        batch_number: wizard.batchNumber,
        packaging_type: wizard.packagingType,
        packaging_condition: wizard.packagingCondition,
      };
      if (wizard.productionDate) payload.production_date = wizard.productionDate;
      if (wizard.expiryDate) payload.expiry_date = wizard.expiryDate;
      if (wizard.quantity) payload.quantity = wizard.quantity;
      if (wizard.quantityUnit) payload.quantity_unit = wizard.quantityUnit;
      if (wizard.unitsCount) payload.units_count = Number(wizard.unitsCount);
      if (wizard.temperature) payload.temperature = wizard.temperature;
      if (wizard.priority) payload.priority = wizard.priority;

      const created = await createLabSample(payload as never);
      const sample = created.data.data;
      if (wizard.decision === 'accept') {
        await acceptSample(sample.id, wizard.receptionNotes, wizard.checklist);
      } else if (wizard.decision === 'conditional') {
        await conditionalAcceptSample(sample.id, wizard.receptionNotes, wizard.checklist);
      } else {
        await rejectSample(sample.id, wizard.rejectionReason, wizard.rejectionNotes);
      }

      let refCreated: ReferenceSample | null = null;
      if (wizard.classification === 'REFERENCE' && wizard.decision !== 'reject') {
        refCreated = (
          await createReferenceSample({
            source: wizard.source || undefined,
            product_name: wizard.sampleType.trim(),
            origin: wizard.originCountry || undefined,
            original_sample: wizard.matchedSample?.id ?? undefined,
            quantity: wizard.refQuantity || wizard.quantity || undefined,
            retention_reason: wizard.refRetentionReason,
            storage_temperature: wizard.refStorageTemp || undefined,
            storage_location: wizard.refStorageLocation,
            retention_duration: wizard.refRetentionDuration,
            condition_on_arrival: wizard.packagingCondition,
            remarks: wizard.refNotes,
          })
        ).data.data;
      }

      notifySuccess(
        refCreated
          ? `سُجّلت العينة المرجعية ${refCreated.ref_number}`
          : `تم استلام العينة ${sample.sample_number}`,
      );
      setWizard({ ...emptyWizard(sources[0]?.id ?? ''), open: false });
      if (wizard.decision !== 'reject') {
        setBarcodeSample({
          ...sample,
          reception_checklist: wizard.checklist,
          rejection_reason: '',
        });
      }
      refreshAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'تعذر استلام العينة';
      notifyError(msg);
    } finally {
      setWizard((w) => ({ ...w, busy: false }));
    }
  };

  const submitRef = async () => {
    if (!refForm.product.trim()) return notifyError('اكتب اسم المادة/العينة المرجعية');
    try {
      await createReferenceSample({
        product_name: refForm.product.trim(),
        origin: refForm.origin,
        original_sample: refForm.originalSample || undefined,
        quantity: refForm.quantity || undefined,
        retention_reason: refForm.retentionReason,
        storage_temperature: refForm.storageTemp || undefined,
        storage_location: refForm.storage,
        seal_number: refForm.seal,
        coding: refForm.coding,
        remarks: refForm.remarks,
      });
      notifySuccess('تم تسجيل العينة المرجعية');
      setRefOpen(false);
      setRefForm(emptyRefForm());
      refreshReferences();
    } catch {
      notifyError('تعذر تسجيل العينة المرجعية');
    }
  };

  const stepSubtitle = wizard.step === 1 ? 'الطلب' : wizard.step === 2 ? 'فحص العينة' : 'القبول + طباعة الباركود';

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        /* تجاهل أخطاء تسجيل الخروج */
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F6F9' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(18px) saturate(1.35)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <BrandLogo compact />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                الإدارة الاتحادية للحجر الصحي
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                مكتب استلام العينات — FCLIS
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="الإشعارات">
              <IconButton aria-label="الإشعارات" sx={{ color: 'text.secondary' }} onClick={() => setNav('alerts')}>
                <Badge badgeContent={alerts.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="حساب المستخدم">
              <IconButton aria-label="قائمة المستخدم" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>
                  {(user?.full_name || user?.email || '؟').charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
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
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pt: 9, px: { xs: 2, md: 3.5 }, pb: 4, maxWidth: 1760, mx: 'auto' }}>
        <DashboardHero
          eyebrow="FCLIS — Reception Desk"
          title="مكتب استلام العينات — FCLIS"
          subtitle="الاستقبال السريع: تسجيل العينة ← فحصها ← قرار القبول وطباعة الباركود"
          gradient="emerald"
          avatarLabel={(user?.full_name || 'م').slice(0, 1)}
          action={
            <Stack direction="row" spacing={1}>
              <AppButton startIcon={<NotificationsActiveIcon />} variant="secondary" onClick={() => setNav('alerts')}>
                التنبيهات {alerts.length > 0 ? `(${alerts.length})` : ''}
              </AppButton>
              <AppButton startIcon={<AddIcon />} onClick={openWizard}>استلام عينة جديدة</AppButton>
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
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box sx={{ display: 'flex', gap: 2.5 }}>
        {/* الشريط الجانبي */}
        <Box
          sx={{
            width: 210,
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
                  {user?.full_name || 'موظف استلام العينات'}
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

        {/* المحتوى */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {nav === 'home' && (
            <HomeSection dash={dash} receivedToday={receivedToday} alerts={alerts} register={register} onOpenSample={(id) => setDetailId(id)} onReceive={openWizard} onSamples={() => selectNav('samples')} />
          )}
          {nav === 'receive.incoming' && (
            <ReceptionSection samplesTable={samples} onRegister={openWizard} onOpenSample={(id) => setDetailId(id)} onPrint={setBarcodeSample} />
          )}
          {nav === 'receive.pending' && (
            <PendingSection table={pendingSamples} onOpenSample={(id) => setDetailId(id)} onPrint={setBarcodeSample} />
          )}
          {nav === 'verify.request' && (
            <VerifyRequestSection onOpenSample={(id) => setDetailId(id)} onPrint={setBarcodeSample} />
          )}
          {nav === 'verify.data' && (
            <VerifyDataSection onOpenSample={(id) => setDetailId(id)} />
          )}
          {nav === 'barcode.create' && (
            <BarcodeSection mode="create" samplesTable={samples} onPrint={setBarcodeSample} onOpenSample={(id) => setDetailId(id)} />
          )}
          {nav === 'barcode.print' && (
            <BarcodeSection mode="print" samplesTable={samples} onPrint={setBarcodeSample} onOpenSample={(id) => setDetailId(id)} />
          )}
          {nav === 'deliver.ready' && (
            <DeliverReadySection table={readySamples} onOpenSample={(id) => setDetailId(id)} />
          )}
          {nav === 'deliver.log' && <TrackingSection />}
          {nav === 'samples' && (
            <SamplesLogSection
              samplesTable={samples}
              references={references}
              onRefresh={refreshReferences}
              onOpenSample={(id) => setDetailId(id)}
              onPrint={setBarcodeSample}
              onOpenRegister={() => { setRefForm(emptyRefForm()); setRefOpen(true); }}
              dialogOpen={refOpen}
              dialogClose={() => setRefOpen(false)}
              refForm={refForm}
              setRefForm={setRefForm}
              submitRef={submitRef}
            />
          )}
          {nav === 'rejected' && (
            <RejectedSection table={rejectedSamples} onOpenSample={(id) => setDetailId(id)} />
          )}
          {nav === 'alerts' && <AlertsSection alerts={alerts} onOpenSample={(id) => setDetailId(id)} />}
          {nav === 'reports' && <ReportsSection dash={dash} referencesCount={references.length} />}
          {nav === 'settings' && <SettingsSection />}
          {nav === 'help' && <HelpSection />}
        </Box>
      </Box>
        </Grid>
      </Grid>

      {/* معالج الاستلام بثلاث خطوات */}
      <Dialog open={wizard.open} onClose={() => !wizard.busy && setWizard((w) => ({ ...w, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}><AddIcon /></Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>استلام عينة جديدة</Typography>
            <Typography variant="caption" color="text.secondary">
              الخطوة {wizard.step} من 3 — {stepSubtitle}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {wizard.step === 1 && (
            <Stack spacing={2}>
              {/* البحث عن طلب / مسح QR */}
              <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 2.5, p: 2, bgcolor: '#EBF2FF' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  <QrCodeScannerIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
                  ابحث عن طلب التحليل أو امسح QR / Barcode
                </Typography>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <FormTextField
                      label="رقم الطلب / الباركود / QR"
                      value={wizard.lookupKey}
                      onChange={(e) => wizardField({ lookupKey: e.target.value })}
                      placeholder="امسح العينة أو اكتب رقم الطلب ثم اضغط بحث"
                      onKeyDown={(e) => { if (e.key === 'Enter') runLookup(); }}
                      InputProps={{ startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    />
                  </Box>
                  <AppButton startIcon={<SearchIcon />} onClick={() => runLookup()} loading={wizard.lookupBusy} sx={{ mt: 2.5 }}>
                    بحث
                  </AppButton>
                </Stack>
                {wizard.lookupMessage && (
                  <Typography variant="caption" color={wizard.matchedSample ? 'success.main' : 'warning.main'} sx={{ display: 'block', mt: 1 }}>
                    {wizard.lookupMessage}
                  </Typography>
                )}
                {wizard.matchedSample && (
                  <Box sx={{ mt: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <StatusChip label={labReception[wizard.matchedSample.reception_status]?.label ?? wizard.matchedSample.reception_status} tone={labReception[wizard.matchedSample.reception_status]?.tone} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{wizard.matchedSample.sample_number}</Typography>
                      <Typography variant="caption" color="text.secondary">{wizard.matchedSample.sample_type} — {wizard.matchedSample.source_name ?? ''} {wizard.matchedSample.received_at ? `• ${formatDateTime(wizard.matchedSample.received_at)}` : ''}</Typography>
                    </Box>
                    <AppButton size="small" variant="ghost" onClick={() => setWizard((w) => ({ ...w, matchedSample: null, lookupMessage: '', refOriginalNumber: '' }))}>
                      إلغاء
                    </AppButton>
                  </Box>
                )}
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <FormSelect label="مصدر العينة" requiredMark value={wizard.source} onChange={(v) => wizardField({ source: v })} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} placeholder="اختر المصدر..." />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label="التصنيف" requiredMark value={wizard.classification} onChange={(v) => wizardField({ classification: v })} options={CLASSIFICATION_OPTIONS} />
                </Grid>
              </Grid>

              {wizard.classification === 'REFERENCE' ? (
                <Stack spacing={1.5}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>بيانات العينة المرجعية</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="اسم المادة / العينة" requiredMark value={wizard.sampleType} onChange={(e) => wizardField({ sampleType: e.target.value })} placeholder="مثال: سكر مجروش" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="رقم العينة الأصلية" value={wizard.refOriginalNumber} onChange={(e) => wizardField({ refOriginalNumber: e.target.value })} placeholder="يُملأ تلقائياً عند البحث" disabled={Boolean(wizard.matchedSample)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="رقم طلب التحليل" value={wizard.analysisRequestNumber} onChange={(e) => wizardField({ analysisRequestNumber: e.target.value })} placeholder="رقم طلب الجهة" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="الجهة الطالبة" value={wizard.requestingDepartment} onChange={(e) => wizardField({ requestingDepartment: e.target.value })} placeholder="الإدارة العامة لرقابة الأغذية..." />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label="سبب الحفظ" requiredMark value={wizard.refRetentionReason} onChange={(v) => wizardField({ refRetentionReason: v })} placeholder="اختر السبب..." options={REF_RETENTION_REASONS} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="كمية العينة المرجعية" value={wizard.refQuantity} onChange={(e) => wizardField({ refQuantity: e.target.value })} placeholder="مثال: 200 g" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="مكان التخزين" value={wizard.refStorageLocation} onChange={(e) => wizardField({ refStorageLocation: e.target.value })} placeholder="مثال: غرفة التبريد A" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="درجة الحفظ (°م)" value={wizard.refStorageTemp} onChange={(e) => wizardField({ refStorageTemp: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="مدة الاحتفاظ" value={wizard.refRetentionDuration} onChange={(e) => wizardField({ refRetentionDuration: e.target.value })} placeholder="مثال: 6 أشهر" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label="المنفذ / المحطة" value={wizard.station} onChange={(v) => wizardField({ station: v })} placeholder="اختر..." options={STATION_OPTIONS} />
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>المنتج وطلب التحليل</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="نوع / اسم العينة" requiredMark value={wizard.sampleType} onChange={(e) => wizardField({ sampleType: e.target.value })} placeholder="مثال: Milk Powder" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          options={products}
                          getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.name_ar}${o.category ? ` (${o.category})` : ''}`)}
                          filterOptions={(opts, state) => {
                            const q = state.inputValue.trim().toLowerCase();
                            if (!q) return opts.slice(0, 20);
                            return opts.filter((o) => [o.name_ar, o.name_en, o.category, o.code].some((t) => (t || '').toLowerCase().includes(q))).slice(0, 20);
                          }}
                          onChange={(_, val) => { if (val && typeof val !== 'string') applyProduct(val); }}
                          renderInput={(params) => (
                            <Box>
                              <Typography component="label" variant="body2" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>أو اختَر من سجل الأصناف (Catalog)</Typography>
                              <TextField {...params} variant="outlined" size="small" placeholder="اكتب للبحث عن صنف..." />
                            </Box>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="رقم طلب التحليل" value={wizard.analysisRequestNumber} onChange={(e) => wizardField({ analysisRequestNumber: e.target.value })} placeholder="LAB-2026-00125" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label="الجهة الطالبة" value={wizard.requestingDepartment} onChange={(e) => wizardField({ requestingDepartment: e.target.value })} placeholder="إدارة رقابة الأغذية..." />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label="الأولوية" value={wizard.priority} onChange={(v) => wizardField({ priority: v })} options={PRIORITY_OPTIONS} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label="المنفذ / المحطة" value={wizard.station} onChange={(v) => wizardField({ station: v })} placeholder="اختر..." options={STATION_OPTIONS} />
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      تُحدَّد التحاليل المطلوبة لاحقاً من قبل منسّق العينات بعد القبول.
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          )}

          {wizard.step === 2 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>بيانات العينة كما وردت عند الوصول</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="اسم المفتش" value={wizard.inspectorName} onChange={(e) => wizardField({ inspectorName: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="العلامة التجارية" value={wizard.brand} onChange={(e) => wizardField({ brand: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="بلد المنشأ" value={wizard.originCountry} onChange={(e) => wizardField({ originCountry: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="رقم الدفعة" value={wizard.batchNumber} onChange={(e) => wizardField({ batchNumber: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="تاريخ الإنتاج" type="date" value={wizard.productionDate} onChange={(e) => wizardField({ productionDate: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="تاريخ الانتهاء" type="date" value={wizard.expiryDate} onChange={(e) => wizardField({ expiryDate: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormTextField label="الكمية" type="number" value={wizard.quantity} onChange={(e) => wizardField({ quantity: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormSelect label="الوحدة" value={wizard.quantityUnit} onChange={(v) => wizardField({ quantityUnit: v })} placeholder="—" options={QUANTITY_UNITS} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormTextField label="عدد الوحدات/العبوات" type="number" value={wizard.unitsCount} onChange={(e) => wizardField({ unitsCount: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label="نوع التغليف" value={wizard.packagingType} onChange={(v) => wizardField({ packagingType: v })} placeholder="—" options={PACKAGING_TYPES} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label="حالة التغليف" value={wizard.packagingCondition} onChange={(v) => wizardField({ packagingCondition: v })} placeholder="—" options={PACKAGING_CONDITIONS} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label="درجة الحرارة (°م)" type="number" value={wizard.temperature} onChange={(e) => wizardField({ temperature: e.target.value })} />
                </Grid>
              </Grid>
            </Stack>
          )}

          {wizard.step === 3 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>نموذج فحص العينة قبل القبول</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2, bgcolor: '#F4F6F9' }}>
                <Stack spacing={0.25}>
                  {CHECKLIST_ITEMS.map((c) => (
                    <FormControlLabel
                      key={c.key}
                      control={<Checkbox checked={Boolean(wizard.checklist[c.key])} onChange={() => toggleChecklist(c.key)} />}
                      label={c.label}
                    />
                  ))}
                </Stack>
              </Box>

              <FormSelect
                label="قرار الاستلام"
                value={wizard.decision}
                onChange={(v) => wizardField({ decision: v as 'accept' | 'conditional' | 'reject' })}
                options={[
                  { value: 'accept', label: 'قبول العينة' },
                  { value: 'conditional', label: 'قبول مشروط' },
                  { value: 'reject', label: 'رفض العينة' },
                ]}
              />

              {wizard.decision === 'reject' ? (
                <>
                  <FormSelect label="سبب الرفض" requiredMark value={wizard.rejectionReason} onChange={(v) => wizardField({ rejectionReason: v })} placeholder="اختر السبب..." options={REJECT_REASONS.map((r) => ({ value: r, label: r }))} />
                  <FormTextField label="ملاحظات الرفض" multiline minRows={2} value={wizard.rejectionNotes} onChange={(e) => wizardField({ rejectionNotes: e.target.value })} />
                </>
              ) : (
                <FormTextField label="ملاحظات القبول" multiline minRows={2} value={wizard.receptionNotes} onChange={(e) => wizardField({ receptionNotes: e.target.value })} />
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions>
          <AppButton variant="ghost" onClick={() => setWizard((w) => ({ ...w, open: false }))} disabled={wizard.busy}>
            إلغاء
          </AppButton>
          {wizard.step > 1 && (
            <AppButton variant="secondary" onClick={() => setWizard((w) => ({ ...w, step: (w.step - 1) as 1 | 2 | 3 }))} disabled={wizard.busy}>
              السابق
            </AppButton>
          )}
          {wizard.step < 3 ? (
            <AppButton onClick={nextStep}>التالي</AppButton>
          ) : (
            <AppButton startIcon={<CheckCircleIcon />} onClick={submitWizard} loading={wizard.busy}>
              {wizard.decision === 'reject' ? 'تسجيل الرفض' : 'قبول وتسجيل العينة'}
            </AppButton>
          )}
        </DialogActions>
      </Dialog>

      {detailId && (
        <SampleDetailDialog
          sampleId={detailId}
          parameters={[]}
          usersFetch={async () => ({ data: { data: { results: [] } } }) as never}
          onClose={() => setDetailId(null)}
          onChanged={refreshAll}
        />
      )}

      <PrintBarcodeDialog open={Boolean(barcodeSample)} sample={barcodeSample} onClose={() => setBarcodeSample(null)} />
      </Box>
    </Box>
  );
};

/* ================== الرئيسية ================== */

const HomeSection = ({
  dash, receivedToday, alerts, register, onOpenSample, onReceive, onSamples,
}: {
  dash: ReceptionDashboard | null;
  receivedToday: number;
  alerts: Array<{ sample: FoodSample; reason: string }>;
  register: (id: string) => (el: HTMLElement | null) => void;
  onOpenSample: (id: string) => void;
  onReceive: () => void;
  onSamples: () => void;
}) => {
  const stat = (label: string, value: number | string | null | undefined, color: string, icon: React.ReactNode, size: 'default' | 'lg' = 'default') => (
    <Grid item xs={6} sm={4} md={size === 'lg' ? 4 : 3}>
      <Box sx={{ borderTop: `3px solid ${color}`, borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
        <KpiCard label={label} value={value ?? '—'} icon={icon} />
      </Box>
    </Grid>
  );
  return (
    <Box>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>عينات اليوم</Typography>
      <Grid container spacing={1.5}>
        {stat('واردة', dash?.today ?? 0, '#0B5ED7', <ScheduleIcon />, 'lg')}
        {stat('مكتملة الاستلام (مقبولة)', dash?.accepted ?? 0, '#1d7a54', <CheckCircleIcon />, 'lg')}
        {stat('معلقة (بانتظار القرار)', dash?.pending ?? 0, '#FFC107', <RadioButtonUncheckedIcon />, 'lg')}
      </Grid>
      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {stat('مرفوضة', dash?.rejected ?? 0, '#c63a3a', <CircleIcon />)}
        {stat('قبول مشروط', dash?.conditional ?? 0, '#FFC107', <RadioButtonUncheckedIcon />)}
        {stat('عاجلة / بمراجعة', dash?.needs_review ?? 0, '#c63a3a', <NotificationsActiveIcon />)}
        {stat('عينات مرجعية', dash?.references ?? 0, '#0B5ED7', <ArchiveIcon />)}
        {stat('متوسط زمن القرار (دقيقة)', dash?.avg_reception_minutes, '#1d7a54', <ScheduleIcon />)}
        {stat('مسجلة اليوم (قائمة)', receivedToday, '#0B5ED7', <BiotechIcon />)}
      </Grid>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('workflow')} data-section="workflow" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, scrollMarginTop: '80px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>سير العمل</Typography>
            <Typography variant="body2" color="text.secondary">
              تستقبل العينة ← تتحقق من طلب التحليل ← تطابق بيانات العينة ← تُصدر الباركود ← تسجّل الاستلام ← تسلّم للمنسق.
              ولا تُقبل أي عينة بدون استكمال نموذج الفحص، ولا يُرفض أي طلب بدون ذكر سبب الرفض.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <AppButton size="small" startIcon={<AddIcon />} onClick={onReceive}>استلام عينة</AppButton>
              <AppButton size="small" variant="secondary" onClick={onSamples}>إدارة العينات</AppButton>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, scrollMarginTop: '80px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              التنبيهات {alerts.length > 0 ? <Chip size="small" color="error" label={alerts.length} /> : null}
            </Typography>
            {alerts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد عينات عاجلة تنتظر قرار الاستلام.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {alerts.slice(0, 4).map((a) => (
                  <Stack key={a.sample.id} direction="row" spacing={1} alignItems="center">
                    <StatusChip label={labPriority[a.sample.priority]?.label ?? a.sample.priority} tone={labPriority[a.sample.priority]?.tone} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.sample.sample_number}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{a.reason}</Typography>
                    <AppButton size="small" variant="secondary" onClick={() => onOpenSample(a.sample.id)}>فتح</AppButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ================== الاستلام ================== */

const ReceptionSection = ({
  samplesTable, onRegister, onOpenSample, onPrint,
}: {
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  onRegister: () => void;
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'received_at', label: 'وقت الاستلام', render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: 'قرار الاستلام', render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح</AppButton>
          <IconButton aria-label="طباعة" size="small" onClick={() => onPrint(s)}><PrintIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onPrint]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={onRegister}>استلام / تسجيل عينة</AppButton>
      </Box>
      <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title="أحدث العينات المستلمة" />
    </Box>
  );
};

/* ================== إدارة العينات ================== */

const SamplesSection = ({
  samplesTable, onOpenSample, onPrint,
}: {
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'station', label: 'المنفذ', render: (s) => s.station || '—' },
    { key: 'brand', label: 'العلامة', render: (s) => s.brand || '—' },
    { key: 'quantity', label: 'الكمية', render: (s) => (s.quantity != null ? `${s.quantity} ${s.quantity_unit ?? ''}`.trim() : '—') },
    { key: 'temperature', label: 'الحرارة', render: (s) => (s.temperature != null ? `${s.temperature}°` : '—') },
    { key: 'reception_status', label: 'قرار الاستلام', render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'bench', label: 'القسم', render: (s) => labBench[s.bench]?.label ?? s.bench },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح</AppButton>
          <AppButton size="small" variant="secondary" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>باركود</AppButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onPrint]);

  return <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title="إدارة العينات — قسم الاستلام" />;
};

/* ================== العينات المرجعية ================== */

const refStatus: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STORED: { label: 'مخزنة', tone: 'success' },
  RETRIEVED: { label: 'تم الرجوع إليها', tone: 'warning' },
  DISCARDED: { label: 'أُعدمت', tone: 'error' },
};

const ReferencesSection = ({
  references, onRefresh, onOpenRegister, dialogOpen, dialogClose, refForm, setRefForm, submitRef,
}: {
  references: ReferenceSample[];
  onRefresh: () => void;
  onOpenRegister: () => void;
  dialogOpen: boolean;
  dialogClose: () => void;
  refForm: RefFormState;
  setRefForm: React.Dispatch<React.SetStateAction<RefFormState>>;
  submitRef: () => void;
}) => (
  <Box>
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
      <AppButton startIcon={<AddIcon />} onClick={onOpenRegister}>تسجيل عينة مرجعية</AppButton>
    </Box>
    <Grid container spacing={1.5}>
      {references.length === 0 && (
        <Grid item xs={12}><Typography variant="body2" color="text.secondary">لا توجد عينات مرجعية مسجلة.</Typography></Grid>
      )}
      {references.map((r) => (
        <Grid item xs={12} md={6} lg={4} key={r.id}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{r.product_name}</Typography>
                <Typography variant="caption" color="text.secondary">{r.ref_number} • {r.source_name ?? '—'}</Typography>
              </Box>
              <StatusChip label={refStatus[r.status]?.label ?? r.status} tone={refStatus[r.status]?.tone} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              العينة الأصلية: {r.original_sample_number ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              الموقع: {r.storage_location || '—'} • الختم: {r.seal_number || '—'}
              {r.quantity != null ? ` • الكمية: ${r.quantity}` : ''}
              {r.retention_reason ? ` • السبب: ${r.retention_reason}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              استلام: {formatDateTime(r.received_at)} — {r.received_by_name ?? '—'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <AppButton size="small" variant="secondary" disabled={r.status !== 'STORED'} onClick={async () => {
                try { await retrieveReferenceSample(r.id, 'الرجوع للعينة المرجعية'); notifySuccess('تم الرجوع'); onRefresh(); } catch { notifyError('تعذر التنفيذ'); }
              }}>
                رجوع
              </AppButton>
              <AppButton size="small" variant="danger" disabled={r.status === 'DISCARDED'} onClick={async () => {
                try { await discardReferenceSample(r.id, 'إعدام'); notifySuccess('تم الإعدام'); onRefresh(); } catch { notifyError('تعذر التنفيذ'); }
              }}>
                إعدام
              </AppButton>
              <IconButton aria-label="حذف" size="small" color="error" onClick={async () => {
                try { await import('../../api/endpoints/foodlab').then((m) => m.deleteReferenceSample(r.id)); notifySuccess('تم الحذف'); onRefresh(); } catch { notifyError('تعذر الحذف'); }
              }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>

    <FormDialog open={dialogOpen} onClose={dialogClose} onSubmit={submitRef} title="تسجيل عينة مرجعية" subtitle="تحفظ للرجوع إليها مرتبطة بالعينة الأصلية" maxWidth="sm">
      <FormTextField label="اسم المادة / العينة" requiredMark value={refForm.product} onChange={(e) => setRefForm((f) => ({ ...f, product: e.target.value }))} />
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <FormTextField label="المنشأ / الدفعة" value={refForm.origin} onChange={(e) => setRefForm((f) => ({ ...f, origin: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="رقم العينة الأصلية" value={refForm.originalSample} onChange={(e) => setRefForm((f) => ({ ...f, originalSample: e.target.value }))} placeholder="رقم العينة المرتبطة" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="الكمية" value={refForm.quantity} onChange={(e) => setRefForm((f) => ({ ...f, quantity: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="درجة حرارة التخزين (°م)" value={refForm.storageTemp} onChange={(e) => setRefForm((f) => ({ ...f, storageTemp: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormSelect label="سبب الاحتفاظ" value={refForm.retentionReason} onChange={(v) => setRefForm((f) => ({ ...f, retentionReason: v }))} placeholder="—" options={REF_RETENTION_REASONS} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="مدة الاحتفاظ / الموقع" value={refForm.storage} onChange={(e) => setRefForm((f) => ({ ...f, storage: e.target.value }))} placeholder="مثال: غرفة التخزين A" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="رقم الختم" value={refForm.seal} onChange={(e) => setRefForm((f) => ({ ...f, seal: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label="الترميز" value={refForm.coding} onChange={(e) => setRefForm((f) => ({ ...f, coding: e.target.value }))} />
        </Grid>
      </Grid>
      <FormTextField label="ملاحظات" value={refForm.remarks} onChange={(e) => setRefForm((f) => ({ ...f, remarks: e.target.value }))} multiline minRows={2} />
    </FormDialog>
  </Box>
);

/* ================== سلسلة الحيازة (قراءة فقط) ================== */

const TrackingSection = () => {
  const [events, setEvents] = useState<ChainOfCustody[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCustodyEvents({ page_size: 50 })
      .then((r) => setEvents(r.data.data.results))
      .catch(() => notifyError('تعذر تحميل سلسلة الحيازة'))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Typography variant="body2" color="text.secondary">جارٍ تحميل سلسلة الحيازة...</Typography>;
  if (events.length === 0) return <Typography variant="body2" color="text.secondary">لا توجد أحداث حيازة مسجلة.</Typography>;
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>سلسلة الحيازة — قراءة فقط</Typography>
      <Stack spacing={1}>
        {events.map((ev) => (
          <Stack key={ev.id} direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                mt: 0.7,
                width: 14,
                height: 14,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: ev.is_received ? '#1d7a54' : '#FFC107',
              }}
            />
            <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {ev.sample_number} — {ev.from_department} ← {ev.to_department}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                نقل: {formatDateTime(ev.transferred_at)} — {ev.transferred_by_name ?? '—'}{ev.is_received ? ` • استلم: ${ev.received_by_name ?? ''}` : ' • بانتظار الاستلام'}
              </Typography>
              {ev.remarks && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{ev.remarks}</Typography>}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

/* ================== التقارير ================== */

const ReportsSection = ({ dash, referencesCount }: { dash: ReceptionDashboard | null; referencesCount: number }) => {
  const rows = [
    { label: 'عينات اليوم', value: dash?.today ?? 0 },
    { label: 'بانتظار قرار الاستلام', value: dash?.pending ?? 0 },
    { label: 'مقبولة', value: dash?.accepted ?? 0 },
    { label: 'قبول مشروط', value: dash?.conditional ?? 0 },
    { label: 'مرفوضة', value: dash?.rejected ?? 0 },
    { label: 'عاجلة / بانتظار المراجعة', value: dash?.needs_review ?? 0 },
    { label: 'عينات مرجعية', value: referencesCount },
  ];
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>تقارير الاستلام</Typography>
      <Grid container spacing={1.5}>
        {rows.map((r) => (
          <Grid item xs={12} sm={6} md={4} key={r.label}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <Typography variant="caption" color="text.secondary">{r.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{r.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, bgcolor: '#F4F6F9' }}>
        <Typography variant="caption" color="text.secondary">
          متاح للتصدير لاحقاً بالاشتراك مع دورة التحليل الكاملة للمختبر.
        </Typography>
      </Box>
    </Box>
  );
};

/* ================== التنبيهات ================== */

const AlertsSection = ({ alerts, onOpenSample }: { alerts: Array<{ sample: FoodSample; reason: string }>; onOpenSample: (id: string) => void }) => (
  <Box>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التنبيهات — عينات عاجلة بانتظار قرار الاستلام</Typography>
    {alerts.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد تنبيهات حالياً.</Typography>}
    <Stack spacing={1}>
      {alerts.map((a) => (
        <Box key={a.sample.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'error.main' }}><NotificationsActiveIcon /></Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{a.sample.sample_number} — {a.sample.sample_type}</Typography>
            <Typography variant="caption" color="text.secondary">{a.reason}{a.sample.priority === 'URGENT' ? ' • عاجلة' : ''}</Typography>
          </Box>
          <StatusChip label={labPriority[a.sample.priority]?.label ?? a.sample.priority} tone={labPriority[a.sample.priority]?.tone} />
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(a.sample.id)}>اتخاذ قرار</AppButton>
        </Box>
      ))}
    </Stack>
  </Box>
);

/* ================== العينات المعلقة (بانتظار القرار) ================== */

const PendingSection = ({
  table, onOpenSample, onPrint,
}: {
  table: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'received_at', label: 'وقت الاستلام', render: (s) => formatDateTime(s.received_at) },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>اتخاذ قرار</AppButton>
          <IconButton aria-label="طباعة" size="small" onClick={() => onPrint(s)}><PrintIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onPrint]);

  return <FoodDataTable<FoodSample> columns={columns} table={table} title="العينات المعلقة — بانتظار قرار الاستلام" />;
};

/* ================== العينات المرفوضة ================== */

const RejectedSection = ({
  table, onOpenSample,
}: {
  table: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'rejection_reason', label: 'سبب الرفض', render: (s) => s.rejection_reason || '—' },
    { key: 'reception_decision_at', label: 'وقت الرفض', render: (s) => formatDateTime(s.reception_decision_at) },
    { key: 'reception_decision_by_name', label: 'بواسطة', render: (s) => s.reception_decision_by_name || '—' },
    { key: 'actions', label: '', render: (s) => <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح</AppButton> },
  ], [onOpenSample]);

  return <FoodDataTable<FoodSample> columns={columns} table={table} title="العينات المرفوضة" />;
};

/* ================== البحث / التحقق المشترك ================== */

const SampleLookupStrip = ({ placeholder, onSearch, busy }: { placeholder: string; onSearch: (q: string) => void; busy: boolean }) => {
  const [q, setQ] = useState('');
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <FormTextField
          label="رقم الطلب / الباركود / QR"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(q); }}
          InputProps={{ startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
      </Box>
      <AppButton startIcon={<SearchIcon />} onClick={() => onSearch(q)} loading={busy} sx={{ mt: 2.5 }}>بحث</AppButton>
    </Stack>
  );
};

/* ================== التحقق من الطلب ================== */

const VerifyRequestSection = ({
  onOpenSample, onPrint,
}: {
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodSample[]>([]);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError('اكتب رقم الطلب أو امسح الباركود / QR');
    setBusy(true);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 20 });
      setResults(r.data.data.results);
      setMessage(r.data.data.count === 0 ? 'لم يُعثر على طلب مطابق' : `تم العثور على ${r.data.data.count} نتيجة`);
    } catch {
      setMessage('تعذر البحث — حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التحقق من طلب التحليل</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        امسح Barcode / QR على العينة أو اكتب رقم الطلب، للتأكد من وجود طلب تحليل مطابق قبل الاستلام.
      </Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder="امسح العينة أو اكتب رقم الطلب..." onSearch={search} busy={busy} /></Box>
      {message && <Typography variant="caption" color={results.length > 0 ? 'success.main' : 'warning.main'} sx={{ display: 'block', mb: 1 }}>{message}</Typography>}
      {results.length > 0 && (
        <Stack spacing={1}>
          {results.map((s) => (
            <Box key={s.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.sample_number}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.sample_type}{s.inspector_name ? ` — مفتش: ${s.inspector_name}` : ''}{s.received_at ? ` — ${formatDateTime(s.received_at)}` : ''}
                </Typography>
              </Box>
              <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح الطلب</AppButton>
              <AppButton size="small" variant="secondary" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>باركود</AppButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

/* ================== التحقق من البيانات ================== */

const VerifyDataSection = ({ onOpenSample }: { onOpenSample: (id: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError('اكتب رقم العينة أو امسح الباركود / QR');
    setBusy(true);
    setSample(null);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 5 });
      const m = r.data.data.results[0];
      if (!m) { setMessage('لم يُعثر على عينة مطابقة'); return; }
      const detail = await getLabSample(m.id);
      setSample(detail.data.data);
      setMessage('تم جلب البيانات — راجع مطابقة بيانات العينة مع الطلب');
    } catch {
      setMessage('تعذر البحث — حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const checklist = sample?.reception_checklist ?? {};

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التحقق من بيانات العينة</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        طريق واحد للتحقق: حدد العينة ثم راجع بياناتها المسجلة مقابل طلب التحليل قبل القبول أو الرفض.
      </Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder="امسح العينة أو اكتب رقمها..." onSearch={search} busy={busy} /></Box>
      {message && <Typography variant="caption" color={sample ? 'success.main' : 'warning.main'} sx={{ display: 'block', mb: 1 }}>{message}</Typography>}

      {sample && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{sample.sample_number}</Typography>
                <StatusChip label={labReception[sample.reception_status]?.label ?? sample.reception_status} tone={labReception[sample.reception_status]?.tone} />
                <StatusChip label={labSampleStatus[sample.status]?.label ?? sample.status} tone={labSampleStatus[sample.status]?.tone} />
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">المنتج</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.sample_type}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">رقم طلب التحليل</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.analysis_request_number || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">المصدر</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.source_name ?? '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">الجهة الطالبة</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.requesting_department || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">المفتش</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.inspector_name || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">المحطة</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.station || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">العلامة التجارية</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.brand || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">بلد المنشأ</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.origin_country || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">رقم الدفعة</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.batch_number || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">الكمية</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.quantity != null ? `${sample.quantity} ${sample.quantity_unit ?? ''}`.trim() : '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">درجة الحرارة</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.temperature != null ? `${sample.temperature}°` : '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">نوع التغليف / حالته</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{`${sample.packaging_type || '—'} / ${sample.packaging_condition || '—'}`}</Typography></Grid>
              </Grid>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <AppButton size="small" variant="secondary" onClick={() => onOpenSample(sample.id)}>فتح كامل العينة</AppButton>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>سجل فحص القبول</Typography>
              <Stack spacing={0.5}>
                {CHECKLIST_ITEMS.map((c) => (
                  <Stack key={c.key} direction="row" alignItems="center" spacing={1}>
                    <StatusChip label={checklist[c.key] ? 'سليم' : 'غير مؤكد'} tone={checklist[c.key] ? 'success' : checklist[c.key] === false ? 'error' : 'neutral'} />
                    <Typography variant="body2">{c.label}</Typography>
                  </Stack>
                ))}
              </Stack>
              {sample.rejection_reason && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#FDECEA' }}>
                  <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>سبب الرفض: {sample.rejection_reason}</Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

/* ================== الباركود والملصقات ================== */

const BarcodeSection = ({
  mode, samplesTable, onPrint, onOpenSample,
}: {
  mode: 'create' | 'print';
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  onPrint: (s: FoodSample) => void;
  onOpenSample: (id: string) => void;
}) => {
  const isCreate = mode === 'create';
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodSample[]>([]);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError('اكتب رقم العينة أو امسح الباركود / QR');
    setBusy(true);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 20 });
      setResults(r.data.data.results);
      setMessage(r.data.data.count === 0 ? 'لم يُعثر على عينة مطابقة' : `تم العثور على ${r.data.data.count} عينة`);
    } catch {
      setMessage('تعذر البحث — حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'reception_status', label: 'قرار الاستلام', render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{isCreate ? 'إنشاء + طباعة' : 'طباعة الملصق'}</AppButton>
          <IconButton aria-label="عرض العينة" size="small" onClick={() => onOpenSample(s.id)}><CircleIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onPrint, onOpenSample, isCreate]);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{isCreate ? 'إنشاء Barcode / QR' : 'طباعة الملصقات'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isCreate
          ? 'امسح العينة أو ابحث عنها لإنشاء باركود / QR ليُطبع ويُلصق على العينة قبل تسليمها.'
          : 'أعد طباعة ملصق باركود / QR لأي عينة واردة دون تعديل بياناتها.'}
      </Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder={isCreate ? 'امسح العينة أو اكتب رقمها لتوليد الباركود...' : 'امسح العينة أو اكتب رقمها لإعادة الطباعة...'} onSearch={search} busy={busy} /></Box>
      {message && <Typography variant="caption" color={results.length > 0 ? 'success.main' : 'warning.main'} sx={{ display: 'block', mb: 1 }}>{message}</Typography>}
      {results.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {results.map((s) => (
            <Box key={s.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.sample_number}</Typography>
                <Typography variant="caption" color="text.secondary">{s.sample_type} — {s.source_name ?? ''}</Typography>
              </Box>
              <AppButton size="small" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{isCreate ? 'إنشاء + طباعة' : 'طباعة'}</AppButton>
            </Box>
          ))}
        </Stack>
      )}
      {!isCreate && results.length === 0 && <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title="أحدث العينات — لإعادة الطباعة" />}
    </Box>
  );
};

/* ================== تسليم العينات ================== */

const DeliverReadySection = ({
  table, onOpenSample,
}: {
  table: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
}) => {
  const [delivering, setDelivering] = useState<string | null>(null);

  const doDeliver = async (s: FoodSample) => {
    setDelivering(s.id);
    try {
      await transferSample(s.id, {
        from_department: 'استلام العينات المختبرية',
        to_department: 'منسّق عينات المختبر',
        remarks: 'تسليم العينة إلى المنسق',
      });
      notifySuccess(`سُلّمت العينة ${s.sample_number} إلى المنسق`);
      table.refresh();
    } catch {
      notifyError('تعذر تسجيل التسليم — حاول مرة أخرى');
    } finally {
      setDelivering(null);
    }
  };

  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'received_at', label: 'وقت الاستلام', render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: 'قرار الاستلام', render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" startIcon={<LocalShippingIcon />} loading={delivering === s.id} onClick={() => doDeliver(s)}>تسليم للمنسق</AppButton>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح</AppButton>
        </Stack>
      ),
    },
  ], [onOpenSample, delivering]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        العينات المقبولة التي لم تُسلَّم للمنسق بعد. لا يختار موظف الاستلام القسم الفني — التوجيه يتم من قبل منسّق عينات المختبر.
      </Typography>
      <FoodDataTable<FoodSample> columns={columns} table={table} title="جاهزة للتسليم — مقبولة وبانتظار التسليم" />
    </Box>
  );
};

/* ================== سجل العينات + المرجعية ================== */

const SamplesLogSection = ({
  samplesTable, references, onRefresh, onOpenSample, onPrint, onOpenRegister, dialogOpen, dialogClose, refForm, setRefForm, submitRef,
}: {
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  references: ReferenceSample[];
  onRefresh: () => void;
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
  onOpenRegister: () => void;
  dialogOpen: boolean;
  dialogClose: () => void;
  refForm: RefFormState;
  setRefForm: React.Dispatch<React.SetStateAction<RefFormState>>;
  submitRef: () => void;
}) => (
  <Box>
    <SamplesSection samplesTable={samplesTable} onOpenSample={onOpenSample} onPrint={onPrint} />
    <Divider sx={{ my: 3 }} />
    <ReferencesSection
      references={references}
      onRefresh={onRefresh}
      onOpenRegister={onOpenRegister}
      dialogOpen={dialogOpen}
      dialogClose={dialogClose}
      refForm={refForm}
      setRefForm={setRefForm}
      submitRef={submitRef}
    />
  </Box>
);

/* ================== الإعدادات ================== */

const SettingsSection = () => {
  const { user } = useAuth();
  const allowed = [
    'sample.create', 'sample.receive', 'sample.accept', 'sample.reject',
    'sample.view', 'sample.print_barcode', 'sample.register_reference', 'custody.create',
  ];
  const blocked = [
    'result.create', 'result.edit', 'result.approve', 'specification.edit',
    'test_price.edit', 'invoice.edit', 'user.manage',
  ];
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الإعدادات</Typography>
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>الحساب</Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.full_name || 'مستخدم'} — {user?.email || ''} • الدور: موظف استلام العينات (Sample Reception Officer)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          مرحباً بك في مكتب استلام العينات. أنت متصل الآن وتعمل ضمن دورة المختبر دون الوصول للنتائج الفنية.
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'success.main', borderRadius: 2.5, bgcolor: '#F2FBF4' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>الصلاحيات المتاحة لك</Typography>
            <Stack spacing={0.5}>
              {allowed.map((p) => (
                <Stack key={p} direction="row" alignItems="center" spacing={1}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2">{p}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 2.5, bgcolor: '#FDF1F0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>غير متاحة لموظف الاستلام</Typography>
            <Stack spacing={0.5}>
              {blocked.map((p) => (
                <Stack key={p} direction="row" alignItems="center" spacing={1}>
                  <BlockIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="body2">{p}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ================== المساعدة ================== */

const HelpSection = () => (
  <Box sx={{ maxWidth: 900 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>المساعدة — دورة عمل استلام العينات</Typography>
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 2 }}>
      <Stack spacing={1.5}>
        {[
          ['استلام العينة', 'سجّل العينة الواردة ببياناتها ومصدرها.'],
          ['التحقق من طلب التحليل', 'امسح الباركود أو ابحث برقم الطلب للتأكد من وجود طلب مطابق.'],
          ['مطابقة بيانات العينة', 'راجع المطابقة: التغليف، الكمية، الختم، بيانات العينة مقابل الطلب.'],
          ['إنشاء Barcode / QR', 'أصدر باركود / QR للعينة واطبع الملصق.'],
          ['تسجيل الاستلام', 'اتخذ قرار القبول/الرفض عبر نموذج الفحص، والرفض يتطلب سبباً.'],
          ['تسليم للمنسق', 'سلّم العينة المقبولة إلى منسّق عينات المختبر المسؤول عن توجيهها للقسم الفني.'],
        ].map(([title, desc]) => (
          <Stack key={title} direction="row" spacing={1.5}>
            <Box sx={{ mt: 0.7, width: 14, height: 14, borderRadius: '50%', flexShrink: 0, bgcolor: 'primary.main' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">{desc}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
    <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2.5, bgcolor: '#F4F6F9' }}>
      <Typography variant="body2" color="text.secondary">
        الدور الحساس للتوجيه (القسم الفني — الكيمياء / المايكرو / السموم / الجزيئي) مخصص لمنسّق عينات المختبر، ولا يظهر لموظف الاستلام.
        الواجهة هنا تركز على: الوصول، التحقق، التسجيل، الباركود، والتسليم فقط.
      </Typography>
    </Box>
  </Box>
);

export default ReceptionLabPage;