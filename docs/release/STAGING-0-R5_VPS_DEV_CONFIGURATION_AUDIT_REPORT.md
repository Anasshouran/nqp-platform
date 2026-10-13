# STAGING-0-R5 — VPS & Development Environment Configuration Audit Report

Phase scope: **DISCOVERY AND AUDIT ONLY**. No configuration, service, DNS, TLS, or repository state was modified.

---

## Executive Verdict

```
BLOCKED
```

The VPS, development environment, GitHub/GHCR pipeline, and secrets isolation are largely verified and safe, but the environment is **not ready for M4**:

1. **No owner-approved staging hostname is present anywhere** (repo configs, deployment docs, Nginx, env files, workflows, previous reports, or DNS). The only real hostnames in use are `dev.afyatna.com` and `api-dev.afyatna.com` (development environment via Let's Encrypt). `staging.nqp.gov.sd` is referenced in high-level docs but returns **NXDOMAIN** and is not configured anywhere.
2. **All `*afyatna.com` records resolve publicly to `127.0.0.1`** (owner's current DNS state) — externally unusable as-is.
3. **The pull-based deployment poller is effectively stalled right now.** It detected the new GHCR `:staging` image digest (`2b5d61…`) but never reached `DEPLOYED`; `docker compose pull` hangs on ~60KB/s GHCR bandwidth. Last log write 17:42 UTC.
4. **The VPS Docker daemon is degraded — high load (avg ~4.5–8), `containerd` at ~97% CPU**, multiple stuck `unpigz` processes, `docker ps`/`docker info` time out. This is evidence of a stalled/large image pull, not operator action.
5. **`CSRF_TRUSTED_ORIGINS` is passed in the staging compose but is NOT read by `backend/nqp_backend/settings.py`** — the HTTPS-origin protection would silently be a no-op. Must be fixed before HTTPS goes live.
6. **A private key is tracked in git** (`deploy/ssl/privkey.pem`, self-signed dev cert) — hygiene improvement required.

Everything else (isolation, health checks, TLS for dev hosts, GitHub/GHCR wiring, secret names) is verified and safe.

---

## Environment Summary

| Layer | Environment | Status |
|-------|-------------|--------|
| VPS host | `196.1.246.63` (SudaniCloudVPS5291139) | Present; Docker daemon **degraded** |
| OS | Ubuntu 24.04.5 LTS, kernel 6.8.0-139 | Present |
| Docker | 29.1.3 client+server; Compose 2.40.3 | Present; API slow/hanging |
| Dev stack | Docker compose `deploy/docker-compose.dev-vps.yml` | Running (degraded visibility), endpoints verified 200 |
| Staging stack | `deploy/staging/docker-compose.yml` + `.env` | Config present; runtime status UNKNOWN (daemon) |
| Nginx (host) | active; 80/443; 3 vhosts (afyatna.com, dev.afyatna.com, api-dev.afyatna.com) | Working, TLS valid |
| TLS (Let's Encrypt) | afyatna.com, dev.afyatna.com, api-dev.afyatna.com | VALID (exp 2026-12-20) |
| GitHub | repo `Anasshouran/nqp-platform`, env `staging`, 3 secrets/2 vars, workflow `staging.yml` | Operational |
| GHCR | backend + frontend images SHA-tagged + `staging`/`dev` tags | Operational |
| Poller | `deploy-poll.sh` via cron `*/2`, state `.deployed-digest` | PARTIAL/STALLED |
| Mobile | `com.afyatna.app` / `com.afyatna.app` / `عافيتنا | AFYATNA` | Identity OK; staging API URL not set |

---

## VPS Inventory

| Item | Value |
|------|-------|
| Hostname | `SudaniCloudVPS5291139` |
| OS / Kernel | Ubuntu 24.04.5 LTS / 6.8.0-139-generic |
| Virtualization | vmware VM |
| Docker | Client 29.1.3 / Server 29.1.3 |
| Docker Compose | 2.40.3 |
| Uptime | 13 days; load avg **4.48 / 6.70 / 7.83** (high) |
| Memory | 3.8 GiB total; ~193 MiB free; 1.55 GiB swap used |
| Disk | 97G, **88% used** (12G free) — near capacity |
| CPU (containerd PID 1193) | **97.6% CPU**, 255 min CPU time, 803 MiB RSS |
| Running processes (stuck) | multiple `unpigz` (6+) — stalled image-layer decompression |

### Containers / Networks / Volumes (observed via remaining daemon responses)
| Item | Detail |
|------|--------|
| Networks | `bridge`, `host`, `none`, `deploy_nqp_internal`, `nqp-staging-net` |
| Volumes | `deploy_backend_media`, `deploy_nqp_postgres_data`, `deploy_nqp_redis_data`, `staging_staging-postgres-data`, `staging_staging-redis-data` |
| docker-proxy | `127.0.0.1:8080 → 172.18.0.2:80` (dev frontend), `127.0.0.1:8001 → 172.18.0.7:8000` (dev backend) |
| `docker ps` / `docker container ls` | **times out** (daemon unresponsive); `docker compose ls` times out |

**NOTE:** container inventory could not be fully enumerated because the Docker API hangs. Evidence (docker-proxy, health 200 on `api-dev.afyatna.com`) confirms the **development** stack is running. Staging runtime state is **UNKNOWN** under the degraded daemon.

### Listening TCP ports
| Port | Bound to | Process | Exposed publicly? |
|------|----------|---------|-------------------|
| 22 | 0.0.0.0 / [::] | sshd | yes (SSH) |
| 80 | 0.0.0.0 / [::] | nginx | yes (HTTP→HTTPS) |
| 443 | 0.0.0.0 / [::] | nginx | yes (HTTPS) |
| 53 | 127.0.0.53:54 / 127.0.0.54:53 | systemd-resolve | no |
| 44511 | 127.0.0.1 | containerd | no |
| 8001 | 127.0.0.1 | docker-proxy (dev backend) | no |
| 8080 | 127.0.0.1 | docker-proxy (dev frontend) | no |

**No PostgreSQL, Redis, MinIO, or Docker socket is publicly exposed.** Public surface = HTTP/HTTPS + SSH only. ✔

### System services
| Service | State |
|---------|-------|
| `docker.service` | active (degraded responsiveness) |
| `nginx.service` | active |
| `ssh.service` | active |
| `cron.service` | active (poller schedule) |
| `certbot.timer` | active (renewal scheduled daily) |
| `ufw` | inactive |
| `fail2ban` | inactive / not active |
| iptables INPUT | ACCEPT (no restrictive INPUT rules); FORWARD DROP (Docker default) |

---

## Development Configuration

### Docker Compose — `deploy/docker-compose.dev-vps.yml`
| Service | Image | Container | Published Port | Healthcheck |
|---------|-------|-----------|----------------|-------------|
| postgres | `ghcr.io/anasshouran/postgres:16-alpine` | `nqp-postgres-dev` | none | `pg_isready` |
| redis | `ghcr.io/anasshouran/redis:7-alpine` | `nqp-redis-dev` | none | `redis-cli ping` |
| backend | `ghcr.io/anasshouran/nqp-backend:57b9c4d` (SHA-pinned) | `nqp-backend-dev` | none | `/api/v1/health/` 200 |
| frontend | `ghcr.io/anasshouran/afyatna-frontend:dev` | `nqp-frontend-dev` | `127.0.0.1:8080:80` | `wget /` |
| celery | `ghcr.io/anasshouran/nqp-backend:57b9c4d` | `nqp-celery-dev` | none | — |
| celery-beat | `ghcr.io/anasshouran/nqp-backend:57b9c4d` | `nqp-celery-beat-dev` | none | — |

Dev network: `nqp_internal` (`deploy_nqp_internal`). Dev DB: `afyatna`, Redis with optional password. Static Nginx on host (system package) fronts `127.0.0.1:8080` / `127.0.0.1:8001`.

### Backend environment (`backend/nqp_backend/settings.py`)
| Setting | Source | Dev value | Read? |
|---------|--------|-----------|-------|
| `DEBUG` | `DEBUG` | `True` (dev) | yes |
| `ALLOWED_HOSTS` | `ALLOWED_HOSTS` | `dev.afyatna.com,localhost,127.0.0.1,backend` | yes |
| `CORS_ALLOWED_ORIGINS` | `CORS_ALLOWED_ORIGINS` | localhost:5173/3000 | yes |
| `CORS_ALLOW_ALL_ORIGINS` | `= DEBUG` | True while DEBUG | yes (batch) |
| `SECURE_SSL_REDIRECT` | `SECURE_SSL_REDIRECT` | default False | yes |
| `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | hardcoded when `not DEBUG` | True | yes |
| `CSRF_TRUSTED_ORIGINS` | — | **never read anywhere** | **NO** |
| `DATABASES` | `POSTGRES_*`/`DB_*` | afyatna/postgres | yes |
| `CELERY_BROKER_URL` | `CELERY_BROKER_URL` / REDIS base | redis://…:6379/0 | yes |
| `USE_S3` | `USE_S3` | False | yes |
| MinIO | `MINIO_ENDPOINT` etc. | localhost:9000 / nqp-documents | only if `USE_S3` |

### Frontend environment
- `frontend/.env.development`: `VITE_API_URL=/api/v1` (same-origin; Vite dev proxy → localhost:8000)
- `frontend/.env.production`: `VITE_API_URL=/api/v1`
- `src/api/client.ts`: `baseURL = import.meta.env.VITE_API_URL || '/api/v1'`

### Mobile environment
- `mobile/src/config.ts`: `process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_HOST` where default host = `10.0.2.2:8000` (Android emulator) / `localhost:8000` (iOS)
- `mobile/eas.json`: profiles development / staging / production; `staging.env.EXPO_PUBLIC_API_URL = "__SET_VIA_CLI_OR_DASHBOARD__"` (placeholder)
- `mobile/app.json`: `name = عافيتنا | AFYATNA`, `slug = afyatna`, package/bundle = `com.afyatna.app` ✔

---

## Staging Configuration

| Item | Status | Evidence |
|------|--------|----------|
| Staging Docker Compose | **PRESENT** | `deploy/staging/docker-compose.yml` (repo + `/opt/nqp-platform/deploy/staging/`) |
| Staging `.env` | **PRESENT** | `/opt/nqp-platform/deploy/staging/.env`, chmod 600, gitignored |
| Staging secrets | **PRESENT** | `.env` (names enumerated; values not printed); `.env.example` contract committed |
| Staging PostgreSQL | **PRESENT** | compose service `postgres` + volume `staging_staging-postgres-data`; runtime status UNKNOWN (daemon) |
| Staging Redis | **PRESENT** | compose service `redis` + volume `staging_staging-redis-data`; runtime status UNKNOWN |
| Staging backend | **PRESENT** | compose service `backend`, `nqp-staging-backend`; runtime status UNKNOWN |
| Staging frontend | **PRESENT** | compose service `frontend`, `nqp-staging-frontend` |
| Staging Nginx | **PARTIAL** | compose service `nginx` maps `443:443`; config is a **template** (`<staging-host>` unfilled) |
| Staging health endpoint | **PARTIAL** | `/api/v1/health/` verified in earlier phase; current reachability limited to internal HTTP (no public HTTPS) |
| Staging deployment poller | **PARTIAL/STALLED** | `deploy-poll.sh` + cron every 2 min; detects new image but deploy never completes (pull hangs) |
| GHCR image config | **PRESENT** | `ghcr.io/anasshouran/nqp-backend:{staging,SHA}` + frontend mirrors |
| GitHub staging environment | **PRESENT** | env `staging`; secrets `STAGING_SSH_KEY`, `STAGING_HOST`, `STAGING_USER`; vars `STAGING_HOST`, `STAGING_USER` |

### Staging dashboard of the running poller
- `.deployed-digest` = `sha256:ab9066b9…` (the manually tagged `d11b2e7` image ID)
- GHCR `:staging` now = `sha256:2b5d61…` (CI-built image from commit `d83602a`) → **mismatch not yet applied**
- Poller log: every `*/2` entry "NEW IMAGE detected: sha256:2b5d61…"; **no `DEPLOYED:` line ever logged**; last entry **17:42:22Z** (now ~18:5x local)
- Root cause observed: `docker compose pull backend` stalls (GHCR ≈60KB/s) + daemon flooded by stalled layer decompression (`containerd` 97%, `unpigz` × 6+, I/O wait ~59%)

---

## Nginx Configuration

`nginx -t` = **syntax OK / test successful**. Active vhosts: `afyatna` (static), `afyatna-dev`, `afyatna-api-dev`.

| vhost | server_name | Backend | Proxy targets | TLS |
|-------|-------------|---------|---------------|-----|
| `afyatna` | `afyatna.com` `www.afyatna.com` | static `/var/www/afyatna` | — | Let's Encrypt |
| `afyatna-dev` | `dev.afyatna.com` | frontend | `http://127.0.0.1:8080` | Let's Encrypt |
| `afyatna-api-dev` | `api-dev.afyatna.com` | backend | `http://127.0.0.1:8001` | Let's Encrypt |

Properties:
- HTTP listeners: 80/443 on `afyatna`, `afyatna-dev`, `afyatna-api-dev`, all with `return 301 https://…` (Certbot) — **no plaintext on port 80 for these hosts**
- Headers forwarded: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- TLS via Let's Encrypt managed by Certbot (`options-ssl-nginx.conf`, `ssl-dhparams.pem`)
- Security headers / WebSocket: **not configured** in these vhosts (none found)
- **Staging vhost: ABSENT** — no `staging` server block, no cert for a staging host
- Confirmed live: `curl https://api-dev.afyatna.com/api/v1/health/` = **200** from VPS

**Exposure check:** only 80/443 (nginx) and 22 (ssh) public. PostgreSQL, Redis, MinIO, Gunicorn, Docker API = internal only. ✔

---

## DNS Status

**DNS STATUS: NOT RESOLVED (for staging)**

| Hostname | Public DNS (DoH) | Where used | Notes |
|----------|------------------|-----------|-------|
| `afyatna.com` / `www.afyatna.com` | A → `127.0.0.1` | Nginx static site | parked/loopback record |
| `dev.afyatna.com` | A → `127.0.0.1` | Nginx dev vhost | parked/loopback record |
| `api-dev.afyatna.com` | A → `127.0.0.1` | Nginx dev vhost | parked/loopback record |
| `staging.afyatna.com` | A → `127.0.0.1` | none | (no vhost/cert) |
| `staging.nqp.gov.sd` | **NXDOMAIN** | docs only (Infrastructure/DNS.md, M3 runbook) | not configured |
| `dev.nqp.gov.sd` / `api.nqp.gov.sd` | — | docs only | not configured |

- Local resolvers (operator and VPS) are split-horizon / intercepted (REFUSED on 8.8.8.8 UDP); Cloudflare DoH was used for ground-truth.
- **No `staging` record points to `196.1.246.63`.** All `*afyatna.com` records currently return `127.0.0.1`.
- Per audit rules, **no DNS was created or modified**.

---

## TLS Status

```
TLS STATUS (staging): MISSING
TLS STATUS (dev, real): VALID
```

| Host | Issuer | Subject CN | SAN | Valid | Expiry |
|------|--------|-----------|-----|-------|--------|
| `afyatna.com` | Let's Encrypt (YE2) | afyatna.com | afyatna.com, www.afyatna.com | 2026-09-21 | 2026-12-20 |
| `dev.afyatna.com` | Let's Encrypt (YE1) | dev.afyatna.com | dev.afyatna.com | 2026-09-21 | 2026-12-20 |
| `api-dev.afyatna.com` | Let's Encrypt (YE1) | api-dev.afyatna.com | api-dev.afyatna.com | 2026-09-21 | 2026-12-20 |
| `deploy/ssl/fullchain.pem` (repo) | **self-signed** | CN = nqp.gov.sd (dev-only) | — | 2026-09-13 | 2027-09-13 |

- Certbot installed (`certbot.timer`, `/etc/cron.d/certbot`); auto-renewal active.
- Cert directories present: `/etc/letsencrypt/live/{afyatna.com, dev.afyatna.com, api-dev.afyatna.com}`.
- **No staging certificate exists.** No cert keyed to a staging hostname.
- Private key contents were **not** output. The `deploy/ssl/privkey.pem` presence in git is flagged (see Secret Hygiene).
- No certificate was issued or renewed in this phase.

---

## Mobile Configuration

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| `android.package` | `com.afyatna.app` | `com.afyatna.app` | ✔ PASS |
| `ios.bundleIdentifier` | `com.afyatna.app` | `com.afyatna.app` | ✔ PASS |
| displayName | `عافيتنا | AFYATNA` | `عافيتنا | AFYATNA` | ✔ PASS |
| EAS profiles | dev/staging/prod | present (`distribution: internal`) | ✔ PASS |
| staging API URL | staging HTTPS | `__SET_VIA_CLI_OR_DASHBOARD__` | **NOT SET** |
| per-env selection | dev→dev API, staging→HTTPS, prod→HTTPS | `EXPO_PUBLIC_API_URL ?? emulator/localhost default` | mechanism OK; value BLOCKED |

- No invented package IDs. No use of `com.afyatna.dev/staging/prod` or `com.nqp.afyatna` etc.
- SUDAPASS remains **deferred**; no SUDAPASS configuration added or faked.

---

## GitHub / GHCR Deployment

### Workflow — `.github/workflows/staging.yml`
| Property | Value |
|----------|-------|
| Trigger | `push` on `staging` |
| Concurrency | `staging-deploy` group |
| Jobs | 1) Backend Django tests (w/ PostgreSQL+Redis services) 2) Frontend typecheck/lint/build (`continue-on-error: true` — pre-existing TS errors) 3) Build & publish backend image 4) Verify image published to GHCR (env `staging`) |
| GHCR images | `ghcr.io/anasshouran/nqp-backend:staging` + `:<short-sha>` (e.g. `d83602a`) |
| Frontend gate | non-blocking (proven by last successful run despite frontend failure) |
| SSH deploy job | removed — replaced by pull-based model + GHCR verification job |

