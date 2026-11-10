# M4-1 Known Debt — ScopeType.STATE

## D-M4-1-1: STATE with no EntryPoints = empty view

**الوضع:** ولاية بلا `EntryPoint` (مثل الخرطوم في dev) → `resolve_authorized_entry_points` يعيد `[]`. User يرى صفراً.

**التبرير:** سلوك مقصود (fail-safe). لا يمكن لـ STATE scope أن يعيد منشآت غير موجودة.

**الحل المقترح (M4-2):** بعد إضافة `ServiceNodeAssignment`، استخدم `StateNodeAssignment` كمسار بديل للوصول (state → node → descendants) لا يعتمد على EntryPoints.

**قبول:** M4-1 fail-safe، M4-2 يفتح مسار بديل.

## D-M4-1-2: Warning على scope_types غير معروفة — logs فقط

**الوضع:** `resolve_authorized_entry_points` يُطلق `logging.warning` عند `scope_type` غير معروف. لا `raise`.

**التبرير:** `COMPANY` (مثلاً) قد يكون مقصوداً بدون ترجمة إلى entry_points. الكود القديم كان يتجاهلها بصمت — الآن مع warning.

**الحل المقترح (M5):** تحليل كل `ScopeType` غير معالج — هل يجب أن يترجم إلى شيء، أم يُرفض في serializer؟

**قبول:** M4-1 يحسّن التشخيص، لا يغيّر السلوك.

## D-M4-1-3: STATE + DEPARTMENT معاً — غير مُختبَر

**الوضع:** اختبار STATE + SECTOR مدمج موجود. STATE + DEPARTMENT لم يُختبر. نظرياً union — لكن قد يحوي edge cases.

**الحل المقترح (M4-2):** اختبار إضافي.

## D-M4-1-4: Bug صامت في ReportingNode/HealthFacilityNodeAssignment scoping — M3-1 إلى M4-1

**الوضع:** `RegistryScopedViewSet.get_queryset` استخدم أسماء خاطئة منذ M3-1:

| الحالة | الخطأ | الصواب | الأثر |
|---|---|---|---|
| `ReportingNode` | `statenodeassignment` | `statenodeassignment_set` | `FieldError` → 500 |
| `ReportingNode` | `localitynodeassignment` | `localitynodeassignment_set` | `FieldError` → 500 |
| `ReportingNode` | `healthfacilitynodeassignment__health_facility_id` | `..._set__facility_id` | `FieldError` → 500 |
| `HealthFacilityNodeAssignment` | `health_facility_id__in` | `facility_id__in` | `FieldError` → 500 |

بالإضافة إلى `from django.db.models import Q` مكرر داخل فرع `ServiceAvailability`،
مما سبّب `UnboundLocalError: Q` في فرع `ReportingNode`.

**الأثر:** أي مستخدم SECTOR (أو أي scope غير GLOBAL) يستعلم
`/api/v1/registry/nodes/` أو `/api/v1/registry/facilities/assignments/`
كان يحصل على 500 — أي شاشة الهيكل التنظيمي معطّلة كلياً لمن هم ليسوا GLOBAL.

**السبب الجذري:** فجوة منهجية في الاختبار — M3-1 غطّت `ministries` فقط،
و M3-6 غطّت 4 endpoints (بدون `nodes` ولا `facilities/assignments`).
لا أحد اختبر "كل endpoint" بـ SECTOR.

**الحل (M4-1 + M4-1-bis):** صُحِّحت الأسماء، حُذف import `Q` المكرر، وأُضيف
`test_m4_1_bis_endpoints.py` الذي يغطّي **كل** list endpoint مسجّل في الراوتر،
مع اختبار بنيوي (`test_every_registered_list_endpoint_is_covered`) يفشل تلقائياً
إذا أُضيف ViewSet جديد بلا اختبار scoping.

**الدرس:** لا عيّنة. كل `RegistryScopedViewSet` يُختبر مع SECTOR + STATE + GLOBAL.

## D-M4-1-5: ReportingNode لم يكن يغطّي عقد الإدارات (M3-4 gap)

**الوضع:** `DepartmentNodeAssignment` أُضيف في M3-4، لكن فرع `ReportingNode`
في `get_queryset` لم يُوسَّع ليشمله. النتيجة: SECTOR user لا يرى
`ReportingNode(kind=DEPARTMENT)` الخاصة بإدارات قطاعه (فراغ وظيفي، لا تسريب).

