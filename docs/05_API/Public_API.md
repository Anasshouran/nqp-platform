# Public_API - واجهات الموقع العام (القطاعات والمنافذ)

## 1. نظرة عامة
توفر هذه الواجهات بيانات القطاعات والمنافذ للموقع العام، وتُستخدم لعرض المعلومات في صفحة "القطاعات والمنافذ".

## 2. المسارات (Endpoints)

### 2.1. القطاعات (Sectors)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/sectors/` | قائمة جميع القطاعات | عام |
| `GET` | `/api/v1/public/sectors/{id}/` | تفاصيل قطاع معين | عام |
| `GET` | `/api/v1/public/sectors/{id}/ports/` | قائمة منافذ قطاع معين | عام |

### 2.2. المنافذ (Ports)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/ports/` | قائمة المنافذ (مع التصفية) | عام |
| `GET` | `/api/v1/public/ports/{id}/` | تفاصيل منفذ معين | عام |
| `GET` | `/api/v1/public/ports/map/` | بيانات الخريطة (GeoJSON) | عام |
| `GET` | `/api/v1/public/ports/{id}/stats/` | إحصائيات المنفذ | عام |

### 2.3. كتالوج الخدمات (Service Catalog)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/service-categories/` | الفئات مع خدماتها المتداخلة | عام |
| `GET` | `/api/v1/public/services/` | قائمة الخدمات (`?category=<code>`، `?search=`) | عام |
| `GET` | `/api/v1/public/services/{code}/` | تفاصيل خدمة حسب الكود | عام |

### 2.4. المساعد الذكي (NQP Smart Assistant)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/public/assistant/chat/` | إجابة منظمة حسب السؤال (مصادر رسمية + درجة ثقة) | عام |
| `GET` | `/api/v1/public/assistant/suggestions/` | اقتراحات أسئلة سريعة | عام |
| `GET` | `/api/v1/public/assistant/topics/` | فهرس موضوعات المعرفة (FAQ/سفر/إشعارات/خدمات) | عام |

### 2.5. المؤشرات والإحصاءات (Statistics)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/statistics/` | مؤشرات عامة آمنة (`?sector=<code>`، `?period=`) | عام |

مثال الاستجابة:
```json
{
  "status": "success",
  "data": {
    "period": "all",
    "sector": null,
    "entry_points": 18,
    "sectors": 6,
    "travelers": 3623,
    "screenings": 48,
    "certificates": 2,
    "food_shipments": 6,
    "lab_samples": 0,
    "diseases": 5,
    "vector_activities": 7,
    "notices": 6,
    "news": 4,
    "faq": 4
  }
}
```

### 2.6. التعميمات (Circulars — عبر CMS)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cms/circulars/` | قائمة التعميمات المنشورة (مُجزأة `results`) | عام |
| `GET` | `/api/v1/cms/circulars/{id}/` | تفاصيل تعميم منشور | عام |

> ملاحظة: يعرض الـ ViewSet المنشور فقط (`status=PUBLISHED`)، والاستجابة مُجزأة بمفتاح `results`.


## 3. نماذج الطلبات والاستجابات

### 3.1. قائمة القطاعات (Response)
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name_ar": "قطاع البحر الأحمر",
      "name_en": "Red Sea Sector",
      "description_ar": "يشمل ولاية البحر الأحمر وموانئها السبعة",
      "description_en": "Includes Red Sea state with its seven ports",
      "ports_count": 7,
      "color": "#e63946",
      "region": "البحر الأحمر"
    },
    {
      "id": "uuid",
      "name_ar": "قطاع الخرطوم",
      "name_en": "Khartoum Sector",
      "description_ar": "يشمل ولاية الخرطوم",
      "description_en": "Includes Khartoum state",
      "ports_count": 3,
      "color": "#0D47A1",
      "region": "KHARTOUM"
    }
  ]
}

3.2. تفاصيل القطاع (Response)
json

{
  "status": "success",
  "data": {
    "id": "uuid",
    "name_ar": "قطاع البحر الأحمر",
    "name_en": "Red Sea Sector",
    "description_ar": "يشمل ولاية البحر الأحمر وموانئها السبعة",
    "description_en": "Includes Red Sea state with its seven ports",
    "region": "البحر الأحمر",
    "color": "#e63946",
    "contact": {
      "phone": "+249-123-456-789",
      "email": "redsea.sector@nqp.gov.sd",
      "working_hours": "8:00 AM - 4:00 PM (Sat - Thu)"
    },
    "ports": [
      {
        "id": "uuid",
        "name_ar": "مطار بورتسودان الدولي",
        "name_en": "Port Sudan International Airport",
        "type": "AIRPORT",
        "status": "ACTIVE",
        "services": ["فحص المسافرين", "فحص الطواقم", "تفتيش الطائرات"]
      }
    ]
  }
}

3.3. تفاصيل المنفذ (Response)
json

