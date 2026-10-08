#!/usr/bin/env python3
"""قياس LOCAL لنقاط الجوال المنفَّذة (M2-A §20).

- يحصل على رمز JWT عبر نقطة الدخول القائمة /api/v1/auth/login (خادم محلي).
- يقيس p50/p95 لكل نقطة منفَّذة (مع JWT) ونقطتي مرجع دون JWT.
- LOCAL ONLY — لا يُدعى أنه قياس شبكة/Staging.

الاستخدام:
    python3 scripts/m2a_measure_perf.py http://127.0.0.1:8765 <identifier> <password>
"""
from __future__ import annotations

import json
import statistics
import sys
import time
import urllib.error
import urllib.request

SAMPLES = 30

ENDPOINTS = [
    ("GET", "/api/v1/mobile/profile/"),
    ("GET", "/api/v1/mobile/requirements/"),
    ("GET", "/api/v1/mobile/certificates/"),
    ("GET", "/api/v1/mobile/declarations/"),
    ("GET", "/api/v1/mobile/notifications/"),
    ("GET", "/api/v1/mobile/sync/status/"),
    ("GET", "/api/v1/health/"),  # مرجع
]


def measure(base: str, method: str, path: str, token: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    samples: list[float] = []
    statuses: set[int] = set()
    for _ in range(SAMPLES):
        req = urllib.request.Request(base + path, headers=headers, method=method)
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
        "max_ms": round(samples[-1], 1),
    }


def login(base: str, identifier: str, password: str) -> str:
    body = json.dumps({"identifier": identifier, "password": password}).encode()
    req = urllib.request.Request(
        base + "/api/v1/auth/login/", data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode())
    return payload["data"]["access_token"]


def main() -> int:
    base, identifier, password = sys.argv[1], sys.argv[2], sys.argv[3]
    token = login(base, identifier, password)
    print(f"{'endpoint':55} {'status':10} {'p50':>8} {'p95':>8} {'max':>8}")
    worst = 0.0
    for method, path in ENDPOINTS:
        row = measure(base, method, path, token)
        worst = max(worst, row["p95_ms"])
        print(f"{row['endpoint']:55} {str(row['statuses']):10} "
              f"{row['p50_ms']:>8} {row['p95_ms']:>8} {row['max_ms']:>8}")
    print()
    print(f"LOCAL ONLY — worst p95 = {worst:.1f} ms (n={SAMPLES}, loopback, dev server)")
    print("STAGING/NETWORK: NOT MEASURED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())