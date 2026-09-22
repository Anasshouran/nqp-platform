# WHO_Integration - دليل التكامل التقني للمطورين

## 1. نظرة عامة للمطورين
يوفر هذا الدليل للمطورين المعلومات اللازمة لربط منصة NQP بخدمات منظمة الصحة العالمية (WHO) الخارجية. يتم التكامل عبر (REST APIs) مع مصادقة قائمة على (API Key)، وجدولة مزامنة البيانات عبر (Celery Beat).

## 2. الاتصال بخدمات WHO
- **العنوان الأساسي (Base URL)**: `https://api.who.int/v1` (بيئة الاختبار: `https://test-api.who.int/v1`).
- **المصادقة**: `X-API-Key: <your_who_api_key>` (يتم إدارتها عبر Django Settings).
- **التنسيق**: JSON (افتراضي)، و XML للتقارير الرسمية.

## 3. عمليات المزامنة المجدولة (Scheduled Tasks via Celery Beat)

| المهمة | الجدول الزمني | الوصف |
| :--- | :--- | :--- |
| `sync_icd11_codes` | يومياً (الساعة 2 صباحاً) | جلب أحدث تحديثات ICD-11 من WHO. |
| `sync_country_risks` | كل 6 ساعات | تحديث قائمة الدول الموبوءة وتصنيفاتها. |
| `generate_ihr_report` | أسبوعياً (الأحد 3 صباحاً) | توليد تقرير IHR الأسبوعي وإرساله إلى المركز الوطني. |
| `send_pheic_alert` | فوري (عند الحدث) | إرسال إشعار فوري عن حالة PHEIC إلى المركز الوطني. |

## 4. نماذج الطلبات والاستجابات (Request/Response Models)

### 4.1. جلب تحديثات ICD-11
- **الطلب**: `GET /api/who/icd11/updates?since=2024-01-01`
- **الاستجابة**:
```json
{
  "status": "success",
  "data": {
    "last_update": "2024-07-20",
    "codes": [
      {
        "code": "RA01",
        "name": "COVID-19",
        "category": "Respiratory infections",
        "effective_date": "2024-01-01"
      }
    ]
  }
}

4.2. إرسال تقرير IHR (إلى المركز الوطني)

    الطلب: POST /api/v1/who/ihr-report/submit

    الاستجابة:

json

{
  "status": "success",
  "message": "تم إرسال التقرير إلى المركز الوطني للوائح الصحية.",
  "report_id": "IHR-2024-07-21-001"
}

5. معالجة الأخطاء (Error Handling)
الكود (Code)	الوصف	الإجراء المتخذ
401 Unauthorized	مفتاح API غير صحيح	إشعار للمسؤول عبر البريد الإلكتروني وإيقاف المهمة.
429 Too Many Requests	تجاوز حد الطلبات	إعادة المحاولة بعد 5 دقائق (Celery Retry).
503 Service Unavailable	خدمة WHO غير متاحة	تسجيل الخطأ وإعادة المحاولة بعد 30 دقيقة.
6. الاختبار المحلي (Local Testing)

    يمكن محاكاة خدمات WHO باستخدام Mock Server (مثل: wiremock) لتطوير واختبار التكامل دون الاتصال بالإنترنت.

    يتم استخدام متغير بيئة WHO_API_MOCK=True لتفعيل الوضع الوهمي.