# AFYATNA MOBILE — PHASE 1.5
# ACCEPTANCE MATRIX

**Date:** 2026-10-08  
Per contract §32.

| ID | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| P1.5-01 | Baseline integrity | `P1_5_BASELINE.md`; PRE_EXISTING vs PHASE_1 vs PHASE_1.5 classified; no pre-existing file reverted | **PASS** |
| P1.5-02 | Finding reconciliation | `P1_5_FINDINGS_RECONCILIATION.md` — all 7 findings independently reproduced/inspected; no downgrade without evidence | **PASS** |
| P1.5-03 | SUDAPASS traveler-only boundary | `Q8_SUDAPASS_READINESS.md` §3; seam is traveler-only; institutional auth untouched | **PASS** |
| P1.5-04 | Q8 official integration readiness | Repo-wide search → no issuer/token/jwks/client/test IdP (only stale artifacts); documented | **BLOCKED** (external) |
| P1.5-05 | Q1 residency decision | `Q1_RESIDENCY_DECISION.md` — interpretation documented; owner approval absent → DECISION PENDING | **BLOCKED** (owner) |
| P1.5-06 | Q6 cached claims decision | `Q6_IDP_CLAIMS_DECISION.md` — invariant runtime-verified (6 tests); retention/expiry policy pending owner | **BLOCKED** (owner) |
| P1.5-07 | Traveler queryset isolation | `travelers/views.py` `_is_traveler_principal` + `get_queryset` filter; `test_traveler_isolation.py` (A–H) green | **PASS** |
| P1.5-08 | Traveler IDOR negative tests | update/delete/tamper/pagination/search/filter foriegn data → 403/404; self-service intact | **PASS** |
| P1.5-09 | Screening authorization | `screening/views.py` RBAC+scope fail-closed; matrix (anon/traveler/bystander/inspector/global/admin) green | **PASS** |
| P1.5-10 | Screening negative tests | `test_security_matrix.py` (12 tests) + mobile internal-boundary 403 (former xfail→PASS) | **PASS** |
| P1.5-11 | QR unsigned rejection | `vaccination/views.py` fail-closed; `test_public_verify_without_signature_fails_closed` | **PASS** |
| P1.5-12 | QR tamper rejection | wrong-key/foreign-signature/malformed/unsupported → 400 (3 tests) | **PASS** |
| P1.5-13 | QR expiry/revocation | signed-but-expired→verified=false; signed-but-revoked→verified=false (+audit) | **PASS** |
| P1.5-14 | Minimal verification payload | `MINIMAL_VERIFICATION_PAYLOAD.md` + `verification.py` + guard tests (6) | **PASS** (defined+classified; DECISION PENDING only for additions) |
| P1.5-15 | Classification enforcement | no-INTERNAL guard (schema) + verification guard + TS parity — green | **PASS** |
| P1.5-16 | M1 regression suite | backend contract 80 passed (no xfail); travelers 43; vaccination 73; mobile 49 (was 43); contracts 11; typecheck/lint clean; OpenAPI 10 mobile paths; Android bundle export OK; `manage.py check`/makemigrations clean | **PASS** |
| P1.5-17 | Security regression scan | bandit 0 High/0 Medium on changed surfaces; secrets grep clean; IDOR/QR/scope negative matrices above | **PASS** |
| P1.5-18 | Documentation/evidence | 11 docs produced (`P1_5_BASELINE` … `P1_5_FINAL_ACCEPTANCE_REPORT`) | **PASS** |
| P1.5-19 | No new P0 findings | None introduced; no authorization/QR/data-exposure regressions; screening/traveler/certificate surfaces re-tested | **PASS** |
| P1.5-20 | M2 authorization | see §30 checklist + final report | **BLOCKED** (SUDAPASS Q8 + owner Q1/Q6; per contract §27) |

## Notes on §30 (M2 authorization — mandatory items)

| Mandatory | Status |
| --- | --- |
| F-M1-2 closed | ✅ closed |
| SEC-M0-1 closed | ✅ closed |
| NG-04 closed | ✅ closed |
| F-M1-3 closed | ✅ closed (defined + classified) |
| no new P0 authorization finding | ✅ |
| no cross-traveler access | ✅ (matrix A–H) |
| no unsafe QR acceptance | ✅ (fail-closed) |
| no prohibited mobile data exposure | ✅ (classification guards) |
| SUDAPASS prerequisite (Q8) | ❌ **BLOCKED** → `D-P0-1 = BLOCKED` → `M2 = BLOCKED` (contract §27 rule unchanged) |