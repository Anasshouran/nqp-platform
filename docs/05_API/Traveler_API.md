
---

### 📄 4. Traveler_API.md (واجهات بوابة المسافرين)

```markdown
# واجهات بوابة المسافرين (Traveler Portal API)

## 1. نظرة عامة
تدير هذه الواجهات عملية تسجيل المسافرين المسبق (Pre-registration)، رفع المستندات، وإنشاء رمز QR.

## 2. المسارات (Endpoints)

### 2.1. إنشاء حساب مسافر جديد (Register)
- **المسار**: `POST /api/v1/travelers/register`
- **الوصف**: تسجيل مسافر جديد في النظام قبل السفر.
- **الصلاحيات**: عام.
- **الطلب (Body)**:
```json
{
  "passport_number": "A1234567",
  "first_name": "محمد",
  "last_name": "أحمد",
  "date_of_birth": "1990-05-15",
  "nationality_code": "SD",
  "phone": "+249123456789",
  "email": "mohamed@example.com",
  "medical_history": {
    "diabetes": false,
    "hypertension": true
  }
}

}

    الاستجابة الناجحة (201):

json

{
  "status": "success",
  "data": {
    "id": "uuid",
    "passport_number": "A1234567",
    "status": "PENDING_DOCUMENTS"
  }
}

2.2. رفع المستندات (Upload Documents)

    المسار: POST /api/v1/travelers/{traveler_id}/documents

    الوصف: رفع صورة جواز السفر وشهادات التطعيم.

    الصلاحيات: عام (مع معرف المسافر).

    نوع المحتوى: multipart/form-data.

    الطلب (Form-Data):

        document_type: PASSPORT أو VACCINE

        file: الملف (PDF/JPEG/PNG)

        expiry_date: (اختياري) 2025-12-31

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "document_id": "uuid",
    "file_url": "https://storage.nqp.gov.sd/documents/passport_123.pdf"
  }
}

2.3. الحصول على رمز QR (Get QR Code)

    المسار: GET /api/v1/travelers/{traveler_id}/qr-code

    الوصف: استلام رمز QR الخاص بالمسافر بعد اكتمال التسجيل واعتماد المستندات.

    الصلاحيات: عام (مع معرف المسافر) أو محمي.

    الاستجابة (200):

json

{
  "status": "success",
  "data": {
    "qr_code": "data:image/png;base64,iVBORw0KGgo...",
    "qr_data": {
      "traveler_id": "uuid",
      "passport": "A1234567",
      "issued_at": "2024-07-23T10:00:00Z"
    }
  }
}

2.4. متابعة حالة الطلب (Get Status)

    المسار: GET /api/v1/travelers/{traveler_id}/status

    الوصف: معرفة ما إذا كان التسجيل مكتملاً أم لا.

    الاستجابة (200):

json

{
  "status": "success",
  "data": {
    "registration_status": "COMPLETED", // PENDING_DOCUMENTS, UNDER_REVIEW, COMPLETED, REJECTED
    "qr_code_issued": true,
    "rejection_reason": null
  }
}

2.5. تحديث الملف الصحي (Update Health Profile)

    المسار: PUT /api/v1/travelers/{traveler_id}/profile

    الوصف: تحديث التاريخ الطبي أو معلومات الاتصال.

    الصلاحيات: محمي (المسافر نفسه أو الموظف).

    الطلب (Body): كائن جزئي من traveler object.

---

## 3. مصادقة بوابة المسافرين (Traveler Auth)

### 3.1. تسجيل حساب جديد (Register)
- **المسار**: `POST /api/v1/travelers/auth/register/`
- **الصلاحيات**: عام
- **الطلب (Body)**:
```json
{
  "full_name": "محمد أحمد",
  "email": "traveler@example.com",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123",
  "phone": "+249123456789",
  "passport_number": "A1234567",
  "date_of_birth": "1990-05-15",
  "nationality": "SD"
}
```
- **الحقول الاختيارية**: `phone`, `passport_number`, `date_of_birth`, `nationality`
- **الاستجابة (201)**:
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "email": "traveler@example.com",
      "full_name": "محمد أحمد",
      "phone": "+249123456789",
      "user_type": "TRAVELER",
      "travelers": []
    }
  }
}
```
- **ملاحظات**:
  - إذا كان `passport_number` مسجّلاً مسبقاً بدون `user` → يُربط بالحساب تلقائياً
  - كلمة المرور: ≥ 8 أحرف

### 3.2. تسجيل الدخول (Login)
- **المسار**: `POST /api/v1/travelers/auth/login/`
- **الصلاحيات**: عام (يُرفض لحسابات `user_type=STAFF`)
- **الطلب (Body)**:
```json
{
  "identifier": "traveler@example.com",
  "password": "SecurePass123"
}
```
- **الاستجابة (200)**: نفس شكل تسجيل الدخول (access_token + refresh_token + user)
- **أخطاء**:
  - `400` "بيانات الدخول غير صحيحة" + `remaining_attempts` (عند المحاولة 3+)
  - `400` "تم قفل الحساب مؤقتاً" + `locked: true` (بعد 5 محاولات)
  - `400` "لا يمكن لموظفي النظام تسجيل الدخول من بوابة المسافرين" (لحسابات STAFF)

### 3.3. نسيت كلمة المرور (Forgot Password)
- **المسار**: `POST /api/v1/travelers/auth/forgot-password/`
- **الصلاحيات**: عام
- **الطلب (Body)**:
```json
{ "email": "traveler@example.com" }
```
- **الاستجابة (200)**: دائماً 200 (حتى إذا غير موجود) — يمنع اختبار التخمين:
```json
{ "status": "success", "data": { "detail": "إذا كان البريد مسجّلاً، فستتلقى رسالة خالل دقائق" } }
```

### 3.4. إعادة تعيين كلمة المرور (Reset Password)
- **المسار**: `POST /api/v1/travelers/auth/reset-password/`
- **الصلاحيات**: عام
- **الطلب (Body)**:
```json
{
  "uidb64": "MQ",
  "token": "abc123-def456-...",
  "password": "NewSecurePass",
  "confirm_password": "NewSecurePass"
}
```
- **الاستجابة (200)**: `{ "detail": "تم إعادة تعيين كلمة المرور بنجاح" }`
- **ملاحظة**: يُمسح `failed_login_attempts` و `locked_until`

### 3.5. بياناتي (Me)
- **المسار**: `GET /api/v1/travelers/auth/me/`
- **الصلاحيات**: مصادق عليه (`Bearer token`)
- **الاستجابة (200)**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "traveler@example.com",
    "full_name": "محمد أحمد",
    "phone": "+249123456789",
    "user_type": "TRAVELER",
    "travelers": [
      {
        "id": "uuid",
        "passport_number": "A1234567",
        "full_name": "محمد أحمد",
        "registration_status": "PENDING_DOCUMENTS",
        "nationality": "SD"
      }
    ]
  }
}
```

### 3.6. تحديث بياناتي (Update Me)
- **المسار**: `PATCH /api/v1/travelers/auth/me/`
- **الصلاحيات**: مصادق عليه
- **الطلب (Body)**: أي من الحقول: `full_name`, `email`, `phone`, `password`, `confirm_password`