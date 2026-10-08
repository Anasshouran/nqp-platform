# Staging (deploy/staging)

Isolated non-production stack. NOT running by default.

Requirements before `up`:
- owner-approved app IDs (set in `mobile/app.json`: com.afyatna.app / com.afyatna.app)
- owner-approved staging host + DNS + TLS cert placed in `deploy/staging/tls/`
- `deploy/staging/.env` created from `.env.example` with EXTERNAL secrets (gitignored)
- staging DB ≠ dev DB ≠ production DB; staging Redis ≠ production Redis
- synthetic test data only

Start (from deploy/staging):
  cp .env.example .env   # fill values (no real values committed)
  docker compose --env-file .env up -d
Verify:
  `curl -I https://<host>/`  (TLS valid) · `GET /api/v1/health/` · mobile `EXPO_PUBLIC_API_URL=https://<host>/api/v1`
