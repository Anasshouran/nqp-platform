import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NationalCommandPage from '../NationalCommandPage';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('../../../api/endpoints/reports', () => ({
  getExecutiveDashboard: vi.fn(),
}));

import { getExecutiveDashboard } from '../../../api/endpoints/reports';
import type { ExecutiveDashboard } from '../../../api/endpoints/reports';

const mockData: ExecutiveDashboard = {
  window: { key: 'day', start: null, today: '2026-10-15' },
  kpis: {
    sectors: 12,
    passengers: 12345,
    imports: 40,
    exports: 30,
    samples: 250,
    certificates: 0,
    revenue: 0,
    suspected: 3,
    confirmed: 1,
    ports: { total: 5, airports: 1, seaports: 2, land_ports: 2 },
    screenings: { total: 5000, pending: 7, completed: 4993 },
  },
  sectors: [
    { id: 's1', name: 'السودان الشمالي', stations: 3, screens: 60, suspected: 1, readiness: 95, status: 'STABLE' },
    { id: 's2', name: 'الجزيرة', stations: 4, screens: 90, suspected: 2, readiness: 78, status: 'WATCH' },
    { id: 's3', name: 'البحر الأحمر', stations: 2, screens: 30, suspected: 0, readiness: 55, status: 'CRITICAL' },
  ],
  ranking: [],
  food: { imports: 40, exports: 30, released: 0, rejected: 0, in_progress: 0, samples: 0, noncomplying: 0, top_products: [], final_decisions: [] },
  labs: { received: 0, processing: 0, completed: 0, pending_results: 0, avg_turnover_days: 0 },
  vectors: { reports: 0, active_campaigns: 0, high_risk_sites: 0, completed_sprays: 0 },
  airports: { count: 0, flights_today: 0, screenings: 0, referrals: 0, suspected: 0 },
  seaports: { ships: 0, inspected: 0, declarations: 0, free_pratique: 0 },
  land_borders: { ports: 0, screenings: 0, suspected: 0 },
  revenue: { total: 0, shares: [] },
  surveillance: { suspected: 3, confirmed: 1, active_alerts: 2, risk_level: 'medium' },
  alerts: [
    { id: 'a1', severity: 'CRITICAL', title: 'حالة مشتبه بها', body: 'منفذ بورتسودان', time: '10:15' },
    { id: 'a2', severity: 'HIGH', title: 'تأخير إرسال العينات', body: 'معمل القومية', time: '09:40' },
  ],
};

describe('NationalCommandPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getExecutiveDashboard).mockResolvedValue({ data: { status: 'ok', data: mockData }, status: 200, statusText: 'OK', headers: {}, config: {} } as any);
  });

  it('renders the page header', async () => {
    render(<NationalCommandPage />);
    expect(await screen.findByText('لوحة قيادة الحجر الصحي القومي')).toBeTruthy();
  });

  it('displays KPIs from the real ExecutiveDashboard', async () => {
    render(<NationalCommandPage />);
    await screen.findByText('المنافذ النشطة');
    expect(screen.getByText('الفحوصات قيد المراجعة')).toBeTruthy();
  });

  it('never renders fabricated person names (regression guard)', async () => {
    render(<NationalCommandPage />);
    await screen.findByText('المنافذ النشطة');
    expect(screen.queryByText('سارة عبدالله')).toBeNull();
    expect(screen.queryByText('عمر خالد')).toBeNull();
    expect(screen.queryByText('فاطمة حسن')).toBeNull();
  });

  it('renders the notifications panel', async () => {
    render(<NationalCommandPage />);
    await screen.findByText('الفحوصات قيد المراجعة');
    expect(screen.getByText('الإشعارات والتنبيهات')).toBeTruthy();
  });

  it('shows قيد الإعداد for sections without backend source', async () => {
    render(<NationalCommandPage />);
    await screen.findByText('الفحوصات قيد المراجعة');
    expect(screen.getAllByText('قيد الإعداد').length).toBeGreaterThan(0);
  });

  it('degrades gracefully when the dashboard API fails', async () => {
    vi.mocked(getExecutiveDashboard).mockRejectedValueOnce(new Error('down'));
    render(<NationalCommandPage />);
    expect(await screen.findByText('لا توجد تنبيهات')).toBeTruthy();
    expect(screen.getAllByText('قيد الإعداد').length).toBeGreaterThan(0);
  });
});
