"""Signals للنموذجين الجديدين."""
import uuid
import pytest
from apps.registry.models import TechnicalSupervisor, RegistryChangeLog


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestTechnicalSignals:

    def test_supervisor_create_logs(self):
        before = RegistryChangeLog.objects.count()
        TechnicalSupervisor.objects.create(
            code=f'SIG_{_uid()}', name_ar='سيج',
            kind='FEDERAL_PROGRAM', domain='TB',
        )
        assert RegistryChangeLog.objects.count() == before + 1

    def test_supervision_create_logs_assign(self):
        from apps.masterdata.models import (
            Sector as MasterdataSector, State, EntryPoint, HealthFacility,
        )
        from apps.organization.models import Sector as OrgSector, Locality
        from apps.registry.models import TechnicalSupervision

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
        supervisor = TechnicalSupervisor.objects.create(
            code=f'SUP_{uid}', name_ar='مشرف',
            kind='FEDERAL_PROGRAM', domain='TB',
        )
        before = RegistryChangeLog.objects.count()
        TechnicalSupervision.objects.create(
            facility=facility, supervisor=supervisor,
            valid_from='2026-01-01', target_type='FACILITY',
        )
        assert RegistryChangeLog.objects.count() == before + 1
        last = RegistryChangeLog.objects.order_by('-created_at').first()
        assert last.action == 'ASSIGN'

    def test_supervisor_delete_logs(self):
        supervisor = TechnicalSupervisor.objects.create(
            code=f'DEL_{_uid()}', name_ar='حذف',
            kind='OTHER', domain='GENERAL',
        )
        supervisor_id = supervisor.id
        supervisor.delete()
        last = RegistryChangeLog.objects.filter(
            entity_type='TechnicalSupervisor', entity_id=supervisor_id,
        ).order_by('-created_at').first()
        assert last is not None
        assert last.action == 'DELETE'
