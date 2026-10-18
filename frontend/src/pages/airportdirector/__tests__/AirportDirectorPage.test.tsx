import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  },
);

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);

// chart.js needs a real canvas, which jsdom does not provide — render stubs instead.
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { full_name: 'مديرة الاختبار' }, token: 'test-token', isAuthenticated: true }),
}));

const airportApi = vi.hoisted(() => ({ getAirportActivityLog: vi.fn() }));
vi.mock('../../../api/endpoints/airport', () => airportApi);

import AirportDirectorPage from '../AirportDirectorPage';
import { getAirportActivityLog } from '../../../api/endpoints/airport';

/* ------------------------------- helpers ------------------------------- */

const page = (results: unknown[]) => ({
  data: { status: 'success', data: { count: results.length, next: null, previous: null, results } },
});

const activityFixture = [
  {
    id: 'al-1',
    created_at: '2026-10-18T10:00:00Z',
    actor: 'u1',
    actor_name: 'مديرة الاختبار',
    actor_display: 'مديرة الاختبار',
    action: 'SCREENING_CREATED',
    action_label: 'فحص مسافر',
    description: 'فحص مسافر — مسافر الاختبار',
    target_type: 'AirportScreening',
    target_id: 's-1',
    target_label: 'مسافر الاختبار',
    airport: 'p1',
    airport_name: 'مطار الاختبار',
    metadata: {},
    ip_address: null,
  },
];

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/airport-director']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAirportActivityLog).mockResolvedValue(page([]) as never);
});

/* --------------------------------- tests -------------------------------- */

describe('AirportDirectorPage', () => {
  it('renders the page shell', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.getByText(/لوحة القيادة التنفيذية/)).toBeTruthy();
  });

  it('renders the activity-log card heading', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.getByText('📋 سجل الأنشطة')).toBeTruthy();
  });

  it('does not render the retired static ACTIVITY_LOG placeholder rows', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.queryByText('اعتماد فسح رحلة الشحن الجوي')).toBeNull();
  });

  it('renders activity-log entries from getAirportActivityLog', async () => {
    vi.mocked(getAirportActivityLog).mockResolvedValue(page(activityFixture) as never);
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('فحص مسافر — مسافر الاختبار')).toBeTruthy();
    expect(screen.getByText('مديرة الاختبار')).toBeTruthy();
  });

  it('shows the honest empty state when no activity-log entries exist', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('لا يوجد نشاط مسجّل')).toBeTruthy();
  });

  it('shows the error state when the activity-log call fails', async () => {
    vi.mocked(getAirportActivityLog).mockRejectedValue(new Error('boom'));
    wrap(<AirportDirectorPage />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('polls getAirportActivityLog every 30s', () => {
    vi.useFakeTimers();
    wrap(<AirportDirectorPage />);
    expect(getAirportActivityLog).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(getAirportActivityLog).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(getAirportActivityLog).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
