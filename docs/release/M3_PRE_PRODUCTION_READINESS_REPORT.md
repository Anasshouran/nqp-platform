# M3 PRE-PRODUCTION READINESS REPORT

**Date:** 2026-10-08  
**Phase:** M3 — Pre-Production Readiness & Release Gate (READ/VERIFY/HARDEN)

---

## 1. Executive Summary

Validated the accepted M2 stack for move toward controlled staging. The **code is ready**: all M2 test/security baselines reproduce green (backend 215, mobile 114, contracts 11), builds/OpenAPI/scans pass, no debug routes, no committed secrets, placeholder-secret runtime guard present, HTTPS termination exists in deploy configs. Findings are dependency/config/operational, not code defects: **4 HIGH backend dependency findings** (Django 5.0.14 EOL line with 12 advisories; DRF 3.15, simplejwt 5.3, cryptography 43 pins blocking fixes), **1 HIGH mobile toolchain advisories** (23 high/0 critical, build-time expo/metro chain), **1 HIGH missing Android applicationId** for EAS builds, plus MEDIUM env/backup/observability items. **No BLOCKERs.** Decisions: **CODE READY · STAGING: READY WITH CONDITIONS · PRODUCTION: NOT ASSESSED**.

## 2. Accepted M2 Baseline

M2-A/B/C1/C2/D1/D2/E as stated; reproduced in §15/§18 below.

## 3. Environment Inventory (Gate A)

```text
main @ feb29d7 · worktree 416 entries (preserved) · Python 3.13.5 · Django 5.0.14
Node 22.14.0 · npm 10.9.2 · expo ~57.0.27 · RN 0.86.3 · TS ~6.0.3
PostgreSQL (docker/k8s statefulset) · Redis 7 (compose/k8s)
Config sources: backend/nqp_backend/settings.py (env-driven), .env* (gitignored),
deploy/.env.example (tracked, placeholders), deploy/k8s/secrets.yaml (placeholders)
PRE-EXISTING CHANGES PRESERVED = YES
```

## 4. Configuration Audit (Gate B)

| Item | Class | Where | Staging/Prod rule |
| --- | --- | --- | --- |
| SECRET_KEY / JWT_SECRET_KEY | SECRET | env (placeholder + **runtime prod guard**) | from k8s secret |
| DB/Redis/MinIO creds | SECRET | env | from k8s secret; never committed |
| API base URL | ENVIRONMENT/BUILD-TIME | `EXPO_PUBLIC_API_URL` (mobile) | HTTPS per env; default localhost is dev-only |
| ALLOWED_HOSTS/CORS | ENVIRONMENT | settings.py (localhost defaults) | set per env; CORS allow-all is DEBUG-only |
| DEBUG | RUNTIME | default False | False in staging/prod |
| Throttling | RUNTIME | DRF anon/user/scoped rates | active (tests raise limits only under test flag) |
| TLS | ENVIRONMENT | nginx 443 + ingress `tls:` | terminate TLS; SECURE_SSL_REDIRECT opt-in |
| Telemetry/monitoring | — | not provisioned | OPERATIONAL DEPENDENCY |

## 5. Secret/Credential Audit (Gate C)

Secret scan (tracked files): **clean** (no committed JWT/DB/API secrets). `.env`, `backend/.env`, `deploy/.env.who` gitignored (untracked local). `deploy/.env.example` = placeholders; `deploy/k8s/secrets.yaml` = placeholders + `kubectl create secret` instructions. `settings.py` **refuses placeholder SECRET_KEY in production mode** (settings.py:24-26). Rotation procedure: documented in runbook §1/§7. `PRODUCTION SECRETS FOUND IN REPO = NO`.

## 6. Database/Migration Safety (Gate D)

`python manage.py makemigrations --check --dry-run` → **No changes detected**. No pending migrations; historical migrations include prior RemoveField operations (already-applied, pre-existing). Mobile APIs use existing indexes/FKs (user/traveler/certificate/port). Transactions: domain services use atomic flows; no destructive migration in this phase. `DATABASE CHANGES = NONE` · `MIGRATIONS CREATED = NONE` · `MIGRATIONS APPLIED (this phase) = NONE`.

