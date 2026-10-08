# AFYATNA MOBILE — M1
# OPEN QUESTIONS

**Date:** 2026-10-07  
**Status:** no question was resolved during this execution (per contract §23 — silent resolution forbidden).  

## M0 gate effect

`M0_OPEN_QUESTIONS_STATUS.md` marks all P0 questions `BLOCKED` (no approved decisions exist in the repository). Consequences:
- `D-P0-1 (SUDAPASS)` = **BLOCKED** (Q6, Q8).
- `M2` = **BLOCKED** (phase-1 contract §27 final rule).
- M1 proceeded on skeleton scope only.

## New M1-era questions/observations

| ID | Topic | Priority | Owner | Status | Note |
|---|---|---|---|---|---|
| F-M1-1 | Local full-suite runtime cost (2457 tests) far exceeds CI budget estimates | P1 | Ops / CI | OPEN | Not a contract blocker; drives CI caching/parallelization decision |
| F-M1-2 | TRAVELER-type user granted `travelers:view` becomes unscoped (`_staff_traveler_access`) — design decision needed: enforce scoping by `user_type` regardless of permission, or forbid granting staff perms to traveler accounts | P0 (NG-02/NG-06) | Security / Backend | OPEN (xfail test) | `travelers/views.py:140-144` |
| F-M1-3 | `Q4` (verification payload) currently returns **full certificate payload** (`vaccination/views.py:546-557`) — this is de facto behavior, not an approved decision | P0 | Security / Product | OPEN | Reuses `M0_OPEN_QUESTIONS_STATUS.md` Q4 |
| F-M1-4 | Screening internal gap (SEC-M0-1) needs an M2 authorization fix plus decision on whether screening ever becomes traveler-visible (recommend: no) | P0 | Security / Backend | OPEN (xfail test) | NG-03 |

## Strong recommendation for M2 kickoff (blocking decisions)

1. **Q8** — SUDAPASS OIDC client registration + test IdP (controller/identity must act).
2. **Q1** — production data residency.
3. **Q6** — approve "no IdP claims cached on device" (phase-15 §11 recommendation).
4. **F-M1-2** — traveler-scoping decision before D-P1-1.
5. **F-M1-3** — minimal verification payload before D-P0-3.

## Enforcement points

- Every open question requiring a decision is mirrored in `M0_OPEN_QUESTIONS_STATUS.md` status log and `phase-17` (`Decision: _pending_`).
- Unresolved P0 → `D-P0-1`/`M2` stay `BLOCKED`; not circumvented.