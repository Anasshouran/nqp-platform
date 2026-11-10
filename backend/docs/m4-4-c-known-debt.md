# M4-4-C Known Debt (Part1 — Backend filters)

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

**التأكيد المطلوب (Part2):** اختبار SECTOR/STATE صريح على كل فلتر
(مع `?facility=` خارج النطاق → نتيجة فارغة، لا بيانات).

## D-M4-4-C-4: UUID غير صالح → قائمة فارغة

**الوضع:** `_apply_exact_filters` يتحقق من صحة UUID قبل الفلترة ويُرجع
`qs.none()` عند قيمة غير صالحة (بدل 500 عند التقييم).

**الأثر:** سلوك آمن لكنه لا يُرجع رسالة 400 توضيحية. مقبول (فلتر اختياري).

**الحل المقترح (اختياري):** 400 مع رسالة عند الحاجة في M5.
