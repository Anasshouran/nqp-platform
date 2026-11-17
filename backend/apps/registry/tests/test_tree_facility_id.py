"""M4-4-C-2: ``facility_id`` on the /dashboard/tree/ response (D-M4-4-B-2).

The tree is built inline in ``RegistryDashboardViewSet.tree`` (no dedicated
serializer), so this exercises the endpoint directly.
"""
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import (
    ReportingNode, HealthFacilityNodeAssignment,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _root():
    root = ReportingNode.objects.filter(parent__isnull=True).first()
    if not root:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _make_facility():
    uid = _uid()
    md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
    org = OrgSector.objects.create(code=f'ORG_{uid}', name_ar='قطاع')
    state = State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)
    loc = Locality.objects.create(code=f'LOC_{uid}', name_ar='محلية', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{uid}', name_ar='منفذ', state=state, sector=org, locality=loc,
    )
    return HealthFacility.objects.create(
        code=f'FAC_{uid}', name_ar='منشأة', sector=org, locality=loc, entry_point=ep,
    )


def _flatten(nodes):
    for node in nodes:
        yield node
        yield from _flatten(node.get('children', []))


def _tree():
    client = APIClient()
    client.force_authenticate(user=_make_superuser())
    response = client.get('/api/v1/registry/dashboard/tree/')
    assert response.status_code == 200
    return list(_flatten(response.json()['data']))


@pytest.mark.django_db
def test_facility_node_exposes_facility_id():
    root = _root()
    facility = _make_facility()
    fac_node = ReportingNode.objects.create(
        code=f'FN_{_uid()}', name_ar='عقدة منشأة', kind='FACILITY', parent=root,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=facility, node=fac_node, valid_from='2026-01-01', is_primary=True,
    )

    node = next(n for n in _tree() if n['id'] == str(fac_node.id))
    assert node['facility_id'] == str(facility.id)


@pytest.mark.django_db
def test_non_facility_node_has_null_facility_id():
    root = _root()
    state_node = ReportingNode.objects.create(
        code=f'SN_{_uid()}', name_ar='عقدة ولاية', kind='STATE', parent=root,
    )

    node = next(n for n in _tree() if n['id'] == str(state_node.id))
    assert node['facility_id'] is None
