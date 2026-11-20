import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import NationalFinancePage from '../NationalFinancePage';
import * as financeApi from '../../../api/endpoints/finance';

// Deliberately NO `react-i18next` mock: the real useTranslation hook must be
// active so a hook-order violation (the old conditional ProcessNull() call in
// the home view) would fail this test with "Rendered fewer hooks than expected".
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', full_name: 'مدير مالية اختبار', email: 'finance@nqp.gov.sd', role: 'FINANCE_DIRECTOR' },
  }),
}));
vi.mock('../../../api/endpoints/auth', () => ({ logout: vi.fn() }));
vi.mock('../../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../api/endpoints/organization', () => ({ getSectors: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceSummary: vi.fn(),
  getFinanceInvoices: vi.fn(),
  getFinancePayments: vi.fn(),
  getFinanceReceipts: vi.fn(),
  getFinanceFees: vi.fn(),
  getFinanceArrears: vi.fn(),
  createFinanceFee: vi.fn(),
  updateFinanceFee: vi.fn(),
  deactivateFinanceFee: vi.fn(),
  payFinanceInvoice: vi.fn(),
  reviewFinanceInvoice: vi.fn(),
  cancelFinanceInvoice: vi.fn(),
  refundFinanceInvoice: vi.fn(),
}));
vi.mock('../../../utils/toast', () => ({
  notifySuccess: vi.fn(), notifyError: vi.fn(), notifyInfo: vi.fn(), notifyWarning: vi.fn(),
  extractErrorMessage: vi.fn(),
}));

type ApiMocks = Record<string, ReturnType<typeof vi.fn>>;
const api = financeApi as unknown as ApiMocks;

const ok = (data: unknown) => Promise.resolve({ data: { data } });
const summary = {
  today: { collected: 0, count: 0 },
  revenue: { total: 0, count: 0 },
  pending_count: 0,
  overdue: { count: 0, amount: 0 },
  funnel: {}, // forces the conditional empty state that used to call ProcessNull()
};

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <MemoryRouter>
      <NationalFinancePage />
    </MemoryRouter>
  </Provider>,
);

describe('NationalFinancePage — hook order regression', () => {
  beforeAll(() => {
    i18n.changeLanguage('ar');
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
    api.getFinanceSummary.mockResolvedValue(ok(summary) as never);
    api.getFinanceInvoices.mockResolvedValue(ok({ results: [], count: 0 }) as never);
    api.getFinancePayments.mockResolvedValue(ok({ results: [], count: 0 }) as never);
    api.getFinanceReceipts.mockResolvedValue(ok({ results: [], count: 0 }) as never);
    api.getFinanceFees.mockResolvedValue(ok({ results: [], count: 0 }) as never);
    api.getFinanceArrears.mockResolvedValue(ok({ items: [], total: 0 }) as never);
  });

  it('keeps hook order stable when switching home -> invoices -> home with real useTranslation', async () => {
    const user = userEvent.setup();
    renderPage();

    // Home view renders ProcessNull(t) for the empty funnel.
    expect(await screen.findByText('دورة الفواتير حسب الحالة')).toBeTruthy();
    expect(screen.getAllByText('لا توجد بيانات بعد').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'الفواتير' }));
    expect(await screen.findByText('الفواتير الموحدة')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'لوحة الحسابات' }));
    expect(await screen.findByText('دورة الفواتير حسب الحالة')).toBeTruthy();
  });
});