### CI results
- Latest run `37792511613` (`d83602a`): **success** (backend tests ✔, build+publish ✔, GHCR verify ✔; frontend conditioned-fail)
- GitHub Environment `staging`: secrets `STAGING_SSH_KEY`/`STAGING_HOST`/`STAGING_USER` (names only) + vars `STAGING_HOST=196.1.246.63`, `STAGING_USER=root`
- Other workflows: `ci.yml` (main/master), `m1-mobile.yml` (main/master), mirror workflows — not modified.

### GHCR state
- `nqp-backend`: tags `…, 8b2b02b, staging, f426f33, 7da95f9, 8958c1b, 90bf159, f26c0aa, 776d4a6, d83602a`
- `afyatna-frontend`: tags `dev, 2cd7a49, 84a09fa, 2431680, ef44545, 57b9c4d, …`
- `:staging` digest = `sha256:2b5d61…` (unreleased to VPS yet)

---

## Pull-Based Deployment

| Property | Value |
|----------|-------|
| Name | `deploy/staging/deploy-poll.sh` (deployed to `/opt/nqp-platform/deploy/staging/`) |
| Schedule | cron `*/2 * * * *` (every 2 min) |
| Interaction | `docker manifest inspect ghcr.io/anasshouran/nqp-backend:staging` → compare digest vs `.deployed-digest` |
| Image selection | `:staging` tag (latest SHA) |
| Deploy command | `docker compose pull backend` → `up -d backend` → `migrate` → `check` → write digest |
| Health check | docker-compose `exec backend python manage.py check` + migration step (no live HTTP health in script) |
| Rollback | NOT automated; prior SHA tags remain in GHCR (manual re-point of `.env`) |
| Logs | `/opt/nqp-platform/deploy/staging/deploy-poll.log` (109 lines) |
| Failure behavior | `set -euo pipefail`; logs `ERROR: migration failed` / `ERROR: django check failed`; exits 0 silently on "no change" |

