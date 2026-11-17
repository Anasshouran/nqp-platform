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
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../components/common/BrandLogo';
import {
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
  ConfirmDialog,
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
  deleteReferenceSample,
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

const SECTIONS = (i18nT: (key: string) => string) => [
  { id: 'overview', label: i18nT('food.receptionLab.sections.overview'), icon: <DashboardIcon fontSize="small" /> },
  { id: 'workflow', label: i18nT('food.receptionLab.sections.workflow'), icon: <ScheduleIcon fontSize="small" /> },
  { id: 'alerts', label: i18nT('food.receptionLab.sections.alerts'), icon: <NotificationsActiveIcon fontSize="small" /> },
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

const SIDEBAR_GROUPS = (i18nT: (key: string) => string): NavGroup[] => [
  { key: 'home', label: i18nT('food.receptionLab.sidebar.home_label'), icon: <DashboardIcon />, children: [{ key: 'home', label: i18nT('food.receptionLab.sidebar.home.children.home') }] },
  {
    key: 'receive', label: i18nT('food.receptionLab.sidebar.receive_label'), icon: <AddIcon />, children: [
      { key: 'receive.incoming', label: i18nT('food.receptionLab.sidebar.receive.children.incoming') },
      { key: 'receive.register', label: i18nT('food.receptionLab.sidebar.receive.children.register') },
      { key: 'receive.pending', label: i18nT('food.receptionLab.sidebar.receive.children.pending') },
    ],
  },
  {
    key: 'verify', label: i18nT('food.receptionLab.sidebar.verify_label'), icon: <FactCheckIcon />, children: [
      { key: 'verify.request', label: i18nT('food.receptionLab.sidebar.verify.children.request') },
      { key: 'verify.data', label: i18nT('food.receptionLab.sidebar.verify.children.data') },
    ],
  },
  {
    key: 'barcode', label: i18nT('food.receptionLab.sidebar.barcode_label'), icon: <QrCode2Icon />, children: [
      { key: 'barcode.create', label: i18nT('food.receptionLab.sidebar.barcode.children.create') },
      { key: 'barcode.print', label: i18nT('food.receptionLab.sidebar.barcode.children.print') },
    ],
  },
  {
    key: 'deliver', label: i18nT('food.receptionLab.sidebar.deliver_label'), icon: <LocalShippingIcon />, children: [
      { key: 'deliver.ready', label: i18nT('food.receptionLab.sidebar.deliver.children.ready') },
      { key: 'deliver.log', label: i18nT('food.receptionLab.sidebar.deliver.children.log') },
    ],
  },
  { key: 'samples', label: i18nT('food.receptionLab.sidebar.samples_label'), icon: <BiotechIcon />, children: [{ key: 'samples', label: i18nT('food.receptionLab.sidebar.samples.children.samples') }] },
  { key: 'rejected', label: i18nT('food.receptionLab.sidebar.rejected_label'), icon: <BlockIcon />, children: [{ key: 'rejected', label: i18nT('food.receptionLab.sidebar.rejected.children.rejected') }] },
  { key: 'alerts', label: i18nT('food.receptionLab.sidebar.alerts_label'), icon: <NotificationsActiveIcon />, children: [{ key: 'alerts', label: i18nT('food.receptionLab.sidebar.alerts.children.alerts') }] },
  { key: 'reports', label: i18nT('food.receptionLab.sidebar.reports_label'), icon: <AssessmentIcon />, children: [{ key: 'reports', label: i18nT('food.receptionLab.sidebar.reports.children.reports') }] },
];

const FOOTER_NAV_ITEMS = (i18nT: (key: string) => string): NavLeaf[] => [
  { key: 'settings', label: i18nT('food.receptionLab.footer.settings') },
  { key: 'help', label: i18nT('food.receptionLab.footer.help') },
];

const CHECKLIST_ITEMS = (i18nT: (key: string) => string): Array<{ key: string; label: string }> => [
  { key: 'label', label: i18nT('food.receptionLab.checklist.label') },
  { key: 'package_intact', label: i18nT('food.receptionLab.checklist.package_intact') },
  { key: 'no_leak', label: i18nT('food.receptionLab.checklist.no_leak') },
  { key: 'quantity_ok', label: i18nT('food.receptionLab.checklist.quantity_ok') },
  { key: 'data_match', label: i18nT('food.receptionLab.checklist.data_match') },
  { key: 'stored_ok', label: i18nT('food.receptionLab.checklist.stored_ok') },
  { key: 'seal_match', label: i18nT('food.receptionLab.checklist.seal_match') },
];

const REJECT_REASONS = (i18nT: (key: string) => string) => [
  i18nT('food.receptionLab.rejectReasons.package_damaged'),
  i18nT('food.receptionLab.rejectReasons.quantity_insufficient'),
  i18nT('food.receptionLab.rejectReasons.data_mismatch'),
  i18nT('food.receptionLab.rejectReasons.sample_expired'),
  i18nT('food.receptionLab.rejectReasons.temperature_unsuitable'),
  i18nT('food.receptionLab.rejectReasons.no_analysis_request'),
  i18nT('food.receptionLab.rejectReasons.no_sample_definition'),
  i18nT('food.receptionLab.rejectReasons.other'),
];

const CLASSIFICATION_OPTIONS = (i18nT: (key: string) => string) => [
  { value: 'ANALYSIS', label: i18nT('food.receptionLab.classification.ANALYSIS') },
  { value: 'REFERENCE', label: i18nT('food.receptionLab.classification.REFERENCE') },
];

const STATION_OPTIONS = (i18nT: (key: string) => string) => [
  { value: 'airport', label: i18nT('food.receptionLab.stations.airport') },
  { value: 'free_zone', label: i18nT('food.receptionLab.stations.free_zone') },
  { value: 'north_port', label: i18nT('food.receptionLab.stations.north_port') },
  { value: 'south_port', label: i18nT('food.receptionLab.stations.south_port') },
  { value: 'osif_port', label: i18nT('food.receptionLab.stations.osif_port') },
  { value: 'osman_diqna_port', label: i18nT('food.receptionLab.stations.osman_diqna_port') },
].map((s) => ({ value: s.value, label: s.label }));

const PACKAGING_TYPES = (i18nT: (key: string) => string) => [
  { value: 'bags', label: i18nT('food.receptionLab.packaging.types.bags') },
  { value: 'barrels', label: i18nT('food.receptionLab.packaging.types.barrels') },
  { value: 'cartons', label: i18nT('food.receptionLab.packaging.types.cartons') },
  { value: 'glass_bottles', label: i18nT('food.receptionLab.packaging.types.glass_bottles') },
  { value: 'metal_bottles', label: i18nT('food.receptionLab.packaging.types.metal_bottles') },
  { value: 'other', label: i18nT('food.receptionLab.packaging.types.other') },
].map((s) => ({ value: s.value, label: s.label }));

const PACKAGING_CONDITIONS = (i18nT: (key: string) => string) => [
  { value: 'intact', label: i18nT('food.receptionLab.packaging.conditions.intact') },
  { value: 'excellent', label: i18nT('food.receptionLab.packaging.conditions.excellent') },
  { value: 'partially_damaged', label: i18nT('food.receptionLab.packaging.conditions.partially_damaged') },
  { value: 'damaged', label: i18nT('food.receptionLab.packaging.conditions.damaged') },
].map((s) => ({ value: s.value, label: s.label }));

const QUANTITY_UNITS = (i18nT: (key: string) => string) => [
  { value: 'kg', label: i18nT('food.receptionLab.units.kg') },
  { value: 'g', label: i18nT('food.receptionLab.units.g') },
  { value: 'liter', label: i18nT('food.receptionLab.units.liter') },
  { value: 'ml', label: i18nT('food.receptionLab.units.ml') },
  { value: 'count', label: i18nT('food.receptionLab.units.count') },
].map((u) => ({ value: u.value, label: u.label }));

const PRIORITY_OPTIONS = (i18nT: (key: string) => string) => [
  { value: 'NORMAL', label: i18nT('food.receptionLab.priority.NORMAL') },
  { value: 'HIGH', label: i18nT('food.receptionLab.priority.HIGH') },
  { value: 'URGENT', label: i18nT('food.receptionLab.priority.URGENT') },
];

const REF_RETENTION_REASONS = (i18nT: (key: string) => string) => [
  { value: 'retest_on_appeal', label: i18nT('food.receptionLab.refRetention.re_test_on_appeal') },
  { value: 'alternatives_for_review', label: i18nT('food.receptionLab.refRetention.alternatives_for_review') },
  { value: 'other', label: i18nT('food.receptionLab.refRetention.other') },
].map((s) => ({ value: s.value, label: s.label }));

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

const emptyChecklist = () =>
  Object.fromEntries([
    'label', 'package_intact', 'no_leak', 'quantity_ok', 'data_match', 'stored_ok', 'seal_match',
  ].map((c) => [c, false]));

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

  const { t: i18nT } = useTranslation();

  const groupOf = (key: NavKey): NavGroup | undefined => SIDEBAR_GROUPS(i18nT).find((g) => g.children.some((c) => c.key === key));

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_GROUPS(i18nT).map((g) => [g.key, true])),
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
          reason: s.priority === 'URGENT' ? i18nT('food.receptionLab. _ _ _ ') : i18nT('food.receptionLab. _ _ _ '),
        });
      }
    }
    return list;
  }, [i18nT, samples.rows]);

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
    const group = SIDEBAR_GROUPS(i18nT).find((g) => g.key === key);
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
    if (!q) return notifyError(i18nT('food.receptionLab. _ _ _ _ _   qr '));
    setWizard((w) => ({ ...w, lookupBusy: true, lookupMessage: '' }));
    try {
      const r = await getLabSamples({ search: q, page_size: 10 });
      const items = r.data.data.results;
      if (items.length === 0) {
        setWizard((w) => ({ ...w, lookupBusy: false, matchedSample: null, lookupMessage: i18nT('food.receptionLab. _ _ _ ') }));
        return;
      }
      const m = items[0];
      setWizard((w) => ({
        ...w,
        lookupBusy: false,
        matchedSample: m,
        lookupMessage: i18nT('food.receptionLab.lookup_found', { count: items.length }),
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
      setWizard((w) => ({ ...w, lookupBusy: false, matchedSample: null, lookupMessage: i18nT('food.receptionLab. _   _ _ ') }));
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
      if (!wizard.sampleType.trim()) return notifyError(i18nT('food.receptionLab. _   _ '));
      if (!wizard.source) return notifyError(i18nT('food.receptionLab. _ '));
      if (wizard.classification === 'REFERENCE' && !wizard.refRetentionReason) return notifyError(i18nT('food.receptionLab. _ _ _ '));
    }
    setWizard((w) => ({ ...w, step: (w.step + 1) as 1 | 2 | 3 }));
  };

  const toggleChecklist = (key: string) => {
    setWizard((w) => ({ ...w, checklist: { ...w.checklist, [key]: !w.checklist[key] } }));
  };

  const submitWizard = async () => {
    if (!wizard.sampleType.trim()) return notifyError(i18nT('food.receptionLab. _ _ '));
    if (!wizard.source) return notifyError(i18nT('food.receptionLab. _ '));
    if (wizard.decision === 'reject' && !wizard.rejectionReason) return notifyError(i18nT('food.receptionLab. _ _ _ _ _ _ '));
    if (wizard.decision !== 'reject') {
      const unchecked = CHECKLIST_ITEMS(i18nT).filter((c) => !wizard.checklist[c.key]);
      if (unchecked.length > 0) return notifyError(i18nT('food.receptionLab. _ _ _ _ '));
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
          ? i18nT('food.receptionLab.reference_registered', { ref: refCreated.ref_number })
          : i18nT('food.receptionLab.sample_received', { number: sample.sample_number })
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? i18nT('food.receptionLab. _ ');
      notifyError(msg);
    } finally {
      setWizard((w) => ({ ...w, busy: false }));
    }
  };

  const submitRef = async () => {
    if (!refForm.product.trim()) return notifyError(i18nT('food.receptionLab. _ _ _ '));
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
      notifySuccess(i18nT('food.receptionLab. _ _ '));
      setRefOpen(false);
      setRefForm(emptyRefForm());
      refreshReferences();
    } catch {
      notifyError(i18nT('food.receptionLab. _ _ '));
    }
  };

  const stepSubtitle = wizard.step === 1 ? i18nT('food.receptionLab.str89') : wizard.step === 2 ? i18nT('food.receptionLab.str68') : i18nT('food.receptionLab.   _ ');

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
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{i18nT('food.receptionLab. _ _ ')}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{i18nT('food.receptionLab. _ _   fclis')}</Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title={i18nT('food.receptionLab.attr63')}>
              <IconButton aria-label={i18nT('food.receptionLab.attr63')} sx={{ color: 'text.secondary' }} onClick={() => setNav('alerts')}>
                <Badge badgeContent={alerts.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={i18nT('food.receptionLab.attr47')}>
              <IconButton aria-label={i18nT('food.receptionLab.attr38')} onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>
                  {(user?.full_name || user?.email || i18nT('food.receptionLab.str96')).charAt(0)}
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
                  {user?.full_name || i18nT('food.receptionLab.str83')}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>{i18nT('food.receptionLab.jsx3')}</MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pt: 9, px: { xs: 2, md: 3.5 }, pb: 4, maxWidth: 1760, mx: 'auto' }}>
        <DashboardHero
          eyebrow="FCLIS — Reception Desk"
          title={i18nT('food.receptionLab. _ _   fclis')}
          subtitle={i18nT('food.receptionLab. _  _ _   _   _ _ _ ')}
          gradient="emerald"
          avatarLabel={(user?.full_name || i18nT('food.receptionLab.str97')).slice(0, 1)}
          action={
            <Stack direction="row" spacing={1}>
              <AppButton startIcon={<NotificationsActiveIcon />} variant="secondary" onClick={() => setNav('alerts')}>
                {i18nT('food.receptionLab.alerts')} {alerts.length > 0 ? `(${alerts.length})` : ''}
              </AppButton>
              <AppButton startIcon={<AddIcon />} onClick={openWizard}>{i18nT('food.receptionLab. _ ')}</AppButton>
            </Stack>
          }
          chips={[
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />{i18nT('food.receptionLab.jsx5')}</Box>,
          ]}
        />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS(i18nT) as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={i18nT('food.receptionLab.attr51')}
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
            {SIDEBAR_GROUPS(i18nT).map((group) => {
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
            {FOOTER_NAV_ITEMS(i18nT).map((item) => {
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
                {(user?.full_name || user?.email || i18nT('food.receptionLab.str96')).charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user?.full_name || i18nT('food.receptionLab. _ ')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontWeight: 700 }}>
                  <CircleIcon sx={{ fontSize: 10 }} />{i18nT('food.receptionLab.jsx6')}</Typography>
              </Box>
            </Stack>
            <AppButton fullWidth size="small" variant="ghost" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ mt: 1, color: 'error.main' }}>{i18nT('food.receptionLab.jsx7')}</AppButton>
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
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{i18nT('food.receptionLab. _ ')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {i18nT('food.receptionLab.step_of', { step: wizard.step, total: 3 })} — {stepSubtitle}
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
                  <QrCodeScannerIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />{i18nT('food.receptionLab. _ _ _ _ _ qr   barcode')}</Typography>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <FormTextField
                      label={i18nT('food.receptionLab. _   _   qr')}
                      value={wizard.lookupKey}
                      onChange={(e) => wizardField({ lookupKey: e.target.value })}
                      placeholder={i18nT('food.receptionLab. _ _ _ _ _ _ _ ')}
                      onKeyDown={(e) => { if (e.key === 'Enter') runLookup(); }}
                      InputProps={{ startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    />
                  </Box>
                  <AppButton startIcon={<SearchIcon />} onClick={() => runLookup()} loading={wizard.lookupBusy} sx={{ mt: 2.5 }}>{i18nT('food.receptionLab.jsx9')}</AppButton>
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
                    <AppButton size="small" variant="ghost" onClick={() => setWizard((w) => ({ ...w, matchedSample: null, lookupMessage: '', refOriginalNumber: '' }))}>{i18nT('food.receptionLab.jsx10')}</AppButton>
                  </Box>
                )}
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <FormSelect label={i18nT('food.receptionLab.attr57')} requiredMark value={wizard.source} onChange={(v) => wizardField({ source: v })} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} placeholder={i18nT('food.receptionLab. _   ')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label={i18nT('food.receptionLab.attr69')} requiredMark value={wizard.classification} onChange={(v) => wizardField({ classification: v })} options={CLASSIFICATION_OPTIONS(i18nT)} />
                </Grid>
              </Grid>

              {wizard.classification === 'REFERENCE' ? (
                <Stack spacing={1.5}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{i18nT('food.receptionLab. _ ')}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _   ')} requiredMark value={wizard.sampleType} onChange={(e) => wizardField({ sampleType: e.target.value })} placeholder={i18nT('food.receptionLab.  _ ')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _ ')} value={wizard.refOriginalNumber} onChange={(e) => wizardField({ refOriginalNumber: e.target.value })} placeholder={i18nT('food.receptionLab. _ _ ')} disabled={Boolean(wizard.matchedSample)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _ ')} value={wizard.analysisRequestNumber} onChange={(e) => wizardField({ analysisRequestNumber: e.target.value })} placeholder={i18nT('food.receptionLab. _ ')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab.attr46')} value={wizard.requestingDepartment} onChange={(e) => wizardField({ requestingDepartment: e.target.value })} placeholder={i18nT('food.receptionLab. _ _ _   ')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label={i18nT('food.receptionLab.attr65')} requiredMark value={wizard.refRetentionReason} onChange={(v) => wizardField({ refRetentionReason: v })} placeholder={i18nT('food.receptionLab. _   ')} options={REF_RETENTION_REASONS(i18nT)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _ ')} value={wizard.refQuantity} onChange={(e) => wizardField({ refQuantity: e.target.value })} placeholder={i18nT('food.receptionLab.  200 g')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab.attr54')} value={wizard.refStorageLocation} onChange={(e) => wizardField({ refStorageLocation: e.target.value })} placeholder={i18nT('food.receptionLab.  _ _ a')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _   _ ')} value={wizard.refStorageTemp} onChange={(e) => wizardField({ refStorageTemp: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab.attr53')} value={wizard.refRetentionDuration} onChange={(e) => wizardField({ refRetentionDuration: e.target.value })} placeholder={i18nT('food.receptionLab.  6 ')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label={i18nT('food.receptionLab.   ')} value={wizard.station} onChange={(v) => wizardField({ station: v })} placeholder={i18nT('food.receptionLab.   ')} options={STATION_OPTIONS(i18nT)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{i18nT('food.receptionLab. _ ')}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab.   _ ')} requiredMark value={wizard.sampleType} onChange={(e) => wizardField({ sampleType: e.target.value })} placeholder={i18nT('food.receptionLab.  milk powder')} />
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
                              <Typography component="label" variant="body2" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>{i18nT('food.receptionLab. _ _ _ _  catalog ')}</Typography>
                              <TextField {...params} variant="outlined" size="small" placeholder={i18nT('food.receptionLab. _ _ _   ')} />
                            </Box>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab. _ ')} value={wizard.analysisRequestNumber} onChange={(e) => wizardField({ analysisRequestNumber: e.target.value })} placeholder="LAB-2026-00125" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormTextField label={i18nT('food.receptionLab.attr46')} value={wizard.requestingDepartment} onChange={(e) => wizardField({ requestingDepartment: e.target.value })} placeholder={i18nT('food.receptionLab. _ _   ')} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label={i18nT('food.receptionLab.attr66')} value={wizard.priority} onChange={(v) => wizardField({ priority: v })} options={PRIORITY_OPTIONS(i18nT)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormSelect label={i18nT('food.receptionLab.   ')} value={wizard.station} onChange={(v) => wizardField({ station: v })} placeholder={i18nT('food.receptionLab.   ')} options={STATION_OPTIONS(i18nT)} />
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{i18nT('food.receptionLab. _ _ _ _ _ _ _ _ _ ')}</Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          )}

          {wizard.step === 2 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{i18nT('food.receptionLab. _ _ _ _ ')}</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr61')} value={wizard.inspectorName} onChange={(e) => wizardField({ inspectorName: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr29')} value={wizard.brand} onChange={(e) => wizardField({ brand: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr60')} value={wizard.originCountry} onChange={(e) => wizardField({ originCountry: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr58')} value={wizard.batchNumber} onChange={(e) => wizardField({ batchNumber: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr44')} type="date" value={wizard.productionDate} onChange={(e) => wizardField({ productionDate: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab.attr40')} type="date" value={wizard.expiryDate} onChange={(e) => wizardField({ expiryDate: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormTextField label={i18nT('food.receptionLab.attr72')} type="number" value={wizard.quantity} onChange={(e) => wizardField({ quantity: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormSelect label={i18nT('food.receptionLab.attr71')} value={wizard.quantityUnit} onChange={(v) => wizardField({ quantityUnit: v })} placeholder="—" options={QUANTITY_UNITS(i18nT)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormTextField label={i18nT('food.receptionLab. _ ')} type="number" value={wizard.unitsCount} onChange={(e) => wizardField({ unitsCount: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label={i18nT('food.receptionLab.attr56')} value={wizard.packagingType} onChange={(v) => wizardField({ packagingType: v })} placeholder="—" options={PACKAGING_TYPES(i18nT)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormSelect label={i18nT('food.receptionLab.attr50')} value={wizard.packagingCondition} onChange={(v) => wizardField({ packagingCondition: v })} placeholder="—" options={PACKAGING_CONDITIONS(i18nT)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormTextField label={i18nT('food.receptionLab. _   _ ')} type="number" value={wizard.temperature} onChange={(e) => wizardField({ temperature: e.target.value })} />
                </Grid>
              </Grid>
            </Stack>
          )}

          {wizard.step === 3 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{i18nT('food.receptionLab. _ _ _ ')}</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 2, bgcolor: '#F4F6F9' }}>
                <Stack spacing={0.25}>
                  {CHECKLIST_ITEMS(i18nT).map((c) => (
                    <FormControlLabel
                      key={c.key}
                      control={<Checkbox checked={Boolean(wizard.checklist[c.key])} onChange={() => toggleChecklist(c.key)} />}
                      label={c.label}
                    />
                  ))}
                </Stack>
              </Box>

              <FormSelect
                label={i18nT('food.receptionLab.attr43')}
                value={wizard.decision}
                onChange={(v) => wizardField({ decision: v as 'accept' | 'conditional' | 'reject' })}
                options={[
                  { value: 'accept', label: i18nT('food.receptionLab.str61') },
                  { value: 'conditional', label: i18nT('food.receptionLab.str65') },
                  { value: 'reject', label: i18nT('food.receptionLab.str67') },
                ]}
              />

              {wizard.decision === 'reject' ? (
                <>
                  <FormSelect label={i18nT('food.receptionLab.attr64')} requiredMark value={wizard.rejectionReason} onChange={(v) => wizardField({ rejectionReason: v })} placeholder={i18nT('food.receptionLab. _   ')} options={REJECT_REASONS(i18nT).map((r) => ({ value: r, label: r }))} />
                  <FormTextField label={i18nT('food.receptionLab.attr45')} multiline minRows={2} value={wizard.rejectionNotes} onChange={(e) => wizardField({ rejectionNotes: e.target.value })} />
                </>
              ) : (
                <FormTextField label={i18nT('food.receptionLab.attr41')} multiline minRows={2} value={wizard.receptionNotes} onChange={(e) => wizardField({ receptionNotes: e.target.value })} />
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions>
          <AppButton variant="ghost" onClick={() => setWizard((w) => ({ ...w, open: false }))} disabled={wizard.busy}>{i18nT('food.receptionLab.jsx17')}</AppButton>
          {wizard.step > 1 && (
            <AppButton variant="secondary" onClick={() => setWizard((w) => ({ ...w, step: (w.step - 1) as 1 | 2 | 3 }))} disabled={wizard.busy}>{i18nT('food.receptionLab.jsx18')}</AppButton>
          )}
          {wizard.step < 3 ? (
            <AppButton onClick={nextStep}>{i18nT('food.receptionLab.jsx1')}</AppButton>
          ) : (
            <AppButton startIcon={<CheckCircleIcon />} onClick={submitWizard} loading={wizard.busy}>
              {wizard.decision === 'reject' ? i18nT('food.receptionLab.str63') : i18nT('food.receptionLab. _ ')}
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
  const { t: i18nT } = useTranslation();
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.receptionLab.jsx19')}</Typography>
      <Grid container spacing={1.5}>
        {stat(i18nT('food.receptionLab.str93'), dash?.today ?? 0, '#0B5ED7', <ScheduleIcon />, 'lg')}
        {stat(i18nT('food.receptionLab. _  _ '), dash?.accepted ?? 0, '#1d7a54', <CheckCircleIcon />, 'lg')}
        {stat(i18nT('food.receptionLab.  _ _ '), dash?.pending ?? 0, '#FFC107', <RadioButtonUncheckedIcon />, 'lg')}
      </Grid>
      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {stat(i18nT('food.receptionLab.str84'), dash?.rejected ?? 0, '#c63a3a', <CircleIcon />)}
        {stat(i18nT('food.receptionLab.str65'), dash?.conditional ?? 0, '#FFC107', <RadioButtonUncheckedIcon />)}
        {stat(i18nT('food.receptionLab.   '), dash?.needs_review ?? 0, '#c63a3a', <NotificationsActiveIcon />)}
        {stat(i18nT('food.receptionLab.str60'), dash?.references ?? 0, '#0B5ED7', <ArchiveIcon />)}
        {stat(i18nT('food.receptionLab. _ _  _ '), dash?.avg_reception_minutes, '#1d7a54', <ScheduleIcon />)}
        {stat(i18nT('food.receptionLab. _  _ '), receivedToday, '#0B5ED7', <BiotechIcon />)}
      </Grid>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('workflow')} data-section="workflow" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, scrollMarginTop: '80px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.receptionLab.jsx20')}</Typography>
            <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab.workflow_steps')}</Typography>
            <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab.workflow_rules')}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <AppButton size="small" startIcon={<AddIcon />} onClick={onReceive}>{i18nT('food.receptionLab.jsx22')}</AppButton>
              <AppButton size="small" variant="secondary" onClick={onSamples}>{i18nT('food.receptionLab.jsx23')}</AppButton>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, scrollMarginTop: '80px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {i18nT('food.receptionLab.alerts')} {alerts.length > 0 ? <Chip size="small" color="error" label={alerts.length} /> : null}
            </Typography>
            {alerts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab. _ _ _ _ _ _ ')}</Typography>
            ) : (
              <Stack spacing={0.75}>
                {alerts.slice(0, 4).map((a) => (
                  <Stack key={a.sample.id} direction="row" spacing={1} alignItems="center">
                    <StatusChip label={labPriority[a.sample.priority]?.label ?? a.sample.priority} tone={labPriority[a.sample.priority]?.tone} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.sample.sample_number}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{a.reason}</Typography>
                    <AppButton size="small" variant="secondary" onClick={() => onOpenSample(a.sample.id)}>{i18nT('food.receptionLab.jsx2')}</AppButton>
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
  const { t: i18nT } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'received_at', label: i18nT('food.receptionLab.str57'), render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: i18nT('food.receptionLab.str54'), render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'priority', label: i18nT('food.receptionLab.str73'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx2')}</AppButton>
          <IconButton aria-label={i18nT('food.receptionLab.attr73')} size="small" onClick={() => onPrint(s)}><PrintIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [i18nT, onOpenSample, onPrint]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={onRegister}>{i18nT('food.receptionLab.   _ ')}</AppButton>
      </Box>
      <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title={i18nT('food.receptionLab. _ ')} />
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
  const { t: i18nT } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'station', label: i18nT('food.receptionLab.str87'), render: (s) => s.station || '—' },
    { key: 'brand', label: i18nT('food.receptionLab.str76'), render: (s) => s.brand || '—' },
    { key: 'quantity', label: i18nT('food.receptionLab.str79'), render: (s) => (s.quantity != null ? `${s.quantity} ${s.quantity_unit ?? ''}`.trim() : '—') },
    { key: 'temperature', label: i18nT('food.receptionLab.str77'), render: (s) => (s.temperature != null ? `${s.temperature}°` : '—') },
    { key: 'reception_status', label: i18nT('food.receptionLab.str54'), render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'status', label: i18nT('food.receptionLab.str80'), render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'priority', label: i18nT('food.receptionLab.str73'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'bench', label: i18nT('food.receptionLab.str91'), render: (s) => labBench[s.bench]?.label ?? s.bench },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx2')}</AppButton>
          <AppButton size="small" variant="secondary" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{i18nT('food.receptionLab.jsx3')}</AppButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onPrint]);

  return <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title={i18nT('food.receptionLab. _   _ ')} />;
};

/* ================== العينات المرجعية ================== */

const refStatus: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STORED: { label: 'stored', tone: 'success' },
  RETRIEVED: { label: 'retrieved', tone: 'warning' },
  DISCARDED: { label: 'discarded', tone: 'error' },
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
}) => {
  const { t: i18nT } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<ReferenceSample | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDeleteReference = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteReferenceSample(deleteTarget.id);
      notifySuccess(i18nT('food.receptionLab.str75'));
      setDeleteTarget(null);
      onRefresh();
    } catch {
      notifyError(i18nT('food.receptionLab.str66'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
  <Box>
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
      <AppButton startIcon={<AddIcon />} onClick={onOpenRegister}>{i18nT('food.receptionLab. _ ')}</AppButton>
    </Box>
    <Grid container spacing={1.5}>
      {references.length === 0 && (
        <Grid item xs={12}><Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab. _ _ _ _ ')}</Typography></Grid>
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
              {i18nT('food.receptionLab.original_sample')}: {r.original_sample_number ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {i18nT('food.receptionLab.location')}: {r.storage_location || '—'} • {i18nT('food.receptionLab.seal')}: {r.seal_number || '—'}
              {r.quantity != null ? ` • ${i18nT('food.receptionLab.quantity')}: ${r.quantity}` : ''}
              {r.retention_reason ? ` • ${i18nT('food.receptionLab.reason')}: ${r.retention_reason}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {i18nT('food.receptionLab.received')}: {formatDateTime(r.received_at)} — {r.received_by_name ?? '—'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <AppButton size="small" variant="secondary" disabled={r.status !== 'STORED'} onClick={async () => {
                try { await retrieveReferenceSample(r.id, i18nT('food.receptionLab. _ ')); notifySuccess(i18nT('food.receptionLab.str71')); onRefresh(); } catch { notifyError(i18nT('food.receptionLab.str58')); }
              }}>{i18nT('food.receptionLab.jsx28')}</AppButton>
              <AppButton size="small" variant="danger" disabled={r.status === 'DISCARDED'} onClick={async () => {
                try { await discardReferenceSample(r.id, i18nT('food.receptionLab.str92')); notifySuccess(i18nT('food.receptionLab.str64')); onRefresh(); } catch { notifyError(i18nT('food.receptionLab.str58')); }
              }}>{i18nT('food.receptionLab.jsx29')}</AppButton>
              <IconButton aria-label={i18nT('food.receptionLab.attr74')} size="small" color="error" onClick={() => setDeleteTarget(r)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>

    <FormDialog open={dialogOpen} onClose={dialogClose} onSubmit={submitRef} title={i18nT('food.receptionLab. _ ')} subtitle={i18nT('food.receptionLab. _ _ _ _ ')} maxWidth="sm">
      <FormTextField label={i18nT('food.receptionLab. _   ')} requiredMark value={refForm.product} onChange={(e) => setRefForm((f) => ({ ...f, product: e.target.value }))} />
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab.   ')} value={refForm.origin} onChange={(e) => setRefForm((f) => ({ ...f, origin: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab. _ ')} value={refForm.originalSample} onChange={(e) => setRefForm((f) => ({ ...f, originalSample: e.target.value }))} placeholder={i18nT('food.receptionLab. _ ')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab.attr72')} value={refForm.quantity} onChange={(e) => setRefForm((f) => ({ ...f, quantity: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab. _ _   _ ')} value={refForm.storageTemp} onChange={(e) => setRefForm((f) => ({ ...f, storageTemp: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormSelect label={i18nT('food.receptionLab.attr49')} value={refForm.retentionReason} onChange={(v) => setRefForm((f) => ({ ...f, retentionReason: v }))} placeholder="—" options={REF_RETENTION_REASONS(i18nT)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab. _   ')} value={refForm.storage} onChange={(e) => setRefForm((f) => ({ ...f, storage: e.target.value }))} placeholder={i18nT('food.receptionLab.  _ _ a')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab.attr62')} value={refForm.seal} onChange={(e) => setRefForm((f) => ({ ...f, seal: e.target.value }))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField label={i18nT('food.receptionLab.attr70')} value={refForm.coding} onChange={(e) => setRefForm((f) => ({ ...f, coding: e.target.value }))} />
        </Grid>
      </Grid>
      <FormTextField label={i18nT('food.receptionLab.attr68')} value={refForm.remarks} onChange={(e) => setRefForm((f) => ({ ...f, remarks: e.target.value }))} multiline minRows={2} />
    </FormDialog>

    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title={i18nT('food.receptionLab. _ ')}
      message={i18nT('food.receptionLab.confirm_delete_reference', { name: deleteTarget?.product_name || '', ref: deleteTarget?.ref_number || '—' })}
      confirmLabel={i18nT('food.receptionLab.attr74')}
      tone="error"
      loading={deleteBusy}
      onClose={() => {
        if (!deleteBusy) setDeleteTarget(null);
      }}
      onConfirm={confirmDeleteReference}
    />
  </Box>
  );
};

/* ================== سلسلة الحيازة (قراءة فقط) ================== */

const TrackingSection = () => {
  const { t: i18nT } = useTranslation();
  const [events, setEvents] = useState<ChainOfCustody[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCustodyEvents({ page_size: 50 })
      .then((r) => setEvents(r.data.data.results))
      .catch(() => notifyError(i18nT('food.receptionLab. _ _ ')))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab. _ _ _   ')}</Typography>;
  if (events.length === 0) return <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab. _ _ _ _ ')}</Typography>;
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab. _   _ ')}</Typography>
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
                {i18nT('food.receptionLab.transferred')}: {formatDateTime(ev.transferred_at)} — {ev.transferred_by_name ?? '—'}{ev.is_received ? ` • ${i18nT('food.receptionLab.received_by')}: ${ev.received_by_name ?? ''}` : i18nT('food.receptionLab.not_received')}
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
  const { t: i18nT } = useTranslation();
  const rows = [
    { label: i18nT('food.receptionLab.str62'), value: dash?.today ?? 0 },
    { label: i18nT('food.receptionLab. _ '), value: dash?.pending ?? 0 },
    { label: i18nT('food.receptionLab.str82'), value: dash?.accepted ?? 0 },
    { label: i18nT('food.receptionLab.str65'), value: dash?.conditional ?? 0 },
    { label: i18nT('food.receptionLab.str84'), value: dash?.rejected ?? 0 },
    { label: i18nT('food.receptionLab.   _ '), value: dash?.needs_review ?? 0 },
    { label: i18nT('food.receptionLab.str60'), value: referencesCount },
  ];
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab.jsx33')}</Typography>
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
        <Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab. _ _ _ _ _ _ _ _ ')}</Typography>
      </Box>
    </Box>
  );
};

/* ================== التنبيهات ================== */

const AlertsSection = ({ alerts, onOpenSample }: { alerts: Array<{ sample: FoodSample; reason: string }>; onOpenSample: (id: string) => void }) => {
  const { t: i18nT } = useTranslation();
  return (
    <Box>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab.   _ _ _ _ ')}</Typography>
    {alerts.length === 0 && <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab. _ _ _ ')}</Typography>}
    <Stack spacing={1}>
      {alerts.map((a) => (
        <Box key={a.sample.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'error.main' }}><NotificationsActiveIcon /></Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{a.sample.sample_number} — {a.sample.sample_type}</Typography>
            <Typography variant="caption" color="text.secondary">{a.reason}{a.sample.priority === 'URGENT' ? i18nT('food.receptionLab.  ') : ''}</Typography>
          </Box>
          <StatusChip label={labPriority[a.sample.priority]?.label ?? a.sample.priority} tone={labPriority[a.sample.priority]?.tone} />
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(a.sample.id)}>{i18nT('food.receptionLab.jsx37')}</AppButton>
        </Box>
      ))}
    </Stack>
  </Box>
  );
}

/* ================== العينات المعلقة (بانتظار القرار) ================== */

const PendingSection = ({
  table, onOpenSample, onPrint,
}: {
  table: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
  onPrint: (s: FoodSample) => void;
}) => {
  const { t: i18nT } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'priority', label: i18nT('food.receptionLab.str73'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'received_at', label: i18nT('food.receptionLab.str57'), render: (s) => formatDateTime(s.received_at) },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx37')}</AppButton>
          <IconButton aria-label={i18nT('food.receptionLab.attr73')} size="small" onClick={() => onPrint(s)}><PrintIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onPrint]);

  return <FoodDataTable<FoodSample> columns={columns} table={table} title={i18nT('food.receptionLab. _   _ _ ')} />;
};

/* ================== العينات المرفوضة ================== */

const RejectedSection = ({
  table, onOpenSample,
}: {
  table: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
}) => {
  const { t: i18nT } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'rejection_reason', label: i18nT('food.receptionLab.str69'), render: (s) => s.rejection_reason || '—' },
    { key: 'reception_decision_at', label: i18nT('food.receptionLab.str70'), render: (s) => formatDateTime(s.reception_decision_at) },
    { key: 'reception_decision_by_name', label: i18nT('food.receptionLab.str85'), render: (s) => s.reception_decision_by_name || '—' },
    { key: 'actions', label: '', render: (s) => <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx2')}</AppButton> },
  ], [i18nT, onOpenSample]);

  return <FoodDataTable<FoodSample> columns={columns} table={table} title={i18nT('food.receptionLab.attr31')} />;
};

/* ================== البحث / التحقق المشترك ================== */

const SampleLookupStrip = ({ placeholder, onSearch, busy }: { placeholder: string; onSearch: (q: string) => void; busy: boolean }) => {
  const { t: i18nT } = useTranslation();
  const [q, setQ] = useState('');
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <FormTextField
          label={i18nT('food.receptionLab. _   _   qr')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(q); }}
          InputProps={{ startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
      </Box>
      <AppButton startIcon={<SearchIcon />} onClick={() => onSearch(q)} loading={busy} sx={{ mt: 2.5 }}>{i18nT('food.receptionLab.jsx4')}</AppButton>
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
  const { t: i18nT } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodSample[]>([]);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError(i18nT('food.receptionLab. _ _ _ _ _   qr'));
    setBusy(true);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 20 });
      setResults(r.data.data.results);
      setMessage(r.data.data.count === 0 ? i18nT('food.receptionLab.no_results') : i18nT('food.receptionLab.found_results', { count: r.data.data.count }));
    } catch {
      setMessage(i18nT('food.receptionLab. _   _ _ '));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab. _ _ ')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{i18nT('food.receptionLab. barcode   qr _ _ _ _ _ _ _ _ _ _ _ _ _ _ ')}</Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder={i18nT('food.receptionLab. _ _ _ _ _   ')} onSearch={search} busy={busy} /></Box>
      {message && <Typography variant="caption" color={results.length > 0 ? 'success.main' : 'warning.main'} sx={{ display: 'block', mb: 1 }}>{message}</Typography>}
      {results.length > 0 && (
        <Stack spacing={1}>
          {results.map((s) => (
            <Box key={s.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.sample_number}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.sample_type}{s.inspector_name ? ` — ${i18nT('food.receptionLab.inspector')}: ${s.inspector_name}` : ''}{s.received_at ? ` — ${formatDateTime(s.received_at)}` : ''}
                </Typography>
              </Box>
              <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx40')}</AppButton>
              <AppButton size="small" variant="secondary" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{i18nT('food.receptionLab.jsx3')}</AppButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

/* ================== التحقق من البيانات ================== */

const VerifyDataSection = ({ onOpenSample }: { onOpenSample: (id: string) => void }) => {
  const { t: i18nT } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError(i18nT('food.receptionLab. _ _ _ _ _   qr'));
    setBusy(true);
    setSample(null);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 5 });
      const m = r.data.data.results[0];
      if (!m) { setMessage(i18nT('food.receptionLab. _ _ _ ')); return; }
      const detail = await getLabSample(m.id);
      setSample(detail.data.data);
      setMessage(i18nT('food.receptionLab. _ _   _ _ _ _ _ '));
    } catch {
      setMessage(i18nT('food.receptionLab. _   _ _ '));
    } finally {
      setBusy(false);
    }
  };

  const checklist = sample?.reception_checklist ?? {};

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab. _ _ ')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{i18nT('food.receptionLab. _ _  _ _ _ _ _ _ _ _ _ _ _ _ _ ')}</Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder={i18nT('food.receptionLab. _ _ _ _   ')} onSearch={search} busy={busy} /></Box>
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
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx5')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.sample_type}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab. _ ')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.analysis_request_number || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx6')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.source_name ?? '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx44')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.requesting_department || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx7')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.inspector_name || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx8')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.station || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx45')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.brand || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx46')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.origin_country || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx47')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.batch_number || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx9')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.quantity != null ? `${sample.quantity} ${sample.quantity_unit ?? ''}`.trim() : '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab.jsx48')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{sample.temperature != null ? `${sample.temperature}°` : '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">{i18nT('food.receptionLab. _   ')}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{`${sample.packaging_type || '—'} / ${sample.packaging_condition || '—'}`}</Typography></Grid>
              </Grid>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <AppButton size="small" variant="secondary" onClick={() => onOpenSample(sample.id)}>{i18nT('food.receptionLab. _ ')}</AppButton>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.receptionLab. _ ')}</Typography>
              <Stack spacing={0.5}>
                {CHECKLIST_ITEMS(i18nT).map((c) => (
                  <Stack key={c.key} direction="row" alignItems="center" spacing={1}>
                    <StatusChip label={checklist[c.key] ? i18nT('food.receptionLab.str95') : i18nT('food.receptionLab.str74')} tone={checklist[c.key] ? 'success' : checklist[c.key] === false ? 'error' : 'neutral'} />
                    <Typography variant="body2">{c.label}</Typography>
                  </Stack>
                ))}
              </Stack>
              {sample.rejection_reason && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#FDECEA' }}>
                  <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>{i18nT('food.receptionLab.rejection_reason')}: {sample.rejection_reason}</Typography>
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
  const { t: i18nT } = useTranslation();
  const isCreate = mode === 'create';
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodSample[]>([]);
  const [message, setMessage] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return notifyError(i18nT('food.receptionLab. _ _ _ _ _   qr'));
    setBusy(true);
    setMessage('');
    try {
      const r = await getLabSamples({ search: q.trim(), page_size: 20 });
      setResults(r.data.data.results);
      setMessage(r.data.data.count === 0 ? i18nT('food.receptionLab.no_results') : i18nT('food.receptionLab.found_samples', { count: r.data.data.count }));
    } catch {
      setMessage(i18nT('food.receptionLab. _   _ _ '));
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'reception_status', label: i18nT('food.receptionLab.str54'), render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{isCreate ? i18nT('food.receptionLab.   ') : i18nT('food.receptionLab.str56')}</AppButton>
          <IconButton aria-label={i18nT('food.receptionLab.attr59')} size="small" onClick={() => onOpenSample(s.id)}><CircleIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [i18nT, onPrint, onOpenSample, isCreate]);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{isCreate ? i18nT('food.receptionLab. barcode   qr') : i18nT('food.receptionLab.str51')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isCreate
          ? i18nT('food.receptionLab. _ _ _ _ _ _   qr _ _ _ _ _ _ ')
          : i18nT('food.receptionLab. _ _ _   qr _ _ _ _ _ _ ')}
      </Typography>
      <Box sx={{ mb: 2 }}><SampleLookupStrip placeholder={isCreate ? i18nT('food.receptionLab. _ _ _ _ _ _   ') : i18nT('food.receptionLab. _ _ _ _ _ _   ')} onSearch={search} busy={busy} /></Box>
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
              <AppButton size="small" startIcon={<PrintIcon />} onClick={() => onPrint(s)}>{isCreate ? i18nT('food.receptionLab.   ') : i18nT('food.receptionLab.str90')}</AppButton>
            </Box>
          ))}
        </Stack>
      )}
      {!isCreate && results.length === 0 && <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title={i18nT('food.receptionLab. _   _ ')} />}
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
  const { t: i18nT } = useTranslation();
  const [delivering, setDelivering] = useState<string | null>(null);

  const doDeliver = async (s: FoodSample) => {
    setDelivering(s.id);
    try {
      await transferSample(s.id, {
        from_department: i18nT('food.receptionLab. _ '),
        to_department: i18nT('food.receptionLab. _ '),
        remarks: i18nT('food.receptionLab. _ _ '),
      });
      notifySuccess(i18nT('food.receptionLab.delivered_to_coordinator', { number: s.sample_number }));
      table.refresh();
    } catch {
      notifyError(i18nT('food.receptionLab. _ _   _ _ '));
    } finally {
      setDelivering(null);
    }
  };

  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: i18nT('food.receptionLab.str94'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: i18nT('food.receptionLab.str78') },
    { key: 'source_name', label: i18nT('food.receptionLab.str81'), render: (s) => s.source_name ?? '—' },
    { key: 'received_at', label: i18nT('food.receptionLab.str57'), render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: i18nT('food.receptionLab.str54'), render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" startIcon={<LocalShippingIcon />} loading={delivering === s.id} onClick={() => doDeliver(s)}>{i18nT('food.receptionLab.jsx52')}</AppButton>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{i18nT('food.receptionLab.jsx2')}</AppButton>
        </Stack>
      ),
    },
  ], [i18nT, onOpenSample, delivering]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{i18nT('food.receptionLab. _ _ _ _ _ _  _ _ _ _ _ _   _ _ _ _ _ _ _ ')}</Typography>
      <FoodDataTable<FoodSample> columns={columns} table={table} title={i18nT('food.receptionLab. _   _ _ ')} />
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
  const { t: i18nT } = useTranslation();
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
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab.jsx10')}</Typography>
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{i18nT('food.receptionLab.jsx11')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.full_name || i18nT('food.receptionLab.str83')} — {user?.email || ''} • {i18nT('food.receptionLab.role')}: {i18nT('food.receptionLab.sample_reception_officer')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{i18nT('food.receptionLab. _ _ _ _ _  _ _ _ _ _ _ _ _ _ _ _ ')}</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'success.main', borderRadius: 2.5, bgcolor: '#F2FBF4' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>{i18nT('food.receptionLab. _ ')}</Typography>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>{i18nT('food.receptionLab. _ _ ')}</Typography>
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

const HelpSection = () => {
  const { t: i18nT } = useTranslation();
  return (
    <Box sx={{ maxWidth: 900 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{i18nT('food.receptionLab.   _ _ _ ')}</Typography>
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 2 }}>
      <Stack spacing={1.5}>
        {[
          [i18nT('food.receptionLab.str53'), i18nT('food.receptionLab. _ _ _ _ ')],
          [i18nT('food.receptionLab. _ _ '), i18nT('food.receptionLab. _ _ _ _ _ _ _ _ _ _ ')],
          [i18nT('food.receptionLab. _ '), i18nT('food.receptionLab. _  _ _ _ _ _ _ _ ')],
          [i18nT('food.receptionLab. barcode   qr'), i18nT('food.receptionLab. _   qr _ _ _ ')],
          [i18nT('food.receptionLab.str52'), i18nT('food.receptionLab. _ _ _ _ _ _ _ _ _ ')],
          [i18nT('food.receptionLab.str59'), i18nT('food.receptionLab. _ _ _ _ _ _ _ _ _ _ _ ')],
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
      <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab.help_title')}</Typography>
      <Typography variant="body2" color="text.secondary">{i18nT('food.receptionLab.help_description')}</Typography>
    </Box>
  </Box>
  );
}

export default ReceptionLabPage;