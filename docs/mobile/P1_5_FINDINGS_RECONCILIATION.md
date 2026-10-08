# AFYATNA MOBILE — PHASE 1.5
# FINDINGS RECONCILIATION

**Date:** 2026-10-08  
**Method:** every confirmed finding was independently reproduced/inspected **before** any remediation. No severity downgraded without evidence.

| Finding | Reproduced? | File | Symbol | Runtime Evidence | Severity | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **SEC-M0-1** Screening reachable by any authenticated token | ✅ Yes | `backend/apps/screening/views.py:17-31` | `ScreeningViewSet` — **no** `permission_classes` → global `IsAuthenticated` only | Reproduced pre-fix: traveler JWT → `GET /api/v1/screening/` = **200** (mobile boundary test, xfail) | **P0 SECURITY** | **CLOSED** (P1.5) |
| **F-M1-2** TRAVELER + `travelers:view` ⇒ unscoped list | ✅ Yes | `backend/apps/travelers/views.py` (old `get_queryset` line 139-140; `_staff_traveler_access`) | `_staff_traveler_access` returns True for any `travelers:*` permission regardless of `user_type` → `get_queryset` not filtered | Reproduced pre-fix: traveler with `travelers:view` listed traveler B's record (xfail test) | **P0 AUTHORIZATION** | **CLOSED** (P1.5) |
| **F-M1-3** Minimal verification payload undefined | ✅ Yes (absent) | `backend/apps/vaccination/views.py:546-557` (full payload incl. `vaccine_name_ar`/`vaccine_code`, no issuance of `verified_at`); `backend/apps/public/views.py` (`VerifyCertificateView` returns `disease`, `passport_number`, `traveler_name`) | `PublicVaccinationVerifyView.get` payload; `VerifyCertificateView.post` payload | Contract inspection + classification registry audit | **P0 DATA CLASSIFICATION / CONTRACT** | **CLOSED (DEFINED + CLASSIFIED)** — production endpoint wiring is M2 (mobile namespace absent); enforcement guard commissioned |
| **NG-04** Unsigned QR accepted | ✅ Yes | `backend/apps/vaccination/views.py:523` | `signature_ok = cert.signature_matches(signature) if signature else True` | Reproduced pre-fix: `test_public_verify_without_signature_still_works` returned 200/verified=True | **NO-GO** | **CLOSED** — fail-closed (P1.5) |
| **Q8** SUDAPASS readiness | ✅ Absent | whole repo (search: SUDAPASS / OIDC / issuer / authorization_endpoint / token_endpoint / jwks_uri / client_id / redirect_uri / PKCE) | No official material. Only: migrations `0013→0015` (field added/removed), `public/migrations/0005` service-metadata choice, stale frontend label `ProfilePage.tsx:568`. A `.pytest_cache` nodeid references a deleted `test_sudapass_auth.py` (no file in tree) | Search results `docs/mobile/Q8_SUDAPASS_READINESS.md` | **P0** | **BLOCKED — EXTERNAL DEPENDENCY** |
| **Q1** Residency/data ownership | ⚠️ Requires interpretation | ownership model audit (phase-15) | Traveler/cert/declaration ownership = `user`/`traveler` FKs; deletion/retention not settled | See `Q1_RESIDENCY_DECISION.md` | **P0** | **BLOCKED — OWNER DECISION REQUIRED** |
| **Q6** Cached IdP claims policy | ⚠️ Requires interpretation | `mobile/src/auth/session.ts`, `provider.ts`; backend JWT (30/7, blacklist) | No claims caching exists; offline = continue existing token session only | 7-invariant tests in `mobile/tests/idp-claims.test.ts` (6 tests) | **P0** | **BLOCKED — OWNER DECISION REQUIRED** (invariants runtime-verified; retention/expiry policy needs approval) |

## Gate P1.5-0 verdict

All findings independently confirmed. No downgrade without evidence. Two findings closed by remediation (SEC-M0-1, F-M1-2), one NO-GO closed (NG-04), one defined-closed (F-M1-3 contract), three remain BLOCKED on owners/external dependency (Q8/Q1/Q6).