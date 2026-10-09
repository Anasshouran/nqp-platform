# Staging (deploy/staging)

Isolated non-production stack. NOT running by default.
Staging DB/Redis/volumes are strictly separate from development and production.

## Requirements before `up`

- owner-approved app IDs (set in `mobile/app.json`: com.afyatna.app)
- owner-approved staging host + DNS; TLS cert placed in `deploy/staging/tls/`
  (`fullchain.pem` + `privkey.pem`; never committed, `*.pem`/`*.key` ignored)
- `deploy/staging/.env` created from `.env.example` with EXTERNAL secrets (gitignored)
- synthetic/test data only

## Release identity contract (immutable)

Both images carry the **same** `<RELEASE_SHA>` (the immutable CI tag):

```bash
STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend:<RELEASE_SHA>
STAGING_FRONTEND_IMAGE=ghcr.io/anasshouran/afyatna-frontend:<RELEASE_SHA>
```

- No `latest` is ever required or relied upon.
- The staging CI pipeline publishes `nqp-backend:{staging, <sha>}` and
  `afyatna-frontend:{staging, <sha>}` on every push to `staging`. The
  `:staging` tag is only a mutable latch for the pull-based VPS poller; the
  **deploy always pins the immutable `<sha>` tags**.
- Rollback: re-pin the two variables to a previously known-good SHA and re-run
  `deploy.sh`. No source rebuild is required.

## Pull-based deployment (VPS)

GitHub Actions cannot SSH to the staging VPS (port 22 blocked by the cloud
provider). The VPS runs a `deploy-poll.sh` cron (every 60s) that watches the
`nqp-backend:staging` tag; when a new SHA appears it stamps `.env` with that SHA
for both images and runs:

```bash
cd deploy/staging
STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend:${SHA} \
STAGING_FRONTEND_IMAGE=ghcr.io/anasshouran/afyatna-frontend:${SHA} \
  ./deploy.sh
```

`deploy.sh` asserts both images share the same SHA, validates the compose
config, pulls the immutable images, starts the full stack (postgres, redis,
backend, celery worker, celery beat, frontend, nginx), runs migrations +
collectstatic (backend entrypoint), and smoke-tests `/api/v1/health/`,
`/static/`, `/media/` and a Celery worker ping.

## Runtime facts

- `/static/` and `/media/` are served by nginx from named volumes shared with
  the backend (`staging-static-data`, `staging-media-data`) — persistent across
  container recreation.
- Celery worker runs the app tasks (`apps.notifications`, `apps.who`). The beat
  service is present (parity with the dev stack); there are currently **no
  scheduled periodic tasks** defined in the codebase, so beat runs idle.
- MinIO/S3 is OFF by default (`USE_S3=False`); uploads go to the local media
  volume unless the optional `MINIO_*` variables are supplied.

## Manual start (not recommended; use deploy.sh)

```bash
cp .env.example .env   # fill values (no real values committed)
STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend:<SHA> \
STAGING_FRONTEND_IMAGE=ghcr.io/anasshouran/afyatna-frontend:<SHA> \
  docker compose --env-file .env up -d
```

Verify: `curl -I https://<host>/` (TLS valid) · `GET /api/v1/health/` ·
mobile `EXPO_PUBLIC_API_URL=https://<host>/api/v1`.