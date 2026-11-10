"""M4-2-B: STATE path closure — إغلاق D-M4-1-1.
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import Sector as MasterdataSector, State, HealthFacility
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, StateMinistry,
    HealthFacilityNodeAssignment, LocalityNodeAssignment,
    FacilityOwner, FacilityOwnership,
    TechnicalSupervisor, TechnicalSupervision,
    Service, ServiceAvailability,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _make_state(tag):
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    return State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)


def _make_state_user(state):
    """STATE user — بلا EntryPoints ولا صلاحيات زائدة (scoping-only)."""
    from apps.accounts.models import Permission

    uid = _uid()
    user = User.objects.create_user(email=f'state_{uid}@test.com', password='x')
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'STATE_ADMIN_{uid}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='STATE', scope_id=state.id,
    )
    for code in ('registry:view', 'ministry:view'):
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(
            code=code, defaults={'name': code, 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    return user


def _payload(response):
    body = response.json()
    items = body.get('data', body) if isinstance(body, dict) else body
    if isinstance(items, dict) and 'results' in items:
        items = items['results']
    return items if isinstance(items, list) else []


def _node_ids(response):
    return {str(i['id']) for i in _payload(response)}


@pytest.mark.django_db
class TestStatePathClosure:

    def test_state_user_sees_descendants_without_entry_points(self):
        """D-M4-1-1: عقد الولاية وdescendants مرئية رغم غياب EntryPoints."""
        root = _ensure_root()
        uid = _uid()
        state = _make_state('A')

        state_node = ReportingNode.objects.create(
            code=f'SN_{uid}', name_ar='عقدة ولاية', kind='STATE', parent=root,
        )
        loc_node = ReportingNode.objects.create(
            code=f'LN_{uid}', name_ar='عقدة محلية', kind='LOCALITY', parent=state_node,
        )
        fac_node = ReportingNode.objects.create(
            code=f'FN_{uid}', name_ar='عقدة منشأة', kind='FACILITY', parent=loc_node,
        )
        StateNodeAssignment.objects.create(
            state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state))
        response = client.get('/api/v1/registry/nodes/')
        assert response.status_code == 200, response.json()
        ids = _node_ids(response)

        assert str(state_node.id) in ids, 'عقدة الولاية غائبة'
        assert str(loc_node.id) in ids, 'descendant (محلية) غائبة'
        assert str(fac_node.id) in ids, 'descendant (منشأة) غائبة'

    def test_state_user_does_not_see_other_state_subtree(self):
        root = _ensure_root()
        uid = _uid()
        state_a = _make_state('A')
        state_b = _make_state('B')

        node_a = ReportingNode.objects.create(
            code=f'NA_{uid}', name_ar='A', kind='STATE', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NB_{uid}', name_ar='B', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=state_a, node=node_a, valid_from='2026-01-01', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=state_b, node=node_b, valid_from='2026-01-01', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state_a))
        response = client.get('/api/v1/registry/nodes/')
        ids = _node_ids(response)

        assert str(node_a.id) in ids
        assert str(node_b.id) not in ids, 'تسريب: شجرة ولاية أخرى'

    def test_state_user_without_assignment_sees_nothing(self):
        """بلا StateNodeAssignment وبلا EntryPoints → لا عقد (fail-safe)."""
        root = _ensure_root()
        uid = _uid()
        state = _make_state('A')
        other_node = ReportingNode.objects.create(
            code=f'OTHER_{uid}', name_ar='x', kind='STATE', parent=root,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state))
        response = client.get('/api/v1/registry/nodes/')
        assert response.status_code == 200, response.json()
        ids = _node_ids(response)
        assert str(other_node.id) not in ids, 'تسريب: عقدة غير معيَّنة'

    def test_historical_assignment_not_used(self):
        """StateNodeAssignment منتهية (valid_to في الماضي) لا تفتح مساراً."""
        root = _ensure_root()
        uid = _uid()
        state = _make_state('A')

        old_node = ReportingNode.objects.create(
            code=f'OLD_{uid}', name_ar='قديمة', kind='STATE', parent=root,
        )
        new_node = ReportingNode.objects.create(
            code=f'NEW_{uid}', name_ar='جديدة', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=state, node=old_node,
            valid_from='2025-01-01', valid_to='2025-12-31', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=state, node=new_node, valid_from='2026-01-01', is_primary=True,
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state))
        ids = _node_ids(client.get('/api/v1/registry/nodes/'))

        assert str(new_node.id) in ids
        assert str(old_node.id) not in ids, 'تسريب: تعيين منتهي الصلاحية'

    def test_two_state_scopes_are_unioned(self):
        root = _ensure_root()
        uid = _uid()
        state_a = _make_state('A')
        state_b = _make_state('B')

        node_a = ReportingNode.objects.create(
            code=f'NA_{uid}', name_ar='A', kind='STATE', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NB_{uid}', name_ar='B', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=state_a, node=node_a, valid_from='2026-01-01', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=state_b, node=node_b, valid_from='2026-01-01', is_primary=True,
        )

        user = _make_state_user(state_a)
        role = Role.objects.create(code=f'ROLE_B_{_uid()}', name='STATE_B')
        RoleAssignment.objects.create(
            user=user, role=role, scope_type='STATE', scope_id=state_b.id,
        )

        client = APIClient()
        client.force_authenticate(user=user)
        ids = _node_ids(client.get('/api/v1/registry/nodes/'))

        assert str(node_a.id) in ids
        assert str(node_b.id) in ids, 'STATE scopes لم تُجمَّع'

    def test_state_ministry_visible_without_entry_points(self):
        """D-M4-1-1 جزئياً: وزارة الولاية مرئية رغم غياب EntryPoints."""
        state = _make_state('A')
        ministry = StateMinistry.objects.create(
            state=state, ministry_name_ar='وزارة الولاية',
        )

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state))
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200, response.json()
        ids = _node_ids(response)
        assert str(ministry.id) in ids

    def test_plain_user_still_fails_safe(self):
        root = _ensure_root()
        uid = _uid()
        state = _make_state('A')
        node = ReportingNode.objects.create(
            code=f'SN_{uid}', name_ar='x', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=state, node=node, valid_from='2026-01-01', is_primary=True,
        )
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/nodes/')
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            assert _payload(response) == [], 'fail-safe منكسر بعد M4-2'

    def test_superuser_unaffected(self):
        root = _ensure_root()
        uid = _uid()
        node = ReportingNode.objects.create(
            code=f'SN_{uid}', name_ar='x', kind='STATE', parent=root,
        )
        user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
        user.is_staff = True
        user.is_superuser = True
        user.save()
        client = APIClient()
        client.force_authenticate(user=user)
        ids = _node_ids(client.get('/api/v1/registry/nodes/'))
        assert str(node.id) in ids


def _build_state_world(tag):
    """ولاية بلا EntryPoints + منشأة + ownership/supervision/availability."""
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    fac = HealthFacility.objects.create(
        code=f'FAC_{tag}_{uid}', name_ar=f'منشأة {tag}',
        sector=org, locality=loc, entry_point=None,
    )

    root = _ensure_root()
    state_node = ReportingNode.objects.create(
        code=f'SN_{tag}_{uid}', name_ar=f'عقدة ولاية {tag}', kind='STATE', parent=root,
    )
    fac_node = ReportingNode.objects.create(
        code=f'FN_{tag}_{uid}', name_ar=f'عقدة منشأة {tag}', kind='FACILITY', parent=state_node,
    )
    StateNodeAssignment.objects.create(
        state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=fac_node, valid_from='2026-01-01', is_primary=True,
    )
    LocalityNodeAssignment.objects.create(
        locality=loc, node=fac_node, valid_from='2026-01-01', is_primary=True,
    )

    owner = FacilityOwner.objects.create(
        code=f'OWN_{tag}_{uid}', name_ar=f'مالك {tag}', kind='PRIVATE',
    )
    ownership = FacilityOwnership.objects.create(
        facility=fac, owner=owner, valid_from='2026-01-01', is_primary=True,
    )

    supervisor = TechnicalSupervisor.objects.create(
        code=f'TSUP_{tag}_{uid}', name_ar=f'مشرف {tag}',
        kind='STATE_HEALTH_DEPT', domain='GENERAL',
    )
    supervision = TechnicalSupervision.objects.create(
        facility=fac, supervisor=supervisor, supervision_level='PRIMARY',
        valid_from='2026-01-01',
    )

    svc = Service.objects.create(code=f'SVC_{tag}_{uid}', name_ar=f'خدمة {tag}', category='TB')
    availability = ServiceAvailability.objects.create(
        service=svc, target_type='FACILITY', facility=fac, valid_from='2026-01-01',
    )

    return {
        'state': state, 'facility': fac, 'ownership': ownership,
        'supervision': supervision, 'availability': availability,
    }


@pytest.mark.django_db
class TestStatePathFullCoverage:
    """D-M4-2-8: STATE user (no EntryPoints) sees ownerships/supervisions/availability."""

    def test_state_user_sees_ownerships_without_entry_points(self):
        a = _build_state_world('A')
        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/facility-ownerships/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['ownership'].id) in ids, 'STATE user لا يرى ownership منشأة ولايته'

    def test_state_user_sees_supervisions_without_entry_points(self):
        a = _build_state_world('A')
        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/technical-supervisions/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['supervision'].id) in ids, 'STATE user لا يرى supervision منشأة ولايته'

    def test_state_user_sees_service_availability_without_entry_points(self):
        a = _build_state_world('A')
        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/service-availability/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['availability'].id) in ids, 'STATE user لا يرى availability منشأة ولايته'

    def test_state_user_does_not_see_other_state_subtree(self):
        """لا تسريب: STATE A user لا يرى ownerships في subtree B."""
        a = _build_state_world('A')
        b = _build_state_world('B')
        client = APIClient()
        client.force_authenticate(user=_make_state_user(a['state']))
        response = client.get('/api/v1/registry/facility-ownerships/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['ownership'].id) in ids
        assert str(b['ownership'].id) not in ids, 'تسريب: ownership ولاية أخرى'

def _make_sector_user(org_sector):
    from apps.accounts.models import Permission, Role, RoleAssignment
    from django.contrib.auth import get_user_model
    User = get_user_model()
    uid = _uid()
    user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
    user.sector = org_sector
    user.save()
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'SECTOR_{uid}')
    RoleAssignment.objects.create(user=user, role=role, scope_type='SECTOR', scope_id=org_sector.id)
    for code in ('registry:view', 'ministry:view'):
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(code=code, defaults={'name': code, 'resource': resource, 'action': action})
        role.permissions.add(perm)
    return user


@pytest.mark.django_db
class TestDashboardScoping:
    """M4-3-bis: /dashboard/tree/ + /dashboard/summary/ مقيّدان."""

    def test_dashboard_tree_state_user_sees_only_own_subtree(self):
        root = _ensure_root()
        uid = _uid()
        state_a = _make_state('A')
        state_b = _make_state('B')

        node_a = ReportingNode.objects.create(
            code=f'NA_{uid}', name_ar='A', kind='STATE', parent=root,
        )
        node_b = ReportingNode.objects.create(
            code=f'NB_{uid}', name_ar='B', kind='STATE', parent=root,
        )
        StateNodeAssignment.objects.create(
            state=state_a, node=node_a, valid_from='2026-01-01', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=state_b, node=node_b, valid_from='2026-01-01', is_primary=True,
        )

        def _collect_ids(payload):
            out = set()
            def walk(n):
                out.add(str(n['id']))
                for c in n.get('children', []) or []:
                    walk(c)
            for r in (payload if isinstance(payload, list) else []):
                walk(r)
            return out

        client = APIClient()
        client.force_authenticate(user=_make_state_user(state_a))
        response = client.get('/api/v1/registry/dashboard/tree/', HTTP_HOST='localhost')
        assert response.status_code == 200, response.json()
        ids = _collect_ids(response.json().get('data', []))
        assert str(node_a.id) in ids, 'STATE user لا يرى عقدة ولايته'
        assert str(node_b.id) not in ids, 'تسريب: عقدة ولاية أخرى في الشجرة'

    def test_dashboard_tree_sector_user_sees_only_own_sector(self):
        from apps.masterdata.models import Sector as MasterdataSector, EntryPoint, HealthFacility
        from apps.organization.models import Sector as OrgSector, Locality

        uid = _uid()
        # Sector A
        md_a = MasterdataSector.objects.create(code=f'MD_A_{uid}', name_ar='نقل أ')
        org_a = OrgSector.objects.create(code=f'ORG_A_{uid}', name_ar='قطاع أ')
        state_a = State.objects.create(code=f'ST_A_{uid}', name_ar='ولاية أ', sector=md_a)
        loc_a = Locality.objects.create(code=f'LOC_A_{uid}', name_ar='محلية أ', sector=org_a)
        ep_a = EntryPoint.objects.create(code=f'EP_A_{uid}', name_ar='منفذ أ', state=state_a, sector=org_a, locality=loc_a)
        fac_a = HealthFacility.objects.create(code=f'FAC_A_{uid}', name_ar='منشأة أ', sector=org_a, locality=loc_a, entry_point=ep_a)

        # Sector B
        md_b = MasterdataSector.objects.create(code=f'MD_B_{uid}', name_ar='نقل ب')
        org_b = OrgSector.objects.create(code=f'ORG_B_{uid}', name_ar='قطاع ب')
        state_b = State.objects.create(code=f'ST_B_{uid}', name_ar='ولاية ب', sector=md_b)
        loc_b = Locality.objects.create(code=f'LOC_B_{uid}', name_ar='محلية ب', sector=org_b)
        ep_b = EntryPoint.objects.create(code=f'EP_B_{uid}', name_ar='منفذ ب', state=state_b, sector=org_b, locality=loc_b)
        fac_b = HealthFacility.objects.create(code=f'FAC_B_{uid}', name_ar='منشأة ب', sector=org_b, locality=loc_b, entry_point=ep_b)

        root = _ensure_root()
        node_a = ReportingNode.objects.create(code=f'NA_{uid}', name_ar='A', kind='FACILITY', parent=root)
        node_b = ReportingNode.objects.create(code=f'NB_{uid}', name_ar='B', kind='FACILITY', parent=root)
        from apps.registry.models import HealthFacilityNodeAssignment
        HealthFacilityNodeAssignment.objects.create(facility=fac_a, node=node_a, valid_from='2026-01-01', is_primary=True)
        HealthFacilityNodeAssignment.objects.create(facility=fac_b, node=node_b, valid_from='2026-01-01', is_primary=True)

        user = _make_sector_user(org_a)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/dashboard/tree/', HTTP_HOST='localhost')
        assert response.status_code == 200, response.json()

        def _collect_ids(payload):
            out = set()
            def walk(n):
                out.add(str(n['id']))
                for c in n.get('children', []) or []:
                    walk(c)
            for r in (payload if isinstance(payload, list) else []):
                walk(r)
            return out

        ids = _collect_ids(response.json().get('data', []))
        assert str(node_a.id) in ids, 'SECTOR user لا يرى عقدة قطاعه'
        assert str(node_b.id) not in ids, 'تسريب: عقدة قطاع آخر في الشجرة'

    def test_dashboard_summary_scoped(self):
        state = _make_state('A')
        user = _make_state_user(state)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/dashboard/summary/', HTTP_HOST='localhost')
        assert response.status_code == 200, response.json()
        data = response.json().get('data', {})
        # STATE user (no nodes assigned) → 0 nodes
        assert data.get('nodes', -1) == 0, f'STATE user summary not scoped: {data}'


@pytest.mark.django_db
class TestSectorDashboardTree:
    """M4-4-A-3: SECTOR user → /dashboard/tree/ يرى فقط subtree قطاعه."""

    def test_sector_user_sees_only_own_sector(self):
        from apps.masterdata.models import Sector as MasterdataSector, State, EntryPoint, HealthFacility
        from apps.organization.models import Sector as OrgSector, Locality
        from apps.registry.models import HealthFacilityNodeAssignment

        uid = _uid()
        # Sector A (user's)
        md_a = MasterdataSector.objects.create(code=f'MD_A_{uid}', name_ar='نقل A')
        org_a = OrgSector.objects.create(code=f'ORG_A_{uid}', name_ar='قطاع A')
        state_a = State.objects.create(code=f'ST_A_{uid}', name_ar='ولاية A', sector=md_a)
        loc_a = Locality.objects.create(code=f'LOC_A_{uid}', name_ar='محلية A', sector=org_a)
        ep_a = EntryPoint.objects.create(code=f'EP_A_{uid}', name_ar='منفذ A', state=state_a, sector=org_a, locality=loc_a)
        fac_a = HealthFacility.objects.create(code=f'FAC_A_{uid}', name_ar='منشأة A', sector=org_a, locality=loc_a, entry_point=ep_a)

        # Sector B (other)
        md_b = MasterdataSector.objects.create(code=f'MD_B_{uid}', name_ar='نقل B')
        org_b = OrgSector.objects.create(code=f'ORG_B_{uid}', name_ar='قطاع B')
        state_b = State.objects.create(code=f'ST_B_{uid}', name_ar='ولاية B', sector=md_b)
        loc_b = Locality.objects.create(code=f'LOC_B_{uid}', name_ar='محلية B', sector=org_b)
        ep_b = EntryPoint.objects.create(code=f'EP_B_{uid}', name_ar='منفذ B', state=state_b, sector=org_b, locality=loc_b)
        fac_b = HealthFacility.objects.create(code=f'FAC_B_{uid}', name_ar='منشأة B', sector=org_b, locality=loc_b, entry_point=ep_b)

        root = _ensure_root()
        node_a = ReportingNode.objects.create(code=f'FNA_{uid}', name_ar='A', kind='FACILITY', parent=root)
        node_b = ReportingNode.objects.create(code=f'FNB_{uid}', name_ar='B', kind='FACILITY', parent=root)
        HealthFacilityNodeAssignment.objects.create(facility=fac_a, node=node_a, valid_from='2026-01-01', is_primary=True)
        HealthFacilityNodeAssignment.objects.create(facility=fac_b, node=node_b, valid_from='2026-01-01', is_primary=True)

        user = _make_sector_user(org_a)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/dashboard/tree/', HTTP_HOST='localhost')
        assert response.status_code == 200, response.json()

        def _flatten(nodes):
            out = []
            for n in (nodes or []):
                out.append(n)
                out.extend(_flatten(n.get('children', [])))
            return out

        data = response.json().get('data', [])
        flat = _flatten(data if isinstance(data, list) else [data])
        codes = {n.get('code') for n in flat}

        assert f'FNA_{uid}' in codes, 'SECTOR user missing own facility node'
        assert f'FNB_{uid}' not in codes, 'SECTOR user sees other sector node — LEAK!'
