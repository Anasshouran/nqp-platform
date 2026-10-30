import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import { getFoodDirectorDashboard } from '../../../api/endpoints/food';
import FoodDirectorPage from '../FoodDirectorPage';

vi.mock('../../../api/endpoints/food');

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/food-director']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const mockDashboard = {
  period: 'MONTH',
  kpis: { shipments_period: 1234, inspections_completed: 560, samples_lab: 89, certificates_issued: 42 },
  outcomes: { released_pct: 92, rejected_pct: 4, high_risk_pct: 6, sla_pct: 95 },
  sectors_overview: [],
  alerts: [],
  lab_performance: {
    samples_received: 100,
    under_analysis: 10,
    results_completed: 80,
    delayed: 0,
    non_conforming: 0,
    sla_within: 70,
    sla_near: 20,
    sla_exceeded: 0,
  },
  kpi_table: [],
  trade: {
    import: { total: 500, released: 460, released_pct: 92, rejected: 20, rejected_pct: 4, hold: 20, hold_pct: 4 },
    export: { total: 300, released: 270, released_pct: 90, rejected: 15, rejected_pct: 5, hold: 15, hold_pct: 5 },
  },
  finance: { inspection_fees: 10000, lab_fees: 5000, certificate_fees: 3000, total: 18000 },
  staff: { inspectors: 25, busy: 5, available: 15, idle: 5 },
  certificates: { issued_today: 3, issued_period: 42, awaiting_decision: 2 },
};

const fullResponse = {
  data: { status: 'ok', data: mockDashboard },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
};

describe('FoodDirectorPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the page header', () => {
    wrap(<FoodDirectorPage />);
    expect(screen.getByText(/الإدارة العامة لرقابة الأغذية/)).toBeTruthy();
  });

  it('shows a loading state while the dashboard fetches', async () => {
    vi.mocked(getFoodDirectorDashboard).mockResolvedValue(Promise.resolve());
    wrap(<FoodDirectorPage />);
    expect(await screen.findByText(/جارٍ التحديث/)).toBeTruthy();
  });

  it('renders real dashboard KPIs on success', async () => {
    vi.mocked(getFoodDirectorDashboard).mockResolvedValue(fullResponse);
    wrap(<FoodDirectorPage />);
    await waitFor(() => expect(screen.getAllByText('الشحنات').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText('الإفراج').length).toBeGreaterThan(0));
  });

  it('never renders fabricated station-user names (regression guard)', async () => {
    vi.mocked(getFoodDirectorDashboard).mockResolvedValue(fullResponse);
    wrap(<FoodDirectorPage />);
    await waitFor(() => expect(screen.getAllByText('الشحنات').length).toBeGreaterThan(0));
    expect(screen.queryByText('خالد إبراهيم')).toBeNull();
    expect(screen.queryByText('سارة محمد')).toBeNull();
    expect(screen.queryByText('عمر حسن')).toBeNull();
  });

  it('degrades gracefully when the dashboard API fails', async () => {
    vi.mocked(getFoodDirectorDashboard).mockRejectedValueOnce(new Error('boom'));
    wrap(<FoodDirectorPage />);
    expect(await screen.findByText(/الإدارة العامة لرقابة الأغذية/)).toBeTruthy();
    expect(screen.queryByText('الشحنات')).toBeNull();
  });
});
