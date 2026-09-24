"""تحقق مصالحة قراءة-فقط: هل تغطي صلاحيات قاعدة البيانات كل المراجع في ملفات البذر؟

يُشغَّل يدوياً أو في CI (لا يعدّل أي بيانات/هجرات) ليكشف:
  1. صلاحيات مفقودة من قاعدة البيانات (مرجعها موجود في ملفات البذر لكنها لم تُنشأ).
  2. صلاحيات يتيمة (موجودة في DB بلا أي مصدر في ملفات البذر) — تبرز فجوة VPS.
  3. أدوار مرجعية لصلاحيات لا تُمنح فعلاً (الإسقاط الصامت عند البذر).

الاستخدام:
    python manage.py verify_seed_coverage
"""

import sys

from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role
from apps.accounts.management.commands import seed_iam_roles, seed_rbac
from apps.finance.management.commands.seed_finance_rbac import FINANCE_PERMISSIONS

# رموز إضافية تنشئها أدوات العرض التجريبي (ليست ضمن RESOURCES القياسية)
DEMO_EXTRA_CODES = {
    'chemistry:start',
    'chemistry:enter_result',
    'chemistry:edit_draft',
    'chemistry:submit',
    'chemistry:view_spec',
    'chemistry:qc',
}


class Command(BaseCommand):
    help = 'تحقق من أن تغطية صلاحيات قاعدة البيانات تطابق مراجع ملفات البذر (قراءة فقط)'

    def _expected_codes(self) -> set:
        expected = set()
        for res in seed_rbac.RESOURCES:
            actions = {**seed_rbac.ACTIONS, **seed_rbac.EXTRA_ACTIONS.get(res, {})}
            expected.update(f'{res}:{action}' for action in actions)
        expected.update(code for code, _res, _act, _name in FINANCE_PERMISSIONS)
        expected.update(DEMO_EXTRA_CODES)
        return expected

    def handle(self, *args, **options):
        db_codes = set(Permission.objects.values_list('code', flat=True))
        expected = self._expected_codes()

        missing = sorted(expected - db_codes)
        orphans = sorted(db_codes - expected)

        # أدوار تُشير لصلاحيات لا تُمنح فعلاً (إسقاط صامت عند البذر)
        dropped_roles = {}
        role_defs = [d for d in seed_rbac.ROLES] + [
            {'code': code, 'codes': list(data['permissions'])}
            for code, data in seed_iam_roles.ROLES.items()
        ]
        for role_def in role_defs:
            ref_codes = role_def.get('codes')
            if ref_codes is None:
                ref_codes = seed_rbac.resolve_permission_codes(role_def['resources'])
            ref = set(ref_codes)
            if not ref:
                continue
            role = Role.objects.filter(code=role_def['code']).first()
            granted = set(role.permissions.values_list('code', flat=True)) if role else set()
            dropped = sorted(ref - granted)
            if dropped:
                dropped_roles[role_def['code']] = dropped

        self.stdout.write(self.style.SUCCESS('--- مصالحة تغطية الصلاحيات (قراءة فقط) ---'))
        self.stdout.write(
            f'صلاحيات في DB: {len(db_codes)} | ' +
            f'المرجع المتاح (بذر + مالي + تجريبي): {len(expected)}'
        )

        if missing:
            self.stderr.write(
                self.style.WARNING(
                    f'صلاحيات غير مزارعة في DB ({len(missing)}):\n    ' + '\n    '.join(missing)
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('لا صلاحيات ناقصة — كل مراجع البذر مغطاة'))

        if orphans:
            self.stderr.write(
                self.style.WARNING(
                    f'صلاحيات يتيمة في DB بدون مصدر بذر ({len(orphans)}):\n    ' + '\n    '.join(orphans)
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('لا صلاحيات يتيمة'))

        if dropped_roles:
            lines = []
            for code, dropped in sorted(dropped_roles.items()):
                lines.append(f'  {code}: {len(dropped)} — {", ".join(dropped)}')
            self.stderr.write(
                self.style.WARNING(
                    f'أدوار صلاحياتها المرجعية غير ممنوحة فعلاً ({len(dropped_roles)}):\n' + '\n'.join(lines)
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('كل الأدوار تحمل كل الصلاحيات المرجعية'))

        has_issues = bool(missing or orphans or dropped_roles)
        self.stdout.write(
            self.style.ERROR('يوجد خلل — راجع التفاصيل أعلاه') if has_issues
            else self.style.SUCCESS('كل شيء متوافق')
        )
        if has_issues:
            sys.exit(1)