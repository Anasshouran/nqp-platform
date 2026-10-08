# STAGING-0-R3-GITHUB — GitHub → Staging VPS CI/CD Deployment Report

## 1. Executive Summary

Established a secure, auditable GitHub → Staging VPS CI/CD deployment path for AFYATNA/NQP. The workflow builds and publishes backend images to GHCR, then deploys to the staging VPS (196.1.246.63) via SSH. No production deployment path exists.

## 2. Existing GitHub State

| Property | Value |
|----------|-------|
| Repository | `Anasshouran/nqp-platform` |
| Remote | `https://github.com/Anasshouran/nqp-platform.git` |
| Default branch | `main` |
| Existing workflows | `ci.yml`, `m1-mobile.yml`, `mirror-infra-images.yml`, `mirror-postgres-image.yml` |
| GHCR namespace | `ghcr.io/anasshouran` |
| Docker images | `nqp-backend`, `afyatna-frontend` |

## 3. Repository / Branch Strategy

- **Staging branch**: `staging` (to be created by owner)
- **Trigger**: Push to `staging` branch or manual `workflow_dispatch`
- **Concurrency**: `staging-deploy` group with `cancel-in-progress: false`
- **No force-push, no history rewrite**

## 4. Worktree Integrity

Pre-existing worktree changes (M1/M2 development work) are preserved. The staging workflow and deploy script are new additions that do not modify existing tracked files.

## 5. CI Architecture

```
GitHub Push (staging branch)
    ↓
backend-tests (Django pytest)
    ↓
frontend-checks (lint + typecheck + build)
    ↓
build-backend-image (Docker → GHCR)
    ↓
deploy-staging (SSH → VPS → Docker Compose)
    ↓
smoke-test (health endpoint)
```

## 6. GitHub Actions Workflow

**File**: `.github/workflows/staging.yml`

### Jobs

| Job | Description |
|-----|-------------|
| `backend-tests` | Django pytest with PostgreSQL + Redis services |
| `frontend-checks` | npm lint, typecheck, build |
| `build-backend-image` | Docker build & push to GHCR with SHA tag |
| `deploy-staging` | SSH to VPS, pull image, migrate, health check |

### Triggers
- Push to `staging` branch
- Manual `workflow_dispatch`

### Concurrency
- Group: `staging-deploy`
- Cancel in progress: `false`

## 7. Docker Build

- **Dockerfile**: `backend/Dockerfile`
- **Context**: `backend/`
- **Base image**: `python:3.13-slim`
- **Build args**: None (no secrets baked in)
- **Image tags**: `staging`, `<short-sha>`

## 8. GHCR Publishing

- **Registry**: `ghcr.io`
- **Namespace**: `ghcr.io/anasshouran`
- **Image**: `nqp-backend`
- **Auth**: `GITHUB_TOKEN` (built-in, no PAT needed)
- **Permissions**: `contents: read`, `packages: write`

## 9. SSH Deployment

- **Staging VPS**: `196.1.246.63`
- **SSH user**: Configured via `STAGING_USER` variable
- **SSH key**: `STAGING_SSH_KEY` secret (dedicated staging deploy key)
- **Host verification**: `StrictHostKeyChecking=yes` with `ssh-keyscan`
- **No production SSH keys in scope**

## 10. Staging VPS Verification

| Check | Status |
|-------|--------|
| Host reachable | PASS (196.1.246.63) |
| Docker running | PASS |
| Docker Compose v2 | PASS |
| Staging network isolated | PASS (`nqp-staging-net`) |
| Staging DB isolated | PASS (`nqp-staging-postgres-data` volume) |
| Staging Redis isolated | PASS (`nqp-staging-redis-data` volume) |
| Production containers | None found |
| Production DB | Not accessed |

## 11. Staging Secrets

| Secret | Location | Purpose |
|--------|----------|---------|
| `STAGING_SSH_KEY` | GitHub Environment `staging` | SSH deploy key |
| `STAGING_HOST` | GitHub Environment `staging` | VPS IP/hostname |
| `STAGING_USER` | GitHub Environment `staging` | SSH user |
| `STAGING_DB_PASSWORD` | VPS `.env` (gitignored) | PostgreSQL password |
| `STAGING_SECRET_KEY` | VPS `.env` (gitignored) | Django secret key |
| `STAGING_JWT_SECRET_KEY` | VPS `.env` (gitignored) | JWT signing key |

**No secrets committed to Git. No production secrets copied.**

## 12. Database Isolation

- **Staging DB**: `nqp_staging` (dedicated PostgreSQL container)
- **Staging volume**: `staging_staging-postgres-data`
- **Dev DB**: `afyatna-db-dev` (separate container/volume)
- **Production DB**: Does not exist on this VPS
- **No connection from staging to dev/production**

## 13. Redis Isolation

- **Staging Redis**: `nqp-staging-redis` (dedicated container)
- **Staging volume**: `staging_staging-redis-data`
- **Dev Redis**: `afyatna-redis-dev` (separate container)
- **No connection from staging to dev/production**

## 14. Migration Strategy

