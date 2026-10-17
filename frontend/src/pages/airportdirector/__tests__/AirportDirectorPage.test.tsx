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

import AirportDirectorPage from '../AirportDirectorPage';

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/airport-director']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

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
});
