# M4-2 Known Debt

## D-M4-2-1: STATE path لا يفلتر عبر EntryPoints

**الوضع:** STATE user يرى كل descendants من عقدة ولايته — حتى لو كان بعضها لولاية أخرى في البيانات (خطأ في البيانات، لا في الكود).

**الحل المقترح (M5):** validation في `StateNodeAssignment.clean()` — التحقق أن `node` هو kind=STATE، وأنه root subtree فعلي (لا children من states أخرى).

**قبول:** M4-2 يفترض صحة البيانات. M5 يُغلق.

## D-M4-2-2: `path__startswith` مع عدد كبير من state nodes

**الوضع:** union N Q(path__startswith) حيث N = عدد StateNodeAssignments للمستخدم.

**الأثر:** أداء جيد حتى ~50 StateNodeAssignments (Postgres OR optimization). أكثر من ذلك قد يحتاج `Any` أو regex.

**الحل المقترح (M5 أو لاحقاً):** optimize if N > threshold.

## D-M4-2-3: ServiceNodeAssignment — لا علاقة بـ ServiceAvailability

**الوضع:** `ServiceNodeAssignment` (M4-2) و`ServiceAvailability` (M3-5) مستقلان:
- `ServiceNodeAssignment`: موقع الخدمة في الشجرة (للتقارير).
- `ServiceAvailability`: أين تُقدَّم الخدمة (للتشغيل).

**العلاقة المفقودة:** ليس هناك ربط تلقائي بين «الخدمة معرّفة تحت عقدة SERVICE» و«الخدمة متاحة في منشأة».

**الحل المقترح (M5):** عند إنشاء `ServiceAvailability` لمنشأة، قد نرغب في ربطها تلقائياً بـ `ServiceNodeAssignment` للخدمة تحت عقدة المنشأة. **ليس ضرورياً لـ M4-2.**

## D-M4-2-4: ServiceNodeAssignment — رؤية descendants (توسيع محدود)

**الوضع:** `ServiceNodeAssignment` (ورقة) مرئي only if عقدته مرئية. بما أن عقدة SERVICE هي leaf تحت عقدة منشأة/ولاية، أُضيفت في M4-2 رؤية التعيينات الواقعة تحت **شجرة** العقد المرئية (`node__path__startswith`).

**الأثر:** توسيع محدود (لـ ServiceNodeAssignment فقط، لا لـ ReportingNode listing). SECTOR user يرى تعيينات الخدمة تحت subtrees قطاعه.

**الحل (M5):** توحيد منطق "descendants" في helper مشترك بدلاً من inline loop.

## D-M4-2-5: valid_to semantics — فقط NULL تُعدّ نشطة

**الوضع:** M4-2 أضاف `valid_to__isnull=True` لفروع التطابق المباشر (كانت historical assignments يمنحون رؤية دائمة — bug صامت). التعيينات بـ `valid_to` في المستقبل (تنتهي لاحقاً) تُعدّ غير نشطة الآن.

**الحل (M5):** استخدم `valid_to__isnull=True OR valid_to__gte=today` ل semantics "active window". متسق مع `_active_assignments`.

## D-M4-2-6: Permission codes — `service_node_assignment:*` غير مُضافة

**الوضع:** ViewSet يستخدم `permission_resource="registry"` (متسق مع كل ViewSets الأخرى). الـ constants `service_node_assignment:view/add/edit` المذكورة في DoD **لم تُضاف** لأنها ستكون dead code (كـ DEPARTMENT_ASSIGNMENT_* — لا تُستخدم anywhere). إضافة unused constants تكرر D-M4-1-7.

**الحل (إن احتجنا RBAC أدق لاحقاً):** إضافة constants + migration/seed + تغيير permission_resource. ليس ضرورياً لـ M4-2.

## D-M4-2-7: Frontend STATE — type only, no picker

**الوضع:** `'STATE'` أُضيف إلى `ScopeType` type but NOT to `SCOPE_TYPES` array (which drives the role-assignment dropdown). الأسباب: لا state picker (state selector) في `RoleAssignmentFormDialog`/`UserAssignmentsDialog` — إظهار STATE في dropdown بدون منتقي ولاية يُنتج خياراً معطوباً.

**الحل (M4-3):** state picker + إضافة `'STATE'` إلى `SCOPE_TYPES`.

## D-M4-2-8: D-M4-1-1 — مغلقة جزئياً

**الوضع:** STATE user يرى الآن:
- ✅ nodes (عبر path) — حتى بلا EntryPoints
- ✅ ministries (state_ids union)
- ✅ StateNodeAssignment (state_ids union)
- ✅ ServiceNodeAssignment (path descendants)

لكن:
- ❌ FacilityOwnership / TechnicalSupervision / ServiceAvailability لا تزال تعتمد على EntryPoints → STATE user بلا EntryPoints يرى صفراً.

**الحل (M4-3 أو M5):** توسيع `_allowed_entity_ids_for_user` (أو get_queryset) لاشتقاق facility_ids من StateNodeAssignment path (nodes → HealthFacilityNodeAssignment). needs careful security review.
