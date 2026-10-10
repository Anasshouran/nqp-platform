import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import LayoutChrome from './LayoutChrome';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { pendingCount } from '../../utils/vectorOffline';

vi.mock('../../api/endpoints/auth', () => ({ logout: vi.fn() }));
vi.mock('../../utils/vectorOffline', () => ({ pendingCount: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../store/slices/authSlice', () => ({ logout: () => ({ type: 'auth/logout' }) }));

import { useAuth } from '../../hooks/useAuth';

const store = configureStore({ reducer: (s = {}) => s });

const setup = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LayoutChrome drawerWidth={240} accent="#0c7f6a" onOpenMobile={() => {}} title="لوحة التحكم" subtitle="Federal" />
      </MemoryRouter>
    </Provider>,
  );

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', full_name: 'مستخدم', email: 'u@nqp.sd', role: 'ADMIN', is_active: true },
    token: 't',
    isAuthenticated: true,
  } as never);
  vi.mocked(logoutApi).mockReset();
  vi.mocked(logoutApi).mockResolvedValue({} as never);
  vi.mocked(pendingCount).mockReset();
  vi.mocked(pendingCount).mockResolvedValue(0);
  localStorage.clear();
  localStorage.setItem('refresh_token', 'refresh-token');
});

describe('LayoutChrome — تحذير تسجيل الخروج عند وجود عمليات محفوظة محلياً', () => {
  it('يسجّل الخروج مباشرة عندما لا توجد عمليات محفوظة', async () => {
    vi.mocked(pendingCount).mockResolvedValue(0);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'قائمة المستخدم' }));
    fireEvent.click(screen.getByText('تسجيل الخروج'));

    await waitFor(() => expect(logoutApi).toHaveBeenCalled());
    expect(screen.queryByText(/لم تتم مزامنتها/)).toBeNull();
  });

  it('يعرض ConfirmDialog عندما توجد عمليات محفوظة بانتظار المزامنة', async () => {
    vi.mocked(pendingCount).mockResolvedValue(2);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'قائمة المستخدم' }));
    fireEvent.click(screen.getByText('تسجيل الخروج'));

    await waitFor(() => expect(screen.getByText('عمليات محفوظة محلياً')).toBeTruthy());
    expect(screen.getByText(/لم تتم مزامنتها/)).toBeTruthy();
    // لم يُنفَّذ تسجيل الخروج بعد
    expect(logoutApi).not.toHaveBeenCalled();
  });

  it('يُنفذ تسجيل الخروج ويُفرغ القائمة بعد تأكيد المستخدم', async () => {
    vi.mocked(pendingCount).mockResolvedValue(1);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'قائمة المستخدم' }));
    fireEvent.click(screen.getByText('تسجيل الخروج'));

    await waitFor(() => expect(screen.getByText('عمليات محفوظة محلياً')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));

    await waitFor(() => expect(logoutApi).toHaveBeenCalled());
  });
});