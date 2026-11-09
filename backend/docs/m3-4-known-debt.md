# M3-4 Known Debt — DepartmentNodeAssignment

## D-M3-4-1: Department scoping عبر sectors غير مُختبَر كاملاً

**الوضع:** `RegistryScopedViewSet.get_queryset` لـ `DepartmentNodeAssignment` يستخدم منطق OR: facility أو sector. لم يُضف اختبار SECTOR user يرى department-level assignments لقطاعه فقط.

**الحل المقترح (M3-bis):** اختبار SECTOR مشابه لـ M3-3.

## D-M3-4-2: DepartmentReportNode validation غير مكتمل

**الوضع:** `clean()` يتحقق أن `node.kind == 'DEPARTMENT'`، لكنه لا يتحقق أن `node` ينتمي إلى نفس الفرع (`parent.path`) الذي يحتوي `department.facility`.

**الأثر:** يمكن تعيين Department إلى node في فرع مختلف عن فرع facility — تناقض منطقي.

**الحل المقترح (M4):** التحقق من تطابق `node.path` مع `department.facility.node.path`.

**قبول:** M3-4 يقبل. M4 يُغلق.
