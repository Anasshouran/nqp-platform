# STAGING-PHASE-2-CONFIGURATION-REMEDIATION-REPORT

Staging-only configuration remediation prepared on the **repository copy** for future HTTPS activation of `staging.afyatna.com`. No VPS deployment, no runtime changes, no certificates, no DNS changes in this phase.

- **Report timestamp:** 2026-10-09 ~06:00 UTC
- **Execution host:** local development machine `parrot` (user `root`); VPS inspected read-only over authorized SSH
- **VPS:** `SudaniCloudVPS5291139` / `196.1.246.63`, Ubuntu 24.04.5 LTS, Docker Compose 2.40.3, Docker Compose (local) 2.26.1
- **Repo branch / HEAD:** `staging` / `32150714ba40e7b96400530dd890138d2208ae29`

---

## Gate 0 — Baseline (PASS)

- Read `docs/release/STAGING-HTTPS-ACTIVATION-REPORT.md`.
- `git status --short` captured before any change: only pre-existing untracked entries + the prior reports; no tracked modifications.
- Staging files tracked in git: `.env.example`, `README.md`, `deploy.sh`, `docker-compose.yml`, `nginx/staging.conf`.
- Repository staging Compose vs VPS copy compared read-only:

| Item | Repository copy | VPS copy |
|---|---|---|
| nginx publish | `127.0.0.1:8443:443` (loopback-only) | `443:443` (would conflict with host nginx) |
| restart policy | `unless-stopped` on all 7 services | absent |
| healthchecks | postgres / redis / backend | none |
| `depends_on` conditions | `service_healthy` / `service_started` | plain list |
| services | postgres, redis, backend, celery, celery-beat, frontend, nginx | postgres, redis, backend, frontend, nginx |
| static/media handling | shared named volumes mounted in backend + nginx | absent |
| image pinning | `${STAGING_*_IMAGE:?...}` required, no `latest` | defaults to `:latest` |
| TLS references | `./tls:/etc/nginx/tls:ro` mount (dir currently absent on VPS) | same mount, same absence |
| MinIO | optional `MINIO_*` | absent |

- Frontend / nginx staging containers: **not running** (confirmed). Only `nqp-staging-backend`, `-postgres`, `-redis` are up.
- No `.env`, `tls/`, `*.pem`, or `*.key` files exist in the repo staging tree (secrets never committed; `*.pem`/`*.key`/`.env` gitignored).
- Compose version on both VPS (2.40.3) and local (2.26.1) supports `condition: service_healthy`.

**Gate 0: PASS** — target repo and VPS positively identified; fork between repo and VPS copies documented without overwriting either.

## Gate 1 — Compose Reconciliation Plan (PASS with conditions)

**Findings reverified (not copied blindly):**

1. VPS compose nginx `443:443` is confirmed. Host nginx exclusively owns `0.0.0.0:443`/`[::]:443`; a `443:443` publish would fail to bind or hijack the public TLS front. Repository copy already uses `127.0.0.1:8443:443` (verified render: `host_ip: 127.0.0.1`, `published: "8443"`, `target: 443`).
2. VPS copy lacks restart policies, healthchecks, `depends_on` health conditions, and static/media volumes; repository copy has all of them.
3. Staging frontend and nginx containers are not running on the VPS (deploy-time gap; not this phase).
4. `./tls` directory is absent on both sides (cert mount must exist only when a real cert is issued; repository does not fabricate a certificate placeholder).
5. Repository Compose already restricts every staging listener to the loopback; PostgreSQL/Redis have **no** published ports and remain isolated within `nqp-staging-net` (bridge, verified). This satisfies "staging isolated from dev and production".

**Prepared minimal reconciliation target** (to be applied at activation time, NOT now):
- Bring VPS `docker-compose.yml` in sync with repository `deploy/staging/docker-compose.yml` (`127.0.0.1:8443:443`, restart, healthchecks, `service_healthy` conditions, static/media volumes, MinIO block, no `latest`).
- Keep postgres/redis unpublished (bridge-only) — unchanged.
- Do NOT create `deploy/staging/tls/` cert material in the repo.

**Gate 1: PASS** (plan-only; VPS sync deferred to activation and explicitly out of scope here).

## Gate 2 — Django Host and Origin Configuration (PASS)

Inspected Django staging wiring in `backend/nqp_backend/settings.py` (read-only) and repo `deploy/staging/.env.example`:

