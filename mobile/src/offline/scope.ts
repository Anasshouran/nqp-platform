/** علامة نطاق الكاش: معرّف مستقر (من الخادم) يفصل بيانات كل حساب (§3). */
export interface ScopeMarkerStorage {
  get(): Promise<string | null>;
  set(scope: string): Promise<void>;
  clear(): Promise<void>;
}

export class SecureScopeMarker implements ScopeMarkerStorage {
  private readonly key = 'nqp.mobile.cache.scope';
  private readonly valueKey = 'nqp.mobile.cache.scope.value';

  private async store(): Promise<typeof import('expo-secure-store')> {
    return import('expo-secure-store');
  }

  async get(): Promise<string | null> {
    const store = await this.store();
    const raw = await store.getItemAsync(this.key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { scope: string };
      return typeof parsed.scope === 'string' && parsed.scope ? parsed.scope : null;
    } catch {
      return null;
    }
  }

  async set(scope: string): Promise<void> {
    const store = await this.store();
    await store.setItemAsync(this.key, JSON.stringify({ scope }));
    await store.setItemAsync(this.valueKey, scope);
  }

  async clear(): Promise<void> {
    const store = await this.store();
    await store.deleteItemAsync(this.key);
    await store.deleteItemAsync(this.valueKey);
  }
}

export class InMemoryScopeMarker implements ScopeMarkerStorage {
  private value: string | null = null;
  async get(): Promise<string | null> {
    return this.value;
  }
  async set(scope: string): Promise<void> {
    this.value = scope;
  }
  async clear(): Promise<void> {
    this.value = null;
  }
}