**Status: `PARTIAL`** — detection works (correctly saw digest change `ab9066… → 2b5d61…`), but **deployment never completes**: the `docker compose pull` step hangs (GHCR bandwidth ~60KB/s, daemon saturated, disk 88% full, swap thrash). Evidence: no `DEPLOYED:` in log; last write 17:42; `containerd` 97% CPU with stuck `unpigz` workers.

Per audit rules, the poller was **not** restarted or modified.

---

## Security / Secret Hygiene

| Check | Result |
|-------|--------|
| `.gitignore` covers `.env`, `.env.local`, `.env.prod`, `*.env`, `deploy/.env.who`, `deploy/ssl/*.pem`, `*.key` | ✔ |
| Tracked files containing `.env` | only `*.env.example` (placeholders) + `frontend/.env.development`/`.production` (no secrets) | ✔ |
| GitHub secret scan (repo) | repo secrets: none listed; env-level secrets exist by name only (no values printed) | ✔ |
| `deploy/ssl/privkey.pem` + `fullchain.pem` | **TRACKED IN GIT** (self-signed, CN=nqp.gov.sd, dev-only) | **RISK** |
| Secret-pattern scan (tracked code: `ghp_`, `AKIA`, `BEGIN PRIVATE KEY`, `xoxb`) | **none found** | ✔ |
| Staging `.env` on VPS | chmod 600, gitignored, staging-only names | ✔ |
| Production values in staging config | none found | ✔ |

