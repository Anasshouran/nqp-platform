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

const statusMeta = shipmentStatus;
const decisionMeta = foodFinalDecision;
const messageOptions = Object.entries(messageType).map(([v, m]) => ({ value: v, label: m.label }));
const samplingReasonOptions = Object.entries(samplingReason).map(([v, m]) => ({ value: v, label: m.label }));

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatNumber = (value: number): string => {
  if (Number.isNaN(value)) return '0';
  return value.toLocaleString('en-US');
};

const SECTIONS = [
  { id: 'clerk', label: 'الكاتب', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'accountant', label: 'المحاسب', icon: <PaymentsIcon fontSize="small" /> },
  { id: 'inspector', label: 'المفتش', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'manager', label: 'مدير القسم', icon: <GavelIcon fontSize="small" /> },
  { id: 'export-form', label: 'استمارة الكشف', icon: <AssignmentOutlinedIcon fontSize="small" /> },
] as const;

const emptyItem = (): FoodOrderItem => ({
  id: '', product_name: '', brand: '', origin: '', weight_kg: 0, package_count: 0, package_type: '',
});

const FoodOpsPage = () => {
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  return (
    <Box>
      <DashboardHero
        eyebrow="الرقابة الغذائية"
        title="عمليات رقابة الأغذية"
        subtitle="تسجيل الطلبات، تحصيل الرسوم، التفتيش وسحب العينات، وإصدار القرارات النهائية"
        gradient="emerald"
        avatarLabel="ع"
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
    if (!form.manifest_number || !form.port || !form.supplier_name) { notifyError('أكمل الحقول الأساسية'); return; }
    setBusy(true);
    try {
      const validItems = items.filter((i) => i.product_name.trim() && Number(i.weight_kg || 0) > 0);
      const created = await createShipment({ ...form, items: validItems });
      const id = created.data.data.id;
      await submitShipment(id, validItems);
      notifySuccess('تم تسجيل الطلب وإحالته لتحصيل الرسوم');
      setOpen(false);
      setForm({ manifest_number: '', port: '', supplier_name: '', origin_country: '', arrival_date: '', shipment_type: 'IMPORT', customs_number: '', certificate_no: '', vessel_name: '', clearing_agent: '', message_type: 'COMMERCIAL', loading_port: '', bill_of_lading: '' });
      setItems([emptyItem()]);
      load();
    } catch {
      notifyError('تعذر تسجيل الطلب');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: 'رقم البيان', render: (s: FoodShipment) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.manifest_number}</Typography> },
    { key: 'supplier_name', label: 'المورد', render: (s: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{s.supplier_name}</Typography> },
    { key: 'origin_country', label: 'المنشأ', hideOnMobile: true },
    { key: 'shipment_type', label: 'النوع', render: (s: FoodShipment) => { const m = shipmentType[s.shipment_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.shipment_type; } },
    { key: 'message_type', label: 'الرسالة', render: (s: FoodShipment) => { const m = messageType[s.message_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : '—'; } },
    { key: 'total_weight_kg', label: 'الوزن', render: (s: FoodShipment) => formatNumber(Number(s.total_weight_kg)) },
    { key: 'samples_required', label: 'عينات', render: (s: FoodShipment) => s.samples_required },
    { key: 'arrival_date', label: 'الوصول', render: (s: FoodShipment) => formatDate(s.arrival_date), hideOnMobile: true },
    { key: 'status', label: 'الحالة', render: (s: FoodShipment) => { const m = statusMeta[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.status; } },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <KpiCard label="إجمالي الطلبات" value={shipments.length} icon={<Inventory2Icon />} />
        <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => setOpen(true)}>
          طلب وارد جديد
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
        title="طلبات الشحنات المسجلة"
        onPageChange={() => undefined}
        onRowsPerPageChange={() => undefined}
        emptyTitle="لا توجد طلبات"
        emptyDescription="سجّل أول طلب استيراد"
      />

      <FormDialog
        open={open}
        title="تسجيل طلب وارد (الكاتب)"
        subtitle="إدخال بيانات الطلب والأصناف؛ تُحسب العينات والرسوم تلقائياً بعد الحفظ"
        icon={<Inventory2Icon />}
        maxWidth="md"
        onSubmit={handleCreate}
        loading={busy}
        onClose={() => !busy && setOpen(false)}
      >
        <Grid container spacing={1.5}>
          {[
            { k: 'manifest_number', l: 'رقم البيان', t: 'text', req: true },
            { k: 'supplier_name', l: 'اسم المورد', t: 'text', req: true },
            { k: 'origin_country', l: 'بلد المنشأ', t: 'text', req: true },
            { k: 'arrival_date', l: 'تاريخ الوصول', t: 'date', req: true },
            { k: 'customs_number', l: 'الرقم الجمركي', t: 'text' },
            { k: 'certificate_no', l: 'رقم شهادة الاعتماد', t: 'text' },
            { k: 'vessel_name', l: 'اسم الباخرة', t: 'text' },
            { k: 'clearing_agent', l: 'المخلّص الجمركي', t: 'text' },
            { k: 'loading_port', l: 'ميناء الشحن', t: 'text' },
            { k: 'bill_of_lading', l: 'رقم البوليصة', t: 'text' },
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
            <TextField select label="المنفذ" value={form.port || ''} onChange={(e) => setField('port', e.target.value)} fullWidth size="small" required>
              {ports.map((p) => (
                <MenuItem key={p.id} value={p.code}>{p.name_ar} ({p.code})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="نوع الرسالة" value={form.message_type || 'COMMERCIAL'} onChange={(e) => setField('message_type', e.target.value)} fullWidth size="small">
              {messageOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
          الأصناف
        </Typography>
        <Stack spacing={1}>
          {items.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField label="اسم الصنف" value={item.product_name} onChange={(e) => editItem(idx, 'product_name', e.target.value)} size="small" sx={{ flex: 2 }} />
              <TextField label="الماركة" value={item.brand} onChange={(e) => editItem(idx, 'brand', e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="المنشأ" value={item.origin} onChange={(e) => editItem(idx, 'origin', e.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="الوزن (كغ)" type="number" value={item.weight_kg} onChange={(e) => editItem(idx, 'weight_kg', e.target.value)} size="small" sx={{ width: 110 }} />
              <TextField label="العبوات" type="number" value={item.package_count} onChange={(e) => editItem(idx, 'package_count', e.target.value)} size="small" sx={{ width: 90 }} />
              <TextField label="نوع العبوة" value={item.package_type} onChange={(e) => editItem(idx, 'package_type', e.target.value)} size="small" sx={{ flex: 1 }} />
              <IconButton aria-label="حذف" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}><Tooltip title="حذف"><DeleteIcon fontSize="small" /></Tooltip></IconButton>
            </Stack>
          ))}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button size="small" variant="text" onClick={() => setItems((prev) => [...prev, emptyItem()])}>+ إضافة صنف</Button>
            <Typography variant="body2" color="text.secondary">الوزن الإجمالي: {formatNumber(totalWeight)} كغ</Typography>
          </Stack>
        </Stack>

        {policy && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            سياسة العينات: {policy.name_ar} — سيُحسب عدد العينات تلقائياً حسب الخدة.
          </Typography>
        )}
      </FormDialog>
    </Box>
  );
};

const AccountantPanel = () => {
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
      notifySuccess('تم تحصيل الرسوم وإصدار الإيصال');
      load();
      loadReport();
    } catch {
      notifyError('تعذر تسجيل الدفع');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: 'رقم البيان', render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: 'المورد', render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'samples_required', label: 'عينات' },
    { key: 'total_weight_kg', label: 'الوزن', render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'fee_preview', label: 'الرسوم المستحقة', render: (r: FoodShipment) => formatNumber(Number(r.fee_preview?.total || 0)) },
    { key: 'actions', label: 'الإجراء', render: (r: FoodShipment) => (
      <Button size="small" variant="contained" color="success" startIcon={<PaymentsIcon />} disabled={busy} onClick={() => handlePay(r.id)}>
        تحصيل وإصدار إيصال
      </Button>
    ) },
  ];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Stack spacing={2}>
          <KpiCard label="إيصالات (اليوم)" value={report?.paid_count ?? 0} icon={<ReceiptIcon />} />
          <KpiCard label="إجمالي المحصَّل" value={formatNumber(Number(report?.total_collected || 0))} icon={<PaymentsIcon />} />
          <KpiCard label="طلبات بانتظار التحصيل" value={report?.pending_count ?? shipments.length} icon={<Inventory2Icon />} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>تقرير التحصيل</Typography>
              <TextField select value={period} onChange={(e) => setPeriod(e.target.value)} size="small" sx={{ width: 140 }}>
                <MenuItem value="day">اليوم</MenuItem>
                <MenuItem value="week">الأسبوع</MenuItem>
                <MenuItem value="month">الشهر</MenuItem>
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
                    <Tooltip title="طباعة الإيصال">
                      <IconButton size="small" onClick={() => setPrintData(reportReceiptToPrintData(r))} aria-label="طباعة">
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">لا توجد حركة في هذه الفترة.</Typography>
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
          title="طلبات بانتظار تحصيل الرسوم"
          emptyTitle="لا توجد طلبات"
          emptyDescription="الطلبات المسجلة تنتقل هنا بعد إحالتها من الكاتب"
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
    if (!inspectorId) { notifyError('اختر المفتش'); return; }
    setBusy(true);
    try {
      await toDecision(id); // placeholder to keep flow: assign then inspect
      await assignInspector(id, inspectorId);
      notifySuccess('تم تعيين المفتش');
      load();
    } catch { notifyError('تعذر التعيين'); } finally { setBusy(false); }
  };

  const handleInspect = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      await inspectShipment(sel.id, { ...form });
      notifySuccess('تم تسجيل تقرير التفتيش');
      setInspectOpen(false);
      load();
    } catch { notifyError('تعذر حفظ التفتيش'); } finally { setBusy(false); }
  };

  const handleSample = async () => {
    if (!sel) return;
    if (!sample.sample_type) { notifyError('حدد نوع العينة'); return; }
    setBusy(true);
    try {
      await createSample(sel.id, { ...sample });
      notifySuccess('تم سحب العينة وإرسالها للمختبر');
      setSampleOpen(false);
      load();
    } catch { notifyError('تعذر تسجيل العينة'); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'manifest_number', label: 'رقم البيان', render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: 'المورد', render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'total_weight_kg', label: 'الوزن', render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: 'عينات' },
    { key: 'assigned_inspector_name', label: 'المفتش' },
    { key: 'status', label: 'الحالة', render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={() => { setSel(r); setInspectOpen(true); }}>
          تفتيش
        </Button>
        <Button size="small" variant="contained" color="info" startIcon={<BiotechIcon />} onClick={() => { setSel(r); setSampleOpen(true); }}>
          سحب عينة
        </Button>
        <Button size="small" variant="text" color="primary" startIcon={<PersonSearchIcon />} onClick={() => { setSel(r); handleAssign(r.id); }}>
          تعيين
        </Button>
      </Stack>
    ) },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <TextField select label="المفتش للتعيين" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} size="small" sx={{ width: 260 }}>
          <MenuItem value=""><em>اختر المفتش</em></MenuItem>
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
        title="طلبات بانتظار المفتش"
        emptyTitle="لا توجد"
        emptyDescription="لا توجد طلبات بانتظار التفتيش"
      />

      <FormDialog
        open={inspectOpen}
        title="تقار التفتيش الميداني"
        subtitle="بيانات التفتيش والنتيجة (مطابق / غير مطابق / يحتاج تحليل)"
        icon={<FactCheckIcon />}
        maxWidth="md"
        onSubmit={handleInspect}
        loading={busy}
        onClose={() => !busy && setInspectOpen(false)}
      >
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}><TextField label="تاريخ الإنتاج" type="date" value={form.production_date || ''} onChange={(e) => setField('production_date', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="تاريخ الانتهاء" type="date" value={form.expiry_date || ''} onChange={(e) => setField('expiry_date', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="الحرارة (م)" type="number" value={form.temperature || ''} onChange={(e) => setField('temperature', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label="رقم التشغيلة" value={form.batch_number || ''} onChange={(e) => setField('batch_number', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label="حالة الماعون" value={form.container_condition || ''} onChange={(e) => setField('container_condition', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label="حالة الحاوية" value={form.container_status || ''} onChange={(e) => setField('container_status', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label="حالة العبوات" value={form.package_condition || ''} onChange={(e) => setField('package_condition', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label="عبوات تالفة" type="number" value={form.damaged_count || 0} onChange={(e) => setField('damaged_count', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label="عبوات سليمة" type="number" value={form.sound_count || 0} onChange={(e) => setField('sound_count', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label="وزن تالف" type="number" value={form.damaged_weight || 0} onChange={(e) => setField('damaged_weight', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={6} sm={3}><TextField label="وزن سليم" type="number" value={form.sound_weight || 0} onChange={(e) => setField('sound_weight', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12}><TextField label="ملاحظات" value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} fullWidth size="small" multiline minRows={2} /></Grid>
        </Grid>
      </FormDialog>

      <FormDialog
        open={sampleOpen}
        title="سحب عينة للتحليل"
        subtitle="تسجيل العينة وتسكين سبب أخذها ودفعت المختبر"
        icon={<BiotechIcon />}
        onSubmit={handleSample}
        loading={busy}
        submitDisabled={!sample.sample_type}
        onClose={() => !busy && setSampleOpen(false)}
      >
        <Stack spacing={1.5}>
          <TextField label="نوع العينة" value={sample.sample_type} onChange={(e) => setSample({ ...sample, sample_type: e.target.value })} fullWidth size="small" />
          <TextField select label="سبب أخذ العينة" value={sample.sampling_reason} onChange={(e) => setSample({ ...sample, sampling_reason: e.target.value })} fullWidth size="small">
            {samplingReasonOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="دكتة المختبر" value={sample.bench} onChange={(e) => setSample({ ...sample, bench: e.target.value })} fullWidth size="small">
            <MenuItem value="MICROBIOLOGY">الأحياء الدقيقة</MenuItem>
            <MenuItem value="CHEMISTRY">الكيمياء</MenuItem>
            <MenuItem value="TOXICOLOGY">السموم</MenuItem>
            <MenuItem value="MOLECULAR">الجزيئي</MenuItem>
          </TextField>
        </Stack>
      </FormDialog>
    </Box>
  );
};

const ManagerPanel = () => {
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
    if (!sel || !inspectorId) { notifyError('اختر المفتش'); return; }
    setBusy(true);
    try { await assignInspector(sel.id, inspectorId); notifySuccess('تم التعيين'); setAssignOpen(false); load(); }
    catch { notifyError('تعذر التعيين'); } finally { setBusy(false); }
  };

  const handleReview = async (id: string) => {
    setBusy(true);
    try { await reviewShipment(id, 'APPROVE'); notifySuccess('اعتمدت المراجعة'); load(); }
    catch { notifyError('تعذر المراجعة'); } finally { setBusy(false); }
  };

  const handleDecide = async () => {
    if (!sel || !decision) { notifyError('حدد القرار'); return; }
    setBusy(true);
    try { await decideShipment(sel.id, decision, reason); notifySuccess('صدر القرار النهائي والشهادة'); setDecideOpen(false); load(); }
    catch { notifyError('تعذر إصدار القرار'); } finally { setBusy(false); }
  };

  const columns = [
    { key: 'manifest_number', label: 'رقم البيان', render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: 'المورد', render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'total_weight_kg', label: 'الوزن', render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: 'عينات' },
    { key: 'status', label: 'الحالة', render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'final_decision', label: 'القرار', render: (r: FoodShipment) => { const m = decisionMeta[r.final_decision]; return r.final_decision && m ? <StatusChip label={m.label} tone={m.tone} /> : '—'; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => { setSel(r); setAssignOpen(true); }}>
          تعيين مفتش
        </Button>
        <Button size="small" variant="outlined" color="success" onClick={() => handleReview(r.id)}>مراجعة</Button>
        <Button size="small" variant="contained" startIcon={<GavelIcon />} onClick={() => { setSel(r); setDecision(''); setReason(''); setDecideOpen(true); }}>
          قرار نهائي
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
        title="طلبات بانتظار القرار والمراجعة"
        emptyTitle="لا توجد"
      />

      <FormDialog
        open={assignOpen}
        title="تعيين مفتش (مدير القسم)"
        icon={<PersonSearchIcon />}
        onSubmit={handleAssign}
        loading={busy}
        submitDisabled={!inspectorId}
        onClose={() => !busy && setAssignOpen(false)}
      >
        <TextField select label="المفتش" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} fullWidth size="small">
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
        </TextField>
      </FormDialog>

      <FormDialog
        open={decideOpen}
        title="القرار النهائي (مدير القسم)"
        subtitle="إفراج / إفراج جزئي أو مؤقت / إعادة تصدير / تحويل / حجز / إتلاف"
        icon={<GavelIcon />}
        onSubmit={handleDecide}
        loading={busy}
        submitDisabled={!decision}
        onClose={() => !busy && setDecideOpen(false)}
      >
        <Stack spacing={1.5}>
          <TextField select label="القرار" value={decision} onChange={(e) => setDecision(e.target.value)} fullWidth size="small">
            {Object.entries(foodFinalDecision).map(([v, m]) => <MenuItem key={v} value={v}>{m.label}</MenuItem>)}
          </TextField>
          <TextField label="سبب القرار" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" multiline minRows={2} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

const ExportFormPanel = () => {
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
      notifyError('تعذر تحميل الاستمارة');
    } finally {
      setLoadingForm(false);
    }
  };

  const columns = [
    { key: 'manifest_number', label: 'رقم البيان', render: (r: FoodShipment) => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.manifest_number}</span> },
    { key: 'supplier_name', label: 'المورّد', render: (r: FoodShipment) => <Typography sx={{ fontWeight: 700 }}>{r.supplier_name}</Typography> },
    { key: 'origin_country', label: 'المنشأ', hideOnMobile: true },
    { key: 'total_weight_kg', label: 'الوزن', render: (r: FoodShipment) => formatNumber(Number(r.total_weight_kg)) },
    { key: 'samples_required', label: 'عينات' },
    { key: 'status', label: 'الحالة', render: (r: FoodShipment) => { const m = statusMeta[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
    { key: 'actions', label: '', render: (r: FoodShipment) => (
      <Button size="small" variant="contained" startIcon={<AssignmentOutlinedIcon />} onClick={() => handleOpen(r.id)}>
        فتح الاستمارة
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
        title="شحنات الصادر — استمارة كشف الموارد الغذائية"
        emptyTitle="لا توجد شحنات صادر"
        emptyDescription="سجّل طلب صادر من تبويب الكاتب لعرض استمارة الكشف"
      />

      <FormDialog
        open={open}
        title="استمارة كشف الموارد الغذائية الصادرة"
        subtitle="سجل إلكتروني مكوّن من بيانات الطلب والكشف والمختبر والقرار"
        icon={<AssignmentOutlinedIcon />}
        maxWidth="lg"
        onSubmit={() => setOpen(false)}
        submitLabel="إغلاق"
        cancelLabel="إغلاق"
        onClose={() => setOpen(false)}
      >
        {loadingForm ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">جارٍ تجميع بيانات الاستمارة…</Typography></Box>
        ) : form ? (
          <ExportInspectionFormView form={form} />
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">لا توجد بيانات للاستمارة.</Typography></Box>
        )}
      </FormDialog>
    </Box>
  );
};

export default FoodOpsPage;