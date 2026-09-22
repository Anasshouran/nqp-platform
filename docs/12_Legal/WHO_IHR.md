
---

### 📄 5. `WHO_IHR.md` (اللوائح الصحية الدولية)

```markdown
# اللوائح الصحية الدولية (IHR 2005) - NQP

## 1. نظرة عامة
اللوائح الصحية الدولية (IHR 2005) هي اتفاقية دولية ملزمة قانونياً لـ 196 دولة، تهدف إلى مساعدة المجتمع الدولي على منع الانتشار الدولي للأمراض والاستجابة له وحمايته منه. تلزم اللوائح الدول الأعضاء بامتلاك قدرات أساسية للرصد والاستجابة، والإبلاغ عن الأحداث الصحية العامة التي قد تشكل طارئاً صحياً عاماً يثير قلقاً دولياً (PHEIC).

## 2. المتطلبات الأساسية لمنصة NQP بموجب IHR

| المتطلب | الوصف | كيفية التطبيق في NQP |
| :--- | :--- | :--- |
| **قدرات الرصد (Surveillance)** | اكتشاف الأمراض والأحداث الصحية الجديدة في الوقت الفعلي. | نظام الفحص (4)، نظام المختبرات (6)، نظام الترصد الوبائي. |
| **قدرات الاستجابة (Response)** | القدرة على احتواء الحدث الصحي بسرعة. | غرفة الطوارئ (9) وفرق RRT. |
| **الإبلاغ الإجباري (Mandatory Reporting)** | الإبلاغ عن جميع الحالات المؤكدة للأمراض المدرجة في قائمة IHR خلال 24 ساعة. | توليد تقرير IHR تلقائياً عبر Django Service (Celery). |
| **النقاط البؤرية الوطنية (National Focal Points - NFP)** | نقطة اتصال واحدة للتواصل مع WHO. | المركز الوطني للوائح الصحية (IHR Focal Point) المدمج مع النظام. |
| **التبليغ عن PHEIC** | الإبلاغ عن الأحداث الصحية العامة ذات الاهتمام الدولي. | نظام الإنذار الأحمر (Red Alerts) مع إرسال تقرير فوري. |
| **تحديثات ICD-11** | استخدام التصنيف الدولي للأمراض (الإصدار 11). | نظام إدارة الأمراض (Disease_Management) مع مزامنة تلقائية. |

## 3. الأمراض المدرجة في قائمة IHR (مثال)

| المرض | متطلب الإبلاغ | الإجراء التلقائي في NQP |
| :--- | :--- | :--- |
| **شلل الأطفال** (Poliomyelitis) | فوري (خلال 24 ساعة) | إرسال إنذار (أحمر) إلى غرفة الطوارئ (9) + تقرير IHR. |
| **كوفيد-19** (COVID-19) | فوري (خلال 24 ساعة) | إرسال إنذار أحمر إلى غرفة الطوارئ + توليد تقرير IHR. |
| **حمى الضنك** (Dengue) | ضمن التقرير الأسبوعي | إدراج الحالة في التقرير الأسبوعي. |
| **الكوليرا** (Cholera) | فوري (خلال 24 ساعة) | إرسال إنذار أحمر + تفعيل Kill Switch (إذا لزم الأمر). |
| **الإيبولا** (Ebola) | فوري (خلال 24 ساعة) | إرسال إنذار أحمر + تفعيل Kill Switch + تقرير IHR فوري. |
| **الملاريا** (Malaria) | ضمن التقرير الأسبوعي | إدراج الحالة في التقرير الأسبوعي. |
| **الحصبة** (Measles) | ضمن التقرير الأسبوعي | إدراج الحالة في التقرير الأسبوعي. |

## 4. آلية الإبلاغ عن حدث PHEIC

```mermaid
flowchart TD
    A[اكتشاف حالة مرض مدرج في قائمة PHEIC] --> B[توليد تقرير أولي تلقائياً]
    B --> C[إرسال إشعار للمركز الوطني للوائح الصحية (IHR Focal Point)]
    C --> D[مراجعة التقرير من قبل المركز الوطني]
    D --> E{هل التقرير صحيح؟}
    E -- نعم --> F[اعتماد التقرير وإرساله إلى WHO]
    E -- لا --> G[طلب تعديل التقرير]
    G --> B
    F --> H[تسجيل التقرير في سجل IHR]
    H --> I[متابعة الحالة حتى الإغلاق]

    5. التقارير المطلوبة بموجب IHR
