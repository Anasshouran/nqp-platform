import { useEffect, useMemo, useState } from 'react';
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

const CURRENCY_LABELS: Record<string, string> = {
  SDG: 'جنيه سوداني',
  USD: 'دولار أمريكي',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي',
  BANK_CARD: 'شبكة بنكية (POS)',
  BANK_TRANSFER: 'تحويل بنكي',
  ELECTRONIC: 'إلكتروني',
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

function buildLocal(receipt: FinanceReceipt, invoice?: FinanceInvoice | null, payment?: FinancePayment | null): FinanceReceiptPrint {
  const pmt = payment ?? invoice?.payments?.[0];
  const methodLabel = (m?: string) => METHOD_LABELS[m ?? ''] ?? m ?? '—';
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
        ? 'مؤكد'
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
    if (invoice) return buildLocal(receipt, invoice, payment);
    return remote;
  }, [receipt, invoice, payment, remote, directData]);

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
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PrintIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>طباعة الإيصال الإلكتروني</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="إغلاق" sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'grey.100', display: 'flex', justifyContent: 'center' }}>
        {loading && (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">جاري تجهيز بيانات الإيصال...</Typography>
          </Stack>
        )}
        {!loading && (data ? <ReceiptSheet data={data} /> : <Typography color="error" sx={{ py: 8 }}>تعذّر تحميل بيانات الإيصال.</Typography>)}
      </DialogContent>
      {!loading && data && (
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={onClose}>إغلاق</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            طباعة الإيصال
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
  const currencyLabel = CURRENCY_LABELS[data.invoice.currency] ?? data.invoice.currency;
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
        <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: 1 }}>جمهورية السودان</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>وزارة الصحة الاتحادية — الإدارة العامة للصحة الحيوانية</Typography>
        <Typography variant="caption" color="text.secondary">المنصة الوطنية للحجر الصحي — إقرار استلام رسوم</Typography>
      </Stack>

      <Divider sx={{ borderBottomWidth: 3, mb: 2 }} />

      {/* بيانات الإيصال والدفع */}
      <Stack direction="row" spacing={3} justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 260 }}>
          <SheetRow label="رقم الإيصال" value={data.receipt.number} strong />
          <SheetRow label="تاريخ الإصدار" value={fmtDateTime(data.receipt.issued_at)} />
          <SheetRow label="المحصل" value={data.payment.collected_by || data.receipt.issued_by || '—'} />
        </Box>
        <Box sx={{ minWidth: 260 }}>
          <SheetRow label="رقم الفاتورة" value={data.invoice.number} strong />
          <SheetRow label="رقم الطلب / المرجع" value={data.invoice.request_ref || '—'} />
          <SheetRow label="الخدمة" value={data.invoice.service_type || '—'} />
        </Box>
      </Stack>

      {/* العميل */}
      <Box sx={{ bgcolor: 'grey.50', borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', p: 1.5, mt: 1, mb: 2 }}>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <SheetRow label="العميل" value={data.customer.name || '—'} strong />
          <SheetRow label="الرقم الوطني" value={data.customer.id_number || '—'} />
          <SheetRow label="الهاتف" value={data.customer.phone || '—'} />
        </Stack>
      </Box>

      {/* البنود */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>تفاصيل البنود ({data.invoice.currency})</Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
        <Stack direction="row" sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.8 }} justifyContent="space-between">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>البند</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }} ml="auto" mr={8}>الكمية</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, textAlign: 'center' }}>قيمة الوحدة</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 110, textAlign: 'right' }}>الإجمالي</Typography>
        </Stack>
        {data.invoice.items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>لا توجد بنود.</Typography>
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
        <SheetRow label={`الإجمالي (${currencyLabel})`} value={fmtMoney(gross)} />
        {discount > 0 && <SheetRow label={`الخصم — ${data.invoice.discount_reason || 'ممنوح'}`} value={`− ${fmtMoney(discount)}`} />}
        <Divider sx={{ width: '100%', my: 0.75 }} />
        <SheetRow label="الصافي المستحق" value={fmtMoney(net)} strong />
        <Box sx={{ bgcolor: 'success.light', borderRadius: 1.5, px: 2, py: 0.8, mt: 0.75, width: '100%', textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700, color: 'success.contrastText' }}>
            المبلغ المحصّل: {fmtMoney(paid)} ({currencyLabel}) — {data.payment.method}
          </Typography>
        </Box>
      </Stack>

      {/* متغيرات الدفع غير النقدي */}
      {hasVariable && (
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1.5, p: 1.5, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            عملية دفع غير نقدية:
          </Typography>
          {data.payment.gateway_ref && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13, mt: 0.5 }}>
              مرجع {data.payment.method}: {data.payment.gateway_ref}
            </Typography>
          )}
          {data.payment.gateway_status && (
            <Typography variant="caption" color="text.secondary">حالة المعاملة: {data.payment.gateway_status}</Typography>
          )}
          {data.payment.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>ملاحظات: {data.payment.notes}</Typography>
          )}
        </Box>
      )}

      {/* رمز التحقق */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ bgcolor: 'primary.light', borderRadius: 1.5, p: 1.5, mb: 2 }} useFlexGap>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark' }}>رمز التحقق الإلكتروني</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13, color: 'primary.dark', wordBreak: 'break-all' }}>
            {data.receipt.verification_code || '—'}
          </Typography>
        </Box>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
        {fmtDate(data.payment.collected_at)} — يُتحقق من صحة هذا الإيصال عبر رمز التحقق أعلاه في سجل المنصة الوطنية.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        لا يُقبل استرداد النقدية إلا بتحويل الفاتورة إلى الحالة (مسترَدّة) واعتماد المدير المالي. هذا الإيصال صادر إلكترونياً ولا يتطلب ختماً يدوياً.
      </Typography>
    </Box>
  );
}