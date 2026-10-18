import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
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

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { full_name: 'مديرة الاختبار' }, token: 'test-token', isAuthenticated: true }),
}));

const airportApi = vi.hoisted(() => ({
  getAirportDashboard: vi.fn(),
  getCrewHealthRecords: vi.fn(),
  getAirportTerminals: vi.fn(),
  getScreeningPoints: vi.fn(),
}));
vi.mock('../../../api/endpoints/airport', () => airportApi);

import AirportDirectorPage from '../AirportDirectorPage';
import {
  getAirportDashboard,
  getCrewHealthRecords,
  getAirportTerminals,
  getScreeningPoints,
} from '../../../api/endpoints/airport';

/* ------------------------------- fixtures ------------------------------- */

const dashboardFixture = {
  kpis: {
    flights_today: 3,
    passengers_today: 120,
    pending_screenings: 2,
    screened_today: 40,
    clinic_referrals: 1,
    suspected_cases: 2,
    vaccinations: 5,
    completed_today: 30,
    inspections_today: 4,
    crew_records_today: 6,
    arrivals_today: 25,
    departures_today: 15,
  },
  upcoming_flights: [
    {
      id: 'f1',
      flight_number: 'SD-TEST-101',
      origin_country: 'السودان',
      scheduled_arrival: '2026-10-17T12:00:00Z',
      status: 'ARRIVED',
    },
  ],
  suspected: [],
  tasks: [],
  alerts: [
    {
      id: 'a1',
      subject: 'تنبيه الاختبار',
      body: 'نص التنبيه',
      created_at: '2026-10-17T12:00:00Z',
      status: 'SENT',
    },
  ],
  report: {
    flights: 3,
    travelers: 120,
    screened: 40,
    referrals: 1,
    suspected: 2,
    screenings_by_flight: [{ flight_number: 'SD-TEST-101', count: 5 }],
  },
  recent_inspections: [
    {
      id: 'i1',
      aircraft_registration: 'ST-TEST',
      flight_number: 'SD-TEST-101',
      overall_status: 'PASSED',
      certificate_issued: true,
      inspection_date: '2026-10-17T09:00:00Z',
    },
  ],
  recent_screenings: [
    {
      id: 's1',
      traveler_name: 'مسافر الاختبار',
      risk_level: 'RED',
      status: 'PENDING',
      screened_at: '2026-10-17T08:00:00Z',
    },
  ],
  staff: [
    {
      id: 'st1',
      full_name: 'موظف الاختبار الأول',
      role: 'DIRECTOR',
      role_label: 'مدير المطار',
      email: 'staff-one@nqp-test.example',
      phone: '0900000001',
      shift: 'صباحي',
      is_active: true,
    },
    {
      id: 'st2',
      full_name: 'موظف الاختبار الثاني',
      role: 'INSPECTOR',
      role_label: 'مفتش طائرات',
      email: 'staff-two@nqp-test.example',
      phone: '0900000002',
      shift: 'مسائي',
      is_active: false,
    },
  ],
};

const crewFixture = [
  {
    id: 'c1',
    crew: 'u1',
    crew_name: 'طاقم الاختبار',
    flight: 'f1',
    flight_number: 'SD-TEST-101',
    health_status: 'FIT',
    temperature: 36.6,
    next_clearance_date: '2026-11-01',
  },
];

const terminalsFixture = [
  {
    id: 't1',
    port: 'p1',
    port_name: 'مطار الاختبار',
    terminal_code: 'T1',
    name_ar: 'صالة الاختبار',
    name_en: 'Test Terminal',
    is_active: true,
  },
];

const pointsFixture = [
  {
    id: 'pt1',
    terminal: 't1',
    terminal_name: 'صالة الاختبار',
    point_code: 'P-ARR-1',
    point_type: 'ARRIVAL',
    is_active: true,
  },
];

const page = (results: unknown[]) => ({
  data: { status: 'success', data: { count: results.length, next: null, previous: null, results } },
});

