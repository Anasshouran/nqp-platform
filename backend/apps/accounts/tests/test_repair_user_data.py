"""اختبارات أمر إصلاح بيانات المستخدمين.

تركّز على الضمانات لا على تفاصيل الإخراج:
  - المعاينة (بدون `--apply`) لا تكتب أي شيء.
  - تعطيل حساب الفحص يسحب تعييناته أيضاً (إلا остаت فعّالة لمن يعيد التفعيل).
  - `self_grant` يلتهم التعيينات المسحوبة فلا يعيد الإبلاغ (idempotency).
  - `role_sync` قراءة فقط: لا ينشئ تعيينات ولا يرقّي `role_id`.
  - التصنيف إلى `MINISTRY_STAFF` يقيس الدور الفعّال لا `User.role` وحده.
  - لا يُمسّ دور خارجي (TRAVELER/CARRIER) ولا حساب بريده في نطاق رسمي.
"""

from io import StringIO

import pytest
from django.core.management import call_command

from apps.accounts.models import Permission, Role, RoleAssignment, ScopeType, User

pytestmark = pytest.mark.django_db


def _run(*args):
    out = StringIO()
    call_command('repair_user_data', *args, stdout=out, stderr=out)
    return out.getvalue()


def _admin_role(code='ADMIN'):
    """دور إداري بحسب تعريف `is_admin_power_role`: يحمل صلاحية على مورد من ADMIN_RESOURCES."""
    role, _ = Role.objects.get_or_create(code=code, defaults={'name': code, 'name_ar': code})
    resource = 'users' if code == 'ADMIN' else 'role_assignments'
    role.permissions.add(Permission.objects.get_or_create(
        code=f'{resource}:manage', resource=resource, action='manage',
        defaults={'name': f'{resource}:manage'},
    )[0])
    return role


def _probe(email='probe-test@nqp.gov.sd'):
    return User.objects.create_superuser(
        email=email, password='StrongPass123!', full_name='p',
    )


# --- المعاينة لا تكتب ---


def test_dry_run_writes_nothing(db):
    probe = _probe()
    assignment = RoleAssignment.objects.create(
        user=probe, role=_admin_role(), scope_type=ScopeType.GLOBAL,
    )
    output = _run()
    assert 'معاينة' in output
    probe.refresh_from_db()
    assignment.refresh_from_db()
    assert probe.is_active is True
    assert probe.is_superuser is True
    assert assignment.is_active is True


# --- تعطيل الفحص يسحب التعيينات ---


def test_apply_disables_probe_and_its_assignments(db):
    probe = _probe()
    assignment = RoleAssignment.objects.create(
        user=probe, role=_admin_role(), scope_type=ScopeType.GLOBAL,
    )
    call_command('repair_user_data', '--apply', '--probe-email', probe.email,
                 stdout=StringIO())
    probe.refresh_from_db()
    assignment.refresh_from_db()
    assert probe.is_active is False
    assert probe.is_superuser is False
    assert probe.is_staff is False
    # التعطيل وحده لا يسحب الصلاحيات — لا بد من إبطال التعيين أيضاً.
    assert assignment.is_active is False


def test_purge_probes_deletes_account(db):
    probe = _probe()
    call_command('repair_user_data', '--apply', '--purge-probes',
                 '--probe-email', probe.email, stdout=StringIO())
    assert not User.objects.filter(pk=probe.pk).exists()


# --- التعيينات الممنوحة ذاتياً ---


def test_self_granted_admin_role_is_revoked(db):
    admin_role = _admin_role()
    staff = User.objects.create_user(
        email='escalate-test@nqp.gov.sd', password='StrongPass123!',
        full_name='S', is_staff=True,
    )
    assignment = RoleAssignment.objects.create(
        user=staff, role=admin_role, scope_type=ScopeType.GLOBAL, assigned_by=staff,
    )
    call_command('repair_user_data', '--apply', '--only', 'self_grant', stdout=StringIO())
    assignment.refresh_from_db()
    assert assignment.is_active is False


def test_admin_granted_by_other_user_is_kept(db):
    admin_role = _admin_role()
    granter = User.objects.create_superuser(
        email='root-test@nqp.gov.sd', password='StrongPass123!', full_name='R',
    )
    target = User.objects.create_user(
        email='target-test@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    assignment = RoleAssignment.objects.create(
        user=target, role=admin_role, scope_type=ScopeType.GLOBAL, assigned_by=granter,
    )
    call_command('repair_user_data', '--apply', '--only', 'self_grant', stdout=StringIO())
    assignment.refresh_from_db()
    assert assignment.is_active is True


def test_self_grant_is_idempotent(db):
    admin_role = _admin_role()
    staff = User.objects.create_user(
        email='escalate-idem@nqp.gov.sd', password='StrongPass123!',
        full_name='S', is_staff=True,
    )
    assignment = RoleAssignment.objects.create(
        user=staff, role=admin_role, scope_type=ScopeType.GLOBAL, assigned_by=staff,
    )
    call_command('repair_user_data', '--apply', '--only', 'self_grant', stdout=StringIO())
    second = _run('--apply', '--only', 'self_grant')
    assignment.refresh_from_db()
    assert assignment.is_active is False
    assert 'لا تعديلات مطلوبة' in second


