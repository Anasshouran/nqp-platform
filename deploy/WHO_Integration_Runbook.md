# WHO ICD-11 Integration Runbook

> Scope: enabling WHO ICD-11 integration only. No Disease / DiseaseMaster /
> ReportableDisease / DiseaseCaseDefinition / WHOIntegration-schema changes,
> no migrations, no seeds, no `sync_who_diseases` until Verification completes.

## 0. Phase 0 Status — configuration only, no connectivity

Phase 0 is a **configuration contract** phase. It contains **no** external
connectivity, **no** schema change and **no** migration:

| Rule | Phase 0 state |
|------|---------------|
| WHO / ICD-11 network calls | **not executed** |
| OAuth token acquisition | **not executed** |
| IHR transmission | **not executed** |
| Database / schema / migrations | **unchanged** |
| Dependencies | **unchanged** |
| Periodic sync (Celery beat) | **not scheduled** |

`WHO_ENABLED` defaults to `false`, so every outbound call is refused locally
before any socket is opened — even with valid-looking credentials.
Diagnose configuration with **no network access**:

```bash
python manage.py who_config_status
python manage.py who_config_status --json   # machine-readable, secrets redacted
```

`configuration validation != connectivity validation`: the command only reads
Django settings. It never resolves DNS and never opens a socket.

## 0-bis. Phase 1 Status — organization integration foundation, WHO adapter

> **Phase 1 does not establish external WHO connectivity.**

Phase 1 introduces a reusable **organization integration foundation** with
WHO as its first concrete adapter. The goal is *not* "connect NQP to WHO" —
it is "make NQP capable of safely integrating external organizations, with
WHO as the first adapter". Live connectivity belongs to a later phase.

| Rule | Phase 1 state |
|------|---------------|
| WHO / ICD-11 / IHR network calls | **not executed** |
| OAuth token acquisition | **not executed** |
| IHR transmission | **not executed** |
| Database / schema / migrations | **unchanged (0 migrations)** |
| Dependencies | **unchanged (0 added)** |
| Frontend | **NO FRONTEND CHANGE REQUIRED** |

### Architecture

```text
apps/integration/
  organizations/            <- foundation: knows no specific organization
    contract.py               Organization, OrganizationType, Capability,
                              IntegrationStatus, IntegrationReadiness,
                              DataSharingScope, derive_status()
    endpoints.py              AuthenticationContract, EndpointContract
                              (no derivation, credential references only)
    results.py                ErrorCategory, IntegrationError,
                              IntegrationResult, redact_text()
    audit.py                  AuditEvent -> existing IntegrationLog fields
    adapter.py                OrganizationAdapter, IntegrationRequest,
                              Transport protocol, RefusingTransport
  adapters/who.py           <- WHO: the first concrete adapter
```

`organizations/` has **no import of `apps.who` and no Django model import**
(enforced by a test). Adding IOM or UNICEF means adding an adapter, not
editing the foundation.

### The five states, and why `CONFIGURED` is not `CONNECTED`

```text
DISABLED ──→ UNCONFIGURED ──→ CONFIGURED ──→ READY
                (missing)      (valid)       (observed)
```

`CONFIGURED` means "settings are locally valid". It is **not** a claim of
connectivity, and there is no `CONNECTED` state in the vocabulary at all.
`READY` is unreachable from configuration alone: it requires
`IntegrationReadiness.with_connectivity_evidence()`, an explicit observation
that configuration cannot manufacture. In Phase 1 WHO tops out at
`CONFIGURED`, reported alongside `connectivity_tested: false`.

### deny by default

Five independent gates, all `False` by default:

| Gate | Meaning | Phase 1 |
|------|---------|----------|
| `configured` | settings complete and well-formed | derived from settings |
| `enabled` | explicitly switched on | `WHO_ENABLED` |
| `authorized` | cleared to exchange a data scope | **always `False`** |
| `connected` | externally observed | **always `False`** |
| `operational` | a real operation succeeded | **always `False`** |

