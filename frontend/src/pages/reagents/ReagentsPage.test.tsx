import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n';
import authReducer from '../../store/slices/authSlice';
import arLocale from '../../i18n/locales/ar.json';
import enLocale from '../../i18n/locales/en.json';
import ReagentsPage from './ReagentsPage';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({}) };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'مستخدم اختبار', email: 'test@nqp.gov.sd', role: 'LAB_OFFICER' } }),
}));

const tableState = () => ({
  rows: [],
  count: 0,
  loading: false,
  error: null,
  page: 1,
  rowsPerPage: 10,
  pageSizeOptions: [10, 25, 50, 100],
  search: '',
  searchInput: '',
  sortBy: '',
  sortOrder: 'asc' as const,
  refresh: vi.fn(),
  setSearchInput: vi.fn(),
  setPage: vi.fn(),
  setRowsPerPage: vi.fn(),
  setSorting: vi.fn(),
  setFilter: vi.fn(),
  resetFilters: vi.fn(),
  fetchAllRows: vi.fn().mockResolvedValue([]),
});

vi.mock('../../hooks/useServerTable', () => ({
  useServerTable: () => tableState(),
}));

vi.mock('../../api/endpoints/foodlab', () => {
  const paginated = { data: { data: { results: [], count: 0 } } };
  return {
    getMaterials: vi.fn().mockResolvedValue(paginated),
    getMaterialLots: vi.fn().mockResolvedValue(paginated),
    getSolutions: vi.fn().mockResolvedValue(paginated),
    getMaterialIssues: vi.fn().mockResolvedValue(paginated),
    getDisposalRequests: vi.fn().mockResolvedValue(paginated),
    getStorageLocations: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
    getMaterialManagementDashboard: vi.fn().mockResolvedValue({ data: { data: { kpis: { total_materials: 0, total_stock: 0, expired: 0, expiring_30: 0, low_stock: 0, solutions_pending: 0, solutions_approved: 0, disposals_pending: 0 }, low_stock_materials: [], recent_issues: [], pending_solutions: [], pending_disposals: [], type_counts: [] } } }),
    getExpiryReport: vi.fn().mockResolvedValue({ data: { data: { expired: [], expiring_30: [], expiring_90: [] } } }),
    createMaterial: vi.fn().mockResolvedValue({}),
    updateMaterial: vi.fn().mockResolvedValue({}),
    createMaterialLot: vi.fn().mockResolvedValue({}),
    createSolution: vi.fn().mockResolvedValue({}),
    updateSolution: vi.fn().mockResolvedValue({}),
    verifySolution: vi.fn().mockResolvedValue({}),
    createMaterialIssue: vi.fn().mockResolvedValue({}),
    createDisposalRequest: vi.fn().mockResolvedValue({}),
    disposeRequestAction: vi.fn().mockResolvedValue({}),
  };
});

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  window.matchMedia = window.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
  window.scrollTo = vi.fn();
});

afterAll(async () => {
  await i18n.changeLanguage('ar');
});

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <MemoryRouter>
      <ReagentsPage />
    </MemoryRouter>
  </Provider>
);

describe('ReagentsPage — i18n smoke + reactivity', () => {
  it('renders and updates UI when language changes ar → en', async () => {
    await i18n.changeLanguage('ar');
    renderPage();

    // Arabic baseline (hero title / page content)
    expect(await screen.findByText('إدارة الكواشف والمحاليل')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    await waitFor(() => {
      expect(screen.queryByText('Reagents & Solutions Management')).toBeTruthy();
    });
  });
});
