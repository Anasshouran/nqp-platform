# M4-4-C Known Debt (Part1 → Part2)

## D-M4-4-C-5: Pagination envelope — frontend `unwrapList`

**الوضع (Part2):** list endpoints تُرجع `{ count, next, previous, results }`
(DRF `StandardPagination`, `PAGE_SIZE=10`). أُضيف `unwrapList` في
`api/endpoints/registry.ts` يستخرج `results` كقائمة، ويطلب `page_size=500`
لجلب صفوف المنشأة كاملة.

**الأثر:** إن تجاوزت صفوف منشأة واحدة 500، تُعرض أول 500 فقط.

**الحل المقترح (M5):** pagination حقيقي في tabs (أو server-side paging UI).

## D-M4-4-C-6: صفحة التفاصيل تعتمد على `facility_id` في المسار

**الوضع (Part2):** `/app/registry/facility/:id` صار `:id` = `HealthFacility.id`
(من `node.facility_id`). الروابط القديمة التي كانت تمرّر `ReportingNode.id`
لم تعد صالحة (dev فقط).

**بوابة الرؤية (أمان):** الصفحة لا تجلب بيانات المنشأة إلا بعد وجود
`HealthFacilityNodeAssignment` **مرئي ضمن نطاق المستخدم**
(`listFacilityAssignments({ facility })` مقيّد بالـ scoping). إن غاب التعيين
→ `not found` دون أي جلب من master-data. هذا يمنع تسريب منشأة خارج النطاق
لمستخدم `is_staff=True` لكن غير GLOBAL.

**الأثر:** لا روابط محفوظة بعد (الميزة جديدة). مقبول.

## D-M4-4-C-8: master-data يقيّد `IsAdmin` (is_staff) — ✅ CLOSED (Part3-A)

**الحل المنفذ (Part3-A):** أُضيف endpoint سجل مخصّص:

`GET /api/v1/registry/facility-summary/<uuid>/`

- scoped: GLOBAL (superuser/scope) → أي منشأة؛ مستخدم STATE/SECTOR → `200` فقط
  إذا كان هناك `HealthFacilityNodeAssignment` مرئي (valid_to NULL) ضمن نطاقه،
  وإلا `404`. plain user بدون scope → `404`.
- يعيد: `id, code, name_ar, name_en, kind, sector/locality/entry_point (id+name_ar), is_active`.
- لا يُوفّر list — `retrieve` فقط، بدون `IsAdmin`.

**Frontend:** `getFacilitySummary(id)` بدل `getMasterHealthFacility` في
`FacilityDetailPage.tsx` (د-M4-4-C-8)، يتبعها `OverviewTab` بالشكل المتداخل.

**التحقق:** 5 اختبارات في `apps/registry/tests/test_facility_summary.py`
(superuser 200، SECTOR 200 لنطاقه، SECTOR 404 لغير نطاقه، plain 404، UUID غير صالح 404).

## D-M4-4-C-7: Tree Position يعتمد على جلب كل العقد

**الوضع (Part2):** `TreePositionTab` يبني سلسلة الآباء من `listNodes()`
(`page_size=500`) + `node.parent`. لا endpoint مخصص للـ ancestors بعد.

**الحل المقترح (M5):** endpoint `nodes/:id/ancestors/` أو `path` مع أسماء.

## D-M4-4-C-1: لا `django-filter` — فلترة مخصصة

**الوضع:** استُخدم `_apply_exact_filters` مخصص بدل حزمة `django-filter`.

**التبرير:** لا تبعية جديدة، كود أقل، والفلاتر تُطبَّق بعد scoping مباشرةً.

**القيد:** كل filter endpoint يُضاف يدوياً في كل viewset (لا `filterset_fields`
declarative). عند زيادة عدد الفلاتر، أعد تقييم `django-filter` في M5.

## D-M4-4-C-2: `facility_id` resolution — N+1 query

**الوضع:** `tree()` يستعلم `healthfacilitynodeassignment_set` لكل عقدة FACILITY
عند بناء الاستجابة.

**الأثر:** شجرة 22 عقدة → استعلامات إضافية مساوية لعدد عقد FACILITY. مقبول الآن.

**الحل المقترح (M5):** `prefetch_related("healthfacilitynodeassignment_set")`
مع فلترة active في Python داخل `build`.

## D-M4-4-C-3: الفلاتر تُطبَّق بعد scoping (fail-safe)

**الوضع:** `filter_queryset` يستدعي `super().filter_queryset(qs)` على queryset
الـ scoped من `get_queryset()`، ثم يطبّق الفلاتر. لا يمكن لفلتر أن يوسّع الرؤية.

**الأثر:** STATE/SECTOR user يمرّر `?facility=<other_state>` → scoping يحجب
أولاً، فالفلتر يعمل على مجموعة فارغة/مقيّدة. لا تسريب.

**التأكيد المطلوب:** اختبار SECTOR/STATE صريح على كل فلتر
(مع `?facility=` خارج النطاق → نتيجة فارغة، لا بيانات). Part2 لم يُضِف
اختبارات backend (frontend-only)؛ يُغطّى هذا ضمن Manual V-1 (browser،
superuser + STATE + SECTOR) — انظر بروتوكول V-1 بعد Part2.

## D-M4-4-C-4: UUID غير صالح → قائمة فارغة

**الوضع:** `_apply_exact_filters` يتحقق من صحة UUID قبل الفلترة ويُرجع
`qs.none()` عند قيمة غير صالحة (بدل 500 عند التقييم).

**الأثر:** سلوك آمن لكنه لا يُرجع رسالة 400 توضيحية. مقبول (فلتر اختياري).

**الحل المقترح (اختياري):** 400 مع رسالة عند الحاجة في M5.

## D-M4-4-C-9: Test command baseline — registry + organization together

**الوضع:** حُكّمت الاختبارات حتى Part3-A/B بأوامر مختلفة: `apps/registry/`
فقط (221)، أو `apps/organization/tests/test_department_facility.py` فقط (4)
= 225 ظاهرياً.
**M4-4-C-Part3-A/B:** كشف أن organization كاملة تضم **147 اختباراً** ولم تكن
تُشغَّل.
**القاعدة الجديدة (إلزامية من الآن):**
```bash
pytest apps/registry/ apps/organization/ -q --reuse-db
```
**Baseline جديد: 373 passed.** أي commit لاحق يستهدف ≥ 385 (بعد Part3-C/D).
تشغيل `apps/registry/` فقط أو ملف واحد منها غير مقبول كـ gate.
