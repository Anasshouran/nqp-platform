import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import type { ReactElement } from 'react';

import { getAirportDashboard } from '../../../api/endpoints/airport';
import i18n from '../../../i18n';
import AirportHealthPage from '../AirportHealthPage';

vi.mock('../../../api/endpoints/airport');

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/airport-health']}>
      <ThemeProvider theme={createTheme()}>
        <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
      </ThemeProvider>
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
  upcoming_flights: [{ id: 'f1', flight_number: 'SD-412', origin_country: 'جدة', scheduled_arrival: '2026-08-15T14:20:00Z', status: 'مجدولة' }],
  suspected: [],
  tasks: [],
  alerts: [],
  report: { flights: 42, travelers: 1250, screened: 980, referrals: 1, suspected: 2, screenings_by_flight: [] },
};

describe('AirportHealthPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getAirportDashboard).mockResolvedValue({ data: { data: mockDashboard }, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
  });

  it('renders the page header', () => {
    wrap(<AirportHealthPage />);
    expect(screen.getAllByText(/نظام الصحة بالمطار/).length).toBeGreaterThan(0);
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

  it('never renders fabricated passenger/crew names (regression guard)', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
    expect(screen.queryByText('فاطمة عبد الرحمن')).toBeNull();
    expect(screen.queryByText('سارة النور حسن')).toBeNull();
    expect(screen.queryByText('خالد عبد الله')).toBeNull();
    expect(screen.queryByText('عمر خليل')).toBeNull();
  });

  it('shows empty state for sections without backend source', async () => {
    wrap(<AirportHealthPage />);
    await waitFor(() => expect(screen.getByText('رحلات اليوم')).toBeTruthy());
    expect(screen.getAllByText(/قيد الإعداد/).length).toBeGreaterThan(0);
  });

  it('degrades gracefully when the dashboard API fails', async () => {
    vi.mocked(getAirportDashboard).mockRejectedValueOnce(new Error('boom'));
    wrap(<AirportHealthPage />);
    expect((await screen.findAllByText(/نظام الصحة بالمطار/)).length).toBeGreaterThan(0);
    expect(screen.getByText('رحلات اليوم')).toBeTruthy();
  });
});
