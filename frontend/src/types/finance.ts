export interface FinanceFee {
  id: string;
  code: string;
  name_ar: string;
  service_type: string;
  unit: string;
  amount_sdg: string | number | null;
  amount_usd: string | number | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  approved_by: string;
  legal_reference: string;
  year: number;
  is_active: boolean;
  created_at: string;
}

export interface FinancePayment {
  id: string;
  invoice: string;
  method: string;
  amount: string | number;
  currency: string;
  gateway_ref: string;
  gateway_status: string;
  collected_by: string | null;
  collected_at: string;
  notes: string;
}

export interface FinanceReceipt {
  id: string;
  receipt_number: string;
  invoice: string;
  payment: string;
  amount: string | number;
  currency: string;
  issued_by: string | null;
  issued_at: string;
  verification_code: string;
}

export interface FinanceInvoice {
  id: string;
  invoice_number: string;
  source_type: string;
  food_shipment: string | null;
  food_sample: string | null;
  request_ref: string;
  service_type: string;
  applicant_name: string;
  applicant_id_number: string;
  applicant_phone: string;
  items: Array<Record<string, unknown>>;
  gross_amount: string | number;
  discount_amount: string | number;
  discount_reason: string;
  net_amount: string | number;
  currency: string;
  status: string;
  issued_by: string;
  issued_at: string;
  due_date: string | null;
  receipt_number: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reconciled_by: string | null;
  reconciled_at: string | null;
  paid_amount: string | number;
  balance_due: string | number;
  payments: FinancePayment[];
  receipts: FinanceReceipt[];
  shed_status: string | null;
  created_at: string;
}

export interface FinanceReceiptPrintItem {
  name: string;
  quantity: string | number;
  unit_price: number | null;
  amount: number | null;
}

export interface FinanceReceiptPrint {
  receipt: {
    number: string;
    issued_at: string;
    verification_code: string;
    issued_by: string;
  };
  invoice: {
    number: string;
    request_ref: string;
    source_type: string;
    service_type: string;
    currency: string;
    gross_amount: number;
    discount_amount: number;
    discount_reason: string;
    net_amount: number;
    items: FinanceReceiptPrintItem[];
  };
  payment: {
    amount: number;
    method: string;
    method_code: string;
    gateway_ref: string;
    gateway_status: string;
    notes: string;
    collected_at: string;
    collected_by: string;
  };
  customer: {
    name: string;
    id_number: string;
    phone: string;
  };
}

export interface FinanceReconciliationMatch {
  reference: string;
  payment_id: string;
  invoice_number: string;
  receipt_number: string;
  amount: string;
  currency: string;
  collected_at: string;
  collected_by: string;
  method?: string;
}

export interface FinanceReconciliationDiscrepancy {
  type: string;
  reference?: string;
  payment_id?: string;
  payment_ids?: string[];
  count?: number;
  invoice_number?: string;
  receipt_number?: string;
  amount?: string;
  currency?: string;
  collected_at?: string;
  collected_by?: string;
  issue: string;
}

export interface FinanceReconciliation {
  id: string;
  period_start: string;
  period_end: string;
  channel: string;
  system_total: string | number;
  channel_total: string | number;
  difference: string | number;
  status: string;
  status_display: string;
  matched_count: number;
  discrepancy_count: number;
  matches: FinanceReconciliationMatch[];
  discrepancies: FinanceReconciliationDiscrepancy[];
  investigation_notes: string;
  created_by: string | null;
  created_by_name: string | null;
  reconciled_by: string | null;
  reconciled_by_name: string | null;
  reconciled_at: string | null;
  created_at: string;
}

export interface ReconciliationPreview {
  system_total: string | number;
  channel_total: null;
  difference: null;
  matches: FinanceReconciliationMatch[];
  discrepancies: FinanceReconciliationDiscrepancy[];
  matched_count: number;
  discrepancy_count: number;
}

export interface FinanceAuditLog {
  id: string;
  actor: string | null;
  actor_name: string | null;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  invoice_ref: string;
  field_name: string;
  old_value: string;
  new_value: string;
  ip_address: string | null;
  occurred_at: string;
}

export interface FinanceSummaryReport {
  today: { collected: number; count: number };
  revenue: { total: number; count: number };
  pending_count: number;
  overdue: { count: number; amount: number };
  funnel: Record<string, number>;
}

export interface ChannelRevenue {
  method: string;
  method_label: string;
  amount: number;
  count: number;
}

export interface ByChannelReport {
  items: ChannelRevenue[];
  total: number;
}

export interface VariationReport {
  issued: { count: number };
  paid: { count: number; amount: number };
  refunded: { count: number; amount: number };
  cancelled: { count: number; amount: number };
}

