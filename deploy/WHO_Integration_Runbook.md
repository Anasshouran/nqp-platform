# WHO ICD-11 Integration Runbook

> Scope: enabling WHO ICD-11 integration only. No Disease / DiseaseMaster /
> ReportableDisease / DiseaseCaseDefinition / WHOIntegration-schema changes,
> no migrations, no seeds, no `sync_who_diseases` until Verification completes.

## 1. Purpose

ربط AFYATNA مع WHO ICD-11 API للتحقق من الأمراض وربط DiseaseMaster.

## 2. Required Credentials

* `WHO_BASE_URL`
* `WHO_TOKEN_URL`
* `WHO_CLIENT_ID`
* `WHO_CLIENT_SECRET`

Default values (ICD-API v2):

```
WHO_BASE_URL=https://id.who.int
WHO_TOKEN_URL=https://icdaccessmanagement.who.int/connect/token
```

The OAuth token endpoint (`https://icdaccessmanagement.who.int/connect/token`) is
**separate** from the ICD API base (`https://id.who.int`). Per the official docs,
`ICD11Client` authenticates the token request with **HTTP Basic** (client_id/secret),
sends `grant_type=client_credentials` + `scope=icdapi_access`, and adds the
`API-Version: v2` header to every ICD API call.

These variables are **not** read by `settings.py`; they feed the bootstrap and the
test snippets in this runbook. The integration state itself lives in the
`WHOIntegration` row (`client_secret` stored encrypted via Fernet derived from `SECRET_KEY`
— keep `SECRET_KEY` stable or stored secrets become unreadable).

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

Pass the three variables to `nqp-backend-dev` (VPS host). Two acceptable channels:

**A) Persist via compose (preferred).** Add to `deploy/docker-compose.dev-vps.yml`
service `backend` (environment block):

```yaml
WHO_BASE_URL: ${WHO_BASE_URL:-https://id.who.int}
WHO_TOKEN_URL: ${WHO_TOKEN_URL:-https://icdaccessmanagement.who.int/connect/token}
WHO_CLIENT_ID: ${WHO_CLIENT_ID:-}
WHO_CLIENT_SECRET: ${WHO_CLIENT_SECRET:-}
```

Then on the VPS, load the secret file (never committed) and recreate the backend:

```bash
set -a; source deploy/.env.who; set +a
docker-compose -f docker-compose.dev-vps.yml up -d backend
```

**B) Ephemeral one-off exec** (values visible briefly in the host process list —
prefer A when possible):

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_BASE_URL="$WHO_BASE_URL" \
            -e WHO_CLIENT_ID="$WHO_CLIENT_ID" \
            -e WHO_CLIENT_SECRET="$WHO_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
# (see sections 5 / 6)
PY
```

## 5. Authentication Test

Prints **only** `AUTH_STATUS=SUCCESS` or `AUTH_STATUS=FAILED` (+ HTTP status code on
failure). Never prints the client secret or the access token.

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_BASE_URL="$WHO_BASE_URL" \
            -e WHO_TOKEN_URL="$WHO_TOKEN_URL" \
            -e WHO_CLIENT_ID="$WHO_CLIENT_ID" \
            -e WHO_CLIENT_SECRET="$WHO_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os, httpx
from apps.who.clients.icd_client import ICD11Client

client = ICD11Client(
    base_url=os.environ['WHO_BASE_URL'],
    token_url=os.environ.get('WHO_TOKEN_URL'),
    client_id=os.environ['WHO_CLIENT_ID'],
    client_secret=os.environ['WHO_CLIENT_SECRET'],
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

## 6. Single WHO Search Test

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
docker exec -e WHO_BASE_URL="$WHO_BASE_URL" \
            -e WHO_TOKEN_URL="$WHO_TOKEN_URL" \
            -e WHO_CLIENT_ID="$WHO_CLIENT_ID" \
            -e WHO_CLIENT_SECRET="$WHO_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os, httpx
from apps.who.clients.icd_client import ICD11Client

client = ICD11Client(
    base_url=os.environ['WHO_BASE_URL'],
    token_url=os.environ.get('WHO_TOKEN_URL'),
    client_id=os.environ['WHO_CLIENT_ID'],
    client_secret=os.environ['WHO_CLIENT_SECRET'],
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
* `base_url=https://id.who.int`

```bash
set -a; source deploy/.env.who; set +a
docker exec -e WHO_BASE_URL="$WHO_BASE_URL" \
            -e WHO_CLIENT_ID="$WHO_CLIENT_ID" \
            -e WHO_CLIENT_SECRET="$WHO_CLIENT_SECRET" \
            -i nqp-backend-dev python manage.py shell <<'PY'
import os
from apps.who.models import WHOIntegration

obj, created = WHOIntegration.objects.update_or_create(
    name='WHO ICD-11',
    defaults={
        'environment': WHOIntegration.Environment.SANDBOX,
        'base_url': os.environ['WHO_BASE_URL'],
        'client_id': os.environ['WHO_CLIENT_ID'],
        'authentication_type': WHOIntegration.AuthType.OAUTH2,
        'is_active': True,
    },
)
obj.set_client_secret(os.environ['WHO_CLIENT_SECRET'])
obj.save(update_fields=['client_secret_encrypted'])

print('integration id=', obj.id, 'created=', created,
      'secret_stored_encrypted=', obj.client_secret_encrypted.startswith('gAAAA'))
PY
```

## 8. Disease Synchronization

Running `sync_who_diseases` is **forbidden** until the WHO Verification of all
30 diseases is complete (correct names/codes approved, `Disease` untouched).

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
   and will refuse to run, and the status endpoint reports `configured=True, connected=False`.

   ```bash
   docker exec -i nqp-backend-dev python manage.py shell <<'PY'
   from apps.who.models import WHOIntegration
   WHOIntegration.objects.filter(name='WHO ICD-11').update(is_active=False)
   print('integration disabled; Disease data untouched')
   PY
   ```
2. **Rotate/void credentials**: replace `WHO_CLIENT_SECRET` in `deploy/.env.who`
   (gitignored) with an invalid value, then `up -d backend`, so any token request
   returns HTTP 401/403.
3. **Un-schedule sync**: ensure no `sync_who_diseases` beat entry is enabled
   (Celery Beat), and do not invoke the `/api/v1/who/diseases/sync/` or
   `/api/v1/who/integrations/sync/` endpoints.
4. **No data is touched**: `Disease`, `DiseaseMaster`, `ReportableDisease`,
   `DiseaseCaseDefinition` rows remain intact. Resuming later = repeat section 7
   (re-set the valid secret) and set `is_active=True`.
