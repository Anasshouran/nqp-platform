
---

> **ملاحظة حالة:** الأقسام 1–6 أدناه وصف تصاميمي قديم لا يطابق التنفيذ
> (لا يوجد `ROLE_CHOICES` ولا `seed_permissions.py`، والأدوار الفعلية بصيغة
> `code:resource:action`). المرجع المعتمد هو القسم 7.

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

    
---

## 7. الوضع المُنفَّذ فعليًا

### 7.1 اصطلاح أسماء الصلاحيات

الصلاحية بصيغة `resource:action` (نقطتان، حرفان صغيران)، مثل `flights:view`.
الأفعال المتاحة: `view`, `add`, `edit`, `delete`, `export`.

المصدر المرجعي الوحيد للخريطة: `seed_rbac.py` → `RESOURCES`.
تعديل الأدوار يتم عبر `python manage.py seed_rbac` فقط.

### 7.2 كيف تُحسم الصلاحية؟

`User.can()` في `apps/accounts/models.py` بالترتيب:

1. `is_superuser` ← `True` دائمًا.
2. `blocked_permissions` تحتوي أي كود من المطلوب ← `False` (الحجب يسبق كل شيء).
3. `extra_permissions` تغطي **كل** الكودات المطلوبة ← `True`.
4. الصلاحيات المجمّعة من `RoleAssignment` النشطة (`is_active`, ضمن
   `start_date`/`end_date`) تغطي كل الكودات ← `True`.
5. غير ذلك ← `False`.

`User.role` (العلاقة القديمة) **لا يُقرأ** في `User.can()`. أي دور يُمنح فعليًا
عبر `RoleAssignment` نشطة.

### 7.3 بوابة الـviewset

`AdminOrPermissionAction` (في `core/permissions/__init__.py`):

- `is_staff` أو `is_superuser` ← مسموح (سلوك `IsAdmin` التاريخي).
- غير ذلك: يُشتق المورد من `permission_resource`، والإجراء من
  `default_action_map` أو `action_permission_map` على الـviewset.
- **يفشل مغلقًا**: مورد غائب أو إجراء غير معرّف أو إجراء مخصص غير مُدرج في
  `action_permission_map` ← `403`.

### 7.4 مورد `flights`

`FlightViewSet` كان بلا `permission_classes`، فورث `IsAuthenticated` العام —
أي أن أي حساب مسجّل كان يقرأ ويكتب ويحذف رحلات كل الشركات.

| الدور | الصلاحيات |
| :--- | :--- |
| `ADMIN`, `DG_MANAGER` | `view, add, edit, delete, export` |
| `CARRIER` | `view, add, edit, delete` (بلا `export`) |
| `POE_HEALTH_OFFICER`, `QUARANTINE_INSPECTOR`, `NATIONAL_SURVEILLANCE_OFFICER`, `SECTOR_IHR_OFFICER` | `view` فقط |

**نطاق ممثّل الناقل** لا تأتي من الصلاحيات، بل من `FlightViewSet`:

- `get_queryset` يقصر النتائج على `get_portal_carrier(user)`.
- `perform_create` يثبّت `carrier` على شركة المستخدم.
- `_guard_company` يمنع تعديل رحلة شركة أخرى (403/404).
- `is_staff` لا يقصر، فيرى الإدارة كل الشركات.

`action_permission_map` مطلوب لكل `@action`: `upcoming`→`view`,
`set_status`/`manifest_reprocess`→`edit`, `upload_manifest`→`add`,
`manifest_status|passengers|report|errors`→`view`,
`api_key_info|regenerate_api_key`→`edit`.

### 7.5 الإشعارات الصحية: لا مورد RBAC

`HealthNoticeViewSet.get_permissions` يتجاوز `permission_classes` عمدًا:

| الإجراء | الحارس |
| :--- | :--- |
| `list`, `retrieve`, `archived`, `recent` | `AllowAny` (نصيحة عامة) |
| `acknowledge` | `IsCarrierRep` |
| `create`, `update`, `delete` | `IsAdmin` |

إنشاء إشعار يجدول بث Web Push لكل المشتركين
(`apps/notifications/signals.py`)، لذلك محصور إداريًا. لا يوجد مورد
`notices` في `RESOURCES`، وأي إضافة له ستكون config معطلًا يتجاوزه
`get_permissions`.

### 7.6 أسماء بديلة (aliases)

`PERMISSION_CODE_ALIASES` في `core/utils/authorization.py` تربط أسماء
`dotted` قديمة (من وثائق WHO/IHR) بالأكواد الفعلية `resource:action`.
`User.can()` يقبلها، لكن `effective_permission_codes()` — وهو ما تستهلكه
الواجهة — يعيد الأكواد الفعلية فقط. أمثلة:

| الاسم البديل | الكود الفعلي |
| :--- | :--- |
| `who.integration.view` | `who_integration:view` |
| `who.integration.manage` | `who_integration:edit` |
| `who.icd11.search` | `who_mappings:search` |
| `who.ihr.integration.view` | `who_integration:view` |
| `ihr.events.create` | `ihr_event:add` |
| `ihr.notifications.submit` | `ihr_event:notify` |
| `ihr.communications.view` | `ihr_event:view` |
| `users.manage`, `roles.manage` | حزمة `add+edit+delete` |
| `audit_logs.view` | `audit_log:view` |

### 7.7 التحقق

```bash
python manage.py seed_rbac                 # لا تُعدَّل الأدوار يدويًا
python manage.py verify_seed_coverage      # قراءة فقط
python -m pytest apps/carriers -q
```
