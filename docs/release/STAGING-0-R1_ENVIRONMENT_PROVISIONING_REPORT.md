# STAGING-0-R1 ENVIRONMENT PROVISIONING REPORT

**Date:** 2026-10-08  
**Phase:** STAGING-0-R1 — Environment Provisioning After Owner Approval

---

## 1. Executive Summary

Owner approved application identity **is now configured** (`com.afyatna.app` for both Android and iOS). A `deploy/staging/` scaffolding was created with **isolated** network/DB/Redis/network/config (not running). However the required **real staging host / DNS / HTTPS / EAS credentials / staging test account were NOT provided**, so the environment cannot be considered provisioned/release-ready.

**Verdict:** `STAGING-0-R1 BLOCKED — OWNER/OPS INPUT REQUIRED`

## 2. Verdict

`STAGING-0-R1 BLOCKED — OWNER/OPS INPUT REQUIRED`
(same as previous run; advancement achieved on identity only)

## 3. Owner Inputs

| Input | Value | Source |
| --- | --- | --- |
| android.package | `com.afyatna.app` | APPROVED by owner (applied to `mobile/app.json`) |
| ios.bundleIdentifier | `com.afyatna.app` | APPROVED by owner (applied to `mobile/app.json`) |
| Display name | `عافيتنا \| AFYATNA` | APPROVED by owner (applied to `app.json`) |
| EXPO_PUBLIC_API_URL (staging host) | **MISSING** | not provided → BLOCKED |
| staging DNS | **MISSING** | not provided → BLOCKED |
| EAS credentials / Google / Apple | **MISSING** | not provided → BLOCKED |

## 4. Host Discovery

```text
host: parrot · docker 20.10.24+dfsg1 · compose 2.26.1-4
running: afyatna-redis-dev, afyatna-db-dev, nqp-minio (dev stack only)
production containers/networks: none detected
staging containers: none
```

## 5. Production Safety Verification (GATE B)

PASS — `docker ps` shows only `afyatna-*` dev + `nqp-minio`; no `nqp-staging-*`, no prod DB/Redis accessed; no production credentials used.

## 6. Staging Architecture

Planned (defined, not started): `deploy/staging/docker-compose.yml` with `nqp-staging-postgres`, `nqp-staging-redis`, `nqp-staging-backend`, `nqp-staging-frontend`, `nqp-staging-nginx` on dedicated network `nqp-staging-net` — separate from dev (`afyatna-*`/`nqp-minio`) and absent production. `docker compose config` validates structurally (only unset-env warnings, expected).

## 7. Staging Services (defined vs running)

| Service | Defined | Running | Isolated |
| --- | --- | --- | --- |
| backend | yes | **no (blocked: host/secrets not supplied)** | yes (own container+net) |
| PostgreSQL | yes (`nqp-staging-postgres`) | no | separate container/volume |
| Redis | yes (`nqp-staging-redis`) | no | separate container/volume |
| nginx | yes (`nqp-staging-nginx`) | no | staging conf + own TLS mount |
| frontend | yes | no | separate |

## 8. PostgreSQL Isolation

Defined as separate from dev DB (`afyatna-db-dev`) and any production DB (none present). No connections made yet; **DATABASE MIGRATIONS APPLIED = NONE**.

## 9. Redis Isolation

Defined as separate `nqp-staging-redis`; no prod/dev Redis touched. **REDIS ISOLATED-DEFINED (not running).**

## 10. Storage Isolation

Not required for this readiness path (M2-A mobile endpoints are contract/read paths; `MINIO` optional in `.env.example` only when `USE_S3`). Documented as `N/A — conditional`; no production bucket referenced.

## 11. Secrets Management

`deploy/staging/.env.example` contains **placeholders only**; `deploy/staging/.env` is gitignored (`git check-ignore` → ignored). No secrets committed. No production secret reused. Secret scan run over new files → clean (placeholders only).

## 12. DNS

**BLOCKED** — no staging hostname supplied; cannot verify resolution.

## 13. HTTPS/TLS

**BLOCKED** — no staging host/cert provisioned. Template `deploy/staging/nginx/staging.conf` expects valid TLS (`<staging-host>` + `tls/` mount); **no HTTP-only acceptance**. Not yet verifiable via curl/openssl.

## 14. Backend Configuration

`docker-compose.yml` (staging) enforces `DEBUG=False`, `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS`/`CORS_ALLOWED_ORIGINS`/`SECRET_KEY`/`SECURE_SSL_REDIRECT=True`/secure cookies — mirroring production posture. Reverse-proxy forwarded-host/ proto applied. `check --deploy` not executed (stack not started) → `NOT MEASURED`.

## 15. Mobile Configuration

`mobile/app.json` now carries:
```text
android.package=com.afyatna.app
ios.bundleIdentifier=com.afyatna.app
name=عافيتنا | AFYATNA
```
`EXPO_PUBLIC_API_URL` staging value **BLOCKED** (no host). Development retains localhost default (config.ts), which is intentional dev-only.

## 16. Application Identity (GATE A)

**PASS** — exact approved identity applied; JSON parses; dev stack unaffected. No conflicting IDs found in repository (`grep` for old/placeholder/dev IDs ➜ none).

## 17. EAS Configuration

`mobile/eas.json` created with `development`/`staging`/`production` build profiles (no fabricated projectId/credentials); staging profile sets `EXPO_PUBLIC_API_URL` via CLI/dashboard injection (placeholder not used as live URL). **EAS BUILD = NOT EXECUTED — CREDENTIALS/PROJECT INPUT BLOCKED.**

## 18. Synthetic Test Data

**NONE created** (no DB/host yet). Will create only synthetic fixtures on first provision.

## 19. Test Account

