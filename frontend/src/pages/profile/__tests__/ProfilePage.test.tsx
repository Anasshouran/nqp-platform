/**
 * ProfilePage (/app/account) — first test coverage.
 *
 * The page is self-contained: it fetches its own data through four account
 * endpoints (getProfile + meOrganization/meSessions/meActivity) and wraps every
 * request in a `.catch` fallback, so there is intentionally no dedicated error
 * UI — a failed request degrades to empty data. It does not use the router or
 * useAuth, so no providers are required here.
 *
 * This suite mocks the four endpoints and covers: render/loading, the four
 * API-driven data sections, the role-aware breadcrumb (lab vs non-lab), the
 * graceful failure path, and one smoke test per tab.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProfileData } from '../../../api/endpoints/auth';
import type { ActivityLogEntry, OrganizationEntry, SessionInfo } from '../../../types/account';

const authApi = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock('../../../api/endpoints/auth', () => authApi);

const accountApi = vi.hoisted(() => ({
  meOrganization: vi.fn(),
  meSessions: vi.fn(),
  meActivity: vi.fn(),
}));
vi.mock('../../../api/endpoints/account', () => accountApi);

import { getProfile } from '../../../api/endpoints/auth';
import { meActivity, meOrganization, meSessions } from '../../../api/endpoints/account';
import ProfilePage from '../ProfilePage';

const baseUser: ProfileData['user'] = {
  id: 'u-1',
  email: 'shipping.test@nqp.gov.sd',
  full_name: '',
  phone: null,
  national_id: null,
  user_type: 'MINISTRY_STAFF',
  organization_name: null,
  role: 'SHIPPING_COMPANY',
  role_id: null,
  sector: null,
  sector_name: null,
  sector_code: null,
  permissions: [],
  role_assignments: [],
};

const baseEmployee: ProfileData['profile'] = {
  employee_number: 'SHIP-TEST-001',
  full_name_ar: 'أحمد محمد الشحن',
  full_name_en: 'Ahmed Mohamed Al-Shahn',
  gender: 'MALE',
  birth_date: '1990-05-20',
  job_title: 'مسؤول الشحن البحري',
  hire_date: '2024-01-15',
  employment_status: 'ACTIVE',
  internal_phone: '101',
  office: 'مكتب الشحن - بورتسودان',
  preferred_contact: 'EMAIL',
  language: 'AR',
  theme: 'LIGHT',
  timezone: 'Africa/Khartoum',
  notify_email: true,
  notify_sms: false,
  notify_in_app: true,
  signature_status: 'UNREGISTERED',
  certificate: 'CERT-SHIP-TEST',
  signature_issue_date: null,
  signature_expiry_date: null,
};

const makeProfile = (over: Partial<ProfileData> = {}): ProfileData => ({
  user: { ...baseUser },
  profile: { ...baseEmployee },
  security: { id: 'u-1', is_active: true, is_staff: false, is_mfa_enabled: true },
  roles: [],
  organization: [],
  effective_permissions: [],
  scopes: [],
  ...over,
});

/** مستخدم معملي: السلسلة التنظيمية تحتوي «قسم الكيمياء» فيُفعَّل سياق المعمل. */
const labOrganization: ProfileData['organization'] = [
  {
    sector: 'قطاع المختبرات',
    station: 'محطة بورتسودان',
    lab: 'المعمل المركزي',
    department: 'قسم الكيمياء',
    position: 'محلل كيمياء',
  },
];

interface RespondOptions {
  profile?: ProfileData;
  organization?: OrganizationEntry[];
  sessions?: SessionInfo[];
  activity?: ActivityLogEntry[];
}

const respond = (opts: RespondOptions = {}) => {
  vi.mocked(getProfile).mockResolvedValue({ data: { data: opts.profile ?? makeProfile() } } as never);
  vi.mocked(meOrganization).mockResolvedValue({ data: { data: opts.organization ?? [] } } as never);
  vi.mocked(meSessions).mockResolvedValue({ data: { data: opts.sessions ?? [] } } as never);
  vi.mocked(meActivity).mockResolvedValue({ data: { data: opts.activity ?? [] } } as never);
};

