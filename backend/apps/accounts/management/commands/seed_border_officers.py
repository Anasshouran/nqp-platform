"""بذر حسابات ضباط الصحة الحدودية لكل معبر برّي مسمّى.

يتبع نمط أوامر الأدوار القائمة (`seed_sector_head`, `seed_lab_director`, ...):
- معطّل افتراضياً ويُفعَّل بـ `SEED_DEMO_USERS=true`.
- بريد النظام `border.<poe>@nqp.gov.sd` — نفس نمط `seed_org_assignments.LAND_BORDER_ASSIGNMENTS`.
- `full_name` مشتق من اسم المعبر في السجل المرجعي، لا من أسماء أشخاص مُختلقة.

الحسابات بيانات تجريبية فقط؛ الارتباط التنظيمي الفعلي ينشئه `seed_org_assignments`
عبر `OrgAssignment.entry_point`. كما ينشئ هذا الأمر `RoleAssignment` نشطاً بنطاق
`PORT` لكل ضابط، لأن `User.can()` لا يقرأ `User.role`.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import EntryPoint
from apps.organization.management.commands.seed_org_assignments import (
    Command as SeedOrgAssignments,
)
from apps.organization.models import Sector


class Command(BaseCommand):
    help = 'إنشاء/تحديث حسابات ضباط الصحة الحدودية لكل معبر برّي مسمّى'

    def add_arguments(self, parser):
        parser.add_argument('--password', default='testpass123')
        parser.add_argument('--role-code', default='BORDER_HEALTH_OFFICER')

    def handle(self, *args, **options):
        if os.environ.get('SEED_DEMO_USERS', '').lower() not in ('true', '1', 'yes'):
            raise CommandError(
                'بذر الحسابات التجريبية معطّل في هذه البيئة. للسماح به: SEED_DEMO_USERS=true'
            )

        User = get_user_model()
        role = Role.objects.filter(code=options['role_code']).first()
        if not role:
            self.stderr.write(self.style.ERROR('نفّذ seed_rbac أولاً'))
            return

        emails = {
            row['entry_point']: row['email']
            for row in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS
        }

        created_count = 0
        assignment_count = 0
        for entry_code, email in emails.items():
            entry_point = EntryPoint.objects.filter(code=entry_code).first()
            if entry_point is None or entry_point.kind != 'LAND_PORT':
                continue

            user = User.objects.filter(email=email).first()
            was_created = user is None
            if was_created:
                user = User(email=email)
            user.full_name = f'ضابط الصحة الحدودية – {entry_point.location or entry_point.name_ar}'
            user.role = role
            user.sector = entry_point.sector
            user.user_type = 'MINISTRY_STAFF'
            user.is_active = True
            user.set_password(options['password'])
            user.save()
            created_count += int(was_created)

            # ---- الدور الفعّال: RoleAssignment لا User.role ----
            #
            # `User.can()` و`User.active_scopes()` يقرآن `RoleAssignment`
            # النشط فقط؛ حقل `User.role` أعلاه للتوافق والعرض ولا يمنح أي
            # صلاحية. بترك الحساب بلا `RoleAssignment` كان الضابط يُرفض عند
            # `PermissionAction` بـ 403 قبل أن يُبلَغ النطاق أصلاً.
            #
            # نطاق `PORT` على نقطة دخول الضابط نفسها: يطابق
            # `BORDER_HEALTH_OFFICER.default_scope`، وهو أقل امتياز (نقطة
            # دخول واحدة لا قطاع). وهو نفس معرّف نقطة الدخول الذي يكتبه
            # `seed_org_assignments` في `OrgAssignment.entry_point`، فالتعيينان
            # لا يتعارضان: كلاهما يقرأ معرّفاً واحداً من معرّفين.
            assignment, created_assignment = RoleAssignment.objects.update_or_create(
                user=user,
                role=role,
                scope_type=RoleAssignment.ScopeType.PORT,
                scope_id=entry_point.id,
                defaults={
                    'is_active': True,
                    'start_date': timezone.now(),
                    'end_date': None,
                    'assigned_by': None,
                },
            )
            assignment_count += int(created_assignment)

            sector = Sector.objects.filter(pk=entry_point.sector_id).first()
            self.stdout.write(self.style.SUCCESS(
                f'{"أُنشئ" if was_created else "حُدِّث"} {user.email} — '
                f'{role.name_ar} — معبر: {entry_point.name_ar} — '
                f'قطاع: {sector.name_ar if sector else "—"} — '
                f'نطاق: {assignment.scope_type}={entry_point.code}'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'تم بذر حسابات ضباط المعابر البرية ({created_count} حساب جديد، '
            f'{assignment_count} تعيين دور جديد)'
        ))