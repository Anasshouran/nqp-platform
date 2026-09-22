import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import { PageHeader } from '../../components/common';
import { FormDialog, FormSelect } from '../../components/uikit';
import PrintReceiptDialog from '../../components/finance/PrintReceiptDialog';
import { foodInvoiceToPrintData } from '../../utils/financeAdapters';
import type { FinanceReceiptPrint } from '../../types/finance';
import { foodFinalDecision, portType, referralSource, shipmentStatus } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { assignInspector, createInvoice, decideShipment, getShipments, payInvoice, referShipment } from '../../api/endpoints/food';
import { getUsers } from '../../api/endpoints/users';
import type { FoodShipment } from '../../types/food';
import type { User } from '../../types/user';

const decisionOptions = Object.entries(foodFinalDecision).map(([value, m]) => ({ value, label: m.label }));
const referralSourceOptions = Object.entries(referralSource).map(([value, m]) => ({ value, label: m.label }));

const ShipmentWorkflowPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<FoodShipment | null>(null);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([{ name: '', amount: '' }]);
  const [payOpen, setPayOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selInspector, setSelInspector] = useState('');
  const [decideOpen, setDecideOpen] = useState(false);
  const [selDecision, setSelDecision] = useState('');
  const [decideReason, setDecideReason] = useState('');
  const [referOpen, setReferOpen] = useState(false);
  const [selReferSource, setSelReferSource] = useState('');
  const [referReference, setReferReference] = useState('');
  const [printData, setPrintData] = useState<FinanceReceiptPrint | null>(null);

  const load = () => {
    if (!id) return;
    getShipments({ search: '', page_size: 100 }).then((r) => {
      const found = r.data.data.results.find((s) => s.id === id);
      if (found) setShipment(found);
    }).catch(() => undefined);
  };

  useEffect(() => {
    load();
    getUsers({ page_size: 100 }).then((r) => setInspectors(r.data.data.results)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(success);
      load();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
    }
  };

  const handleInvoice = async () => {
    const items = invoiceItems
      .filter((i) => i.name.trim() && i.amount.trim() !== '')
      .map((i) => ({ name: i.name, amount: parseFloat(i.amount) }));
    if (items.length === 0) { notifyError('أضف بنداً واحداً على الأقل'); return; }
    if (!id) return;
    await runAction(() => createInvoice(id, items), 'تم إصدار الفاتورة');
    setInvoiceOpen(false);
  };

  const handlePay = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await payInvoice(id);
      setPrintData(foodInvoiceToPrintData(res.data.data));
      notifySuccess('تم تسجيل الدفع وإصدار الإيصال');
      setPayOpen(false);
      load();
    } catch {
      notifyError('تعذر تسجيل الدفع');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !selInspector) { notifyError('اختر المفتش'); return; }
    await runAction(() => assignInspector(id, selInspector), 'تم تعيين المفتش');
    setAssignOpen(false);
  };

  const handleDecide = async () => {
    if (!id || !selDecision) { notifyError('حدد القرار'); return; }
    await runAction(() => decideShipment(id, selDecision, decideReason), 'صدر القرار النهائي والشهادة');
    setDecideOpen(false);
  };

  const handleRefer = async () => {
    if (!id || !selReferSource) { notifyError('حدد مصدر الإحالة'); return; }
    await runAction(() => referShipment(id, selReferSource, referReference), 'تم تسجيل الإحالة من المعبر');
    setReferOpen(false);
  };

  if (!shipment) {
    return (
      <Box>
        <PageHeader title="تفاصيل الشحنة" eyebrow="الرقابة الغذائية" />
        <Typography color="text.secondary">جاري تحميل الشحنة...</Typography>
      </Box>
    );
  }

  const statusMeta = shipmentStatus[shipment.status];
  const decisionMeta = foodFinalDecision[shipment.final_decision];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/food')} sx={{ mb: 2 }}>
        العودة إلى الشحنات
      </Button>
      <PageHeader
        title={shipment.manifest_number}
        subtitle={`${shipment.supplier_name} — ${shipment.origin_country}`}
        eyebrow="دورة حياة الشحنة"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<ReceiptIcon />} disabled={!!invoiceOpen || shipment.fees_paid} onClick={() => setInvoiceOpen(true)}>
              أصدار الفاتورة
            </Button>
            <Button variant="outlined" color="success" startIcon={<PaymentsIcon />} disabled={shipment.fees_paid} onClick={() => setPayOpen(true)}>
              تسجيل الدفع
            </Button>
            <Button variant="outlined" color="info" startIcon={<PersonAssignIcon />} onClick={() => setAssignOpen(true)}>
              تعيين المفتش
            </Button>
