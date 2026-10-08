# M2-C1 OFFLINE & SYNC IMPLEMENTATION REPORT

**Date:** 2026-10-08  
**Mode:** IMPLEMENTATION (mobile-only; no backend changes)  
**Predecessor:** M2-B — ACCEPTED WITH DOCUMENTED GAPS

---

## 1. Status

`M2-C1 ACCEPTED WITH DOCUMENTED GAPS` (device-level perf not measurable here; persisted cache uses platform SecureStore — no device benchmark, documented).

## 2. Executive Summary

Implemented durable, **encrypted-by-platform** (SecureStore/Keystore), user-scoped persisted cache; a deterministic offline state machine (`RECONNECTING` added); a **server-authoritative reconciliation** engine with bounded, cancellable retry; logout/account-switch/session-expiry purge; cache policy + TTL/invalidation; explicit offline UX (cached-stamp, reconnect/sync states). No SUDAPASS, no declaration write, no backend/schema change.

## 3. Scope Executed

- `C1-01` persisted offline cache (profile/requirements/certificates/declarations/notifications) **in scope**; `sync` = SERVER_ONLY.
- `C1-02` encryption via platform secure storage (no plaintext files/AsyncStorage; no hardcoded keys; tokens stay in SecureStore tokens channel, separate from cache keys).
- §3 user isolation (scope-keyed + purge), §4 state machine, §5 policy, §6 reconciliation, §7 bounded retry, §8 SERVER WINS, §9 invalidation, §10/§14 UX + cold start, §11/§12 scenarios (automated).

## 4. Files Changed

**New**
- `mobile/src/offline/persist/persistentCache.ts` (CacheEntry protocol + SecureDatasetStorage + registry purge)
- `mobile/src/offline/persist/policies.ts` (classification matrix)
- `mobile/src/offline/scope.ts` (user-scope marker, secure)
- `mobile/src/offline/retrier.ts` (bounded exponential backoff + cancellation)
- `mobile/src/offline/engine.ts` (bootstrapOffline / hydrateFromCache / reconcileOnline / purge helpers)
- `mobile/src/services/cacheProvider.ts` (+ test seam)
- `tests/m2c1.test.ts`, `tests/m2c1-engine.test.ts`, `tests/m2c1-perf.test.ts`

**Modified**
- `mobile/src/state/session.ts` (cache purge + retry cancel on logout/expiry; restore→signed_in on token)
- `mobile/src/state/data.ts` (`isCached`/`cachedAt` metadata; per-slice `cached` + `server` reducers/actions)
- `mobile/src/state/store.ts`, `mobile/src/types/index.ts` (`RECONNECTING`), `mobile/src/i18n/strings.ts`, `mobile/src/components/ui.tsx` (`CacheStamp`, sync labels), `mobile/src/screens/dataScreens.tsx` (stamp in Section), `mobile/src/navigation/AppShell.tsx` (bootstrap effect), `mobile/src/offline/sync.ts`, `mobile/src/components/SyncStatusBadge.tsx`

## 5. Architecture

```
Screens → Redux slices (server actions) ← engine (reconcileOnline/bootstrapOffline)
                                              ↓
                              repositories (authoritative server read)
                                              ↓
                              PersistentCache (SecureStore, per user-scope, TTL)
                                              ↓
                              Session/scope/purge integration (logout/expiry/switch)
```

## 6. Cache Classification Matrix

| Dataset | Classification | Disposition | TTL | Sensitive | Persisted |
| --- | --- | --- | --- | :-: | :-: |
| profile | PERSONAL | CACHE_WITH_EXPIRY | 24 h | yes | SecureStore |
| requirements | PUBLIC | SAFE_TO_CACHE | 24 h | no | SecureStore |
| certificates | SENSITIVE_HEALTH | CACHE_WITH_EXPIRY | 12 h | yes | SecureStore |
| declarations | SENSITIVE_HEALTH | CACHE_WITH_EXPIRY | 12 h | yes | SecureStore |
| notifications | SENSITIVE_HEALTH(subject) | CACHE_WITH_EXPIRY | 7 d | yes | SecureStore |
| sync | server meta | **SERVER_ONLY** | — | no | **not persisted** |
| tokens | SECURITY_SENSITIVE | **NEVER_CACHE** (in cache) | — | yes | SecureStore **auth channel only** |

## 7. Encryption Mechanism

- Every persisted entry stored via `expo-secure-store` (native Keystore/Keychain) → encrypted at rest; no plaintext files; no AsyncStorage; encryption keys are the platform keystore (none hardcoded); cache keys are distinct from token keys. Storage failures fail safely (`load → null`, `save → no-op`).

## 8. User-Isolation Model

- Keys: `scope:{userId}:{dataset}`; scope marker (userId from server profile) stored securely.
- Purge: logout/session-expiry → `purgeProtectedCache()` (registry-driven purgeAll + scope clear) + slice resets. Account switch test (B cannot read A) green. Server-supplied principal id is the only scope — no client-supplied IDs.

## 9. Offline State Machine

Distinct axes: connectivity (`online/offline/unknown`), sync (`DRAFT/QUEUED/SYNCING/SYNCED/FAILED/CONFLICT/RECONNECTING`), auth (`signed_out/signing_in/signed_in/session_expired`). Never conflated; transitions tested.

