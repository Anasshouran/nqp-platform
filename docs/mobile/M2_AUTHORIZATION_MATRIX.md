# AFYATNA MOBILE — M2 AUTHORIZATION MATRIX

**Date:** 2026-10-08  
**Mode:** READ-ONLY. Per contract §21 / §22 — M2 = READY requires **all** gates PASS.

| Gate | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| A-01 | Repository integrity | Read-only capture: 406 entries; NEW_UNEXPECTED_CHANGES = NONE; nothing reverted | **PASS** |
| A-02 | Phase 1.5 regression | `pytest mobile_api screening travelers vaccination` → **196 passed**; mobile 49; contracts 11; typecheck/lint clean | **PASS** |
| A-03 | Traveler isolation | `test_traveler_isolation.py` A–H + IDOR negatives green; invariant `TRAVELER + view + foreign resource = DENY` holds | **PASS** |
| A-04 | Screening authorization | `test_security_matrix.py` green; authN+role+action+POE scope enforced; anon 401 / traveler 403 / scope fail-closed | **PASS** |
| A-05 | QR fail-closed | Full matrix: unsigned/invalid/wrong-key/tampered/malformed → 400; expired/revoked → not verified; legit signed → success | **PASS** |
| A-06 | Mobile classification | Schema guard, verification guard, TS parity green; INTERNAL/SECURITY_SENSITIVE never in mobile surface; SENSITIVE_HEALTH has approved purpose | **PASS** |
| A-07 | SUDAPASS official specification | Fresh repo/doc search → no issuer/endpoints/JWKS/client/scopes/test IdP; only legacy artifacts | **BLOCKED** |
| A-08 | SUDAPASS test IdP | None approved; no test environment; `D-P0-1` cannot be declared PASS | **BLOCKED** |
| A-09 | Traveler-only SUDAPASS boundary | `assertTravelerProvider` + `TRAVELER_ONLY_PROVIDERS`; institutional auth untouched; tests green | **PASS** |
| A-10 | Q1 residency | `Q1_RESIDENCY_DECISION.md` — **DECISION PENDING**, no owner approval | **BLOCKED** |
| A-11 | Q6 cached claims | `Q6_IDP_CLAIMS_DECISION.md` — invariant verified; retention/expiry policy **DECISION PENDING**, no owner approval | **BLOCKED** |
| A-12 | Offline authentication security | No bypass; offline = active existing session only; refresh network-only; logout purge; idp-claims tests green | **PASS** |
| A-13 | Data ownership | Ownership explicit per domain (phase-15); statutory retention not invented (Q2 pending, documented) | **PASS** |
| A-14 | Mobile OpenAPI | `/api/v1/mobile/` v1 stable (snapshot unchanged); 10 paths; contract/breaking-change tests green | **PASS** |
| A-15 | Regression suites | Executed: mobile_api/screening/travelers/vaccination (196) + mobile (49) + contracts (11); remainder explicitly CI-owned (full-suite 2457) | **PASS** |
| A-16 | Security tooling | bandit 0 High/0 Medium on changed surfaces; secrets guard clean; contract/authZ/QR suites green | **PASS** |
| A-17 | Change-control compliance | No criterion weakened; authorization/QR/classification strengthened; tests not reduced | **PASS** |
| A-18 | New P0 findings | None discovered (read-only audit) | **PASS** |

## Decision (§22)

M2 = READY requires **all 18 gates PASS**. A-07, A-08 (SUDAPASS), A-10, A-11 (owner decisions) are BLOCKED.

```text
M2 AUTHORIZATION = BLOCKED
M2 IMPLEMENTATION = NOT AUTHORIZED
```

Classification: **BLOCKED** (external + owner dependencies), not FAIL (no technical prerequisite failing) — consistent with §23 expected state.