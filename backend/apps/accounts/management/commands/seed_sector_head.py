"""بذر حساب مدير إدارة رقابة الأغذية بالقطاع (SECTOR_HEAD)."""
from django.contrib.auth import get_user_model
import os
from django.core.management.base import BaseCommand, CommandError
from apps.accounts.models import Role
from apps.organization.models import Sector


class Command(BaseCommand):
    help = 'إنشاء/تحديث مستخدم مدير رقابة الأغذية بالقطاع'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='sector@nqp.gov.sd')
        parser.add_argument('--password', default='testpass123')
        parser.add_argument('--name', default='د. طارق بحري')
        parser.add_argument('--sector-code', default='', help='كود القطاع (افتراضيًا أول قطاع به منافذ)')

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError(
                'بذر الحسابات التجريبية معطّل في هذه البيئة. للسماح به: SEED_DEMO_USERS=true'
            )
        User = get_user_model()
        role = Role.objects.filter(code='SECTOR_HEAD').first()
        if not role:
            self.stderr.write(self.style.ERROR('نفّذ seed_rbac أولاً'))
            return

        sector = None
        if options['sector_code']:
            sector = Sector.objects.filter(name_ar__icontains=options['sector_code']).first()
        if not sector:
            sector = Sector.objects.filter(entry_points__isnull=False).distinct().first()
        if not sector:
            self.stderr.write(self.style.ERROR('لا توجد قطاعات مرتبطة بمنافذ'))
            return

        user = User.objects.filter(email=options['email']).first()
        created = False
        if not user:
            user = User(email=options['email'], full_name=options['name'])
            created = True
        user.full_name = options['name']
        user.role = role
        user.sector = sector
        user.user_type = 'MINISTRY_STAFF'
        user.is_active = True
        user.set_password(options['password'])
        user.save()
        prefix = 'أُنشئ' if created else 'حُدِّث'
        self.stdout.write(self.style.SUCCESS(
            f'{prefix} {user.email} — {role.name_ar} — قطاع: {sector.name_ar}'
        ))
