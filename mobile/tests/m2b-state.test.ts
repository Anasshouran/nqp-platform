/**
 * M2-B — أمان الجلسة والبيانات (القسم 28): خروج/تبديل حساب/انتهاء جلسة/عزل كاش.
 * يستخدم مخزناً حقيقياً مع مستودعات وتخزين رموز مخولان في الاختبارات فقط.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ApiContractError } from '../src/api/client';
import { makeStore, type AppDispatch } from '../src/state/store';
import {
  __setReposForTests,
  getRepos,
} from '../src/services/provider';
import {
  __setTokenStorageForTests,
  login,
  logout,
  sessionExpired,
  fetchCertificates,
  fetchProfile,
  setUser,
} from '../src/state';
import { InMemorySecureTokenStorage } from '../src/security/secureStorage';
import type { Repositories } from '../src/services/repositories';
import type { MobileCertificate } from '@afyatna/contracts';

const certA: MobileCertificate = {
  id: '11111111-1111-4111-8111-111111111111',
  certificate_number: 'AFY-A',
  vaccine_name: 'لقاح أ',
  issued_at: '2026-01-01T00:00:00Z',
  valid_until: '2027-01-01',
  status: 'ACTIVE',
};
const certB: MobileCertificate = {
  id: '22222222-2222-4222-8222-222222222222',
  certificate_number: 'AFY-B',
  vaccine_name: 'لقاح ب',
  issued_at: '2026-02-01T00:00:00Z',
  valid_until: '2027-02-01',
  status: 'ACTIVE',
};

function fakeRepos(over: Partial<Repositories> = {}): Repositories {
  const base = getRepos();
  return {
    ...base,
    auth: {
      ...base.auth,
      async login(identifier: string) {
        const who = identifier.includes('a') ? 'a' : 'b';
        return { accessToken: `at-${who}`, refreshToken: `rt-${who}`, expiresInSeconds: 1800 };
      },
      async refresh() {
        return { accessToken: 'at-new', expiresInSeconds: 1800 };
      },
      async logout() {},
    },
    ...over,
  };
}

let dispatch: AppDispatch;
let tokens: InMemorySecureTokenStorage;

beforeEach(() => {
  tokens = new InMemorySecureTokenStorage();
  __setTokenStorageForTests(tokens);
});
afterEach(() => {
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});

function freshStore() {
  const store = makeStore();
  dispatch = store.dispatch;
  return store;
}

describe('session security (M2-B §28)', () => {
  it('login persists tokens securely and signs in', async () => {
    __setReposForTests(fakeRepos());
    const store = freshStore();
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    expect(store.getState().session.status).toBe('signed_in');
    expect(await tokens.getAccessToken()).toBe('at-a');
  });

  it('logout purges tokens AND all user data from state', async () => {
    __setReposForTests(fakeRepos({
      certificates: { list: async () => [certA], detail: async () => certA },
    }));
    const store = freshStore();
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    await dispatch(fetchCertificates());
    expect(store.getState().certificates.data).toEqual([certA]);

    await dispatch(logout());
    expect(store.getState().session.status).toBe('signed_out');
    expect(store.getState().session.user).toBeNull();
    expect(store.getState().certificates.data).toBeNull();
    expect(await tokens.getAccessToken()).toBeNull();
  });

  it('account switch never leaks previous traveler data', async () => {
    const store = freshStore();
    // Traveler A
    __setReposForTests(fakeRepos({ certificates: { list: async () => [certA], detail: async () => certA } }));
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    await dispatch(fetchCertificates());
    expect(store.getState().certificates.data).toEqual([certA]);
    await dispatch(logout());

    // Traveler B
    __setReposForTests(fakeRepos({ certificates: { list: async () => [certB], detail: async () => certB } }));
    await dispatch(login({ identifier: 'b@x', password: 'p' }));
    await dispatch(fetchCertificates());
    const certs = store.getState().certificates.data ?? [];
    expect(certs.map((c) => c.id)).toEqual(['22222222-2222-4222-8222-222222222222']);
    expect(certs.some((c) => c.id === '11111111-1111-4111-8111-111111111111')).toBe(false);
  });

  it('401 during a fetch forces session_expired and purges cached sensitive rows', async () => {
    __setReposForTests(fakeRepos({
      certificates: { list: async () => [certA], detail: async () => certA },
      profile: {
        get: async () => {
          throw new ApiContractError(401, { code: 'AUTH_REQUIRED', ar: 'يجب تسجيل الدخول', en: 'Authentication required' });
        },
      },
    }));
    const store = freshStore();
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    await dispatch(fetchCertificates());
    expect(store.getState().certificates.data).toEqual([certA]);
    await dispatch(fetchProfile());
    expect(store.getState().session.status).toBe('session_expired');
    expect(store.getState().certificates.data).toBeNull();
    // لا بقاء لأي بيانات حساسة بعد انتهاء الجلسة
    const serialized = JSON.stringify(store.getState());
    expect(serialized).not.toContain('AFY-A');
  });

  it('sessionExpired emulates expired-token handling without leaving stale data', async () => {
    __setReposForTests(fakeRepos({ certificates: { list: async () => [certA], detail: async () => certA } }));
    const store = freshStore();
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    await dispatch(fetchCertificates());
    await dispatch(setUser({ id: '11111111-1111-4111-8111-111111111111', fullName: 'أحمد', email: 'a@nqp.gov.sd' }));
    await dispatch(sessionExpired());
    expect(store.getState().session.status).toBe('session_expired');
    expect(store.getState().certificates.data).toBeNull();
    expect(await tokens.getAccessToken()).toBeNull();
  });

  it('offline long is mappable: network error marks connectivity offline (not a security state)', async () => {
    __setReposForTests(fakeRepos({
      profile: {
        get: async () => {
          throw new ApiContractError(0, { code: 'SERVER_ERROR', ar: 'x', en: 'x' });
        },
      },
    }));
    const store = freshStore();
    await dispatch(login({ identifier: 'a@x', password: 'p' }));
    await dispatch(fetchProfile());
    expect(store.getState().ui.connectivity).toBe('offline');
    expect(store.getState().session.status).toBe('signed_in'); // الاتصال ≠ انتهاء الجلسة
  });
});