### Flagged (report only — no rotation/deletion performed)
| FILE | VARIABLE/TYPE | RISK | RECOMMENDED ACTION |
|------|---------------|------|--------------------|
| `deploy/ssl/privkey.pem` (tracked) | TLS private key (self-signed dev cert for nqp.gov.sd) | Private key in repository history | Remove from repo (or rotate); keep only in `deploy/ssl/.gitignored` on server; purge from history with care |
| `deploy/ssl/fullchain.pem` (tracked) | self-signed dev cert | Low (public cert), but certs don't belong in VCS; STAGING not served by it | Move to server-side paths; gitignore |
| `deploy/staging/docker-compose.yml` (repo) | `SECURE_SSL_REDIRECT: "False"` | Deviation from HTTPS intent (kept for internal HTTP health checks); documented in R4 | Re-enable once real HTTPS terminates at Nginx; set `True` |

---

## Development vs Staging Reconciliation

| Area | Development | Staging | Required Action | Class |
|------|------------|---------|-----------------|-------|
| Docker Compose file | `deploy/docker-compose.dev-vps.yml` (SHA-pinned `57b9c4d`) | `deploy/staging/docker-compose.yml` (`$STAGING_*`) | Keep separate files | SAFE |
| Container naming | `nqp-*-dev` | `nqp-staging-*` | Keep convention | SAFE |
| PostgreSQL | DB `afyatna`, volume `deploy_nqp_postgres_data`, host-net `deploy_nqp_internal` | DB `nqp_staging`, volume `staging_staging-postgres-data`, `nqp-staging-net` | Already isolated | SAFE |
| Redis | `nqp-redis-dev`, opts password, `deploy_nqp_redis_data` | `nqp-staging-redis`, `appendonly yes`, `staging_staging-redis-data` | Already isolated | SAFE |
| Backend image | `nqp-backend:57b9c4d` (SHA) | `nqp-backend:staging`/SHA | Pin staging to SHA on deploy (poller uses tag) | REQUIRED |
| Frontend image | `afyatna-frontend:dev` | `afyatna-frontend:latest` (unpinned) | Pin staging SHA | REQUIRED |
| Nginx | host system nginx; dev vhosts on 80/443 | container nginx on `443:443` **conflicts with host Nginx** | Redesign listener (host Nginx front, or different port/internal) | **BLOCKING** |
| `staging.conf` | — | template `<staging-host>` unfilled | Fill with owner host | **BLOCKING** |
| DNS | `dev.afyatna.com` → 127.0.0.1 | none | Owner A record → `196.1.246.63` | **BLOCKING** |
| TLS | Let's Encrypt valid | none | Issue for staging host (owner) | **BLOCKING** |
| `CSRF_TRUSTED_ORIGINS` | not used | passed in compose but **not read by settings.py** | Add to settings; verify | **BLOCKING** for M4 |
| ALLOWED_HOSTS | `dev.afyatna.com,…` | `$STAGING_ALLOWED_HOSTS` | Set to staging host | REQUIRED |
| CORS/CSRF origins | localhost | `$STAGING_*` | Set to `https://staging-host` | REQUIRED |
| Mobile API URL | emulator/localhost | `__SET_VIA_CLI_OR_DASHBOARD__` | Set to `https://<staging-host>/api/v1` | **BLOCKING** |
| App IDs | `com.afyatna.app` | `com.afyatna.app` (same — owner-approved) | None | SAFE |
| Secrets | dev defaults in `.env` | `$STAGING_*` in `.env` (chmod 600) | Keep separate; never reuse | SAFE |
| GHCR | `dev` + SHA tags | `staging` + SHA tags | Keep SHA tagging | SAFE |
| GitHub Actions | `ci.yml` (main) | `staging.yml` (staging) | Keep | SAFE |
| Deployment | host Nginx → 8080/8001 | pull-based poller | Fix poller pull stall | REQUIRED |
| Health check | `/api/v1/health/` 200 | internal HTTP only | Needs HTTPS reachability | REQUIRED |
| Docker daemon health | degraded (load, disk 88%) | same host | Owner/ops: clear stalled pulls, free disk, stabilize | **RISK / REQUIRED** |

