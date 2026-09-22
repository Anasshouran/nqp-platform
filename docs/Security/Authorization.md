
---

### 📄 4. `Authorization.md` (التفويض والصلاحيات)

```markdown
# التفويض والصلاحيات (Authorization) - NQP

## 1. الهدف
تحديد آلية التفويض (Authorization) في منصة NQP، لضمان أن المستخدمين لديهم الصلاحيات المناسبة فقط للوصول إلى الموارد والبيانات التي يحتاجونها، وفقاً لمبدأ **أقل امتياز (Least Privilege)**.

## 2. نظام التفويض (Authorization System)

```mermaid
flowchart TD
    A[الوصول إلى مورد] --> B{هل المستخدم مصدق؟}
    B -- لا --> C[رفض الوصول (401 Unauthorized)]
    B -- نعم --> D{ما هو دور المستخدم؟}
    D --> E[التحقق من صلاحيات الدور]
    E --> F{هل لديه الصلاحية المطلوبة؟}
    F -- لا --> G[رفض الوصول (403 Forbidden)]
    F -- نعم --> H[السماح بالوصول]

3. نموذج الصلاحيات (Permission Model)
python

# apps/accounts/models.py (موسع)
class User(AbstractUser):
    # ... الحقول السابقة
    permissions = models.ManyToManyField('Permission', blank=True)

class Permission(models.Model):
    name = models.CharField(max_length=100, unique=True)
    resource = models.CharField(max_length=50)  # TRAVELER, SCREENING, CLINIC, LAB, EOC, ADMIN
    action = models.CharField(max_length=20)    # CREATE, READ, UPDATE, DELETE, APPROVE

    def __str__(self):
        return f"{self.action}_{self.resource}"

4. الأدوار والصلاحيات المحددة مسبقاً
الدور	الصلاحيات
SUPER_ADMIN	جميع الصلاحيات (التحكم الكامل).
FEDERAL_ADMIN	إدارة المستخدمين، المنافذ، القطاعات، التقارير الوطنية.
SECTOR_MANAGER	إدارة منافذ قطاعه، عرض تقارير القطاع.
PORT_OFFICER	إجراء الفحص، تقييم المخاطر، الإحالة.
DOCTOR	إدارة الإحالات، EMR، وصف العلاج.
LAB_TECH	تسجيل العينات، إدخال النتائج.
LAB_SUPERVISOR	اعتماد النتائج، مراجعة العينات.
FOOD_INSPECTOR	تفتيش الشحنات الغذائية، إصدار الشهادات.
EOC_OPERATOR	مراقبة الإنذارات، توجيه فرق RRT.
EMERGENCY_DIRECTOR	تفعيل Kill Switch، إعلان الطوارئ الوطنية.
CARRIER_REP	إدارة الرحلات، رفع قوائم الركاب.
TRAVELER	عرض ملفه الشخصي، التسجيل المسبق، المتابعة.
5. تطبيق الصلاحيات في Django
5.1. صلاحيات على مستوى الـ View (Permission Classes)
python

# apps/screening/permissions.py
from rest_framework.permissions import BasePermission

class IsPortOfficer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PORT_OFFICER'

class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'DOCTOR'

class CanApproveLabResult(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role == 'LAB_SUPERVISOR')

5.2. صلاحيات على مستوى الكائن (Object-level Permissions)
python

# apps/clinic/permissions.py
from rest_framework.permissions import BasePermission

class CanAccessPatientRecord(BasePermission):
    def has_object_permission(self, request, view, obj):
        # الطبيب يمكنه الوصول إلى ملفات مرضاه فقط
        if request.user.role == 'DOCTOR':
            return obj.doctor_id == request.user.id
        # المشرف يمكنه الوصول إلى جميع الملفات
        return request.user.role in ['SUPER_ADMIN', 'FEDERAL_ADMIN']

6. مراجع

    Django Permissions: https://docs.djangoproject.com/en/stable/topics/auth/default/#permissions-and-authorization

    DRF Permissions: https://www.django-rest-framework.org/api-guide/permissions/

    OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

