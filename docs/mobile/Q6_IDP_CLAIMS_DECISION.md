# AFYATNA MOBILE — PHASE 1.5
# Q6 — CACHED IDP CLAIMS DECISION

**Date:** 2026-10-08  
**Status:** OWNER DECISION REQUIRED for retention/expiry policy; the **security invariant is verified by runtime tests**.

## 1. Security invariant

> Offline mode must not turn cached IdP claims into a new source of authentication authority.

Current behavior (verified):

1. An **authenticated online session** holds an access token (+ claims only if provided by provider in-session).
2. **Network unavailable** → the app may keep operating **only while the existing trusted session is within its approved lifetime** (`canOperateOffline`).
3. Expired/revoked tokens are **not** silently revalidated: offline continuation requires `expiresAt > now`; going back online refreshes via the provider (network-only — `PasswordAuthProvider.refresh` calls the API; there is **no offline/local refresh**).
4. **No identity is created from cached claims alone**: there is no session builder from claims; `SudapassAuthProvider` is a blocked seam; a claims-only object yields an inactive session (`accessToken=''`).
5. Sensitive decisions do not rely on stale claim values: telemetry scrubbing and session checks operate on token/session state, not claim content (claims that exist are scrubbed or not exported).

## 2. Runtime tests (§9 items 1–7)

`mobile/tests/idp-claims.test.ts` (6 tests, all PASS): online-session validity, claims-only cannot construct a session, expired session never becomes valid offline, refresh is network-only, no exported claims→session builder, offline requires an active existing session.

## 3. What still needs an owner decision (retention/expiry policy)

- Approved lifetime for offline continuation (current de facto = token `expiresAt`, ≤30 min access lifetime; refresh requires network — but the **approved** number is not documented).
- Whether/for how long any non-token claims may be cached on-device (SUDAPASS not implemented; recommendation phase-15: none).
- Handling of revoked sessions offline (currently: expiry-enforced; server revocation requires connectivity to reflect).

These are policy, not code gaps. Owner: Security Architect + Identity/Controller.

## 4. Decision record

```
Invariant compliance: VERIFIED (runtime tests).
Retention/expiry policy: DECISION PENDING (owner approval required).
Q6 = BLOCKED — OWNER (until approved).
```