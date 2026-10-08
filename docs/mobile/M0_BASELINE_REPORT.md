# AFYATNA MOBILE — PHASE 1
# M0 BASELINE REPORT

**Date:** 2026-10-07  
**Milestone:** M0 — Contract Baseline Gate  
**Mode:** Audit only (no implementation in M0)  
**Authority:** `docs/afyatna/mobile/phase-01` … `phase-18`

---

## 0. Evidence Standard

`[M0-A-FOUND]` / `[M0-A-PARTIAL]` / `[M0-A-MISSING]` — repository capability discovery (§1).  
`[FOUND]` / `[PARTIAL]` / `[MISSING]` / `[INTERNAL]` / `[REUSABLE]` / `[ADAPTER]` — Phase 0 consistency audit (§2).  
Every entry cites file, symbol, and line where practical. Runtime evidence is distinguished from code inspection.

---

## 1. M0-A — Repository Discovery

### 1.1 Existing Work Preservation (captured before any change)

```text
git branch: main
git log -5: feb29d7 feat(design): add accessibility primitives …
git status: 368 entries (233 tracked files modified, ~41,459 insertions / 18,911 deletions
            + numerous untracked additions incl. backend/apps/borders_health/, backend/apps/hr/,
            frontend/src/pages/hr/, …)
```

Pre-existing uncommitted work **must not be reverted, overwritten, or bulk-formatted**. M0/M1 changes are strictly additive (new files) plus minimal, surgical edits to registration points (settings/urls/CI), each listed in §6.

