/**
 * C1-02 — تخزين الكاش المشفّر والدائم.
 *
 * الآلية: كل إدخال كاش يُخزَّن داخل SecureStore (Keystore/Keychain للمنصة)
 * فيكون مشفّراً في السكون وغير قابل للقراءة كملف نصي عادي. مفاتيح التخزين
 * مفردة الحساب (`nqp.mobile.cache.<scope>.<dataset>`). لن تُكتب رموز المصادقة
 * في هذا المخزن إطلاقاً (تبقى SecureStore حصراً عبر SecureTokenStorage).
 *
 * فشل التخزين يفشل بأمان: load يُعيد null عند أي خطأ؛ save يتجاهل فشل الكتابة
 * للبيانات غير الحساسة القابلة للتعويض. لا مفتاح صلب/مُرمَّز في الشيفرة.
 */
import { Platform } from 'react-native';

export interface DatasetStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface CacheEntry<T> {
  schemaVersion: 1;
  contractVersion: string;
  savedAt: string;
  ttlSeconds: number | null;
  data: T;
}

/**
 * متجر SecureStore فعلي للكاش. يكيّر مفاتيح `nqp.mobile.cache.*` —
 * منفصل كلياً عن مفاتيح الرموز `nqp.mobile.access_token`/`refresh_token`.
 */
export class SecureDatasetStorage implements DatasetStorage {
  private readonly prefix = 'nqp.mobile.cache.';

  private async store(): Promise<typeof import('expo-secure-store')> {
    return import('expo-secure-store');
  }

  async getItem(key: string): Promise<string | null> {
    const store = await this.store();
    return store.getItemAsync(this.prefix + key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = await this.store();
    await store.setItemAsync(this.prefix + key, value);
  }

  async removeItem(key: string): Promise<void> {
    const store = await this.store();
    await store.deleteItemAsync(this.prefix + key);
  }

  async keys(): Promise<string[]> {
    void Platform.OS;
    // SecureStore لا يكشف قائمة مفاتيح — نُدير الكاش بمعرفة المفاتيح المتوقعة
    // (متجر موجه: purgeScope بإزالة مفاتيح النطاق المعروفة لكل مجموعة بيانات).
    return [];
  }
}

const SCOPE_REGISTRY_KEY = 'scopes';

export class PersistentCache {
  constructor(
    private readonly storage: DatasetStorage,
    private readonly contractVersion = 'v1',
  ) {}

  private key(scope: string, dataset: string): string {
    return `scope:${scope}:${dataset}`;
  }

  private async rememberScope(scope: string): Promise<void> {
    try {
      const raw = await this.storage.getItem(SCOPE_REGISTRY_KEY);
      const scopes = parseStringArray(raw);
      if (!scopes.includes(scope)) {
        scopes.push(scope);
        await this.storage.setItem(SCOPE_REGISTRY_KEY, JSON.stringify(scopes));
      }
    } catch {
      // غير حرَج
    }
  }

  private async forgetScope(scope: string): Promise<void> {
    try {
      const raw = await this.storage.getItem(SCOPE_REGISTRY_KEY);
      const next = (parseStringArray(raw)).filter((s) => s !== scope);
      if (next.length) {
        await this.storage.setItem(SCOPE_REGISTRY_KEY, JSON.stringify(next));
      } else {
        await this.storage.removeItem(SCOPE_REGISTRY_KEY);
      }
    } catch {
      // غير حرَج
    }
  }

  async save<T>(scope: string, dataset: string, data: T, ttlSeconds: number | null): Promise<void> {
    const entry: CacheEntry<T> = {
      schemaVersion: 1,
      contractVersion: this.contractVersion,
      savedAt: new Date().toISOString(),
      ttlSeconds,
      data,
    };
    try {
      await this.storage.setItem(this.key(scope, dataset), JSON.stringify(entry));
      await this.rememberScope(scope);
    } catch {
      // فشل التخزين ≠ فشل التطبيق؛ المحتوى مصدره الخادم ويُعاد عند التزامن.
    }
  }

  async load<T>(scope: string, dataset: string): Promise<{ data: T; savedAt: string; expired: boolean } | null> {
    try {
      const raw = await this.storage.getItem(this.key(scope, dataset));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (entry.schemaVersion !== 1 || entry.contractVersion !== this.contractVersion) {
        await this.remove(scope, dataset); // تكتل إصدار → إبطال
        return null;
      }
      const savedAt = new Date(entry.savedAt).getTime();
      const expired =
        entry.ttlSeconds != null && Number.isFinite(savedAt) && Date.now() - savedAt > entry.ttlSeconds * 1000;
      return { data: entry.data, savedAt: entry.savedAt, expired };
    } catch {
      return null;
    }
  }

  async remove(scope: string, dataset: string): Promise<void> {
    try {
      await this.storage.removeItem(this.key(scope, dataset));
    } catch {
      // الإزالة تفشل بهدوء — الكاش غير موثوق أصلاً.
    }
  }

  async purgeScope(scope: string): Promise<void> {
    for (const dataset of cacheDatasetKeys()) {
      await this.remove(scope, dataset);
    }
    await this.forgetScope(scope);
  }

  async purgeAll(): Promise<void> {
    try {
      const raw = await this.storage.getItem(SCOPE_REGISTRY_KEY);
      for (const scope of parseStringArray(raw)) {
        await this.purgeScope(scope);
      }
      await this.storage.removeItem(SCOPE_REGISTRY_KEY);
    } catch {
      // غير حرَج
    }
  }
}

export function cacheDatasetKeys(): ReadonlySet<string> {
  return new Set(['profile', 'requirements', 'certificates', 'declarations', 'notifications']);
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}