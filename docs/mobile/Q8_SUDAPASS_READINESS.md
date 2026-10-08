# AFYATNA MOBILE — PHASE 1.5
# Q8 — SUDAPASS READINESS

**Date:** 2026-10-08  
**Gate P1.5-3 outcome:** **BLOCKED** (official integration material unavailable). This is an acceptable outcome per §7/§28 — no workaround, no mock-as-production.

## 1. What was searched (repo-wide, excluding our own mobile docs and package node_modules)

Terms: `SUDAPASS`, `OIDC`, `OAuth`, `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `client_id`, `redirect_uri`, `PKCE`, across `*.py`, `*.md`, `*.json`, `*.yaml/yml`, `*.env*`.

## 2. Findings — what exists that looks related but is NOT acceptable evidence

| Location | Content | Why not acceptable |
| --- | --- | --- |
| `backend/apps/accounts/migrations/0013...0015` | `user.sudapass_subject_id` added then **removed** (2026-09-13) | Removal = no integration, no spec |
| `backend/apps/public/migrations/0005` | `Service.identity_provider` choice string `'SUDAPASS'` | Cosmetic service metadata; not an OIDC client |
| `frontend/src/pages/profile/ProfilePage.tsx:568` | static "SUDAPASS" label | UI text only |
| `.pytest_cache` nodeids | references a deleted `test_sudapass_auth.py` | File absent from tree → stale cache |
| `docs/ADR/ADR-0004-JWT.md` | generic "OAuth2/OIDC" discussion for internal apps | No SUDAPASS issuer/client |
| WHO ICD/IHR OAuth docs + env vars | unrelated external OAuth integration | Different system (WHO), not SUDAPASS |

**Official integration material: NONE.** No approved issuer metadata, authorization/token endpoints, JWKS, scopes/claims, client registration, test IdP credentials, or owner-approved integration contract exists anywhere in the repository or its documentation.

## 3. Rule enforcement

- No guessed/inferred endpoints were invented. No fake client ID. No fabricated claims.
- Boundary (§6): SUDAPASS remains **traveler-identity-only**; institutional auth (JWT + RBAC) untouched.
- The client seam provided in M1 (`mobile/src/auth/provider.ts` — `SudapassAuthProvider`) remains a **BLOCKED seam**; no mock is labeled production.

## 4. Outcome

```text
Q8 = BLOCKED                       (external dependency / owner: Identity·Ops)
D-P0-1 = BLOCKED                   (phase-1 contract §27)
M2 = BLOCKED                       (contract final rule — unchanged)
```

## 5. Required unblock actions (owner: Identity / Ops)

1. Register an OIDC client for AFYATNA with the SUDAPASS identity provider tenant.
2. Provide via the approved secret mechanism: issuer URL, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `client_id`, allowed scopes/claims, `redirect_uri` policy.
3. Provide a **test IdP** (or mock tenant) with test users for automated + staging verification.
4. Approve the integration contract (phase-16 D-P0-1 acceptance criteria).

Recheck point for the next phase: the presence of the above (all seven items) with verified metadata.