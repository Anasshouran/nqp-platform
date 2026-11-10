"""M4-1-bis: اختبارات انحدار لكل endpoints الـ scoped.

الخلفية (D-M4-1-4): `RegistryScopedViewSet.get_queryset` احتوى أسماء
related_names/hields خاطئة (`statenodeassignment` بدل `statenodeassignment_set`،
`health_facility_id` بدل `facility`) منذ M3-1. أي مستخدم SECTOR يستعلم
`/api/v1/registry/nodes/` أو `/facilities/assignments/` كان يحصل على 500.

لم يُكتشف لأن الاختبارات القديمة غطّت عيّنة (ministries/ownerships/…) لا كل
endpoint. هذا الملف يغطّي **كل** list endpoint مسجّل في الراوتر — لا عيّنة.
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, LocalityNodeAssignment,
    HealthFacilityNodeAssignment, DepartmentNodeAssignment,
    StateMinistry, FacilityOwner, FacilityOwnership,
    TechnicalSupervisor, TechnicalSupervision,
    Service, ServiceAvailability,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag):
    """يبني عالماً كاملاً منفصلاً: sector + state + locality + facility + nodes + ministry."""
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
    dept = Department.objects.create(
        code=f'DEPT_{tag}_{uid}', name_ar=f'إدارة {tag}', kind='DEPARTMENT', sector=org,
    )

    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL',
        )
    state_node = ReportingNode.objects.create(
        code=f'SN_{tag}_{uid}', name_ar=f'عقدة ولاية {tag}', kind='STATE', parent=root,
    )
    loc_node = ReportingNode.objects.create(
        code=f'LN_{tag}_{uid}', name_ar=f'عقدة محلية {tag}', kind='LOCALITY', parent=root,
    )
    fac_node = ReportingNode.objects.create(
        code=f'FN_{tag}_{uid}', name_ar=f'عقدة منشأة {tag}', kind='FACILITY', parent=root,
    )
    dept_node = ReportingNode.objects.create(
        code=f'DN_{tag}_{uid}', name_ar=f'عقدة إدارة {tag}', kind='DEPARTMENT', parent=root,
    )

    state_assign = StateNodeAssignment.objects.create(
        state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
    )
    loc_assign = LocalityNodeAssignment.objects.create(
        locality=loc, node=loc_node, valid_from='2026-01-01', is_primary=True,
    )
    fac_assign = HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=fac_node, valid_from='2026-01-01', is_primary=True,
    )
    dept_assign = DepartmentNodeAssignment.objects.create(
        department=dept, node=dept_node, valid_from='2026-01-01', is_primary=True,
    )

    ministry = StateMinistry.objects.create(
        state=state, ministry_name_ar=f'وزارة {tag} {uid}',
    )

    owner = FacilityOwner.objects.create(
        code=f'OWN_{tag}_{uid}', name_ar=f'مالك {tag}', kind='PRIVATE',
    )
    ownership = FacilityOwnership.objects.create(
        facility=fac, owner=owner, valid_from='2026-01-01', is_primary=True,
    )

    supervisor = TechnicalSupervisor.objects.create(
        code=f'TSUP_{tag}_{uid}', name_ar=f'مشرف {tag}', kind='STATE_MINISTRY',
    )
    supervision = TechnicalSupervision.objects.create(
        facility=fac, supervisor=supervisor, supervision_level='PRIMARY',
        valid_from='2026-01-01',
    )

    service = Service.objects.create(
        code=f'SVC_{tag}_{uid}', name_ar=f'خدمة {tag}', category='TB',
    )
    availability = ServiceAvailability.objects.create(
        service=service, target_type='FACILITY', facility=fac, valid_from='2026-01-01',
    )

    return {
        'uid': uid, 'org': org, 'state': state, 'locality': loc,
        'entry_point': ep, 'facility': fac, 'department': dept,
        'nodes': [state_node, loc_node, fac_node, dept_node],
        'state_node': state_node, 'loc_node': loc_node,
        'fac_node': fac_node, 'dept_node': dept_node,
        'state_assign': state_assign, 'loc_assign': loc_assign,
        'fac_assign': fac_assign, 'dept_assign': dept_assign,
        'ministry': ministry, 'ownership': ownership,
        'supervision': supervision, 'availability': availability,
    }


def _make_sector_user(org_sector):
    """SECTOR user بصلاحيات القراءة اللازمة (الـ scoping يبقى مطبَّقاً)."""
    from apps.accounts.models import Permission

    uid = _uid()
    user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
    user.sector = org_sector
    user.save()
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'SECTOR_{uid}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='SECTOR', scope_id=org_sector.id,
    )
    for code in ('registry:view', 'ministry:view'):
        resource, action = code.split(':')
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'name': code, 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    return user


def _payload(response):
    body = response.json()
    items = body.get('data', body) if isinstance(body, dict) else body
    if isinstance(items, dict) and 'results' in items:
        items = items['results']
    return items if isinstance(items, list) else []


SCOPED_ENDPOINTS = [
    '/api/v1/registry/nodes/',
    '/api/v1/registry/states/assignments/',
    '/api/v1/registry/localities/assignments/',
    '/api/v1/registry/facilities/assignments/',
    '/api/v1/registry/ministries/',
    '/api/v1/registry/owners/',
    '/api/v1/registry/facility-ownerships/',
    '/api/v1/registry/technical-supervisors/',
    '/api/v1/registry/technical-supervisions/',
    '/api/v1/registry/department-assignments/',
    '/api/v1/registry/services/',
    '/api/v1/registry/service-availability/',
    '/api/v1/registry/changelog/',
]


@pytest.mark.django_db
@pytest.mark.parametrize('endpoint', SCOPED_ENDPOINTS)
def test_sector_user_never_gets_500(endpoint):
    """SECTOR user → أي endpoint مسجّل لا يُرجع 500 (D-M4-1-4)."""
    a = _build_world('A')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(endpoint)

    assert response.status_code != 500, (
        f'{endpoint}: 500 — اسم related_name/field خاطئ في get_queryset. '
        f'Response: {response.content[:500]!r}'
    )
    assert response.status_code in (200, 403), (
        f'{endpoint}: رمز غير متوقع {response.status_code}'
    )


@pytest.mark.django_db
def test_every_registered_list_endpoint_is_covered():
    """اختبار بنيوي: كل list endpoint في الراوتر يجب أن يكون ضمن المصفوفة أعلاه.

    يمنع تكرار درس D-M4-1-4: أي ViewSet جديد يُضاف بلا اختبار scoping يفشل هنا.
    """
    from apps.registry.urls import router

    registered = {
        f'/api/v1/registry/{prefix}/'
        for prefix, viewset, _basename in router.registry
        if hasattr(viewset, 'list')
    }
    missing = registered - set(SCOPED_ENDPOINTS)
    assert not missing, (
        f'Endpoints مسجّلة بلا اختبار scoping: {sorted(missing)}. '
        f'أضفها إلى SCOPED_ENDPOINTS.'
    )


@pytest.mark.django_db
def test_nodes_scoped_to_own_sector():
    """SECTOR user يرى عُقده فقط — لا تسريب من قطاع آخر."""
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/registry/nodes/')
    assert response.status_code == 200
    ids = {str(i['id']) for i in _payload(response)}

    for node in a['nodes']:
        assert str(node.id) in ids, f'SECTOR user لا يرى عقدته {node.code}'
    for node in b['nodes']:
        assert str(node.id) not in ids, f'تسريب: عقدة قطاع آخر {node.code}'


@pytest.mark.django_db
def test_state_assignments_scoped():
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/registry/states/assignments/')
    assert response.status_code == 200
    ids = {str(i['id']) for i in _payload(response)}

    assert str(a['state_assign'].id) in ids
    assert str(b['state_assign'].id) not in ids, 'تسريب: تعيين ولاية قطاع آخر'


@pytest.mark.django_db
def test_locality_assignments_scoped():
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/registry/localities/assignments/')
    assert response.status_code == 200
    ids = {str(i['id']) for i in _payload(response)}

    assert str(a['loc_assign'].id) in ids
    assert str(b['loc_assign'].id) not in ids, 'تسريب: تعيين محلية قطاع آخر'


@pytest.mark.django_db
def test_facility_assignments_scoped():
    """كان 500 قبل M4-1-bis (health_facility_id بدل facility)."""
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/registry/facilities/assignments/')
    assert response.status_code == 200
    ids = {str(i['id']) for i in _payload(response)}

    assert str(a['fac_assign'].id) in ids
    assert str(b['fac_assign'].id) not in ids, 'تسريب: تعيين منشأة قطاع آخر'


@pytest.mark.django_db
def test_department_assignments_scoped():
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/registry/department-assignments/')
    assert response.status_code == 200
    ids = {str(i['id']) for i in _payload(response)}

    assert str(a['dept_assign'].id) in ids, 'SECTOR user لا يرى تعيين إدارته'
    assert str(b['dept_assign'].id) not in ids, 'تسريب: تعيين إدارة قطاع آخر'


@pytest.mark.django_db
def test_all_scoped_endpoints_show_only_own_world():
    """مصفوفة كاملة: كل endpoint يعيد بيانات العالم A فقط (200)."""
    a = _build_world('A')
    b = _build_world('B')
    user = _make_sector_user(a['org'])

    client = APIClient()
    client.force_authenticate(user=user)

    checks = {
        '/api/v1/registry/ministries/': ('ministry',),
        '/api/v1/registry/facility-ownerships/': ('ownership',),
        '/api/v1/registry/technical-supervisions/': ('supervision',),
        '/api/v1/registry/service-availability/': ('availability',),
    }
    for endpoint, keys in checks.items():
        response = client.get(endpoint)
        assert response.status_code == 200, f'{endpoint}: {response.status_code}'
        ids = {str(i['id']) for i in _payload(response)}
        assert str(a[keys[0]].id) in ids, f'{endpoint}: عنصر العالم A غائب'
        assert str(b[keys[0]].id) not in ids, f'{endpoint}: تسريب من العالم B'