- `ALLOWED_HOSTS` reads `ALLOWED_HOSTS` env (default `localhost,127.0.0.1`); Compose maps `${STAGING_ALLOWED_HOSTS}`.
- `CSRF_TRUSTED_ORIGINS` is opt-in, empty-by-default, whitespace-stripped, no wildcards ever (helper `parse_csrf_trusted_origins`); Compose maps `${STAGING_CSRF_TRUSTED_ORIGINS}`.
- `CORS_ALLOWED_ORIGINS` reads `CORS_ALLOWED_ORIGINS` env; Compose maps `${STAGING_CORS_ALLOWED_ORIGINS}`.
- Secure HTTPS enforcement when `DEBUG=False`: `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO','https')`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`, HSTS (1y, includeSubDomains, preload), `X_FRAME_OPTIONS=DENY`.
- `.env.example` previously used `<staging-api-host>` / `<staging-host>` placeholders.

**Applied (staging-only, repository copy):**

`deploy/staging/.env.example` — replaced placeholders with the exact owner-approved staging host:

- `STAGING_ALLOWED_HOSTS=staging.afyatna.com,localhost,127.0.0.1`
- `STAGING_CSRF_TRUSTED_ORIGINS=https://staging.afyatna.com`
- `STAGING_CORS_ALLOWED_ORIGINS=https://staging.afyatna.com`

Notes:
- `localhost,127.0.0.1` retained in `ALLOWED_HOSTS` because the in-container backend health probe uses `Host: localhost`; dropping them would 400 the probe (verified, see Gate 3).
- Exact host/additions only; dev/prod origins untouched; no wildcard; CSRF/CORS protections intact.

**Applied (staging-only, repository copy):**

`deploy/staging/docker-compose.yml` — backend `healthcheck` now sends `X-Forwarded-Proto: https`:

- **Why (empirically verified):** with the repo's `SECURE_SSL_REDIRECT: "True"` and `SECURE_PROXY_SSL_HEADER` set for `DEBUG=False`, a plain `http://localhost:8000/api/v1/health/` probe returns **301 → `https://localhost:8000`**, which the plain-HTTP gunicorn socket cannot serve (TLS handshake fails) → healthcheck would never become healthy → `backend: condition: service_healthy` would block nginx and celery from ever starting. The fix mirrors the pattern already used in `deploy/staging/deploy.sh` Step 4.
- No surface exposed; no dependency change; no image change.

**Gate 2: PASS** — staging app wiring now accepts the staging hostname/origin; VPS `.env` population remains a deploy-time change plan (values not edited remotely).

## Gate 3 — Static and Configuration Validation (PASS)

1. **Compose render (secrets redacted, placeholder env):** `docker compose config -q` → OK. Rendered `nginx`: `host_ip: 127.0.0.1 / published 8443 / target 443`; backend healthcheck contains `headers={'X-Forwarded-Proto':'https'}`.
2. **Django checks (staging env via env vars, no DB writes):**
   `SECRET_KEY=test… DEBUG=False SECURE_SSL_REDIRECT=True ALLOWED_HOSTS=staging.afyatna.com CSRF_TRUSTED_ORIGINS=https://staging.afyatna.com CORS_ALLOWED_ORIGINS=https://staging.afyatna.com python manage.py check` → `System check identified no issues (0 silenced)`.
3. **Tests:** `pytest apps/accounts/tests/test_csrf_trusted_origins.py apps/accounts/tests/test_health.py` → **9 passed** (includes the golden contract test asserting `CSRF_TRUSTED_ORIGINS: ${STAGING_CSRF_TRUSTED_ORIGINS}` is wired in Compose → unaffected by the change).
4. **Healthcheck behavior probe (temp test, removed after run):** with `SECURE_SSL_REDIRECT=True` + `SECURE_PROXY_SSL_HEADER`, plain `Host: localhost` probe → 301; probe with `X-Forwarded-Proto: https` → 200. Confirms the compose fix addresses a real startup blocker (not cosmetic).
5. **Upstream isolation static scan:** `deploy/staging/` contains no references to dev/prod upstreams (`127.0.0.1:8001`, `127.0.0.1:8080`, `api-dev.afyatna.com`, `dev.afyatna.com`, `afyatna.com/`, `localhost:8001/8080`) → **none found**.
6. **No accidental config drift:** only `deploy/staging/.env.example` + `deploy/staging/docker-compose.yml` modified; `deploy/staging/nginx/staging.conf`, `settings.py`, and dev/prod compose untouched.

Limitation reported rather than invented: staging `.env` on the VPS is outside the repository; exact runtime values were not fabricated here — a change plan is provided below.

