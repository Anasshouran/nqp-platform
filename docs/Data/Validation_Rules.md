
---

### 📄 9. `Validation_Rules.md` (قواعد التحقق من صحة البيانات)

```markdown
# قواعد التحقق من صحة البيانات (Validation Rules) - NQP

## 1. الهدف
تحديد قواعد التحقق من صحة البيانات (Validation Rules) التي يتم تطبيقها في جميع أنحاء المنصة (الواجهة الأمامية والخلفية) لضمان جودة البيانات وسلامتها.

## 2. أنواع التحقق

| النوع | الوصف | المكان |
| :--- | :--- | :--- |
| **Client-Side Validation** | التحقق في المتصفح (React) باستخدام (Zod). | الواجهة الأمامية |
| **Server-Side Validation** | التحقق في الخادم (Django) باستخدام (Serializers). | الخادم الخلفي |
| **Database Validation** | التحقق في قاعدة البيانات (Constraints). | قاعدة البيانات |

## 3. قواعد التحقق العامة

| الحقل | القاعدة | رسالة الخطأ |
| :--- | :--- | :--- |
| **الاسم** | أحرف عربية أو إنجليزية فقط (بدون أرقام أو رموز). | "الاسم يجب أن يحتوي على أحرف فقط." |
| **رقم الجواز** | 6-20 حرفاً وأرقاماً، بحروف كبيرة. | "رقم الجواز غير صحيح (يجب أن يتكون من 6-20 حرفاً وأرقاماً)." |
| **البريد الإلكتروني** | صيغة بريد إلكتروني صحيحة. | "يرجى إدخال بريد إلكتروني صحيح." |
| **رقم الجوال** | يبدأ بـ (0) ويتكون من 10 أرقام (أو مع رمز الدولة). | "رقم الجوال غير صحيح (يجب أن يتكون من 10 أرقام)." |
| **تاريخ الميلاد** | تاريخ صحيح، عمر >= 18 سنة. | "يجب أن يكون العمر 18 سنة على الأقل." |
| **درجة الحرارة** | بين 30 و 45 درجة مئوية. | "درجة الحرارة غير صحيحة (يجب أن تكون بين 30 و 45)." |
| **تشبع الأكسجين** | بين 50 و 100. | "تشبع الأكسجين غير صحيح (يجب أن يكون بين 50 و 100)." |
| **الضغط الانقباضي** | بين 70 و 250. | "الضغط الانقباضي غير صحيح." |
| **الضغط الانبساطي** | بين 40 و 150. | "الضغط الانبساطي غير صحيح." |

## 4. قواعد التحقق حسب الجدول

### 4.1. جدول المسافرين (Travelers)
| الحقل | القاعدة | رسالة الخطأ |
| :--- | :--- | :--- |
| `passport_number` | فريد، 6-20 حرفاً وأرقاماً. | "رقم الجواز مستخدم بالفعل." |
| `first_name` | أحرف عربية أو إنجليزية فقط. | "الاسم الأول يجب أن يحتوي على أحرف فقط." |
| `last_name` | أحرف عربية أو إنجليزية فقط. | "اسم العائلة يجب أن يحتوي على أحرف فقط." |
| `email` | صيغة بريد إلكتروني صحيحة (اختياري). | "يرجى إدخال بريد إلكتروني صحيح." |
| `phone` | رقم صحيح (مع رمز الدولة). | "رقم الجوال غير صحيح." |

### 4.2. جدول الفحوصات (Health Screenings)
| الحقل | القاعدة | رسالة الخطأ |
| :--- | :--- | :--- |
| `body_temperature` | بين 30 و 45. | "درجة الحرارة غير صحيحة." |
| `oxygen_saturation` | بين 50 و 100. | "تشبع الأكسجين غير صحيح." |
| `systolic_bp` | بين 70 و 250. | "الضغط الانقباضي غير صحيح." |
| `diastolic_bp` | بين 40 و 150. | "الضغط الانبساطي غير صحيح." |

### 4.3. جدول المختبرات (Lab Results)
| الحقل | القاعدة | رسالة الخطأ |
| :--- | :--- | :--- |
| `result` | أحد القيم المسموحة (POSITIVE, NEGATIVE, INCONCLUSIVE). | "النتيجة غير صحيحة." |
| `value` | رقم موجب (إذا كان موجوداً). | "القيمة الرقمية يجب أن تكون موجبة." |

## 5. تنفيذ قواعد التحقق في Django (Serializers)

```python
# apps/travelers/serializers.py
from rest_framework import serializers
from .models import Traveler
import re

class TravelerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Traveler
        fields = '__all__'

    def validate_passport_number(self, value):
        if not re.match(r'^[A-Z0-9]{6,20}$', value):
            raise serializers.ValidationError("رقم الجواز غير صحيح.")
        return value

    def validate_first_name(self, value):
        if not re.match(r'^[\u0621-\u064A\s]+$', value) and not re.match(r'^[A-Za-z\s]+$', value):
            raise serializers.ValidationError("الاسم الأول يجب أن يحتوي على أحرف فقط.")
        return value

    def validate_phone(self, value):
        if not re.match(r'^\+?[0-9]{10,15}$', value):
            raise serializers.ValidationError("رقم الجوال غير صحيح.")
        return value

6. تنفيذ قواعد التحقق في React (Zod)
// frontend/src/schemas/traveler.schema.ts
import { z } from 'zod';

export const travelerSchema = z.object({
  passportNumber: z.string()
    .min(6, 'رقم الجواز يجب أن يكون 6 أحرف على الأقل')
    .max(20, 'رقم الجواز يجب أن لا يتجاوز 20 حرفاً')
    .regex(/^[A-Z0-9]{6,20}$/, 'رقم الجواز غير صحيح'),
  firstName: z.string()
    .min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل')
    .regex(/^[\u0621-\u064A\s]+$|^[A-Za-z\s]+$/, 'الاسم الأول يجب أن يحتوي على أحرف فقط'),
  lastName: z.string()
    .min(2, 'اسم العائلة يجب أن يكون حرفين على الأقل')
    .regex(/^[\u0621-\u064A\s]+$|^[A-Za-z\s]+$/, 'اسم العائلة يجب أن يحتوي على أحرف فقط'),
  phone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'رقم الجوال غير صحيح'),
  email: z.string()
    .email('يرجى إدخال بريد إلكتروني صحيح')
    .optional(),
  dateOfBirth: z.string()
    .date('تاريخ الميلاد غير صحيح')
    .refine((date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18;
    }, 'يجب أن يكون العمر 18 سنة على الأقل'),
});

7. مراجع

    Zod Documentation: https://zod.dev/

    Django Validators: https://docs.djangoproject.com/en/stable/ref/validators/

    DRF Serializers: https://www.django-rest-framework.org/api-guide/serializers/