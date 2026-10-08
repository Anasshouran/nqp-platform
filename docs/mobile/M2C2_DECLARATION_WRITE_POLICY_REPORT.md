# M2-C2 DECLARATION WRITE POLICY & READINESS GATE

**Date:** 2026-10-08  
**Mode:** POLICY DISCOVERY / READINESS GATE (mobile + policy only; no SUDAPASS)  

---

## 1. Status

`M2-C2 ACCEPTED — DECLARATION WRITE DEFERRED`

## 2. Executive Summary

Repository/policy discovery found **no authoritative traveler-declaration write policy** (no approved create/edit/submit/amend/cancel/resubmit lifecycle for a traveler-owned declaration). The mobile contract explicitly defers `POST /api/v1/mobile/declarations/` (M2-A). Therefore: no writes are implemented or enabled; the mobile app remains **read-only** for declarations; offline foundation stays read-cache (no mutation queue); an inline self-declaration via `medical_history` JSON exists in the travelers domain but has **no lifecycle, audit, validation, or institutional approval** — it is recorded as an open policy question, not an authorization (§2/§15).

## 3. Policy Evidence

| Artifact | Existence | Authoritative? |
| --- | --- | --- |
| Mobile contract `POST /api/v1/mobile/declarations/` | `501` (M2-A) | YES — deferral is the contract |
| Traveler self-service `GET …/declaration/` | read-only projection of `medical_history.health_declaration` (`apps/travelers/views.py:360-378`) | read surface only |
| Carrier `HealthDeclarationViewSet` | carrier/airport institutional lifecycle (`apps/carriers/views.py:1381+`; transitions via actions) | NOT traveler-business policy |
| Any traveler DRAFT→SUBMITTED→… lifecycle | **absent** | NO |
| Traveler-owned declaration create/submit/amend/cancel endpoints | **absent** | NO |
| Approved business rules for traveler declaration | **absent** across docs/ADR/contracts | NO |
| `medical_history` JSONField writable in `TravelerSerializer` | yes (public field list, `apps/travelers/serializers.py:23`) | free-form, unvalidated — **not an approved submission policy** |

## 4. Declaration Lifecycle Matrix

| Operation | Existing backend capability | Approved traveler policy | Mobile authorization | Decision |
| --- | --- | --- | --- | --- |
| Create | none (traveler) | **none** | none | **DEFERRED** |
| Edit Draft | none (no traveler draft model) | **none** | none | **DEFERRED** |
| Submit | none (only carrier/institutional submit) | **none** | none | **DEFERRED** |
| Amend | none | **none** | none | **DEFERRED** |
| Cancel | none (traveler) | **none** | none | **DEFERRED** |
| Resubmit | none | **none** | none | **DEFERRED** |

## 5. Field Authorization Matrix

| Field | Traveler create | Traveler edit | Server-owned | Immutable after submit |
| --- | :-: | :-: | :-: | :-: |
| Identity / passport reference | N/A (write deferred) | N/A | server | N/A |
| Travel details | N/A | N/A | server | N/A |
| Health answers | N/A (no approved schema) | N/A | server | N/A |
| Declaration status | N/A | N/A | server | N/A |
| **Risk score** | **N/A — NOT traveler-writable** | **N/A — NOT traveler-writable** | server | N/A |
| **Risk level** | **N/A — NOT traveler-writable** | **N/A — NOT traveler-writable** | server | N/A |
| Screening result | N/A — internal | N/A | server | N/A |
| Audit fields | N/A — never client | N/A | server | N/A |
| Created/updated timestamps | N/A — never client | N/A | server | N/A |

(since writes are deferred, all cells are N/A-with-guards; risk fields explicitly excluded from any future traveler-write surface)

## 6. Ownership Model

If/when writes are authorized, ownership **must** be `request.user → authenticated traveler principal → server-derived traveler`; no client-supplied `traveler_id/user_id/owner_id`. Today: no write surface exists; mobile certificates/self-service ownership remains server-derived and tested (traveler isolation suites). Foreign-object access fails safely (404).

## 7. State-Transition Matrix

No approved lifecycle exists → **DEFERRED**. Only institutional carrier lifecycle exists (DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED/REJECTED, transitions via dedicated actions with audit logs — `apps/carriers`), which is **not a traveler-facing policy**. No traveler transitions are exposed or enabled.

## 8. Idempotency Policy

`WRITE_IDEMPOTENCY = DEFERRED` (no write endpoints ⇒ no fabrication of an idempotency contract). M2-C1 read-sync retry remains bounded/cancellable and is read-only.

## 9. Offline-Write Policy