---

## Production Safety Verification

| Check | Result |
|-------|--------|
| Production containers on VPS | **NONE found** (only dev + staging configs) |
| Production database accessed | **NO** (audit used read-only `pg_dump`-style checks from earlier phase; none now) |
| Production credentials used | **NO** |
| Real traveler data accessed | **NO** |
| Production `.env` reused | **NO** (staging `.env` is separate, chmod 600) |
| Production credentials mounted in staging | **NO** |
| SUDAPASS contacted | **NO** |
| Declaration Write enabled | **NO** |
| Staging ↔ dev isolation | separate networks, DBs, volumes, secret files ✔ |

Dangerous-reference scan (`production`, `prod`, `PROD`, real DB hosts/URLs): occurrences are limited to **docs** (runbooks, architecture) and CI **test** secret name `ci-secret-key-not-for-production`; no secret **values** or production endpoints are wired into staging/GitHub configuration.

---

## M4 Readiness Matrix

| Gate | Result | Evidence | Blocking? |
|------|--------|----------|-----------|
| A Repository Integrity | PASS | `staging` branch, worktree untouched, `git status` unchanged after audit | No |
| B VPS Identity | CONDITIONED | Host verifies as `SudaniCloudVPS5291139` Ubuntu 24.04; **daemon degraded** (load, disk 88%, containerd 97%) | Yes (health) |
| C Staging Isolation | PASS | `nqp-staging-net`, `nqp-staging-*` names, separate volumes | No |
| D PostgreSQL Isolation | PASS | separate DB `nqp_staging`, volume, container | No |
| E Redis Isolation | PASS | separate redis, volume | No |
| F Secrets Isolation | PASS | separate `.env` chmod 600, gitignored, staging-only names | No |
| G Nginx | PARTIAL | dev vhosts work + TLS valid; **no staging vhost**; compose container nginx `443:443` conflicts with host Nginx | **Yes** |
| H DNS | NOT RESOLVED | no staging record → VPS; `*afyatna.com` → 127.0.0.1; `staging.nqp.gov.sd` NXDOMAIN | **Yes** |
| I TLS | MISSING (staging) | no cert for a staging hostname (dev certs valid) | **Yes** |
| J HTTPS Health | NOT REACHABLE | `/api/v1/health/` only internal HTTP; no public HTTPS endpoint | **Yes** |
| K Mobile API URL | NOT SET | `__SET_VIA_CLI_OR_DASHBOARD__`; default emulator/localhost | **Yes** |
| L GitHub Actions | PASS | `staging.yml` run success; SHA-tagged push; GHCR verified | No |
| M GHCR | PASS | `:staging` + SHA tags present; verified via v2 API | No |
| N Pull Deployment | PARTIAL | detects new digest; **pull/deploy stalls** (bandwidth + daemon saturation); no `DEPLOYED` | **Yes** |
| O Production Safety | PASS | no production touched; no production credentials; SUDAPASS/Decl-Write untouched | No |
| P M4 Readiness | **NOT READY** | blockers G,H,I,J,K,N | **Yes** |

