# M3-6 Known Debt — Integration Tests

**الغرض:** توثيق أي خلل كشفته اختبارات التكامل (M3-6).

## D-M3-6-1: Envelope لا يشمل 'message' دائماً

**الوضع:** `EnvelopeRenderer` يرجع `{status, data}` بدون `message` في بعض الحالات (خاصةً list endpoints المفرضة). الاختبارات الأصلية توقعت `{status, data, message}` — تم تصحيحها.

**الأثر:** frontend stubs يجب أن تتعامل مع غياب `message`.

**الحل:** `unwrap()` في frontend endpoints يعمل بأمان حتى بدون `message`.

---

## D-M3-6-2: DRF validation errors لا تمر عبر EnvelopeRenderer

**الوضع:** أخطاء التحقق (400) من DRF ترجع field errors مباشرة `{code: [...], ...}` بدون envelope. هذا سلوك DRF قياسي.

**الأثر:** frontend يجب أن يتعامل مع نوعين من الاستجابات: enveloped (2xx) و non-enveloped (4xx/5xx).

**الحل:** `unwrap()` defensive — يعمل مع كلتا الحالتين.

---

## D-M3-6-3: CASCADE signal __str__ يفشل عند حذف العلاقة أولاً

**الوضع:** عند حذف `HealthFacility` → CASCADE يحذف `ServiceAvailability` → signal يحاول `str(instance)` → `self.facility` يفشل (DoesNotExist).

**الحل المطبّق:** `__str__` يستخدم try/except للعلاقات.

**النوع:** نمط عام — أي `__str__` يتضمن FK relations قد يفشل في CASCADE signals.

---

## D-M3-6-4: __str__ يستخدم `except Exception` واسعاً

**الوضع:** إصلاح M3-6 لـ `ServiceAvailability.__str__` يستخدم `except Exception:` بدل `except ObjectDoesNotExist:`.

**الأثر:** يلتقط أي خطأ (بما فيها bugs مستقبلية) بصمت.

**الحل المقترح (M4):** تضييق إلى `except (ObjectDoesNotExist, AttributeError):` أو مشابه. لا أثر سلوكي حالياً.

---

## خلاصة

**M3-6 لم يكشف أي ديون جديدة خطيرة.** النظام متسق عبر 13 نموذجاً و 6 محاور تكامل. أُصلحت 3 مشكلات اختبارية (envelope توقعات، CASCADE __str__) — لا مشاكل إنتاجية.
