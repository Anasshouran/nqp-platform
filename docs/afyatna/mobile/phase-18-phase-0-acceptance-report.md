# AFYATNA MOBILE — PHASE 0
# PHASE 0 ACCEPTANCE REPORT

## Document Status
**Status**: DRAFT (for stakeholder acceptance)  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## 1. Purpose

This report presents the complete Phase 0 Discovery & Architecture Audit deliverable set for the AFYATNA | عافيتنا mobile application, summarizes findings and decisions, records readiness against acceptance criteria, and requests formal sign-off to authorize Phase 1 implementation per the Phase 1 Implementation Contract (phase-16).

## 2. Deliverable Inventory

| # | Document | File | Content Summary | Status |
|---|----------|------|-----------------|--------|
| 01 | Executive Summary | phase-01 | Audit findings, reusable capabilities, gaps, P0–P3 priorities, no-go conditions | COMPLETE |
| 02 | Repository Discovery | phase-02 | Repository structure, 26 backend apps, frontend surface, evidence method | COMPLETE |
| 03 | Domain Capability Matrix | phase-03 | Capabilities mapped to domain modules with reuse ratings | COMPLETE |
| 04 | Mobile User Journeys | phase-04 | Traveler journeys with priorities; P1 journeys drive MVP scope | COMPLETE |
| 05 | SUDAPASS Boundary | phase-05 | Missing integration [MISSING], OIDC/PKCE requirements, identity boundary rules | COMPLETE |
| 06 | Health Data Classification | phase-06 | PUBLIC/PERSONAL/SENSITIVE_HEALTH/SECURITY_SENSITIVE scheme and handling rules | COMPLETE |
| 07 | API Reuse Audit | phase-07 | Endpoint-by-endpoint reuse verdicts (reuse/adapter/internal) | COMPLETE |
| 08 | API Gap Analysis | phase-08 | Missing `/api/v1/mobile/` endpoints, P0–P2 gap register | COMPLETE |
| 09 | Offline Strategy | phase-09 | Offline-first design, cache tiers, sync queue, conflict policy | COMPLETE |
| 10 | Security Threat Model | phase-10 | Threats, mitigations, device/network/data controls | COMPLETE |
| 11 | Mobile Architecture Decision | phase-11 | ADR: React Native + Expo prebuild selected; alternatives evaluated | COMPLETE |
| 12 | Information Architecture | phase-12 | 5-tab IA, navigation, labeling (Arabic/English), content patterns | COMPLETE |
| 13 | Testing Strategy | phase-13 | Test pyramid, security/perf/usability gates, DoD, RACI, tools | COMPLETE |
| 14 | Deployment Strategy | phase-14 | Environments, EAS builds/OTA, store rollout, canary/rollback, DR | COMPLETE |
| 15 | Data Ownership | phase-15 | Ownership matrix, residency, retention, data-subject rights, processors | COMPLETE |
| 16 | Phase 1 Implementation Contract | phase-16 | Binding deliverables D-P0/D-P1/D-INF, acceptance criteria, no-go carry-over | COMPLETE |
| 17 | Open Questions | phase-17 | 15 numbered decisions (7 P0, 7 P1, 1 P2) with recommendations | COMPLETE |
| 18 | Phase 0 Acceptance Report | phase-18 (this) | Summary, readiness assessment, sign-off | COMPLETE |

## 3. Key Findings Summary

### 3.1 What Exists and Is Reusable [FOUND/REUSABLE]
1. **JWT authentication + RBAC + national-ID login + lockout** — accounts app (phase-01)
2. **Vaccination certificate lifecycle + HMAC QR verification + throttled public endpoints** — vaccination app
3. **Traveler self-service portal** (registration, documents, declarations, status tracking)
4. **Public API suite** (requirements-adjacent notices, verification, smart assistant)
5. **Multi-channel notification infrastructure** with device-token registration
6. **Mature delivery base**: Docker Compose/K8s deploy, GitHub Actions CI, pytest/Vitest suites

