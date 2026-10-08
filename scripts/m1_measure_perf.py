#!/usr/bin/env python3
"""قياس خط أساس للأداء لمسارات API الجوال (M1.11).

يقيس p50/p95 لنقاط نهاية محددة ضد خادم محلي ويطبع جدولاً:
BASELINE / TARGET / MEASURED / GAP.

usage:
    python3 scripts/m1_measure_perf.py [base_url]
"""
from __future__ import annotations

import json
import statistics
import sys
import time
import urllib.error
import urllib.request

TARGET_P95_MS = 1500  # phase-16 §M1 performance contract
SAMPLES = 30

ENDPOINTS = [
    ("GET", "/api/v1/health/"),
    ("GET", "/api/v1/mobile/profile/"),          # 401 (بلا JWT) — مسار محمي
    ("POST", "/api/v1/mobile/auth/login/"),      # 501 — مسار العقد
    ("GET", "/api/v1/public/travel-requirements/"),
]


def measure(base: str, method: str, path: str) -> dict:
    samples: list[float] = []
    statuses: set[int] = set()
    body = None if method == "GET" else json.dumps({}).encode()
    for _ in range(SAMPLES):
        req = urllib.request.Request(
            base + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json"} if body else {},
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp.read()
                statuses.add(resp.status)
        except urllib.error.HTTPError as exc:
            exc.read()
            statuses.add(exc.code)
        except Exception as exc:  # noqa: BLE001 — نسجل الخطأ كفشل قياس
            statuses.add(-1)
            print(f"  ! {method} {path}: {exc}", file=sys.stderr)
        samples.append((time.perf_counter() - started) * 1000)
    samples.sort()
    p50 = statistics.median(samples)
    p95 = samples[max(0, int(len(samples) * 0.95) - 1)]
    return {
        "endpoint": f"{method} {path}",
        "statuses": sorted(statuses),
        "p50_ms": round(p50, 1),
        "p95_ms": round(p95, 1),
        "min_ms": round(samples[0], 1),
        "max_ms": round(samples[-1], 1),
    }


def main() -> int:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765").rstrip("/")
    rows = []
    for method, path in ENDPOINTS:
        rows.append(measure(base, method, path))

    print(f"{'endpoint':55} {'status':10} {'p50':>8} {'p95':>8} {'min':>8} {'max':>8}")
    for row in rows:
        print(
            f"{row['endpoint']:55} {str(row['statuses']):10} "
            f"{row['p50_ms']:>8} {row['p95_ms']:>8} {row['min_ms']:>8} {row['max_ms']:>8}"
        )
    print()
    worst = max(r["p95_ms"] for r in rows)
    print(f"BASELINE  = local dev, n={SAMPLES} per endpoint, sequential, loopback")
    print(f"TARGET    = p95 <= {TARGET_P95_MS} ms (phase-16 M1 performance contract)")
    print(f"MEASURED  = worst p95 = {worst} ms")
    print(f"GAP       = {worst - TARGET_P95_MS:+.1f} ms vs target")
    print(
        "CAVEAT    = ليس اختبار حِمل إنتاجي؛ قياس محلي فقط. "
        "هدف p95 <= 1.5s على شبكة حقيقية يبقى غير مُتحقق منه حتى اختبار الحِمل (M5)."
    )
    return 0 if worst <= TARGET_P95_MS else 1


if __name__ == "__main__":
    raise SystemExit(main())
