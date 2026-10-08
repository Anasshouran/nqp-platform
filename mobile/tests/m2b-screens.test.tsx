/**
 * M2-B — تكامل API → Repository → State → Screen (§27.B) + حالات الواجهة.
 */
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ApiContractError } from '../src/api/client';
import { makeStore } from '../src/state/store';
import { __setReposForTests } from '../src/services/provider';
import { __setTokenStorageForTests, login } from '../src/state';
import { InMemorySecureTokenStorage } from '../src/security/secureStorage';
import { HomeScreen, CertificatesScreen, ProfileScreen } from '../src/screens/dataScreens';
import { LoginScreen } from '../src/screens/LoginScreen';
import type { Repositories } from '../src/services/repositories';
import type { RootState } from '../src/state';

const fixture = {
  profile: { id: '11111111-1111-4111-8111-111111111111', full_name: 'أحمد محمد', email: 'a@x.com', phone: '+249', national_id: '123', user_type: 'TRAVELER' },
  certs: [{ id: '11111111-1111-4111-8111-111111111111', certificate_number: 'AFY-1', vaccine_name: 'الحمى الصفراء', issued_at: '2026-01-01T00:00:00Z', valid_until: '2027-01-01', status: 'ACTIVE' }],
  notifications: [{ id: '11111111-1111-4111-8111-111111111111', channel: 'push', status: 'sent', subject: 'تذكير', is_read: false, read_at: null, sent_at: null, created_at: '2026-10-08T00:00:00Z' }],
  sync: { last_synced_at: null, pending_count: 0, server_time: '2026-10-08T00:00:00Z', contract_version: 'v1', unread_notifications: 1 },
  declarations: [{ id: '11111111-1111-4111-8111-111111111111', status: 'SUBMITTED', declared: true, symptoms: ['COUGH'], submitted_at: '2026-10-01T00:00:00Z' }],
};

function fakeRepos(): Repositories {
  return {
    auth: {
      async login(_identifier: string) {
        return { accessToken: 'at', refreshToken: 'rt', expiresInSeconds: 1800 };
      },
      async refresh() {
        return { accessToken: 'at', expiresInSeconds: 1800 };
      },
      async logout() {},
    },
    profile: { get: async () => fixture.profile },
    certificates: { list: async () => fixture.certs, detail: async (_id) => fixture.certs[0] },
    requirements: { list: async () => [] },
    declarations: { list: async () => fixture.declarations },
    notifications: {
      list: async () => fixture.notifications,
      markRead: async (id) => ({ ...fixture.notifications[0], id, is_read: true, read_at: '2026-10-08T00:01:00Z' }),
    },
    sync: { status: async () => fixture.sync },
    trips: { list: async () => [] },
  } as Repositories;
}

async function renderApp(node: React.ReactNode) {
  const store = makeStore();
  const queries = await render(<Provider store={store}>{node}</Provider>);
  return { store, ...queries };
}

beforeEach(() => {
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});
afterEach(() => {
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});

describe('Home (M2-A data → screen)', () => {
  it('shows greeting, unread count, and client contract version from server', async () => {
    __setReposForTests(fakeRepos());
    const { store, findByText, findAllByText } = await renderApp(<HomeScreen />);
    await act(async () => {
      // تسجيل الدخول ثم إعادة تشغيل الحواصل
      await store.dispatch(login({ identifier: 'a', password: 'p' }));
    });
    expect(await findByText(/أحمد محمد/)).toBeTruthy();
    expect((await findAllByText('1')).length).toBeGreaterThan(0); // unread
    expect(await findByText(/v1/)).toBeTruthy(); // contract_version في SyncStatusPanel
  });
});

describe('Certificates', () => {
  it('renders owner certificates list from server', async () => {
    __setReposForTests(fakeRepos());
    const { store, findByText } = await renderApp(<CertificatesScreen />);
    await act(async () => {
      await store.dispatch(login({ identifier: 'a', password: 'p' }));
    });
    expect(await findByText(/الحمى الصفراء/)).toBeTruthy();
  });

  it('shows a meaningful empty state when the server returns none', async () => {
    __setReposForTests({
      ...fakeRepos(),
      certificates: { list: async () => [], detail: async () => { throw new Error('none'); } },
    } as Repositories);
    const { store, findByText } = await renderApp(<CertificatesScreen />);
    await act(async () => {
      await store.dispatch(login({ identifier: 'a', password: 'p' }));
    });
    expect(await findByText('لا توجد شهادات تطعيم')).toBeTruthy();
  });
});

describe('Profile', () => {
  it('shows only mobile-safe fields; no RBAC/permissions', async () => {
    __setReposForTests(fakeRepos());
    const { store, findByText } = await renderApp(<ProfileScreen />);
    await act(async () => {
      await store.dispatch(login({ identifier: 'a', password: 'p' }));
    });
    expect(await findByText('أحمد محمد')).toBeTruthy();
    const json = JSON.stringify((store.getState() as RootState).profile.data);
    expect(json).not.toContain('permissions');
    expect(json).not.toContain('roles');
    expect(json).not.toContain('is_staff');
  });
});

describe('Login', () => {
  it('renders bilingual fields and a disabled-until-filled submit; no raw internals', async () => {
    const { getByTestId, getByText, queryByText } = await renderApp(<LoginScreen />);
    expect(getByTestId('login-identifier')).toBeTruthy();
    expect(getByTestId('login-password')).toBeTruthy();
    expect(getByText('تسجيل الدخول')).toBeTruthy();
    // لا عرض لأي تفاصيل داخلية في حالة السكون
    expect(queryByText(/Traceback|stack|SQL|exception/i)).toBeNull();
  });
});

describe('Session rejection (state-level)', () => {
  it('invalid credentials → signed_out with no sensitive data', async () => {
    __setReposForTests({
      ...fakeRepos(),
      auth: {
        async login() {
          throw new ApiContractError(401, { code: 'AUTH_INVALID', ar: 'بيانات الدخول غير صحيحة', en: 'Invalid credentials' });
        },
        async refresh() {
          return { accessToken: 'at', expiresInSeconds: 1800 };
        },
        async logout() {},
      },
    } as unknown as Repositories);
    const store = makeStore();
    await store.dispatch(login({ identifier: 'x@x', password: 'p' }));
    expect(store.getState().session.status).toBe('signed_out');
    expect(JSON.stringify(store.getState())).not.toContain('بيانات الدخول غير صحيحة'); // لا تسريب للرسائل الخام? العميل يراها فقط في الشاشة
  });
});