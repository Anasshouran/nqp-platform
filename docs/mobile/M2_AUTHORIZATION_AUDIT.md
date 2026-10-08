# AFYATNA MOBILE — M2 AUTHORIZATION GATE
# PRE-IMPLEMENTATION ACCEPTANCE AUDIT

**Date:** 2026-10-08  
**Mode:** READ-ONLY AUDIT / AUTHORIZATION GATE — no source, schema, migration, CI, OpenAPI, or test modifications performed.  
**Authority:** Phase 0 + Phase 1 Contract + M0/M1 Acceptance + Phase 1.5 Acceptance.

---

## 1. Repository Integrity (read-only capture)

```text
git status --short  → 406 entries (pre-existing work + documented Phase-1/1.5 additions; unchanged during this audit)
git log -3          → feb29d7 … (no decision/SUDAPASS commits in the window)
Tracked modifications in working tree = pre-existing + the 4 documented P1.5 files
  (travelers/views.py, screening/views.py, vaccination/views.py, vaccination/tests/test_vaccination.py)
```

Classification: `PRE_EXISTING_WORK` unchanged · `PHASE_1_WORK` unchanged · `PHASE_1.5_WORK` unchanged · **`NEW_UNEXPECTED_CHANGES` = NONE**. Nothing reverted, nothing cleaned.

## 2. Phase 1.5 Regression Verification (executed)

| Scope | Command (read-only) | Result |
| --- | --- | --- |
| Contract + isolation + screening boundary + QR + classification | `pytest apps/mobile_api apps/screening apps/travelers apps/vaccination -q` | **196 passed** |
| Mobile | `npm run typecheck && lint && test` | clean · **49 passed** (7 suites) |
| Shared contracts | `npm test` | **11 passed** |
| Backend checks | `manage.py check` · `manage.py spectacular` | clean · OpenAPI **10 mobile paths** |

### 4.1 Traveler isolation — invariant re-tested
`test_traveler_isolation.py` matrix A–H + negatives (list/detail/update/delete/search/filter/pagination/tampered-id): traveler+`travelers:view` on another's owned resource ⇒ **DENY** (list scoped, detail/update/delete 404/403). Cross-traveler data: none.

### 5 Screening authorization — re-tested
`test_security_matrix.py`: authentication + role (`screening:*`) + action + POE/port scope enforced; anon 401, traveler 403, bystander role 403, inspector scoped, no-scope staff empty, GLOBAL/admin unaffected. No generic authenticated token reaches restricted screening data.

### 6 QR security — re-tested
Unsigned/invalid/wrong-key/tampered/malformed → 400 (`signature_valid:false`); signed-but-expired/revoked → `verified:false` + audit. Legitimate signed certs succeed. No negative case unexpectedly passed ⇒ no `FAIL` trigger.

### 7 Mobile classification — re-tested
INTERNAL/SECURITY_SENSITIVE barred from mobile schema/verification payload; SENSITIVE_HEALTH fields carry approved purpose (verification guard green; no-INTERNAL schema guard green; parity test green). No newly discovered prohibited exposure.

## 3. SUDAPASS Authorization Gate (Q8 / A-07 / A-08)

Fresh search (authorization_endpoint / token_endpoint / jwks_uri / issuer / client_id / redirect_uri / PKCE / scopes / claims / test IdP) across `backend`, `frontend`, `deploy`, `contracts`, `mobile/src`, `scripts`, docs:

- **Official integration material: ABSENT.** Only legacy artifacts: `accounts` migration `0013→0015` (field added/removed), `public` migration `0005` (metadata choice string), stale frontend label (`ProfilePage.tsx:568`), a deleted `test_sudapass_auth.py` referenced only in `.pytest_cache`.
- No issuer, no endpoints, no JWKS, no client registration, no redirect policy, no scopes/claims contract, no approved test IdP, no test credentials.
- Git history shows no SUDAPASS/owner-decision commits.

Result: **Q8 = BLOCKED (external dependency)** → `D-P0-1 = BLOCKED` (Phase-1 contract §27). A-07/A-08 = **BLOCKED**. Nothing fabricated; the client seam (`mobile/src/auth/provider.ts`) remains a BLOCKED seam.

## 4. SUDAPASS Identity Boundary (A-09)

`mobile/src/auth/session.ts`: `TRAVELER_ONLY_PROVIDERS = ['password','sudapass']` + `assertTravelerProvider` rejects any institutional provider string (tests green). Institutional authentication = existing JWT+RBAC (`PermissionAction`, `HasApiKey`), independent. No path lets SUDAPASS authenticate staff/inspectors/managers/admins/EOC/carrier users. Result: **PASS**.

