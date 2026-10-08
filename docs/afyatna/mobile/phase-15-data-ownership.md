# AFYATNA MOBILE — PHASE 0
# DATA OWNERSHIP

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This document defines data ownership for the AFYATNA | عافيتنا mobile ecosystem: which party owns each class of data, which system is authoritative, where data may reside, how long it is retained, and who may access or receive it. It operationalizes the classification scheme in phase-06, the identity boundary in phase-05, the offline cache model in phase-09, and the security controls in phase-10. These ownership rules are binding inputs to the Phase 1 implementation contract (phase-16).

## 1. Ownership Principles

1. **Single System of Record**: every data domain has exactly one authoritative store; all others are caches or projections
2. **Data Subject Rights**: the traveler owns their personal and health data; the platform is a custodian with defined processing purposes
3. **Purpose Limitation**: data is collected and processed only for declared quarantine/surveillance purposes (phase-06)
4. **Minimum Residency**: data is stored only where needed; copies (cache, backup, log) inherit the source classification
5. **Classification Inheritance**: derived data, logs, backups, and notifications never carry a lower classification than their source
6. **Explicit Third-Party Boundaries**: no data leaves the platform boundary without a documented processor and legal basis (notably SUDAPASS, phase-05)
7. **Offline Parity**: data cached on-device is subject to the same controls as server-side copies

## 2. Stakeholders and Roles

| Role | Definition | Examples |
|------|-----------|----------|
| **Data Subject** | Individual the data is about — owns rights over their personal/health data | Traveler |
| **Data Controller** | Determines purposes and means of processing | National Quarantine authority (NQP operator) |
| **Data Processor** | Processes on behalf of the controller under contract | Cloud host, MinIO storage, SMS/push providers |
| **Identity Provider** | Owns identity assertions, not health data | SUDAPASS (phase-05) |
| **Platform** | NQP backend + AFYATNA app as technical custodian | Django services, mobile client stores |
| **Verifier** | Consumes minimal proofs without becoming a controller of the full record | Certificate verifier scanning a QR |

## 3. Data Domain Ownership Matrix

### 3.1 Authoritative Source ("System of Record")

| # | Data Domain | Data Subject Rights | Controller | System of Record | Mobile Copy | Classification |
|---|-------------|--------------------|-----------|------------------|-------------|----------------|
| 1 | Account & credentials | Traveler (self) | NQP | `accounts.User` (backend) | Tokens (secure store), session state | IDENTITY |
| 2 | SUDAPASS identity assertions | Traveler | SUDAPASS | SUDAPASS IdP | None persisted (transient claims) | IDENTITY (external) |
| 3 | Profile (name, contact, IDs, passport) | Traveler (self) | NQP | `accounts` / traveler profile | Encrypted cache (read) | IDENTITY / PERSONAL |
| 4 | Trips & travel plans | Traveler (self) | NQP | Unified travel model (phase-08 P0) | SQLite drafts + cache | PERSONAL |
| 5 | Health declarations | Traveler (self) | NQP | declaration records (backend) | Encrypted draft until submitted | SENSITIVE_HEALTH |
| 6 | Vaccination certificates | Traveler (self); issuer authority NQP | NQP | `vaccination.Certificate` (backend) | Encrypted cache (offline access, phase-09) | SENSITIVE_HEALTH |
| 7 | Documents (uploads) | Traveler (self) | NQP | MinIO/S3 via backend | Local file cache (opt-in, encrypted) | IDENTITY–PERSONAL |
| 8 | Lab/test results | Traveler (self) | NQP / lab source | lab results module | Not cached by default | SENSITIVE_HEALTH |
| 9 | Screening results & risk scores | Traveler (limited) | NQP | screening module (INTERNAL, phase-01) | **Not exposed to mobile** | SENSITIVE_HEALTH (internal) |
| 10 | Public health notices & requirements | None (public) | NQP | `public` / CMS APIs | Read-only cache (stale-tolerant) | PUBLIC |
| 11 | Emergency/EOC alerts (public subset) | None (public) | NQP | CMS/public projection | Read-only cache | PUBLIC |
| 12 | EOC operational data | n/a | NQP | `emergency_eoc` (INTERNAL) | **Not exposed to mobile** | SECURITY_SENSITIVE |
| 13 | Notifications (prefs + delivery) | Traveler (self) | NQP | `notifications` (backend) | Device token; preferences cache | PERSONAL |
| 14 | Device/app telemetry & crashes | Traveler (pseudonymous) | NQP | Sentry (processor) | SDK buffers | PERSONAL (pseudonymized) |
| 15 | Audit logs | Platform (not subject-editable) | NQP | backend audit trails | None | SECURITY_SENSITIVE |
| 16 | Analytics (product usage) | Traveler (pseudonymous) | NQP | analytics store (privacy-first) | Opt-in SDK | PERSONAL |

**Rules read from this table:**
- Where **Mobile Copy = None**, the client must not persist the data (e.g., SUDAPASS claims, EOC internals, screening results)
- Every `SENSITIVE_HEALTH` mobile copy requires encryption at rest + access gated by authentication/biometrics (phase-10, phase-11)
- Domain 9/12 are hard exclusions: the mobile surface has no endpoint, no cache, no log path to these (phase-01 [INTERNAL])

