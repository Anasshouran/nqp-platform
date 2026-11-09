# M3-5 Known Debt — ServiceRegistry

## D-M3-5-1: SECTOR scoping لـ ServiceAvailability غير مختبر

**الوضع:** `get_queryset` لـ `ServiceAvailability` يفلتر عبر `facility` أو `department.facility`. لم يُضف اختبار SECTOR user يرى فقط availabilities ضمن قطاعه.

**الحل المقترح (M3-bis):** اختبار SECTOR.

## D-M3-5-2: ServiceAvailability.department بدون facility → scoping محدود

**الوضع:** `ServiceAvailability` على `Department` بدون `facility` (department-level) — SECTOR user لا يرى صفوف `department.facility=NULL` عبر `Q(department__facility_id__in=allowed['facilities'])` (لأن `facility_id` هو NULL).

**الحل المقترح (M3-bis):** إذا لزم رؤية department-level services، أضف `Q(department__sector_id__in=allowed['sectors'])`.

**قبول:** M3-5 يوثق. M3-bis يُغلق إن لزم.

## D-M3-5-3: لا ServiceNodeAssignment

**الوضع:** `Service` لا يُربط بشجرة `ReportingNode` (`kind=SERVICE` جاهز لكن غير مستخدم). Service في الشجرة يمكن اشتقاقه من `facility`/`department` assignment.

**الحل المقترح (M4):** إذا احتاج التقارير عرض services كعقد مستقلة، أضف `ServiceNodeAssignment` بنفس نمط DepartmentNodeAssignment.

**قبول:** M3-5 لا يُنشئ. M4 يقرر.
