# M3 PRE-PRODUCTION RUNBOOK

**Date:** 2026-10-08  
**Scope:** controlled staging/pre-production operation of the NQP backend + AFYATNA mobile client.  
**Rule:** documents only infrastructure that **exists** in this repository (`deploy/`, `scripts/`, `Makefile`). Gaps are marked OPERATIONAL DEPENDENCY — never invented.

---

## 1. Prerequisites

- **Host:** Docker/Compose (`deploy/docker-compose*.yml`) or Kubernetes (`deploy/k8s/`) with `kubectl` access to the `nqp` namespace.
- **Images:** GHCR images built by CI (`.github/workflows/ci.yml` docker jobs): `ghcr.io/anasshouran/nqp-backend:<tag>`, `…/afyatna-frontend:<tag>`.
- **Tooling:** Python 3.13 (for manage.py ops), Node 22 (mobile builds), `jq`, `psql` client.
- **Secrets provisioning (required, external):**

```bash
kubectl create secret generic nqp-secrets --namespace=nqp \
  --from-literal=db-name=<DB> --from-literal=db-user=<USER> \
  --from-literal=db-password=<PASSWORD> --from-literal=secret-key=<DJANGO_SECRET_KEY> \
  --from-literal=jwt-secret=<JWT_SECRET_KEY> --from-literal=redis-password=<REDIS_PASSWORD> \
  --from-literal=minio-access-key=<AK> --from-literal=minio-secret-key=<SK>
```
(`deploy/k8s/secrets.yaml` is placeholders only — real values are never committed.)

## 2. Environment Variables (staging must set)

| Variable | Class | Staging | Notes |
| --- | --- | --- | --- |
| `DEBUG` | ENVIRONMENT | `False` | defaults False; must be False in staging/prod |
| `SECRET_KEY` | SECRET | from k8s secret | **runtime refuses placeholder in production mode** (`settings.py` guard) |
| `JWT_SECRET_KEY` | SECRET | required | independent signing key |
| `ALLOWED_HOSTS` | ENVIRONMENT | `staging.nqp.gov.sd,…` | default `localhost,127.0.0.1` only |
| `CORS_ALLOWED_ORIGINS` | ENVIRONMENT | `https://…` origins | default localhost; `CORS_ALLOW_ALL_ORIGINS` is DEBUG-only |
| `SECURE_SSL_REDIRECT` | ENVIRONMENT | `True` behind TLS | default False (opt-in) |
| `POSTGRES_*` / `DB_*` | SECRET/ENV | required | no default credentials in prod |
| `REDIS_*` | SECRET/ENV | required | password via env |
| `MINIO_*` | SECRET | optional (docs storage) | not committed |
| `EXPO_PUBLIC_API_URL` (mobile build) | BUILD-TIME | `https://api.<staging-host>/api/v1` | **default is localhost — build MUST set it** |
| Telemetry/monitoring | — | not provisioned | OPERATIONAL DEPENDENCY |

## 3. Deployment

### 3.1 Backend (Kubernetes path)
1. Provision secrets (§1).
2. `kubectl apply -f deploy/k8s/namespace.yaml` then Deployments/Services/Ingress (`backend-deployment.yaml`, `postgres-statefulset.yaml`, `redis-deployment.yaml`).
3. Set image tag from CI (`ghcr.io/...:<short-sha>`).
4. Migrations: `python manage.py migrate` (expand-contract policy; **none pending** at this baseline — `makemigrations --check` = No changes).
5. Health: `GET /api/v1/health/` must return `{"status":"ok"}`.

### 3.2 Backend (Compose/dev path)
`deploy/docker-compose.yml` / `scripts/dev-up.sh`; rollback via `scripts/dev-rollback.sh <tag>` (image-only, aborts on volume anomalies — no data destruction).

### 3.3 Mobile (staging build)
```bash
cd mobile
EXPO_PUBLIC_API_URL=https://api.<staging-host>/api/v1 npx expo export --platform android  # LOCAL artifact check
# EAS (when account/approved applicationId available — see finding M3-H-3):
npx eas build --profile staging --platform android   # requires android.package in app.json (owner-approved)
```
- **Build profile rules:** staging/prod builds must set `EXPO_PUBLIC_API_URL` (HTTPS) and must never ship debug logging. `app.json` currently lacks `android.package`/`ios.bundleIdentifier` — configure before EAS builds (owner approves applicationId).

## 4. Verification (smoke)

```bash
# API
curl -fsS https://<host>/api/v1/health/                     # {"status":"ok"}
curl -fsS https://<host>/api/schema/ | grep -c api/v1/mobile # ≥ 12
# Auth (interim)
curl -fsS -X POST https://<host>/api/v1/auth/login/ -H 'Content-Type: application/json' -d '{"identifier":…,"password":…}'
# Mobile suite
cd mobile && npm run typecheck && npm run lint && npm test
cd contracts && npm test
cd backend && python -m pytest apps/mobile_api -q
# Build
cd mobile && npx expo export --platform android
```

## 5. Rollback

| Layer | Procedure | Limits |
| --- | --- | --- |
| App (K8s) | `kubectl rollout undo deployment/<name>` or pin previous GHCR tag | image-only |
| App (Compose) | `scripts/dev-rollback.sh <prev-tag>` | image-only; no volume changes |
| Database | expand-contract: never roll back schema blindly; restore from dump if needed (§Backup) | destructive steps deferred by policy; **no pending migrations now** |
| Mobile client | store phased-release halt; OTA revert (EAS Update) when used | store review latency for native builds; no device rollback testing performed (LOCAL only) |

## 6. Backup / Restore (OPERATIONAL DEPENDENCY — not automated)

Documented manual procedure (from `deploy/README-DEV-DEPLOY.md`):
```bash
docker exec nqp-postgres-dev pg_dump -U <USER> -d <DB> > dump-$(date +%F).sql
# restore: docker exec -i <db> psql -U <USER> -d <DB> < dump-<date>.sql
```
**Missing:** scheduled backups, retention policy, restore drills, off-host copies → owner (Ops) action before production.

## 7. Incident Response

- **Logs:** container stdout (`docker logs` / `kubectl logs`) + nginx access logs; privacy rules per M2-D2 (no health payloads, no tokens).
- **Monitoring:** API health endpoint only; **no Prometheus/Grafana/Uptime deployed in-repo** → OPERATIONAL DEPENDENCY. Minimum interim: external HTTP check on `/api/v1/health/` + log-based alerting on 5xx rate.
- **Escalation:** on-call → Security Architect for auth/privacy incidents; use bilingual (ar/en) user messaging only — never expose internal errors.
- **Security incident handling:** revoke tokens via `/api/v1/auth/logout/` blacklist; rotate `SECRET_KEY`/`JWT_SECRET_KEY`/DB creds via k8s secret re-create; QR misuse → certificate revocation path (vaccination module).

## 8. Privacy in Operations

- Logs/telemetry: scrubbed (M2-D2): no tokens, passport, medical_history, risk, signatures.
- Production data access: break-glass, audited; no production data in staging (use masked/synthetic).
- Cache/session: mobile logout/session-expiry purge enforced client-side (M2-C1); server refresh tokens blacklisted on logout.
- Retention: statutory periods **POLICY GAP (Q2)** — do not invent; immediate purge rules enforced.

## 9. Known Deferred Items

`SUDAPASS = DEFERRED` · `DECLARATION_WRITE = DEFERRED` · dependency pin remediation (M3-H-1) · Android applicationId (M3-H-3) · backup/monitoring automation (Operational).