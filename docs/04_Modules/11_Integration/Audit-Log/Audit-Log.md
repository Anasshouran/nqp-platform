
---

### 📄 6. `Audit-Log/Audit-Log.md` (سجل التدقيق)

```markdown
# Audit Log - سجل التدقيق

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

## 3. هيكل نموذج Audit Log في Django

```python
# apps/audit/models.py
from django.db import models
from django.contrib.auth import get_user_model

class AuditLog(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
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
        ]
        ordering = ['-timestamp']

4. آلية التسجيل (تلقائية عبر Middleware)
python

# apps/audit/middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog
import json

class AuditMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.path.startswith('/api/') and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # تسجيل العمليات التي تغير البيانات
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action_type=f"{request.method}_{request.path.split('/')[-2]}",
                resource_type=request.path.split('/')[-2],
                resource_id=request.path.split('/')[-1],
                old_value=None,  # يمكن جلبها من قاعدة البيانات قبل التحديث
                new_value=json.loads(request.body) if request.body else None,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

5. صلاحيات الوصول إلى Audit Log

    Super Admin: يمكنه عرض جميع سجلات التدقيق.

    Federal Admin: يمكنه عرض سجلات التدقيق الخاصة بقطاعه/منافذه.

    EOC Operator: يمكنه عرض سجلات التدقيق الخاصة بعمليات الطوارئ.

    المستخدمون العاديون: لا يمكنهم عرض سجلات التدقيق (ممنوع الوصول).

6. سياسة الاحتفاظ (Retention Policy)

    فترة الاحتفاظ: 5 سنوات (للامتثال للمعايير القانونية).

    الأرشفة: يتم نقل السجلات التي مضى عليها أكثر من سنة إلى (Cold Storage) (مثل: S3 Glacier) لتقليل حجم قاعدة البيانات الأساسية.

    الحذف الآمن: لا يمكن حذف سجلات التدقيق نهائياً؛ يمكن فقط إخفاؤها عن واجهة المستخدم، مع الاحتفاظ بنسخة منها لأغراض المراجعة المستقبلية.

7. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
GET	/api/v1/admin/audit-logs/	قائمة سجلات التدقيق (مع التصفية والترقيم).	Super Admin, Federal Admin
GET	/api/v1/admin/audit-logs/{id}	تفاصيل سجل تدقيق محدد.	Super Admin, Federal Admin
GET	/api/v1/admin/audit-logs/export/	تصدير سجلات التدقيق (Excel/CSV).	Super Admin