# --- role_sync قراءة فقط ---


def test_role_sync_never_writes(db):
    legacy = Role.objects.create(code='LEGACY', name='Legacy', name_ar='ل')
    user = User.objects.create_user(
        email='legacy-role@nqp.gov.sd', password='StrongPass123!',
        full_name='L', role=legacy,
    )
    call_command('repair_user_data', '--apply', '--only', 'role_sync', stdout=StringIO())
    user.refresh_from_db()
    assert not RoleAssignment.objects.filter(user=user).exists()
    assert user.role_id == legacy.id


def test_role_sync_does_not_promote_role_id(db):
    """عدم وجود `role_id` مع وجود تعيين فعّال: يُبلَّغ ولا يُرقّى."""
    admin_role = _admin_role('CLINIC_DOCTOR_R')
    user = User.objects.create_user(
        email='no-legacy-role@nqp.gov.sd', password='StrongPass123!', full_name='N',
    )
    RoleAssignment.objects.create(
        user=user, role=admin_role, scope_type=ScopeType.GLOBAL,
    )
    call_command('repair_user_data', '--apply', '--only', 'role_sync', stdout=StringIO())
    user.refresh_from_db()
    assert user.role_id is None


# --- نوع المستخدم ---


def test_user_type_uses_active_assignment_when_legacy_role_missing(db):
    role = Role.objects.create(code='CLINIC_DOCTOR', name='C', name_ar='ط')
    user = User.objects.create_user(
        email='clinic-type@nqp.gov.sd', password='StrongPass123!', full_name='C',
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=ScopeType.SECTOR, scope_id=None,
    )
    call_command('repair_user_data', '--apply', '--only', 'user_type', stdout=StringIO())
    user.refresh_from_db()
    assert user.user_type == User.UserType.MINISTRY_STAFF


def test_user_type_leaves_external_roles_untouched(db):
    for code in ('TRAVELER', 'CARRIER'):
        role, _ = Role.objects.get_or_create(code=code, defaults={'name': code, 'name_ar': code})
        user = User.objects.create_user(
            email=f'{code.lower()}-type@nqp.gov.sd', password='StrongPass123!',
            full_name=code, role=role,
        )
        call_command('repair_user_data', '--apply', '--only', 'user_type', stdout=StringIO())
        user.refresh_from_db()
        assert user.user_type == User.UserType.CITIZEN


def test_user_type_falls_back_to_legacy_role(db):
    """تعيين معطّل لا يُحتسب، فيُقاس على `User.role` — وهو دور حكومي."""
    role, _ = Role.objects.get_or_create(code='DORMANT', defaults={'name': 'D', 'name_ar': 'خ'})
    user = User.objects.create_user(
        email='dormant-role@nqp.gov.sd', password='StrongPass123!',
        full_name='D', role=role,
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=ScopeType.GLOBAL, is_active=False,
    )
    call_command('repair_user_data', '--apply', '--only', 'user_type', stdout=StringIO())
    user.refresh_from_db()
    assert user.user_type == User.UserType.MINISTRY_STAFF


# --- النطاق ---


def test_legacy_domain_is_normalised(db):
    user = User.objects.create_user(
        email='lab.director@nqp.sd', password='StrongPass123!', full_name='L',
    )
    call_command('repair_user_data', '--apply', '--only', 'domain', stdout=StringIO())
    user.refresh_from_db()
    assert user.email == 'lab.director@nqp.gov.sd'


def test_personal_domain_needs_explicit_map(db):
    user = User.objects.create_user(
        email='Ahmed@gmail.com', password='StrongPass123!', full_name='A',
    )
    _run('--apply', '--only', 'domain')
    user.refresh_from_db()
    assert user.email == 'Ahmed@gmail.com'

    call_command('repair_user_data', '--apply', '--only', 'domain',
                 '--email-map', 'Ahmed@gmail.com=a.othman@nqp.gov.sd', stdout=StringIO())
    user.refresh_from_db()
    assert user.email == 'a.othman@nqp.gov.sd'


def test_domain_conflict_is_skipped(db):
    """التصادم مع بريد موجود يُتخطّى ولا يُطبَّق."""
    User.objects.create_user(
        email='dup@nqp.gov.sd', password='StrongPass123!', full_name='T',
    )
    user = User.objects.create_user(
        email='dup@nqp.sd', password='StrongPass123!', full_name='D',
    )
    call_command('repair_user_data', '--apply', '--only', 'domain', stdout=StringIO())
    user.refresh_from_db()
    assert user.email == 'dup@nqp.sd'


def test_invalid_email_map_is_rejected(db):
    with pytest.raises(SystemExit):
        call_command('repair_user_data', '--apply', '--email-map', 'no-equals-sign')