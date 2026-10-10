"""Phase 3B — أمر `seed_border_officers` ينشئ دوراً فعّالاً بنطاق `PORT`.

الخلل الذي عولج: كان الأمر يضبط `User.role` فقط. و`User.can()` و
`User.active_scopes()` يقرآن `RoleAssignment` النشط، فلم يكن الحساب الجديد
يملك أي صلاحية — الضابط يُرفض عند `PermissionAction` بـ 403، وإن أُضيفت
الصلاحية يدوياً فلا يبقى له نطاق يُبلَّغ.

كل ضابط يُختبر بحدّين: إيجابي (معبره وحده) وسلبي (معبر شقيق أو قطاع آخر).
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.accounts.models import RoleAssignment
from apps.masterdata.models import EntryPoint
from apps.organization.management.commands.seed_org_assignments import (
    Command as SeedOrgAssignments,
)
from apps.organization.models import OrgAssignment

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'Str0ngPass!23'

# (كود المعبر، بريد الضابط) — نفس أزواج `seed_org_assignments`.
EXPECTED = [
    (row['entry_point'], row['email']) for row in SeedOrgAssignments.LAND_BORDER_ASSIGNMENTS
]


@pytest.fixture
def rbac_and_registry():
    call_command('seed_rbac', verbosity=0)
    call_command('seed_masterdata', verbosity=0)
    call_command('seed_organization', verbosity=0)


@pytest.fixture
def demo_enabled(monkeypatch):
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')


def _crossings_for_named_poes():
    """ينشئ معبراً تشغيلياً لكل نقطة دخول مسمّاة — بلا هذا لا يوجد شقيق يُمنع."""
    from apps.borders_health.models import BorderCrossing

    made = {}
    for ep_code, _ in EXPECTED:
        entry_point = EntryPoint.objects.filter(code=ep_code).first()
        if entry_point is None or entry_point.kind != 'LAND_PORT':
            continue
        crossing, _ = BorderCrossing.objects.get_or_create(
            entry_point=entry_point,
            defaults={'neighbor_country': '—', 'operating_status': 'OPEN'},
        )
        made[ep_code] = crossing
    return made


# ---------------------------------------------------------------------------
# بوابة الحارس البيئي
# ---------------------------------------------------------------------------


def test_command_is_gated_without_seED_DEMO_USERS(monkeypatch, rbac_and_registry):
    """الحسابات التجريبية تبقى معطّلة افتراضياً."""
    monkeypatch.delenv('SEED_DEMO_USERS', raising=False)

    with pytest.raises(CommandError):
        call_command('seed_border_officers', verbosity=0)


@pytest.mark.parametrize('value', ['true', 'TRUE', '1', 'yes'])
def test_command_accepts_every_enabled_spelling(
    monkeypatch, rbac_and_registry, value, capsys
):
    monkeypatch.setenv('SEED_DEMO_USERS', value)
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)

    assert User.objects.filter(email='border.argin@nqp.gov.sd').exists()


# ---------------------------------------------------------------------------
# إنشاء الدور الفعّال
# ---------------------------------------------------------------------------


def test_every_officer_gets_an_active_port_scoped_role_assignment(
    demo_enabled, rbac_and_registry, capsys
):
    """التصميم الأساسي: كل ضابط ⇒ `RoleAssignment` نشط بنطاق `PORT`."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    created = 0
    for ep_code, email in EXPECTED:
        entry_point = EntryPoint.objects.filter(code=ep_code).first()
        if entry_point is None or entry_point.kind != 'LAND_PORT':
            continue

        user = User.objects.get(email=email)
        assignments = list(
            RoleAssignment.objects.filter(
                user=user, role__code='BORDER_HEALTH_OFFICER', is_active=True,
            )
        )
        assert len(assignments) == 1, f'{email}: توقّع تعيين دور واحد، وجد {len(assignments)}'

        assignment = assignments[0]
        assert assignment.scope_type == RoleAssignment.ScopeType.PORT
        assert assignment.scope_id == entry_point.id, f'{email}: النطاق ليس معبره'
        assert assignment.end_date is None
        created += 1

    assert created == len(EXPECTED), 'لم يُغطَّ كل الضباط'


def test_role_assignment_and_org_assignment_point_at_the_same_entry_point(
    demo_enabled, rbac_and_registry, capsys
):
    """لا تعارض: التعيينان يقرآن معرّف نقطة الدخول نفسه."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    call_command('seed_org_assignments', verbosity=0)
    capsys.readouterr()

    for ep_code, email in EXPECTED:
        entry_point = EntryPoint.objects.filter(code=ep_code).first()
        if entry_point is None or entry_point.kind != 'LAND_PORT':
            continue

        user = User.objects.get(email=email)
        assignment = RoleAssignment.objects.get(
            user=user, role__code='BORDER_HEALTH_OFFICER',
        )
        org_assignment = OrgAssignment.objects.filter(
            user=user, entry_point__isnull=False,
        ).first()
        assert org_assignment is not None, f'{email}: بلا تعيين هيكلي'

        assert assignment.scope_id == org_assignment.entry_point_id, (
            f'{email}: نطاق الدور {assignment.scope_id} يخالف '
            f'OrgAssignment.entry_point {org_assignment.entry_point_id}'
        )
        assert assignment.scope_id == entry_point.id


def test_seeded_officer_can_actually_pass_the_permission_gate(
    demo_enabled, rbac_and_registry, capsys
):
    """`User.can()` يعتمد على `RoleAssignment` — نتأكد أنه صار True."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    user = User.objects.get(email='border.argin@nqp.gov.sd')
    assert user.can('borders_health:view') is True
    assert user.active_scopes('borders_health') == [
        {'scope_type': 'PORT', 'scope_id': EntryPoint.objects.get(code='EP_ARGIN').id}
    ]


