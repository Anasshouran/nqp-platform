
---

### 📄 4. `Disease_Codes.md` (رموز الأمراض - ICD-11)

```markdown
# رموز الأمراض (Disease Codes) - ICD-11

## 1. نظرة عامة
هذه القائمة تحتوي على رموز الأمراض حسب التصنيف الدولي للأمراض (ICD-11) المستخدم في منصة NQP. تُستخدم هذه الرموز في التشخيصات الطبية، التقارير الوبائية، والتكامل مع منظمة الصحة العالمية.

## 2. تنسيق الرموز
- **ICD-11 Code**: رمز يتكون من حروف وأرقام (مثل: `RA01` لكوفيد-19).
- **الهيكل الهرمي**: الفصول (Chapters) ← الفئات (Categories) ← الأكواد (Codes).

## 3. قائمة الأمراض الأساسية

| ICD-11 Code | الاسم العربي | الاسم الإنجليزي | الفئة | PHEIC |
| :--- | :--- | :--- | :--- | :--- |
| **RA01** | كوفيد-19 | COVID-19 | أمراض تنفسية | ✅ نعم |
| **1B50** | الكوليرا | Cholera | أمراض معوية | ✅ نعم |
| **1G00** | حمى الضنك | Dengue fever | أمراض فيروسية | ❌ لا |
| **1G05** | حمى الوادي المتصدع | Rift Valley fever | أمراض فيروسية | ❌ لا |
| **1D45** | الإيبولا | Ebola | أمراض فيروسية | ✅ نعم |
| **1D48** | حمى لاسا | Lassa fever | أمراض فيروسية | ✅ نعم |
| **1D60** | فيروس ماربورغ | Marburg virus | أمراض فيروسية | ✅ نعم |
| **1D63** | جدري القرود | Monkeypox | أمراض فيروسية | ✅ نعم |
| **1D71** | الحصبة | Measles | أمراض فيروسية | ❌ لا |
| **1D80** | شلل الأطفال | Poliomyelitis | أمراض فيروسية | ✅ نعم |
| **1D82** | الحصبة الألمانية | Rubella | أمراض فيروسية | ❌ لا |
| **1E50** | الملاريا | Malaria | أمراض طفيلية | ❌ لا |
| **1E52** | حمى التيفوئيد | Typhoid fever | أمراض بكتيرية | ❌ لا |
| **1E53** | السل | Tuberculosis | أمراض بكتيرية | ❌ لا |
| **1E54** | الجذام | Leprosy | أمراض بكتيرية | ❌ لا |
| **1E55** | الطاعون | Plague | أمراض بكتيرية | ✅ نعم |
| **1E56** | الجمرة الخبيثة | Anthrax | أمراض بكتيرية | ❌ لا |
| **1E57** | الكزاز | Tetanus | أمراض بكتيرية | ❌ لا |
| **1E58** | السعال الديكي | Pertussis | أمراض بكتيرية | ❌ لا |
| **1E59** | الخناق | Diphtheria | أمراض بكتيرية | ❌ لا |
| **1E60** | الالتهاب السحائي | Meningitis | أمراض بكتيرية | ❌ لا |
| **1E61** | داء البريميات | Leptospirosis | أمراض بكتيرية | ❌ لا |
| **1E62** | داء البروسيلات | Brucellosis | أمراض بكتيرية | ❌ لا |
| **1E63** | التيفوس | Typhus | أمراض بكتيرية | ❌ لا |
| **1E64** | الحمى الصفراء | Yellow fever | أمراض فيروسية | ✅ نعم |
| **1E65** | فيروس زيكا | Zika virus | أمراض فيروسية | ❌ لا |
| **1E66** | فيروس غرب النيل | West Nile virus | أمراض فيروسية | ❌ لا |
| **1E67** | التهاب الدماغ الياباني | Japanese encephalitis | أمراض فيروسية | ❌ لا |

## 4. الأمراض المدرجة في قائمة IHR (PHEIC)
| المرض | ICD-11 Code | متطلب الإبلاغ |
| :--- | :--- | :--- |
| كوفيد-19 | RA01 | فوري |
| الكوليرا | 1B50 | فوري |
| الإيبولا | 1D45 | فوري |
| حمى لاسا | 1D48 | فوري |
| فيروس ماربورغ | 1D60 | فوري |
| جدري القرود | 1D63 | فوري |
| شلل الأطفال | 1D80 | فوري |
| الطاعون | 1E55 | فوري |
| الحمى الصفراء | 1E64 | فوري |

## 5. تحديث البيانات
- **التكرار**: تحديث رموز الأمراض عند إصدار تحديثات جديدة من WHO.
- **المسؤول**: مسؤول النظام (الفريق الطبي) عبر Django Admin.
- **المزامنة التلقائية**: يمكن مزامنة الرموز تلقائياً مع منظمة الصحة العالمية عبر (Celery Beat).

## 6. استخدام الرموز في Django
```python
# apps/diseases/models.py
from django.db import models

class Disease(models.Model):
    icd_11_code = models.CharField(max_length=20, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    symptoms = models.JSONField(default=list)
    incubation_period_min = models.IntegerField(null=True, blank=True)
    incubation_period_max = models.IntegerField(null=True, blank=True)
    treatment_protocol = models.JSONField(default=dict)
    is_public_health_emergency = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

7. مراجع

    ICD-11: WHO ICD-11.

    قائمة PHEIC: WHO PHEIC.