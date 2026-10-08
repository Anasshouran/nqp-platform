# AFYATNA MOBILE — PHASE 0
# OPEN QUESTIONS

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

Open questions identified during Phase 0 that require stakeholder decisions. Numbered IDs are stable references used by other Phase 0 documents (e.g., phase-15 #1, phase-16 #7). Each question lists context, options, a recommendation from the audit team, decision owner, and the milestone by which it must be resolved.

**Priority key**: **P0** = blocks M0 (contract acceptance) or a P0 deliverable; **P1** = blocks a Phase 1 milestone; **P2** = resolve before Phase 2.

## Summary Table

| ID | Question | Priority | Owner | Needed By |
|----|----------|----------|-------|-----------|
| 1 | Production data residency jurisdiction | P0 | Controller / Ops | M0 |
| 2 | Statutory retention periods (declarations, certificates, audit) | P0 | Legal / Health Authority | M0 |
| 3 | Erasure vs. audit-continuity anonymization standard | P0 | Legal / Security | M0 |
| 4 | Minimum fields disclosed by public verification | P0 | Security / Product | M0 |
| 5 | Product analytics/telemetry scope for MVP | P1 | Product / Privacy | M2 |
| 6 | SUDAPASS attributes cacheable client-side post-OIDC | P0 | Security / Identity | M0 |
| 7 | iOS App Store production timing (Phase 1 vs 1.5) | P1 | Product | M1 |
| 8 | SUDAPASS IdP readiness and test environment availability | P0 | Identity / Ops | M0 |
| 9 | HealthNotice → Requirements migration strategy | P1 | Backend Architect | M1 |
| 10 | Unified travel model: read-model vs. schema merge | P1 | Backend Architect | M1 |
| 11 | Arabic copy and terminology sign-off process | P1 | Product / Comms | M3 |
| 12 | Sideload distribution channel (official website) approval | P1 | Ops / Security | M4 |
| 13 | Biometric/local-auth policy on low-end devices | P2 | Security / Product | M5 |
| 14 | SMS/OTP provider and cost model | P1 | Ops / Finance | M2 |
| 15 | Support channel and SLA for mobile users | P1 | Operations | M4 |

---

## P0 Questions (block M0 / P0 deliverables)

### Q1 — Production data residency jurisdiction
- **Context**: phase-15 §4.1, phase-14 §9; hosting must satisfy controller expectations for health data.
- **Options**:
  a) In-country hosting (national DC/cloud region) — strongest sovereignty posture, ops/DR complexity
  b) Regional cloud with contractual residency guarantees — balanced
  c) Current deployment location unchanged — lowest effort, must be explicitly accepted
- **Recommendation**: (b) with written contractual residency + in-region encrypted backups, unless policy mandates (a).
- **Owner**: Controller / Ops. **Needed by**: M0.
- **Decision**: _pending_

### Q2 — Statutory retention periods
- **Context**: phase-15 §5 retention table requires statutory health-record, audit-log, and document-retention periods under applicable Sudanese health/quarantine law.
- **Options**: (a) cite specific statute periods; (b) interim periods from phase-15 proposals with legal review flag; (c) indefinite until statute confirmed (rejected — conflicts with purpose limitation).
- **Recommendation**: (b) interim + formal legal confirmation before M5; encode as configurable purge schedules.
- **Owner**: Legal / Health Authority. **Needed by**: M0 (interim), permanent by M5.

### Q3 — Erasure vs. audit-continuity standard
- **Context**: phase-15 §7; certificate/declaration records may be referenced by audit trails. What does "deletion" do to linked audit entries?
- **Options**: (a) hard-delete record, audit retains hash/reference only; (b) anonymize record in place (pii stripped, facts retained); (c) allow deletion only where no statutory audit duty attaches.
- **Recommendation**: (a)+(b) hybrid — anonymize subject attributes, retain event facts and hashes.
- **Owner**: Legal / Security Architect. **Needed by**: M0.

### Q4 — Minimum fields disclosed by public verification
- **Context**: phase-15 §8, phase-07 public verification endpoints; balances verifier utility against data minimization.
- **Options**:
  a) Validity status only + holder full name
  b) Status + full name + certificate number + vaccine + validity dates
  c) Status + initials/short name + certificate number
- **Recommendation**: (a) as default for QR scan; (b) only behind authenticated verifier role if operational need confirmed.
- **Owner**: Security Architect / Product. **Needed by**: M0.

### Q6 — SUDAPASS attributes cacheable on device
- **Context**: phase-15 §3.1 (Mobile Copy = None for IdP data), phase-11 §5.3.
- **Options**: (a) none — only app-session identity persists (recommended in phase-15 §11); (b) minimal display name; (c) full claim set.
- **Recommendation**: (a). App session tokens only; IdP claims processed transiently.
- **Owner**: Security Architect / Identity. **Needed by**: M0.