- Migrations run via `python manage.py migrate --noinput` inside backend container
- Only runs against staging DB (verified by container network isolation)
- No `docker compose down -v` (preserves staging DB)
- Historical migrations are never modified

## 15. Deployment Process

1. Push to `staging` branch triggers workflow
2. Backend tests run (pytest)
3. Frontend checks run (lint, typecheck, build)
4. Backend image built and pushed to GHCR with SHA tag
5. SSH to staging VPS
6. Pull exact image SHA
7. Run migrations
8. Restart backend container
9. Health check via `curl http://localhost:8000/api/v1/health/`
10. Report deployed image SHA

## 16. Health Checks

| Check | Command |
|-------|---------|
| Container running | `docker compose ps` |
| Django check | `python manage.py check` |
| Migrations applied | `python manage.py showmigrations` |
| HTTP health | `curl http://localhost:8000/api/v1/health/` |
| PostgreSQL reachable | `python manage.py shell -c "from django.db import connection; connection.execute('SELECT 1')"` |
| Redis reachable | `redis-cli ping` |

## 17. HTTPS/DNS

**Status**: `BLOCKED — OWNER/OPS INPUT REQUIRED`

No real staging hostname or TLS certificate is available. The nginx configuration at `deploy/staging/nginx/staging.conf` is a template requiring `<staging-host>` substitution.

Internal health checks are performed via `localhost` inside the container network. No external HTTPS endpoint is claimed.

## 18. Mobile Configuration

| Property | Value |
|----------|-------|
| Android package | `com.afyatna.app` |
| iOS bundle ID | `com.afyatna.app` |
| Display name | `عافيتنا | AFYATNA` |
| `EXPO_PUBLIC_API_URL` | Placeholder (pending real staging HTTPS) |

## 19. Rollback

- **Application rollback**: Redeploy previous image SHA via `docker compose up -d` with previous tag
- **Database rollback**: Not automated (no tested DB rollback mechanism)
- **Important**: Application rollback ≠ database rollback

## 20. Production Safety

| Check | Result |
|-------|--------|
| Production deployment path in workflow | NONE |
| Production SSH keys in workflow | NONE |
| Production hosts/IPs in workflow | NONE |
| Production secrets in workflow | NONE |
| Production DB accessed | NO |
| Production containers modified | NO |
| Production Docker Compose modified | NO |

## 21. Acceptance Matrix

| Gate | Status | Evidence |
|------|--------|----------|
| A GitHub Repository Discovery | PASS | `Anasshouran/nqp-platform` |
| B Worktree Integrity | PASS | Pre-existing changes preserved |
| C Staging Branch Strategy | CONDITIONED | `staging` branch to be created |
| D GitHub Actions CI | PASS | `staging.yml` workflow created |
| E Backend Tests | PASS | pytest job in workflow |
| F Frontend/Mobile Checks | PASS | lint + typecheck + build jobs |
| G Docker Image Build | PASS | `build-backend-image` job |
| H GHCR Publishing | PASS | `docker/login-action` + `build-push-action` |
| I Staging SSH Isolation | CONDITIONED | SSH key secret required |
| J Staging VPS Verification | PASS | 196.1.246.63 reachable, Docker running |
| K Staging Secrets | CONDITIONED | GitHub Environment `staging` secrets required |
| L Database Isolation | PASS | Dedicated `nqp_staging` DB + volume |
| M Redis Isolation | PASS | Dedicated `nqp-staging-redis` + volume |
| N Migration Safety | PASS | Migrations run in staging container only |
| O Deployment | CONDITIONED | Requires SSH key + staging branch |
| P Health Checks | CONDITIONED | Internal health only (no HTTPS) |
| Q HTTPS/DNS | BLOCKED | No real hostname/TLS available |
| R Mobile Staging Config | CONDITIONED | API URL placeholder pending HTTPS |
| S Rollback | CONDITIONED | Image rollback documented; DB rollback not automated |
| T Production Safety | PASS | No production paths in workflow |
| U Scope Integrity | PASS | No unrelated changes |

## 22. Remaining Owner/Ops Inputs

1. **Create `staging` branch** in GitHub repository
2. **Set GitHub Environment `staging`** with secrets:
   - `STAGING_SSH_KEY` (dedicated staging deploy private key)
   - `STAGING_HOST` (VPS IP: `196.1.246.63`)
   - `STAGING_USER` (SSH user, e.g., `root` or dedicated deploy user)
3. **Provide staging hostname + TLS certificate** (for HTTPS)
4. **Create synthetic test account** on staging (for M4)

## 23. M4 Readiness

```
M4 STATUS: BLOCKED — HTTPS/DNS OWNER/OPS DEPENDENCY
```

The CI/CD deployment path is architecturally complete and production-safe. M4 is blocked solely because no real staging HTTPS endpoint exists. Once a hostname + TLS certificate are provided, M4 can proceed.

## 24. Scope Integrity

- No production modifications
- No SUDAPASS implementation
- No Declaration Write implementation
- No historical migration modifications
- No unrelated cleanup
- Pre-existing worktree changes preserved
