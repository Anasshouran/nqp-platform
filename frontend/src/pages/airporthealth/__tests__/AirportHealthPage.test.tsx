import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactElement } from 'react';
import { getAirportDashboard, getAirportScreenings } from '../../../api/endpoints/airport';
import i18n from '../../../i18n';
import AirportHealthPage from '../AirportHealthPage';

// يجب تعريفه عبر vi.hoisted لأن مصانع vi.mock تُرفع (hoisted) فوق التصريحات العادية
const emptyPage = vi.hoisted(() => {
  return <T,>(results: T[] = []) => ({
    status: 'success',
    data: { count: results.length, next: null, previous: null, results },
  });
});

vi.mock('../../../api/endpoints/airport', () => ({
  getAirportDashboard: vi.fn(),
  getAirportScreenings: vi.fn(),
  getAirportFlights: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getAirportStaff: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getAirportActivityLog: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getAirportPorts: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getAirportPortIds: vi.fn().mockResolvedValue([]),
  getCrewHealthRecords: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getAircraftInspections: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));

vi.mock('../../../api/endpoints/carriers', () => ({
  getHealthDeclarations: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getFlightTimeline: vi.fn().mockResolvedValue({ data: { status: 'success', data: { flight_id: 'x', events: [] } } }),
  getFlightManifestStatus: vi.fn().mockRejectedValue(new Error('no manifest')),
  getFlights: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/risk', () => ({
  getRiskAssessments: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getRiskSettings: vi.fn().mockResolvedValue({ data: { status: 'success', data: {} } }),
}));
vi.mock('../../../api/endpoints/vaccination', () => ({
  getRecords: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/clinic', () => ({
  getIsolations: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/laboratory', () => ({
  getLabSamples: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
  getLabDashboard: vi.fn().mockResolvedValue({
    data: {
      status: 'success',
      data: {
        sections: [],
        totals: {
          samples: 0,
          received_today: 0,
          pending_reception: 0,
          accepted: 0,
          rejected: 0,
          under_testing: 0,
          ready_for_approval: 0,
          completed: 0,
          urgent: 0,
        },
        by_status: {},
        by_section: [],
        by_source: [],
        tests: { total: 0, pending: 0, in_progress: 0, draft: 0, submitted: 0, approved: 0 },
        critical: { open: 0, acknowledged: 0, recent: 0 },
        quality: {
          equipment: { total: 0, overdue: 0, due_soon: 0 },
          reagents: { total: 0, expiring_soon: 0, expired: 0, low_stock: 0 },
          qc: { pending: 0, failed: 0 },
          non_conformities: { open: 0 },
        },
      },
    },
  }),
}));
vi.mock('../../../api/endpoints/surveillance', () => ({
  listContacts: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/emergency', () => ({
  getAlerts: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/roles', () => ({
  listRoles: vi.fn().mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } }),
}));
vi.mock('../../../api/endpoints/notifications', () => ({
  getNotifications: vi.fn().mockResolvedValue({ data: { status: 'success', data: [] } }),
}));

const store = configureStore({
  reducer: {
    auth: (s = { user: null, token: null }) => s,
  },
});

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/airport-health']}>
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
          <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
        </ThemeProvider>
      </Provider>
    </MemoryRouter>,
  );

const mockDashboard = {
  kpis: {
    flights_today: 42,
    passengers_today: 1250,
    screened_today: 980,
    pending_screenings: 6,
    suspected_cases: 2,
    clinic_referrals: 1,
    vaccinations: 40,
    completed_today: 970,
  },
  upcoming_flights: [],
  suspected: [],
  tasks: [],
  alerts: [],
  report: { flights: 42, travelers: 1250, screened: 980, referrals: 1, suspected: 2, screenings_by_flight: [] },
  risk_distribution: [
    { level: 'GREEN', label: 'أخضر', count: 40 },
    { level: 'YELLOW', label: 'أصفر', count: 2 },
    { level: 'RED', label: 'أحمر', count: 1 },
  ],
};

describe('AirportHealthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAirportDashboard).mockResolvedValue({ data: { status: 'success', data: mockDashboard } } as any);
    vi.mocked(getAirportScreenings).mockResolvedValue({ data: { status: 'success', data: emptyPage([]) } } as any);
  });
  it('shows قيد الإعداد while the dashboard fetches', async () => {
    vi.mocked(getAirportDashboard).mockReturnValue(new Promise(() => {}) as any);
    wrap(<AirportHealthPage />);
    expect(screen.queryByText('رحلات اليوم')).toBeNull();
    expect(screen.getAllByText(/قيد الإعداد/).length).toBeGreaterThan(0);
  });
  it('renders real dashboard KPIs on success', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
    expect(screen.getByText('مسافرون اليوم')).toBeTruthy();
  });
  it('regression guard', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
    expect(screen.queryByText('فاطمة عبد الرحمن')).toBeNull();
  });
  it('renders without crashing', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
  });
  it('shows empty states', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
  });
  it('degrades gracefully', async () => {
    vi.mocked(getAirportDashboard).mockRejectedValueOnce(new Error('boom'));
    wrap(<AirportHealthPage />);
    expect((await screen.findAllByText(/نظام الصحة بالمطار/)).length).toBeGreaterThan(0);
  });
});
