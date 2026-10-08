import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCarrier,
  getCarriers,
  getCarrierApiKey,
  getFlights,
  getHealthNotices,
  regenerateCarrierApiKey,
  uploadManifest,
} from '../../api/endpoints/carriers';
import { getCountries } from '../../api/endpoints/public';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../api/endpoints/carriers', () => ({
  createCarrier: vi.fn(),
  getCarriers: vi.fn(),
  getCarrierApiKey: vi.fn(),
  getFlights: vi.fn(),
  getHealthNotices: vi.fn(),
  regenerateCarrierApiKey: vi.fn(),
  uploadManifest: vi.fn(),
}));

vi.mock('../../api/endpoints/public', () => ({ getCountries: vi.fn() }));

vi.mock('../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn() }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../../utils/toast', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

const CarriersPage = (await import('./CarriersPage')).default;

/** موعد وصول اليوم — يولَّد وقت التشغيل لأن «وصول اليوم» يعتمد على اليوم المحلي. */
const todayAt = (hour: number) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const flights = [
  {
    id: 'f-1',
    flight_number: 'SD123',
    carrier_name: 'Sudan Airways',
    flight_type: 'INTERNATIONAL',
    origin_code: 'SDB',
    origin_country_name: 'السودان',
    destination_port_name: 'ميناء بورتسودان',
    scheduled_arrival: todayAt(9),
    status: 'SCHEDULED',
  },
  {
    id: 'f-2',
    flight_number: 'ET0456',
    carrier_name: 'Ethiopian Airlines',
    flight_type: 'INTERNATIONAL',
    origin_code: 'ADD',
    origin_country_name: 'إثيوبيا',
    destination_port_name: 'مطار الخرطوم',
    scheduled_arrival: '2031-05-05T06:30:00Z',
    status: 'SCHEDULED',
  },
];

const carriers = [
  {
    id: 'c-1',
    name: 'الخطوط الجوية Sudanese',
    name_en: 'Sudan Airways',
    iata_code: 'SD',
    icao_code: 'SUD',
    country_name: 'السودان',
    ports_names: ['مطار الخرطوم', 'ميناء بورتسودان'],
    company_type_label: 'شركة طيران وطنية',
    is_active: true,
  },
  {
    id: 'c-2',
    name: 'شركة ملاحة نيلية',
    iata_code: null,
    icao_code: null,
    country_name: 'السودان',
    ports_names: ['ميناء الأبيض'],
    company_type_label: 'شركة ملاحة بحرية',
    is_active: false,
  },
];

const notices = [
  {
    id: 'n-1',
    title: 'تنبيه صحي regarding الحمى الصفراء',
    category: 'YELLOW_FEVER',
    priority: 'HIGH',
    published_at: '2026-01-10T09:00:00Z',
    is_active: true,
  },
  { id: 'n-2', title: 'إشعار غير فعّال', category: 'OTHER', priority: 'LOW', published_at: '2026-01-01T09:00:00Z', is_active: false },
];

const list = (results: unknown[]) => ({ data: { data: { count: results.length, results } } });

const asRole = (role: string) =>
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', email: 'user@nqp.sd', full_name: 'مستخدم', role, is_active: true },
    token: 'token',
    isAuthenticated: true,
  } as never);

const setup = () =>
  render(
    <MemoryRouter>
      <CarriersPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(getFlights).mockResolvedValue(list(flights) as never);
  vi.mocked(getCarriers).mockResolvedValue(list(carriers) as never);
  vi.mocked(getHealthNotices).mockResolvedValue(list(notices) as never);
  vi.mocked(getCountries).mockResolvedValue({ data: { data: [] } } as never);
  vi.mocked(getMasterEntryPoints).mockResolvedValue({ data: { data: { count: 0, results: [] } } } as never);
  vi.mocked(createCarrier).mockResolvedValue({ data: { data: { name: 'شركة', iata_code: 'XX' } } } as never);
  vi.mocked(getCarrierApiKey).mockResolvedValue({ data: { data: { api_key: 'existing-key' } } } as never);
  vi.mocked(regenerateCarrierApiKey).mockResolvedValue({ data: { data: { api_key: 'new-key' } } } as never);
  vi.mocked(uploadManifest).mockResolvedValue({ data: { data: { total_passengers: 10, error_report: {} } } } as never);
});

