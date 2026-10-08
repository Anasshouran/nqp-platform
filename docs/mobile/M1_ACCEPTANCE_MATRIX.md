# AFYATNA MOBILE — M0/M1 ACCEPTANCE MATRIX

**Date:** 2026-10-07  
Per phase-1 contract §25. Results require explicit evidence (no PASS on inspection alone where runtime evidence applies).

| ID | Requirement | Evidence | Result |
|---|---|---|---|
| M0-01 | Repository baseline | `docs/mobile/M0_BASELINE_REPORT.md` §1; git state captured (368 entries preserved); runtime: `pytest apps/accounts/tests/test_rbac.py` → 57 passed | **PASS** |
| M0-02 | Phase 0 reconciliation | `M0_BASELINE_REPORT` §2 — auth/travel/vaccination/requirements/API/security audited with file+line evidence; 2 refinements (borders_health mounted; screening gap SEC-M0-1) | **PASS** |
| M0-03 | Phase 17 review | `docs/mobile/M0_OPEN_QUESTIONS_STATUS.md` — 15/15 listed, 7 P0 all BLOCKED, owners assigned, no decisions invented | **PASS** |
| M0-04 | SUDAPASS traveler boundary | `M0_BASELINE_REPORT` §6.1 + `mobile/src/auth/session.ts` (`TRAVELER_ONLY_PROVIDERS`) + `tests/auth.test.ts` rejects institutional providers | **PASS** |
| M0-05 | Internal auth boundary | `M0_BASELINE_REPORT` §6.1 + `test_internal_boundary.py` (db_admin 403, emergency 403, carrier API-key 401) | **PASS** |
| M0-06 | No-go mapping | `M0_BASELINE_REPORT` §6.2 — NG-01…NG-06 all mapped; none falsely cleared | **PASS** |
| M1-01 | CI skeleton | `.github/workflows/m1-mobile.yml` (contract / security-baseline / mobile lanes); local lane commands green (evidence in `M1_IMPLEMENTATION_REPORT`); existing `ci.yml` untouched | **PASS** |
| M1-02 | Mobile bootstrap | `mobile/` (Expo SDK 57 / RN 0.86 / TS 6), required `src/` tree, `npx expo export --platform android` bundles 581 modules; lint/typecheck/test green | **PASS** |
| M1-03 | OpenAPI mobile namespace | `backend/apps/mobile_api/` registered; `manage.py spectacular` → 10 mobile paths + 15 components; `/api/schema/` mounted | **PASS** |
| M1-04 | Shared contracts | `contracts/` (@afyatna/contracts) Zod+types; consumed by mobile + parity tests; 11 tests green | **PASS** |
| M1-05 | Contract tests | `pytest apps/mobile_api -q` → 50 passed, 2 xfailed (xfail = documented gaps, not hidden) | **PASS** |
| M1-06 | Classification foundation | `mobile_api/classification.py` + tests (every field classified; INTERNAL/forbidden never in mobile schema); parity with TS | **PASS** |
| M1-07 | Auth abstraction | `mobile/src/auth/` — `AuthProvider` interface, `SudapassAuthProvider` (BLOCKED seam, no fake client), interim password provider vs real endpoint; tests green | **PASS** (seam; SUDAPASS_IMPLEMENTATION = BLOCKED, D-P0-1 blocked) |
| M1-08 | Security foundation | `mobile/src/security/*` interfaces + status registry; scrubbing IMPLEMENTED + tested; bandit 0 High/0 Medium; secrets grep clean | **PASS** |
| M1-09 | Offline foundation | `mobile/src/offline/*` state machine (DRAFT→…→CONFLICT), queue, idempotency, connectivity rules; tests green (incl. "no offline identity creation") | **PASS** |
| M1-10 | Observability foundation | `mobile/src/utils/telemetry.ts` + `security/scrub.ts`; `SENSITIVE_HEALTH → SCRUBBED` explicitly tested pre-transport | **PASS** |
| M1-11 | Performance baseline | `scripts/m1_measure_perf.py` → worst p95 **36.7 ms** local (n=30); BASELINE/TARGET/MEASURED/GAP recorded; 1.5 s target **not claimed** as network-verified | **PASS** |
| M1-12 | Evidence package | `docs/mobile/M0_BASELINE_REPORT.md`, `M0_OPEN_QUESTIONS_STATUS.md`, `M1_API_CONTRACT.md`, `M1_SECURITY_EVIDENCE.md`, `M1_OPEN_QUESTIONS.md`, `M1_ACCEPTANCE_MATRIX.md`, `M1_IMPLEMENTATION_REPORT.md` | **PASS** |

Gates:

```text
M0_GATE = PASS          (no-go conditions mapped; P0 BLOCKED status is flagged, not cleared)
M1_GATE = PASS          (skeleton scope; CI lanes defined; all local lane executions green;
                         contract/OpenAPI/security evidence present; no unauthorized exposure)
D-P0-1   = BLOCKED      (SUDAPASS — no official integration info)
M2       = BLOCKED      (phase-1 contract §27 final rule: content/cert-seam blocked, plus open P0 decisions)
```

Backend regression evidence is a 492-test green sample (accounts/travelers/notifications/public/vaccination/mobile_api); full 2457-test suite is delegated to the existing CI job (slow locally — finding F-M1-1). See `M1_IMPLEMENTATION_REPORT.md` §8.