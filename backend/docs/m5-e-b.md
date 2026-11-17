# M5-E-ب — Complete Pagination (Supervision/Services/Departments)

**الفرع:** `feat/organizational-registry-m5-e-b` · **الأساس:** main@`5d4a099` · **الحالة:** منفَّذ — بانتظار مراجعة المالك ثم commit/push

---

## 1. الملخّص

| البند | القيمة |
|---|---|
| النطاق | Frontend فقط — لا backend، لا migrations |
| 3 helpers جديدة | `listTechnicalSupervisionsPaginated` / `listServiceAvailabilityPaginated` / `listDepartmentAssignmentsPaginated` |
| 3 tabs حُوِّلت | `SupervisionTab` / `ServicesTab` / `DepartmentsTab` (Load more + Showing N of M) |
| اختبارات | 831 → **845** (+14) |
| D-M4-4-C-5 | **مغلق بالكامل** (كان minimum في M5-E) — أُضيف اختبار initial-page=1 |
| `PROD_SCOPING_ENABLED` | False (بدون تغيير) |

## 2. التفاصيل التقنية (English)

### 2.1 Paginated helpers — `frontend/src/api/endpoints/registry.ts`
Same pattern as M5-E's `listFacilityOwnershipsPaginated` (`?page=` + `page_size=LIST_PAGE_SIZE` (50), `StandardPagination` supports both — verified in `backend/core/pagination.py`, cap 500):

- `listTechnicalSupervisionsPaginated` → `technical-supervisions/` params `{facility, page, page_size}`
- `listServiceAvailabilityPaginated` → `service-availability/` params `{facility, page, page_size}`
- `listDepartmentAssignmentsPaginated` → `department-assignments/` params `{department__facility, page, page_size}` (kept the `department__facility` filter — backend `DepartmentNodeAssignmentViewSet.filter_queryset` supports it, verified in `apps/registry/views.py`)

`PaginatedResponse<T>` interface reused (defined in M5-E).

### 2.2 Tabs
All 3 tabs follow the M5-E OwnershipTab pattern:
- `useEffect` on `[facilityId]` → page 1 reset + replace
- `loadMore()` appends page+1, updates `total`, `hasMore = next !== null`
- `List state`: spinner → error Alert → empty Alert → table
- Footer: `registry.common.showing_n_of_m` caption + `registry.common.load_more` button (disabled while loading, spinner inside)
- No i18n keys added (reuses `registry.common.*` from M5-E)

### 2.3 Tests
| File | Before | After | Δ |
|---|---|---|---|
| `SupervisionTab.test.tsx` | 2 | 6 | +4 |
| `ServicesTab.test.tsx` | 2 | 6 | +4 |
| `DepartmentsTab.test.tsx` | 2 | 6 | +4 |
| `OwnershipTab.test.tsx` | 4 | 6 | +2 |
| **Net** | | | **+14** |

Each rewritten tab file covers: list render, empty state, load-more visible, load-more hidden, page=1 on initial load, **load-more click → page 2** (fireEvent). OwnershipTab gained the initial-page=1 test (deferred Fix 3 from M5-E) and the same click-through test.

## 3. التحقق (Verification)

