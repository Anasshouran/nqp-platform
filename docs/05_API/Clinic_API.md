
---

### 📄 6. Clinic_API.md (واجهات العيادات)

```markdown
# واجهات بوابة العيادات (Clinic Portal API)

## 1. نظرة عامة
تدير هذه الواجهات السجل الطبي الإلكتروني (EMR)، الإحالات، الوصفات الطبية، وطلبات المختبر.

## 2. المسارات (Endpoints)

### 2.1. قائمة الإحالات الواردة (List Referrals)
- **المسار**: `GET /api/v1/clinic/referrals`
- **الوصف**: عرض جميع الإحالات القادمة من بوابة الفحص.
- **الصلاحيات**: محمي (DOCTOR).
- **معاملات التصفية (Query Params)**: `status=PENDING|IN_PROGRESS|COMPLETED`, `port_id`.
- **الاستجابة (200)**: قائمة مرقمة من الإحالات.

### 2.2. استقبال الإحالة (Accept Referral)
- **المسار**: `POST /api/v1/clinic/referrals/{referral_id}/accept`
- **الوصف**: يقوم الطبيب بقبول الإحالة وتحويلها إلى زيارة عيادة نشطة.

### 2.3. إنشاء السجل الطبي الإلكتروني (Create EMR)
- **المسار**: `POST /api/v1/clinic/visits/{visit_id}/emr`
- **الوصف**: تسجيل الفحص السريري والتشخيص.
- **الصلاحيات**: محمي (DOCTOR).
- **الطلب (Body)**:
```json
{
  "clinical_notes": {
    "diagnosis": "اشتباه بالتهاب رئوي فيروسي",
    "severity": "MODERATE"
  },
  "vital_signs": {
    "heart_rate": 88,
    "respiratory_rate": 22
  },
  "physical_exam": {
    "chest_auscultation": "أصوات تنفسية خشنة",
    "throat": "احمرار"
  }
}
    الاستجابة (201):

json

{
  "status": "success",
  "data": { "emr_id": "uuid" }
}

2.4. طلب فحص مخبري (Request Lab)

    المسار: POST /api/v1/clinic/visits/{visit_id}/lab-requests

    الوصف: إرسال طلب عينة مخبرية.

    الصلاحيات: محمي (DOCTOR).

    الطلب (Body):

json

{
  "sample_type": "SWAB",
  "disease_code": "RA01", // COVID-19 حسب ICD-11
  "priority": "HIGH"
}

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "sample_id": "uuid",
    "barcode": "LAB-2024-0001"
  }
}

2.5. وصف دواء (Prescribe Medication)

    المسار: POST /api/v1/clinic/visits/{visit_id}/prescriptions

    الوصف: وصف دواء للمريض مع جدول الجرعات.

    الصلاحيات: محمي (DOCTOR).

    الطلب (Body):

json

{
  "medication_id": "uuid",
  "dosage": "500mg",
  "frequency": "EVERY_8_HOURS",
  "duration_days": 7,
  "instructions": "يؤخذ بعد الأكل"
}

2.6. إصدار تقرير طبي (Close Visit)

    المسار: POST /api/v1/clinic/visits/{visit_id}/close

    الوصف: إغلاق الزيارة وإصدار التقرير الطبي النهائي (إما بالإفراج أو الإحالة للمستشفى).