/* ------------------------------- helpers ------------------------------- */

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/airport-director']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const setupMocks = () => {
  vi.mocked(getAirportDashboard).mockResolvedValue({
    data: { status: 'success', data: dashboardFixture },
  } as never);
  vi.mocked(getCrewHealthRecords).mockResolvedValue(page(crewFixture) as never);
  vi.mocked(getAirportTerminals).mockResolvedValue(page(terminalsFixture) as never);
  vi.mocked(getScreeningPoints).mockResolvedValue(page(pointsFixture) as never);
};

beforeEach(() => {
  vi.resetAllMocks();
  setupMocks();
});

/* --------------------------------- tests -------------------------------- */

describe('AirportDirectorPage', () => {
  it('renders the page shell', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });

  it('never renders fabricated staff names (regression guard)', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.queryByText('عمر خليل')).toBeNull();
    expect(screen.queryByText('ياسر محمد')).toBeNull();
    expect(screen.queryByText('خالد أحمد')).toBeNull();
  });

  it('shows "قيد الإعداد" for data sections', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.getAllByText(/قيد الإعداد/).length).toBeGreaterThan(0);
  });

  it('does not crash and renders the heading', () => {
    wrap(<AirportDirectorPage />);
    expect(screen.getByText(/لوحة القيادة التنفيذية/)).toBeTruthy();
  });

  it('is stable when re-rendered (no state crashes)', () => {
    const { rerender } = wrap(<AirportDirectorPage />);
    rerender(
      <MemoryRouter initialEntries={['/app/airport-director']}>
        <ThemeProvider theme={createTheme()}>
          <AirportDirectorPage />
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });

  it('renders 12 KPI cards from dashboard.kpis', async () => {
    wrap(<AirportDirectorPage />);
    const cards = await screen.findAllByTestId('kpi-card');
    expect(cards).toHaveLength(12);
    expect(screen.getAllByText('تفتيش طائرات اليوم').length).toBeGreaterThan(0);
    expect(screen.getAllByText('سجلات طاقم اليوم').length).toBeGreaterThan(0);
    expect(screen.getAllByText('فحوصات وصول اليوم').length).toBeGreaterThan(0);
    expect(screen.getAllByText('فحوصات مغادرة اليوم').length).toBeGreaterThan(0);
  });

  it('renders recent_inspections rows in the inspections section', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('ST-TEST')).toBeTruthy();
    expect(screen.getAllByText('SD-TEST-101').length).toBeGreaterThan(0);
  });

  it('renders recent_screenings rows in the screening section', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('مسافر الاختبار')).toBeTruthy();
  });

  it('renders crew rows from getCrewHealthRecords', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('طاقم الاختبار')).toBeTruthy();
  });

  it('keeps only permissions / decision as "قيد الإعداد" (staff is now live)', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findAllByTestId('kpi-card');
    expect(screen.getAllByText(/موظفو المطار/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/مصفوفة الصلاحيات/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/دعم اتخاذ القرار/).length).toBeGreaterThan(0);
    // بطاقتا الصلاحيات + دعم القرار = 3 عناصر نائبة؛ قسم الموظفين لم يعد منها.
    expect(screen.getAllByText(/قيد الإعداد/).length).toBe(3);
  });

  it('renders staff rows from dashboard.staff', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('موظف الاختبار الأول')).toBeTruthy();
    expect(screen.getByText('موظف الاختبار الثاني')).toBeTruthy();
    expect(screen.getAllByText('مدير المطار').length).toBeGreaterThan(0);
    expect(screen.getAllByText('مفتش طائرات').length).toBeGreaterThan(0);
  });

  it('shows the staff empty state when dashboard.staff is empty', async () => {
    vi.mocked(getAirportDashboard).mockResolvedValue({
      data: { status: 'success', data: { ...dashboardFixture, staff: [] } },
    } as never);
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('لا يوجد موظفون مسجلون')).toBeTruthy();
  });

  it('fires all four API calls on mount', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findAllByTestId('kpi-card');
    expect(getAirportDashboard).toHaveBeenCalledTimes(1);
    expect(getCrewHealthRecords).toHaveBeenCalledTimes(1);
    expect(getAirportTerminals).toHaveBeenCalledTimes(1);
    expect(getScreeningPoints).toHaveBeenCalledTimes(1);
  });
});
