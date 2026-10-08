# STAGING-0 — Release Readiness & Deployment Audit

- **Date:** 2026-10-08
- **Repository:** https://github.com/Anasshouran/nqp-platform (remote `origin`)
- **Branch audited:** `staging` (local HEAD == `origin/staging` == `d83602a` — the commit whose backend image is published to GHCR)
- **Method:** 100% read-only. No file modified, no branch created, no secret rotated, no test fixed.
- **Mode:** GitHub Code → GitHub Actions → GHCR → staging VPS → Docker Compose (pull-based).

---

## 1. Verdict

> **STAGING-0 READY WITH CONDITIONS**

The deployment pipeline itself is mechanically **green** — the latest `staging` pipeline run published `ghcr.io/anasshouran/nqp-backend:{staging, d83602a}` and the backend image is being pulled/deployed by the documented pull-based VPS poller. However the release is **not yet safe to declare user-facing-ready** until the mandatory conditions (P1 items in §10) are resolved. No P0 items exist; no single defect blocks the operational backend deploy that already happened.

---

## 2. Scope

Accepted as baseline: UI/UX Phase 1, 2A, 2B Wave 1+2, Backend Privacy Hardening, M2-D2, UI-019, UI-020 `EMERGENCY` (all CLOSED/ACCEPTED — not re-opened). This audit covers: repository & branch state, working-tree hygiene, CI/CD workflows (non-mobile + mobile), GHCR container registry state, Docker build artifacts, Docker Compose stacks (dev + staging), nginx, Django settings/env-contract compliance, security posture, and verification commands.

## 3. Repo & Branch Inventory

| Item | Value | Verdict |
|---|---|---|
| Branch checked out | `staging` | OK |
| local HEAD == origin/staging | yes — `d83602a9f…` | OK |
| Git tags | none | absence of tags is not required for the SHA-tag deploy model |
| Remotes | single: `origin` → github.com/Anasshouran/nqp-platform | OK |
| Working tree | **254 modified, 5 staged-added, 1 deleted, 179 untracked (439 total)** | **FAIL** — see §4 |
| `main` branch | exists; latest CI run on `main` is RED (2026-09-27) | see §6 |

## 4. Git State Findings

- All release work from every accepted phase (UI-019/UI-020 included) is **uncommitted and not part of any published image**: `254 M` files, `179 ??` untracked. Untracked include `deploy/staging/*`, `.github/workflows/m1-mobile.yml`, many migrations (`accounts` 0016/0017, `carriers` 0013–0016, `clinic` 0011, `integration` 0003–0006), `backend/apps/borders_health/`, `backend/apps/hr/`, `food_quarantine` test files, `frontend/src/pages/emergency/EmergencyPage.test.tsx`, and the whole `docs/audit/*` set.
- Consequence: a CI run on `staging` today only tests/publishes committed HEAD (`d83602a`) — the current working tree has **never** been validated by CI and is **not deployable** until pushed.
- Local venv is Python 3.11 (`backend/.venv`) while code/CI target Python 3.13 — local-only divergence, low impact.

## 5. Local Verification Results (recomputed for this audit)

| Check | Command | Result |
|---|---|---|
| Django system check | `python manage.py check` | no issues (0 silenced) |
| Migrations drift | `python manage.py makemigrations --check --dry-run` | **No changes detected** |
| Frontend prod build | `npm run build` (tsc -b + vite) | **exit 0** (42.8s); warnings: several chunks >500 kB (ag-grid/recharts/ui/index) |
| Frontend lint (full repo) | `npm run lint` | **0 errors, 323 warnings** (baseline, pre-existing) |
| Frontend tests | `npx vitest run` | **48 files / 326 passed** (UI-019/UI-020 regression clean) |
| Historical CI failures (re-run locally) | 4 tests that failed main CI on 2026-09-27 | **all 4 PASS locally** (flaky/env-set, see §6) |
| `emergency_eoc` suite incl. failures | targeted rerun | 3 passed, 1 pre-existing fail (`test_kill_switch_activate_deactivate`) |
| Full backend suite (local) | `pytest apps -q --reuse-db` | did not complete in audit window (~14% in 25 min on first attempt; 5% at ~15 min on fresh restart) — local runtime anomaly only; **CI completes the same suite** (see §6) |

