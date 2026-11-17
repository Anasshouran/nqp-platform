"""M6-bis — نطاق FACILITY في مكافحة النواقل (D-M5-C-F-3).

`SectorFieldScopedMixin.facility_path = 'facility_id'` على `VectorUnitViewSet`.
VectorUnit يبقى مرتبطاً بقطاع (غير nullable)، لذلك القناة القطاعية تعمل
دائماً؛ قناة FACILITY تُضاف بالتوازي (اتحاد) — لا استبدال.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint, HealthFacility
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Locality, Sector
from apps.vector_control.models import VectorUnit

pytestmark = pytest.mark.django_db

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag):
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


def _facility_user(facility):
    user = User.objects.create_user(
        email=f'vec_fac_{_uid()}@nqp.sd', password='x', full_name='موظف نواقل',
    )
    perm, _ = Permission.objects.get_or_create(
        code='vector:view',
        defaults={'name': 'view vector', 'resource': 'vector', 'action': 'view'},
    )
    role = Role.objects.create(code=f'VEC_FAC_{_uid()}', name=f'VEC FAC {_uid()}')
    role.permissions.add(perm)
    RoleAssignment.objects.create(
        user=user, role=role,
        scope_type=RoleAssignment.ScopeType.FACILITY, scope_id=facility.id,
    )
    return user


def _auth_client(user):
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/', {'email': user.email, 'password': 'x'}, format='json',
    )
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _unit(world, facility):
    return VectorUnit.objects.create(
        code=f'VU_{_uid()}', name_ar='وحدة ترصد', kind=VectorUnit.Kind.SURVEILLANCE,
        sector=world['sector'], facility=facility,
    )


def _ids(response):
    return {row['id'] for row in response.json()['data']['results']}


def test_facility_user_sees_own_units_only(settings):
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    world_b = _build_world('B')
    own = _unit(world_a, world_a['facility'])
    foreign = _unit(world_b, world_b['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/vector-control/units/?page_size=50')

    assert response.status_code == 200
    ids = _ids(response)
    assert str(own.id) in ids
    assert str(foreign.id) not in ids, 'تسريب عبر المنشآت!'


def test_union_uses_facility_channel_not_only_sector(settings):
    """وحدة في قطاع خارجي لكن منشأتها منشأة المستخدم → مرئية عبر facility."""
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    world_b = _build_world('B')
    cross = _unit(world_b, world_a['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/vector-control/units/?page_size=50')

    assert str(cross.id) in _ids(response)


def test_gate_off_denies_all(settings):
    settings.DEBUG = False
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    _unit(world_a, world_a['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/vector-control/units/?page_size=50')

    assert response.status_code == 200
    assert response.json()['data']['count'] == 0
