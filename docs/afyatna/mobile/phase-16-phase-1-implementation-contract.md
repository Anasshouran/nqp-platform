# AFYATNA MOBILE — PHASE 0
# PHASE 1 IMPLEMENTATION CONTRACT

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This document converts Phase 0 findings into a binding contract for Phase 1 implementation. It defines scope, deliverables, API contracts, acceptance criteria, no-go conditions, and definition of done. Acceptance of this contract (phase-18) is the gate that authorizes Phase 1 build work. Every deliverable cites the Phase 0 document that mandates it.

## 1. Contract Scope

### 1.1 In Scope (Phase 1)
- P0 blockers from phase-01: SUDAPASS integration, mobile API contract, security hardening, data-classification enforcement
- P1 MVP capabilities: unified travel model, requirements engine, mobile-first authentication, offline strategy implementation
- Mobile app foundation: React Native/Expo skeleton implementing phase-11 architecture, phase-12 IA, phase-09 offline, phase-10 security
- Delivery infrastructure: CI/CD, staging/production environments, monitoring baseline (phase-14)
- Test automation covering phase-13 gates for all shipped features

### 1.2 Out of Scope (Phase 1 — deferred)
- P2/P3 items from phase-01 (push-notification polish, advanced analytics, location services, advanced conflict resolution UI)
- EOC/emergency operational internals and carrier/screening internal surfaces (permanently internal, not "deferred")
- iOS App Store production release (Phase 1 targets Android production + iOS internal/TestFlight; store submission may follow in Phase 1.5 — open question phase-17 #7)
- Web/PWA secondary target

## 2. Deliverable Register

Each deliverable has a stable ID, source mandate, and acceptance criteria. Status values at Phase 0: **PLANNED**.

### 2.1 D-P0: Blockers (must complete before MVP feature build)

#### D-P0-1: SUDAPASS Identity Integration
- **Source**: phase-05, phase-01 P0
- **Deliverables**:
  - Backend OAuth2/OIDC client (authorization code + PKCE) against SUDAPASS IdP
  - Account linking: SUDAPASS subject ↔ `accounts.User` (no `sudapass_id` field misuse; migration per expand-contract)
  - Mobile auth module behind a provider-agnostic interface (JWT/national-ID path remains as fallback per phase-11)
  - Error/edge flows: denial, expired consent, account conflict, IdP outage (graceful fallback + clear Arabic messaging)
- **Acceptance criteria**:
  - [ ] Login via SUDAPASS succeeds end-to-end in staging with test IdP/credentials
  - [ ] No SUDAPASS secrets or long-lived tokens stored client-side (phase-15 §3.1 rule)
  - [ ] Tokens stored in secure storage; refresh rotation works (phase-10)
  - [ ] Integration contract tests in CI (phase-13)
  - [ ] IdP outage does not lock users out of offline essentials (phase-09)
- **No-go if unmet**: phase-01 no-go condition #1

#### D-P0-2: Mobile API Contract (`/api/v1/mobile/`)
- **Source**: phase-08 gap analysis, phase-07 reuse audit
- **Deliverables**:
  - Versioned OpenAPI spec for `/api/v1/mobile/` covering MVP journeys (phase-04)
  - Endpoints addressing phase-08 P0 gaps: unified trip/declaration read-models, requirements resolution, profile, certificates, sync endpoints
  - Envelope-compatible responses (`{status, data, message}`), bilingual error catalog (Arabic-first)
  - Shared TypeScript/Zod contract package consumed by web + mobile + contract tests
  - Pagination, filtering, and payload-size budgets for 2G (compressed, minimal fields)
- **Acceptance criteria**:
  - [ ] OpenAPI published at `/api/schema/` including mobile namespace; Swagger valid
  - [ ] Contract tests fail CI on breaking change without version bump
  - [ ] Every phase-08 P0 gap either delivered or explicitly descoped with sign-off
  - [ ] Internal-only surfaces return 404/403 for mobile tokens (phase-15 enforcement)
  - [ ] p95 latency ≤ 1.5s on critical endpoints in staging load test (phase-13 §2.5)
- **No-go if unmet**: phase-01 no-go condition #2/#6

#### D-P0-3: Security Hardening
- **Source**: phase-10 threat model, phase-06 classification
- **Deliverables**:
  - Certificate pinning with backup pin + config-endpoint rotation (phase-14 §5.2)
  - Mandatory QR signature verification + replay resistance on verification path
  - Token scope restriction for mobile clients; device binding signals
  - Log/trace scrubbing middleware enforcing phase-06 classification
  - Encrypted on-device storage for all SENSITIVE_HEALTH data; biometric gate
  - Root/jailbreak risk signals with graceful degradation (phase-10)
- **Acceptance criteria**:
  - [ ] SAST + DAST clean of High/Critical findings (phase-13 §2.6)
  - [ ] Unsigned/stale-signature QR fails closed (test evidence)
  - [ ] Log audit shows zero SENSITIVE_HEALTH payloads in staging logs
  - [ ] Threat-model mitigations from phase-10 each map to a passing test or verified control
  - [ ] No secrets in app bundle (build scan evidence, phase-14 §10)
- **No-go if unmet**: phase-01 no-go conditions #3/#4

#### D-P0-4: Data Classification Enforcement
- **Source**: phase-06, phase-15
- **Deliverables**:
  - Classification tags applied to API response fields (contract annotations)
  - Field-level minimization: no INTERNAL data in any mobile-bound response
  - Retention/purge scaffolding: scheduled Celery tasks + on-device purge handlers (schedule tables from phase-15 §5; statutory values pending phase-17)
  - Data-subject basics: export, rectification, deletion-request flow (phase-15 §7)
- **Acceptance criteria**:
  - [ ] Automated contract tests assert classification boundaries
  - [ ] Deletion request propagates to cache invalidation + client purge (integration test)
  - [ ] Export produces archive for the requesting user only (identity re-verified)
- **No-go if unmet**: phase-01 no-go condition #5

### 2.2 D-P1: MVP Capability Deliverables

#### D-P1-1: Unified Travel Model
- **Source**: phase-01 P1, phase-03 capability matrix
- **Deliverables**:
  - Backend consolidation or read-model unifying air/sea/land travel for the traveler-facing surface (expand-contract migration; no destructive merge of carrier modules)
  - Cross-user access isolation tests (phase-01 no-go #6)
  - Mobile travel UI per phase-12 (create trip wizard, list, detail, history)
- **Acceptance criteria**:
  - [ ] Single API returns a traveler's trips across all transport modes
  - [ ] Object-level authorization proven by tests (user A cannot read user B's trips)
  - [ ] Migration backward compatible with previous app version (phase-14 §4.2)
  - [ ] Existing carrier/port/border workflows unaffected (regression suite green)

#### D-P1-2: Requirements Engine
- **Source**: phase-01 P1, phase-08
- **Deliverables**:
  - Dedicated `TravelRequirement`/`VaccinationRequirement` models with effective dates + destination/mode applicability (replacing HealthNotice-as-proxy)
  - Resolution endpoint: given profile + trip context → applicable requirements
  - Mobile requirements-checker UX per phase-12 (offline-cacheable response, phase-09)
  - Migration path from notice-based presentation; deprecation note for proxy usage
- **Acceptance criteria**:
  - [ ] Requirements resolve correctly for test matrix of destination × mode × date
  - [ ] Effective-dated changes version correctly (historical trip shows then-applicable rules)
  - [ ] Response cacheable offline with `fetched-at` staleness display
  - [ ] No reliance on HealthNotice as requirement source in mobile path

#### D-P1-3: Mobile Authentication & Session
- **Source**: phase-01 P1, phase-11 §5.3
- **Deliverables**:
  - Login (national ID + password JWT path, SUDAPASS-linked), refresh rotation, lockout handling, logout-all
  - Biometric app-lock, secure storage, session timeout UX
  - Auth slice in Redux Toolkit shared-pattern with web
- **Acceptance criteria**:
  - [ ] 30-min access / 7-day refresh enforced; rotation + reuse detection behave per backend rules
  - [ ] Lockout (5 attempts / 15 min) surfaced with Arabic messaging
  - [ ] Tokens never in AsyncStorage/plaintext; verified by device inspection test
  - [ ] Offline session restores cached data without network (phase-09)

#### D-P1-4: Offline Strategy Implementation
- **Source**: phase-09, phase-15 §5
- **Deliverables**:
  - SQLite structured store + encrypted KV for sensitive items
  - Connectivity-aware sync queue with idempotency keys (declaration submission)
  - Cached reference sets: certificates, requirements, notices, emergency info
  - Conflict policy: server-authoritative + drafts (phase-11 §5.2); user-visible sync status (phase-12)
  - Offline smoke tests on degraded network conditions
- **Acceptance criteria**:
  - [ ] Core journeys complete with network cut mid-flow (declaration draft → queue → auto-sync on restore)
  - [ ] No duplicate submissions under retry (idempotency proven by test)
  - [ ] Emergency info + certificates available fully offline
  - [ ] Cache purge on deletion/logout works (phase-15 §10)
  - [ ] Sync failure rate metric instrumented (alert per phase-14 §7.3)

#### D-P1-5: MVP Feature Set (Mobile UI)
- **Source**: phase-04 journeys, phase-12 IA
- **Deliverables**:
  - Screens for: Home dashboard, Travel (trips/requirements), Health (declarations), Certificates (view/share/verify), Profile/settings
  - Arabic-first RTL with full English toggle; accessibility per phase-13 §2.7
  - QR scan + display; certificate share sheet
- **Acceptance criteria**:
  - [ ] All phase-04 Priority-1 journeys pass E2E (phase-13 §2.4)
  - [ ] RTL layout verified on target device matrix; zero hard-coded LTR assumptions
  - [ ] Accessibility: screen-reader labels, 48dp targets, WCAG AA contrast (phase-13)
  - [ ] Crash-free sessions > 99.5% during staging soak (phase-14 §12)

### 2.3 D-INF: Delivery Infrastructure

#### D-INF-1: CI/CD & Environments
- **Source**: phase-13, phase-14
- **Deliverables**: pipelines per phase-14 §3/§4; EAS projects/channels; staging + prod namespaces; SBOM/image signing; OIDC deploy auth; secret management
- **Acceptance criteria**:
  - [ ] Merge → staging deploy fully automated with test gates green
  - [ ] Production deploy gated on evidence checklist (phase-14 §6.3) + required reviewers
  - [ ] Rollback rehearsed once with documented evidence (backend + OTA revert)
  - [ ] Sideload fallback APK published and verified signed (phase-14 §3.3)

#### D-INF-2: Observability Baseline
- **Source**: phase-14 §8
- **Deliverables**: dashboards (RED, app KPIs), alerts per phase-14 §8.2, synthetic checks, Sentry mobile+backend with sourcemap upload
- **Acceptance criteria**:
  - [ ] Health, auth, and declaration-submission synthetics alert on induced failure
  - [ ] Crash reporting shows correct release/symbolication
  - [ ] Log scrubbing verified in shipped pipelines (D-P0-3)

#### D-INF-3: Test Automation Foundation
- **Source**: phase-13
- **Deliverables**: pyramid lanes (unit/component/integration/E2E), device matrix plan, performance baselines, security scan gates
- **Acceptance criteria**:
  - [ ] CI runs unit+component+integration on every commit; E2E on staging nightly
  - [ ] Coverage ≥ 80% on new business logic
  - [ ] Performance baselines recorded for lowest-tier target device

## 3. Sequencing and Milestones

| Milestone | Contents | Gate |
|-----------|----------|------|
| **M0** | Contract acceptance (phase-18), open questions resolved (phase-17 P0 items) | Stakeholder sign-off |
| **M1** | D-INF-1/2/3 skeleton + D-P0-2 contract spec (OpenAPI draft) | Contract tests run in CI |
| **M2** | D-P0 complete (SUDAPASS, security, classification) | No-go conditions cleared |
| **M3** | D-P1-1/1/2 backend models + APIs; mobile app shell (auth, nav, IA) | Staging E2E happy paths green |
| **M4** | D-P1-3/1/4 offline + auth UX; D-P1-5 P1 journeys | Phase-13 gates green on device matrix |
| **M5** | Hardening: performance, accessibility, DR drill, rollback rehearsal | Phase-14 release checklist satisfied |
| **M6** | Android production staged rollout (internal → closed → phased) + iOS TestFlight | Phase-18-style acceptance for Phase 1 |

Dependency rule: **M2 gates M3** — MVP feature build does not proceed past skeleton while any P0 blocker is open, unless a written, signed exception exists.

## 4. No-Go Conditions (carry-over from phase-01)

Phase 1 may not ship to production while any condition remains true:

| # | Condition | Cleared By |
|---|-----------|-----------|
| 1 | No trustworthy authentication boundary without SUDAPASS integration | D-P0-1 accepted |
| 2 | Missing authorization for mobile-specific data access | D-P0-2 + object-level auth tests |
| 3 | Unsafe health-data exposure in public APIs | D-P0-3 + D-P0-4 classification tests |
| 4 | Insecure QR verification without mandatory signature validation | D-P0-3 QR fail-closed evidence |
| 5 | Undefined data ownership and privacy boundaries | phase-15 accepted + D-P0-4 |
| 6 | Cross-user access risk in fragmented travel models | D-P1-1 isolation tests |

## 5. Definition of Done (per deliverable)

A deliverable is Done when (inherits phase-13 §10.1):
- [ ] Code reviewed and merged to protected branch
- [ ] Unit/component/integration tests pass; coverage target met
- [ ] E2E covers happy path + key error cases for its journeys
- [ ] Performance within recorded baselines
- [ ] Security scans clean (SAST/SCA/DAST as applicable); no secrets
- [ ] Accessibility checks pass (where UI)
- [ ] Contract/OpenAPI updated; shared Zod types regenerated
- [ ] Documentation/runbook updated (Arabic + English user-facing copy)
- [ ] Migrations expand-contract compliant and backward compatible
- [ ] Feature flag state recorded (off unless validated)
- [ ] Evidence attached to release record (phase-14 §6.3)

## 6. Change Control

- **Scope changes**: require written approval from product owner + technical auditor; recorded as addendum to this contract
- **Acceptance criteria changes**: may only be strengthened during Phase 1 without re-approval; weakening requires re-acceptance via phase-18-style review
- **Deferrals of D-P0**: not permitted (they are no-go conditions)
- **Deferrals of D-P1**: permitted only with explicit milestone rebaseline and stakeholder sign-off
- **Evidence standard**: [FOUND]/[PARTIAL]/[MISSING] notation from phase-01 applies to all Phase 1 acceptance evidence

## 7. Responsibilities

| Role | Responsibility |
|------|----------------|
| Product Architect | Scope, acceptance criteria, priority, deferral approval |
| Senior Principal Mobile Architect | Mobile architecture conformance (phase-11), UI/IA implementation quality |
| Backend Architect | API contracts, migrations, authorization, unified model correctness |
| Security Architect | phase-10 mitigations, classification enforcement, sign-off on D-P0-3/4 |
| Technical Auditor | Evidence verification against this contract; gate enforcement |
| QA/Testing | phase-13 execution, evidence production |

## 8. Conclusion

This contract makes Phase 0's findings executable: four P0 blockers clear the no-go conditions, four P1 deliverables compose the MVP, three infrastructure deliverables provide the delivery system, and the definition of done + change control keep Phase 1 honest against evidence. Acceptance is recorded in phase-18; open decisions are consolidated in phase-17 and must resolve before M0 close.