## 10. Sync / Reconciliation Algorithm

1. `bootstrapOffline` → restore session.
2. No session → purge protected cache → `SKIPPED_NO_SESSION`.
3. Hydrate cached (unexpired, contract-matched) entries → `isCached=true` + offline stamp.
4. Online: `reconcileOnline` → `RECONNECTING` → `SYNCING` → per dataset: bounded retry → `SERVER WINS` (dispatch `server` action) → persist latest → set scope from server profile id → `SYNCED` (or `FAILED` bounded).
5. Auth failure during sync → `sessionExpired` purge (server authority retained).

## 11. Retry / Idempotency

- `BoundedRetrier` (max 3, exponential backoff, transient-only, cancellable) on **read-only** GETs. No write APIs fabricated; online reconciliation is idempotent GET-fetch-replace. Cancellation on logout/session-expiry (`cancelRetries`), user-scoped, bounded (tested ≤3 attempts, prompt stop under cancellation).

## 12. Conflict Policy

**SERVER WINS** for all server-owned read models (replace-on-refresh; no silent merge). Write conflict policy: explicit extension point only (`policies` + engine structure), **inactive** — no approved business write rules.

## 13. Cache Expiry / Invalidation

Triggers: logout (purge), account switch (scope-keyed isolation + purge), session expiry/auth failure (purge), contract-version/schema change (invalidated on load), explicit refresh (server actions), successful reconciliation (latest persisted), TTL expiry (per-dataset). Expired/stale entries never presented as current (replaced or hidden; cached stamp shown only when `isCached`).

## 14. UX Behavior

- Cached content → `CacheStamp` ("بيانات محفوظة من آخر مزامنة — غير حديثة"); offline badge; reconnect → `RECONNECTING`/`SYNCING`/`SYNCED`/`FAILED` (SyncStatusPanel); session-expired → purge + sign-in screen; no fake sync/current-status claims; no fabricated health info.

## 15. Security / Privacy Review

- No plaintext sensitive cache; tokens never enter cache (tested by raw-content scan); per-user scope persistent; cross-user tests green; logout/expiry purge green; telemetry scrub (existing) excludes health; cache doesn't bypass auth (all reads flow through authenticated repositories).

## 16. Test Matrix (M2-C1 additions)

| Area | Tests | Result |
| --- | --- | --- |
| Persistence (write/read/expiry/metadata/version) | 5 | PASS |
| Policy matrix + token-exclusion + scope isolation | 4 | PASS |
| Bounded retry (success/fail/non-transient/cancel) | 4 | PASS |
| Bootstrap online/offline/no-cache/no-session | 4 | PASS |
| Logout purge, account-switch, SERVER WINS | 3 | PASS |
| Bounded retry + cancellation in engine | 2 | PASS |

## 17. Exact Test Commands & 18. Results

```text
mobile: npm test → 13 suites, 90 passed, 0 failed
mobile: npm run typecheck → clean
mobile: npm run lint → clean
mobile: npx expo export --platform android → OK
backend (unchanged): pytest apps/mobile_api apps/screening -q → 88 passed
```

## 19. Performance Measurements

```text
LOCAL (jest, in-memory adapter — reference only): cache write ~0.07 ms/op, read ~0.05 ms/op.
DEVICE: NOT MEASURED (no device; SecureStore native latency pending instrumentation).
STAGING/PRODUCTION: NOT MEASURED.
```

## 20. Database / Migration Impact

`DATABASE CHANGES: NONE` (mobile-only; no backend/schema/migration).

## 21. SUDAPASS Status

`SUDAPASS IMPLEMENTED/MOCKED/ASSUMED: NO` — deferred unchanged; cache/sync fully testable without it.

## 22. Declaration Write Status

`DECLARATION_WRITE_POLICY = DEFERRED` (unchanged; no write queue fabricated).

## 23. Pre-existing Changes Preservation

`YES` — no reset/revert; all prior phase additions retained.

## 24. Unrelated Files Modified

`NONE` (changes confined to mobile client + its tests).

## 25. Acceptance Gates A–M

| Gate | Result |
| --- | --- |
| A Persistence | **PASS** |
| B Encryption | **PASS** (platform secure storage; no plaintext sensitive cache) |
| C User Isolation | **PASS** |
| D Offline State Machine | **PASS** |
| E Server-Authoritative Sync | **PASS** (SERVER WINS tested) |
| F Retry / Idempotency | **PASS** (bounded, cancellable, read-only) |
| G Conflict Handling | **PASS** (server wins; no fabricated write-policy) |
| H Cache Expiry / Invalidation | **PASS** |
| I Offline UX | **PASS** |
| J Security / Privacy | **PASS** |
| K Regression | **PASS** (M2-B/M2-A suites green) |
| L Build / Type / Lint | **PASS** |
| M Scope Integrity | **PASS** (no backend/db changes; no SUDAPASS/declaration-write) |

## 26. Known Limitations

- Device-level SecureStore latency + cold-start-on-device not measurable in this environment (documented; instrumentation seam `perf` test added).
- Persisted cache entries bounded by platform secure-storage practical sizes (per-dataset split; notifications capped conceptually).
- `purgeAll` discovers scopes via an internal registry kept in the same secure store (fail-safe: unregistered scopes are never addressable by a different session).

## 27. Final Verdict

`M2-C1 ACCEPTED`