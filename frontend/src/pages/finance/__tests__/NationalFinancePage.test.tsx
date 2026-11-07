import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import arLocale from '../../../i18n/locales/ar.json';
import enLocale from '../../../i18n/locales/en.json';
import NationalFinancePage from '../NationalFinancePage';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'مدير مالية اختبار', email: 'finance@nqp.gov.sd', role: 'FINANCE_DIRECTOR' } }),
}));

// mock finance API endpoints
vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceSummary: vi.fn().mockResolvedValue({ data: { data: { today: { collected: 0, count: 0 }, revenue: { total: 0, count: 0 }, pending_count: 0, overdue: { count: 0, amount: 0 }, funnel: {} } } }),
  getFinanceInvoices: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getFinancePayments: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getFinanceReceipts: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getFinanceFees: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getFinanceArrears: vi.fn().mockResolvedValue({ data: { data: { items: [], total: 0 } } }),
  createFinanceFee: vi.fn(),
  updateFinanceFee: vi.fn(),
  deactivateFinanceFee: vi.fn(),
  payFinanceInvoice: vi.fn(),
  reviewFinanceInvoice: vi.fn(),
  cancelFinanceInvoice: vi.fn(),
  refundFinanceInvoice: vi.fn(),
}));

vi.mock('../../../api/endpoints/masterdata', () => ({
  getMasterEntryPoints: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../api/endpoints/organization', () => ({
  getSectors: vi.fn().mockResolvedValue([]),
}));

beforeAll(() => {
  i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
  i18n.addResourceBundle('en', 'translation', enLocale, true, true);
});

afterAll(() => {
  i18n.changeLanguage('ar');
});

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <MemoryRouter>
      <NationalFinancePage />
    </MemoryRouter>
  </Provider>
);

describe('NationalFinancePage — reactivity', () => {
  it('updates UI when language changes ar -> en', async () => {
    i18n.changeLanguage('ar');
    renderPage();
    const arabicEls = await screen.findAllByText(/[\u0600-\u06FF]/);
    expect(arabicEls.length).toBeGreaterThan(0);

    act(() => { i18n.changeLanguage('en'); });

    await waitFor(() => {
      const enEls = screen.queryAllByText(/Finance|Invoice|Payment|Receipt|Fee|Arrears/i);
      expect(enEls.length).toBeGreaterThan(0);
    });
  });
});