/** كل الطلبات تفشل — الطلب الأساسي يُفعّل واجهة الخطأ والثانوية تتدهور بأمان. */
const rejectAll = () => {
  vi.mocked(getProfile).mockRejectedValue(new Error('boom'));
  vi.mocked(meOrganization).mockRejectedValue(new Error('boom'));
  vi.mocked(meSessions).mockRejectedValue(new Error('boom'));
  vi.mocked(meActivity).mockRejectedValue(new Error('boom'));
};

/** الطلب الأساسي فقط يفشل — بقية الطلبات الثانوية تنجح. */
const respondWithProfileFailure = () => {
  respond();
  vi.mocked(getProfile).mockRejectedValue(new Error('boom'));
};

const renderPage = () => render(<ProfilePage />);

const breadcrumb = () => screen.getByRole('navigation', { name: 'breadcrumb' });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
});

describe('ProfilePage — العرض والتحميل', () => {
  it('يعرض هياكل تحميل قبل وصول البيانات', () => {
    vi.mocked(getProfile).mockReturnValue(new Promise(() => undefined) as never);
    vi.mocked(meOrganization).mockReturnValue(new Promise(() => undefined) as never);
    vi.mocked(meSessions).mockReturnValue(new Promise(() => undefined) as never);
    vi.mocked(meActivity).mockReturnValue(new Promise(() => undefined) as never);

    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('يعرض الاسم والدور بعد اكتمال التحميل', async () => {
    respond();
    renderPage();

    expect((await screen.findAllByText('أحمد محمد الشحن')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('مسؤول الشحن البحري').length).toBeGreaterThan(0);
    expect(screen.getAllByText('نشط').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'تعديل الملف' })).toBeTruthy();
  });

  it('يعرض سبعة تبويبات', async () => {
    respond();
    renderPage();

    expect((await screen.findAllByText('أحمد محمد الشحن')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab')).toHaveLength(7);
  });
});

describe('ProfilePage — مسار التنقّل', () => {
  it('لمستخدم غير معملي بلا ارتباط: يعرض الحساب ولا يعرض FCLIS ولا مقاطع فارغة', async () => {
    respond();
    renderPage();

    const nav = within(await screen.findByRole('navigation', { name: 'breadcrumb' }));
    expect(nav.getByText('حسابي')).toBeTruthy();
    expect(nav.getByText('مسؤول الشحن البحري')).toBeTruthy();
    expect(nav.queryByText('🧪 FCLIS')).toBeNull();
    expect(nav.queryByText('—')).toBeNull();
  });

  it('لمستخدم معملي: يعرض FCLIS وسلسلة الجهة والدور', async () => {
    respond({ profile: makeProfile({ organization: labOrganization }) });
    renderPage();

    const nav = within(await screen.findByRole('navigation', { name: 'breadcrumb' }));
    expect(nav.getByText('🧪 FCLIS')).toBeTruthy();
    expect(nav.getByText('قطاع المختبرات')).toBeTruthy();
    expect(nav.getByText('قسم الكيمياء')).toBeTruthy();
    expect(nav.getByText('محلل كيمياء')).toBeTruthy();
    expect(nav.queryByText('حسابي')).toBeNull();
  });

  it('يستخدم اسم الشركة في المسار عندما يتوفر', async () => {
    respond({
      profile: makeProfile({
        user: { ...baseUser, organization_name: 'شركة الشحن البحري التجريبية' },
      }),
    });
    renderPage();

    const nav = within(await screen.findByRole('navigation', { name: 'breadcrumb' }));
    expect(nav.getByText('شركة الشحن البحري التجريبية')).toBeTruthy();
  });
});

describe('ProfilePage — التبويبات', () => {
  it('الملف الشخصي: يعرض الحقول الأساسية', async () => {
    respond();
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    const panel = within(screen.getByRole('tabpanel'));
    expect(panel.getByText('الرقم الوظيفي')).toBeTruthy();
    expect(panel.getByText('SHIP-TEST-001')).toBeTruthy();
    expect(panel.getByText('البريد الإلكتروني')).toBeTruthy();
    expect(panel.getByText('shipping.test')).toBeTruthy();
    expect(panel.getByText('المسمى الوظيفي')).toBeTruthy();
  });

  it('جهة العمل: يعرض القطاع والمنفذ والوحدة من meOrganization', async () => {
    respond({
      organization: [
        {
          sector: 'قطاع الصحة',
          sector_name: 'قطاع الصحة العام',
          station_name: 'منفذ بورتسودان',
          unit_name: 'وحدة الشحن',
        },
      ],
    });
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    expect(screen.queryByText('هذه المعلومات تُدار مركزياً وغير قابلة للتعديل')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'جهة العمل' }));

    expect(await screen.findByText('هذه المعلومات تُدار مركزياً وغير قابلة للتعديل')).toBeTruthy();
    expect(screen.getByText('قطاع الصحة العام')).toBeTruthy();
    expect(screen.getAllByText('المنفذ').length).toBeGreaterThan(0);
    expect(screen.getByText('منفذ بورتسودان')).toBeTruthy();
    expect(screen.getByText('وحدة الشحن')).toBeTruthy();
  });

  it('الأمان: يعرض عناصر الأمان وعدّاد الجلسات النشطة', async () => {
    respond({
      sessions: [
        { id: 's1', is_active: true, device_info: 'A', ip_address: null },
        { id: 's2', is_active: false, device_info: 'B', ip_address: null },
      ],
    });
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    fireEvent.click(screen.getByRole('tab', { name: 'الأمان' }));

    expect(await screen.findByText('تسجيل الدخول')).toBeTruthy();
    expect(screen.getByText('SUDAPASS')).toBeTruthy();
    expect(screen.getByText('التحقق بخطوتين')).toBeTruthy();
    expect(screen.getByText('الأجهزة الموثوقة')).toBeTruthy();
    expect(screen.getByText('1 أجهزة')).toBeTruthy();
    expect(screen.getByText('1 جلسات نشطة')).toBeTruthy();
  });

  it('الأجهزة والجلسات: يعرض الجلسات وحالة كل جهاز', async () => {
    respond({
      sessions: [
        { id: 's1', is_active: true, device_info: 'Chrome على Windows', last_activity: '2026-01-02T08:00:00Z' },
        { id: 's2', is_active: false, device_info: null, last_activity: null },
      ],
    });
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    fireEvent.click(screen.getByRole('tab', { name: 'الأجهزة والجلسات' }));

    expect(await screen.findByText('Chrome على Windows')).toBeTruthy();
    expect(screen.getByText('جهاز 2')).toBeTruthy();
    expect(screen.getAllByText('🟢 نشطة').length).toBeGreaterThan(0);
    expect(screen.getByText('🔴 غير نشطة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تسجيل الخروج من جميع الأجهزة' })).toBeTruthy();
  });

  it('الإشعارات: يعرض جميع مفاتيح الإشعارات', async () => {
    respond();
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    fireEvent.click(screen.getByRole('tab', { name: 'الإشعارات' }));

    expect(await screen.findByText('إعدادات الإشعارات')).toBeTruthy();
    for (const label of [
      'إشعارات المعاملات',
      'إشعارات المهام',
      'التنبيهات الصحية',
      'إشعارات الشهادات',
      'إشعارات النظام',
      'رسائل البريد الإلكتروني',
      'إشعارات التطبيق',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'حفظ التغييرات' })).toBeTruthy();
  });

  it('اللغة: يعرض خيارَي اللغة واتجاه الواجهة', async () => {
    respond();
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    fireEvent.click(screen.getByRole('tab', { name: 'اللغة' }));

    expect(await screen.findByText('لغة النظام')).toBeTruthy();
    expect(screen.getByText('العربية')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('اتجاه الواجهة:')).toBeTruthy();
    expect(screen.getByText('RTL / LTR')).toBeTruthy();
    expect(screen.getByText('يتم تطبيق اللغة على كامل المنصة')).toBeTruthy();
  });

  it('سجل النشاط: يعرض عناصر النشاط من meActivity', async () => {
    respond({
      activity: [
        { date: '2026-01-02', time: '10:30', action: 'LOGIN', description: 'تسجيل دخول ناجح' },
      ],
    });
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    fireEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }));

    expect(await screen.findByText('سجل نشاطي')).toBeTruthy();
    expect(screen.getByText('المستخدم يرى نشاطه الشخصي فقط')).toBeTruthy();
    expect(screen.getByText('2026-01-02 – 10:30')).toBeTruthy();
    expect(screen.getByText('تسجيل دخول ناجح')).toBeTruthy();
  });
});

