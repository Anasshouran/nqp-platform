/**
 * F6/F4b — reconciliation totals come from one source:
 *   - the total card uses `table.count`
 *   - the status cards use the server-side totals endpoint (one API call)
 * The old duplicate `load()` helper and client-side `fetchAllRows()` loop
 * no longer exist.
 *
 * F5c-i18n — four additional tests cover locale switching, the raw-code
 * `totals` keys (no more Arabic-label coupling), and locale-aware formatting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import ReconciliationView from '../ReconciliationView';
import { useServerTable } from '../../../hooks/useServerTable';
import * as financeApi from '../../../api/endpoints/finance';

vi.mock('../../../hooks/useServerTable', () => ({
  useServerTable: vi.fn(),
}));

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceReconciliations: vi.fn(),
  getFinanceReconciliationTotals: vi.fn(),
  createFinanceReconciliation: vi.fn(),
  getFinanceReconciliationPreview: vi.fn(),
  sealFinanceReconciliation: vi.fn(),
  resolveFinanceReconciliation: vi.fn(),
}));

const api = financeApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockFetchAllRows = vi.fn().mockResolvedValue([]);

const tableValue = {
  rows: [],
  count: 250,
  loading: false,
  error: null,
  page: 1,
  rowsPerPage: 25,
  pageSizeOptions: [25, 50, 100],
  search: '',
  searchInput: '',
  sortBy: '',
  sortOrder: 'asc',
  refresh: mockRefresh,
  setSearchInput: vi.fn(),
  setPage: vi.fn(),
  setRowsPerPage: vi.fn(),
  setSorting: vi.fn(),
  setFilter: vi.fn(),
  resetFilters: vi.fn(),
  fetchAllRows: mockFetchAllRows,
};

const wrap = async (lang: 'ar' | 'en') => {
  await i18n.changeLanguage(lang);
  return render(
    <I18nextProvider i18n={i18n}>
      <ReconciliationView />
    </I18nextProvider>,
  );
};

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
  vi.mocked(useServerTable).mockReturnValue(tableValue as never);
  mockFetchAllRows.mockResolvedValue([]);
  api.getFinanceReconciliationTotals.mockResolvedValue({ data: { data: {} } });
  api.createFinanceReconciliation.mockResolvedValue({ data: { data: {} } });
});

afterEach(async () => {
  await i18n.changeLanguage('ar');
});

describe('F6 — reconciliation totals', () => {
  it('uses table.count for the total card', async () => {
    render(<ReconciliationView />);
    expect(await screen.findByText('250')).toBeInTheDocument();
    // Totals are refreshed exactly once on mount via the server-side endpoint.
    expect(api.getFinanceReconciliationTotals).toHaveBeenCalledTimes(1);
  });

  it('afterMutate calls refresh then reloadTotals (not fetchAllRows)', async () => {
    const user = userEvent.setup();
    render(<ReconciliationView />);
    await screen.findByText('250');

    mockRefresh.mockClear();
    api.getFinanceReconciliationTotals.mockClear();

    await user.click(screen.getByRole('button', { name: /تسوية جديدة/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /حفظ التسوية/ }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(api.getFinanceReconciliationTotals).toHaveBeenCalledTimes(1);
    });
    // No client-side all-rows loop; the legacy duplicate loader is gone.
    expect(mockFetchAllRows).not.toHaveBeenCalled();
    expect(api.getFinanceReconciliations).not.toHaveBeenCalled();
  });
});

describe('ReconciliationView — i18n', () => {
  it('renders Arabic title', async () => {
    await wrap('ar');
    expect(await screen.findByText('المطابقة المالية (التسويات)')).toBeInTheDocument();
  });

  it('renders English title', async () => {
    await wrap('en');
    expect(await screen.findByText('Financial Reconciliation')).toBeInTheDocument();
  });

  it('uses raw status keys for totals (bug fix)', async () => {
    api.getFinanceReconciliationTotals.mockResolvedValue({
      data: { data: { MATCHED: 2, DRAFT: 1, DISCREPANCY: 0, RESOLVED: 0 } },
    });
    await wrap('ar');

    const matchedLabel = await screen.findByText('مطابقة');
    const matchedCard = matchedLabel.closest('.MuiCard-root') as HTMLElement;
    expect(within(matchedCard).getByText('2')).toBeInTheDocument();

    const pendingCard = screen.getByText('فروقات معلقة').closest('.MuiCard-root') as HTMLElement;
    expect(within(pendingCard).getByText('1')).toBeInTheDocument();
  });

  it('formats money/dates in en locale when language=en', async () => {
    vi.mocked(useServerTable).mockReturnValue({
      ...tableValue,
      rows: [{
        id: 'r-1',
        period_start: '2026-01-02T12:00:00Z',
        period_end: '2026-01-03T12:00:00Z',
        channel: 'BANK',
        system_total: 1000,
        channel_total: 1000,
        difference: 0,
        matched_count: 1,
        discrepancy_count: 0,
        status: 'MATCHED',
        created_by_name: 'Tester',
        matches: [],
        discrepancies: [],
      }],
    } as never);

    await wrap('en');
    expect((await screen.findAllByText('1,000')).length).toBeGreaterThan(0);
    // The period cell renders `{start} ← {end}` as separate text nodes, so
    // assert against the rendered document text rather than an exact node.
    const expectedDate = new Date('2026-01-02T12:00:00Z').toLocaleDateString('en-US');
    expect(document.body.textContent).toContain(expectedDate);
    expect(document.body.textContent).not.toContain('١٬٠٠٠');
  });
});

describe('ReconciliationView — real fetch contract (un-mocked useServerTable)', () => {
  it('calls getFinanceReconciliations through the real table hook', async () => {
    vi.resetModules();
    vi.doUnmock('../../../hooks/useServerTable');

    // Re-import after resetModules: the dynamically loaded view receives a
    // fresh copy of the mocked finance module.
    const { getFinanceReconciliations } = await import('../../../api/endpoints/finance');
    vi.mocked(getFinanceReconciliations).mockResolvedValue({
      data: { data: { results: [], count: 0 } },
    } as never);

    const { default: RealReconciliationView } = await import('../ReconciliationView');
    render(
      <I18nextProvider i18n={i18n}>
        <RealReconciliationView />
      </I18nextProvider>,
    );

    await waitFor(() => {
      // The real table hook loads the visible page; the stat cards use the
      // dedicated totals endpoint instead of an all-rows loop.
      expect(getFinanceReconciliations).toHaveBeenCalled();
      expect(getFinanceReconciliations).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, page_size: 25 }),
      );
    });
  });
});
