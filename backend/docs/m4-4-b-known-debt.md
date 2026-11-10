# M4-4-B Known Debt — Facility Detail Page

## D-M4-4-B-1: Client-side filter (not backend) — ✅ CLOSED (M4-4-C-Part1)

**الوضع الأصلي:** `listFacilityOwnerships(facilityId)` يجلب كل ownerships ويفلتر في client.

**الحل المُنفَّذ:** `_apply_exact_filters` في `RegistryScopedViewSet` subclasses.
كل viewsets تدعم الآن `?facility=` / `?service=` / `?state=` / `?node=` / `?department=`
(بدون تبعية `django-filter` — انظر D-M4-4-C-1).

Frontend يستخدم `?facility=` مباشرة (M4-4-C-Part2).

## D-M4-4-B-2: Navigation from tree requires 2 requests — ✅ CLOSED (M4-4-C-Part1)

**الحل المُنفَّذ:** `/dashboard/tree/` يُرجع الآن `facility_id` (nullable) لكل عقدة FACILITY.
الواجهة تستطيع الانتقال مباشرة إلى `/app/registry/facility/<facility_id>` دون lookup ثانٍ
(تحديث `ReportingNodeTree` type في Part2).

## D-M4-4-B-3: Tree Position tab — read-only path display

**الوضع:** يعرض ancestors كـ breadcrumb. لا navigation between them.

**الحل المقترح (M5):** clickable breadcrumb.

## D-M4-4-B-4: Departments tab يعرض كل departments في النطاق (BUG) — ✅ CLOSED (M4-4-C-Part1)

**الوضع الأصلي:** عند فتح facility A، Departments tab يعرض كل departments في نطاق المستخدم.

**الحل المُنفَّذ:** `DepartmentNodeAssignmentViewSet.filter_queryset` يدعم
`?department__facility=` (و `?facility=` كاختصار). scoping يبقى أولاً ثم الفلترة.

**اختبار:** `test_department_assignment_filter_by_department_facility` +
`test_department_assignment_facility_alias`.

**المتبقّي (Part2):** تمرير `?department__facility=<facilityId>` من الـ frontend.
