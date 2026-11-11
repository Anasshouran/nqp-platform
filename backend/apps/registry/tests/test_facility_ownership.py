"""اختبارات FacilityOwnership — تاريخية + قيود."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import FacilityOwner, FacilityOwnership

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_facility():
    md = MasterdataSector.objects.create(code=f'MD_{_uid()}', name_ar='نقل')
    org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
    state = State.objects.create(code=f'ST_{_uid()}', name_ar='ولاية', sector=md)
    loc = Locality.objects.create(code=f'LOC_{_uid()}', name_ar='محلية', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{_uid()}', name_ar='منفذ',
        state=state, sector=org, locality=loc,
    )
    return HealthFacility.objects.create(
        code=f'FAC_{_uid()}', name_ar='منشأة',
        sector=org, locality=loc, entry_point=ep,
    )


def _make_owner(kind='STATE_MINISTRY'):
    return FacilityOwner.objects.create(
        code=f'OWN_{_uid()}', name_ar='مالك', kind=kind,
    )


@pytest.mark.django_db
class TestFacilityOwnershipModel:

    def test_create_ownership(self):
        facility = _make_facility()
        owner = _make_owner()
        ow = FacilityOwnership.objects.create(
            facility=facility, owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        assert ow.is_primary is True

    def test_invalid_date_range(self):
        facility = _make_facility()
        owner = _make_owner()
        with pytest.raises((ValidationError, Exception)):
            ow = FacilityOwnership(
                facility=facility, owner=owner,
                valid_from='2026-12-31', valid_to='2026-01-01',
            )
            ow.full_clean()

    def test_two_primary_active_rejected(self):
        facility = _make_facility()
        owner1 = _make_owner()
        owner2 = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility, owner=owner1,
            valid_from='2026-01-01', is_primary=True,
        )
        with pytest.raises((ValidationError, Exception)):
            ow2 = FacilityOwnership(
                facility=facility, owner=owner2,
                valid_from='2026-06-01', is_primary=True,
            )
            ow2.full_clean()

    def test_historical_ownership_allowed(self):
        facility = _make_facility()
        owner1 = _make_owner()
        owner2 = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility, owner=owner1,
            valid_from='2025-01-01', valid_to='2025-12-31', is_primary=True,
        )
        ow2 = FacilityOwnership.objects.create(
            facility=facility, owner=owner2,
            valid_from='2026-01-01', is_primary=True,
        )
        assert ow2.pk is not None


@pytest.mark.django_db
class TestFacilityOwnershipAPI:

    def test_create_ownership_api(self):
        facility = _make_facility()
        owner = _make_owner()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/facility-ownerships/', {
            'facility': str(facility.id),
            'owner': str(owner.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert response.status_code == 201, response.json()

    def test_invalid_date_range_api(self):
        facility = _make_facility()
        owner = _make_owner()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/facility-ownerships/', {
            'facility': str(facility.id),
            'owner': str(owner.id),
            'valid_from': '2026-12-31',
            'valid_to': '2026-01-01',
        })
        assert response.status_code == 400, response.json()

    def test_two_primary_api_rejected(self):
        facility = _make_facility()
        owner1 = _make_owner()
        owner2 = _make_owner()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        r1 = client.post('/api/v1/registry/facility-ownerships/', {
            'facility': str(facility.id),
            'owner': str(owner1.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert r1.status_code == 201, r1.json()
        r2 = client.post('/api/v1/registry/facility-ownerships/', {
            'facility': str(facility.id),
            'owner': str(owner2.id),
            'valid_from': '2026-06-01',
            'is_primary': True,
        })
        assert r2.status_code == 400, r2.json()

    def test_duplicate_active_ownership_same_owner_rejected(self):
        """D-M3-2-3: تعيينان نشطان لنفس (facility, owner) مرفوضان."""
        from django.db import IntegrityError
        facility = _make_facility()
        owner = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility, owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        with pytest.raises(IntegrityError):
            FacilityOwnership.objects.create(
                facility=facility, owner=owner,
                valid_from='2026-06-01', is_primary=False,  # غير أساسي، لكن نشط
            )

    def test_historical_same_owner_allowed(self):
        """D-M3-2-3: تاريخياً لنفس owner مسموح (valid_to مغلق)."""
        facility = _make_facility()
        owner = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility, owner=owner,
            valid_from='2025-01-01', valid_to='2025-12-31',
        )
        ow2 = FacilityOwnership.objects.create(
            facility=facility, owner=owner,
            valid_from='2026-01-01',
        )
        assert ow2.pk is not None

    def test_sector_user_sees_own_sector_ownerships(self):
        """D-M3-2-2: SECTOR user يرى ownerships منشآت قطاعه فقط."""
        from apps.accounts.models import Role, RoleAssignment
        from apps.organization.models import Sector as OrgSector
        from apps.masterdata.models import (
            Sector as MasterdataSector, State, EntryPoint,
        )

        uid = _uid()

        # Sector A (user's sector)
        md_a = MasterdataSector.objects.create(code=f'MDA_{uid}', name_ar='نقل أ')
        org_a = OrgSector.objects.create(code=f'ORGA_{uid}', name_ar='قطاع أ')
        state_a = State.objects.create(code=f'STA_{uid}', name_ar='ولاية أ', sector=md_a)
        loc_a = Locality.objects.create(code=f'LOCA_{uid}', name_ar='محلية أ', sector=org_a)
        ep_a = EntryPoint.objects.create(
            code=f'EPA_{uid}', name_ar='منفذ أ',
            state=state_a, sector=org_a, locality=loc_a,
        )
        facility_a = HealthFacility.objects.create(
            code=f'FACA_{uid}', name_ar='منشأة أ',
            sector=org_a, locality=loc_a, entry_point=ep_a,
        )
        owner_a = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility_a, owner=owner_a,
            valid_from='2026-01-01', is_primary=True,
        )

        # Sector B (other)
        md_b = MasterdataSector.objects.create(code=f'MDB_{uid}', name_ar='نقل ب')
        org_b = OrgSector.objects.create(code=f'ORGB_{uid}', name_ar='قطاع ب')
        state_b = State.objects.create(code=f'STB_{uid}', name_ar='ولاية ب', sector=md_b)
        loc_b = Locality.objects.create(code=f'LOCB_{uid}', name_ar='محلية ب', sector=org_b)
        ep_b = EntryPoint.objects.create(
            code=f'EPB_{uid}', name_ar='منفذ ب',
            state=state_b, sector=org_b, locality=loc_b,
        )
        facility_b = HealthFacility.objects.create(
            code=f'FACB_{uid}', name_ar='منشأة ب',
            sector=org_b, locality=loc_b, entry_point=ep_b,
        )
        owner_b = _make_owner()
        FacilityOwnership.objects.create(
            facility=facility_b, owner=owner_b,
            valid_from='2026-01-01', is_primary=True,
        )

        # SECTOR user for org_a
        user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
        user.sector = org_a
        user.save()
        role = Role.objects.create(name=f'SECTOR_ROLE_{uid}')
        RoleAssignment.objects.create(
            user=user, role=role, scope_type='SECTOR', scope_id=org_a.id,
        )

        # منح صلاحية القراءة للدور
        from apps.accounts.models import Permission
        perm, _ = Permission.objects.get_or_create(
            code='registry:view', defaults={'name': 'View Registry', 'resource': 'registry', 'action': 'view'}
        )
        role.permissions.add(perm)

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/facility-ownerships/')
        assert response.status_code == 200, response.json()

        body = response.json()
        inner = body.get('data', {})
        if isinstance(inner, dict) and 'results' in inner:
            items = inner['results']
        elif isinstance(inner, list):
            items = inner
        else:
            items = []
        ids = {str(item['id']) for item in items}

        ownership_a = FacilityOwnership.objects.get(facility=facility_a)
        ownership_b = FacilityOwnership.objects.get(facility=facility_b)
        assert str(ownership_a.id) in ids, "SECTOR user missing own ownership"
        assert str(ownership_b.id) not in ids, "SECTOR user sees other sector's ownership — LEAK!"
