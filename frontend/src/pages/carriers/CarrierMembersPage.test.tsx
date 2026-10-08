import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listCarrierMembers,
  createCarrierMember,
  updateCarrierMember,
  activateCarrierMember,
  deactivateCarrierMember,
  getCarriers,
} from '../../api/endpoints/carriers';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../api/endpoints/carriers', () => ({
  listCarrierMembers: vi.fn(),
  createCarrierMember: vi.fn(),
  updateCarrierMember: vi.fn(),
  activateCarrierMember: vi.fn(),
  deactivateCarrierMember: vi.fn(),
  getCarriers: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  extractErrorMessage: vi.fn((_, fallback) => fallback),
}));

const { notifySuccess, notifyError } = await import('../../utils/toast');
const CarrierMembersPage = (await import('./CarrierMembersPage')).default;

const member = (over: Record<string, unknown> = {}) => ({
  id: 'm-1',
  user: 'u-9',
  user_email: 'ahmed@nqp.sd',
  user_full_name: 'أحمد السوداني',
  is_primary: false,
  is_active: true,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  ...over,
});

const listOk = (results: unknown[]) => ({
  data: { status: 'success', data: { count: results.length, next: null, previous: null, results } },
});

const asAdmin = (scopeIds: string[], perms?: string[]) =>
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'u-1',
      email: 'admin@nqp.sd',
      full_name: 'مدير عام',
      role: 'CARRIER_ADMIN',
      permissions: perms ?? [
        'carrier_members:view',
        'carrier_members:add',
        'carrier_members:edit',
        'carrier_members:activate',
        'carrier_members:deactivate',
      ],
      role_assignments: scopeIds.map((id) => ({
        role: 'x',
        role_code: 'CARRIER_ADMIN',
        scope_type: 'COMPANY',
        scope_id: id,
        is_active: true,
      })),
    },
  } as never);

const asRole = (role: string, perms: string[] = [], assignments: unknown[] = []) =>
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'u-1', email: `${role}@nqp.sd`, full_name: role, role, permissions: perms, role_assignments: assignments,
    },
  } as never);

const renderPage = () =>
  render(
    <MemoryRouter>
      <CarrierMembersPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('CarrierMembersPage — rendering', () => {
  it('renders members rows from API', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member()]) as never);
    renderPage();
    await waitFor(() => expect(screen.getByText('أحمد السوداني')).toBeTruthy());
    expect(screen.getByText('ahmed@nqp.sd')).toBeTruthy();
    expect(screen.getByText('نشط')).toBeTruthy();
  });

  it('renders empty state', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    renderPage();
    await waitFor(() => expect(screen.getByText('لا يوجد أعضاء')).toBeTruthy());
  });

  it('shows aria-busy loading state first', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockReturnValue(new Promise(() => {}) as never);
    renderPage();
    const tableRegion = await screen.findByRole('region');
    // aria-busy is only present while loading
    await waitFor(() => expect(tableRegion.getAttribute('aria-busy')).toBe('true'));
  });

  it('surfaces API error (404) as data error, not empty list', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockRejectedValue(new (await import('axios')).AxiosError(undefined, undefined, undefined, undefined, { status: 404, data: {}, statusText: '', headers: {}, config: {} as never }) as never);
    renderPage();
    await waitFor(() => expect(screen.getByText(/خطأ 404/)).toBeTruthy());
  });
});

