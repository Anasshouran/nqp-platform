/**
 * Food Round 1 — language reactivity (Phase 5b).
 */
import type { ReactNode } from 'react';
import { describe, it, afterEach, vi, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import arLocale from '../../../i18n/locales/ar.json';
import enLocale from '../../../i18n/locales/en.json';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

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

import QuarantineFeesPage from '../QuarantineFeesPage';
import FoodPage from '../FoodPage';
import LabPricingPage from '../../foodlab/LabPricingPage';
import FoodWindowPage from '../../foodWindow/FoodWindowPage';
import ChemistryLabPage from '../../foodlab/ChemistryLabPage';
import FoodSurveillancePage from '../../foodsurveillance/FoodSurveillancePage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('../../../api/endpoints/food', () => ({
  getShipments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getQuarantineFees: vi.fn().mockResolvedValue({ data: { data: {
    total_fees: 5, total_categories: 3, categories: [],
    generated_at: '2026-01-01T00:00:00Z'
  } } }),
}));

vi.mock('../../../api/endpoints/foodlab', () => ({
  getLabParameters: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLabSamples: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLabSampleTests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  deleteLabParameter: vi.fn().mockResolvedValue({}),
  createLabEquipment: vi.fn().mockResolvedValue({}),
  markLabEquipmentCalibrated: vi.fn().mockResolvedValue({}),
  markSampleTestQC: vi.fn().mockResolvedValue({}),
  getChemistryDashboard: vi.fn().mockResolvedValue({ data: { data: {
    total_samples: 100, under_testing: 10, ready_for_approval: 5,
    approved: 70, overdue_tests: 2, qc_pending: 3, qc_failed: 1,
    equipment_total: 25, calibration_overdue: 5
  } } }),
  getLabEquipment: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
}));

vi.mock('../../../api/endpoints/foodWindow', () => ({
  getWindowDashboard: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getWindows: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getTransactions: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getDecisions: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getMyScope: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getAuditLogs: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  closeTransaction: vi.fn().mockResolvedValue({}),
  createTransaction: vi.fn().mockResolvedValue({}),
  createDecision: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../api/endpoints/foodSurveillance', () => ({
  getFoodSurveillanceDashboard: vi.fn().mockResolvedValue({ data: { data: {
    kpis: { shipments: 10, samples: 5, imports: 6, exports: 4, released: 5, rejected: 2,
      nonconforming: 2, non_conformities_open: 1, alerts: 3, recalls_active: 1 },
    response_level: 'LEVEL_0',
    trend: [], alerts: [], non_conformities: [], recalls: [],
    risk: { countries: [], suppliers: [], products: [] }, lab_top: [],
    nc_distribution: { open: 5, under_investigation: 2, corrective_action: 1,
      resolved: 3, closed: 4 }
  } } }),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'أحمد علي', email: 'food@nqp.gov.sd', role: 'FOOD_OFFICER' } }),
}));

vi.mock('../../../hooks/useServerTable', () => ({
  useServerTable: () => ({
    rows: [], count: 0, loading: false, error: null,
    searchInput: '', setSearchInput: vi.fn(),
    sortBy: '', sortOrder: '', setSorting: vi.fn(),
    setPage: vi.fn(), rowsPerPage: 10, setRowsPerPage: vi.fn(),
    refresh: vi.fn(), page: 1, pageSizeOptions: [10, 25, 50],
    setFilter: vi.fn(), fetchAllRows: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useTableExport', () => ({
  useTableExport: () => ({ exporting: false, exportAll: vi.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = configureStore({ reducer: { auth: authReducer as any } });
const wrap = (ui: ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('Food pages language reactivity (Round 1)', () => {
  vi.setConfig({ testTimeout: 15000 });
  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('QuarantineFeesPage AR→EN', async () => {
    render(wrap(<QuarantineFeesPage />));
    const arEls = await screen.findAllByText(/رسوم اللائحة المالية/);
    expect(arEls.length).toBeGreaterThan(0);
    await i18n.changeLanguage('en');
    await screen.findByText(/Quarantine Fees Schedule/);
  });

  it('FoodPage AR→EN', async () => {
    render(wrap(<FoodPage />));
    await screen.findByText(/الرقابة الغذائية/);
    await i18n.changeLanguage('en');
    await screen.findByText('Food Control');
  });

  it('LabPricingPage AR→EN', async () => {
    render(wrap(<LabPricingPage />));
    await screen.findByText(/تسعير الفحوص المخبرية/);
    await i18n.changeLanguage('en');
    await screen.findByText('Laboratory Test Pricing');
  });

  it('FoodWindowPage AR→EN', async () => {
    render(wrap(<FoodWindowPage />));
    await screen.findByText('إدارة نوافذ الأغذية');
    await i18n.changeLanguage('en');
    await screen.findByText('Manage Food Windows');
  });

  it('ChemistryLabPage AR→EN', async () => {
    render(wrap(<ChemistryLabPage />));
    const arEls = await screen.findAllByText(/قسم الكيمياء/);
    expect(arEls.length).toBeGreaterThan(0);
    await i18n.changeLanguage('en');
    const enEls = await screen.findAllByText(/Chemistry Lab/);
    expect(enEls.length).toBeGreaterThan(0);
  });

  it('FoodSurveillancePage AR', async () => {
    render(wrap(<FoodSurveillancePage />));
    const arEls = await screen.findAllByText(/الترصد الغذائي/);
    expect(arEls.length).toBeGreaterThan(0);
  });
});
