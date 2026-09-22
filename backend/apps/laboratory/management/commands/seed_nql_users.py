import os

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import EmployeeProfile, Role, RoleAssignment
from apps.accounts.models import User as NqpUser
from apps.organization.models import Sector


class Command(BaseCommand):
    help = 'تهيئة فريق عمل معامل الحجر الصحي القطاعية (NQLIS): الإدارة القومية + مسؤولو وفنيو معامل القطاعات'

    USERS = [
        {
            'email': 'nql.admin@nqp.gov.sd',
            'full_name_en': 'National Lab Administration',
            'full_name_ar': 'الإدارة القومية للمعامل',
            'password': 'testpass123',
            'role': 'NATIONAL_LAB_ADMIN',
            'sector_code': None,
            'employee_number': 'NQL-ADM-0001',
            'job_title': 'الإدارة القومية للمعامل',
        },
        {
            'email': 'labmanager@nqp.gov.sd',
            'full_name_en': 'Lab Manager',
            'full_name_ar': 'مسؤول المعمل القومي',
            'password': 'testpass123',
            'role': 'LAB_MANAGER',
            'sector_code': 'RED_SEA',
            'employee_number': 'NQL-MGR-0001',
            'job_title': 'مسؤول المعمل',
        },
        {
            'email': 'labtechnician@nqp.gov.sd',
            'full_name_en': 'Lab Technician',
            'full_name_ar': 'فني المعمل',
            'password': 'testpass123',
            'role': 'LAB_TECHNICIAN',
            'sector_code': 'RED_SEA',
            'employee_number': 'NQL-TECH-0001',
            'job_title': 'فني مختبر',
        },
    ]

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError(
                'بذر الحسابات التجريبية معطّل في هذه البيئة. للسماح به: SEED_DEMO_USERS=true'
            )
        sector_roles = ['LAB_MANAGER', 'LAB_TECHNICIAN', 'LAB_RECEPTIONIST']
        for code, name in Sector.objects.filter(is_active=True).order_by('order').values_list('code', 'name_ar'):
            slug = code.lower()
            for role_code in sector_roles:
                self.USERS.append({
                    'email': f'{role_code.lower()}.{slug}@nqp.gov.sd',
                    'full_name_en': f'{role_code.title()} {code}',
                    'full_name_ar': f'{role_code} {name}',
                    'password': 'testpass123',
                    'role': role_code,
                    'sector_code': code,
                    'employee_number': f'NQL-{code}-{role_code}',
                    'job_title': 'كادر معمل قطاعي',
                })

        for item in self.USERS:
            user = NqpUser.objects.filter(email=item['email']).first()
            if not user:
                user = NqpUser.objects.create_user(
                    email=item['email'],
                    full_name=item['full_name_en'],
                    password=item['password'],
                    is_active=True,
                )
                self.stdout.write(f'تم إنشاء المستخدم {item["email"]}')

            role = Role.objects.filter(code=item['role']).first()
            if not role:
                self.stderr.write(f'دور {item["role"]} غير موجود — شغّل seed_rbac أولاً')
                continue

            user.role = role
            if item['sector_code']:
                sector = Sector.objects.filter(code=item['sector_code']).first()
                if sector:
                    user.sector = sector
            user.save()

            scope_type = RoleAssignment.ScopeType.GLOBAL
            scope_id = None
            if item['sector_code']:
                sector = Sector.objects.filter(code=item['sector_code']).first()
                if sector:
                    scope_type = RoleAssignment.ScopeType.SECTOR
                    scope_id = sector.pk

            RoleAssignment.objects.update_or_create(
                user=user,
                role=role,
                defaults={
                    'is_active': True,
                    'start_date': timezone.localdate(),
                    'scope_type': scope_type,
                    'scope_id': scope_id,
                },
            )

            profile, _ = EmployeeProfile.objects.get_or_create(user=user)
            profile.employee_number = item['employee_number']
            profile.full_name_ar = item['full_name_ar']
            profile.full_name_en = item['full_name_en']
            profile.job_title = item['job_title']
            profile.gender = 'MALE'
            profile.employment_status = 'ACTIVE'
            profile.language = 'AR'
            profile.save()

            self.stdout.write(self.style.SUCCESS(f'جاهز: {item["full_name_ar"]} ← {item["role"]}'))