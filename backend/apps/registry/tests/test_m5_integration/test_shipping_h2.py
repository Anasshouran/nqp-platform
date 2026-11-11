"""M5-A-2 — P0 / H2: `asserts_geographic_scope` omits STATE → qs.none().

Target: `CompanyPortScopedMixin` (shipping, PreArrivalNotificationViewSet).
Same root cause as port_health. Red test for own-state business expectation;
leaks must never happen.
"""
import uuid

import pytest
from django.utils import timezone

from apps.port_health.models import SeaPort, Vessel, VesselVisit
from apps.shipping.models import PreArrivalNotification

from .conftest import (
    _build_world, api_client, list_items,
    make_state_user, make_sector_user,
)


def _pre_arrival(world):
    uid = uuid.uuid4().hex[:8]
    vessel = Vessel.objects.create(
        vessel_name=f'PA {uid}', imo_number=f'IMO{uid[:6].upper()}', flag_state='SDN',
    )
    port = SeaPort.objects.create(
        code=f'SP_{uid[:6]}', name_ar=f'مرسى {uid[:6]}', name_en=f'Port {uid[:6]}',
        entry_point=world['entry_point'],
    )
    visit = VesselVisit.objects.create(vessel=vessel, port=port,
                                       arrival_date=timezone.localdate())
    return PreArrivalNotification.objects.create(vessel_visit=visit,
                                                 status='SUBMITTED')


@pytest.mark.django_db
class TestShippingH2:

    def test_state_user_sees_own_state_pre_arrivals(self):
        world_a = _build_world('A')
        pan_a = _pre_arrival(world_a)

        user = make_state_user(world_a['state'], with_perm=('pre_arrivals',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/shipping/pre-arrivals/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(pan_a.id) in ids, (
            'H2 CONFIRMED — STATE user sees 0 pre-arrival notifications (silent deny-all).'
        )

    def test_state_user_no_cross_state_leak(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        pan_b = _pre_arrival(world_b)

        user = make_state_user(world_a['state'], with_perm=('pre_arrivals',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/shipping/pre-arrivals/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(pan_b.id) not in ids, (
            'CROSS-STATE LEAK in shipping — STATE A user sees STATE B pre-arrival!'
        )

    def test_sector_user_still_sees_own_sector_pre_arrivals(self):
        world_a = _build_world('A')
        pan_a = _pre_arrival(world_a)

        user = make_sector_user(world_a['org_sector'], with_perm=('pre_arrivals',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/shipping/pre-arrivals/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(pan_a.id) in ids, (
            'SECTOR regression in shipping CompanyPortScopedMixin — '
            'SECTOR user no longer sees own-sector pre-arrival notification.'
        )
