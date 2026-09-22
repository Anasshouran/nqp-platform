import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircleIcon from '@mui/icons-material/Circle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import DescriptionIcon from '@mui/icons-material/Description';
import CategoryIcon from '@mui/icons-material/Category';
import ArchiveIcon from '@mui/icons-material/Archive';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  DataTable,
  StatusChip,
  PageTabs,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
  ConfirmDialog,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import type { DataTableColumn } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { getUsers } from '../../api/endpoints/users';
import {
  acceptSample,
  acknowledgeCustody,
  approveSample,
  approveSampleTest,
  assignSampleAnalyst,
  assignSampleSection,
  certifySample,
  conditionalAcceptSample,
  coordinateSample,
  createLabSample,
  createReferenceSample,
  createSampleSource,
  deleteLabSample,
  deleteReferenceSample,
  deleteSampleSource,
  dispatchResult,
  discardReferenceSample,
  enterSampleTestResult,
  exemptSampleFee,
  generateSampleInvoice,
  getCertificates,
  getLabDashboard,
  getLabParameters,
  getLabSample,
  getLabSamples,
  getReferenceSamples,
  getSampleSources,
  markSampleTestQC,
  paySampleFee,
  rejectSample,
  retrieveReferenceSample,
  returnSampleTest,
  reviewSampleTest,
  reviseSampleTest,
  saveSampleTestResult,
  setSampleParameters,
  setSamplePriority,
  startSampleTest,
  submitForApproval,
  transferSample,
  updateLabSample,
  updateSampleSource,
} from '../../api/endpoints/foodlab';
import type {
  AnalysisCertificate,
  ChainOfCustody,
  FoodLabDashboard,
  FoodSample,
  LabParameter,
  ReferenceSample,
  SampleInvoice,
  SampleSource,
  SampleTest,
} from '../../types/food';
import type { User } from '../../types/user';
import { labApproval, labBench, labCollection, labDecision, labInvoiceStatus, labPriority, labQc, labReception, labSampleStatus, labSla, labTestStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import PrintReceiptDialog from '../../components/finance/PrintReceiptDialog';
import { sampleInvoiceToPrintData } from '../../utils/financeAdapters';
import type { FinanceReceiptPrint } from '../../types/finance';
import MicroEvaluationDialog from './MicroEvaluationDialog';
import PrintBarcodeDialog from './PrintBarcodeDialog';
import { useAuth } from '../../hooks/useAuth';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: <DashboardIcon fontSize="small" /> },
  { id: 'reception', label: 'الاستلام والتسجيل', icon: <AddIcon fontSize="small" /> },
  { id: 'custody', label: 'سلسلة الحيازة', icon: <HistoryIcon fontSize="small" /> },
  { id: 'sources', label: 'مصادر العينات', icon: <CategoryIcon fontSize="small" /> },
  { id: 'references', label: 'العينات المرجعية', icon: <ArchiveIcon fontSize="small" /> },
  { id: 'certificates', label: 'الشهادات', icon: <DescriptionIcon fontSize="small" /> },
] as const;

/* ---------- ثوابت ---------- */

const FLOW_ORDER = ['RECEIVED', 'COORDINATED', 'ASSIGNED', 'UNDER_TESTING', 'READY_FOR_APPROVAL', 'APPROVED', 'DISPATCHED'];

const LAB_INVOICE_PENDING = new Set(['DRAFT', 'ISSUED', 'PENDING_PAYMENT', 'OVERDUE', 'PENDING']);

const CLASSIFICATION_LABELS: Record<string, string> = {
  ANALYSIS: 'للتحليل',
  REFERENCE: 'مرجعية',
};

const CLASSIFICATION_TONES: Record<string, 'default' | 'primary'> = {
  ANALYSIS: 'primary',
  REFERENCE: 'default',
};

const WORKFLOW_ACTIONS: Record<string, { label: string; icon: React.ReactNode; hint: string }> = {
  coordinate: { label: 'تنسيق العينة', icon: <LinkIcon />, hint: 'تحديد منسّق عينات المختبر' },
  assignSection: { label: 'إسناد للقسم', icon: <BiotechIcon />, hint: 'تحديد قسم المختبر ورئيس القسم' },
  assignAnalyst: { label: 'إسناد للمحلل', icon: <ScienceIcon />, hint: 'تحديد المحلّل المسؤول' },
  submitForApproval: { label: 'رفع للاعتماد', icon: <VerifiedIcon />, hint: 'رفع النتائج لمدير المختبر' },
  approve: { label: 'اعتماد النتيجة', icon: <VerifiedIcon />, hint: 'الاعتماد النهائي' },
  invoice: { label: 'فاتورة الرسوم', icon: <PaymentsIcon />, hint: 'إصدار فاتورة رسوم التحليل وسدادها أو إعفاؤها' },
  dispatch: { label: 'إرسال النتائج', icon: <LocalShippingIcon />, hint: 'إرسال النتيجة للجهة الطالبة' },
};

/* ---------- المكوّن الرئيسي ---------- */

interface SourceDialogState {
  open: boolean;
  editing: SampleSource | null;
  code: string;
  nameAr: string;
  order: number;
}

interface RefDialogState {
  open: boolean;
  source: string;
  product: string;
  origin: string;
  storage: string;
  seal: string;
  coding: string;
}

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

const FoodLabPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState<FoodLabDashboard | null>(null);

  /* استقبال عينة جديدة */
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [recSource, setRecSource] = useState('');
  const [recClassification, setRecClassification] = useState('ANALYSIS');
  const [recType, setRecType] = useState('');
  const [recBench, setRecBench] = useState('');
  const [recRequesting, setRecRequesting] = useState('');

  /* تفاصيل العينة / سلسلة الحيازة */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FoodSample | null>(null);
  const [busy, setBusy] = useState(false);

  const [sources, setSources] = useState<SampleSource[]>([]);
  const [references, setReferences] = useState<ReferenceSample[]>([]);
  const [parameters, setParameters] = useState<LabParameter[]>([]);

  /* مصادر — إدارة */
  const [sourceDialog, setSourceDialog] = useState<SourceDialogState>({ open: false, editing: null, code: '', nameAr: '', order: 0 });
  const [refDialog, setRefDialog] = useState<RefDialogState>({ open: false, source: '', product: '', origin: '', storage: '', seal: '', coding: '' });

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples });
  const certificates = useServerTable<AnalysisCertificate>({ fetchData: getCertificates });

  const refreshDash = useCallback(() => {
    getLabDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshSources = useCallback(() => {
    getSampleSources().then((r) => setSources(r.data.data)).catch(() => undefined);
  }, []);

  const refreshReferences = useCallback(() => {
    getReferenceSamples().then((r) => setReferences(r.data.data)).catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    samples.refresh();
    certificates.refresh();
  }, [refreshDash, samples, certificates]);

  useEffect(() => {
    refreshDash();
    refreshSources();
    refreshReferences();
    getLabParameters({ page_size: 100 }).then((r) => setParameters(r.data.data.results)).catch(() => undefined);
  }, [refreshDash, refreshSources, refreshReferences]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [tab, dash]);

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(success);
      refreshAll();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
    }
  };

  const openReception = () => {
    setRecSource(sources[0]?.id ?? '');
    setRecClassification('ANALYSIS');
    setRecType('');
    setRecBench('');
    setRecRequesting('');
    setReceptionOpen(true);
  };

  const handleReceive = async () => {
    if (!recType.trim()) return notifyError('اكتب نوع/اسم العينة');
    if (!recSource) return notifyError('حدد مصدر العينة');
    try {
      const payload: Record<string, unknown> = {
        source: recSource,
        classification: recClassification,
        sample_type: recType,
        requesting_department: recRequesting,
      };
      if (recBench) payload.bench = recBench;
      const res = await createLabSample(payload as never);
      notifySuccess(`تم استلام العينة ${res.data.data.sample_number}`);
      setReceptionOpen(false);
      refreshAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'تعذر استلام العينة';
      notifyError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLabSample(deleting.id);
      notifySuccess('تم حذف العينة');
      setDeleting(null);
      refreshAll();
    } catch {
      notifyError('تعذر حذف العينة');
    }
  };

  const tabIcons = [<DashboardIcon />, <AddIcon />, <HistoryIcon />, <CategoryIcon />, <ArchiveIcon />, <DescriptionIcon />];

  return (
    <Box>
      <DashboardHero
        eyebrow="FCLIS — Food Control Lab"
        title="نظام معلومات المختبر — FCLIS"
        subtitle="دورة حيازة العينة الكاملة: الاستلام ← التنسيق ← الأقسام ← التحليل ← الاعتماد ← التحصيل ← الإرسال"
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        action={<AppButton startIcon={<AddIcon />} onClick={openReception}>استلام عينة جديدة</AppButton>}
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
      <PageTabs
        value={tab}
        onChange={(v) => setTab(v)}
        tabs={[
          { label: 'لوحة التحكم', icon: tabIcons[0] },
          { label: 'الاستلام والتسجيل', icon: tabIcons[1] },
          { label: 'سلسلة الحيازة', icon: tabIcons[2] },
          { label: 'مصادر العينات', icon: tabIcons[3] },
          { label: 'العينات المرجعية', icon: tabIcons[4] },
          { label: 'الشهادات', icon: tabIcons[5] },
        ]}
      />

      <Box sx={{ mt: 3 }}>
        {tab === 0 && (
          <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px' }}>
            <DashboardTab dash={dash} />
          </Box>
        )}
        {tab === 1 && (
          <Box component="section" ref={register('reception')} data-section="reception" sx={{ scrollMarginTop: '80px' }}>
            <ReceptionTab
              sources={sources}
              samplesTable={samples}
              onRegister={openReception}
              onOpenSample={(id) => setDetailId(id)}
              openDialog={receptionOpen}
              setOpenDialog={setReceptionOpen}
              form={{ recSource, setRecSource, recClassification, setRecClassification, recType, setRecType, recBench, setRecBench, recRequesting, setRecRequesting }}
              onSubmit={handleReceive}
              busy={busy}
            />
          </Box>
        )}
        {tab === 2 && (
          <Box component="section" ref={register('custody')} data-section="custody" sx={{ scrollMarginTop: '80px' }}>
            <CustodyTab
              samplesTable={samples}
              onOpenSample={(id) => setDetailId(id)}
              onDelete={(s) => setDeleting(s)}
            />
          </Box>
        )}
        {tab === 3 && (
          <Box component="section" ref={register('sources')} data-section="sources" sx={{ scrollMarginTop: '80px' }}>
            <SourcesTab
              sources={sources}
              onRefresh={refreshSources}
              dialog={sourceDialog}
              setDialog={setSourceDialog}
            />
          </Box>
        )}
        {tab === 4 && (
          <Box component="section" ref={register('references')} data-section="references" sx={{ scrollMarginTop: '80px' }}>
            <ReferencesTab
              references={references}
              onRefresh={refreshReferences}
              sources={sources}
              dialog={refDialog}
              setDialog={setRefDialog}
            />
          </Box>
        )}
        {tab === 5 && (
          <Box component="section" ref={register('certificates')} data-section="certificates" sx={{ scrollMarginTop: '80px' }}>
            <CertificatesTab table={certificates} />
          </Box>
        )}
      </Box>
        </Grid>
      </Grid>

      {/* استلام عينة */}
      <FormDialog
        open={receptionOpen}
        onClose={() => setReceptionOpen(false)}
        onSubmit={handleReceive}
        loading={busy}
        title="استلام عينة جديدة"
        subtitle="تسجيل العينة عند الوصول للمختبر وبدء سلسلة الحيازة"
        maxWidth="sm"
      >
        <FormSelect label="مصدر العينة" requiredMark value={recSource} onChange={setRecSource} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} />
        <FormSelect label="التصنيف" value={recClassification} onChange={setRecClassification} options={Object.entries(CLASSIFICATION_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <FormTextField label="المنتج / نوع العينة" requiredMark value={recType} onChange={(e) => setRecType(e.target.value)} placeholder="مثال: سكر مجروش" />
        <FormTextField label="الجهة الطالبة" value={recRequesting} onChange={(e) => setRecRequesting(e.target.value)} placeholder="الإدارة العامة لرقابة الأغذية..." />
        <FormSelect label="قسم المختبر (يمكن إسناده لاحقاً)" value={recBench} onChange={setRecBench} placeholder="بدون" options={Object.entries(labBench).map(([v, m]) => ({ value: v, label: m.label }))} />
      </FormDialog>

      {detailId && (
        <SampleDetailDialog
          sampleId={detailId}
          parameters={parameters}
          usersFetch={getUsers}
          onClose={() => setDetailId(null)}
          onChanged={refreshAll}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="تأكيد حذف العينة"
        message={`هل أنت متأكد من حذف العينة «${deleting?.sample_number}»؟ سيتم حذف سلسلة الحيازة المرتبطة بها أيضاً.`}
        confirmLabel="حذف"
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

/* ================== لوحة التحكم ================== */

const DashboardTab = ({ dash }: { dash: FoodLabDashboard | null }) => {
  if (!dash) return null;
  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={2}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );
  return (
    <Box>
      <Grid container spacing={1.5}>
        {stat('إجمالي العينات', dash.total_samples, <ScienceIcon />)}
        {stat('قيد الاستلام', dash.received, <RadioButtonUncheckedIcon />)}
        {stat('تم التنسيق', dash.coordinated, <LinkIcon />)}
        {stat('قيد التحليل', dash.under_testing, <BiotechIcon />)}
        {stat('جاهزة للاعتماد', dash.ready_for_approval, <VerifiedIcon />)}
        {stat('معتمدة/مُرسلة', dash.approved + dash.dispatched, <CheckCircleIcon />)}
        {stat('مرفوضة', dash.rejected, <CircleIcon />)}
        {stat('بانتظار قرار الاستلام', dash.reception_pending, <RadioButtonUncheckedIcon />)}
        {stat('قبول مشروط', dash.reception_cond, <VerifiedIcon />)}
        {stat('غير مسددة الرسوم', dash.unpaid_samples, <PaymentsIcon />)}
        {stat('فحوصات متأخرة', dash.overdue_tests, <CircleIcon />)}
        {stat('التزام بـ SLA', dash.sla_compliance_pct != null ? `${dash.sla_compliance_pct}%` : '—', <CheckCircleIcon />)}
        {stat('عينات مرجعية', dash.reference_samples, <ArchiveIcon />)}
        {stat('أحداث حيازة', dash.custody_events, <HistoryIcon />)}
        {stat('شهادات', dash.certificates, <DescriptionIcon />)}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <InfoPanel title="العينات حسب المصدر">
            {dash.by_source.length === 0 ? (
              <EmptyHint text="لا توجد بيانات" />
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {dash.by_source.map((row) => (
                  <Chip key={row.source} label={`${row.source} — ${row.count}`} variant="outlined" />
                ))}
              </Stack>
            )}
          </InfoPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoPanel title="العينات حسب القسم">
            {Object.keys(dash.by_bench).length === 0 ? (
              <EmptyHint text="لا توجد بيانات" />
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(dash.by_bench).map(([k, v]) => (
                  <Chip key={k} label={`${labBench[k]?.label ?? k} — ${v}`} variant="outlined" />
                ))}
              </Stack>
            )}
          </InfoPanel>
        </Grid>
      </Grid>
    </Box>
  );
};

const InfoPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
    {children}
  </Box>
);

const EmptyHint = ({ text }: { text: string }) => (
  <Typography variant="body2" color="text.secondary">{text}</Typography>
);

/* ================== الاستلام والتسجيل ================== */

interface ReceptionFormProps {
  recSource: string; setRecSource: (v: string) => void;
  recClassification: string; setRecClassification: (v: string) => void;
  recType: string; setRecType: (v: string) => void;
  recBench: string; setRecBench: (v: string) => void;
  recRequesting: string; setRecRequesting: (v: string) => void;
}

const ReceptionTab = ({
  sources, samplesTable, onRegister, onOpenSample,
  openDialog, setOpenDialog, form, onSubmit, busy,
}: {
  sources: SampleSource[];
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  onRegister: () => void;
  onOpenSample: (id: string) => void;
  openDialog: boolean;
  setOpenDialog: (v: boolean) => void;
  form: ReceptionFormProps;
  onSubmit: () => void;
  busy: boolean;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'received_by_name', label: 'موظف الاستلام', render: (s) => s.received_by_name ?? '—' },
    { key: 'received_at', label: 'وقت الاستلام', render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: 'قرار الاستلام', render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>فتح</AppButton>
      ),
    },
  ], [onOpenSample]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={onRegister}>استلام / تسجيل عينة</AppButton>
      </Box>
      <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title="أحدث العينات المستلمة" />
    </Box>
  );
};

