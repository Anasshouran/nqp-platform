/** مزود الكاش المشفّر والدائم — قابل للاستبدال في الاختبارات فقط. */
import { PersistentCache, SecureDatasetStorage } from '../offline/persist/persistentCache';
import { InMemoryScopeMarker } from '../offline/scope';
import type { ScopeMarkerStorage } from '../offline/scope';

let cache = new PersistentCache(new SecureDatasetStorage(), 'v1');
let scopeMarker: ScopeMarkerStorage = new InMemoryScopeMarker();

export function getPersistentCache(): PersistentCache {
  return cache;
}

export function getScopeMarker() {
  return scopeMarker;
}

export function __setPersistentCacheForTests(
  next?: PersistentCache,
  nextScope?: InMemoryScopeMarker,
): void {
  // يُستخدم في الاختبارات حصراً.
  cache = next ?? new PersistentCache(new SecureDatasetStorage(), 'v1');
  scopeMarker = nextScope ?? new InMemoryScopeMarker();
}