# AFYATNA MOBILE — M1
# SECURITY EVIDENCE

**Date:** 2026-10-07  
**Scope:** M1 security foundation (M1.8) + classification enforcement (M1.6) + observability scrubbing (M1.10).  
**Rule (§22):** no `PASS` based on inspection alone when runtime evidence is required.

---

## 1. Evidence Summary

### 1.1 Contract tests — authN/authZ/internal/envelope/classification

| Test | Evidence | Result |
|---|---|---|
| Protected mobile endpoints require JWT (401, envelope) | `backend/apps/mobile_api/tests/test_auth_boundary.py` | ✅ `PASS` (runtime, DRF test client) |
| Garbage/expired token → `AUTH_INVALID` | same file | ✅ `PASS` |
| Anonymous + authorized mobile endpoint → 501 (no fabricated data) | same file | ✅ `PASS` |
| Traveler B cannot read Traveler A record (404, hiding) | `test_authorization_boundary.py` | ✅ `PASS` |
| Traveler list denied without `travelers:view` (403) | same file | ✅ `PASS` |
| Mobile endpoints never return foreign-data `2xx` in M1 | same file (parametrized over 9 endpoints) | ✅ `PASS` |
| Internal surfaces reject traveler token | `test_internal_boundary.py` (`db_admin` 403, `emergency` 403, carrier-integration 401, carrier flights 403) | ✅ `PASS` |
| Mobile namespace never mounts internal apps | same file (design test) | ✅ `PASS` |
| Screening gap (SEC-M0-1) | same file | ⚠️ `XFAIL` (**known gap**, not hidden) |
| Envelope conformity everywhere (401/405/501) | `test_auth_boundary.py` + `test_envelope` matrix | ✅ `PASS` |

Command: `cd backend && python -m pytest apps/mobile_api -q` → **50 passed, 2 xfailed**.

### 1.2 Classification invariant (M1.6)

| Test | Evidence | Result |
|---|---|---|
| Every mobile schema field classified | `test_classification.py::test_every_mobile_schema_field_has_approved_classification` | ✅ `PASS` |
| INTERNAL/forbidden fields never in mobile schema | `test_no_internal_or_forbidden_field_enters_mobile_schema` | ✅ `PASS` |
| Only 5 approved levels | `test_classification_registry_uses_only_approved_levels` | ✅ `PASS` |
| SENSITIVE_HEALTH / SECURITY_SENSITIVE actually represented | `test_registry_covers_sensitive_health_and_security_domains` | ✅ `PASS` |
| Registry mirrors app snapshot | `mobile/tests/contract-parity.test.ts` | ✅ `PASS` |

### 1.3 Client-side scrubbing (M1.10) — SENSITIVE_HEALTH → SCRUBBED

| Test | Evidence | Result |
|---|---|---|
| Classified SENSITIVE_HEALTH fields scrubbed | `mobile/tests/security.test.ts` | ✅ `PASS` |
| SECURITY_SENSITIVE creds scrubbed | same | ✅ `PASS` |
| Forbidden internal fields dropped entirely | same | ✅ `PASS` |
| Nested arrays/objects scrubbed | same | ✅ `PASS` |
| Telemetry transport never sees raw sensitive payloads | same (JSON payload assertion) | ✅ `PASS` |
| Latency/failure events record codes, never payloads | same | ✅ `PASS` |

Command: `cd mobile && npm test` → **43 passed across 6 suites**.

### 1.4 Static security scan (M1 security baseline)

| Tool | Scope | Command | Result |
|---|---|---|---|
| Bandit | `backend/apps/mobile_api` | `bandit -r apps/mobile_api -ll -ii` | ✅ `0 High / 0 Medium` (exit 0) |
| Secrets guard | mobile_api + mobile + contracts | grep for private keys / AKIA / ghp_ patterns | ✅ none found |
| pip-audit (informational) | backend requirements | `pip-audit -r requirements/base.txt` | informational (pre-existing advisory baseline, non-gating) |

### 1.5 QR verification — status MUST remain transparent

| Control | Status | Evidence | Comment |
|---|---|---|---|
| Mandatory QR signature (NG-04) | **BLOCKED** | `vaccination/views.py:522-523` (`signature_ok = ... if signature else True`) | Requires server change in M2 (D-P0-3) — NOT claimed fixed |
| Client QR verify interface | `SCAFFOLDED` | `mobile/src/security/qr.ts` | Interface only; verification is server-authoritative |

### 1.6 Security control status registry (honest labels)

`mobile/src/security/status.ts`:

| Control | Status |
|---|---|
| Token storage (secure-keychain adapter) | `SCAFFOLDED` (no device evidence yet) |
| Encrypted sensitive storage (SQLite/enc) | `SCAFFOLDED` (interface only) |
| Biometric app-lock | `SCAFFOLDED` (interface only) |
| Device-risk signals (jailbreak/root) | `NOT STARTED` |
| Certificate pinning | `SCAFFOLDED` (config scaffold) |
| QR signature verification | `BLOCKED` (server NG-04) |
| Log/telemetry scrubbing | `IMPLEMENTED` (unit-tested) |

Unit test `mobile/tests/security.test.ts::security control status registry is honest` enforces that **only `log-scrubbing`** claims `IMPLEMENTED`.

## 2. Known Findings Carried to M2

| ID | Finding | Impact | Evidence |
|---|---|---|---|
| SEC-M0-1 | `ScreeningViewSet` uses default `IsAuthenticated` only → traveler token can read screening/risk data | NG-03 risk (internal leak) | `backend/apps/screening/views.py:17-31`; xfail test |
| SEC-M0-2 / F-M1-2 | TRAVELER-type user granted `travelers:view` bypasses list scoping (`_staff_traveler_access`) | NG-02/NG-06 risk on consolidated travel APIs | `travelers/views.py:140-144`; xfail test |
| NG-04 | QR verification accepts unsigned requests | Open credential-replay risk | `vaccination/views.py:523` |

No-go conditions **NG-01, NG-03, NG-04, NG-06 remain OPEN**; not falsely represented as cleared.

## 3. Boundaries preserved

- SUDAPASS: traveler-identity-only; no SUDAPASS beyond a BLOCKED provider seam (§1.1).
- No authN/authZ bypass: offline mode only continues an existing trusted session (`mobile/tests/offline.test.ts`).
- Internal surfaces remain unmounted from mobile namespace (design test).