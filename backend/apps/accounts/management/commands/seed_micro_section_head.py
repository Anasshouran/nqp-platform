import os
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import EmployeeProfile, Permission, Role, RoleAssignment
from apps.accounts.models import User as NqpUser
from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector, Station


class Command(BaseCommand):
    help = 'تهيئة ملف رئيس قسم الأحياء الدقيقة: الهيكل التنظيمي، الدور، الصلاحيات، البيانات الوظيفية'

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError(
                'بذر الحسابات التجريبية معطّل في هذه البيئة. للسماح به: SEED_DEMO_USERS=true'
            )
        user = NqpUser.objects.filter(email='micro.sectionhead@nqp.sd').first()
        if not user:
            user = NqpUser.objects.create_user(
                email='micro.sectionhead@nqp.sd',
                full_name='Sara Eltaher',
                password='testpass123',
                is_active=True,
            )
            self.stdout.write('تم إنشاء المستخدم micro.sectionhead@nqp.sd')

        sector, _ = Sector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'name_en': 'Red Sea Sector'},
        )

        lab, _ = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB', defaults={'name_ar': 'المعمل رقابة الأغذية', 'sector': sector},
        )
        micro_section, created = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_MICROBIOLOGY',
            defaults={'name_ar': 'قسم الأحياء الدقيقة', 'sector': sector, 'parent': lab, 'kind': Department.Kind.UNIT},
        )
        if not created:
            micro_section.parent = lab
            micro_section.sector = sector
            micro_section.kind = Department.Kind.UNIT
            micro_section.save()

        station, created = Station.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_MICRO_PORT',
            defaults={'name_ar': 'ميناء بورتسودان', 'sector': sector, 'department': lab},
        )
        if not created:
            station.sector = sector
            station.department = lab
            station.save()

        position, created = OrgPosition.objects.get_or_create(
            code='MICRO_SECTION_HEAD_POSITION',
            defaults={
                'name_ar': 'رئيس قسم الأحياء الدقيقة',
                'name_en': 'Microbiology Section Head',
                'level': 8,
                'department': micro_section,
            },
        )
        if not created:
            position.name_ar = 'رئيس قسم الأحياء الدقيقة'
            position.department = micro_section
            position.save()

        assignment, _ = OrgAssignment.objects.update_or_create(
            user=user,
            position=position,
            defaults={
                'sector': sector,
                'station': station,
                'department': micro_section,
                'is_primary': True,
                'is_active': True,
                'start_date': timezone.localdate(),
            },
        )
        self.stdout.write(f'التعيين الهيكلي: {assignment}')

        role = Role.objects.filter(code='MICRO_SECTION_HEAD').first()
        if not role:
            self.stderr.write('دور MICRO_SECTION_HEAD غير موجود — شغّل seed_rbac أولاً')
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
            ('laboratory:add', 'إضافة المختبر', 'laboratory', 'add'),
            ('laboratory:edit', 'تعديل المختبر', 'laboratory', 'edit'),
        ]
        for code, name, resource, action in perms:
            perm, _ = Permission.objects.get_or_create(
                code=code, defaults={'name': name, 'resource': resource, 'action': action},
            )
            role.permissions.add(perm)

        profile, _ = EmployeeProfile.objects.get_or_create(user=user)
        profile.employee_number = 'LAB-MICRO-0010'
        profile.full_name_ar = 'سارة التاهر'
        profile.full_name_en = 'Sara Eltaher'
        profile.job_title = 'رئيس قسم الأحياء الدقيقة'
        profile.gender = 'FEMALE'
        profile.employment_status = 'ACTIVE'
        profile.language = 'AR'
        profile.save()

        self.stdout.write(self.style.SUCCESS('اكتمل إعداد ملف رئيس قسم الأحياء الدقيقة بنجاح'))