**الحل (M4-1-bis):** أُضيف شرطان إلى `ReportingNode`:
`department_assignments__department__facility_id__in=facility_ids` أو
`department_assignments__department__facility__isnull=True` مع
`department__sector_id__in=org_sector_ids`. كما رُفع حساب `org_sector_ids`
إلى أعلى `get_queryset` وأُعيد استخدامه (كان يُحسب داخل فرع واحد فقط).

**ملاحظة:** هذا يثبت أن D-M4-1-4 لم يكن حادثة معزولة — بل نمط: كل نموذج جديد
يُضاف إلى `get_queryset` دون اختبار يترك فراغاً صامتاً.

**متبقٍ (M4-2/M5):** `RegistryChangeLog` لا يزال غير مُقيَّد بالنطاق
(يرجع كل السجلات لأي حامل `registry:view`) — انظر D-M3-1b. لم يُعالج هنا
لأنه polymorphic ويحتاج قراراً معمارياً.

## D-M4-1-6: الواجهة لا تعرف ScopeType.STATE بعد

**الوضع:** `frontend/src/types/user.ts` يعرّف
`ScopeType = 'GLOBAL' | 'POINT' | 'PORT' | 'REGION' | 'SECTOR' | 'DEPARTMENT' | 'STATION'`
— لا `STATE` (ولا `COMPANY`). الـ backend يقبل `STATE` الآن، لكن نموذج تعيين
الأدوار في الواجهة لا يعرضه ولا يملك منتقي ولاية (state picker).

**التبرير:** الإضافة إلى النوع وحده بلا منتقي ولاية تُنتج خياراً معطوباً في
النموذج (المستخدم يختار STATE ولا يستطيع اختيار الولاية). لذلك أُجِّل عمداً.

**الحل المقترح (M4-3):** إضافة `STATE` إلى النوع + منتقي ولاية
(`/api/v1/masterdata/states/`) داخل `RoleAssignmentFormDialog` و
`UserAssignmentsDialog`، مع ترجمة عربية للنطاق.

**قبول:** M4-1 backend-only، الواجهة تُغلق في M4-3.

## D-M4-1-7: `has_state_scope` و `get_user_state_ids` — dead code (تصحيح تقرير M4-1)

**الوضع:** كلتا الدالتين مُعرَّفتان في `core/utils/scoping.py` لكن **لا يستدعيهما
أي كود**: `grep -rn "get_user_state_ids\|has_state_scope" backend/` لا يعيد أي
استدعاء. السبب: `RegistryScopedViewSet.get_queryset` لا يملك دالة
`_allowed_entity_ids_for_user` أصلاً — بل يشتق `state_ids` محلياً من
`EntryPoint.state`. لذلك:

- ولاية STATE المستخدم تُشتق **فقط** من نقاط الدخول (وهذا يعمل — مُختبَر).
- `get_user_state_ids` لم تُوصَّل كما طلب الـ prompt (البند M4-1-E/§5.2).

**تصحيح للتقرير السابق:** ادّعى تقرير M4-1 أن
«`_allowed_entity_ids_for_user` يُملأ `states` من `get_user_state_ids`».
هذا **غير صحيح** — الدالة المذكورة غير موجودة في `views.py`، والدالتان غير
مستدعتين. الادعاء ورد أيضاً في رسالة commit `e8555a7`. لم أُعدّل الـ commit
(amend) لأن المراجعة تشير إليه بالـ hash؛ التصحيح هنا وهذا الـ commit هو المرجع.

**الأثر العملي:** لا تسريب ولا كسر — فقط Helpers ميتة، وسلوك STATE يعمل عبر
مسار EntryPoints (مُغطّى بـ 13 اختباراً).

**الخياران (يُقرَّران في M4-2، لا هنا):**
- **أ)** توصيلهما فعلياً: نقل الخروج المبكر `if not entry_point_ids: qs.none()`
  ليعالج حالة STATE (ولايات بلا نقاط دخول ترى وزاراتها) — يفتح فعلياً
  D-M4-1-1 جزئياً. يحتاج مراجعة أمنية سطراً بسطر لأنه يغيّر fail-safe الحالي.
- **ب)** حذفهما حتى الحاجة (أنظف، لكن يخسر واجهة برمجية قد تفيد M4-2).

**التوصية:** (أ) في M4-2 لأنه يحل D-M4-1-1، لكن **بمراجعة صريحة** لا بالتخمين.

**قبول:** M4-1-bis لا يغيّر سلوك الطبقة الأمنية؛ يوثّق فقط.