describe('ProfilePage — الحالات الحدّية', () => {
  it('لا ينكسر عند فشل كل الطلبات ويعرض القيم الافتراضية', async () => {
    rejectAll();
    renderPage();

    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('نشط').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'تعديل الملف' })).toBeTruthy();
    // المسار يتراجع إلى «حسابي» بلا سلسلة تنظيمية.
    expect(within(breadcrumb()).getByText('حسابي')).toBeTruthy();
  });

  it('يعرض الشرطة «—» للحقول الناقصة', async () => {
    respond({
      profile: makeProfile({
        profile: { ...baseEmployee, employee_number: null, full_name_en: '' },
      }),
    });
    renderPage();

    await screen.findAllByText('أحمد محمد الشحن');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('يعرض «—» بدل الاسم الوهمي عند غياب الاسم الكامل', async () => {
    respond({
      profile: makeProfile({
        user: { ...baseUser, full_name: '' },
        profile: { ...baseEmployee, full_name_ar: '' },
      }),
    });
    renderPage();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.queryByText('أحمد محمد علي')).toBeNull();
  });
});

describe('ProfilePage — واجهة الخطأ', () => {
  it('يعرض واجهة الخطأ ويخفي التبويبات عند فشل الطلب الأساسي', async () => {
    respondWithProfileFailure();
    renderPage();

    expect(
      await screen.findByText('تعذّر تحميل بيانات الملف الشخصي'),
    ).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    // التبويبات لا تُعرض ضمن واجهة الخطأ.
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('زر «إعادة المحاولة» يعيد استدعاء الطلب الأساسي ويعرض البيانات عند النجاح', async () => {
    respondWithProfileFailure();
    renderPage();

    await screen.findByText('تعذّر تحميل بيانات الملف الشخصي');
    expect(getProfile).toHaveBeenCalledTimes(1);

    vi.mocked(getProfile).mockResolvedValue({ data: { data: makeProfile() } } as never);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText('أحمد محمد الشحن')).length).toBeGreaterThan(0);
    expect(screen.queryByText('تعذّر تحميل بيانات الملف الشخصي')).toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(7);
  });

  it('يحافظ على التدهور الآمن عند فشل الطلبات الثانوية دون واجهة خطأ', async () => {
    respond();
    vi.mocked(meOrganization).mockRejectedValue(new Error('boom'));
    vi.mocked(meSessions).mockRejectedValue(new Error('boom'));
    vi.mocked(meActivity).mockRejectedValue(new Error('boom'));
    renderPage();

    expect((await screen.findAllByText('أحمد محمد الشحن')).length).toBeGreaterThan(0);
    expect(screen.queryByText('تعذّر تحميل بيانات الملف الشخصي')).toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(7);
  });
});
