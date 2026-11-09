# M3-3 Known Debt — Technical Supervision

## D-M3-3-1: target_type = FACILITY فقط

**الوضع:** `TechnicalSupervision` يدعم `target_type=FACILITY` فقط في M3-3.
الحقول `SERVICE_POINT` و`DEPARTMENT` جاهزة في `TargetType` enum (معلّقة) لكن لا تُستخدم.

**السبب:** `SERVICE_POINT` يحتاج `ServiceRegistry` (M4)، `DEPARTMENT` يحتاج ربط Department بالشجرة (M3-4).

**الحل المقترح (M4):** توسيع `target_type` + إضافة `service_point` و`department` FKs.

## D-M3-3-2: TechnicalSupervision SECTOR scoping غير مختبر

**الوضع:** `get_queryset` يرث من `RegistryScopedViewSet` (M3-1) مع حالة `TechnicalSupervision`. لم يُضف اختبار SECTOR مشابه لـ M3-2.

**الحل المقترح (M3-bis):** اختبار `test_sector_user_sees_own_sector_supervisions`.

## D-M3-3-3: `reference_id` في TechnicalSupervisor غير محقَّق وجودياً

**الوضع:** مثل D-M3-2-1 (M3-2). `clean()` يتحقق من الوجود فقط عند `reference_type` معروف (لا شيء حالياً).

**الحل المقترح (M3-bis):** توسيع `clean()` عندما تُستخدم `reference_type` فعلياً.