`BLOCKED — OWNER/OPS INPUT REQUIRED` for exact approved synthetic traveler credentials; none provisioned.

## 20. Network Isolation

Defined isolation model (§6): staging services on `nqp-staging-net` only; no path to production DB/Redis. Runtime validation (e.g., `docker network inspect`) will occur once running.

## 21. Backup Baseline

Documented intent in README (use `pg_dump` against the staging DB; restore with synthetic data only; never touch prod backups). **BLOCKED/CONDITIONED:** no automated schedule — operational dependency (consistent with M3-M-2).

## 22. Observability Baseline

**BASELINE / LIMITED** — container logs + health endpoint + reverse-proxy logs only. No Prometheus/Grafana/Uptime deployed (operational dependency; not fabricated). Bootstrap verification occurs once running.

## 23. Security Validation

- `python manage.py check` (dev) normally clean — unchanged this phase.
- `.env`/secrets not committed (git-ignored).
- Secret scan over `deploy/staging/` + `mobile/eas.json` + `app.json` → clean (placeholders only).
- No debug auth, no fake SUDAPASS, no declaration writes introduced.

## 24. Regression Results

Only `mobile/app.json` (identity fields) + new `deploy/staging/*` + `mobile/eas.json` changed. No production source code/logical behavior changed → regression prerequisite for M4 not yet executed (`M4` not started). Existing suites remain the M3-R1 baseline.

## 25. Build Results

EAS build not executed (no credentials/project). Local export validation performed earlier (M3-R1: Android export OK). Full staging build validation requires the staging host + EAS or local export with staging API — blocked.

## 26. M4 Prerequisite Matrix

| M4 Prerequisite | Status | Evidence |
| --- | --- | --- |
| Android package | **PASS** | `com.afyatna.app` set in `app.json` |
| iOS bundle ID | **PASS** | `com.afyatna.app` set in `app.json` |
| Staging API URL | **BLOCKED** | owner host not supplied |
| DNS | **BLOCKED** | not configured |
| HTTPS/TLS | **BLOCKED** | no cert/host |
| Staging backend | **BLOCKED** | stack defined, not started |
| Staging PostgreSQL | **BLOCKED** | stack defined, not started |
| Staging Redis | **BLOCKED** | stack defined, not started |
| Storage isolation | **PASS (N/A)** | conditional only |
| Secrets | **PASS (externalized)** | placeholders only; `.env` gitignored |
| Synthetic test account | **BLOCKED** | credentials required |
| Mobile staging config | **PARTIAL** | IDs PASS; URL blocked |
| EAS profile | **CONDITIONED** | eas.json present; credentials absent |
| EAS credentials | **BLOCKED** | not provided |
| Network isolation | **PASS (config)** | isolated network defined; runtime validation pending |
| Backup baseline | **CONDITIONED** | documented; no automation |
| Observability baseline | **CONDITIONED** | LIMITED; external platform absent |
| Production safety | **PASS** | no prod touched/accessed/used |

## 27. Acceptance Gates A–P

| Gate | Result |
| --- | --- |
| A Owner Identity | **PASS** |
| B Production Safety | **PASS** |
| C Staging Infrastructure | **BLOCKED** (not started; host missing) |
| D DB Isolation | **BLOCKED** (not started) |
| E Redis Isolation | **BLOCKED** (not started) |
| F HTTPS | **BLOCKED** |
| G Backend Security | **BLOCKED** (stack not running) |
| H Mobile Configuration | **PARTIAL (IDs PASS, URL BLOCKED)** |
| I Synthetic Data | **BLOCKED** (none yet) |
| J Test Account | **BLOCKED** |
| K Network Isolation | **PASS (config)** |
| L Backup Baseline | **CONDITIONED** |
| M Observability | **CONDITIONED** (BASELINE/LIMITED) |
| N Regression | **N/A** (no code behavior change) |
| O Build | **CONDITIONED** (EAS blocked; local export OK) |
| P Scope Integrity | **PASS** |

## 28. Integrity Statement (§25)

```text
PRODUCTION MODIFIED = NO
PRODUCTION RESTARTED = NO
PRODUCTION DATABASE ACCESSED = NO
PRODUCTION DATABASE MODIFIED = NO
PRODUCTION SECRETS USED = NO
STAGING DATABASE = DEFINED (not started)
STAGING REDIS = DEFINED (not started)
STAGING API = NOT CONFIGURED (blocked: staging host/HTTPS missing)
STAGING HTTPS = TEMPLATE ONLY (not validatable yet)
ANDROID PACKAGE = com.afyatna.app (SET, PASS)
IOS BUNDLE IDENTIFIER = com.afyatna.app (SET, PASS)
EAS PROFILE = DEFINED (eas.json); EAS BUILD = NOT EXECUTED (credentials blocked)
REAL TRAVELER DATA USED = NO
SYNTHETIC DATA USED = NO (none provisioned)
DATABASE MIGRATIONS APPLIED = NONE
UNRELATED FILES MODIFIED = NONE
PRE-EXISTING WORKTREE CHANGES PRESERVED = YES
```

## 29. Remaining Blockers / Conditions

BLOCKERs (owner/ops must supply): real staging host/DNS, valid staging TLS, external secrets injected, staging test account, EAS credentials (if EAS build required).
CONDITIONED: local-export build ok/EAS deferred; backup/observability LIMITED (external platform absent); stack defined-but-not-started.

## 30. Exact Next Step

Do **NOT** run M4. On owner/ops supply of:
- `STAGING_API_URL=https://<approved-host>`,
- staging DNS + TLS cert under `deploy/staging/tls/`,
- externalized secrets,
- approved staging test account,
- (optional) EAS credentials,
then start: `cd deploy/staging && cp .env.example .env && docker compose ... up -d`, run `migrate`, then **M4 — Controlled Staging Validation**.