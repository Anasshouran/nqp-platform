import uuid

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.borders_health.models import QuarantineCase
from apps.registry.models import ReportingNode, StateNodeAssignment
from apps.masterdata.models import HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State, EntryPoint
from apps.borders_health.models import BorderCrossing


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_superuser(
        username=f'user_{_uid()}', email=f'user_{_uid()}@example.com', password='testpass'
    )


def _build_hierarchy():
    """ybni state→locality→entry_point→border_crossing→quarantine_case."""
    md = MasterdataSector.objects.create(code=f'MD_BS_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_BS_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_BS_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_BS_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_BS_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    crossing = BorderCrossing.objects.create(
        code=f'BC_BS_{_uid()}', name_ar=f'معبر {_uid()}', entry_point=ep,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_BS_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_BS_{_uid()}', name_ar='جذر', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_BS_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    StateNodeAssignment.objects.create(
        state=ep.state, node=state_node, valid_from=timezone.now().date(), valid_to=None,
    )
    return {'state': state, 'state_node': state_node, 'node': state_node, 'facility': fac, 'ep': ep}


@pytest.mark.django_db
class TestQuarantineCaseByStateEndpoint:
    """4 اختبارات لنهاية by-state لحالات الحجر الصحي."""

    def test_empty_report(self):
        """IQ1 — تقرير فارغ: total=0، by_state=[]."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        resp = client.get('/api/v1/borders-health/reports/quarantine-cases/by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 0
        assert data['matched'] == 0
        assert data['by_state'] == []

    def test_matched_grouping_two_states(self):
        """IQ2 — تجميع حالات حجر بوليتين."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        ctx1 = _build_hierarchy()
        ctx2 = _build_hierarchy()
        # ثلاث حالات في الولاية الأولى
        for i in range(3):
            QuarantineCase.objects.create(
                case_number=f'QC1_{i}_{_uid()}', crossing=ctx1['crossing'],
                reporting_node=ctx1['node'],
            )
        # ثلاث حالات في الولاية الثانية
        for i in range(3):
            QuarantineCase.objects.create(
                case_number=f'QC2_{i}_{_uid()}', crossing=ctx2['crossing'],
                reporting_node=ctx2['node'],
            )

        resp = client.get('/api/v1/borders-health/reports/quarantine-cases/by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 6
        assert data['matched'] == 6
        assert len(data['by_state']) == 2
        counts = sorted([b['count'] for b in data['by_state']])
        assert counts == [3, 3]

    def test_reconciliation(self):
        """IQ3 — التوفيق: total == matched + unassigned."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        ctx = _build_hierarchy()
        # حالتان مبلّغان
        QuarantineCase.objects.create(
            case_number=f'QC_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        QuarantineCase.objects.create(
            case_number=f'QC2_{_uid()}', crossing=ctx['crossing'],
            reporting_node=ctx['node'],
        )
        # حالتان بلا reporting_node (unassigned)
        QuarantineCase.objects.create(
            case_number=f'QC3_{_uid()}', crossing=ctx['crossing'],
        )
        QuarantineCase.objects.create(
            case_number=f'QC4_{_uid()}', crossing=ctx['crossing'],
        )

        resp = client.get('/api/v1/borders-health/reports/quarantine-cases/by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 4
        assert data['matched'] == 2
        assert data['unassigned'] == 2
        assert data['by_state'] == [] or len(data['by_state']) == 1
        assert data['total'] == data['matched'] + data['unassigned']
