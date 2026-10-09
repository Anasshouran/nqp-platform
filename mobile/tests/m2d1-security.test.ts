/**
 * M2-D1 — اختبارات أمن الحدود (العميل): استمرارية الكاش، كاش تالف، لا رمز
 * في الولاية، لا تسريب أخطاء. (الجانب الخادمي: في apps/travelers/test_medical_history_security)
 */
import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import { makeStore } from '../src/state/store';
import { __setReposForTests } from '../src/services/provider';
import { __setTokenStorageForTests, logout } from '../src/state';
import { InMemorySecureTokenStorage } from '../src/security/secureStorage';
import { PersistentCache, type DatasetStorage } from '../src/offline/persist/persistentCache';
import { InMemoryScopeMarker } from '../src/offline/scope';
import { __setPersistentCacheForTests, getPersistentCache, getScopeMarker } from '../src/services/cacheProvider';
import { bootstrapOffline, resetRetries } from '../src/offline/engine';
import { fetchCertificates } from '../src/state';
import { normalizeError } from '../src/services/errors';
import { ApiContractError } from '../src/api/client';
import type { Repositories } from '../src/services/repositories';

class Mem implements DatasetStorage {
  private m = new Map<string, string>();
  async getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  async removeItem(k: string) {
    this.m.delete(k);
  }
  raw(k: string) {
    return this.m.get(k);
  }
  setRaw(k: string, v: string) {
    this.m.set(k, v);
  }
}

const profileA = { id: '11111111-1111-4111-8111-111111111111', full_name: 'أحمد', email: 'a@x.com', phone: '', national_id: '1', user_type: 'TRAVELER' };
const profileB = { id: '22222222-2222-4222-8222-222222222222', full_name: 'سارة', email: 'b@x.com', phone: '', national_id: '2', user_type: 'TRAVELER' };

let storage: Mem;
let tokens: InMemorySecureTokenStorage;

function reposFor(profile: typeof profileA, certs: unknown[] = []): Repositories {
  return {
    auth: { login: async () => ({ accessToken: 'at', refreshToken: 'rt', expiresInSeconds: 1800 }), refresh: async () => ({ accessToken: 'at', expiresInSeconds: 1800 }), logout: async () => {} },
    profile: { get: async () => profile },
    certificates: { list: async () => certs, detail: async (_id: string) => certs[0] as never },
    requirements: { list: async () => [] },
    declarations: { list: async () => [] },
    notifications: { list: async () => [], markRead: async (id: string) => ({ id, channel: '', status: '', subject: '', is_read: true, read_at: null, sent_at: null, created_at: '' }) },
    sync: { status: async () => ({ last_synced_at: null, pending_count: 0, server_time: 's', contract_version: 'v1', unread_notifications: 0 }) },
    trips: { list: async () => [] },
  } as unknown as Repositories;
}

beforeEach(() => {
  storage = new Mem();
  tokens = new InMemorySecureTokenStorage();
  __setTokenStorageForTests(tokens);
  __setPersistentCacheForTests(new PersistentCache(storage, 'v1'), new InMemoryScopeMarker());
  resetRetries();
});
afterEach(() => {
  resetRetries();
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});

describe('M2-D1 offline-cache adversarial cases', () => {
  it('A cache → logout → restart(offline) → B cannot recover A data', async () => {
    // A login + cache
    __setReposForTests(reposFor(profileA, [{ id: 'cA', certificate_number: 'A-SECRET' } as never]));
    await tokens.setAccessToken('at');
    const storeA = makeStore();
    await storeA.dispatch(bootstrapOffline('online')).unwrap();
    expect(storage.raw('scope:11111111-1111-4111-8111-111111111111:certificates')).toBeTruthy();
    // logout purges + scope clear (import ثابت أعلى الملف)
    await storeA.dispatch(logout());
    expect(storage.raw('scope:11111111-1111-4111-8111-111111111111:certificates')).toBeUndefined();

    // B signs in (fresh tokens) then offline restart
    const t = new InMemorySecureTokenStorage();
    await t.setAccessToken('b-token');
    __setTokenStorageForTests(t);
    __setReposForTests(reposFor(profileB));
    const storeB = makeStore();
    const result = await storeB.dispatch(bootstrapOffline('offline')).unwrap();
    expect(result.status).toBe('PARTIAL_STALE'); // لا كاش لـ B
    const serialized = JSON.stringify(storeB.getState().certificates);
    expect(serialized).not.toContain('A-SECRET');
    expect(storeB.getState().profile.data).toBeNull();
  });

  it('corrupted cache fails safely (returns null, no crash)', async () => {
    const cache = getPersistentCache();
    await cache.save('zz', 'profile', profileA, 60);
    storage.setRaw('scope:zz:profile', 'not-json{'); // تالف
    await getScopeMarker().set('zz');
    await tokens.setAccessToken('at');
    const store = makeStore();
    const result = await store.dispatch(bootstrapOffline('offline')).unwrap();
    expect(store.getState().profile.data).toBeNull();
    expect(result.status).toBe('PARTIAL_STALE');
  });

  it('schema/version mismatch invalidates cache (no stale authority)', async () => {
    const cache = getPersistentCache();
    await cache.save('zz', 'profile', profileA, 60);
    const raw = JSON.stringify({ schemaVersion: 1, contractVersion: 'vOLD', savedAt: new Date().toISOString(), ttlSeconds: 60, data: profileB });
    storage.setRaw('scope:zz:profile', raw); // نسخة عقد مخالفة
    await getScopeMarker().set('zz');
    await tokens.setAccessToken('at');
    const store = makeStore();
    await store.dispatch(bootstrapOffline('offline')).unwrap();
    expect(store.getState().profile.data).toBeNull();
  });
});

describe('M2-D1 state/error security', () => {
  it('Redux state contains no tokens', async () => {
    __setReposForTests(reposFor(profileA));
    const store = makeStore();
    await store.dispatch(bootstrapOffline('online')).unwrap();
    const json = JSON.stringify(store.getState());
    expect(json).not.toContain('jwt');
    expect(json.toLowerCase()).not.toContain('access_token');
    expect(json.toLowerCase()).not.toContain('refresh_token');
  });

  it('error normalization never surfaces internals (traceback/sql/path)', () => {
    const e = new ApiContractError(500, { code: 'SERVER_ERROR', ar: 'حدث خطأ مؤقت', en: 'Temporary error' });
    const n = normalizeError(e);
    const joined = `${n.ar} ${n.en} ${n.code}`;
    for (const bad of ['traceback', 'sql', '/usr/', 'Traceback', 'KeyError']) {
      expect(joined.toLowerCase()).not.toContain(bad.toLowerCase());
    }
  });
});
describe('M2-D2 — error objects never carry raw backend payloads in state', () => {
  it('slice error state keeps only {httpStatus, code, ar, en}', async () => {
    __setReposForTests({
      ...reposFor(profileA),
      certificates: {
        list: async () => {
          throw new ApiContractError(500, {
            code: 'SERVER_ERROR',
            ar: 'حدث خطأ مؤقت',
            en: 'Temporary error',
          });
        },
        detail: async (_id: string) => ({} as never),
      },
    } as unknown as Repositories);
    const store = makeStore();
    await store.dispatch(fetchCertificates()).catch(() => {});
    const error = store.getState().certificates.error;
    expect(error).not.toBeNull();
    const keys = error ? Object.keys(error) : [];
    expect(keys.sort()).toEqual(['ar', 'code', 'en', 'httpStatus']);
    expect(JSON.stringify(error)).not.toMatch(/traceback|sql|\/usr|keyerror/i);
  });
});
