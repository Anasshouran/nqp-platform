# M5-D-ب — Verification of 786 Pre-existing Tests

## Summary

M5-D revived 786 dormant frontend tests (98 files) by adding `vitest` to `devDependencies`. M5-D-ب verifies their quality, coverage, and CI reliability.

**Q1 (CI retroactive):** ✅ `Test Files 110 passed (110)` + `Tests 827 passed (827)` + `Duration 172.35s` — confirmed from run `43171692414` (job `131026258075`).

**Q2 (spot check 10):** 10/10 real (≥ 80%) — all have non-trivial `expect()` assertions; 7/10 also render + interact; 3 are pure-function unit tests (utils).

**Q3 (coverage 98 files):** 70.58% statements, 71.34% branches, **29.95% functions**, 70.58% lines. Coverage is moderate — tests exercise many paths but function coverage is low (typical for component tests that test render, not every handler).

**Decision: D-M4-3-1 → CLOSED with note.**

## Q1 — CI Retroactive Verification

```
gh run view 43171692414 --job 131026258075 --log | grep -E "Test Files|Tests  "
→ Test Files  110 passed (110)
→ Tests  827 passed (827)
→ Duration 172.35s (transform 14.28s, setup 40.24s, collect 112.33s, tests 211.57s, environment 112.99s, prepare 12.18s)
```

**Verdict:** CI verified — 827 passed, 0 failed, 0 skipped. PR #174 claim confirmed.

## Q2 — Spot Check 10 Files

| File | R1 | R2 | R3 | R4 | Class |
|---|---|---|---|---|---|
| `utils/escapeHtml.test.ts` | ✅ | n/a (pure) | ❌ | ✅ | real (unit) |
| `utils/sanitizeHtml.test.ts` | ✅ | n/a (pure) | ❌ | ✅ | real (unit) |
| `utils/maskIdentity.test.ts` | ✅ | n/a (pure) | ❌ | ✅ | real (unit) |
| `shipping/ClearanceList.test.tsx` | ✅ | ✅ | ✅ | ✅ | real |
| `shipping/VesselList.test.tsx` | ✅ | ✅ | ✅ | ✅ | real |
| `laboratory/NqlisReception.test.tsx` | ✅ | ✅ | ✅ | ✅ | real |
| `hr/EmployeeFormPage.test.tsx` | ✅ | ✅ | ✅ | ✅ | real |
| `public/CertificateVerifyPage.test.tsx` | ✅ | ✅ | ❌ | ✅ | real |
| `surveillance/SurveillanceModulePage.test.tsx` | ✅ | ✅ | ❌ | ✅ | real |
| `vaccination/VaccinationCertificatesPage.test.tsx` | ✅ | ✅ | ✅ | ✅ | real |

**Real tests:** 10/10 (≥ 80%) — **all have non-trivial `expect()` assertions; 0 skips, 0 `expect(true)` trivial.**

Note: 3 utils tests are pure-function unit tests (no `render`) — legitimate, not trivial.

## Q3 — Full Coverage of 98 Files

Config: `frontend/vitest.coverage-all.config.ts` (include `src/**/*.{ts,tsx}`, exclude tests).

| Metric | Value |
|---|---|
| Statements | 70.58% |
| Branches | 71.34% |
| Functions | **29.95%** |
| Lines | 70.58% |

**Interpretation:** Tests exercise many statement/branch paths (70%+) but cover only ~30% of functions — typical for component tests that exercise render + a few handlers, not every function. The 98 files provide **moderate** regression safety, not comprehensive coverage.

## Q4 — D-M4-3-1 Correction

- `backend/docs/m4-3-known-debt.md`: ✅ corrected (D-M4-3-1 → CLOSED with note)
- `backend/docs/m5-b-closure.md`: D-M4-3-1 not mentioned (no correction needed)

## Q5 — CI Guard

- `scripts/check-test-deps.sh`: ✅ created (3 checks: script exists, vitest in devDeps, vitest installed)
- `.github/workflows/ci.yml`: ✅ guard step added before `npm run test`
- Local test (positive + negative): ✅ pass

## Decision: D-M4-3-1 Status

**Final status: CLOSED with note.**

**Reasoning:**
- Q1: ✅ CI verified (827 passed, 0 failed)
- Q2: ✅ 10/10 real tests (≥ 80%)
- Q3: 29.95% function coverage (acceptable for component tests, not comprehensive)

**Follow-up:** M5-D-ج (low priority) — spot-check more of the 98 files, improve coverage of weak areas, consider Playwright e2e (M7).

## M5-D-ج Scope (deferred)

- Spot-check additional files from the 98 (beyond the 10 sampled)
- Coverage gaps: directories with < 30% function coverage
- CI guard: fail if `test` script lacks `vitest` devDep (done)
- e2e: Playwright (M7)

**Priority:** Low — M6-bis / M5-E take precedence.

---

## M5-D-ج-1 Closure (2026-11-13, PR #189, commit `302a65b`)

**Spot-check added:** 20 ملفًا إضافيًا (عيّنة حتمية مصنَّفة على 9 مجالات).

**النتائج:**

- **139** `it()` · **235** `expect()` · **0** `skip`/`todo` · **0** تأكيد تافه
- حقيقي: **20/20 = 100%**
- **تراكميًا مع §Q2:** **30/30 = 100%** (27% من 110 ملف اختبار)
- الثقة: **عالية**

**ملاحظات جودة (بلا إعادة كتابة، موثَّقة فقط):**

- `OwnershipTab.test.tsx` — حالة الفراغ تُؤكَّد على **مفتاح i18n** لا على النص
  المترجَم (`/registry\.facility\.ownership\.empty/i`) ⇒ يمرّ حتى لو فُقدت الترجمة.
  تجميلي، ليس صوريًا.
- بعض التأكيدات تستخدم `toBeTruthy()` بدل `toBeInTheDocument()` (مكافئ دلاليًا،
  لا إصلاح).

**دَين مُغلق:** «هل الـ 786 اختبارًا حقيقية؟» → **نعم، بثقة عالية.**
التفاصيل الكاملة: `backend/docs/m5-d-j1.md`.

## M5-D-ج-2 (Playwright e2e) — DEFERRED إلى M7+

**أسباب التأجيل:**

- **~300MB** ثنائيات Playwright (chromium).
- **+~4 دقائق CI لكل PR** (تشغيل) + زمن تنزيل أولي.
- **صيانة:** كل تغيير UI قد يكسر محدّدات e2e.
- **القيمة مُسلَّمة أصلًا:** 30/30 عيّنة وحدة + **845** اختبارًا محميًا في CI.

**متى يُعاد النظر:**

- M7+ عند إضافة تدفقات معقّدة جديدة (wizards متعددة الخطوات، تكاملات بين التطبيقات).
- أو عند طلب المالك تحقّقًا end-to-end فعليًا.

**النطاق إن نُفِّذ:**

- 4 تدفقات: رسم الشجرة · تبويبات تفاصيل المنشأة · منتقي STATE · تعديل عقدة.
- **chromium فقط** (لا firefox/webkit).
- `.github/workflows/e2e.yml` — على PR فقط (لا على كل push).
- تتابع (`workers=1`) لتجنّب تسابق قاعدة البيانات.

**التقدير:** 1–1.5 يوم + صيانة مستمرة.
