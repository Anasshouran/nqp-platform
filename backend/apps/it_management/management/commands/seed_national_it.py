"""بذر البيانات القومية لتقنية المعلومات: التكاملات الحكومية + مدير IT قومي تجريبي."""

import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.it_management.models import GovernmentIntegration, ITAsset, ItSystem, NetworkStatus, SupportTicket
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
    ('SYS-CMS', 'Content & Services', 'نظام المحتوى والخدمات'),
    ('SYS-REPORT', 'Reporting', 'نظام التقارير'),
    ('SYS-MAIL', 'Email & Directory', 'نظام البريد والدليل'),
    ('SYS-FIN', 'Finance', 'النظام المالي'),
    ('SYS-HR', 'HR', 'نظام الموارد البشرية'),
]

INTEGRATIONS = [
    ('CUSTOMS', 'الجمارك', 'Customs', GovernmentIntegration.Status.CONNECTED),
    ('PASSPORT', 'الهجرة والجوازات', 'Immigration & Passports', GovernmentIntegration.Status.CONNECTED),
    ('PORTS_AUTH', 'سلطة الموانئ', 'Ports Authority', GovernmentIntegration.Status.WARNING),
    ('MIN_FINANCE', 'وزارة المالية', 'Ministry of Finance', GovernmentIntegration.Status.ERROR),
    ('CIVIL_AVIATION', 'الطيران المدني', 'Civil Aviation', GovernmentIntegration.Status.CONNECTED),
    ('SSMO', 'المواصفات والمقاييس', 'Standards & Metrology (SSMO)', GovernmentIntegration.Status.WARNING),
    ('MOH', 'وزارة الصحة', 'Ministry of Health', GovernmentIntegration.Status.CONNECTED),
]


class Command(BaseCommand):
    help = 'بذر التكاملات الحكومية القومية ومدير تقنية المعلومات القومي التجريبي'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='national.it@nqp.gov.sd')
        parser.add_argument('--password', default='testpass123')
        parser.add_argument('--name', default='م. سمير محمد')

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError('SEED_DEMO_USERS=true مطلوب لتمكين بذر البيانات التجريبية')

        self._seed_integrations()
        self._seed_sector_systems()
        self._seed_director(options)
        self.stdout.write(self.style.SUCCESS('تم بذر تقنية المعلومات القومية'))

    def _seed_sector_systems(self):
        """بذر الأنظمة القياسية لنقاط الدخول لكل قطاع (تكتمل الحالة بالأثر لكل قطاع).

        يُتخطى القطاع إن بُذرت الأنظمة له مسبقاً (يُحافظ على تذاكر/أصول حقيقية).
        """
        for sector in Sector.objects.filter(is_active=True):
            if ItSystem.objects.filter(sector=sector).exists():
                continue
            entry_points = list(EntryPoint.objects.filter(is_active=True, sector=sector).order_by('order'))
            for idx, (code, name, name_ar) in enumerate(SYSTEMS):
                status = (
                    ItSystem.Status.WARNING if idx == 3
                    else ItSystem.Status.OFFLINE if idx == 10
                    else ItSystem.Status.ONLINE
                )
                ItSystem.objects.create(
                    code=f'{code}-{sector.code[:4]}',
                    name=name,
                    name_ar=name_ar,
                    status=status,
                    request_count=idx * 120 + 40,
                    last_checked_at=timezone.now() - timedelta(minutes=idx * 2),
                    last_error='انقطاع مؤقت في الاتصال' if status != ItSystem.Status.ONLINE else '',
                    sector=sector,
                )
            for pidx, port in enumerate(entry_points):
                NetworkStatus.objects.create(
                    entry_point=port,
                    connected=pidx != 2,
                    ping_ms=12 + pidx * 5 if pidx != 2 else 0,
                    last_sync=timezone.now() - timedelta(minutes=pidx),
                    sector=sector,
                )
        self.stdout.write(self.style.SUCCESS('تم ضمان بذر الأنظمة والشبكات لكل القطاعات'))

    def _seed_integrations(self):
        for idx, (code, name_ar, name_en, status) in enumerate(INTEGRATIONS):
            error_count = 2 if status == GovernmentIntegration.Status.WARNING else (
                5 if status == GovernmentIntegration.Status.ERROR else 0
            )
            GovernmentIntegration.objects.update_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'name_en': name_en,
                    'status': status,
                    'last_sync_at': timezone.now() - timedelta(minutes=5 + idx * 3),
                    'error_count': error_count,
                    'order': idx,
                    'is_active': True,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'بُذر {len(INTEGRATIONS)} تكامل حكومي'))

    def _seed_director(self, options):
        role = Role.objects.filter(code='NATIONAL_IT_DIRECTOR').first()
        if not role:
            self.stderr.write(self.style.ERROR('نفّذ seed_rbac أولاً (لا يوجد دور NATIONAL_IT_DIRECTOR)'))
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
        user.sector = None
        user.save(update_fields=['role', 'sector'])
        RoleAssignment.objects.update_or_create(
            user=user,
            role=role,
            scope_type=ScopeType.GLOBAL,
            defaults={'scope_id': None, 'is_active': True},
        )
        RoleAssignment.objects.filter(user=user, is_active=True).exclude(role=role).update(is_active=False)
        prefix = 'أُنشئ' if created else 'حُدِّث'
        self.stdout.write(self.style.SUCCESS(f'{prefix} مدير تقنية المعلومات القومي: {user.email}'))
