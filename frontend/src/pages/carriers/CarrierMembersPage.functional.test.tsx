import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activateCarrierMember, deactivateCarrierMember, getCarriers,
  listCarrierMembers,
} from '../../api/endpoints/carriers';
import { useAuth } from '../../hooks/useAuth';
import * as toast from '../../utils/toast';

vi.mock('../../api/endpoints/carriers', () => ({
  listCarrierMembers: vi.fn(), createCarrierMember: vi.fn(),
  updateCarrierMember: vi.fn(), activateCarrierMember: vi.fn(),
  deactivateCarrierMember: vi.fn(), getCarriers: vi.fn(),
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(), notifyError: vi.fn(),
  extractErrorMessage: vi.fn(() => 'error'),
}));

const CarrierMembersPage = (await import('./CarrierMembersPage')).default;

const activeMember = {
  id: 'm-1', user_full_name: 'عضو اختبار', is_active: true, carrier_id: 'c-1',
};

const mockList = (arr: any[]) => {
  const a: any = [...arr];
  a.data = a; a.results = a; a.items = a;
  a.count = arr.length; a.total = arr.length;
  a.meta = { total: arr.length, count: arr.length };
  return { data: a, status: 200 };
};

const renderPage = () => render(<MemoryRouter><CarrierMembersPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'u-1',
      full_name: 'مدير الشركة',
      email: 'admin@carrier.test',
      is_active: true,
      role_assignments: [{
        scope_type: 'COMPANY',
        scope_id: 'c-1',
        is_active: true,
        role_code: 'CARRIER_ADMIN',
        role: 'CARRIER_ADMIN',
      }],
    },
    hasRole: () => true, hasAnyRole: () => true, hasPermission: () => true,
    isLoading: false,
  } as any);
  vi.mocked(getCarriers).mockResolvedValue(mockList([{ id: 'c-1', name: 'شركة اختبار' }]) as any);
  vi.mocked(listCarrierMembers).mockResolvedValue(mockList([activeMember]) as any);
});

describe('CarrierMembersPage', () => {
  it('renders members', async () => {
    renderPage();
    await waitFor(() => expect(listCarrierMembers).toHaveBeenCalled());
    expect(await screen.findByText(/عضو اختبار/)).toBeInTheDocument();
  });

  it('deactivates a member', async () => {
    vi.mocked(deactivateCarrierMember).mockResolvedValue({ data: {} } as any);
    renderPage();
    await screen.findByText(/عضو اختبار/);

    fireEvent.click(await screen.findByLabelText('تعطيل'));

    // ⚠️ ConfirmDialog يستخدم confirmLabel="تعطيل" — لا "تأكيد/نعم"
    // نبحث داخل الـ dialog لتجنب الالتباس مع زر الصف
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'تعطيل' });
    fireEvent.click(confirm);

    await waitFor(() => {
      // ⚠️ API يستقبل (carrierId, id) — معاملان
      expect(deactivateCarrierMember).toHaveBeenCalledWith('c-1', 'm-1');
      expect(toast.notifySuccess).toHaveBeenCalled();
    });
  });

  it('activates an inactive member', async () => {
    vi.mocked(listCarrierMembers).mockResolvedValueOnce(
      mockList([{ ...activeMember, is_active: false }]) as any,
    );
    vi.mocked(activateCarrierMember).mockResolvedValue({ data: {} } as any);
    renderPage();
    await screen.findByText(/عضو اختبار/);

    fireEvent.click(await screen.findByLabelText('تفعيل'));

    await waitFor(() => {
      // ⚠️ معاملان أيضاً
      expect(activateCarrierMember).toHaveBeenCalledWith('c-1', 'm-1');
    });
  });
});
