"""M4-4-C-1: filter_queryset tests for registry viewsets.

يغطّي 8 فلاتر exact-match على 6 viewsets، بما فيها إصلاح
D-M4-4-B-4 (Departments tab يفلتر عبر ``department__facility``).

Scoping يُطبَّق في ``get_queryset`` قبل هذه الفلاتر (D-M4-4-C-3)، لذا
اختبارات السيناريو (SECTOR/STATE) في Part2.
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, HealthFacilityNodeAssignment,
    DepartmentNodeAssignment, FacilityOwner, FacilityOwnership,
    TechnicalSupervisor, TechnicalSupervision, Service, ServiceAvailability,
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


def _build_world(tag):
    """عالم واحد فيه منشأتان (A/B) — لاختبار عزل الفلترة."""
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}',
        state=state, sector=org, locality=loc,
    )

    def make_facility(suffix):
        return HealthFacility.objects.create(
            code=f'FAC_{tag}_{suffix}_{uid}', name_ar=f'منشأة {tag} {suffix}',
            sector=org, locality=loc, entry_point=ep,
        )

    fac_a = make_facility('A')
    fac_b = make_facility('B')

    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL',
        )

    def make_node(kind, suffix):
        return ReportingNode.objects.create(
            code=f'N_{tag}_{suffix}_{uid}', name_ar=f'عقدة {tag} {suffix}',
            kind=kind, parent=root,
        )

    state_node = make_node('STATE', 'ST')
    fac_node_a = make_node('FACILITY', 'FA')
    fac_node_b = make_node('FACILITY', 'FB')
    dept_node = make_node('DEPARTMENT', 'D')

    state_assign = StateNodeAssignment.objects.create(
        state=state, node=state_node, valid_from='2026-01-01', is_primary=True,
    )
    fac_assign_a = HealthFacilityNodeAssignment.objects.create(
        facility=fac_a, node=fac_node_a, valid_from='2026-01-01', is_primary=True,
    )
    fac_assign_b = HealthFacilityNodeAssignment.objects.create(
        facility=fac_b, node=fac_node_b, valid_from='2026-01-01', is_primary=True,
    )

    dept_a = Department.objects.create(
        code=f'DA_{tag}_{uid}', name_ar=f'إدارة A {tag}', kind='DEPARTMENT',
        sector=org, facility=fac_a,
    )
    dept_b = Department.objects.create(
        code=f'DB_{tag}_{uid}', name_ar=f'إدارة B {tag}', kind='DEPARTMENT',
        sector=org, facility=fac_b,
    )
    dept_assign_a = DepartmentNodeAssignment.objects.create(
        department=dept_a, node=dept_node, valid_from='2026-01-01', is_primary=True,
    )
    dept_assign_b = DepartmentNodeAssignment.objects.create(
        department=dept_b, node=dept_node, valid_from='2026-01-02', is_primary=True,
    )

    owner = FacilityOwner.objects.create(
        code=f'OWN_{tag}_{uid}', name_ar=f'مالك {tag}', kind='PRIVATE',
    )
    own_a = FacilityOwnership.objects.create(
        facility=fac_a, owner=owner, valid_from='2026-01-01', is_primary=True,
    )
    own_b = FacilityOwnership.objects.create(
        facility=fac_b, owner=owner, valid_from='2026-01-02', is_primary=True,
    )

    supervisor = TechnicalSupervisor.objects.create(
        code=f'TSUP_{tag}_{uid}', name_ar=f'مشرف {tag}', kind='STATE_MINISTRY',
    )
    sup_a = TechnicalSupervision.objects.create(
        facility=fac_a, supervisor=supervisor, supervision_level='PRIMARY',
        valid_from='2026-01-01',
    )
    sup_b = TechnicalSupervision.objects.create(
        facility=fac_b, supervisor=supervisor, supervision_level='PRIMARY',
        valid_from='2026-01-02',
    )

    service_a = Service.objects.create(
        code=f'SVA_{tag}_{uid}', name_ar=f'خدمة A {tag}', category='TB',
    )
    service_b = Service.objects.create(
        code=f'SVB_{tag}_{uid}', name_ar=f'خدمة B {tag}', category='TB',
    )
    av_a = ServiceAvailability.objects.create(
        service=service_a, target_type='FACILITY', facility=fac_a,
        valid_from='2026-01-01',
    )
    av_b = ServiceAvailability.objects.create(
        service=service_b, target_type='FACILITY', facility=fac_b,
        valid_from='2026-01-01',
    )

    return {
        'fac_a': fac_a, 'fac_b': fac_b,
        'state': state, 'state_assign': state_assign,
        'state_node': state_node, 'fac_node_a': fac_node_a,
        'fac_node_b': fac_node_b,
        'fac_assign_a': fac_assign_a, 'fac_assign_b': fac_assign_b,
        'dept_assign_a': dept_assign_a, 'dept_assign_b': dept_assign_b,
        'own_a': own_a, 'own_b': own_b,
        'sup_a': sup_a, 'sup_b': sup_b,
        'av_a': av_a, 'av_b': av_b,
        'service_a': service_a, 'service_b': service_b,
    }


def _results(response):
    body = response.json()
    items = body.get('data', body) if isinstance(body, dict) else body
    if isinstance(items, dict) and 'results' in items:
        items = items['results']
    return items if isinstance(items, list) else []


def _client():
    client = APIClient()
    client.force_authenticate(user=_make_superuser())
    return client


# ---------------------------------------------------------------------------
# 8 filter tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_facility_ownership_filter_by_facility():
    w = _build_world('OW')
    response = _client().get(
        '/api/v1/registry/facility-ownerships/',
        {'facility': str(w['fac_a'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['own_a'].id) in ids
    assert str(w['own_b'].id) not in ids


@pytest.mark.django_db
def test_technical_supervision_filter_by_facility():
    w = _build_world('TS')
    response = _client().get(
        '/api/v1/registry/technical-supervisions/',
        {'facility': str(w['fac_b'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['sup_b'].id) in ids
    assert str(w['sup_a'].id) not in ids


@pytest.mark.django_db
def test_service_availability_filter_by_facility():
    w = _build_world('SAF')
    response = _client().get(
        '/api/v1/registry/service-availability/',
        {'facility': str(w['fac_a'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['av_a'].id) in ids
    assert str(w['av_b'].id) not in ids


@pytest.mark.django_db
def test_service_availability_filter_by_service():
    w = _build_world('SAS')
    response = _client().get(
        '/api/v1/registry/service-availability/',
        {'service': str(w['service_b'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['av_b'].id) in ids
    assert str(w['av_a'].id) not in ids


@pytest.mark.django_db
def test_department_assignment_filter_by_department_facility():
    """D-M4-4-B-4: Departments tab filter via department__facility."""
    w = _build_world('DA')
    response = _client().get(
        '/api/v1/registry/department-assignments/',
        {'department__facility': str(w['fac_a'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['dept_assign_a'].id) in ids, 'own department missing'
    assert str(w['dept_assign_b'].id) not in ids, 'other facility leaked'


@pytest.mark.django_db
def test_department_assignment_facility_alias():
    """`facility` alias resolves to department__facility."""
    w = _build_world('DAL')
    response = _client().get(
        '/api/v1/registry/department-assignments/',
        {'facility': str(w['fac_b'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['dept_assign_b'].id) in ids
    assert str(w['dept_assign_a'].id) not in ids


@pytest.mark.django_db
def test_state_assignment_filter_by_state():
    w = _build_world('SA')
    response = _client().get(
        '/api/v1/registry/states/assignments/',
        {'state': str(w['state'].id)},
    )
    assert response.status_code == 200
    ids = {i['id'] for i in _results(response)}
    assert str(w['state_assign'].id) in ids


@pytest.mark.django_db
def test_facility_assignment_filter_by_node_and_facility():
    w = _build_world('FA')
    client = _client()

    by_node = client.get(
        '/api/v1/registry/facilities/assignments/',
        {'node': str(w['fac_node_a'].id)},
    )
    assert by_node.status_code == 200
    node_ids = {i['id'] for i in _results(by_node)}
    assert str(w['fac_assign_a'].id) in node_ids
    assert str(w['fac_assign_b'].id) not in node_ids

    by_facility = client.get(
        '/api/v1/registry/facilities/assignments/',
        {'facility': str(w['fac_b'].id)},
    )
    assert by_facility.status_code == 200
    fac_ids = {i['id'] for i in _results(by_facility)}
    assert str(w['fac_assign_b'].id) in fac_ids
    assert str(w['fac_assign_a'].id) not in fac_ids


@pytest.mark.django_db
def test_invalid_uuid_filter_returns_empty_not_500():
    """قيمة UUID غير صالحة → 200 بقائمة فارغة، لا 500."""
    _build_world('BAD')
    response = _client().get(
        '/api/v1/registry/facility-ownerships/',
        {'facility': 'not-a-uuid'},
    )
    assert response.status_code == 200
    assert _results(response) == []
