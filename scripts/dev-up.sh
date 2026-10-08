#!/usr/bin/env bash
# تشغيل خدمات التطوير مع إشراف عبر ملفات PID.
#
# لماذا لا tmux؟ خادم tmux يُنظَّف تلقائيًا بين الجلسات في بعض البيئات،
# فيسقط معه كل شيء. `setsid` مع ملف PID يبقى أثبت.
#
# الاستخدام:
#   bash scripts/dev-up.sh            # تشغيل (افتراضي)
#   bash scripts/dev-up.sh status     # الحالة
#   bash scripts/dev-up.sh down       # إيقاف الكل
#   bash scripts/dev-up.sh logs <name># تتبّع سجل خدمة
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGDIR="$ROOT/.dev-logs"
RUNDIR="$ROOT/.dev-run"
mkdir -p "$LOGDIR" "$RUNDIR"

BACKEND_HEALTH='http://127.0.0.1:8000/api/v1/health/'
FRONTEND_URL='http://127.0.0.1:3001/'

# الترتيب مهم: beat بعد worker.
declare -a NAMES=(backend celery beat frontend)
declare -A CMDS=(
  [backend]='python manage.py runserver 0.0.0.0:8000 --noreload'
  [celery]='celery -A nqp_backend worker --loglevel=info --concurrency=2'
  [beat]='celery -A nqp_backend beat --loglevel=info'
  [frontend]='npm run dev'
)
declare -A DIRS=(
  [backend]="$ROOT/backend"
  [celery]="$ROOT/backend"
  [beat]="$ROOT/backend"
  [frontend]="$ROOT/frontend"
)

pidfile() { printf '%s/%s.pid' "$RUNDIR" "$1"; }

is_running() {
  local pf; pf="$(pidfile "$1")"
  [[ -f $pf ]] || return 1
  local pid; pid="$(cat "$pf" 2>/dev/null)"
  [[ -n ${pid:-} ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

stop_one() {
  local name="$1" pf pid
  pf="$(pidfile "$name")"
  if is_running "$name"; then
    pid="$(cat "$pf")"
    # العملية في جلسة خاصة بها (setsid) فلا تُقتل بـ TERM إلا هي وفروعها.
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    for _ in $(seq 1 10); do
      is_running "$name" || break
      sleep 0.5
    done
    is_running "$name" && kill -KILL -- "-$pid" 2>/dev/null
    printf '  %-9s stopped\n' "$name"
  fi
  rm -f "$pf"
}

wait_for() {  # wait_for <name> <url> [tries]
  local name="$1" url="$2" tries="${3:-60}"
  for _ in $(seq 1 "$tries"); do
    curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null && return 0
    sleep 1
  done
  printf '  %-9s DOWN  %s\n' "$name" "$url"
  return 1
}

status() {
  printf 'processes\n'
  for n in "${NAMES[@]}"; do
    if is_running "$n"; then
      printf '  %-9s running (pid %s)\n' "$n" "$(cat "$(pidfile "$n")")"
    else
      printf '  %-9s stopped\n' "$n"
    fi
  done
  printf '\nhealth probes\n'
  wait_for backend  "$BACKEND_HEALTH" 1 && printf '  %-9s up   %s\n' backend  "$BACKEND_HEALTH"
  wait_for frontend "$FRONTEND_URL"   1 && printf '  %-9s up   %s\n' frontend "$FRONTEND_URL"
  printf '\ncontainers\n'
  docker ps --format '  {{.Names}}\t{{.Status}}' 2>/dev/null
  printf '\nlogs: %s\n' "$LOGDIR"
}

case "${1:-up}" in
  down)
    for n in "${NAMES[@]}"; do stop_one "$n"; done
    exit 0
    ;;
  status) status; exit 0 ;;
  logs)
    n="${2:-backend}"
    exec tail -f "$LOGDIR/$n.log"
    ;;
esac

# 1) البنية التحتية: Postgres + Redis + MinIO
printf 'starting infrastructure...\n'
docker start afyatna-db-dev afyatna-redis-dev nqp-minio 2>/dev/null
for _ in $(seq 1 30); do
  docker ps --format '{{.Names}}' | grep -q afyatna-db-dev && break
  sleep 1
done

# 2) أوقف أي نسخة قديمة ثم شغّل
for n in "${NAMES[@]}"; do stop_one "$n"; done

for n in "${NAMES[@]}"; do
  : > "$LOGDIR/$n.log"
  # setsid: جلسة leadership مستقلة عن الطرفية، فتبقى بعد انتهاء الأمر.
  setsid bash -c "cd '${DIRS[$n]}' && exec ${CMDS[$n]}" \
    >>"$LOGDIR/$n.log" 2>&1 </dev/null &
  printf '%s' "$!" > "$(pidfile "$n")"
  disown 2>/dev/null || true
done

printf 'waiting for services...\n'
wait_for backend  "$BACKEND_HEALTH" 60
wait_for frontend "$FRONTEND_URL"   60

printf '\n'
status