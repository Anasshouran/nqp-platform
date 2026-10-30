import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
      notifyError(t('food.shipmentWorkflow.errorExec'));
    } finally {
      setBusy(false);
    }
  };

  const handleInvoice = async () => {
    const items = invoiceItems
      .filter((i) => i.name.trim() && i.amount.trim() !== '')
      .map((i) => ({ name: i.name, amount: parseFloat(i.amount) }));
    if (items.length === 0) { notifyError(t('food.shipmentWorkflow.addItem')); return; }
    if (!id) return;
    await runAction(() => createInvoice(id, items), t('food.shipmentWorkflow.invoiceIssued'));
    setInvoiceOpen(false);
  };

  const handlePay = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await payInvoice(id);
      setPrintData(foodInvoiceToPrintData(res.data.data));
      notifySuccess(t('food.shipmentWorkflow.paySuccess'));
      setPayOpen(false);
      load();
    } catch {
      notifyError(t('food.shipmentWorkflow.payError'));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !selInspector) { notifyError(t('food.shipmentWorkflow.selectInspector')); return; }
    await runAction(() => assignInspector(id, selInspector), t('food.shipmentWorkflow.inspectorAssigned'));
    setAssignOpen(false);
  };

  const handleDecide = async () => {
    if (!id || !selDecision) { notifyError(t('food.shipmentWorkflow.selectDecision')); return; }
    await runAction(() => decideShipment(id, selDecision, decideReason), t('food.shipmentWorkflow.decisionIssued'));
    setDecideOpen(false);
  };

  const handleRefer = async () => {
    if (!id || !selReferSource) { notifyError(t('food.shipmentWorkflow.selectReferralSource')); return; }
    await runAction(() => referShipment(id, selReferSource, referReference), t('food.shipmentWorkflow.referralRegistered'));
    setReferOpen(false);
  };

  if (!shipment) {
    return (
      <Box>
        <PageHeader title={t("food.shipmentWorkflow.pageHeader.title")} eyebrow={t("food.shipmentWorkflow.pageHeader.eyebrow")} />
        <Typography color="text.secondary">{t("food.shipmentWorkflow.loading")}</Typography>
      </Box>
    );
  }

  const statusMeta = shipmentStatus[shipment.status];
  const decisionMeta = foodFinalDecision[shipment.final_decision];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/food')} sx={{ mb: 2 }}>
        t('food.shipmentWorkflow.backToShipments')
      </Button>
      <PageHeader
        title={shipment.manifest_number}
        subtitle={`${shipment.supplier_name} — ${shipment.origin_country}`}
        eyebrow={t("food.shipmentWorkflow.pageHeader.eyebrow")}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<ReceiptIcon />} disabled={!!invoiceOpen || shipment.fees_paid} onClick={() => setInvoiceOpen(true)}>
              t('food.shipmentWorkflow.actions.invoice')
            </Button>
            <Button variant="outlined" color="success" startIcon={<PaymentsIcon />} disabled={shipment.fees_paid} onClick={() => setPayOpen(true)}>
              t('food.shipmentWorkflow.actions.pay')
            </Button>
            <Button variant="outlined" color="info" startIcon={<PersonAssignIcon />} onClick={() => setAssignOpen(true)}>
              t('food.shipmentWorkflow.actions.assignInspector')
            </Button>
