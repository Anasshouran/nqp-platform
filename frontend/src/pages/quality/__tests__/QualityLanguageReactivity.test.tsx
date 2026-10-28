/**
 * Quality Round 3c — language reactivity (Phase 3c).
 *
 * StandardsReviewPage must render in Arabic (default) and re-render in English
 * after a language switch.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import arLocale from '../../../i18n/locales/ar.json';
import enLocale from '../../../i18n/locales/en.json';

// Register quality namespace with i18n
i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

import StandardsReviewPage from '../../standards/StandardsReviewPage';

const foodlabApi = vi.hoisted(() => ({
  getStandards: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getStandardVersions: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getStandardRequirements: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getAnalyticalMethods: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getRegulatoryRules: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getStandardsDashboard: vi.fn().mockResolvedValue({ data: { data: {
    total_standards: 0,
    active_versions: 0,
    chemical_requirements: 0,
    micro_requirements: 0,
    validated_methods: 0,
    active_rules: 0
  } } }),
  createStandard: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateStandard: vi.fn().mockResolvedValue({ data: { data: {} } }),
  deleteStandard: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createStandardVersion: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateStandardVersion: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createStandardRequirement: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateStandardRequirement: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createAnalyticalMethod: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateAnalyticalMethod: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createRegulatoryRule: vi.fn().mockResolvedValue({ data: { data: {} } }),
  updateRegulatoryRule: vi.fn().mockResolvedValue({ data: { data: {} } }),
}));
vi.mock('../../../api/endpoints/foodlab', () => foodlabApi);

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'أحمد علي', email: 'qa@nqp.gov.sd' } }),
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

vi.mock('../../../components/command', () => ({
  CommandSectionRail: () => null,
  useCommandSections: () => ({ active: 0, register: vi.fn(), scrollTo: vi.fn() }),
}));

const store = configureStore({ reducer: { auth: authReducer as any } });
const wrap = (ui: ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('Quality pages language reactivity', () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('StandardsReviewPage AR→EN', async () => {
    render(wrap(<StandardsReviewPage />));
    await screen.findByText('مراجعة المواصفات والمطابقة');
    await i18n.changeLanguage('en');
    await screen.findByText('Standards Review Dashboard');
  });
});
