"""M5-B-T-2 — Deltas 1 & 2 for H3 (screening STATE).

Delta 1: `user.sector_id` grants screening visibility (H1′ consistency).
Delta 2: PORT ∪ SECTOR scopes (was PORT-dominant; SECTOR ignored before).
"""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import RoleAssignment
from apps.travelers.models import Country, Traveler
from apps.screening.models import HealthScreening

from .conftest import (
    _build_world, api_client, list_items, make_state_user, make_plain_user,
    _role_with_perm,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _screening(world, officer):
    uid = _uid()
    country = Country.objects.create(
        code=f'S{uid[:2]}'[:3], name=f'بلد {uid[:6]}', name_ar=f'بلد {uid[:6]}',
    )
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(
        traveler=traveler, port=world['entry_point'], officer=officer,
    )


def _ids(resp):
    return {str(i['id']) for i in list_items(resp)}


@pytest.mark.django_db
class TestH3Deltas:
    """Delta 1 + Delta 2 regression for H3 screening."""

    def test_delta_1_user_sector_id_grants_screening(self):
        """Delta 1 (H1′): user.sector_id=X grants visibility, no useful scope."""
        world = _build_world('X')
        officer = make_state_user(world['state'], with_perm=('screening',))
        screening = _screening(world, officer)

        # Pure H1′: user.sector_id set; RoleAssignment scope_id=None grants nothing.
        user = make_plain_user(with_perm=('screening',))
        user.sector = world['org_sector']
        user.save()

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert str(screening.id) in _ids(resp), (
            "Delta 1 broken — user.sector_id should grant screening visibility "
            "(H1' consistency)"
        )

    def test_delta_2_port_plus_sector_union(self):
        """Delta 2: PORT scope on A + SECTOR scope on B → sees A ∪ B."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        screening_a = _screening(world_a, make_state_user(world_a['state']))
        screening_b = _screening(world_b, make_state_user(world_b['state']))

        user = User.objects.create_user(email=f'combo_{_uid()}@x.com', password='x')
        role = _role_with_perm('COMBO', ['screening'])
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='PORT', scope_id=world_a['entry_point'].id,
        )
        RoleAssignment.objects.create(
            user=user, role=role,
            scope_type='SECTOR', scope_id=world_b['org_sector'].id,
        )

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = _ids(resp)
        assert str(screening_a.id) in ids, 'Delta 2 broken — PORT grant lost'
        assert str(screening_b.id) in ids, 'Delta 2 broken — SECTOR grant lost'

    def test_delta_1_no_cross_state_leak(self):
        """user.sector_id=X must not leak state Y data."""
        world_x = _build_world('X')
        world_y = _build_world('Y')
        screening_x = _screening(world_x, make_state_user(world_x['state']))
        screening_y = _screening(world_y, make_state_user(world_y['state']))

        user = make_plain_user(with_perm=('screening',))
        user.sector = world_x['org_sector']
        user.save()

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = _ids(resp)
        # user.sector_id = X → sees own sector's screening…
        assert str(screening_x.id) in ids, (
            "Delta 1 broken — user.sector_id=X should see X's screening"
        )
        # …but never state Y data.
        assert str(screening_y.id) not in ids, (
            'CROSS-SCOPE LEAK in screening — user.sector_id=X sees state Y screenings!'
        )

    def test_state_plus_sector_union(self):
        """STATE A + user.sector=B → sees both A and B screenings (H1′ union)."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        screening_a = _screening(world_a, make_state_user(world_a['state']))
        screening_b = _screening(world_b, make_state_user(world_b['state']))

        user = make_state_user(world_a['state'], with_perm=('screening',))
        user.sector = world_b['org_sector']
        user.save()

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = _ids(resp)
        assert str(screening_a.id) in ids, 'STATE A missing own screening.'
        assert str(screening_b.id) in ids, (
            "H1' broken — home-sector (B) grant lost in screening after STATE branch."
        )

    def test_state_only_no_sector_still_works(self):
        """STATE user with no home sector still works (H3 STATE branch)."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        _screening(world_a, make_state_user(world_a['state']))
        screening_b = _screening(world_b, make_state_user(world_b['state']))

        user = make_state_user(world_b['state'], with_perm=('screening',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert str(screening_b.id) in _ids(resp), (
            'H3 regression — STATE branch broken in screening'
        )
