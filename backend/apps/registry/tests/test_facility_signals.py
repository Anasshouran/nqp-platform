"""Signals للنموذجين الجديدين."""
import uuid
import pytest
from apps.registry.models import FacilityOwner, FacilityOwnership, RegistryChangeLog


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestFacilityOwnershipSignals:

    def test_owner_create_logs(self):
        before = RegistryChangeLog.objects.count()
        FacilityOwner.objects.create(
            code=f'LOG_{_uid()}', name_ar='سجل', kind='PRIVATE',
        )
        assert RegistryChangeLog.objects.count() == before + 1

    def test_ownership_create_logs_assign(self):
        from apps.masterdata.models import (
            Sector as MasterdataSector, State, EntryPoint, HealthFacility,
        )
        from apps.organization.models import Sector as OrgSector, Locality

        uid = _uid()
        md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
        org = OrgSector.objects.create(code=f'ORG_{uid}', name_ar='قطاع')
        state = State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)
        loc = Locality.objects.create(code=f'LOC_{uid}', name_ar='محلية', sector=org)
        ep = EntryPoint.objects.create(
            code=f'EP_{uid}', name_ar='منفذ',
            state=state, sector=org, locality=loc,
        )
        facility = HealthFacility.objects.create(
            code=f'FAC_{uid}', name_ar='منشأة',
            sector=org, locality=loc, entry_point=ep,
        )
        owner = FacilityOwner.objects.create(
            code=f'OWN_{uid}', name_ar='مالك', kind='STATE_MINISTRY',
        )
        before = RegistryChangeLog.objects.count()
        FacilityOwnership.objects.create(
            facility=facility, owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        assert RegistryChangeLog.objects.count() == before + 1
        last = RegistryChangeLog.objects.order_by('-created_at').first()
        assert last.action == 'ASSIGN'

    def test_owner_delete_logs(self):
        owner = FacilityOwner.objects.create(
            code=f'DEL_{_uid()}', name_ar='حذف', kind='PRIVATE',
        )
        owner_id = owner.id
        owner.delete()
        last = RegistryChangeLog.objects.filter(
            entity_type='FacilityOwner', entity_id=owner_id,
        ).order_by('-created_at').first()
        assert last is not None
        assert last.action == 'DELETE'
