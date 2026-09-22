
---

### 📄 3. `Authentication-Service-JWT/Authentication-Service-JWT.md` (خدمة المصادقة)

```markdown
# Authentication Service - خدمة المصادقة (JWT)

## 1. الهدف
إدارة دورة حياة المصادقة (Authentication) والترخيص (Authorization) لجميع مستخدمي المنصة. تعتمد الخدمة على (JWT - JSON Web Tokens) لضمان نقل آمن للبيانات بين العميل والخادم، مع دعم (Refresh Tokens) لتمديد جلسة المستخدم.

## 2. مكونات الخدمة

### 2.1. نموذج المستخدم (User Model) في Django
```python
# apps/accounts/models.py
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'مدير النظام'),
        ('FEDERAL_ADMIN', 'مشرف اتحادي'),
        ('SECTOR_MANAGER', 'مدير قطاع'),
        ('PORT_OFFICER', 'موظف حجر'),
        ('DOCTOR', 'طبيب'),
        ('LAB_TECH', 'فني مختبر'),
        ('FOOD_INSPECTOR', 'مفتش غذائي'),
        ('EOC_OPERATOR', 'مسؤول طوارئ'),
        ('CARRIER_REP', 'ممثل شركة طيران'),
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    port = models.ForeignKey('ports.Port', on_delete=models.SET_NULL, null=True, blank=True)
    sector = models.ForeignKey('sectors.Sector', on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # ... باقي الحقول

2.2. نقاط النهاية (Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/auth/login/	الحصول على (Access Token) و (Refresh Token).	عام (Public)
POST	/api/v1/auth/refresh/	تحديث (Access Token) باستخدام (Refresh Token).	عام (Public)
POST	/api/v1/auth/verify/	التحقق من صحة (Access Token).	عام (Public)
POST	/api/v1/auth/logout/	إبطال (Refresh Token) (تسجيل الخروج).	محمي (Authenticated)
POST	/api/v1/auth/change-password/	تغيير كلمة المرور للمستخدم المسجل.	محمي (Authenticated)
POST	/api/v1/auth/reset-password/	طلب إعادة تعيين كلمة المرور (نسيتها).	عام (Public)
2.3. مثال على طلب تسجيل الدخول (Login Request)
json

POST /api/v1/auth/login/
{
  "email": "admin@nqp.gov.sd",
  "password": "SecurePass123!"
}

2.4. مثال على استجابة تسجيل الدخول (Login Response)
json

{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "full_name": "محمد أحمد",
      "role": "SUPER_ADMIN",
      "port": null,
      "sector": null
    }
  }
}

3. إعدادات JWT في Django
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
}

4. سياسات الصلاحيات (Permissions / RBAC)

    يتم تطبيق الصلاحيات على مستوى (Views) في Django REST Framework باستخدام (Permission Classes).

    مثال:

python

# apps/screening/permissions.py
from rest_framework.permissions import BasePermission

class IsPortOfficer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PORT_OFFICER'

5. إدارة الجلسات (Session Management)

    تخزين Refresh Token: يتم تخزين (Refresh Token) في (HTTP-only Cookies) لأمان أعلى، أو في (LocalStorage) حسب البيئة.

    إبطال الجلسة: عند تسجيل الخروج، يتم إبطال (Refresh Token) في قاعدة البيانات لمنع استخدامه مرة أخرى.

    انتهاء الصلاحية: في حال انتهاء صلاحية (Access Token)، يجب على العميل استخدام (Refresh Token) للحصول على (Access Token) جديد.