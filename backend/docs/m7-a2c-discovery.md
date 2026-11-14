# M7-A2c Discovery Report — 6-App Expansion Feasibility

**Date:** 2026-11-14
**Discovery run:** read-only audit of 6 apps (grep + Django ORM + psql)
**Reference:** A2b-full (surveillance, PR #196) — proof of concept
**Status:** READ-ONLY — 0 code, 0 migrations, 0 tests

---

## Executive Summary

| Result | Count |
|---|---|
| Apps with dev rows > 0 | 0 (all six = 0) |
| Apps with frontend routes > 0 | 5 (all except vector_control + borders_health) |
| Apps with both rows > 0 **and** routes > 0 | 0 |
| Apps in 🔴 (0 rows + 0 routes) | 2: vector_control, borders_health |
| Apps in 🟠 (0 rows + routes > 0) | 4: laboratory, hr, screening, vaccination |

**결론:** لا تطبيق من الستة يقضي على المعيار decisive (dev rows > 0 AND routes > 0).
**التوصية:** **skip A2c كاملاً** حتى Q7 يُظهر adoption signal حقيقي في prod.
"A2b-full (surveillance) = pilot. قياسه قبل التوسع." — 6 تطبيقات إضافية قبل Q7 = 40-50 يوماً لمن لا يستخدم.

---

## Q1 — FK Design (ما هو موجود)

| App | `health_facility` FK | `entry_point` FK | `locality` FK | `sector` FK |
|---|---|---|---|---|
| laboratory | ✅ `LabSample.facility` (M6-bis) | ✅ `LabSample.entry_point` | — | ✅ `LabSample.sector` (+3 other models) |
| vector_control | ✅ `VectorUnit.facility` (M6-bis) | ✅ `VectorSite.entry_point` (+3 more) | — | ✅ `VectorUnit.sector` (+2 more) |
| hr | — (OrgAssignment is in **organization** app) | ✅ `PostingRequest.target_entry_point` | — | ✅ `PostingRequest.target_sector` |
| borders_health | ✅ `CargoInspection.facility` (BorderFacility FK, not HealthFacility) | ✅ `BorderCrossing.entry_point` (OneToOne) | — | — |
| screening | ✅ `HealthScreening.facility` (M6-bis, D-M5-C-F-2) | ✅ `HealthScreening.port` | — | — |
| vaccination | — | ✅ `VaccinationSite.entry_point` | — | — |

### اكتشاف مهم (مغاير لتوقع الـ prompt)

1. **screening له `facility` FK من M6-bis** (`HealthScreening.facility` — help_text: D-M5-C-F-2) — عكس توقع "❌ غير قابل".
2. **organization.OrgAssignment له `facility` FK من M6-bis** (`help_text: D-M5-C-F-1`) — 앱 foundation، ليس hr كما وُضع في الجدول المبدئي.
3. **borders_health:** `CargoInspection.facility` يُشير إلى `BorderFacility` (ليس `masterdata.HealthFacility`) — مسار معقد.

---

## Q2 — Path Derivation (كيف نصل إلى ReportingNode)

| App | المسار المفضل | الجودة | ملاحظة |
|---|---|---|---|
| laboratory | **D** — `LabSample.facility → HealthFacilityNodeAssignment → node` | عالية | FK موجود من M6-bis؛ pattern مطابق تمامًا لـ surveillance |
| vector_control | **D** — `VectorUnit.facility → HealthFacilityNodeAssignment → node` | عالية | FK موجود من M6-bis؛ but dev rows = 0 |
| hr | **B-derivation** — `OrgAssignment.entry_point.state → ReportingNode(kind=STATE)` | متوسطة | OrgAssignment.facility موجود (M6-bis) → يمكن أن يكون D إذا أُريد LOCALITY/FACILITY |
| borders_health | **TBD** — `BorderCrossing.entry_point` (OneToOne) → state; `CargoInspection.facility` = BorderFacility (ليس HealthFacility) | منخفضة | نموذج معقد، OneToOne semantics، facility FK مختلف النوع |
| screening | **D** — `HealthScreening.facility → HealthFacilityNodeAssignment → node` | متوسطة | FK موجود من M6-bis؛ but dev rows = 0 |
| vaccination | **B** — `VaccinationSite.entry_point → STATE` فقط | منخفضة | site ≠ facility domain؛ لا يوجد facility FK |

---

## Q3 — Audit Tests Impact

| App | Audit tests affected | Rewrite count |
|---|---|---|
| laboratory | 0 | 0 |
| vector_control | 0 | 0 |
| hr | 0 | 0 |
| borders_health | 0 | 0 |
| screening | 0 | 0 |
| vaccination | 0 | 0 |
| **surveillance (baseline)** | 3 (already rewritten in PR #196) | **3** |

**دليل:** `grep -rn "not_referenced_by\|has_no_registry\|no_registry" apps/*/tests/` → صفر في الستة تطبيقات.
الـ audit file الوحيد `apps/registry/tests/test_m7_a2_integration_audit.py` يغطي **surveillance فقط** (تمت إعادة كتابته في Phase 3 من PR #196).
**إضافة `reporting_node` FK لأي من الستة تطبيقات لن تكسر أي اختبار موجود.**

---

## Q4 — Data & UI Usage (dev environment)

| App | API file (actual) | Dev rows | Imported by | Pages dirs | Routes | Verdict |
|---|---|---|---|---|---|---|
| laboratory | `laboratory.ts` | **0** | 21 | 1 | 3 | 🟠 UI w/o data |
| vector_control | `vectorControl.ts` | **0** | 14 | 0 | 0 | 🔴 **skip** |
| hr | `hr.ts` | **0** | 26 | 1 | 50 | 🟠 UI w/o data |
| borders_health | `bordersHealth.ts` | **0** | 3 | 0 | 0 | 🔴 **skip** |
| screening | `screening.ts` | **0** | 7 | 1 | 2 | 🟠 UI w/o data |
| vaccination | `vaccination.ts` | **0** | 11 | 1 | 15 | 🟠 UI w/o data |
| **surveillance** | `surveillance.ts` | **50** | 4 | 2 | 7 | ✅ **baseline (A2b-full)** |

**النتيجة الحاسمية:** صفر تطبيقات من الستة لديها dev rows > 0.
البيانات الوحيدة في dev: `surveillance_healthcase` = 50 سجل (fixture A2b-full).

---

## Q5 — Migration Risk

| App | Table | Dev rows | AddField lock | Rollback | Backfill target |
|---|---|---|---|---|---|
| laboratory | laboratory_labsample | 0 | fast (null) | safe (DROP COLUMN) | 0 rows |
| vector_control | vector_control_vectorunit | 0 | fast | safe | 0 rows |
| organization | organization_orgassignment | 0 | fast | safe | 0 rows |
| borders_health | borders_health_bordercrossing | 0 | fast | safe | 0 rows |
| screening | screening_healthscreening | 0 | fast | safe | 0 rows |
| vaccination | vaccination_vaccinationsite | 0 | fast | safe | 0 rows |
| surveillance | surveillance_healthcase | 50 | fast | safe | 50 rows |

**Note:** PostgreSQL 11+ — `ALTER TABLE ADD COLUMN NULL` = O(1)، لا table rewrite.
**الخلاصة:** المخاطر التقنية منخفضة لكل التطبيقات، لكن **لا توجد بيانات لل backfill** في أي تطبيق سوى surveillance. الـ risk الحقيقي هو "código بدون استخدام" (نفس مشكلة A2b-full قبل Q7).

---

## Q6 — Phase Plan

### Phase A2c-1 — Skip (لا تطبيقات تستوفي المعيار)

| App | Q4 verdict | 걸ف |
|---|---|---|
| laboratory | 🟠 UI w/o data | لا سجلات → لا采用 signal |
| vector_control | 🔴 skip | لا سجلات، لا Routes |
| screening | 🟠 UI w/o data | لا سجلات |
| vaccination | 🟠 UI w/o data | لا سجلات |

**قرار:** لا توجد تطبيقات في Phase A2c-1. المعيار الحاسم (dev rows > 0 AND routes > 0) غير محقق لأي تطبيق.

### Phase A2c-2 — Deferred (حاجة design + adoption signal)

| App |理由 |
|---|---|
| hr | OrgAssignment.facility موجود (M6-bis) لكن dev rows = 0؛ يحتاج product signal لـ HR hierarchical reports |
| borders_health | نموذج معقد (OneToOne crossing، facility = BorderFacility type مختلف) + dev rows = 0 |

**حاجة:** قرار منتج (MOH HR director؟ borders team؟) + Q7 adoption data.

### Phase A2c-3 — Skip (بلا redesign)

| App | السبب |
|---|---|
| screening | `facility` FK موجود من M6-bis لكن dev rows = 0؛ لا adoption signal |
| vaccination | لا facility FK؛ `site` ≠ facility domain؛ dev rows = 0 |

**خيارات:** Skip حالياً؛ أو redesign (إضافة facility FK) — 2-3 أسابيع + قرار منتج.

---

## Feasibility Matrix (الجدول الحاسم)

| App | FK path | Dev rows | Routes | Audit | Migration | Value | Phase |
|---|---|---|---|---|---|---|---|
| laboratory | D (facility) | 0 | 3 | N | low | medium | defer |
| vector_control | D (facility) | 0 | 0 | N | low | medium | skip |
| hr | B (entry_point) / D (facility via OrgAssignment) | 0 | 50 | N | medium | high | defer |
| borders_health | A/D (mixed, complex) | 0 | 0 | N | high | high | defer |
| screening | D (facility) | 0 | 2 | N | low | low | skip |
| vaccination | B (site) | 0 | 15 | N | low | low | skip |

---

## Adoption Measurement Gap (Q7-dependent)

جميع المقاييس التالية محجوبة بـ Q7 (لا VPS access من بيئة التطوير):

- Prod rows لكل تطبيق من الستة
- by-state endpoint usage (requests per week)
- Adoption signal لأي تطبيق غير surveillance

**ال결론:** A2c expansion قبل Q7 = بناء كود بدون دليل استخدام. نفس النمط الذي حللناه في ADR §Lessons ("Infrastructure without adoption signal is a bet").

---

## Recommendations

1. **Skip A2c بالكامل في هذه الدورة** — لا تطبيق يستوفي معيار التوسع (dev rows + routes).
2. **لا تبدأ A2c-1** — laboratory + vector_control لديهم FK مناسب (M6-bis) لكن لا بيانات → بناء بدون اعتماد.
3. **انتظر Q7** — بمجرد توفر VPS access، قيس prod adoption لـ surveillance A2b-full أولاً.
4. **إن أظهر surveillance Adoption إيجابية post-Q7:** أعيد discovery للستة تطبيقات مع بيانات prod حقيقية.
5. **إن لم يظهر surveillance Adoption:** A2c غير مبرر أصلاً (بغض النظر عن feasibility التقنية).

---

## Open Questions (للowner)

1. هل هناك طلب منتج على تقارير HR الهرمية؟ (مدير HR في MOH؟)
2. هل borders_health facility FKs موثوقة؟ (OneToOne crossing vs FK ambiguous)
3. هل يُفضل انتظار Q7 adoption signal قبل أي قرار A2c، أم البدء في design لـ hr + borders_health بشكل متوازي؟

---

## Next Step (pending owner decision)

- [ ] Approve **skip A2c until Q7** (التوصية)
- [ ] Or approve A2c-1 design for laboratory + vector_control despite 0 dev rows
- [ ] Or approve parallel design for hr + borders_health

**لا كود. لا migrations. لا اختبارات.** التقرير جاهز للمراجعة.
