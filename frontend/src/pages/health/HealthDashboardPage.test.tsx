import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPublicStatistics } from '../../api/endpoints/public';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/endpoints/notifications';

const HealthDashboardPage = (await import('./HealthDashboardPage')).default;

// jsdom لا يوفّر IntersectionObserver — نستبدله بجذر يحاكي واجهته.
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords = () => [];
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

vi.mock('../../api/endpoints/public', () => ({ getPublicStatistics: vi.fn() }));
vi.mock('../../api/endpoints/notifications', () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  notifyNotificationsChanged: vi.fn(),
  NOTIFICATIONS_CHANGED_EVENT: 'notifications:changed',
}));
vi.mock('../../utils/formatters', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../utils/formatters')>();
  return { ...mod, formatDateTime: (d: unknown) => String(d) };
});

const stats = {
  period: 'all',
  sector: null,
  entry_points: 12,
  sectors: 18,
  travelers: 5200,
  screenings: 1940,
  certificates: 860,
  food_shipments: 340,
  lab_samples: 1120,
  diseases: 45,
  vector_activities: 300,
  notices: 9,
  news: 22,
  faq: 51,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublicStatistics).mockResolvedValue({ data: { data: stats } } as never);
  vi.mocked(getNotifications).mockResolvedValue({ data: { data: [] } } as never);
  vi.mocked(markAllNotificationsRead).mockResolvedValue({} as never);
  vi.mocked(markNotificationRead).mockResolvedValue({} as never);
});

describe('HealthDashboardPage — سلامة البيانات وعدم الاختراع', () => {
  it('يعرض المؤشرات من واجهة الإحصائيات الحقيقية بدل قيم مختلقة', async () => {
    render(<HealthDashboardPage />);
    await waitFor(() => expect(getPublicStatistics).toHaveBeenCalled());
    // الفحوصات تظهر كبطاقة KPI وكصف في الجدول — قيمتها الحقيقية 1940.
    expect((await screen.findAllByText('الفحوصات الصحية')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1940').length).toBeGreaterThan(0);
    expect(screen.getAllByText('العينات المخبرية').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1120').length).toBeGreaterThan(0);
    expect(screen.getByText('نقاط الدخول النشطة')).toBeTruthy();
  });

  it('لا يعرض أبداً ادعاء «مباشر» مزيف — يعرض وقت آخر تحديث حقيقي', async () => {
    render(<HealthDashboardPage />);
    await waitFor(() => expect(getPublicStatistics).toHaveBeenCalled());
    expect(await screen.findByText(/آخر تحديث/)).toBeTruthy();
    expect(screen.queryByText(/مباشر/)).toBeNull();
  });

  it('يعرض حالة خطأ مع إعادة المحاولة عند فشل الجلب', async () => {
    vi.mocked(getPublicStatistics).mockRejectedValue(new Error('boom'));
    render(<HealthDashboardPage />);
    expect(await screen.findByText(/تعذّر تحميل الإحصائيات الصحية/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /إعادة المحاولة|أعد المحاولة/ })).toBeTruthy();
  });

  it('يعرض حالة فارغة صادقة عند غياب البيانات', async () => {
    vi.mocked(getPublicStatistics).mockResolvedValue({
      data: {
        data: {
          ...stats,
          screenings: 0, certificates: 0, lab_samples: 0, diseases: 0,
          entry_points: 0, vector_activities: 0, notices: 0,
        },
      },
    } as never);
    render(<HealthDashboardPage />);
    await waitFor(() => expect(getPublicStatistics).toHaveBeenCalled());
    expect((await screen.findAllByText('الفحوصات الصحية')).length).toBeGreaterThan(0);
    // لا قيم مختلقة وهمية تُعرض كأرقام حقيقية
    expect(screen.queryByText('1284')).toBeNull();
  });
});