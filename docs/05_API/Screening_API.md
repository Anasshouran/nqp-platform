
---

### 📄 5. Screening_API.md (واجهات الفحص والتقييم)

```markdown
# واجهات الفحص الصحي وتقييم المخاطر (Screening & Risk API)

## 1. نظرة عامة
تُستخدم هذه الواجهات من قبل **بوابة موظفي الحجر (4)** و **غرفة الطوارئ (9)**. تدير عملية مسح QR، إدخال القراءات، وتصنيف المخاطر.

## 2. المسارات (Endpoints)

### 2.1. مسح رمز QR (Scan QR)
- **المسار**: `POST /api/v1/screening/scan-qr`
- **الوصف**: البحث عن مسافر باستخدام بيانات الـ QR (المعرف المشفر).
- **الصلاحيات**: محمي (PORT_OFFICER, EOC_OPERATOR).
- **الطلب (Body)**:
```json
{
  "qr_data": "uuid_or_encrypted_string"
}

    الاستجابة (200):

json

{
  "status": "success",
  "data": {
    "traveler": {
      "id": "uuid",
      "full_name": "محمد أحمد",
      "passport_number": "A1234567",
      "nationality": "السودان",
      "documents_verified": true
    },
    "pre_registration": {
      "symptoms": ["cough", "fever"],
      "travel_history": ["CountryX", "CountryY"]
    }
  }
}

2.2. إدخال الفحص الظاهري (Submit Screening)

    المسار: POST /api/v1/screening

    الوصف: تسجيل قراءات الفحص الظاهري وإطلاق عملية تقييم المخاطر.

    الصلاحيات: محمي (PORT_OFFICER).

    الطلب (Body):

json

{
  "traveler_id": "uuid",
  "port_id": "uuid",
  "body_temperature": 38.5,
  "oxygen_saturation": 95,
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "observed_symptoms": ["cough", "headache"],
  "officer_notes": "المسافر يبدو عليه التعب"
}

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "screening_id": "uuid",
    "risk_assessment": {
      "level": "YELLOW",
      "score": 65.5,
      "recommendation": "REFER_TO_CLINIC",
      "factors": {
        "origin_risk": 40,
        "symptoms_risk": 85,
        "vitals_risk": 50
      }
    }
  }
}

2.3. الحصول على تقييم المخاطر لمسافر (Get Risk Assessment)

    المسار: GET /api/v1/screening/{traveler_id}/latest-risk

    الوصف: استرجاع آخر تقييم مخاطر لمسافر معين.

    الصلاحيات: محمي (PORT_OFFICER, DOCTOR, EOC_OPERATOR).

2.4. إحالة المسافر للعيادة (Refer to Clinic)

    المسار: POST /api/v1/screening/{screening_id}/refer

    الوصف: إرسال المسافر إلكترونياً إلى بوابة العيادات.

    الصلاحيات: محمي (PORT_OFFICER).

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "referral_id": "uuid",
    "clinic_visit_url": "/api/v1/clinic/referrals/{referral_id}"
  }
}

2.5. إنذار الطوارئ (Trigger Emergency Alert) - داخلي

    المسار: POST /api/v1/screening/alert

    الوصف: (يُستدعى تلقائياً من Risk Engine) إرسال إنذار أحمر لغرفة الطوارئ.

    الصلاحيات: نظام (Service-to-Service).