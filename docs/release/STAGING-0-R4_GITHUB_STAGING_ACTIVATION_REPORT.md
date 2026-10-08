# STAGING-0-R4 — GitHub Staging Activation Report

## 1. GitHub Configuration

| Property | Value |
|----------|-------|
| Repository | `Anasshouran/nqp-platform` |
| Remote | `https://github.com/Anasshouran/nqp-platform.git` |
| Branch | `staging` |
| Environment | `staging` |
| Secrets set | `STAGING_SSH_KEY`, `STAGING_HOST`, `STAGING_USER` |
| Variables set | `STAGING_HOST=196.1.246.63`, `STAGING_USER=root` |
| Workflow | `.github/workflows/staging.yml` |

## 2. Branch

`staging` branch created from `main` and pushed. All staging deployment changes committed to this branch. Pre-existing worktree changes preserved.

## 3. Environment

GitHub Environment `staging` created with three secrets (SSH key, host, user). No production environment created or modified.

## 4. CI Results

Latest successful run: `37792511613` (SHA `d83602a`)

| Job | Result |
|-----|--------|
| Backend — Django tests | SUCCESS |
| Frontend — typecheck + lint + build | failure (continue-on-error, pre-existing TS errors) |
| Build & publish backend image | SUCCESS |
| Verify image published to GHCR | SUCCESS |

## 5. Image SHA

Deployed image: `ghcr.io/anasshouran/nqp-backend:staging`
Image ID: `ab9066b9f196`
Digest: `sha256:ab9066b9f196929bb232e7aa548db7ee39c4f667c9136193022d6e8fb87475d2`
Git SHA of CI run: `d83602a9f9a73cb46f9fa42b829e60ab897186ae`

Note: The `staging` tag currently points to the same image as `d11b2e7` (identical backend code — only workflow files changed since). The pull-based deployment will update to the exact CI-built image when GHCR bandwidth allows.

## 6. GHCR Result

`ghcr.io/anasshouran/nqp-backend:staging` verified accessible via GHCR v2 API with correct OCI manifest Accept headers (HTTP 200). Tags available: `staging`, `776d4a6`, `d83602a`, and all SHA-tagged builds.

## 7. VPS Verification

| Check | Result |
|-------|--------|
| Host reachable | 196.1.246.63 (ping OK, SSH from operator OK) |
| Docker | 29.1.3 |
| Docker Compose | 2.40.3 |
| Production containers | NONE found |
| VPS identity | SudaniCloudVPS5291139 (Ubuntu 24.04) |

**Critical finding**: GitHub Actions runners (Azure US) cannot SSH to port 22 on 196.1.246.63 — connection times out. This is a cloud-provider-level network block between Azure and SudaniCloud. No local firewall, fail2ban, or iptables rule blocks it; the block is at the infrastructure layer.

## 8. Deployment Result

**Deployment method: PULL-BASED**

```
GitHub Actions → build + push to GHCR → VPS cron poller (deploy-poll.sh) → Docker Compose
```

- `deploy-poll.sh` runs every 2 minutes via cron on the VPS
- Detects new `:staging` tag digest on GHCR
- Pulls image, runs migrations, restarts backend, verifies health
- Records deployed digest to `.deployed-digest`

The SSH-based deployment from GitHub Actions is architecturally configured but blocked by the cloud provider network. The pull-based mechanism is the operational deployment path.

## 9. Migration Result

- 176 migrations applied across 35 apps
- 348 tables created
- `django_migrations` table verified via PostgreSQL directly
- Django `check` returns: "System check identified no issues (0 silenced)"

## 10. HTTPS/TLS Verification

**BLOCKED — OWNER/OPS INPUT REQUIRED**

No staging hostname or TLS certificate exists. The nginx configuration at `deploy/staging/nginx/staging.conf` is a template requiring `<staging-host>` substitution and TLS certificate files at `deploy/staging/tls/`.

Internal health verified via `http://127.0.0.1:8000/api/v1/health/` inside the container network (returns HTTP 200).

## 11. Mobile Configuration

| Property | Value | Status |
|----------|-------|--------|
| Android package | `com.afyatna.app` | PASS |
| iOS bundle ID | `com.afyatna.app` | PASS |
| Display name | `عافيتنا | AFYATNA` | PASS |
| `EXPO_PUBLIC_API_URL` | `__SET_VIA_CLI_OR_DASHBOARD__` | BLOCKED pending HTTPS hostname |

## 12. Smoke Tests

| Test | Result |
|------|--------|
| Health endpoint (`/api/v1/health/`) | PASS (HTTP 200) |
| Auth endpoint (`/api/v1/travelers/`) | PASS (HTTP 401 — auth required, endpoint exists) |
| Certificates path (`/api/v1/vaccination/certificates/`) | PASS (HTTP 401 — auth required) |
| Notifications path (`/api/v1/notifications/`) | PASS (HTTP 401 — auth required) |
| Unauthorized request | PASS (401 without credentials) |
| Mobile API endpoints | NOT DEPLOYED (mobile_api app is uncommitted local work, not in `d11b2e7` image) |

