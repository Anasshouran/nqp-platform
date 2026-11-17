import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import RoleAssignment
from apps.airport_health.models import AirportScreening, AirportTerminal, ScreeningPoint
from apps.airport_health.tests.conftest import assign_role, ensure_role
from apps.masterdata.models import EntryPoint as Port
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Sector as OrgSector
from apps.registry.models import ReportingNode, StateNodeAssignment
from apps.travelers.models import Country, Traveler

User = get_user_model()

URL = '/api/v1/airport/reports/screenings/by-state/'


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
    """state → entry_point → terminal → screening_point (+ STATE node assignment)."""
    root = _get_root_node()
    uid = _uid()
    md_sector = MasterdataSector.objects.create(code=f'MD_BSA_{uid}', name_ar='قطاع مرجعي')
    org_sector = OrgSector.objects.create(code=f'ORG_BSA_{uid}', name_ar='قطاع إداري')
    state = State.objects.create(
        code=f'ST_BSA_{uid}', name_ar=f'ولاية {uid}', sector=md_sector,
    )
    ep = Port.objects.create(
        code=f'EP_BSA_{uid}', name_ar=f'منفذ {uid}', kind=Port.Kind.AIRPORT, state=state,
    )
    terminal = AirportTerminal.objects.create(
        port=ep, terminal_code=f'T{uid}', name_ar='صالة', name_en='Hall',
    )
    point = ScreeningPoint.objects.create(
        terminal=terminal,
        point_code=f'P{uid}',
        point_type=ScreeningPoint.PointType.ARRIVAL,
    )
    traveler = Traveler.objects.create(
        first_name='سارة',
        last_name='علي',
        passport_number=f'PB{uid}',
        date_of_birth='1992-05-10',
        nationality=_country(),
        registration_status='COMPLETED',
    )
    user = _make_user()
    state_node = ReportingNode.objects.create(
        code=f'STATE_BSA_{uid}', name_ar=f'ولاية {uid}', kind='STATE', parent=root,
    )
    StateNodeAssignment.objects.create(
        state=state,
        node=state_node,
        valid_from=timezone.now().date(),
        valid_to=None,
        is_primary=True,
    )
    return {
        'root': root,
        'state': state,
        'ep': ep,
        'point': point,
        'traveler': traveler,
        'user': user,
        'state_node': state_node,
    }


def _screening(ctx, *, reporting_node=None):
    return AirportScreening.objects.create(
        traveler=ctx['traveler'],
        screening_point=ctx['point'],
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        screened_by=ctx['user'],
        reporting_node=reporting_node,
    )


def _get(client=None):
    client = client or APIClient()
    return client.get(URL)


@pytest.mark.django_db
class TestAirportScreeningsByStateEndpoint:
    """5 اختبارات لنهاية by-state لفحوصات المطارات (STATE-only)."""

    def test_empty_report(self):
        """IQ1 — تقرير فارغ: total=0، by_state=[]."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 0
        assert data['matched'] == 0
        assert data['node_no_state'] == 0
        assert data['unassigned'] == 0
        assert data['by_state'] == []
        assert data['scoped'] is False

    def test_matched_grouping_two_states(self):
        """IQ2 — تجميع فحوصات ولايتين: 3 + 3 ⇒ صفان."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx1 = _build_chain()
        ctx2 = _build_chain()
        for _ in range(3):
            _screening(ctx1, reporting_node=ctx1['state_node'])
        for _ in range(3):
            _screening(ctx2, reporting_node=ctx2['state_node'])

        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 6
        assert data['matched'] == 6
        assert len(data['by_state']) == 2
        assert sorted(b['count'] for b in data['by_state']) == [3, 3]

    def test_reconciliation(self):
        """IQ3 — total == matched + node_no_state + unassigned."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        non_state_node = ReportingNode.objects.create(
            code=f'LOC_BSA_{_uid()}', name_ar='محلية', kind='LOCALITY',
            parent=ctx['state_node'],
        )
        # مبلّغان
        _screening(ctx, reporting_node=ctx['state_node'])
        _screening(ctx, reporting_node=ctx['state_node'])
        # غير STATE (دفاعي)
        _screening(ctx, reporting_node=non_state_node)
        # بلا عقدة
        _screening(ctx)
        _screening(ctx)

        resp = _get(client)
        data = resp.data['data']
        assert data['total'] == 5
        assert data['matched'] == 2
        assert data['node_no_state'] == 1
        assert data['unassigned'] == 2
        assert data['total'] == (
            data['matched'] + data['node_no_state'] + data['unassigned']
        )

    def test_scoped_user_subset(self):
        """IQ4 — مستخدم بنطاق PORT ⇒ مجموعة فرعية، scoped=True."""
        ctx1 = _build_chain()
        ctx2 = _build_chain()
        _screening(ctx1, reporting_node=ctx1['state_node'])
        _screening(ctx1, reporting_node=ctx1['state_node'])
        _screening(ctx2, reporting_node=ctx2['state_node'])

        user = _make_user()
        role = ensure_role('AIRPORT_INSPECTOR', [('airport_health', 'view')])
        assign_role(
            user, role,
            scope_type=RoleAssignment.ScopeType.PORT,
            scope_id=ctx1['ep'].id,
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
        """IQ5 — 20 صفاً بـ ≤ 3 استعلامات (select_related('reporting_node'))."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        for _ in range(20):
            _screening(ctx, reporting_node=ctx['state_node'])

        with CaptureQueriesContext(connection) as queries:
            resp = _get(client)
        assert resp.status_code == 200
        assert resp.data['data']['matched'] == 20
        assert len(queries) <= 3
