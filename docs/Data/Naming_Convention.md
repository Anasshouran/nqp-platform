
---

### 📄 8. `Naming_Convention.md` (اصطلاحات التسمية)

```markdown
# اصطلاحات التسمية (Naming Convention) - NQP

## 1. الهدف
توحيد اصطلاحات التسمية المستخدمة في جميع أنحاء المنصة (البيانات، الرموز، الحقول، الملفات) لضمان الاتساق وسهولة الفهم والصيانة.

## 2. اصطلاحات تسمية الحقول (Field Names)

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **المفاتيح الأساسية** | `id` | `id` | استخدام UUID. |
| **الرموز (Codes)** | `{name}_code` | `passport_code` | استخدام (snake_case). |
| **الأسماء العربية** | `{name}_ar` | `full_name_ar` | استخدام (snake_case). |
| **الأسماء الإنجليزية** | `{name}_en` | `full_name_en` | استخدام (snake_case). |
| **التواريخ** | `{action}_at` | `created_at` | استخدام (snake_case). |
| **الحالات (Status)** | `status` | `status` | استخدام (snake_case). |
| **المفاتيح الخارجية** | `{table}_id` | `traveler_id` | استخدام (snake_case). |
| **البيانات المنطقية** | `is_{adjective}` | `is_active` | استخدام (snake_case). |
| **البيانات JSON** | `{name}_data` | `clinical_notes` | استخدام (snake_case). |

## 3. اصطلاحات تسمية الرموز (Codes)

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **رموز الدول** | حرفان كبيران | `SD` | حسب ISO 3166-1. |
| **رموز المطارات** | ثلاثة أحرف كبيرة | `KRT` | حسب IATA. |
| **رموز الأمراض** | حروف وأرقام | `RA01` | حسب ICD-11. |
| **رموز الفحوصات** | حروف كبيرة | `PCR` | اختصارات معروفة. |
| **رموز الحالات** | حروف كبيرة | `ACTIVE` | استخدام (UPPER_SNAKE_CASE). |

## 4. اصطلاحات تسمية الملفات

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **ملفات Python** | `snake_case.py` | `traveler_serializers.py` | - |
| **ملفات React** | `PascalCase.tsx` | `TravelerForm.tsx` | - |
| **ملفات CSS** | `kebab-case.css` | `traveler-form.css` | - |
| **ملفات الصور** | `kebab-case.png` | `hero-bg.png` | - |
| **ملفات التوثيق** | `PascalCase.md` | `Traveler_API.md` | - |
| **ملفات البيانات** | `UPPER_SNAKE_CASE.json` | `COUNTRY_CODES.json` | - |

## 5. اصطلاحات تسمية الجداول (Database Tables)

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **جداول البيانات** | `snake_case` (جمع) | `travelers` | - |
| **جداول الربط** | `{table1}_{table2}` | `user_roles` | - |
| **جداول السجلات** | `{action}_logs` | `audit_logs` | - |

## 6. اصطلاحات تسمية المتغيرات في الكود

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **Python Variables** | `snake_case` | `traveler_id` | - |
| **Python Functions** | `snake_case` | `get_traveler_by_id()` | - |
| **Python Classes** | `PascalCase` | `TravelerService` | - |
| **TypeScript Variables** | `camelCase` | `travelerId` | - |
| **TypeScript Functions** | `camelCase` | `getTravelerById()` | - |
| **TypeScript Interfaces** | `PascalCase` | `Traveler` | - |
| **TypeScript Types** | `PascalCase` | `RiskLevel` | - |
| **React Components** | `PascalCase` | `TravelerForm` | - |

## 7. اصطلاحات تسمية واجهات API

| النوع | الاصطلاح | مثال | الملاحظات |
| :--- | :--- | :--- | :--- |
| **نقاط النهاية** | `kebab-case` | `/api/v1/travelers/search` | - |
| **معاملات الطلب** | `camelCase` | `?travelerId=123` | - |
| **حقول الاستجابة** | `camelCase` | `{ "passportNumber": "A1234567" }` | - |

## 8. أمثلة تطبيقية

### 8.1. مثال على نموذج Django
```python
class Traveler(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    passport_number = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    nationality = models.ForeignKey(Country, on_delete=models.PROTECT)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    medical_history = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


8.2. مثال على واجهة TypeScript
interface Traveler {
  id: string;
  passportNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: Country;
  phone: string;
  email: string | null;
  medicalHistory: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

9. مراجع

    PEP 8: دليل تنسيق Python. (https://peps.python.org/pep-0008/).

    Google Style Guide: دليل تنسيق TypeScript.