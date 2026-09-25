#!/bin/bash
# ============================================================
# dev-check.sh - فحص ما قبل النشر (Read-only) لبيئة Dev على VPS
#
# يقوم بفحص شامل وقراءة فقط قبل أي تغيير:
#   - دليل المشروع وملفات Compose والبيئة
#   - متغيرات البيئة المطلوبة (دون طباعة قيمها)
#   - volumes الخارجية (PostgreSQL و Redis) — وحمايتها
#   - حاويات قيد التشغيل (الحالية) مع الـ volume المركّب عليها
#   - صورة Backend الحالية
#   - صحة Compose عبر docker compose و docker-compose معاً
#   - إعداد Compose المُعرَّب (rendered): volumes/صور/منافذ/شبكة
#
# لا يطبع أي أسرار إطلاقاً.
#
# الاستخدام:
#   ./scripts/dev-check.sh
#
# الخروج: 0 عند النجاح (DEV CHECK PASSED)، 1 عند الفشل.
# ============================================================

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
COMPOSE_FILE="$PROJECT_ROOT/deploy/docker-compose.dev-vps.yml"
# مسار نسبي يُستخدم بعد cd إلى جذر المشروع ليطابق شكل الأوامر الموثّق
COMPOSE_REL="deploy/docker-compose.dev-vps.yml"
ENV_FILE="$PROJECT_ROOT/.env.dev-vps"

# القيم المتوقعة (تطابق deploy/docker-compose.dev-vps.yml)
PG_VOLUME="deploy_nqp_postgres_data"
RD_VOLUME="deploy_nqp_redis_data"
NET_NAME="deploy_nqp_internal"
FRONT_PORT_HOST="127.0.0.1:8080:80"

FAIL_CNT=0
WARN_CNT=0

ok()   { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; WARN_CNT=$((WARN_CNT + 1)); }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$1"; FAIL_CNT=$((FAIL_CNT + 1)); }

cd "$PROJECT_ROOT"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  DEV CHECK - AFYATNA (read-only)${NC}"
echo -e "${CYAN}============================================${NC}"

# ------------------------------------------------------------
# 1. الملفات الأساسية
# ------------------------------------------------------------
if [ -d "$PROJECT_ROOT" ]; then
    ok "Project root: $PROJECT_ROOT"
else
    fail "Project root not found: $PROJECT_ROOT"
fi

if [ -f "$COMPOSE_FILE" ]; then
    ok "Compose file: $COMPOSE_FILE"
else
    fail "Compose file missing: $COMPOSE_FILE"
fi

if [ -f "$ENV_FILE" ]; then
    ok "Environment file: $ENV_FILE"
else
    fail "Environment file missing: $ENV_FILE (يُنشأ على VPS فقط ولا يُرفع إلى Git)"
fi

# ------------------------------------------------------------
# 2. متغيرات البيئة المطلوبة (وجود فقط — بدون طباعة القيم)
# ------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
    REQUIRED_VARS="SECRET_KEY DEBUG ALLOWED_HOSTS POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD"
    for var in $REQUIRED_VARS; do
        if grep -qE "^${var}=.+" "$ENV_FILE"; then
            ok "Env var present: $var"
        else
            fail "Env var is not set in $ENV_FILE: $var"
        fi
    done
    ok "Required env vars verified (values never displayed)"
fi

# ------------------------------------------------------------
# 3. توفر محرك Docker
# ------------------------------------------------------------
if ! docker version >/dev/null 2>&1; then
    fail "Docker daemon is not reachable"
else
    ok "Docker daemon reachable"
fi

# ------------------------------------------------------------
# 4. volumes الخارجية للمحافظة على البيانات
# ------------------------------------------------------------
if docker volume inspect "$PG_VOLUME" >/dev/null 2>&1; then
    ok "PostgreSQL volume exists: $PG_VOLUME"
else
    fail "PostgreSQL volume missing (بيانات آمنة مطلوبة): $PG_VOLUME"
fi

