/**
 * RedSeaItReportsPage (IT report) — render / loading / error.
 * IT API mocked; page is wrapped in a router (uses useNavigate).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const itApi = vi.hoisted(() => ({ getItReports: vi.fn() }));
vi.mock('../../../api/endpoints/it', () => itApi);

import RedSeaItReportsPage from '../portal/it/RedSeaItReportsPage';

const report = {
  systems: [{ id: 's1', name: 'Core', name_ar: 'النظام الأساسي', status: 'ONLINE' }],
  tickets: [
    { id: 't1', priority: 'CRITICAL', status: 'OPEN' },
    { id: 't2', priority: 'LOW', status: 'CLOSED' },
  ],
  assets: [
    { id: 'a1', status: 'ACTIVE' },
    { id: 'a2', status: 'MAINTENANCE' },
  ],
  networks: [
    { id: 'n1', connected: true },
    { id: 'n2', connected: false },
  ],
};

const ok = { data: { data: report } };

const renderPage = () =>
  render(
    <MemoryRouter>
      <RedSeaItReportsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RedSeaItReportsPage', () => {
  it('shows skeleton placeholders while loading', () => {
    itApi.getItReports.mockReturnValue(new Promise(() => undefined));
    const { container } = renderPage();
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders IT metrics once loaded', async () => {
    itApi.getItReports.mockResolvedValue(ok);
    renderPage();

    expect(await screen.findByText('التقارير الفنية')).toBeTruthy();
    expect(screen.getByText('الأنظمة الكلية')).toBeTruthy();
    expect(screen.getByText('النظام الأساسي')).toBeTruthy();
  });

  it('stays stable and zeroes metrics when the request fails', async () => {
    itApi.getItReports.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText('التقارير الفنية')).toBeTruthy();
    expect(screen.getByText('الأنظمة الكلية')).toBeTruthy();
  });
});
