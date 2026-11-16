"""M7-A2c-vaccination — سجلات التطعيم حسب الولاية (STATE-only، walk-up).

5 اختبارات: فارغ، تجميع ولايتين، مصالحة (3 buckets)، مستخدم بنطاق، بلا N+1.
"""

import uuid
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import EntryPoint, State
from apps.masterdata.models import Sector as MasterdataSector
from apps.registry.models import ReportingNode, StateNodeAssignment
from apps.travelers.models import Country, Traveler
from apps.vaccination.models import VaccinationRecord, VaccinationSite, Vaccine

User = get_user_model()

URL = '/api/v1/vaccination/reports/records/by-state/'


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
    """state → entry_point → site، مع STATE node + assignment."""
    root = _get_root_node()
    uid = _uid()
    md_sector = MasterdataSector.objects.create(code=f'MD_VE_{uid}', name_ar=f'قطاع {uid}')
    state = State.objects.create(
        code=f'ST_VE_{uid}', name_ar=f'ولاية {uid}', sector=md_sector,
    )
    ep = EntryPoint.objects.create(
        code=f'EP_VE_{uid}', name_ar=f'منفذ {uid}', kind=EntryPoint.Kind.SEAPORT,
        state=state,
    )
    site = VaccinationSite.objects.create(name_ar=f'عيادة {uid}', entry_point=ep)
    vaccine = Vaccine.objects.create(
        code=f'VAC_{uid}', name_ar=f'لقاح {uid}', name_en=f'Vaccine {uid}',
        series=1, validity_days=3650, required=True,
    )
    traveler = Traveler.objects.create(
        first_name='سارة',
        last_name='علي',
        passport_number=f'PVE{uid}',
        date_of_birth=date(1992, 5, 10),
        nationality=_country(),
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_VE_{uid}', name_ar=f'ولاية {uid}', kind='STATE', parent=root,
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
        'site': site,
        'vaccine': vaccine,
        'traveler': traveler,
        'state_node': state_node,
    }


def _record(ctx, *, reporting_node=None):
    return VaccinationRecord.objects.create(
        traveler=ctx['traveler'],
        vaccine=ctx['vaccine'],
        administered_at=date.today(),
        site=ctx['site'],
        reporting_node=reporting_node,
    )


def _get(client):
    return client.get(URL)


@pytest.mark.django_db
class TestVaccinationRecordsByStateEndpoint:
    """5 اختبارات لنهاية by-state لسجلات التطعيم (STATE-only)."""

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
        assert data['unassigned'] == 0
        assert data['by_state'] == []
        assert data['scoped'] is False

    def test_matched_grouping_two_states(self):
        """IQ2 — تجميع سجلات ولايتين: 3 + 3 ⇒ صفان."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx1 = _build_chain()
        ctx2 = _build_chain()
        for _ in range(3):
            _record(ctx1, reporting_node=ctx1['state_node'])
        for _ in range(3):
            _record(ctx2, reporting_node=ctx2['state_node'])

        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 6
        assert data['matched'] == 6
        assert len(data['by_state']) == 2
        assert sorted(b['count'] for b in data['by_state']) == [3, 3]

    def test_endpoint_walks_up_to_state_from_facility(self):
        """IQ3a — reporting_node = FACILITY تحت STATE ⇒ walk-up يحتسبه matched للولاية."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        facility_node = ReportingNode.objects.create(
            code=f'FACNODE_{_uid()}', name_ar='منشأة تحت الولاية', kind='FACILITY',
            parent=ctx['state_node'],
        )
        _record(ctx, reporting_node=facility_node)

        resp = _get(client)
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 1
        assert data['matched'] == 1
        assert data['node_no_state'] == 0
        assert data['unassigned'] == 0
        assert len(data['by_state']) == 1
        assert data['by_state'][0]['state_id'] == str(ctx['state_node'].id)
        assert data['by_state'][0]['count'] == 1

    def test_reconciliation(self):
        """IQ3 — total == matched + node_no_state + unassigned (walk-up، 3 buckets)."""
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        ctx = _build_chain()
        # عقدة بلا سلف STATE: LOCALITY تحت الجذر
        no_state_node = ReportingNode.objects.create(
            code=f'LOCNODE_{_uid()}', name_ar='محلية بلا ولاية', kind='LOCALITY',
            parent=ctx['root'],
        )
        # مبلّغان
        _record(ctx, reporting_node=ctx['state_node'])
        _record(ctx, reporting_node=ctx['state_node'])
        # عقدة بلا سلف STATE (دفاعي — serializer writable)
        _record(ctx, reporting_node=no_state_node)
        # بلا عقدة
        _record(ctx)
        _record(ctx)

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
        _record(ctx1, reporting_node=ctx1['state_node'])
        _record(ctx1, reporting_node=ctx1['state_node'])
        _record(ctx2, reporting_node=ctx2['state_node'])

        user = _make_user()
        role = Role.objects.create(code=f'VAC_EP_{_uid()}', name=f'VAC EP {_uid()}')
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
            _record(ctx, reporting_node=ctx['state_node'])

        with CaptureQueriesContext(connection) as queries:
            resp = _get(client)
        assert resp.status_code == 200
        assert resp.data['data']['matched'] == 20
        assert len(queries) <= 3
