import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/vectorOffline', () => ({
  clearPendingMutations: vi.fn().mockResolvedValue(undefined),
}));

import { clearPendingMutations } from '../../utils/vectorOffline';
import reducer, { logout, setCredentials } from '../slices/authSlice';

describe('authSlice — تسجيل الخروج يمسح قائمة الانتظار المحلية', () => {
  beforeEach(() => {
    vi.mocked(clearPendingMutations).mockClear();
    localStorage.clear();
  });

  const mockToken = () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: 'user-1',
        user_id: 'user-1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        role_code: 'SUPER_ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) - 10,
        jti: 'abc',
        token_type: 'access',
      }),
    );
    return `${header}.${payload}.sig`;
  };

  it('يحفظ بيانات الاعتماد في localStorage أثناء تسجيل الدخول', () => {
    const initial = { user: null, token: null, refreshToken: null };
    const state = reducer(
      initial,
      setCredentials({
        user: { id: 'u', username: 'admin', full_name: 'م' },
        token: mockToken(),
        refreshToken: 'r',
      } as never),
    ) as { user: null; token: string; refreshToken: string };
    expect(state.token).toBeTruthy();
    expect(localStorage.getItem('access_token')).toBeTruthy();
  });

  it('يستدعي clearPendingMutations عند الخروج', () => {
    const initial = { user: null, token: mockToken(), refreshToken: 'r' };
    reducer(initial, logout());
    expect(clearPendingMutations).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});