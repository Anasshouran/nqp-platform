# PHASE 1.5 FINAL ACCEPTANCE REPORT

**Date:** 2026-10-08

## Overall Status

PHASE 1.5: **PASS**

## Security Gate

**PASS** — F-M1-2 (traveler object isolation), SEC-M0-1 (screening authorization), NG-04 (QR fail-closed) remediated with runtime evidence; F-M1-3 defined + classified; classification guards active.

## Authorization Gate

**PASS** — RBAC + object/POE scope enforced; traveler queryset isolation always `request.user`; screening `screening:*` + port scope fail-closed. No permission-grant widens a TRAVELER principal.

## QR Verification Gate

**PASS** — unsigned/invalid/wrong-key/malformed signatures rejected (400 + audit); signed-but-expired/revoked → not verified; backward compatible (no legacy unsigned format exists).

## Data Classification Gate

**PASS** — INTERNAL/SECURITY_SENSITIVE barred from mobile surfaces; SENSITIVE_HEALTH requires approved purpose; minimal verification payload defined (additions require owner approval).

## SUDAPASS Gate

**BLOCKED** — Q8 external dependency (no official issuer/token/jwks/client/test IdP). Not converted to PASS via mocks. `SUDAPASS_IMPLEMENTATION = BLOCKED`.

## Owner Decision Gate

**BLOCKED** — Q1 residency (DECISION PENDING), Q6 claims retention/expiry (DECISION PENDING), plus Q8 (external). No decision invented.

## Findings Closed

- SEC-M0-1 — CLOSED (screening: `PermissionAction`+scope; 403 for traveler; matrix green).
- F-M1-2 — CLOSED (traveler principals always scoped; update/delete of others → 403/404).
- F-M1-3 — CLOSED (defined + classified; production endpoint wiring = M2).
- NG-04 — CLOSED (unsigned signatures never accepted).

## Findings Remaining

- Q8 SUDAPASS readiness — BLOCKED (external dependency).
- Q1 residency — BLOCKED (owner decision).
- Q6 cached-claims policy — BLOCKED (owner decision; invariant runtime-verified).
- (Documented non-P0 notes: `public/lookup` enumeration-throttling topic; `VerifyCertificateView` clerk-number flow is out-of-scope for NG-04; both recorded without false coverage.)

## Tests

| Suite | Result |
| --- | --- |
| Backend contract + isolation + screening-boundary (`apps/mobile_api apps/screening`) | **80 passed** (0 xfail — both former xfails now real PASS) |
| Traveler domain (`apps/travelers`) | **43 passed** |
| Vaccination + QR matrix (`apps/vaccination`) | **73 passed** |
| Mobile (jest, 7 suites incl. `idp-claims`) | **49 passed** |
| Shared contracts (`contracts`) | **11 passed** |
| Typecheck / lint (mobile, contracts) | clean |
| OpenAPI mobile namespace | 10 paths present; schema generates |
| Android bundle (`expo export`) | 581+ modules, export OK |
| `manage.py check` / `makemigrations --check` | clean |

## Evidence

Key artifacts: `P1_5_BASELINE.md`, `P1_5_FINDINGS_RECONCILIATION.md`, `P1_5_SECURITY_REMEDIATION_REPORT.md`, `P1_5_AUTHORIZATION_MATRIX.md`, `P1_5_QR_VERIFICATION_REPORT.md`, `MINIMAL_VERIFICATION_PAYLOAD.md`, `Q1_RESIDENCY_DECISION.md`, `Q6_IDP_CLAIMS_DECISION.md`, `Q8_SUDAPASS_READINESS.md`, `P1_5_ACCEPTANCE_MATRIX.md`; test files + bandit/secrets/perf runs. Local perf baseline worst p95 = **43.0 ms** (`scripts/p15_measure_perf.py`); NETWORK/STAGING not measured.

## Files Changed

Phase 1.5 (all additive or scoped to confirmed findings):
- `backend/apps/travelers/views.py` — F-M1-2 (queryset/object scoping).
- `backend/apps/screening/views.py` — SEC-M0-1 (RBAC + scope fail-closed + create scope gate).
- `backend/apps/vaccination/views.py` — NG-04 (fail-closed signature). (comment change only)
- `backend/apps/vaccination/tests/test_vaccination.py` — updated 3 calls to supply signature; transformed 1 permissive test into fail-closed; added QR matrix tests.
- `backend/apps/mobile_api/` — new `verification.py`, `tests/test_verification_payload.py`, `tests/test_traveler_isolation.py`; updated `test_internal_boundary.py`, `test_authorization_boundary.py` (xfails → real).
- `backend/apps/screening/tests/test_security_matrix.py` — new matrix.
- `mobile/tests/idp-claims.test.ts` — new Q6 invariant tests.
- `scripts/p15_measure_perf.py` — perf baseline.
- `docs/mobile/` — this phase's documentation set.

## Pre-existing Changes Preserved

YES — PRE_EXISTING_MODIFICATIONS recorded in `P1_5_BASELINE.md` untouched; Phase-1 files preserved; no destructive migrations; no data deletion.

## No-Go Conditions

NG-01 (SUDAPASS) — OPEN → **blocks M2** (unchanged, per contract §27).  
NG-02 / NG-04 / NG-06 — the authorization/QR prerequisites these map to are remediated; NG-02/NG-04 no longer block; NG-05 defined. Production release additionally remains gated on NG-01.

## M2 Status

**BLOCKED**

## Exact M2 Blockers

1. `D-P0-1 = BLOCKED` — SUDAPASS OIDC registration/metadata/test IdP unavailable (Q8) — **mandatory, per Phase-1 contract §27**.
2. Owner decisions pending: Q1 (data residency), Q6 (cached IdP claims retention/expiry), and the related verified-verification-payload additions policy (Q4/F-M1-3 addenda).
3. All technical security prerequisites for M2 are otherwise satisfied (F-M1-2, SEC-M0-1, NG-04, F-M1-3 closed).

## Auditor Recommendation

**HOLD — do not start M2** until the SUDAPASS prerequisites (Q8) and the owner decisions (Q1/Q6) are approved and recorded. Phase 1.5 itself is the correct outcome: technical remediation complete and **PASS**, but M2 must stay **BLOCKED** on the external identity-provider dependency and pending owner decisions — no unsafe workaround.