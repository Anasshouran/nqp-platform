
---

### 📄 3. `03_Disease_API.md` (واجهات برمجة نظام الأمراض)

```markdown
# 03_Disease_API - واجهات نظام إدارة الأمراض (Django REST Framework)

## 1. نظرة عامة (Base URL)
`/api/v1/diseases/`

## 2. نقاط النهاية (Endpoints)

### 2.1. قائمة الأمراض (مع تصفية)
- **المسار**: `GET /`
- **الصلاحيات**: محمي (قراءة للجميع، كتابة للمسؤولين الصحيين).
- **معاملات التصفية**: `?icd_code=RA01`, `?name_ar=كوفيد`, `?ihr_category=PHEIC`.
- **الاستجابة (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "icd_11_code": "RA01",
      "name_ar": "كوفيد-19",
      "name_en": "COVID-19",
      "symptoms": ["fever", "cough"],
      "is_public_health_emergency": true
    }
  ]
}

إنشاء مرض جديد (للمسؤولين الصحيين فقط)

    المسار: POST /

    الصلاحيات: محمي (HEALTH_ADMIN, SUPER_ADMIN).

    الطلب (Body):

json

{
  "icd_11_code": "RA01",
  "name_ar": "كوفيد-19",
  "name_en": "COVID-19",
  "description": "مرض فيروسي تنفسي حاد",
  "symptoms": ["fever", "cough", "shortness_of_breath"],
  "incubation_period_min": 2,
  "incubation_period_max": 14,
  "transmission_methods": ["airborne", "contact"],
  "is_public_health_emergency": true,
  "ihr_category": "PHEIC"
}

2.3. تحديث بيانات مرض (للمسؤولين الصحيين)

    المسار: PUT /{id}/

    الصلاحيات: محمي (HEALTH_ADMIN, SUPER_ADMIN).

2.4. إدارة تعريفات الحالات (Case Definitions)

    GET /diseases/{id}/case-definitions/ - عرض تعريفات الحالات لمرض معين.

    POST /diseases/{id}/case-definitions/ - إضافة تعريف حالة جديد (SUSPECTED, PROBABLE, CONFIRMED).

json

{
  "case_type": "CONFIRMED",
  "clinical_criteria": {"fever": true, "cough": true},
  "lab_criteria": {"pcr_positive": true},
  "epidemiological_criteria": {"exposure_to_confirmed": true}
}

2.5. إدارة البروتوكولات العلاجية

    GET /diseases/{id}/protocols/ - عرض البروتوكولات المتاحة.

    POST /diseases/{id}/protocols/ - إضافة بروتوكول جديد.

json

{
  "name": "بروتوكول كوفيد-19 للبالغين",
  "severity_level": "MODERATE",
  "medications": [
    {"name": "باراسيتامول", "dosage": "500mg", "frequency": "EVERY_6_HOURS", "duration": 5},
    {"name": "مضاد فيروسي", "dosage": "200mg", "frequency": "TWICE_DAILY", "duration": 7}
  ],
  "supportive_care": ["أكسجين عند الحاجة", "سوائل وريدية"],
  "duration_days": 7
}

2.6. تصدير بيانات الأمراض بصيغة ICD-11 (للتكامل مع WHO)

    المسار: GET /export/icd11/

    الصلاحيات: محمي (IHR_FOCAL_POINT, ADMIN).

    الاستجابة: ملف JSON أو XML بتنسيق ICD-11.

2.7. استيراد تحديثات ICD-11 من منظمة الصحة العالمية

    المسار: POST /import/icd11/

    الصلاحيات: محمي (HEALTH_ADMIN, SUPER_ADMIN).

    الطلب (Body): ملف ICD-11 (XML/JSON).

    الاستجابة: ملخص للتغييرات المطبقة (عدد الأمراض المُضافة، المُعدّلة، المُلغاة).

2.8. سجل التغييرات (Audit Log - للمسؤولين فقط)

    المسار: GET /updates/

    الصلاحيات: محمي (HEALTH_ADMIN, SUPER_ADMIN).

    معاملات التصفية: ?disease_id=uuid, ?update_type=PROTOCOL.

