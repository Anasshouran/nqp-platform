# M2-D1 MOBILE SECURITY BOUNDARY REPORT

**Date:** 2026-10-08  
**Mode:** SECURITY HARDENING (mobile + traveler serializer boundary; no SUDAPASS)

---

## 1. Status

`M2-D1 ACCEPTED`

## 2. Executive Summary

Hardened the traveler-mobile security boundary. Fixed the M2-C2 `medical_history` finding (**traveler can inject server-owned risk fields into their own record**) by rejecting server-owned keys inside `medical_history` (Option A) while preserving legitimate traveler-owned medical history (Option C). Re-verified ownership/isolation, data minimization, health privacy in responses/cache/state/telemetry, session security, error leak-free behavior, and QR fail-closed. No new endpoints, no declaration writes, no SUDAPASS, no migrations.

## 3. Endpoint Security Inventory

| Endpoint | Method | Auth | Ownership | Scope | Data class | Sensitive fields | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /api/v1/mobile/profile/ | GET | JWT | server-derived principal | own | PERSONAL/PUBLIC | national_id (PERSONAL) | **PASS** |
| /api/v1/mobile/requirements/ | GET | JWT | public content | — | PUBLIC | none | **PASS** |
| /api/v1/mobile/certificates/ | GET | JWT | cert.traveler.user==principal | own | SENSITIVE_HEALTH | vaccine/status/dates | **PASS** |
| /api/v1/mobile/certificates/{id}/ | GET | JWT | owner-only (404 else) | own | SENSITIVE_HEALTH | as above | **PASS** |
| /api/v1/mobile/declarations/ | GET | JWT | traveler==principal | own | SENSITIVE_HEALTH | symptoms/status (no risk) | **PASS** |
| /api/v1/mobile/declarations/ | POST | JWT | — | — | — | — | **501 (deferred)** |
| /api/v1/mobile/notifications/ | GET | JWT | log.user==principal | own | SENSITIVE_HEALTH(subject) | subject (no body/recipient) | **PASS** |
| /api/v1/mobile/notifications/{id}/read/ | PATCH | JWT | owner-only | own | — | — | **PASS** |
| /api/v1/mobile/sync/status/ | GET | JWT | server meta | — | PUBLIC | — | **PASS** |
| /api/v1/mobile/auth/* | POST | — | — | — | — | — | **DEFERRED (Q8/SUDAPASS)** |
| /api/v1/mobile/trips/* | GET | JWT | — | — | — | — | **DEFERRED (D-P1-1)** |
| Screening via mobile | — | — | — | — | — | — | **N/A (no mobile screening surface)** |

Missing-auth/ownership/scope/excessive-field/internal-only tunnels: **none found**.

## 4. Ownership Analysis

`request.user → authenticated traveler principal → owned resource` enforced at every traveler-owned mobile endpoint (server-derived `id`; client never supplies `traveler_id/user_id/owner_id`). Tests: A→A allowed; A→B 404; anonymous 401/404; internal/staff surfaces 403/401; extra `user_id/owner_id` body fields ignored (new test). Foreign-object behavior is hide-style (404) consistent with contract.

## 5. Server-Owned Field Analysis

Audited traveler-facing serializer fields (PATCH/PUT/POST paths + nested JSON). Result: `Medical DH` risk/evaluation/decision/audit keys rejected (new); `passport_number`/ownership not writable via body binding; `registration_status`/`rejection_reason`/timestamps remain read-only. No client elevation of server-owned state found.

## 6. `medical_history` Finding & Resolution

- **Finding (M2-C2):** `TravelerSerializer.medical_history` = writable free-form JSON; traveler could place `health_declaration.risk_score/risk_level/…` on their own record.
- **Resolution:** Option **A + C** — `validate_medical_history()` rejects any protected/server-owned key anywhere in the JSON (nested, lists) with a clear 400, while legitimate traveler-owned medical history (e.g., `diabetes/hypertension`) remains accepted. Implemented in `apps/travelers/serializers.py`; applied to register/public + self-service PATCH (shared serializer). 7 new tests green.
- **Why A+C:** trivially security-preserving; keeps the approved design (JSON medical history) intact; no new model/migration; no silent stripping that could mask bad input.

## 7. Data-Minimization Review

Mobile responses are contract-shaped (serializer-driven). Verified absent from mobile outputs: internal IDs beyond contract, staff identities, internal notes, risk scoring, RBAC, audit records, guard tokens, signatures/QR internals, other travelers. New serializer guard also bounds the travelers self-service surface.

## 8. Health-Data Privacy Review

- Responses minimized (certificates minimal; declarations strip risk; notifications expose subject only, never body/recipient).
- Cache: per-user scoped, secure storage, TTL, purge on logout/session-expiry, version-invalidation (M2-C1).
- Redux state: no tokens; health content only the user's own authorized rows.
- Logs/telemetry: scrub enforces SENSITIVE_HEALTH → SCRUBBED; no health/log in console paths in `src` (lint no-console). No health data in cache keys/filenames (scope is server principal id; dataset names are generic).

## 9. Offline-Cache Review

M2-C1 baseline verification + adversarial tests added: A cache → logout → offline restart → B cannot recover A data; corrupted cache metadata fails safely; contract/schema mismatch invalidates; no token in cache raw content. All PASS.

## 10. Session-Security Review

Expired/invalid token → 401 → `session_expired` + protected purge; logout (server best-effort + local purge); account switch isolated; offline restart after logout inaccessible; reconnect after expiry purges. (Tests in M2-B/C1/M2-D1.)

## 11. Error-Leakage Review

Envelope `{code,ar,en}` on all mobile responses (401/403/404/405/429/501/500 pathways); backend DRF `detail` never reaches client envelope; mobile error layer normalizes; no traceback/SQL/path in UI or normalization output (tested). Note: unmatched `/api/v1/mobile/<unknown>` returns Django 404 (HTML, non-informative) — no leak; JSON-enveloped unknown-path handling is a UX/contract nicety (recorded, non-blocking).

## 12. QR-Security Regression

Re-verified: unsigned/invalid/wrong-key/malformed → 400 `signature_valid:false`; signed-but-expired/revoked → not verified; minimal verification payload unaffected. (vaccination suite green.)

## 13. Telemetry / Logging Review

No `console.log` in `mobile/src` (lint enforces `no-console` error); telemetry events scrubbed pre-transport; backend mobile API logs request-level DRF warnings only (no payload logging). No token/passport/health emission paths found in mobile or `apps/mobile_api`.

## 14. Security Fixes Implemented

`TravelerSerializer.validate_medical_history` (reject server-owned keys; A+C).

## 15. Files Changed

- `backend/apps/travelers/serializers.py` (guard)
- `backend/apps/travelers/tests/test_medical_history_security.py` (new, 7 tests)
- `mobile/tests/m2d1-security.test.ts` (new, 5 tests)

## 16. Exact Test Commands & 17. Test Results

```text
backend: pytest apps/mobile_api apps/travelers apps/screening -q → 142 passed
mobile:  npm test → 15 suites / 98 passed, 0 failed
mobile:  npm run typecheck → clean
mobile:  npm run lint → clean
```

## 18. Static Scan Results

```text
manage.py check → no issues
manage.py makemigrations --check --dry-run → No changes detected
bandit (-ll -ii) apps/travelers/serializers.py apps/mobile_api → 0 High / 0 Medium (exit 0)
secret scan (mobile_api/travelers/mobile/contracts src) → clean
```

## 19. Database / Migration Impact

`DATABASE CHANGES = NONE`

## 20. SUDAPASS Status

`SUDAPASS IMPLEMENTED/MOCKED/ASSUMED: NO` (deferred; no auth-architecture change).

## 21. Declaration-Write Status

`DECLARATION_WRITE_POLICY = DEFERRED` (unchanged; no POST/edit/submit/queue).

## 22. Acceptance Gates A–O

| Gate | Result |
| --- | --- |
| A Mobile Endpoint Inventory | **PASS** |
| B Authentication Boundary | **PASS** |
| C Traveler Ownership | **PASS** |
| D Server-Owned Fields | **PASS** |
| E Medical History Integrity | **PASS** (Option A+C implemented, tested) |
| F Data Minimization | **PASS** |
| G Health Data Privacy | **PASS** |
| H Offline Cache Security | **PASS** |
| I Session Security | **PASS** |
| J Error Leakage | **PASS** |
| K QR Security Regression | **PASS** |
| L Telemetry / Logging | **PASS** |
| M Regression | **PASS** |
| N Build / Type / Lint | **PASS** |
| O Scope Integrity | **PASS** |

## 23. Known Limitations

- Unknown `/api/v1/mobile/*` paths return Django 404 (HTML) — no leak, minor JSON-consistency nicety.
- The travelers self-service `declaration` GET still surfaces `risk_score/risk_level` to the record owner on the institutional self-service surface (outside the mobile projection) — flagged for domain owner; mobile output unaffected.

## 24. Remaining Findings

- (Non-blocking) Institutional self-service `declaration` read exposes risk values to owner; recommend server-owned read-only display decision in the travelers domain (out of mobile scope).
- (Non-blocking) Unmatched-path JSON envelope uniformity.

## 25. Final Verdict

`M2-D1 ACCEPTED`