import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n';
import authReducer from '../../store/slices/authSlice';
import arLocale from '../../i18n/locales/ar.json';
import enLocale from '../../i18n/locales/en.json';
import SurveillanceModulePage from './SurveillanceModulePage';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({}) };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'مستخدم اختبار', email: 'test@nqp.gov.sd', role: 'SURVEILLANCE_OFFICER' } }),
}));

const { dashboardMock, tableStateFactory } = vi.hoisted(() => {
  const dashboardMock = {
    total_cases: 0,
    cases_today: 0,
    confirmed_cases: 0,
    dead_cases: 0,
    active_alerts: 0,
    open_events: 0,
    level_counts: {},
    cases_by_disease: [],
    cases_by_port: [],
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

vi.mock('../../api/endpoints/surveillance', () => ({
  getSurveillanceDashboard: vi.fn().mockResolvedValue({ data: { data: dashboardMock } }),
  listAlerts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  listCases: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  listContacts: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  listInvestigations: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  listReportableDiseases: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  listWeeklyReports: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  ackAlert: vi.fn().mockResolvedValue({}),
  addContactFollowUp: vi.fn().mockResolvedValue({}),
  closeAlert: vi.fn().mockResolvedValue({}),
  createCase: vi.fn().mockResolvedValue({}),
  createContact: vi.fn().mockResolvedValue({}),
  createInvestigation: vi.fn().mockResolvedValue({}),
  createWeeklyReport: vi.fn().mockResolvedValue({}),
  respondAlert: vi.fn().mockResolvedValue({}),
  runEwars: vi.fn().mockResolvedValue({ data: { data: { created: 0 } } }),
  transitionCase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../api/endpoints/masterdata', () => ({
  getMasterEntryPoints: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
}));

vi.mock('../../api/endpoints/organization', () => ({
  getSectors: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
}));

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  },
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
      <SurveillanceModulePage />
    </MemoryRouter>
  </Provider>
);

describe('SurveillanceModulePage — i18n smoke + reactivity', () => {
  it('renders and updates UI when language changes ar → en', async () => {
    await i18n.changeLanguage('ar');
    renderPage();

    // Arabic baseline (hero title)
    expect(await screen.findByText('الترصد الصحي')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    await waitFor(() => {
      expect(screen.queryByText('Health Surveillance')).toBeTruthy();
    });
  });
});
