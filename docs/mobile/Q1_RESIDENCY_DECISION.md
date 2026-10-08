# AFYATNA MOBILE — PHASE 1.5
# Q1 — RESIDENCY / DATA OWNERSHIP DECISION

**Date:** 2026-10-08  
**Status:** OWNER DECISION REQUIRED — **DECISION PENDING**. This document records the current interpretation, evidence, and required decision; **no policy is silently encoded** (§10).

## 1. Current interpretation

Do NOT assume `residency = country`. In this project's context, **residencies is a data-flow + control property**:

- Each data domain has a single **system of record** (phase-15 ownership matrix) and the platform is **controller-custodian** of traveler data.
- "Residency" as an operational control = **where processing/storage of production data happens and who controls it** (deployment jurisdiction), combined with **who owns each record** (the traveler + statutory purposes).

## 2. Evidence

| Domain | System of record | Ownership link | Deletion/retention status |
| --- | --- | --- | --- |
| Account | `accounts.User` | identity (national-ID) | retention not settled (Q2) |
| Traveler record | `travelers.Traveler` | `user` FK / session binding (`travelers/views.py:_bind_to_session`) | deletion flow = phase-15 §7 request path |
| Trips (fragmented) | carriers / port_health / borders_health | per-domain; unified model = M2 (D-P1-1) | n/a (not built) |
| Certificates | `vaccination.VaccinationCertificate` | `traveler` FK; derived signature | revoke/replace exist; retention pending Q2 |
| Declarations | carriers `HealthDeclaration` | traveler/trip | not merged; purge pending Q2 |
| Cached mobile records | client device | encrypted local copies; cache ≠ authoritative | purge rules phase-15 §5/§9 |
| Sync | server authoritative (phase-09) | queue = projection only | wipe on logout/delete |

Deployment context: `deploy/k8s`, `deploy/*compose*`, `.env` (root, gitignored) define current infra; `deploy/k8s/secrets.yaml` is placeholder-only; production hosting jurisdiction is **not documented anywhere** in repo docs/ADR.

## 3. Unresolved ambiguity

- Geographic jurisdiction of production data + backups (no decision record; `phase-17 Q1`).
- Whether any processing must remain inside Sudan (in-country hosting) vs regional/approved cloud (contractual residency) — undecided.
- Data-subject rights vs statutory retention interplay (see Q2 retention) — undecided.

## 4. Required owner

Controller / Ops (health authority + platform owner). **OpenCode is not the owner.**

## 5. Proposed decision (for owner approval — NOT adopted)

- Production data + encrypted backups must reside in an **explicitly approved jurisdiction** with contractual residency guarantees; in-country hosting if policy requires.
- All phase-15 ownership rules remain binding; no new processor without DPA + security review.
- Re-evaluate before M2 kickoff; block only production deployment decisions, **not** M1.5 security remediation.

## 6. Impact

- If owner chooses in-country: deploy topology must change (infra/provider), affecting phase-14 deployment strategy and CI publish targets.
- Regional/approved cloud: minor, documentation + contractual evidence required.
- Until decided: **Q1 = BLOCKED**, and production release remains gated (no false claim).

## 7. Decision record

```
DECISION PENDING — owner approval required.
Owner: Controller / Ops
Needed by: M2 authorization review (this does not block P1.5 technical gates).
```