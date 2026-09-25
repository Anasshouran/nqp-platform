#!/bin/bash
# ============================================================
# dev-deploy.sh - نشر خاضع للتحكم لبيئة Dev على VPS
#
# التسلسل:
#   1. تشغيل dev-check.sh أولاً (يفشل النشر لو فشل الفحص).
#   2. عرض الحالة الحالية قبل أي تغيير.
#   3. تأكيد صريح (YES حرفياً فقط).
#   4. سحب الصور المطلوبة من GHCR (docker-compose pull).
#   5. تشغيل/إعادة إنشاء الخدمات (up -d). بدون migrations تلقائية.
#   6. انتظار جاهزية الخدمات والتحقق النهائي.
#
# قواعد صارمة:
#   - لا down / لا down -v / لا volume rm / لا prune.
#   - لا تحذف أو تعيد إنشاء أي volume.
#   - لا توجد migrations تلقائية.
#   - لا تطبع أي أسرار.
#   - عند الفشل: تشخيص فقط، لا تدمير، وخروج غير صفري.
#
# الاستخدام:
#   ./scripts/dev-deploy.sh
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
COMPOSE_FILE="$PROJECT_ROOT/$COMPOSE_REL"
ENV_FILE="$PROJECT_ROOT/.env.dev-vps"

# لا لغسل/حذف — فقط التشخيص
trap 'rc=$?; if [ $rc -ne 0 ]; then printf "${RED}ERROR${NC} deployment failed (rc=%s). No containers/volumes were destroyed. Diagnostics below.\n" "$rc"; docker ps --filter "name=nqp-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"; fi; exit $rc' ERR

ok()   { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; }

cd "$PROJECT_ROOT"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  DEV DEPLOY - AFYATNA (controlled)${NC}"
echo -e "${CYAN}============================================${NC}"

# ------------------------------------------------------------
# 1. الفحص المسبق الكامل (Read-only)
# ------------------------------------------------------------
if [ ! -x "$SCRIPT_DIR/dev-check.sh" ]; then
    fail "dev-check.sh غير موجود أو غير قابل للتنفيذ"
    exit 1
fi
if ! bash "$SCRIPT_DIR/dev-check.sh"; then
    fail "Pre-deployment check failed — deployment aborted. Nothing was changed."
    exit 1
fi

# ------------------------------------------------------------
# 2. الحالة الحالية قبل أي تغيير
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Current state (before deployment) ---${NC}"
docker ps --filter "name=nqp-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"
echo ""
echo -e "${CYAN}--- Persistent volumes (must be preserved) ---${NC}"
docker volume ls --format "table {{.Name}}" | grep -E "deploy_nqp_postgres_data|deploy_nqp_redis_data" || true
echo ""
echo -e "${CYAN}--- Network ---${NC}"
docker network ls --format "table {{.Name}}\t{{.Driver}}" | grep -E "deploy_nqp_internal|NAME" || true

# ------------------------------------------------------------
# 3. تأكيد صريح
# ------------------------------------------------------------
echo ""
read -r -p "DEPLOY AFYATNA DEV? Type YES to continue: " ANSWER
if [ "$ANSWER" != "YES" ]; then
    echo -e "${YELLOW}Aborted. No changes were made.${NC}"
    exit 1
fi

# ------------------------------------------------------------
# 4. سحب الصور المطلوبة (--env-file صراحةً، وليس .env)
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Pulling images (compose-referenced only) ---${NC}"
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" pull

# ------------------------------------------------------------
# 5. تشغيل الخدمات
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Creating/updating services ---${NC}"
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" up -d

# ------------------------------------------------------------
# 6. انتظار الجاهزية
# ------------------------------------------------------------
# postgres/redis/backend/frontend -> healthy ; celery/celery-beat -> running
wait_ready() {
    local cname="$1" mode="$2" label="$3"
    local timeout=180 slept=0 st=""
    while true; do
        st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cname" 2>/dev/null || echo missing)"
        case "$st" in
            healthy)
                ok "$label ready (healthy)"
                return 0
                ;;
            running)
                if [ "$mode" = "running" ]; then
                    ok "$label running"
                    return 0
                fi
                ;;
            exited|dead|missing)
                fail "$label is $st"
                return 1
                ;;
        esac
        if [ "$slept" -ge "$timeout" ]; then
            fail "$label not ready after ${timeout}s (status=$st)"
            return 1
        fi
        sleep 5
        slept=$((slept + 5))
    done
}

wait_ready "nqp-postgres-dev"    "healthy" "PostgreSQL"
wait_ready "nqp-redis-dev"       "healthy" "Redis"
wait_ready "nqp-backend-dev"     "healthy" "Backend"
wait_ready "nqp-frontend-dev"    "healthy" "Frontend"
wait_ready "nqp-celery-dev"      "running" "Celery"
wait_ready "nqp-celery-beat-dev" "running" "Celery Beat"

# ------------------------------------------------------------
# 7. تحققات نهائية
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Final verification ---${NC}"
if docker exec nqp-postgres-dev pg_isready -q; then
    ok "PostgreSQL accepting connections"
else
    fail "PostgreSQL pg_isready failed"
fi

BACKEND_OK=0
if curl -fsS --max-time 15 "http://127.0.0.1:${FRONTEND_PORT:-8080}/api/v1/health/" -o /dev/null 2>/dev/null; then
    ok "Backend health via frontend proxy http://127.0.0.1:8080/api/v1/health/"
    BACKEND_OK=1
else
    fail "Backend health check via frontend proxy failed"
fi

if curl -fsSI --max-time 20 "https://dev.afyatna.com" -o /dev/null 2>/dev/null; then
    ok "https://dev.afyatna.com reachable"
else
    warn "https://dev.afyatna.com did not respond (Unexpected? site should be reachable)"
fi

# ------------------------------------------------------------
# 8. الحالة النهائية
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Final container status ---${NC}"
docker ps --filter "name=nqp-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"

if [ "$BACKEND_OK" -eq 1 ]; then
    echo -e "${GREEN}DEPLOY COMPLETE${NC}"
else
    fail "Deployment incomplete — backend health failed. No rollback performed automatically."
    exit 1
fi
