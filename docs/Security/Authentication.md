
---

### 📄 3. `Authentication.md` (المصادقة)

```markdown
# المصادقة (Authentication) - NQP

## 1. الهدف
توفير آلية مصادقة آمنة وقابلة للتوسع للمستخدمين (المسافرين، الموظفين، شركات الطيران، الإدارة). تعتمد المصادقة على (JWT - JSON Web Tokens) لتوفير حل **عديم الحالة (Stateless)** و **آمن** و **سهل التكامل**.

## 2. أنواع المصادقة

| النوع | الاستخدام | التقنية |
| :--- | :--- | :--- |
| **مصادقة المستخدمين** | تسجيل الدخول للموظفين، الأطباء، الإدارة. | JWT (Access + Refresh Tokens) |
| **مصادقة المسافرين** | تسجيل الدخول للمسافرين (بوابة 2، تطبيق الجوال). | JWT (Access + Refresh Tokens) |
| **مصادقة الأنظمة** | التكامل مع الأنظمة الخارجية (شركات الطيران، الجمارك). | API Keys |
| **مصادقة ثنائية (MFA)** | للمسؤولين وموظفي الطوارئ (اختياري). | TOTP (Time-based One-Time Password) |

## 3. تدفق المصادقة (Authentication Flow)

```mermaid
sequenceDiagram
    participant User as المستخدم
    participant Client as العميل (React/Flutter)
    participant API as Django REST API
    participant DB as قاعدة البيانات

    User->>Client: 1. إدخال البريد الإلكتروني وكلمة المرور
    Client->>API: 2. إرسال طلب POST /api/v1/auth/login/
    API->>DB: 3. التحقق من وجود المستخدم وصحة كلمة المرور
    DB-->>API: 4. إرجاع بيانات المستخدم
    API->>API: 5. إنشاء Access Token و Refresh Token
    API-->>Client: 6. إرجاع Access Token و Refresh Token
    Client->>Client: 7. تخزين Access Token (في الذاكرة) و Refresh Token (في HttpOnly Cookie)
    
    Note over Client,API: استخدام Access Token في كل طلب
    Client->>API: 8. إرسال طلب مع Authorization: Bearer <access_token>
    API->>API: 9. التحقق من صحة Access Token
    API-->>Client: 10. إرجاع الاستجابة المطلوبة
    
    Note over Client,API: تحديث Access Token (عند انتهاء الصلاحية)
    Client->>API: 11. إرسال Refresh Token لتحديث Access Token
    API-->>Client: 12. إرجاع Access Token جديد

4. نقاط النهاية (Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/auth/login/	تسجيل الدخول (الحصول على Access + Refresh Tokens).	عام
POST	/api/v1/auth/refresh/	تحديث Access Token.	عام (يتطلب Refresh Token)
POST	/api/v1/auth/verify/	التحقق من صحة Access Token.	عام
POST	/api/v1/auth/logout/	تسجيل الخروج (إبطال Refresh Token).	محمي
POST	/api/v1/auth/change-password/	تغيير كلمة المرور.	محمي
POST	/api/v1/auth/forgot-password/	طلب إعادة تعيين كلمة المرور.	عام
POST	/api/v1/auth/reset-password/	إعادة تعيين كلمة المرور (باستخدام OTP).	عام
5. إعدادات JWT
python

# nqp_backend/settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

6. المصادقة الثنائية (MFA) - اختياري
python

# apps/accounts/mfa.py
import pyotp
from django.core.cache import cache

class MFAService:
    def generate_secret(self, user_id):
        secret = pyotp.random_base32()
        cache.set(f'mfa_secret_{user_id}', secret, timeout=600)
        return secret

    def verify_otp(self, user_id, otp):
        secret = cache.get(f'mfa_secret_{user_id}')
        if not secret:
            return False
        totp = pyotp.TOTP(secret)
        return totp.verify(otp)

7. حماية المصادقة
الإجراء	الوصف
Rate Limiting	تقييد عدد محاولات تسجيل الدخول (5 محاولات في الدقيقة).
تخزين آمن للـ Refresh Token	تخزين Refresh Token في (HttpOnly Cookie) لمنع هجمات (XSS).
انتهاء صلاحية Access Token	صلاحية قصيرة (30 دقيقة) لتقليل مخاطر السرقة.
إبطال Refresh Token	إبطال Refresh Token عند تسجيل الخروج أو تغيير كلمة المرور.
تسجيل محاولات الفاشلة	تسجيل جميع محاولات الدخول الفاشلة في (Audit Log).
8. مراجع

    JWT.io: https://jwt.io/

    djangorestframework-simplejwt: https://github.com/jazzband/djangorestframework-simplejwt

    OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
    