# AFYATNA MOBILE — PHASE 0
# DEPLOYMENT STRATEGY

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This document defines the deployment strategy for the AFYATNA | عافيتنا mobile application and its supporting backend services. It covers build pipelines, distribution channels, environment topology, release management, rollout controls, monitoring, and incident response — with explicit attention to Sudan-specific constraints such as variable connectivity, device fragmentation, and store availability. This strategy is aligned with the repository's existing deployment infrastructure (`deploy/` Docker Compose and Kubernetes manifests) and the mobile architecture decision (React Native with Expo prebuild).

## 1. Deployment Principles

### 1.1 Core Principles
- **Automation First**: Every deployment step is automated, repeatable, and auditable
- **Immutable Artifacts**: Builds are never modified after creation; promotion happens by reference
- **Environment Parity**: Staging mirrors production in configuration, topology, and data shape
- **Least Privilege**: Deploy credentials grant only the minimum required access
- **Reversibility**: Every change has a tested rollback path before it ships
- **Progressive Exposure**: Changes reach users gradually with automated health gates
- **Security at Every Stage**: Signing, secrets, and supply chain are protected end-to-end
- **Evidence-Based Release**: Releases are gated on test, security, and performance evidence (see phase-13)

### 1.2 Deployment Objectives
- **Availability**: 99.5%+ for public API endpoints serving the mobile app
- **Recovery Time Objective (RTO)**: ≤ 30 minutes for backend restoration
- **Recovery Point Objective (RPO)**: ≤ 15 minutes for database data
- **Release Frequency**: Mobile app releases monthly; backend releases weekly as needed
- **Rollback Time**: ≤ 15 minutes for backend; ≤ 24 hours for mobile (store review dependent)
- **Failed Change Recovery**: Automated rollback triggered by health threshold breaches

## 2. Deployment Topology

### 2.1 Environments

| Environment | Purpose | Backend | Data | Mobile Artifact | Access |
|-------------|---------|---------|------|-----------------|--------|
| **Development** | Local feature work | Docker Compose local | Synthetic/seeded | Expo Go / dev build | Developers |
| **CI** | Automated verification | Throwaway containers | Ephemeral test DB | Simulator/emulator builds | Pipeline only |
| **Staging** | Integration & acceptance | Kubernetes (staging namespace) | Masked/synthetic data | Internal distribution (EAS) | Team + QA |
| **Pre-Production** | Final release rehearsal | Kubernetes (prod-mirror) | Refreshed masked data | Store review build | Team + QA |
| **Production** | Live users | Kubernetes (production) | Real data | Store releases + OTA | Public |

### 2.2 Environment Rules
- No production data (including masked derivatives containing PII) leaves production
- Production secrets are never present in CI, staging, or developer machines
- Configuration differences between environments are explicit, versioned, and reviewed
- Staging is reset or refreshed at least weekly to prevent drift
- Production access requires break-glass procedures with audit logging

### 2.3 Network and Edge Topology
```
Mobile App (React Native)
  ├── OTA Bundle (Expo EAS Update CDN)
  ├── Static Assets (CDN with Arabic cache headers)
  └── API Traffic
        ├── CDN/WAF (rate limiting, bot protection)
        ├── Load Balancer (TLS 1.2+, HSTS)
        ├── API Gateway (/api/v1/, /api/v1/mobile/)
        │     ├── accounts (auth, SUDAPASS OAuth client)
        │     ├── travelers / vaccination / declarations
        │     ├── public (requirements, notices, verification)
        │     └── notifications (push registration, preferences)
        ├── PostgreSQL 16 + PostGIS (primary/replica)
        ├── Redis 7 (cache, throttle, sessions)
        ├── Celery workers (async: email, SMS, push fan-out)
        └── MinIO/S3 (documents, certificate assets)
```

**Mobile-specific edge requirements:**
- TLS 1.2+ minimum; TLS 1.3 preferred; certificate pinning on the mobile client (phase-10)
- WAF rules tuned for API abuse without breaking long Arabic payloads
- Compression (gzip/brotli) for JSON responses; images served via CDN with lazy sizing
- Timeouts tuned for 2G/3G: API p95 latency target ≤ 1.5s for critical endpoints

## 3. Mobile Build and Distribution

