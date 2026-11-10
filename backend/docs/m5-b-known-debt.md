# M5-B Known Debt — دفتر ديون M5-B

> يُحدَّث مع كل sub-phase. كل D-M5-B-* يثبت أثره بالاختبار.

## D-M5-B-1: Sector-only models — STATE deny-all

**الوضع:** النماذج التالية **لا تملك** `entry_point` FK — لا مباشرة، لا عبر
سلسلة علاقية يمكن اشتقاق state منها. المستخدم STATE-only يرى **0 سجل**.

**النماذج المتأثرة (بعد M5-B-1):**

- `laboratory`: `LabEquipment`, `Reagent`, `ReagentLot`, `MaterialIssue`,
  `QCRecord`, `NonConformity`, `CapaRecord`, `CriticalResultNotification`.
- `vector_control`: `VectorUnit`.

**السبب الجذري:** `organization.Sector` **لا يملك** FK إلى `masterdata.State`
(نتيجة M0). أي اشتقاق state يجب أن يمر عبر `EntryPoint`. النماذج أعلاه لا تحمل
EntryPoint في هيكلها.

**قرار M5-B-1 (صريح):** هذه النماذج **تفشل بالحجب الآمن** (fail-safe) بدلاً من
التسرب عبر `Q()` بلا شروط — ليست "خطأ تنفيذي" بل نتيجة قرار معماري. أي توسيع
هنا يجب أن يمر بقرار منتج/مخطط (M6).

**الاختبار الموثِّق:**
`test_vector_control_h5.py::test_state_user_sees_own_state_vector_unit`
— يُعلَّم الآن `xfail(strict=True)`: لو نجح (STATE user يرى VectorUnit)
فهو bug (توسعة) يجب أن تفشل البذرة (suite).

**الحلول المقترحة (M6):**
- Option A — `Sector.state_ids` M2M (schema migration + backfill).
- Option B — `Sector.entry_point_hint` FK nullable (derivation مباشر).
- Option C — `state_ids` API على `SectorSerializer` + اشتقاق في الـ mixin.

**الأولوية:** 🟡 متوسطة — ليس widening، بل حجب كامل. يعتمد على قرار منتج.

---

## D-M5-B-2: `SectorFieldScopedMixin.state_path = None` افتراضياً

**الوضع:** أي viewset جديد يستخدم `SectorFieldScopedMixin` **بدون** ضبط
`state_path` → STATE deny-all (لا يرى records جديدة مرتبطة بولاية مستخدمها).

**السبب:** القرار معماري — STATE اختياري، ويُعلَّن صراحةً على كل viewset
`state_path` = مسار علائقي إلى `masterdata.State.id`.

**التخفيف الحالي:** هذا الملف + docstring الـ mixin (انظر `scoping.py`).

**الحل المقترح (M6):** structural test —
`test_all_sector_field_viewsets_declare_state_path_or_are_documented`
يفشل لو ظهر viewset جديد بلا `state_path` وبلا D-M5-B-* مرجعي.

**الأولوية:** 🟡 متوسطة — يمنع تكرار H5 صامتاً في viewset جديد لاحقاً.

---

## D-M5-B-3 (قادم): Screening STATE path — قيد نقطي فقط

**الوضع:** فحص `HealthScreening` لا يحمل `sector`؛ STATE يعمل فقط عبر
`port__state_id` (سلسلة عبر `masterdata.EntryPoint.state`). أي screening نُفذ
من مستخدم FIELD خارج نطاق STATE أو PORT لن يرى. (موثق مسبقاً في m5-a-known-debt.)
**ستُؤكَّد/تُحل في M5-B-2.**

## D-M5-B-4 (قادم): HR STATE derivation — يعتمد `OrgAssignment.entry_point`

**الوضع:** اشتقاق state لـ HR يمر عبر `OrgAssignment.entry_point` (nullable).
أي OrgAssignment بلا entry_point لا تُسهم في نطاق STATE — تُوثَّق كـ
"scope-expansion gap" وليست bug. (موثق مسبقاً في m5-a-known-debt.)
**ستُؤكَّد/تُحل في M5-B-3.**