`may_exchange_data` requires `enabled AND configured AND authorized`, so no
configuration alone ever authorizes data exchange.

### Transport is injected, and defaults to refusing

`OrganizationAdapter(transport=...)` takes an explicit transport. Omit it and
you get `RefusingTransport`, which fails every operation with
`CONFIGURATION_ERROR` instead of reaching `httpx`. Forgetting to inject a
transport is therefore a loud error, never a silent outbound call.
`IntegrationRequest` has **no headers field at all** — authentication is
described by `auth` and performed by the transport, so a secret cannot enter
the request structure.

### WHO adapter

- Declares `ICD11`, `IHR_EVENTS`, `DISEASE_SYNC`, `EVENT_SUBMISSION`.
  Declared ≠ available: `available_capabilities()` intersects the declared
  list with what configuration currently supports.
- `get_status()` reads `apps.who.config` locally only. It never constructs
  `WHOClient` (which needs a `WHOIntegration` **model** row) or `ICD11Client`
  (which opens sockets when called).
- `endpoint_contract(IHR_NAMESPACE)` returns an **empty** `resource_path`
  until `WHO_IHR_EVENTS_PATH` is set. No default path, and an internal
  platform route such as `/api/v1/...` is never relabelled as a WHO endpoint.
- `ICD11Adapter.search()` / `.lookup()` build a request and hand it to the
  injected transport. Contract violations (empty query, bad language) raise;
  operational outcomes (timeout, network, refused transport) return an
  `IntegrationResult`.

### IHR: contract separated from transport

```text
NQP IHR model → build_event_payload (Phase 0) → IHREventContract.from_nqp_payload
              → WHO external schema  ⛔ NOT CONFIRMED
```

`IHREventContract.to_external_payload()` **raises `NotImplementedError`** on
purpose, and `WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED` is `False`. Producing an
invented payload before the official contract is confirmed would be a
guess, so the failure is loud and early rather than a fabricated submission.
`IHREventAdapter.submit()` refuses for the same reason.

### Audit reuses the existing table, without writing to it

`AuditEvent` carries organization, operation, outcome, status, timestamp,
correlation id, duration and error category, and
`to_integration_log_fields()` maps it onto the **existing**
`apps.integration.models.IntegrationLog` columns. Phase 1 builds the dict and
performs **no** `create()` / `save()`. Three fields have no column today —
`correlation_id`, `duration_ms`, `error_category` — and are declared in
`UNMAPPED_FIELDS` as a gap requiring a migration and human review.

### Secrets

`AuthenticationContract` holds setting **names** (`WHO_ICD_CLIENT_ID`, …)
and never values. `redact_text()` strips `Authorization`, `Bearer`,
`client_secret`, `access_token`, `api_key` and JSON-shaped variants, and is
**idempotent** so re-redacting an already-redacted log leaves it unchanged.

## 1. Purpose

ربط AFYATNA مع WHO ICD-11 API للتحقق من الأمراض وربط DiseaseMaster.

## 2. Canonical Configuration Contract

One contract, defined in `backend/nqp_backend/settings.py` and enforced in
`backend/apps/who/config.py`. Two namespaces are deliberately separate:
**ICD-11** (published, documented endpoints) and **IHR** (no official endpoint
confirmed yet).

### Shared switch

| Setting | Required | Secret | Used by |
|---------|----------|--------|---------|
| `WHO_ENABLED` | yes | no | `apps.who.config` — master switch; `false` refuses all outbound calls |
| `WHO_TIMEOUT` | no (15s) | no | default timeout for both namespaces |

### ICD-11

