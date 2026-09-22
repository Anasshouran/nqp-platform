
---

### 📄 5. `FHIR.md` (معيار FHIR لتبادل البيانات الصحية)

```markdown
# FHIR - Fast Healthcare Interoperability Resources

## 1. نظرة عامة
FHIR (Fast Healthcare Interoperability Resources) هو معيار دولي لتبادل البيانات الصحية الإلكترونية طورته منظمة الصحة العالمية بالتعاون مع HL7. يوفر FHIR مجموعة من "الموارد" (Resources) التي تمثل المفاهيم الصحية الأساسية (المريض، الملاحظة، الحالة، الوصفة، إلخ) بتنسيق JSON أو XML.

## 2. موارد FHIR المستخدمة في NQP
| مورد FHIR | الوصف | نموذج Django المقابل |
| :--- | :--- | :--- |
| **Patient** | بيانات المريض الأساسية (الاسم، رقم الجواز، تاريخ الميلاد). | `travelers.Traveler` |
| **Observation** | الملاحظات السريرية (الحرارة، SpO2، الأعراض، نتائج المختبر). | `screening.HealthScreening`, `laboratory.LabResult` |
| **Condition** | التشخيص الطبي (الحالة المرضية). | `clinic.ClinicVisit` (حقل `diagnosis`) |
| **Immunization** | التطعيمات التي تلقاها المريض. | `travelers.Vaccination` (من بوابة المسافرين) |
| **DiagnosticReport** | تقرير المختبر الشامل. | `laboratory.LabResult` (بعد الاعتماد) |
| **Encounter** | زيارة المريض للعيادة أو الحجر الصحي. | `clinic.ClinicVisit` |

## 3. تحويل نماذج Django إلى FHIR Resources
يتم استخدام **Serializers مخصصة** في Django REST Framework لتحويل نماذج المنصة إلى صيغة FHIR JSON.

**مثال: تحويل `Traveler` إلى `Patient` FHIR**
```python
# apps/who/serializers/fhir_serializers.py
from fhir.resources.patient import Patient
from fhir.resources.humanname import HumanName

def traveler_to_fhir_patient(traveler):
    patient = Patient.construct()
    patient.id = str(traveler.id)
    patient.name = [HumanName.construct(
        family=traveler.last_name,
        given=[traveler.first_name]
    )]
    patient.birthDate = traveler.date_of_birth.isoformat()
    # ... إضافة الجنس والجنسية
    return patient.as_json()

4. نقاط النهاية FHIR في NQP

توفر المنصة نقاط نهاية FHIR لاستخدامها من قبل الأنظمة الخارجية (مثل وزارة الصحة أو WHO) لجلب البيانات الصحية مباشرة.
الطريقة	المسار	الوصف
GET	/api/v1/fhir/Patient/{id}	استرجاع بيانات مريض بتنسيق FHIR.
GET	/api/v1/fhir/Patient?identifier={passport}	البحث عن مريض برقم جواز السفر.
GET	/api/v1/fhir/Observation?patient={id}	استرجاع ملاحظات (فحوصات ونتائج) مريض معين.
GET	/api/v1/fhir/Condition?patient={id}	استرجاع تشخيصات مريض معين.
POST	/api/v1/fhir/DiagnosticReport	استقبال تقرير مختبر من نظام خارجي (مستقبلي).
5. المصادقة على نقاط نهاية FHIR

    تُستخدم نفس آلية المصادقة (JWT) المطبقة في باقي نقاط نهاية المنصة.

    بالإضافة إلى ذلك، يمكن استخدام API Key للمستخدمين من نوع SYSTEM (للأنظمة الخارجية).

6. اختبار FHIR

    يمكن اختبار نقاط النهاية FHIR باستخدام أدوات مثل (Postman) أو (curl).

    مثال: curl -H "Authorization: Bearer <jwt>" https://nqp.gov.sd/api/v1/fhir/Patient/123e4567