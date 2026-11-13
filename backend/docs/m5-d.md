# M5-D — Vitest + Registry UI Tests

## Added

- vitest 2.1 + @testing-library/react + jsdom (devDependencies)
- `frontend/vitest.config.ts`
- `frontend/src/test/setup.ts` (i18n init + jest-dom + cleanup)
- 41 tests across 12 files (Registry UI only — scope A)
- CI: `Frontend — Test (vitest)` step (replaced `npm test -- --run`)

## Scope (A)

Covered:
- RegistryTreePage (5): loading/error/empty/data/banner
- RegistryNodeTree (6): render/expand/collapse/navigate/defensive/empty
- RegistryRootPicker (3): options/change/all
- FacilityDetailPage (5): 6 tabs/tab switch/404/header/error
- 6 facility tabs (12): render/empty each
- NodeCreateModal (4): render/validation/submit/error
- NodeEditModal (5): render/prefill/disabled/submit/error

Not covered (M5-D-ب):
- Organization, MasterData, HR, Surveillance pages
- RoleAssignmentFormDialog
- i18n drift tests
- Full-app e2e (Playwright — M7)

## CI

Step in `Frontend — typecheck + lint + build` job:
```yaml
- name: Test (vitest)
  run: npm run test
```

## Coverage Targets

Scoped to `src/pages/registry/**`, `src/components/registry/**`. Thresholds: lines 60%, functions 60%, branches 50%, statements 60%.

## Baseline Shift

- Frontend: 0 (CI) → 827 tests (98 pre-existing test files, ~786 tests, now runnable + 41 new)
- Backend: unchanged (2958 + 0xf + 2skip)
- `npm run test` now part of CI.

## Notes

- i18n initialized globally in setup.ts so pre-existing tests (Arabic labels) pass.
- Registry tests mock `react-i18next` per-file (returning keys) for isolation.
---

## Correction — D-M4-3-1

**Original text:** "No Vitest — 0 frontend tests"
**Reality (discovered in M5-D):** 98 test files existed (`*.test.tsx`), never run because `vitest` was missing from `devDependencies`.

**Root cause:** `package.json` had `test: vitest --run` script, but the dependency was missing. CI ran `npm run build` + `tsc` only — never `npm run test`. Local developers didn't run tests either.

**Impact:**
- M4 and M5 were developed with 786 tests silently dormant.
- Any refactor to 98 files could have broken them without detection.
- M5-D revives them (all pass).

**Corrected debt:** D-M4-3-1 → CLOSED (tests now run; 827 total).

**Lesson:** `package.json` scripts without corresponding devDeps should fail CI. Proposed guard in `m5-d-followup.md`.

## Discovery

827 frontend tests now runnable (41 new + 786 pre-existing). 98 pre-existing test files were dormant because vitest was never installed.

Verified by V-1 (M5-D verification, 2026-11-12):
- `find frontend/src -name "*.test.*"` = 110 files (98 pre-existing + 12 new)
- All 786 pass with vitest 2.1.9
- No `node_modules` capture (config scoped to `src/**`)

## jsdom version

Original `package.json` had `jsdom@^29.1.1` (from initial project template). M5-D kept 29.1.1 instead of downgrading to 25.x as originally planned. jsdom 29 works with vitest 2.1 (verified: 827 tests pass, build succeeds).

**Note:** npm latest is 31.x — update in M5-D-ب if desired.