## 6. CI/CD Pipeline

Workflows (`.github/workflows/`): `ci.yml` (committed, main/master+PR), `staging.yml` (committed, push to `staging` + dispatch), `m1-mobile.yml` (**untracked** — mobile/contract/security gates, additive), `mirror-infra-images.yml`, `mirror-postgres-image.yml`.

- **`ci.yml`** (main): backend `pytest apps -q --reuse-db` + migrations check (services postgres:16/redis:7); frontend lint + test + build; pushes `nqp-backend:{dev,shortsha}` and `afyatna-frontend:{dev,shortsha}` on main, `pr-*` on pull requests.
- **`staging.yml`** — mirrors deployment reality:
  - `backend-tests` gate → `build-backend-image` (publishes `nqp-backend:{staging,shortsha}`) → `verify-image-published` (anonymous GHCR token + manifest Accept headers). Deploy itself is **pull-based**: the staging VPS runs `deploy-poll.sh` on cron (60s) detecting a new `:staging` tag. GitHub Actions SSH to the VPS is blocked by the cloud-provider firewall (documented in comments/README).
  - **Deploy gate = backend-tests only.**
  - **`frontend-checks` has `continue-on-error: true`** and does NOT run `npm test` (only lint/typecheck/build).
  - **No frontend image is built or published anywhere in the staging pipeline.**
- **Reported run history (today, workflow “Staging — Build, Publish & Deploy”):** 9 runs — 8 consecutive **failures** (verified via `gh` — the final failures were in `Verify image published to GHCR`, i.e., bad manifest Accept headers / `nqp-backend` auth check) then the **most recent run succeeded** (`backend-tests` green, image published, GHCR verified).
- **Main CI:** last run (2026-09-27) **failed** in `Backend — Django tests` with 4 tests: `test_security_hardening.py::test_role_fk_ignored_when_assignment_inactive_or_out_of_window`, `airport_health/test_airport.py::test_dashboard_kpis_upcoming_flights_and_suspect`, `carriers/test_carriers.py::test_dashboard_stats`, `laboratory/test_lab_users.py::test_future_dated_assignment_cannot_yet_manage`. **None reproduce on the current tree** — classified as flaky/environment-dependent; the only reproducible backend failure today is the known `emergency_eoc` kill-switch test (pre-existing debt, §17).

## 7. Container Registry State (GHCR, via authenticated `gh api`)

| Image | Tags present | Notes |
|---|---|---|
| `nqp-backend` | `staging`, `d83602a`, `776d4a6`, `f26c0aa` | `staging` = today’s successful publish; **no `:latest`** |
| `afyatna-frontend` | `dev`, `8b2b02b` | built by old/ci.yml on main; **no `:latest`** |
| `nqp-frontend` | `dev`, `b22d9ff` | legacy duplicate image name (naming drift) |
| `afyatna-backend` | `dev` | legacy name; still referenced by dev compose |
| `postgres` | `16-alpine` | mirrored OK |
| `redis` | `7-alpine` | mirrored OK |
| minio | — | mirror job **failed** (staging does not need MinIO; dev pulls `minio/minio:latest` from Docker Hub) |

→ Both `:latest` tags that the Compose defaults reference do **not exist**.

## 8. Docker & Deployment Artifacts