/* ================== سلسلة الحيازة ================== */

const CustodyTab = ({
  samplesTable, onOpenSample, onDelete,
}: {
  samplesTable: ReturnType<typeof useServerTable<FoodSample>>;
  onOpenSample: (id: string) => void;
  onDelete: (s: FoodSample) => void;
}) => {
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: 'الرقم', render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: 'المنتج' },
    { key: 'classification', label: 'التصنيف', render: (s) => <Chip size="small" label={CLASSIFICATION_LABELS[s.classification] ?? s.classification} color={CLASSIFICATION_TONES[s.classification]} variant="outlined" /> },
    { key: 'source_name', label: 'المصدر', render: (s) => s.source_name ?? '—' },
    { key: 'bench', label: 'القسم', render: (s) => labBench[s.bench]?.label ?? s.bench },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'collection_status', label: 'التحصيل', render: (s) => <StatusChip label={labCollection[s.collection_status]?.label ?? s.collection_status} tone={labCollection[s.collection_status]?.tone} /> },
    { key: 'invoice', label: 'الفاتورة', render: (s) => (s.lab_invoice ? <StatusChip label={labInvoiceStatus[s.lab_invoice.status]?.label ?? s.lab_invoice.status} tone={labInvoiceStatus[s.lab_invoice.status]?.tone} /> : <Typography variant="caption" color="text.secondary">—</Typography>) },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>سلسلة الحيازة</AppButton>
          <IconButton aria-label="حذف" size="small" color="error" onClick={() => onDelete(s)}><DeleteIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onDelete]);

  return (
    <FoodDataTable<FoodSample>
      columns={columns}
      table={samplesTable}
      title="دورة العينات وسلسلة الحيازة"
    />
  );
};

/* ================== مصادر العينات ================== */

