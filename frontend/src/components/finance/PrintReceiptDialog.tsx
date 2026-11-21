import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import type { FinanceInvoice, FinancePayment, FinanceReceipt, FinanceReceiptPrint } from '../../types/finance';
import { getFinanceReceiptPrint } from '../../api/endpoints/finance';

const CURRENCY_KEYS: Record<string, string> = {
  SDG: 'finance.receipt.currency.sdg',
  USD: 'finance.receipt.currency.usd',
};

const METHOD_KEYS: Record<string, string> = {
  CASH: 'finance.receipt.methods.cash',
  BANK_CARD: 'finance.receipt.methods.pos',
  BANK_TRANSFER: 'finance.receipt.methods.bankTransfer',
  ELECTRONIC: 'finance.receipt.methods.electronic',
};

const fmtMoney = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '0.00';
  return Number(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('ar-SD', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const fmtDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('ar-SD') : '—';

function normalizeItems(items: Array<Record<string, unknown>>): FinanceReceiptPrint['invoice']['items'] {
  return (items ?? []).map((it) => {
    const name = String(it.name ?? it.name_ar ?? '—');
    const qty = (it.quantity ?? it.qty ?? 1) as string | number;
    let unitPrice = (it.unit_price ?? it.unit_amount ?? null) as string | number | null;
    let amount = (it.amount ?? it.total ?? null) as string | number | null;
    if (amount === null && unitPrice !== null) {
      amount = Number(unitPrice) * Number(qty);
    }
    if (unitPrice === null && amount !== null) {
      unitPrice = Number(amount) / Number(qty);
    }
    return {
      name,
      quantity: qty,
      unit_price: unitPrice !== null ? Number(unitPrice) : null,
      amount: amount !== null ? Number(amount) : null,
    };
  });
}

function buildLocal(
  receipt: FinanceReceipt,
  invoice: FinanceInvoice | null | undefined,
  payment: FinancePayment | null | undefined,
  t: (key: string) => string,
): FinanceReceiptPrint {
  const pmt = payment ?? invoice?.payments?.[0];
  const methodLabel = (m?: string) => (m && METHOD_KEYS[m] ? t(METHOD_KEYS[m]) : m ?? '—');
  return {
    receipt: {
      number: receipt.receipt_number,
      issued_at: receipt.issued_at,
      verification_code: receipt.verification_code,
      issued_by: '',
    },
    invoice: {
      number: invoice?.invoice_number ?? '—',
      request_ref: invoice?.request_ref ?? '',
      source_type: '',
      service_type: '',
      currency: receipt.currency,
      gross_amount: Number(invoice?.gross_amount ?? receipt.amount),
      discount_amount: Number(invoice?.discount_amount ?? 0),
      discount_reason: invoice?.discount_reason ?? '',
      net_amount: Number(invoice?.net_amount ?? receipt.amount),
      items: invoice?.items ? normalizeItems(invoice.items) : [],
    },
    payment: {
      amount: Number(receipt.amount),
      method: methodLabel(pmt?.method),
      method_code: pmt?.method ?? 'CASH',
      gateway_ref: pmt?.gateway_ref ?? '',
      gateway_status: pmt?.gateway_status === 'CONFIRMED'
        ? t('finance.receipt.status.confirmed')
        : (pmt?.gateway_status ?? ''),
      notes: pmt?.notes ?? '',
      collected_at: pmt?.collected_at ?? receipt.issued_at,
      collected_by: pmt?.collected_by ?? '',
    },
    customer: {
      name: invoice?.applicant_name ?? '',
      id_number: invoice?.applicant_id_number ?? '',
      phone: invoice?.applicant_phone ?? '',
    },
  };
}

interface PrintReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receipt?: FinanceReceipt | null;
  invoice?: FinanceInvoice | null;
  payment?: FinancePayment | null;
  data?: FinanceReceiptPrint | null;
}

const PRINT_CSS_ID = 'nqp-print-receipt-css';

export default function PrintReceiptDialog({
  open,
  onClose,
  receipt,
  invoice,
  payment,
  data: directData,
}: PrintReceiptDialogProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [remote, setRemote] = useState<FinanceReceiptPrint | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !receipt) {
      setRemote(null);
      setLoading(false);
      return;
    }
    if (invoice || directData) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFinanceReceiptPrint(receipt.id)
      .then((res) => {
        if (!cancelled) setRemote(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, receipt, invoice, directData]);

  const data = useMemo<FinanceReceiptPrint | null>(() => {
    if (directData) return directData;
    if (!receipt) return null;
    if (invoice) return buildLocal(receipt, invoice, payment, t);
    return remote;
  }, [receipt, invoice, payment, remote, directData, t]);

  useEffect(() => {
    if (!open) return;
    let style = document.getElementById(PRINT_CSS_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = PRINT_CSS_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        .print-receipt-area, .print-receipt-area * { visibility: visible !important; }
        .print-receipt-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
      }
      @page { size: A5 landscape; margin: 8mm; }
    `;
    return () => {
      style?.remove();
    };
  }, [open]);

  if (!open || (!receipt && !directData)) return null;

  return (
    <>
      <PrinterDialogShell onClose={onClose} data={data} loading={loading} />
    </>
  );
}

function PrinterDialogShell({ onClose, data, loading }: {
  onClose: () => void;
  data: FinanceReceiptPrint | null;
  loading: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PrintIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('finance.receipt.actions.printElectronic')}</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label={t('finance.receipt.actions.close')} sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'grey.100', display: 'flex', justifyContent: 'center' }}>
        {loading && (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">{t('finance.receipt.loading')}</Typography>
          </Stack>
        )}
        {!loading && (data ? <ReceiptSheet data={data} /> : <Typography color="error" sx={{ py: 8 }}>{t('finance.receipt.error.load')}</Typography>)}
      </DialogContent>
      {!loading && data && (
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={onClose}>{t('finance.receipt.actions.close')}</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            {t('finance.receipt.actions.print')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

function SheetRow({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }): React.JSX.Element {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4, mb: 0 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 800 : 700 }}>{value}</Typography>
    </Stack>
  );
}

function ReceiptSheet({ data }: { data: FinanceReceiptPrint }): React.JSX.Element {
  const { t } = useTranslation();
  const currencyKey = CURRENCY_KEYS[data.invoice.currency];
  const currencyLabel = currencyKey ? t(currencyKey) : data.invoice.currency;
  const methodKey = METHOD_KEYS[data.payment.method_code];
  const methodLabel = methodKey ? t(methodKey) : data.payment.method;
  const gatewayStatus = data.payment.gateway_status;
  const confirmedLabel = t('finance.receipt.status.confirmed');
  const statusLabel = gatewayStatus === 'CONFIRMED' || gatewayStatus === confirmedLabel
    ? confirmedLabel
    : gatewayStatus;
  const gross = Number(data.invoice.gross_amount);
  const discount = Number(data.invoice.discount_amount ?? 0);
  const net = Number(data.invoice.net_amount);
  const paid = Number(data.payment.amount);
  const hasVariable = data.payment.method_code !== 'CASH';
  return (
    <Box
      className="print-receipt-area"
      sx={{
        width: 'min(100%, 880px)',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2.5, md: 4 },
      }}
    >
      {/* الترويسة */}
      <Stack spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: 1 }}>{t('finance.receipt.header.country')}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('finance.receipt.header.ministry')}</Typography>
        <Typography variant="caption" color="text.secondary">{t('finance.receipt.header.platform')}</Typography>
      </Stack>

      <Divider sx={{ borderBottomWidth: 3, mb: 2 }} />

      {/* بيانات الإيصال والدفع */}
      <Stack direction="row" spacing={3} justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 260 }}>
          <SheetRow label={t('finance.receipt.fields.receiptNumber')} value={data.receipt.number} strong />
          <SheetRow label={t('finance.receipt.fields.issueDate')} value={fmtDateTime(data.receipt.issued_at)} />
          <SheetRow label={t('finance.receipt.fields.collector')} value={data.payment.collected_by || data.receipt.issued_by || '—'} />
        </Box>
        <Box sx={{ minWidth: 260 }}>
          <SheetRow label={t('finance.receipt.fields.invoiceNumber')} value={data.invoice.number} strong />
          <SheetRow label={t('finance.receipt.fields.orderRef')} value={data.invoice.request_ref || '—'} />
          <SheetRow label={t('finance.receipt.fields.service')} value={data.invoice.service_type || '—'} />
        </Box>
      </Stack>

      {/* العميل */}
      <Box sx={{ bgcolor: 'grey.50', borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', p: 1.5, mt: 1, mb: 2 }}>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <SheetRow label={t('finance.receipt.fields.customer')} value={data.customer.name || '—'} strong />
          <SheetRow label={t('finance.receipt.fields.nationalId')} value={data.customer.id_number || '—'} />
          <SheetRow label={t('finance.receipt.fields.phone')} value={data.customer.phone || '—'} />
        </Stack>
      </Box>

      {/* البنود */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('finance.receipt.items.title', { currency: data.invoice.currency })}</Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
        <Stack direction="row" sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.8 }} justifyContent="space-between">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('finance.receipt.items.columns.item')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }} ml="auto" mr={8}>{t('finance.receipt.items.columns.quantity')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, textAlign: 'center' }}>{t('finance.receipt.items.columns.unitValue')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 110, textAlign: 'right' }}>{t('finance.receipt.items.columns.total')}</Typography>
        </Stack>
        {data.invoice.items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>{t('finance.receipt.items.empty')}</Typography>
        )}
        {data.invoice.items.map((it, idx) => (
          <Stack key={idx} direction="row" sx={{ px: 1.5, py: 0.8 }} justifyContent="space-between">
            <Typography variant="body2">{it.name}</Typography>
            <Typography variant="body2" mr={8}>{it.quantity}</Typography>
            <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {it.unit_price != null ? fmtMoney(it.unit_price) : '—'}
            </Typography>
            <Typography variant="body2" sx={{ minWidth: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {it.amount != null ? fmtMoney(it.amount) : '—'}
            </Typography>
          </Stack>
        ))}
      </Box>

      {/* الإجماليات */}
      <Stack sx={{ maxWidth: 340, alignSelf: 'flex-end', mb: 2, mr: { md: 'auto' } }} alignItems="flex-start">
        <SheetRow label={t('finance.receipt.total', { currencyLabel })} value={fmtMoney(gross)} />
        {discount > 0 && <SheetRow label={t('finance.receipt.discount', { reason: data.invoice.discount_reason || t('finance.receipt.discountGranted') })} value={`− ${fmtMoney(discount)}`} />}
        <Divider sx={{ width: '100%', my: 0.75 }} />
        <SheetRow label={t('finance.receipt.netDue')} value={fmtMoney(net)} strong />
        <Box sx={{ bgcolor: 'success.light', borderRadius: 1.5, px: 2, py: 0.8, mt: 0.75, width: '100%', textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, color: 'success.contrastText' }}>
            {t('finance.receipt.collected', { amount: fmtMoney(paid), currency: currencyLabel, method: methodLabel })}
          </Typography>
        </Box>
      </Stack>

      {/* متغيرات الدفع غير النقدي */}
      {hasVariable && (
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1.5, p: 1.5, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t('finance.receipt.nonCash')}
          </Typography>
          {data.payment.gateway_ref && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13, mt: 0.5 }}>
              {t('finance.receipt.reference', { method: methodLabel, ref: data.payment.gateway_ref })}
            </Typography>
          )}
          {data.payment.gateway_status && (
            <Typography variant="caption" color="text.secondary">{t('finance.receipt.transactionStatus', { status: statusLabel })}</Typography>
          )}
          {data.payment.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('finance.receipt.notes', { notes: data.payment.notes })}</Typography>
          )}
        </Box>
      )}

      {/* رمز التحقق */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ bgcolor: 'primary.light', borderRadius: 1.5, p: 1.5, mb: 2 }} useFlexGap>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark' }}>{t('finance.receipt.verificationCode')}</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13, color: 'primary.dark', wordBreak: 'break-all' }}>
            {data.receipt.verification_code || '—'}
          </Typography>
        </Box>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
        {t('finance.receipt.verificationNote', { date: fmtDate(data.payment.collected_at) })}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        {t('finance.receipt.alerts.noCashRefund')}
      </Typography>
    </Box>
  );
}