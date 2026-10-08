#!/usr/bin/env python3
"""قياس P1.5 — نقاط مستهدفة (§26). لا يدّعي قياساً إنتاجياً؛ LOCAL فقط."""
from __future__ import annotations

import json
import statistics
import sys
import time
import urllib.error
import urllib.request

TARGET_MS = 1500
SAMPLES = 15

ENDPOINTS = [
    ("GET", "/api/v1/health/"),
    ("GET", "/api/v1/travelers/"),            # عزل queryset — 401 (بلا JWT)
    ("GET", "/api/v1/screening/"),            # بوابة RBAC — 401 (بلا JWT)
    ("GET", "/api/v1/vaccination/public/verify/AFY-VAC-000001/"),  # fail-closed — 400 بلا sig
    ("POST", "/api/v1/mobile/auth/login/"),   # 501
]


def run(base: str, method: str, path: str) -> dict:
    samples: list[float] = []
    statuses: set[int] = set()
    body = json.dumps({}).encode() if method == "POST" else None
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
        samples.append((time.perf_counter() - started) * 1000)
    samples.sort()
    return {
        "endpoint": f"{method} {path}",
        "statuses": sorted(statuses),
        "p50_ms": round(statistics.median(samples), 1),
        "p95_ms": round(samples[max(0, int(len(samples) * 0.95) - 1)], 1),
    }


def main() -> int:
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765").rstrip("/")
    print(f"{'endpoint':55} {'statuses':10} {'p50':>8} {'p95':>8}")
    worst = 0.0
    for method, path in ENDPOINTS:
        row = run(base, method, path)
        worst = max(worst, row["p95_ms"])
        print(f"{row['endpoint']:55} {str(row['statuses']):10} {row['p50_ms']:>8} {row['p95_ms']:>8}")
    print()
    print(f"LOCAL BASELINE = p95 worst {worst:.1f} ms (n={SAMPLES}, loopback, dev server)")
    print(f"TARGET         = {TARGET_MS} ms")
    print("NETWORK/STAGING BASELINE = NOT MEASURED (يتطلب بيئة شبكة/Staging حقيقية)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())