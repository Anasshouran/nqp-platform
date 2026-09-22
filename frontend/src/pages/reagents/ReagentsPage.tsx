import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import BiotechIcon from '@mui/icons-material/Biotech';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VerifiedIcon from '@mui/icons-material/Verified';
import ScienceIcon from '@mui/icons-material/Science';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import {
  AppButton,
  DataTable,
  FormDialog,
  FormSelect,
  FormTextField,
  PageTabs,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  createDisposalRequest,
  createMaterial,
  createMaterialIssue,
  createMaterialLot,
  createSolution,
  disposeRequestAction,
  getDisposalRequests,
  getExpiryReport,
  getMaterialIssues,
  getMaterialLots,
  getMaterials,
  getMaterialManagementDashboard,
  getSolutions,
  getStorageLocations,
  updateMaterial,
  updateSolution,
  verifySolution,
} from '../../api/endpoints/foodlab';
import type {
  DisposalRequest,
  MaterialCatalog,
  MaterialIssue,
  MaterialLot,
  Solution,
  StorageLocation,
} from '../../types/food';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const MATERIAL_TYPES = [
  { value: 'REAGENT', label: 'كاشف' },
  { value: 'SOLUTION', label: 'محلول' },
  { value: 'REFERENCE_STANDARD', label: 'مادة قياسية مرجعية' },
  { value: 'CULTURE_MEDIA', label: 'وسط زرعي' },
  { value: 'CHEMICAL', label: 'مادة كيميائية' },
  { value: 'CONSUMABLE', label: 'مستهلك' },
  { value: 'CRM', label: 'مادة مرجعية معتمدة' },
];

const GRADES = [
  { value: 'ANALYTICAL', label: 'درجة تحليلية' },
  { value: 'HPLC', label: 'HPLC' },
  { value: 'REAGENT_GRADE', label: 'درجة كاشف' },
  { value: 'TECHNICAL', label: 'درجة تقنية' },
  { value: 'PHARMACEUTICAL', label: 'درجة دوائية' },
  { value: 'MICROBIOLOGICAL', label: 'درجة ميكروبيولوجية' },
  { value: 'OTHER', label: 'أخرى' },
];

const HAZARDS = [
  { value: 'NONE', label: 'غير خطرة' },
  { value: 'TOXIC', label: 'سامة' },
  { value: 'CORROSIVE', label: 'آكلة' },
  { value: 'FLAMMABLE', label: 'قابلة للاشتعال' },
  { value: 'OXIDIZER', label: 'مؤكسدة' },
  { value: 'IRRITANT', label: 'مهيجة' },
  { value: 'OTHER', label: 'أخرى' },
];

const BENCHES = [
  { value: 'CHEMISTRY', label: 'الكيمياء' },
  { value: 'MICROBIOLOGY', label: 'الأحياء الدقيقة' },
  { value: 'PHYSICAL', label: 'الفيزيائية' },
  { value: 'TOXICOLOGY', label: 'السموم' },
  { value: 'MOLECULAR', label: 'الجزيئي' },
];

const LOT_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'primary'> = {
  VALID: 'success',
  EXPIRING_SOON: 'warning',
  EXPIRED: 'error',
  BLOCKED: 'error',
  DISPOSED: 'primary',
};

const SOLUTION_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'primary'> = {
  PREPARED: 'primary',
  PENDING_VERIFICATION: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  EXPIRED: 'error',
  DISPOSED: 'primary',
};

const DISPOSAL_STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'primary'> = {
  PENDING: 'warning',
  APPROVED: 'primary',
  DISPOSED: 'success',
  REJECTED: 'error',
};

type TabKey = 'dashboard' | 'catalog' | 'lots' | 'solutions' | 'issues' | 'disposal';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'لوحة القيادة' },
  { key: 'catalog', label: 'كتالوج المواد' },
  { key: 'lots', label: 'التشغيلات والمخزون' },
  { key: 'solutions', label: 'المحاليل' },
  { key: 'issues', label: 'الصرف والاستهلاك' },
  { key: 'disposal', label: 'التخلص' },
];

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: <DashboardIcon fontSize="small" /> },
  { id: 'catalog', label: 'كتالوج المواد', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'lots', label: 'التشغيلات والمخزون', icon: <LocalDrinkIcon fontSize="small" /> },
  { id: 'solutions', label: 'المحاليل', icon: <ScienceIcon fontSize="small" /> },
  { id: 'issues', label: 'الصرف والاستهلاك', icon: <BiotechIcon fontSize="small" /> },
  { id: 'disposal', label: 'التخلص', icon: <DeleteSweepIcon fontSize="small" /> },
] as const;