<Button variant="contained" startIcon={<GavelIcon />} onClick={() => setDecideOpen(true)}>
              t('food.shipmentWorkflow.actions.decide')
            </Button>
            {!shipment.referred_from && (
              <Button variant="outlined" color="warning" startIcon={<ForwardToInboxIcon />} onClick={() => setReferOpen(true)}>
                t('food.shipmentWorkflow.actions.referral')
              </Button>
            )}
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label={t("food.shipmentWorkflow.rows.status")} value={statusMeta ? statusMeta.label : shipment.status} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label="t('food.shipmentWorkflow.rows.shipmentType')" value={shipment.shipment_type === 'IMPORT' ? t('food.shipmentWorkflow.shipmentType.import') : t('food.shipmentWorkflow.shipmentType.export')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label={t("food.shipmentWorkflow.rows.port")} value={`${shipment.port_name || shipment.port}${portType[shipment.port_type] ? ` — ${portType[shipment.port_type].label}` : ''}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCell label={t("food.shipmentWorkflow.rows.fees")} value={shipment.fees_paid ? t('food.shipmentWorkflow.feesPaid') : t('food.shipmentWorkflow.feesUnpaid')} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 1 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>t('food.shipmentWorkflow.details')</Typography>
          <Stack spacing={1.5}>
            <Row label="t('food.shipmentWorkflow.rows.manifestNumber')" value={shipment.manifest_number} />
            <Row label="t('food.shipmentWorkflow.rows.supplier')" value={shipment.supplier_name} />
            <Row label="t('food.shipmentWorkflow.rows.originCountry')" value={shipment.origin_country} />
            <Row label="t('food.shipmentWorkflow.rows.arrivalDate')" value={formatDate(shipment.arrival_date)} />
            {statusMeta && <Row label="t('food.shipmentWorkflow.rows.shipmentStatus')" value={statusMeta.label} />}
            <Row label="t('food.shipmentWorkflow.actions.decide')" value={decisionMeta ? decisionMeta.label : t('food.shipmentWorkflow.dash')} />
            {shipment.decision_reason && <Row label="t('food.shipmentWorkflow.rows.decisionReason')" value={shipment.decision_reason} />}
            {shipment.assigned_inspector_name && <Row label="t('food.shipmentWorkflow.actions.assignInspector')" value={`${shipment.assigned_inspector_name} (${shipment.assigned_at ? formatDateTime(shipment.assigned_at) : t('food.shipmentWorkflow.dash')})`} />}
            <Row label="t('food.shipmentWorkflow.rows.recordedBy')" value={shipment.recorded_by_name || t('food.shipmentWorkflow.dash')} />
            <Row label={t("food.shipmentWorkflow.rows.fees")} value={shipment.fees_paid ? t('food.shipmentWorkflow.feesPaid') : t('food.shipmentWorkflow.feesUnpaid')} />
            {shipment.referred_from && (
              <Row
                label={t("food.shipmentWorkflow.rows.referralSource")}
                value={`${referralSource[shipment.referred_from]?.label || shipment.referred_from}${shipment.referral_reference ? ` (${shipment.referral_reference})` : ''}`}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      <FormDialog
        open={invoiceOpen}
        title={t("food.shipmentWorkflow.dialogs.invoice.title")}
        subtitle={t("food.shipmentWorkflow.dialogs.invoice.subtitle")}
        icon={<ReceiptIcon />}
        onSubmit={handleInvoice}
        loading={busy}
        onClose={() => !busy && setInvoiceOpen(false)}
      >
        <Stack spacing={1.5}>
          {invoiceItems.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField label={t("food.shipmentWorkflow.dialogs.invoice.serviceItem")} value={item.name} onChange={(e) => {
                const next = [...invoiceItems]; next[idx] = { ...next[idx], name: e.target.value }; setInvoiceItems(next);
              }} fullWidth size="small" />
              <TextField label={t("food.shipmentWorkflow.dialogs.invoice.amount")} type="number" value={item.amount} onChange={(e) => {
                const next = [...invoiceItems]; next[idx] = { ...next[idx], amount: e.target.value }; setInvoiceItems(next);
              }} size="small" sx={{ width: 140 }} />
              <IconButton aria-label={t("food.shipmentWorkflow.dialogs.invoice.receipt")} onClick={() => setInvoiceItems((prev) => prev.filter((_, i) => i !== idx))}><Tooltip title={t("food.shipmentWorkflow.dialogs.invoice.delete")}><ReceiptIcon sx={{ fontSize: 18 }} /></Tooltip></IconButton>
            </Stack>
          ))}
          <Button size="small" variant="text" onClick={() => setInvoiceItems((prev) => [...prev, { name: '', amount: '' }])}>{t('food.shipmentWorkflow.dialogs.invoice.addItem')}</Button>
        </Stack>
      </FormDialog>

      <FormDialog
        open={payOpen}
        title="t('food.shipmentWorkflow.actions.pay')"
        subtitle={t("food.shipmentWorkflow.dialogs.pay.subtitle")}
        icon={<PaymentsIcon />}
        onSubmit={handlePay}
        loading={busy}
        onClose={() => !busy && setPayOpen(false)}
      >
        <Typography color="text.secondary">{t('food.shipmentWorkflow.dialogs.pay.receiptInfo')}</Typography>
      </FormDialog>

      <FormDialog
        open={assignOpen}
        title={t("food.shipmentWorkflow.dialogs.assignInspector.title")}
        subtitle={t("food.shipmentWorkflow.dialogs.assignInspector.subtitle")}
        icon={<PersonAssignIcon />}
        onSubmit={handleAssign}
        loading={busy}
        submitDisabled={!selInspector}
        onClose={() => !busy && setAssignOpen(false)}
      >
        <FormSelect
          label={t("food.shipmentWorkflow.dialogs.assignInspector.placeholder")}
          value={selInspector}
          onChange={setSelInspector}
          options={inspectors.map((u) => ({ value: u.id, label: u.full_name }))}
          placeholder={t("food.shipmentWorkflow.dialogs.assignInspector.placeholder")}
          requiredMark
        />
      </FormDialog>

      <FormDialog
        open={decideOpen}
        title="t('food.shipmentWorkflow.actions.decide')"
        subtitle={t("food.shipmentWorkflow.dialogs.decide.subtitle")}
        icon={<GavelIcon />}
        onSubmit={handleDecide}
        loading={busy}
        submitDisabled={!selDecision}
        onClose={() => !busy && setDecideOpen(false)}
      >
        <FormSelect
          label={t("food.shipmentWorkflow.dialogs.decide.placeholder")}
          value={selDecision}
          onChange={setSelDecision}
          options={decisionOptions}
          placeholder={t("food.shipmentWorkflow.dialogs.decide.placeholder")}
          requiredMark
        />
        <Box sx={{ mt: 1.5 }}>
          <TextField
            label="t('food.shipmentWorkflow.rows.decisionReason')"
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
        title={t("food.shipmentWorkflow.dialogs.referral.title")}
        subtitle={t("food.shipmentWorkflow.dialogs.referral.subtitle")}
        icon={<ForwardToInboxIcon />}
        onSubmit={handleRefer}
        loading={busy}
        submitDisabled={!selReferSource}
        onClose={() => !busy && setReferOpen(false)}
      >
        <FormSelect
          label={t("food.shipmentWorkflow.rows.referralSource")}
          value={selReferSource}
          onChange={setSelReferSource}
          options={referralSourceOptions}
          placeholder={t("food.shipmentWorkflow.dialogs.referral.placeholder")}
          requiredMark
        />
        <Box sx={{ mt: 1.5 }}>
          <TextField
            label={t("food.shipmentWorkflow.dialogs.referral.reference")}
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
    <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{value || t('food.shipmentWorkflow.dash')}</Typography>
  </Stack>
);

export default ShipmentWorkflowPage;