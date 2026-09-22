import type { FinanceReceiptPrint } from '../types/finance';
import type { FoodInvoice, SampleInvoice } from '../types/food';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي',
  BANK_CARD: 'شبكة بنكية (POS)',
  BANK_TRANSFER: 'تحويل بنكي',
  ELECTRONIC: 'إلكتروني',
};

function normalizeFoodItems(items: FoodInvoice['items']): FinanceReceiptPrint['invoice']['items'] {
  return (items ?? []).map((it) => ({
    name: it.name || '—',
    quantity: 1,
    unit_price: Number(it.amount ?? 0),
    amount: Number(it.amount ?? 0),
  }));
}

function normalizeSampleItems(items: SampleInvoice['items']): FinanceReceiptPrint['invoice']['items'] {
  return (items ?? []).map((it) => ({
    name: it.name_ar || it.code || '—',
    quantity: it.quantity ?? 1,
    unit_price: Number(it.unit_price ?? 0),
    amount: Number(it.total ?? 0),
  }));
}

export function reportReceiptToPrintData(r: {
  receipt_number: string;
  invoice_number: string;
  amount: string | number;
  payment_method?: string;
  paid_at: string | null;
  paid_by: string | null;
  manifest: string;
}, serviceType = 'FOOD_CONTROL'): FinanceReceiptPrint {
  const methodCode = r.payment_method || 'CASH';
  return {
    receipt: {
      number: r.receipt_number || '—',
      issued_at: r.paid_at || '',
      verification_code: '',
      issued_by: r.paid_by || '',
    },
    invoice: {
      number: r.invoice_number,
      request_ref: r.manifest || '',
      source_type: 'FOOD_SHIPMENT',
      service_type: serviceType,
      currency: 'SDG',
      gross_amount: Number(r.amount ?? 0),
      discount_amount: 0,
      discount_reason: '',
      net_amount: Number(r.amount ?? 0),
      items: [],
    },
    payment: {
      amount: Number(r.amount ?? 0),
      method: METHOD_LABELS[methodCode] ?? methodCode,
      method_code: methodCode,
      gateway_ref: '',
      gateway_status: 'مؤكد',
      notes: '',
      collected_at: r.paid_at || '',
      collected_by: r.paid_by || '',
    },
    customer: {
      name: '',
      id_number: '',
      phone: '',
    },
  };
}

export function foodInvoiceToPrintData(invoice: FoodInvoice, shipmentConsignee?: string): FinanceReceiptPrint {
  const methodCode = invoice.payment_method || 'CASH';
  return {
    receipt: {
      number: invoice.receipt_number || '—',
      issued_at: invoice.paid_at || invoice.issued_at,
      verification_code: '',
      issued_by: invoice.paid_by_name || invoice.issued_by_name || '',
    },
    invoice: {
      number: invoice.invoice_number,
      request_ref: invoice.shipment_manifest || '',
      source_type: 'FOOD_SHIPMENT',
      service_type: 'FOOD_CONTROL',
      currency: 'SDG',
      gross_amount: Number(invoice.total_amount ?? 0),
      discount_amount: 0,
      discount_reason: '',
      net_amount: Number(invoice.total_amount ?? 0),
      items: normalizeFoodItems(invoice.items),
    },
    payment: {
      amount: Number(invoice.total_amount ?? 0),
      method: METHOD_LABELS[methodCode] ?? methodCode,
      method_code: methodCode,
      gateway_ref: invoice.payment_reference || '',
      gateway_status: 'مؤكد',
      notes: invoice.paid_notes || '',
      collected_at: invoice.paid_at || invoice.issued_at,
      collected_by: invoice.paid_by_name || '',
    },
    customer: {
      name: shipmentConsignee || invoice.issued_by_name || '',
      id_number: '',
      phone: '',
    },
  };
}

export function sampleInvoiceToPrintData(invoice: SampleInvoice, sampleNumber?: string): FinanceReceiptPrint {
  return {
    receipt: {
      number: invoice.receipt_number || '—',
      issued_at: invoice.paid_at || invoice.issued_at,
      verification_code: '',
      issued_by: invoice.paid_by_name || invoice.issued_by_name || '',
    },
    invoice: {
      number: invoice.invoice_number,
      request_ref: sampleNumber || invoice.sample_number || '',
      source_type: 'SAMPLE',
      service_type: 'LAB',
      currency: invoice.currency || 'SDG',
      gross_amount: Number(invoice.total_amount ?? 0),
      discount_amount: 0,
      discount_reason: '',
      net_amount: Number(invoice.total_amount ?? 0),
      items: normalizeSampleItems(invoice.items),
    },
    payment: {
      amount: Number(invoice.total_amount ?? 0),
      method: '—',
      method_code: 'CASH',
      gateway_ref: invoice.payment_reference || '',
      gateway_status: 'مؤكد',
      notes: '',
      collected_at: invoice.paid_at || invoice.issued_at,
      collected_by: invoice.paid_by_name || '',
    },
    customer: {
      name: invoice.issued_by_name || '',
      id_number: '',
      phone: '',
    },
  };
}
