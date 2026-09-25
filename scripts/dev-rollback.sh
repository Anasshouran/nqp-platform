#!/bin/bash
# ============================================================
# dev-rollback.sh - استرجاع آمن لصورة Backend على بيئة Dev
#
# القواعد الصارمة:
#   - لا حذف volumes، لا إعادة قاعدة بيانات، لا prune.
#   - لا migrations تلقائية.
#   - تأكيد صريح مطلوب.
#   - يحدّث فقط حاويات التطبيق (backend / celery / celery-beat).
#   - يعرض صورة Backend الحالية قبل الإرجاع ويتحقق من الوضع بعده.
#
# يعمل بتغيير الوسم المثبّت (pinned tag) في
#   deploy/docker-compose.dev-vps.yml
# للخدمات الثلاث (backend, celery, celery-beat) ثم إعادة الإنشاء بـ --no-deps.
# يُحتفظ بنسخة احتياطية من الملف قبل التعديل.
#
# الاستخدام:
#   ./scripts/dev-rollback.sh [TAG]
#   مثال: ./scripts/dev-rollback.sh 84a09fa
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

trap 'rc=$?; if [ $rc -ne 0 ]; then printf "${RED}ERROR${NC} rollback failed (rc=%s). No volumes/destructions performed.\n" "$rc"; fi; exit $rc' ERR

