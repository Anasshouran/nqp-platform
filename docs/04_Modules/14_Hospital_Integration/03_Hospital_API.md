
---

### 📄 3. `03_Hospital_API.md` (واجهات برمجة نظام المستشفيات)

```markdown
# 03_Hospital_API - واجهات نظام المستشفيات (Django REST Framework)

## 1. نظرة عامة (Base URL)
`/api/v1/hospital/`

## 2. نقاط النهاية (Endpoints)

### 2.1. إنشاء إحالة جديدة (Create Referral)
- **المسار**: `POST /referrals/`
- **الصلاحيات**: محمي (DOCTOR, EOC_OPERATOR).
- **الطلب (Body)**:
```json
{
  "traveler_id": "uuid",
  "clinic_visit_id": "uuid",
  "hospital_id": "uuid",
  "department": "العناية المركزة",
  "priority": "CRITICAL",
  "reason": "فشل تنفسي حاد، يحتاج إلى جهاز تنفس صناعي",
  "clinical_summary": {
    "diagnosis": "الالتهاب الرئوي الحاد",
    "vitals": { "temp": 39.5, "spo2": 88 },
    "lab_results": [{ "test": "PCR", "result": "POSITIVE" }]
  },
  "attachments": ["https://storage.nqp.gov.sd/docs/ct_scan_123.pdf"]
}

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "referral_id": "uuid",
    "status": "PENDING",
    "external_reference_id": null,
    "message": "تم إنشاء الإحالة وإرسالها إلى المستشفى."
  }
}

2.2. تحديث حالة الإحالة (من المستشفى - Webhook/API)

    المسار: POST /referrals/{id}/update/

    الصلاحيات: محمي (HOSPITAL_SYSTEM - عبر مفتاح API خاص).

    الطلب (Body):

json

{
  "status": "ACCEPTED",
  "note": "تم قبول المريض في قسم العناية المركزة",
  "performed_by": "د. خالد (مستشفى الخرطوم)",
  "external_reference_id": "HOS-2024-001"
}

    الاستجابة (200):

json

{
  "status": "success",
  "message": "تم تحديث حالة الإحالة."
}

2.3. الحصول على حالة الإحالة (للعيادة)

    المسار: GET /referrals/{id}/status/

    الصلاحيات: محمي (DOCTOR, ADMIN).

    الاستجابة (200):

json

{
  "status": "success",
  "data": {
    "referral_id": "uuid",
    "current_status": "IN_TREATMENT",
    "history": [
      { "status": "PENDING", "note": "بانتظار المراجعة", "created_at": "2024-07-23T10:00:00Z" },
      { "status": "ACCEPTED", "note": "تم القبول", "created_at": "2024-07-23T11:00:00Z" }
    ]
  }
}

2.4. استلام تقرير طبي من المستشفى (Upload Medical Report)

    المسار: POST /referrals/{id}/reports/

    الصلاحيات: محمي (HOSPITAL_SYSTEM - عبر مفتاح API خاص).

    نوع المحتوى: multipart/form-data

    الطلب (Form-Data):

        report_type: DISCHARGE_SUMMARY

        file: (ملف PDF/Word).

    الاستجابة (201):

json

{
  "status": "success",
  "message": "تم استلام التقرير الطبي بنجاح.",
  "data": { "report_id": "uuid", "file_url": "https://storage.nqp.gov.sd/reports/..." }
}

2.5. عرض التقارير الطبية المستلمة (للعِيادة)

    المسار: GET /referrals/{id}/reports/

    الصلاحيات: محمي (DOCTOR, ADMIN).

    الاستجابة (200):

json

{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "type": "DISCHARGE_SUMMARY",
      "file_url": "https://...",
      "received_at": "2024-07-25T14:00:00Z",
      "reviewed": false
    }
  ]
}

2.6. مراجعة التقرير من قبل الطبيب (Mark as Reviewed)

    المسار: POST /reports/{id}/review/

    الصلاحيات: محمي (DOCTOR).

    الاستجابة (200):

json

{
  "status": "success",
  "message": "تم اعتماد التقرير وربطه بملف المريض."
}

2.7. قائمة الإحالات (مع تصفية للعيادة)

    المسار: GET /referrals/?status=PENDING&priority=CRITICAL

    الصلاحيات: محمي (DOCTOR, ADMIN).

    معاملات التصفية: status, priority, hospital_id, from_date, to_date.

    الاستجابة (200): قائمة مرقمة بالإحالات.

3. معايير الاستجابة للخطأ (Error Codes)
الكود	الوصف	الموقف
400	طلب غير صحيح	بيانات ناقصة أو تنسيق خاطئ.
404	الإحالة غير موجودة	تم إرسال معرف غير صحيح.
403	صلاحية غير كافية	محاولة تحديث إحالة من قبل جهة غير مصرح لها.
409	تعارض	محاولة تحديث إحالة مغلقة بالفعل (DISCHARGED/CANCELLED).