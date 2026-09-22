from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role

FINANCE_PERMISSIONS = [
    ('finance:fee_manage', 'finance', 'fee_manage', 'إدارة بنود الرسوم'),
    ('finance:collect', 'finance', 'collect', 'التحصيل'),
    ('finance:review', 'finance', 'review', 'المراجعة المالية'),
    ('finance:cancel_refund', 'finance', 'cancel_refund', 'الإلغاء والاسترداد'),
    ('finance:reports', 'finance', 'reports', 'التقارير المالية'),
    ('finance:audit', 'finance', 'audit', 'سجل التدقيق المالي'),
]


class Command(BaseCommand):
    help = 'إنشاء صلاحيات إدارة الحسابات وربطها بالأدوار (محاسب/مراجع/مدير الحسابات).'

    def handle(self, *args, **options):
        created = 0
        for code, resource, action, name in FINANCE_PERMISSIONS:
            perm, was_created = Permission.objects.get_or_create(
                code=code,
                defaults={'name': name, 'resource': resource, 'action': action},
            )
            if was_created:
                created += 1

        acct, acct_created = Role.objects.get_or_create(
            code='ACCOUNTANT',
            defaults={'name': 'Accountant', 'name_ar': 'محاسب'},
        )
        acct.permissions.add(*Permission.objects.filter(code__in=['finance:collect', 'finance:reports']))

        reviewer, reviewer_created = Role.objects.get_or_create(
            code='FINANCIAL_REVIEWER',
            defaults={'name': 'Financial Reviewer', 'name_ar': 'مراجع مالي'},
        )
        reviewer.permissions.add(*Permission.objects.filter(code__in=['finance:review', 'finance:reports', 'finance:audit']))

        manager, manager_created = Role.objects.get_or_create(
            code='ACCOUNTS_MANAGER',
            defaults={'name': 'Accounts Manager', 'name_ar': 'مدير الحسابات القومي'},
        )
        manager.permissions.add(*Permission.objects.filter(
            code__in=['finance:fee_manage', 'finance:cancel_refund', 'finance:reports', 'finance:audit']
        ))

        self.stdout.write(self.style.SUCCESS(
            f'صلاحيات مالية: {created} جديدة؛ الأدوار: '
            f'محاسب={acct_created}, مراجع مالي={reviewer_created}, مدير الحسابات={manager_created}'
        ))