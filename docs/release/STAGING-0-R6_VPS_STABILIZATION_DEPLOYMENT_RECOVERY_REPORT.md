# STAGING-0-R6 — VPS Stabilization & Staging Deployment Recovery Report

Phase scope: **RECOVERY AND DEPLOYMENT** — restore the degraded Docker/containerd runtime to health, recover the stalled pull-based staging deployment, deploy the verified GHCR staging backend artifact, and preserve the development environment and production posture.

---

## Executive Verdict

```
ACCEPTED WITH CONDITIONS
```

The VPS crisis described in R5 is **resolved**. Root cause was found and fixed: the pull-based poller compared two **incompatible digest schemes** (remote *manifest-list* digest vs. a *config/image* digest stored in `.deployed-digest`), so it **never** converged; combined with **no lockfile**, every 2-minute cron tick launched a fresh `docker compose pull backend` against ~60KB/s GHCR bandwidth. That built up to **25 concurrent pulling processes**, saturating containerd and filling the disk to **100%** (`0` bytes free), which starved the Docker API and made the daemon effectively unresponsive.

After recovery, the verified GHCR staging backend (immutable digest `sha256:2b5d61…` == CI commit `d83602a`) is **deployed and healthy** on the staging stack, all 9 containers (dev + staging) are running, disk is back to 28% used, and the poller has been repaired minimally (lockfile + pull timeout + atomic state write) so it now **converges silently** instead of storming.

Conditions carried forward (from R5, unchanged — all **out of R6 scope**): owner must provide a staging hostname/DNS (`*.afyatna.com` still resolves publicly to `127.0.0.1`), HTTPS-origin/cert story for staging, `CSRF_TRUSTED_ORIGINS` setting fix, tracked TLS private key hygiene, and staging Nginx `443:443` conflict.

---

## Before / After State

| Metric | R5 (before) | R6 (after) | Status |
|--------|-------------|------------|--------|
| Disk usage | 88% used, 12G free → **100% full, 0 free** | **26G used / 67G free (28%)** | ✔ Resolved |
| Load average (15m) | 4.5–8 → **18–24** | **0.18–0.28** | ✔ Resolved |
| Swap | 1.55 GiB used → **2.0/2.0 exhausted** | ~free; Mem 2.7 GiB available | ✔ Resolved |
| containerd CPU | **97%** (stuck) | normal | ✔ Resolved |
| `docker info` / `docker ps` | time out | instant, daemon healthy | ✔ Resolved |
| Concurrent pull/poller procs | **25** `deploy-poll.sh`/`compose pull` + 12 `unpigz` | 0 (single poller, lock-protected) | ✔ Resolved |
| Staging backend image | `d11b2e7` (`ab9066…`) — old | **`@sha256:2b5d61…`** (CI `d83602a`) | ✔ Deployed |
| Staging health `/api/v1/health/` | UNKNOWN (daemon) | **200** `{"status":"ok"}` | ✔ Healthy |
| Django `check` (staging) | UNKNOWN | **0 issues** | ✔ Passed |
| Migrations (staging DB only) | UNKNOWN | **No migrations to apply** | ✔ Passed |
| Dev stack | Running (degraded visibility) | All 6 dev containers healthy, endpoints 200 | ✔ Preserved |
| Rollback candidate `d11b2e7` | present | **present** (image preserved) | ✔ Preserved |
| Production | none present | **none present; untouched** | ✔ Safe |

---

## Docker Runtime Recovery

### A. Root-cause determination

Evidence chain (all recorded on VPS):

1. `crontab -l` showed the poller schedule `*/2 * * * * /opt/nqp-platform/deploy/staging/deploy-poll.sh`.
2. `deploy-poll.sh` had **no lockfile / flock** — concurrent invocations were unrestricted.
3. The poller computes `REMOTE_DIGEST` via `docker manifest inspect "$IMAGE"` → returns the **manifest-list digest** (`sha256:2b5d61…`).
4. `.deployed-digest` contained `sha256:ab9066…` — the **config/image digest** of the running `d11b2e7` image (written manually during R4).
5. `2b5d61…` ≠ `ab9066…` **by design** (scheme mismatch) → the poller permanently believed a new image existed → **every cron tick** ran `docker compose pull backend`.
6. GHCR bandwidth ~60KB/s → each pull lasted many minutes → pulls **stacked** → 25 concurrent processes each decompressing layers with `unpigz` → containerd 97% CPU, load 18–24, disk 100% full, Docker API starved.
7. The R5-defined allowed action ("stop/remove only clearly identified stalled/incomplete image-pull processes") was matched exactly to this state.