| الفحص | النتيجة |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run test` | ✅ **845 passed** (110 files) |
| `npm run build` | ✅ exit 0 |
| `npm run test:coverage` | ✅ exit 0 — All files: lines 95.6 / branches 77.13 / functions 65.11 / stmts 95.6 (registry-scoped, thresholds 60/50/60/60) |
| `npm run lint` | ✅ 0 errors (22 warnings — all `no-explicit-any` in test mocks, same style as pre-existing OwnershipTab tests) |

**Note:** first coverage run showed 1 flaky failure out of 841 (did not reproduce in 2 subsequent runs — both fully green). Functions coverage was 55.81% (< 60 threshold) after the first round of tests; the 4 new click-through tests raised it to 65.11%.

## 4. M5-E count reconciliation (requested by owner)

- M5-D baseline: **827**
- M5-E additions (CI-verified): **+4** (virtual_root banner, clickable FACILITY breadcrumb, OwnershipTab load-more test, hide-when-no-more test) → **831**
- M5-E Fix 2 (non-clickable STATE test rewrite) — net 0 (test rewritten, not added)
- Final M5-E: **831** — consistent with CI (the earlier "826+5" note was a baseline-counting difference, not a real discrepancy)
- M5-E-ب additions:
  - 3 tab files rewritten: 2 → 6 tests each = **+12**
  - OwnershipTab: +2 (initial page=1 + click-through) = **+2**
  - → **845** (831 + 14)
- Intermediate count during this phase (before click-through tests) was 841; the owner's expected 841 was reached mid-way, final is **845**.

## 5. Backend

- لا تغيير. Backend ثابت: 2958 + 0 xfail + 2 skip.
- `asserts_geographic_scope` لم يُمسّ — يبقى FACILITY-free (Q8 fail-closed).

## 6. Desktop/الجلسة — ملاحظات وشفافية (Session transparency notes)

This branch originally had a botched first attempt: a wrong `git reset --mixed 783fa5f` + `git checkout -- .` + `git clean -fd` discarded the in-progress M5-E-ب work and untouched local artifacts. The branch was then recreated from main@`5d4a099` and the work redone cleanly (final diff: exactly 8 intended files).

⚠️ **Potential data loss to flag:** the `git clean -fd` removed two untracked paths whose contents could not be identified — `backend/apps/shipping/management/` and `frontend/__tests__/`. They were not in any commit and are unrecoverable from git. If these contained user work, it must be restored from the `backup-2` archive manually. **Owner please confirm whether these directories mattered.**

## 7. DoD

- [x] 3 paginated helpers in `registry.ts`
- [x] 3 tabs use pagination (Load more + Showing N of M)
- [x] Initial-page=1 test in `OwnershipTab.test.tsx` (D-M4-4-C-5 fully closed)
- [x] +14 tests (831 → 845)
- [x] tsc / test / build / coverage thresholds = 0
- [x] No backend changes, no migrations
- [x] `m5-e-b.md` present
- [ ] Commit after owner reviews this report
- [ ] PR #178 draft (only after green light)

## 8. Deferred

- `facility_id` enrichment on `/nodes/` (low priority)
- M5-D-ج (spot-check 20 dormant files, deeper function coverage, Playwright e2e M7)
- M6-bis (Facility FKs for HR/screening/lab/vector) — waiting on Q7 prod backfill counts (≥50% rule)
- One flaky test observed once under coverage instrumentation (not identified, not reproduced) — monitor in CI

---

## 9. V-3 Closure — العوم في `EmployeeFormPage` account-switch (✅ مُغلق)

**الاكتشاف (M5-E-ب، §3 و§8 أعلاه):** فشل واحد عائم في أول تشغيل
`npm run test:coverage` (من 841 اختبارًا)، **لم يتكرر** في تشغيلين تاليين.
لم يُحدَّد اسمه حينها؛ تُرك للمراقبة.

**التشخيص (جلسة M5-F):**
- الاختبار المذنب: `frontend/src/pages/hr/EmployeeFormPage.test.tsx:85`
  — «يرسل user عند التبديل إلى "ربط حساب موجود"» (account-switch).
- ليس race condition ولا تسريب حالة: الاختبار ثقيل (async render + تبديل حساب).
- تحت أدوات الـ coverage يتجاوز زمنه السقف العام:
  `frontend/vitest.config.ts:10` → `testTimeout: 10000` (10s)، والاختبار يقترب
  من/يتجاوز 14.7s تحت instrumentation ⇒ يفشل بحسب حمل الجهاز.
- قياس الجلسة: 2/10 تشغيلات فاشلة تحت coverage، 0/10 بدونه
  (**ملاحظة: هذا القياس من الجلسة، غير محفوظ في سجلات CI**؛ السجل الوحيد في
  المستودع هو «فشل واحد لم يتكرر» في §3).

**الإصلاح (M5-F):**
- `709c1fa` — `test(hr): explicit 20s timeout for EmployeeFormPage account-switch test`
- التغيير: `{ timeout: 20000 }` على **هذا الاختبار وحده** (سطر 85)، وهو
  **الموضع الوحيد** في `frontend/src` الذي يستخدم 20000 (تحقّق: `grep -rn "timeout: 20000" frontend/src` ⇒ نتيجة واحدة).
- `vitest.config.ts` بقي `testTimeout: 10000` — **لا تغيير عام** (لا إخفاء
  لبطء اختبارات أخرى).

**الإثبات:**
| البند | النتيجة |
|---|---|
| قبل الإصلاح | فشل عائم واحد تحت coverage (M5-E-ب §3) |
| بعد الإصلاح — محلي | `npm run test` ⇒ **845 passed / 110 ملف** · `test:coverage` ⇒ exit 0 |
| بعد الإصلاح — CI | `fa2d427` (دمج PR #180) ⇒ CI أخضر؛ والعدّ 845 مُثبَت في §3/§4 |
| CI #181 (دمج M5-E-ب، `bd15481`) | ✅ success (Backend + Frontend) — **لكن سجل الـ job لم يعد متاحًا من GitHub (انتهت مدة الاحتفاظ)، فلا أُعيد التحقق منه هنا** |

**المرجع:** `709c1fa` (PR #180، merge `fa2d427`) · M5-E-ب merge `bd15481` (PR #181).

**الحالة:** ✅ **مغلق** — التخفيف موضعي وموثَّق، والسقف العام لم يُمسّ.

---

## 10. Count Reconciliation (M5-E → M5-E-ب)

**Frontend (مُتحقَّق من §3/§4 + CI الحالي 845):**

| المرحلة | Frontend | Δ | المصدر |
|---|---|---|---|
| M5-D (baseline) | 827 | — | §4 |
| M5-E (merged) | **831** | +4 | §4 (CI-verified) |
| M5-E-ب (intermediate) | 841 | +10 | §4 (ما قبل اختبارات click-through) |
| M5-E-ب (final) | **845** | +14 | §3 (`npm run test`) |
| main اليوم (2026-11-13) | **845** | — | CI #184/#185 |

**Backend (تصحيح المالك — 2026-11-13):**

| المرحلة | Backend | ملاحظة |
|---|---|---|
| M5-E / M5-E-ب (§5 أعلاه) | 2958 + 2skip | نصٌّ تاريخي — **صُحِّح إلى 2959** |
| main قبل M6-bis (`bd15481`) | **2959 + 0xf + 2skip** | تصحيح المالك؛ أساس حساب M6-bis |
| main بعد M6-bis (`1d07b86`) | **2984 + 0xf + 2skip** | 2959 + 25 اختبارًا جديدًا (CI #182) |
| main اليوم | **2984 + 2skip** | CI #184/#185 |

> **تنبيه اتساق:** §5 يقول «2958». الرقم الصحيح في تلك الحقبة **2959**؛ فرق عدّ
> واحد فقط، لا أثر على أي استنتاج في هذه الوثيقة. أُبقي §5 كما هو (سجل تاريخي)
> وهذا القسم هو المرجع المُصحَّح.
