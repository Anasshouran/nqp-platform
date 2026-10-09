/** بوابة التخزين الآمن للرموز — قابلة للاستبدال في الاختبارات فقط. */
import type { SecureTokenStorage } from '../security/secureStorage';
import { getApiRuntime } from '../services/apiRegistry';

let storage: SecureTokenStorage = getApiRuntime().tokenStorage;

export function getTokenStorage(): SecureTokenStorage {
  return storage;
}

export function __setTokenStorageForTests(next: SecureTokenStorage): void {
  storage = next;
}