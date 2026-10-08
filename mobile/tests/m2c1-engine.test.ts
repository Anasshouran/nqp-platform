/**
 * M2-C1 — محرك المزامنة: إقلاع، تحميل كاش، توفيق خادم-مرجعي، عزل/خروج/انتهاء،
 * إعادة محاولة محدودة، SERVER WINS.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { makeStore } from '../src/state/store';
import { __setReposForTests } from '../src/services/provider';
import { __setTokenStorageForTests } from '../src/state';
import { InMemorySecureTokenStorage } from '../src/security/secureStorage';
import { PersistentCache, type DatasetStorage } from '../src/offline/persist/persistentCache';
import { InMemoryScopeMarker } from '../src/offline/scope';
import { __setPersistentCacheForTests } from '../src/services/cacheProvider';
import {
  bootstrapOffline,
  cancelRetries,
  resetRetries,
} from '../src/offline/engine';
import { logout } from '../src/state';
import type { Repositories } from '../src/services/repositories';
import type { AppDispatch } from '../src/state';

class InMemoryDatasetStorage implements DatasetStorage {
  private map = new Map<string, string>();
  async getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  async removeItem(k: string) {
    this.map.delete(k);
  }
  has(k: string) {
    return this.map.has(k);
  }
  count() {
    return this.map.size;
  }
}

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  full_name: 'أحمد',
  email: 'a@x.com',
  phone: '',
  national_id: '1',
  user_type: 'TRAVELER',
};
const cert = {
  id: '22222222-2222-4222-8222-222222222222',
  certificate_number: 'AFY-1',
  vaccine_name: 'لقاح',
  issued_at: '2026-01-01T00:00:00Z',
  valid_until: '2027-01-01',
  status: 'ACTIVE',
};

let store: ReturnType<typeof makeStore>;
let dispatch: AppDispatch;
let storage: InMemoryDatasetStorage;
let scope: InMemoryScopeMarker;
let tokens: InMemorySecureTokenStorage;
let calls: Record<string, number>;

function fakeRepos(over: Partial<Repositories> = {}): Repositories {
  const base: Repositories = {
    auth: {
      async login() {
        return { accessToken: 'at', refreshToken: 'rt', expiresInSeconds: 1800 };
      },
      async refresh() {
        return { accessToken: 'at', expiresInSeconds: 1800 };
      },
      async logout() {},
    },
    profile: {
      get: async () => {
        calls['profile'] = (calls['profile'] ?? 0) + 1;
        return profile;
      },
    },
    certificates: {
      list: async () => {
        calls['certificates'] = (calls['certificates'] ?? 0) + 1;
        return over.certificates ? await over.certificates!.list() : [cert];
      },
      detail: async (_id) => cert,
    },
    requirements: { list: async () => [] },
    declarations: { list: async () => [] },
    notifications: {
      list: async () => [],
      markRead: async (id) => ({ id, channel: 'push', status: 'sent', subject: '', is_read: true, read_at: null, sent_at: null, created_at: '' }),
    },
    sync: { status: async () => ({ last_synced_at: null, pending_count: 0, server_time: 'x', contract_version: 'v1', unread_notifications: 0 }) },
    trips: { list: async () => [] },
  };
  return { ...base, ...over } as Repositories;
}

beforeEach(() => {
  storage = new InMemoryDatasetStorage();
  scope = new InMemoryScopeMarker();
  tokens = new InMemorySecureTokenStorage();
  calls = {};
  __setPersistentCacheForTests(new PersistentCache(storage, 'v1'), scope);
  __setTokenStorageForTests(tokens);
  __setReposForTests(fakeRepos());
  resetRetries();
  store = makeStore();
  dispatch = store.dispatch;
});

afterEach(() => {
  resetRetries();
});

describe('bootstrap — online cold start (Scenario A)', () => {
  it('restores session, fetches server data, persists encrypted cache, SYNCED', async () => {
    await tokens.setAccessToken('at');
    const result = await dispatch(bootstrapOffline('online')).unwrap();
    expect(result.status).toBe('RECONCILED_ONLINE');
    expect(store.getState().session.status).toBe('signed_in');
    expect(store.getState().profile.data?.full_name).toBe('أحمد');
    expect(store.getState().certificates.data).toHaveLength(1);
    expect(store.getState().ui.syncState).toBe('SYNCED');
    // الكاش مستمر ونطاقه من معرف المسافر (من الخادم)
    const persisted = new PersistentCache(storage, 'v1');
    expect((await persisted.load('11111111-1111-4111-8111-111111111111', 'certificates'))?.data).toEqual([cert]);
  });
});

describe('bootstrap — offline cold start (Scenarios B/C)', () => {
  it('hydrates cached data flagged as cached, without calling the API', async () => {
    await tokens.setAccessToken('at');
    await scope.set('userA');
    const cache = new PersistentCache(storage, 'v1');
    await cache.save('userA', 'profile', profile, 60);
    await cache.save('userA', 'certificates', [cert], 60);

    let apiCalls = 0;
    const reposWithGuard = fakeRepos();
    const original = reposWithGuard.profile.get;
    reposWithGuard.profile.get = async () => {
      apiCalls += 1;
      return original();
    };
    __setReposForTests(reposWithGuard);

    const result = await dispatch(bootstrapOffline('offline')).unwrap();
    expect(result.status).toBe('HYDRATED_CACHE');
    expect(store.getState().profile.isCached).toBe(true);
    expect(store.getState().certificates.isCached).toBe(true);
    expect(store.getState().ui.connectivity).toBe('offline');
    expect(apiCalls).toBe(0);
  });

  it('no cache → deterministic empty/offline state without crash', async () => {
    await tokens.setAccessToken('at');
    await scope.set('userA');
    const result = await dispatch(bootstrapOffline('offline')).unwrap();
    expect(result.status).toBe('PARTIAL_STALE');
    expect(store.getState().profile.data).toBeNull();
    expect(store.getState().profile.isCached).toBe(false);
  });
});

describe('no session (Scenario D) — purge protected cache', () => {
  it('no token → signed_out, cached protected data purged', async () => {
    await scope.set('userA');
    const cache = new PersistentCache(storage, 'v1');
    await cache.save('userA', 'certificates', [cert], 60);
    const result = await dispatch(bootstrapOffline('online')).unwrap();
    expect(result.status).toBe('SKIPPED_NO_SESSION');
    expect(store.getState().session.status).toBe('signed_out');
    expect(await cache.load('userA', 'certificates')).toBeNull();
  });
});

describe('isolation & logout (Scenario E, §3)', () => {
  it('logout purges protected cache and scope marker', async () => {
    await tokens.setAccessToken('at');
    await scope.set('userA');
    const cache = new PersistentCache(storage, 'v1');
    await cache.save('userA', 'notifications', ['n'], 60);
    await scope.set('userA');

    await dispatch(logout());

    expect(await tokens.getAccessToken()).toBeNull();
    expect(await cache.load('userA', 'notifications')).toBeNull();
    expect(await scope.get()).toBeNull();
    expect(store.getState().session.status).toBe('signed_out');
  });

  it('account switch: user B cannot read A cached data', async () => {
    const cache = new PersistentCache(storage, 'v1');
    await cache.save('userA', 'profile', { ...profile, full_name: 'أحمد' }, 60);
    await scope.set('userB');
    const read = await cache.load<typeof profile>('userB', 'profile');
    expect(read).toBeNull(); // مفتاح النطاق مختلف
    const readA = await cache.load<typeof profile>('userA', 'profile');
    expect(readA?.data.full_name).toBe('أحمد'); // A لوحده
  });
});

describe('SERVER WINS reconciliation (Scenario §6/§8)', () => {
  it('stale local cache is replaced by fresher server state', async () => {
    await tokens.setAccessToken('at');
    await scope.set('userA');
    const cache = new PersistentCache(storage, 'v1');
    await cache.save('userA', 'profile', { ...profile, full_name: 'قديم' }, 60);

    __setReposForTests(fakeRepos({ profile: { get: async () => ({ ...profile, full_name: 'جديد' }) } }));
    await dispatch(bootstrapOffline('online')).unwrap();
    expect(store.getState().profile.data?.full_name).toBe('جديد');
    expect(store.getState().profile.isCached).toBe(false);
    // نطاق الكاش من معرف الخادم (profile.id) — SERVER WINS استبدل النسخة القديمة
    const persisted = await cache.load<typeof profile>(profile.id, 'profile');
    expect(persisted?.data.full_name).toBe('جديد');
  });
});

describe('bounded retry & cancellation (§7)', () => {
  it('transient failures retried to bound then SYNC_FAILED without infinite loop', async () => {
    await tokens.setAccessToken('at');
    let certAttempts = 0;
    __setReposForTests(
      fakeRepos({
        certificates: {
          list: async () => {
            certAttempts += 1;
            throw { httpStatus: 0 };
          },
          detail: async (_id) => cert,
        },
      }),
    );
    const result = await dispatch(bootstrapOffline('online')).unwrap();
    expect(result.status).toBe('SYNC_FAILED');
    expect(store.getState().ui.syncState).toBe('FAILED');
    expect(certAttempts).toBeLessThanOrEqual(3);
    expect(certAttempts).toBeGreaterThan(0);
  });

  it('cancellation stops retry activity promptly (logout during sync)', async () => {
    await tokens.setAccessToken('at');
    let profileCalls = 0;
    __setReposForTests(
      fakeRepos({
        profile: {
          get: async () => {
            profileCalls += 1;
            if (profileCalls >= 2) cancelRetries(); // يُحاكي logout أثناء المحاولة
            throw { httpStatus: 0 };
          },
        },
      }),
    );
    const result = await dispatch(bootstrapOffline('online')).unwrap();
    expect(result.status).toBe('SYNC_FAILED');
    expect(profileCalls).toBeLessThanOrEqual(3);
    expect(profileCalls).toBeGreaterThan(0);
  });
});