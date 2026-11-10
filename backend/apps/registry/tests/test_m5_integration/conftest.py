"""M5-A integration test fixtures.

Fixtures to build a complete world: masterdata State + organization Sector +
Locality + EntryPoint + HealthFacility, scoped users (STATE/SECTOR/GLOBAL/plain),
and cross-app data factories for the apps under test.
"""
import uuid
import datetime
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, OrgAssignment
from apps.accounts.models import Role, RoleAssignment, Permission

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag):
    """Build a complete world: state + sector + locality + entry_point + facility."""
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
    org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}', kind='SEAPORT',
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


@pytest.fixture
def world_a(db):
    return _build_world('A')


@pytest.fixture
def world_b(db):
    return _build_world('B')


@pytest.fixture
def world_c(db):
    return _build_world('C')


@pytest.fixture
def superuser(db):
    user = User.objects.create_user(email=f'su_{_uid()}@x.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


@pytest.fixture
def plain_user(db):
    return User.objects.create_user(email=f'plain_{_uid()}@x.com', password='x')


def _role_with_perm(code_prefix, resources):
    """Create a role + assign one `resource:view` permission per resource."""
    uid = _uid()
    role = Role.objects.create(code=f'ROLE_{code_prefix}_{uid}', name=f'{code_prefix}_{uid}')
    for resource in resources:
        perm, _ = Permission.objects.get_or_create(
            code=f'{resource}:view',
            defaults={'name': f'{resource}:view', 'resource': resource, 'action': 'view'},
        )
        role.permissions.add(perm)
    return role


def make_state_user(state, *, with_perm=('port_health', 'shipping', 'laboratory',
                                         'vector', 'screening', 'hr_employee',
                                         'surveillance', 'vaccination',
                                         'borders_health')):
    """STATE user — scope_type=STATE, scope_id=<masterdata State id>."""
    uid = _uid()
    user = User.objects.create_user(email=f'state_{uid}@x.com', password='x')
    role = _role_with_perm('STATE', list(with_perm))
    RoleAssignment.objects.create(user=user, role=role, scope_type='STATE', scope_id=state.id)
    return user


def make_state_user_with_sector(state, sector, **kwargs):
    """STATE user with user.sector FK set — used for the H1 widening path."""
    uid = _uid()
    user = User.objects.create_user(email=f'state_sec_{uid}@x.com', password='x')
    user.sector = sector
    user.save()
    role = _role_with_perm('STATE_S', list(kwargs.get('with_perm',
                                                     ('port_health', 'laboratory',
                                                      'vector'))))
    RoleAssignment.objects.create(user=user, role=role, scope_type='STATE', scope_id=state.id)
    return user


def make_sector_user(org_sector, *, with_perm=('port_health', 'laboratory',
                                               'vector', 'screening', 'surveillance')):
    uid = _uid()
    user = User.objects.create_user(email=f'sector_{uid}@x.com', password='x')
    user.sector = org_sector
    user.save()
    role = _role_with_perm('SECTOR', list(with_perm))
    RoleAssignment.objects.create(user=user, role=role, scope_type='SECTOR', scope_id=org_sector.id)
    return user


def make_plain_user(*, with_perm=()):
    uid = _uid()
    user = User.objects.create_user(email=f'plain_{uid}@x.com', password='x')
    if with_perm:
        role = _role_with_perm('PLAIN', list(with_perm))
        RoleAssignment.objects.create(user=user, role=role, scope_type='POINT', scope_id=None)
    return user


def assign_to_org(user, org_sector, *, entry_point=None, department=None, station=None):
    """Give the user an active OrgAssignment (uppered scope resolution for HR)."""
    return OrgAssignment.objects.create(
        user=user, sector=org_sector, entry_point=entry_point,
        department=department, station=station, is_active=True,
    )


def list_items(response):
    """Unwrap `{status, data: ...}` envelope → list of rows (best effort)."""
    body = response.json()
    data = body.get('data', body) if isinstance(body, dict) else body
    if isinstance(data, dict):
        rows = data.get('results', data.get('items'))
        if rows is None:
            # dict w/o results envelope — treat as empty
            candidates = data.get('data', data)
            rows = candidates if isinstance(candidates, list) else []
        return rows
    return data if isinstance(data, list) else []


def api_client():
    from rest_framework.test import APIClient
    return APIClient()


def fd_date():
    return datetime.date(2026, 11, 10)
