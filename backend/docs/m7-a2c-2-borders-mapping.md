# M7-A2c-2-borders Phase 0 — BorderFacility → HealthFacility Mapping Strategy

**Date:** 2026-11-15
**Discovery run:** read-only audit of borders_health
**Reference:** A2c-2-hr (PR #202) — hr delivered
**Status:** READ-ONLY — 0 code, 0 migrations, 0 tests

---

## Executive Summary

| Finding | Value |
|---|---|
| `BorderFacility` rows (dev) | 0 |
| `BorderCrossing` rows (dev) | 0 |
| `QuarantineCase` rows (dev) | 0 |
| `IsolationCase` rows (dev) | 0 |
| `HealthFacility` rows (dev) | 17 |
| `BorderFacility` ↔ `HealthFacility` matches by name | 0/0 |
| `BorderFacility.health_facility` FK exists | **NO** — not in model |
| `IsolationCase.facility` target | `BorderFacility` (not `HealthFacility`) |
| Existing data source (seed) | `seed_borders_health.py` — creates BorderFacility with fixed names, no HealthFacility link |
| CSV/Excel in repo | **None** |
| Docs reference for import | **None** |

**القرار الحاسم:** لا يوجد مصدر بيانات لربط `BorderFacility` بـ `HealthFacility`. بدون `BorderFacility.health_facility` FK → `IsolationCase.reporting_node` = 0 filled → **قيمة 0**.

**التوصية:** **Skip borders** (Option 3) حتى يوجد مصدر بيانات رسمي.

---

## Q1 — BorderFacility Inventory (dev)

| Model | Count |
|---|---|
| BorderFacility | 0 |
| BorderCrossing | 0 |
| QuarantineCase | 0 |
| IsolationCase | 0 |
| HealthFacility | 17 |

**BorderFacility fields:**
| Field | Type | Null |
|---|---|---|
| crossing | FK(BorderCrossing) | NO |
| kind | CharField (FacilityKind) | NO |
| name_ar | CharField(150) | NO |
| name_en | CharField(150) | YES |
| capacity | PositiveIntegerField | YES |
| staff_count | PositiveIntegerField | YES |
| is_operational | BooleanField | YES |

**لا يوجد `health_facility` FK على `BorderFacility`.** يجب إضافته في migration جديدة (إحدى 9-10 أيام من A2c-2-borders).

---

## Q2 — Match Analysis

| BorderFacility | HealthFacility matches by name |
|---|---|
| 0 (dev) | 0/0 |

**لا يوجد `BorderFacility` في dev للتطابق.** حتى في prod (Q7-blocked)، لا يوجد منطق ربط بين النموذجين.

---

## Q3 — Existing Data Source

| Source | Found? | Details |
|---|---|---|
| CSV/Excel in repo | ❌ No | `grep` for csv/excel/read_csv = empty |
| Seed command | ✅ Yes | `apps/borders_health/management/commands/seed_borders_health.py` |
| Seed creates BorderFacility | ✅ Yes | `STANDARD_FACILITIES` — 8 types per crossing (HEALTH, QUARANTINE, ISOLATION, LABORATORY, WATER_SANITATION, WASTE, VECTOR_CONTROL, STORAGE) |
| Seed links to HealthFacility | ❌ No | Creates BorderFacility with fixed names, no HealthFacility FK |
| Official source documented | ❌ No | No docs reference for BorderFacility → HealthFacility mapping |

**الخلاصة:** الـ seed ينشئ `BorderFacility` بأسماء ثابتة (مثل "مركز الفحص الصحي"، "وحدة الحجر")، لكنه لا يربطها بـ `HealthFacility`. لا يوجد مصدر بيانات خارجي للربط.

---

## Q4 — Model Verification

### IsolationCase.facility

```python
facility = models.ForeignKey(
    BorderFacility, on_delete=models.SET_NULL, null=True, blank=True,
    related_name='isolation_cases', verbose_name='مرفق العزل',
)
```

**`IsolationCase.facility` = FK(BorderFacility)** — NOT FK(HealthFacility).

### BorderFacility

| Field | Type | Target | Null |
|---|---|---|---|
| crossing | FK | BorderCrossing | NO |
| kind | CharField | FacilityKind | NO |
| name_ar | CharField | — | NO |
| name_en | CharField | — | YES |
| capacity | PositiveIntegerField | — | YES |
| staff_count | PositiveIntegerField | — | YES |
| is_operational | BooleanField | — | YES |

**لا يوجد `health_facility` FK على `BorderFacility`.** يجب إضافته:
```python
health_facility = models.ForeignKey(
    'masterdata.HealthFacility',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='border_facilities',
    verbose_name='المنشأة الصحية المرتبطة',
)
```

---

## Q5 — Mapping Strategy Decision

| Strategy | Indicator (Q1-Q4) | Estimated Cost | Value |
|---|---|---|---|
| **Name matching** | 0 BorderFacility in dev → 0 match | 1-2 ساعات | 🟡 منخفضة |
| **Code matching** | BorderFacility لا tiene `code` field | N/A | ❌ غير ممكن |
| **Manual admin UI** | 0 rows → كل واحد يدوي | 2-3 أيام | 🟡 متوسطة |
| **CSV import** | لا يوجد CSV في repo | 3-5 أيام | 🟡 متوسطة (يحتاج ملف خارجي) |
| **Skip borders** | لا مصدر بيانات | 0 | ✅ القرار الموصى به |

### recommended decision: **Skip borders (Option 3)**

**السبب:** لا يوجد `BorderFacility.health_facility` FK، ولا يوجد مصدر بيانات لملئه. بدون هذا الربط:
- `IsolationCase.reporting_node` (via `facility.health_facility → assignment → node`) = 0 filled
- تقارير `by-state` للحدود = جميعها `unassigned_node` = 0 value
- 9-10 أيام تطوير = كود بدون مستخدم

---

## Phase Plan (مُعدّل)

| Phase | App | Model | Decision | Cost | Value |
|---|---|---|---|---|---|
| A2c-2-hr | `OrgAssignment` | `reporting_node` FK | ✅ Done (PR #202) | 4 أيام | ✅ كاملة |
| A2c-2-borders | `BorderCrossing`/`QuarantineCase` | STATE-only via `entry_point` | ⏸️ يمكن مع STATE-only | 4 أيام | 🟡 STATE فقط |
| A2c-2-borders | `IsolationCase` | `reporting_node` via `facility.health_facility` | ❌ Skip (لا health_facility FK) | 9-10 أيام | ❌ 0 بدون مصدر |
| **A2c-2-borders total** | | | **Skip** | **0** | **0** |

## Recommendation

**Skip borders_health for A2c-2.**

**أسباب:**
1. لا نموذج في borders_health لديه `HealthFacility` FK — لا يمكن derivation إلى `ReportingNode` tree
2. `IsolationCase.facility` = FK(BorderFacility)، و`BorderFacility` لا tiene `health_facility` FK
3. لا يوجد مصدر بيانات (CSV/seed/كود) لربط `BorderFacility` بـ `HealthFacility`
4. 0 صفوف في dev → backfill = 0، اختبار = fixtures فقط
5. 9-10 أيام تطوير = كود بدون مستخدم حتى Q7 + مصدر بيانات خارجي

**خيار بديل (إذا قرر المنتج):**
- إضافة `BorderFacility.health_facility` FK + backfill手动 عبر admin UI
- ثم `IsolationCase.reporting_node` via `facility.health_facility → node`
- التكلفة: 9-10 أيام + جهد يدوي لملء `health_facility` لكل BorderFacility في prod

---

## Open Questions for Owner

1. **هل يوجد ملف رسمي من وزارة الصحة (CSV/Excel) لربط `BorderFacility` بـ `HealthFacility`?** — إن وجد، يمكن إعادة التقييم لـ Option 4.
2. **هل نقبل backfill جزئي عبر admin UI (يدوي لكل BorderFacility في prod)?** — إن نعم، Option 4 يستحق 9-10 أيام.
3. **هل نتوقف borders تمامًا حتى Q7 + مصدر بيانات خارجي؟** — **التوصية: نعم.**

---

## Next Step (pending owner decision)

- [ ] Approve **skip borders** (Option 3) — A2c-2 = hr فقط، مغلق
- [ ] Or approve **Option 4** (9-10 أيام) — يحتاج مصدر بيانات أولًا
- [ ] Or approve **hybrid** (12-14 أيام) — يحتاج مصدر بيانات جزئي أولًا

**لا كود. لا migrations. لا اختبارات.** التقرير جاهز للمراجعة. قرار borders مطلوب قبل أي التزام بـ 9-10 أيام.

---

## Related

- A2c-1: `m7-a2c-1.md` (PR #201) — laboratory + vector_control
- A2c-2-hr: `m7-a2c-2-hr.md` (PR #202) — hr OrgAssignment
- A2c Discovery: `m7-a2c-discovery.md` (PR #198) — 6-app audit
- ADR: `docs/registry-architectural-decision.md`
