import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import BiotechIcon from '@mui/icons-material/Biotech';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PrintIcon from '@mui/icons-material/Print';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import PrintReceiptDialog from '../../components/finance/PrintReceiptDialog';
import { reportReceiptToPrintData } from '../../utils/financeAdapters';
import type { FinanceReceiptPrint } from '../../types/finance';
import { DataTable, StatusChip, FormDialog } from '../../components/uikit';
import { foodFinalDecision, messageType, samplingReason, shipmentStatus, shipmentType } from '../../utils/status';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import {
  assignInspector, createShipment, createSample, decideShipment, getAccountingReport,
  getShipments, getSamplingPolicies, getExportForm, inspectShipment, payInvoice, reviewShipment,
  submitShipment, toDecision,
} from '../../api/endpoints/food';
import { ExportInspectionFormView } from './ExportInspectionForm';
import { getUsers } from '../../api/endpoints/users';
import { getPorts } from '../../api/endpoints/public';
import type { AccountingSummaryReport, ExportInspectionForm as ExportFormData, FoodOrderItem, FoodShipment, SamplingPolicy } from '../../types/food';
import type { User } from '../../types/user';
import type { PublicPort } from '../../api/endpoints/public';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useTranslation } from 'react-i18next';

const statusMeta = shipmentStatus;
const decisionMeta = foodFinalDecision;
const messageOptions = Object.entries(messageType).map(([v, m]) => ({ value: v, label: m.label }));
const samplingReasonOptions = Object.entries(samplingReason).map(([v, m]) => ({ value: v, label: m.label }));

const todayArabic = (locale: string) => new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatNumber = (value: number): string => {
  if (Number.isNaN(value)) return '0';
  return value.toLocaleString('en-US');
};

const getSections = (t: (key: string) => string) => [
  { id: 'clerk', label: t('food.ops.sections.clerk'), icon: <Inventory2Icon fontSize="small" /> },
  { id: 'accountant', label: t('food.ops.sections.accountant'), icon: <PaymentsIcon fontSize="small" /> },
  { id: 'inspector', label: t('food.ops.sections.inspector'), icon: <FactCheckIcon fontSize="small" /> },
  { id: 'manager', label: t('food.ops.sections.manager'), icon: <GavelIcon fontSize="small" /> },
  { id: 'export-form', label: t('food.ops.sections.exportForm'), icon: <AssignmentOutlinedIcon fontSize="small" /> },
] as const;

const emptyItem = (): FoodOrderItem => ({
  id: '', product_name: '', brand: '', origin: '', weight_kg: 0, package_count: 0, package_type: '',
});