## 7. API/OpenAPI Release Contract (Gate E)

`manage.py spectacular` → valid; **12 `/api/v1/mobile/` paths**; contract snapshot parity green; error envelopes bilingual; auth/ownership semantics contract-tested; no debug/test/dev-only routes in `nqp_backend/urls.py` (grep clean; admin mounted but admin-auth protected; schema docs at `/api/schema/`,`/api/docs/` are intentional). CORS/HTTPS assumptions recorded in §4.

## 8. Backend Security Configuration (Gate F)

| Setting | Current | Staging | Production | Evidence |
| --- | --- | --- | --- | --- |
| DEBUG | env, default False | False | False | settings.py:15 |
| ALLOWED_HOSTS | localhost default | explicit hosts | explicit hosts | settings.py:16 |
| CORS allow-all | `= DEBUG` | False | False | settings.py:154 |
| Secure cookies/HSTS/nosniff/DENY | on when `not DEBUG` | on | on (+SSL redirect) | settings.py:156-167 |
| SECURE_SSL_REDIRECT | default False (env) | **True (condition)** | True | settings.py:160 |
| Throttling | anon 100/min + scoped | active | active | settings.py:190+ |
| Password/auth | simplejwt 30m/7d, lockout 5/15 | active | active | serializers.py:641 |

## 9. Mobile Build Configuration (Gate G)

app.json: slug `afyatna`, version 1.0.0, secure-store plugin. Findings: **no `android.package`/`ios.bundleIdentifier` (HIGH)** → EAS build identity not configured; `EXPO_PUBLIC_API_URL` defaults to localhost — staging builds must set HTTPS URL (MEDIUM, runbook-enforced); no debug auth/secrets in client; SecureStore enabled; `no-console` lint gate = no debug logs path. Strongest non-device build: `npx expo export --platform android` → **OK (LOCAL BUILD evidence only)**.

## 10. TLS/Network Security (Gate H)

Deploy has TLS termination: `deploy/nginx/nginx.conf` (`listen 443 ssl`, cert paths) and `deploy/k8s/ingress.yaml` (`tls:`). Mobile source has **no hardcoded http:// endpoints** (grep clean; only env-scoped localhost dev defaults). Exceptions: localhost/10.0.2.2 defaults in `mobile/src/config.ts` — **environment-scoped, dev-only, documented as condition (MEDIUM)**. TLS validation/cert pinning scaffold intact (not weakened).

## 11. Observability (Gate I)

Present: `/api/v1/health/` endpoint; container/nginx logs; Sentry-style telemetry seam client-side (scrubbed). **Not present in-repo:** Prometheus/Grafana/Uptime deployment → **OPERATIONAL DEPENDENCY (MEDIUM)**. Privacy-safe logging per M2-D2 verified. Interim requirement documented in runbook (HTTP health check + 5xx log alerting).

## 12. Backup/Recovery/Rollback (Gate J)

Backup: **manual `pg_dump` procedure documented only** (`deploy/README-DEV-DEPLOY.md:161`); no scheduled backups, retention, or restore drill evidence → **BLOCKED — OPERATIONAL DEPENDENCY** (owner: Ops; runbook §6). App rollback: `scripts/dev-rollback.sh` (image-only, safe-guarded) ✓; K8s `rollout undo` path documented; mobile rollback = store phased-release halt/OTA (native-store latency documented; no device rollback test — LOCAL).

## 13. Performance/Capacity (Gate K)

LOCAL only: API p95 worst **47.8 ms** (loopback, n=30); cache ~0.05 ms/op (jest). Targets from contract: p95 ≤1500 ms. **STAGING PERFORMANCE = NOT MEASURED**; **NETWORK/PRODUCTION = NOT MEASURED**. Capacity planning inputs (travelers/day, POE concurrency, DB connections) — **not defined in-repo** → must be measured/estimated on staging before production.

## 14. Mobile Release Smoke (Gate L)

