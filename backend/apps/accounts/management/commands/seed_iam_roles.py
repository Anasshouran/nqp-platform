"""زراعة الأدوار الرئيسية الموحّدة لنظام إدارة المستخدمين (IAM).

أدوار اختيارية قابلة لإعادة التشغيل (idempotent): تُنشأ إن لم توجد،
وتُحدَّث منظومة صلاحياتها عند كل تشغيل. كما يحذف الدور الفارغ المخلف من نظام قديم.

مثال المصفوفة: كاتب رقابة الأغذية له view/create/edit/export فقط
بلا تحصيل أو تفتيش أو اعتماد (يعتمد على هدف النظام المركزي).
"""

from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role

ALL_RESOURCES = [
    'airport_health', 'approval', 'chemistry', 'clinic', 'emergency', 'finance',
    'food', 'it', 'laboratory', 'notifications', 'organization', 'port_health',
    'ports', 'quality', 'reports', 'risk', 'roles', 'screening', 'surveillance',
    'settings', 'travelers', 'users', 'vector',
]


def perm(resource, *actions):
    return [f'{resource}:{action}' for action in actions]


ROLES = {
    'FEDERAL_DIRECTOR': {
        'name': 'Federal Director',
        'name_ar': 'المدير الاتحادي',
        'default_scope': 'GLOBAL',
        'permissions': (
            [_r + ':view' for _r in ALL_RESOURCES]
            + [_r + ':export' for _r in ALL_RESOURCES if _r not in ('approval', 'quality')]
            + perm('approval', 'add', 'edit', 'view')
            + perm('quality', 'add', 'edit', 'view')
        ),
    },
    'POE_MANAGER': {
        'name': 'Point of Entry Manager',
        'name_ar': 'مدير نقطة الدخول',
        'default_scope': 'POINT',
        'permissions': (
            perm('food', 'add', 'edit', 'view', 'export')
            + perm('port_health', 'add', 'edit', 'view', 'export')
            + perm('travelers', 'add', 'edit', 'view', 'export')
            + perm('screening', 'add', 'edit', 'view', 'export')
            + perm('surveillance', 'add', 'edit', 'view', 'export')
            + perm('finance', 'view', 'collect', 'reports')
            + perm('laboratory', 'view')
            + perm('approval', 'view')
            + perm('quality', 'view')
        ),
    },
    'FOOD_CONTROL_MANAGER': {
        'name': 'Food Control Manager',
        'name_ar': 'مدير رقابة الأغذية',
        'default_scope': 'SECTOR',
        'permissions': (
            perm('food', 'add', 'edit', 'view', 'export')
            + perm('quality', 'add', 'edit', 'view')
            + perm('laboratory', 'view', 'export')
            + perm('finance', 'view', 'reports')
            + perm('approval', 'add', 'edit', 'view')
            + perm('reports', 'view', 'export')
            + perm('surveillance', 'view', 'export')
        ),
    },
    'FOOD_CONTROL_CLERK': {
        'name': 'Food Control Clerk',
        'name_ar': 'كاتب رقابة الأغذية',
        'default_scope': 'POINT',
        'permissions': (
            perm('food', 'add', 'edit', 'view', 'export')
        ),
    },
    'INSPECTOR': {
        'name': 'Inspector',
        'name_ar': 'مفتش ميداني',
        'default_scope': 'POINT',
        'permissions': (
            perm('food', 'view')
            + perm('port_health', 'add', 'edit', 'view', 'export')
            + perm('travelers', 'view')
            + perm('screening', 'add', 'edit', 'view', 'export')
            + perm('surveillance', 'add', 'edit', 'view', 'export')
            + perm('approval', 'view')
            + perm('laboratory', 'view')
        ),
    },
    'PLANNING_OFFICER': {
        'name': 'Planning Officer',
        'name_ar': 'مسؤول التخطيط',
        'default_scope': 'DEPARTMENT',
        'permissions': (
            perm('reports', 'add', 'edit', 'view', 'export')
            + perm('food', 'view', 'export')
            + perm('ports', 'view', 'export')
            + perm('port_health', 'view')
            + perm('finance', 'reports')
            + perm('risk', 'view')
        ),
    },
    'HR_OFFICER': {
        'name': 'HR Officer',
        'name_ar': 'موظف شؤون الموظفين',
        'default_scope': 'DEPARTMENT',
        'permissions': (
            perm('users', 'add', 'edit', 'view', 'export')
            + perm('organization', 'add', 'edit', 'view', 'export')
            + perm('settings', 'view')
            + perm('reports', 'view')
        ),
    },
    'STORE_OFFICER': {
        'name': 'Store Officer',
        'name_ar': 'مسؤول المخازن',
        'default_scope': 'DEPARTMENT',
        'permissions': (
            perm('it', 'add', 'edit', 'view')
            + perm('settings', 'view')
            + perm('reports', 'view')
            + perm('finance', 'view')
        ),
    },
    'VIEWER': {
        'name': 'Viewer',
        'name_ar': 'مشاهد (قراءة فقط)',
        'default_scope': 'GLOBAL',
        'permissions': [_r + ':view' for _r in ALL_RESOURCES],
    },
    'VECTOR_NATIONAL_MANAGER': {
        'name': 'National Vector Control Director',
        'name_ar': 'مدير مكافحة النواقل القومي',
        'default_scope': 'GLOBAL',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'delete', 'export', 'approve', 'close', 'assess')
            + perm('reports', 'view', 'export')
            + perm('notifications', 'view')
            + perm('surveillance', 'view')
            + perm('organization', 'view')
        ),
    },
    'VECTOR_SECTOR_MANAGER': {
        'name': 'Sector Vector Control Manager',
        'name_ar': 'مدير مكافحة النواقل بالقطاع',
        'default_scope': 'SECTOR',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export', 'approve', 'close', 'assess')
            + perm('reports', 'view', 'export')
            + perm('notifications', 'view')
        ),
    },
    'VECTOR_PORT_HEAD': {
        'name': 'Port Vector Control Unit Head',
        'name_ar': 'رئيس وحدة مكافحة النواقل بالمنفذ',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export', 'approve', 'close', 'assess')
            + perm('reports', 'view')
        ),
    },
    'VECTOR_FIELD_SUPERVISOR': {
        'name': 'Field Supervisor',
        'name_ar': 'المشرف الميداني',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export', 'approve', 'close')
            + perm('reports', 'view')
        ),
    },
    'VECTOR_INSPECTOR': {
        'name': 'Vector Inspector',
        'name_ar': 'مفتش مكافحة النواقل',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export')
        ),
    },
    'VECTOR_TECHNICIAN': {
        'name': 'Spray Technician',
        'name_ar': 'فني الرش والمكافحة',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit')
        ),
    },
    'VECTOR_STOCK_KEEPER': {
        'name': 'Vector Stock Keeper',
        'name_ar': 'مسؤول المخزون',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export')
        ),
    },
    'VECTOR_LAB_ANALYST': {
        'name': 'Entomological Lab Analyst',
        'name_ar': 'المختبر الحشري',
        'default_scope': 'POINT',
        'permissions': (
            perm('vector', 'view', 'add', 'edit', 'export', 'approve')
        ),
    },
    'VECTOR_REPORTS': {
        'name': 'Vector Reports User',
        'name_ar': 'مستخدم التقارير',
        'default_scope': 'GLOBAL',
        'permissions': (
            perm('vector', 'view', 'export')
            + perm('reports', 'view', 'export')
        ),
    },
}


