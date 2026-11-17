"""M4-1: ScopeType.STATE — regional admin scope."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, StateMinistry,
    FacilityOwner, FacilityOwnership, Service, ServiceAvailability,
)
from apps.accounts.models import Role, RoleAssignment

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_plain_user():
    return User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')


def _make_state_user(state, role_name=None):
    """مستخدم مع RoleAssignment STATE على الولاية المحددة."""
    uid = _uid()
    user = User.objects.create_user(email=f'state_{uid}@test.com', password='x')
    role = Role.objects.create(code=f'ROLE_{uid}', name=role_name or f'STATE_ADMIN_{uid}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='STATE', scope_id=state.id,
    )
    # منح permissions القراءة للدور
    from apps.accounts.models import Permission
    for code in ['registry:view', 'ministry:view']:
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(
            code=code, defaults={'name': code, 'resource': resource, 'action': action}
        )
        role.permissions.add(perm)
    return user


def _build_state(uid, tag='A'):
    """يبني state كاملة: masterdata.State + org sector + locality + entry_point + facility."""
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}',
        state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_{tag}_{uid}', name_ar=f'منشأة {tag}',
        sector=org, locality=loc, entry_point=ep,
    )
    return {
        'state': state, 'org_sector': org, 'locality': loc,
        'entry_point': ep, 'facility': fac,
    }


@pytest.mark.django_db
class TestStateScopeResolution:
    """Direct unit tests on resolve_authorized_entry_points."""

    def test_state_user_gets_state_entry_points(self):
        """STATE user → resolve_authorized_entry_points يعيد entry_points الولاية."""
        from core.utils.scoping import resolve_authorized_entry_points
        uid = _uid()
        setup = _build_state(uid, 'A')
        other = _build_state(uid, 'B')
        user = _make_state_user(setup['state'])

        eps = resolve_authorized_entry_points(user)
        assert eps is not None
        eps_strs = [str(x) for x in eps]
        assert str(setup['entry_point'].id) in eps_strs
        assert str(other['entry_point'].id) not in eps_strs, 'Cross-state leak'

    def test_state_user_with_no_entry_points_fails_safe(self):
        """ولاية بلا EntryPoints → مجموعة فارغة (fail-safe، ليس None)."""
        from core.utils.scoping import resolve_authorized_entry_points
        uid = _uid()
        md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
        state = State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)
        user = _make_state_user(state)

        eps = resolve_authorized_entry_points(user)
        assert eps == [], 'STATE with no entry_points should give []'

    def test_state_and_sector_combined(self):
        """user بـ STATE + SECTOR → union."""
        from core.utils.scoping import resolve_authorized_entry_points
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        user = _make_state_user(a['state'])
        # أضف SECTOR role
        role = Role.objects.create(code=f'ROLE_{_uid()}', name=f'SECTOR_{_uid()}')
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='SECTOR', scope_id=b['org_sector'].id,
        )

        eps = resolve_authorized_entry_points(user)
        eps_strs = [str(x) for x in eps]
        assert str(a['entry_point'].id) in eps_strs
        assert str(b['entry_point'].id) in eps_strs

    def test_unknown_scope_type_ignored_fail_safe(self):
        """scope_type غير معروف (COMPANY) يُتجاهَل — لا توسيع."""
        from core.utils.scoping import resolve_authorized_entry_points
        uid = _uid()
        setup = _build_state(uid, 'A')
        user = _make_plain_user()
        role = Role.objects.create(code=f'ROLE_{_uid()}', name=f'COMPANY_{_uid()}')
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='COMPANY', scope_id=uuid.uuid4(),
        )

        eps = resolve_authorized_entry_points(user)
        assert eps == [], 'Unknown scope must not expand access'

    def test_superuser_still_returns_none(self):
        """superuser → None (GLOBAL) — لا تغيير."""
        from core.utils.scoping import resolve_authorized_entry_points
        user = _make_superuser()
        assert resolve_authorized_entry_points(user) is None


@pytest.mark.django_db
class TestStateScopeEndpoints:
    """SECTOR pattern applied: STATE user sees only own state across endpoints."""

    def test_state_user_sees_own_ministries(self):
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        min_a = StateMinistry.objects.create(state=a['state'], ministry_name_ar='وزارة A')
        min_b = StateMinistry.objects.create(state=b['state'], ministry_name_ar='وزارة B')

        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', body) if isinstance(body, dict) else body
        if isinstance(items, dict) and 'results' in items:
            items = items['results']
        ids = {str(i['id']) for i in items}
        assert str(min_a.id) in ids, 'State user missing own ministry'
        assert str(min_b.id) not in ids, 'Cross-state ministry leak!'

    def test_state_user_sees_own_ownerships(self):
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        owner = FacilityOwner.objects.create(code=f'OWN_{uid}', name_ar='مالك', kind='PRIVATE')
        ow_a = FacilityOwnership.objects.create(
            facility=a['facility'], owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        ow_b = FacilityOwnership.objects.create(
            facility=b['facility'], owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/facility-ownerships/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', body) if isinstance(body, dict) else body
        if isinstance(items, dict) and 'results' in items:
            items = items['results']
        ids = {str(i['id']) for i in items}
        assert str(ow_a.id) in ids
        assert str(ow_b.id) not in ids, 'Cross-state ownership leak!'

    def test_state_user_sees_own_service_availability(self):
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='خدمة', category='TB')
        av_a = ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=a['facility'],
            valid_from='2026-01-01',
        )
        av_b = ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=b['facility'],
            valid_from='2026-01-01',
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/service-availability/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', body) if isinstance(body, dict) else body
        if isinstance(items, dict) and 'results' in items:
            items = items['results']
        ids = {str(i['id']) for i in items}
        assert str(av_a.id) in ids
        assert str(av_b.id) not in ids, 'Cross-state availability leak!'

    def test_state_user_sees_own_nodes(self):
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if not root:
            root = ReportingNode.objects.create(
                code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL',
            )
        node_a = ReportingNode.objects.create(
            code=f'NA_{uid}', name_ar='عقدة A', kind='STATE', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NB_{uid}', name_ar='عقدة B', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=a['state'], node=node_a, valid_from='2026-01-01', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=b['state'], node=node_b, valid_from='2026-01-01', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/nodes/')
        body = response.json()
        items = body.get('data', body) if isinstance(body, dict) else body
        if isinstance(items, dict) and 'results' in items:
            items = items['results']
        ids = {str(i['id']) for i in items}
        assert str(node_a.id) in ids, 'State user missing own node'
        assert str(node_b.id) not in ids, 'Cross-state node leak!'


@pytest.mark.django_db
class TestStateScopeFailSafe:
    """Fail-safe preserved: no scope → empty, not 500 or global."""

    def test_plain_user_still_fails_safe(self):
        uid = _uid()
        _build_state(uid, 'A')
        client = APIClient()
        client.force_authenticate(user=_make_plain_user())
        for endpoint in [
            '/api/v1/registry/ministries/',
            '/api/v1/registry/facility-ownerships/',
            '/api/v1/registry/service-availability/',
            '/api/v1/registry/nodes/',
        ]:
            response = client.get(endpoint)
            assert response.status_code in (200, 403), f'{endpoint}: {response.status_code}'
            if response.status_code == 200:
                body = response.json()
                items = body.get('data', body) if isinstance(body, dict) else body
                if isinstance(items, dict) and 'results' in items:
                    items = items['results']
                assert items == [], f'{endpoint} leaks {len(items)} for plain user'

    def test_state_user_cannot_see_other_states(self):
        """Two STATE users on different states — no overlap."""
        uid = _uid()
        a = _build_state(uid, 'A')
        b = _build_state(uid, 'B')
        min_a = StateMinistry.objects.create(state=a['state'], ministry_name_ar='A')
        min_b = StateMinistry.objects.create(state=b['state'], ministry_name_ar='B')

        client_a = APIClient()
        client_a.force_authenticate(user=_make_state_user(a['state']))
        resp_a = client_a.get('/api/v1/registry/ministries/')
        items_a = resp_a.json().get('data', resp_a.json())
        if isinstance(items_a, dict) and 'results' in items_a:
            items_a = items_a['results']
        ids_a = {str(i['id']) for i in items_a}

        client_b = APIClient()
        client_b.force_authenticate(user=_make_state_user(b['state']))
        resp_b = client_b.get('/api/v1/registry/ministries/')
        items_b = resp_b.json().get('data', resp_b.json())
        if isinstance(items_b, dict) and 'results' in items_b:
            items_b = items_b['results']
        ids_b = {str(i['id']) for i in items_b}

        assert str(min_a.id) in ids_a and str(min_b.id) not in ids_a
        assert str(min_b.id) in ids_b and str(min_a.id) not in ids_b


@pytest.mark.django_db
class TestStateScopeNoRegression:
    """Ensure M3 endpoints still work exactly as before for SECTOR/GLOBAL."""

    def test_sector_user_still_works(self):
        """SECTOR user → still sees sector-scoped data (M3-1 behavior)."""
        uid = _uid()
        setup = _build_state(uid, 'A')
        min_a = StateMinistry.objects.create(state=setup['state'], ministry_name_ar='A')

        user = _make_plain_user()
        user.sector = setup['org_sector']
        user.save()
        role = Role.objects.create(code=f'ROLE_{_uid()}', name=f'SECTOR_{_uid()}')
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='SECTOR', scope_id=setup['org_sector'].id,
        )
        # منح permissions
        from apps.accounts.models import Permission
        for code in ['registry:view', 'ministry:view']:
            resource, action = code.split(':')
            perm, _ = Permission.objects.get_or_create(
                code=code, defaults={'name': code, 'resource': resource, 'action': action}
            )
            role.permissions.add(perm)

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/ministries/')
        body = response.json()
        items = body.get('data', body) if isinstance(body, dict) else body
        if isinstance(items, dict) and 'results' in items:
            items = items['results']
        ids = {str(i['id']) for i in items}
        assert str(min_a.id) in ids, 'SECTOR scoping regressed'

    def test_superuser_still_sees_all(self):
        """Superuser → sees everything."""
        uid = _uid()
        a = _build_state(uid, 'A')
        StateMinistry.objects.create(state=a['state'], ministry_name_ar='A')
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200
