from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.accounts.models import User as NqpUser
from apps.organization.models import Department, OrgAssignment, OrgPosition, Sector, Station


class Command(BaseCommand):
    help = 'تهيئة ملف محلل الكيمياء (أحمد محمد علي): الهيكل التنظيمي، الدور، الصلاحيات، البيانات الوظيفية'

    def handle(self, *args, **options):
        user = NqpUser.objects.filter(email='ahmed.mohamed@nqp.sd').first()
        if not user:
            self.stderr.write('المستخدم ahmed.mohamed@nqp.sd غير موجود')
            return

        sector, _ = Sector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'name_en': 'Red Sea Sector'},
        )

        # المعمل ← قسم الكيمياء (قسم فرعي ضمن المعمل)
        lab, _ = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB', defaults={'name_ar': 'المعمل رقابة الأغذية', 'sector': sector},
        )
        chem_section, created = Department.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_CHEMISTRY',
            defaults={'name_ar': 'قسم الكيمياء', 'sector': sector, 'parent': lab, 'kind': Department.Kind.UNIT},
        )
        if not created:
            chem_section.parent = lab
            chem_section.sector = sector
            chem_section.kind = Department.Kind.UNIT
            chem_section.save()

        station, created = Station.objects.get_or_create(
            code='RED_SEA_FOOD_LAB_CHEM_PORT',
            defaults={'name_ar': 'ميناء بورتسودان', 'sector': sector, 'department': lab},
        )
        if not created:
            station.sector = sector
            station.department = lab
            station.save()

        position, created = OrgPosition.objects.get_or_create(
            code='CHEM_ANALYST_POSITION',
            defaults={
                'name_ar': 'محلل كيميائي',
                'name_en': 'Chemistry Analyst',
                'level': 9,
                'department': chem_section,
            },
        )
        if not created:
            position.name_ar = 'محلل كيميائي'
            position.department = chem_section
            position.save()

        assignment, _ = OrgAssignment.objects.update_or_create(
            user=user,
            position=position,
            defaults={
                'sector': sector,
                'station': station,
                'department': chem_section,
                'is_primary': True,
                'is_active': True,
                'start_date': timezone.localdate(),
            },
        )
        self.stdout.write(f'التعيين الهيكلي: {assignment}')

        # الدور
        role = Role.objects.filter(code='CHEM_ANALYST').first()
        if not role:
            self.stderr.write('دور CHEM_ANALYST غير موجود')
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

        # الصلاحيات (كيمياء)
        perms = [
            ('chemistry:view', 'مشاهدة عينات الكيمياء', 'chemistry', 'view'),
            ('chemistry:start', 'بدء التحليل', 'chemistry', 'start'),
            ('chemistry:enter_result', 'إدخال النتائج', 'chemistry', 'enter_result'),
            ('chemistry:edit_draft', 'تعديل المسودة', 'chemistry', 'edit_draft'),
            ('chemistry:submit', 'إرسال النتيجة للمراجعة', 'chemistry', 'submit'),
            ('chemistry:view_spec', 'مشاهدة المواصفات', 'chemistry', 'view_spec'),
            ('chemistry:qc', 'إجراء مراجعة QC', 'chemistry', 'qc'),
        ]
        for code, name, resource, action in perms:
            perm, _ = Permission.objects.get_or_create(
                code=code, defaults={'name': name, 'resource': resource, 'action': action},
            )
            role.permissions.add(perm)

        # الحقول الوظيفية
        profile = user.profile
        profile.employee_number = 'LAB-CH-0025'
        profile.full_name_ar = 'أحمد محمد علي'
        profile.full_name_en = 'Ahmed Muhammad Ali'
        profile.job_title = 'محلل كيميائي'
        profile.gender = 'MALE'
        profile.employment_status = 'ACTIVE'
        profile.language = 'AR'
        profile.save()

        self.stdout.write(self.style.SUCCESS('اكتمل إعداد ملف محلل الكيمياء بنجاح'))
