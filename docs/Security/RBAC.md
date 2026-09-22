
---

### 📄 5. `RBAC.md` (إدارة الصلاحيات القائمة على الأدوار)

```markdown
# إدارة الصلاحيات القائمة على الأدوار (RBAC - Role-Based Access Control) - NQP

## 1. الهدف
تحديد نظام (RBAC - Role-Based Access Control) المستخدم في منصة NQP لإدارة الصلاحيات بشكل مرن وآمن. يضمن نظام RBAC أن كل مستخدم لديه فقط الصلاحيات اللازمة لأداء مهامه، وفقاً لمبدأ **أقل امتياز (Least Privilege)**.

## 2. مكونات نظام RBAC

| المكون | الوصف | التنفيذ في Django |
| :--- | :--- | :--- |
| **المستخدمون (Users)** | الأشخاص الذين يتفاعلون مع النظام. | Model `User` (Django AbstractUser) |
| **الأدوار (Roles)** | مجموعات من الصلاحيات. | Model `Role` |
| **الصلاحيات (Permissions)** | العمليات المسموح بها على موارد محددة. | Model `Permission` |
| **تعيين الأدوار للمستخدمين** | ربط المستخدمين بالأدوار. | Many-to-Many (User ↔ Role) |
| **تعيين الصلاحيات للأدوار** | ربط الصلاحيات بالأدوار. | Many-to-Many (Role ↔ Permission) |

## 3. هيكل البيانات (Data Model)

```python
# apps/accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # ... الحقول السابقة
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    # (اختياري) صلاحيات إضافية (تتجاوز صلاحيات الدور)
    extra_permissions = models.ManyToManyField('Permission', blank=True)

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField('Permission', blank=True)

class Permission(models.Model):
    name = models.CharField(max_length=100, unique=True)
    resource = models.CharField(max_length=50)  # TRAVELER, SCREENING, CLINIC, LAB, EOC
    action = models.CharField(max_length=20)    # CREATE, READ, UPDATE, DELETE, APPROVE

4. الأدوار الأساسية (Roles)
الدور	الوصف	الصلاحيات الأساسية
SUPER_ADMIN	مدير النظام الأعلى	الوصول الكامل إلى جميع وحدات النظام.
FEDERAL_ADMIN	مشرف اتحادي	إدارة المستخدمين، المنافذ، القطاعات، التقارير الوطنية.
SECTOR_MANAGER	مدير قطاع	إدارة منافذ قطاعه، عرض تقارير القطاع.
PORT_OFFICER	موظف حجر	إجراء الفحص، تقييم المخاطر، الإحالة.
DOCTOR	طبيب	إدارة الإحالات، EMR، وصف العلاج.
LAB_TECH	فني مختبر	تسجيل العينات، إدخال النتائج.
LAB_SUPERVISOR	مشرف مختبر	اعتماد النتائج، مراجعة العينات.
FOOD_INSPECTOR	مفتش غذائي	تفتيش الشحنات الغذائية، إصدار الشهادات.
EOC_OPERATOR	مسؤول طوارئ	مراقبة الإنذارات، توجيه فرق RRT.
EMERGENCY_DIRECTOR	مدير الطوارئ	تفعيل Kill Switch، إعلان الطوارئ الوطنية.
CARRIER_REP	ممثل شركة طيران	إدارة الرحلات، رفع قوائم الركاب.
TRAVELER	مسافر	عرض ملفه الشخصي، التسجيل المسبق، المتابعة.
5. تطبيق RBAC في Django
5.1. تعريف الصلاحيات (Permissions)
python

# apps/accounts/management/commands/seed_permissions.py
from django.core.management.base import BaseCommand
from apps.accounts.models import Permission, Role

class Command(BaseCommand):
    def handle(self, *args, **options):
        permissions = [
            # صلاحيات المسافرين
            {'name': 'READ_TRAVELER', 'resource': 'TRAVELER', 'action': 'READ'},
            {'name': 'UPDATE_TRAVELER', 'resource': 'TRAVELER', 'action': 'UPDATE'},
            # صلاحيات الفحص
            {'name': 'READ_SCREENING', 'resource': 'SCREENING', 'action': 'READ'},
            {'name': 'CREATE_SCREENING', 'resource': 'SCREENING', 'action': 'CREATE'},
            {'name': 'UPDATE_SCREENING', 'resource': 'SCREENING', 'action': 'UPDATE'},
            # صلاحيات العيادات
            {'name': 'READ_EMR', 'resource': 'EMR', 'action': 'READ'},
            {'name': 'WRITE_EMR', 'resource': 'EMR', 'action': 'WRITE'},
            # صلاحيات المختبرات
            {'name': 'READ_LAB', 'resource': 'LAB', 'action': 'READ'},
            {'name': 'WRITE_LAB', 'resource': 'LAB', 'action': 'WRITE'},
            {'name': 'APPROVE_LAB', 'resource': 'LAB', 'action': 'APPROVE'},
            # صلاحيات الطوارئ
            {'name': 'ACTIVATE_KILL_SWITCH', 'resource': 'EOC', 'action': 'ACTIVATE'},
        ]
        for perm in permissions:
            Permission.objects.get_or_create(**perm)

5.2. تعيين الصلاحيات للأدوار
python

# apps/accounts/management/commands/seed_roles.py
def seed_roles():
    roles = {
        'PORT_OFFICER': ['READ_TRAVELER', 'CREATE_SCREENING', 'UPDATE_SCREENING'],
        'DOCTOR': ['READ_TRAVELER', 'READ_EMR', 'WRITE_EMR'],
        'LAB_SUPERVISOR': ['READ_LAB', 'APPROVE_LAB'],
        'EOC_OPERATOR': ['READ_SCREENING', 'ACTIVATE_KILL_SWITCH'],
    }
    for role_name, perm_names in roles.items():
        role, _ = Role.objects.get_or_create(name=role_name)
        for perm_name in perm_names:
            perm = Permission.objects.get(name=perm_name)
            role.permissions.add(perm)

6. مراجع

    Django Groups and Permissions: https://docs.djangoproject.com/en/stable/topics/auth/default/#groups

    NIST RBAC Standard: https://csrc.nist.gov/projects/role-based-access-control

    