/**
 * RedSeaReportsPage (sector report) — render / loading / error.
 * Lab → reports API mocked; chrome comes from the shared ReportsPageShell.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reports = vi.hoisted(() => ({ getSectorDashboard: vi.fn() }));
vi.mock('../../../api/endpoints/reports', () => reports);

import RedSeaReportsPage from '../portal/modules/RedSeaReportsPage';

const dashboard = {
  kpis: { shipments: 5, samples: 9 },
  revenue: { total: 1234, shares: [{ name: 'جوازات السفر', amount: 500, pct: 40 }] },
  performance: [{ key: 'k1', label: 'مؤشر الأداء الأول', value: 7 }],
};

const ok = { data: { data: dashboard } };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RedSeaReportsPage', () => {
  it('shows skeleton placeholders while loading', () => {
    reports.getSectorDashboard.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<RedSeaReportsPage />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders sector metrics once loaded', async () => {
    reports.getSectorDashboard.mockResolvedValue(ok);
    render(<RedSeaReportsPage />);

    expect(await screen.findByText('تقارير وأداء — قطاع البحر الأحمر')).toBeTruthy();
    expect(screen.getByText('مؤشر الأداء الأول')).toBeTruthy();
    expect(screen.getByText('جوازات السفر')).toBeTruthy();
  });

  it('falls back to empty states when the request fails', async () => {
    reports.getSectorDashboard.mockRejectedValue(new Error('boom'));
    render(<RedSeaReportsPage />);

    expect(await screen.findByText('لا توجد مؤشرات أداء')).toBeTruthy();
  });
});
