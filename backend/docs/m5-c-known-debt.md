# M5-C Known Debt — دفتر ديون M5-C

> يُحدَّث مع كل sub-phase. كل بند هنا **موثَّق ومقصود** (fail-closed أو قرار
> سياسة)، وليس خطأً مفتوحاً. M5-C = STATE (C-0) + LOCALITY (C-L) + FACILITY (C-F).

**القاعدة الحاكمة:** كل بند يبقى **deny-all** حتى يُحسم في M6 أو بقرار مالك.
لا بند هنا يفتح بيانات بالخطأ؛ الاتجاه الوحيد المسموح هو الحجب.

---

## D-M5-C-F-4: FACILITY مُتجاهَل على port_health/shipping (مستخدم هجين)

**الوضع:** مستخدم بـ **FACILITY + COMPANY** على `port_health`/`shipping`:

- `asserts_geographic_scope` لا يحتوي FACILITY (D-F-3 fail-closed).
- بُعد COMPANY يعمل.
- **النتيجة:** يرى الموانئ المرتبطة بـ COMPANY فقط، وFACILITY مُتجاهَل.

**التقييم:** سلوك صحيح (fail-safe) — نطاق الميناء ≠ نطاق المنشأة:

| الجانب | التقييم |
|---|---|
| الأمان | ✅ لا widening — FACILITY لا يفتح ports |
| المنطق | ✅ port_health/shipping domain = ports/companies، لا facilities |
| الاتساق | ✅ مطابق لـ D-F-3 (deny-all) |
| الشفافية | ⚠️ المستخدم يرى COMPANY فقط، لا FACILITY — يحتاج UX note |

**الأثر:** UX note — إذا أراد المستخدم ports، يحتاج COMPANY/PORT role صريحاً.

**القرار:** توثيق، لا إصلاح. **التصنيف:** دَين توثيق UX — **ليس** دَين أمان.

**M6 المحتمل:** فتح `FACILITY → port` derivation (عبر `HealthFacility.entry_point`)
إذا أثبت المنتج الحاجة. يتطلب حينها تعديل `asserts_geographic_scope` + اختبارات
اتساق جديدة.

**التوثيق المرافق:** `m5-c-f.md §2.1`.

---

## D-M5-C-F-1: HR / FACILITY — deny-all (→ M6)

**الوضع:** `OrgAssignment` لا يملك FK إلى منشأة، لذا لا يوجد جسر
FACILITY → موظفين. `SCOPE_LOOKUPS` بلا مفتاح FACILITY ⇒ HR deny-all لمستخدم
FACILITY مهما كان دوره.

**الخطر:** حجب كامل (لا تسريب). المستخدم يرى 0 موظفين.

**الحل (M6):** إضافة `OrgAssignment.facility` FK (schema migration + backfill) أو
قرار بديل (الاعتماد على `entry_point` فقط مع وسم صريح).

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_hr_deny_all`.

---

## D-M5-C-F-2: screening / FACILITY — deny-all (→ M6)

**الوضع:** `_entry_point_ids_for` تفرّع على STATE/LOCALITY فقط. دلالة الفحص
مرتبطة بالمنفذ (port) وليس بالمنشأة، لذا لا يوجد تحويل مشروع
FACILITY → فحوصات.

**الخطر:** حجب كامل. الفحوصات المنفَّذة في منفذ المنشأة غير مرئية لمستخدم FACILITY.

**الحل (M6):** `HealthScreening.facility` FK (مخطط) أو قرار سياسة يحدد
كيف تُنسب الفحوصات إلى المنشأة.

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_screening_deny_all`.

---

## D-M5-C-F-3: laboratory + vector_control / FACILITY — deny-all (→ M6)

**الوضع:** النماذج لا تحمل حقل منشأة، و`SectorFieldScopedMixin` لا يملك
`facility_path` (قرار المرحلة: لا حقل جديد بلا viewset يستهلكه). `VectorUnit`
sector-only (D-M5-B-1 قائم).

**الخطر:** حجب كامل. عينات المختبر في منفذ المنشأة غير مرئية لمستخدم FACILITY.

**الحل (M6):** حقول منشأة على النماذج ذات الصلة + `facility_path` على المزيج،
بعد مراجعة أثر D-M5-B-1.

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_laboratory_deny_all`.

---

## D-M5-C-ACT-1: تفعيل الإنتاج معلَّق على COUNT

**الوضع:** `PROD_SCOPING_ENABLED=False` افتراضياً. LOCALITY وFACILITY
**fail-closed** في الإنتاج حتى التفعيل.

**الشرط المطلوب قبل التفعيل:**

| المؤشر | الحد الأدنى | الحالة في dev |
|---|---|---|
| `EntryPoint.locality` coverage | ≥ 80% | — (يُقاس على staging/prod) |
| `HealthFacility.entry_point` coverage | يُحدَّد بقرار مالك | **0/12** |

**الأثر:** لا تسريب إنتاجي؛ لكن مستخدمي LOCALITY/FACILITY لن يروا شيئاً قبل
التفعيل — وهو سلوك آمن مقصود.

**القرار:** بيد المالك بعد أرقام staging/prod.

---

## D-M5-C-L-FE-1: واجهة المحليات الأساسية فقط (اختياري)

**الوضع:** M5-C-L أضاف منتقي محلية في `RoleAssignmentFormDialog`؛ لا فلاتر
أو شجرة اختيار متقدمة.

**الخطر:** لا شيء أمنياً — UX فقط.

**الحل:** `M5-C-L-frontend` إن طلبه المنتج.

---

## ملخّص التصنيف

| البند | النوع | الحالة |
|---|---|---|
| `D-M5-C-F-4` | توثيق UX (لا أمان) | مسجَّل — لا إصلاح |
| `D-M5-C-F-1` | حجب كامل (HR) | M6 |
| `D-M5-C-F-2` | حجب كامل (screening) | M6 |
| `D-M5-C-F-3` | حجب كامل (lab/vector) | M6 |
| `D-M5-C-ACT-1` | تفعيل إنتاج | بانتظار COUNT |
| `D-M5-C-L-FE-1` | UX اختياري | عند الطلب |
| `D-M5-B-1` | حجب كامل (VectorUnit) | M6 (قائم من M5-B) |

**لا دَين أمني مفتوح في M5-C.** كل البنود إما حجب مقصود أو توثيق.
