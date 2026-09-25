#!/bin/bash
# ============================================================
# dev-status.sh - عرض حالة بيئة Dev على VPS (قراءة فقط)
#
# يعرض:
#   - حالة الحاويات وصحّتها وصورها ومنافذها
#   - volumes PostgreSQL / Redis
#   - الشبكة
#   - حالة HTTP الواجهة الأمامية والـ Backend
#
# لا يعرض أي أسرار (passwords, SECRET_KEY, JWT, tokens, VAPID).
#
# الاستخدام:
#   ./scripts/dev-status.sh
# ============================================================

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_REL="deploy/docker-compose.dev-vps.yml"
ENV_FILE="$PROJECT_ROOT/.env.dev-vps"

ok()  { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
warn(){ printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
inf() { printf "${CYAN}[INFO]${NC} %s\n" "$1"; }

cd "$PROJECT_ROOT"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  DEV STATUS - AFYATNA (read-only)${NC}"
echo -e "${CYAN}============================================${NC}"

# ------------------------------------------------------------
# 1. الحاويات (الحالة / الصحة / الصورة / المنافذ)
# ------------------------------------------------------------
if docker ps --filter "name=nqp-" --format '{{.Names}}' | grep -q .; then
    docker ps --filter "name=nqp-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"
    echo ""
    for cname in nqp-postgres-dev nqp-redis-dev nqp-backend-dev nqp-frontend-dev nqp-celery-dev nqp-celery-beat-dev; do
        hstate="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{if .State.Running}}running(no-healthcheck){{else}}{{.State.Status}}{{end}}{{end}}' "$cname" 2>/dev/null || echo missing)"
        inf "$cname: $hstate"
    done
else
    warn "No nqp-* containers currently running"
fi

# ------------------------------------------------------------
# 2. الصور (من الحاويات — لا أسرار)
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Images ---${NC}"
for cname in nqp-postgres-dev nqp-redis-dev nqp-backend-dev nqp-frontend-dev; do
    if docker ps -a --filter "name=^/${cname}$" --format '{{.Names}}' | grep -qx "$cname"; then
        inf "$cname -> $(docker ps -a --filter "name=^/${cname}$" --format '{{.Image}}')"
    else
        warn "$cname -> (not present)"
    fi
done

# ------------------------------------------------------------
# 3. volumes PostgreSQL / Redis (بيانات محفوظة)
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Persistent volumes ---${NC}"
for vol in deploy_nqp_postgres_data deploy_nqp_redis_data; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
        ok "Volume exists: $vol"
    else
        warn "Volume missing: $vol"
    fi
done

# ------------------------------------------------------------
# 4. الشبكة
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Network ---${NC}"
if docker network inspect deploy_nqp_internal >/dev/null 2>&1; then
    drv="$(docker network inspect -f '{{.Driver}}' deploy_nqp_internal)"
    cnt="$(docker network inspect -f '{{len .Containers}}' deploy_nqp_internal)"
    ok "Network deploy_nqp_internal (driver=$drv, connected containers=$cnt)"
else
    warn "Network deploy_nqp_internal not found"
fi

# ------------------------------------------------------------
# 5. HTTP الواجهة الأمامية
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Frontend HTTP ---${NC}"
if curl -fsSI --max-time 15 "https://dev.afyatna.com" -o /dev/null 2>/dev/null; then
    code="$(curl -sI --max-time 15 "https://dev.afyatna.com" -o /dev/null -w '%{http_code}' || true)"
    ok "https://dev.afyatna.com -> HTTP $code"
else
    warn "https://dev.afyatna.com unreachable"
fi

# ------------------------------------------------------------
# 6. Backend health (عبر بروكسي الواجهة الأمامية)
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Backend health ---${NC}"
if curl -fsS --max-time 15 "http://127.0.0.1:8080/api/v1/health/" 2>/dev/null; then
    echo ""
    ok "Backend health OK (through frontend)"
else
    warn "Backend health endpoint unreachable (not healthy?)"
fi

echo ""
echo -e "${GREEN}STATUS DISPLAY COMPLETE${NC} — no secrets displayed."