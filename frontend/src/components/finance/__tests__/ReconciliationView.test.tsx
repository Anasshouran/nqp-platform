/**
 * F6 — reconciliation totals come from one source:
 *   - the total card uses `table.count`
 *   - the status cards use `table.fetchAllRows()`
 * The old duplicate `load()` helper no longer exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconciliationView from '../ReconciliationView';
import { useServerTable } from '../../../hooks/useServerTable';
import * as financeApi from '../../../api/endpoints/finance';

vi.mock('../../../hooks/useServerTable', () => ({
  useServerTable: vi.fn(),
}));

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceReconciliations: vi.fn(),
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

describe('F6 — reconciliation totals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useServerTable).mockReturnValue(tableValue as never);
    api.createFinanceReconciliation.mockResolvedValue({ data: { data: {} } });
  });

  it('uses table.count for the total card', async () => {
    render(<ReconciliationView />);
    expect(await screen.findByText('250')).toBeInTheDocument();
    // Totals are refreshed exactly once on mount.
    expect(mockFetchAllRows).toHaveBeenCalledTimes(1);
  });

  it('afterMutate calls refresh then fetchAllRows once each (no load())', async () => {
    const user = userEvent.setup();
    render(<ReconciliationView />);
    await screen.findByText('250');

    mockRefresh.mockClear();
    mockFetchAllRows.mockClear();

    await user.click(screen.getByRole('button', { name: /تسوية جديدة/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /حفظ التسوية/ }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockFetchAllRows).toHaveBeenCalledTimes(1);
    });
    // The legacy duplicate loader is gone: only the mocked table API exists.
    expect(api.getFinanceReconciliations).not.toHaveBeenCalled();
  });
});
