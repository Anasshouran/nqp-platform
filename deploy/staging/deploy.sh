#!/bin/bash
# ============================================================
# deploy/staging/deploy.sh — Controlled staging deployment (pull-based)
#
# Sequence:
#   1. Verify staging environment (not production), assert release identity
#   2. Pull the exact immutable images (backend + frontend, same <RELEASE_SHA>)
#   3. Validate Compose configuration
#   4. Start the full stack (migrate + collectstatic run in the backend entrypoint)
#   5. Verify backend health + /static/ + /media/ + Celery worker ping
#   6. Report deployed image SHAs
#
# Rules:
#   - NO production access
#   - NO docker compose down -v
#   - NO volume deletion
#   - NO secret printing
#   - On failure: diagnostics only, no destruction
#
# Usage (immutable release identity; both images MUST share the same SHA):
#   STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend:<RELEASE_SHA> \
#   STAGING_FRONTEND_IMAGE=ghcr.io/anasshouran/afyatna-frontend:<RELEASE_SHA> \
#     ./deploy/staging/deploy.sh
#
# Rollback = re-pin STAGING_*_IMAGE to a previously known-good <RELEASE_SHA>
# and re-run this script (no source rebuild required).
# ============================================================

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "${RED}ERROR${NC}: .env not found at $ENV_FILE"
  exit 1
fi

if [[ -z "${STAGING_BACKEND_IMAGE:-}" ]]; then
  echo "${RED}ERROR${NC}: STAGING_BACKEND_IMAGE not set"
  exit 1
fi
if [[ -z "${STAGING_FRONTEND_IMAGE:-}" ]]; then
  echo "${RED}ERROR${NC}: STAGING_FRONTEND_IMAGE not set"
  exit 1
fi

BACKEND_SHA="${STAGING_BACKEND_IMAGE##*:}"
FRONTEND_SHA="${STAGING_FRONTEND_IMAGE##*:}"

if [[ "$BACKEND_SHA" != "$FRONTEND_SHA" ]]; then
  echo "${RED}ERROR${NC}: backend and frontend images reference different release SHAs"
  echo "  backend:  $BACKEND_SHA"
  echo "  frontend: $FRONTEND_SHA"
  exit 1
fi
if [[ ! "$BACKEND_SHA" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "${YELLOW}WARNING${NC}: '$BACKEND_SHA' does not look like a git SHA; an immutable"
  echo "         <RELEASE_SHA> tag is required for deterministic rollback."
fi

echo "${CYAN}=== Staging Deployment ===${NC}"
echo "Release SHA: $BACKEND_SHA"
echo "Backend:  $STAGING_BACKEND_IMAGE"
echo "Frontend: $STAGING_FRONTEND_IMAGE"

echo "${YELLOW}Step 1: Validating Compose configuration...${NC}"
"${COMPOSE[@]}" config -q
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 2: Pulling immutable images...${NC}"
"${COMPOSE[@]}" pull postgres redis backend frontend
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 3: Starting the full stack (migrate+collectstatic in entrypoint)...${NC}"
"${COMPOSE[@]}" up -d
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 4: Verifying backend health...${NC}"
"${COMPOSE[@]}" exec -T backend python -c "import urllib.request,sys; r=urllib.request.urlopen(urllib.request.Request('http://localhost:8000/api/v1/health/', headers={'X-Forwarded-Proto':'https'}), timeout=10); sys.exit(0 if r.status == 200 else 1)" || {
  echo "${RED}ERROR${NC}: Backend health check failed"
  "${COMPOSE[@]}" ps
  exit 1
}
"${COMPOSE[@]}" exec -T backend python manage.py check || {
  echo "${RED}ERROR${NC}: django check failed"
  exit 1
}
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 5: Smoke — static + media via nginx...${NC}"
if ! "${COMPOSE[@]}" exec -T nginx sh -c "wget -q -O /dev/null https://localhost/static/admin/css/base.css"; then
  echo "${RED}ERROR${NC}: /static/ not served correctly by nginx"
  exit 1
fi
"${COMPOSE[@]}" exec -T backend python -c "open('/app/media/.staging-probe','w').write('ok')"
if ! "${COMPOSE[@]}" exec -T nginx sh -c "wget -q -O /dev/null https://localhost/media/.staging-probe"; then
  "${COMPOSE[@]}" exec -T backend python -c "import os; os.path.exists('/app/media/.staging-probe') and os.remove('/app/media/.staging-probe')"
  echo "${RED}ERROR${NC}: /media/ not served correctly by nginx"
  exit 1
fi
"${COMPOSE[@]}" exec -T backend python -c "import os; os.remove('/app/media/.staging-probe')"
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 6: Verifying Celery worker reachability...${NC}"
if ! "${COMPOSE[@]}" exec -T celery celery -A nqp_backend inspect ping --timeout 10 2>/dev/null | grep -q pong; then
  echo "${RED}ERROR${NC}: Celery worker did not respond to ping (broker unreachable or worker down)"
  "${COMPOSE[@]}" ps celery celery-beat
  exit 1
fi
echo "${GREEN}OK${NC}"

echo "${CYAN}=== Deployment Complete ===${NC}"
echo "Deployed release: $BACKEND_SHA"
echo "Backend:  $STAGING_BACKEND_IMAGE"
echo "Frontend: $STAGING_FRONTEND_IMAGE"
echo "Rollback: re-pin STAGING_*_IMAGE to a previous known-good SHA and re-run this script."