### 3.1 Build Pipeline (Expo EAS)
- **Managed EAS Projects** for iOS and Android with environment-scoped configuration
- **Development builds**: internal, installed via EAS/dev clients (not Expo Go in staging)
- **Preview builds**: APK/IPA for QA on real devices, distributed via EAS internal links or Firebase App Distribution
- **Production builds**: store-ready AAB/IPA, signed with production keys held in EAS/HSM-backed storage
- **Expo prebuild** used so native config lives in versioned files (`app.json`/`app.config.ts`) rather than drift-prone native projects
- **Deterministic builds**: locked dependency versions (npm lockfile), pinned EAS build image, CI-triggered builds only

### 3.2 Artifact Inventory

| Artifact | Produced By | Destination | Retention |
|----------|-------------|-------------|-----------|
| JS bundle + OTA manifest | EAS Update | Expo CDN | All versions, ≥ 12 months |
| Android AAB (production) | EAS Build | Google Play Console | All versions, ≥ 12 months |
| iOS IPA (production) | EAS Build | App Store Connect | All versions, ≥ 12 months |
| APK (QA preview) | EAS Build | Firebase App Distribution | 90 days |
| Backend Docker images | CI (GHCR) | ghcr.io registry | Latest 20 tags + all release tags |
| Helm charts / manifests | CI | Git repo + chart registry | Git history |
| SBOMs (CycloneDX) | CI | Attached to release + registry | ≥ 24 months |
| Test/security reports | CI | Report storage + release record | ≥ 24 months |

### 3.3 Distribution Channels

#### Google Play (Android)
- **Primary channel**: Android users in Sudan overwhelmingly use sideload/Play; Play Console is primary
- **Track strategy**:
  - Internal testing: automatic on merge
  - Closed testing: QA + field staff (port health officers)
  - Production: staged rollout 5% → 20% → 50% → 100% with ≥ 48h soak between stages
- **Store metadata**: Arabic (primary) and English listings; privacy policy URL required
- **Data safety form**: must accurately declare health data collection, encryption, deletion
- **Target API level**: comply with current Play target-API requirements each release cycle
- **Play App Signing**: Google-managed signing key (backup/rotation plan documented)
- **Contingency (critical for Sudan)**: sideload distribution of signed APKs via official website as fallback if Play availability or payment/region issues arise — must be signed with the same key and versioned identically

#### Apple App Store (iOS)
- **Distribution**: App Store production with phased release (7-day default)
- **Review**: anticipate review delays; submit ≥ 5 business days before target date
- **App Review notes**: include test account, explain health data purpose, Arabic UI notes
- **Privacy manifest**: required reason APIs and data-collection declarations
- **TestFlight**: external testers (field validation) before store submission
- **Contingency**: enterprise/ad-hoc distribution only if organizational Apple Developer Program permits; otherwise accept store latency in plans

#### Web/PWA (secondary, if in scope)
- Deployed as static assets behind CDN with service-worker caching
- Version-bump strategy to prevent stale bundle/API mismatches
- Treated as a separate first-class target in CI with its own test lane

### 3.4 Over-the-Air (OTA) Updates
- **Mechanism**: Expo EAS Update for JS-bundle-only changes
- **Allowed via OTA**: UI fixes, copy/localization fixes, non-contract logic changes, configuration flags
- **NOT allowed via OTA**: native module changes, permission changes, dependency requiring native rebuild, security-sensitive crypto changes (unless pure JS and explicitly reviewed)
- **Safety controls**:
  - Every OTA update goes through the same CI test gate as a store build
  - Targeted rollout: publish to a channel (e.g., `staging` → `production`), then percentage rollout
  - Automatic rollback: runtime error-rate threshold triggers re-publish of last known good manifest
  - Client-side guard: app refuses to apply updates while an offline-sync transaction is in flight
- **Rationale**: OTA is the primary mitigation for slow store review cycles in a health-compliance context

## 4. Backend Deployment

### 4.1 Pipeline Stages
1. **Trigger**: merge to `main` (staging) or release tag (production)
2. **Verify**: lint, typecheck, unit/integration tests, SAST, SCA (per phase-13)
3. **Build**: container image build with SBOM + image signing (cosign/notation)
4. **Scan**: image vulnerability scan; fail on Critical/High without exception
5. **Publish**: push to GHCR with immutable tags (`sha-<commit>`) + release tag
6. **Migrate**: run `python manage.py migrate --check` gate; expand-contract migrations only
7. **Deploy staging**: Helm upgrade to staging namespace; smoke tests + E2E
8. **Gate**: test/security/performance evidence reviewed (automated + manual acceptance)
9. **Deploy production**: Helm upgrade with rolling strategy; automated canary analysis
10. **Post-deploy**: smoke tests, synthetic transactions, dashboards review, release record