| Setting | Required | Secret | Used by |
|---------|----------|--------|---------|
| `WHO_ICD_BASE_URL` | no (`https://id.who.int`) | no | `ICD11Client` API base |
| `WHO_ICD_TOKEN_URL` | no (`https://icdaccessmanagement.who.int/connect/token`) | no | `ICD11Client` OAuth token endpoint |
| `WHO_ICD_CLIENT_ID` | **yes** for any call | no | OAuth2 client id (HTTP Basic) |
| `WHO_ICD_CLIENT_SECRET` | **yes** for any call | **yes** | OAuth2 client secret (HTTP Basic) |
| `WHO_ICD_TIMEOUT` | no (falls back to `WHO_TIMEOUT`) | no | per-request timeout |
| `WHO_ICD_API_VERSION` | no (`v2`) | no | `API-Version` header |
| `WHO_ICD_SCOPE` | no (`icdapi_access`) | no | OAuth2 `scope` |

### IHR (no invented endpoints)

| Setting | Required | Secret | Used by |
|---------|----------|--------|---------|
| `WHO_IHR_BASE_URL` | no (empty) | no | `WHOClient` base; otherwise `WHOIntegration.base_url` |
| `WHO_IHR_TOKEN_URL` | **yes** for any OAuth call | no | IHR token endpoint — **explicit only, never derived** |
| `WHO_IHR_CLIENT_ID` | **yes** for any call | no | `WHOClient` OAuth2 |
| `WHO_IHR_CLIENT_SECRET` | **yes** for any call | **yes** | `WHOClient` OAuth2 |
| `WHO_IHR_EVENTS_PATH` | **yes** to submit an event | no | relative path of the WHO IHR events endpoint |
| `WHO_IHR_STATUS_PATH` | **yes** for a connection test | no | relative path of the WHO IHR status endpoint |

### Shared timeouts

| Setting | Default | Used by |
|---------|---------|---------|
| `WHO_TIMEOUT` | `15` | global fallback for both namespaces |
| `WHO_ICD_TIMEOUT` | falls back to `WHO_TIMEOUT` | ICD-11 requests |
| `WHO_IHR_TIMEOUT` | falls back to `WHO_TIMEOUT` | IHR requests |

There are no further timeout settings. A non-numeric or non-positive value falls
back to the same default, so an unusable value can never produce a request with
no timeout.

### Removed: IHR token-URL derivation (previous behavior)

Earlier revisions derived the IHR token endpoint as
`{WHO_IHR_BASE_URL}/oauth2/token` whenever `WHO_IHR_TOKEN_URL` was empty. That
is **no longer executable fallback logic** anywhere in the codebase:

* `WHO_IHR_TOKEN_URL` must be configured explicitly.
* When it is empty, IHR reports `UNCONFIGURED` and `can_connect=false`.
* `OAuth2TokenProvider.get_token()` raises before any request, naming the
  missing setting.
* No token endpoint is ever constructed from `WHO_IHR_BASE_URL`.

The derivation was never confirmed against an official WHO IHR contract, and a
silently constructed endpoint is indistinguishable from a verified one at
runtime. A regression guard in `apps/who/test_config.py`
(`test_ihr_derivation_removed_from_source`) inspects the executable code and
fails if the derivation is reintroduced.

`WHO_LEGACY_ENV_IN_USE` remains a **diagnostic warning only**: it never
provides credentials, never enables WHO, and never acts as a fallback.

> `WHO_IHR_EVENTS_PATH` and `WHO_IHR_STATUS_PATH` are **intentionally empty**.
> AFYATNA has no confirmed official WHO IHR submission contract, so the
> platform does not guess a path and refuses to send. Both must be relative
> paths starting with `/`; a full URL is rejected as a misconfiguration.
> See *Requires WHO confirmation* before setting them.

### Deprecated aliases (ICD-11 only)

`WHO_BASE_URL`, `WHO_TOKEN_URL`, `WHO_CLIENT_ID`, `WHO_CLIENT_SECRET` are still
read as an **ICD-11-only fallback** because earlier deployments used them
exclusively for ICD-11 values. The canonical name always wins, and
`who_config_status` lists which legacy names are still present. They are never
an IHR fallback: mixing the two namespaces would leak ICD-11 scope into IHR.

