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
