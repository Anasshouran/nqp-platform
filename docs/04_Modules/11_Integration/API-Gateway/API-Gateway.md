
---

### 📄 2. `API-Gateway/API-Gateway.md` (بوابة API)

```markdown
# API Gateway - بوابة API

## 1. الهدف
توفير نقطة دخول موحدة لجميع طلبات الـ API (الداخلية والخارجية)، مع تطبيق سياسات (الأمان، التحكم في التدفق، التوجيه، والتسجيل) على مستوى واحد. يعمل (API Gateway) كـ (Reverse Proxy) لجميع الخدمات الخلفية.

## 2. الميزات الرئيسية (Features)

| الميزة | الوصف | التنفيذ في Django |
| :---    | :---   | :---       |

| **توجيه الطلبات (Routing)** | توجيه الطلبات إلى الخدمات المناسبة (البوابات، أنظمة الدعم) بناءً على المسار (URL). | `urls.py` مع توجيه إلى `include()` لكل تطبيق. |

| **التحقق من صحة JWT** | التحقق من صلاحية الرمز المميز (JWT) في كل طلب محمي. | 

`JWT_authentication_classes` في Django REST Framework. |

| **تقييد الطلبات (Rate Limiting)** | منع هجمات (Brute Force) و (DDoS) عبر تحديد عدد الطلبات لكل مستخدم/IP. | `django-ratelimit` أو `DRF Throttling`. |

| **التحكم في الوصول (CORS)** | السماح فقط للنطاقات (Domains) المسموح بها بالوصول إلى الـ API. | `django-cors-headers`. |

| **تسجيل الطلبات (Request Logging)** | تسجيل كل طلب (المستخدم، المسار، طريقة الطلب، وقت الاستجابة) في (Audit Log). | `Middleware` مخصص. |

| **التخزين المؤقت (Caching)** | تخزين استجابات الـ API (مثل: قائمة الدول، تعريفات الأمراض) في Redis لتقليل الضغط على الخادم. | `django.core.cache` مع `RedisCache`. |

## 3. هيكل التوجيه (Routing Structure)

```python
# nqp_backend/urls.py
urlpatterns = [
    # واجهات عامة (لا تحتاج مصادقة)
    path('api/v1/auth/', include('apps.accounts.urls')),  # تسجيل الدخول
    path('api/v1/diseases/', include('apps.disease_management.urls')),  # قائمة الأمراض (عامة)
    path('api/v1/cms/', include('apps.cms.urls')),  # محتوى الموقع العام

    # واجهات البوابات (تحتاج مصادقة)
    path('api/v1/travelers/', include('apps.travelers.urls')),
    path('api/v1/screening/', include('apps.screening.urls')),
    path('api/v1/clinic/', include('apps.clinic.urls')),
    path('api/v1/lab/', include('apps.laboratory.urls')),
    path('api/v1/food/', include('apps.food_quarantine.urls')),

    # واجهات الإدارة (صلاحيات عالية)
    path('api/v1/admin/', include('apps.federal_admin.urls')),

    # واجهات التكامل الخارجي (للأنظمة الخارجية)
    path('api/v1/integration/', include('apps.integration.urls')),
    path('api/v1/fhir/', include('apps.who.fhir_urls')),
]


4. سياسات (Rate Limiting)
المستوى (Scope)	الحد الأقصى (Max Requests)	المدة (Time Window)
عام (Public)	100 طلب	الدقيقة
مسجل دخول (Authenticated)	500 طلب	الدقيقة
مسؤول (Admin)	1000 طلب	الدقيقة
تكامل خارجي (Integration)	200 طلب	الدقيقة
5. نقاط النهاية العامة (Public Endpoints)

هذه النقاط لا تحتاج مصادقة وتُستخدم من قبل الموقع العام وبوابة المسافرين قبل تسجيل الدخول:

    POST /api/v1/auth/login/

    POST /api/v1/travelers/register/

    GET /api/v1/diseases/

    GET /api/v1/cms/news/

    GET /api/v1/cms/faq/

    GET /api/v1/food/certificates/verify/{hash}/ (التحقق من صحة شهادة الإفراج الغذائي)

6. نقاط النهاية المحمية (Protected Endpoints)

جميع النقاط الأخرى تتطلب إرسال (JWT Token) في رأس الطلب (Authorization: Bearer <token>).