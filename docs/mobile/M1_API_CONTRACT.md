# AFYATNA MOBILE — M1
# API CONTRACT — /api/v1/mobile/

**Date:** 2026-10-07  
**Version of contract:** `v1` (snapshot: `backend/apps/mobile_api/tests/snapshots/mobile_v1.json`)  
**Status:** DRAFT (contract definitions — runtime behavior deferred to M2 with explicit `501`)

---

## 1. Namespace and Versioning

- Namespace: `/api/v1/mobile/` — registered in `backend/nqp_backend/urls.py` via `apps.mobile_api.urls`.
- Versioning: path-based. Contract `v1` snapshot committed; any **breaking** change must go to `v2` or be approved per phase-16 change control. Breaking-change detection runs in CI (contract lane) — a breaking change without snapshot update **fails CI**.
- Envelope contract: phase-1 §11 (see §3).
- OpenAPI: discoverable at `/api/schema/` and `/api/docs/` (drf-spectacular); mobile namespace tagged `mobile` + per-category tags (`mobile-auth`, `mobile-profile`, `mobile-trips`, `mobile-requirements`, `mobile-certificates`, `mobile-declarations`, `mobile-sync`).

## 2. Categories and Endpoints (v1)

| Category | Method & Path | Runtime (M1) | Requires JWT | Contract success schema |
|---|---|---|---|---|
| auth | `POST /api/v1/mobile/auth/login/` | **501** | — | `MobileAuthLoginResponse` |
| auth | `POST /api/v1/mobile/auth/refresh/` | **501** | — | `MobileAuthRefreshResponse` |
| profile | `GET /api/v1/mobile/profile/` | **501** | ✅ | `MobileProfileEnvelope` |
| trips | `GET /api/v1/mobile/trips/` | **501** | ✅ | `MobileTripList` |
| trips | `GET /api/v1/mobile/trips/{id}/` | **501** | ✅ | `MobileTrip` |
| requirements | `GET /api/v1/mobile/requirements/` | **501** | ✅ | `MobileRequirementList` |
| certificates | `GET /api/v1/mobile/certificates/` | **501** | ✅ | `MobileCertificateList` |
| certificates | `GET /api/v1/mobile/certificates/{id}/` | **501** | ✅ | `MobileCertificate` |
| declarations | `GET /api/v1/mobile/declarations/` | **501** | ✅ | `MobileDeclarationList` |
| declarations | `POST /api/v1/mobile/declarations/` | **501** | ✅ | `MobileDeclaration` |
| sync | `GET /api/v1/mobile/sync/status/` | **501** | ✅ | `MobileSyncStatus` |

Runtime is intentionally `501 Not Implemented` (`NOT_IMPLEMENTED` envelope) — declarations of intent, **no fabricated production data**, no partial business logic.

## 3. Response Envelope (binding)

Success:

```json
{ "status": "success", "data": { }, "message": null }
```

Error (Arabic primary):

```json
{
  "status": "error",
  "data": null,
  "message": { "code": "AUTH_REQUIRED", "ar": "يجب تسجيل الدخول", "en": "Authentication required" }
}
```

Approved error codes (`backend/apps/mobile_api/envelope.py`):

```
AUTH_REQUIRED · AUTH_INVALID · FORBIDDEN · NOT_FOUND · METHOD_NOT_ALLOWED
RATE_LIMITED · NOT_IMPLEMENTED · VALIDATION_ERROR · SERVER_ERROR
CONTRACT_VERSION_UNSUPPORTED
```

Never exposed: stack traces, database errors, internal model names, SQL, secrets, internal identifiers (only classified mobile-safe fields listed in the OpenAPI).

## 4. Boundaries enforced in the namespace

- **AuthN:** every non-auth endpoint requires `Bearer` JWT; missing/garbage token → 401 `AUTH_REQUIRED`/`AUTH_INVALID` via `MobileAPIView.handle_exception`.
- **AuthZ:** traveler resources must be object-level isolated (NG-02/NG-06). Enforced for the existing `travelers` surface by contract tests (`404` for foreign records); mobile endpoints return no `2xx` in M1.
- **Internal:** mobile namespace can never mount internal apps (`screening`, `dbadmin`, `emergency`, `it-management`, `risk`) — design test `test_mobile_namespace_never_mounts_internal_apps`.
- **Classification:** every field in the mobile schema has an approved classification; `INTERNAL` and forbidden fields cannot appear (`test_no_internal_or_forbidden_field_enters_mobile_schema`).
- **Versioning:** `test_no_breaking_contract_change_versus_snapshot`.

## 5. Client-side mirror

- `contracts/` package (`@afyatna/contracts`): Zod schemas + types mirroring this contract; consumed by `mobile/` and contract tests.
- Parity test: `mobile/tests/contract-parity.test.ts` asserts TS paths + classification exist in the backend snapshot.
- Regeneration of the OpenAPI export: `cd backend && python manage.py spectacular --file ../contracts/openapi/openapi.json` (or `npm run openapi:export` in `contracts/`).
- Regeneration of the v1 contract snapshot: `cd backend && python -m apps.mobile_api.tests.generate_snapshot`.

## 6. Evidence

- OpenAPI generation: `python manage.py spectacular --file /tmp/openapi.yaml` ✓ (10 mobile paths, 15 mobile components).
- Contract tests: `python -m pytest apps/mobile_api -q` → **50 passed, 2 xfailed** (xfail = documented known gaps SEC-M0-1, F-M1-2).
- Snapshot breaking-change gate: green.
- Mobile-side: `mobile/tests/contract-parity.test.ts` green (43 mobile tests total).

---

# M2-A TRANSITION (2026-10-08)

From M3 report `docs/mobile/M2A_BACKEND_IMPLEMENTATION_REPORT.md`: the contract moved from contract-only `501` stubs to real, secure implementations for profile/requirements/certificates/declarations(GET)/notifications/sync.

- **Change reason:** M2-A implementation wave (Phase-1 §8 resources) under Phase-1.5 security guarantees.
- **Compatibility:** additive-only. No fields/paths removed; new paths added (notifications). Snapshot `mobile_v1.json` regenerated with additions; breaking-change gate green; envelope/bilingual errors/classification preserved.
- **OpenAPI:** updated to match runtime (implemented endpoints no longer document `501`; `501` remains only on `auth/*` (Q8), `trips/*` (D-P1-1), `declarations POST` (M2-C policy)).
- **Contract tests updated:** the "defer/501" and "never-2xx" M1 parametrized tests were refactored to implemented-vs-deferred endpoint sets (documented in `M2A_BACKEND_IMPLEMENTATION_REPORT.md` §3/§5).
- **TypeScript/Zod:** extended for requirements/declarations/sync and new notifications; classification mirror updated.
- **Regression:** `pytest apps/mobile_api apps/screening apps/travelers apps/vaccination --create-db` → **204 passed**; mobile 49; contracts 11.