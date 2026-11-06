import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n';
import authReducer from '../../store/slices/authSlice';
import arLocale from '../../i18n/locales/ar.json';
import enLocale from '../../i18n/locales/en.json';
import LaboratoryDirectorPage from './LaboratoryDirectorPage';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({}) };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'د. اختبار', email: 'test@nqp.gov.sd', role: 'LAB_DIRECTOR' } }),
}));

const { dashboardMock, tableStateFactory } = vi.hoisted(() => {
  const dashboardMock = {
    kpis: { total_samples: 0, samples_today: 0, under_testing: 0, ready_for_approval: 0, approved: 0, completed: 0, dispatched: 0, rejected: 0, overdue: 0, approval_queue: 0 },
    approval_queue: { count: 0, samples: [] },
    departments: {
      microbiology: { total: 0, completed: 0, performance_pct: 0, under_testing: 0, ready_for_approval: 0, tests_total: 0 },
      chemistry: { total: 0, completed: 0, performance_pct: 0, under_testing: 0, ready_for_approval: 0, tests_total: 0 },
      physical: { total: 0, completed: 0, performance_pct: 0, under_testing: 0, ready_for_approval: 0, tests_total: 0 },
    },
    sla: { overdue_tests: 0, at_risk_tests: 0, sla_compliance_pct: null, avg_tat_hours: null },
    equipment: { total: 0, overdue: 0, due_soon: 0, by_status: {} },
    reagents: { total: 0, expired: 0, low: 0 },
    nonconformity: { open: 0, closed: 0, capa_open: 0 },
    audit: { today: 0, total: 0 },
    by_source: [],
    decisions: { approved: 0, rejected: 0, compliant_pct: null },
    avg_completion_hours: null,
    by_classification: {},
  };
  const tableStateFactory = () => ({
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
  return { dashboardMock, tableStateFactory };
});

vi.mock('../../hooks/useServerTable', () => ({
  useServerTable: () => tableStateFactory(),
}));

vi.mock('../../api/endpoints/foodlab', () => ({
  getLabDirectorDashboard: vi.fn().mockResolvedValue({ data: { data: dashboardMock } }),
  getLabSamples: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLabEquipment: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getReagents: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getNonConformities: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getAuditLogs: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCertificates: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  approveSample: vi.fn().mockResolvedValue({}),
}));

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
      <LaboratoryDirectorPage />
    </MemoryRouter>
  </Provider>
);

describe('LaboratoryDirectorPage — i18n smoke + reactivity', () => {
  it('renders and updates UI when language changes ar → en', async () => {
    await i18n.changeLanguage('ar');
    renderPage();

    // Arabic baseline (hero title)
    expect(await screen.findByText('لوحة مدير المختبر')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    await waitFor(() => {
      expect(screen.queryByText('Laboratory Director Dashboard')).toBeTruthy();
    });
  });
});
