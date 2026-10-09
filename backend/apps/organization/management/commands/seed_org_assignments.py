from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.masterdata.models import EntryPoint
from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector, Station

User = get_user_model()


class Command(BaseCommand):
    help = 'بذر التعيينات الهيكلية الافتراضية للموظفين (منصب/قطاع/قسم/محطة/نقطة دخول)'

    ASSIGNMENTS = [
        {'email': 'admin@nqp.gov.sd', 'position': 'MINISTRY', 'sector': None, 'department': None, 'is_primary': True},
        {'email': 'admin3@nqp.gov.sd', 'position': 'DG_EMERGENCY', 'sector': None, 'department': None, 'is_primary': True},
        {'email': 'orgadmin@nqp.gov.sd', 'position': 'SECTOR_DIRECTOR', 'sector': 'KHARTOUM', 'department': None, 'is_primary': True},
        {'email': 'officer2@nqp.gov.sd', 'position': None, 'sector': 'RED_SEA', 'department': 'RED_SEA_PORT_HEALTH', 'is_primary': True},
        {'email': 'debug2@nqp.gov.sd', 'position': None, 'sector': 'KASSALA', 'department': None, 'is_primary': True},
        {'email': 'debug3@nqp.gov.sd', 'position': None, 'sector': 'GEDAREF', 'department': None, 'is_primary': True},
        {'email': 'dbg@nqp.gov.sd', 'position': None, 'sector': 'NORTHERN', 'department': None, 'is_primary': True},
        {'email': 'dbg-u3@nqp.gov.sd', 'position': None, 'sector': 'EL_OBEID', 'department': None, 'is_primary': True},
    ]

    # ——— المعابر البرية: الارتباط التنظيمي المعتمد هو OrgAssignment.entry_point ———
    # `EP_ERITREA_BORDER` و`EP_SOUTH_SUDAN_BORDER` مستبعدان عمداً: سلتان حدودية عامة
    # غير مسمّاة (`location=''` في seed_masterdata) — لا اسم محطة مُوثَّق لهما، لذا
    # تُسجَّلان كـ ORGANIZATIONAL_ASSIGNMENT_PENDING ولا يُختلق لهما تعيين.
    # `RED_SEA_LAND_PORTS_ARGIN` لا يُستخدم لـ EP_ARGIN: محطة قطاع البحر الأحمر بينما
    # نقطة الدخول في القطاع الشمالي — إعادة استخدامها تسبّب تسرّب نطاق بين القطاعات.
    LAND_BORDER_ASSIGNMENTS = [
        {'entry_point': 'EP_ARGIN', 'email': 'border.argin@nqp.gov.sd'},
        {'entry_point': 'EP_WADI_HALFA', 'email': 'border.wadihalfa@nqp.gov.sd'},
        {'entry_point': 'EP_MUTHALLATH', 'email': 'border.muthallath@nqp.gov.sd'},
        {'entry_point': 'EP_GALLABAT', 'email': 'border.gallabat@nqp.gov.sd'},
        {'entry_point': 'EP_ADRE', 'email': 'border.adre@nqp.gov.sd'},
        {'entry_point': 'EP_TINE', 'email': 'border.tine@nqp.gov.sd'},
        {'entry_point': 'EP_ASHKEIT', 'email': 'border.ashkeit@nqp.gov.sd'},
        {'entry_point': 'EP_ALAFIA', 'email': 'border.alafia@nqp.gov.sd'},
        {'entry_point': 'EP_OSEIF', 'email': 'border.oseif@nqp.gov.sd'},
        {'entry_point': 'EP_GABAIT', 'email': 'border.gabait@nqp.gov.sd'},
    ]

    def handle(self, *args, **options):
        created = 0
        for row in self.ASSIGNMENTS:
            try:
                user = User.objects.get(email=row['email'])
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'تخطي (لا يوجد مستخدم): {row["email"]}'))
                continue

            position = OrgPosition.objects.filter(code=row['position']).first() if row['position'] else None
            sector = Sector.objects.filter(code=row['sector']).first() if row['sector'] else None
            department = Department.objects.filter(code=row['department']).first() if row['department'] else None

            if position is None and sector is None and department is None:
                self.stdout.write(self.style.WARNING(
                    f'تخطي (تعيين بلا مرجع صالح): {row["email"]}'
                ))
                continue

            obj, was_created = OrgAssignment.objects.update_or_create(
                user=user,
                position=position,
                sector=sector,
                department=department,
                station=None,
                entry_point=None,
                defaults={
                    'is_primary': row['is_primary'],
                    'start_date': date(2026, 1, 1),
                    'end_date': None,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            target = position or sector or department
            self.stdout.write(self.style.SUCCESS(f'✓ {user.email} → {target.name_ar}'))

        created += self._seed_land_borders()
        self.stdout.write(self.style.SUCCESS(f'تم بذر التعيينات الهيكلية ({created} جديدة)'))

    def _seed_land_borders(self):
        """تعيين ضابط لكل معبر برّي مسمّى عبر OrgAssignment.entry_point.

        يحافظ على قيد عدم تسرّب النطاق: قطاع التعيين = قطاع نقطة الدخول، وإلا
        يُتخطّى السجل بتحذير بدل إنشاء تعيين يربط قطاعين مختلفين.
        """
        created = 0
        for row in self.LAND_BORDER_ASSIGNMENTS:
            entry_point = EntryPoint.objects.filter(code=row['entry_point']).first()
            if entry_point is None:
                self.stdout.write(self.style.WARNING(
                    f'تخطي (لا توجد نقطة دخول): {row["entry_point"]}'
                ))
                continue
            if entry_point.kind != 'LAND_PORT':
                self.stdout.write(self.style.WARNING(
                    f'تخطي (ليست معبراً برّياً): {row["entry_point"]}'
                ))
                continue

            sector = entry_point.sector
            department = (
                Department.objects.filter(code=f'{sector.code}_LAND_PORTS').first()
                or Department.objects.filter(sector=sector, code__endswith='_LAND_PORTS').first()
            )
            station = None
            if department is not None and entry_point.location:
                # البحث داخل إدارة المعابر فقط: قد يشترك نفس الموقع مع محطة إدارة أخرى
                # (مثل RED_SEA_FOOD_OSEIF) ولا يجوز ربطها بنقطة الدخول نفسها.
                station = Station.objects.filter(
                    department=department, location=entry_point.location, is_active=True,
                ).first()

            if station is None and department is None:
                self.stdout.write(self.style.WARNING(
                    f'ORGANIZATIONAL_ASSIGNMENT_PENDING: {row["entry_point"]} '
                    f'(لا محطة ولا إدارة معابر في قطاع {sector.code})'
                ))
                continue

            # الربط بسجل org Station مطابق لقطاع نقطة الدخول شرطٌ لمنع تسرّب النطاق.
            if station is not None and station.sector_id != sector.id:
                self.stdout.write(self.style.WARNING(
                    f'تخطي (محطة خارج قطاع نقطة الدخول): {row["entry_point"]}'
                ))
                continue

            try:
                user = User.objects.get(email=row['email'])
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'تخطي (لا يوجد مستخدم): {row["email"]} '
                    f'— شغّل seed_border_officers أو أنشئ الحساب يدوياً'
                ))
                continue

            obj, was_created = OrgAssignment.objects.update_or_create(
                user=user,
                position=None,
                sector=sector,
                department=department,
                station=station,
                entry_point=entry_point,
                defaults={
                    'is_primary': True,
                    'start_date': date(2026, 1, 1),
                    'end_date': None,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            label = station.name_ar if station else department.name_ar
            self.stdout.write(
                self.style.SUCCESS(f'✓ {user.email} → {entry_point.name_ar} ({label})')
            )
        return created