## 3. Secret Storage

Never store the client secret in:

* source code
* Git
* `docker-compose.yml`
* logs
* documentation

Use a VPS-local file that is **not tracked by Git**:

```
deploy/.env.who
```

Set permissions and ignore it:

```bash
chmod 600 deploy/.env.who
# already added to .gitignore (line: deploy/.env.who) — verify:
git check-ignore deploy/.env.who
```

## 4. Docker Environment

Load the secret file on the VPS and recreate the backend. The compose file
already declares the full canonical contract with safe defaults, so only the
VPS-local values need exporting:

```bash
set -a; source deploy/.env.who; set +a
docker-compose -f docker-compose.dev-vps.yml up -d backend
```

Verify what the container actually resolved (no network call):

```bash
docker exec -i nqp-backend-dev python manage.py who_config_status
```

## 5. Authentication Test (Phase 1 — not run in Phase 0)

Prints **only** `AUTH_STATUS=SUCCESS` or `AUTH_STATUS=FAILED` (+ HTTP status
code on failure). Never prints the client secret or the access token.
Requires `WHO_ENABLED=true` and a confirmed `WHO_ICD_CLIENT_ID` / secret.

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_ENABLED="$WHO_ENABLED" \
            -e WHO_ICD_BASE_URL="$WHO_ICD_BASE_URL" \
            -e WHO_ICD_TOKEN_URL="$WHO_ICD_TOKEN_URL" \
            -e WHO_ICD_CLIENT_ID="$WHO_ICD_CLIENT_ID" \
            -e WHO_ICD_CLIENT_SECRET="$WHO_ICD_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os, httpx
from apps.who.clients.icd_client import ICD11Client

client = ICD11Client(
    base_url=os.environ['WHO_ICD_BASE_URL'],
    token_url=os.environ.get('WHO_ICD_TOKEN_URL'),
    client_id=os.environ['WHO_ICD_CLIENT_ID'],
    client_secret=os.environ['WHO_ICD_CLIENT_SECRET'],
)
try:
    token = client._token()
    print('AUTH_STATUS=SUCCESS' if token else 'AUTH_STATUS=FAILED (no access_token)')
except httpx.HTTPStatusError as exc:
    print('AUTH_STATUS=FAILED HTTP', exc.response.status_code)
except Exception as exc:  # noqa: BLE001
    print('AUTH_STATUS=FAILED', type(exc).__name__)
PY
```

## 6. Single WHO Search Test (Phase 1 — not run in Phase 0)

Run **only after** Authentication succeeds. Exactly **one** search — `Cholera`.
Allowed output (never prints the access token):

```
SEARCH_STATUS=HTTP 200
auth=OK
count=<number>
first_result_id=<id>
title=<title>
```

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_ENABLED="$WHO_ENABLED" \
            -e WHO_ICD_BASE_URL="$WHO_ICD_BASE_URL" \
            -e WHO_ICD_TOKEN_URL="$WHO_ICD_TOKEN_URL" \
            -e WHO_ICD_CLIENT_ID="$WHO_ICD_CLIENT_ID" \
            -e WHO_ICD_CLIENT_SECRET="$WHO_ICD_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os, httpx
from apps.who.clients.icd_client import ICD11Client

client = ICD11Client(
    base_url=os.environ['WHO_ICD_BASE_URL'],
    token_url=os.environ.get('WHO_ICD_TOKEN_URL'),
    client_id=os.environ['WHO_ICD_CLIENT_ID'],
    client_secret=os.environ['WHO_ICD_CLIENT_SECRET'],
)
try:
    client._token()
    results = client.search('Cholera', language='en')
    first = results[0] if results else {}
    print('SEARCH_STATUS=HTTP 200')
    print('auth=OK')
    print('count=', len(results))
    print('first_result_id=', first.get('id'))
    print('title=', (first.get('title') or '')[:200])
except httpx.HTTPStatusError as exc:
    print('SEARCH_STATUS=HTTP', exc.response.status_code)
    print('auth=FAILED')
PY
```

