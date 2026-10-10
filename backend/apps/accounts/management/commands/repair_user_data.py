"""إصلاح انحرافات بيانات المستخدمين (إداري، قابل للتكرار).

يعالج الانحرافات التي تتراكم من البذر وأدوات التشخيص اليدوية:

  1. `probes`    — حسابات فحص نشطة (`probe*@nqp.gov.sd`)، بعضها superuser وبعضها
                   يحمل دور `ADMIN` عام. الافتراضي: تعطيل + سحب superuser/staff
                   + **سحب كل تعيينات الأدوار** (التعطيل وحده لا يسحب الصلاحيات).
                   مع `--purge-probes`: حذف نهائي.
  2. `self_grant` — تعيينات أدوار إدارية منحها المستخدم **لنفسه**
                   (`assigned_by == user`). مؤشر على تصعيد صلاحيات؛ تُسحب
                   بتعيين `is_active=False` مع بقاء الأثر. تتطلب `--apply`.
  3. `domain`    — نطاق ميت `@nqp.sd` ← `@nqp.gov.sd` (النطاق الرسمي).
                   لا تُلمس العناوين الشخصية (gmail وغيرها) — تتطلب `--email-map`.
  4. `user_type` — موظف حكومي مصنّف `CITIZEN` لأن الدور غير مربوط بنوع المستخدم.
                   التصحيح إلى `MINISTRY_STAFF` لكل دور ليس خارجياً.

`role_sync` **لا يكتب شيئاً**: تقاطع بين `User.role` (حقل توافق) و`RoleAssignment`
(مصدر الحقيقة) يُطبع فقط. الإنشاء التلقائي لتعيين مفقود مخاطرة: قد يُبقيعييناً
خاطئاً ويمنح دوراً لم يُطلب. المعالجة الصحيحة قرار بشري.

الأمان: لا شيء يُكتب إلا مع `--apply`. الافتراضي معاينة فقط.

الاستخدام:
    python manage.py repair_user_data                    # معاينة
    python manage.py repair_user_data --apply
    python manage.py repair_user_data --apply --purge-probes
    python manage.py repair_user_data --apply --email-map old@x=new@y
    python manage.py repair_user_data --apply --only self_grant
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.accounts.models import PermissionAudit, Role, RoleAssignment, ScopeType, User
from core.utils.authorization import ADMIN_RESOURCES

# الأدوار التي تمثّل فاعلاً خارج الجهاز الحكومي (مسافر / شركة نقل).
# أي دور غير مذكور هنا ⇒ موظف وزارة.
EXTERNAL_ROLE_CODES = {'TRAVELER', 'CARRIER'}

CANONICAL_DOMAIN = 'nqp.gov.sd'
LEGACY_DOMAINS = {'nqp.sd'}

# حسابات الفحص المتبقية من أدوات التشخيص. القائمة صريحة لا مُستنتجة،
# حتى لا يُعطَّل حساب شرعي بالخطأ.
DEFAULT_PROBE_EMAILS = {
    'probe@nqp.gov.sd',
    'probe2@nqp.gov.sd',
    'probe3@nqp.gov.sd',
}

WRITE_STEPS = ('probes', 'self_grant', 'domain', 'user_type')
ALL_STEPS = WRITE_STEPS + ('role_sync',)

STEP_TITLES = {
    'probes': 'حسابات الفحص',
    'self_grant': 'تعيينات إدارية ممنوحة ذاتياً',
    'domain': 'تصحيح النطاق',
    'user_type': 'تصحيح نوع المستخدم',
    'role_sync': 'تقاطع role ↔ RoleAssignment (قراءة فقط)',
}


class Command(BaseCommand):
    help = 'إصلاح انحرافات بيانات المستخدمين (معاينة افتراضياً، --apply للكتابة).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply', action='store_true',
            help='تنفيذ التعديلات فعلياً (بدونه معاينة فقط).',
        )
        parser.add_argument(
            '--only', action='append', choices=ALL_STEPS, default=[], metavar='STEP',
            help=f'تقييد التنفيذ بخطوة واحدة أو أكثر ({"|".join(ALL_STEPS)}). قابل للتكرار.',
        )
        parser.add_argument(
            '--purge-probes', action='store_true',
            help='حذف حسابات الفحص نهائياً بدل تعطيلها (غير قابل للتراجع).',
        )
        parser.add_argument(
            '--probe-email', action='append', default=[], metavar='EMAIL',
            help='إضافة بريد لحسابات الفحص المراد سحبها. قابل للتكرار.',
        )
        parser.add_argument(
            '--email-map', action='append', default=[], metavar='OLD=NEW',
            help='إعادة تسمية بريد محدد يدوياً (مثال Ahmed@gmail.com=a.othman@nqp.gov.sd).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        steps = tuple(options['only']) or ALL_STEPS
        purge = options['purge_probes']
        probe_emails = set(DEFAULT_PROBE_EMAILS) | set(options['probe_email'])
        email_map = self._parse_email_map(options['email_map'])

        label = 'تنفيذ' if apply else 'معاينة (لم يُكتب شيء)'
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== إصلاح بيانات المستخدمين — {label} ==='))
        self.stdout.write(f'الخطوات: {", ".join(steps)}')

        changes, review = [], []
        with transaction.atomic():
            if 'probes' in steps:
                changes += self._handle_probes(probe_emails, purge, apply)
            if 'self_grant' in steps:
                changes += self._handle_self_grants(probe_emails, apply)
            if 'domain' in steps:
                changes += self._handle_domains(email_map, apply)
            if 'user_type' in steps:
                changes += self._handle_user_types(probe_emails, apply)
            if 'role_sync' in steps:
                review += self._review_role_sync(probe_emails)

            if apply:
                if changes:
                    # أي تسرب من الاستثناءات يُرجع كل شيء إلى ما قبل الأمر.
                    self.stdout.write(self.style.SUCCESS(
                        f'✅ طُبّق {len(changes)} تعديلاً داخل معاملة واحدة.'
                    ))
                else:
                    self.stdout.write('لا تعديلات مطلوبة — القاعدة متسقة.')

        self._print_group(changes, WRITE_STEPS)
        self._print_group(review, ('role_sync',))
        self._report_unresolved()
        if not apply and changes:
            self.stdout.write(self.style.WARNING(
                f'\nℹ️  {len(changes)} تعديلاً بانتظار التطبيق — أعد التشغيل مع --apply'
            ))

    # ─────────────────────────────── خطوات كتابة

    def _handle_probes(self, probe_emails, purge, apply):
        changes = []
        for user in User.objects.filter(email__in=probe_emails).order_by('email'):
            if purge:
                if apply:
                    user.delete()
                changes.append(('probes', user.email, 'حذف حساب فحص'))
                continue
            if not user.is_active:
                continue
            revoked = []
            if user.is_superuser:
                revoked.append('superuser')
            if user.is_staff:
                revoked.append('staff')
            assignments = list(user.role_assignments.all())
            if apply:
                user.is_active = False
                user.is_superuser = False
                user.is_staff = False
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=[
                    'is_active', 'is_superuser', 'is_staff',
                    'failed_login_attempts', 'locked_until', 'updated_at',
                ])
                # تعطيل الحساب لا يسحب صلاحياته: RoleAssignment تبقى فعّالة
                # لمَن يعيد التفعيل، فتُسحب هنا أيضاً.
                if assignments:
                    RoleAssignment.objects.filter(pk__in=[a.pk for a in assignments]).update(
                        is_active=False,
                    )
                self._audit_revocation(user)
            roles = ', '.join(a.role.code for a in assignments) or 'بلا أدوار'
            changes.append((
                'probes', user.email,
                f'تعطيل + سحب {", ".join(revoked) or "الصلاحيات"} + إبطال {len(assignments)} تعيين ({roles})',
            ))
        return changes

    def _handle_self_grants(self, probe_emails, apply):
        """تعيين دور إداري منحه المستخدم لنفسه — مؤشر تصعيد صلاحيات.

        يُستثنى ``is_superuser``: سلطته من هويته لا من الدور،
        وسحب تعيينه لا يغيّر أي صلاحية لكنه يُفقد السجل سياقه.
        """
        changes = []
        admin_roles = self._admin_power_role_ids()
        qs = (
            RoleAssignment.objects
            .filter(role_id__in=admin_roles, assigned_by=F('user'), is_active=True)
            .exclude(user__email__in=probe_emails)
            .exclude(user__is_superuser=True)
            .select_related('user', 'role')
            .order_by('user__email')
        )
        for assignment in qs:
            label = (
                f'سحب {assignment.role.code}/{assignment.scope_type} '
                f'(منحها {assignment.user.email} لنفسه في {assignment.created_at:%Y-%m-%d})'
            )
            if apply:
                assignment.is_active = False
                assignment.save(update_fields=['is_active', 'updated_at'])
                self._audit_revocation(assignment.user, reason=(
                    'سحب دور إداري ممنوح ذاتياً (تصعيد صلاحيات)'
                ))
            changes.append(('self_grant', assignment.user.email, label))
        return changes

    def _handle_domains(self, email_map, apply):
        changes = []
        for user in User.objects.order_by('email'):
            old_email = user.email
            local, _, domain = old_email.partition('@')
            if not domain:
                continue
            if domain in LEGACY_DOMAINS:
                new_email = f'{local}@{CANONICAL_DOMAIN}'
            elif old_email in email_map:
                new_email = email_map[old_email]
            else:
                continue
            if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                self.stdout.write(self.style.ERROR(
                    f'  تخطّي {old_email}: البريد البديل {new_email} مستخدم بالفعل'
                ))
                continue
            if apply:
                user.email = new_email
                user.save(update_fields=['email', 'updated_at'])
            changes.append(('domain', old_email, f'{old_email} ← {new_email}'))
        return changes

    def _handle_user_types(self, probe_emails, apply):
        """CITIZEN → MINISTRY_STAFF لكل من يحمل دوراً حكومياً فعّالاً.

        يُقاس على الدور الفعّال (تعيينات نشطة) لا على `User.role` وحده، لأن
        حساباً بلا `role_id` لكن بتعيين `CLINIC_DOCTOR` نشط يظل موظفة.
        """
        changes = []
        external = self._external_role_ids()
        citizens = (
            User.objects.filter(user_type=User.UserType.CITIZEN)
            .exclude(email__in=probe_emails)
            .prefetch_related('role_assignments__role')
            .select_related('role')
            .order_by('email')
        )
        today = timezone.localdate()
        for user in citizens:
            effective = [
                a.role.code for a in user.role_assignments.all()
                if a.is_active
                and a.start_date <= today
                and (a.end_date is None or a.end_date >= today)
            ]
            codes = effective or ([user.role.code] if user.role_id else [])
            if not codes or all(code in external for code in codes):
                continue
            if apply:
                user.user_type = User.UserType.MINISTRY_STAFF
                user.save(update_fields=['user_type', 'updated_at'])
            changes.append((
                'user_type', user.email,
                f'CITIZEN ← MINISTRY_STAFF ({", ".join(codes)})',
            ))
        return changes

    # ─────────────────────────────── مراجعة فقط

    def _review_role_sync(self, probe_emails):
        """تقاطع `User.role` مع `RoleAssignment` — طباعة فقط، لا كتابة.

        لا يُنشئ الأمر تعيينات ولا يرقّي `role_id`: مصدر الحقيقة هو RoleAssignment،
        وجعل الحقل القديم يطابقها يوسّع صلاحيات ضمنياً دون مراجعة بشرية.
        """
        findings = []
        users = (
            User.objects.select_related('role')
            .prefetch_related('role_assignments__role')
            .exclude(email__in=probe_emails)
            .order_by('email')
        )
        for user in users:
            assignments = list(user.role_assignments.all())
            active = [a for a in assignments if a.is_current]
            legacy_code = user.role.code if user.role_id else None

            if user.role_id and not any(a.role_id == user.role_id for a in assignments):
                findings.append((
                    'role_sync', user.email,
                    f'تعيين {legacy_code} مفقود كمصدر حقيقة — يحتاج إنشاء RoleAssignment GLOBAL',
                ))
            elif user.role_id is None and active:
                codes = ', '.join(a.role.code for a in active)
                findings.append((
                    'role_sync', user.email,
                    f'role_id فارغ بينما هناك {len(active)} تعيين فعّال ({codes}) — قرار بشري',
                ))
            elif user.role_id and active and not any(a.role_id == user.role_id for a in active):
                codes = ', '.join(a.role.code for a in active)
                findings.append((
                    'role_sync', user.email,
                    f'role_id={legacy_code} لا يقابله تعيين فعّال ({codes}) — قرار بشري',
                ))
            elif not assignments and not user.role_id:
                findings.append(('role_sync', user.email, 'بلا دور ولا تعيينات'))
        return findings

    # ─────────────────────────────── مساعدات

    def _admin_power_role_ids(self):
        return list(
            Role.objects.filter(permissions__resource__in=ADMIN_RESOURCES)
            .values_list('id', flat=True)
            .distinct()
        )

    @staticmethod
    def _external_role_ids():
        return set(
            Role.objects.filter(code__in=EXTERNAL_ROLE_CODES)
            .values_list('code', flat=True)
        )

    def _parse_email_map(self, raw_pairs):
        mapping = {}
        for raw in raw_pairs:
            if '=' not in raw:
                raise SystemExit(f'صيغة --email-map غير صحيحة: {raw!r} (المتوقع OLD=NEW)')
            old, _, new = raw.partition('=')
            old, new = old.strip(), new.strip()
            if '@' not in old or '@' not in new:
                raise SystemExit(f'صيغة --email-map غير صحيحة: {raw!r} (بريد غير صالح)')
            mapping[old] = new
        return mapping

    def _audit_revocation(self, user, reason='إصلاح بيانات: سحب صلاحيات المشرف من حساب فحص'):
        PermissionAudit.objects.create(
            user=user, permission_code='users:manage',
            action=PermissionAudit.Action.REVOKE, granted=False, reason=reason,
        )

    def _print_group(self, changes, steps):
        for step in steps:
            group = [c for c in changes if c[0] == step]
            if not group:
                continue
            self.stdout.write(self.style.MIGRATE_HEADING(
                f'— {STEP_TITLES[step]} ({len(group)}) —'
            ))
            for _, email, detail in group:
                self.stdout.write(f'  · {email}: {detail}')

    def _report_unresolved(self):
        """ما لا يُصلَح آلياً ويحتاج قراراً بشرياً."""
        stale_admin = (
            User.objects.filter(is_active=True, is_superuser=True)
            .exclude(email__in=DEFAULT_PROBE_EMAILS)
        )
        for user in stale_admin:
            self.stdout.write(self.style.NOTICE(
                f'ℹ️  superuser نشط: {user.email} — تأكّد أنه مقصود'
            ))

# بعد إصلاح الحارس، is_staff لم يعد يمنح الأدوار الإدارية تلقائياً،
        # لكن تخطئة النطاق الوظيفي تبقى احتمالاً مفتوحاً.
        staff_admin_roles = self._admin_power_role_ids()
        overreach = (
            RoleAssignment.objects
            .filter(role_id__in=staff_admin_roles, is_active=True)
            .filter(user__is_staff=True, user__is_superuser=False)
            .select_related('user', 'role')
            .order_by('user__email')
        )
        for assignment in overreach:
            self.stdout.write(self.style.WARNING(
                f'⚠️  {assignment.user.email} (is_staff) يحمل {assignment.role.code}'
                f'/{assignment.scope_type} — راجع الصلة الوظيفية'
            ))

        personal = (
            User.objects.exclude(role__code__in=EXTERNAL_ROLE_CODES)
            .filter(email__regex=r'@(gmail|yahoo|hotmail|outlook)\.')
            .select_related('role')
        )
        for user in personal:
            role_code = user.role.code if user.role_id else 'بلا دور'
            self.stdout.write(self.style.WARNING(
                f'⚠️  بريد خارج النطاق الرسمي: {user.email} (دور {role_code}) '
                f'— استخدم --email-map لتحويله'
            ))