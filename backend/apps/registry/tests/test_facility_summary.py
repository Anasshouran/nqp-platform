"""Part3-A: facility summary endpoint (scoped read-only).

The endpoint must:
- Return 200 for superuser / GLOBAL scope.
- Return 200 for SECTOR/STATE user whose scope grants visibility through a
  registry tree assignment.
- Return 404 for out-of-scope facilities (no data leak).
- Return 404 for plain users without a scope (fail-safe).
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, HealthFacilityNodeAssignment,
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


def _make_plain_user():
    return User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')


def _make_sector_user(org_sector, is_staff=False):
    from apps.accounts.models import Permission

    uid = _uid()
    user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
    user.is_staff = is_staff
    user.sector = org_sector
    user.save()
    role = Role.objects.create(code=f'ROLE_{uid}', name=f'SECTOR_{uid}')
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='SECTOR', scope_id=org_sector.id,
    )
    perm, _ = Permission.objects.get_or_create(
        code='registry:view', defaults={'name': 'v', 'resource': 'registry', 'action': 'view'},
    )
    role.permissions.add(perm)
    return user


def _build_world(tag):
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}', state=state, sector=org, locality=loc,
    )
    facility = HealthFacility.objects.create(
        code=f'FAC_{tag}_{uid}', name_ar=f'منشأة {tag}',
        sector=org, locality=loc, entry_point=ep,
    )

    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL',
        )
    node = ReportingNode.objects.create(
        code=f'FN_{tag}_{uid}', name_ar=f'عقدة {tag}', kind='FACILITY', parent=root,
    )
    assignment = HealthFacilityNodeAssignment.objects.create(
        facility=facility, node=node, valid_from='2026-01-01', is_primary=True,
    )
    return {
        'facility': facility, 'org_sector': org, 'node': node,
        'assignment': assignment, 'state': state, 'ep': ep,
    }


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _facility_url(facility):
    return f'/api/v1/registry/facility-summary/{facility.id}/'


@pytest.mark.django_db
def test_superuser_gets_summary():
    world = _build_world('A')
    response = _client(_make_superuser()).get(_facility_url(world['facility']))
    assert response.status_code == 200, response.content[:300]
    data = response.json()['data']
    assert data['code'] == world['facility'].code
    assert data['sector']['name_ar'] == world['org_sector'].name_ar


@pytest.mark.django_db
def test_sector_user_gets_own_facility_summary():
    world = _build_world('B')
    user = _make_sector_user(world['org_sector'], is_staff=True)
    response = _client(user).get(_facility_url(world['facility']))
    assert response.status_code == 200, response.content[:300]
    assert response.json()['data']['code'] == world['facility'].code


@pytest.mark.django_db
def test_sector_user_gets_404_for_other_sector():
    a = _build_world('C')
    b = _build_world('D')
    user = _make_sector_user(a['org_sector'], is_staff=True)
    response = _client(user).get(_facility_url(b['facility']))
    assert response.status_code == 404


@pytest.mark.django_db
def test_plain_user_gets_404():
    world = _build_world('E')
    response = _client(_make_plain_user()).get(_facility_url(world['facility']))
    assert response.status_code == 404


@pytest.mark.django_db
def test_invalid_uuid_returns_404():
    response = _client(_make_superuser()).get('/api/v1/registry/facility-summary/not-a-uuid/')
    assert response.status_code == 404