const FoodOpsPage = () => {
  const { t, i18n } = useTranslation();
  const SECTIONS = getSections(t);
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  return (
    <Box>
      <DashboardHero
        eyebrow={t('food.ops.hero.eyebrow')}
        title={t('food.ops.hero.title')}
        subtitle={t('food.ops.hero.subtitle')}
        gradient="emerald"
        avatarLabel={t('food.ops.hero.avatar')}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic(i18n.language === 'ar' ? 'ar' : 'en')}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('food.ops.hero.live')}
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
            label={t('food.ops.clerk.sections')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box component="section" ref={register('clerk')} data-section="clerk" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ClerkPanel />
          </Box>
          <Box component="section" ref={register('accountant')} data-section="accountant" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <AccountantPanel />
          </Box>
          <Box component="section" ref={register('inspector')} data-section="inspector" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <InspectorPanel />
          </Box>
          <Box component="section" ref={register('manager')} data-section="manager" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ManagerPanel />
          </Box>
          <Box component="section" ref={register('export-form')} data-section="export-form" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <ExportFormPanel />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

const ClerkPanel = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [policy, setPolicy] = useState<SamplingPolicy | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({
    manifest_number: '', port: '', supplier_name: '', origin_country: '', arrival_date: '',
    shipment_type: 'IMPORT', customs_number: '', certificate_no: '', vessel_name: '',
    clearing_agent: '', message_type: 'COMMERCIAL', loading_port: '', bill_of_lading: '',
  });
  const [items, setItems] = useState<FoodOrderItem[]>([emptyItem()]);
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getShipments({ page_size: 100, ordering: '-created_at' })
      .then((r) => setShipments(r.data.data.results))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getPorts().then((r) => setPorts(r.data.data)).catch(() => undefined);
    getSamplingPolicies({ is_active: true }).then((r) => {
      const list = r.data.data.results;
      setPolicy(list.find((p) => p.scope === 'IMPORT') || list[0] || null);
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const editItem = (idx: number, key: keyof Omit<FoodOrderItem, 'id'>, value: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    setItems(next);
  };

  const totalWeight = items.reduce((sum, i) => sum + Number(i.weight_kg || 0), 0);

  const handleCreate = async () => {
    if (!form.manifest_number || !form.port || !form.supplier_name) { notifyError(t('food.ops.clerk.completeFields')); return; }
    setBusy(true);
    try {
      const validItems = items.filter((i) => i.product_name.trim() && Number(i.weight_kg || 0) > 0);
      const created = await createShipment({ ...form, items: validItems });
      const id = created.data.data.id;
      await submitShipment(id, validItems);
      notifySuccess(t('food.ops.notify.requestRegistered'));
      setOpen(false);
      setForm({ manifest_number: '', port: '', supplier_name: '', origin_country: '', arrival_date: '', shipment_type: 'IMPORT', customs_number: '', certificate_no: '', vessel_name: '', clearing_agent: '', message_type: 'COMMERCIAL', loading_port: '', bill_of_lading: '' });
      setItems([emptyItem()]);
      load();
    } catch {
      notifyError(t('food.ops.notify.requestRegisterFailed'));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: t('food.ops.table.manifestNumber'), render: (s: FoodShipment) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.manifest_number}</Typography> },
    { key: 'supplier_name', label: t('food.ops.table.supplier'), render: (s: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{s.supplier_name}</Typography> },
    { key: 'origin_country', label: t('food.ops.table.origin'), hideOnMobile: true },
    { key: 'shipment_type', label: t('food.ops.table.type'), render: (s: FoodShipment) => { const m = shipmentType[s.shipment_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.shipment_type; } },
    { key: 'message_type', label: t('food.ops.table.message'), render: (s: FoodShipment) => { const m = messageType[s.message_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : '—'; } },
    { key: 'total_weight_kg', label: t('food.ops.table.weight'), render: (s: FoodShipment) => formatNumber(Number(s.total_weight_kg)) },
    { key: 'samples_required', label: t('food.ops.table.samples'), render: (s: FoodShipment) => s.samples_required },
    { key: 'arrival_date', label: t('food.ops.table.arrival'), render: (s: FoodShipment) => formatDate(s.arrival_date), hideOnMobile: true },
    { key: 'status', label: t('food.ops.table.status'), render: (s: FoodShipment) => { const m = statusMeta[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.status; } },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <KpiCard label={t('food.ops.kpi.totalRequests')} value={shipments.length} icon={<Inventory2Icon />} />
        <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => setOpen(true)}>
          t('food.ops.clerk.newRequest')
        </Button>
      </Stack>

      <DataTable
        columns={columns}
        rows={shipments}
        rowKey={(r) => r.id}
        count={shipments.length}
        page={0}
        rowsPerPage={10}
        pageSizeOptions={[10, 25, 50]}
        loading={loading}
        title={t('food.ops.table.title')}
        onPageChange={() => undefined}
        onRowsPerPageChange={() => undefined}
        emptyTitle={t('food.ops.empty.noRequests')}
        emptyDescription={t('food.ops.empty.registerFirst')}
      />

      <FormDialog
        open={open}
        title={t('food.ops.clerk.title')}
        subtitle={t('food.ops.clerk.subtitle')}
        icon={<Inventory2Icon />}
        maxWidth="md"
        onSubmit={handleCreate}
        loading={busy}
        onClose={() => !busy && setOpen(false)}
      >
        <Grid container spacing={1.5}>
          {[
            { k: 'manifest_number', l: t('food.ops.clerk.manifestNumber'), t: 'text', req: true },
            { k: 'supplier_name', l: t('food.ops.clerk.supplierName'), t: 'text', req: true },
            { k: 'origin_country', l: t('food.ops.clerk.originCountry'), t: 'text', req: true },
            { k: 'arrival_date', l: t('food.ops.clerk.arrivalDate'), t: 'date', req: true },
            { k: 'customs_number', l: t('food.ops.clerk.customsNumber'), t: 'text' },
            { k: 'certificate_no', l: t('food.ops.clerk.certificateNo'), t: 'text' },
            { k: 'vessel_name', l: t('food.ops.clerk.vesselName'), t: 'text' },
            { k: 'clearing_agent', l: t('food.ops.clerk.clearingAgent'), t: 'text' },
            { k: 'loading_port', l: t('food.ops.clerk.loadingPort'), t: 'text' },
            { k: 'bill_of_lading', l: t('food.ops.clerk.billOfLading'), t: 'text' },
          ].map((f) => (
            <Grid item xs={12} sm={6} key={f.k as string}>
              <TextField
                label={(f.l as string) + (f.req ? ' *' : '')}
                type={f.t as string}
                value={form[f.k as string] || ''}
                onChange={(e) => setField(f.k as string, e.target.value)}
                fullWidth
                size="small"
                required={Boolean(f.req)}
              />
            </Grid>
          ))}
          <Grid item xs={12} sm={6}>
            <TextField select label={t('food.ops.clerk.port')} value={form.port || ''} onChange={(e) => setField('port', e.target.value)} fullWidth size="small" required>
              {ports.map((p) => (
                <MenuItem key={p.id} value={p.code}>{p.name_ar} ({p.code})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label={t('food.ops.clerk.messageType')} value={form.message_type || 'COMMERCIAL'} onChange={(e) => setField('message_type', e.target.value)} fullWidth size="small">
              {messageOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
          t('food.ops.clerk.items')
        </Typography>
        <Stack spacing={1}>
          {items.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField label={t('food.ops.clerk.itemName')} value={item.product_name} onChange={(e) => editItem(idx, 'product_name', e.target.value)} size="small" sx={{ flex: 2 }} />
              <TextField label={t('food.ops.clerk.brand')} value={item.brand} onChange={(e) => editItem(idx, 'brand', e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label={t('food.ops.clerk.origin')} value={item.origin} onChange={(e) => editItem(idx, 'origin', e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label={t('food.ops.clerk.weightKg')} type="number" value={item.weight_kg} onChange={(e) => editItem(idx, 'weight_kg', e.target.value)} size="small" sx={{ width: 110 }} />
              <TextField label={t('food.ops.clerk.packages')} type="number" value={item.package_count} onChange={(e) => editItem(idx, 'package_count', e.target.value)} size="small" sx={{ width: 90 }} />
              <TextField label={t('food.ops.clerk.packageType')} value={item.package_type} onChange={(e) => editItem(idx, 'package_type', e.target.value)} size="small" sx={{ flex: 1 }} />
              <IconButton aria-label={t('food.ops.clerk.delete')} onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}><Tooltip title={t('food.ops.clerk.delete')}><DeleteIcon fontSize="small" /></Tooltip></IconButton>
            </Stack>
          ))}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button size="small" variant="text" onClick={() => setItems((prev) => [...prev, emptyItem()])}>+ t('food.ops.clerk.addItem')</Button>
            <Typography variant="body2" color="text.secondary">t('food.ops.clerk.totalWeight'){formatNumber(totalWeight)} كغ</Typography>
          </Stack>
        </Stack>

        {policy && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {t('food.ops.clerk.samplingPolicy')}: {policy.name_ar} — {t('food.ops.clerk.samplesAuto')}
          </Typography>
        )}
      </FormDialog>
    </Box>
  );
};

const AccountantPanel = () => {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [report, setReport] = useState<AccountingSummaryReport | null>(null);
  const [period, setPeriod] = useState('day');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState<FinanceReceiptPrint | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getShipments({ status: 'FEES_DUE', ordering: '-created_at' })
      .then((r) => setShipments(r.data.data.results))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const loadReport = useCallback(() => {
    getAccountingReport(period).then((r) => setReport(r.data.data)).catch(() => undefined);
  }, [period]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReport();
  }, [period, loadReport]);

  const handlePay = async (id: string) => {
    setBusy(true);
    try {
      await payInvoice(id, { payment_reference: `REF-${Date.now()}` });
      notifySuccess(t('food.ops.notify.feeCollected'));
      load();
      loadReport();
    } catch {
      notifyError(t('food.ops.notify.paymentFailed'));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: t('food.ops.table.manifestNumber'), render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: t('food.ops.table.supplier'), render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'samples_required', label: t('food.ops.table.samples') },
    { key: 'total_weight_kg', label: t('food.ops.table.weight'), render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'fee_preview', label: t('food.ops.table.feesDue'), render: (r: FoodShipment) => formatNumber(Number(r.fee_preview?.total || 0)) },
    { key: 'actions', label: t('food.ops.table.action'), render: (r: FoodShipment) => (
      <Button size="small" variant="contained" color="success" startIcon={<PaymentsIcon />} disabled={busy} onClick={() => handlePay(r.id)}>
        {t('food.ops.accountant.collect')}

      </Button>
    ) },
  ];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Stack spacing={2}>
          <KpiCard label={t('food.ops.kpi.receiptsToday')} value={report?.paid_count ?? 0} icon={<ReceiptIcon />} />
          <KpiCard label={t('food.ops.kpi.totalCollected')} value={formatNumber(Number(report?.total_collected || 0))} icon={<PaymentsIcon />} />
          <KpiCard label={t('food.ops.kpi.pendingCollection')} value={report?.pending_count ?? shipments.length} icon={<Inventory2Icon />} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('food.ops.report.title')}</Typography>
              <TextField select value={period} onChange={(e) => setPeriod(e.target.value)} size="small" sx={{ width: 140 }}>
                <MenuItem value="day">{t('food.ops.period.day')}</MenuItem>
                <MenuItem value="week">{t('food.ops.period.week')}</MenuItem>
                <MenuItem value="month">{t('food.ops.period.month')}</MenuItem>
              </TextField>
            </Stack>
            {(report?.receipts || []).length > 0 ? (
              <Stack spacing={1}>
                {report!.receipts.map((r) => (
                  <Stack key={r.receipt_number} direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                    <Typography sx={{ fontFamily: 'monospace' }}>{r.receipt_number}</Typography>
                    <Typography sx={{ fontFamily: 'monospace' }}>{r.manifest}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{formatNumber(Number(r.amount))}</Typography>
                    <Typography color="text.secondary" variant="body2">{r.paid_by || '—'}</Typography>
                    <Tooltip title={t('food.ops.report.print')}>
                      <IconButton size="small" onClick={() => setPrintData(reportReceiptToPrintData(r))} aria-label={t('food.ops.report.print')}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">t('food.ops.empty.noMovement')</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <DataTable
          columns={columns}
          rows={shipments}
          rowKey={(r) => r.id}
          count={shipments.length}
          page={1}
          rowsPerPage={10}
          pageSizeOptions={[10, 25]}
          loading={loading}
          title={t('food.ops.accountant.pendingTitle')}
          emptyTitle={t('food.ops.empty.noRequests')}
          emptyDescription={t('food.ops.accountant.pendingDesc')}
        />
      </Grid>
      <PrintReceiptDialog
        open={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </Grid>
  );
};

const InspectorPanel = () => {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<FoodShipment | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({
    decision: 'NEEDS_ANALYSIS', production_date: '', expiry_date: '', temperature: '',
    container_condition: '', container_status: '', batch_number: '', package_condition: '',
    damaged_count: 0, sound_count: 0, damaged_weight: 0, sound_weight: 0, notes: '',
  });
  const [sample, setSample] = useState({ sample_type: '', sampling_reason: 'ROUTINE', bench: 'MICROBIOLOGY' });
  const [inspectorId, setInspectorId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getShipments({ status__in: 'AWAITING_INSPECTION,UNDER_INSPECTION', ordering: '-created_at' })
      .then((r) => setShipments(r.data.data.results))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getUsers({ page_size: 50 }).then((r) => setUsers(r.data.data.results)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAssign = async (id: string) => {
    if (!inspectorId) { notifyError(t('food.ops.notify.selectInspector')); return; }
    setBusy(true);
    try {
      await toDecision(id); // placeholder to keep flow: assign then inspect
      await assignInspector(id, inspectorId);
      notifySuccess(t('food.ops.notify.inspectorAssigned'));
      load();
    } catch { notifyError(t('food.ops.notify.assignFailed')); } finally { setBusy(false); }
  };

  const handleInspect = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      await inspectShipment(sel.id, { ...form });
      notifySuccess(t('food.ops.notify.inspectionRegistered'));
      setInspectOpen(false);
      load();
    } catch { notifyError(t('food.ops.notify.inspectionSaveFailed')); } finally { setBusy(false); }
  };

  const handleSample = async () => {
    if (!sel) return;
    if (!sample.sample_type) { notifyError(t('food.ops.notify.selectSampleType')); return; }
    setBusy(true);
    try {
      await createSample(sel.id, { ...sample });
      notifySuccess(t('food.ops.notify.sampleSent'));
      setSampleOpen(false);
      load();
    } catch { notifyError(t('food.ops.notify.sampleRegisterFailed')); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'manifest_number', label: t('food.ops.table.manifestNumber'), render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: t('food.ops.table.supplier'), render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'total_weight_kg', label: t('food.ops.table.weight'), render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: t('food.ops.table.samples') },
    { key: 'assigned_inspector_name', label: t('food.ops.table.inspector') },
    { key: 'status', label: t('food.ops.table.status'), render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={() => { setSel(r); setInspectOpen(true); }}>
          t('food.ops.inspector.inspect')
        </Button>
        <Button size="small" variant="contained" color="info" startIcon={<BiotechIcon />} onClick={() => { setSel(r); setSampleOpen(true); }}>
          t('food.ops.inspector.sample')
        </Button>
        <Button size="small" variant="text" color="primary" startIcon={<PersonSearchIcon />} onClick={() => { setSel(r); handleAssign(r.id); }}>
          t('food.ops.inspector.assign')
        </Button>
      </Stack>
    ) },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <TextField select label={t('food.ops.inspector.assignInspector')} value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} size="small" sx={{ width: 260 }}>
          <MenuItem value=""><em>{t('food.ops.inspector.selectInspector')}</em></MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={shipments}
        rowKey={(r) => r.id}
        count={shipments.length}
        page={1}
        rowsPerPage={10}
        pageSizeOptions={[10, 25]}
        loading={loading}
        title={t('food.ops.inspector.pendingTitle')}
        emptyTitle={t('food.ops.empty.none')}
        emptyDescription="t('food.ops.empty.noInspection')"
      />

      <FormDialog
        open={inspectOpen}
        title={t('food.ops.inspector.reportsTitle')}
        subtitle={t('food.ops.inspector.reportsSubtitle')}
        icon={<FactCheckIcon />}
        maxWidth="md"
        onSubmit={handleInspect}
        loading={busy}
        onClose={() => !busy && setInspectOpen(false)}
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.productionDate')} type="date" value={form.production_date || ''} onChange={(e) => setField('production_date', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.expiryDate')} type="date" value={form.expiry_date || ''} onChange={(e) => setField('expiry_date', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.temperature')} type="number" value={form.temperature || ''} onChange={(e) => setField('temperature', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.batchNumber')} value={form.batch_number || ''} onChange={(e) => setField('batch_number', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.containerCondition')} value={form.container_condition || ''} onChange={(e) => setField('container_condition', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.containerStatus')} value={form.container_status || ''} onChange={(e) => setField('container_status', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label={t('food.ops.inspection.packageCondition')} value={form.package_condition || ''} onChange={(e) => setField('package_condition', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label={t('food.ops.inspection.damagedPackages')} type="number" value={form.damaged_count || 0} onChange={(e) => setField('damaged_count', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label={t('food.ops.inspection.soundPackages')} type="number" value={form.sound_count || 0} onChange={(e) => setField('sound_count', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label={t('food.ops.inspection.damagedWeight')} type="number" value={form.damaged_weight || 0} onChange={(e) => setField('damaged_weight', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label={t('food.ops.inspection.soundWeight')} type="number" value={form.sound_weight || 0} onChange={(e) => setField('sound_weight', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12}><TextField label={t('food.ops.inspection.notes')} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} fullWidth size="small" multiline minRows={2} /></Grid>
        </Grid>
      </FormDialog>

      <FormDialog
        open={sampleOpen}
        title={t('food.ops.sampling.title')}
        subtitle={t('food.ops.sampling.subtitle')}
        icon={<BiotechIcon />}
        onSubmit={handleSample}
        loading={busy}
        submitDisabled={!sample.sample_type}
        onClose={() => !busy && setSampleOpen(false)}
      >
        <Stack spacing={1.5}>
          <TextField label={t('food.ops.sampling.sampleType')} value={sample.sample_type} onChange={(e) => setSample({ ...sample, sample_type: e.target.value })} fullWidth size="small" />
          <TextField select label={t('food.ops.sampling.reason')} value={sample.sampling_reason} onChange={(e) => setSample({ ...sample, sampling_reason: e.target.value })} fullWidth size="small">
            {samplingReasonOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label={t('food.ops.sampling.bench')} value={sample.bench} onChange={(e) => setSample({ ...sample, bench: e.target.value })} fullWidth size="small">
            <MenuItem value="MICROBIOLOGY">{t('food.ops.bench.microbiology')}</MenuItem>
            <MenuItem value="CHEMISTRY">{t('food.ops.bench.chemistry')}</MenuItem>
            <MenuItem value="TOXICOLOGY">{t('food.ops.bench.toxicology')}</MenuItem>
            <MenuItem value="MOLECULAR">{t('food.ops.bench.molecular')}</MenuItem>
          </TextField>
        </Stack>
      </FormDialog>
    </Box>
  );
};

const ManagerPanel = () => {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<FoodShipment | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [decideOpen, setDecideOpen] = useState(false);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [inspectorId, setInspectorId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getShipments({ status__in: 'AWAITING_DECISION,FEES_DUE,AWAITING_LAB_RESULTS', ordering: '-created_at' })
      .then((r) => setShipments(r.data.data.results))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getUsers({ page_size: 50 }).then((r) => setUsers(r.data.data.results)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async () => {
    if (!sel || !inspectorId) { notifyError(t('food.ops.notify.selectInspector')); return; }
    setBusy(true);
    try { await assignInspector(sel.id, inspectorId); notifySuccess(t('food.ops.notify.assigned')); setAssignOpen(false); load(); }
    catch { notifyError(t('food.ops.notify.assignFailed')); } finally { setBusy(false); }
  };

  const handleReview = async (id: string) => {
    setBusy(true);
    try { await reviewShipment(id, 'APPROVE'); notifySuccess(t('food.ops.notify.reviewApproved')); load(); }
    catch { notifyError(t('food.ops.notify.reviewFailed')); } finally { setBusy(false); }
  };

  const handleDecide = async () => {
    if (!sel || !decision) { notifyError(t('food.ops.notify.selectDecision')); return; }
    setBusy(true);
    try { await decideShipment(sel.id, decision, reason); notifySuccess(t('food.ops.notify.decisionIssued')); setDecideOpen(false); load(); }
    catch { notifyError(t('food.ops.notify.decisionFailed')); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'manifest_number', label: t('food.ops.table.manifestNumber'), render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: t('food.ops.table.supplier'), render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'total_weight_kg', label: t('food.ops.table.weight'), render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: t('food.ops.table.samples') },
    { key: 'status', label: t('food.ops.table.status'), render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'final_decision', label: t('food.ops.table.decision'), render: (r: FoodShipment) => { const m = decisionMeta[r.final_decision]; return r.final_decision && m ? <StatusChip label={m.label} tone={m.tone} /> : '—'; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => { setSel(r); setAssignOpen(true); }}>
          t('food.ops.manager.assignInspector')
        </Button>
        <Button size="small" variant="outlined" color="success" onClick={() => handleReview(r.id)}>t('food.ops.manager.review')</Button>
        <Button size="small" variant="contained" startIcon={<GavelIcon />} onClick={() => { setSel(r); setDecision(''); setReason(''); setDecideOpen(true); }}>
          t('food.ops.manager.finalDecision')
        </Button>
      </Stack>
    ) },
  ];

  return (
    <Box>
      <DataTable
        columns={columns}
        rows={shipments}
        rowKey={(r) => r.id}
        count={shipments.length}
        page={1}
        rowsPerPage={10}
        pageSizeOptions={[10, 25]}
        loading={loading}
        title={t('food.ops.manager.pendingTitle')}
        emptyTitle={t('food.ops.empty.none')}
      />

      <FormDialog
        open={assignOpen}
        title={`${t('food.ops.manager.assignInspector')} (${t('food.ops.manager.section')})`}
        icon={<PersonSearchIcon />}
        onSubmit={handleAssign}
        loading={busy}
        submitDisabled={!inspectorId}
        onClose={() => !busy && setAssignOpen(false)}
      >
        <TextField select label={t('food.ops.manager.inspector')} value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} fullWidth size="small">
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
        </TextField>
      </FormDialog>

      <FormDialog
        open={decideOpen}
        title={t('food.ops.manager.decisionTitle')}
        subtitle={t('food.ops.manager.decisionSubtitle')}
        icon={<GavelIcon />}
        onSubmit={handleDecide}
        loading={busy}
        submitDisabled={!decision}
        onClose={() => !busy && setDecideOpen(false)}
      >
        <Stack spacing={1.5}>
          <TextField select label={t('food.ops.manager.decisionLabel')} value={decision} onChange={(e) => setDecision(e.target.value)} fullWidth size="small">
            {Object.entries(foodFinalDecision).map(([v, m]) => <MenuItem key={v} value={v}>{m.label}</MenuItem>)}
          </TextField>
          <TextField label={t('food.ops.manager.decisionReason')} value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" multiline minRows={2} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

const ExportFormPanel = () => {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<FoodShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExportFormData | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getShipments({ shipment_type: 'EXPORT', ordering: '-created_at' })
      .then((r) => setShipments(r.data.data.results))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = async (id: string) => {
    setOpen(true);
    setForm(null);
    setLoadingForm(true);
    try {
      const res = await getExportForm(id);
      setForm(res.data.data);
    } catch {
      notifyError(t('food.ops.notify.formLoadFailed'));
    } finally {
      setLoadingForm(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: t('food.ops.table.manifestNumber'), render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: t('food.ops.table.supplier'), render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'origin_country', label: t('food.ops.table.origin'), hideOnMobile: true },
    { key: 'total_weight_kg', label: t('food.ops.table.weight'), render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: t('food.ops.table.samples') },
    { key: 'status', label: t('food.ops.table.status'), render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Button size="small" variant="contained" startIcon={<AssignmentOutlinedIcon />} onClick={() => handleOpen(r.id)}>
        t('food.ops.export.openForm')
      </Button>
    ) },
  ];

  return (
    <Box>
      <DataTable
        columns={columns}
        rows={shipments}
        rowKey={(r) => r.id}
        count={shipments.length}
        page={1}
        rowsPerPage={10}
        pageSizeOptions={[10, 25]}
        loading={loading}
        title={t('food.ops.export.title')}
        emptyTitle={t('food.ops.export.emptyTitle')}
        emptyDescription={t('food.ops.export.emptyDesc')}
      />

      <FormDialog
        open={open}
        title={t('food.ops.export.formTitle')}
        subtitle={t('food.ops.export.formSubtitle')}
        icon={<AssignmentOutlinedIcon />}
        maxWidth="lg"
        onSubmit={() => setOpen(false)}
        submitLabel={t('food.ops.export.close')}
        cancelLabel={t('food.ops.export.close')}
        onClose={() => setOpen(false)}
      >
        {loadingForm ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">t('food.ops.export.loading')</Typography></Box>
        ) : form ? (
          <ExportInspectionFormView form={form} />
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">t('food.ops.export.noData')</Typography></Box>
        )}
      </FormDialog>
    </Box>
  );
};

export default FoodOpsPage;