
---

### 📄 5. `Security_Testing.md` (اختبارات الأمان)

```markdown
# اختبارات الأمان (Security Testing) - NQP

## 1. الهدف
تحديد الثغرات الأمنية في المنصة والتأكد من أن البيانات الحساسة (الصحية، الشخصية) محمية بشكل كافٍ ضد الهجمات الإلكترونية، مثل (SQL Injection, XSS, CSRF, Brute Force).

## 2. أنواع اختبارات الأمان

| النوع | الوصف | الأداة |
| :--- | :--- | :--- |
| **اختبار الاختراق (Penetration Testing)** | محاكاة هجمات إلكترونية لاكتشاف الثغرات. | OWASP ZAP / Burp Suite |
| **فحص الثغرات (Vulnerability Scanning)** | فحص تلقائي للثغرات المعروفة. | OWASP Dependency Check |
| **اختبار المصادقة والصلاحيات** | اختبار صلاحيات RBAC ومنع الوصول غير المصرح به. | اختبارات يدوية + Django |
| **اختبار تشفير البيانات** | التأكد من تشفير البيانات أثناء النقل (TLS) وعند السكون (AES-256). | SSL Labs / اختبارات يدوية |
| **اختبار تسريب البيانات** | التأكد من عدم تسريب البيانات الحساسة في السجلات (Logs) أو رسائل الخطأ. | اختبارات يدوية |
| **اختبار أمان واجهات API** | اختبار نقاط النهاية (Endpoints) ضد هجمات (Injection, Broken Authentication). | OWASP ZAP |

## 3. قائمة الاختبارات الأمنية الأساسية

| الاختبار | الوصف | الحالة المتوقعة |
| :--- | :--- | :--- |
| **SQL Injection** | محاولة إدخال كود SQL في الحقول (مثل: `' OR 1=1 --`). | يتم رفض الطلب وعرض خطأ عام. |
| **XSS (Cross-Site Scripting)** | محاولة إدخال كود JavaScript في الحقول. | يتم تنقية الإدخال (Sanitization). |
| **CSRF (Cross-Site Request Forgery)** | محاولة إرسال طلب مزور من موقع آخر. | يتم رفض الطلب بدون CSRF Token. |
| **JWT Manipulation** | محاولة تعديل JWT Token أو استخدام Token منتهي الصلاحية. | يتم رفض الطلب. |
| **Brute Force** | محاولة تخمين كلمة المرور (آلاف المحاولات). | يتم حظر الـ IP بعد 5 محاولات فاشلة. |
| **File Upload** | محاولة رفع ملف ضار (مثل: PHP Shell). | يتم رفض الملفات غير المسموحة. |
| **API Key Exposure** | محاولة استخدام مفتاح API مسرب. | يتم رفض الطلب (مفتاح غير نشط). |
| **Path Traversal** | محاولة الوصول إلى ملفات خارج المجلد المسموح. | يتم رفض الطلب. |

## 4. اختبارات الأمان التلقائية

### 4.1. اختبار الأمان في Django (pytest)
```python
# apps/accounts/tests/test_security.py
import pytest
from django.test import Client
from django.urls import reverse

@pytest.mark.django_db
def test_sql_injection_prevention():
    client = Client()
    response = client.get('/api/v1/travelers/search/?q=1%27%20OR%20%271%27=%271')
    assert response.status_code == 400  # يتم رفض الطلب

@pytest.mark.django_db
def test_brute_force_protection():
    client = Client()
    for i in range(6):
        response = client.post('/api/v1/auth/login/', {
            'email': 'admin@nqp.gov.sd',
            'password': 'wrong_password'
        })
    assert response.status_code == 429  # Too Many Requests

@pytest.mark.django_db
def test_xss_prevention():
    client = Client()
    response = client.post('/api/v1/travelers/register/', {
        'first_name': '<script>alert("XSS")</script>',
        'last_name': 'Test',
        'passport_number': 'A1234567',
        'date_of_birth': '1990-05-15'
    })
    # التأكد من تنقية الإدخال
    assert '<script>' not in response.content.decode()

4.2. فحص الاعتماديات (Dependency Check)
bash

# استخدام OWASP Dependency Check
dependency-check --scan backend/requirements/ --format HTML --out reports/

5. اختبارات أمان واجهات API
الاختبار	الوصف	الأداة
Authentication Bypass	محاولة الوصول إلى نقاط نهاية محمية بدون JWT.	OWASP ZAP
Authorization Bypass	محاولة الوصول إلى موارد غير مصرح بها (مثل: بيانات مسافر آخر).	اختبارات يدوية
Rate Limiting	محاولة تجاوز حد الطلبات المسموح.	OWASP ZAP
CORS Misconfiguration	التأكد من أن CORS تم تكوينه بشكل صحيح.	اختبارات يدوية
6. تقارير الأمان

    تقرير الاختراق: يتم إعداده بواسطة فريق أمني متخصص، يحتوي على جميع الثغرات المكتشفة وتوصيات الإصلاح.

    شهادة الامتثال: التأكد من امتثال المنصة لمعايير (GDPR) و (HIPAA) حيث ينطبق.

    تقرير فحص الثغرات: يتم إنشاؤه تلقائياً بعد كل فحص، يحتوي على قائمة بالثغرات المعروفة والإصلاحات المقترحة.

7. أفضل الممارسات

    الاختبار الدوري: إجراء اختبارات الأمان بشكل دوري (شهرياً أو ربع سنوي).

    التصحيح السريع: تصحيح الثغرات المكتشفة فوراً (خاصة الثغرات الحرجة).

    التدريب: تدريب فريق التطوير على ممارسات البرمجة الآمنة (Secure Coding).

    التوثيق: توثيق جميع الاختبارات الأمنية والنتائج.