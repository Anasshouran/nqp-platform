from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector

User = get_user_model()


class Command(BaseCommand):
    help = 'بذر التعيينات الهيكلية الافتراضية للموظفين (منصب/قطاع/قسم)'

    ASSIGNMENTS = [
        {'email': 'admin@nqp.gov.sd', 'position': 'MINISTER', 'sector': None, 'department': None, 'is_primary': True},
        {'email': 'admin3@nqp.gov.sd', 'position': 'DG_EMERGENCY', 'sector': None, 'department': None, 'is_primary': True},
        {'email': 'orgadmin@nqp.gov.sd', 'position': 'DG_SECTOR', 'sector': 'KHARTOUM', 'department': None, 'is_primary': True},
        {'email': 'officer2@nqp.gov.sd', 'position': None, 'sector': 'RED_SEA', 'department': 'RED_SEA_QUARANTINE', 'is_primary': True},
        {'email': 'debug2@nqp.gov.sd', 'position': None, 'sector': 'KASSALA', 'department': 'KASSALA_SURVEILLANCE', 'is_primary': True},
        {'email': 'debug3@nqp.gov.sd', 'position': None, 'sector': 'GEDAREF', 'department': 'GEDAREF_LABORATORY', 'is_primary': True},
        {'email': 'dbg@nqp.gov.sd', 'position': None, 'sector': 'NORTHERN', 'department': 'NORTHERN_PLANNING', 'is_primary': True},
        {'email': 'dbg-u3@nqp.gov.sd', 'position': None, 'sector': 'EL_OBEID', 'department': 'EL_OBEID_HR', 'is_primary': True},
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

            obj, was_created = OrgAssignment.objects.update_or_create(
                user=user,
                position=position,
                sector=sector,
                department=department,
                defaults={
                    'is_primary': row['is_primary'],
                    'start_date': date(2026, 1, 1),
                    'end_date': None,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            self.stdout.write(self.style.SUCCESS(
                f'✓ {user.email} → {position.name_ar if position else (sector.name_ar if sector else department.name_ar)}'
            ))

        self.stdout.write(self.style.SUCCESS(f'تم بذر التعيينات الهيكلية ({created} جديدة)'))