### 4.2 Migration Policy (Expand-Contract)
- All schema changes follow expand → migrate → contract across at least two releases
- Migrations must be backward compatible with the previous app version (store review lag means old clients persist for days–weeks)
- Destructive contract steps only after the minimum supported app version no longer references the old shape
- Long-running migrations gated on DBA review; big-table changes scheduled in low-traffic windows (Africa/Khartoum)

### 4.3 Release Orchestration
- **Tooling**: GitHub Actions (existing CI) + Helm/Kubernetes rollouts
- **Strategy**: rolling update with `maxUnavailable: 0`, `maxSurge: 25%`
- **Canary**: route 5% of API traffic to new version for ≥ 15 minutes; automated analysis on:
  - 5xx rate < 1%
  - p95 latency within 120% of baseline
  - error budget burn within threshold
- **Progressive exposure**: canary → 50% → 100%, each stage gated
- **Feature flags**: high-risk behavior changes ship dark (flag off) and are enabled per-namespace/user cohort post-deploy

## 5. Configuration and Secrets Management

### 5.1 Configuration
- All configuration via environment variables consumed by Django settings and K8s manifests
- Config lives in versioned, reviewed files per environment (never ad-hoc console edits)
- Configuration classes: `PUBLIC` (safe in repo), `ENVIRONMENT` (non-secret, per-env), `SECRET` (vaulted)
- Client-reachable config (API base URL, feature flags, public keys) delivered via a versioned config endpoint, not baked into store binaries, to allow correction without resubmission

### 5.2 Secrets Management
- **Storage**: Kubernetes Secrets sealed/encrypted (e.g., Sealed Secrets or external secret store); no secrets in Git
- **CI secrets**: GitHub Actions environments with required reviewers for production deploys
- **Rotation**: documented rotation cadence — JWT signing quarterly or on incident, DB credentials semi-annually, API keys quarterly, store API keys annually
- **Mobile secrets**: no long-lived secrets compiled into the app; only public keys/pins ship client-side
- **Certificate pinning**: pin set distributed via config endpoint with backup pin to avoid lockout
- **Blast-radius control**: separate secret namespaces per environment; production credentials unusable against staging

### 5.3 Anti-Patterns (Prohibited)
- Secrets in app bundles, OTA manifests, or client-side storage
- Shared service accounts across environments
- Manual hotfixes applied directly in production without a corresponding commit
- Disabling TLS verification, pinning, or throttling in any environment to "make tests pass"

## 6. Release Management

### 6.1 Versioning
- **Backend/API**: SemVer on the API surface; breaking changes require `/api/v1/` → `/api/v2/` or documented additive-only evolution
- **Mobile app**: SemVer-ish marketing version (`MAJOR.MINOR.PATCH`) mapped to `versionCode`/`buildNumber` monotonically increasing
- **OTA bundle**: separate build ID; always paired with minimum compatible native version (`runtimeVersion` policy: native-requiring updates bump runtime)
- **Deprecation policy**: announce deprecation ≥ 2 releases ahead; enforce minimum supported app version once adoption of new version ≥ 95%

### 6.2 Release Cadence
| Component | Cadence | Trigger |
|-----------|---------|---------|
| Mobile app (store) | Monthly (or earlier for security) | Planned release train |
| Mobile OTA | As needed, ≤ weekly | CI-gated hotfix or content fix |
| Backend | Weekly | Merge to main + gated deploy |
| Critical security patch | ≤ 48 hours | CVSS High/Critical in dependency or code |

### 6.3 Release Checklist (Gate Evidence)
- [ ] All phase-13 testing gates pass (unit, integration, E2E, performance, security, accessibility)
- [ ] SBOM + image scan attached; no unapproved Critical/High vulnerabilities
- [ ] Migration plan reviewed; expand-contract verified against previous app version
- [ ] Rollback plan written and rehearsed (backend: Helm rollback; mobile: OTA rollback or store phased-release halt)
- [ ] Feature flags default state confirmed (off for unvalidated behavior)
- [ ] Monitoring dashboards and alerts in place for the change surface
- [ ] Release notes (Arabic + English) drafted; store listing updated if user-facing
- [ ] Stakeholder sign-off: product owner, security officer, privacy officer (per phase-13 DoD)
- [ ] On-call rotation notified of release window
- [ ] SUDAPASS/config endpoint values verified in target environment

