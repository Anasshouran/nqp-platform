"""بذر صلاحيات وأدوار وحدة شؤون الموظفين (HR).

قابل لإعادة التشغيل (idempotent). المصدر الوحيد لتعريف الصلاحيات هو
`seed_rbac.RESOURCES` و`seed_rbac.EXTRA_ACTIONS`، والمصدر الوحيد لتعريف
الأدوار هو `seed_rbac.ROLES`، حتى لا يتفرّع هذا الأمر عن بذر RBAC الرئيسي
ويصير مصدر الحقيقة مزدوجاً.

الاستخدام:
    python manage.py seed_hr_rbac
"""

from django.core.management.base import BaseCommand

from apps.accounts.management.commands.seed_rbac import (
    ACTIONS,
    EXTRA_ACTIONS,
    RESOURCES,
    ROLES,
    resolve_permission_codes,
)
from apps.accounts.models import Permission, Role

HR_ROLES = ('HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER')

# فصل المهام: هذه الصلاحيات لا تُمنح لدور المُدخل (HR_MANAGER / HR_SPECIALIST)
# لأنها تُنشئ طلباً ثم تعتمده على الشخص نفسه.
APPROVAL_ONLY = {
    'hr_employee:approve',
    'hr_establishment:approve',
    'hr_posting:approve',
    'hr_posting:reject',
    'hr_attendance:approve',
    'hr_leave:approve',
    'hr_leave:reject',
    'hr_training:approve',
    'hr_performance:approve',
    'hr_document:approve',
    'hr_payroll:approve',
    'hr_payroll:pay',
}

# تشغيل المسير يبقى مع المُدخل (يبني المسودة)، والاعتماد والصرف مع المعتمد.
RUNNER_ACTIONS = {'hr_payroll:run'}


class Command(BaseCommand):
    help = 'إنشاء صلاحيات وأدوار وحدة شؤون الموظفين وربطها'

    def _hr_permissions(self):
        created = 0
        for resource, resource_ar in RESOURCES.items():
            if not resource.startswith('hr_'):
                continue
            for action, action_ar in {**ACTIONS, **EXTRA_ACTIONS.get(resource, {})}.items():
                _, was_created = Permission.objects.update_or_create(
                    code=f'{resource}:{action}',
                    defaults={
                        'name': f'{action_ar} {resource_ar}',
                        'resource': resource,
                        'action': action,
                    },
                )
                created += int(was_created)
        return created

    def _role_def(self, code):
        for role_def in ROLES:
            if role_def['code'] == code:
                return role_def
        return None

    def handle(self, *args, **options):
        created_perms = self._hr_permissions()

        role_report = []
        violations = []
        for code in HR_ROLES:
            role_def = self._role_def(code)
            if role_def is None:
                violations.append(f'{code}: غير معرّف في seed_rbac.ROLES')
                continue
            role, created = Role.objects.update_or_create(
                code=code,
                defaults={
                    'name': role_def['name'],
                    'name_ar': role_def['name_ar'],
                    'description': role_def.get('description', ''),
                    'default_scope': role_def['default_scope'],
                },
            )
            codes = resolve_permission_codes(role_def['resources'])
            role.permissions.set(Permission.objects.filter(code__in=codes))

            granted = set(role.permissions.values_list('code', flat=True))
            if code in ('HR_MANAGER', 'HR_SPECIALIST'):
                leaked = sorted(granted & APPROVAL_ONLY)
                if leaked:
                    violations.append(
                        f'{code}: يحمل صلاحيات اعتماد/صرف لا يجوز لمُدخل: {", ".join(leaked)}'
                    )
            if code == 'HR_MANAGER' and not (granted & RUNNER_ACTIONS):
                violations.append(f'{code}: ينقصه تشغيل مسير الرواتب (hr_payroll:run)')
            if code == 'HR_APPROVER':
                missing = sorted(
                    c for c in APPROVAL_ONLY if c.startswith(('hr_',)) and c not in granted
                )
                if missing:
                    violations.append(
                        f'{code}: ينقصه {", ".join(missing)}'
                    )
            role_report.append(
                f"{code} ({role.name_ar}) {'جديد' if created else 'محدّث'}: {len(granted)} صلاحية"
            )

        self.stdout.write(self.style.SUCCESS(
            f'صلاحيات HR: {created_perms} جديدة\n' + '\n'.join(f'  - {r}' for r in role_report)
        ))

        if violations:
            for v in violations:
                self.stderr.write(self.style.ERROR(v))
            self.stderr.write(self.style.ERROR('فشل التحقق من فصل المهام — راجع الأعلى'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('فصل المهام سليم: المُدخل بلا اعتماد، المعتمد بلا إدخال'))