{
  "status": "success",
  "data": {
    "id": "uuid",
    "name_ar": "مطار الخرطوم الدولي",
    "name_en": "Khartoum International Airport",
    "type": "AIRPORT",
    "sub_type": "INTERNATIONAL",
    "sector": {
      "id": "uuid",
      "name_ar": "قطاع الخرطوم"
    },
    "location": {
      "address": "مطار الخرطوم الدولي، الخرطوم",
      "city": "الخرطوم",
      "country": "السودان",
      "latitude": 15.5895,
      "longitude": 32.5532
    },
    "contact": {
      "phone": "+249-123-456-789",
      "email": "khartoum.airport@nqp.gov.sd",
      "working_hours": "24 ساعة"
    },
    "services": [
      "فحص المسافرين القادمين",
      "فحص المسافرين المغادرين",
      "فحص المسافرين العابرين (Transit)",
      "فحص الطواقم",
      "تفتيش الطائرات",
      "التحقق من التطعيمات",
      "العزل المؤقت",
      "إصدار الشهادات الصحية",
      "الاستجابة للطوارئ"
    ],
    "stats": {
      "monthly_passengers": 150000,
      "monthly_screenings": 120000,
      "monthly_cases": 45,
      "positive_rate": 0.037
    }
  }
}

3.4. بيانات الخريطة (GeoJSON Response)
json

{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[34.0, 11.5], [34.5, 12.0], ...]]
      },
      "properties": {
        "sector_name": "قطاع البحر الأحمر",
        "sector_id": "uuid",
        "color": "#2E7D32"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [32.5532, 15.5895]
      },
      "properties": {
        "name": "مطار الخرطوم الدولي",
        "type": "AIRPORT",
        "port_id": "uuid",
        "sector": "قطاع الخرطوم"
      }
    }
  ]
}

3.5. خدمة من الكتالوج (Response)
json

{
  "status": "success",
  "data": {
    "id": "uuid",
    "code": "food-import",
    "category_code": "food-safety",
    "name_ar": "الوارد (فحص شحنة وارد)",
    "description_ar": "قدّم طلب فحص شحنة أغذية وارد لفحصها وتقييمها صحياً قبل الإفراج.",
    "icon": "inventory",
    "route": "/services/food-safety/import",
    "audience": "BUSINESS",
    "requires_auth": true,
    "identity_provider": "CREDENTIALS",
    "target_system": "FOOD_SAFETY_PORTAL",
    "status": "ACTIVE",
    "is_active": true
  }
}

3.6. إجابة المساعد الذكي (Chat Response)

طريقة الطلب: `POST /api/v1/public/assistant/chat/`
```json
{
  "message": "أريد تسجيل مسافر",
  "language": "ar"
}
```

الاستجابة:
```json
{
  "status": "success",
  "data": {
    "answer": "يمكنك تسجيل المسافر إلكترونياً عبر الخدمة المتاحة...",
    "answer_type": "ACTION",
    "action": {
      "label": "بدء التسجيل",
      "route": "/services/travelers/registration",
      "requires_auth": true,
      "identity_provider": "CREDENTIALS"
    },
    "sources": [
      {"type": "SERVICE", "id": "uuid", "title": "تسجيل المسافرين", "source_url": "/services/travelers/registration", "source_updated_at": "2025-01-01T00:00:00Z"}
    ],
    "confidence": "MEDIUM",
    "language": "ar"
  }
}
```

**حقول الاستجابة الجديدة** (أُضيفت في هذه الجولة):
- `answer_type`: نوع الإجابة — `INFO` (معلومة)، `ACTION` (إجراء/خدمة)، `ALERT` (تنبيه صحي)، `SOURCE` (مصدر رسمي)، `NOT_FOUND` (لم يتم العثور).
- `action`: إجراء مقترح — `label` (نص الزر)، `route` (رابط)، `requires_auth` (هل يتطلب تسجيل دخول)، `identity_provider` (`CREDENTIALS`/`NONE`/غيرها). عند `requires_auth=true` يعرض الواجهة زر `🔐 المتابعة عبر تسجيل الدخول`.
- `sources[]`: أُضيف `source_url` (رابط المصدر) و `source_updated_at` (آخر تحديث بواسطة المسؤول) لعرض "آخر تحديث" وزر "عرض المصدر".
- `language`: اللغة التي أُجيب بها السؤال (`ar`/`en`).

الاستجابة للإشعارات (ALERT) مثال:
```json
{
  "status": "success",
  "data": {
    "answer": "🔔 إشعارات صحية نشطة (المصدر: الاشتراكات الحكومية):\n• ...",
    "answer_type": "ALERT",
    "action": null,
    "sources": [
      {"type": "HEALTH_NOTICE", "id": "uuid", "title": "إشعارات", "source_url": "/notices", "source_updated_at": "2025-01-15T00:00:00Z"}
    ],
    "confidence": "HIGH",
    "language": "ar"
  }
}
```

ملاحظات أمنية: لا تُرجع الواجهة أي بيانات شخصية (PII) للمواطن؛ تُستجلب المتطلبات الصحية من المصادر الرسمية المنشورة فقط ولا تُخمَّن أبداً، مع إرفاق `sources` و`confidence` في كل إجابة.


4. رموز الاستجابة (Status Codes)
الكود	الوصف
200 OK	نجاح العملية
404 Not Found	القطاع أو المنفذ أو الخدمة غير موجود
500 Internal Server Error	خطأ في الخادم
