/**
 * M2-C1 — الكاش المستديم: تشفير/نطاق/انتهاء/إبطال، إعادة محاولة محدودة.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PersistentCache, type DatasetStorage } from '../src/offline/persist/persistentCache';
import { CACHE_POLICY } from '../src/offline/persist/policies';
import { BoundedRetrier } from '../src/offline/retrier';

class InMemoryDatasetStorage implements DatasetStorage {
  private map = new Map<string, string>();
  async getItem(k: string): Promise<string | null> {
    return this.map.get(k) ?? null;
  }
  async setItem(k: string, v: string): Promise<void> {
    this.map.set(k, v);
  }
  async removeItem(k: string): Promise<void> {
    this.map.delete(k);
  }
  peek(k: string): string | undefined {
    return this.map.get(k);
  }
  entries(): [string, string][] {
    return [...this.map.entries()];
  }
}

let storage: InMemoryDatasetStorage;
let cache: PersistentCache;

beforeEach(() => {
  storage = new InMemoryDatasetStorage();
  cache = new PersistentCache(storage, 'v1');
});
afterEach(() => {
  // فحوصات لا تحمل تلوثاً بين الاختبارات.
});

describe('persistence + metadata', () => {
  it('writes and reads within a user scope', async () => {
    await cache.save('userA', 'certificates', [{ id: 'x' }], 60);
    const loaded = await cache.load<{ id: string }[]>('userA', 'certificates');
    expect(loaded?.data).toEqual([{ id: 'x' }]);
    expect(loaded?.expired).toBe(false);
    expect(loaded?.savedAt).toBeTruthy();
  });

  it('stores ciphertext-style entry only (no raw array outside entry)', async () => {
    await cache.save('userA', 'profile', { full_name: 'أحمد' }, 60);
    const raw = storage.peek('scope:userA:profile')!;
    expect(raw).toContain('savedAt');
    expect(raw).toContain('data');
    // في هذا العقد، SecureStore هو التشفير؛ نؤكد أننا لا نخزن "نصاً" بلا غلاف/نسخة
    // وأن المفتاح مفرد الحساب.
    expect(
      storage.entries().every(([k]) => k.startsWith('scope:userA:') || k === 'scopes'),
    ).toBe(true);
  });

  it('expiry marks old entries expired and skips them logically', async () => {
    await cache.save('u', 'notifications', ['n'], 1);
    // نحاكي انتهاء الصلاحية بمفتاح ببيانات ميتا إلى المستقبل
    const entry = JSON.parse(storage.peek('scope:u:notifications')!);
    entry.savedAt = new Date(Date.now() - 10_000).toISOString();
    storage.setItem('scope:u:notifications', JSON.stringify(entry));
    const loaded = await cache.load('u', 'notifications');
    expect(loaded?.expired).toBe(true);
  });

  it('contract/schema version change invalidates entry (returns null)', async () => {
    await cache.save('u', 'requirements', ['r'], 60);
    const other = new PersistentCache(storage, 'v2'); // إصدار عقد مختلف
    await expect(other.load('u', 'requirements')).resolves.toBeNull();
  });

  it('purgeScope removes only that scope; purgeAll clears registry', async () => {
    await cache.save('userA', 'profile', 1, 60);
    await cache.save('userB', 'profile', 2, 60);
    await cache.purgeScope('userA');
    expect(await cache.load('userA', 'profile')).toBeNull();
    expect((await cache.load('userB', 'profile'))?.data).toBe(2);
    await cache.purgeAll();
    expect(await cache.load('userB', 'profile')).toBeNull();
  });
});

describe('security/privacy (no token; no raw sensitive plaintext claims)', () => {
  it('cache never stores authentication tokens', async () => {
    await cache.save('u', 'profile', { full_name: 'x', id: 'i' }, 60);
    for (const [, raw] of storage.entries()) {
      const lower = raw.toLowerCase();
      expect(lower).not.toContain('access_token');
      expect(lower).not.toContain('refresh_token');
      expect(lower).not.toContain('authorization');
    }
  });

  it('scope isolation holds across users', async () => {
    await cache.save('userA', 'certificates', [{ id: 'a' }], 60);
    await cache.save('userB', 'certificates', [{ id: 'b' }], 60);
    expect((await cache.load('userA', 'certificates'))?.data).toEqual([{ id: 'a' }]);
    expect((await cache.load('userB', 'certificates'))?.data).toEqual([{ id: 'b' }]);
  });
});

describe('cache policy matrix', () => {
  it('classifies datasets per approved matrix', () => {
    expect(CACHE_POLICY.certificates.disposition).toBe('CACHE_WITH_EXPIRY');
    expect(CACHE_POLICY.certificates.sensitive).toBe(true);
    expect(CACHE_POLICY.requirements.disposition).toBe('SAFE_TO_CACHE');
    expect(CACHE_POLICY.sync.disposition).toBe('SERVER_ONLY');
  });
});

describe('bounded retry (REST read-only)', () => {
  it('retries transient network errors with bounded attempts, then succeeds', async () => {
    let calls = 0;
    const retrier = new BoundedRetrier({ maxAttempts: 3, baseDelayMs: 1 });
    const result = await retrier.run(async () => {
      calls += 1;
      if (calls < 3) throw { httpStatus: 0 }; // transient
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('stops after max attempts and rethrows', async () => {
    let calls = 0;
    const retrier = new BoundedRetrier({ maxAttempts: 2, baseDelayMs: 1 });
    await expect(
      retrier.run(async () => {
        calls += 1;
        throw { httpStatus: 0 };
      }),
    ).rejects.toMatchObject({ httpStatus: 0 });
    expect(calls).toBe(2);
  });

  it('does not retry non-transient (application/401) errors', async () => {
    let calls = 0;
    const retrier = new BoundedRetrier({ maxAttempts: 3, baseDelayMs: 1 });
    await expect(
      retrier.run(async () => {
        calls += 1;
        throw { httpStatus: 401 };
      }),
    ).rejects.toMatchObject({ httpStatus: 401 });
    expect(calls).toBe(1);
  });

  it('cancellation aborts immediately', async () => {
    let cancelled = false;
    const retrier = new BoundedRetrier({
      maxAttempts: 10,
      baseDelayMs: 1,
      isCancelled: () => cancelled,
    });
    const promise = retrier.run(async () => {
      throw { httpStatus: 0 };
    });
    cancelled = true;
    await expect(promise).rejects.toThrow('RETRY_CANCELLED');
  });
});