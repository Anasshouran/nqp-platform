"""M6-bis — نطاق FACILITY في الفحص الصحي (D-M5-C-F-2).

قناة FACILITY تعمل باتحاد مع قناة المعبر:
  1. منفذ المنشأة عبر `HealthFacility.entry_point` (قناة port).
  2. `HealthScreening.facility` مباشرةً (قناة facility — M6-bis).
منشأة بلا `entry_point` تبقى تعمل عبر القناة المباشرة فقط.
البوابة مشتركة مع LOCALITY: `PROD_SCOPING_ENABLED` أو `DEBUG`.
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
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag, with_entry_point=True):
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{_uid()}', name_ar=f'نقل {tag}')
    org = Sector.objects.create(code=f'ORG_{tag}_{_uid()}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{_uid()}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{_uid()}', name_ar=f'محلية {tag}', sector=org)
    ep = None
    if with_entry_point:
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
        email=f'scr_fac_{_uid()}@nqp.sd', password='x', full_name='مفتش منشأة',
    )
    perm, _ = Permission.objects.get_or_create(
        code='screening:view',
        defaults={'name': 'view screening', 'resource': 'screening', 'action': 'view'},
    )
    role = Role.objects.create(code=f'SCR_FAC_{_uid()}', name=f'SCR FAC {_uid()}')
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


@pytest.fixture
def country(db):
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def traveler(country):
    return Traveler.objects.create(
        passport_number=f'P{_uid()}', first_name='محمد', last_name='عمر',
        date_of_birth='1990-01-01', nationality=country,
    )


@pytest.fixture
def officer(db):
    return User.objects.create_user(
        email=f'officer_{_uid()}@nqp.sd', password='x', full_name='موظف فحص',
    )


def _screening(traveler, officer, port, facility=None):
    return HealthScreening.objects.create(
        traveler=traveler, port=port, officer=officer,
        body_temperature=37.0, observed_symptoms=[], facility=facility,
    )


def _ids(response):
    return {row['id'] for row in response.json()['data']['results']}


def test_facility_user_sees_own_facility_only(settings, traveler, officer):
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    world_b = _build_world('B')
    own = _screening(traveler, officer, world_a['entry_point'], world_a['facility'])
    foreign = _screening(traveler, officer, world_b['entry_point'], world_b['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/screening/?page_size=50')

    assert response.status_code == 200
    ids = _ids(response)
    assert str(own.id) in ids
    assert str(foreign.id) not in ids, 'تسريب عبر المنشآت!'

def test_union_uses_facility_channel_for_screening(settings, traveler, officer):
    """فحص على معبر خارجي لكنه مسجّل على منشأة المستخدم → مرئي عبر قناة facility."""
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    world_b = _build_world('B')
    cross = _screening(traveler, officer, world_b['entry_point'], world_a['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/screening/?page_size=50')

    assert str(cross.id) in _ids(response)


def test_facility_without_entry_point_still_works(settings, traveler, officer):
    """منشأة بلا منفذ → لا تُوسّع المعابر، لكن القناة المباشرة تعمل."""
    settings.DEBUG = True
    settings.PROD_SCOPING_ENABLED = False
    world_b = _build_world('B')
    world_c = _build_world('C', with_entry_point=False)
    own = _screening(traveler, officer, world_b['entry_point'], world_c['facility'])
    unrelated = _screening(traveler, officer, world_b['entry_point'], world_b['facility'])
    user = _facility_user(world_c['facility'])

    response = _auth_client(user).get('/api/v1/screening/?page_size=50')

    ids = _ids(response)
    assert str(own.id) in ids
    assert str(unrelated.id) not in ids


def test_gate_off_denies_all(settings, traveler, officer):
    settings.DEBUG = False
    settings.PROD_SCOPING_ENABLED = False
    world_a = _build_world('A')
    _screening(traveler, officer, world_a['entry_point'], world_a['facility'])
    user = _facility_user(world_a['facility'])

    response = _auth_client(user).get('/api/v1/screening/?page_size=50')

    assert response.status_code == 200
    assert response.json()['data']['count'] == 0
