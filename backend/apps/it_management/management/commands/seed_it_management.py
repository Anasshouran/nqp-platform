"""بذر بيانات وحدة تقنية المعلومات لقطاع البحر الأحمر (RED_SEA).

يتضمن: تحويل/إنشاء حساب مدير تقنية المعلومات للقطاع بدور SECTOR_IT_MANAGER،
وبذر الأنظمة القياسية الثمانية، وأصول تقنية افتراضية، وتذاكر دعم بالأولويات،
وحالة شبكة لكل نقطة دخول نشطة بالقطاع.
"""
import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.it_management.models import ITAsset, ItSystem, NetworkStatus, SupportTicket
from apps.masterdata.models import EntryPoint
from apps.organization.models import Sector

User = get_user_model()

SYSTEMS = [
    ('SYS-AIRPORT', 'Airport Health', 'نظام صحة المطارات'),
    ('SYS-SEAPORT', 'Seaport Health', 'نظام صحة الموانئ'),
    ('SYS-FOOD', 'Food Safety', 'نظام سلامة الغذاء'),
    ('SYS-LAB', 'Laboratory', 'نظام المختبر'),
    ('SYS-VECTOR', 'Vector Control', 'نظام مكافحة النواقل'),
    ('SYS-SURV', 'Surveillance', 'نظام الترصد الوبائي'),
    ('SYS-CERT', 'Certificates', 'نظام إصدار الشهادات'),
    ('SYS-NOTIF', 'Notifications', 'نظام الإشعارات'),
]