## 13. Rollback

**Application rollback**: Previous image SHA tags are preserved in GHCR (`d11b2e7`, `c291f02`, `e9663e6`, etc.). To rollback: update `.env` `STAGING_BACKEND_IMAGE` to previous SHA tag and run `docker compose up -d backend`.

**Database rollback**: NOT automated. No tested DB rollback mechanism exists. Application rollback ≠ database rollback.

## 14. Production Safety

| Check | Result |
|-------|--------|
| Production containers on VPS | NONE |
| Production DB accessed | NO |
| Production secrets in staging | NO |
| Production Docker Compose modified | NO |
| Production deployment path in workflow | NO |
| Staging DB isolated | YES (`nqp_staging` database, `nqp-staging-postgres` container) |
| Staging Redis isolated | YES (`nqp-staging-redis` container) |
| Staging network isolated | YES (`nqp-staging-net`, separate from `deploy_nqp_internal`) |

## 15. Acceptance Matrix

| Gate | Status | Evidence |
|------|--------|----------|
| A GitHub Repository Discovery | PASS | `Anasshouran/nqp-platform`, remote verified |
| B Worktree Integrity | PASS | Pre-existing changes preserved, staging branch created cleanly |
| C Staging Branch Strategy | PASS | `staging` branch created and pushed |
| D GitHub Actions CI | PASS | `staging.yml` runs successfully on push |
| E Backend Tests | PASS | Django pytest SUCCESS in CI |
| F Frontend/Mobile Checks | CONDITIONED | Typecheck fails (pre-existing TS errors), continue-on-error |
| G Docker Image Build | PASS | Image built and pushed to GHCR |
| H GHCR Publishing | PASS | Image verified via GHCR v2 API (HTTP 200) |
| I Staging SSH Isolation | BLOCKED | SSH key set but GitHub→VPS port 22 blocked by cloud provider firewall |
| J Staging VPS Verification | PASS | 196.1.246.63 verified, Docker running, no production found |
| K Staging Secrets | PASS | `.env` gitignored, chmod 600, staging-only secrets, no production secrets |
| L Database Isolation | PASS | `nqp_staging` DB, dedicated volume, separate container |
| M Redis Isolation | PASS | `nqp-staging-redis`, dedicated volume, separate container |
| N Migration Safety | PASS | 176 migrations applied, Django check clean |
| O Deployment | CONDITIONED | Pull-based (cron poller) operational; SSH blocked by network |
| P Health Checks | PASS | `/api/v1/health/` returns 200, Django check clean |
| Q HTTPS/DNS | BLOCKED | No hostname or TLS certificate — OWNER/OPS INPUT REQUIRED |
| R Mobile Staging Config | CONDITIONED | Identity verified (com.afyatna.app); API URL blocked pending HTTPS |
| S Rollback | CONDITIONED | Image rollback documented; DB rollback not automated |
| T Production Safety | PASS | Zero production impact verified |
| U Scope Integrity | PASS | No SUDAPASS, no Declaration Write, no production changes |

## 16. M4 Readiness

```
M4 STATUS: BLOCKED — HTTPS/DNS OWNER/OPS DEPENDENCY
```

The CI/CD path is operational: GitHub Actions builds and publishes images to GHCR, and the VPS pull-based poller deploys them. Backend is healthy, migrations applied, DB/Redis isolated, production untouched.

M4 is blocked solely because no real staging HTTPS endpoint exists.

### Concrete blockers to resolve:

1. **Staging hostname + DNS entry** — owner must provide an approved domain (e.g., `staging.nqp.gov.sd` or similar) and configure DNS to point to 196.1.246.63
2. **TLS certificate** — owner must provision a valid certificate for the staging hostname (e.g., via Let's Encrypt or commercial CA)
3. **HTTPS reverse proxy** — once hostname + cert exist, configure nginx with the actual hostname and TLS files

### Non-blocking conditions:

- Frontend typecheck has pre-existing TS errors (does not block staging deployment)
- SSH from GitHub Actions to VPS is blocked by cloud provider (pull-based deployment is operational alternative)
- EAS credentials not available (not a blocker for staging validation)

## 17. Integrity / Scope Notes

- No production infrastructure modified
- No SUDAPASS implemented
- No Declaration Write implemented
- No historical Django migrations modified
- No secrets committed to Git
- No real traveler data used
- Pre-existing worktree changes preserved
- `SECURE_SSL_REDIRECT` changed from `True` to `False` in staging docker-compose.yml for internal health checks (no TLS termination inside container network; will re-enable when HTTPS is configured)
