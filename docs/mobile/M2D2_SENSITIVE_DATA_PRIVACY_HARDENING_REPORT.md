# M2-D2 SENSITIVE DATA & PRIVACY HARDENING REPORT

**Date:** 2026-10-08  
**Mode:** SECURITY/PRIVACY HARDENING (controlled, evidence-driven)  
**Baseline preserved:** M2-A/B/C1/C2/D1 acceptance states.

---

## 1. Executive Summary

Audited the full mobile data lifecycle (request → response → Redux → persisted cache → UI → notification → logging → telemetry → error → expiry/purge). One privacy defect was found and fixed: the shared client/server scrub-forbidden set did **not** include traveler-identifying and medical-history keys (`passport_number`, `passport_hash`, `medical_history`, `health_declaration`, `declaration_contents`, `certificate/verification_signature`, `qr_token`, `authorization`), so telemetry scrubbing would have passed them through if they ever entered an event. Extended the forbidden lists on both client and server, added adversarial tests. All other gates audit PASS or N/A; no HIGH defect remains. Verdict: **ACCEPTED**.

## 2. Scope

Mobile client + `apps/mobile_api` + traveler serializer/classification boundaries; telemetry/scrub hardening; additive tests. No new deps, no schema, no refactors.

## 3. Baseline

M2-A/B/C1/C2/D1 protections re-verified (ownership, server-owned fields, medical_history guard, QR fail-closed, cache isolation/purge, error-leak-free, no SUDAPASS, no declaration writes).

## 4. Data Classification Matrix

| Data | Classification | Mobile Needed | Cache | UI | Logs | Telemetry |
| --- | --- | --- | --- | --- | --- | --- |
| profile (name/contact) | PERSONAL | yes | 24h TTL | yes | no | no |
| national_id | PERSONAL | yes | via profile | yes | **no** | **no** |
| passport_number | (not mobile-returned) | no | **n/a (forbidden)** | no | **no** | **no** |
| certificates | SENSITIVE_HEALTH | yes | 12h TTL | yes | no | no |
| verification result | PUBLIC/Minimal | yes | ephemeral | yes | no | no |
| declarations | SENSITIVE_HEALTH | read-only | 12h TTL | yes (minimal) | no | no |
| medical_history | SENSITIVE_HEALTH | no (forbidden) | **forbidden** | no | **no** | **no** |
| risk_score/risk_level | INTERNAL | no | **forbidden** | no | **no** | **no** |
| requirements | PUBLIC | yes | 24h TTL | yes | no | no |
| notifications (subject) | SENSITIVE_HEALTH | yes | 7d TTL | yes (no body) | no | no |
| sync metadata | PUBLIC | yes | SERVER_ONLY | yes | no | permitted (non-sensitive) |
| timestamps | PUBLIC | yes | yes(TTL) | yes | no | permitted |

Unknown legal classifications: none assumed (`UNRESOLVED — DO NOT ASSUME` not triggered; registry is the approved source).

## 5. API Minimization Audit

Mobile endpoints return only contract-specified fields; verified no staff/user IDs, no internal notes, no risk fields, no audit metadata, no signatures/QR internals, no other-traveler data. Forbidden-response-field tests (schema + verification guards) green. No proposed removals lack client need evidence.

## 6. Client State Audit (Redux)

- No access/refresh tokens in Redux (tested: serialized state scan). Tokens stay in SecureStore auth channel.
- No wholesale backend objects stored; slices hold contract DTOs.
- Error objects in state are **normalized** `{httpStatus, code, ar, en}` only — new adversarial test proves no raw payload persists.
- Logout/account-switch/session-expiry purge all sensitive slices (tests A→B).

## 7. Persisted Cache Privacy Audit

M2-C1 baseline holds: encrypted (SecureStore), user-scoped keys, TTL per dataset, no tokens, purge on logout/switch/expiry, version/schema invalidation, corrupted-cache fail-closed. No stale health presented as current (CacheStamp + SERVER WINS). Policy gap (statutory retention) documented, not invented.

## 8. UI Privacy Audit

Screens render contract fields only; no full identifiers beyond approved profile; no risk/internal; error states show `{ar/en}` only. NOTE: `testID` attributes embed resource UUIDs (e.g., `certificate-<id>`) — test-only, not rendered; recorded MEDIUM, left as-is (no user-facing exposure).

## 9. Notification Privacy Audit

Notifications expose `subject` only (owner), never body/recipient/routing/internal notes (serializer + tests). Push preview policy: no health-body text used. No policy invented; minimization is the safe default already enforced.

## 10. Logging / Telemetry Audit

- No `console.*` in `mobile/src` (lint gate).
- **Finding & fix:** forbidden set lacked passport/medical/signature/authorization keys ⇒ extended `MOBILE_FORBIDDEN_FIELDS` (client `contracts/src/classification.ts`) and server (`apps/mobile_api/classification.py`); scrub now drops those keys (tests added: passport, medical_history, health_declaration, signatures, authorization, passport_hash).
- Existing SENSITIVE_HEALTH→SCRUBBED retained; server mobile code logs request-level only (no payloads).

## 11. URL / Query / Header Audit

Mobile builds no navigable URLs/query strings containing sensitive values; certificate/verification URLs are server-shaped and not rendered client-side; no deep links; headers only `Accept`, `Content-Type`, `Authorization` (token) — redacted from any telemetry path. PASS.

