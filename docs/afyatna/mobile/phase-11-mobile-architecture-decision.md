# AFYATNA MOBILE — PHASE 0
# MOBILE ARCHITECTURE DECISION

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This document records the architecture decision for the AFYATNA | عافيتنا mobile application: how it will be built, how it talks to the NQP backend, how it handles offline use, security, and delivery. The decision is grounded in the Phase 0 repository audit (evidence-based findings in phase-01 through phase-10) and constrains the contracts defined in phase-16.

## 1. Decision Drivers

### 1.1 Evidence from Phase 0
- **Existing stack**: React 19 / TypeScript 5.5 / Vite on the frontend; Django 5.0 / DRF backend with JWT auth (30-min access, 7-day refresh), RBAC, and `EnvelopeRenderer` responses (phase-01, [FOUND])
- **Team capability**: proven React/TypeScript skill; shared-type reuse between web and mobile
- **Backend readiness**: no dedicated mobile APIs; all endpoints web-shaped (phase-08, [MISSING] `/api/v1/mobile/`)
- **SUDAPASS**: no actual integration exists; OAuth2/OIDC client must be built (phase-05, [MISSING])
- **Offline reality**: ports of entry with intermittent/2G connectivity (phase-09)
- **Health data**: SENSITIVE_HEALTH classification requires strict client-side controls (phase-06, phase-10)
- **Device landscape**: low-end Android dominance, high fragmentation, Arabic-first RTL (phase-04, phase-12)

### 1.2 Constraints
- Budget and timeline favor a single codebase over parallel native teams
- Release latency must be mitigable without waiting on store review (deployment strategy, phase-14)
- Offline-capable critical flows: emergency info, certificates, drafted declarations (phase-09)
- No long-lived secrets in the client bundle (phase-10, phase-14)

## 2. Options Considered

### Option A — Native (Kotlin + Swift)
- **Pros**: best performance, full platform API access, most predictable behavior
- **Cons**: two codebases, two skill sets, double maintenance cost, slower iteration for a 3-portion feature surface; team's React skills unused
- **Verdict**: rejected — cost and duplication unjustified for an API-driven CRUD/profile app

### Option B — Flutter
- **Pros**: single codebase, good performance, mature tooling
- **Cons**: team has no Dart experience; no shared types/languages with existing React web; new pipeline to establish
- **Verdict**: rejected — contradicts team capability evidence and shared-contract goals

### Option C — React Native with Expo (prebuild) ✅ **SELECTED**
- **Pros**:
  - Direct reuse of TypeScript types, API client patterns, validation logic (Zod) from the web frontend
  - Team capability match (React/TypeScript) — lowest ramp-up risk
  - Expo prebuild gives native project access without maintaining bare repos by hand
  - EAS Build + EAS Update provide managed CI and OTA distribution (phase-14)
  - Large ecosystem for offline storage (MMKV/SQLite), secure storage, biometrics, notifications
  - One QA surface for business logic across platforms