## Gate 4 — Change Review (PASS — awaiting owner approval to apply to VPS)

### 1. Exact files changed (repo only, 2 files)

- `deploy/staging/.env.example` (+3/−3)
- `deploy/staging/docker-compose.yml` (+1/−1)

### 2. Before/after summary

| File | Before | After |
|---|---|---|
| `.env.example` | `STAGING_ALLOWED_HOSTS=<staging-api-host>`, `STAGING_CSRF_TRUSTED_ORIGINS=https://<staging-host>`, `STAGING_CORS_ALLOWED_ORIGINS=https://<staging-host>` | Concrete `staging.afyatna.com` (ALLOWED_HOSTS adds `localhost,127.0.0.1` for in-container probes) |
| `docker-compose.yml` | backend healthcheck `urlopen('http://localhost:8000/api/v1/health/')` | `headers={'X-Forwarded-Proto':'https'}` on the probe request |

### 3. Evidence changes are staging-only

- Both files are under `deploy/staging/`.
- `git diff` touches only those two paths; `git status` shows no other tracked modification.
- No `.env`, `tls/`, `*.pem`, `*.key`, or secrets added anywhere.
- No references to dev/prod upstreams introduced (static scan clean).

### 4. Validation commands and results

```
docker compose -f deploy/staging/docker-compose.yml --env-file .env.example config [-q]   → OK; 8443/443 loopback; healthcheck header present
python manage.py check (staging env vars, DEBUG=False, no DB)                              → 0 issues
pytest apps/accounts/tests/test_csrf_trusted_origins.py apps/accounts/tests/test_health.py → 9 passed
isolated SSL-redirect probe (removed after run)                                            → 301 (plain) / 200 (X-Forwarded-Proto https)
```

### 5. Remaining DNS, TLS, runtime dependencies (not performed, out of scope)

- **DNS (blocking):** `.com` parent zone still delegates `afyatna.com` to `ns1/ns2.verification-hold.suspended-domain.com`; public resolvers return `127.0.0.1`. Registrar authoritative zone (OrderBox, serial 2026100904) already serves `staging.afyatna.com → 196.1.246.63`.
- **TLS directory:** `deploy/staging/tls/` must exist on the VPS with a real `fullchain.pem` + `privkey.pem` before nginx container start.
- **Runtime stack (VPS):** start `frontend` + `nginx` staging containers (and optionally celery/beat) once images and cert exist; sync VPS compose to the repo copy.
- **VPS `.env` change plan:** set `STAGING_ALLOWED_HOSTS=staging.afyatna.com,localhost,127.0.0.1`, `STAGING_CSRF_TRUSTED_ORIGINS=https://staging.afyatna.com`, `STAGING_CORS_ALLOWED_ORIGINS=https://staging.afyatna.com` (and real secret values) — never committed.

### 6. Rollback (staging-only)

- Revert the two repo edits:
  - `.env.example` → restore `<staging-api-host>` / `https://<staging-host>` placeholders.
  - `docker-compose.yml` → restore plain `urlopen` healthcheck line.
- Because nothing was deployed, no service/database/DNS/network/cert rollback is required. On the VPS nothing changed in this phase.

## Compliance confirmation

- No VPS writes, no `docker compose up/down`, no container create/recreate, no DB flush/migration, no volume/network/image deletion, no cert issuance, no host-Nginx reload, no DNS change, no secret printed, no file copied between dev and staging.
- Pre-existing untracked files and reports preserved.
- This report path was free; written without overwriting an existing file.

## Gate status summary

| Gate | Status |
|---|---|
| Gate 0 — Baseline | **PASS** |
| Gate 1 — Compose Reconciliation | **PASS** (plan-only) |
| Gate 2 — Django Host/Origin | **PASS** |
| Gate 3 — Static & Config Validation | **PASS** |
| Gate 4 — Change Review | **PASS** |

## Final verdict

```
READY FOR OWNER REVIEW
```

Reasoning:
- All five gates PASS on the repository copy with validated, staging-only, minimal changes (hostname/origin wiring + startup-blocking healthcheck fix).
- No VPS, DNS, TLS, or runtime changes were made, per phase constraints.
- Public HTTPS activation remains blocked by the pre-existing DNS delegation condition (`.com` zone → `verification-hold.suspended-domain.com`), which is outside this phase's permitted scope and must be resolved before certificate issuance / activation.
- Owner approval is required before syncing staging compose + `.env` to the VPS, creating `deploy/staging/tls/`, or running the staging stack.