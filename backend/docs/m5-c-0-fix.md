# M5-C-0 Fix — `_validate_scope_id` accepts STATE

## المشكلة

`_validate_scope_id` في `accounts/serializers.py` (سطر ~250) لم تتضمّن `'STATE'`
في خريطة الـ mapping منذ إطلاق M4-1. أي `POST /api/v1/auth/role-assignments/`
بـ `scope_type='STATE'` كان يرجع **400** «نوع النطاق STATE غير معروف».

ملاحظة موقع: الـ mount الفعلي للـ accounts على `api/v1/auth/` (لا `api/v1/accounts/`) —
المسار الصحيح للـ endpoint هو `/api/v1/auth/role-assignments/`.

## الأثر

- **الـ frontend `RoleAssignmentFormDialog.tsx`** يرسل `scope_type='STATE'`
  (M4-1 API + M4-4-A UI) ⇒ أي مسؤول يحاول منح نطاق ولاية عبر الواجهة يرى 400.
- **الاختبارات تجاوزت الواجهة دائماً** عبر `apps.accounts.RoleAssignment.objects.create(...)`
  مباشرة، فمرّت كل اختارات M4-1/M5-A/M5-B بلا اكتشاف.
- اكتُشفت في **M5-C Discovery** (commit `e5fd708`)؛ هذا الإصلاح هو M5-C-0.

## الإصلاح

- `_validate_scope_id`: أُضيف `'STATE': ('masterdata.State', 'الولاية')` إلى mapping
  (لا تغيير في بنية الدالة؛ لا migrations).

## الاختبارات

`apps/accounts/tests/test_scope_validation.py` — 6 اختبارات:

| الاختبار | ما يثبته |
|---|---|
| `test_state_scope_via_api_now_works` | POST STATE + state موجود → **201** + صف في قاعدة البيانات |
| `test_state_scope_invalid_id_rejected` | POST STATE + UUID غير موجود → **400** برسالة واضحة |
| `test_state_scope_missing_id_rejected` | POST STATE بلا scope_id → **400** |
| `test_global_scope_normalizes_any_id` | POST GLOBAL + scope_id → **201** و `scope_id` تُطبَّع `None` — سلوك GLOBAL الأصلي (normalize silently) محفوظ كما هو في الاتفاقية الموثقة (`serializers.py` القسم «canonical scope normalisation») |
| `test_sector_scope_still_works` | SECTOR + sector موجود → **201** (regression) |
| `test_unknown_scope_type_rejected` | scope_type غير معروف → **400** (ChoiceField) |

**قرار وثيق (GLOBAL):** الـ spec اقترح اختبار أن GLOBAL + scope_id → 400. هذا يتناقض
مع الاتفاقية الموثقة للمشروع: GLOBAL **دائماً null** و scope_id يُطبَّع صامتاً إلى
`null` في `validate()` **قبل** أي فحص آخر. اخترنا حفظ سلوك المشروع الحالي بدل
كسره؛ الاختبار يثبت وضع التطبيع (201 + scope_id=null).

## Baseline

قبل M5-C-0: **443 passed + 1 xfailed** — بعد M5-C-0: **449 passed + 1 xfailed** (+6).

## ما الذي ليس في M5-C-0

- `ScopeType.LOCALITY` / `ScopeType.FACILITY` — **M5-C-L / M5-C-F**.
- `core/utils/scoping.py` — **M5-C-L**.
- تغييرات UI — إن لزم للمنتقي، **M5-C-L/F**.
- لا migrations — لا حاجة إليها للإصلاح.
- LOCALITY/FACILITY validation placeholder — يُضاف عند إدخال الـ enum فعلياً.

## الاكتشاف

M5-C Discovery — commit `e5fd708` — `backend/docs/m5-c-discovery.md` قسم Q/
«ScopeType Impact».
