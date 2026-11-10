# M4-4-B Known Debt — Facility Detail Page

## D-M4-4-B-1: Client-side filter (not backend)

**الوضع:** `listFacilityOwnerships(facilityId)` يجلب كل ownerships ويفلتر في client (لأن backend viewsets لا تدعم `?facility=`).

**الأثر:** مع <100 صفوف، مقبول. مع >1000، بطيء.

**الحل المقترح (M4-4-C أو M5):** إضافة `filter_backends = [DjangoFilterBackend]` + `filterset_fields = ['facility']` لكل viewset.

## D-M4-4-B-2: Navigation from tree requires 2 requests

**الوضع:** `ReportingNode` serializer لا يحوي `facility_id`. عند النقر على node، نجلب `HealthFacilityNodeAssignment` ثم `HealthFacility`.

**الحل المقترح (M4-4-C):** إضافة `facility_id` (nullable) إلى `ReportingNodeTreeSerializer` (backend).

## D-M4-4-B-3: Tree Position tab — read-only path display

**الوضع:** يعرض ancestors كـ breadcrumb. لا navigation between them.

**الحل المقترح (M5):** clickable breadcrumb.

## D-M4-4-B-4: Departments tab يعرض كل departments في النطاق (BUG)

**الوضع:** عند فتح facility A، Departments tab يعرض كل departments في نطاق المستخدم (ليس فقط أقسام A).

**التأثير:** يُضلّل المستخدم — يظن أن هذه أقسام A.

**السبب:** `DepartmentNodeAssignment` ViewSet لا يدعم `?department__facility=` filter. Frontend لا يستطيع الفلترة لأن `DepartmentNodeAssignment` serializer لا يحوي `department.facility`.

**الإصلاح (M4-4-C):**
1. Backend: إضافة `filter_backends` + `filterset_fields = {'department__facility': ['exact']}` إلى `DepartmentNodeAssignmentViewSet`.
2. Frontend: تمرير `?department__facility=<facilityId>`.
3. اختبار SECTOR/STATE على الفلترة.

**الأولوية:** 🔴 قبل أي إضافات أخرى في M4-4-C.
