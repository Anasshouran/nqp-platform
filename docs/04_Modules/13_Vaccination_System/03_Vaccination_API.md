
---

### 📄 3. `03_Vaccination_API.md` (واجهات برمجة نظام التطعيم)

```markdown
# 03_Vaccination_API - واجهات نظام التطعيم (Django REST Framework)

## 1. نظرة عامة (Base URL)
`/api/v1/vaccinations/`

## 2. نقاط النهاية (Endpoints)

### 2.1. رفع شهادة تطعيم جديدة (Upload Certificate)
- **المسار**: `POST /certificates/`
- **الصلاحيات**: محمي (المسافر نفسه أو مسؤول).
- **نوع المحتوى**: `multipart/form-data`
- **الطلب (Body)**:
```json
{
  "traveler_id": "uuid",
  "disease_id": "uuid",
  "vaccine_name": "Pfizer-BioNTech",
  "batch_number": "ABC123",
  "dose_number": 2,
  "dose_date": "2024-07-01",
  "issuing_country": "SD",
  "issuing_authority": "وزارة الصحة السودانية",
  "file": "(binary file image/pdf)"
}

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "certificate_id": "uuid",
    "verification_status": "PENDING",
    "message": "تم رفع الشهادة. سيتم التحقق منها خلال 24 ساعة."
  }
}

2.2. التحقق من صحة شهادة (Verify Certificate)

    المسار: POST /certificates/{id}/verify/

    الصلاحيات: محمي (PORT_OFFICER, DOCTOR, ADMIN).

    الطلب (Body):

json

{
  "verification_status": "VERIFIED",  // أو "REJECTED"
  "rejection_reason": "انتهت صلاحية الشهادة"  // (اختياري)
}

    الاستجابة (200):

json

{
  "status": "success",
  "message": "تم التحقق من الشهادة بنجاح.",
  "data": {
    "is_valid": true,
    "expiry_date": "2025-01-01"
  }
}

2.3. الحصول على سجل تطعيمات مسافر (Get Traveler Vaccination Record)

    المسار: GET /travelers/{traveler_id}/certificates/

    الصلاحيات: محمي (المسافر نفسه، الأطباء، المسؤولين).

    الاستجابة (200):

json

{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "disease": "كوفيد-19",
      "vaccine_name": "Pfizer-BioNTech",
      "dose_number": 1,
      "dose_date": "2024-06-01",
      "verification_status": "VERIFIED"
    },
    {
      "id": "uuid",
      "disease": "كوفيد-19",
      "vaccine_name": "Pfizer-BioNTech",
      "dose_number": 2,
      "dose_date": "2024-07-01",
      "verification_status": "VERIFIED"
    }
  ]
}

2.4. مسح QR Code وتحقق فوري (Scan QR)

    المسار: POST /scan-qr/

    الصلاحيات: محمي (PORT_OFFICER).

    الطلب (Body):

json

{
  "qr_code_data": "encrypted_base64_string"
}

    الاستجابة (200):

json

{
  "status": "success",
  "data": {
    "traveler": { "id": "uuid", "full_name": "محمد أحمد" },
    "vaccination_summary": {
      "is_fully_vaccinated": true,
      "last_dose_date": "2024-07-01",
      "valid_until": "2025-01-01"
    },
    "verification_result": "VALID"
  }
}

2.5. تحديث بيانات التطعيم (Update Certificate - لمسؤول/طبيب)

    المسار: PUT /certificates/{id}/

    الصلاحيات: محمي (DOCTOR, ADMIN).

    الطلب (Body): (كائن جزئي لتحديث الحقول المطلوبة)

json

{
  "dose_date": "2024-07-02",
  "batch_number": "XYZ789"
}

    الاستجابة (200): إرجاع البيانات المُحدّثة مع تسجيل التعديل في vaccination_logs.

3. معايير الاستجابة للخطأ (Error Codes)
الكود	الوصف	الموقف
400	طلب غير صحيح	تنسيق التاريخ خاطئ، أو الملف غير مدعوم.
404	الشهادة غير موجودة	تم إرسال معرف غير صحيح.
403	صلاحية غير كافية	محاولة تحديث شهادة دون صلاحية.
409	تعارض	محاولة رفع شهادة بنفس الـ QR Hash الموجود سابقاً.
