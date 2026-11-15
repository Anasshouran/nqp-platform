import uuid

import pytest
from rest_framework.test import APIClient

from apps.organization.models import OrgAssignment
from apps.registry.models import ReportingNode, HealthFacilityNodeAssignment
from django.utils import timezone
from apps.masterdata.models import EntryPoint, HealthFacility, Sector as MasterdataSector
from apps.organization.models import Sector as OrgSector, Locality
from apps.masterdata.models import State


def _uid():
    return uuid.uuid4().hex[:8]


def _make_user():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_superuser(
        username=f'user_{_uid()}', email=f'user_{_uid()}@example.com', password='testpass'
    )


def _get_root_node():
    root = ReportingNode.objects.filter(kind='FEDERAL', parent__isnull=True).first()
    if root is None:
        root = ReportingNode.objects.create(code=f'ROOT_{_uid()}', name_ar='جذر', kind='FEDERAL')
    return root


def _build_hierarchy():
    root = _get_root_node()
    md = MasterdataSector.objects.create(code=f'MD_HR_{_uid()}', name_ar='قطاع')
    org = OrgSector.objects.create(code=f'ORG_HR_{_uid()}', name_ar='قطاع إداري')
    state = State.objects.create(code=f'ST_HR_{_uid()}', name_ar=f'ولاية {_uid()}', sector=md)
    loc = Locality.objects.create(code=f'LOC_HR_{_uid()}', name_ar=f'محلية {_uid()}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_HR_{_uid()}', name_ar=f'منفذ {_uid()}', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_HR_{_uid()}', name_ar=f'منشأة {_uid()}', sector=org, locality=loc, entry_point=ep,
    )
    root = ReportingNode.objects.create(
        code=f'ROOT_HR_{_uid()}', name_ar='جذر', kind='FEDERAL',
    )
    state_node = ReportingNode.objects.create(
        code=f'STATE_HR_{_uid()}', name_ar='ولاية اختبار', kind='STATE', parent=root,
    )
    node = ReportingNode.objects.create(
        code=f'FAC_NODE_HR_{_uid()}', name_ar='عقدة منشأة', kind='FACILITY', parent=state_node,
    )
    HealthFacilityNodeAssignment.objects.create(
        facility=fac, node=node, valid_from=timezone.now(), valid_to=None,
    )
    return {'state': state, 'state_node': state_node, 'node': node, 'facility': fac, 'ep': ep}


@pytest.mark.django_db
class TestOrgAssignmentByStateEndpoint:
    """4 اختبارات لنهاية by-state لتعيينات الموارد البشرية."""

    def test_empty_report(self):
        """IQ1 — تقرير فارغ: total=0، by_state=[]."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        resp = client.get('/api/v1/hr/reports/assignments-by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 0
        assert data['matched'] == 0
        assert data['by_state'] == []

    def test_matched_grouping_two_states(self):
        """IQ2 — تجميع تعيينات بوليتين."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        ctx1 = _build_hierarchy()
        ctx2 = _build_hierarchy()
        # تعيينان في الولاية الأولى
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx1['facility'], reporting_node=ctx1['node'],
            sector=OrgSector.objects.first(),
        )
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx1['facility'], reporting_node=ctx1['node'],
            sector=OrgSector.objects.first(),
        )
        # تعيينان في الولاية الثانية
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx2['facility'], reporting_node=ctx2['node'],
            sector=OrgSector.objects.first(),
        )
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx2['facility'], reporting_node=ctx2['node'],
            sector=OrgSector.objects.first(),
        )

        resp = client.get('/api/v1/hr/reports/assignments-by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 4
        assert data['matched'] == 4
        assert len(data['by_state']) == 2
        counts = sorted([b['count'] for b in data['by_state']])
        assert counts == [2, 2]

    def test_reconciliation(self):
        """IQ3 — التوفيق: total == matched + node_no_state + unassigned_facility + unassigned_node."""
        client = APIClient()
        client.force_authenticate(user=_make_user())
        ctx = _build_hierarchy()
        # تعيينان مبلّغان
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx['facility'], reporting_node=ctx['node'],
            sector=OrgSector.objects.first(),
        )
        OrgAssignment.objects.create(
            user=_make_user(), facility=ctx['facility'], reporting_node=ctx['node'],
            sector=OrgSector.objects.first(),
        )
        # تعيينان بلا منشأة (unassigned_facility)
        OrgAssignment.objects.create(
            user=_make_user(), sector=OrgSector.objects.first(),
        )
        OrgAssignment.objects.create(
            user=_make_user(), sector=OrgSector.objects.first(),
        )

        resp = client.get('/api/v1/hr/reports/assignments-by-state/')
        assert resp.status_code == 200
        data = resp.data['data']
        assert data['total'] == 4
        assert data['matched'] == 2
        assert data['node_no_state'] == 0
        assert data['unassigned_facility'] == 2
        assert data['unassigned_node'] == 0
        assert data['total'] == data['matched'] + data['node_no_state'] + data['unassigned_facility'] + data['unassigned_node']
