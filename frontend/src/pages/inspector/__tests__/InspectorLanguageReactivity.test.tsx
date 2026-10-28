/**
 * Inspector Round 3a — language reactivity (Phase 3c).
 *
 * QuarantineInspectorPage and InspectorDashboardPage must render in Arabic
 * (default) and re-render in English after a language switch.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';

import QuarantineInspectorPage from '../../quarantine/QuarantineInspectorPage';
import InspectorDashboardPage from '../InspectorDashboardPage';

const foodApi = vi.hoisted(() => ({
  getInspections: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getShipments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getSamples: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  inspectShipment: vi.fn().mockResolvedValue({ data: { data: {} } }),
  createSample: vi.fn().mockResolvedValue({ data: { data: { sample_barcode: 'FS-001' } } }),
  logout: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../api/endpoints/food', () => foodApi);
vi.mock('../../../api/endpoints/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'أحمد علي', email: 'inspector@nqp.gov.sd' } }),
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

vi.mock('../../../components/command', () => ({
  CommandSectionRail: () => null,
  useCommandSections: () => ({ active: 0, register: vi.fn(), scrollTo: vi.fn() }),
}));

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock flexibility for reducer type
const store = configureStore({ reducer: { auth: authReducer as any } });
const wrap = (ui: ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('Inspector pages language reactivity', () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('QuarantineInspectorPage AR→EN', async () => {
    render(wrap(<QuarantineInspectorPage />));
    await screen.findByText('سجل التفتيش');
    await i18n.changeLanguage('en');
    await screen.findByText('Inspection Log');
  });

  it('InspectorDashboardPage AR→EN', async () => {
    render(wrap(<InspectorDashboardPage />));
    const titles = await screen.findAllByText('الرئيسية');
    expect(titles.length).toBeGreaterThan(0);
    await i18n.changeLanguage('en');
    await screen.findAllByText('Home');
  });
});
