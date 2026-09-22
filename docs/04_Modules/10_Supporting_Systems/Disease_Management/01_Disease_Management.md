
# 01_Disease_Management - نظام إدارة الأمراض والبروتوكولات

## 1. الهدف الاستراتيجي
تحويل المعرفة الطبية (المنشورة في نشرات وزارة الصحة ومنظمة الصحة العالمية) إلى 
**قواعد بيانات رقمية مفهومة آلياً** (Machine-readable) 
باستخدام Django ORM، لتوحيد اللغة التشخيصية بين جميع الأطباء والمختبرات في المنصة، ولتمكين نظام التقييم من اتخاذ القرارات الصحيحة.

## 2. المكونات الرئيسية
| المكون | الوظيفة | البيانات المرجعية المستخدمة | التنفيذ في Django |
| :---     | :---                 | :---   | :---         |

| **كتالوج الأمراض** | قائمة بجميع الأمراض الخاضعة للرقابة الصحية الدولية. | ICD-11 (التصنيف الدولي للأمراض) | Model `Disease` مع حقل `icd_11_code` |

| **تعريف الحالة (Case Definition)** | معايير دقيقة لتحديد (حالة مشتبهة، محتملة، مؤكدة) بناءً على الأعراض والنتائج المخبرية. | إرشادات منظمة الصحة العالمية (WHO Guidelines) | JSONField `case_definition_criteria` |

| **بروتوكولات العلاج** | خطط علاجية موحدة (الأدوية، الجرعات، مدة العلاج) مرتبطة بكل مرض. | دليل وزارة الصحة الوطني | JSONField `treatment_protocol` |

| **قاعدة الأدوية (Formulary)** | قاعدة بيانات بالأدوية المعتمدة، مع تفاصيل عن التداخلات الدوائية (Drug-Drug Interactions). | مصادر دوائية معتمدة (مثل: Micromedex) | Model `Medication` مع ManyToMany `interactions` |

| **محرك الاستدلال (Inference Engine)** | منطق برمجي يقوم بمقارنة أعراض المريض المُدخلة مع "تعريف الحالة" لتقديم اقتراح تشخيصي مبدئي للطبيب. | خوارزميات مطابقة الأعراض (Symptom Matching) | Service `DiseaseSuggestionService` |

## 3. نماذج Django الأساسية (Core Models)
```python
# apps/disease_management/models.py
from django.db import models

class Disease(models.Model):
    icd_11_code = models.CharField(max_length=20, unique=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    symptoms = models.JSONField(default=list)  # ["fever", "cough"]
    incubation_period_min = models.IntegerField(null=True)
    incubation_period_max = models.IntegerField(null=True)
    treatment_protocol = models.JSONField(default=dict)
    is_public_health_emergency = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

class Medication(models.Model):
    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200)
    interactions = models.ManyToManyField('self', symmetrical=True, blank=True)
    unit = models.CharField(max_length=20)  # mg, ml

4. سير العمل داخل النظام

    التحديث: يقوم مسؤول النظام (المشرف الصحي) بإضافة مرض جديد (مثل: "جدري القردة") عبر Django Admin (بوابة الإدارة الاتحادية 8).

    الربط: يقوم النظام بربط المرض بـ (الأعراض، فترة الحضانة، الفحوصات اللازمة، والأدوية).

    التطبيق الفوري:

        عند فتح الطبيب لملف مريض في بوابة العيادات، يقوم النظام (عبر Service) بعرض قائمة بالأمراض المحتملة بناءً على الأعراض المسجلة.

        عند طلب فحص معملي، يقوم النظام بتوجيه المختبر تلقائياً للفحوصات المناسبة للمرض المشتبه به.

    التكامل مع الترصد: أي مرض يتم تأكيده مخبرياً يتم ترقيمه وتبليغ نظام الترصد الوبائي تلقائياً عبر إشارة (Signal) في Django.

5. إدارة التداخلات الدوائية (Drug Interaction Checker)

    آلية العمل: عند قيام الطبيب بكتابة دواء جديد في وصفة المريض (عبر API /api/v1/clinic/prescriptions/)، يقوم النظام (Service) بفحص هذا الدواء ضد قائمة الأدوية الحالية للمريض (المسجلة في ملفه الصحي).

    المستويات:

        (أخضر): آمن.

        (أصفر): يتطلب مراقبة (يظهر تحذير للطبيب).

        (أحمر): ممنوع (يمنع النظام إضافة الدواء إلا بإلغاء الدواء المتعارض أولاً).

    التنفيذ: يتم ذلك عبر Query محسّنة في Django لسحب جميع أدوية المريض والتحقق من interactions ManyToMany field.

6. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
GET	/api/v1/diseases/	قائمة الأمراض.	عام (Public)
GET	/api/v1/diseases/search?q={term}	البحث عن الأمراض (لإكمال التشخيص).	Doctor+
GET	/api/v1/medications/	قائمة الأدوية.	Doctor+
GET	/api/v1/medications/{id}/interactions	الحصول على التداخلات الدوائية لدواء معين.	Doctor+
POST	/api/v1/admin/diseases/	(للمسؤولين) إضافة مرض جديد.	Federal Admin+