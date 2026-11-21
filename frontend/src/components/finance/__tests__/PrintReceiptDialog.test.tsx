/**
 * F5b — PrintReceiptDialog is fully localized via `finance.receipt.*`.
 * Passing `data` bypasses the remote fetch and renders the printable sheet.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FinanceReceiptPrint } from '../../../types/finance';
import i18n from '../../../i18n';
import PrintReceiptDialog from '../PrintReceiptDialog';

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceReceiptPrint: vi.fn(),
}));

const makeData = (overrides: Partial<FinanceReceiptPrint['payment']> = {}): FinanceReceiptPrint => ({
  receipt: {
    number: 'RC-001',
    issued_at: '2026-01-01T00:00:00Z',
    verification_code: 'V-123',
    issued_by: '',
  },
  invoice: {
    number: 'INV-001',
    request_ref: 'REQ-001',
    source_type: '',
    service_type: 'Quarantine',
    currency: 'SDG',
    gross_amount: 100,
    discount_amount: 0,
    discount_reason: '',
    net_amount: 100,
    items: [],
  },
  payment: {
    amount: 100,
    method: 'RAW_METHOD',
    method_code: 'CASH',
    gateway_ref: '',
    gateway_status: '',
    notes: '',
    collected_at: '2026-01-01T00:00:00Z',
    collected_by: '',
    ...overrides,
  },
  customer: { name: '', id_number: '', phone: '' },
});

const wrap = async (lang: 'ar' | 'en', data = makeData()) => {
  await i18n.changeLanguage(lang);
  return render(
    <PrintReceiptDialog open data={data} receipt={null} onClose={vi.fn()} />,
  );
};

describe('PrintReceiptDialog — i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  afterEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('renders Arabic title (طباعة الإيصال الإلكتروني)', async () => {
    await wrap('ar');
    expect(screen.getByText('طباعة الإيصال الإلكتروني')).toBeInTheDocument();
  });

  it('renders English title', async () => {
    await wrap('en');
    expect(screen.getByText('Print Electronic Receipt')).toBeInTheDocument();
  });

  it('renders method + status in current locale', async () => {
    await wrap('ar', makeData({
      method: 'RAW_METHOD',
      method_code: 'BANK_CARD',
      gateway_status: 'CONFIRMED',
      gateway_ref: 'GW-9',
    }));
    expect(screen.getAllByText(/شبكة بنكية \(POS\)/).length).toBeGreaterThan(0);
    expect(screen.getByText(/حالة المعاملة: مؤكد/)).toBeInTheDocument();
  });

  it('renders noCashRefund alert in ar', async () => {
    await wrap('ar');
    expect(screen.getByText(/لا يُقبل استرداد النقدية/)).toBeInTheDocument();
  });
});