- **`backend/Dockerfile`:** python:3.13-slim + GDAL (PostGIS), installs `requirements/base.txt`, `collectstatic --noinput` with a build-time placeholder `SECRET_KEY` (guard-aware → safe), runs Gunicorn on :8000. Sound.
- **`frontend/Dockerfile`:** node:22-alpine build → nginx:alpine; injects `VITE_API_URL`; SPA `try_files` fallback + internal `/api/` proxy. Sound.
- **Dev compose (`deploy/docker-compose.yml`):** backend image default `afyatna-backend:dev` (**stale name** — CI publishes `nqp-backend:dev`), full celery + celery-beat, MinIO, shared `../backend/{static,media}` mounts, nginx serves `/static/`/`/media/` alongside frontend. Internal healthcheck wiring present.
- **Staging compose (`deploy/staging/docker-compose.yml`, untracked):**
  - backend image default `ghcr.io/anasshouran/nqp-backend:latest` — **missing on GHCR** (must set `STAGING_BACKEND_IMAGE`).
  - frontend image default `ghcr.io/anasshouran/afyatna-frontend:latest` — **missing on GHCR**; only `dev`/`8b2b02b` exist. `deploy.sh` never pulls/updates frontend.
  - **No celery worker or beat** service (dev stack has them) → all background/async flows are dead on staging.
  - **No static/media volume + no `/static/`/`/media/` nginx locations** → Django admin and media uploads will not render (admin routes to backend, static requests return SPA `index.html`).
  - env contract is via `env_file: .env` + inline `STAGING_*` overrides; `POSTGRES_*`/`REDIS_*` are read by settings (verified) — DB mapping is correct.
- **`staging/deploy.sh` (untracked):** robust guardrails (`set -Eeuo pipefail`, refuses missing `.env`/image, no `down -v`, no volume deletion, no secret printing), runs `migrate`, `check`, and `/api/v1/health/` smoke test. **Only pulls/updates the backend image.**
- **`staging/nginx/staging.conf`:** template with placeholder `<staging-host>` and TLS from `./tls` (owner must provision certs; `.gitignore` covers `*.pem`/`*.key`).

## 9. Django Settings / Env-Contract Compliance