const ReagentsPage = () => {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getMaterialManagementDashboard>>['data']['data'] | null>(null);

  const materials = useServerTable<MaterialCatalog>({ fetchData: getMaterials });
  const lots = useServerTable<MaterialLot>({ fetchData: getMaterialLots });
  const solutions = useServerTable<Solution>({ fetchData: getSolutions });
  const issues = useServerTable<MaterialIssue>({ fetchData: getMaterialIssues });
  const disposals = useServerTable<DisposalRequest>({ fetchData: getDisposalRequests });

  const [storage, setStorage] = useState<StorageLocation[]>([]);
  const [expiryReport, setExpiryReport] = useState<{ expired: MaterialLot[]; expiring_30: MaterialLot[]; expiring_90: MaterialLot[] } | null>(null);

  const [matDialog, setMatDialog] = useState(false);
  const [matForm, setMatForm] = useState<Record<string, string>>({});

  const [lotDialog, setLotDialog] = useState(false);
  const [lotForm, setLotForm] = useState<Record<string, string>>({});

  const [solDialog, setSolDialog] = useState(false);
  const [solForm, setSolForm] = useState<Record<string, string>>({});

  const [issueDialog, setIssueDialog] = useState(false);
  const [issueForm, setIssueForm] = useState<Record<string, string>>({});

  const [dispDialog, setDispDialog] = useState(false);
  const [dispForm, setDispForm] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);

  const refreshDash = useCallback(() => {
    getMaterialManagementDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
    getStorageLocations().then((r) => setStorage(r.data.data.results)).catch(() => undefined);
    getExpiryReport().then((r) => setExpiryReport(r.data.data)).catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    materials.refresh();
    lots.refresh();
    solutions.refresh();
    issues.refresh();
    disposals.refresh();
  }, [refreshDash, materials, lots, solutions, issues, disposals]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [dash]);

  const save = async (fn: () => Promise<unknown>, successMsg: string, close: () => void) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(successMsg);
      refreshAll();
      close();
    } catch {
      notifyError('تعذر الحفظ، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const openMatDialog = (m?: MaterialCatalog) => {
    setMatForm({
      id: m?.id ?? '',
      name_ar: m?.name_ar ?? '',
      name_en: m?.name_en ?? '',
      material_type: m?.material_type ?? 'REAGENT',
      bench: m?.bench ?? 'CHEMISTRY',
      manufacturer: m?.manufacturer ?? '',
      catalog_number: m?.catalog_number ?? '',
      cas_number: m?.cas_number ?? '',
      grade: m?.grade ?? 'ANALYTICAL',
      unit: m?.unit ?? 'g',
      min_stock: String(m?.min_stock ?? 0),
      reorder_level: String(m?.reorder_level ?? 0),
      max_stock: String(m?.max_stock ?? 0),
      hazard_class: m?.hazard_class ?? 'NONE',
      notes: m?.notes ?? '',
    });
    setMatDialog(true);
  };

  const openLotDialog = () => {
    const firstMaterial = materials.rows[0];
    setLotForm({
      material: firstMaterial?.id ?? '',
      lot_number: '',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      quantity: '',
      unit: firstMaterial?.unit ?? '',
      storage: '',
      supplier: '',
      certificate_ref: '',
      received_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setLotDialog(true);
  };

  const openSolDialog = () => {
    setSolForm({
      name: '',
      material: '',
      concentration: '',
      solvent: '',
      final_volume: '',
      volume_unit: 'mL',
      source_lot: '',
      batch_number: '',
      preparation_date: new Date().toISOString().slice(0, 10),
      expiry_date: '',
      storage: '',
      status: 'PREPARED',
      notes: '',
    });
    setSolDialog(true);
  };

  const openIssueDialog = () => {
    const validLot = lots.rows.find((l) => l.status === 'VALID' || l.status === 'EXPIRING_SOON');
    setIssueForm({
      material: validLot?.material ?? '',
      lot: validLot?.id ?? '',
      solution: '',
      quantity_used: '',
      unit: validLot?.unit ?? '',
      purpose: '',
      issue_type: 'ISSUE',
      notes: '',
    });
    setIssueDialog(true);
  };

  const openDispDialog = () => {
    setDispForm({
      material: '',
      lot: '',
      solution: '',
      quantity: '',
      unit: '',
      reason: '',
      detail: '',
    });
    setDispDialog(true);
  };

  const hazardTone = (h: string) =>
    h === 'NONE' ? 'success' : h === 'TOXIC' || h === 'CORROSIVE' ? 'error' : 'warning';

  const matColumns: DataTableColumn<MaterialCatalog>[] = useMemo(() => [
    { key: 'name', label: 'المادة', render: (m) => <b>{m.name_ar}</b> },
    { key: 'type', label: 'النوع', render: (m) => <Chip size="small" label={m.material_type_label} /> },
    { key: 'bench', label: 'القسم', render: (m) => m.bench_label },
    { key: 'stock', label: 'المخزون', render: (m) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography fontWeight={800}>{m.total_stock} {m.unit}</Typography>
        {m.low_stock ? <StatusChip label="منخفض" tone="warning" /> : null}
      </Stack>
    ) },
    { key: 'lots', label: 'تشغيلات', render: (m) => m.active_lots },
    { key: 'hazard', label: 'الخطورة', render: (m) => <StatusChip label={m.hazard_label} tone={hazardTone(m.hazard_class)} /> },
    { key: 'min', label: 'الحد الأدنى', render: (m) => `${m.min_stock} ${m.unit}` },
    { key: 'actions', label: '', render: (m) => (
      <AppButton size="small" variant="secondary" onClick={() => openMatDialog(m)}>تعديل</AppButton>
    ) },
  ], [materials.rows]);

  const lotColumns: DataTableColumn<MaterialLot>[] = useMemo(() => [
    { key: 'material', label: 'المادة', render: (l) => <b>{l.material_name}</b> },
    { key: 'lot', label: 'رقم التشغيلة', render: (l) => <Chip size="small" label={l.lot_number} /> },
    { key: 'batch', label: 'الدفعة', render: (l) => l.batch_number || '—' },
    { key: 'qty', label: 'الكمية', render: (l) => `${l.quantity} ${l.unit}` },
    { key: 'expiry', label: 'الصلاحية', render: (l) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>{l.expiry_date ? formatDate(l.expiry_date) : '—'}</Typography>
        {l.days_to_expiry != null && l.days_to_expiry <= 30 && <WarningAmberIcon fontSize="small" color="warning" />}
      </Stack>
    ) },
    { key: 'storage', label: 'التخزين', render: (l) => l.storage_name || '—' },
    { key: 'status', label: 'الحالة', render: (l) => <StatusChip label={l.status_label} tone={LOT_STATUS_TONE[l.status]} /> },
  ], []);

  const solColumns: DataTableColumn<Solution>[] = useMemo(() => [
    { key: 'name', label: 'المحلول', render: (s) => <b>{s.name}</b> },
    { key: 'conc', label: 'التركيز', render: (s) => s.concentration || '—' },
    { key: 'batch', label: 'الدفعة', render: (s) => <Chip size="small" label={s.batch_number || '—'} /> },
    { key: 'prep', label: 'تاريخ التحضير', render: (s) => formatDate(s.preparation_date) },
    { key: 'expiry', label: 'الصلاحية', render: (s) => (s.expiry_date ? formatDate(s.expiry_date) : '—') },
    { key: 'prepared_by', label: 'المُحضِّر', render: (s) => s.prepared_by_name || '—' },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={s.status_label} tone={SOLUTION_STATUS_TONE[s.status]} /> },
    { key: 'actions', label: '', render: (s) => (
      s.status === 'PENDING_VERIFICATION' || s.status === 'PREPARED' ? (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="primary" onClick={() => runVerify(s.id, 'APPROVED')}>اعتماد</AppButton>
          <AppButton size="small" variant="secondary" onClick={() => runVerify(s.id, 'REJECTED')}>رفض</AppButton>
        </Stack>
      ) : null
    ) },
  ], []);

  const issueColumns: DataTableColumn<MaterialIssue>[] = useMemo(() => [
    { key: 'material', label: 'المادة', render: (i) => <b>{i.material_name}</b> },
    { key: 'lot', label: 'التشغيلة', render: (i) => i.lot_number || (i.solution_name ?? '—') },
    { key: 'sample', label: 'العينة', render: (i) => i.sample_number || '—' },
    { key: 'test', label: 'الفحص', render: (i) => i.test_parameter || '—' },
    { key: 'qty', label: 'الكمية', render: (i) => `${i.quantity_used} ${i.unit}` },
    { key: 'type', label: 'النوع', render: (i) => <StatusChip label={i.issue_type_label} tone={i.issue_type === 'RETURN' ? 'primary' : 'info'} /> },
    { key: 'by', label: 'الصارف', render: (i) => i.issued_by_name || '—' },
    { key: 'when', label: 'الوقت', render: (i) => formatDate(i.issued_at) },
  ], []);

  const dispColumns: DataTableColumn<DisposalRequest>[] = useMemo(() => [
    { key: 'material', label: 'المادة', render: (d) => <b>{d.material_name}</b> },
    { key: 'lot', label: 'التشغيلة', render: (d) => d.lot_number || (d.solution_name ?? '—') },
    { key: 'qty', label: 'الكمية', render: (d) => `${d.quantity} ${d.unit}` },
    { key: 'reason', label: 'السبب', render: (d) => d.reason || '—' },
    { key: 'by', label: 'مقدّم الطلب', render: (d) => d.requested_by_name || '—' },
    { key: 'status', label: 'الحالة', render: (d) => <StatusChip label={d.status_label} tone={DISPOSAL_STATUS_TONE[d.status]} /> },
    { key: 'actions', label: '', render: (d) => d.status === 'PENDING' ? (
      <Stack direction="row" spacing={0.5}>
        <AppButton size="small" variant="primary" onClick={() => runDispose(d.id, 'approve')}>اعتماد</AppButton>
        <AppButton size="small" variant="secondary" onClick={() => runDispose(d.id, 'reject')}>رفض</AppButton>
      </Stack>
    ) : d.status === 'APPROVED' ? (
      <AppButton size="small" variant="primary" onClick={() => runDispose(d.id, 'dispose')}>تنفيذ التخلص</AppButton>
    ) : null },
  ], []);

  const runVerify = async (id: string, decision: string) => {
    setBusy(true);
    try {
      await verifySolution(id, { decision });
      notifySuccess(decision === 'APPROVED' ? 'تم اعتماد المحلول' : 'تم رفض المحلول');
      solutions.refresh();
      refreshDash();
    } catch {
      notifyError('تعذر التحقق من المحلول');
    } finally {
      setBusy(false);
    }
  };

  const runDispose = async (id: string, action: string) => {
    setBusy(true);
    try {
      await disposeRequestAction(id, { action });
      notifySuccess('تم تحديث حالة طلب التخلص');
      disposals.refresh();
      lots.refresh();
      refreshDash();
    } catch {
      notifyError('تعذر تحديث طلب التخلص');
    } finally {
      setBusy(false);
    }
  };

  const submitMaterial = () => {
    const payload = {
      name_ar: matForm.name_ar,
      name_en: matForm.name_en,
      material_type: matForm.material_type,
      bench: matForm.bench,
      manufacturer: matForm.manufacturer,
      catalog_number: matForm.catalog_number,
      cas_number: matForm.cas_number,
      grade: matForm.grade,
      unit: matForm.unit,
      min_stock: Number(matForm.min_stock || 0),
      reorder_level: Number(matForm.reorder_level || 0),
      max_stock: Number(matForm.max_stock || 0),
      hazard_class: matForm.hazard_class,
      notes: matForm.notes,
    };
    save(
      () => (matForm.id ? updateMaterial(matForm.id, payload) : createMaterial(payload)),
      matForm.id ? 'تم تحديث المادة' : 'تم تسجيل المادة',
      () => setMatDialog(false),
    );
  };

  const submitLot = () => {
    save(
      () => createMaterialLot({
        material: lotForm.material,
        lot_number: lotForm.lot_number,
        batch_number: lotForm.batch_number,
        manufacturing_date: lotForm.manufacturing_date,
        expiry_date: lotForm.expiry_date,
        quantity: Number(lotForm.quantity || 0),
        unit: lotForm.unit,
        storage: lotForm.storage,
        supplier: lotForm.supplier,
        certificate_ref: lotForm.certificate_ref,
        received_date: lotForm.received_date,
        notes: lotForm.notes,
      }),
      'تم تسجيل التشغيلة',
      () => setLotDialog(false),
    );
  };

  const submitSolution = () => {
    save(
      () => createSolution({
        name: solForm.name,
        material: solForm.material || null,
        concentration: solForm.concentration,
        solvent: solForm.solvent,
        final_volume: solForm.final_volume ? Number(solForm.final_volume) : null,
        volume_unit: solForm.volume_unit,
        source_lot: solForm.source_lot || null,
        batch_number: solForm.batch_number,
        preparation_date: solForm.preparation_date,
        expiry_date: solForm.expiry_date,
        storage: solForm.storage || null,
        status: solForm.status,
        notes: solForm.notes,
      }),
      'تم تسجيل المحلول — بانتظار التحقق',
      () => setSolDialog(false),
    );
  };

  const submitIssue = () => {
    save(
      () => createMaterialIssue({
        material: issueForm.material,
        lot: issueForm.lot || null,
        solution: issueForm.solution || null,
        quantity_used: Number(issueForm.quantity_used || 0),
        unit: issueForm.unit,
        purpose: issueForm.purpose,
        issue_type: issueForm.issue_type,
        notes: issueForm.notes,
      }),
      'تم صرف المادة وخصمها من المخزون',
      () => setIssueDialog(false),
    );
  };

  const submitDisposal = () => {
    save(
      () => createDisposalRequest({
        material: dispForm.material,
        lot: dispForm.lot || null,
        solution: dispForm.solution || null,
        quantity: Number(dispForm.quantity || 0),
        unit: dispForm.unit,
        reason: dispForm.reason,
        detail: dispForm.detail,
      }),
      'تم إنشاء طلب التخلص — بانتظار الاعتماد',
      () => setDispDialog(false),
    );
  };

  const kpi = dash?.kpis;
  const expiredLots = expiryReport?.expired ?? [];
  const expiring30 = expiryReport?.expiring_30 ?? [];
  const expiring90 = expiryReport?.expiring_90 ?? [];

  const renderDashboard = () => (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="إجمالي المواد" value={kpi?.total_materials ?? '—'} icon={<Inventory2Icon />} /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="إجمالي المخزون" value={kpi?.total_stock ?? '—'} icon={<BiotechIcon />} accent="primary.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="منتهية" value={kpi?.expired ?? '—'} icon={<EventBusyIcon />} accent="error.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="تنتهي خلال 30 يوم" value={kpi?.expiring_30 ?? '—'} icon={<WarningAmberIcon />} accent="warning.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="تحت الحد الأدنى" value={kpi?.low_stock ?? '—'} icon={<WarningAmberIcon />} accent="error.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="محاليل بانتظار التحقق" value={kpi?.solutions_pending ?? '—'} icon={<VerifiedIcon />} accent="warning.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="محاليل معتمدة" value={kpi?.solutions_approved ?? '—'} icon={<VerifiedIcon />} accent="success.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="طلبات تخلص بانتظار" value={kpi?.disposals_pending ?? '—'} icon={<DeleteSweepIcon />} accent="primary.main" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <WarningAmberIcon color="warning" />
              <Typography variant="h6">التنبيهات</Typography>
            </Stack>
            <Stack spacing={1}>
              {expiredLots.length ? (
                <Alert severity="error">🔴 {expiredLots.length} كواشف منتهية الصلاحية — محظور استخدامها</Alert>
              ) : null}
              {expiring30.length ? (
                <Alert severity="warning">🟠 {expiring30.length} كاشف ستنتهي خلال 30 يوم</Alert>
              ) : null}
              {expiring90.length ? (
                <Alert severity="info">🟡 {expiring90.length} كاشف ستنتهي خلال 90 يوم</Alert>
              ) : null}
              {dash?.low_stock_materials.length ? (
                <Alert severity="warning">🟡 {dash.low_stock_materials.length} مواد تحت الحد الأدنى</Alert>
              ) : null}
              {kpi?.solutions_pending ? (
                <Alert severity="info">محاليل بانتظار التحقق: {kpi.solutions_pending}</Alert>
              ) : null}
              {!expiredLots.length && !expiring30.length && !dash?.low_stock_materials.length && !kpi?.solutions_pending ? (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>✓ لا توجد تنبيهات حرجة</Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <LocalDrinkIcon color="primary" />
              <Typography variant="h6">أنواع المواد</Typography>
            </Stack>
            <Grid container spacing={1}>
              {MATERIAL_TYPES.map((t) => {
                const count = dash?.type_counts?.[t.value] ?? 0;
                return (
                  <Grid item xs={6} key={t.value}>
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="body2">{t.label}</Typography>
                      <Chip size="small" label={count} color={count ? 'primary' : 'default'} variant="outlined" />
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ScienceIcon color="primary" />
              <Typography variant="h6">آخر الحركات</Typography>
            </Stack>
            {dash?.recent_issues.length ? (
              <Stack spacing={1}>
                {dash.recent_issues.map((i) => (
                  <Paper key={i.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BiotechIcon fontSize="small" color="primary" />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{i.material_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {i.lot_number ? `تشغيلة ${i.lot_number}` : i.solution_name ?? ''}
                            {i.sample_number ? ` · ${i.sample_number}` : ''}
                            {i.test_parameter ? ` · ${i.test_parameter}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip size="small" label={`${i.quantity_used} ${i.unit}`} color="primary" variant="outlined" />
                        <Typography variant="caption" color="text.secondary">{i.issued_by_name ?? ''}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">لا توجد حركات صرف بعد</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderContent = () => {
    switch (tab) {
      case 'catalog': return (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" spacing={1}>
            <Typography variant="body2" color="text.secondary">كتالوج المواد المصنفة — كاشف / محلول / قياسية / أوساط / كيميائية / مستهلكات / معتمدة</Typography>
            <AppButton variant="primary" onClick={() => openMatDialog()} startIcon={<AddIcon />}>➕ تسجيل مادة</AppButton>
          </Stack>
          <DataTable<MaterialCatalog>
            columns={matColumns}
            rows={materials.rows}
            rowKey={(r) => r.id}
            count={materials.count}
            page={materials.page}
            rowsPerPage={materials.rowsPerPage}
            pageSizeOptions={materials.pageSizeOptions}
            loading={materials.loading}
            error={materials.error}
            title="كتالوج المواد"
            search={materials.search}
            searchInput={materials.searchInput}
            onSearchChange={materials.setSearchInput}
            sortBy={materials.sortBy}
            sortOrder={materials.sortOrder}
            onSortChange={materials.setSorting}
            onPageChange={materials.setPage}
            onRowsPerPageChange={materials.setRowsPerPage}
            onRefresh={materials.refresh}
            filters={[
              {
                key: 'material_type', label: 'النوع',
                options: MATERIAL_TYPES, value: materials.rows.length ? '' : '',
                onChange: (v) => materials.setFilter('material_type', v),
              },
            ]}
          />
        </Box>
      );
      case 'lots': return (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" spacing={1}>
            <Typography variant="body2" color="text.secondary">تشغيلات المواد — كل تشغيلة بصلاحيتها وكميتها وحالتها. المنتهي محظور.</Typography>
            <AppButton variant="primary" onClick={openLotDialog} startIcon={<AddIcon />}>➕ تسجيل تشغيلة</AppButton>
          </Stack>
          <DataTable<MaterialLot>
            columns={lotColumns}
            rows={lots.rows}
            rowKey={(r) => r.id}
            count={lots.count}
            page={lots.page}
            rowsPerPage={lots.rowsPerPage}
            pageSizeOptions={lots.pageSizeOptions}
            loading={lots.loading}
            error={lots.error}
            title="التشغيلات والمخزون"
            search={lots.search}
            searchInput={lots.searchInput}
            onSearchChange={lots.setSearchInput}
            sortBy={lots.sortBy}
            sortOrder={lots.sortOrder}
            onSortChange={lots.setSorting}
            onPageChange={lots.setPage}
            onRowsPerPageChange={lots.setRowsPerPage}
            onRefresh={lots.refresh}
            filters={[
              { key: 'status', label: 'الحالة', options: [
                { value: 'VALID', label: 'صالح' }, { value: 'EXPIRING_SOON', label: 'ينتهي قريباً' },
                { value: 'EXPIRED', label: 'منتهي' }, { value: 'BLOCKED', label: 'محظور' },
                { value: 'DISPOSED', label: 'تم التخلص' },
              ], value: '', onChange: (v) => lots.setFilter('status', v) },
            ]}
          />
        </Box>
      );
      case 'solutions': return (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" spacing={1}>
            <Typography variant="body2" color="text.secondary">المحاليل — تحضير → بانتظار التحقق → اعتماد / رفض (حسب سياسة المختبر).</Typography>
            <AppButton variant="primary" onClick={openSolDialog} startIcon={<AddIcon />}>🧴 تحضير محلول</AppButton>
          </Stack>
          <DataTable<Solution>
            columns={solColumns}
            rows={solutions.rows}
            rowKey={(r) => r.id}
            count={solutions.count}
            page={solutions.page}
            rowsPerPage={solutions.rowsPerPage}
            pageSizeOptions={solutions.pageSizeOptions}
            loading={solutions.loading}
            error={solutions.error}
            title="المحاليل"
            search={solutions.search}
            searchInput={solutions.searchInput}
            onSearchChange={solutions.setSearchInput}
            sortBy={solutions.sortBy}
            sortOrder={solutions.sortOrder}
            onSortChange={solutions.setSorting}
            onPageChange={solutions.setPage}
            onRowsPerPageChange={solutions.setRowsPerPage}
            onRefresh={solutions.refresh}
            filters={[
              { key: 'status', label: 'الحالة', options: [
                { value: 'PREPARED', label: 'مُحضَّر' }, { value: 'PENDING_VERIFICATION', label: 'بانتظار التحقق' },
                { value: 'APPROVED', label: 'معتمد' }, { value: 'REJECTED', label: 'مرفوض' },
                { value: 'EXPIRED', label: 'منتهي' },
              ], value: '', onChange: (v) => solutions.setFilter('status', v) },
            ]}
          />
        </Box>
      );
      case 'issues': return (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" spacing={1}>
            <Typography variant="body2" color="text.secondary">صرف الكواشف للمحلل — يُخصم تلقائياً من المخزون ويرتبط بالعينة والفحص للتتبع.</Typography>
            <AppButton variant="primary" onClick={openIssueDialog} startIcon={<AddIcon />}>📤 صرف مادة</AppButton>
          </Stack>
          <DataTable<MaterialIssue>
            columns={issueColumns}
            rows={issues.rows}
            rowKey={(r) => r.id}
            count={issues.count}
            page={issues.page}
            rowsPerPage={issues.rowsPerPage}
            pageSizeOptions={issues.pageSizeOptions}
            loading={issues.loading}
            error={issues.error}
            title="الصرف والاستهلاك"
            search={issues.search}
            searchInput={issues.searchInput}
            onSearchChange={issues.setSearchInput}
            sortBy={issues.sortBy}
            sortOrder={issues.sortOrder}
            onSortChange={issues.setSorting}
            onPageChange={issues.setPage}
            onRowsPerPageChange={issues.setRowsPerPage}
            onRefresh={issues.refresh}
          />
        </Box>
      );
      case 'disposal': return (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" spacing={1}>
            <Typography variant="body2" color="text.secondary">التخلص من المواد — لا حذف مباشر: طلب → اعتماد → تخلص، مع حفظ السجل كاملاً.</Typography>
            <AppButton variant="primary" onClick={openDispDialog} startIcon={<AddIcon />}>🗑 طلب تخلص</AppButton>
          </Stack>
          <DataTable<DisposalRequest>
            columns={dispColumns}
            rows={disposals.rows}
            rowKey={(r) => r.id}
            count={disposals.count}
            page={disposals.page}
            rowsPerPage={disposals.rowsPerPage}
            pageSizeOptions={disposals.pageSizeOptions}
            loading={disposals.loading}
            error={disposals.error}
            title="طلبات التخلص"
            search={disposals.search}
            searchInput={disposals.searchInput}
            onSearchChange={disposals.setSearchInput}
            sortBy={disposals.sortBy}
            sortOrder={disposals.sortOrder}
            onSortChange={disposals.setSorting}
            onPageChange={disposals.setPage}
            onRowsPerPageChange={disposals.setRowsPerPage}
            onRefresh={disposals.refresh}
          />
        </Box>
      );
      default: return renderDashboard();
    }
  };

  return (
    <Box>
      <DashboardHero
        eyebrow="إدارة المواد والكواشف"
        title="إدارة الكوافش والمحاليل"
        subtitle="Reagents & Solutions Management — ربط مباشر بالعينة والاختبار والمحلل والطريقة والجهاز"
        gradient="emerald"
        avatarLabel="إ"
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
            label="أقسام المواد"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px' }}>
      <PageTabs
        tabs={TABS.map((t) => ({ label: t.label }))}
        value={TABS.findIndex((t) => t.key === tab)}
        onChange={(idx) => setTab(TABS[idx]?.key ?? 'dashboard')}
      />

      <Box sx={{ mt: 2 }}>{renderContent()}</Box>
      </Box>

        </Grid>
      </Grid>

      {/* نافذة مادة */}
      <FormDialog
        open={matDialog}
        title={matForm.id ? 'تعديل مادة' : 'تسجيل مادة جديدة'}
        subtitle="كتالوج المواد — البيانات الأساسية للمادة"
        icon={<Inventory2Icon />}
        onClose={() => setMatDialog(false)}
        onSubmit={submitMaterial}
        loading={busy}
        submitDisabled={!matForm.name_ar}
      >
        <FormTextField label="اسم المادة (عربي) *" value={matForm.name_ar} onChange={(e) => setMatForm((p) => ({ ...p, name_ar: e.target.value }))} />
        <FormTextField label="الاسم (إنجليزي)" value={matForm.name_en} onChange={(e) => setMatForm((p) => ({ ...p, name_en: e.target.value }))} />
        <FormSelect label="النوع" value={matForm.material_type} onChange={(v) => setMatForm((p) => ({ ...p, material_type: v }))} options={MATERIAL_TYPES} />
        <FormSelect label="القسم" value={matForm.bench} onChange={(v) => setMatForm((p) => ({ ...p, bench: v }))} options={BENCHES} />
        <FormTextField label="الشركة المصنعة" value={matForm.manufacturer} onChange={(e) => setMatForm((p) => ({ ...p, manufacturer: e.target.value }))} />
        <FormTextField label="Catalog Number" value={matForm.catalog_number} onChange={(e) => setMatForm((p) => ({ ...p, catalog_number: e.target.value }))} />
        <FormTextField label="CAS Number" value={matForm.cas_number} onChange={(e) => setMatForm((p) => ({ ...p, cas_number: e.target.value }))} />
        <FormSelect label="الدرجة" value={matForm.grade} onChange={(v) => setMatForm((p) => ({ ...p, grade: v }))} options={GRADES} />
        <FormTextField label="وحدة القياس" value={matForm.unit} onChange={(e) => setMatForm((p) => ({ ...p, unit: e.target.value }))} />
        <Grid container spacing={2}>
          <Grid item xs={4}><FormTextField label="الحد الأدنى" type="number" value={matForm.min_stock} onChange={(e) => setMatForm((p) => ({ ...p, min_stock: e.target.value }))} /></Grid>
          <Grid item xs={4}><FormTextField label="إعادة الطلب" type="number" value={matForm.reorder_level} onChange={(e) => setMatForm((p) => ({ ...p, reorder_level: e.target.value }))} /></Grid>
          <Grid item xs={4}><FormTextField label="الحد الأقصى" type="number" value={matForm.max_stock} onChange={(e) => setMatForm((p) => ({ ...p, max_stock: e.target.value }))} /></Grid>
        </Grid>
        <FormSelect label="تصنيف الخطورة" value={matForm.hazard_class} onChange={(v) => setMatForm((p) => ({ ...p, hazard_class: v }))} options={HAZARDS} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={matForm.notes} onChange={(e) => setMatForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      {/* نافذة تشغيلة */}
      <FormDialog
        open={lotDialog}
        title="تسجيل تشغيلة جديدة"
        subtitle="كل عبوة/شحنة — صلاحيتها وكميتها وحالتها"
        icon={<Inventory2Icon />}
        onClose={() => setLotDialog(false)}
        onSubmit={submitLot}
        loading={busy}
        submitDisabled={!lotForm.material || !lotForm.lot_number}
      >
        <FormSelect label="المادة *" value={lotForm.material} onChange={(v) => setLotForm((p) => ({ ...p, material: v }))} options={materials.rows.map((m) => ({ value: m.id, label: `${m.name_ar} (${m.material_type_label})` }))} placeholder="اختر المادة" />
        <FormTextField label="رقم التشغيلة *" value={lotForm.lot_number} onChange={(e) => setLotForm((p) => ({ ...p, lot_number: e.target.value }))} />
        <FormTextField label="رقم الدفعة" value={lotForm.batch_number} onChange={(e) => setLotForm((p) => ({ ...p, batch_number: e.target.value }))} />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="تاريخ التصنيع" type="date" value={lotForm.manufacturing_date} onChange={(e) => setLotForm((p) => ({ ...p, manufacturing_date: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="تاريخ انتهاء الصلاحية" type="date" value={lotForm.expiry_date} onChange={(e) => setLotForm((p) => ({ ...p, expiry_date: e.target.value }))} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="الكمية" type="number" value={lotForm.quantity} onChange={(e) => setLotForm((p) => ({ ...p, quantity: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="الوحدة" value={lotForm.unit} onChange={(e) => setLotForm((p) => ({ ...p, unit: e.target.value }))} /></Grid>
        </Grid>
        <FormSelect label="موقع التخزين" value={lotForm.storage} onChange={(v) => setLotForm((p) => ({ ...p, storage: v }))} options={storage.map((s) => ({ value: s.id, label: s.name }))} placeholder="اختر الموقع" />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="المورد" value={lotForm.supplier} onChange={(e) => setLotForm((p) => ({ ...p, supplier: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="مرجع شهادة التحليل" value={lotForm.certificate_ref} onChange={(e) => setLotForm((p) => ({ ...p, certificate_ref: e.target.value }))} /></Grid>
        </Grid>
        <FormTextField label="تاريخ الاستلام" type="date" value={lotForm.received_date} onChange={(e) => setLotForm((p) => ({ ...p, received_date: e.target.value }))} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={lotForm.notes} onChange={(e) => setLotForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      {/* نافذة محلول */}
      <FormDialog
        open={solDialog}
        title="تحضير محلول"
        subtitle="محلول → بانتظار التحقق → اعتماد/رفض"
        icon={<LocalDrinkIcon />}
        onClose={() => setSolDialog(false)}
        onSubmit={submitSolution}
        loading={busy}
        submitDisabled={!solForm.name || !solForm.preparation_date}
      >
        <FormTextField label="اسم المحلول *" value={solForm.name} onChange={(e) => setSolForm((p) => ({ ...p, name: e.target.value }))} />
        <FormSelect label="المادة الأساسية" value={solForm.material} onChange={(v) => setSolForm((p) => ({ ...p, material: v }))} options={materials.rows.map((m) => ({ value: m.id, label: m.name_ar }))} placeholder="اختر المادة" />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="التركيز" value={solForm.concentration} onChange={(e) => setSolForm((p) => ({ ...p, concentration: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="المذيب" value={solForm.solvent} onChange={(e) => setSolForm((p) => ({ ...p, solvent: e.target.value }))} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="الحجم النهائي" type="number" value={solForm.final_volume} onChange={(e) => setSolForm((p) => ({ ...p, final_volume: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="وحدة الحجم" value={solForm.volume_unit} onChange={(e) => setSolForm((p) => ({ ...p, volume_unit: e.target.value }))} /></Grid>
        </Grid>
        <FormSelect label="المادة المصدرية (تشغيلة)" value={solForm.source_lot} onChange={(v) => setSolForm((p) => ({ ...p, source_lot: v }))} options={lots.rows.filter((l) => l.status === 'VALID' || l.status === 'EXPIRING_SOON').map((l) => ({ value: l.id, label: `${l.material_name} — ${l.lot_number}` }))} placeholder="اختر التشغيلة" />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="رقم الدفعة" value={solForm.batch_number} onChange={(e) => setSolForm((p) => ({ ...p, batch_number: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="موقع التخزين" value={solForm.storage} onChange={(e) => setSolForm((p) => ({ ...p, storage: e.target.value }))} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="تاريخ التحضير *" type="date" value={solForm.preparation_date} onChange={(e) => setSolForm((p) => ({ ...p, preparation_date: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="تاريخ انتهاء الصلاحية" type="date" value={solForm.expiry_date} onChange={(e) => setSolForm((p) => ({ ...p, expiry_date: e.target.value }))} /></Grid>
        </Grid>
        <FormTextField label="ملاحظات" multiline minRows={2} value={solForm.notes} onChange={(e) => setSolForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      {/* نافذة صرف */}
      <FormDialog
        open={issueDialog}
        title="صرف مادة للمحلل"
        subtitle="يُخصم من المخزون ويرتبط بالعينة/الفحص للتتبع"
        icon={<ScienceIcon />}
        onClose={() => setIssueDialog(false)}
        onSubmit={submitIssue}
        loading={busy}
        submitDisabled={!issueForm.material || !issueForm.quantity_used}
      >
        <FormSelect label="المادة *" value={issueForm.material} onChange={(v) => {
          setIssueForm((p) => ({ ...p, material: v }));
          const firstLot = lots.rows.find((l) => l.material === v && (l.status === 'VALID' || l.status === 'EXPIRING_SOON'));
          if (firstLot) setIssueForm((p) => ({ ...p, lot: firstLot.id, unit: firstLot.unit }));
        }} options={materials.rows.map((m) => ({ value: m.id, label: m.name_ar }))} placeholder="اختر المادة" />
        <FormSelect label="التشغيلة" value={issueForm.lot} onChange={(v) => setIssueForm((p) => ({ ...p, lot: v }))} options={lots.rows.filter((l) => l.status === 'VALID' || l.status === 'EXPIRING_SOON').map((l) => ({ value: l.id, label: `${l.lot_number} (${l.quantity} ${l.unit})` }))} placeholder="اختر تشغيلة صالحة" />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="الكمية المستخدمة *" type="number" value={issueForm.quantity_used} onChange={(e) => setIssueForm((p) => ({ ...p, quantity_used: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="الوحدة" value={issueForm.unit} onChange={(e) => setIssueForm((p) => ({ ...p, unit: e.target.value }))} /></Grid>
        </Grid>
        <FormTextField label="الغرض" value={issueForm.purpose} onChange={(e) => setIssueForm((p) => ({ ...p, purpose: e.target.value }))} />
        <FormSelect label="نوع الصرف" value={issueForm.issue_type} onChange={(v) => setIssueForm((p) => ({ ...p, issue_type: v }))} options={[
          { value: 'ISSUE', label: 'صرف' }, { value: 'CONSUMPTION', label: 'استهلاك' }, { value: 'RETURN', label: 'إرجاع' },
        ]} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={issueForm.notes} onChange={(e) => setIssueForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      {/* نافذة تخلص */}
      <FormDialog
        open={dispDialog}
        title="طلب تخلص من مادة"
        subtitle="طلب → اعتماد → تخلص — مع حفظ السجل"
        icon={<DeleteSweepIcon />}
        onClose={() => setDispDialog(false)}
        onSubmit={submitDisposal}
        loading={busy}
        submitDisabled={!dispForm.material || !dispForm.quantity}
      >
        <FormSelect label="المادة *" value={dispForm.material} onChange={(v) => {
          setDispForm((p) => ({ ...p, material: v }));
          const firstLot = lots.rows.find((l) => l.material === v);
          if (firstLot) setDispForm((p) => ({ ...p, lot: firstLot.id, unit: firstLot.unit, quantity: String(firstLot.quantity) }));
        }} options={materials.rows.map((m) => ({ value: m.id, label: m.name_ar }))} placeholder="اختر المادة" />
        <FormSelect label="التشغيلة" value={dispForm.lot} onChange={(v) => setDispForm((p) => ({ ...p, lot: v }))} options={lots.rows.map((l) => ({ value: l.id, label: `${l.lot_number} — ${l.status_label} (${l.quantity} ${l.unit})` }))} placeholder="اختر التشغيلة" />
        <Grid container spacing={2}>
          <Grid item xs={6}><FormTextField label="الكمية *" type="number" value={dispForm.quantity} onChange={(e) => setDispForm((p) => ({ ...p, quantity: e.target.value }))} /></Grid>
          <Grid item xs={6}><FormTextField label="الوحدة" value={dispForm.unit} onChange={(e) => setDispForm((p) => ({ ...p, unit: e.target.value }))} /></Grid>
        </Grid>
        <FormSelect label="السبب" value={dispForm.reason} onChange={(v) => setDispForm((p) => ({ ...p, reason: v }))} options={[
          { value: 'انتهاء الصلاحية', label: 'انتهاء الصلاحية' },
          { value: 'تلف', label: 'تلف' },
          { value: 'مستخدم جزئياً', label: 'مستخدم جزئياً' },
          { value: 'تلوث', label: 'تلوث' },
        ]} placeholder="اختر السبب" />
        <FormTextField label="التفاصيل" multiline minRows={2} value={dispForm.detail} onChange={(e) => setDispForm((p) => ({ ...p, detail: e.target.value }))} />
      </FormDialog>
    </Box>
  );
};

export default ReagentsPage;