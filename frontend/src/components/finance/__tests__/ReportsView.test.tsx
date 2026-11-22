/**
 * F5b — ReportsView is fully localized via `finance.reports.*`.
 * All seven report endpoints (Promise.allSettled) are mocked with their real
 * envelope shape from `types/finance.ts`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '../../../i18n';
import ReportsView from '../ReportsView';
import * as financeApi from '../../../api/endpoints/finance';

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceSummary: vi.fn(),
  getFinanceMonthly: vi.fn(),
  getFinanceNational: vi.fn(),
  getFinanceByChannel: vi.fn(),
  getFinanceVariation: vi.fn(),
  getFinanceMatrix: vi.fn(),
  getFinanceArrearsAging: vi.fn(),
  getFinanceReportsExport: vi.fn(),
}));

const ok = <T,>(data: T) => Promise.resolve({ data: { data } });

const emptySummary = {
  today: { collected: 0, count: 0 },
  revenue: { total: 0, count: 0 },
  pending_count: 0,
  overdue: { count: 0, amount: 0 },
  funnel: {},
};

const wrap = async (lang: 'ar' | 'en') => {
  await i18n.changeLanguage(lang);
  return render(<ReportsView />);
};

describe('ReportsView — i18n', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('ar');
    vi.mocked(financeApi.getFinanceSummary).mockReturnValue(ok(emptySummary) as never);
    vi.mocked(financeApi.getFinanceMonthly).mockReturnValue(ok({ series: [], by_sector: [] }) as never);
    vi.mocked(financeApi.getFinanceNational).mockReturnValue(ok({}) as never);
    vi.mocked(financeApi.getFinanceByChannel).mockReturnValue(ok({ items: [], total: 0 }) as never);
    vi.mocked(financeApi.getFinanceVariation).mockReturnValue(ok({
      issued: { count: 0 },
      paid: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }) as never);
    vi.mocked(financeApi.getFinanceMatrix).mockReturnValue(ok({ rows: [] }) as never);
    vi.mocked(financeApi.getFinanceArrearsAging).mockReturnValue(ok({
      buckets: [], total_count: 0, total_amount: 0,
    }) as never);
  });

  afterEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('renders Arabic title', async () => {
    await wrap('ar');
    expect(await screen.findByText('التقارير المالية')).toBeInTheDocument();
  });

  it('renders English title', async () => {
    await wrap('en');
    expect(await screen.findByText('Financial Reports')).toBeInTheDocument();
  });

  it('renders empty state in ar', async () => {
    await wrap('ar');
    expect((await screen.findAllByText(/لا توجد بيانات بعد/)).length).toBeGreaterThan(0);
  });

  it('interpolates summary count in en', async () => {
    vi.mocked(financeApi.getFinanceSummary).mockReturnValue(ok({
      ...emptySummary,
      revenue: { total: 100, count: 5 },
    }) as never);
    await wrap('en');
    expect(await screen.findByText(/5 paid invoice/i)).toBeInTheDocument();
  });

  // --- F15 — Promise.allSettled must not hide a missing report endpoint ---
  it('calls getFinanceSummary exactly once on mount', async () => {
    await wrap('ar');
    await waitFor(() => {
      expect(financeApi.getFinanceSummary).toHaveBeenCalledTimes(1);
    });
  });

  it('calls getFinanceMonthly exactly once on mount', async () => {
    await wrap('ar');
    await waitFor(() => {
      expect(financeApi.getFinanceMonthly).toHaveBeenCalledTimes(1);
    });
  });

  it('calls getFinanceMatrix exactly once on mount', async () => {
    await wrap('ar');
    await waitFor(() => {
      expect(financeApi.getFinanceMatrix).toHaveBeenCalledTimes(1);
    });
  });
});
