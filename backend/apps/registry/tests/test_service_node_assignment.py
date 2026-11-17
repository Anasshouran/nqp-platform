"""M4-2-A/D: ServiceNodeAssignment — نمط DepartmentNodeAssignment (M3-4)."""
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, LocalityNodeAssignment,
    HealthFacilityNodeAssignment, RegistryChangeLog, Service,
    ServiceNodeAssignment,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _ensure_root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _make_service_node(parent=None):
    return ReportingNode.objects.create(
        code=f'SVC_NODE_{_uid()}', name_ar='عقدة خدمة',
        kind='SERVICE', parent=parent or _ensure_root(),
    )


def _make_service():
    return Service.objects.create(
        code=f'SVC_{_uid()}', name_ar='خدمة', category='TB',
    )


def _payload(response):
    body = response.json()
    items = body.get('data', body) if isinstance(body, dict) else body
    if isinstance(items, dict) and 'results' in items:
        items = items['results']
    return items if isinstance(items, list) else []


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestServiceNodeAssignmentModel:

    def test_create_assignment(self):
        svc = _make_service()
        node = _make_service_node()
        a = ServiceNodeAssignment.objects.create(
            service=svc, node=node, valid_from='2026-01-01', is_primary=True,
        )
        assert a.is_primary
        assert a.node.kind == 'SERVICE'

    def test_node_kind_must_be_service(self):
        svc = _make_service()
        a = ServiceNodeAssignment(
            service=svc, node=_ensure_root(), valid_from='2026-01-01',
        )
        with pytest.raises(ValidationError):
            a.full_clean()

    def test_invalid_date_range(self):
        svc = _make_service()
        a = ServiceNodeAssignment(
            service=svc, node=_make_service_node(),
            valid_from='2026-12-31', valid_to='2026-01-01',
        )
        with pytest.raises(ValidationError):
            a.full_clean()

    def test_two_active_primaries_rejected(self):
        svc = _make_service()
        ServiceNodeAssignment.objects.create(
            service=svc, node=_make_service_node(),
            valid_from='2026-01-01', is_primary=True,
        )
        with pytest.raises(ValidationError):
            ServiceNodeAssignment(
                service=svc, node=_make_service_node(),
                valid_from='2026-06-01', is_primary=True,
            ).full_clean()

    def test_historical_allowed(self):
        svc = _make_service()
        ServiceNodeAssignment.objects.create(
            service=svc, node=_make_service_node(),
            valid_from='2025-01-01', valid_to='2025-12-31', is_primary=True,
        )
        a2 = ServiceNodeAssignment.objects.create(
            service=svc, node=_make_service_node(),
            valid_from='2026-01-01', is_primary=True,
        )
        assert a2.pk is not None


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestServiceNodeAssignmentAPI:

    def test_create_api(self):
        svc = _make_service()
        node = _make_service_node()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/service-node-assignments/', {
            'service': str(svc.id),
            'node': str(node.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert response.status_code == 201, response.json()

    def test_wrong_kind_api(self):
        svc = _make_service()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/service-node-assignments/', {
            'service': str(svc.id),
            'node': str(_ensure_root().id),
            'valid_from': '2026-01-01',
        })
        assert response.status_code == 400
        assert 'node' in str(response.json())

    def test_signal_logs_assign(self):
        svc = _make_service()
        node = _make_service_node()
        before = RegistryChangeLog.objects.count()
        ServiceNodeAssignment.objects.create(
            service=svc, node=node, valid_from='2026-01-01',
        )
        assert RegistryChangeLog.objects.count() == before + 1
        last = RegistryChangeLog.objects.order_by('-created_at').first()
        assert last.action == 'ASSIGN'

    def test_delete_blocked(self):
        """http_method_names على RegistryScopedViewSet → 405."""
        svc = _make_service()
        node = _make_service_node()
        a = ServiceNodeAssignment.objects.create(
            service=svc, node=node, valid_from='2026-01-01',
        )
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.delete(f'/api/v1/registry/service-node-assignments/{a.id}/')
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# Scope matrix (Q-M4-2-3 = A)
# ---------------------------------------------------------------------------

