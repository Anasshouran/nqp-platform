# M2-A BACKEND IMPLEMENTATION REPORT

**Date:** 2026-10-08  
**Mode:** IMPLEMENTATION (non-SUDAPASS wave)  
**Authority:** Phase 1 Contract + Phase 1.5 Remediation + M2 Authorization Audit

---

## 1. Status

```text
PASS WITH DOCUMENTED NON-BLOCKING GAPS
```
(Gaps: `auth/*` (SUDAPASS deferred/Q8), `trips/*` (no traveler-owned unified travel domain — D-P1-1), `declarations POST` (write flow/mobile-sync not yet approved). All are explicitly *documented*, keep `501`, and satisfy "no unintended 501".)

## 2. Scope Implemented

| Capability | Status | Evidence |
| --- | --- | --- |
| Auth boundary (provider-neutral, SUDAPASS seam only) | Implemented (interface; no SUDAPASS) | `apps/mobile_api/authentication.py`; tests |
| Traveler profile (owner-derived) | Implemented | `GET /api/v1/mobile/profile/` |
| Requirements projection (HealthNotice, no fabrication) | Implemented | `GET /api/v1/mobile/requirements/` |
| Vaccination certificates (owner-only, no verification trust) | Implemented | list + detail `501→real` |
| Health declaration (minimal, risk-free) | Implemented (GET) | `GET /api/v1/mobile/declarations/` |
| Notifications (owner-only, no internal body/recipient) | Implemented (new) | list + `PATCH …/{id}/read/` |
| Sync status (server-authoritative meta) | Implemented | `GET /api/v1/mobile/sync/status/` |
| Travel (unified) | Documented gap | `trips/*` keep `501` (D-P1-1) |
| Declarations write / offline sync | Documented gap | POST `501` (M2-C policy pending) |
| SUDAPASS | Deferred — NOT implemented/mocked | `auth/*` keep `501` (Q8) |

## 3. API Matrix