### 6.4 Hotfix Process
1. Branch from release tag; minimal-scope fix with tests
2. Expedited CI (full test suite still mandatory; duration reduced via parallelization)
3. Backend: direct canary deploy with post-deploy synthetic checks
4. Mobile: prefer OTA path when native surface unchanged; otherwise expedited store submission with phased release
5. Post-incident: backport to `main`, update runbook, record in release log

## 7. Rollout and Rollback

### 7.1 Backend Rollout Controls
- **Rolling + canary** as in §4.3; automated rollback if health analysis fails
- **Helm history**: keep last 10 releases for instant `helm rollback`
- **Database rollback**: forward-fix preferred; only reversible migrations auto-rollback; destructive contract steps deferred until stable window
- **Feature flags**: decouple deploy from release — code ships disabled, enabled via flag after validation

### 7.2 Mobile Rollout Controls
- **Store**: phased releases with halt criteria (crash rate > 1.5% or ANR threshold per platform guidance)
- **OTA**: channel-based publish with percentage rollout; last-known-good manifest retained for one-command rollback
- **Kill switch (client)**: remote config flag to disable a specific feature or force-update prompt without full OTA
- **Minimum version enforcement**: server may reject API calls from versions below the security floor (clear Arabic error message with update guidance)
- **Sideloaded users**: version enforcement must not brick offline capabilities; emergency info and certificates remain accessible (see phase-09 offline strategy)

### 7.3 Rollback Triggers (Automatic)
| Signal | Threshold | Action |
|--------|-----------|--------|
| API 5xx rate | > 1% over 5 min | Auto-rollback backend deploy |
| p95 latency | > 150% baseline over 10 min | Auto-rollback backend deploy |
| App crash rate (OTA cohort) | > 1.5% over 6 h | Auto-revert OTA manifest |
| Auth failure spike | > 5× baseline over 5 min | Page on-call + hold rollout |
| Sync failure rate (offline queue) | > 5% over 15 min | Disable sync feature flag, notify on-call |

## 8. Monitoring, Observability, and Incident Response

### 8.1 Observability Stack
- **Metrics**: Prometheus + Grafana (existing stack), RED method per endpoint, app-level KPIs via Sentry Performance
- **Logs**: structured JSON logs shipped to centralized store; no PII/health data in logs (phase-06 classification enforced)
- **Traces**: distributed tracing across API gateway → Django → Celery for critical flows (declaration submission, auth)
- **Crash reporting**: Sentry for mobile (sourcemaps uploaded by CI) and backend exceptions
- **Client health**: crash-free session rate, OTA adoption rate, sync queue depth, API error rates by app version
- **Uptime**: synthetic transactions against health check (`/api/v1/health/`), login flow, and certificate verification

### 8.2 Key Alerts
- Page: security incidents (auth anomaly spikes, cert pinning failures), data-availability (DB down), crash rate breach post-release
- Ticket: performance regressions, degraded sync success, non-critical endpoint errors
- Notify: OTA adoption stalls, store review rejections, expiration of pinned certificates or signing keys

### 8.3 Incident Response
1. **Detect**: alert or user report (bilingual support channel)
2. **Triage**: severity classification (SEV1 = data/security or core flow down)
3. **Mitigate**: rollback, feature flag off, or OTA revert — mitigation before root cause
4. **Communicate**: status notice (Arabic + English), in-app banner for user-impacting events
5. **Resolve**: confirm via synthetic checks and dashboards
6. **Review**: blameless postmortem within 5 business days for SEV1/SEV2; actions tracked to closure
- **Runbooks**: authored in Phase 1 for top failure modes (auth outage, sync backlog, pinned cert expiry, SUDAPASS outage)

### 8.4 Data Protection in Operations
- Production data access via break-glass with approval and audit trail
- Backups: encrypted, tested restores quarterly, RPO ≤ 15 min (PITR for PostgreSQL)
- PII/health-data redaction in logs, traces, and error reports enforced by scrubbing rules
- Certificate revocation and account-lockout operations available to on-call with audit logging