### 3.2 Ownership Disputes / Conflict Rules
1. Server authoritative for all submitted/synced records — client copies are projections
2. Client authoritative for **unsubmitted drafts** until acknowledged by server (phase-09)
3. Identity attributes from SUDAPASS are authoritative over locally stored values when linked (profile reconciliation flagged, never silently overwritten)
4. Certificate contents: issuer (NQP) owns the record; holder owns the right to present/share it; verifier receives only what a verification scan discloses
5. Preferences: client-authoritative for device-local settings; server-authoritative for account-wide notification preferences

## 4. Data Residency and Flow Boundaries

### 4.1 In-Country / Boundary Rules
- **Production data resides in the approved deployment jurisdiction** (open question — see phase-17 #1); staging/dev use masked or synthetic data only
- Backups inherit residency: encrypted backups stored in-region with documented key custody
- Logs and traces never contain SENSITIVE_HEALTH or full IDENTITY payloads (phase-14 §8.4); residency of log storage follows the same rule as primary data

### 4.2 Flow Diagram
```
[Traveler device: AFYATNA]
   │  own data (drafts, cache) ── encrypted, on-device only
   ▼
[NQP Backend — controller boundary]  ← single system of record
   ├── PostgreSQL / MinIO / Redis      (in-region, encrypted)
   ├── Internal-only surfaces          (EOC, screening, carriers — no mobile path)
   ├── Public projection               (notices, requirements — cacheable)
   └── Processors (contracted, least data):
         ├── SUDAPASS (identity claims only, phase-05)
         ├── Push providers FCM/APNs (device token + minimal payload)
         ├── SMS/email providers (delivery content minimized)
         └── Crash telemetry (pseudonymized, scrubbed)
```

**Egress prohibitions:**
- No SENSITIVE_HEALTH payloads in push/SMS/email bodies (title/status only, phase-06)
- No health data to analytics or advertising SDKs (none permitted in MVP)
- No third-party sharing for secondary purposes; no data sale — ever

## 5. Retention and Deletion

| Data | Retention | Deletion Trigger | Notes |
|------|-----------|------------------|-------|
| Health declarations | Per statutory health-record period (to be confirmed — phase-17 #2) | Subject request (limited by statutory duty) + expiry purge job | Purge removes mobile cache on next sync |
| Vaccination certificates | Certificate validity + statutory period | Revoke/replace events already supported (phase-01 [FOUND]) | Revocation reflected on-device at next sync; offline copy shows last-known state with fetched-at stamp |
| Profile / account | Account lifetime + grace period (propose 24 months) | Account deletion request | Anonymize where audit continuity required |
| Documents (uploads) | Purpose duration / expiry + 12 months (propose) | Subject request or expiry purge | Orphaned files cleaned by lifecycle job in MinIO |
| Audit logs | Statutory/audit period (to be confirmed) | Not subject-deletable | Minimized content — references, not payloads |
| Device tokens | Until token invalid or app uninstall | Logout/device removal | Server-side deregistration |
| Crash telemetry | 90 days (propose) | Automated retention job | Pseudonymized |
| On-device cache | While authenticated | Logout, "clear data", uninstall, remote policy | SENSITIVE_HEALTH cleared on biometric-lock failure thresholds (phase-10) |
| OTA/update logs | 12 months | Automated | Contains no user data |

**Deletion propagation**: server deletion must invalidate all caches — push a cache-invalidation signal; on-device purge executes on next connectivity (offline-first design, phase-09).

## 6. Access and Authorization Ownership

### 6.1 Access Principles
- **Owner access**: the traveler always reads their own data (server-enforced via object ownership checks; cross-user access risk called out in phase-01 no-go conditions)
- **Least privilege roles**: staff/operator access via existing RBAC with scoped assignments; emergency EOC staff see operational views, not mobile-user PII beyond need
- **Internal-only surfaces**: phase-01 [INTERNAL] capabilities remain unreachable from any mobile token scope
- **Verification is minimal**: public verification endpoints disclose only verification result + minimal fields, throttled (30/hour), signature-checked (phase-01 QR gap — must be closed before Phase 1, phase-16)

### 6.2 Mobile-Specific Access Controls
| Control | Requirement | Source |
|---------|-------------|--------|
| Token scope | Mobile tokens limited to mobile-needed scopes; no admin/internal scopes ever issued to app tokens | phase-10, phase-16 |
| Audience/expiry | 30-min access / 7-day refresh with rotation; device binding | phase-01 [FOUND], phase-10 |
| Biometric gate | Local re-auth for SENSITIVE_HEALTH views (certificates, declarations) | phase-11 |
| Screenshot policy | Discourage/block screenshots on certificate screens where platform allows | phase-10 |
| Device compromise | Detect rooted/jailbroken risk signals; degrade (no cached secrets) rather than hard-brick offline essentials | phase-09, phase-10 |
| Session termination | Remote logout capability per device | phase-16 |

## 7. Data Subject Rights Implementation

| Right | Mobile Implementation | Backend Requirement | Constraint |
|-------|----------------------|---------------------|-----------|
| **Access (view)** | Profile, trips, declarations, certificates in-app | Export/read endpoints | Free, in-app first |
| **Portability (export)** | "Download my data" (JSON/PDF) via secure share | Export job producing signed archive | Verify identity before release; file protected (phase-16) |
| **Rectification** | Edit profile in-app; drafts editable pre-submission | Update endpoints with audit | Submitted declarations amend-by-correction, not overwrite |
| **Erasure** | Request-deletion flow in Profile > Data | Async deletion workflow with confirmation | Subject to statutory health/audit retention (§5) |
| **Consent/withdrawal** | Granular toggles (notifications, analytics) | Preference storage + enforcement | Core service not conditioned on optional consent |
| **Restriction** | Flag to suspend optional processing | Processing flag on record | Statutory processing disclosed to user |
| **Complaint** | Contact/feedback channel linked in Profile > Legal | Ticket capture | — |

**Offline note**: rights actions (export, deletion request) require connectivity; the app queues and clearly communicates pending state (phase-09).

## 8. Shared and Presented Data (Certificates, Verification)

### 8.1 Certificate Presentation Ownership
- **Holder** controls when and to whom a certificate is presented (share sheet, QR display)
- **Verifier** receives: validity status, holder minimal identity (name), certificate metadata necessary for trust — determined by phase-07 public verification contract
- **Receipt of presentation is not tracked** as a persistent social graph; verification events are logged server-side for security/audit only (SECURITY_SENSITIVE), not surfaced as traveler-facing history beyond basic status (final call in phase-16)

### 8.2 QR / Verification Data Rule
QR payloads must be **minimal, signed (HMAC), and replay-resistant** — signature verification mandatory before trust decisions (phase-01 QR gap, phase-06, phase-10). Unsigned or stale-signature scans fail closed.

## 9. Processor and Third-Party Inventory

| Processor | Data Disclosed | Purpose | Contract Requirement |
|-----------|---------------|---------|---------------------|
| SUDAPASS | Auth code/PKCE exchange only; no health data | Identity (phase-05) | DPA + scope minimization; app never receives SUDAPASS credentials |
| FCM / APNs | Device token, minimal message content | Delivery | Content minimization enforced (§4.2) |
| SMS gateway | Phone number, short message | OTP/alerts | Data minimization; retention limited to delivery logs |
| Email provider | Email address, templated content | Account comms | As above |
| Sentry (or equiv.) | Pseudonymized crash/context, scrubbed | Reliability | PII scrubbing rules; EU/in-region choice per phase-17 #1 |
| Cloud host / K8s | All production data at rest/in transit | Hosting | Residency + encryption + access controls |
| MinIO/S3 | Documents, certificate assets | Storage | Encryption, lifecycle, private buckets only |

**No additional processors** may be introduced without: security review (phase-10), privacy impact note (this document's §4–6), and controller sign-off.

## 10. Ownership-Rule Enforcement (How Compliance Is Proven)

| Rule | Enforcement Mechanism | Verification |
|------|----------------------|--------------|
| Internal-only data never on mobile | No endpoint exists; contract tests assert 404/403 for mobile tokens | phase-13 contract tests; phase-16 API contract |
| Classification inheritance in logs | Log scrubbing middleware + allowlist fields | Log audit test; CI grep for known sensitive fields |
| Encryption at rest on device | Secure storage / SQLCipher-backed store | Static review + device inspection test |
| No secrets in bundle | Architecture + build scanning | phase-14 supply-chain gate |
| Minimal push payloads | Notification serializer whitelist | Unit tests on notification content |
| Cache purge on deletion | Invalidation signal + client purge handler | Integration test in phase-13 |
| Retention jobs | Scheduled Celery purge tasks | Quarterly retention evidence |
| Cross-user access isolation | Object-level permission checks | Security tests (phase-13 §2.6) |

## 11. Open Ownership Questions

Full detail in phase-17; summary here:
1. **Residency jurisdiction** for production data and backups — controller decision required
2. **Statutory retention periods** for declarations, certificates, and audit logs under Sudanese health law
3. **Erasure vs. audit continuity** — exact anonymization standard for record-linked audit trails
4. **Verification disclosure amount** — minimal fields returned by public verification
5. **Telemetry scope** — whether any product analytics ship in MVP, and under what consent model
6. **SUDAPASS linkage** — what identity attributes may be cached locally after OIDC exchange (recommendation: none beyond app-session identity)

## 12. Conclusion

AFYATNA's data ownership model is **controller-custodian**: the traveler owns their personal and health data; NQP is the single system of record and custodian; SUDAPASS owns only identity assertions; devices hold encrypted, minimal, purgeable copies; processors receive the least data necessary under contract. Internal-only operational data has no mobile path by design. These rules are enforceable — through API contracts, log scrubbing, encryption, and tests — and they are inputs the Phase 1 implementation contract (phase-16) must make binding.