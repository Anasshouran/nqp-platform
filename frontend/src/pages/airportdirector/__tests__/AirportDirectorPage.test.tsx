import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  getAirportStaff: vi.fn(),
  createAirportStaff: vi.fn(),
  updateAirportStaff: vi.fn(),
  deleteAirportStaff: vi.fn(),
  getAirportPorts: vi.fn(),
}));
vi.mock('../../../api/endpoints/airport', () => airportApi);

const authApi = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock('../../../api/endpoints/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/endpoints/auth')>();
  return { ...actual, getProfile: authApi.getProfile };
});

const rolesApi = vi.hoisted(() => ({ getPermissionTree: vi.fn() }));
vi.mock('../../../api/endpoints/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/endpoints/roles')>();
  return { ...actual, getPermissionTree: rolesApi.getPermissionTree };
});

import AirportDirectorPage from '../AirportDirectorPage';
import {
  createAirportStaff,
  deleteAirportStaff,
  getAirportDashboard,
  getAirportPorts,
  getAirportStaff,
  getAirportTerminals,
  getCrewHealthRecords,
  getScreeningPoints,
  updateAirportStaff,
} from '../../../api/endpoints/airport';
import { getProfile } from '../../../api/endpoints/auth';
import { getPermissionTree } from '../../../api/endpoints/roles';

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

const portsFixture = [
  {
    id: 'p1',
    code: 'AP1',
    name_ar: 'مطار الاختبار',
    name_en: 'Test Airport',
    type: 'AIRPORT',
    country: 'السودان',
    is_active: true,
  },
];

/** صفوف AirportStaff الكاملة كما تعيدها /airport/staff/. */
const staffFixture = [
  {
    id: 'st1',
    full_name: 'موظف الاختبار الأول',
    role: 'DIRECTOR',
    role_label: 'مدير المطار',
    email: 'staff-one@nqp-test.example',
    phone: '0900000001',
    shift: 'صباحي',
    is_active: true,
    airport: 'p1',
    airport_name: 'مطار الاختبار',
    user: null,
    user_email: '',
    notes: '',
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
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
    airport: 'p1',
    airport_name: 'مطار الاختبار',
    user: null,
    user_email: '',
    notes: '',
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
  },
];

const page = (results: unknown[]) => ({
  data: { status: 'success', data: { count: results.length, next: null, previous: null, results } },
});

/** ملف المستخدم الحالي — التركيز على الصلاحيات الفعلية فقط. */
const profileFixture = {
  user: { full_name: 'مديرة الاختبار' },
  profile: {},
  security: { id: 'u1', is_active: true, is_staff: false, is_mfa_enabled: false },
  roles: [],
  organization: [],
  effective_permissions: ['airport_health:view', 'airport_health:edit', 'airport_staff:view'],
  scopes: [],
};

