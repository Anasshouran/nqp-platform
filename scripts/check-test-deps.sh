#!/usr/bin/env bash
# M5-D-ب: CI guard — fails if package.json declares a test script but vitest is missing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT/frontend"

# 1. script test موجود؟
if ! python3 -c "import json,sys; d=json.load(open('package.json')); sys.exit(0 if 'test' in d.get('scripts',{}) else 1)"; then
  echo "❌ No 'test' script in package.json"
  exit 1
fi

# 2. vitest في devDependencies؟
if ! python3 -c "import json,sys; d=json.load(open('package.json')); sys.exit(0 if 'vitest' in d.get('devDependencies',{}) else 1)"; then
  echo "❌ 'test' script exists but 'vitest' missing from devDependencies"
  echo "   This was the D-M4-3-1 root cause — tests silently dormant for M4+M5."
  exit 1
fi

# 3. vitest مثبت فعلياً؟
if ! [ -d node_modules/vitest ]; then
  echo "❌ vitest not installed. Run: npm install"
  exit 1
fi

echo "✅ test script + vitest dependency OK"
