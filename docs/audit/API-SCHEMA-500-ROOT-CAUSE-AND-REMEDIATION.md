# API Schema HTTP 500 — Root Cause and Remediation

- **Date:** 2026-10-09
- **Author:** OpenCode diagnostic task
- **Endpoint:** `GET /api/schema/` (`http://127.0.0.1:8001/api/schema/` on the dev VPS)
- **Verdict:** `ROOT CAUSE IDENTIFIED — DEPLOYMENT NOT AUTHORIZED`

The root cause is proven and the smallest safe correction is prepared in the
repository. The running dev container has **not** been recreated, so the live
endpoint still returns HTTP 500 until the approved deployment step is executed.

---

## Executive summary

`GET /api/schema/` returns HTTP 500 because DRF-spectacular's **YAML** renderer
is pathologically slow for this API (~65 s on the dev VPS for a ~2.3 MB schema
document) and exceeds **Gunicorn's default worker timeout of 30 s**. Gunicorn
aborts the worker mid-render, the request fails, and the traceback ends in
`SystemExit` from `gunicorn/workers/base.py:203 (handle_abort)`, followed by a
`Worker was sent SIGKILL` message in the logs.

`/api/docs/` returns HTTP 200 because it is a static Swagger UI page; the spec
is fetched client-side with a JSON-favouring `Accept` header, and the **JSON**
render completes in ~14 s (under the timeout).

### Evidence

| Probe (dev VPS, `nqp-backend-dev`) | Result |
|---|---|
| `curl http://127.0.0.1:8001/api/schema/` (default `Accept: */*` → YAML) | **HTTP 500**, 141-byte error page |
| `curl -H 'Accept: application/json' http://127.0.0.1:8001/api/schema/` | **HTTP 200** in **14.3 s** |
| `curl http://127.0.0.1:8001/api/docs/` | HTTP 200 |
| `curl http://127.0.0.1:8001/api/v1/health/` | HTTP 200 |
| `docker exec nqp-backend-dev python manage.py spectacular --file /tmp/schema_vps.yaml` | **65 s**, writes 2,276,674 bytes, exit 0 |
| Gunicorn command line (PID 1) | `gunicorn --bind 0.0.0.0:8000 nqp_backend.wsgi:application` — **no `--timeout`**, so 30 s default |

`docker logs nqp-backend-dev` (last traceback, `13:40:21 +0200`):

```
File "/usr/local/lib/python3.13/site-packages/drf_spectacular/renderers.py", line 61, in render
    return yaml.dump(...).encode('utf-8')
...
File ".../yaml/emitter.py", line 825, in write_indent
    self.stream.write(data)
File ".../gunicorn/workers/base.py", line 203, in handle_abort
    sys.exit(1)
SystemExit: 1
[INFO] Worker exiting (pid: 8777)
[ERROR] Worker (pid:8777) was sent SIGKILL! Perhaps out of memory?
[INFO] Booting worker with pid: 9211
```

The abort occurs **during YAML serialization**, not during schema generation.
Schema generation itself (JSON path) is ~14 s.

Local comparison (4-core workstation, Django `runserver`, same source):

| Probe (local) | Result |
|---|---|
| `GET /api/schema/` default (YAML) | HTTP 200 in 12.5 s (3,199,503 bytes) |
| `GET /api/schema/` (JSON) | HTTP 200 in 5.1 s |
| `GET /api/docs/` | HTTP 200 |

The VPS has ~1 slower core available; YAML serialization scales to ~65 s there.

---

## Root cause

1. **Library/mechanism (confirmed):** `drf_spectacular` is the schema library
   (`nqp_backend/urls.py:21`, `SpectacularAPIView`). Its
   `renderer_classes` list puts **YAML first**
   (`drf_spectacular/views.py:51-53`), so a bare request with
   `Accept: */*` negotiates to `OpenApiYamlRenderer`.
2. **Bottleneck:** `drf_spectacular/renderers.py:61` runs pure-Python
   `yaml.dump(...)` over a schema with **1,101 paths** and thousands of
   components — ~65 s on the VPS.
3. **Trigger:** Gunicorn runs with the default `--timeout 30`
   (`deploy/docker-compose.dev-vps.yml`, backend service `command`, mirrored
   in `backend/Dockerfile:26`). At 30 s the arbiter sends SIGABRT; the signal
   handler (`gunicorn/workers/base.py:203`) raises `SystemExit` inside the
   YAML emitter, killing the request → **HTTP 500**.
4. **Why `/api/docs/` works:** the Swagger UI page is static HTML
   (`SpectacularSwaggerView` with `TemplateHTMLRenderer`). It loads the spec
   via a browser XHR whose `Accept` header favours `application/json`, and the
   JSON render finishes in ~14 s, under the timeout.

