import os
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import EmployeeProfile, Permission, Role, RoleAssignment
from apps.accounts.models import User as NqpUser
from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector, Station


class Command(BaseCommand):
    help = 'تهيئة ملف مسؤول المواصفات والمطابقة (Standards Officer): الهيكل التنظيمي، الدور، الصلاحيات، البيانات الوظيفية'

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError(
                'بذر الحسابات التجريبية معطّل في هذه البيئة. للسماح به: SEED_DEMO_USERS=true'
            )
        user = NqpUser.objects.filter(email='standards.officer@nqp.sd').first()
        if not user:
            user = NqpUser.objects.create_user(
                email='standards.officer@nqp.sd',
                full_name='Ahmed Hassan',
                password='testpass123',
                is_active=True,
            )
            self.stdout.write('تم إنشاء المستخدم standards.officer@nqp.sd')

        sector, _ = Sector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'name_en': 'Red Sea Sector'},
        )

        lab, _ = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB', defaults={'name_ar': 'المعمل رقابة الأغذية', 'sector': sector},
        )
        standards_section, created = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_STANDARDS',
            defaults={'name_ar': 'إدارة المواصفات والمطابقة', 'sector': sector, 'parent': lab, 'kind': Department.Kind.UNIT},
        )
        if not created:
            standards_section.parent = lab
            standards_section.sector = sector
            standards_section.kind = Department.Kind.UNIT
            standards_section.save()

        station, created = Station.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_MICRO_PORT',
            defaults={'name_ar': 'ميناء بورتسودان', 'sector': sector, 'department': lab},
        )
        if not created:
            station.sector = sector
            station.department = lab
            station.save()

        position, created = OrgPosition.objects.get_or_create(
            code='STANDARDS_OFFICER_POSITION',
            defaults={
                'name_ar': 'مسؤول المواصفات والمطابقة',
                'name_en': 'Standards & Compliance Officer',
                'level': 7,
                'department': standards_section,
            },
        )
        if not created:
            position.name_ar = 'مسؤول المواصفات والمطابقة'
            position.department = standards_section
            position.save()

        assignment, _ = OrgAssignment.objects.update_or_create(
            user=user,
            position=position,
            defaults={
                'sector': sector,
                'station': station,
                'department': standards_section,
                'is_primary': True,
                'is_active': True,
                'start_date': timezone.localdate(),
            },
        )
        self.stdout.write(f'التعيين الهيكلي: {assignment}')

        role = Role.objects.filter(code='STANDARDS_OFFICER').first()
        if not role:
            self.stderr.write('دور STANDARDS_OFFICER غير موجود — شغّل seed_rbac أولاً')
            return

        user.role = role
        user.sector = sector
        user.save()

        role_assignment, _ = RoleAssignment.objects.update_or_create(
            user=user,
            role=role,
            defaults={
                'is_active': True,
                'start_date': timezone.localdate(),
                'scope_type': RoleAssignment.ScopeType.SECTOR,
                'scope_id': sector.pk,
            },
        )
        self.stdout.write(f'تعيين الدور: {role_assignment}')

        perms = [
            ('laboratory:view', 'عرض المختبر', 'laboratory', 'view'),
            ('laboratory:edit', 'تعديل المختبر', 'laboratory', 'edit'),
            ('quality:view', 'عرض الجودة', 'quality', 'view'),
            ('quality:add', 'إضافة الجودة', 'quality', 'add'),
            ('quality:edit', 'تعديل الجودة', 'quality', 'edit'),
            ('reports:view', 'عرض التقارير', 'reports', 'view'),
            ('notifications:view', 'عرض الإشعارات', 'notifications', 'view'),
        ]
        for code, name, resource, action in perms:
            perm, _ = Permission.objects.get_or_create(
                code=code, defaults={'name': name, 'resource': resource, 'action': action},
            )
            role.permissions.add(perm)

        profile, _ = EmployeeProfile.objects.get_or_create(user=user)
        profile.employee_number = 'LAB-STD-0001'
        profile.full_name_ar = 'أحمد حسن'
        profile.full_name_en = 'Ahmed Hassan'
        profile.job_title = 'مسؤول المواصفات والمطابقة'
        profile.gender = 'MALE'
        profile.employment_status = 'ACTIVE'
        profile.language = 'AR'
        profile.save()

        self.stdout.write(self.style.SUCCESS('اكتمل إعداد ملف مسؤول المواصفات والمطابقة بنجاح'))