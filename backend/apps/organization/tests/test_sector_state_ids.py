"""M6 — Sector.state_ids M2M (organization-level)."""
import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.masterdata.models import Sector as MasterdataSector, State
from apps.organization.models import Sector as OrgSector

User = get_user_model()

pytestmark = pytest.mark.django_db


def _uid():
    return uuid.uuid4().hex[:8]


def _make_state():
    md = MasterdataSector.objects.create(code=f'MD_{_uid()}', name_ar='نقل')
    return State.objects.create(code=f'ST_{_uid()}', name_ar='ولاية', sector=md)


class TestSectorStateIds:

    def test_add_states_to_sector(self):
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        s1 = _make_state()
        s2 = _make_state()
        org.state_ids.add(s1, s2)
        assert org.state_ids.count() == 2
        assert set(org.state_ids.values_list('id', flat=True)) == {s1.id, s2.id}

    def test_empty_state_ids_fail_safe(self):
        """Sector بدون state_ids → deny-all (fail-safe، D-M5-B-1)."""
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        assert org.state_ids.count() == 0

    def test_reverse_relation(self):
        """State.sectors reverse relation."""
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        state = _make_state()
        org.state_ids.add(state)
        assert state.sectors.filter(id=org.id).exists()

    def test_remove_state(self):
        org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
        s1 = _make_state()
        s2 = _make_state()
        org.state_ids.add(s1, s2)
        org.state_ids.remove(s1)
        assert org.state_ids.count() == 1
        assert s2.id in org.state_ids.values_list('id', flat=True)