describe('CarriersPage — صلاحيات التبويبات', () => {
  it('يخفي تبويب «شركات النقل» عن ممثّل الشركة ولا يطلب بياناته', async () => {
    asRole('CARRIER');
    setup();

    await waitFor(() => expect(screen.getByRole('tab', { name: /الرحلات/ })).toBeTruthy());
    expect(screen.queryByRole('tab', { name: /شركات النقل/ })).toBeNull();
    // `CarrierViewSet` إداري حصريًا — الطلب لا يُرسَل أصلًا.
    expect(getCarriers).not.toHaveBeenCalled();
  });

  it('يعرض تبويب «شركات النقل» ومؤشر الشركات النشطة للمدير العام', async () => {
    asRole('DG_MANAGER');
    setup();

    expect(await screen.findByRole('tab', { name: /شركات النقل/ })).toBeTruthy();
    expect(getCarriers).toHaveBeenCalled();
    // المؤشر هيكل تحميل (Skeleton) حتى تصل أرقام الإحصاء، لذا انتظر ظهوره.
    expect(await screen.findByText('شركات نشطة')).toBeTruthy();
  });

  it('يعرض ثلاثة تبويبات للمدير واثنان لممثّل الشركة', async () => {
    asRole('ADMIN');
    const { unmount } = setup();
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
    unmount();

    asRole('CARRIER');
    setup();
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));
  });
});

describe('CarriersPage — مؤشرات لوحة المعلومات', () => {
  it('يحسب «وصول اليوم» من الرحلات الفعلية', async () => {
    asRole('ADMIN');
    setup();

    // بطاقة المؤشر قابلة للنقر، لذا تحمل تسمية وصولية تجمع التسمية والقيمة.
    expect(await screen.findByRole('button', { name: 'وصول اليوم: 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إجمالي الرحلات: 2' })).toBeTruthy();
  });

  it('يستبدل مؤشر الشركات بمؤشر الرحلات القادمة لغير الإدارة', async () => {
    asRole('CARRIER');
    setup();

    expect(await screen.findByText('رحلات قادمة')).toBeTruthy();
    expect(screen.queryByText('شركات نشطة')).toBeNull();
  });

  it('ينتقل إلى تبويب الإشعارات عند الضغط على مؤشرها', async () => {
    asRole('ADMIN');
    setup();

    fireEvent.click(await screen.findByRole('button', { name: 'إشعارات فعّالة: 1' }));
    expect(await screen.findByPlaceholderText('بحث بالعنوان...')).toBeTruthy();
  });
});

describe('CarriersPage — الوصول واتجاه النص', () => {
  it('يعرض شريط التبويبات كـ tablist مع تبويب محدد', async () => {
    asRole('ADMIN');
    setup();

    const tablist = await screen.findByRole('tablist', { name: 'أقسام شركات النقل' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    // roving tabindex: التبويب غير المحدد خارج مسار Tab ليسهل الوصول السريع للمحتوى.
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
  });

  it('يربط كل لوحة بمؤشر التبويب الخاص بها', async () => {
    asRole('ADMIN');
    setup();

    const tablist = await screen.findByRole('tablist', { name: 'أقسام شركات النقل' });
    const flightsTab = within(tablist).getAllByRole('tab')[0];
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(flightsTab.getAttribute('id'));
  });

  it('ينقل التركيز بين التبويبات بالأسهم', async () => {
    asRole('ADMIN');
    setup();

    const tablist = await screen.findByRole('tablist', { name: 'أقسام شركات النقل' });
    const tabs = within(tablist).getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    await waitFor(() => expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[1].getAttribute('id')));
  });

  it('يعزل المعرّفات الثنائية (رقم الرحلة وكود IATA) باتجاه ltr', async () => {
    asRole('DG_MANAGER');
    setup();

    await screen.findByRole('tab', { name: /شركات النقل/ });
    // صفوف الجدول تصل بعد استجابة وهمية، فلا يجوز افتراض وجودها فورًا.
    expect((await screen.findByText('SD123')).getAttribute('dir')).toBe('ltr');
    expect((await screen.findByText('ET0456')).getAttribute('dir')).toBe('ltr');

    fireEvent.click(screen.getByRole('tab', { name: /شركات النقل/ }));
    // `SUD` فريد في الجدول، بخلاف `SD` الذي يظهر أيضًا كأحرف أولى في الشعار.
    expect((await screen.findByText('SUD')).getAttribute('dir')).toBe('ltr');
  });
});