### 3.2 Critical Gaps Requiring Phase 1 Work [MISSING/PARTIAL]
1. **SUDAPASS integration absent** — no actual OIDC client exists (phase-05)
2. **No mobile API surface** — all endpoints web-shaped; `/api/v1/mobile/` required (phase-08)
3. **Travel model fragmented** across carriers/port_health/borders_health — cross-user access risk (phase-01 no-go #6)
4. **Requirements engine partial** — HealthNotice proxying requirements (phase-08)
5. **QR verification signature not mandatory** — replay risk (no-go #4)
6. **No mobile deployment/distribution path yet** — to be built per phase-14

### 3.3 Hard Boundaries (must never reach mobile)
EOC/emergency operational internals, carrier integration APIs, screening results/risk scores — phase-01 [INTERNAL], enforced by contract tests in phase-16 D-P0-2.

## 4. Decisions Recorded in Phase 0

| Decision | Record | Status |
|----------|--------|--------|
| Mobile stack: React Native + Expo prebuild + EAS (incl. OTA) | phase-11 ADR | PROPOSED — awaiting acceptance |
| Information architecture: 5 tabs (Home/Travel/Health/Certificates/Profile), Arabic-first RTL | phase-12 | PROPOSED |
| Offline-first with encrypted device stores, server-authoritative sync | phase-09, phase-11 §5.2 | PROPOSED |
| Data ownership: controller-custodian model, single system of record per domain | phase-15 | PROPOSED |
| Deployment: phased store rollout + OTA for JS fixes + Android sideload fallback | phase-14 | PROPOSED |
| Testing: phase-13 pyramid with security/perf/accessibility gates in CI | phase-13 | PROPOSED |

## 5. Readiness Assessment

### 5.1 Phase 1 Contract Readiness
- **Deliverable register defined** with acceptance criteria: phase-16 §2 ✅
- **No-go conditions enumerated with clearing evidence**: phase-16 §4 ✅
- **Sequencing/milestones M0–M6 with gates**: phase-16 §3 ✅
- **Definition of done + change control**: phase-16 §5–6 ✅
- **Open P0 decisions outstanding**: 7 (phase-17 Q1, Q2, Q3, Q4, Q6, Q8 + dependent items) ⚠️

### 5.2 Entry Criteria for M0 (Contract Acceptance)
- [ ] All 18 Phase 0 documents reviewed by stakeholder set
- [ ] P0 open questions (phase-17) decided or explicitly time-boxed with owners
- [ ] phase-11 architecture decision approved
- [ ] phase-16 contract signed (section 9 below)
- [ ] No unresolved objection to no-go conditions or internal-only boundaries

### 5.3 Residual Risks at Acceptance
| Risk | Level | Handling |
|------|-------|----------|
| SUDAPASS IdP unavailability (Q8) | High | M0 must confirm path; mock only as dev unblocker |
| Statutory retention unknowns (Q2) | Medium | Interim schedules + legal review flag |
| iOS store latency (Q7) | Medium | Phase 1 default = Android production first |
| Fragmented travel consolidation effort (Q10) | Medium | Canonical-table recommendation; descope option recorded |

## 6. Evidence Standard Compliance

All Phase 0 documents use the phase-01 evidence standard: `[FOUND]`, `[PARTIAL]`, `[MISSING]`, `[INTERNAL]`, `[REUSABLE]`, `[ADAPTER]`, with file-level citations for important claims. No conclusion in the set rests on assumption without a recorded evidence marker or an open-question reference.

## 7. Recommendation

**RECOMMENDATION: ACCEPT Phase 0**, contingent on closure of P0 open questions (phase-17) at or before M0, and authorize Phase 1 execution against the contract in phase-16 beginning with M1 (CI/CD skeleton + mobile API contract draft).

Rationale:
1. Audit is evidence-based with file-level citations and a consistent classification standard
2. Reusable foundation is substantial — delivery risk is concentrated in four well-scoped P0 blockers
3. No-go conditions are explicit, testable, and mapped to clearing deliverables
4. Architecture, IA, offline, security, testing, deployment, and data-ownership decisions are mutually consistent and cited across documents
5. Open questions are numbered, owned, prioritized, and tied to milestones — none are unowned

## 8. Sign-Off

| Role | Name | Decision (Accept / Accept with conditions / Reject) | Date | Signature |
|------|------|------------------------------------------------------|------|-----------|
| Product Architect | | | | |
| Senior Principal Mobile Architect | | | | |
| Backend Architect | | | | |
| Security Architect | | | | |
| Technical Auditor | | | | |
| Product Owner / Sponsor | | | | |

**Conditions if any**: _record here or as amendment to phase-16 §6_

## 9. Post-Acceptance Next Steps

1. Close P0 open questions (phase-17) and update affected documents via amendment log
2. Baseline phase-16 as the binding Phase 1 contract (change control activates)
3. M1 kickoff: CI/CD lanes (phase-14), `/api/v1/mobile/` OpenAPI draft (phase-08), Expo project bootstrap (phase-11)
4. Establish evidence collection for DoD gates (phase-13 §10, phase-14 §6.3)
5. Schedule Phase 1 milestone reviews at M2 (P0 clearance) and M5 (release gate)

---

*This report consolidates the Phase 0 deliverable set (phase-01 through phase-17). Acceptance decisions and conditions are recorded in section 8 and reflected back into affected documents as amendments.*