**Classification:** deployment/configuration defect (Gunicorn worker timeout
too short for the schema endpoint's YAML render), not an application-code,
schema-configuration, or dependency-compatibility defect. Schema generation is
correct and complete; it is only too slow for the YAML format under the 30 s
cap.

---

## Fix (smallest safe correction)

Raise the Gunicorn worker timeout for the dev backend command:

```yaml
# deploy/docker-compose.dev-vps.yml  (backend service)
command: gunicorn --bind 0.0.0.0:8000 --timeout 300 nqp_backend.wsgi:application
```

- Preserves the API contract, both renderers (YAML + JSON), permissions, and
  route names.
- Does **not** fabricate, truncate, or exclude anything from the schema.
- 300 s leaves a 5× margin over the measured 65 s while staying an order of
  magnitude below any watchdog concern for a dev environment.
- Gunicorn `workers` stays at the default (1) — not changed, to avoid
  additional memory pressure on the 3.8 GiB VPS.

### Alternatives considered and rejected

- **Reordering renderers (JSON-first):** would change the endpoint's default
  content type (API contract change) and would leave explicit YAML requests
  (e.g. `?format=yaml`) still timing out. Rejected.
- **Broad `SPECTACULAR_SETTINGS` hacks / disabling validation:** would hide or
  weaken the schema; explicitly disallowed by the task. Rejected.
- **Dependency upgrade** (e.g. a faster YAML/C renderer): out of scope, and the
  timeout fix alone is sufficient and lower-risk.

---

## Files changed

| File | Change | Rationale |
|---|---|---|
| `deploy/docker-compose.dev-vps.yml` | Added `--timeout 300` to the backend Gunicorn command | Permits the ~65 s YAML schema render to complete instead of being SIGABRT'd at 30 s. This is the file deployed on the VPS at `/opt/nqp-platform/deploy/docker-compose.dev-vps.yml` (line 91 there matches the repo command). |
| `backend/apps/accounts/tests/test_openapi_schema.py` | **New** — 2 regression tests | Guards (a) the `/api/schema/` endpoint contract (HTTP 200, valid non-empty OpenAPI JSON, known path present) and (b) the deployment config that keeps the Gunicorn timeout above the schema-render time. Test (b) fails on the pre-fix command and passes with the fix. |

No staging resources, secrets, environment files, DNS, TLS, database contents,
host Nginx, or Docker port mappings were touched.

---

## Tests and outcomes

- `python manage.py check` → **System check identified no issues (0 silenced).**
- `python -m pytest apps/accounts/tests/test_openapi_schema.py -v`
  → **2 passed**:
  - `test_schema_endpoint_returns_valid_openapi_document` PASSED
  - `test_dev_vps_gunicorn_command_sets_schema_safe_timeout` PASSED
- The config test fails against the pre-fix command
  (`gunicorn --bind 0.0.0.0:8000 nqp_backend.wsgi:application` has no
  `--timeout`), i.e. it is a true fail-before / pass-after regression test for
  this fix.
- Broader regression suite:
  - `python -m pytest apps/accounts -q --create-db`
    → **231 passed, 1 skipped** (custom test DB built from scratch).
  - `python -m pytest apps/mobile_api/tests/test_contract_snapshot.py apps/mobile_api/tests/test_classification.py -q`
    → **10 passed** in 27.5 s.

> Note: the timeout dimension is a runtime (Gunicorn) property and cannot be
> asserted by a Django unit test; the VPS probes above (YAML 500 / JSON 200
> under identical conditions) provide the runtime evidence for it.

---

## API verification results

Source-level (local `runserver`, same code, `DEBUG` settings from `backend/.env`):

| Endpoint | Status |
|---|---|
| `GET /api/schema/` (default, YAML) | 200, valid OpenAPI, 3,199,503 bytes |
| `GET /api/schema/` (`Accept: application/json`) | 200, valid OpenAPI JSON |
| `GET /api/docs/` | 200 |
| `GET /api/v1/health/` | 200 |

Live dev VPS (`nqp-backend-dev` @ `127.0.0.1:8001`) — **not yet repaired**:

| Endpoint | Status before fix |
|---|---|
| `GET /api/schema/` (default, YAML) | **500** (worker SIGABRT at 30 s) |
| `GET /api/schema/` (`Accept: application/json`) | 200 (14.3 s) |
| `GET /api/docs/` | 200 |
| `GET /api/v1/health/` | 200 |

The running container image (`ghcr.io/anasshouran/nqp-backend:d11b2e7`) does
**not** contain the fix (the fix is a compose-level command change, not an
application change), so the live endpoint is expected to keep returning 500
until the deployment step below is executed.

---

## Non-touch confirmations

- **Staging:** `nqp-staging-backend`, `nqp-staging-postgres`, `nqp-staging-redis`
  — only observed via read-only `docker ps`; never modified, restarted, or
  redeployed.
- **DNS / TLS / firewalls / Nginx:** untouched.
- **Secrets / env files:** untouched; no secret values printed, logged, or
  committed. (SSH access used a password supplied by the operator and was never
  written to the repository.)
- **Database:** no destructive commands, no migrations, no data changes.
- **Docker port mappings / container topology:** unchanged.

---

## Remaining deployment steps (require approval)

1. Apply the compose command edit to the VPS copy of
   `/opt/nqp-platform/deploy/docker-compose.dev-vps.yml` (keep the image tag the
   VPS currently uses).
2. Recreate the dev backend container:
   `cd /opt/nqp-platform && docker compose -f deploy/docker-compose.dev-vps.yml --env-file .env.dev-vps up -d --no-deps backend`
3. Verify:
   - `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8001/api/schema/` → **200** (YAML, ~60-65 s)
   - `curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' http://127.0.0.1:8001/api/schema/` → **200** (~14 s)
   - `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8001/api/docs/` → **200**
   - `docker logs --since 2m nqp-backend-dev | grep -c SIGKILL` → 0

Optional follow-up (not required to fix this issue): serve the schema as JSON
by default or cache the rendered schema to avoid the ~65 s single-worker
blockage on every cold schema request.