## 12. Clipboard / Share / Screenshot

No Clipboard/Share/screenshot/export API in the app → **N/A — NO SHARE/COPY SURFACE** (nothing to copy/leak; documented decision not to add).

## 13. Error Privacy Audit

Envelope `{code, ar, en}` everywhere; DRF `detail` never leaks; mobile error layer keeps only normalized fields (new adversarial test); no traceback/SQL/path/service names. Unmatched path returns non-informative 404 (documented).

## 14. Certificate / QR Privacy Audit

Fail-closed verified (vaccination suite green): unsigned/invalid/wrong-key/malformed rejected; private signing material never on client; verification minimum payload unchanged; owner-scoped; no logs/cache of sensitive verification material.

## 15. Retention Matrix

| Data | Memory | Persisted Cache | UI After Logout | Retention Trigger |
| --- | --- | --- | --- | --- |
| Tokens | none (SecureStore) | n/a | none | logout/expiry/switch |
| Profile | slice | 24h TTL | none | purge on logout/expiry/switch |
| Certificates | slice | 12h TTL | none | same + TTL |
| Declarations | slice | 12h TTL | none | same + TTL |
| Notifications | slice | 7d TTL | none | same + TTL |
| Requirements | slice | 24h TTL | none | same + TTL |

Statutory retention: `POLICY GAP — DO NOT INVENT` (Q2 pending). Immediate purge on logout/account-switch/session-expiry enforced (tested).

## 16. Remediations

| Finding | Severity | Evidence | Change | Test | Residual risk |
| --- | --- | --- | --- | --- | --- |
| Scrub-forbidden set lacked traveler-identity/medical/signature keys → possible telemetry pass-through | HIGH→fixed | `contracts/src/classification.ts`/`mobile_api/classification.py` listing | Extended forbidden lists (client+server) | `security.test.ts` M2-D2 block (4 adversarial) + backend classification suite | None (fields now dropped) |
| UUID identifiers in `testID` attributes | MEDIUM | screens (certificate-<id>) | none (test-only attr, not user-facing) | — | Negligible; documented |
| Unknown mobile path → Django 404 HTML | MEDIUM | routing | none (no leak) | — | Doc-only |
| Institutional self-service `declaration` read shows risk to owner | MEDIUM | travelers domain | none (outside mobile) | — | Domain-owner decision pending |

## 17. Tests

```text
backend: pytest apps/mobile_api apps/screening apps/travelers apps/vaccination -q → 215 passed
mobile:  npm test → 16 suites / 114 passed, 0 failed
          (incl. M2-D2 scrub + state-error adversarial tests; +11 tests from M2-E)
contracts: npm test → 11 passed
typecheck / lint (mobile) → clean
Android expo export (earlier wave) → OK
```

## 18. Security Scans

`manage.py check` clean · `makemigrations --check` → No changes · bandit 0 High/0 Medium (exit 0) · secret scan clean.

## 19. Regression Evidence

All preserved: traveler ownership, server-derived identity, server-owned fields, `medical_history` guard, certificate ownership, declaration read-only + POST 501, QR fail-closed, offline SERVER WINS + encrypted cache + logout/switch/expiry purge, no SUDAPASS, no declaration writes. Combined backend 215 passed + mobile 103 passed.

## 20. Acceptance Matrix

| Gate | Area | Result | Evidence |
| --- | --- | --- | --- |
| A | Health Data Classification | **PASS** | matrix above (registry-derived) |
| B | API Minimization | **PASS** | contract tests + inventory |
| C | Client State | **PASS** | no-token state test; normalized error test |
| D | Persisted Cache | **PASS** | C1 suite + adversarial tests |
| E | UI Privacy | **PASS** | screens contract-limited; MEDIUM testID note documented |
| F | Notification Privacy | **PASS** | subject-only notifications |
| G | Logging/Telemetry | **PASS** | no console; forbidden-set fix + scrub tests |
| H | URL/Query/Header | **PASS** | none sensitive; auth header redacted |
| I | Clipboard/Share/Screenshot | **N/A** | no such surface |
| J | Error Privacy | **PASS** | envelope + normalized-state test |
| K | Certificate/QR Privacy | **PASS** | vaccination suite green |
| L | Retention | **PASS** | matrix + purge enforcement; statutory gap documented |
| M | Adversarial Testing | **PASS** | M2-D1 + new scrub/state tests |
| N | Static/Security Scans | **PASS** | bandit/check/migrations/secret |
| O | Regression | **PASS** | 215 backend + 103 mobile |
| P | Scope Integrity | **PASS** | below |

## 21. Documented Gaps / Policy Questions

- Statutory retention periods (Q2) — policy gap, not invented; immediate purge enforced.
- Institutional self-service `declaration` read exposing risk to owner — domain decision deferred (outside mobile).
- Unknown-path 404 HTML uniformity — cosmetic.
- Device-level performance/secure-store latency — pending device access.

## 22. Scope Integrity

`SUDAPASS implementation/mock/assumptions = NO` · `declaration writes = NO` · `mutation queue = NO` · `database schema changes = NONE` · `unrelated files modified = NONE` · `pre-existing worktree changes preserved = YES`.

## 23. Final Verdict

`M2-D2 ACCEPTED`