#!/usr/bin/env bash
# تصدير مخطط OpenAPI الكامل (بما فيه مساحة الجوال) من الباك اند.
# يتطلب إعدادات Django صالحة (بيئة تطوير).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

cd "$ROOT/backend"
python3 manage.py spectacular --file "$HERE/openapi.json"
echo "wrote $HERE/openapi.json"