Strongest available = automated journeys (LOCAL): login→home→profile→requirements→certificates→detail→health→notifications→sync (screen tests), offline bootstrap, reconnect (RECONNECTING→SYNCING→SERVER WINS→SYNCED), logout purge, session-expiry purge — **all green** (mobile 114). RTL ar + LTR en covered; no crashes/fake data/token logging (tests). No real-device/EMULATOR run performed (LOCAL only).

## 15. Security Regression (Gate M)

Re-ran critical suites: traveler isolation/IDOR, server-owned fields, `medical_history` guard, QR fail-closed, cache isolation (logout/switch/expiry), telemetry scrub, forbidden-set parity (client↔server sync test), error leakage → **backend 215 passed; mobile 114 passed; 0 regressions vs M2-E**.

## 16. Dependency Review (Gate N)

| Surface | Tool | Result |
| --- | --- | --- |
| Backend (`requirements/base.txt`) | pip-audit | **28 advisories / 5 packages** (exit 1): django 5.0.14 (12; EOL line, pins `<5.1`), DRF 3.15.2 (2), simplejwt 5.3.1 (1), cryptography 43.0.3 (8), python-dotenv 1.0.1 (1) |
| Mobile (`npm audit --omit=dev`) | npm audit | **23 high / 12 moderate / 0 critical** — expo/metro/jest toolchain (direct: expo, react-native) |
| Lockfiles | integrity | committed, consistent |

**Critical = 0.** All backend fixes require controlled pin-bump + regression (not performed here — “no uncontrolled upgrades”). Classification: **HIGH** (see Findings).

## 17. Artifact Integrity (Gate O)

```text
openapi.yaml (12 mobile paths)      sha256:04f719bd8df5df2b… (LOCAL artifact)
contracts/package-lock.json         sha256:575214d8652b58b3…
expo android export metadata.json   sha256:100999729d6a8cba…
backend image: built by CI (GHCR tags by short-sha; no local image built this phase)
```
No signing evidence exists → **artifacts not claimed signed**. Reproducible backend build = CI-defined (Dockerfile in `backend/`).

## 18. Operational Runbook (Gate P)

Created: `docs/release/M3_PRE_PRODUCTION_RUNBOOK.md` (prerequisites, env/secret table, deploy paths, smoke commands, rollback matrix, backup gap, incident/privacy, deferred items). No invented infrastructure.

## 19. Findings & Severity

| ID | Finding | Severity | Owner | Deadline |
| --- | --- | --- | --- | --- |
| M3-H-1 | Backend runtime deps with advisories + pins blocking fixes (django 12, DRF 2, simplejwt 1, cryptography 8, dotenv 1) | **HIGH** | Backend/Security | before public staging |
| M3-H-2 | Mobile prod-dep advisories 23 high/0 critical (expo/metro build chain) | **HIGH** | Mobile | before EAS staging build |
| M3-H-3 | `android.package`/`ios.bundleIdentifier` missing (EAS build identity) | **HIGH** | Mobile/Ops (owner approves applicationId) | before staging build |
| M3-M-1 | `EXPO_PUBLIC_API_URL` localhost default (must be env-forced) | MEDIUM | Mobile/Ops | at build config |
| M3-M-2 | Backups manual only (no schedule/retention/drill) | MEDIUM → runbook flags **OPERATIONAL DEPENDENCY** | Ops | before production |
| M3-M-3 | Observability stack absent (only health + logs) | MEDIUM (OPERATIONAL DEPENDENCY) | Ops | before production |
| M3-M-4 | `SECURE_SSL_REDIRECT` default off; ALLOWED_HOSTS/CORS localhost defaults | MEDIUM | Ops | staging env config |
| M3-PG-1 | Statutory retention policy (Q2) | POLICY GAP | Legal | — |
| M3-PG-2 | Institutional `declaration` risk display | POLICY GAP | Domain owner | — |

## 20. Release Blockers

**BLOCKER list: EMPTY.** (No secret exposure, no insecure auth, no cross-user leakage, no HTTP production endpoint, no debug auth, no destructive migration, no critical dependency, no broken required rollback, no security bypass.)