if docker volume inspect "$RD_VOLUME" >/dev/null 2>&1; then
    ok "Redis volume exists: $RD_VOLUME"
else
    fail "Redis volume missing: $RD_VOLUME"
fi

# ------------------------------------------------------------
# 5. الحاويات الحالية وحجمها المركّب (تحقق عند وجودها فقط)
# ------------------------------------------------------------
check_container_volume() {
    local cname="$1" vol="$2" dest="$3"
    if docker ps -a --filter "name=^/${cname}$" --format '{{.Names}}' | grep -qx "$cname"; then
        local mount
        mount="$(docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} -> {{.Destination}}{{println}}{{end}}{{end}}' "$cname" 2>/dev/null || true)"
        if printf '%s\n' "$mount" | grep -q "^${vol} -> ${dest}$"; then
            ok "Container $cname uses volume $vol"
        else
            fail "Container $cname does NOT use expected volume $vol -> $dest"
        fi
    else
        warn "Container $cname not present yet (متوقع في أول نشر)"
    fi
}
check_container_volume "nqp-postgres-dev" "$PG_VOLUME" "/var/lib/postgresql/data"
check_container_volume "nqp-redis-dev"    "$RD_VOLUME" "/data"

# ------------------------------------------------------------
# 6. صورة Backend الحالية (تشغيل/إيقاف)
# ------------------------------------------------------------
if docker ps -a --filter "name=^/nqp-backend-dev$" --format '{{.Names}}' | grep -qx "nqp-backend-dev"; then
    cur_backend="$(docker ps -a --filter "name=^/nqp-backend-dev$" --format '{{.Image}}')"
    echo -e "${CYAN}[INFO]${NC} Current backend image (container): $cur_backend"
else
    warn "Container nqp-backend-dev not present yet"
fi

# ------------------------------------------------------------
# 7. صحة Compose عبر المحركين معاً (مع --env-file صراحةً)
# ------------------------------------------------------------
COMPOSE_V2_OK=0
if docker compose version >/dev/null 2>&1; then
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" config -q >/dev/null 2>&1; then
        ok "Compose syntax (docker compose)"
    else
        fail "Invalid Compose (docker compose) — check $COMPOSE_REL"
    fi
else
    warn "docker compose (v2) غير متوفر — تم تخطي فحصه"
fi

if docker-compose version >/dev/null 2>&1; then
    if docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_REL" config -q >/dev/null 2>&1; then
        ok "Compose syntax (docker-compose)"
    else
        fail "Invalid Compose (docker-compose) — check $COMPOSE_REL"
    fi
else
    fail "docker-compose (v1) غير متوفر — وهو المحرك الرسمي للـ VPS"
fi

# ------------------------------------------------------------
# 8. إعداد Compose المُعرَّب (rendered) — يُحفظ مؤقتاً فقط
# ------------------------------------------------------------
RENDERED="$(mktemp)"
trap 'rm -f "$RENDERED"' EXIT

RENDER_CMD=(docker compose)
if ! docker compose version >/dev/null 2>&1; then
    warn "Rendering via docker-compose (v1) فقط — docker compose غير متوفر"
    RENDER_CMD=(docker-compose)
fi

if ! "${RENDER_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_REL" config > "$RENDERED" 2>/dev/null; then
    fail "Compose rendering failed (config)"
else
    ok "Compose rendered OK"
fi