## 7. WHOIntegration Persistence

Safe method (documented here — **not executed automatically by this runbook**):

* `client_id` stored as plain text
* `client_secret` stored **encrypted** via `set_client_secret()`
* `is_active=True`
* `environment=SANDBOX`
* `base_url` = the ICD-11 base URL

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_ICD_BASE_URL="$WHO_ICD_BASE_URL" \
            -e WHO_ICD_CLIENT_ID="$WHO_ICD_CLIENT_ID" \
            -e WHO_ICD_CLIENT_SECRET="$WHO_ICD_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os
from apps.who.models import WHOIntegration

obj, created = WHOIntegration.objects.update_or_create(
    name='WHO ICD-11',
    defaults={
        'environment': WHOIntegration.Environment.SANDBOX,
        'base_url': os.environ['WHO_ICD_BASE_URL'],
        'client_id': os.environ['WHO_ICD_CLIENT_ID'],
        'authentication_type': WHOIntegration.AuthType.OAUTH2,
        'is_active': True,
    },
)
obj.set_client_secret(os.environ['WHO_ICD_CLIENT_SECRET'])
obj.save(update_fields=['client_secret_encrypted'])

print('integration id=', obj.id, 'created=', created,
      'secret_stored_encrypted=', obj.client_secret_encrypted.startswith('gAAAA'))
PY
```

## 8. Disease Synchronization

Running `sync_who_diseases` is **forbidden** until the WHO Verification of all
30 diseases is complete (correct names/codes approved, `Disease` untouched).
The task additionally refuses to run while `WHO_ENABLED=false`, and it refuses
before any database write when the client is not ready.

## 9. Verification Workflow

```
WHO API
  → search()
  → entity()
  → WHO verified name / code / URI
  → compare with Disease
  → report VERIFIED / MISMATCH / UNVERIFIED
  → human & medical review
  → approve mapping
  → DiseaseMaster
```

## 10. Safety

* No deletes.
* No re-creation of `Disease` rows.
* No UUID changes.
* No `DiseaseCaseDefinition` modifications during the WHO Verification phase.

## 11. Rollback

Stopping the integration and disabling WHO sync **without** deleting any Disease data:

1. **Disable the integration row** (keeps audit context, no data loss):
   set `WHOIntegration.is_active=False` — the sync task filters on `is_active=True`
   and will refuse to run, and the status endpoint reports `configured=False`.

   ```bash
   docker exec -i nqp-backend-dev python manage.py shell <<'PY'
   from apps.who.models import WHOIntegration
   WHOIntegration.objects.filter(name='WHO ICD-11').update(is_active=False)
   print('integration disabled; Disease data untouched')
   PY
   ```
2. **Rotate/void credentials**: replace `WHO_ICD_CLIENT_SECRET` in `deploy/.env.who`
   (gitignored) with an invalid value, then `up -d backend`, so any token request
   returns HTTP 401/403.
3. **Turn off the master switch**: set `WHO_ENABLED=False` in `deploy/.env.who`
   and restart the backend. This refuses every outbound WHO call locally,
   before any socket is opened, and `who_config_status` reports `disabled`.
4. **Un-schedule sync**: ensure no `sync_who_diseases` beat entry is enabled
   (Celery Beat), and do not invoke the `/api/v1/who/diseases/sync/` or
   `/api/v1/who/integrations/sync/` endpoints.
5. **No data is touched**: `Disease`, `DiseaseMaster`, `ReportableDisease`,
   `DiseaseCaseDefinition` rows remain intact. Resuming later = repeat section 7
   (re-set the valid secret) and set `is_active=True`.
