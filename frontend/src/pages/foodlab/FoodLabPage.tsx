import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

/* ---------- ثوابت ---------- */

const FLOW_ORDER = ['RECEIVED', 'COORDINATED', 'ASSIGNED', 'UNDER_TESTING', 'READY_FOR_APPROVAL', 'APPROVED', 'DISPATCHED'];

const LAB_INVOICE_PENDING = new Set(['DRAFT', 'ISSUED', 'PENDING_PAYMENT', 'OVERDUE', 'PENDING']);

const CLASSIFICATION_LABELS: Record<string, string> = {
  ANALYSIS: 'analysis',
  REFERENCE: 'reference',
};

const classificationLabel = (key: string, t: (k: string) => string) => t(`food.foodLab.classificationLabels.${key}`);

const CLASSIFICATION_TONES: Record<string, 'default' | 'primary'> = {
  ANALYSIS: 'primary',
  REFERENCE: 'default',
};

const WORKFLOW_ACTIONS: Record<string, { labelKey: string; icon: React.ReactNode; hintKey: string }> = {
  coordinate: { labelKey: 'food.foodLab.workflowActions.coordinate.label', icon: <LinkIcon />, hintKey: 'food.foodLab.workflowActions.coordinate.hint' },
  assignSection: { labelKey: 'food.foodLab.workflowActions.assignSection.label', icon: <BiotechIcon />, hintKey: 'food.foodLab.workflowActions.assignSection.hint' },
  assignAnalyst: { labelKey: 'food.foodLab.workflowActions.assignAnalyst.label', icon: <ScienceIcon />, hintKey: 'food.foodLab.workflowActions.assignAnalyst.hint' },
  submitForApproval: { labelKey: 'food.foodLab.workflowActions.submitForApproval.label', icon: <VerifiedIcon />, hintKey: 'food.foodLab.workflowActions.submitForApproval.hint' },
  approve: { labelKey: 'food.foodLab.workflowActions.approve.label', icon: <VerifiedIcon />, hintKey: 'food.foodLab.workflowActions.approve.hint' },
  invoice: { labelKey: 'food.foodLab.workflowActions.invoice.label', icon: <PaymentsIcon />, hintKey: 'food.foodLab.workflowActions.invoice.hint' },
  dispatch: { labelKey: 'food.foodLab.workflowActions.dispatch.label', icon: <LocalShippingIcon />, hintKey: 'food.foodLab.workflowActions.dispatch.hint' },
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
  const { t } = useTranslation();
  const sections = useMemo(() => [
    { id: 'dashboard', labelKey: 'food.foodLab.sections.dashboard', icon: <DashboardIcon fontSize="small" /> },
    { id: 'reception', labelKey: 'food.foodLab.sections.reception', icon: <AddIcon fontSize="small" /> },
    { id: 'custody', labelKey: 'food.foodLab.sections.custody', icon: <HistoryIcon fontSize="small" /> },
    { id: 'sources', labelKey: 'food.foodLab.sections.sources', icon: <CategoryIcon fontSize="small" /> },
    { id: 'references', labelKey: 'food.foodLab.sections.references', icon: <ArchiveIcon fontSize="small" /> },
    { id: 'certificates', labelKey: 'food.foodLab.sections.certificates', icon: <DescriptionIcon fontSize="small" /> },
  ], []);
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

  // `useServerTable` يعيد كائناً جديداً كل تصيير، لذا لا يدخل في
  // مصفوفة الاعتماديات — نلتقط الدالة نفسها لأنها مستقرة (useCallback).
  const refreshSamples = samples.refresh;
  const refreshCertificates = certificates.refresh;
  const refreshAll = useCallback(() => {
    refreshDash();
    refreshSamples();
    refreshCertificates();
  }, [refreshDash, refreshSamples, refreshCertificates]);

  useEffect(() => {
    refreshDash();
    refreshSources();
    refreshReferences();
    getLabParameters({ page_size: 100 }).then((r) => setParameters(r.data.data.results)).catch(() => undefined);
  }, [refreshDash, refreshSources, refreshReferences]);

  const { active, register, scrollTo } = useCommandSections(sections as unknown as CommandSectionDef[], [tab, dash]);

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(success);
      refreshAll();
    } catch {
      notifyError(t('food.foodLab.sampleDetail.errors.actionFailed'));
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
    if (!recType.trim()) return notifyError(t('food.foodLab.main.errors.writeSampleType'));
    if (!recSource) return notifyError(t('food.foodLab.main.errors.selectSource'));
    try {
      const payload: Record<string, unknown> = {
        source: recSource,
        classification: recClassification,
        sample_type: recType,
        requesting_department: recRequesting,
      };
      if (recBench) payload.bench = recBench;
      const res = await createLabSample(payload as never);
      notifySuccess(t('food.foodLab.main.success.sampleReceived', { number: res.data.data.sample_number }));
      setReceptionOpen(false);
      refreshAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('food.foodLab.main.errors.receiveFailed');
      notifyError(msg);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLabSample(deleting.id);
      notifySuccess(t('food.foodLab.main.success.sampleDeleted'));
      setDeleting(null);
      refreshAll();
    } catch {
      notifyError(t('food.foodLab.main.errors.deleteFailed'));
    }
  };

  const tabIcons = [<DashboardIcon />, <AddIcon />, <HistoryIcon />, <CategoryIcon />, <ArchiveIcon />, <DescriptionIcon />];

  return (
    <Box>
      <DashboardHero
        eyebrow="FCLIS — Food Control Lab"
        title={t('food.foodLab.main.hero.title')}
        subtitle={t('food.foodLab.main.hero.subtitle')}
        gradient="emerald"
        avatarLabel={(user?.full_name || t('food.foodLab.main.hero.avatarFallback')).slice(0, 1)}
        action={<AppButton startIcon={<AddIcon />} onClick={openReception}>{t('food.foodLab.main.hero.action')}</AppButton>}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('food.foodLab.main.hero.live')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('food.foodLab.main.nav.label')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <PageTabs
        value={tab}
        onChange={(v) => setTab(v)}
        tabs={[
          { label: t('food.foodLab.main.tabs.dashboard'), icon: tabIcons[0] },
          { label: t('food.foodLab.main.tabs.reception'), icon: tabIcons[1] },
          { label: t('food.foodLab.main.tabs.custody'), icon: tabIcons[2] },
          { label: t('food.foodLab.main.tabs.sources'), icon: tabIcons[3] },
          { label: t('food.foodLab.main.tabs.references'), icon: tabIcons[4] },
          { label: t('food.foodLab.main.tabs.certificates'), icon: tabIcons[5] },
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
        title={t('food.foodLab.main.reception.title')}
        subtitle={t('food.foodLab.main.reception.subtitle')}
        maxWidth="sm"
      >
        <FormSelect label={t('food.foodLab.main.reception.source')} requiredMark value={recSource} onChange={setRecSource} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} />
        <FormSelect label={t('food.foodLab.sampleDetail.dialogs.classify.label')} value={recClassification} onChange={setRecClassification} options={Object.entries(CLASSIFICATION_LABELS).map(([v, l]) => ({ value: v, label: classificationLabel(l, t) }))} />
        <FormTextField label={t('food.foodLab.main.reception.productType')} requiredMark value={recType} onChange={(e) => setRecType(e.target.value)} placeholder={t('food.foodLab.main.reception.productPlaceholder')} />
        <FormTextField label={t('food.foodLab.sampleDetail.dispatch.to')} value={recRequesting} onChange={(e) => setRecRequesting(e.target.value)} placeholder={t('food.foodLab.main.reception.requestingPlaceholder')} />
        <FormSelect label={t('food.foodLab.main.reception.bench')} value={recBench} onChange={setRecBench} placeholder={t('food.foodLab.main.reception.benchPlaceholder')} options={Object.entries(labBench).map(([v, m]) => ({ value: v, label: m.label }))} />
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
        title={t('food.foodLab.main.delete.title')}
        message={t('food.foodLab.main.delete.message', { number: deleting?.sample_number })}
        confirmLabel={t('food.foodLab.main.delete.confirm')}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

/* ================== لوحة التحكم ================== */

const DashboardTab = ({ dash }: { dash: FoodLabDashboard | null }) => {
  const { t } = useTranslation();
  if (!dash) return null;
  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={2}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );
  return (
    <Box>
      <Grid container spacing={1.5}>
        {stat(t('food.foodLab.dashboard.kpi.totalSamples'), dash.total_samples, <ScienceIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.received'), dash.received, <RadioButtonUncheckedIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.coordinated'), dash.coordinated, <LinkIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.underTesting'), dash.under_testing, <BiotechIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.readyForApproval'), dash.ready_for_approval, <VerifiedIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.approvedDispatched'), dash.approved + dash.dispatched, <CheckCircleIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.rejected'), dash.rejected, <CircleIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.receptionPending'), dash.reception_pending, <RadioButtonUncheckedIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.receptionCond'), dash.reception_cond, <VerifiedIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.unpaid'), dash.unpaid_samples, <PaymentsIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.overdue'), dash.overdue_tests, <CircleIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.slaCompliance'), dash.sla_compliance_pct != null ? `${dash.sla_compliance_pct}%` : '—', <CheckCircleIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.referenceSamples'), dash.reference_samples, <ArchiveIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.custodyEvents'), dash.custody_events, <HistoryIcon />)}
        {stat(t('food.foodLab.dashboard.kpi.certificates'), dash.certificates, <DescriptionIcon />)}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <InfoPanel title={t('food.foodLab.dashboard.panels.bySource')}>
            {dash.by_source.length === 0 ? (
              <EmptyHint text={t('food.foodLab.dashboard.panels.noData')} />
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
          <InfoPanel title={t('food.foodLab.dashboard.panels.byBench')}>
            {Object.keys(dash.by_bench).length === 0 ? (
              <EmptyHint text={t('food.foodLab.dashboard.panels.noData')} />
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
  const { t } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: t('food.foodLab.reception.columns.number'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: t('food.foodLab.reception.columns.product') },
    { key: 'source_name', label: t('food.foodLab.reception.columns.source'), render: (s) => s.source_name ?? '—' },
    { key: 'received_by_name', label: t('food.foodLab.reception.columns.receivedBy'), render: (s) => s.received_by_name ?? '—' },
    { key: 'received_at', label: t('food.foodLab.reception.columns.receivedAt'), render: (s) => formatDateTime(s.received_at) },
    { key: 'reception_status', label: t('food.foodLab.reception.columns.decision'), render: (s) => <StatusChip label={labReception[s.reception_status]?.label ?? s.reception_status} tone={labReception[s.reception_status]?.tone} /> },
    { key: 'status', label: t('food.foodLab.reception.columns.status'), render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'priority', label: t('food.foodLab.reception.columns.priority'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    {
      key: 'actions', label: '', render: (s) => (
        <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{t('food.foodLab.reception.actions.open')}</AppButton>
      ),
    },
  ], [onOpenSample, t]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={onRegister}>{t('food.foodLab.reception.actions.receive')}</AppButton>
      </Box>
      <FoodDataTable<FoodSample> columns={columns} table={samplesTable} title={t('food.foodLab.reception.tableTitle')} />
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
  const { t } = useTranslation();
  const columns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: t('food.foodLab.custody.columns.number'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: t('food.foodLab.custody.columns.product') },
    { key: 'classification', label: t('food.foodLab.custody.columns.classification'), render: (s) => <Chip size="small" label={CLASSIFICATION_LABELS[s.classification] ? classificationLabel(CLASSIFICATION_LABELS[s.classification], t) : s.classification} color={CLASSIFICATION_TONES[s.classification]} variant="outlined" /> },
    { key: 'source_name', label: t('food.foodLab.custody.columns.source'), render: (s) => s.source_name ?? '—' },
    { key: 'bench', label: t('food.foodLab.custody.columns.bench'), render: (s) => labBench[s.bench]?.label ?? s.bench },
    { key: 'priority', label: t('food.foodLab.custody.columns.priority'), render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: t('food.foodLab.custody.columns.status'), render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'collection_status', label: t('food.foodLab.custody.columns.collection'), render: (s) => <StatusChip label={labCollection[s.collection_status]?.label ?? s.collection_status} tone={labCollection[s.collection_status]?.tone} /> },
    { key: 'invoice', label: t('food.foodLab.custody.columns.invoice'), render: (s) => (s.lab_invoice ? <StatusChip label={labInvoiceStatus[s.lab_invoice.status]?.label ?? s.lab_invoice.status} tone={labInvoiceStatus[s.lab_invoice.status]?.tone} /> : <Typography variant="caption" color="text.secondary">—</Typography>) },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={0.5}>
          <AppButton size="small" variant="secondary" onClick={() => onOpenSample(s.id)}>{t('food.foodLab.custody.actions.openChain')}</AppButton>
          <IconButton aria-label={t('food.foodLab.custody.actions.delete')} size="small" color="error" onClick={() => onDelete(s)}><DeleteIcon fontSize="small" /></IconButton>
        </Stack>
      ),
    },
  ], [onOpenSample, onDelete, t]);

  return (
    <FoodDataTable<FoodSample>
      columns={columns}
      table={samplesTable}
      title={t('food.foodLab.custody.tableTitle')}
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
  const { t } = useTranslation();
  const openNew = () => setDialog({ open: true, editing: null, code: '', nameAr: '', order: sources.length + 1 });
  const openEdit = (s: SampleSource) => setDialog({ open: true, editing: s, code: s.code, nameAr: s.name_ar, order: s.order });
  const [deleteTarget, setDeleteTarget] = useState<SampleSource | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDeleteSource = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteSampleSource(deleteTarget.id);
      notifySuccess(t('food.foodLab.sources.notifications.deleted'));
      setDeleteTarget(null);
      onRefresh();
    } catch {
      notifyError(t('food.foodLab.sources.notifications.deleteFailed'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const save = async () => {
    if (!dialog.nameAr.trim()) return notifyError(t('food.foodLab.sources.notifications.writeName'));
    try {
      if (dialog.editing) {
        await updateSampleSource(dialog.editing.id, { code: dialog.code || dialog.editing.code, name_ar: dialog.nameAr, order: dialog.order });
        notifySuccess(t('food.foodLab.sources.notifications.updated'));
      } else {
        await createSampleSource({ code: dialog.code || `SRC_${dialog.nameAr}`, name_ar: dialog.nameAr, order: dialog.order, is_active: true });
        notifySuccess(t('food.foodLab.sources.notifications.added'));
      }
      setDialog((d) => ({ ...d, open: false }));
      onRefresh();
    } catch {
      notifyError(t('food.foodLab.sources.notifications.saveFailed'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={openNew}>{t('food.foodLab.sources.buttons.new')}</AppButton>
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
                <Tooltip title={t('food.foodLab.sources.buttons.edit')}>
                  <IconButton aria-label={t('food.foodLab.sources.buttons.edit')} size="small" onClick={() => openEdit(s)}><EditPencil /></IconButton>
                </Tooltip>
                <Tooltip title={t('food.foodLab.sources.buttons.delete')}>
                  <IconButton aria-label={t('food.foodLab.sources.buttons.delete')} size="small" color="error" onClick={() => setDeleteTarget(s)}><DeleteIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <FormDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSubmit={save} title={dialog.editing ? t('food.foodLab.sources.dialogs.source.titleEdit') : t('food.foodLab.sources.dialogs.source.title')} maxWidth="xs">
        <FormTextField label={t('food.foodLab.sources.dialogs.source.nameAr')} requiredMark value={dialog.nameAr} onChange={(e) => setDialog((d) => ({ ...d, nameAr: e.target.value }))} />
        <FormTextField label={t('food.foodLab.sources.dialogs.source.code')} value={dialog.code} onChange={(e) => setDialog((d) => ({ ...d, code: e.target.value }))} />
        <FormTextField label={t('food.foodLab.sources.dialogs.source.order')} type="number" value={dialog.order} onChange={(e) => setDialog((d) => ({ ...d, order: Number(e.target.value) }))} />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('food.foodLab.sources.dialogs.delete.title')}
        message={t('food.foodLab.sources.dialogs.delete.message', { name: deleteTarget?.name_ar || '' })}
        confirmLabel={t('food.foodLab.sources.dialogs.delete.confirm')}
        tone="error"
        loading={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteSource}
      />
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
  const { t } = useTranslation();
  const openNew = () => setDialog({ open: true, source: sources[0]?.id ?? '', product: '', origin: '', storage: '', seal: '', coding: '' });
  const [deleteTarget, setDeleteTarget] = useState<ReferenceSample | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDeleteReference = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteReferenceSample(deleteTarget.id);
      notifySuccess(t('food.foodLab.references.notifications.deleted'));
      setDeleteTarget(null);
      onRefresh();
    } catch {
      notifyError(t('food.foodLab.references.notifications.deleteFailed'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const save = async () => {
    if (!dialog.product.trim()) return notifyError(t('food.foodLab.references.notifications.writeName'));
    try {
      await createReferenceSample({ source: dialog.source || undefined, product_name: dialog.product, origin: dialog.origin, storage_location: dialog.storage, seal_number: dialog.seal, coding: dialog.coding });
      notifySuccess(t('food.foodLab.references.notifications.added'));
      setDialog((d) => ({ ...d, open: false }));
      onRefresh();
    } catch {
      notifyError(t('food.foodLab.references.notifications.addFailed'));
    }
  };

  const refStatus: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
    STORED: { label: t('food.foodLab.references.statuses.stored'), tone: 'success' },
    RETRIEVED: { label: t('food.foodLab.references.statuses.retrieved'), tone: 'warning' },
    DISCARDED: { label: t('food.foodLab.references.statuses.discarded'), tone: 'error' },
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <AppButton startIcon={<AddIcon />} onClick={openNew}>{t('food.foodLab.references.buttons.new')}</AppButton>
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
                {t('food.foodLab.references.labels.location')}: {r.storage_location || '—'} • {t('food.foodLab.references.labels.seal')}: {r.seal_number || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('food.foodLab.references.labels.received')}: {formatDateTime(r.received_at)} — {r.received_by_name ?? '—'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <AppButton size="small" variant="secondary" disabled={r.status !== 'STORED'} onClick={async () => { try { await retrieveReferenceSample(r.id, t('food.foodLab.references.buttons.return')); notifySuccess(t('food.foodLab.references.notifications.returned')); onRefresh(); } catch { notifyError(t('food.foodLab.references.notifications.executeFailed')); } }}>
                  {t('food.foodLab.references.buttons.return')}
                </AppButton>
                <AppButton size="small" variant="danger" disabled={r.status === 'DISCARDED'} onClick={async () => { try { await discardReferenceSample(r.id, t('food.foodLab.references.buttons.discard')); notifySuccess(t('food.foodLab.references.notifications.discarded')); onRefresh(); } catch { notifyError(t('food.foodLab.references.notifications.executeFailed')); } }}>
                  {t('food.foodLab.references.buttons.discard')}
                </AppButton>
                <IconButton aria-label={t('food.foodLab.references.buttons.delete')} size="small" color="error" onClick={() => setDeleteTarget(r)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <FormDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSubmit={save} title={t('food.foodLab.references.dialogs.reference.title')} subtitle={t('food.foodLab.references.dialogs.reference.subtitle')} maxWidth="sm">
        <FormSelect label={t('food.foodLab.references.dialogs.reference.source')} value={dialog.source} onChange={(v) => setDialog((d) => ({ ...d, source: v }))} options={sources.map((s) => ({ value: s.id, label: s.name_ar }))} />
        <FormTextField label={t('food.foodLab.references.dialogs.reference.name')} requiredMark value={dialog.product} onChange={(e) => setDialog((d) => ({ ...d, product: e.target.value }))} />
        <FormTextField label={t('food.foodLab.references.dialogs.reference.origin')} value={dialog.origin} onChange={(e) => setDialog((d) => ({ ...d, origin: e.target.value }))} />
        <FormTextField label={t('food.foodLab.references.dialogs.reference.storage')} value={dialog.storage} onChange={(e) => setDialog((d) => ({ ...d, storage: e.target.value }))} />
        <FormTextField label={t('food.foodLab.references.dialogs.reference.seal')} value={dialog.seal} onChange={(e) => setDialog((d) => ({ ...d, seal: e.target.value }))} />
        <FormTextField label={t('food.foodLab.references.dialogs.reference.coding')} value={dialog.coding} onChange={(e) => setDialog((d) => ({ ...d, coding: e.target.value }))} />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('food.foodLab.references.dialogs.delete.title')}
        message={t('food.foodLab.references.dialogs.delete.message', { name: deleteTarget?.product_name || '', ref: deleteTarget?.ref_number || '—' })}
        confirmLabel={t('food.foodLab.references.dialogs.delete.confirm')}
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

/* ================== الشهادات ================== */

const CertificatesTab = ({ table }: { table: ReturnType<typeof useServerTable<AnalysisCertificate>> }) => {
  const { t } = useTranslation();
  const columns: DataTableColumn<AnalysisCertificate>[] = useMemo(() => [
    { key: 'certificate_number', label: t('food.foodLab.certificates.columns.number'), render: (c) => <b>{c.certificate_number}</b> },
    { key: 'sample_number', label: t('food.foodLab.certificates.columns.sample') },
    { key: 'decision', label: t('food.foodLab.certificates.columns.decision'), render: (c) => <StatusChip label={labDecision[c.decision]?.label ?? c.decision} tone={labDecision[c.decision]?.tone} /> },
    { key: 'status', label: t('food.foodLab.certificates.columns.status'), render: (c) => <StatusChip label={c.status === 'ISSUED' ? t('food.foodLab.certificates.status.issued') : t('food.foodLab.certificates.status.draft')} tone={c.status === 'ISSUED' ? 'success' : 'neutral'} /> },
    { key: 'issued_by_name', label: t('food.foodLab.certificates.columns.signer'), render: (c) => c.issued_by_name ?? '—' },
    { key: 'issued_at', label: t('food.foodLab.certificates.columns.issuedAt'), render: (c) => formatDateTime(c.issued_at) },
  ], [t]);

  return <FoodDataTable<AnalysisCertificate> columns={columns} table={table} title={t('food.foodLab.certificates.tableTitle')} />;
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
  const { t: i18nT } = useTranslation();
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
      notifyError(i18nT('food.foodLab.sampleDetail.errors.loadFailed'));
      onClose();
    } finally {
      setLoading(false);
    }
  }, [sampleId, onClose, i18nT]);

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
      notifyError(i18nT('food.foodLab.sampleDetail.errors.actionFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!sample) {
    return <Dialog open onClose={onClose} maxWidth="sm" fullWidth><DialogContent sx={{ textAlign: 'center', py: 6 }}>{i18nT('food.foodLab.sampleDetail.loading')}</DialogContent></Dialog>;
  }

  const userOptions = users.map((u) => ({ value: u.id, label: u.full_name ? `${u.full_name} (${u.email})` : u.email }));

  const openAction = (a: keyof typeof WORKFLOW_ACTIONS) => {
    setAction(a);
    setSelUser('');
    if (a === 'submitForApproval') {
      run(() => submitForApproval(sample.id), i18nT('food.foodLab.sampleDetail.actions.submitForApproval'));
      return;
    }
    if (a === 'approve') {
      run(() => approveSample(sample.id), i18nT('food.foodLab.sampleDetail.actions.approve'));
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
      if (!selUser) return notifyError(i18nT('food.foodLab.sampleDetail.dialogs.coordinate.selectCoordinator'));
      await run(() => coordinateSample(sample.id, selUser), i18nT('food.foodLab.sampleDetail.dialogs.coordinate.success'));
    } else if (action === 'assignSection') {
      await run(() => assignSampleSection(sample.id, selBench, selUser || undefined), i18nT('food.foodLab.sampleDetail.dialogs.assignSection.success'));
    } else if (action === 'assignAnalyst') {
      if (!selUser) return notifyError(i18nT('food.foodLab.sampleDetail.dialogs.assignAnalyst.selectAnalyst'));
      await run(() => assignSampleAnalyst(sample.id, selUser), i18nT('food.foodLab.sampleDetail.dialogs.assignAnalyst.success'));
    }
    setAction(null);
  };

  const submitTransfer = async () => {
    if (!tfFrom || !tfTo) return notifyError(i18nT('food.foodLab.sampleDetail.dialogs.transfer.selectDepartments'));
    await run(() => transferSample(sample.id, { from_department: tfFrom, to_department: tfTo, condition: tfCond, seal_number: tfSeal, remarks: tfRemarks }), i18nT('food.foodLab.sampleDetail.dialogs.transfer.manualSuccess'));
    setTransferOpen(false);
    setTfFrom(''); setTfTo(''); setTfCond(''); setTfSeal(''); setTfRemarks('');
  };

  const submitReception = async () => {
    if (receptionDecision === 'accept') await run(() => acceptSample(sample.id, receptionNote), i18nT('food.foodLab.sampleDetail.reception.acceptSuccess'));
    else if (receptionDecision === 'conditional') await run(() => conditionalAcceptSample(sample.id, receptionNote), i18nT('food.foodLab.sampleDetail.reception.conditionalSuccess'));
    else await run(() => rejectSample(sample.id, receptionNote), i18nT('food.foodLab.sampleDetail.reception.rejectSuccess'));
    setReceptionOpen(false);
    setReceptionNote('');
  };

  const submitInvoice = async () => {
    if (invoiceAction === 'generate') await run(() => generateSampleInvoice(sample.id), i18nT('food.foodLab.sampleDetail.invoice.generateSuccess'));
    else if (invoiceAction === 'pay') await run(() => paySampleFee(sample.id, invoiceNote), i18nT('food.foodLab.sampleDetail.invoice.paySuccess'));
    else await run(() => exemptSampleFee(sample.id, invoiceNote), i18nT('food.foodLab.sampleDetail.invoice.exemptSuccess'));
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
    await run(() => saveSampleTestResult(resultTest.id, resultPayload()), i18nT('food.foodLab.sampleDetail.tests.saveDraftSuccess'));
    closeResult();
  };

  const submitResult = async () => {
    if (!resultTest) return;
    await run(() => enterSampleTestResult(resultTest.id, resultPayload()), i18nT('food.foodLab.sampleDetail.tests.submitSuccess'));
    closeResult();
  };

  const submitReview = async () => {
    if (!reviewTest) return;
    await run(
      () => reviewSampleTest(reviewTest.id, { notes: reviewNotes, decision: reviewTest.decision }),
      i18nT('food.foodLab.sampleDetail.tests.sectionReviewSuccess'),
    );
    setReviewTest(null);
    setReviewNotes('');
  };

  const submitApproveTest = async (st: SampleTest) => {
    await run(() => approveSampleTest(st.id), i18nT('food.foodLab.sampleDetail.tests.approveSuccess'));
  };

  const submitRevise = async () => {
    if (!reviseTest) return;
    await run(
      () => reviseSampleTest(reviseTest.id, {
        reason: reviseReason,
        result_value: reviseTest.result_value,
        decision: reviseTest.decision,
      }),
      i18nT('food.foodLab.sampleDetail.tests.openCorrectionSuccess'),
    );
    setReviseTest(null);
    setReviseReason('');
  };

  const submitReturn = async () => {
    if (!returnTest) return;
    await run(() => returnSampleTest(returnTest.id, returnReason), i18nT('food.foodLab.sampleDetail.tests.returnSuccess'));
    setReturnTest(null);
    setReturnReason('');
  };

  const submitQc = async () => {
    if (!qcTest) return;
    await run(
      () => markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes }),
      qcStatus === 'PASSED' ? i18nT('food.foodLab.sampleDetail.tests.qcPassed') : i18nT('food.foodLab.sampleDetail.tests.qcFailed'),
    );
    setQcTest(null);
    setQcNotes('');
  };

  const submitDispatch = async () => {
    await run(() => dispatchResult(sample.id, { requesting_department: dispatchTo, dispatch_notes: dispatchNotes }), i18nT('food.foodLab.sampleDetail.dispatch.success'));
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
    await run(() => setSampleParameters(sample.id, selParams), i18nT('food.foodLab.sampleDetail.parameters.success'));
    setParamsOpen(false);
  };

  const saveCoordinatorPriority = async () => {
    setLoading(true);
    try {
      await setSamplePriority(sample.id, priorityValue);
      notifySuccess(i18nT('food.foodLab.sampleDetail.priority.success'));
      await load();
      onChanged();
    } catch {
      notifyError(i18nT('food.foodLab.sampleDetail.priority.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveCoordinatorClassification = async () => {
    setLoading(true);
    try {
      await updateLabSample(sample.id, { classification: classifyValue });
      notifySuccess(i18nT('food.foodLab.sampleDetail.classification.success'));
      await load();
      onChanged();
    } catch {
      notifyError(i18nT('food.foodLab.sampleDetail.classification.error'));
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
        {/* {i18nT('food.foodLab.sampleDetail.sections.generalInfo')} */}
        <Grid container spacing={1.5}>
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.source')} value={sample.source_name ?? '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.classification')} value={CLASSIFICATION_LABELS[sample.classification] ? classificationLabel(CLASSIFICATION_LABELS[sample.classification], i18nT) : sample.classification} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.priority')} value={sample.priority_label ?? '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.requestingDept')} value={sample.requesting_department || '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.bench')} value={labBench[sample.bench]?.label ?? sample.bench} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.received')} value={sample.received_by_name ? `${sample.received_by_name} — ${formatDateTime(sample.received_at)}` : '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.coordinator')} value={sample.coordinator_name ?? '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.sectionHead')} value={sample.department_head_name ?? '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.analyst')} value={sample.analyst_name ?? '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.approved')} value={sample.approved_by_name ? `${sample.approved_by_name} — ${formatDateTime(sample.approved_at)}` : '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.receptionDecision')} value={sample.reception_status ? `${labReception[sample.reception_status]?.label ?? sample.reception_status}${sample.reception_note ? ` — ${sample.reception_note}` : ''}` : '—'} />
          <Meta label={i18nT('food.foodLab.sampleDetail.meta.collection')} value={`${labCollection[sample.collection_status]?.label ?? sample.collection_status} (${sample.fee_amount})`} />
          {sample.lab_invoice && (
            <Meta label={i18nT('food.foodLab.sampleDetail.meta.invoice')} value={`${sample.lab_invoice.invoice_number} • ${labInvoiceStatus[sample.lab_invoice.status]?.label ?? sample.lab_invoice.status}`} />
          )}
        </Grid>

        {/* {i18nT('food.foodLab.sampleDetail.sections.path')} */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.foodLab.sampleDetail.sections.path')}</Typography>
          <FlowStepper status={sample.status} />
        </Box>

        {/* {i18nT('food.foodLab.sampleDetail.sections.coordinatorPanel')} */}
        {canCoordinate && (
          <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.foodLab.sampleDetail.sections.coordinatorPanel')}</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <FormSelect label={i18nT('food.foodLab.sampleDetail.priority.label')} value={priorityValue} onChange={setPriorityValue} options={Object.entries(labPriority).map(([v, m]) => ({ value: v, label: m.label }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.classify.label')} value={classifyValue} onChange={setClassifyValue} options={Object.entries(CLASSIFICATION_LABELS).map(([v, l]) => ({ value: v, label: classificationLabel(l, i18nT) }))} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <AppButton size="small" onClick={saveCoordinatorPriority} disabled={priorityValue === (sample.priority || 'NORMAL')}>{i18nT('food.foodLab.sampleDetail.priority.save')}</AppButton>
              <AppButton size="small" variant="secondary" onClick={saveCoordinatorClassification} disabled={classifyValue === (sample.classification || '')}>{i18nT('food.foodLab.sampleDetail.dialogs.classify.save')}</AppButton>
            </Stack>
          </Box>
        )}

        {/* {i18nT('food.foodLab.sampleDetail.sections.actions')} */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {sample.reception_status === 'RECEIVED' && (
            <>
              <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.accept')} icon={<CheckCircleIcon />} onClick={() => { setReceptionDecision('accept'); setReceptionNote(''); setReceptionOpen(true); }} />
              <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.acceptConditional')} icon={<VerifiedIcon />} onClick={() => { setReceptionDecision('conditional'); setReceptionNote(''); setReceptionOpen(true); }} />
              <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.reject')} icon={<CircleIcon />} onClick={() => { setReceptionDecision('reject'); setReceptionNote(''); setReceptionOpen(true); }} />
            </>
          )}
          {!isReceptionist && (
            <>
              {sample.status === 'RECEIVED' && <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.coordinate.labelKey)} icon={WORKFLOW_ACTIONS.coordinate.icon} onClick={() => openAction('coordinate')} />}
              {sample.status === 'COORDINATED' && <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.assignSection.labelKey)} icon={WORKFLOW_ACTIONS.assignSection.icon} onClick={() => openAction('assignSection')} />}
              {sample.status === 'COORDINATED' && <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.redistribute')} icon={<LinkIcon />} onClick={() => openAction('assignSection')} />}
              {sample.status === 'ASSIGNED' && <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.assignAnalyst.labelKey)} icon={WORKFLOW_ACTIONS.assignAnalyst.icon} onClick={() => openAction('assignAnalyst')} />}
              {['UNDER_TESTING', 'ASSIGNED'].includes(sample.status) && (
                <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.setParameters')} icon={<BiotechIcon />} onClick={openParams} />
              )}
              {sample.status === 'UNDER_TESTING' && sample.tests.length > 0 && (
                <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.submitForApproval.labelKey)} icon={WORKFLOW_ACTIONS.submitForApproval.icon} onClick={() => openAction('submitForApproval')} />
              )}
              {sample.status === 'READY_FOR_APPROVAL' && <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.approve.labelKey)} icon={WORKFLOW_ACTIONS.approve.icon} onClick={() => openAction('approve')} />}
              {sample.approval_status === 'APPROVED' && sample.status !== 'DISPATCHED' && sample.status !== 'REJECTED' && (
                <>
                  <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.invoice.labelKey)} icon={WORKFLOW_ACTIONS.invoice.icon} onClick={() => openAction('invoice')} />
                  <WorkflowBtn label={i18nT(WORKFLOW_ACTIONS.dispatch.labelKey)} icon={WORKFLOW_ACTIONS.dispatch.icon} onClick={() => openAction('dispatch')} />
                </>
              )}
            </>
          )}
          <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.manualTransfer')} icon={<LocalShippingIcon />} onClick={() => { setTfFrom(''); setTfTo(''); setTransferOpen(true); }} />
          <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.printBarcode')} icon={<DescriptionIcon />} onClick={() => setBarcodeSample(sample)} />
          {!isReceptionist && (
            <WorkflowBtn label={i18nT('food.foodLab.sampleDetail.actions.issueCertificate')} icon={<DescriptionIcon />} disabled={!certifiable} onClick={async () => { try { await certifySample(sample.id); notifySuccess(i18nT('food.foodLab.sampleDetail.certificate.success')); onChanged(); await load(); } catch { notifyError(i18nT('food.foodLab.sampleDetail.certificate.error')); } }} />
          )}
        </Stack>

        {/* {i18nT('food.foodLab.sampleDetail.sections.tests')} */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.foodLab.sampleDetail.sections.tests')}</Typography>
          {sample.tests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{i18nT('food.foodLab.sampleDetail.tests.noTests')}</Typography>
          ) : (
            <Stack spacing={1}>
              {sample.tests.map((t) => (
                <Box key={t.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.parameter.name_ar} {t.parameter.unit ? `(${t.parameter.unit})` : ''}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i18nT('food.foodLab.sampleDetail.tests.referenceLimit', { value: t.reference_limit || '—' })} • {i18nT('food.foodLab.sampleDetail.tests.analyst', { name: t.assigned_to_name ?? '—' })}
                        {t.sla?.due_at ? ` • {i18nT('food.foodLab.sampleDetail.tests.due', { date: formatDateTime(t.sla.due_at) })}` : ''}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} />
                        {t.version > 0 && <Chip size="small" variant="outlined" label={`{i18nT('food.foodLab.sampleDetail.tests.revision', { version: t.version })}`} />}
                        {t.sla?.status && <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} />}
                        {t.sla?.tat_hours != null && <Chip size="small" variant="outlined" label={`{i18nT('food.foodLab.sampleDetail.tests.tat', { hours: t.sla.tat_hours })}`} />}
                        {t.qc_status && t.qc_status !== 'PENDING' && <StatusChip label={labQc[t.qc_status]?.label ?? t.qc_status} tone={labQc[t.qc_status]?.tone} />}
                        {t.revisions && t.revisions.length > 0 && <Chip size="small" variant="outlined" color="warning" label={`{i18nT('food.foodLab.sampleDetail.tests.corrections', { count: t.revisions.length })}`} />}
                        {t.spec_snapshot && (
                          <Chip size="small" variant="outlined" color="info" label={i18nT('food.foodLab.sampleDetail.tests.specVersion', { version: String((t.spec_snapshot as { version?: unknown }).version ?? '') })} />
                        )}
                        {t.micro_limit && (
                          <Chip size="small" variant="outlined" label={`{i18nT('food.foodLab.sampleDetail.tests.limit', { value: t.micro_limit.microorganism_code ?? '' })}`} />
                        )}
                      </Stack>
                    </Box>
                    <StatusChip label={labDecision[t.decision]?.label ?? t.decision} tone={labDecision[t.decision]?.tone} />
                    {canAnalyze && t.status === 'PENDING' && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.start')}><span><AppButton size="small" variant="secondary" onClick={() => run(() => startSampleTest(t.id), i18nT('food.foodLab.sampleDetail.tests.startTest'))}>{i18nT('food.foodLab.sampleDetail.tests.start')}</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && ['IN_PROGRESS', 'DRAFT', 'SUBMITTED', 'REVIEWED'].includes(t.status) && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.enterResult')}><span><AppButton size="small" variant="secondary" onClick={() => openResult(t)}>{i18nT('food.foodLab.sampleDetail.tests.enterResult')}</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.microEval')}><span><AppButton size="small" variant="secondary" onClick={() => setMicroEvalTest(t)}>{i18nT('food.foodLab.sampleDetail.tests.enterResult')}</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && t.status === 'SUBMITTED' && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.sectionReview')}><span><AppButton size="small" variant="secondary" onClick={() => { setReviewTest(t); setReviewNotes(''); }}>{i18nT('food.foodLab.sampleDetail.tests.sectionReview')}</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && t.status === 'SUBMITTED' && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.returnForCorrection')}><span><AppButton size="small" variant="secondary" onClick={() => { setReturnTest(t); setReturnReason(''); }}>{i18nT('food.foodLab.sampleDetail.tests.returnForCorrection')}</AppButton></span></Tooltip>
                    )}
                    {canSectionReview && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.qcReview')}><span><AppButton size="small" variant="secondary" onClick={() => { setQcTest(t); setQcStatus('PASSED'); setQcNotes(''); }}>{i18nT('food.foodLab.sampleDetail.tests.qcReview')}</AppButton></span></Tooltip>
                    )}
                    {canSectionApprove && t.status === 'REVIEWED' && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.actions.approveTest')}><span><AppButton size="small" onClick={() => submitApproveTest(t)}>{i18nT('food.foodLab.sampleDetail.actions.approveTest')}</AppButton></span></Tooltip>
                    )}
                    {canAnalyze && t.status === 'APPROVED' && (
                      <Tooltip title={i18nT('food.foodLab.sampleDetail.tests.requestCorrection')}><span><AppButton size="small" variant="secondary" onClick={() => { setReviseTest(t); setReviseReason(''); }}>{i18nT('food.foodLab.sampleDetail.tests.requestCorrection')}</AppButton></span></Tooltip>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* {i18nT('food.foodLab.sampleDetail.sections.custody')} */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{i18nT('food.foodLab.sampleDetail.sections.custody')} ({sample.custody.length})</Typography>
          {sample.custody.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{i18nT('food.foodLab.sampleDetail.custody.noEvents')}</Typography>
          ) : (
            <Stack spacing={1}>
              {[...sample.custody].reverse().map((e, idx) => (
                <CustodyEvent key={e.id} event={e} isFirst={idx === 0} onAck={async () => { await run(() => acknowledgeCustody(e.id), i18nT('food.foodLab.sampleDetail.custody.ackSuccess')); }} />
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <AppButton variant="ghost" onClick={onClose}>{i18nT('food.foodLab.sampleDetail.common.close')}</AppButton>
      </DialogActions>

      {/* {i18nT('food.foodLab.sampleDetail.sections.coordinate')} */}
      <FormDialog
        open={Boolean(action) || Boolean(action === 'assignSection')}
        onClose={() => setAction(null)}
        onSubmit={runActionSubmit}
        title={action ? i18nT(WORKFLOW_ACTIONS[action].labelKey) : ''}
        maxWidth="xs"
      >
        {action === 'coordinate' && (
          <>
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.coordinate.label')} requiredMark value={selUser} onChange={setSelUser} options={userOptions} />
            <Typography variant="caption" color="text.secondary">{i18nT(WORKFLOW_ACTIONS.coordinate.hintKey)}</Typography>
          </>
        )}
        {action === 'assignSection' && (
          <>
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.assignSection.label')} value={selBench} onChange={setSelBench} options={Object.entries(labBench).map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.assignSection.head')} value={selUser} onChange={setSelUser} placeholder={i18nT('food.foodLab.sampleDetail.dialogs.assignSection.headPlaceholder')} options={userOptions} />
          </>
        )}
        {action === 'assignAnalyst' && (
          <>
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.assignAnalyst.label')} requiredMark value={selUser} onChange={setSelUser} options={userOptions} />
            <Typography variant="caption" color="text.secondary">{i18nT(WORKFLOW_ACTIONS.assignAnalyst.hintKey)}</Typography>
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.sections.setParams')} */}
      <FormDialog open={paramsOpen} onClose={() => setParamsOpen(false)} onSubmit={submitParams} title={i18nT('food.foodLab.sampleDetail.dialogs.setParams.title')} maxWidth="sm">
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

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.transfer.manual')} */}
      <FormDialog open={transferOpen} onClose={() => setTransferOpen(false)} onSubmit={submitTransfer} title={i18nT('food.foodLab.sampleDetail.dialogs.transfer.manualTitle')} subtitle={i18nT('food.foodLab.sampleDetail.dialogs.transfer.subtitle')} maxWidth="sm">
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.transfer.from')} requiredMark value={tfFrom} onChange={(e) => setTfFrom(e.target.value)} />
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.transfer.to')} requiredMark value={tfTo} onChange={(e) => setTfTo(e.target.value)} />
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.transfer.condition')} value={tfCond} onChange={(e) => setTfCond(e.target.value)} />
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.transfer.seal')} value={tfSeal} onChange={(e) => setTfSeal(e.target.value)} />
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.transfer.notes')} multiline minRows={2} value={tfRemarks} onChange={(e) => setTfRemarks(e.target.value)} />
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.enterResult')} */}
      <Dialog open={Boolean(resultTest)} onClose={() => setResultTest(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{i18nT('food.foodLab.sampleDetail.dialogs.enterResultTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          {resultTest && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{resultTest.parameter.name_ar} {resultTest.parameter.unit ? `(${resultTest.parameter.unit})` : ''}</Typography>
              <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.value')} value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder={resultTest.unit || i18nT('food.foodLab.sampleDetail.dialogs.enterResult.numericValue')} />
              <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.method')} value={resultMethod} onChange={(e) => setResultMethod(e.target.value)} placeholder={resultTest.parameter.method || i18nT('food.foodLab.sampleDetail.dialogs.enterResult.defaultMethod')} />
              <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.device')} value={resultDevice} onChange={(e) => setResultDevice(e.target.value)} placeholder={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.device')} />
              <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.reagent')} value={resultReagent} onChange={(e) => setResultReagent(e.target.value)} placeholder={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.reagentBatch')} />
              <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.decision')} value={resultDecision} onChange={setResultDecision} options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
              <Typography variant="caption" color="text.secondary">{i18nT('food.foodLab.sampleDetail.dialogs.enterResult.hint')}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <AppButton variant="ghost" onClick={() => setResultTest(null)} disabled={loading}>{i18nT('food.foodLab.sampleDetail.common.cancel')}</AppButton>
          <AppButton variant="secondary" onClick={submitResultDraft} disabled={loading}>{i18nT('food.foodLab.sampleDetail.tests.saveDraft')}</AppButton>
          <AppButton onClick={submitResult} disabled={loading}>{i18nT('food.foodLab.sampleDetail.tests.submit')}</AppButton>
        </DialogActions>
      </Dialog>

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.review.title')} */}
      <FormDialog open={Boolean(reviewTest)} onClose={() => setReviewTest(null)} onSubmit={submitReview} title={i18nT('food.foodLab.sampleDetail.dialogs.review.title')} subtitle={i18nT('food.foodLab.sampleDetail.dialogs.review.subtitle')} maxWidth="xs" submitLabel={i18nT('food.foodLab.sampleDetail.dialogs.review.submit')}>
        {reviewTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{reviewTest.parameter.name_ar}</Typography>
            <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.value')} value={reviewTest.result_value != null ? String(reviewTest.result_value) : '—'} disabled />
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.enterResult.decision')} value={reviewTest.decision} onChange={(v) => setReviewTest((t) => (t ? { ...t, decision: v } : t))} options={Object.entries(labDecision).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.review.notes')} multiline minRows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.revise.title')} */}
      <FormDialog open={Boolean(reviseTest)} onClose={() => setReviseTest(null)} onSubmit={submitRevise} title={i18nT('food.foodLab.sampleDetail.dialogs.revise.title')} subtitle={i18nT('food.foodLab.sampleDetail.dialogs.revise.subtitle')} maxWidth="xs" submitLabel={i18nT('food.foodLab.sampleDetail.dialogs.revise.submit')}>
        {reviseTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{reviseTest.parameter.name_ar} — {i18nT('food.foodLab.sampleDetail.tests.revision', { version: reviseTest.version })}</Typography>
            <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.revise.reason')} requiredMark multiline minRows={2} value={reviseReason} onChange={(e) => setReviseReason(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.return.title')} */}
      <FormDialog open={Boolean(returnTest)} onClose={() => setReturnTest(null)} onSubmit={submitReturn} title={i18nT('food.foodLab.sampleDetail.dialogs.return.title')} subtitle={i18nT('food.foodLab.sampleDetail.dialogs.return.subtitle')} maxWidth="xs" submitLabel={i18nT('food.foodLab.sampleDetail.dialogs.return.submit')}>
        {returnTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{returnTest.parameter.name_ar}</Typography>
            <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.return.reason')} requiredMark multiline minRows={2} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder={i18nT('food.foodLab.sampleDetail.dialogs.return.placeholder')} />
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.dialogs.qc.title')} */}
      <FormDialog open={Boolean(qcTest)} onClose={() => setQcTest(null)} onSubmit={submitQc} title={i18nT('food.foodLab.sampleDetail.dialogs.qc.title')} subtitle={i18nT('food.foodLab.sampleDetail.dialogs.qc.subtitle')} maxWidth="xs" submitLabel={i18nT('food.foodLab.sampleDetail.dialogs.qc.submit')}>
        {qcTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{qcTest.parameter.name_ar}</Typography>
            <FormSelect label={i18nT('food.foodLab.sampleDetail.dialogs.qc.result')} value={qcStatus} onChange={setQcStatus} options={Object.entries(labQc).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: m.label }))} />
            <FormTextField label={i18nT('food.foodLab.sampleDetail.dialogs.qc.notes')} multiline minRows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.reception.title')} */}
      <FormDialog open={receptionOpen} onClose={() => setReceptionOpen(false)} onSubmit={submitReception} title={receptionDecision === 'accept' ? i18nT('food.foodLab.sampleDetail.reception.accept') : receptionDecision === 'conditional' ? i18nT('food.foodLab.sampleDetail.reception.conditional') : i18nT('food.foodLab.sampleDetail.reception.reject')} subtitle={i18nT('food.foodLab.sampleDetail.reception.subtitle')} maxWidth="xs" submitLabel={i18nT('food.foodLab.sampleDetail.reception.submit')}>
        <FormTextField label={i18nT('food.foodLab.sampleDetail.reception.notes')} multiline minRows={2} value={receptionNote} onChange={(e) => setReceptionNote(e.target.value)} />
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.invoice.title')} */}
      <FormDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} onSubmit={submitInvoice} title={i18nT('food.foodLab.sampleDetail.invoice.title')} maxWidth="sm" submitLabel={invoiceAction === 'generate' ? i18nT('food.foodLab.sampleDetail.invoice.generateBtn') : invoiceAction === 'pay' ? i18nT('food.foodLab.sampleDetail.invoice.payBtn') : i18nT('food.foodLab.sampleDetail.invoice.exemptBtn')}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <AppButton size="small" variant={invoiceAction === 'generate' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('generate'); setInvoiceNote(''); }}>{i18nT('food.foodLab.sampleDetail.invoice.generateBtn')}</AppButton>
          {sample.lab_invoice && LAB_INVOICE_PENDING.has(sample.lab_invoice.status) && (
            <>
              <AppButton size="small" variant={invoiceAction === 'pay' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('pay'); setInvoiceNote(''); }}>{i18nT('food.foodLab.sampleDetail.invoice.payBtn')}</AppButton>
              <AppButton size="small" variant={invoiceAction === 'exempt' ? 'primary' : 'secondary'} onClick={() => { setInvoiceAction('exempt'); setInvoiceNote(''); }}>{i18nT('food.foodLab.sampleDetail.invoice.exemptBtn')}</AppButton>
            </>
          )}
        </Stack>
        {invoiceAction === 'generate' && (
          <>
            <Typography variant="body2" color="text.secondary">{i18nT('food.foodLab.sampleDetail.invoice.hint')}</Typography>
            {sample.lab_invoice && !LAB_INVOICE_PENDING.has(sample.lab_invoice.status) && (
              <Typography variant="body2" color="warning.main">{i18nT('food.foodLab.sampleDetail.invoice.previousInvoice', { number: sample.lab_invoice.invoice_number })}</Typography>
            )}
          </>
        )}
        {invoiceAction === 'pay' && (
          <>
            <InvoiceSummary invoice={sample.lab_invoice} />
            <FormTextField label={i18nT('food.foodLab.sampleDetail.invoice.reference')} value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} placeholder={i18nT('food.foodLab.sampleDetail.invoice.referencePlaceholder')} />
          </>
        )}
        {invoiceAction === 'exempt' && (
          <>
            <InvoiceSummary invoice={sample.lab_invoice} />
            <FormTextField label={i18nT('food.foodLab.sampleDetail.invoice.exemptReason')} value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} placeholder={i18nT('food.foodLab.sampleDetail.invoice.exemptPlaceholder')} />
          </>
        )}
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.dispatch.title')} */}
      <FormDialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} onSubmit={submitDispatch} title={i18nT('food.foodLab.sampleDetail.dispatch.title')} maxWidth="sm">
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dispatch.to')} requiredMark value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)} />
        <FormTextField label={i18nT('food.foodLab.sampleDetail.dispatch.notes')} multiline minRows={2} value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} />
      </FormDialog>

      {/* {i18nT('food.foodLab.sampleDetail.tests.microEval')} */}
      <MicroEvaluationDialog open={Boolean(microEvalTest)} test={microEvalTest} onClose={() => setMicroEvalTest(null)} onChanged={load} />

      {/* {i18nT('food.foodLab.sampleDetail.barcode.title')} */}
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
  const { t } = useTranslation();
  const [printData, setPrintData] = useState<FinanceReceiptPrint | null>(null);
  if (!invoice) {
    return <Typography variant="body2" color="text.secondary">{t('food.foodLab.invoiceSummary.noInvoice')}</Typography>;
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
          <Tooltip title={t('food.foodLab.invoiceSummary.printReceipt')}>
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
        {t('food.foodLab.invoiceSummary.total')}: {invoice.total_amount} {invoice.currency}
        {invoice.receipt_number ? ` • ${t('food.foodLab.invoiceSummary.receipt')}: ${invoice.receipt_number}` : ''}
        {invoice.exemption_reason ? ` • ${t('food.foodLab.invoiceSummary.exemption')}: ${invoice.exemption_reason}` : ''}
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
  const { t } = useTranslation();
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
      {rejected && <Chip size="small" color="error" label={t('food.foodLab.flowStepper.rejected')} icon={<CircleIcon sx={{ fontSize: 12 }} />} />}
    </Stack>
  );
};