/** شجرة صلاحيات مصغّرة (مسار الموظفين/المشرفين عبر /auth/permissions/tree/). */
const permissionTreeFixture = {
  airport_health: [
    { id: 'p1', code: 'airport_health:view', name: 'view', resource: 'airport_health', action: 'view' },
    { id: 'p2', code: 'airport_health:add', name: 'add', resource: 'airport_health', action: 'add' },
  ],
};

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
  vi.mocked(getAirportStaff).mockResolvedValue(page(staffFixture) as never);
  vi.mocked(getAirportPorts).mockResolvedValue(page(portsFixture) as never);
  vi.mocked(createAirportStaff).mockResolvedValue({ data: { status: 'success', data: {} } } as never);
  vi.mocked(updateAirportStaff).mockResolvedValue({ data: { status: 'success', data: {} } } as never);
  vi.mocked(deleteAirportStaff).mockResolvedValue({ data: { status: 'success', data: {} } } as never);
  vi.mocked(getProfile).mockResolvedValue({
    data: { status: 'success', data: profileFixture },
  } as never);
  // دور مدير المطار لا يملك permissions:view → الشجرة تُرفض بـ 403 ويُستخدم الكتالوج المحلي.
  vi.mocked(getPermissionTree).mockRejectedValue({ response: { status: 403 } });
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

  it('keeps exactly two "قيد الإعداد" placeholders (decision + activity log)', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findAllByTestId('kpi-card');
    expect(screen.getAllByText(/موظفو المطار/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/مصفوفة الصلاحيات/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/دعم اتخاذ القرار/).length).toBeGreaterThan(0);
    // دعم القرار + سجل الأنشطة نائبان؛ بطاقة الصلاحيات صارت حيّة.
    expect(screen.getAllByText(/قيد الإعداد/).length).toBe(2);
  });

  it('renders staff rows from getAirportStaff', async () => {
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('موظف الاختبار الأول')).toBeTruthy();
    expect(screen.getByText('موظف الاختبار الثاني')).toBeTruthy();
    expect(screen.getAllByText('مدير المطار').length).toBeGreaterThan(0);
    expect(screen.getAllByText('مفتش طائرات').length).toBeGreaterThan(0);
  });

  it('shows the staff empty state when getAirportStaff returns no rows', async () => {
    vi.mocked(getAirportStaff).mockResolvedValue(page([]) as never);
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText('لا يوجد موظفون مسجلون')).toBeTruthy();
  });

  it('renders the "إضافة موظف" action in the staff section', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    expect(screen.getByRole('button', { name: 'إضافة موظف' })).toBeTruthy();
  });

  it('opens the create dialog with the required fields', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    fireEvent.click(screen.getByRole('button', { name: 'إضافة موظف' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('إضافة موظف')).toBeTruthy();
    expect(within(dialog).getByLabelText(/الاسم الكامل/)).toBeTruthy();
    expect(within(dialog).getByRole('combobox', { name: 'الدور' })).toBeTruthy();
    expect(within(dialog).getByLabelText('البريد الإلكتروني')).toBeTruthy();
    expect(within(dialog).getByLabelText('الهاتف')).toBeTruthy();
    expect(within(dialog).getByLabelText('الوردية')).toBeTruthy();
    expect(within(dialog).getByRole('combobox', { name: 'المطار' })).toBeTruthy();
  });

  it('creates a staff member and refreshes the table', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    fireEvent.click(screen.getByRole('button', { name: 'إضافة موظف' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/الاسم الكامل/), {
      target: { value: 'موظف جديد للاختبار' },
    });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'المطار' }));
    fireEvent.click(await screen.findByRole('option', { name: 'مطار الاختبار' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة' }));

    await waitFor(() => expect(createAirportStaff).toHaveBeenCalledTimes(1));
    expect(createAirportStaff).toHaveBeenCalledWith({
      full_name: 'موظف جديد للاختبار',
      role: 'INSPECTOR',
      email: '',
      phone: '',
      shift: '',
      airport: 'p1',
      is_active: true,
    });
    await waitFor(() => expect(getAirportStaff).toHaveBeenCalledTimes(2));
  });

  it('opens the edit dialog prefilled with the row data', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    fireEvent.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('تعديل بيانات الموظف')).toBeTruthy();
    expect((within(dialog).getByLabelText(/الاسم الكامل/) as HTMLInputElement).value).toBe('موظف الاختبار الأول');
    expect((within(dialog).getByLabelText('البريد الإلكتروني') as HTMLInputElement).value).toBe('staff-one@nqp-test.example');
    expect((within(dialog).getByRole('combobox', { name: 'الدور' }) as HTMLElement).textContent).toContain('مدير المطار');
  });

  it('updates a staff member from the edit dialog', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    fireEvent.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('الهاتف'), { target: { value: '0999999999' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(updateAirportStaff).toHaveBeenCalledTimes(1));
    expect(updateAirportStaff).toHaveBeenCalledWith(
      'st1',
      expect.objectContaining({ phone: '0999999999', full_name: 'موظف الاختبار الأول' }),
    );
    await waitFor(() => expect(getAirportStaff).toHaveBeenCalledTimes(2));
  });

  it('deletes a staff member after confirmation', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByText('موظف الاختبار الأول');
    fireEvent.click(screen.getAllByRole('button', { name: 'حذف' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/تأكيد حذف الموظف موظف الاختبار الأول/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }));

    await waitFor(() => expect(deleteAirportStaff).toHaveBeenCalledWith('st1'));
    await waitFor(() => expect(getAirportStaff).toHaveBeenCalledTimes(2));
  });

  it('fires all four API calls on mount', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findAllByTestId('kpi-card');
    expect(getAirportDashboard).toHaveBeenCalledTimes(1);
    expect(getCrewHealthRecords).toHaveBeenCalledTimes(1);
    expect(getAirportTerminals).toHaveBeenCalledTimes(1);
    expect(getScreeningPoints).toHaveBeenCalledTimes(1);
  });

  it('builds the RBAC card from effective_permissions + local catalog when the tree 403s', async () => {
    wrap(<AirportDirectorPage />);
    const allowed = await screen.findByTestId('rbac-allowed');
    const denied = screen.getByTestId('rbac-denied');

    // 3 صلاحيات فعلية من الكتالوج = متاح.
    expect(allowed.querySelectorAll('.MuiChip-root')).toHaveLength(3);
    expect(within(allowed).getByText('صحة المطارات · عرض')).toBeTruthy();
    expect(within(allowed).getByText('صحة المطارات · تعديل')).toBeTruthy();
    expect(within(allowed).getByText('كادر صحة المطارات · عرض')).toBeTruthy();

    // بقية الكتالوج (13 − 3) = مستبعد.
    expect(denied.querySelectorAll('.MuiChip-root')).toHaveLength(10);
    expect(within(denied).getByText('الفحوصات · حذف')).toBeTruthy();
    expect(within(denied).getByText('كادر صحة المطارات · تعديل')).toBeTruthy();
  });

  it('never renders the fabricated PERMISSIONS fixture strings', async () => {
    wrap(<AirportDirectorPage />);
    await screen.findByTestId('rbac-allowed');
    expect(screen.queryByText('عرض التقارير اليومية / الأسبوعية / الشهرية')).toBeNull();
    expect(screen.queryByText('أخذ العينات الشخصية للمسافرين')).toBeNull();
    expect(screen.queryByText('إصدار أوامر تفتيش رحلات')).toBeNull();
  });

  it('prefers /auth/permissions/tree/ codes when the call succeeds', async () => {
    vi.mocked(getPermissionTree).mockResolvedValue({
      data: { status: 'success', data: permissionTreeFixture },
    } as never);
    wrap(<AirportDirectorPage />);

    const allowed = await screen.findByTestId('rbac-allowed');
    const denied = screen.getByTestId('rbac-denied');

    // الكتالوج من الشجرة فقط: عرض/إضافة لصحة المطارات.
    expect(allowed.querySelectorAll('.MuiChip-root')).toHaveLength(1);
    expect(within(allowed).getByText('صحة المطارات · عرض')).toBeTruthy();
    expect(denied.querySelectorAll('.MuiChip-root')).toHaveLength(1);
    expect(within(denied).getByText('صحة المطارات · إضافة')).toBeTruthy();
    // مورد غير موجود في الشجرة — يثبت أن الكتالوج المحلي لم يُستخدم.
    expect(screen.queryByText('كادر صحة المطارات · عرض')).toBeNull();
  });

  it('shows the permissions empty state only when no codes are available', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      data: { status: 'success', data: { ...profileFixture, effective_permissions: [] } },
    } as never);
    vi.mocked(getPermissionTree).mockResolvedValue({
      data: { status: 'success', data: {} },
    } as never);
    wrap(<AirportDirectorPage />);
    expect(await screen.findByText(/لا توجد صلاحيات قابلة للعرض/)).toBeTruthy();
  });
});
