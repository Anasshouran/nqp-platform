"""M6 — 9 sector-only models work with Sector.state_ids M2M."""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .conftest import _build_world, api_client, list_items

User = get_user_model()
pytestmark = pytest.mark.django_db


def _uid():
    return uuid.uuid4().hex[:8]


def _state_user(world):
    from .conftest import _role_with_perm
    from apps.accounts.models import RoleAssignment
    uid = _uid()
    user = User.objects.create_user(email=f'm6_{uid}@x.com', password='x')
    role = _role_with_perm('M6_STATE', ['laboratory', 'vector'])
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='STATE', scope_id=world['state'].id,
    )
    return user


class TestM6SectorStates:
    """STATE user sees sector-only models via sector.state_ids (M6)."""

    def test_lab_equipment_visible_when_sector_has_state(self):
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import LabEquipment
        eq = LabEquipment.objects.create(
            name_ar='جهاز', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/equipment/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(eq.id) in ids, 'M6 broken — LabEquipment not visible via sector.state_ids'

    def test_lab_equipment_deny_when_sector_empty(self):
        """Empty sector.state_ids → deny-all (fail-safe, D-M5-B-1)."""
        world = _build_world('X')
        from apps.laboratory.models import LabEquipment
        eq = LabEquipment.objects.create(
            name_ar='جهاز', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/equipment/')
        assert resp.status_code == 200
        assert list_items(resp) == [], 'Fail-safe violated — empty state_ids should deny-all'

    def test_qc_record_visible_when_sector_has_state(self):
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import QCRecord
        rec = QCRecord.objects.create(
            qc_number=f'QC_{_uid()}', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/qc/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(rec.id) in ids, 'M6 broken — QCRecord not visible via sector.state_ids'

    def test_vector_unit_visible_when_sector_has_state(self):
        """M6: closes D-M5-B-1 — VectorUnit works with sector.state_ids."""
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.vector_control.models import VectorUnit
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/units/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(unit.id) in ids, 'D-M5-B-1 not closed — VectorUnit still hidden'

    def test_vector_unit_deny_when_sector_empty(self):
        """Empty sector.state_ids → deny-all (fail-safe)."""
        world = _build_world('X')
        from apps.vector_control.models import VectorUnit
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/units/')
        assert resp.status_code == 200
        assert list_items(resp) == [], 'Fail-safe violated — empty state_ids should deny-all'

    def test_no_cross_state_leak(self):
        """Sector.state_ids scoping: STATE A user must not see STATE B's sectors."""
        world_a = _build_world('A')
        world_b = _build_world('B')
        world_a['org_sector'].state_ids.add(world_a['state'])
        world_b['org_sector'].state_ids.add(world_b['state'])
        from apps.vector_control.models import VectorUnit
        unit_b = VectorUnit.objects.create(
            code=f'VUB_{_uid()}', name_ar='وحدة ب', sector=world_b['org_sector'],
        )
        user = _state_user(world_a)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/vector-control/units/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(unit_b.id) not in ids, 'Cross-state leak!'

    def test_reagent_visible_when_sector_has_state(self):
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import Reagent
        rg = Reagent.objects.create(
            name_ar='كاشف', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/reagents/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(rg.id) in ids, 'M6 broken — Reagent not visible via sector.state_ids'

    def test_reagent_lot_chain_visible(self):
        """Chain derivation: ReagentLot → reagent.sector → state_ids."""
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import Reagent, ReagentLot
        reagent = Reagent.objects.create(
            name_ar='كاشف', sector=world['org_sector'],
        )
        lot = ReagentLot.objects.create(lot_number=f'LOT_{_uid()}', reagent=reagent)
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/reagent-lots/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(lot.id) in ids, 'M6 chain broken — ReagentLot not visible via reagent.sector.state_ids'

    def test_material_issue_chain_visible(self):
        """Chain derivation: MaterialIssue → lot.reagent.sector → state_ids."""
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import Reagent, ReagentLot, MaterialIssue
        from django.contrib.auth import get_user_model
        User = get_user_model()
        issuer = User.objects.create_user(email=f'iss_{_uid()}@x.com', password='x')
        reagent = Reagent.objects.create(
            name_ar='كاشف', sector=world['org_sector'],
        )
        lot = ReagentLot.objects.create(lot_number=f'LOT_{_uid()}', reagent=reagent)
        issue = MaterialIssue.objects.create(lot=lot, issued_by=issuer, quantity_used=1, unit='unit', purpose='test')
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/material-issues/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(issue.id) in ids, 'M6 chain broken — MaterialIssue not visible'

    def test_non_conformity_visible_when_sector_has_state(self):
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import NonConformity
        nc = NonConformity.objects.create(
            nc_number=f'NC_{_uid()}', nc_type='MINOR', severity='LOW',
            status='OPEN', title='عنوان', sector=world['org_sector'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/non-conformities/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(nc.id) in ids, 'M6 broken — NonConformity not visible via sector.state_ids'

    def test_capa_record_chain_visible(self):
        """Chain derivation: CapaRecord → non_conformity.sector → state_ids."""
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import NonConformity, CapaRecord
        nc = NonConformity.objects.create(
            nc_number=f'NC_{_uid()}', nc_type='MINOR', severity='LOW',
            status='OPEN', title='عنوان', sector=world['org_sector'],
        )
        capa = CapaRecord.objects.create(non_conformity=nc, title='CAPA')
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/capa/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(capa.id) in ids, 'M6 chain broken — CapaRecord not visible'

    def test_critical_result_chain_visible(self):
        """Chain derivation: CriticalResult → test.sample.sector → state_ids."""
        world = _build_world('X')
        world['org_sector'].state_ids.add(world['state'])
        from apps.laboratory.models import CriticalResultNotification, SampleTest, LabSample
        from django.contrib.auth import get_user_model
        User = get_user_model()
        collector = User.objects.create_user(email=f'coll_{_uid()}@x.com', password='x')
        sample = LabSample.objects.create(
            sample_barcode=f'BAR_{_uid()}', collector=collector,
            sector=world['org_sector'],
        )
        test = SampleTest.objects.create(sample=sample, test_name='T')
        crit = CriticalResultNotification.objects.create(test=test)
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/critical/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(crit.id) in ids, 'M6 chain broken — CriticalResult not visible'

    def test_lab_sample_already_direct_visible(self):
        """Sanity: LabSample uses entry_point__state_id (already M5-B-1)."""
        world = _build_world('X')
        from apps.laboratory.models import LabSample
        from django.contrib.auth import get_user_model
        User = get_user_model()
        collector = User.objects.create_user(email=f'coll_{_uid()}@x.com', password='x')
        sample = LabSample.objects.create(
            sample_barcode=f'BAR_{_uid()}', collector=collector,
            sector=world['org_sector'], entry_point=world['entry_point'],
        )
        user = _state_user(world)
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample.id) in ids, 'LabSample regression — entry_point__state_id broken'