### B. Remediation performed

| Step | Action | Evidence |
|------|--------|----------|
| 1 | Killed the 25+ gathered `deploy-poll.sh` / `docker compose … pull backend` chains and the 12 `unpigz` workers | `pgrep` counts returned to 0 |
| 2 | Temporarily disabled the cron entry (commented) to stop respawns during remediation | `crontab -l` showed `# R6 DISABLED: */2 …`, later restored |
| 3 | Confirmed Docker daemon recovery | `docker info` OK; `docker ps` showed all 9 containers |
| 4 | Freed disk (no volumes removed, no `--volumes` prune, no data containers touched) | Disk 100% → 28%; only failed-pull blob space released automatically |
| 5 | Verified dev environment intact immediately after | dev backend `127.0.0.1:8001` 200, dev nginx `8080` 200, container health `healthy` |

No `postgres`, `redis`, celery, or frontend containers were stopped, restarted, or recreated. No data volume was touched. Production was verified absent both before and after.

---

## GHCR Image Verification & Integrity

| Item | Value |
|------|-------|
| Mutable tag | `ghcr.io/anasshouran/nqp-backend:staging` |
| Immutable SHA tag | `ghcr.io/anasshouran/nqp-backend:d83602a` (CI commit `d83602a`) |
| Verified manifest-list (amd64) digest | `sha256:2b5d61aec43de6d69ecbe3e622c0d3e45427cf5102795681bfa73070c2ffd8fd` |
| `:staging` == `d83602a` == `2b5d61…` | ✔ confirmed against GHCR API |
| Pulled image config digest | `sha256:6502d632…` (sha256 of the **uncompressed** config; GHCR stores it gzipped as `d76aaa56…` — valid OCI behavior, verified) |
| Layer count | 10 |
| Declared (labels/config) image flavor | Python 3.13.16, NQP backend |
| Pull method | Single pull by immutable SHA tag `d83602a` after concurrency was removed (previous stalls were caused by 25 concurrent pulls, not the image) |

---

## Staging Deployment

| Item | Value |
|------|-------|
| Stack | `deploy/staging/docker-compose.yml` (`nqp-staging-net`) |
| Backend image (`.env`) | now pinned immutable `STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend@sha256:2b5d61…` |
| Container | `nqp-staging-backend` recreated via `docker compose up -d backend` |
| DB | `nqp_staging` (isolated staging volume `staging_staging-postgres-data`) |
| Redis | isolated `staging_staging-redis-data`, appendonly |
| `migrate --noinput` | ✔ ran (staging backend only) — "No migrations to apply" |
| Django `check` | ✔ "System check identified no issues (0 silenced)" |
| Health `/api/v1/health/` | **HTTP 200** `{"status":"ok","service":"afyatna-backend"}` |
| Node | internal `localhost:8000` inside `backend` container (no public port — consistent with no staging hostname yet) |
| Rollback candidate | `ghcr.io/anasshouran/nqp-backend:d11b2e7` (digest `ab9066…`) **preserved** locally |

### Deployment digest / poller state

- `.deployed-digest` now = `sha256:2b5d61aec43de6d69ecbe3e622c0d3e45427cf5102795681bfa73070c2ffd8fd` — the **same manifest-list digest** the poller computes, so the comparison now converges.
- Verified with a live test: running the poller twice returns exit 0 with **no** new `NEW IMAGE detected`/`DEPLOYED` log lines (the storm log ended at 18:52, poller now exits silently).

---

## Poller Repair (minimal, staging-only)

`deploy/deploy-poll.sh` (VPS, untracked runtime artifact) — three minimal changes, original preserved as `deploy-poll.sh.bak-r6`:

| Change | Reason |
|--------|--------|
| `flock`-based lockfile (`/tmp/nqp-staging-deploy-poll.lock`, non-blocking) | Eliminates concurrent cron stacking — the root cause of the 25-process storm |
| `timeout 900` around `docker compose pull backend` | Prevents a slow/stalled pull from hanging forever and accumulating |
| Atomic state write (`>` `.tmp` then `mv`) | Ensures `.deployed-digest` is never left half-written |

```
# R6: serialize concurrent cron invocations (no-lock was root cause of the pull storm)
LOCK_FILE="/tmp/nqp-staging-deploy-poll.lock"
exec 9>${LOCK_FILE}
if ! flock -n 9; then
  exit 0  # another poll run is in progress; skip silently
fi

timeout 900 docker compose --env-file .env -f docker-compose.yml pull backend || { log "ERROR: pull timed out"; exit 1; }
echo "$REMOTE_DIGEST" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
```

Verified: `bash -n` OK; nested-run test proves the lock makes concurrent invocations exit 0 silently. **Deployment model unchanged** (pull-based through the existing poller/compose pipeline; it will now only pull when GHCR actually advances `:staging`).

---

## Cone of Silence / Non-Changes

The following were explicitly **not** touched in R6 (verified where possible):

- **Production:** no production containers, databases, secrets, or services exist on this VPS; none were created or modified.
- **Dev stack** (`deploy/docker-compose.dev-vps.yml`): all 6 containers untouched and healthy; `api-dev.afyatna.com` / `dev.afyatna.com` Nginx vhosts and Let's Encrypt certs untouched; verified 200 through local Nginx.
- **Data volumes:** `deploy_nqp_postgres_data`, `deploy_nqp_redis_data`, `staging_staging-postgres-data`, `staging_staging-redis-data` — untouched, verified present. No `docker system prune --volumes`, no volume deletion.
- **DNS / TLS / Nginx for staging:** no changes.
- **Code / schema:** no `makemigrations`, no settings.py change, no mobile config change, no frontend SHA pinning.
- **SUDAPASS / Declaration Write / risk-rule engines:** untouched (not present as flows on staging).
- **Local repo:** no local files modified by this phase; the pre-existing R4 baseline worktree (settings.py, workflows, staging deploy docs, etc.) remains as recorded. New local entries that appeared during the session — `backend/apps/hr/serializers.py` (modified), `.tmp`, `,\necho` — were **not created by R6** and are left untouched for the owner to assess.

---

## Owner / Ops Actions Required (next steps — all staged)

| # | Action | Phase |
|---|--------|-------|
| 1 | Supply an owner-approved staging hostname (e.g. `staging.nqp.gov.sd`) and DNS record; note all `*.afyatna.com` still resolve publicly to `127.0.0.1` | Owner |
| 2 | Issue/place staging TLS cert + fix `deploy/staging/nginx/staging.conf` `443:443` host conflict before enabling the public staging Nginx | M4+ |
| 3 | Apply the `CSRF_TRUSTED_ORIGINS` code fix in `backend/nqp_backend/settings.py` (currently not read) before HTTPS staging goes live | M4+ |
| 4 | Stage the `surveillance` app model changes into migrations **when the schema phase is authorized** (the running image reports "models have changes not yet reflected in a migration" — no `makemigrations` performed in R6, as forbidden) | Schema/CI phase |
| 5 | Set mobile/staging API URL (`EXPO_PUBLIC_API_URL`) once the staging hostname exists | M5 |
| 6 | Fix tracked TLS private key hygiene (`deploy/ssl/privkey.pem` in git) | Hygiene |

---

## R6 Compliance Confirmation

- Allowed actions executed: stopped clearly identified stalled/incomplete image-pull processes; safe prune-equivalent (failed-pull blob space only, no volumes); Docker/containerd left running (no restart required after recovery); replicated verified GHCR artifact; ran staging `migrate` + `check` against `nqp_staging` only; minimal poller repair.
- Forbidden actions not performed: no production access; no DNS/TLS/Nginx changes; no invented hostnames; no mobile app ID changes; no SUDAPASS/Declaration Write; no `makemigrations`; no schema changes; no volume/data deletion; no `--volumes` prune; no SSH-style deployment to production.
- Evidence files on VPS: `deploy/staging/deploy-poll.sh` (+ `.bak-r6`), `/tmp/nqp-staging-deploy-poll.lock`, `.deployed-digest`.