### Q8 — SUDAPASS IdP readiness
- **Context**: phase-05 [MISSING] — integration does not exist; D-P0-1 depends on IdP availability, client registration process, test IdP, and redirect URI approvals.
- **Options**: (a) production-grade IdP available with test tenant; (b) delayed — mock/stub IdP for Phase 1 with switchover plan; (c) scope Phase 1 behind national-ID JWT only (violates no-go #1 if shipped).
- **Recommendation**: (a) target, with (b) as development unblocker only — production ship requires (a) or signed exception per phase-16 §6.
- **Owner**: Identity / Ops. **Needed by**: M0 (path confirmed); M2 (end-to-end working).

---

## P1 Questions (block Phase 1 milestones)

### Q5 — Product analytics/telemetry scope for MVP
- **Context**: phase-15 §3.1 domain 16 (opt-in), phase-17-dependent consent model; crash telemetry already assumed.
- **Options**: (a) crash/performance only in MVP; (b) + privacy-first product analytics (funnels) opt-in; (c) full analytics.
- **Recommendation**: (a) for MVP; revisit (b) with consent design post-launch.
- **Owner**: Product / Privacy. **Needed by**: M2.

### Q7 — iOS production timing
- **Context**: phase-16 §1.2; store review latency vs. team capacity; device matrix breadth on iOS in Sudan is secondary to Android.
- **Options**: (a) Android production + iOS TestFlight in Phase 1; (b) both stores in Phase 1; (c) Android-only Phase 1.
- **Recommendation**: (a) — matches phase-16 default; reassess at M5.
- **Owner**: Product. **Needed by**: M1.

### Q9 — Requirements migration strategy
- **Context**: phase-08; HealthNotice currently proxies requirements (phase-01 [PARTIAL]).
- **Options**: (a) new models alongside notices with dual-publish; (b) requirements as projection over notices initially, models later; (c) big-bang cutover.
- **Recommendation**: (a) dual-publish, mobile reads only new models, notices retire after adoption metrics.
- **Owner**: Backend Architect. **Needed by**: M1.

### Q10 — Unified travel model approach
- **Context**: phase-01 [PARTIAL] fragmented across carriers/port_health/borders_health; phase-16 D-P1-1.
- **Options**: (a) read-model/API aggregation only (no schema merge); (b) canonical `Travel` table with ETL from existing tables; (c) full schema merge of three apps.
- **Recommendation**: (b) canonical table, expand-contract populated, preserving existing module workflows; (a) only if timeline forces it — record as explicit descope.
- **Owner**: Backend Architect. **Needed by**: M1.

### Q11 — Arabic copy sign-off
- **Context**: phase-12 labeling tables; Arabic-first requirement; government voice/tone.
- **Options**: (a) designated linguistic reviewer + health-authority approval; (b) internal translation only.
- **Recommendation**: (a) — mandatory for compliance-facing copy (error messages, health notices, legal).
- **Owner**: Product / Communications. **Needed by**: M3 (with first E2E UI).

### Q12 — Sideload distribution approval
- **Context**: phase-14 §3.3 fallback if Play availability fails; sideloading has security perception risk for a government health app.
- **Options**: (a) signed APK from official site with install guidance + checksum; (b) no sideload; rely on Play.
- **Recommendation**: (a) with clear checksum/signing verification instructions; keep "only from nqp.gov.sd" messaging.
- **Owner**: Ops / Security. **Needed by**: M4 (before production rollout).

### Q14 — SMS/OTP provider and cost model
- **Context**: backend notifications multi-channel [FOUND] (phase-01); OTP/SMS costs and deliverability in Sudan.
- **Options**: (a) select provider + budget now; (b) MVP without SMS OTP (national-ID password only), add with SUDAPASS.
- **Recommendation**: (b) initially — SUDAPASS reduces need for own OTP; confirm budget when needed.
- **Owner**: Ops / Finance. **Needed by**: M2.

### Q15 — Mobile support channel & SLA
- **Context**: phase-14 §8.3 in-app incident communication; users need a help path (phase-12 Profile > Help).
- **Options**: (a) existing helpdesk extended to mobile; (b) new channel; (c) in-app feedback only for MVP.
- **Recommendation**: (c) + documented escalation path for SEV incidents.
- **Owner**: Operations. **Needed by**: M4.

---

## P2 Questions (resolve before Phase 2)

### Q13 — Biometric/local-auth policy on low-end devices
- **Context**: phase-11 §5.3; many target devices lack reliable biometric hardware.
- **Options**: (a) biometric when available, PIN fallback mandatory; (b) PIN-only MVP; (c) require biometric.
- **Recommendation**: (a). Device capability detection + PIN fallback; never hard-fail on missing sensor.
- **Owner**: Security / Product. **Needed by**: M5.

---

## Decision Process

1. Owner answers with chosen option (or written alternative) in the **Decision** field
2. P0 decisions are recorded and reflected in the affected Phase 0 documents (amendment log at document footers)
3. Unresolved P0 questions at M0 prevent contract acceptance (phase-16 §3 M0 gate)
4. Questions resolved after Phase 0 begin are appended to the Phase 1 change log (phase-16 §6)

## Status Log

| ID | Decision | Date | Decided By |
|----|----------|------|-----------|
| 1 | _pending_ | — | — |
| 2 | _pending_ | — | — |
| 3 | _pending_ | — | — |
| 4 | _pending_ | — | — |
| 5 | _pending_ | — | — |
| 6 | _pending_ | — | — |
| 7 | _pending_ | — | — |
| 8 | _pending_ | — | — |
| 9 | _pending_ | — | — |
| 10 | _pending_ | — | — |
| 11 | _pending_ | — | — |
| 12 | _pending_ | — | — |
| 13 | _pending_ | — | — |
| 14 | _pending_ | — | — |
| 15 | _pending_ | — | — |