No offline declaration create/submit; **no** mutation queue; **no** optimistic submission; **no** fake "submitted" state. Offline distinction preserved: `OFFLINE READ CACHE` (CacheStamp) vs `PENDING SERVER WRITE` (not supported). Verified: engine exposes no declaration-write exports; repository exposes `list()` only.

## 10. Audit Requirements

No traveler declaration writes ⇒ no manufactured audit. Should writes be authorized later: server-generated audit only (create/edit/submit/amend/cancel/rejected-attempt/replay) — never client-produced.

## 11. Security Analysis

- Traveler isolation / screening authorization / QR fail-closed / classification: unchanged and green (M2-A/M2-B/C1 suites).
- No privilege escalation path introduced; no forged status/risk through any mobile surface (mobile declarations projection strips `risk_score/risk_level`).
- **Open institutional consideration (outside mobile):** `TravelerSerializer` accepts a writable `medical_history` JSON during public registration / self-service profile PATCH; a traveler can place `health_declaration.risk_score/risk_level` on their **own** record. This is a domain-level data-integrity/classification question (not a mobile write path). Recorded under §22 Open Policy Questions — requires a domain owner decision (validation/schema or server-owned risk fields), **not** resolved by enabling mobile writes.

## 12. Mobile UX Decision

Health stays **read-only**: show declaration state/symptoms; **no** submit/amend/cancel controls; any future form must await an approved policy. Guard tests assert no fake workflow controls exist.

## 13. Implementation Performed

Policy-only guards (no behavior change):
- Backend: `apps/mobile_api/tests/test_m2c2_write_policy.py` — asserts no declaration write routes registered, mobile `POST` stays `501`, read-only GET, no risk leakage, foreign-object non-2xx.
- Mobile: `tests/m2c2-declaration-policy.test.tsx` — asserts repository `list()`-only, engine has no mutation-queue exports, Health screen has no fake submit/amend/cancel controls.

## 14. Files Changed

- `backend/apps/mobile_api/tests/test_m2c2_write_policy.py` (new)
- `mobile/tests/m2c2-declaration-policy.test.tsx` (new)

(No production code changed — policy is DEFFERED.)

## 15. Database / Migration Impact

`DATABASE CHANGES = NONE`

## 16. Test Matrix

| Area | Result |
| --- | --- |
| No declaration write endpoints registered (backend) | PASS |
| Mobile declarations POST = 501 (no fabricated submit) | PASS |
| Read-only GET projection (no risk fields) | PASS |
| Foreign-object non-2xx | PASS |
| Repository no write seam | PASS |
| Engine no mutation-queue exports | PASS |
| Health screen no fake submit/amend/cancel | PASS |

## 17. Exact Test Commands & 18. Test Results

```text
backend: pytest apps/mobile_api -q → 83 passed
mobile:  npm test → 14 suites / 93 passed, 0 failed
mobile:  npm run typecheck → clean
mobile:  npm run lint → clean
```

## 19. SUDAPASS Status

`SUDAPASS IMPLEMENTED/MOCKED/ASSUMED: NO` (deferred; untouched).

## 20. Acceptance Gates A–M

| Gate | Result |
| --- | --- |
| A Policy Discovery | **PASS** (no authoritative traveler write policy found) |
| B Lifecycle Definition | **DEFERRED** |
| C Ownership | **PASS** (server-derived; no client ownership path; guard tests) |
| D Field Authorization | **DEFERRED** (risk fields explicitly non-writable) |
| E State Transition Security | **DEFERRED** (no traveler lifecycle enabled) |
| F Idempotency | **DEFERRED** |
| G Audit | **DEFERRED** (no client audit) |
| H Offline Write Safety | **PASS** (no offline mutation queue; read-cache only) |
| I Mobile UX Truthfulness | **PASS** (read-only Health, no fake submit) |
| J Security / Privacy | **PASS** |
| K Regression | **PASS** |
| L Build / Type / Lint | **PASS** |
| M Scope Integrity | **PASS** (no backend/db changes; no SUDAPASS/declaration-write) |

## 21. Known Limitations

- No device/build beyond Android export in earlier wave; policy run is additive-guard only.
- `medical_history` free-form write by travelers remains an **open domain question** (not mobile).

## 22. Open Policy Questions

1. Who owns a traveler declaration's risk assessment? (engine-computed vs stored JSON; must be **server-owned** and non-writable if kept).
2. Required validation/schema + lifecycle (DRAFT→SUBMITTED→…) and institutional approval model for any future traveler submission.
3. Linkage to travel/POE itinerary and screening; duplicate-prevention; amendment rules.
4. Statutory retention/audit for traveler-submitted declarations (Q2 linkage).
5. Owner decision on whether `medical_history` JSON should be restricted to server-owned fields (domain change — out of mobile scope).

## 23. Final Verdict

`M2-C2 ACCEPTED — DECLARATION WRITE DEFERRED`