/**
 * M2-C1 — محرك المزامنة/الكاش: حالة صريحة، توفيق خادم-مرجعي، تخزين مشفّر.
 *
 * المبادئ (§6/§8/§9):
 *  - الخادم مرجعي: عند إعادة الاتصال يُستجلب النطاق ويستبدل (SERVER WINS).
 *  - لا تخزين حساس بنص عادي؛ الكاش مشفّر ومقيد بمعرف الحساب.
 *  - إعادة محاولة محدودة وأسية، قابلة للإلغاء عند الخروج/انتهاء الجلسة.
 *  - لا مفاهيم كتابة/نزاع أعمال مفعّلة (لا POST/declarations) — نقطة توسيع فقط.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../state/store';
import {
  restoreSession,
  profileCached,
  certificatesCached,
  declarationsCached,
  notificationsCached,
  requirementsCached,
  profileServer,
  certificatesServer,
  declarationsServer,
  notificationsServer,
  requirementsServer,
  setConnectivity,
  setSyncState,
} from '../state';
import { getRepos } from '../services/provider';
import { getPersistentCache, getScopeMarker } from '../services/cacheProvider';
import { CACHE_POLICY, NEVER_CACHED_DATASETS, type DatasetKey } from './persist/policies';
import { BoundedRetrier, isTransientNetwork } from './retrier';

export type ReconcileStatus =
  | 'SKIPPED_NO_SESSION'
  | 'HYDRATED_CACHE'
  | 'RECONCILED_ONLINE'
  | 'PARTIAL_STALE'
  | 'SYNC_FAILED';

let retriesCancelled = false;

export function cancelRetries(): void {
  retriesCancelled = true;
}

export function resetRetries(): void {
  retriesCancelled = false;
}

function isRetryCancelled(): boolean {
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

async function persistDataset(dataset: DatasetKey, data: unknown): Promise<void> {
  const policy = CACHE_POLICY[dataset];
  if (policy.disposition === 'NEVER_CACHE' || NEVER_CACHED_DATASETS.has(dataset)) {
    return;
  }
  const scope = await getScopeMarker().get();
  if (!scope) return; // بلا نطاق معروف → لا تخزين مستديم
  await getPersistentCache().save(scope, dataset, data, policy.ttlSeconds);
}

type Hydrator = (data: unknown) => { payload: unknown; type: string };

async function loadIntoStore(
  dispatch: (action: { payload: unknown; type: string }) => void,
  dataset: DatasetKey,
  hydrate: Hydrator,
): Promise<'hydrated' | 'none'> {
  const scope = await getScopeMarker().get();
  if (!scope) return 'none';
  const entry = await getPersistentCache().load<unknown>(scope, dataset);
  if (!entry || entry.expired) return 'none';
  dispatch(hydrate(entry.data));
  return 'hydrated';
}

export const hydrateFromCache = createAsyncThunk('m2c1/hydrate', async (_arg, { dispatch }) => {
  const loads: Array<Promise<'hydrated' | 'none'>> = [
    loadIntoStore(dispatch, 'profile', (d: unknown) => profileCached(d as never)),
    loadIntoStore(dispatch, 'requirements', (d: unknown) => requirementsCached(d as never)),
    loadIntoStore(dispatch, 'certificates', (d: unknown) => certificatesCached(d as never)),
    loadIntoStore(dispatch, 'declarations', (d: unknown) => declarationsCached(d as never)),
    loadIntoStore(dispatch, 'notifications', (d: unknown) => notificationsCached(d as never)),
  ];
  const results = await Promise.all(loads);
  return { hydrated: results.some((r) => r === 'hydrated') };
});

export const reconcileOnline = createAsyncThunk(
  'm2c1/reconcile',
  async (_arg, { dispatch }) => {
  dispatch(setSyncState('RECONNECTING'));
  dispatch(setConnectivity('online'));
  const retrier = new BoundedRetrier({
    maxAttempts: 3,
    baseDelayMs: 150,
    shouldRetryOn: (e) => isTransientNetwork(e) && !isRetryCancelled(),
    isCancelled: isRetryCancelled,
  });

  type ServerSetter = (data: unknown) => { payload: unknown; type: string };
  const fetches: Array<[DatasetKey, () => Promise<unknown>, ServerSetter]> = [
    ['profile', () => getRepos().profile.get(), (d) => profileServer(d as never)],
    ['requirements', () => getRepos().requirements.list(), (d) => requirementsServer(d as never)],
    ['certificates', () => getRepos().certificates.list(), (d) => certificatesServer(d as never)],
    ['declarations', () => getRepos().declarations.list(), (d) => declarationsServer(d as never)],
    ['notifications', () => getRepos().notifications.list(), (d) => notificationsServer(d as never)],
  ];

  dispatch(setSyncState('SYNCING'));
  let allOk = true;
  for (const [dataset, fetch, setServer] of fetches) {
    if (isRetryCancelled()) {
      allOk = false;
      break;
    }
    try {
      const data = await retrier.run(fetch);
      // SERVER WINS: نعرض نسخة الخادم ونخزنها في الكاش
      dispatch(setServer(data));
      if (dataset === 'profile' && data && typeof data === 'object' && 'id' in data) {
        await getScopeMarker().set(String((data as { id: string }).id));
      }
      await persistDataset(dataset, data);
    } catch (error) {
      if (isRetryCancelled()) {
        // إلغاء (خروج/انتهاء جلسة أثناء المزامنة): ننهي بفشل صريح.
        allOk = false;
        break;
      }
      allOk = false;
      if (!isTransientNetwork(error)) break;
    }
  }

  dispatch(setSyncState(allOk ? 'SYNCED' : 'FAILED'));
  return { status: allOk ? ('RECONCILED_ONLINE' as const) : ('SYNC_FAILED' as const) };
});

export const bootstrapOffline = createAsyncThunk(
  'm2c1/bootstrap',
  async (connectivity: 'online' | 'offline', { dispatch, getState }) => {
    resetRetries();
    await dispatch(restoreSession());
    const state = getState() as RootState;
    if (state.session.status !== 'signed_in') {
      await getPersistentCache().purgeAll();
      await getScopeMarker().clear();
      return { status: 'SKIPPED_NO_SESSION' as ReconcileStatus };
    }
    const hydrated = (await dispatch(hydrateFromCache()).unwrap()).hydrated;
    dispatch(setConnectivity(connectivity === 'online' ? 'online' : 'offline'));

    if (connectivity === 'online') {
      const reconciled = await dispatch(reconcileOnline()).unwrap();
      return { status: reconciled.status as ReconcileStatus };
    }
    return {
      status: (hydrated ? 'HYDRATED_CACHE' : 'PARTIAL_STALE') as ReconcileStatus,
    };
  },
);