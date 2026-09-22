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

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  QUARANTINE: 'رسوم الحجر الصحي',
  FOOD_CONTROL: 'رقابة الأغذية',
  INSPECTION: 'التفتيش',
  SAMPLING: 'أخذ العينات',
  LAB: 'المختبر',
  CERTIFICATE: 'الشهادات',
  PEST_CONTROL: 'مكافحة النواقل',
  OTHER: 'خدمات أخرى',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PENDING_PAYMENT: 'بانتظار الدفع',
  PARTIAL: 'مسددة جزئياً',
  PAID: 'مدفوعة',
  RECONCILED: 'تسويت',
  CANCELLED: 'ملغاة',
  REFUNDED: 'مسترَدّة',
  OVERDUE: 'متأخرة',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي',
  BANK_CARD: 'شبكة بنكية',
  BANK_TRANSFER: 'تحويل بنكي',
  ELECTRONIC: 'إلكتروني',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  APPROVE: 'اعتماد',
  CANCEL: 'إلغاء',
  REFUND: 'استرداد',
  REVERSE: 'عكس',
  RECONCILE: 'تسوية',
  EXEMPT: 'إعفاء',
  MARK_PAID: 'تحصيل',
};