---

## Required Owner / Ops Actions

1. **Provide the official owner-approved staging hostname** (none exists anywhere in configs/docs/DNS today). This is the single hard prerequisite.
2. **DNS**: add an A record for that hostname → `196.1.246.63` (owner DNS provider). Verify `dig <hostname>` resolves publicly. Do not modify anything else.
3. **TLS**: issue a trusted certificate for the staging hostname (Let's Encrypt/Certbot via HTTP-01 or owner DNS-01) on the VPS.
4. **Nginx**: create the staging vhost (or adapt `deploy/staging/nginx/staging.conf`), wire `server_name` + cert paths, and **resolve the `443:443` port conflict** between the host Nginx and the staging container Nginx (host Nginx reverse-proxying to staging services is the simplest consistent pattern).
5. **Backend settings**: implement reading of `CSRF_TRUSTED_ORIGINS` in `backend/nqp_backend/settings.py` (currently a no-op) and re-enable `SECURE_SSL_REDIRECT=True` once real HTTPS termination is in place.
6. **Stabilize the VPS Docker daemon**: clear the stalled `nqp-backend:staging` image pull (multiple stuck `unpigz`, `containerd` 97% CPU), free disk (88% used), and confirm `docker ps`/`docker compose` respond. This may be the only reason the poller never deploys.
7. **Fix the pull-based deployment**: the poller must complete `docker compose pull backend` reliably (e.g., pull digests on a schedule with retries) and record `DEPLOYED`. Until then, staging is not automatically updatable.
8. **Pin staging images to SHA** (backend + frontend) instead of moving tags, for reproducible rollback.
9. **Mobile**: after the staging hostname + HTTPS exist, set `EXPO_PUBLIC_API_URL=https://<staging-host>/api/v1` in the `staging` EAS profile and in the build invocation.
10. **Secret hygiene**: remove `deploy/ssl/privkey.pem` (and cert files) from the git repository / history; keep certificate material server-side only.

## Deferred Items (explicitly preserved)

- **SUDAPASS integration — DEFERRED** (no contact, no config, no credentials)
- **Declaration Write — DEFERRED** (not enabled)
- **EAS credentials — NOT A BLOCKER** unless an EAS cloud build is required
- **DB rollback automation — NOT CLAIMED** (application rollback via GHCR SHA tags is the only documented mechanism)
- **Pre-existing frontend TypeScript errors — REMAIN CONDITIONED** (`continue-on-error: true`; out of scope)
- **GitHub→VPS SSH** remains blocked by cloud provider firewall (pull-based model retained; **no bypass attempted**)

---

## Compliance Confirmation

- Audit only. **Nothing was fixed, changed, restarted, deployed, or recreated.**
- No DNS records modified. No TLS issued/renewed. No firewall modified. No services restarted.
- No secrets, private keys, or values printed (only names/locations).
- Worktree state verified unchanged at end of audit (`git status --short` identical; stash list empty).