def _build_world(tag):
    """عالم كامل: sector + state + locality + facility + شجرة + خدمة معيّنة لعقدة."""
    uid = _uid()
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

    root = _ensure_root()
    state_node = ReportingNode.objects.create(
        code=f'SN_{tag}_{uid}', name_ar=f'عقدة ولاية {tag}', kind='STATE', parent=root,
    )
    fac_node = ReportingNode.objects.create(
        code=f'FN_{tag}_{uid}', name_ar=f'عقدة منشأة {tag}', kind='FACILITY', parent=state_node,
    )
    service_node = ReportingNode.objects.create(
        code=f'VSN_{tag}_{uid}', name_ar=f'عقدة خدمة {tag}', kind='SERVICE', parent=fac_node,
    )

    StateNodeAssignment.objects.create(
        state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
    )
    LocalityNodeAssignment.objects.create(
        locality=loc, node=fac_node, valid_from='2026-01-01',
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=fac_node, valid_from='2026-01-01', is_primary=True,
    )

    svc = Service.objects.create(code=f'SVC_{tag}_{uid}', name_ar=f'خدمة {tag}', category='TB')
    assignment = ServiceNodeAssignment.objects.create(
        service=svc, node=service_node, valid_from='2026-01-01', is_primary=True,
    )
    return {
        'uid': uid, 'org': org, 'state': state, 'facility': fac,
        'state_node': state_node, 'fac_node': fac_node,
        'service_node': service_node, 'assignment': assignment,
    }


def _make_scoped_user(scope_type, scope_id, org_sector=None):
    from apps.accounts.models import Permission

    uid = _uid()
    user = User.objects.create_user(email=f'{scope_type.lower()}_{uid}@test.com', password='x')
    if org_sector is not None:
        user.sector = org_sector
        user.save()
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'{scope_type}_{uid}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
    )
    for code in ('registry:view', 'ministry:view'):
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(
            code=code, defaults={'name': code, 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    return user


@pytest.mark.django_db
class TestServiceNodeAssignmentScoping:

    def test_superuser_sees_all(self):
        a = _build_world('A')
        b = _build_world('B')
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/service-node-assignments/')
        assert response.status_code == 200
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['assignment'].id) in ids
        assert str(b['assignment'].id) in ids

    def test_plain_user_sees_nothing(self):
        _build_world('A')
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/service-node-assignments/')
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            assert _payload(response) == []

    def test_sector_user_sees_own_sector(self):
        """عقدة الخدمة ورقة تحت عقدة المنشأة → تُرى عبر شجرة القطاع."""
        a = _build_world('A')
        b = _build_world('B')
        user = _make_scoped_user('SECTOR', a['org'].id, org_sector=a['org'])
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/service-node-assignments/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['assignment'].id) in ids, 'SECTOR user لا يرى خدمة قطاعه'
        assert str(b['assignment'].id) not in ids, 'تسريب: خدمة قطاع آخر'

    def test_state_user_sees_own_state(self):
        a = _build_world('A')
        b = _build_world('B')
        user = _make_scoped_user('STATE', a['state'].id)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/service-node-assignments/')
        assert response.status_code == 200, response.json()
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a['assignment'].id) in ids, 'STATE user لا يرى خدمة ولايته'
        assert str(b['assignment'].id) not in ids, 'تسريب: خدمة ولاية أخرى'

    def test_unassigned_service_node_not_leaked(self):
        """عقدة خدمة معلّقة تحت جذر غير مرئي → لا تظهر لأحد غير GLOBAL."""
        a = _build_world('A')
        svc = Service.objects.create(code=f'SVC_X_{_uid()}', name_ar='خدمة X', category='TB')
        orphan_node = ReportingNode.objects.create(
            code=f'ORPHAN_{_uid()}', name_ar='عقدة معلقة', kind='SERVICE',
            parent=_ensure_root(),
        )
        orphan = ServiceNodeAssignment.objects.create(
            service=svc, node=orphan_node, valid_from='2026-01-01',
        )
        user = _make_scoped_user('STATE', a['state'].id)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/service-node-assignments/')
        ids = {str(i['id']) for i in _payload(response)}
        assert str(orphan.id) not in ids, 'تسريب: تعيين تحت عقدة غير مرئية'