const SourcesTab = ({
  sources, onRefresh, dialog, setDialog,
}: {
  sources: SampleSource[];
  onRefresh: () => void;
  dialog: SourceDialogState;
  setDialog: React.Dispatch<React.SetStateAction<SourceDialogState>>;
}) => {
  const openNew = () => setDialog({ open: true, editing: null, code: '', nameAr: '', order: sources.length + 1 });
  const openEdit = (s: SampleSource) => setDialog({ open: true, editing: s, code: s.code, nameAr: s.name_ar, order: s.order });

  const save = async () => {
    if (!dialog.nameAr.trim()) return notifyError('اكتب اسم المصدر');
    try {
      if (dialog.editing) {
        await updateSampleSource(dialog.editing.id, { code: dialog.code || dialog.editing.code, name_ar: dialog.nameAr, order: dialog.order });
        notifySuccess('تم تحديث المصدر');
      } else {
        await createSampleSource({ code: dialog.code || `SRC_${dialog.nameAr}`, name_ar: dialog.nameAr, order: dialog.order, is_active: true });
        notifySuccess('تمت إضافة المصدر');
      }
      setDialog((d) => ({ ...d, open: false }));
      onRefresh();
    } catch {
      notifyError('تعذر حفظ المصدر');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={openNew}>مصدر جديد</AppButton>
      </Box>
      <Grid container spacing={1.5}>
        {sources.map((s) => (
          <Grid item xs={12} md={4} lg={3} key={s.id}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.code}</Typography>
                </Box>
                <Tooltip title="تعديل">
                  <IconButton aria-label="حذف" size="small" onClick={() => openEdit(s)}><EditPencil /></IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton aria-label="حذف" size="small" color="error" onClick={async () => { try { await deleteSampleSource(s.id); notifySuccess('تم الحذف'); onRefresh(); } catch { notifyError('تعذر الحذف'); } }}><DeleteIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <FormDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSubmit={save} title={dialog.editing ? 'تعديل مصدر' : 'مصدر جديد'} maxWidth="xs">
        <FormTextField label="الاسم بالعربية" requiredMark value={dialog.nameAr} onChange={(e) => setDialog((d) => ({ ...d, nameAr: e.target.value }))} />
        <FormTextField label="الكود" value={dialog.code} onChange={(e) => setDialog((d) => ({ ...d, code: e.target.value }))} />
        <FormTextField label="الترتيب" type="number" value={dialog.order} onChange={(e) => setDialog((d) => ({ ...d, order: Number(e.target.value) }))} />
      </FormDialog>
    </Box>
  );
};

const EditPencil = () => <EditIcon fontSize="small" />;

/* ================== العينات المرجعية ================== */

const ReferencesTab = ({
  references, onRefresh, sources, dialog, setDialog,
}: {
  references: ReferenceSample[];
  onRefresh: () => void;
  sources: SampleSource[];
  dialog: RefDialogState;
  setDialog: React.Dispatch<React.SetStateAction<RefDialogState>>;
}) => {
  const openNew = () => setDialog({ open: true, source: sources[0]?.id ?? '', product: '', origin: '', storage: '', seal: '', coding: '' });

  const save = async () => {
    if (!dialog.product.trim()) return notifyError('اكتب اسم المادة');
    try {
      await createReferenceSample({ source: dialog.source || undefined, product_name: dialog.product, origin: dialog.origin, storage_location: dialog.storage, seal_number: dialog.seal, coding: dialog.coding });
      notifySuccess('تم تسجيل العينة المرجعية');
      setDialog((d) => ({ ...d, open: false }));
      onRefresh();
    } catch {
      notifyError('تعذر تسجيل العينة المرجعية');
    }
  };

  const refStatus: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
    STORED: { label: 'مخزنة', tone: 'success' },
    RETRIEVED: { label: 'تم الرجوع إليها', tone: 'warning' },
    DISCARDED: { label: 'أُعدمت', tone: 'error' },
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={openNew}>تسجيل عينة مرجعية</AppButton>
      </Box>
      <Grid container spacing={1.5}>
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                الموقع: {r.storage_location || '—'} • الختم: {r.seal_number || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                استلام: {formatDateTime(r.received_at)} — {r.received_by_name ?? '—'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <AppButton size="small" variant="secondary" disabled={r.status !== 'STORED'} onClick={async () => { try { await retrieveReferenceSample(r.id, 'الرجوع للعينة المرجعية'); notifySuccess('تم الرجوع'); onRefresh(); } catch { notifyError('تعذر التنفيذ'); } }}>
                  رجوع
                </AppButton>
                <AppButton size="small" variant="danger" disabled={r.status === 'DISCARDED'} onClick={async () => { try { await discardReferenceSample(r.id, 'إعدام'); notifySuccess('تم الإعدام'); onRefresh(); } catch { notifyError('تعذر التنفيذ'); } }}>
                  إعدام
                </AppButton>
                <IconButton aria-label="حذف" size="small" color="error" onClick={async () => { try { await deleteReferenceSample(r.id); notifySuccess('تم الحذف'); onRefresh(); } catch { notifyError('تعذر الحذف'); } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <FormDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSubmit={save} title="تسجيل عينة مرجعية" subtitle="لا تدخل دورة التحليل العادية — تحفظ للرجوع إليها" maxWidth="sm">
        <FormSelect label="المصدر" value={dialog.source} onChange={(v) => setDialog((d) => ({ ...d, source: v }))} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} />
        <FormTextField label="اسم المادة / العينة" requiredMark value={dialog.product} onChange={(e) => setDialog((d) => ({ ...d, product: e.target.value }))} />
        <FormTextField label="المنشأ / الدفعة" value={dialog.origin} onChange={(e) => setDialog((d) => ({ ...d, origin: e.target.value }))} />
        <FormTextField label="موقع التخزين" value={dialog.storage} onChange={(e) => setDialog((d) => ({ ...d, storage: e.target.value }))} />
        <FormTextField label="رقم الختم" value={dialog.seal} onChange={(e) => setDialog((d) => ({ ...d, seal: e.target.value }))} />
        <FormTextField label="الترميز" value={dialog.coding} onChange={(e) => setDialog((d) => ({ ...d, coding: e.target.value }))} />
      </FormDialog>
    </Box>
  );
};

/* ================== الشهادات ================== */

const CertificatesTab = ({ table }: { table: ReturnType<typeof useServerTable<AnalysisCertificate>> }) => {
  const columns: DataTableColumn<AnalysisCertificate>[] = useMemo(() => [
    { key: 'certificate_number', label: 'رقم الشهادة', render: (c) => <b>{c.certificate_number}</b> },
    { key: 'sample_number', label: 'رقم العينة' },
    { key: 'decision', label: 'القرار', render: (c) => <StatusChip label={labDecision[c.decision]?.label ?? c.decision} tone={labDecision[c.decision]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (c) => <StatusChip label={c.status === 'ISSUED' ? 'صادر' : 'مسودة'} tone={c.status === 'ISSUED' ? 'success' : 'neutral'} /> },
    { key: 'issued_by_name', label: 'الموقّع', render: (c) => c.issued_by_name ?? '—' },
    { key: 'issued_at', label: 'تاريخ الإصدار', render: (c) => formatDateTime(c.issued_at) },
  ], []);

  return <FoodDataTable<AnalysisCertificate> columns={columns} table={table} title="شهادات التحليل" />;
};

/* ================== تفاصيل العينة + سلسلة الحيازة ================== */

export const SampleDetailDialog = ({
  sampleId, parameters, usersFetch, onClose, onChanged,
}: {
  sampleId: string;
  parameters: LabParameter[];
  usersFetch: (params?: Record<string, unknown>) => Promise<{ data: { data: { results: User[] } } }>;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const { user } = useAuth();
  const role = user?.role;
  const isReceptionist = role === 'LAB_RECEPTIONIST';
  const canAnalyze = role === 'LAB_TECHNICIAN' || role === 'LAB_MANAGER' || role === 'ADMIN';
  const canCoordinate = !isReceptionist;
  const canSectionReview = role === 'CHEM_SECTION_HEAD' || role === 'STATION_HEAD' || role === 'LAB_MANAGER' || role === 'ADMIN';
  const canSectionApprove = role === 'CHEM_SECTION_HEAD' || role === 'LAB_MANAGER' || role === 'ADMIN';
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<keyof typeof WORKFLOW_ACTIONS | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [selParams, setSelParams] = useState<string[]>([]);
  const [resultTest, setResultTest] = useState<SampleTest | null>(null);
  const [microEvalTest, setMicroEvalTest] = useState<SampleTest | null>(null);
  const [barcodeSample, setBarcodeSample] = useState<FoodSample | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [resultDecision, setResultDecision] = useState('COMPLIANT');
  const [resultMethod, setResultMethod] = useState('');
  const [resultDevice, setResultDevice] = useState('');
  const [resultReagent, setResultReagent] = useState('');
  const [reviewTest, setReviewTest] = useState<SampleTest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviseTest, setReviseTest] = useState<SampleTest | null>(null);
  const [reviseReason, setReviseReason] = useState('');
  const [returnTest, setReturnTest] = useState<SampleTest | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [qcTest, setQcTest] = useState<SampleTest | null>(null);
  const [qcStatus, setQcStatus] = useState('PASSED');
  const [qcNotes, setQcNotes] = useState('');
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [receptionDecision, setReceptionDecision] = useState<'accept' | 'conditional' | 'reject'>('accept');
  const [receptionNote, setReceptionNote] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAction, setInvoiceAction] = useState<'generate' | 'pay' | 'exempt'>('generate');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchTo, setDispatchTo] = useState('');
  /* transfer form */
  const [tfFrom, setTfFrom] = useState('');
  const [tfTo, setTfTo] = useState('');
  const [tfCond, setTfCond] = useState('');
  const [tfSeal, setTfSeal] = useState('');
  const [tfRemarks, setTfRemarks] = useState('');
  /* action form */
  const [selUser, setSelUser] = useState('');
  const [selBench, setSelBench] = useState('CHEMISTRY');
  /* coordinator panel */
  const [priorityValue, setPriorityValue] = useState('NORMAL');
  const [classifyValue, setClassifyValue] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getLabSample(sampleId);
      setSample(res.data.data);
      setPriorityValue(res.data.data.priority || 'NORMAL');
      setClassifyValue(res.data.data.classification || '');
    } catch {
      notifyError('تعذر تحميل بيانات العينة');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [sampleId, onClose]);

  useEffect(() => {
    setLoading(true);
    load();
    usersFetch({ page_size: 100 }).then((r) => setUsers(r.data.data.results)).catch(() => undefined);
  }, [load, usersFetch]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setLoading(true);
    try {
      await fn();
      notifySuccess(success);
      await load();
      onChanged();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setLoading(false);
    }
  };

  if (!sample) {
    return <Dialog open onClose={onClose} maxWidth="sm" fullWidth><DialogContent sx={{ textAlign: 'center', py: 6 }}>جارٍ تحميل العينة...</DialogContent></Dialog>;
  }

  const userOptions = users.map((u) => ({ value: u.id, label: u.full_name ? `${u.full_name} (${u.email})` : u.email }));

  const openAction = (a: keyof typeof WORKFLOW_ACTIONS) => {
    setAction(a);
    setSelUser('');
    if (a === 'submitForApproval') {
      run(() => submitForApproval(sample.id), 'تم رفع العينة للاعتماد');
      return;
    }
    if (a === 'approve') {
      run(() => approveSample(sample.id), 'تم اعتماد النتيجة');
      return;
    }
    if (a === 'invoice') {
      setInvoiceAction('generate');
      setInvoiceNote('');
      setInvoiceOpen(true);
      return;
    }
    if (a === 'dispatch') {
      setDispatchNotes('');
      setDispatchTo(sample.requesting_department);
      setDispatchOpen(true);
      return;
    }
    if (a === 'assignSection') {
      setSelBench(sample.bench || 'CHEMISTRY');
      setAction(a);
      return;
    }
    setAction(a);
  };

  const runActionSubmit = async () => {
    if (!action) return;
    if (action === 'coordinate') {
      if (!selUser) return notifyError('حدد المنسّق');
      await run(() => coordinateSample(sample.id, selUser), 'تم التنسيق');
    } else if (action === 'assignSection') {
      await run(() => assignSampleSection(sample.id, selBench, selUser || undefined), 'تم الإسناد للقسم');
    } else if (action === 'assignAnalyst') {
      if (!selUser) return notifyError('حدد المحلّل');
      await run(() => assignSampleAnalyst(sample.id, selUser), 'تم الإسناد للمحلل');
    }
    setAction(null);
  };

  const submitTransfer = async () => {
    if (!tfFrom || !tfTo) return notifyError('حدد قسمي النقل');
    await run(() => transferSample(sample.id, { from_department: tfFrom, to_department: tfTo, condition: tfCond, seal_number: tfSeal, remarks: tfRemarks }), 'تم تسجيل النقل اليدوي');
    setTransferOpen(false);
    setTfFrom(''); setTfTo(''); setTfCond(''); setTfSeal(''); setTfRemarks('');
  };

  const submitReception = async () => {
    if (receptionDecision === 'accept') await run(() => acceptSample(sample.id, receptionNote), 'تم قبول العينة');
    else if (receptionDecision === 'conditional') await run(() => conditionalAcceptSample(sample.id, receptionNote), 'تم القبول المشروط');
    else await run(() => rejectSample(sample.id, receptionNote), 'تم رفض العينة');
    setReceptionOpen(false);
    setReceptionNote('');
  };

  const submitInvoice = async () => {
    if (invoiceAction === 'generate') await run(() => generateSampleInvoice(sample.id), 'تم إصدار فاتورة الرسوم');
    else if (invoiceAction === 'pay') await run(() => paySampleFee(sample.id, invoiceNote), 'تم تحصيل الرسوم');
    else await run(() => exemptSampleFee(sample.id, invoiceNote), 'تم إعفاء الرسوم');
    setInvoiceOpen(false);
    setInvoiceNote('');
  };

  const resultPayload = () => ({
    result_value: resultValue === '' ? null : resultValue,
    decision: resultDecision,
    method_used: resultMethod,
    device_used: resultDevice,
    reagent_lot: resultReagent,
  });

  const closeResult = () => {
    setResultTest(null);
    setResultValue('');
    setResultDecision('COMPLIANT');
    setResultMethod('');
    setResultDevice('');
    setResultReagent('');
  };

  const openResult = (t: SampleTest) => {
    setResultTest(t);
    setResultValue(t.result_value != null ? String(t.result_value) : '');
    setResultDecision(t.decision === 'PENDING' ? 'COMPLIANT' : t.decision);
    setResultMethod(t.method_used || t.parameter.method || '');
    setResultDevice(t.device_used || '');
    setResultReagent(t.reagent_lot || '');
  };

  const submitResultDraft = async () => {
    if (!resultTest) return;
    await run(() => saveSampleTestResult(resultTest.id, resultPayload()), 'حُفظت النتيجة كمسودة');
    closeResult();
  };

  const submitResult = async () => {
    if (!resultTest) return;
    await run(() => enterSampleTestResult(resultTest.id, resultPayload()), 'أُرسلت النتيجة للمراجعة');
    closeResult();
  };

  const submitReview = async () => {
    if (!reviewTest) return;
    await run(
      () => reviewSampleTest(reviewTest.id, { notes: reviewNotes, decision: reviewTest.decision }),
      'تمت مراجعة رئيس القسم',
    );
    setReviewTest(null);
    setReviewNotes('');
  };

  const submitApproveTest = async (t: SampleTest) => {
    await run(() => approveSampleTest(t.id), 'تم اعتماد النتيجة');
  };

  const submitRevise = async () => {
    if (!reviseTest) return;
    await run(
      () => reviseSampleTest(reviseTest.id, {
        reason: reviseReason,
        result_value: reviseTest.result_value,
        decision: reviseTest.decision,
      }),
      'تم فتح طلب تصحيح النتيجة',
    );
    setReviseTest(null);
    setReviseReason('');
  };

  const submitReturn = async () => {
    if (!returnTest) return;
    await run(() => returnSampleTest(returnTest.id, returnReason), 'أُعيدت النتيجة للمحلل للتصحيح');
    setReturnTest(null);
    setReturnReason('');
  };

  const submitQc = async () => {
    if (!qcTest) return;
    await run(
      () => markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes }),
      qcStatus === 'PASSED' ? 'تم اعتماد الجودة (QC)' : 'سُجِّلت مخالفة جودة (QC)',
    );
    setQcTest(null);
    setQcNotes('');
  };

  const submitDispatch = async () => {
    await run(() => dispatchResult(sample.id, { requesting_department: dispatchTo, dispatch_notes: dispatchNotes }), 'تم إرسال النتائج');
    setDispatchOpen(false);
  };

  const toggleParam = (id: string) => {
    setSelParams((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const openParams = () => {
    setSelParams((sample.tests ?? []).map((t) => t.parameter.id));
    setParamsOpen(true);
  };

  const submitParams = async () => {
    await run(() => setSampleParameters(sample.id, selParams), 'تم تحديث الفحوصات المطلوبة');
    setParamsOpen(false);
  };

  const saveCoordinatorPriority = async () => {
    setLoading(true);
    try {
      await setSamplePriority(sample.id, priorityValue);
      notifySuccess('تم تحديث أولوية التحليل');
      await load();
      onChanged();
    } catch {
      notifyError('تعذر تحديث الأولوية');
    } finally {
      setLoading(false);
    }
  };

  const saveCoordinatorClassification = async () => {
    setLoading(true);
    try {
      await updateLabSample(sample.id, { classification: classifyValue });
      notifySuccess('تم تحديث تصنيف العينة');
      await load();
      onChanged();
    } catch {
      notifyError('تعذر تحديث التصنيف');
    } finally {
      setLoading(false);
    }
  };

  const certifiable = sample.approval_status === 'APPROVED' && sample.status !== 'REJECTED';

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main' }}><ScienceIcon /></Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{sample.sample_number}</Typography>
            <Typography variant="caption" color="text.secondary">{sample.sample_type} • {sample.sample_barcode}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <StatusChip label={labPriority[sample.priority]?.label ?? sample.priority} tone={labPriority[sample.priority]?.tone} />
          <StatusChip label={labSampleStatus[sample.status]?.label ?? sample.status} tone={labSampleStatus[sample.status]?.tone} />
          <StatusChip label={labApproval[sample.approval_status]?.label ?? sample.approval_status} tone={labApproval[sample.approval_status]?.tone} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* معلومات عامة */}
        <Grid container spacing={1.5}>
          <Meta label="المصدر" value={sample.source_name ?? '—'} />
          <Meta label="التصنيف" value={CLASSIFICATION_LABELS[sample.classification] ?? sample.classification} />
          <Meta label="الأولوية" value={sample.priority_label ?? '—'} />
          <Meta label="الجهة الطالبة" value={sample.requesting_department || '—'} />
          <Meta label="القسم" value={labBench[sample.bench]?.label ?? sample.bench} />
          <Meta label="استلام" value={sample.received_by_name ? `${sample.received_by_name} — ${formatDateTime(sample.received_at)}` : '—'} />
          <Meta label="المنسّق" value={sample.coordinator_name ?? '—'} />
          <Meta label="رئيس القسم" value={sample.department_head_name ?? '—'} />
          <Meta label="المحلّل" value={sample.analyst_name ?? '—'} />
          <Meta label="الاعتماد" value={sample.approved_by_name ? `${sample.approved_by_name} — ${formatDateTime(sample.approved_at)}` : '—'} />
          <Meta label="قرار الاستلام" value={sample.reception_status ? `${labReception[sample.reception_status]?.label ?? sample.reception_status}${sample.reception_note ? ` — ${sample.reception_note}` : ''}` : '—'} />
          <Meta label="التحصيل" value={`${labCollection[sample.collection_status]?.label ?? sample.collection_status} (${sample.fee_amount})`} />
          {sample.lab_invoice && (
            <Meta label="الفاتورة" value={`${sample.lab_invoice.invoice_number} • ${labInvoiceStatus[sample.lab_invoice.status]?.label ?? sample.lab_invoice.status}`} />
          )}
        </Grid>

        {/* خطوات الدورة */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>مسار العينة</Typography>
          <FlowStepper status={sample.status} />
        </Box>

        {/* لوحة المنسّق: الأولوية والتصنيف */}
        {canCoordinate && (
          <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>ضبط العينة (منسّق العينات)</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <FormSelect label="أولوية التحليل" value={priorityValue} onChange={setPriorityValue} options={Object.entries(labPriority).map(([v, m]) => ({ value: v, label: m.label }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormSelect label="التصنيف" value={classifyValue} onChange={setClassifyValue} options={Object.entries(CLASSIFICATION_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <AppButton size="small" onClick={saveCoordinatorPriority} disabled={priorityValue === (sample.priority || 'NORMAL')}>حفظ الأولوية</AppButton>
              <AppButton size="small" variant="secondary" onClick={saveCoordinatorClassification} disabled={classifyValue === (sample.classification || '')}>حفظ التصنيف</AppButton>
            </Stack>
          </Box>
        )}

        {/* أزرار العمل */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {sample.reception_status === 'RECEIVED' && (
            <>
              <WorkflowBtn label="قبول العينة" icon={<CheckCircleIcon />} onClick={() => { setReceptionDecision('accept'); setReceptionNote(''); setReceptionOpen(true); }} />
              <WorkflowBtn label="قبول مشروط" icon={<VerifiedIcon />} onClick={() => { setReceptionDecision('conditional'); setReceptionNote(''); setReceptionOpen(true); }} />
              <WorkflowBtn label="رفض العينة" icon={<CircleIcon />} onClick={() => { setReceptionDecision('reject'); setReceptionNote(''); setReceptionOpen(true); }} />
            </>
          )}
          {!isReceptionist && (
            <>
              {sample.status === 'RECEIVED' && <WorkflowBtn label={WORKFLOW_ACTIONS.coordinate.label} icon={WORKFLOW_ACTIONS.coordinate.icon} onClick={() => openAction('coordinate')} />}
              {sample.status === 'COORDINATED' && <WorkflowBtn label={WORKFLOW_ACTIONS.assignSection.label} icon={WORKFLOW_ACTIONS.assignSection.icon} onClick={() => openAction('assignSection')} />}
              {sample.status === 'COORDINATED' && <WorkflowBtn label="إعادة توزيع" icon={<LinkIcon />} onClick={() => openAction('assignSection')} />}
              {sample.status === 'ASSIGNED' && <WorkflowBtn label={WORKFLOW_ACTIONS.assignAnalyst.label} icon={WORKFLOW_ACTIONS.assignAnalyst.icon} onClick={() => openAction('assignAnalyst')} />}
              {['UNDER_TESTING', 'ASSIGNED'].includes(sample.status) && (
                <WorkflowBtn label="تحديد الفحوصات" icon={<BiotechIcon />} onClick={openParams} />
              )}
              {sample.status === 'UNDER_TESTING' && sample.tests.length > 0 && (
                <WorkflowBtn label={WORKFLOW_ACTIONS.submitForApproval.label} icon={WORKFLOW_ACTIONS.submitForApproval.icon} onClick={() => openAction('submitForApproval')} />
              )}
              {sample.status === 'READY_FOR_APPROVAL' && <WorkflowBtn label={WORKFLOW_ACTIONS.approve.label} icon={WORKFLOW_ACTIONS.approve.icon} onClick={() => openAction('approve')} />}
              {sample.approval_status === 'APPROVED' && sample.status !== 'DISPATCHED' && sample.status !== 'REJECTED' && (
                <>
                  <WorkflowBtn label={WORKFLOW_ACTIONS.invoice.label} icon={WORKFLOW_ACTIONS.invoice.icon} onClick={() => openAction('invoice')} />
                  <WorkflowBtn label={WORKFLOW_ACTIONS.dispatch.label} icon={WORKFLOW_ACTIONS.dispatch.icon} onClick={() => openAction('dispatch')} />
                </>
              )}
            </>
          )}
          <WorkflowBtn label="نقل يدوي" icon={<LocalShippingIcon />} onClick={() => { setTfFrom(''); setTfTo(''); setTransferOpen(true); }} />
          <WorkflowBtn label="طباعة Barcode" icon={<DescriptionIcon />} onClick={() => setBarcodeSample(sample)} />
          {!isReceptionist && (
            <WorkflowBtn label="إصدار شهادة" icon={<DescriptionIcon />} disabled={!certifiable} onClick={async () => { try { await certifySample(sample.id); notifySuccess('تم إصدار الشهادة'); onChanged(); await load(); } catch { notifyError('تعذر إصدار الشهادة'); } }} />
          )}
        </Stack>

        {/* الفحوصات */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>الفحوصات المطلوبة والنتائج</Typography>
          {sample.tests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">لا توجد فحوصات — حدّدها من زر "تحديد الفحوصات".</Typography>
          ) : (
            <Stack spacing={1}>
              {sample.tests.map((t) => (
                <Box key={t.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.parameter.name_ar} {t.parameter.unit ? `(${t.parameter.unit})` : ''}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        المعدل المرجعي: {t.reference_limit || '—'} • المحلل: {t.assigned_to_name ?? '—'}
                        {t.sla?.due_at ? ` • استحقاق: ${formatDateTime(t.sla.due_at)}` : ''}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} />
                        {t.version > 0 && <Chip size="small" variant="outlined" label={`الإصدار v${t.version}`} />}
                        {t.sla?.status && <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} />}
                        {t.sla?.tat_hours != null && <Chip size="small" variant="outlined" label={`TAT ${t.sla.tat_hours} س`} />}
                        {t.qc_status && t.qc_status !== 'PENDING' && <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} />}
                        {t.revisions && t.revisions.length > 0 && <Chip size="small" variant="outlined" color="warning" label={`تصحيحات: ${t.revisions.length}`} />}
                        {t.spec_snapshot && (
                          <Chip size="small" variant="outlined" color="info" label={`وفق مواصفة v${String((t.spec_snapshot as { version?: unknown }).version ?? '')}`} />
                        )}
                        {t.micro_limit && (
                          <Chip size="small" variant="outlined" label={`الحد: ${t.micro_limit.microorganism_code ?? ''}`} />
                        )}
                      </Stack>
                    </Box>
                    <StatusChip label={labDecision[t.decision]?.label ?? t.decision} tone={labDecision[t.decision]?.tone} />
                    {canAnalyze && t.status === 'PENDING' && (
                      <Tooltip title="بدء الفحص"><span><AppButton size="small" variant="secondary" onClick={() => run(() => startSampleTest(t.id), 'تم البدء')}>بدء</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && ['IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'REVIEWED'].includes(t.status) && (
                      <Tooltip title="إدخال النتيجة"><span><AppButton size="small" variant="secondary" onClick={() => openResult(t)}>نتيجة</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && (
                      <Tooltip title="تقييم ميكروبيولوجي آلي وفق المواصفة"><span><AppButton size="small" variant="secondary" onClick={() => setMicroEvalTest(t)}>تقييم</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && t.status === 'SUBMITTED' && (
                      <Tooltip title="مراجعة رئيس القسم"><span><AppButton size="small" variant="secondary" onClick={() => { setReviewTest(t); setReviewNotes(''); }}>مراجعة القسم</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && t.status === 'SUBMITTED' && (
                      <Tooltip title="إعادة النتيجة للمحلل للتصحيح"><span><AppButton size="small" variant="secondary" onClick={() => { setReturnTest(t); setReturnReason(''); }}>إعادة للتحليل</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && (
                      <Tooltip title="مراجعة الجودة QC"><span><AppButton size="small" variant="secondary" onClick={() => { setQcTest(t); setQcStatus('PASSED'); setQcNotes(''); }}>مراجعة QC</AppButton></span></Tooltip>
                    )}
                    {canSectionApprove && t.status === 'REVIEWED' && (
                      <Tooltip title="اعتماد مدير المختبر / رئيس القسم"><span><AppButton size="small" onClick={() => submitApproveTest(t)}>اعتماد</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && t.status === 'APPROVED' && (
                      <Tooltip title="طلب تصحيح النتيجة"><span><AppButton size="small" variant="secondary" onClick={() => { setReviseTest(t); setReviseReason(''); }}>تصحيح</AppButton></span></Tooltip>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* سلسلة الحيازة */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>سلسلة حيازة العينة ({sample.custody.length})</Typography>
          {sample.custody.length === 0 ? (
            <Typography variant="body2" color="text.secondary">لا توجد انتقالات مسجلة.</Typography>
          ) : (
            <Stack spacing={1}>
              {[...sample.custody].reverse().map((e, idx) => (
                <CustodyEvent key={e.id} event={e} isFirst={idx === 0} onAck={async () => { await run(() => acknowledgeCustody(e.id), 'تم تأكيد الاستلام'); }} />
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <AppButton variant="ghost" onClick={onClose}>إغلاق</AppButton>
      </DialogActions>

      {/* تنسيق/إسناد */}
      <FormDialog
        open={Boolean(action) || Boolean(action === 'assignSection')}
        onClose={() => setAction(null)}
        onSubmit={runActionSubmit}
        title={action ? WORKFLOW_ACTIONS[action].label : ''}
        maxWidth="xs"
      >
        {action === 'coordinate' && (
          <>
            <FormSelect label="منسّق عينات المختبر" requiredMark value={selUser} onChange={setSelUser} options={userOptions} />
            <Typography variant="caption" color="text.secondary">{WORKFLOW_ACTIONS.coordinate.hint}</Typography>
          </>
        )}
        {action === 'assignSection' && (
          <>
            <FormSelect label="قسم المختبر" value={selBench} onChange={setSelBench} options={Object.entries(labBench).map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormSelect label="رئيس القسم" value={selUser} onChange={setSelUser} placeholder="كمختار" options={userOptions} />
          </>
        )}
        {action === 'assignAnalyst' && (
          <>
            <FormSelect label="المحلّل" requiredMark value={selUser} onChange={setSelUser} options={userOptions} />
            <Typography variant="caption" color="text.secondary">{WORKFLOW_ACTIONS.assignAnalyst.hint}</Typography>
          </>
        )}
      </FormDialog>

      {/* تحديد الفحوصات */}
      <FormDialog open={paramsOpen} onClose={() => setParamsOpen(false)} onSubmit={submitParams} title="تحديد الفحوصات المطلوبة" maxWidth="sm">
        <Stack spacing={1}>
          {parameters.map((p) => (
            <Box
              key={p.id}
              onClick={() => toggleParam(p.id)}
              sx={{
                p: 1, border: '1px solid', borderColor: selParams.includes(p.id) ? 'primary.main' : 'divider',
                borderRadius: 1.5, cursor: 'pointer', bgcolor: selParams.includes(p.id) ? 'primary.50' : 'transparent',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon fontSize="small" color={selParams.includes(p.id) ? 'primary' : 'disabled'} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name_ar}</Typography>
                  <Typography variant="caption" color="text.secondary">{labBench[p.bench]?.label ?? p.bench} {p.unit ? `• ${p.unit}` : ''}</Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </FormDialog>

      {/* نقل يدوي */}
      <FormDialog open={transferOpen} onClose={() => setTransferOpen(false)} onSubmit={submitTransfer} title="تسجيل نقل يدوي" subtitle="تتبع مسؤولية العينة بين الأقسام" maxWidth="sm">
        <FormTextField label="من (القسم)" requiredMark value={tfFrom} onChange={(e) => setTfFrom(e.target.value)} />
        <FormTextField label="إلى (القسم)" requiredMark value={tfTo} onChange={(e) => setTfTo(e.target.value)} />
        <FormTextField label="حالة العينة" value={tfCond} onChange={(e) => setTfCond(e.target.value)} />
        <FormTextField label="رقم الختم" value={tfSeal} onChange={(e) => setTfSeal(e.target.value)} />
        <FormTextField label="ملاحظات" multiline minRows={2} value={tfRemarks} onChange={(e) => setTfRemarks(e.target.value)} />
      </FormDialog>

      {/* إدخال نتيجة */}
      <Dialog open={Boolean(resultTest)} onClose={() => setResultTest(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إدخال نتيجة الفحص</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          {resultTest && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{resultTest.parameter.name_ar} {resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''}</Typography>
              <FormTextField label="قيمة النتيجة" value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder={resultTest.unit || 'قيمة رقمية'} />
              <FormTextField label="الطريقة المستخدمة" value={resultMethod} onChange={(e) => setResultMethod(e.target.value)} placeholder={resultTest.parameter.method || 'الطريقة المعتمدة'} />
              <FormTextField label="الجهاز المستخدم" value={resultDevice} onChange={(e) => setResultDevice(e.target.value)} placeholder="جهاز التحليل" />
              <FormTextField label="رقم دفعة المادة (الكاشف)" value={resultReagent} onChange={(e) => setResultReagent(e.target.value)} placeholder="رقم الدفعة" />
              <FormSelect label="القرار" value={resultDecision} onChange={setResultDecision} options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
              <Typography variant="caption" color="text.secondary">«إرسال للمراجعة» يمرر النتيجة لمراجعة رئيس القسم ثم اعتماد مدير المختبر.</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <AppButton variant="ghost" onClick={() => setResultTest(null)} disabled={loading}>إلغاء</AppButton>
          <AppButton variant="secondary" onClick={submitResultDraft} disabled={loading}>حفظ مسودة</AppButton>
          <AppButton onClick={submitResult} disabled={loading}>إرسال للمراجعة</AppButton>
        </DialogActions>
      </Dialog>

      {/* مراجعة رئيس القسم */}
      <FormDialog open={Boolean(reviewTest)} onClose={() => setReviewTest(null)} onSubmit={submitReview} title="مراجعة رئيس القسم" subtitle="مراجعة النتيجة قبل اعتماد مدير المختبر" maxWidth="xs" submitLabel="إحالة للاعتماد">
        {reviewTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{reviewTest.parameter.name_ar}</Typography>
            <FormTextField label="قيمة النتيجة" value={reviewTest.result_value != null ? String(reviewTest.result_value) : '—'} disabled />
            <FormSelect label="القرار" value={reviewTest.decision} onChange={(v) => setReviewTest((t) => (t ? { ...t, decision: v } : t))} options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormTextField label="ملاحظات المراجعة" multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* طلب تصحيح */}
      <FormDialog open={Boolean(reviseTest)} onClose={() => setReviseTest(null)} onSubmit={submitRevise} title="طلب تصحيح نتيجة معتمدة" subtitle="يُحفظ الإصدار الحالي أرشيفياً وتُفتح نسخة جديدة" maxWidth="xs" submitLabel="فتح طلب التصحيح">
        {reviseTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{reviseTest.parameter.name_ar} — الإصدار v{reviseTest.version}</Typography>
            <FormTextField label="سبب التصحيح" requiredMark multiline minRows={2} value={reviseReason} onChange={(e) => setReviseReason(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* إعادة النتيجة للمحلل */}
      <FormDialog open={Boolean(returnTest)} onClose={() => setReturnTest(null)} onSubmit={submitReturn} title="إعادة النتيجة للتحليل" subtitle="تُعاد النتيجة للمحلل لتصحيحها قبل إعادة إرسالها" maxWidth="xs" submitLabel="إعادة النتيجة">
        {returnTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{returnTest.parameter.name_ar}</Typography>
            <FormTextField label="سبب الإعادة" requiredMark multiline minRows={2} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="مثال: خطأ في قراءة الجهاز / عدم مطابقة طريقة الاختبار" />
          </>
        )}
      </FormDialog>

      {/* مراجعة الجودة QC */}
      <FormDialog open={Boolean(qcTest)} onClose={() => setQcTest(null)} onSubmit={submitQc} title="مراجعة الجودة — QC" subtitle="اعتماد مطابقة النتيجة للمواصفة قبل اعتمادها النهائي" maxWidth="xs" submitLabel="تسجيل المراجعة">
        {qcTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{qcTest.parameter.name_ar}</Typography>
            <FormSelect label="نتيجة مراجعة الجودة" value={qcStatus} onChange={setQcStatus} options={Object.entries(labQc).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormTextField label="ملاحظات QC" multiline minRows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* قرار الاستلام */}
      <FormDialog open={receptionOpen} onClose={() => setReceptionOpen(false)} onSubmit={submitReception} title={receptionDecision === 'accept' ? 'قبول العينة' : receptionDecision === 'conditional' ? 'قبول مشروط' : 'رفض العينة'} subtitle="قرار قسم استلام العينات المختبرية" maxWidth="xs" submitLabel="تأكيد القرار">
        <FormTextField label="ملاحظات القرار" multiline minRows={2} value={receptionNote} onChange={(e) => setReceptionNote(e.target.value)} />
      </FormDialog>

      {/* فاتورة الرسوم */}
      <FormDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} onSubmit={submitInvoice} title="فاتورة رسوم التحليل" maxWidth="sm" submitLabel={invoiceAction === 'generate' ? 'إصدار الفاتورة' : invoiceAction === 'pay' ? 'تأكيد السداد' : 'تأكيد الإعفاء'}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <AppButton size="small" variant={invoiceAction === 'generate' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('generate'); setInvoiceNote(''); }}>إصدار فاتورة</AppButton>
          {sample.lab_invoice && LAB_INVOICE_PENDING.has(sample.lab_invoice.status) && (
            <>
              <AppButton size="small" variant={invoiceAction === 'pay' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('pay'); setInvoiceNote(''); }}>سداد</AppButton>
              <AppButton size="small" variant={invoiceAction === 'exempt' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('exempt'); setInvoiceNote(''); }}>إعفاء</AppButton>
            </>
          )}
        </Stack>
        {invoiceAction === 'generate' && (
          <>
            <Typography variant="body2" color="text.secondary">تُصدر الفاتورة من أسعار معاملات التحليل المحددة على العينة وتُعفى تلقائياً إذا كانت الرسوم صفراً.</Typography>
            {sample.lab_invoice && !LAB_INVOICE_PENDING.has(sample.lab_invoice.status) && (
              <Typography variant="body2" color="warning.main">توجد فاتورة سابقة ({sample.lab_invoice.invoice_number}) — سيتم إصدار فاتورة جديدة.</Typography>
            )}
          </>
        )}
        {invoiceAction === 'pay' && (
          <>
            <InvoiceSummary invoice={sample.lab_invoice} />
            <FormTextField label="مرجع السداد" value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} placeholder="رقم إيصال / مرجع الدفع" />
          </>
        )}
        {invoiceAction === 'exempt' && (
          <>
            <InvoiceSummary invoice={sample.lab_invoice} />
            <FormTextField label="سبب الإعفاء" value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} placeholder="إعفاء حكومي معتمد" />
          </>
        )}
      </FormDialog>

      {/* إرسال */}
      <FormDialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} onSubmit={submitDispatch} title="إرسال النتائج للجهة الطالبة" maxWidth="sm">
        <FormTextField label="الجهة الطالبة" requiredMark value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)} />
        <FormTextField label="ملاحظات الإرسال" multiline minRows={2} value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} />
      </FormDialog>

      {/* التقييم الميكروبيولوجي الآلي */}
      <MicroEvaluationDialog open={Boolean(microEvalTest)} test={microEvalTest} onClose={() => setMicroEvalTest(null)} onChanged={load} />

      {/* طباعة ملصق العينة — Barcode */}
      <PrintBarcodeDialog open={Boolean(barcodeSample)} sample={barcodeSample} onClose={() => setBarcodeSample(null)} />
    </Dialog>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <Grid item xs={6} md={3}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Grid>
);

const WorkflowBtn = ({ label, icon, onClick, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
  <AppButton variant="secondary" size="small" startIcon={icon} onClick={onClick} disabled={disabled}>{label}</AppButton>
);

const InvoiceSummary = ({ invoice }: { invoice: SampleInvoice | null }) => {
  const [printData, setPrintData] = useState<FinanceReceiptPrint | null>(null);
  if (!invoice) {
    return <Typography variant="body2" color="text.secondary">لا توجد فاتورة لهذه العينة — أصدرها أولاً.</Typography>;
  }
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{invoice.invoice_number}</Typography>
          <Typography variant="caption" color="text.secondary">{invoice.sample_number} • {formatDateTime(invoice.issued_at)}</Typography>
        </Box>
        <StatusChip label={labInvoiceStatus[invoice.status]?.label ?? invoice.status} tone={labInvoiceStatus[invoice.status]?.tone} />
        {invoice.receipt_number && (
          <Tooltip title="طباعة الإيصال">
            <IconButton size="small" onClick={() => setPrintData(sampleInvoiceToPrintData(invoice))}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {(invoice.items ?? []).map((it) => (
        <Typography key={it.parameter} variant="caption" color="text.secondary" display="block">
          {it.name_ar} — {it.quantity} × {it.unit_price} = {it.total}
        </Typography>
      ))}
      <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
        الإجمالي: {invoice.total_amount} {invoice.currency}
        {invoice.receipt_number ? ` • الإيصال: ${invoice.receipt_number}` : ''}
        {invoice.exemption_reason ? ` • الإعفاء: ${invoice.exemption_reason}` : ''}
      </Typography>
      <PrintReceiptDialog
        open={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </Box>
  );
};

const FlowStepper = ({ status }: { status: string }) => {
  const idx = FLOW_ORDER.indexOf(status);
  const rejected = status === 'REJECTED';
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
      {FLOW_ORDER.map((step, i) => {
        const done = idx >= i && !rejected;
        const current = idx === i && !rejected;
        return (
          <Stack key={step} direction="row" alignItems="center" spacing={0.5}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {done ? <CheckCircleIcon fontSize="small" color="primary" /> : <RadioButtonUncheckedIcon fontSize="small" color="disabled" />}
              <Typography variant="caption" sx={{ fontWeight: current ? 800 : 500, color: current ? 'primary.main' : 'text.secondary' }}>
                {labSampleStatus[step]?.label ?? step}
              </Typography>
            </Stack>
            {i < FLOW_ORDER.length - 1 && <CircleIcon sx={{ fontSize: 6, color: 'divider' }} />}
          </Stack>
        );
      })}
      {rejected && <Chip size="small" color="error" label="مرفوضة" icon={<CircleIcon sx={{ fontSize: 12 }} />} />}
    </Stack>
  );
};

const CustodyEvent = ({ event, isFirst, onAck }: { event: ChainOfCustody; isFirst: boolean; onAck: () => void }) => (
  <Box sx={{ p: 1.25, border: '1px solid', borderColor: isFirst ? 'primary.main' : 'divider', borderRadius: 1.5 }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: isFirst ? 'primary.main' : 'text.disabled' }}>
        <LocalShippingIcon sx={{ fontSize: 15 }} />
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {event.from_department} <span style={{ color: 'gray' }}>←</span> {event.to_department}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          النقل: {event.transferred_by_name ?? '—'} • {formatDateTime(event.transferred_at)}
          {event.condition ? ` • الحالة: ${event.condition}` : ''}
          {event.seal_number ? ` • الختم: ${event.seal_number}` : ''}
        </Typography>
        {event.received_by_name && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            الاستلام: {event.received_by_name} • {formatDateTime(event.received_at)}
          </Typography>
        )}
        {event.remarks && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>ملاحظات: {event.remarks}</Typography>}
      </Box>
      {event.is_received ? (
        <StatusChip label="استُلم" tone="success" />
      ) : (
        <AppButton size="small" variant="ghost" onClick={onAck}>تأكيد الاستلام</AppButton>
      )}
    </Stack>
  </Box>
);

export default FoodLabPage;