class Command(BaseCommand):
    help = 'زراعة الأدوار الرئيسية الموحّدة (IAM) ومنظومات صلاحياتها'

    def handle(self, *args, **options):
        perm_qs = {p.code: p for p in Permission.objects.all()}
        created, updated = [], []

        for code, data in ROLES.items():
            role, was_created = Role.objects.get_or_create(
                code=code,
                defaults={
                    'name': data['name'],
                    'name_ar': data['name_ar'],
                    'default_scope': data['default_scope'],
                },
            )
            if was_created:
                created.append(code)
            else:
                role.name = data['name']
                role.name_ar = data['name_ar']
                role.default_scope = data['default_scope']
                role.save(update_fields=['name', 'name_ar', 'default_scope'])
                updated.append(code)
            codes = [c for c in data['permissions'] if c in perm_qs]
            role.permissions.set([perm_qs[c] for c in codes])

        removed = 0
        fallback = Role.objects.filter(code='ADMIN').first()
        for role in Role.objects.filter(code=''):
            users = list(role.users.all())
            for user in users:
                user.role = fallback
                user.save(update_fields=['role'])
            role.delete()
            removed += 1

        self.stdout.write(self.style.SUCCESS(
            f'تم زرع {len(ROLES)} دوراً (جديد: {len(created)}، محدّث: {len(updated)})، '
            f'وحُذف {removed} دوراً فارغاً.'
        ))