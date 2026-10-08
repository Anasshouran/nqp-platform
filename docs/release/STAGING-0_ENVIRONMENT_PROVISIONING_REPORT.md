# STAGING-0 ENVIRONMENT PROVISIONING REPORT

**Date:** 2026-10-08  
**Phase:** STAGING-0 (infrastructure/environment preparation for M4)

---

## 1. Executive Summary

STAGING-0 **BLOCKED — OWNER INPUT REQUIRED**.

Discovery completed (read-only); dependent staging-configuration portions not executed because the owner-approved application identities, staging host, and test account were **not supplied**. No values were fabricated; no production stack was found running; no staging stack was created.

## 2. Infrastructure Discovery (read-only, Gate §3)

```text
host: parrot (local dev container host)
docker: Docker version20.10.24+dfsg1
compose: Docker Compose version 2.26.1-4
running containers (dev stack only):
  afyatna-redis-dev    redis:7
  afyatna-db-dev       ghcr.io/anasshouran/postgres:16-alpine
  nqp-minio            minio/minio:latest
PRODUCTION STACK DISCOVERED: none currently running on this host (dev stack only)
STAGING TARGET: none exists
```

- Deploy inventory: `deploy/docker-compose.yml`, `docker-compose.db.yml`, `docker-compose.dev-vps.yml`, `deploy/nginx/{nginx.conf,nginx.dev.conf}`, `deploy/ssl/`, `deploy/k8s/`. No `deploy/staging/` present.
- No staging database/Redis/backend/service/compose stack exists.
- No production data/services present to protect (dev stack only).

## 3. Owner Input Verification (§2) — all missing

| Required Owner Input | Status | Entered |
| --- | --- | --- |
| `android.package` | **BLOCKED — OWNER INPUT REQUIRED** | not supplied |
| `ios.bundleIdentifier` | **BLOCKED — OWNER INPUT REQUIRED** | not supplied |
| `STAGING_API` / `EXPO_PUBLIC_API_URL=https://<STAGING_API_HOST>` | **BLOCKED — OWNER INPUT REQUIRED** | not supplied |
| `STAGING_TEST_ACCOUNT` (+ creds) | **BLOCKED — OWNER INPUT REQUIRED** | not supplied |

No values were invented. Dependent portions (§5–§17 wiring) were not executed.

## 4. Isolation Strategy Determination (ready to execute once inputs arrive)

Given the available infrastructure (single host, no live production), the s
---

**No configuration was applied.** The foregoing is evidence + a readiness plan; where the prompt demands a value that is owner-controlled, the item is marked blocked rather than populated.

## 5. Topology (planned, upon owner inputs)

```text
Internet
   │ HTTPS
   ▼
Staging Nginx (deploy/staging/nginx, valid conf before reload)
   │
Staging Backend (nqp_backend, DEBUG=False, locked hosts/CORS/CSRF, env secrets)
   │
 ┌──────────────┴──────────────┐
▼                              ▼
STAGING PostgreSQL            STAGING Redis
(no credentials shared w/ prod) (separate container/DB)
```

## 6. M4 Prerequisite Matrix (end-of-phase, §22)

| M4 prerequisite | Status | Evidence |
| --- | --- | --- |
| android.package | **BLOCKED** | not supplied |
| ios.bundleIdentifier | **BLOCKED** | not supplied |
| EXPO_PUBLIC_API_URL | **BLOCKED** | not supplied |
| staging HTTPS | **BLOCKED** | not configured (no staging host) |
| staging backend | **BLOCKED** | not provisioned (no inputs) |
| staging PostgreSQL | **BLOCKED** | not provisioned |
| staging Redis | **N/A/BLOCKED** | not provisioned |
| staging credentials | **BLOCKED** | owner input required |
| synthetic test data | **BLOCKED** | pending host/account |
| mobile staging configuration | **BLOCKED** | awaiting IDs + API URL |
| EAS staging profile | **BLOCKED / CONDITIONED** | needs app IDs + EAS credentials |
| environment isolation | **PARTIAL (affirmed so far)** | dev host only, no live production stack running; no resource sharing exists today |
| security configuration | **CONDITIONED** | runbook sec config will be applied once stack exists |
| health checks | **BLOCKED** | nothing to probe yet |

## 7. Integrity Statement (§25)

```text
PRODUCTION MODIFIED = NO
PRODUCTION RESTARTED = NO
PRODUCTION DATABASE ACCESSED = NO
PRODUCTION DATABASE MODIFIED = NO
PRODUCTION SECRETS USED = NO
STAGING DATABASE = NOT CREATED (blocked)
STAGING REDIS = NOT CREATED (blocked)
STAGING API = NOT CONFIGURED (blocked)
STAGING HTTPS = UNVERIFIED (blocked on host)
ANDROID PACKAGE = NOT SET (owner input required)
IOS BUNDLE IDENTIFIER = NOT SET (owner input required)
EAS PROFILE = NOT CREATED (blocked)
REAL TRAVELER DATA USED = NO
SYNTHETIC DATA USED = NO (none created yet)
DATABASE MIGRATIONS APPLIED = NONE (none executed)
UNRELATED FILES MODIFIED = NONE
PRE-EXISTING WORKTREE CHANGES PRESERVED = YES
```

## 8. Findings

| ID | Item | Severity |
| --- | --- | --- |
| S0-1 | Owner app IDs + staging host + test account missing | BLOCKER (prerequisite) |
| S0-2 | `deploy/staging/` does not exist | expected — blocked on inputs |
| S0-3 | No secrets provisioning mechanism for staging | operational dependency once inputs arrive |

## 9. Next Steps (to unblock STAGING-0)

(Supply and then I will execute; no execution this run.)

1. Owner provides `android.package`, `ios.bundleIdentifier`.
2. Owner provides `STAGING_API_URL` (`https://<STAGING_API_HOST>`) + staging test account/credentials (non-production).
3. Owner confirms staging host (the dev host `parrot` can host an isolated stack only if no production runs here — acceptable; otherwise a separate VPS per M3 runbook).
4. On receipt: create `deploy/staging/docker-compose.yml` + `.env.example` + README (isolated network/DB/Redis, env-secrets pattern), configure reverse proxy staging vhost (validated `nginx -t`), provision secrets externally, set `EXPO_PUBLIC_API_URL`, create synthetic fixtures (traveler STAGING-001 / cert / notif / requirement), run `migrate --plan`/`migrate` on the staging DB, `check`, smoke-test (DNS/HTTPS/health/mobile-api/auth/traveler), and produce the M4 A–V prerequisite matrix.

## 10. Final Verdict

`STAGING-0 BLOCKED — OWNER INPUT REQUIRED`