import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LayoutChrome from './LayoutChrome';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/endpoints/auth', () => ({ logout: vi.fn() }));
vi.mock('../../utils/vectorOffline', () => ({ pendingCount: vi.fn() }));
vi.mock('../../store/slices/authSlice', () => ({ logout: () => ({ type: 'auth/logout' }) }));
vi.mock('../../hooks/useApi', () => ({ useApi: vi.fn() }));
vi.mock('../../api/endpoints/notifications', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  notifyNotificationsChanged: vi.fn(),
  NOTIFICATIONS_CHANGED_EVENT: 'notifications:changed',
}));

import { useAuth } from '../../hooks/useAuth';
import { getUnreadNotificationCount } from '../../api/endpoints/notifications';

const store = configureStore({ reducer: (s = {}) => s });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', full_name: 'م', email: 'u@n.sd', role: 'ADMIN', is_active: true },
    token: 't',
    isAuthenticated: true,
  } as never);
  vi.mocked(getUnreadNotificationCount).mockResolvedValue({ data: { data: 0 } } as never);
});

describe('i18n contract — سلوك اللغة صريح وأصلي عربي للموظفين', () => {
  it('شريط الهيكل للموظف لا يعرض مبدّل لغة عالمياً مضلل (الواجهة التشغيلية عربية أولاً)', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <LayoutChrome drawerWidth={240} accent="#0c7f6a" onOpenMobile={() => {}} title="لوحة التحكم" subtitle="Federal" />
        </MemoryRouter>
      </Provider>,
    );

    // لا يوجد أي عنصر لتبديل اللغة في هيكل الموظف — العربية أولاً بلا ادعاء ثنائية
    // غير مكتملة.
    const langControls = screen.queryByRole('group', { name: /language|اللغة/i });
    expect(langControls).toBeNull();
    const englishButtons = screen.queryAllByRole('button', { name: 'EN' });
    expect(englishButtons).toHaveLength(0);
  });
});