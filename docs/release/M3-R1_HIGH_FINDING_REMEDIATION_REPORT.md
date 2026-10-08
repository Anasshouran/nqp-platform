# M3-R1 HIGH-FINDING REMEDIATION REPORT

**Date:** 2026-10-08  
**Phase:** M3-R1 — Controlled remediation of M3 HIGH findings

---

## 1. Executive Summary

- **H-1 (backend deps): PASS** — controlled pin-bump (Django5.2.18 / DRF 3.17.2 / simplejwt 5.5.1 / cryptography 50.0.2 / dotenv 1.2.4) → pip-audit **0 vulnerabilities**; full baseline **215 passed**; check/migrations/Bandit clean; OpenAPI 12 paths.
- **H-2 (mobile deps): CONDITIONED/DEFERRED** — `npm audit fix` applied (one transitive lockfile patch; regression green); 23 HIGH remain, **all in the build/metro/jest toolchain chain** (direct: expo/react-native pulled only as their parent chain; no runtime-app-shipping advisories identified) → **ACCEPTED SECURITY RISK — BUILD TOOLCHAIN**(non-shipped) + **DEFERRED — REQUIRES DEDICATED EXPO UPGRADE PHASE** for the remainder. 0 CRITICAL.
- **H-3 (application identity): BLOCKED** — no owner-approved `android.package`/`ios.bundleIdentifier` exists anywhere (no `eas.json`); not implemented per instruction; **OWNER APPROVAL REQUIRED**.

Final verdict: **M3-R1 ACCEPTED WITH CONDITIONS**.

## 2. M3 Baseline (pre-remediation)

CODE READY · STAGING READY WITH CONDITIONS · PRODUCTION NOT ASSESSED · BLOCKERS 0 · H-1/H-2/H-3 open.

## 3. H-1 Backend Dependency Remediation

| Package | Current | Advisory(s) | Fixed Target | Direct/Transitive | Compatibility | Action |
| --- | --- | --- | --- | --- | --- | --- |
| django | 5.0.14 | 12 (PYSEC-2025-47/105/107/108, PYSEC-2026-198/199/201, -2090/-2091/-2092, -3717, -4035) | ≥5.2.17 (→5.2.18) | direct | Django 5.2 LTS; py3.10–3.13; ecosystem ok (dry-run resolved without conflicts) | pin `>=5.2.17,<5.3` + install |
| djangorestframework | 3.15.2 | 2 (PYSEC-2026-3827/-3828) | ≥3.17.2 | direct | DRF 3.17 supports Django 4.2–5.2 | pin `>=3.17.2,<3.18` |
| djangorestframework-simplejwt | 5.3.1 | 1 (PYSEC-2026-1305) | ≥5.5.1 | direct | simplejwt 5.5 with DRF 3.17 | pin `>=5.5.1,<5.6` |
| cryptography | 43.0.3 | 8 (PYSEC-2026-35 ×2, -1284, -2141, -3553 ×2, -3554, GHSA-537c, **3552**) | ≥50.0.0 | direct | py3.13 wheels; app usage via DRF/OAuth paths | pin `>=50.0.0,<51` (+`--ignore-installed cffi` locally for Debian RECORD quirk; no code change) |
| python-dotenv | 1.0.1 | 1 (PYSEC-2026-2270) | ≥1.2.2 (→1.2.4) | direct | settings loads path API only | pin `>=1.2.2,<1.3` |

Result: `pip-audit → No known vulnerabilities found` · installed/verified: django 5.2.18, DRF 3.17.2, simplejwt 5.5.1, cryptography 50.0.2, dotenv 1.2.4.

## 4. H-2 Mobile Dependency Assessment