class Command(BaseCommand):
    help = 'بذر وحدة تقنية المعلومات ومديرها لقطاع البحر الأحمر'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='Ahmed@gmail.com')
        parser.add_argument('--password', default='testpass123')
        parser.add_argument('--name', default='م. أحمد عثمان')
        parser.add_argument('--sector-code', default='RED_SEA')

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError('SEED_DEMO_USERS=true مطلوب لتمكين بذر البيانات التجريبية')

        sector = Sector.objects.filter(code=options['sector_code']).first()
        if not sector:
            self.stderr.write(self.style.ERROR(f'قطاع {options["sector_code"]} غير موجود'))
            return

        self._seed_manager(options, sector)
        self._seed_systems(sector)
        self._seed_assets(sector)
        self._seed_tickets(sector)
        self._seed_networks(sector)

        self.stdout.write(self.style.SUCCESS(
            f'تم بذر وحدة تقنية المعلومات لـ {sector.name_ar}'
        ))

    def _seed_manager(self, options, sector):
        role = Role.objects.filter(code='SECTOR_IT_MANAGER').first()
        if not role:
            self.stderr.write(self.style.ERROR('نفّذ seed_rbac أولاً (لا يوجد دور SECTOR_IT_MANAGER)'))
            return
        user = User.objects.filter(email=options['email']).first()
        created = False
        if not user:
            user = User(email=options['email'])
            created = True
        user.full_name = options['name']
        user.user_type = 'MINISTRY_STAFF'
        user.is_active = True
        user.set_password(options['password'])
        user.save()
        user.role = role
        user.sector = sector
        user.save(update_fields=['role', 'sector'])
        RoleAssignment.objects.update_or_create(
            user=user,
            role=role,
            scope_type=ScopeType.SECTOR,
            defaults={'scope_id': str(sector.id), 'is_active': True},
        )
        RoleAssignment.objects.filter(user=user, is_active=True).exclude(role=role).update(is_active=False)
        prefix = 'أُنشئ' if created else 'حُدِّث'
        self.stdout.write(self.style.SUCCESS(f'{prefix} مدير تقنية المعلومات: {user.email}'))

    def _seed_systems(self, sector):
        ItSystem.objects.filter(sector=sector).delete()
        for idx, (code, name, name_ar) in enumerate(SYSTEMS):
            status = ItSystem.Status.WARNING if idx == 2 else ItSystem.Status.OFFLINE if idx == 5 else ItSystem.Status.ONLINE
            ItSystem.objects.create(
                code=f'{code}-REDSEA',
                name=name,
                name_ar=name_ar,
                status=status,
                request_count=idx * 100 + 50,
                last_checked_at=timezone.now() - timedelta(minutes=idx),
                last_error='انقطاع مؤقت في الاتصال بقاعدة البيانات' if status != ItSystem.Status.ONLINE else '',
                sector=sector,
            )
        self.stdout.write(self.style.SUCCESS(f'بُذر {len(SYSTEMS)} نظام تقني'))

    def _entry_points(self, sector):
        return list(EntryPoint.objects.filter(is_active=True, sector=sector).order_by('order'))

    def _seed_assets(self, sector):
        ITAsset.objects.filter(sector=sector).delete()
        ports = self._entry_points(sector)
        manager = User.objects.filter(sector=sector, role__code='SECTOR_IT_MANAGER').first()
        assets = [
            ('حاسب مكتبي - إدارة المطار', ITAsset.AssetType.COMPUTER, 'SN-RS-1001'),
            ('حاسب محمول - مفتش صحّة الموانئ', ITAsset.AssetType.LAPTOP, 'SN-RS-1002'),
            ('طابعة ليزر - إصدار الشهادات', ITAsset.AssetType.PRINTER, 'SN-RS-1003'),
            ('ماسح ضوئي - مستندات الفسح', ITAsset.AssetType.SCANNER, 'SN-RS-1004'),
            ('موجه شبكة - مركز التشغيل', ITAsset.AssetType.NETWORK, 'SN-RS-1005'),
            ('خادم تطبيقات - محلي', ITAsset.AssetType.SERVER, 'SN-RS-1006'),
            ('حاسب مكتبي - ميناء بورتسودان', ITAsset.AssetType.COMPUTER, 'SN-RS-1007'),
            ('طابعة حرارية - معبر', ITAsset.AssetType.PRINTER, 'SN-RS-1008'),
        ]
        for idx, (name, atype, serial) in enumerate(assets):
            status = ITAsset.Status.MAINTENANCE if idx == 4 else ITAsset.Status.REPAIR if idx == 6 else ITAsset.Status.ACTIVE
            ITAsset.objects.create(
                name=name,
                asset_type=atype,
                serial_number=serial,
                entry_point=ports[idx % len(ports)] if ports else None,
                location='مقر التنفيذ',
                assigned_to=manager if idx % 2 == 0 else None,
                status=status,
                notes='' if status == ITAsset.Status.ACTIVE else 'قيد المتابعة',
                sector=sector,
            )
        self.stdout.write(self.style.SUCCESS(f'بُذر {len(assets)} أصل تقني'))

    def _seed_tickets(self, sector):
        SupportTicket.objects.filter(sector=sector).delete()
        ports = self._entry_points(sector)
        manager = User.objects.filter(sector=sector, role__code='SECTOR_IT_MANAGER').first()
        tickets = [
            ('انقطاع نظام صحة المطارات', 'فشل الاتصال بقاعدة البيانات في محطة مطار بورتسودان.', SupportTicket.Priority.CRITICAL, SupportTicket.Status.IN_PROGRESS),
            ('بطء نظام إصدار الشهادات', 'ارتفاع زمن استجابة النظام في ساعات الذروة.', SupportTicket.Priority.HIGH, SupportTicket.Status.OPEN),
            ('طابعة الشهادات لا تعمل', 'الطابعة SN-RS-1003 لا تستجيب لطلبات الطباعة.', SupportTicket.Priority.HIGH, SupportTicket.Status.OPEN),
            ('ماسح المستندات معطّل', 'الماسح SN-RS-1004 يظهر خطأ في التقاط الصور.', SupportTicket.Priority.MEDIUM, SupportTicket.Status.IN_PROGRESS),
            ('طلب تحديث برمجيات', 'الرغبة في تحديث نظام تشغيل الحاسبات المكتبية.', SupportTicket.Priority.LOW, SupportTicket.Status.RESOLVED),
        ]
        for idx, (subject, desc, priority, status) in enumerate(tickets):
            SupportTicket.objects.create(
                ticket_no=f'TKT-{timezone.now().year}-{1001 + idx}',
                subject=subject,
                description=desc,
                priority=priority,
                status=status,
                entry_point=ports[idx % len(ports)] if ports else None,
                created_by=manager,
                assigned_to=manager,
                resolved_at=timezone.now() if status == SupportTicket.Status.RESOLVED else None,
                sector=sector,
            )
        self.stdout.write(self.style.SUCCESS(f'بُذر {len(tickets)} تذكرة دعم'))

    def _seed_networks(self, sector):
        NetworkStatus.objects.filter(sector=sector).delete()
        ports = self._entry_points(sector)
        for idx, port in enumerate(ports):
            connected = idx != 2
            NetworkStatus.objects.create(
                entry_point=port,
                connected=connected,
                ping_ms=15 + idx * 4 if connected else 0,
                last_sync=timezone.now() - timedelta(minutes=idx),
                sector=sector,
            )
        self.stdout.write(self.style.SUCCESS(f'بُذر {len(ports)} سجل شبكة'))