const CustodyEvent = ({ event, isFirst, onAck }: { event: ChainOfCustody; isFirst: boolean; onAck: () => void }) => {
  const { t } = useTranslation();
  return (
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
          {t('food.foodLab.custodyEvent.labels.transfer')}: {event.transferred_by_name ?? '—'} • {formatDateTime(event.transferred_at)}
          {event.condition ? ` • ${t('food.foodLab.custodyEvent.labels.condition')}: ${event.condition}` : ''}
          {event.seal_number ? ` • ${t('food.foodLab.custodyEvent.labels.seal')}: ${event.seal_number}` : ''}
        </Typography>
        {event.received_by_name && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('food.foodLab.custodyEvent.labels.received')}: {event.received_by_name} • {formatDateTime(event.received_at)}
          </Typography>
        )}
        {event.remarks && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('food.foodLab.custodyEvent.labels.notes')}: {event.remarks}</Typography>}
      </Box>
      {event.is_received ? (
        <StatusChip label={t('food.foodLab.custodyEvent.labels.receivedStatus')} tone="success" />
      ) : (
        <AppButton size="small" variant="ghost" onClick={onAck}>{t('food.foodLab.custodyEvent.actions.confirmReceipt')}</AppButton>
      )}
    </Stack>
  </Box>
  );
};

export default FoodLabPage;