نوع التقرير	التكرار	المحتوى	التنسيق
تقرير PHEIC الفوري	عند الحدث	المرض، عدد الحالات، الموقع، الإجراءات المتخذة.	JSON / XML (SPAR)
التقرير الأسبوعي	أسبوعياً (الأحد)	جميع الحالات المؤكدة للأمراض المدرجة في IHR.	XML / CSV
التقرير السنوي	سنوياً	ملخص الحالات والإجراءات والقدرات.	PDF / XML
تقرير قدرات الرصد	سنوياً	تقييم قدرات الدولة في الرصد والاستجابة.	PDF / XML
6. التكامل مع منظمة الصحة العالمية (WHO)
الإجراء	التفاصيل	التقنية المستخدمة
مزامنة ICD-11	جلب تحديثات ICD-11 من WHO يومياً.	REST API (Celery Beat)
إرسال تقارير IHR	إرسال التقارير إلى المركز الوطني (ثم إلى WHO).	SFTP / REST API
استقبال إرشادات WHO	استقبال تحديثات السياسات والإرشادات.	REST API (Webhook)
التبليغ عن PHEIC	إرسال تقرير PHEIC فوري.	REST API / Webhook
7. تنفيذ IHR في Django
7.1. نموذج التقرير
python

# apps/who/models.py
from django.db import models

class IHRReport(models.Model):
    REPORT_TYPES = (
        ('PHEIC', 'PHEIC فوري'),
        ('WEEKLY', 'أسبوعي'),
        ('ANNUAL', 'سنوي'),
    )
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    report_date = models.DateTimeField(auto_now_add=True)
    disease = models.ForeignKey('diseases.Disease', on_delete=models.SET_NULL, null=True)
    case_count = models.IntegerField()
    location = models.CharField(max_length=255)
    description = models.TextField()
    actions_taken = models.JSONField(default=list)
    status = models.CharField(max_length=20, default='DRAFT')
    submitted_at = models.DateTimeField(null=True, blank=True)

7.2. خدمة توليد التقرير
python

# apps/who/services.py
from celery import shared_task
from apps.who.models import IHRReport

@shared_task
def generate_ihr_report(report_id):
    report = IHRReport.objects.get(id=report_id)
    # توليد التقرير بصيغة XML/JSON
    report_content = generate_report_content(report)
    # إرسال التقرير إلى المركز الوطني
    send_to_focal_point(report_content)
    report.status = 'SUBMITTED'
    report.submitted_at = timezone.now()
    report.save()

8. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
GET	/api/v1/who/ihr-report/	توليد تقرير IHR.	IHR Focal Point
POST	/api/v1/who/sync-icd11/	مزامنة ICD-11 مع WHO.	Federal Admin
POST	/api/v1/who/report/submit/	إرسال التقرير إلى المركز الوطني.	IHR Focal Point
GET	/api/v1/who/reports/	قائمة التقارير السابقة.	IHR Focal Point
9. الامتثال لـ IHR في الممارسة

flowchart LR
    A[اكتشاف الحالة] --> B[تسجيل الحالة في النظام]
    B --> C[تحديد ما إذا كانت مدرجة في IHR]
    C --> D{مدرجة في IHR؟}
    D -- نعم --> E[توليد تقرير IHR تلقائي]
    D -- لا --> F[تسجيل الحالة فقط]
    E --> G[مراجعة التقرير من قبل IHR Focal Point]
    G --> H[إرسال التقرير إلى WHO]
    H --> I[تسجيل التقرير في أرشيف IHR]