## 9. Sudan-Specific Deployment Considerations

| Constraint | Deployment Implication |
|------------|------------------------|
| Variable/intermittent connectivity at POEs | Offline-first client (phase-09); sync resilient to 2G; API payloads minimized |
| High device fragmentation, low-end Android | Staged rollout weighted to low-end device testing; crash thresholds stricter for low-RAM cohort |
| Play Store availability/region quirks | Sideload fallback distribution from official site with identical signing |
| Arabic-first user base | Store listings, release notes, and in-app notices shipped in Arabic first; RTL verification per release |
| Power/grid instability | Backend availability via multi-replica K8s; client must handle interrupted sessions gracefully |
| Data sovereignty expectations | Production hosted in approved jurisdiction/region; confirm hosting location before Phase 1 (open question) |
| Low-bandwidth media | CDN edge caching, response compression, image optimization as deployment defaults |

## 10. Supply Chain and Build Security

- **Dependency integrity**: lockfiles enforced; `npm audit`/Snyk gate in CI; no postinstall scripts from unapproved packages
- **Image provenance**: images built by CI only, signed (cosign), SBOM attached, scanned before push
- **Branch protection**: required reviews, status checks, no force-push to protected branches
- **OIDC-based deploy auth**: cloud/registry access via short-lived OIDC tokens — no long-lived CI keys
- **Significant interfaces**: signing keys for Android (Play App Signing), iOS (certificates/profiles), OTA manifest signing, JWT/certificate HMAC keys — each with documented custody and rotation
- **Reproducibility**: record build provenance (commit SHA, builder image digest, tool versions) for every release artifact

## 11. Backup, Disaster Recovery, and Continuity

- **PostgreSQL**: continuous WAL archiving + daily base backups; quarterly restore drill with evidence
- **Redis**: treated as reconstructable cache; persistence optional, no DR dependency
- **MinIO/S3**: versioned buckets with lifecycle policies; cross-region replication if budget permits
- **App continuity offline**: even during full backend outage, cached certificates, emergency info, and drafted declarations must remain accessible (phase-09)
- **Communication continuity**: static status page deployable independently of main app infrastructure

## 12. Deployment Maturity Metrics

| Metric | Target (Phase 1) | Target (Steady State) |
|--------|------------------|------------------------|
| Deployment frequency (backend) | Weekly | On-demand, daily-capable |
| Lead time for change | < 1 week | < 2 days |
| Change failure rate | < 15% | < 5% |
| MTTR (backend) | < 60 min | < 30 min |
| Crash-free sessions (mobile) | > 99.5% | > 99.7% |
| OTA adoption (within 7 days) | > 60% | > 80% |
| Restore drill success | Quarterly pass | Quarterly pass |

## 13. Phase 1 Deployment Deliverables

1. **CI/CD workflows**: mobile build lanes (preview/production) + backend image/deploy lanes
2. **EAS project setup**: environment-scoped projects, channels, and update policies
3. **Environment scaffolding**: staging/production K8s namespaces with externalized secrets
4. **Release runbooks**: release checklist, hotfix, rollback, OTA revert (bilingual release notes template)
5. **Monitoring baseline**: dashboards, alerts, synthetic checks, crash reporting wired to CI sourcemaps
6. **Distribution fallback**: signed sideload distribution path from official website
7. **Supply chain controls**: SBOM, image signing, dependency gates, OIDC deploy auth
8. **DR evidence**: one successful backup restore drill documented

## 14. Conclusion

The deployment strategy treats the mobile app and its backend as one release system with two delivery velocity tiers: fast, reversible OTA/config changes for the client, and gated, canary-controlled rolling deploys for the backend. Store distribution adds irreducible latency, which is countered by phased releases, OTA for JS-only fixes, and a sideload fallback for Android. Security is embedded throughout — signed artifacts, secret isolation, minimal client secrets, and log/trace redaction — while Sudan-specific realities (connectivity, device diversity, Play availability, Arabic-first UX) are addressed as first-class deployment requirements rather than afterthoughts.

**Success depends on:** enforcing the phase-13 gates in CI, rehearsing rollback before it is needed, and keeping offline continuity (phase-09) intact across every deployment path.

**Next:** phase-15 (data ownership) defines who owns what data across these deployed components; phase-16 converts this strategy into binding Phase 1 implementation contracts.