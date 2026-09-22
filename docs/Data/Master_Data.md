
---

### 📄 7. `Master_Data.md` (البيانات الرئيسية العامة)

```markdown
# البيانات الرئيسية العامة (Master Data) - NQP

## 1. نظرة عامة
هذه الوثيقة تحتوي على جميع البيانات الرئيسية (Master Data) المستخدمة في منصة NQP والتي لا تندرج ضمن فئات محددة (مثل: أنواع المنافذ، أنواع العينات، حالات الرحلات، حالات الطلبات، وغيرها).

## 2. أنواع المنافذ (Port Types)

| الرمز | الاسم العربي | الاسم الإنجليزي | الاستخدام |
| :--- | :--- | :--- | :--- |
| `AIRPORT` | مطار | Airport | المطارات الدولية والمحلية. |
| `SEAPORT` | ميناء بحري | Seaport | الموانئ البحرية. |
| `LAND_PORT` | منفذ بري | Land Port | المنافذ البرية. |

## 3. أنواع العينات (Sample Types)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `BLOOD` | عينة دم | Blood | عينة دم وريدي أو شرياني. |
| `SWAB` | مسحة | Swab | مسحة أنفية أو حلقية. |
| `URINE` | عينة بول | Urine | عينة بول. |
| `STOOL` | عينة براز | Stool | عينة براز. |
| `CSF` | سائل نخاعي | Cerebrospinal Fluid | عينة سائل نخاعي. |
| `SPUTUM` | عينة بلغم | Sputum | عينة بلغم. |
| `TISSUE` | عينة نسيج | Tissue | عينة نسيج (خزعة). |
| `OTHER` | أخرى | Other | أنواع أخرى. |

## 4. أنواع الفحوصات المخبرية (Lab Test Types)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `PCR` | تفاعل البوليميراز المتسلسل | PCR | اختبار جزيئي للكشف عن الحمض النووي. |
| `CULTURE` | مزرعة بكتيرية | Bacterial Culture | زراعة البكتيريا. |
| `CBC` | فحص دم شامل | Complete Blood Count | تعداد الدم الكامل. |
| `LFT` | وظائف الكبد | Liver Function Test | اختبارات وظائف الكبد. |
| `RFT` | وظائف الكلى | Renal Function Test | اختبارات وظائف الكلى. |
| `ELISA` | اختبار ELISA | ELISA | اختبار مناعي. |
| `RAPID` | اختبار سريع | Rapid Test | اختبار تشخيصي سريع. |
| `SEROLOGY` | اختبار مصلي | Serology | اختبار الأجسام المضادة. |
| `MICROSCOPY` | فحص مجهري | Microscopy | الفحص المجهري. |
| `OTHER` | أخرى | Other | أنواع أخرى. |

## 5. حالات الرحلات (Flight Statuses)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `SCHEDULED` | مجدولة | Scheduled | الرحلة مجدولة ولم تصل بعد. |
| `MANIFEST_UPLOADED` | تم رفع القائمة | Manifest Uploaded | تم رفع قائمة الركاب. |
| `IN_TRANSIT` | في الطريق | In Transit | الرحلة في طريقها. |
| `ARRIVED` | وصلت | Arrived | الرحلة وصلت. |
| `CANCELLED` | ملغاة | Cancelled | الرحلة ملغاة. |
| `DELAYED` | مؤجلة | Delayed | الرحلة مؤجلة. |

## 6. حالات الطلبات (Request Statuses)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `PENDING_DOCUMENTS` | بانتظار المستندات | Pending Documents | المستندات غير مكتملة. |
| `UNDER_REVIEW` | قيد المراجعة | Under Review | الطلب قيد المراجعة. |
| `ACTION_REQUIRED` | إجراء مطلوب | Action Required | يحتاج إلى إجراء من المستخدم. |
| `APPROVED` | معتمد | Approved | تم اعتماد الطلب. |
| `REJECTED` | مرفوض | Rejected | تم رفض الطلب. |
| `COMPLETED` | مكتمل | Completed | الطلب مكتمل. |

## 7. حالات العينات (Sample Statuses)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `REGISTERED` | مسجلة | Registered | تم تسجيل العينة. |
| `PROCESSING` | قيد التحليل | Processing | العينة قيد التحليل. |
| `COMPLETED` | مكتملة | Completed | تم تحليل العينة. |
| `REJECTED` | مرفوضة | Rejected | تم رفض العينة. |

## 8. حالات الإحالات (Referral Statuses)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `PENDING` | معلقة | Pending | في انتظار القبول. |
| `ACCEPTED` | مقبولة | Accepted | تم قبول الإحالة. |
| `REJECTED` | مرفوضة | Rejected | تم رفض الإحالة. |
| `COMPLETED` | مكتملة | Completed | تم إنهاء الإحالة. |

## 9. حالات المتابعة (Follow-up Statuses)

| الرمز | الاسم العربي | الاسم الإنجليزي | الوصف |
| :--- | :--- | :--- | :--- |
| `ACTIVE` | نشطة | Active | المتابعة مستمرة. |
| `COMPLETED` | مكتملة | Completed | تم الانتهاء من المتابعة. |
| `CANCELLED` | ملغاة | Cancelled | تم إلغاء المتابعة. |

## 10. تحديث البيانات
- **المسؤول**: مسؤول النظام (Federal Admin).
- **التكرار**: عند الحاجة (عند إضافة أنواع جديدة).
- **الآلية**: عبر Django Admin.

## 11. استخدام البيانات في Django
```python
# نموذج منفذ باستخدام أنواع المنافذ
class Port(models.Model):
    PORT_TYPES = (
        ('AIRPORT', 'مطار'),
        ('SEAPORT', 'ميناء بحري'),
        ('LAND_PORT', 'منفذ بري'),
    )
    port_type = models.CharField(max_length=20, choices=PORT_TYPES)

12. مراجع

    Django Choices: Django Model Field Choices.