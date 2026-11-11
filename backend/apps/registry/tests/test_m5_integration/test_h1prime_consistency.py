"""M5-B-T-3: H1′ Policy Enforcement Across All Sector-Scoped Mixins

Policy (m5-a-audit.md §9): `user.sector_id` is a grant.
Every mixin/helper that scopes by sector MUST respect `user.sector_id`.

If a new mixin forgets it, one of these tests will fail.
"""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import EmployeeProfile

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_plain_user,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _screening(world, officer):
    from apps.travelers.models import Country, Traveler
    from apps.screening.models import HealthScreening
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


def _employee(email_prefix, world, *, entry_point=None):
    uid = _uid()
    euser = User.objects.create_user(
        email=f'{email_prefix}_{uid}@x.com', password='x',
    )
    profile = EmployeeProfile.objects.create(
        user=euser, employee_number=f'EMP_{uid}',
    )
    from apps.organization.models import OrgAssignment
    OrgAssignment.objects.create(
        user=euser, sector=world['org_sector'],
        entry_point=entry_point, is_active=True,
    )
    return euser, profile


def _home_sector_user(sector, perm):
    """Pure H1′ grant: role permission, no useful scope, user.sector_id=sector."""
    user = make_plain_user(with_perm=(perm,))
    user.sector = sector
    user.save()
    return user


def _ids(resp):
    return {str(i['id']) for i in list_items(resp)}


@pytest.mark.django_db
class TestH1PrimeConsistency:
    """Same user pattern (user.sector_id=X, no scope grants) → sees X via every mixin."""

    def test_h1prime_sectorfieldmixin_lab(self):
        """Laboratory: user.sector_id=X sees X's LabSample (SectorFieldScopedMixin)."""
        from apps.laboratory.models import LabSample
        world = _build_world('X')
        collector = make_state_user(world['state'])
        sample = LabSample.objects.create(
            sample_barcode=f'BAR_{_uid()}', collector=collector,
            sector=world['org_sector'], entry_point=world['entry_point'],
        )

        user = _home_sector_user(world['org_sector'], 'laboratory')
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        assert str(sample.id) in _ids(resp), (
            "H1' broken in SectorFieldScopedMixin (laboratory) — "
            'user.sector_id should grant visibility'
        )

    def test_h1prime_screening(self):
        """Screening: user.sector_id=X sees X's screenings (_entry_point_ids_for)."""
        world = _build_world('X')
        screening = _screening(world, make_state_user(world['state']))

        user = _home_sector_user(world['org_sector'], 'screening')
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert str(screening.id) in _ids(resp), (
            "H1' broken in screening — user.sector_id should grant visibility "
            '(Delta 1)'
        )

    def test_h1prime_hr(self):
        """HR: user.sector_id=X sees employees of X's org assignments (Delta 4)."""
        world = _build_world('X')
        _, profile = _employee('emp', world)

        user = _home_sector_user(world['org_sector'], 'hr_employee')
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert str(profile.id) in _ids(resp), (
            "H1' broken in HR — user.sector_id should grant employee visibility "
            '(Delta 4)'
        )

    def test_h1prime_no_cross_sector_leak(self):
        """user.sector_id=X must not see sector Y data via any mixin."""
        from apps.laboratory.models import LabSample
        world_x = _build_world('X')
        world_y = _build_world('Y')

        lab_y = LabSample.objects.create(
            sample_barcode=f'BAR_Y_{_uid()}',
            collector=make_state_user(world_y['state']),
            sector=world_y['org_sector'], entry_point=world_y['entry_point'],
        )
        screening_y = _screening(world_y, make_state_user(world_y['state']))
        _, profile_y = _employee('emp_y', world_y)

        user = make_plain_user(
            with_perm=('laboratory', 'screening', 'hr_employee'),
        )
        user.sector = world_x['org_sector']
        user.save()

        client = api_client()
        client.force_authenticate(user=user)

        for endpoint, leaked_id, app in [
            ('/api/v1/laboratory/samples/', lab_y.id, 'laboratory'),
            ('/api/v1/screening/', screening_y.id, 'screening'),
            ('/api/v1/hr/employees/', profile_y.id, 'hr'),
        ]:
            resp = client.get(endpoint)
            assert resp.status_code == 200, f'{app} returned {resp.status_code}'
            assert str(leaked_id) not in _ids(resp), (
                f"H1' leak in {app} — user.sector_id=X sees sector Y data!"
            )
