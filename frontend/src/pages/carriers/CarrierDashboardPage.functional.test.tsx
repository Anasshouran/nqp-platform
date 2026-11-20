import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getDashboardStats, getDashboardUpcoming, getRecentNotices,
} from '../../api/endpoints/carriers';
import { useAuth } from '../../hooks/useAuth';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../../api/endpoints/carriers', () => ({
  getDashboardStats: vi.fn(),
  getDashboardUpcoming: vi.fn(),
  getRecentNotices: vi.fn(),
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

// useCommandSections constructs an IntersectionObserver on mount; jsdom has none.
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});
Element.prototype.scrollIntoView = vi.fn();

const CarrierDashboardPage = (await import('./CarrierDashboardPage')).default;

const stats = {
  upcoming_today: 3,
  expected_passengers: 2500,
  notices: { active: 2 },
  pre_registration_rate: 0.75,
  api: { configured: true, last_use_at: '2026-01-03T00:00:00Z' },
  manifest_status: { ready: 2, missing: 1 },
};

const upcoming = [
  {
    id: 'f1', flight_number: 'SD123', route: 'الخرطوم ← بورتسودان',
    passengers: 180, scheduled_arrival: '2026-01-01T10:00:00Z', manifest_status: 'COMPLETED',
  },
  {
    id: 'f2', flight_number: 'SD456', route: 'الخرطوم ← جوبا',
    passengers: 95, scheduled_arrival: '2026-01-01T14:00:00Z', manifest_status: 'PENDING',
  },
];

const notices = [{
  id: 'n1', title: 'تنبيه وبائي', description: 'إجراءات احترازية',
  priority: 'HIGH', category: 'EPIDEMIC_ALERT',
  published_at: '2026-01-01T00:00:00Z', expiry_date: null, is_active: true,
}];

const ok = (data: unknown) => ({ data: { data } });
const renderPage = () => render(<MemoryRouter><CarrierDashboardPage /></MemoryRouter>);

const primeHappyPath = () => {
  vi.mocked(getDashboardStats).mockResolvedValue(ok(stats) as any);
  vi.mocked(getDashboardUpcoming).mockResolvedValue(ok(upcoming) as any);
  vi.mocked(getRecentNotices).mockResolvedValue(ok(notices) as any);
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', full_name: 'أحمد محمد', role: 'CARRIER' },
    hasRole: () => true, hasAnyRole: () => true, hasPermission: () => true,
    isLoading: false,
  } as any);
};

beforeEach(() => {
  vi.clearAllMocks();
  primeHappyPath();
});

describe('CarrierDashboardPage — P3-B functional coverage', () => {
  it('renders loading skeletons before all three requests settle', () => {
    vi.mocked(getDashboardStats).mockReturnValue(new Promise(() => {}) as any);
    vi.mocked(getDashboardUpcoming).mockReturnValue(new Promise(() => {}) as any);
    vi.mocked(getRecentNotices).mockReturnValue(new Promise(() => {}) as any);
    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThanOrEqual(4);
  });

  it('renders the four KPI values with Arabic number formatting', async () => {
    renderPage();
    expect(await screen.findByText('الرحلات القادمة اليوم')).toBeTruthy();
    expect(screen.getByText('المسافرون المتوقعون')).toBeTruthy();
    expect(screen.getByText('إشعارات صحية نشطة')).toBeTruthy();
    expect(screen.getByText('نسبة التسجيل المسبق')).toBeTruthy();
    expect(screen.getAllByText('2،500').length).toBeGreaterThan(0);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows the empty state for upcoming flights', async () => {
    vi.mocked(getDashboardUpcoming).mockResolvedValue(ok([]) as any);
    renderPage();
    expect(await screen.findByText('لا توجد رحلات قادمة خلال الـ 24 ساعة القادمة')).toBeTruthy();
  });

  it('shows the empty state for health notices', async () => {
    vi.mocked(getRecentNotices).mockResolvedValue(ok([]) as any);
    renderPage();
    expect(await screen.findByText('لا توجد إشعارات نشطة')).toBeTruthy();
  });

  it('renders upcoming flights with manifest status and upload action', async () => {
    renderPage();
    expect(await screen.findByText('SD123')).toBeTruthy();
    expect(screen.getByText('180 راكب')).toBeTruthy();
    expect(screen.getByText('كشف مرفوع')).toBeTruthy();
    expect(screen.getByText('كشف غير مرفوع')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'رفع قائمة الركاب' })).toBeTruthy();
  });

  it('renders notices with priority and category chips', async () => {
    renderPage();
    expect(await screen.findByText('تنبيه وبائي')).toBeTruthy();
    expect(screen.getByText('عالي')).toBeTruthy();
    expect(screen.getByText('إنذار وبائي')).toBeTruthy();
  });

  it('renders the integration and manifest status cards', async () => {
    renderPage();
    expect(await screen.findByText('حالة التكامل (API)')).toBeTruthy();
    expect(screen.getByText(/متصل — مفتاح API مفعّل/)).toBeTruthy();
    expect(screen.getByText(/2 رحلة كشفها مرفوع · 1 لم ترفع بعد/)).toBeTruthy();
  });

  it('navigates to the carriers page from both forward arrows', async () => {
    renderPage();
    await screen.findByText('الرحلات القادمة');
    const arrows = await screen.findAllByRole('button', { name: 'تقدم' });
    expect(arrows.length).toBe(2);
    fireEvent.click(arrows[0]);
    fireEvent.click(arrows[1]);
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, '/app/carriers');
    expect(navigate).toHaveBeenNthCalledWith(2, '/app/carriers');
  });

  it('navigates from the manifest, API settings and flight management actions', async () => {
    renderPage();
    await screen.findByText('الرحلات القادمة');
    fireEvent.click(screen.getByRole('button', { name: 'رفع قائمة الركاب' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعدادات API' }));
    fireEvent.click(screen.getByRole('button', { name: 'إدارة الرحلات' }));
    expect(navigate.mock.calls.map((c) => c[0])).toEqual([
      '/app/carriers', '/app/company', '/app/carriers',
    ]);
  });

  it('renders the command rail and scrolls to the selected section', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'نظرة عامة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الرحلات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التكامل' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('shows an error alert with retry when the dashboard API fails', async () => {
    vi.mocked(getDashboardStats).mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByText('تعذّر تحميل بيانات لوحة الناقل')).toBeTruthy();
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).not.toBeNull();
  });

  it('recovers from a dashboard API failure when retry succeeds', async () => {
    vi.mocked(getDashboardStats)
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(ok(stats) as any);
    renderPage();
    expect(await screen.findByText('تعذّر تحميل بيانات لوحة الناقل')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect((await screen.findAllByText('2،500')).length).toBeGreaterThan(0);
    expect(screen.queryByText('تعذّر تحميل بيانات لوحة الناقل')).toBeNull();
    expect(vi.mocked(getDashboardStats)).toHaveBeenCalledTimes(2);
  });
});