- **Cons**:
  - JS bridge/rendering overhead vs native (mitigated: RN's new architecture; target profile is low-end but UI is mostly forms/lists)
  - OTA introduces update-integrity risk (mitigated: signed manifests, CI gates, rollout controls — phase-14)
  - Native module lifecycle requires discipline (prebuild config versioned; runtime version policy)
- **Verdict**: **selected**

### Option D — PWA only
- **Pros**: zero store dependency, instant updates, shared codebase with web
- **Cons**: weak offline guarantees on iOS, limited push (no reliable iOS web push for this scope), no camera/biometric depth, install-prompt friction, weaker device integration for QR scanning and secure storage
- **Verdict**: rejected as primary; PWA remains a possible secondary target

### Option E — React Native CLI (bare, no Expo)
- **Pros**: maximum control
- **Cons**: we own build infrastructure, signing, OTA tooling, and native project drift — all solved services with Expo
- **Verdict**: rejected

## 3. Decision

**AFYATNA mobile shall be built with React Native (TypeScript) using Expo with prebuild for production, distributed via EAS, with OTA updates for JS-only changes.**

### 3.1 Status
- **Decision type**: Architecture Decision Record (ADR)
- **Status**: Proposed for Phase 0 acceptance; binding for Phase 1 upon sign-off
- **Date**: 2026-10-07
- **Supersedes**: none

### 3.2 Rationale Summary
1. Maximum reuse of existing TypeScript contracts, Zod validation, and API patterns from `frontend/`
2. Strongest match to demonstrated team capability (lowest delivery risk)
3. OTA capability directly mitigates store-review latency for a compliance-critical health app
4. Managed build/distribution (EAS) removes custom mobile CI burden in Phase 1
5. Acceptable performance for a form/list/dashboard-dominated UX on low-end devices, provided performance budgets from phase-13 are enforced

## 4. Target Architecture

### 4.1 High-Level Topology
```
┌─────────────────────────────────────────────┐
│ AFYATNA App (React Native / Expo)          │
│  ├─ UI layer (RTL-first, MUI-consistent)    │
│  ├─ State: Redux Toolkit (+ auth slice)     │
│  ├─ Server state/query cache                │
│  ├─ Offline store: SQLite + encrypted KV    │
│  ├─ Secure storage: expo-secure-store/keychain │
│  ├─ API client: shared Zod-typed contract   │
│  └─ Background sync + conflict queue        │
└───────────────┬─────────────────────────────┘
                │ HTTPS (TLS pinning)
┌───────────────▼─────────────────────────────┐
│ NQP Backend (existing Django/DRF)           │
│  ├─ /api/v1/          (existing endpoints)  │
│  ├─ /api/v1/mobile/   (new, phase-08 gaps)  │
│  ├─ SUDAPASS OIDC client (new, phase-05)    │
│  └─ Push (FCM/APNs), Celery, Redis, PostGIS │
└─────────────────────────────────────────────┘
```

### 4.2 Layer Responsibilities

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Presentation | React Native components + RTL layout | Screens per phase-12 IA; accessibility (phase-13) |
| State | Redux Toolkit | Auth/session, UI state, sync status — mirrors web `store/` |
| Server state | Query cache (e.g., RTK Query or TanStack Query) | Fetch/cache/invalidate API data |
| Domain | Shared TypeScript + Zod schemas | Validation, types, business rules shared with web |
| Offline | SQLite (structured) + encrypted KV (secrets/certs) | Drafts, cached reference data, sync queue |
| Security | expo-secure-store, biometrics, certificate pinning | Per phase-10 threat model |
| Transport | Fetch/axios client with envelope parsing | Handles `{status, data, message}` EnvelopeRenderer contract |
| Sync | Background task + connectivity-aware queue | Per phase-09 offline strategy |

### 4.3 Backend Boundary (Binding Contract Areas)
The mobile app consumes the backend only through:
1. **Existing `/api/v1/` endpoints** proven reusable in phase-07
2. **New `/api/v1/mobile/` endpoints** specified by phase-08 gap analysis
3. **Public/verification endpoints** with throttling, per phase-07
4. **Config endpoint** serving non-secret client configuration (flags, pin set, min version)

**Never exposed to mobile** (phase-01 [INTERNAL]): EOC/emergency operational internals, carrier integration APIs, screening results/risks — only aggregated public status.

## 5. Key Sub-Decisions

### 5.1 State Management
- **Redux Toolkit** for app state, aligned with existing `frontend/src/store/` slices (auth, ui) to maximize pattern reuse and shared types
- Server cache separated from client state to keep offline invalidation logic explicit

### 5.2 Offline Storage
- **SQLite** for structured, queryable data (trips, declarations, cached requirements)
- **Encrypted key-value store** for tokens, certificate payloads, and anything classified SENSITIVE_HEALTH (phase-06)
- **Conflict policy**: server-authoritative for submitted records; client-authoritative drafts; last-write-wins with audit for preferences — details fixed in phase-09/phase-16
- All at-rest storage encrypted using platform keystores; no plaintext health data on disk

### 5.3 Authentication
- **Phase 1**: JWT flow matching backend (`simplejwt`) — national ID + password, refresh rotation, account lockout awareness
- **SUDAPASS**: OAuth2/OIDC authorization-code + PKCE integration as the target identity boundary (phase-05); app must be architected so identity provider is swappable behind an auth module
- Refresh tokens stored in secure storage; biometric unlock gating the session locally (device binding, phase-10)

### 5.4 Networking and Security
- TLS 1.2+/1.3 with **certificate pinning** (backup pin + config-endpoint rotation; phase-14)
- Envelope response parsing with strict error mapping to bilingual messages (Arabic-first, phase-12)
- Request timeouts/retries tuned for 2G; idempotency keys on declaration submission to make retries safe
- Request throttling respected client-side to align with server rate limits (e.g., verification 30/hour)

### 5.5 Localization and Accessibility
- **Arabic is the default locale** with full RTL layout; English secondary — implemented via i18n layer shared with web where possible
- Accessibility targets from phase-13 (WCAG 2.1 AA equivalent, screen readers, dynamic type) are acceptance criteria, not polish

### 5.6 Push Notifications
- FCM (Android) + APNs (iOS) via backend `notifications` app device-token registration (phase-01 [REUSABLE] with adapter)
- Sensitive content minimized in notification payloads (title only; no health details) per phase-06
- Deep-link handling to in-app destinations per phase-12

## 6. Architecture Principles

1. **Offline-first**: every critical flow designed for intermittent connectivity from day one (phase-09)
2. **Shared contracts**: single source of truth for API types/validation between web and mobile
3. **Minimal client secrets**: only public keys/pins ship in the binary (phase-10)
4. **Data minimization**: client requests and stores only what the journey requires (phase-06)
5. **Progressive enhancement**: native features (biometrics, camera QR) degrade gracefully
6. **Evidence over assertion**: performance/crash budgets from phase-13 enforced in CI
7. **Reversibility**: features ship behind flags; OTA provides rapid corrective path (phase-14)

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OTA bundle tampering/update integrity | High | Signed manifests, CI-gated publishes, rollout %, rollback (phase-14) |
| Low-end device performance | Medium | Performance budgets, list virtualization, phase-13 device matrix |
| Store review latency (iOS) | Medium | Phased release planning, OTA for JS fixes, submit 5+ days ahead |
| Play unavailability/sideload | Medium | Signed sideload fallback path (phase-14) |
| RN native-module churn | Medium | Pinned versions, prebuild config in Git, dependency gates |
| Certificate pin lockout | High | Backup pin + rotated pin set via config endpoint |
| Offline data exposure on lost device | High | Encrypted stores, biometric app lock, remote wipe guidance |
| API contract drift web vs mobile | Medium | Shared Zod schemas in one package; contract tests in CI |
| SUDAPASS dependency not ready | High | Auth module abstraction; ship national-ID JWT path behind interface (phase-05) |

## 8. Consequences

### Positive
- One team, one language, shared contracts; fastest credible path to MVP
- OTA dramatically shortens fix latency for a health-compliance product
- Reuses mature backend capabilities identified in phase-07

### Negative / Accepted Costs
- Two platform artifacts to sign and submit each release
- Native build complexity (mitigated but not eliminated by Expo prebuild)
- Performance ceiling below native for compute-heavy UI (acceptable for this UX profile)

### Neutral
- Requires EAS accounts, environments, and policies set up in Phase 1 (phase-13/phase-14 deliverables)

## 9. Revisit Triggers

This decision is revisited if any of the following occurs:
- SUDAPASS mandates a native-only client capability
- Performance budgets in phase-13 cannot be met on the lowest-tier target device after two optimization cycles
- Regulatory requirement to disallow OTA updates for health applications
- Scope expands into real-time telemetry/camera-heavy screening features
- Team composition changes such that React Native expertise is unavailable

## 10. Conclusion

React Native with Expo prebuild is the lowest-risk, highest-reuse path to delivering AFYATNA, and it directly supports the offline, security, and delivery requirements established in Phase 0. The decision is binding for Phase 1 implementation contracts (phase-16) and is constrained by the security controls (phase-10), offline strategy (phase-09), and deployment strategy (phase-14).

**Decision record**: PROPOSED — acceptance status tracked in phase-18.