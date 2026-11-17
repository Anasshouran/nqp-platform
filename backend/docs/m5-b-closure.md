# M5-B Closure Certificate

**Branch:** `feat/organizational-registry-m5`
**Sub-phases:** M5-B-1, M5-B-2, M5-B-3, M5-B-4, M5-B-T
**Commits:** `4627af1` (M5-B-1) · `f31d605` (M5-B-2) · `f050536` (M5-B-3)
· `266cb90` (M5-B-4) · `[M5-B-T]` (this commit)

## Executive Summary

**Final baseline: 443 passed + 1 xfailed + 0 xpassed.**
(كان قبل M5-B: 420 passed + 5 xfailed — أي ‏+23 passed ونُزعت 4 xfail.)

**الحالة: M5-B مغلقة. جاهزة لـ M5-C (LOCALITY/FACILITY) أو M5-D (Vitest)، بعد إذن المالك.**

## Hypotheses Resolved

| Hypothesis | الحالة | القرار/المرجع |
|---|---|---|
| H1 (widening) | ✅ REFUTED (permanent guard) | M5-A-2 — pinned في `test_state_widening_h1.py` (كلها pass الآن) |
| H1′ (`user.sector_id` grant) | ✅ CONFIRMED — سياسة مُوثّقة | M5-B-4 — `m5-a-audit.md` §9 |
| H2 (`asserts_geographic_scope`) | ✅ FIXED | M5-A-3 (FIX-1) |
| H3 (screening STATE) | ✅ CLOSED | M5-B-2 — `_entry_point_ids_for()` يدمج STATE ∪ PORT ∪ SECTOR ∪ home-sector |
| H4 (HR STATE) | ✅ CLOSED | M5-B-3 — `SCOPE_LOOKUPS['STATE']` عبر `OrgAssignment.entry_point.state_id` |
| H5 (laboratory/vector STATE) | ✅ PARTIAL | M5-B-1 — `SectorFieldScopedMixin.state_path`؛ النماذج sector-only اتريّفت D-M5-B-1 |
| H6 (7 apps GREEN) | ✅ CONFIRMED — لم تُمَس | M5-A-2 |

## Remaining xfail

| الاختبار | السبب |
|---|---|
| `test_vector_control_h5.py::test_state_user_sees_own_state_vector_unit` | **D-M5-B-1** — `VectorUnit` نموذج sector-only بلا `entry_point` FK؛ الاشتقاق مستحيل بلا قرار مخطط/منتج (M6). `xfail(strict=True)` — لو نجح بالخطأ فالاختبار يُسقط البذرة. |

لا توجد أي xfail أخرى. باقي اختبارات الـ pinning (H1 REFUTED) **تمرّ خضراء** وليست xfail.

## Test Baseline Evolution

| المرحلة | passed | xfailed | xpassed |
|---|---|---|---|
| قبل M5-B | 420 | 5 | 0 |
| بعد M5-A / M5-B-1…4 | 433 | 1 | 1 |
| بعد M5-B-T-1 (إزالة H5 marker) | 434 | 1 | 0 |
| بعد M5-B-T-2/3 (+9 اختبارات جديدة) | **443** | **1** | **0** |

## Deliverables — M5-B-T

### جديد
| الملف | المضمون |
|---|---|
| `test_h3_deltas.py` | 5 اختبارات: Delta 1 (`user.sector_id` grant) · Delta 2 (`PORT ∪ SECTOR`) · لا تسرب cross-state · STATE ∪ home-sector · STATE-only sanity |
| `test_h1prime_consistency.py` | 4 اختبارات: H1′ عبر SectorFieldScopedMixin (laboratory) · screening · HR (Delta 4) · و cross-sector leak guard عبر الثلاثة |
| `m5-b-closure.md` | هذا التقرير |

### مُعدَّل
| الملف | التغيير |
|---|---|
| `test_state_widening_h1.py` | نُزع `xfail(strict=False)` القديم (الحصة H5، تحققت فمرّ xpass) → اختبار عادي أخضر. الـ docstring حدّث. |
| `m5-b-known-debt.md` | جدول Deltas: مراجع الاختبارات الجديدة + final status |

**صفر إنتاج code (production) — اختبارات + docs فقط، كما هو محدد في M5-B-T.**

## All Deltas (H1′-consistent)

انظر `m5-a-audit.md` §9 و `m5-b-known-debt.md` — Delta 1, 2 (screening), Delta 4 (HR)
كلها موثقة ومغطاة باختبارات الآن.

## Files Modified (M5-B total, كلها مُلتزم)

- `backend/core/utils/scoping.py` — M5-B-1 (`state_path` + STATE union)
- `backend/apps/laboratory/views.py` · `backend/apps/vector_control/views.py` — M5-B-1
- `backend/apps/screening/views.py` — M5-B-2 (Delta 1 + Delta 2)
- `backend/apps/hr/scoping.py` — M5-B-3 (`SCOPE_LOOKUPS['STATE']` + `resolve_own_org_scope_keys`)
- `backend/apps/registry/tests/test_m5_integration/*` — M5-A (guards) · M5-B (xfail removals + no_widening + widening) · M5-B-T (h3_deltas + h1prime_consistency + marker removal)
- `backend/docs/m5-a-audit.md` · `m5-b-known-debt.md` · `m5-b-completion.md` · `m5-b-closure.md`

## What's NOT in M5-B

- LOCALITY / FACILITY scopes — **M5-C**
- Vitest frontend integration — **M5-D**
- **D-M5-B-1** resolution (`Sector.state_ids` أو مكافئ) — **M6**
- `surveillance` · `vaccination` · `borders_health` — GREEN، بدون تعديل
- D-M5-B-2 structural test للـ viewsets الجديدة — مقترح لـ M6

## M5-B CLOSED ✅

جاهزة للانتقال إلى M5-C / M5-D بإذن المالك. لم يُدفع أي شيء بعد — `main` ما زال لم يُمس،
و PR-first قائم. لا تُفتح PR قبل اعتماد المالك.