if [ -s "$RENDERED" ]; then
    # 8.1 volumes الخارجية المتوقعة
    if grep -qF 'name: deploy_nqp_postgres_data' "$RENDERED"; then
        ok "Rendered Compose references external volume: deploy_nqp_postgres_data"
    else
        fail "Rendered Compose does NOT reference external volume deploy_nqp_postgres_data"
    fi
    if grep -qF 'name: deploy_nqp_redis_data' "$RENDERED"; then
        ok "Rendered Compose references external volume: deploy_nqp_redis_data"
    else
        fail "Rendered Compose does NOT reference external volume deploy_nqp_redis_data"
    fi
    ext_count="$(grep -cF 'external: true' "$RENDERED" || true)"
    if [ "$ext_count" -ge 2 ]; then
        ok "External volumes flagged (external: true) x$ext_count"
    else
        fail "External volumes expected x2, found x$ext_count"
    fi

    # 8.2 صورة Backend المثبّتة (backend + celery + celery-beat)
    B_LINES=()
    while IFS= read -r line; do B_LINES+=("$line"); done < <(grep 'image: ghcr.io/anasshouran/nqp-backend:' "$COMPOSE_FILE")
    if [ "${#B_LINES[@]}" -eq 0 ]; then
        fail "Backend image not found in Compose (backend/celery/celery-beat)"
    else
        uniq_img="$(printf '%s\n' "${B_LINES[@]}" | sed 's/^[[:space:]]*//' | sort -u)"
        nuniq="$(printf '%s\n' "$uniq_img" | grep -c '^image: ' || true)"
        if [ "$nuniq" -gt 1 ]; then
            fail "Backend/Celery/Celery-Beat images differ — يجب أن تكون صورة واحدة"
        else
            back_img="$(printf '%s\n' "$uniq_img" | sed -n 's|^image: ghcr.io/anasshouran/nqp-backend:\(.*\)$|\1|p' | head -n1)"
            if [ -z "$back_img" ] || [ "$back_img" = "dev" ] || printf '%s' "$back_img" | grep -q '\${'; then
                fail "Backend image must be pinned to a concrete tag (got: $back_img)"
            else
                ok "Backend image pinned: ghcr.io/anasshouran/nqp-backend:$back_img"
                rcount="$(grep -cF "image: ghcr.io/anasshouran/nqp-backend:$back_img" "$RENDERED" || true)"
                if [ "$rcount" -ge 3 ]; then
                    ok "Rendered Compose uses $back_img for the 3 backend services"
                else
                    fail "Rendered Compose has only $rcount/3 backend image references"
                fi
            fi
        fi
    fi

    # 8.3 منفذ الواجهة الأمامية (127.0.0.1:8080 -> 80)
    if grep -qF "127.0.0.1:\${FRONTEND_PORT:-8080}:80" "$COMPOSE_FILE"; then
        ok "Frontend port config: 127.0.0.1:8080 -> 80 (loopback)"
    else
        fail "Frontend port must be pinned to 127.0.0.1:\${FRONTEND_PORT:-8080}:80"
    fi

    # 8.4 عدم كشف PostgreSQL / Redis على الـ Host
    if grep -nE 'published: "(5432|6379)"' "$RENDERED" | grep -q .; then
        fail "PostgreSQL/Redis published on host ports in rendered Compose"
    else
        ok "No public PostgreSQL/Redis ports in rendered Compose"
    fi
    if grep -nF '"5432:5432"' "$RENDERED" | grep -q . || grep -nF '"6379:6379"' "$RENDERED" | grep -q .; then
        fail "PostgreSQL/Redis host-port mapping found in rendered Compose"
    else
        ok "No host port mapping for 5432/6379"
    fi

    # 8.5 الشبكة
    if grep -qF "$NET_NAME" "$RENDERED"; then
        ok "Network in Compose: $NET_NAME"
    else
        fail "Network $NET_NAME not found in rendered Compose"
    fi
    if docker network inspect "$NET_NAME" >/dev/null 2>&1; then
        ok "Network exists on host: $NET_NAME"
    else
        warn "Network $NET_NAME غير موجود بعد (يُنشأ عند أول up — طبيعي قبل أول نشر)"
    fi
fi

# ------------------------------------------------------------
# 9. الخلاصة
# ------------------------------------------------------------
echo ""
if [ "$FAIL_CNT" -eq 0 ]; then
    printf "${GREEN}DEV CHECK PASSED${NC} (${WARN_CNT} warnings)\n"
    exit 0
fi
printf "${RED}DEV CHECK FAILED${NC} (%s errors, %s warnings)\n" "$FAIL_CNT" "$WARN_CNT"
exit 1