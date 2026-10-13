/**
 * State-independent offline control helpers.
 *
 * Extracted from ./engine.ts to break the require cycle:
 *   state/index → store → session → engine → state/index
 *
 * These functions touch only the retry timer and the protected cache.
 * They do NOT import or access the Redux store.
 */
import { getPersistentCache, getScopeMarker } from '../services/cacheProvider';

let retriesCancelled = false;

export function cancelRetries(): void {
  retriesCancelled = true;
}

export function resetRetries(): void {
  retriesCancelled = false;
}

export function isRetryCancelled(): boolean {
  return retriesCancelled;
}

export async function establishScopeFromProfile(profile: { id: string } | null): Promise<void> {
  if (profile && profile.id) {
    await getScopeMarker().set(String(profile.id));
  }
}

export async function purgeProtectedCache(): Promise<void> {
  await getPersistentCache().purgeAll();
  await getScopeMarker().clear();
}
