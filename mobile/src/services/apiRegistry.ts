/** تسجيل عميل API واحد لخدمات التطبيق — تُحمَل الرموز من التخزين الآمن. */
import { MobileApiClient } from '../api/client';
import { SecureTokenStorage, ExpoSecureTokenStorage } from '../security/secureStorage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';

export interface ApiRuntime {
  client: MobileApiClient;
  tokenStorage: SecureTokenStorage;
}

let instance: ApiRuntime | null = null;

export function getApiRuntime(): ApiRuntime {
  if (instance) return instance;
  const tokenStorage: SecureTokenStorage = new ExpoSecureTokenStorage();
  let accessToken: string | null = null;
  const client = new MobileApiClient({
    baseUrl: API_BASE_URL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    getAccessToken: () => accessToken,
  });
  instance = {
    client,
    tokenStorage: {
      async getAccessToken() {
        const stored = await tokenStorage.getAccessToken();
        if (stored) accessToken = stored;
        return stored;
      },
      async setAccessToken(token) {
        accessToken = token;
        return tokenStorage.setAccessToken(token);
      },
      async getRefreshToken() {
        return tokenStorage.getRefreshToken();
      },
      async setRefreshToken(token) {
        return tokenStorage.setRefreshToken(token);
      },
      async clear() {
        accessToken = null;
        return tokenStorage.clear();
      },
    } satisfies SecureTokenStorage,
  };
  return instance;
}

export function __resetApiRuntimeForTests(): void {
  instance = null;
}