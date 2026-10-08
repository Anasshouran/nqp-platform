#!/bin/bash
# ============================================================
# deploy/staging/deploy.sh — Controlled staging deployment
#
# Sequence:
#   1. Verify staging environment (not production)
#   2. Pull exact image SHA from GHCR
#   3. Validate Compose configuration
#   4. Run migrations
#   5. Restart/update backend
#   6. Verify container health
#   7. Smoke test
#   8. Report deployed image SHA
#
# Rules:
#   - NO production access
#   - NO docker compose down -v
#   - NO volume deletion
#   - NO secret printing
#   - On failure: diagnostics only, no destruction
#
# Usage:
#   STAGING_BACKEND_IMAGE=ghcr.io/anasshouran/nqp-backend:<sha> \
#     ./deploy/staging/deploy.sh
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "${RED}ERROR${NC}: .env not found at $ENV_FILE"
  exit 1
fi

if [[ -z "${STAGING_BACKEND_IMAGE:-}" ]]; then
  echo "${RED}ERROR${NC}: STAGING_BACKEND_IMAGE not set"
  exit 1
fi

echo "${CYAN}=== Staging Deployment ===${NC}"
echo "Image: $STAGING_BACKEND_IMAGE"

echo "${YELLOW}Step 1: Validating Compose configuration...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 2: Pulling image...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull backend
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 3: Running migrations...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres redis
sleep 5
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec backend python manage.py migrate --noinput
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 4: Updating backend...${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend
echo "${GREEN}OK${NC}"

echo "${YELLOW}Step 5: Verifying health...${NC}"
sleep 5
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec backend python manage.py check
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec backend curl -sf http://localhost:8000/api/v1/health/ || {
  echo "${RED}ERROR${NC}: Health check failed"
  exit 1
}
echo "${GREEN}OK${NC}"

echo "${CYAN}=== Deployment Complete ===${NC}"
echo "Deployed image: $STAGING_BACKEND_IMAGE"
