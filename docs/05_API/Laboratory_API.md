
---

### 📄 7. Laboratory_API.md (واجهات المختبرات)

```markdown
# واجهات بوابة المختبرات (Laboratory Portal API)

## 1. نظرة عامة
تدير هذه الواجهات دورة حياة العينة المخبرية بالكامل، من التسجيل إلى اعتماد النتيجة.

## 2. المسارات (Endpoints)

### 2.1. تسجيل عينة جديدة (Register Sample)
- **المسار**: `POST /api/v1/lab/samples`
- **الوصف**: تسجيل عينة واردة من العيادة (أو من الفحص المباشر).
- **الصلاحيات**: محمي (LAB_TECH).
- **الطلب (Body)**:
```json
{
  "visit_id": "uuid",
  "sample_type": "SWAB",
  "disease_id": "uuid",
  "collector_id": "uuid"
}
    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "sample_id": "uuid",
    "sample_barcode": "LAB-2024-0001",
    "status": "REGISTERED"
  }
}

2.2. تتبع العينة (Track Sample)

    المسار: GET /api/v1/lab/samples/{sample_id}/track

    الوصف: عرض حالة العينة (مسجلة، قيد التحليل، مكتملة).

    الصلاحيات: محمي (LAB_TECH, DOCTOR).

2.3. تحديث حالة العينة (Update Sample Status)

    المسار: PATCH /api/v1/lab/samples/{sample_id}/status

    الوصف: تغيير حالة العينة إلى (PROCESSING أو COMPLETED).

    الصلاحيات: محمي (LAB_TECH).

2.4. إدخال نتيجة الفحص (Enter Result)

    المسار: POST /api/v1/lab/samples/{sample_id}/results

    الوصف: إدخال النتيجة المخبرية (قبل الاعتماد).

    الصلاحيات: محمي (LAB_TECH).

    الطلب (Body):

json

{
  "disease_id": "uuid",
  "result": "POSITIVE",
  "value": 32.5 // Ct value for PCR
}

2.5. اعتماد النتيجة (Approve Result)

    المسار: POST /api/v1/lab/samples/{sample_id}/approve

    الوصف: اعتماد النتيجة من قبل المشرف المخبري.

    الصلاحيات: محمي (LAB_SUPERVISOR).

    الاستجابة الناجحة (200): يتم إرسال النتيجة تلقائياً إلى:

        Clinic Portal (لتحديث حالة المريض).

        Surveillance System (لتغذية الترصد الوبائي).

        EOC (إذا كانت النتيجة إيجابية لمرض خطير).