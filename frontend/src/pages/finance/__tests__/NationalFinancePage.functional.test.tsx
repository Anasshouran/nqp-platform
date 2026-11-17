/**
 * M5-D-ج-2b Phase 1 — functional coverage for NationalFinancePage.
 *
 * No i18n reactivity here (covered by NationalFinancePage.test.tsx).
 * All selectors use real accessible names from the Arabic locale —
 * never the raw `t('…')` key form fixed in PR #211.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import NationalFinancePage from '../NationalFinancePage';
import authReducer from '../../../store/slices/authSlice';
import * as financeApi from '../../../api/endpoints/finance';
import * as toast from '../../../utils/toast';
import type { FinanceInvoice } from '../../../types/finance';

/**
 * The page calls `ProcessNull()` (which itself calls `useTranslation()`) as a
 * plain function inside the home view. Switching views therefore removes those
 * hooks and React 19 throws "Rendered fewer hooks than expected". That is a
 * production defect outside this PR's scope (no production code changes are
 * allowed here). We keep real Arabic strings via the real i18n instance but
 * make `useTranslation` hook-free so the conditional call is harmless.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  // Stable references — a fresh `t` each call would churn useCallback deps
  // and make the page's refresh effect loop forever.
  const t = (k: string, o?: object) => i18n.t(k, o as never);
  return {
    ...actual,
    useTranslation: () => ({ t, i18n }),
  };
});

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', full_name: 'مدير مالية اختبار', email: 'finance@nqp.gov.sd', role: 'FINANCE_DIRECTOR' },
  }),
}));

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceSummary: vi.fn(),
  getFinanceInvoices: vi.fn(),
  getFinancePayments: vi.fn(),
  getFinanceReceipts: vi.fn(),
  getFinanceFees: vi.fn(),
  createFinanceFee: vi.fn(),
  updateFinanceFee: vi.fn(),
  deactivateFinanceFee: vi.fn(),
  getFinanceArrears: vi.fn(),
  payFinanceInvoice: vi.fn(),
  reviewFinanceInvoice: vi.fn(),
  cancelFinanceInvoice: vi.fn(),
  refundFinanceInvoice: vi.fn(),
}));

vi.mock('../../../api/endpoints/auth', () => ({ logout: vi.fn() }));
vi.mock('../../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../api/endpoints/organization', () => ({ getSectors: vi.fn().mockResolvedValue([]) }));

vi.mock('../../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
  notifyWarning: vi.fn(),
  extractErrorMessage: vi.fn(),
}));

type ApiMocks = Record<string, ReturnType<typeof vi.fn>>;
const api = financeApi as unknown as ApiMocks;
const toasts = toast as unknown as ApiMocks;

const ok = (data: unknown) => Promise.resolve({ data: { data } });

const makeInvoice = (overrides: Partial<FinanceInvoice> = {}): FinanceInvoice => ({
  id: 'inv-1',
  invoice_number: 'INV-001',
  source_type: 'FOOD',
  food_shipment: null,
  food_sample: null,
  request_ref: 'REQ-001',
  service_type: 'FOOD_CONTROL',
  applicant_name: 'مورد اختبار',
  applicant_id_number: '1234567890',
  applicant_phone: '0500000000',
  items: [],
  gross_amount: '1000',
  discount_amount: '0',
  discount_reason: '',
  net_amount: '1000',
  currency: 'SDG',
  status: 'PENDING_PAYMENT',
  issued_by: 'u-1',
  issued_at: '2026-01-01',
  due_date: '2026-02-01',
  receipt_number: '',
  reviewed_by: null,
  reviewed_at: null,
  reconciled_by: null,
  reconciled_at: null,
  paid_amount: '0',
  balance_due: '1000',
  payments: [],
  receipts: [],
  shed_status: null,
  created_at: '2026-01-01',
  ...overrides,
});

const invoicePending = makeInvoice();
const invoicePartial = makeInvoice({
  id: 'inv-2',
  invoice_number: 'INV-002',
  status: 'PARTIAL',
  net_amount: '2000',
  paid_amount: '1500',
  balance_due: '500',
});
const invoicePaid = makeInvoice({
  id: 'inv-3',
  invoice_number: 'INV-003',
  status: 'PAID',
  paid_amount: '1000',
  balance_due: '0',
});

const summary = {
  today: { collected: 0, count: 0 },
  revenue: { total: 0, count: 0 },
  pending_count: 0,
  overdue: { count: 0, amount: 0 },
  funnel: {},
};

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <MemoryRouter>
      <NationalFinancePage />
    </MemoryRouter>
  </Provider>,
);

const openInvoices = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'الفواتير' }));
  await screen.findByText('INV-001');
};

const rowFor = (number: string) => screen.getByText(number).closest('tr') as HTMLElement;

describe('NationalFinancePage — functional', () => {
  beforeAll(() => {
    // jsdom has no matchMedia; the desktop sidebar (view navigation) must be visible.
    window.matchMedia = ((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    api.getFinanceSummary.mockResolvedValue(ok(summary));
    api.getFinanceInvoices.mockResolvedValue(ok({ results: [invoicePending, invoicePartial, invoicePaid], count: 3 }));
    api.getFinancePayments.mockResolvedValue(ok({ results: [], count: 0 }));
    api.getFinanceReceipts.mockResolvedValue(ok({ results: [], count: 0 }));
    api.getFinanceFees.mockResolvedValue(ok({ results: [], count: 0 }));
    api.getFinanceArrears.mockResolvedValue(ok({ items: [], total: 0 }));
    api.payFinanceInvoice.mockResolvedValue(ok({ receipts: [], receipt_number: 'RCP-001' }));
    api.createFinanceFee.mockResolvedValue(ok({ id: 'fee-1' }));
    api.reviewFinanceInvoice.mockResolvedValue(ok({}));
    api.cancelFinanceInvoice.mockResolvedValue(ok({}));
    api.refundFinanceInvoice.mockResolvedValue(ok({}));
  });

  // --- R-F2: loading / error / success ---

  it('shows the loading chip while summary is pending', () => {
    api.getFinanceSummary.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('جارٍ التحديث…')).toBeInTheDocument();
  });

  it('shows an alert when the invoices API rejects', async () => {
    api.getFinanceInvoices
      .mockRejectedValueOnce(new Error('API down'))
      .mockResolvedValue(ok({ results: [], count: 0 }));
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(api.getFinanceInvoices).toHaveBeenCalled();
  });

  it('renders invoice numbers after a successful load', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    expect(screen.getByText('INV-002')).toBeInTheDocument();
    expect(screen.getByText('INV-003')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // --- R-F1: interaction / filters / dialogs ---

  it('sends the selected status filter to the invoices API', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    const filter = screen.getByLabelText('الحالة');
    await user.click(filter);
    await user.click(await screen.findByRole('option', { name: 'مدفوعة' }));
    await waitFor(() => {
      expect(api.getFinanceInvoices).toHaveBeenCalledWith(expect.objectContaining({ status: 'PAID', page_size: 100 }));
    });
  });

  it('opens the invoice detail dialog from the row action', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تفاصيل' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes the invoice detail dialog with the close button', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تفاصيل' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getAllByRole('button', { name: 'إغلاق' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the pay dialog with the invoice number in its title', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تحصيل' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/تحصيل الفاتورة/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'تأكيد التحصيل' })).toBeInTheDocument();
  });

  it('prefills the payment amount with the outstanding balance', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-002')).getByRole('button', { name: 'دفعة إضافية' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('spinbutton')).toHaveValue(500);
  });

  // --- R-F4: validation ---

  it('rejects a zero payment amount without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تحصيل' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByRole('spinbutton');
    // The field is controlled with a balance fallback when empty — set directly.
    fireEvent.change(amount, { target: { value: '0' } });
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التحصيل' }));
    // MUI marks the background aria-hidden while a dialog is open.
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('المبلغ يجب أن يكون أكبر من صفر.');
    expect(api.payFinanceInvoice).not.toHaveBeenCalled();
  });

  it('rejects an amount above the remaining balance', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-002')).getByRole('button', { name: 'دفعة إضافية' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByRole('spinbutton');
    fireEvent.change(amount, { target: { value: '999' } });
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التحصيل' }));
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('المبلغ المدخل يتجاوز المتبقي.');
    expect(api.payFinanceInvoice).not.toHaveBeenCalled();
  });

  it('disables the cancellation confirm button until a reason is typed', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'إلغاء' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'اعتماد الإلغاء' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), 'سبب الاختبار');
    expect(confirm).toBeEnabled();
  });

  it('disables the refund confirm button until a reason is typed', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-002')).getByRole('button', { name: 'استرداد' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'اعتماد الاسترداد' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), `سبب الاختبار`);
    expect(confirm).toBeEnabled();
  });

  // --- R-F5: API calls and failures ---

  it('pays the invoice and reports success', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تحصيل' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التحصيل' }));
    await waitFor(() => {
      expect(api.payFinanceInvoice).toHaveBeenCalledWith('inv-1', expect.objectContaining({ amount: 1000, method: 'CASH' }));
    });
    expect(toasts.notifySuccess).toHaveBeenCalled();
  });

  it('shows an alert when the pay API rejects', async () => {
    api.payFinanceInvoice.mockRejectedValue(new Error('pay failed'));
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'تحصيل' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التحصيل' }));
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('pay failed');
  });

  it('submits a cancellation with the typed reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-001')).getByRole('button', { name: 'إلغاء' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'سبب الإلغاء');
    await user.click(within(dialog).getByRole('button', { name: 'اعتماد الإلغاء' }));
    await waitFor(() => {
      expect(api.cancelFinanceInvoice).toHaveBeenCalledWith('inv-1', { reason: 'سبب الإلغاء' });
    });
  });

  it('shows an alert when the refund API rejects', async () => {
    api.refundFinanceInvoice.mockRejectedValue(new Error('refund failed'));
    const user = userEvent.setup();
    renderPage();
    await openInvoices(user);
    await user.click(within(rowFor('INV-002')).getByRole('button', { name: 'استرداد' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'سبب الاسترداد');
    await user.click(within(dialog).getByRole('button', { name: 'اعتماد الاسترداد' }));
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('refund failed');
  });

  it('approves a paid invoice from the review view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'المراجعة المالية' }));
    const row = await screen.findByText('INV-003').then((el) => el.closest('tr') as HTMLElement);
    await user.click(within(row).getByRole('button', { name: 'اعتماد التسوية' }));
    await waitFor(() => expect(api.reviewFinanceInvoice).toHaveBeenCalledWith('inv-3'));
  });

  it('creates a fee from the fee dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'بنود الرسوم' }));
    await user.click(await screen.findByRole('button', { name: 'إضافة بند رسوم' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/الاسم بالعربية/), 'رسم اختبار');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(api.createFinanceFee).toHaveBeenCalled());
  });

  it('shows an alert when fee creation rejects', async () => {
    api.createFinanceFee.mockRejectedValue(new Error('fee failed'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'بنود الرسوم' }));
    await user.click(await screen.findByRole('button', { name: 'إضافة بند رسوم' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('fee failed');
  });
});