## 21. Final Release Matrix

| Gate | Area | Result | Evidence |
| --- | --- | --- | --- |
| A | Release Baseline | **PASS** | §3 |
| B | Environment Config | **PASS** (conditioned) | §4 |
| C | Secrets/Credentials | **PASS** | §5 |
| D | Database/Migrations | **PASS** (NONE) | §6 |
| E | API/OpenAPI Contract | **PASS** | §7 |
| F | Backend Security Config | **PASS** (env-set conditions) | §8 |
| G | Mobile Build Config | **PASS WITH FINDINGS** | §9 (H-3, M-1) |
| H | TLS/Network | **PASS** | §10 |
| I | Observability | **BLOCKED — OPERATIONAL DEPENDENCY** | §11 |
| J | Backup/Recovery | **BLOCKED — OPERATIONAL DEPENDENCY** | §12 |
| K | Performance/Capacity | **NOT MEASURED (staging)** | §13 |
| L | Mobile Smoke | **PASS** (LOCAL) | §14 |
| M | Security Regression | **PASS** (0 regressions) | §15 |
| N | Dependency Review | **FAIL → HIGH findings** (0 critical) | §16 |
| O | Artifact Integrity | **PASS** (unsigned-not-claimed) | §17 |
| P | Operational Runbook | **PASS** (created) | §18 |
| Q | Release Blockers | **NONE** | §20 |

## 22. CODE Readiness

**READY** — code/tests/scans green; no blocking code defect; HIGH items are dependency/config/identity, not behavior regressions.

## 23. STAGING Readiness

**READY WITH CONDITIONS**
1. M3-H-1: remediate dependency pins (django ≥5.1/5.2 line, DRF 3.17.2, simplejwt 5.5.1, cryptography ≥49) **or** documented risk-acceptance, with full regression — before public staging exposure.
2. M3-H-3: owner-approved `android.package` before EAS staging build.
3. M3-M-1/M-4: set `EXPO_PUBLIC_API_URL=https://…`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `SECURE_SSL_REDIRECT=True`, `DEBUG=False`.
4. Secrets provisioned externally (runbook §1); HTTPS verified on ingress.
5. Interim health/5xx monitoring + manual backup cadence started (M-2/M-3 interim).

## 24. PRODUCTION Readiness

**NOT ASSESSED** — no production infrastructure, staging measurements, backup drills, or capacity evidence available in this environment.

## 25. Deferred Items

SUDAPASS (DEFERRED) · Declaration Write (DEFERRED) · M3-H-1/H-2 dependency remediation · M3-H-3 applicationId · backup/monitoring automation · statutory retention Q2 · institutional declaration display.

## 26. Scope Integrity

`unrelated files modified = NONE` · `pre-existing worktree changes preserved = YES` · no broad refactors · no destructive migrations · no debug/bypass auth introduced · no secrets committed.

## 27. Required Integrity Statement

```text
DATABASE CHANGES                = NONE
MIGRATIONS CREATED              = NONE
MIGRATIONS APPLIED              = NONE (this phase)
SUDAPASS STATUS                 = DEFERRED (not implemented/mocked/assumed)
DECLARATION WRITE STATUS        = DEFERRED (no writes/queue/UI)
PRODUCTION SECRETS FOUND IN REPO= NO
DEBUG AUTH FOUND                = NO
HTTP PRODUCTION ENDPOINTS FOUND = NO (localhost defaults are env-scoped dev-only; TLS at nginx/ingress)
CRITICAL DEPENDENCY FINDINGS    = 0 critical (backend HIGH: django/DRF/simplejwt/cryptography/dotenv; mobile HIGH: 23 toolchain advisories)
PRE-EXISTING WORKTREE CHANGES   = PRESERVED = YES
UNRELATED FILES MODIFIED        = NONE
```

## Final Verdict

`M3 ACCEPTED — CODE READY · STAGING READY WITH CONDITIONS · PRODUCTION NOT ASSESSED`