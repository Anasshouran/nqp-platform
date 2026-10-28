/**
 * Quality Round 3b — language reactivity (Phase 3c).
 *
 * QualityAssurancePage must render in Arabic (default) and re-render in English
 * after a language switch. Lab API, lab scope and toasts are mocked; the real
 * useServerTable, auth store and i18n instance are used.
 */
import type { ReactNode } from 'react';
import { describe, it, afterEach, vi } from 'vitest';
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

import QualityAssurancePage from '../QualityAssurancePage';

const foodlabApi = vi.hoisted(() => ({
  getQaDashboard: vi.fn().mockResolvedValue({ data: { data: {
    specs: { active: 0 },
    qc: { failed: 0, passed: 0, pending: 0, pass_rate: 0 },
    compliance: { result_pct: 0 },
    equipment: { overdue: 0, due_soon: 0, calibration_pct: 0 },
    nonconformity: { open: 0, capa_open: 0, closed_pct: 0 },
    reagents: { expired: 0, valid_pct: 0 },
    audit: { today: 0 },
    methods: { active: 0, total: 0, compliance_pct: 0 },
    by_section: [], by_disease: [], by_source: []
  } } }),
  getMicroSpecifications: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getQcRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getReagents: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getNonConformities: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getCapaRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getAuditLogs: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLabSampleTests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLabEquipment: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
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

const store = configureStore({ reducer: { auth: authReducer as any } }); // eslint-disable-line @typescript-eslint/no-explicit-any
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

  it('QualityAssurancePage AR→EN', async () => {
    console.log('i18n title:', i18n.t('quality.qualityAssurance.dashboard.title'));
    console.log('i18n eyebrow:', i18n.t('quality.qualityAssurance.dashboard.eyebrow'));
    render(wrap(<QualityAssurancePage />));
    await screen.findByText('مراقبة الجودة');
    await i18n.changeLanguage('en');
    await screen.findByText('Quality Assurance');
  });
});