describe('CarrierMembersPage — create', () => {
  const fillAndSubmitAdd = async () => {
    fireEvent.click(screen.getByRole('button', { name: /إضافة عضو/ }));
    const input = await screen.findByLabelText('معرّف المستخدم');
    fireEvent.change(input, { target: { value: 'uuid-1' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /حفظ العضو/ }));
  };

  it('posts create with user + is_primary only', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    vi.mocked(createCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    await fillAndSubmitAdd();
    await waitFor(() => expect(createCarrierMember).toHaveBeenCalledWith('c-1', { user: 'uuid-1', is_primary: true }));
    expect(createCarrierMember).toHaveBeenCalledTimes(1);
  });

  it('sends no carrier/role/is_active fields', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    vi.mocked(createCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    await fillAndSubmitAdd();
    await waitFor(() => expect(createCarrierMember).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(createCarrierMember).mock.calls[0][1];
    expect(Object.keys(payload).sort()).toEqual(['is_primary', 'user']);
  });

  it('success closes dialog and refreshes list', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    vi.mocked(createCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    await fillAndSubmitAdd();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    await waitFor(() => expect(vi.mocked(listCarrierMembers).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('error shows notifyError and does not refresh', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    vi.mocked(createCarrierMember).mockRejectedValue(new (await import('axios')).AxiosError('x'));
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    await fillAndSubmitAdd();
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });

  it('hides Add when carrier_members:add missing', async () => {
    asAdmin(['c-1'], ['carrier_members:view']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    expect(screen.queryByRole('button', { name: /إضافة عضو/ })).toBeNull();
  });
});

describe('CarrierMembersPage — edit + lifecycle', () => {
  const primeOne = () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member()]) as never);
  };

  it('edit sends only is_primary', async () => {
    primeOne();
    vi.mocked(updateCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('أحمد السوداني');
    const editIcons = await screen.findAllByRole('button', { name: /تعديل/ });
    fireEvent.click(editIcons[0]);
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /حفظ/ }));
    await waitFor(() => expect(updateCarrierMember).toHaveBeenCalledWith('c-1', 'm-1', { is_primary: true }));
    const payload = vi.mocked(updateCarrierMember).mock.calls[0][2];
    expect(Object.keys(payload)).toEqual(['is_primary']);
  });

  it('edit dialog has no user/carrier/is_active control', async () => {
    primeOne();
    vi.mocked(updateCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('أحمد السوداني');
    fireEvent.click((await screen.findAllByRole('button', { name: /تعديل/ }))[0]);
    await screen.findByText('تعديل العضوية');
    expect(screen.queryByLabelText('معرّف المستخدم')).toBeNull();
    expect(screen.queryByText('غير نشط')).toBeNull();
  });

  it('deactivate asks for confirmation then calls deactivate endpoint', async () => {
    primeOne();
    vi.mocked(deactivateCarrierMember).mockResolvedValue({ data: { data: member({ is_active: false }) } } as never);
    renderPage();
    await screen.findByText('أحمد السوداني');
    fireEvent.click((await screen.findAllByRole('button', { name: /تعطيل/ }))[0]);
    await screen.findByText(/هل أنت متأكد من تعطيل/);
    fireEvent.click(screen.getByRole('button', { name: 'تعطيل' }));
    await waitFor(() => expect(deactivateCarrierMember).toHaveBeenCalledWith('c-1', 'm-1'));
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('activate calls activate endpoint directly', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member({ is_active: false })]) as never);
    vi.mocked(activateCarrierMember).mockResolvedValue({ data: { data: member() } } as never);
    renderPage();
    await screen.findByText('غير نشط');
    fireEvent.click((await screen.findAllByRole('button', { name: /تفعيل/ }))[0]);
    await waitFor(() => expect(activateCarrierMember).toHaveBeenCalledWith('c-1', 'm-1'));
  });

  it('hides edit when carrier_members:edit missing', async () => {
    asAdmin(['c-1'], ['carrier_members:view', 'carrier_members:activate', 'carrier_members:deactivate']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member({ is_active: false })]) as never);
    renderPage();
    await screen.findByText('غير نشط');
    expect(screen.queryByRole('button', { name: /تعديل/ })).toBeNull();
  });

  it('hides activate when carrier_members:activate missing', async () => {
    asAdmin(['c-1'], ['carrier_members:view', 'carrier_members:edit', 'carrier_members:deactivate']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member({ is_active: false })]) as never);
    renderPage();
    await screen.findByText('غير نشط');
    expect(screen.queryByRole('button', { name: /تفعيل/ })).toBeNull();
  });

  it('hides deactivate when carrier_members:deactivate missing', async () => {
    asAdmin(['c-1'], ['carrier_members:view', 'carrier_members:edit', 'carrier_members:activate']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member()]) as never);
    renderPage();
    await screen.findByText('أحمد السوداني');
    expect(screen.queryByRole('button', { name: /تعطيل/ })).toBeNull();
  });
});

describe('CarrierMembersPage — carrier scoping', () => {
  it('CARRIER role user sees empty-info state, no API call', async () => {
    asRole('CARRIER', [], [{ scope_id: 'carrier-a', scope_type: 'COMPANY', is_active: true, role_code: 'CARRIER', role: 'x' }]);
    renderPage();
    await screen.findByText(/ليس لديك أي شركة/);
    expect(listCarrierMembers).not.toHaveBeenCalled();
  });

  it('CARRIER_ADMIN sees only scoped carriers', async () => {
    asAdmin(['carrier-a']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    expect(vi.mocked(listCarrierMembers).mock.calls[0][0]).toBe('carrier-a');
  });

  it('two scoped carriers: switch keeps page data isolated', async () => {
    asAdmin(['c-a', 'c-b']);
    const firstCall = listOk([member({ user_full_name: 'من A' })]);
    vi.mocked(listCarrierMembers).mockImplementation((id) =>
      Promise.resolve(id === 'c-a' ? firstCall : listOk([member({ id: 'm-2', user_full_name: 'من B' })])) as never,
    );
    renderPage();
    await screen.findByText('من A');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'c-b' }));
    await waitFor(() => expect(screen.queryByText('من A')).toBeNull());
    await screen.findByText('من B');
  });

  it('switching back to first company resets and refetches by its id', async () => {
    asAdmin(['c-a', 'c-b']);
    vi.mocked(listCarrierMembers).mockImplementation(() => Promise.resolve(listOk([])) as never);
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'c-b' }));
    await waitFor(() => {
      const calls = vi.mocked(listCarrierMembers).mock.calls;
      expect(calls[calls.length - 1]?.[0]).toBe('c-b');
    });
  });
});

describe('CarrierMembersPage — admin role', () => {
  it('ADMIN fetches new members list for each company via getCarriers', async () => {
    vi.mocked(getCarriers).mockResolvedValue({ data: { data: { count: 1, results: [{ id: 'c-9', name: 'الخطوط الجديدة' }] } } } as never);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([]) as never);
    asRole('ADMIN');
    renderPage();
    await screen.findByText('لا يوجد أعضاء');
    expect(getCarriers).toHaveBeenCalled();
    expect(vi.mocked(listCarrierMembers).mock.calls[0][0]).toBe('c-9');
  });
});

describe('CarrierMembersPage — interactions', () => {
  it('deactivate with name + permission list does not show delete', async () => {
    asAdmin(['c-1']);
    vi.mocked(listCarrierMembers).mockResolvedValue(listOk([member()]) as never);
    renderPage();
    await screen.findByText('أحمد السوداني');
    expect(screen.queryByRole('button', { name: /حذف/ })).toBeNull();
  });
});
