"""M7-A2c-3 — نهاية الفحوص حسب الولاية (A2b-full، FACILITY → STATE).

5 اختبارات: فارغ، تجميع ولايتين، مصالحة، مستخدم بنطاق، بلا N+1.
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import EntryPoint as Port
from apps.masterdata.models import HealthFacility
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Locality
from apps.organization.models import Sector as OrgSector
from apps.registry.models import HealthFacilityNodeAssignment, ReportingNode
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

User = get_user_model()

URL = '/api/v1/screening/reports/screenings/by-state/'


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    return User.objects.create_superuser(
        email=f'admin_{_uid()}@example.com', password='testpass',
    )


def _make_user():
    return User.objects.create_user(
        email=f'user_{_uid()}@example.com', password='testpass',
    )


def _country():
    country, _ = Country.objects.get_or_create(
        code='SD', defaults={'name': 'Sudan', 'name_ar': 'السودان'},
    )
    return country


def _get_root_node():
    root = ReportingNode.objects.filter(kind='FEDERAL', parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(
            code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL',
        )
    return root


def _build_chain():
    """state → entry_point → facility، مع STATE و FACILITY node."""
    root = _get_root_node()
    uid = _uid()
    md_sector = MasterdataSector.objects.create(code=f'MD_EP_{uid}', name_ar='قطاع مرجعي')
    org_sector = OrgSector.objects.create(code=f'ORG_EP_{uid}', name_ar='قطاع إداري')
    state = State.objects.create(
        code=f'ST_EP_{uid}', name_ar=f'ولاية {uid}', sector=md_sector,
    )
    locality = Locality.objects.create(
        code=f'LOC_EP_{uid}', name_ar=f'محلية {uid}', sector=org_sector,
    )
    ep = Port.objects.create(
        code=f'EP_{uid}', name_ar=f'منفذ {uid}', kind='SEAPORT', state=state,
    )
    facility = HealthFacility.objects.create(
        code=f'FAC_EP_{uid}', name_ar=f'منشأة {uid}',
        sector=org_sector, locality=locality, entry_point=ep,
    )
    traveler = Traveler.objects.create(
        first_name='سارة',
        last_name='علي',
        passport_number=f'PE{uid}',
        date_of_birth='1992-05-10',
        nationality=_country(),
    )
    user = _make_user()
    state_node = ReportingNode.objects.create(
        code=f'STATE_EP_{uid}', name_ar=f'ولاية {uid}', kind='STATE', parent=root,
    )
    facility_node = ReportingNode.objects.create(
        code=f'FACNODE_EP_{uid}', name_ar=f'منشأة تبليغ {uid}',
        kind='FACILITY', parent=state_node,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=facility,
        node=facility_node,
        valid_from=timezone.now().date(),
        valid_to=None,
        is_primary=True,
    )
    return {
        'root': root,
        'state': state,
        'ep': ep,
        'facility': facility,
        'traveler': traveler,
        'user': user,
        'state_node': state_node,
        'facility_node': facility_node,
    }


def _screening(ctx, *, reporting_node=None):
    return HealthScreening.objects.create(
        traveler=ctx['traveler'],
        port=ctx['ep'],
        officer=ctx['user'],
        body_temperature=37.0,
        observed_symptoms=[],
        facility=ctx['facility'],
        reporting_node=reporting_node,
    )


def _get(client):
    return client.get(URL)


@pytest.mark.django_db
class TestScreeningsByStateEndpoint:
    """5 اختبارات لنهاية by-state لفحوص screening (A2b-full)."""

    def test_empty_report(self):
        """IQ1 — تقرير فارغ: total=0، by_state=[]، scoped=False."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 0
        assert data['matched'] == 0
        assert data['node_no_state'] == 0
        assert data['unassigned_node'] == 0
        assert data['by_state'] == []
        assert data['scoped'] is False

    def test_matched_grouping_two_states(self):
        """IQ2 — تجميع فحوص ولايتين: 3 + 3 ⇒ صفان (عبر FACILITY node)."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx1 = _build_chain()
        ctx2 = _build_chain()
        for _ in range(3):
            _screening(ctx1, reporting_node=ctx1['facility_node'])
        for _ in range(3):
            _screening(ctx2, reporting_node=ctx2['facility_node'])

        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 6
        assert data['matched'] == 6
        assert len(data['by_state']) == 2
        assert sorted(b['count'] for b in data['by_state']) == [3, 3]

    def test_reconciliation(self):
        """IQ3 — total == matched + node_no_state + unassigned_node."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        # فرع بلا سلف STATE: LOCALITY تحت الجذر ثم FACILITY تحتها
        locality_node = ReportingNode.objects.create(
            code=f'LOCNODE_{_uid()}', name_ar='محلية', kind='LOCALITY',
            parent=ctx['root'],
        )
        no_state_node = ReportingNode.objects.create(
            code=f'FACNODE_NOSTATE_{_uid()}', name_ar='منشأة بلا ولاية',
            kind='FACILITY', parent=locality_node,
        )
        # مبلّغان (FACILITY → STATE)
        _screening(ctx, reporting_node=ctx['facility_node'])
        _screening(ctx, reporting_node=ctx['facility_node'])
        # بلا سلف STATE
        _screening(ctx, reporting_node=no_state_node)
        # بلا عقدة
        _screening(ctx)
        _screening(ctx)

        resp = _get(client)
        data = resp.data['data']
        assert data['total'] == 5
        assert data['matched'] == 2
        assert data['node_no_state'] == 1
        assert data['unassigned_node'] == 2
        assert data['total'] == (
            data['matched'] + data['node_no_state'] + data['unassigned_node']
        )

    def test_scoped_user_subset(self):
        """IQ4 — مستخدم بنطاق PORT ⇒ مجموعة فرعية، scoped=True."""
        ctx1 = _build_chain()
        ctx2 = _build_chain()
        _screening(ctx1, reporting_node=ctx1['facility_node'])
        _screening(ctx1, reporting_node=ctx1['facility_node'])
        _screening(ctx2, reporting_node=ctx2['facility_node'])

        user = _make_user()
        role = Role.objects.create(code=f'SCR_EP_{_uid()}', name=f'SCR EP {_uid()}')
        RoleAssignment.objects.create(
            user=user,
            role=role,
            scope_type=RoleAssignment.ScopeType.PORT,
            scope_id=ctx1['ep'].id,
            is_active=True,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 2
        assert data['matched'] == 2
        assert data['scoped'] is True
        assert len(data['by_state']) == 1
        assert data['by_state'][0]['count'] == 2

    def test_no_n_plus_1(self):
        """IQ5 — 20 صفاً بـ ≤ 3 استعلامات (count + node_map + rows)."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        for _ in range(20):
            _screening(ctx, reporting_node=ctx['facility_node'])

        with CaptureQueriesContext(connection) as queries:
            resp = _get(client)
        assert resp.status_code == 200
        assert resp.data['data']['matched'] == 20
        assert len(queries) <= 3