- `DEBUG` default `False`; **placeholder SECRET_KEY guard** raises `ImproperlyConfigured` when `DEBUG=False` (covers `dev-secret-key-change-in-production` + `your-secret-key-here`). Enforced — cannot boot prod with placeholder keys.
- `ALLOWED_HOSTS` from env; `CORS_ALLOW_ALL_ORIGINS` only when `DEBUG=True`; prod block sets `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, HSTS 1y (+ subdomains, preload), nosniff, `X-FRAME_OPTIONS DENY`.
- DB reads `POSTGRES_*` first, falls back to `DB_*` → staging compose compatible; GIS via `DB_ENGINE/USE_GIS`.
- JWT: independent `JWT_SECRET_KEY` honored; Redis-derived Celery broker/result built from `REDIS_HOST/REDIS_PORT`.
- `USE_S3=False` default (local `media/`); S3/MinIO opt-in.
- **GAP — `CSRF_TRUSTED_ORIGINS` is declared in the staging env contract (`STAGING_CSRF_TRUSTED_ORIGINS`) but never read by `settings.py`** (only Django’s empty global default exists). Same-origin SPA proxying works today, but the contract value is dead and will not protect an alternate frontend Origin.
- `PUBLIC_SITE_URL`/`PASSWORD_RESET_BASE_URL` opt-in with safe defaults.

## 10. Security Review (release surfaces)

- **No committed secrets:** `git grep` for private-key/AWS/GitHub-token patterns over tracked non-doc code → clean. `k8s/secrets.yaml` holds `REPLACE_ME_BASE64` placeholders only (with instructions). `deploy/ssl/*.pem`/`*.key`/all `.env*` ignored; `deploy/.env.who` present locally, mode 0600, untracked. Frontend `.env.production` = `VITE_API_URL=/api/v1` only.
- Dockerfile build-time keys are guarded non-placeholders; secrets are runtime-only via env.
- nginx: `server_tokens off`, TLS 1.2/1.3 (main conf); HSTS set by Django itself. Staging nginx relies on TLS certs owned on the VPS.
- Findings: no P0. Minor cleanliness issues only (see register).

## 11. Findings Register

| ID | Severity | Finding |
|---|---|---|
| F-01 | **P1** | Working tree is 439 entries uncommitted; no accepted-phase code is in any published image; CI cannot gate it. |
| F-02 | **P1** | Staging pipeline publishes **backend only**; frontend is never built/published (`frontend-checks` is `continue-on-error` + no `npm test`, and there is no frontend image job). Staging frontend originates from an old `afyatna-frontend` build (tag mismatch). |
| F-03 | **P1** | Staging compose defaults `nqp-backend:latest` and `afyatna-frontend:latest` **do not exist** in GHCR → `docker compose up` per README cannot start; only explicit `STAGING_*_IMAGE` works, and `deploy.sh` covers backend only. |
| F-04 | **P1** | Staging stack has no `/static/`/`/media/` serving (admin/assets + uploads broken) and no celery/beat (async dead). |
| F-05 | **P2** | Main-branch CI is red since 2026-09-27 (4 tests, none reproducible locally → flaky); no current green evidence on `main`, so the stable release train is unverified. |
| F-06 | **P2** | Known pre-existing failure `apps/emergency_eoc/tests/test_eoc.py::test_kill_switch_activate_deactivate` reproduces (assert inactive at `test_eoc.py:126`); unrelated to UI-020; must be fixed before any promotion. |
| F-07 | **P2** | `STAGING_CSRF_TRUSTED_ORIGINS` env var is dead config (`settings.py` never reads `CSRF_TRUSTED_ORIGINS`). |
| F-08 | **P2** | Image-name drift: dev compose pulls `afyatna-backend:dev` while CI publishes `nqp-backend:*`; `nqp-frontend` duplicate package exists. Dev compose will not receive new backend builds automatically. |
| F-09 | **P3** | `deploy/staging/*`, `.github/workflows/m1-mobile.yml`, `docs/audit/*` untracked — pipeline/mobile/deployment declarations are not version-controlled. |
| F-10 | **P3** | Full backend suite locally is extraordinarily slow (~3–4 h estimated; 14% in ~25 min first attempt, 5% at ~15 min restart) — local env only; CI completes it (~7 min on 2026-09-27 run). Investigate test-db/PostGIS/parallelism locally. |
| F-11 | **P3** | Frontend: 323 lint warnings (0 errors) and several >500 kB chunks (code-splitting opportunity). |
| F-12 | **P3** | Dependency hygiene: pip ranges (`>=…,<…`) instead of locked pins; `gunicorn` duplicated in `prod.txt`; `pip-audit` advisory scan runs `continue-on-error: true` (informational only). |
| F-13 | **P3** | MinIO mirror workflow `mirror-infra-images.yml` fails at the `minio/minio:latest` mirror (cancels matrix siblings). Not staging-critical (`USE_S3=False`; dev uses Docker Hub). |
| F-14 | **P3** | Local venv runs Python 3.11 vs code/CI 3.13. |

## 12. Required Owner Actions

**Must (P1 — before staging is user-facing):**
1. Commit the working tree (all accepted release work + `deploy/staging/*` + workflows + migrations) on `staging`; re-run the staging pipeline on the full tree.
2. Make frontend part of the staging pipeline: publish a `nqp-backend`/frontend staging image (`afyatna-frontend:staging`+sha) and either add a frontend image job or make `deploy.sh` pull/update it; drop `continue-on-error` on `frontend-checks` (and add `npm test` to it).
3. Fix the two missing compose defaults (point `STAGING_BACKEND_IMAGE`/`STAGING_FRONTEND_IMAGE` at real tags — e.g. `:staging`) or create `:latest` tags.
4. Add `/static/` and `/media/` serving + a shared static/media volume in the staging stack; add celery worker/beat services (or explicitly scope staging validation to synchronous flows).

**Should (P2 — within the release cycle):** fix kill-switch test (pre-existing); wire `CSRF_TRUSTED_ORIGINS` into settings (or remove it from the contract); align dev-compose/docker image names with `nqp-backend:*`/`afyatna-frontend:*`; establish a green `main` CI baseline (re-run to confirm the 4 flaky tests pass).

**Could (P3 — backlog):** version-control the untracked deployment/mobile/docs files; lock backend deps (or commit to pip-audit as a hard gate); code-split frontend chunks; purge the duplicate `nqp-frontend` package and dead `afyatna-backend` name; sort local pytest speed; re-enable MinIO mirror or drop the workflow.

## 13. Acceptance Gates

| Gate | Criterion | Result |
|---|---|---|
| A | Repo present, correct remote/branch | PASS |
| B | Working tree committed & consistent | **FAIL (F-01)** |
| C | No secrets in tracked release surfaces | PASS (clean grep; placeholders guarded) |
| D | CI workflows defined for main/staging/mobile | PASS (committed 4 workflows; m1 untracked → F-09) |
| E | Backend gate green on release head | PASS (recent staging run; backend-tests gate enforced) |
| F | Frontend typecheck/lint/build green locally | PASS (0 errors; warnings baseline) |
| G | Frontend tests green | PASS locally (48/326); **not part of staging CI** → partial |
| H | Images built & published | PASS backend (`staging`+sha); **FAIL frontend** (F-02) |
| I | Compose default tags resolvable | **FAIL (F-03)** |
| J | Deploy mechanism documented & executable | PASS (pull-based poller + guarded deploy.sh); frontend excluded → conditional |
| K | Health/smoke checks present | PASS (`/api/v1/health/` in urls + smoke in deploy.sh) |
| L | Static/media/celery functional on staging | **FAIL (F-04)** |
| M | Env contract fully honored by settings | **FAIL (F-07)**; DB/CORS/HSTS/guard PASS |
| N | Security header/TLS posture | PASS (HSTS, secure cookies, TLS 1.2+, nosniff, DENY) |
| O | Dependency/security hygiene acceptable | PASS with notes (F-11/F-12) |
| P | Release/deploy docs exist | PASS (`README-DEV-DEPLOY.md`, staging README, .env.example) |
| Q | Main stable train green | **FAIL (F-05)** |
| R | No file modified during this audit | PASS |

## 14. Evidence & Logs

- Local HEAD == `origin/staging` == `d83602a`; GHCR `nqp-backend` tags `{staging, d83602a, 776d4a6, f26c0aa}`; `afyatna-frontend` tags `{dev, 8b2b02b}`.
- `gh run list`/`gh run view` — staging pipeline 8 fails → 1 success (verify-image stage), main CI 4-test failure (non-reproducible locally), mirror-infra minio failure.
- Local command results: `manage.py check` OK; `makemigrations --check` clean; `npm run build` exit 0; `npm run lint` 0 errors/323 warnings; `vitest run` 48/326; targeted backend suite 63 passed / 1 failed (kill-switch).
- Background artifact `/tmp/opencode/pytest_full.log` (full suite still running locally; not CI-representative).

## 15. Deferred Items (tracked, out of scope)

1. Fix `test_kill_switch_activate_deactivate` (pre-existing; must precede promotion — explicitly **not fixed** during this audit).
2. Full-suite green regression on a fresh CI run for the complete working tree (requires F-01 push).
3. Public-site TLS certificate provisioning on the staging VPS (`deploy/staging/tls/`) and `SECURE_HSTS` tuning if preload is intended.

## 16. Classification Note

The kill-switch failure is a **pre-existing backend defect predating STAGING-0** — identified in the M2-D2 era and carried forward; it does not block this audit’s verdict (pipeline/deploy readied) but is a **condition on promotion** (see §17). No test failure was introduced by UI-019/UI-020.

## 17. Conclusion

Under the current plan (Code → Actions → GHCR → VPS poller → Compose), staging operates end-to-end **for the backend only**, and today’s published head (`d83602a`) is deployable right now. The four P1 conditions in §12 (worktree commit, frontend pipeline inclusion, image-default fixes, static/media/celery completeness) convert the release from “backend-only operational” into a full, trustable staging environment. None of them are architectural blockers — hence **READY WITH CONDITIONS** rather than BLOCKED.