## 5. Q1 Residency (A-10)

`docs/mobile/Q1_RESIDENCY_DECISION.md` — current interpretation recorded (data-flow/control + jurisdiction), evidence from ownership links, unresolved ambiguity stated, owner identified. **Status: DECISION PENDING — no owner approval exists.** No resolution invented. Result: **BLOCKED (owner)**.

## 6. Q6 Cached IdP Claims (A-11)

`docs/mobile/Q6_IDP_CLAIMS_DECISION.md` — invariant runtime-verified (`idp-claims.test.ts`): no identity from claims alone, no offline refresh, expiry enforced, no claims→session builder. **Retention/expiry/lifetime policy: DECISION PENDING — no owner approval exists.** Result: **BLOCKED (owner)**.

## 7. Offline Authentication Security (A-12)

`mobile/src/auth/session.ts` (`canOperateOffline` = online || active existing session within `expiresAt`); refresh is network-only; secure storage interface (SecureStore) SCAFFOLDED; logout purge clears tokens; no cached identity → full access path exists. No authentication bypass. Result: **PASS**.

## 8. Data Ownership (A-13)

Explicit ownership for its actual surfaces: Traveler/acct (`travelers.Traveler.user`, `accounts.User`), certificates (`certificate.traveler`), declarations (carrier module), verification (audit log), offline cache/sync queue (client projections; server authoritative — phase-09/15). Controller-custodian model recorded. **Statutory retention values NOT invented** (Q2 pending; purge schedules deferred). Result: **PASS** (statutory values remain owner-pending, documented, non-blocking to technical authorization).

## 9. API Contract (A-14)

`/api/v1/mobile/` v1 stable: snapshot `mobile_v1.json` unchanged since P1.5; breaking-change gate green; envelope + bilingual errors + classification + authN/authZ tests green; OpenAPI 10 mobile paths; contract tests included in the 196. Result: **PASS**.

## 10. Regression & Domain Safety (A-15)

Run (targeted): `mobile_api, screening, travelers, vaccination` → 196 passed; mobile 49; contracts 11. CI-owned remainder (not individually executed here): `accounts, carriers, shipping/ports, land-borders, airport_health, clinic, laboratory, food_*, emergency_eoc, surveillance, it/db_admin, organization, public, masterdata, notifications, reporting, integration, ihr, who, hr, vector_control` — full `pytest apps` (2457 tests) is owned by the existing backend CI job (slow locally, finding F-M1-1). Our P1.5 code changes are confined to the four files above which we re-ran. Result: **PASS** for the executed scope; remainder explicitly CI-owned (no claim of local full-suite completion).

## 11. Security Tooling (A-16)

`bandit -r apps/mobile_api apps/screening/views.py apps/travelers/views.py apps/vaccination/views.py -ll -ii` → **0 High / 0 Medium severity** (exit 0). Secrets guard over the same surfaces + mobile/contracts src → clean. Authorization/contract/QR test suites green. No High/Critical finding unexplained. Result: **PASS**.

## 12. Performance (A-not-scored gate)

LOCAL worst p95 = **43.0 ms** (`scripts/p15_measure_perf.py`, loopback/dev, n=15) — this is **local only**. STAGING / NETWORK baselines have **not** been measured in the current environment (no staging env provisioned in this audit). The Phase-1 performance acceptance (p95 ≤ 1.5 s) must be confirmed in a proper staging/network environment; not claimed here.

## 13. Change Control (A-17)

No Phase-1 contract criterion weakened: authorization strengthened (scoping/RBAC), QR hardened (fail-closed), classification enforced, tests increased (M1 baselines not reduced). No acceptance criterion relaxed (all P1.5 doc changes were additions). Result: **PASS**.

## 14. New P0 Findings (A-18)

NONE discovered during this read-only audit. Existing non-blocking notes (public/lookup enumeration topic; `VerifyCertificateView` clerk-number flow out of NG-04 scope) remain documented, non-P0.

## 15. Authorization Logic (§22)

M2 receives READY only if every A-01…A-18 = PASS. Gates A-07/A-08 (SUDAPASS spec/test IdP) and A-10/A-11 (Q1/Q6 owner decisions) are **BLOCKED** → not PASS. Therefore:

```text
M2 AUTHORIZATION = BLOCKED
```

This is BLOCKED (external/owner dependencies unavailable), **not** FAIL (no technical/security prerequisite is failing) and **not** PASS (no authorization). Per §23 this is the correct and expected state — Phase 1.5 findings are not downgraded and the code being ready is not treated as authorization.