# M2 Known Debt — Organizational Registry

**آخر تحديث:** 2026-11-09
**المرجع:** M2 Continuation

---

## D-1 (M1) — رسمياً مغلق

`RegistryChangeLog` يعتمد الآن على `post_save`/`post_delete` signals في `signals.py` — مفعل عبر `RegistryConfig.ready()`.

**تحقق:** `test_signals.py` في M2.

---

## D-2 (M1) — مغلق

`ReportingNode.clean()` يستخدم `_state.adding` بدل الاستعلام على DB.

**التحقق الميداني:**
```
Re-save root: OK
Second root rejected: ValidationError
```

---

## D-3 (M1) — bulk_create لا يُطلق signals

**الوضع:** `bulk_create` في Django لا يُطلق `post_save`. أي `bulk_create` على نماذج السجل **لن يُسجَّل** في `RegistryChangeLog`.

**الحماية الحالية:**
- `UniqueConstraint(parent=NULL)` يمنع جذور متعددة.
- `UniqueConstraint(code)` يمنع تكرار الرموز.

**الحل المقترح (M2-bis):**
- لا تستخدم `bulk_create` على نماذج السجل في M2 API. الـ endpoints الحالية تستخدم `create()` الفردي (آمن).
- إن لزم `bulk_create` مستقبلاً (مثلاً import من Excel)، أضف `RegistryChangeLog.objects.bulk_create` يدوياً في نفس الـ transaction.
- أو استبدل `bulk_create` بـ `create()` loop (بطيء لكن آمن).

**اختبار:** `test_bulk_create_no_signals` في `test_signals.py` يُثبُّت السلوك الحالي (مقصود).

**قبول:** M2 لا يستخدم `bulk_create` على نماذج السجل. الديون موثق.

---

## D-4 (M1) — 2 من 3 فحوص consistency غير مختبرة

يبقى كما في M1. يُعالج في M2-bis إن لزم.

---

## D-5 (M1) — CheckConstraint.check deprecated

انظر `m1-known-debt.md` للتفاصيل.

---

## D-6 (M1) — FED root naming

انظر `m1-known-debt.md` للتفاصيل.

---

## D-7 (M1) — --reuse-db risk

انظر `m1-known-debt.md` للتفاصيل.

---

## D-8 (M1) — docker-compose.override.yml not gitignored

**مغلق في M1.** تمت الإضافة إلى `.gitignore`.

---

## D-9 (M1) — transaction=True in FK test

انظر `m1-known-debt.md` للتفاصيل.

---

## D-10 (M1) — مغلق

`--reuse-db` مفعّل في `pytest.ini` (addopts). CI يجب أن يستخدم `--create-db` مرة واحدة، ثم `--reuse-db`.

**الفحص:**
```
21 passed in 2.80s (--reuse-db)
```

---

## D-M2-1 (جديد) — signals تُسجّل `user=None`

**الوضع:** `_extract_user()` في `signals.py` يعيد `None`. لا thread-local middleware يضع `request.user`.

**الأثر:** `RegistryChangeLog.user` دائماً `NULL` في M2. لا يمكن معرفة من عدّل.

**الحل المقترح (M2-bis):**
- middleware يضع `request.user` في thread-local (`contextvars` في async).
- `_extract_user()` يقرأ من thread-local.
- اختبار: `test_signal_records_user_when_authenticated`.

**قبول:** M2-core يقبل `user=None`. الحوكمة الكاملة تحتاج M2-bis.

---

## D-M2-2 (M2) — مغلق

**الحل المطبّق (M2-6 fixes):**
```python
class RegistryScopedViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
```
DELETE → 405 (Method Not Allowed). لا حذف فيزيائي عبر API.

**تحقق:** `test_delete_not_allowed` في `test_api_nodes.py` (PASSED).

**الأثر:** البيانات التنظيمية لا تُحذف عبر API. التعطيل يستخدم `is_active=False` فقط.

---

## D-M2-3 (جديد) — Scoping: GLOBAL-only

**الوضع:** `RegistryScopedViewSet` غير معروف سلوكه بدقة. الافتراض: GLOBAL-only (fail-safe للباقي).

**الحل المقترح (M2-bis):**
- `get_queryset()` صريح: `if not has_global_scope(user): return qs.none()`.
- أو scoping متقدم لـ SECTOR/DEPARTMENT.
- اختبار: `test_non_global_gets_empty`.

**قبول:** M2-core يوثق. M2-bis يوسّع.
