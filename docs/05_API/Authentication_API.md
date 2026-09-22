
---

### 📄 3. Authentication_API.md (واجهات المصادقة)

```markdown
# واجهات مصادقة المستخدمين (Authentication API)

## 1. نظرة عامة
تدير هذه الواجهات عمليات تسجيل الدخول، تحديث الرمز المميز (Refresh Token)، وتسجيل الخروج. تعتمد على تقنية **JWT (JSON Web Token)**.

## 2. المسارات (Endpoints)

### 2.1. تسجيل الدخول (Login)
- **المسار**: `POST /api/v1/auth/login/`
- **الوصف**: مصادقة المستخدم وإرجاع رمز الوصول (Access Token) ورمز التحديث (Refresh Token). يقبل التعريف بواسطة البريد الإلكتروني أو رقم الجوال أو الرقم القومي عبر حقل `identifier` (أو الحقول القديمة `email`/`phone`/`national_id`).
- **الصلاحيات**: عام (Public).
- **الطلب (Request Body)**:
```json
{
  "identifier": "user@example.com",
  "password": "SecurePassword123!"
}
```
أو:
```json
{
  "identifier": "+249900000001",
  "password": "SecurePassword123!"
}
```

    الاستجابة الناجحة (200 OK):

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
      "user_type": "TRAVELER",
      "role": "PORT_OFFICER",
      "port_id": "uuid"
    }
  }
}

    الاستجابة الخطأ (401):

json

{
  "status": "error",
  "message": "بيانات الدخول غير صحيحة"
}

### 2.1.1. إنشاء حساب جديد (Register)
- **المسار**: `POST /api/v1/auth/register/`
- **الوصف**: إنشاء حساب جديد. أنواع الحسابات: `CITIZEN`, `TRAVELER`, `IMPORTER`, `EXPORTER`, `COMPANY`, `GOVERNMENT`, `MINISTRY_STAFF`. الشركة والجهة الحكومية تتطلبان `organization_name`. يعيد المستخدم تلقائياً مع رموز الوصول (تسجيل دخول فوري).
- **الصلاحيات**: عام (Public).
- **الطلب (Request Body)**:
```json
{
  "full_name": "سارة خالد",
  "email": "sara@example.com",
  "phone": "+249900000001",
  "national_id": "1122334455",
  "user_type": "TRAVELER",
  "organization_name": "",
  "password": "SecurePassword123!",
  "confirm_password": "SecurePassword123!"
}
```
- **الاستجابة الناجحة (201 Created)**: مثل استجابة تسجيل الدخول (رموز + بيانات المستخدم).
- **أخطاء**: `400` عند اختلاف كلمتي المرور، أو نقص `organization_name` للشركة/الجهة الحكومية، أو بريد/جوال مسجل مسبقاً.

2.2. تحديث الرمز المميز (Refresh Token)

    المسار: POST /api/v1/auth/refresh

    الوصف: الحصول على رمز وصول جديد باستخدام رمز التحديث.

    الطلب (Body):

json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

    الاستجابة الناجحة (200):

json

{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 1800
  }
}

2.3. تسجيل الخروج (Logout)

    المسار: POST /api/v1/auth/logout

    الوصف: إبطال رمز التحديث الحالي.

    الصلاحيات: محمي (Authenticated).

    الرأس: Authorization: Bearer <token>

    الاستجابة (204 No Content).

2.4. تغيير كلمة المرور (Change Password)

    المسار: POST /api/v1/auth/change-password

    الوصف: تغيير كلمة مرور المستخدم المسجل الدخول.

    الصلاحيات: محمي.

    الطلب (Body):

json

{
  "old_password": "OldPass123",
  "new_password": "NewPass456!"
}

    الاستجابة (200):

json

{
  "status": "success",
  "message": "تم تغيير كلمة المرور بنجاح"
}

2.5. استرداد كلمة المرور (Forgot Password) - اختياري

    المسار: POST /api/v1/auth/forgot-password

    الطلب (Body): { "email": "user@example.com" }

    الاستجابة (200): إرسال رابط إعادة تعيين إلى البريد الإلكتروني.