ok()  { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
warn(){ printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
fail(){ printf "${RED}[FAIL]${NC} %s\n" "$1"; }

cd "$PROJECT_ROOT"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  DEV ROLLBACK - AFYATNA (safe)${NC}"
echo -e "${CYAN}============================================${NC}"

# ------------------------------------------------------------
# 0. سلامة البيانات قبل أي شيء
# ------------------------------------------------------------
for vol in deploy_nqp_postgres_data deploy_nqp_redis_data; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
        ok "Volume present: $vol"
    else
        fail "Volume missing: $vol — rollback aborted (data safety)"
        exit 1
    fi
done

if [ ! -f "$COMPOSE_FILE" ]; then
    fail "Compose file not found: $COMPOSE_FILE"
    exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
    fail "Env file not found: $ENV_FILE"
    exit 1
fi

# ------------------------------------------------------------
# 1. الصورة الحالية
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Current backend image ---${NC}"
CUR_IMG="$(grep 'image: ghcr.io/anasshouran/nqp-backend:' "$COMPOSE_FILE" | sed -n 's|.*nqp-backend:\(.*\)$|\1|p' | sort -u)"
echo "Compose pins: ghcr.io/anasshouran/nqp-backend:$CUR_IMG"
if docker ps -a --filter "name=^/nqp-backend-dev$" --format '{{.Names}}' | grep -qx "nqp-backend-dev"; then
    echo "Running container: $(docker ps -a --filter "name=^/nqp-backend-dev$" --format '{{.Image}}')"
else
    warn "Backend container not present"
fi

# ------------------------------------------------------------
# 2. اختيار الوسم المستهدف
# ------------------------------------------------------------
TAG="${1:-}"
if [ -z "$TAG" ]; then
    read -r -p "Enter backend image tag to roll back to (default: 2431680): " TAG
    TAG="${TAG:-2431680}"
fi

if ! printf '%s' "$TAG" | grep -qE '^[A-Za-z0-9][A-Za-z0-9._-]*$'; then
    fail "Invalid tag format: $TAG"
    exit 1
fi
if [ "$TAG" = "dev" ]; then
    fail "Rollback to a mutable 'dev' tag is not allowed — use a commit-SHA tag"
    exit 1
fi

TARGET_IMG="ghcr.io/anasshouran/nqp-backend:$TAG"
echo ""
echo -e "${CYAN}--- Target image ---${NC}"
echo "  $TARGET_IMG"

# ------------------------------------------------------------
# 3. سحب الصورة المستهدفة
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Pulling target image ---${NC}"
docker pull "$TARGET_IMG"

# ------------------------------------------------------------
# 4. معاينة التعديل + تأكيد
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Changes that will be applied to $COMPOSE_REL ---${NC}"
grep -n 'image: ghcr.io/anasshouran/nqp-backend:' "$COMPOSE_FILE" || true
echo "will become:"
echo "  image: $TARGET_IMG  (in backend, celery, celery-beat)"

echo ""
read -r -p "APPLY ROLLBACK to $TARGET_IMG? Type YES to continue: " ANSWER
if [ "$ANSWER" != "YES" ]; then
    echo -e "${YELLOW}Aborted. No changes were made.${NC}"
    exit 1
fi

# ------------------------------------------------------------
# 5. تعديل الملف (مع نسخة احتياطية) والتحقق
# ------------------------------------------------------------
BACKUP="/tmp/docker-compose.dev-vps.yml.bak-$(date +%Y%m%d-%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP"
echo "Backup: $BACKUP"

sed -i "s|^\(\s*image: ghcr.io/anasshouran/nqp-backend:\)[^ ]*|\1${TAG}|" "$COMPOSE_FILE"

if grep -q 'image: ghcr.io/anasshouran/nqp-backend:' "$COMPOSE_FILE"; then
    UPD="$(grep 'image: ghcr.io/anasshouran/nqp-backend:' "$COMPOSE_FILE" | sed 's/^[[:space:]]*//' | sort -u | wc -l)"
    if [ "$UPD" -ne 1 ]; then
        fail "Image update produced inconsistent entries ($UPD) — restoring backup"
        cp "$BACKUP" "$COMPOSE_FILE"
        exit 1
    fi
fi

if ! docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" config -q >/dev/null 2>&1; then
    fail "Compose invalid after edit — restoring backup"
    cp "$BACKUP" "$COMPOSE_FILE"
    exit 1
fi
ok "Compose re-validated after edit ($COMPOSE_REL)"

# ------------------------------------------------------------
# 6. إعادة إنشاء حاويات التطبيق فقط — بدون migrations
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}--- Recreating application containers (backend, celery, celery-beat) ---${NC}"
docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" up -d --no-deps backend celery celery-beat

# ------------------------------------------------------------
# 7. انتظار الجاهزية والتحقق
# ------------------------------------------------------------
wait_ready() {
    local cname="$1" mode="$2" label="$3"
    local timeout=180 slept=0 st=""
    while true; do
        st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cname" 2>/dev/null || echo missing)"
        case "$st" in
            healthy) ok "$label ready (healthy)"; return 0 ;;
            running) [ "$mode" = "running" ] && { ok "$label running"; return 0; } ;;
            exited|dead|missing) fail "$label is $st"; return 1 ;;
        esac
        [ "$slept" -ge "$timeout" ] && { fail "$label not ready after ${timeout}s (status=$st)"; return 1; }
        sleep 5; slept=$((slept + 5))
    done
}

wait_ready "nqp-backend-dev"     "healthy" "Backend"
wait_ready "nqp-celery-dev"      "running" "Celery"
wait_ready "nqp-celery-beat-dev" "running" "Celery Beat"

echo ""
if curl -fsS --max-time 15 "http://127.0.0.1:8080/api/v1/health/" -o /dev/null 2>/dev/null; then
    ok "Backend health OK after rollback"
else
    warn "Backend health endpoint not reachable after rollback"
fi
if curl -fsSI --max-time 15 "https://dev.afyatna.com" -o /dev/null 2>/dev/null; then
    ok "https://dev.afyatna.com reachable"
else
    warn "https://dev.afyatna.com unreachable"
fi

echo ""
echo -e "${CYAN}--- Final container status ---${NC}"
docker ps --filter "name=nqp-" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"
echo -e "${GREEN}ROLLBACK COMPLETE${NC} — compose pinned to $TARGET_IMG (backup: $BACKUP)"