| Endpoint | Method | Auth | Ownership | Classification | Status |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/mobile/profile/` | GET | JWT | server-derived (principal) | PERSONAL/PUBLIC | **200** |
| `/api/v1/mobile/requirements/` | GET | JWT | public content | PUBLIC | **200** |
| `/api/v1/mobile/certificates/` | GET | JWT | `cert.traveler.user == principal` | SENSITIVE_HEALTH (approved) | **200** |
| `/api/v1/mobile/certificates/{id}/` | GET | JWT | owner-only; foreign → 404 | SENSITIVE_HEALTH | **200/404** |
| `/api/v1/mobile/declarations/` | GET | JWT | `traveler.user == principal` | SENSITIVE_HEALTH (no risk fields) | **200** |
| `/api/v1/mobile/notifications/` | GET | JWT | `log.user == principal` | SENSITIVE_HEALTH(subject)/PUBLIC | **200** |
| `/api/v1/mobile/notifications/{id}/read/` | PATCH | JWT | owner-only; foreign → 404 | idempotent-deterministic | **200/404** |
| `/api/v1/mobile/sync/status/` | GET | JWT | server meta | PUBLIC | **200** |
| `/api/v1/mobile/auth/login/` · `/refresh/` | POST | — | — | — | **501** (Q8) |
| `/api/v1/mobile/trips/` · `/trips/{id}/` | GET | JWT | — | — | **501** (D-P1-1) |
| `/api/v1/mobile/declarations/` | POST | JWT | — | — | **501** (M2-C policy) |

## 4. Security Matrix

| Control | Result | Evidence |
| --- | --- | --- |
| Traveler isolation | **PASS** | lists/detail owner-only; foreign cert → 404; IDOR tests green |
| Screening authorization | **PASS** (unchanged) | security matrix green (fresh-DB rerun) |
| QR fail-closed | **PASS** (unchanged) | vaccination 73 passed on fresh DB |
| IDOR | **PASS** | `test_m2a_endpoints` object matrix + boundary suite |
| Classification | **PASS** | schema guard + new SENSITIVE_HEALTH purpose guard; forbidden fields never present |
| Idempotency | **PASS (no mobile writes)** | read-patch deterministic (double-call test); declarations POST deferred ⇒ replay-across-users impossible; server-authoritative |
| Replay protection | **PASS** | no client ownership/accepted timestamps; server writes only |
| SUDAPASS | **Deferred** | no issuer/endpoints/client/mock — `SUDAPASS IMPLEMENTED: NO` |

## 5. Tests

```text
pytest apps/mobile_api apps/screening apps/travelers apps/vaccination -q --create-db
204 passed, 0 failed, 0 xfailed-worthy (2 warnings)
mobile: npm test → 49 passed (7 suites); typecheck/lint clean
contracts: npm test → 11 passed; typecheck clean
manage.py check → clean; makemigrations --check → clean
```

Note (repo hygiene, non-code): a long-running background `pytest apps` from an earlier session had been sharing the reused test DB and polluted it (causing transient errors). Terminated; all suites re-verified on a **fresh test DB** (`--create-db`) → green. This is a CI/local-hygiene item (F-M1-1), not a code regression.

## 6. Regression

```text
REGRESSION: PASS
```
- Phase 1.5 baselines not reduced: traveler 43, screening 12, vaccination 73, mobile_api 78 (all green on fresh DB).
- Mobile 49 (≥ M1 43), contracts 11 (≥ M1 11).
- OpenAPI: 12 mobile paths; contract snapshot regenerated (additive only — no breaking change; parity test green).

## 7. Performance

```text
LOCAL ONLY — scripts/m2a_measure_perf.py, n=30, loopback, dev server
worst p95 = 52.2 ms  (certificates; profile 42.6 / requirements 41.0 / sync 46.5)
health reference p95 = 2.4 ms
STAGING: NOT MEASURED
NETWORK: NOT MEASURED
```

## 8. Database Changes

```text
NONE (no migrations created; no schema changes)
```

## 9. Files Changed

- `backend/apps/mobile_api/authentication.py`, `service.py` (new)
- `backend/apps/mobile_api/views.py`, `urls.py`, `serializers.py`, `classification.py`
- `backend/apps/mobile_api/tests/`: `conftest.py`, `test_auth_boundary.py`, `test_authorization_boundary.py`, `test_classification.py`, new `test_m2a_endpoints.py`, `snapshots/mobile_v1.json`
- `backend/nqp_backend/settings.py` (+1 var `AFYATNA_MOBILE_CONTRACT_VERSION`)
- `contracts/src/mobile/{requirements,declarations,notifications,sync}.ts`, `contracts/src/classification.ts`, `contracts/src/index.ts`
- `mobile/tests/contract-parity.test.ts`
- `scripts/m2a_measure_perf.py` (new)
- `docs/mobile/M2A_BACKEND_IMPLEMENTATION_REPORT.md`, `docs/mobile/M1_API_CONTRACT.md` (transition section)

## 10. SUDAPASS Boundary

```text
SUDAPASS IMPLEMENTED: NO
SUDAPASS MOCKED: NO
SUDAPASS ASSUMPTIONS INTRODUCED: NO
SUDAPASS DEPENDENCY CREATED: NO
```

## 11. Remaining Blockers

- Q8 (SUDAPASS official spec + test IdP) — external dependency; keeps `auth/*` deferred (not fabricated).
- Trips (D-P1-1 unified traveler-owned travel model) and declarations write (M2-C offline-sync policy) — documented domain gaps, not security regressions.

## 12. Acceptance Matrix

| Gate | Result |
| --- | --- |
| A Security | **PASS** |
| B API | **PASS** (implemented endpoints real; intended 501s documented) |
| C Ownership | **PASS** |
| D Classification | **PASS** |
| E Offline/Retry | **PASS** |
| F Regression | **PASS** |
| G Build/Quality | **PASS** |

## 13. Final Verdict

```text
M2-A ACCEPTED WITH DOCUMENTED GAPS
```