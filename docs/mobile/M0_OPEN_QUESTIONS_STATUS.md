# AFYATNA MOBILE — PHASE 1
# M0 OPEN QUESTIONS STATUS

**Date:** 2026-10-07  
**Source:** `docs/afyatna/mobile/phase-17-open-questions.md`  
**Rule (Phase 1 contract §4):** do not invent decisions. Unresolved P0 → `BLOCKED` unless an explicit approved decision exists in the repository or project documentation.

**Search performed for approved decisions:** `docs/` (incl. `docs/afyatna/mobile/*`, `docs/ADR`, `docs/Security`, `docs/OpenCode`), repository source, git log messages (`git log --oneline -50` reviewed at baseline). **No decision records found** — `phase-17` status log shows `_pending_` for Q1–Q15.

| Question | Priority | Status | Owner | Blocking? | Evidence |
| --- | --- | --- | --- | --- | --- |
| Q1 — Production data residency jurisdiction | P0 | **BLOCKED** | Controller / Ops | Blocks M0-adjacent production deploy decisions; does not block M1 skeleton | No decision in repo; `phase-17` status log `pending`; `deploy/k8s/secrets.yaml` header documents placeholder-only secrets |
| Q2 — Statutory retention periods (declarations, certificates, audit) | P0 | **BLOCKED** | Legal / Health Authority | Blocks D-P0-4 purge schedules (M2+) | No statute citation anywhere in repo docs; purge jobs not present (`grep purge` in backend → none for declarations) |
| Q3 — Erasure vs. audit-continuity anonymization standard | P0 | **BLOCKED** | Legal / Security | Blocks deletion-request flow (M2) | No decision record found |
| Q4 — Minimum fields disclosed by public verification | P0 | **BLOCKED** | Security / Product | Blocks D-P0-3 verification hardening (M2) | Current behavior returns full certificate payload (`vaccination/views.py:546-557`) — a *de facto* default, not an approved decision |
| Q5 — Product analytics/telemetry scope for MVP | P1 | **BLOCKED** | Product / Privacy | Does not block M1 (telemetry foundation ships scrubbing regardless) | No analytics SDK in `frontend/package.json`; no decision record |
| Q6 — SUDAPASS attributes cacheable on device | P0 | **BLOCKED** | Security / Identity | Blocks D-P0-1 client implementation (M2) | Recommendation exists in `phase-15 §11` ("recommendation: none") but **not approved**; no decision record |
| Q7 — iOS App Store production timing | P1 | **BLOCKED** (default from `phase-16 §1.2`: Android production + iOS TestFlight in Phase 1, pending approval) | Product | Does not block M1 | No decision record; contract §1.2 records default only |
| Q8 — SUDAPASS IdP readiness / test environment | P0 | **BLOCKED** | Identity / Ops | **Yes — D-P0-1 = BLOCKED → M2 = BLOCKED** | `sudapass_subject_id` removed (migration `0015`, 2026-09-13); no OIDC client code, no IdP metadata, no client credentials anywhere in repo |
| Q9 — HealthNotice → Requirements migration strategy | P1 | **BLOCKED** | Backend Architect | Blocks D-P1-2 design (M2) | Recommendation in `phase-17` only; no ADR |
| Q10 — Unified travel model approach (read-model vs schema merge) | P1 | **BLOCKED** | Backend Architect | Blocks D-P1-1 design (M2) | Fragmentation confirmed in M0-B §2.2; no decision record |
| Q11 — Arabic copy sign-off process | P1 | **BLOCKED** | Product / Comms | Blocks M3 UI copy acceptance, not M1 | No designated reviewer recorded in repo docs |
| Q12 — Sideload distribution approval | P1 | **BLOCKED** | Ops / Security | Blocks M4 rollout, not M1 | No distribution decision in repo |
| Q13 — Biometric/local-auth policy on low-end devices | P2 | **BLOCKED** (recommendation `phase-17`: biometric-when-available + PIN fallback) | Security / Product | Does not block M1 (M1 ships interface only) | No decision record |
| Q14 — SMS/OTP provider and cost model | P1 | **BLOCKED** | Ops / Finance | Does not block M1 | Notifications app supports multi-channel (`notifications/models.py`) but no OTP decision |
| Q15 — Mobile support channel & SLA | P1 | **BLOCKED** | Operations | Blocks M4, not M1 | No decision record |

## Gate Impact

```text
P0 unresolved:     Q1, Q2, Q3, Q4, Q6, Q8   → BLOCKED
P1 unresolved:     Q5, Q7, Q9, Q10, Q11, Q12, Q14, Q15 → BLOCKED (non-M0)
P2 unresolved:     Q13 → BLOCKED (non-M0)

D-P0-1 (SUDAPASS) = BLOCKED   (Q6, Q8)
M2                 = BLOCKED   (contract §27 critical final rule)
M0                 = PASS      (contract §6 requires P0 *identified*, not decided)
M1                 = may proceed (skeleton scope contains no SUDAPASS production behavior;
                    M1.7 ships interface/test seam only, labeled SUDAPASS_IMPLEMENTATION = BLOCKED)
```

## Required Owners / Actions (for unblocking)

| ID | Required owner | Required action |
| --- | --- | --- |
| Q1 | Controller / Ops | Decide hosting region; record decision (amendment to `phase-15`) |
| Q2 | Legal / Health Authority | Provide statutory retention periods; interim values approve or reject |
| Q3 | Legal / Security | Approve anonymization standard (hybrid recommendation in `phase-17`) |
| Q4 | Security / Product | Approve minimal verification payload |
| Q6 | Security / Identity | Approve "no IdP claims cached" recommendation |
| Q8 | Identity / Ops | Register OIDC client with SUDAPASS IdP; supply issuer URL, client id, scopes, test credentials path |

**No question was resolved as part of this execution.** All statuses are observational.
