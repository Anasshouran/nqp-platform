


---

### 📄 2. `Audit_Log.md` (سجلات التدقيق)

```markdown
# سجلات التدقيق (Audit Log) - NQP

## 1. الهدف
توفير سجل غير قابل للتعديل (Immutable) لجميع العمليات الهامة التي تتم في النظام (تسجيل الدخول، تغيير البيانات، الإحالات، اعتماد النتائج، تفعيل Kill Switch)، لأغراض المراجعة (Auditing)، والشفافية، والتحقيق في الأحداث الأمنية، والامتثال للمعايير الدولية (مثل: IHR 2005، HIPAA).

## 2. نطاق التسجيل (Scope)
يتم تسجيل العمليات التالية (على الأقل):

| الفئة (Category) | العمليات (Actions) |
| :--- | :--- |
| **المصادقة (Authentication)** | تسجيل الدخول، تسجيل الخروج، محاولات الدخول الفاشلة، تغيير كلمة المرور. |
| **المستخدمون (Users)** | إنشاء مستخدم، تعديل مستخدم، تعطيل مستخدم، حذف مستخدم (نادر). |
| **الفحص والتقييم (Screening)** | إجراء فحص، تغيير تصنيف المخاطر، إحالة للعيادة. |
| **العيادات (Clinic)** | إنشاء زيارة، تحديث EMR، وصف دواء، إغلاق زيارة. |
| **المختبرات (Lab)** | تسجيل عينة، إدخال نتيجة، اعتماد نتيجة، رفض نتيجة. |
| **الطوارئ (EOC)** | تفعيل Kill Switch، إلغاء Kill Switch، توجيه فريق RRT، إرسال إشعار جماعي. |
| **التكامل (Integration)** | إرسال تقرير لوزارة الصحة، مزامنة ICD-11، إرسال شهادة إفراغ للجمارك. |

## 3. هيكل سجل التدقيق

### 3.1. نموذج Django
```python
# apps/audit/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=100)  # login, create_user, update_screening
    resource_type = models.CharField(max_length=100)  # User, Screening, ClinicVisit
    resource_id = models.CharField(max_length=50)  # UUID
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action_type']),
        ]
        ordering = ['-timestamp']