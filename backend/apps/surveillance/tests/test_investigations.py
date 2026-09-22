import pytest

from apps.surveillance.models.investigation import (
    Investigation,
    InvestigationAxis,
    InvestigationFinding,
    InvestigationStatus,
    InvestigationPriority,
    InvestigationAxisType,
)
from apps.surveillance.models.case import HealthCase
from apps.surveillance.models.alert import (SurveillanceAlert, AlertLevel, AlertType)
from apps.surveillance.services.workflows import InvestigationWorkflowService

pytestmark = pytest.mark.django_db


@pytest.fixture
def case(world, officer_user):
    return HealthCase.objects.create(
        disease=world['disease'],
        person_name='حالة تحقيق',
        person_age=33,
        person_sex='F',
        port=world['port'],
        sector=world['sector'],
        reported_by=officer_user,
        source='MANUAL',
    )


@pytest.fixture
def investigation(world, officer_user, case):
    inv = Investigation.objects.create(
        title='تحقيق حول حالة في المنفذ',
        case=case,
        priority=InvestigationPriority.HIGH,
        lead_investigator=officer_user,
    )
    return inv


# ==============================================================================
# نموذج التحقيق
# ==============================================================================

def test_investigation_number_auto_generated(investigation):
    assert investigation.investigation_number


def test_complete_axis_and_investigation(world, officer_user, investigation):
    axis = InvestigationAxis.objects.create(
        investigation=investigation,
        axis_type=InvestigationAxisType.TRAVEL,
        title='تاريخ السفر',
    )
    InvestigationWorkflowService.complete_axis(axis, officer_user, 'لم يسافر خارجياً')
    axis.refresh_from_db()
    assert axis.is_completed
    assert axis.completed_by_id == officer_user.id
    # اكتمال كل المحاور → التحقيق مكتمل
    assert investigation.status == InvestigationStatus.COMPLETED


def test_close_investigation(world, officer_user, investigation):
    InvestigationWorkflowService.close_investigation(investigation, officer_user, 'تم الإغلاق')
    investigation.refresh_from_db()
    assert investigation.status == InvestigationStatus.CLOSED
    assert investigation.closed_at is not None


# ==============================================================================
# واجهات API
# ==============================================================================

def test_investigations_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/investigations/')
    assert resp.status_code in (401, 403)


def test_create_investigation_api(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/investigations/',
        {
            'title': 'تحقيق حول الحالة الأولى',
            'case': case.id,
            'priority': InvestigationPriority.URGENT,
            'hypothesis': 'مصدر مائي',
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['investigation_number']
    assert data['lead_investigator'] == str(officer_user.id)


def test_list_investigations(login, officer_user, investigation, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/investigations/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_investigation_add_axis_api(login, officer_user, investigation, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/investigations/{investigation.id}/axes/',
        {'axis_type': InvestigationAxisType.CONTACT, 'title': 'محور المخالطة'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert InvestigationAxis.objects.filter(investigation=investigation).count() == 1


def test_investigation_complete_axis_api(login, officer_user, investigation, world, grant_permissions):
    from apps.surveillance.models.investigation import InvestigationAxis
    axis = InvestigationAxis.objects.create(
        investigation=investigation, axis_type=InvestigationAxisType.WATER, title='المياه'
    )
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/investigations/{investigation.id}/complete-axis/',
        {'id': str(axis.id), 'findings': 'مصدر المياه ملوث'},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    axis.refresh_from_db()
    assert axis.is_completed


def test_investigation_close_api(login, officer_user, investigation, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/investigations/{investigation.id}/close/',
        {'notes': 'انتهى التحقيق'},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    investigation.refresh_from_db()
    assert investigation.status == InvestigationStatus.CLOSED


def test_investigation_add_finding_api(login, officer_user, investigation, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/investigations/{investigation.id}/findings/',
        {'finding_type': 'SOURCE_IDENTIFIED', 'title': 'نتيجة المختبر', 'description': 'إيجابية'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert InvestigationFinding.objects.filter(investigation=investigation).count() == 1