export interface SectorPortRow {
  sector: string;
  port: string;
  amount: number;
  count: number;
}

export interface MatrixReport {
  rows: SectorPortRow[];
}

export interface ArrearsAgingBucket {
  label: string;
  count: number;
  amount: number;
}

export interface ArrearsAgingReport {
  buckets: ArrearsAgingBucket[];
  total_count: number;
  total_amount: number;
}

export interface MonthlyRevenueReport {
  series: Array<{ month: string | null; amount: number; count: number }>;
  by_sector: Array<{ name: string; amount: number }>;
}

export interface NationalRevenueTree {
  [sector: string]: {
    [port: string]: {
      [service: string]: { amount: number; count: number };
    };
  };
}

export interface OverdueInvoice {
  id: string;
  invoice_number: string;
  request_ref: string;
  customer: string;
  amount: number;
  currency: string;
  due_date: string | null;
  late_days: number;
}

export type Locale = 'ar' | 'en';

export interface LocalizedLabel {
  ar: string;
  en: string;
}

// Arabic wording is kept identical to the previous string maps so existing
// screens and tests keep their behaviour; English is added alongside it.
export const SERVICE_TYPE_LABELS: Record<string, LocalizedLabel> = {
  QUARANTINE: { ar: 'رسوم الحجر الصحي', en: 'Quarantine' },
  FOOD_CONTROL: { ar: 'رقابة الأغذية', en: 'Food control' },
  INSPECTION: { ar: 'التفتيش', en: 'Inspection' },
  SAMPLING: { ar: 'أخذ العينات', en: 'Sampling' },
  LAB: { ar: 'المختبر', en: 'Laboratory' },
  CERTIFICATE: { ar: 'الشهادات', en: 'Certificates' },
  PEST_CONTROL: { ar: 'مكافحة النواقل', en: 'Vector control' },
  OTHER: { ar: 'خدمات أخرى', en: 'Other services' },
};

export const INVOICE_STATUS_LABELS: Record<string, LocalizedLabel> = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  ISSUED: { ar: 'صادرة', en: 'Issued' },
  PENDING_PAYMENT: { ar: 'بانتظار الدفع', en: 'Pending payment' },
  PARTIAL: { ar: 'مسددة جزئياً', en: 'Partially paid' },
  PAID: { ar: 'مدفوعة', en: 'Paid' },
  RECONCILED: { ar: 'تسويت', en: 'Reconciled' },
  CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
  REFUNDED: { ar: 'مسترَدّة', en: 'Refunded' },
  OVERDUE: { ar: 'متأخرة', en: 'Overdue' },
  EXEMPT: { ar: 'معفاة', en: 'Exempt' },
};

export const PAYMENT_METHOD_LABELS: Record<string, LocalizedLabel> = {
  CASH: { ar: 'نقدي', en: 'Cash' },
  BANK_CARD: { ar: 'شبكة بنكية', en: 'Bank card' },
  BANK_TRANSFER: { ar: 'تحويل بنكي', en: 'Bank transfer' },
  ELECTRONIC: { ar: 'إلكتروني', en: 'Electronic' },
};

export const AUDIT_ACTION_LABELS: Record<string, LocalizedLabel> = {
  CREATE: { ar: 'إنشاء', en: 'Create' },
  UPDATE: { ar: 'تعديل', en: 'Update' },
  APPROVE: { ar: 'اعتماد', en: 'Approve' },
  CANCEL: { ar: 'إلغاء', en: 'Cancel' },
  REFUND: { ar: 'استرداد', en: 'Refund' },
  REVERSE: { ar: 'عكس', en: 'Reverse' },
  RECONCILE: { ar: 'تسوية', en: 'Reconcile' },
  EXEMPT: { ar: 'إعفاء', en: 'Exempt' },
  MARK_PAID: { ar: 'تحصيل', en: 'Mark paid' },
};

/** Resolve one localized label. Falls back to '—' for empty keys and to the
 * raw key for unknown ones — same behavior as the old `MAP[key] ?? key`. */
export function labelOf(
  map: Record<string, LocalizedLabel>,
  key: string | null | undefined,
  locale: Locale = 'ar',
): string {
  if (!key) return '—';
  const entry = map[key];
  if (!entry) return key;
  return locale === 'en' ? entry.en : entry.ar;
}

/** Dropdown options built from a label map, in insertion order. */
export function optionsOf(
  map: Record<string, LocalizedLabel>,
  locale: Locale = 'ar',
): Array<{ value: string; label: string }> {
  return Object.entries(map).map(([value, labels]) => ({
    value,
    label: locale === 'en' ? labels.en : labels.ar,
  }));
}