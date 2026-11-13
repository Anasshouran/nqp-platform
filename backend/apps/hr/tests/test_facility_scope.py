"""M6-bis — نطاق FACILITY في الموارد البشرية (D-M5-C-F-1).

`OrgAssignment.facility` هو الحقل الجديد (nullable، SET_NULL) الذي يفتح
قناة FACILITY في HR. قبل M6-bis كانت قناة FACILITY مُحجبة لغياب مسار
قابل للتقييم. البوابة مشتركة مع LOCALITY (`PROD_SCOPING_ENABLED` / `DEBUG`).
"""

import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import EmployeeProfile, Role, RoleAssignment
from apps.hr.scoping import (
    SCOPE_LOOKUPS,
    resolve_hr_scope_keys,
    resolve_visible_employee_user_ids,
)
from apps.masterdata.models import EntryPoint, HealthFacility
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Locality, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag):
    """عالم كامل: قطاع تنظيمي + قطاع مرجعي + ولاية + محلية + منفذ + منشأة."""
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{_uid()}', name_ar=f'نقل {tag}')
    org = Sector.objects.create(code=f'ORG_{tag}_{_uid()}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{_uid()}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{_uid()}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{_uid()}', name_ar=f'منفذ {tag}', kind='SEAPORT',
        state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_{tag}_{_uid()}', name_ar=f'منشأة {tag}',
        sector=org, locality=loc, entry_point=ep,
    )
    return {'sector': org, 'entry_point': ep, 'facility': fac}


def _make_user(tag):
    user = User.objects.create_user(
        email=f'{tag}_{_uid()}@nqp.sd', password='x', full_name=tag,
    )
    EmployeeProfile.objects.create(user=user, employee_number=f'E{_uid()}')
    return user


@pytest.fixture
def gate_on(settings):
    """البوابة مفتوحة (وضع التطوير)."""
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False


@pytest.fixture
def gate_off(settings):
    """البوابة مغلقة (وضع الإنتاج الافتراضي) — يجب أن يُحجب FACILITY."""
    settings.DEBUG = False
    settings.PROD_SCOPING_ENABLED = False


class TestFacilityLookup:
    def test_lookup_path_is_registered(self):
        """المسار معلن على مخطط OrgAssignment — لا FieldError صامت."""
        assert SCOPE_LOOKUPS['FACILITY'] == ('facility_id',)

    def test_own_assignment_facility_becomes_scope_key(self, gate_on):
        world = _build_world('A')
        actor = _make_user('hr.fac')
        OrgAssignment.objects.create(user=actor, facility=world['facility'], is_active=True)

        keys = resolve_hr_scope_keys(actor)

        assert ('FACILITY', world['facility'].id) in keys

    def test_role_assignment_facility_is_honoured(self, gate_on):
        world = _build_world('A')
        actor = _make_user('hr.role.fac')
        role = Role.objects.create(code=f'HR_FAC_{_uid()}', name=f'HR FAC {_uid()}')
        RoleAssignment.objects.create(
            user=actor, role=role,
            scope_type=RoleAssignment.ScopeType.FACILITY, scope_id=world['facility'].id,
        )

        keys = resolve_hr_scope_keys(actor)

        assert ('FACILITY', world['facility'].id) in keys


class TestFacilityGate:
    def test_gate_off_drops_facility_keys(self, gate_off):
        world = _build_world('A')
        actor = _make_user('hr.gate.fac')
        OrgAssignment.objects.create(user=actor, facility=world['facility'], is_active=True)

        assert resolve_hr_scope_keys(actor) == set()

    def test_gate_off_denies_all_visibility(self, gate_off):
        world = _build_world('A')
        actor = _make_user('hr.gate.actor')
        OrgAssignment.objects.create(user=actor, facility=world['facility'], is_active=True)
        colleague = _make_user('hr.gate.colleague')
        OrgAssignment.objects.create(user=colleague, facility=world['facility'], is_active=True)

        assert resolve_visible_employee_user_ids(actor) == set()


class TestFacilityVisibility:
    def test_visible_employees_scoped_to_own_facility(self, gate_on):
        world_a = _build_world('A')
        world_b = _build_world('B')
        actor = _make_user('hr.vis.actor')
        OrgAssignment.objects.create(user=actor, facility=world_a['facility'], is_active=True)
        colleague = _make_user('hr.vis.colleague')
        OrgAssignment.objects.create(user=colleague, facility=world_a['facility'], is_active=True)
        outsider = _make_user('hr.vis.outsider')
        OrgAssignment.objects.create(user=outsider, facility=world_b['facility'], is_active=True)

        visible = resolve_visible_employee_user_ids(actor)

        assert colleague.id in visible
        assert outsider.id not in visible, 'تسريب عبر المنشآت!'

    def test_assignment_without_facility_is_not_widened(self, gate_on):
        """تعيين بلا منشأة لا يُفتح له شيء ضمنياً (فشل آمن)."""
        world = _build_world('A')
        actor = _make_user('hr.no.fac')
        OrgAssignment.objects.create(user=actor, sector=world['sector'], is_active=True)

        assert not any(k[0] == 'FACILITY' for k in resolve_hr_scope_keys(actor))
