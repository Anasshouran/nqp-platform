"""اختبارات نطاق وحدة الموارد البشرية — تركيز على الفشل الآمن.

المبدأ المُختبَر: غياب النطاق أو خطأ في الفلترة يجب أن يُنتج حجباً
كاملاً (`set()` / `qs.none()`) لا تسريباً عارضاً لبيانات موظفين آخرين.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import viewsets
from rest_framework.test import APIRequestFactory

from apps.accounts.models import EmployeeProfile
from apps.hr.scoping import (
    HRScopedMixin,
    SCOPE_LOOKUPS,
    is_national_scope,
    resolve_hr_scope_keys,
    resolve_visible_employee_user_ids,
    user_within_hr_scope,
)
from apps.organization.models import Department, OrgAssignment, Sector, Station

pytestmark = pytest.mark.django_db

User = get_user_model()


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@nqp.sd', password='x',
    )


def make_profile(user):
    return EmployeeProfile.objects.create(
        user=user, employee_number=f'E{user.pk.hex[:8]}',
    )


@pytest.fixture
def sector():
    return Sector.objects.create(code='MED', name_ar='القطاع الطبي', name_en='Medical')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='HR', name_ar='إدارة الموارد البشرية', sector=sector)


@pytest.fixture
def station(department, sector):
    return Station.objects.create(code='ST1', name_ar='محطة شرق', department=department, sector=sector)


@pytest.fixture
def actor():
    return make_user('hr.actor')


@pytest.fixture
def colleague(department):
    """زميل داخل نفس القسم — يجب أن يكون مرئياً للـ actor."""
    user = make_user('hr.colleague')
    OrgAssignment.objects.create(user=user, department=department, is_active=True)
    make_profile(user)
    return user


@pytest.fixture
def outsider():
    """موظف في قسم آخر — يجب ألا يكون مرئياً للـ actor إطلاقاً."""
    other_sector = Sector.objects.create(code='VET', name_ar='القطاع البيطري')
    other_dept = Department.objects.create(code='VET1', name_ar='قسم بيطري', sector=other_sector)
    user = make_user('hr.outsider')
    OrgAssignment.objects.create(user=user, department=other_dept, is_active=True)
    make_profile(user)
    return user


class ProfileListProbe(HRScopedMixin, viewsets.ModelViewSet):
    """viewset تجريبي: قائمة `EmployeeProfile` مقيّدة بنطاق HR.

    يتبع نمط الموديولات القائمة: الـ mixin أولاً ثم `ModelViewSet` مع
    `queryset` كسمة صنف (لا يُعاد تعريف `get_queryset` هنا وإلا حُجب
    الميكسين).
    """

    employee_user_field = 'user'
    queryset = EmployeeProfile.objects.all()
    serializer_class = None


def probe_for(user, employee_user_field='user'):
    request = APIRequestFactory().get('/api/v1/hr/probe/')
    request.user = user
    view = ProfileListProbe()
    view.request = request
    view.employee_user_field = employee_user_field
    return view


class TestNationalScope:
    def test_superuser_is_national(self, actor):
        actor.is_superuser = True
        actor.save(update_fields=['is_superuser'])
        assert is_national_scope(actor) is True
        assert resolve_hr_scope_keys(actor) is None
        assert resolve_visible_employee_user_ids(actor) is None

    def test_anonymous_is_not_national(self):
        assert is_national_scope(AnonymousUser()) is False
        assert resolve_hr_scope_keys(AnonymousUser()) == set()


class TestFailSafe:
    def test_no_scope_denies_everything(self, actor, colleague):
        """actor بلا أي تعيين: يجب ألا يرى زميله (فشل آمن لا تسريب)."""
        assert resolve_hr_scope_keys(actor) == set()
        assert resolve_visible_employee_user_ids(actor) == set()
        assert user_within_hr_scope(colleague, actor) is False

    def test_unauthenticated_denies(self, colleague):
        assert user_within_hr_scope(colleague, AnonymousUser()) is False

    def test_inactive_org_assignment_is_ignored(self, actor, department):
        """تعيين هيكلي غير نشط لا يفتح نطاقاً."""
        stale = make_user('hr.stale')
        OrgAssignment.objects.create(user=stale, department=department, is_active=False)
        assert resolve_visible_employee_user_ids(actor) == set()
        assert user_within_hr_scope(stale, actor) is False


class TestScopeLookupsAreValid:
    """كل مسار في `SCOPE_LOOKUPS` يجب أن يبقى صالحاً على مخطط OrgAssignment.

    مسار خاطئ يرفع `FieldError` فيتحوّل إلى حجب كامل صامت، فتُمنع أخطاء
    المخطط من التسريب والاختفاء معاً.
    """

    @pytest.mark.parametrize('scope_type', sorted(SCOPE_LOOKUPS))
    def test_lookup_paths_resolve_against_schema(self, scope_type):
        from django.core.exceptions import FieldError

        from apps.organization.models import OrgAssignment

        for path in SCOPE_LOOKUPS[scope_type]:
            try:
                OrgAssignment.objects.filter(**{path: uuid.uuid4()}).exists()
            except FieldError as exc:  # pragma: no cover - عند الفشل يمرّ الاختبار
                pytest.fail(f'مسار غير صالح {scope_type}:{path} — {exc}')


class TestScopeResolution:
    def test_own_org_assignment_creates_scope(self, actor, department, colleague):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        assert resolve_hr_scope_keys(actor) == {('DEPARTMENT', department.pk)}
        # الموظف ضمن القسم مرئي، ومنه الـ actor نفسه عبر تعيينه
        assert resolve_visible_employee_user_ids(actor) == {colleague.pk, actor.pk}
        assert user_within_hr_scope(colleague, actor) is True

    def test_sector_assignment_widens_scope(self, actor, sector, colleague, outsider):
        """نطاق قطاعي أوسع من نطاق القسم، ولا يتجاوزه."""
        OrgAssignment.objects.create(user=actor, sector=sector, is_active=True)
        assert ('SECTOR', sector.pk) in resolve_hr_scope_keys(actor)
        visible = resolve_visible_employee_user_ids(actor)
        assert colleague.pk in visible
        assert outsider.pk not in visible

    def test_station_scope(self, actor, station, colleague):
        """نطاق المحطة يرى أعضاءها فقط، لا كل من في قسمها."""
        OrgAssignment.objects.create(user=actor, station=station, is_active=True)
        assert ('STATION', station.pk) in resolve_hr_scope_keys(actor)
        # الزميل على القسم لا المحطة → خارج نطاق المحطة
        assert resolve_visible_employee_user_ids(actor) == {actor.pk}

        in_station = make_user('hr.in.station')
        OrgAssignment.objects.create(user=in_station, station=station, is_active=True)
        assert resolve_visible_employee_user_ids(actor) == {actor.pk, in_station.pk}
        assert colleague.pk not in resolve_visible_employee_user_ids(actor)

    def test_role_assignment_scope_is_honoured(
        self, actor, sector, colleague, outsider, grant_permissions
    ):
        """نطاق دور نشط (SECTOR) يوسّع النطاق حتى بلا OrgAssignment للمستخدم."""
        grant_permissions(
            actor, 'HR_TEST', ['hr_dashboard:view'],
            scope_type='SECTOR', scope_id=sector.pk,
        )
        assert ('SECTOR', sector.pk) in resolve_hr_scope_keys(actor)
        visible = resolve_visible_employee_user_ids(actor)
        assert colleague.pk in visible
        assert outsider.pk not in visible

    def test_user_always_sees_self(self, actor, department, outsider):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        assert resolve_visible_employee_user_ids(actor) == {actor.pk}
        assert user_within_hr_scope(actor, actor) is True
        assert user_within_hr_scope(outsider, actor) is False


class TestScopedMixin:
    """`HRScopedMixin` يجب أن يقصر القائمة على نطاق المستخدم فقط."""

    def test_scoped_queryset_hides_outsider(self, actor, department, colleague, outsider):
        make_profile(actor)
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        visible = set(probe_for(actor).get_queryset().values_list('user_id', flat=True))
        assert visible == {colleague.pk, actor.pk}
        assert outsider.pk not in visible

    def test_unscoped_user_gets_nothing(self, actor, outsider):
        make_profile(actor)
        assert list(probe_for(actor).get_queryset()) == []

    def test_national_user_sees_everything(self, actor, colleague, outsider):
        make_profile(actor)
        actor.is_superuser = True
        actor.save(update_fields=['is_superuser'])
        assert probe_for(actor).get_queryset().count() == 3

    def test_bad_field_denies_instead_of_leaking(self, actor, department, outsider):
        """حقل خاطئ يجب أن يُنتج `none()` لا queryset غير مقيّد."""
        make_profile(actor)
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        assert list(probe_for(actor, 'does_not_exist').get_queryset()) == []