| Capability | Evidence | Marker |
|---|---|---|
| Backend architecture | Django 5.0.14 + DRF; `backend/nqp_backend/settings.py` (`LOCAL_APPS` lines 47–83: 34 domain apps); shared layer `backend/core/` (`renderers.py`, `exceptions/`, `pagination.py`, `permissions/`) | `[M0-A-FOUND]` |
| Frontend architecture | React + Vite + TS; scripts `{dev, build, preview, test: vitest, lint}` in `frontend/package.json`; `frontend/src/{api,components,pages,store,hooks,types}` | `[M0-A-FOUND]` |
| Existing CI | `.github/workflows/ci.yml` — backend job (pytest, Postgres16+Redis7 services, lines 13–63), frontend job (lint/test/build, lines 65–85), docker publish jobs (lines 87–161); plus `mirror-infra-images.yml`, `mirror-postgres-image.yml` | `[M0-A-FOUND]` |
| Docker / Kubernetes | `deploy/docker-compose.yml` + dev/db/vps variants; `deploy/k8s/` (deployments, services, ingress, statefulset, secrets pattern) | `[M0-A-FOUND]` |
| Authentication | JWT via `simplejwt` — default auth class `settings.py:170-172`; `AuthViewSet.login` `backend/apps/accounts/views.py:52`; routes `backend/apps/accounts/urls.py` (`login/`, `refresh/`, `logout/`, `me/`); lockout `LoginSerializer.MAX_FAILED_ATTEMPTS=5`, `LOCK_MINUTES=15` `backend/apps/accounts/serializers.py:641-642`; national-ID login `get_user_by_identifier` `serializers.py:625-634`; `User.national_id` `models.py:102`; `UserType.TRAVELER` `models.py:84-86` | `[M0-A-FOUND]` |
| SUDAPASS integration | Field added then **removed**: `backend/apps/accounts/migrations/0015_remove_user_identity_verified_and_more.py` removes `user.sudapass_subject_id` (dated 2026-09-13); no code references in `backend/**.py` | `[M0-A-MISSING]` |
| OpenAPI generation | `drf-spectacular 0.27.2` in `backend/requirements/base.txt:5`; `SPECTACULAR_SETTINGS` `settings.py:338-342`; `/api/schema/` + `/api/docs/` `backend/nqp_backend/urls.py:21-22` | `[M0-A-FOUND]` |
| Response envelope | `core.renderers.EnvelopeRenderer` `backend/core/renderers.py:4`, registered `settings.py:177-181`; exception handler `core/exceptions/handlers.py:16` (adds `Retry-After` only; error bodies are raw DRF dicts **outside** the `{status,data,message}` mobile contract) | `[M0-A-PARTIAL]` (success envelope exists; approved bilingual error envelope for mobile does not) |
| Testing infrastructure | Backend: `pytest.ini` (`DJANGO_SETTINGS_MODULE`, `--reuse-db`, `testpaths=apps`); Frontend: `vitest` (`frontend/package.json`). **Runtime evidence:** `python -m pytest apps/accounts/tests/test_rbac.py -q` → `57 passed in 97.31s` (local Postgres 5432 + Redis 6379 up) | `[M0-A-FOUND]` |
| Mobile project | No `mobile/` directory; `backend/afyatna` is a **0-byte stray file** (not a project) | `[M0-A-MISSING]` |
| Root manifests | No root `package.json`, no root `pyproject.toml`, no `requirements/` at root (backend has `backend/requirements/{base,dev,prod}.txt`), no root `docker/` dir (`deploy/` instead) | `[M0-A-FOUND]` (structure differs from prompt's list; documented, not treated as absence) |
| Environment / secrets | `.env` + `.env.example` (root, gitignored); `deploy/k8s/secrets.yaml` is **placeholders only** with `kubectl create secret` / External-Secrets instructions in header (lines 5–14); real values injected at deploy time | `[M0-A-PARTIAL]` (pattern defined; no sealed-secrets/ESO automation in-repo) |
| `/api/v1/mobile/` namespace | Not present in `backend/nqp_backend/urls.py` (all 36 mounts enumerated, lines 18–64) | `[M0-A-MISSING]` |
| Root orchestration | `Makefile`, `AGENTS.md`, `scripts/dev-*.sh` | `[M0-A-FOUND]` |

---

## 2. M0-B — Phase 0 Consistency Audit

Repository state was checked against Phase 0 claims. **No contradictions found that require Phase 0 amendment**; all Phase 0 claims reproduced. Refinements noted where reality is more precise.

### 2.1 Authentication

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| JWT 30-min access / 7-day refresh | `settings.py:226-227` → `ACCESS_TOKEN_LIFETIME=1800s`, `REFRESH_TOKEN_LIFETIME=604800s` (env-overridable) | `[FOUND]` |
| National ID as login identifier | `LoginSerializer` accepts `identifier/email/phone/national_id` → `get_user_by_identifier()` `backend/apps/accounts/serializers.py:625-634,640-676` | `[FOUND]` |
| Account lockout 5 attempts / 15 min | `LoginSerializer.MAX_FAILED_ATTEMPTS=5`, `LOCK_MINUTES=15`, `register_failed_login(...)` `serializers.py:641-675` | `[FOUND]` |
| Refresh rotation + blacklist logout | `AuthViewSet.refresh` `views.py:114-122`; `logout` blacklists refresh token `views.py:131-143` | `[FOUND]` |
| SUDAPASS integration MISSING | No source references; `sudapass_subject_id` removed by migration `0015` (2026-09-13). Only stale UI label: `frontend/src/pages/profile/ProfilePage.tsx:568` shows "SUDAPASS" as static login-list text (cosmetic, `[PARTIAL]`) | `[MISSING]` (backend), `[PARTIAL]` (stale frontend label) |
| Traveler-type principals exist for object-level tests | `User.user_type` choices `TRAVELER`/staff `accounts/models.py:84-105` | `[FOUND]` |

### 2.2 Travel

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| Travel fragmented across carriers / port_health / borders_health | `backend/apps/carriers/models.py` (flights), `backend/apps/port_health/models.py`, `backend/apps/borders_health/` (present as **untracked new app** — consistent with ongoing consolidation work; not yet wired in `urls.py`? No: mounted at `urls.py:46` `/api/v1/borders-health/`) | `[PARTIAL]` (borders_health now a mounted app; fragmentation still real: three separate models/namespaces) |
| Traveler self-service portal | `backend/apps/travelers/` incl. `auth_views.py`, `views.py`, `tests/test_traveler_auth.py`, `tests/test_travelers.py` | `[REUSABLE]` |
| Cross-user access risk (no-go #6) pre-consolidation | Self-service isolation **does exist** today: `TravelerViewSet.get_object` ownership/session/staff check `backend/apps/travelers/views.py:136-152` (raises `NotFound` when not owned); `get_queryset` filters `qs.filter(user=user)` for traveler principals `views.py:154-159` | `[PARTIAL]` — baseline isolation FOUND for existing endpoint; must be **contract-tested** for mobile namespace and for any unified travel API |

### 2.3 Vaccination / QR

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| Certificate lifecycle + HMAC signature helpers | `VaccinationCertificate.verification_signature` `backend/apps/vaccination/models.py:263-278`; `signature_matches` `models.py:280-281` (`hmac.compare_digest`) | `[FOUND]` |
| Signature verification **optional** → no-go NG-04 | `backend/apps/vaccination/views.py:522-523`: `signature_ok = cert.signature_matches(signature) if signature else True` — request **without** `sig` is accepted (comment at 519-521 explicitly documents manual-entry-without-signature as intended). No test enforces mandatory signature | `[PARTIAL]` — confirmed still open; **NG-04 not cleared** |
| Public verification endpoints + throttling | `public/urls.py:34-35` (`verify-qr/`, `verify-certificate/`); `throttle_scope='traveler_lookup'` on `VerifyQr`-style views (`vaccination/views.py:505`); test-suite coverage in `vaccination/tests/test_vaccination.py` (grep `signature` matches) | `[FOUND]` |

### 2.4 Requirements

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| HealthNotice used as requirements proxy | `HealthNotice` model `backend/apps/carriers/models.py:482`; requirements built inline `backend/apps/public/views.py:540-557` (`requirements = [...]` handed to response at 557) served by `TravelRequirementsViewSet` (`public/urls.py:36`) | `[PARTIAL]` — confirmed: no dedicated `TravelRequirement` model (`grep class TravelRequirement` → none) |
| Destination/mode/date fields insufficient | No dedicated requirements model with effective dating; carried on notices/ad-hoc dicts | `[MISSING]` |

### 2.5 API Surface

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| All endpoints web-shaped; `/api/v1/mobile/` absent | `nqp_backend/urls.py:18-64` full mount list — no `mobile` include | `[MISSING]` |
| Envelope renderer on all responses | `settings.py:177-181` default renderers | `[FOUND]` |
| OpenAPI discoverable | `/api/schema/`, `/api/docs/` `urls.py:21-22` | `[FOUND]` |
| Internal-only: EOC | `EmergencyAlert`, `KillSwitch` `backend/apps/emergency_eoc/models.py:7,51`; views protected by RBAC `permission_classes=[PermissionAction]` `emergency_eoc/views.py:64,582` | `[INTERNAL]` |
| Internal-only: carrier APIs | `HasApiKey` `backend/apps/carriers/permissions.py:78` | `[INTERNAL]` |
| Internal-only: screening | `backend/apps/screening/views.py:17-31` `ScreeningViewSet` declares **no** `permission_classes` → falls back to global `IsAuthenticated` (`settings.py:173-175`). No role/staff check found (`grep permission|role screening/*.py` → no matches) | `[PARTIAL]` ⚠️ **refinement:** any authenticated principal (incl. traveler tokens) can currently reach screening/RiskAssessment read APIs. This contradicts the *intent* of the internal boundary. Not fixed in M1 (would modify a domain app); recorded as finding **SEC-M0-1** and mapped to NG-03/NG-06 risk for M2 |
| `db_admin` protected | `permission_classes=[PermissionAction]` `backend/apps/db_admin/views.py:87` | `[INTERNAL]` |
| Notifications device-token registration (for mobile push later) | `DeviceToken` `notifications/models.py:73-84`; `register-device` action `notifications/views.py:100-109` | `[REUSABLE]` |
| Error contract: approved bilingual envelope `{code, ar, en}` | Not present; DRF exceptions render raw `detail` dicts (handler `core/exceptions/handlers.py:16-27` only adds `Retry-After`) | `[MISSING]` → built in M1 for the mobile namespace only |

### 2.6 Security

| Phase 0 claim | Repository evidence | Marker |
|---|---|---|
| Default authN required | `settings.py:170-175` JWT + `IsAuthenticated` | `[FOUND]` |
| Object-level authorization (travelers) | `TravelerViewSet.get_object` `travelers/views.py:136-152`; tests `travelers/tests/test_travelers.py` | `[FOUND]` |
| QR signature mandatory (required by NG-04) | Optional: `vaccination/views.py:523` | `[PARTIAL]` → **NG-04 open** |
| Log scrubbing for SENSITIVE_HEALTH | No dedicated scrubbing middleware found in `settings.MIDDLEWARE` (`settings.py:90` block); relies on absence of logging of payloads | `[MISSING]` (mobile-scope scrubbing foundation built in M1) |
| Secrets not in repo | `deploy/k8s/secrets.yaml` = placeholders only; `.env` gitignored (`.gitignore` "Environment" block) | `[FOUND]` |

---

## 3. M0-C — Phase 17 Open Questions Review

Deliverable: `docs/mobile/M0_OPEN_QUESTIONS_STATUS.md` (separate file).

Summary: **7 P0 questions exist; 7 are unresolved (BLOCKED) — no approved decisions exist anywhere in the repository or project documentation** (Phase 0 documents record `Decision: _pending_` in `phase-17` status log). Consequences:

- `D-P0-1 (SUDAPASS)` = **BLOCKED** → `M2 = BLOCKED` (per Phase 1 contract §27)
- M0 itself can still PASS: M0 requires P0 blockers *identified*, not decided (Phase 1 contract §6)

---

## 4. M0-D — Architecture Baseline Confirmation

**Selected architecture (binding, `phase-11` ADR):**

```text
React Native + Expo (prebuild) + EAS        ← confirmed as Phase 0 decision
```

Mobile architecture must support (verified as design constraints for M1 scaffold): Arabic-first RTL, English toggle, secure storage, SQLite structured storage, encrypted sensitive KV, offline queue, idempotency, server-authoritative synchronization.

**Not selected** (must not appear): Flutter, native-only Android/iOS, PWA-as-primary, Ionic, other frameworks.  
Repository state: no competing mobile project exists (`[M0-A-MISSING]` for any `mobile/`), so no conflict to resolve. No approved amendment to phase-11 exists → decision stands.

---

## 5. M0 ACCEPTANCE GATE

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Repository baseline captured | ✅ PASS | §0 git state + §1 discovery table (runtime test evidence: `57 passed`) |
| 2 | Existing work preserved | ✅ PASS | No existing file modified during M0 (M0 is read-only; git status snapshot above) |
| 3 | Phase 0 documents reconciled | ✅ PASS | §2 audit — no contradictions requiring amendment; 2 refinements (borders_health mounted; screening permission gap SEC-M0-1) |
| 4 | Phase 17 reviewed | ✅ PASS | `M0_OPEN_QUESTIONS_STATUS.md` — all 15 questions listed, owners assigned, P0 marked BLOCKED |
| 5 | P0 blockers identified | ✅ PASS | Q1–Q4, Q6, Q8 (+ dependent Q5) identified as BLOCKED in §3 |
| 6 | SUDAPASS traveler-only boundary recorded | ✅ PASS | Boundary restated: SUDAPASS = traveler identity only; institutional authN/authZ (RBAC `PermissionAction`, `HasApiKey`) unchanged — §6.1 |
| 7 | Internal-user authentication boundary recorded | ✅ PASS | Internal users keep JWT+RBAC; mobile tokens must never gain staff roles — §6.1 |
| 8 | No-go conditions mapped | ✅ PASS | §6.2 NG-01…NG-06 with current status |
| 9 | Mobile architecture confirmed | ✅ PASS | §4 |
| 10 | M1 scope frozen | ✅ PASS | §6.3 |

### M0_GATE = **PASS**

(P0 questions are *identified and BLOCKED* — this blocks D-P0-1/M2, not M0.)

---

## 6. Recorded Baselines

### 6.1 Authentication Boundaries (binding)

```text
TRAVELER identity:  /api/v1/auth/* (national-ID JWT) — existing
                    + SUDAPASS OIDC (D-P0-1) — BLOCKED, traveler-only when built
INSTITUTIONAL:      JWT + RBAC (PermissionAction / role assignments) — unchanged
                    employees, inspectors, managers, admins, EOC, carriers — NOT via SUDAPASS
OFFLINE:            existing trusted session + authorized cached ops only.
                    No new trusted identity offline. No authN/authZ bypass when IdP down.
MOBILE TOKENS:      must never carry staff/EOC/carrier scopes (contract-tested in M1.5)
```

### 6.2 No-Go Conditions — Current Status

| ID | Condition | Status now | Cleared by |
|---|---|---|---|
| NG-01 | Trustworthy traveler authN boundary | **OPEN** (SUDAPASS missing; national-ID JWT exists as interim) | D-P0-1 — BLOCKED on Q8 |
| NG-02 | Mobile authZ / object-level isolation | **OPEN** (baseline exists `travelers/views.py:136-159`, no mobile contract tests yet) | M1.5 contract tests + later mobile endpoints |
| NG-03 | Sensitive health data exposed via mobile/public APIs | **OPEN-RISK** (screening reachable by any authenticated token — SEC-M0-1) | M1.6 classification contract + M2 screening authZ fix |
| NG-04 | QR signature mandatory | **OPEN** (`vaccination/views.py:523` accepts unsigned) | D-P0-3 (M2) |
| NG-05 | Data ownership/privacy boundary undefined | Defined in `phase-15`; acceptance pending | phase-15 sign-off at M0 (documented) |
| NG-06 | Cross-traveler access via unified travel APIs | **OPEN** (unified travel model doesn't exist yet; existing endpoint isolated) | D-P1-1 isolation tests |

### 6.3 M1 Scope Freeze (only these; nothing else)

```text
M1.1 CI/CD skeleton (additive lanes: contract, security baseline, mobile lint/typecheck/unit/build)
M1.2 mobile/ project bootstrap (Expo prebuild architecture, no business logic)
M1.3 /api/v1/mobile/ OpenAPI draft (contract stubs, explicit 501, no fabricated data)
M1.4 shared contract package (TS + Zod, OpenAPI-consumable)
M1.5 contract tests (authZ, authorization, internal boundary, envelope, versioning, classification)
M1.6 classification foundation (5-level registry, INTERNAL-never-mobile invariant)
M1.7 AuthProvider abstraction (SUDAPASS = blocked seam only)
M1.8 security foundation interfaces (status-labeled, never overstated)
M1.9 offline foundation (state machine DRAFT→…→CONFLICT, no business conflict logic)
M1.10 observability foundation (scrubbing: SENSITIVE_HEALTH → SCRUBBED tested)
M1.11 performance baseline record (BASELINE/TARGET/MEASURED/GAP, no unmeasured claims)
M1.12 evidence package (6 docs/mobile reports)
```

Explicitly **out of scope for M1**: any P0 business implementation (SUDAPASS client, unified travel model, requirements engine, QR mandatory-signature enforcement, screening permission fix), destructive refactors, edits to existing domain app behavior.

---

## 7. Findings Requiring Attention (carried forward)

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| SEC-M0-1 | `ScreeningViewSet` has no role/permission check beyond global `IsAuthenticated` → traveler tokens can read screening + risk assessments (`screening/views.py:17-31`) | High | Not fixed in M1 (domain app, M2 scope). Classified as INTERNAL in mobile contract registry so it can never be mobile-bound; mapped to NG-03 |
| SEC-M0-2 | QR verification accepts requests without signature (`vaccination/views.py:523`) | High | NG-04 open; D-P0-3 (M2) |
| DOC-M0-1 | `backend/afyatna` 0-byte stray file | Low | Left untouched (pre-existing untracked) |
| UI-M0-1 | Stale "SUDAPASS" label in `frontend/src/pages/profile/ProfilePage.tsx:568` | Low | M2/UI backlog; no functional integration implied |

---

## 8. Change Log for This Report

- M0 executed read-only: **zero** tracked files modified. (M1 changes begin only after M0 PASS and are listed in `M1_IMPLEMENTATION_REPORT.md`.)