<Button variant="contained" startIcon={<GavelIcon />} onClick={() => setDecideOpen(true)}>
              القرار النهائي
            </Button>
            {!shipment.referred_from && (
              <Button variant="outlined" color="warning" startIcon={<ForwardToInboxIcon />} onClick={() => setReferOpen(true)}>
                إحالة من معبر
              </Button>
            )}
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label="الحالة" value={statusMeta ? statusMeta.label : shipment.status} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label="نوع الشحنة" value={shipment.shipment_type === 'IMPORT' ? 'وارد' : 'صادر'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label="المنفذ" value={`${shipment.port_name || shipment.port}${portType[shipment.port_type] ? ` — ${portType[shipment.port_type].label}` : ''}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label="الرسوم" value={shipment.fees_paid ? 'مدفوعة' : 'غير مدفوعة'} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 1 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>بيانات الشحنة</Typography>
          <Stack spacing={1.5}>
            <Row label="رقم البيان" value={shipment.manifest_number} />
            <Row label="المورد" value={shipment.supplier_name} />
            <Row label="بلد المنشأ" value={shipment.origin_country} />
            <Row label="تاريخ الوصول" value={formatDate(shipment.arrival_date)} />
            {statusMeta && <Row label="حالة الشحنة" value={statusMeta.label} />}
            <Row label="القرار النهائي" value={decisionMeta ? decisionMeta.label : '—'} />
            {shipment.decision_reason && <Row label="سبب القرار" value={shipment.decision_reason} />}
            {shipment.assigned_inspector_name && <Row label="تعيين المفتش" value={`${shipment.assigned_inspector_name} (${shipment.assigned_at ? formatDateTime(shipment.assigned_at) : '—'})`} />}
            <Row label="الكاتب المسجّل" value={shipment.recorded_by_name || '—'} />
            <Row label="الرسوم" value={shipment.fees_paid ? 'مدفوعة' : 'غير مدفوعة'} />
            {shipment.referred_from && (
              <Row
                label="مصدر الإحالة"
                value={`${referralSource[shipment.referred_from]?.label || shipment.referred_from}${shipment.referral_reference ? ` (${shipment.referral_reference})` : ''}`}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      <FormDialog
        open={invoiceOpen}
        title="إصدار الفاتورة"
        subtitle="حساب الرسوم المستحقة على الشحنة"
        icon={<ReceiptIcon />}
        onSubmit={handleInvoice}
        loading={busy}
        onClose={() => !busy && setInvoiceOpen(false)}
      >
        <Stack spacing={1.5}>
          {invoiceItems.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField label="بند الخدمة" value={item.name} onChange={(e) => {
                const next = [...invoiceItems]; next[idx] = { ...next[idx], name: e.target.value }; setInvoiceItems(next);
              }} fullWidth size="small" />
              <TextField label="المبلغ" type="number" value={item.amount} onChange={(e) => {
                const next = [...invoiceItems]; next[idx] = { ...next[idx], amount: e.target.value }; setInvoiceItems(next);
              }} size="small" sx={{ width: 140 }} />
              <IconButton aria-label="الفاتورة" onClick={() => setInvoiceItems((prev) => prev.filter((_, i) => i !== idx))}><Tooltip title="حذف"><ReceiptIcon sx={{ fontSize: 18 }} /></Tooltip></IconButton>
            </Stack>
          ))}
          <Button size="small" variant="text" onClick={() => setInvoiceItems((prev) => [...prev, { name: '', amount: '' }])}>+ إضافة بند</Button>
        </Stack>
      </FormDialog>

      <FormDialog
        open={payOpen}
        title="تسجيل الدفع"
        subtitle="تأكيد تحصيل الرسوم وإصدار الإيصال"
        icon={<PaymentsIcon />}
        onSubmit={handlePay}
        loading={busy}
        onClose={() => !busy && setPayOpen(false)}
      >
        <Typography color="text.secondary">سيصدر إيصال دفع بعد تأكيد العملية من قبل المحاسب.</Typography>
      </FormDialog>

      <FormDialog
        open={assignOpen}
        title="تعيين مفتش"
        subtitle="رئيس القسم يعيّن مفتش رقابة الأغذية لهذه الشحنة"
        icon={<PersonAssignIcon />}
        onSubmit={handleAssign}
        loading={busy}
        submitDisabled={!selInspector}
        onClose={() => !busy && setAssignOpen(false)}
      >
        <FormSelect
          label="المفتش"
          value={selInspector}
          onChange={setSelInspector}
          options={inspectors.map((u) => ({ value: u.id, label: u.full_name }))}
          placeholder="اختر المفتش"
          requiredMark
        />
      </FormDialog>

      <FormDialog
        open={decideOpen}
        title="القرار النهائي"
        subtitle="رئيس القسم يقرر مصير الشحنة بعد نتائج المختبر"
        icon={<GavelIcon />}
        onSubmit={handleDecide}
        loading={busy}
        submitDisabled={!selDecision}
        onClose={() => !busy && setDecideOpen(false)}
      >
        <FormSelect
          label="القرار"
          value={selDecision}
          onChange={setSelDecision}
          options={decisionOptions}
          placeholder="اختر القرار"
          requiredMark
        />
        <Box sx={{ mt: 1.5 }}>
          <TextField
            label="سبب القرار"
            value={decideReason}
            onChange={(e) => setDecideReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            size="small"
          />
        </Box>
      </FormDialog>

      <FormDialog
        open={referOpen}
        title="إحالة من منفذ"
        subtitle="تسجيل وصول الشحنة كإحالة من نظام الحجر الصحي للمعبر إلى نظام رقابة الأغذية"
        icon={<ForwardToInboxIcon />}
        onSubmit={handleRefer}
        loading={busy}
        submitDisabled={!selReferSource}
        onClose={() => !busy && setReferOpen(false)}
      >
        <FormSelect
          label="مصدر الإحالة"
          value={selReferSource}
          onChange={setSelReferSource}
          options={referralSourceOptions}
          placeholder="اختر مصدر الإحالة"
          requiredMark
        />
        <Box sx={{ mt: 1.5 }}>
          <TextField
            label="مرجع الإحالة (اختياري)"
            value={referReference}
            onChange={(e) => setReferReference(e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
      </FormDialog>
      <PrintReceiptDialog
        open={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </Box>
  );
};

const PersonAssignIcon = PersonSearchIcon;

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <Card>
    <CardContent>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </CardContent>
  </Card>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{value || '—'}</Typography>
  </Stack>
);

export default ShipmentWorkflowPage;