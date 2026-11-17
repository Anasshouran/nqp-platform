# M4-3 Known Debt — Registry Tree UI

## D-M4-3-1: لا Vitest

**الوضع (أصلي M4-3):** M4-3 اعتمد manual verification. لا اختبارات آلية.

**الحل (M5-D):** إضافة `@testing-library/react` + Vitest، اختبارات:
- Tree renders correctly
- Picker filters
- Loading/error states

### Correction — D-M4-3-1 (M5-D-ب, 2026-11-12)

**Original text:** "No Vitest — 0 frontend tests"
**Reality (discovered in M5-D):** 98 test files existed (`*.test.tsx`) in `frontend/src/`, never run because `vitest` was missing from `devDependencies`. `package.json` had `test: vitest --run` script, but `npm install` never installed vitest. CI ran only `tsc` + `build` — never tests.

**Impact:**
- M4 and M5 developed with 786 tests silently dormant.
- Any refactor of the 98 files could have broken them without detection.
- M5-D revived them (827 total, all passing — verified by CI log: `Test Files 110 passed (110)` + `Tests 827 passed (827)`).

**Corrected debt:** D-M4-3-1 → **CLOSED** (tests now run; 827 total).

**Lesson:** `package.json` scripts without corresponding devDeps should fail CI. See `scripts/check-test-deps.sh` (M5-D-ب Q5).

## D-M4-3-2: لا pagination

**الوضع:** الشجرة تُجلب كاملة. يعمل مع <1000 nodes. لو تجاوزت 5000، قد يبطؤ.

**الحل المقترح (M5):** lazy-load children on expand، أو API يدعم `?parent_id=`.

## D-M4-3-3: Facility detail page غائب

**الوضع:** المستخدم يرى الشجرة لكن لا يستطيع النقر على منشأة لرؤية تفاصيلها.

**الحل المقترح (M4-4):** صفحة تفاصيل مع tabs (ownership, supervision, services).

## D-M4-3-4: لا edit/create

**الوضع:** read-only فقط.

**الحل المقترح (M4-4):** forms + validation + optimistic updates.

## D-M4-3-5: Dashboard tree endpoint — scoping (✅ CLOSED in M4-3-bis)

**الوضع (قبل):** `/dashboard/tree/` كان غير مُقيَّد (ViewSet عادي، لا RegistryScopedViewSet). M4-3 أضاف scoping عبر instantiate viewset (hack).

**الحل (M4-3-bis):** استخراج `_visible_reporting_node_ids(user)` helper — single source of truth. يستخدمه:
- `RegistryScopedViewSet.get_queryset` (case ReportingNode)
- `RegistryDashboardViewSet.tree`
- `RegistryDashboardViewSet.summary`

**الاختبار:** 3 اختبارات جديدة (STATE tree, SECTOR tree, summary scoped) + 2 في bis parametrize.

**D-M4-3-5 → CLOSED.**

## D-M4-3-6: STATE user tree — root becomes state node (not FEDERAL)

**الوضع:** STATE user لا يرى FEDERAL root. The state node becomes the root of the displayed tree (depth preserved but parent null in output). This is correct (no leak) but depth labels may be confusing.

**الحل (M4-4):** adjust depth display or add "scope indicator" in UI.