# ---------------------------------------------------------------------------
# الحدّ الأمني: معبر واحد فقط
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('ep_code', [ep for ep, _ in EXPECTED])
def test_seeded_officer_resolves_exactly_one_entry_point(
    demo_enabled, rbac_and_registry, capsys, ep_code
):
    """حدّ إيجابي: نطاق الضابط = معبره وحده، لا قطاعه."""
    from core.utils.scoping import resolve_authorized_entry_points

    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    entry_point = EntryPoint.objects.get(code=ep_code)
    email = dict(EXPECTED)[ep_code]
    user = User.objects.get(email=email)

    assert set(resolve_authorized_entry_points(user)) == {entry_point.id}


@pytest.mark.parametrize('ep_code', [ep for ep, _ in EXPECTED])
def test_seeded_officer_cannot_read_a_sibling_crossing(
    demo_enabled, rbac_and_registry, capsys, ep_code
):
    """حدّ سلبي: لا يقرأ معبراً آخر في قطاعه."""
    from apps.borders_health.views import MultiHopScopeFilter

    _crossings_for_named_poes()
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    entry_point = EntryPoint.objects.get(code=ep_code)
    email = dict(EXPECTED)[ep_code]
    user = User.objects.get(email=email)

    from apps.borders_health.models import BorderCrossing

    sibling = BorderCrossing.objects.filter(
        entry_point__sector_id=entry_point.sector_id,
    ).exclude(entry_point_id=entry_point.id).first()
    if sibling is None:
        pytest.skip(f'قطاع {ep_code} يحوي معبراً واحداً فقط')

    class _Request:
        user = None

    request = _Request()
    request.user = user
    assert MultiHopScopeFilter().has_object_permission(request, None, sibling) is False


# ---------------------------------------------------------------------------
# إعادة التشغيل (idempotency)
# ---------------------------------------------------------------------------


def test_rerun_creates_no_duplicate_assignments(demo_enabled, rbac_and_registry, capsys):
    """إعادة التشغيل تُحدِّث ولا تُكرِّر — ولا تفتح استعلامات إضافية."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    first_counts = {
        email: RoleAssignment.objects.filter(user__email=email).count()
        for _, email in EXPECTED
    }
    capsys.readouterr()

    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    for _, email in EXPECTED:
        assert RoleAssignment.objects.filter(user__email=email).count() == first_counts[email]
        assert first_counts[email] == 1


def test_rerun_leaves_no_rows_beyond_the_expected_set(demo_enabled, rbac_and_registry, capsys):
    """لا يتسرّب ضابط أو تعيين خارج قائمة المعابر المسمّاة."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    emails = {email for _, email in EXPECTED}
    assert set(
        RoleAssignment.objects.filter(
            role__code='BORDER_HEALTH_OFFICER', user__email__startswith='border.',
        ).values_list('user__email', flat=True),
    ) == emails

    # وقاعدة البيانات لا تكبر عبر التشغيلات المتكررة.
    with CaptureQueriesContext(connection) as before_ctx:
        call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    with CaptureQueriesContext(connection) as after_ctx:
        call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    assert len(after_ctx.captured_queries) == len(before_ctx.captured_queries)


def test_rerun_keeps_assignments_active(demo_enabled, rbac_and_registry, capsys):
    """إعادة التشغيل لا تُبطل نطاق أحد — تبقى نشطة."""
    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    RoleAssignment.objects.filter(role__code='BORDER_HEALTH_OFFICER').update(is_active=False)
    assert not RoleAssignment.objects.filter(
        role__code='BORDER_HEALTH_OFFICER', is_active=True,
    ).exists()

    call_command('seed_border_officers', password=PASSWORD, verbosity=0)
    capsys.readouterr()

    active = RoleAssignment.objects.filter(
        role__code='BORDER_HEALTH_OFFICER', is_active=True,
    ).count()
    assert active == len(EXPECTED)


# ---------------------------------------------------------------------------
# غياب الدور المرجعي
# ---------------------------------------------------------------------------


def test_command_reports_missing_rbac_role_without_crashing(monkeypatch, capsys):
    """بلا `seed_rbac` يخطّئ بوضوح بدل أن ينشئ حسابات بلا صلاحيات."""
    monkeypatch.setenv('SEED_DEMO_USERS', 'true')
    call_command('seed_masterdata', verbosity=0)
    RoleAssignment.objects.all().delete()
    from apps.accounts.models import Role

    Role.objects.filter(code='BORDER_HEALTH_OFFICER').delete()

    call_command('seed_border_officers', verbosity=0)
    assert 'seed_rbac' in capsys.readouterr().err