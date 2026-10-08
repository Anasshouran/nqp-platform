/**
 * M1.8 — تخزين الرموز الآمن (SCAFFOLDED: واجهة + محول، بلا تحقّق جهاز في M1).
 */
export interface SecureTokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** ذاكرة داخلية — للتطوير والاختبار فقط، لا تُستخدم في الإنتاج. */
export class InMemorySecureTokenStorage implements SecureTokenStorage {
  private access: string | null = null;
  private refresh: string | null = null;

  async getAccessToken(): Promise<string | null> {
    return this.access;
  }
  async setAccessToken(token: string): Promise<void> {
    this.access = token;
  }
  async getRefreshToken(): Promise<string | null> {
    return this.refresh;
  }
  async setRefreshToken(token: string): Promise<void> {
    this.refresh = token;
  }
  async clear(): Promise<void> {
    this.access = null;
    this.refresh = null;
  }
}

/**
 * محول expo-secure-store (Keychain/Keystore). يُحمَّل كسول (lazy) كي لا
 * يُحمَّل الوحدة الأصلية في اختبارات الوحدة. الحالة: SCAFFOLDED.
 */
export class ExpoSecureTokenStorage implements SecureTokenStorage {
  private readonly keys = {
    access: 'nqp.mobile.access_token',
    refresh: 'nqp.mobile.refresh_token',
  };

  private async secureStore(): Promise<typeof import('expo-secure-store')> {
    return import('expo-secure-store');
  }

  async getAccessToken(): Promise<string | null> {
    const store = await this.secureStore();
    return store.getItemAsync(this.keys.access);
  }

  async setAccessToken(token: string): Promise<void> {
    const store = await this.secureStore();
    await store.setItemAsync(this.keys.access, token);
  }

  async getRefreshToken(): Promise<string | null> {
    const store = await this.secureStore();
    return store.getItemAsync(this.keys.refresh);
  }

  async setRefreshToken(token: string): Promise<void> {
    const store = await this.secureStore();
    await store.setItemAsync(this.keys.refresh, token);
  }

  async clear(): Promise<void> {
    const store = await this.secureStore();
    await store.deleteItemAsync(this.keys.access);
    await store.deleteItemAsync(this.keys.refresh);
  }
}
