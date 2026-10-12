# Staging stack

Shares `postgres` and `redis` containers with the dev stack; isolates:

| Layer | Value |
|---|---|
| Postgres DB | `staging_afyatna` |
| Postgres role | `staging_afyatna` (NOSUPERUSER) |
| Redis DB index | `1` (via CELERY_BROKER_URL / CELERY_RESULT_BACKEND) |
| Secrets | `/etc/nqp/staging.env` (mode 600) |
| Backend host port | `127.0.0.1:9001` |
| Frontend host port | `127.0.0.1:9080` |
| Public API endpoint | https://staging.afyatna.com/api/ (nginx → 9001) |
| Public frontend | https://staging.afyatna.com/ (nginx → 9080) |

## Prereqs

1. `postgres` container running (dev stack).
2. `redis` container running (dev stack).
3. Network `deploy_nqp_internal` exists.
4. `/etc/nqp/staging.env` present with:
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `POSTGRES_PASSWORD` (matches staging_afyatna role)
   - `REDIS_PASSWORD` (matches redis container AUTH)
   - `STAGING_CSRF_TRUSTED_ORIGINS=https://staging.afyatna.com`
5. Role + DB exist:
   ```sql
   CREATE ROLE staging_afyatna LOGIN PASSWORD '...' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   CREATE DATABASE staging_afyatna OWNER staging_afyatna
     ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;
   ```

## Bring up

```bash
cd /opt/nqp-platform
docker compose --env-file /etc/nqp/staging.env \
  -f deploy/staging/docker-compose.yml up -d
```

## Migrations

Run once after the first `up` (backend must be up):

```bash
docker exec nqp-staging-backend python manage.py migrate
```

## Convenience wrapper (VPS)

A mode-700 wrapper exists at `/root/nqp-staging-compose`:

```bash
/root/nqp-staging-compose up -d
/root/nqp-staging-compose ps
/root/nqp-staging-compose logs -f staging-backend
```

## Nginx

`staging.afyatna.com`:

- `location /api/` → `proxy_pass http://127.0.0.1:9001;`
- `location /` → `proxy_pass http://127.0.0.1:9080;` (dedicated `nqp-staging-frontend`, not the dev frontend)

Switch /api/ back to dev (8001) and / to dev (8080) if the staging stack is taken down.

## Notes / isolation

- Celery talks to Redis DB **1** (dev uses DB 0) — no broker/cache collision.
- Django `CACHES` default is `LocMemCache` in both stacks (not Redis).
- Secrets live only in `/etc/nqp/staging.env` (600) — never in git.
- Public URLs on the staging backend are allowed via `ALLOWED_HOSTS=staging.afyatna.com,...`.