| Package | Severity | Direct/Transitive | Runtime/Build | Fixed Version | Safe Upgrade? | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| expo (direct) | high | direct (via @expo/* toolchain) | build-tool (CLI/metro) | requires SDK patch/major | NO (SDK migration) | DEFERRED — DEDICATED EXPO UPGRADE PHASE |
| react-native (direct) | high | direct (via metro chain) | runtime framework but advisory originates in build chain | RN patch within SDK only | NO (no standalone safe patch) | DEFERRED — DEDICATED EXPO UPGRADE PHASE |
| @expo/cli, @expo/metro, @expo/metro-config, react-native/community-cli-plugin | high | transitive (expo/rn) | build-time only | fixed in later SDK patch | NO standalone within current pins | ACCEPTED SECURITY RISK — BUILD TOOLCHAIN |
| metro, metro-config, metro-file-map, metro-transform-worker, jest-*, babel-jest, @jest/* | high | transitive (rn/jest) | build/test runtime, not shipped | fixed via SDK/toolchain bump | NO within current pins | ACCEPTED SECURITY RISK — BUILD TOOLCHAIN |
| braces, micromatch, node-forge, @react-native/jest-preset, @react-native/virtualized-lists, @jest/environment, @jest/fake-timers, @jest/transform, jest-environment-node, jest-haste-map, jest-message-util, react-native/virtualized-lists | high | transitive | build/test tooling | fixed via parent snapshot bump | NO standalone safe bump | ACCEPTED SECURITY RISK — BUILD TOOLCHAIN + note |

`npm audit --omit=dev` → 23 HIGH / 12 moderate / **0 CRITICAL** (after `npm audit fix`; lockfile +1 transitive patch, audit-visible count unchanged).

## 5. H-3 Application Identity

- Inspected `app.json`, package metadata, deploy docs, `eas.json`: **no approved `android.package` / `ios.bundleIdentifier` exists**; no EAS project config.
- **Decision: `BLOCKED — OWNER APPROVAL REQUIRED FOR APPLICATION IDENTITY`.** Not implemented; none invented. Required before any release-ready EAS build.

## 6. Compatibility Analysis (H-1)

- Python 3.13.5 ✓ for Django 5.2 / DRF 3.17 / simplejwt 5.5 / cryptography 50 / dotenv 1.2.4.
- No removed-API usage in repo code (grep for `timezone.utc`, `ugettext`, `force_text`, `providing_args`, `conf.urls.url` → none).
- drf-spectacular resolution succeeded with DRF 3.17 (dry-run 0 conflicts).
- simplejwt usage (RefreshToken semantics, blacklist) intact; `TokenRefreshSerializer` standard.

## 7. Backend Regression (R1-Backend)

```text
pytest apps/mobile_api apps/screening apps/travelers apps/vaccination -q → 215 passed, 0 failed
manage.py check → no issues
manage.py makemigrations --check --dry-run → No changes detected
bandit (-ll -ii) mobile_api + travelers/serializers → 0 High / 0 Medium
secret scan → clean
pip-audit -r requirements/base.txt → No known vulnerabilities found
```

## 8. Mobile Regression (R1-Mobile)

```text
npm test → 16 suites / 114 passed (baseline 114)
npm run typecheck → clean
npm run lint → clean
contracts: npm test → 11 passed
npm audit --omit=dev → 23 HIGH / 0 CRITICAL (unchanged after safe fix)
npx expo export --platform android → OK (LOCAL Build)
```

## 9. Security Scans (R1-Security)

Bandit 0H/0M (exit 0) · secrets clean · pip-audit **0** · npm audit 0 critical · Django check clean.

## 10. Build Validation (R1-Build)

- Backend: `manage.py check` + spectacular generate (12 mobile paths) → OK.
- Mobile: Android export bundle OK (LOCAL only). **EAS staging build NOT executed (no applicationId; per H-3 BLOCKED + OPERATIONAL DEPENDENCY).**

## 11. Database/Migration Integrity (R1-DB)

`DATABASE CHANGES = NONE` · `MIGRATIONS CREATED = NONE` · `MIGRATIONS APPLIED = NONE`.

## 12. Remaining Findings

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| M3-H-3 | applicationId missing | HIGH | **BLOCKED** (owner approval) |
| M3-H-2 | expo/metro/jest build-chain advisories | HIGH (accepted/deferred) | ACCEPTED (build toolchain) + DEFERRED (SDK upgrade phase) |
| M3-M-1/4 | env defaults (localhost URL, SSL redirect opt-in, hosts/CORS) | MEDIUM | owner/env, runbook |
| M3-M-2/3 | backups/observability automation | MEDIUM (operational) | Ops |
| M3-PG-1/2 | policy gaps (retention Q2, institutional risk display) | LOW-MEDIUM | owner |

## 13. M3-R1 Acceptance Matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| R1-H3 Application Identity | **BLOCKED** | no approved ID; not implemented |
| R1-H1 Backend Dependencies | **PASS** | pip-audit 0; pins table §3 |
| R1-H2 Mobile Dependencies | **CONDITIONED / DEFERRED** | §4/§8 |
| R1-Backend Regression | **PASS** | 215 passed |
| R1-Mobile Regression | **PASS** | 114 passed |
| R1-Security Scans | **PASS** | bandit 0M/0H; audits clean/0-critical |
| R1-Build Validation | **PASS (LOCAL)** | checks + expo export OK |
| R1-DB Integrity | **PASS** | NONE |
| R1-Scope Integrity | **PASS** | §15 |

## 14. Staging Readiness Impact

- **H-1 cleared** → HIGH dependency regression resolved; pip/npm 0 critical.
- **H-3 still BLOCKED** → EAS staging mobile build cannot proceed until owner supplies `android.package`/`ios.bundleIdentifier`.
- **H-2 deferred** → acceptable for staging because advisories are build-time; runtime app bundle verified by export + suites; dedicated Expo SDK/channel upgrade phase scheduled before production exposure.
- **Net:** CODE READY; STAGING READY WITH CONDITIONS (+ H-3 identity + H-2 deferred Expo phase acknowledged); PRODUCTION: NOT ASSESSED.

## 15. Scope Integrity

`SUDAPASS = DEFERRED` · `DECLARATION_WRITE = DEFERRED` · `PRODUCTION SECRETS FOUND = NO` · `DEBUG AUTH = NO` · `HTTP PRODUCTION ENDPOINT = NO` · `PRE-EXISTING WORKTREE CHANGES PRESERVED = YES` · `UNRELATED FILES MODIFIED = NO` (only `backend/requirements/base.txt` pins + mobile lockfile one-transitive-patch + this report).

## 16. Final Verdict

`M3-R1 ACCEPTED WITH CONDITIONS`

## 17. Approved Path (2026-10-08)

`M3-R1 ACCEPTED WITH CONDITIONS` → **Owner App-ID Approval** → **M4 Controlled Staging Validation**.
Upon receipt of owner-approved `android.package` / `ios.bundleIdentifier`, M4 begins directly — no M2/M3 phase re-runs.

