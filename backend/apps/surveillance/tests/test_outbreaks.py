import pytest

from apps.surveillance.models.outbreak import (
    Outbreak,
    OutbreakStatus,
    OutbreakMode,
    OutbreakCase,
)
from apps.surveillance.models.case import HealthCase, CaseWorkflowState
from apps.surveillance.models.alert import (SurveillanceAlert, AlertLevel, AlertType)
from apps.surveillance.services.workflows import OutbreakWorkflowService

pytestmark = pytest.mark.django_db


@pytest.fixture
def outbreak(world, officer_user):
    return Outbreak.objects.create(
        disease=world['disease'],
        mode=OutbreakMode.POINT_SOURCE,
        name='تفشي الكوليرا التجريبي',
        description='تفشي في نقطة الدخول',
        sector=world['sector'],
        locality=world['locality'],
        port=world['port'],
        onset_date='2026-09-01',
        status=OutbreakStatus.DRAFT,
        severity='LEVEL_2',
        lead_epidemiologist=officer_user,
    )


# ==============================================================================
# نموذج التفشي وسير العمل
# ==============================================================================

def test_outbreak_number_auto_generated(outbreak):
    assert outbreak.outbreak_number


def test_outbreak_transition_chain(outbreak, officer_user):
    OutbreakWorkflowService.transition(outbreak, OutbreakStatus.UNDER_EVALUATION, officer_user)
    outbreak.refresh_from_db()
    assert outbreak.status == OutbreakStatus.UNDER_EVALUATION
    OutbreakWorkflowService.transition(outbreak, OutbreakStatus.CONFIRMED, officer_user)
    outbreak.refresh_from_db()
    assert outbreak.status == OutbreakStatus.CONFIRMED
    assert outbreak.confirmation_date is not None
    OutbreakWorkflowService.transition(outbreak, OutbreakStatus.ACTIVE_RESPONSE, officer_user)
    outbreak.refresh_from_db()
    assert outbreak.status == OutbreakStatus.ACTIVE_RESPONSE


def test_outbreak_invalid_transition(outbreak, officer_user):
    with pytest.raises(ValueError):
        OutbreakWorkflowService.transition(outbreak, OutbreakStatus.CONFIRMED, officer_user)


def test_outbreak_update_statistics(world, officer_user):
    outbreak = Outbreak.objects.create(
        disease=world['disease'], name='تفشي الإحصاءات', status=OutbreakStatus.CONFIRMED,
    )
    confirmed = HealthCase.objects.create(
        disease=world['disease'], person_name='حالة مؤكدة',
        case_type='CONFIRMED', status='UNDER_TREATMENT', reported_by=officer_user,
        workflow_state=CaseWorkflowState.CONFIRMED, outbreak=outbreak,
    )
    HealthCase.objects.create(
        disease=world['disease'], person_name='حالة مشتبهة',
        case_type='SUSPECTED', status='UNDER_INVESTIGATION',
        reported_by=officer_user, outbreak=outbreak,
    )
    outbreak.update_statistics()
    assert outbreak.total_cases == 2
    assert outbreak.confirmed_cases == 1
    assert outbreak.suspected_cases == 1


def test_outbreak_create_from_alert(officer_user, world):
    alert = SurveillanceAlert.objects.create(
        alert_type=AlertType.CLUSTER_DETECTION,
        level=AlertLevel.LEVEL_2,
        title='تجمع حالات',
        disease=world['disease'],
        sector=world['sector'],
        port=world['port'],
    )
    outbreak = OutbreakWorkflowService.create_from_alert(
        alert, officer_user, {'name': 'تفشي من الإنذار', 'severity': 'LEVEL_3'}
    )
    assert outbreak.origin_alert_id == alert.id
    assert outbreak.status == OutbreakStatus.CONFIRMED
    assert outbreak.severity == 'LEVEL_3'
    alert.refresh_from_db()
    assert alert.status == 'ESCALATED'


# ==============================================================================
# واجهات API
# ==============================================================================

def test_outbreaks_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/outbreaks/')
    assert resp.status_code in (401, 403)


def test_create_outbreak_api(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/outbreaks/',
        {
            'disease': world['disease'].id,
            'mode': OutbreakMode.POINT_SOURCE,
            'name': 'تفشي API',
            'sector': world['sector'].id,
            'port': world['port'].id,
            'onset_date': '2026-09-05',
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['outbreak_number']


def test_list_outbreaks(login, officer_user, outbreak, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/outbreaks/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_outbreak_transition_api(login, officer_user, outbreak, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/outbreaks/{outbreak.id}/transition/',
        {'new_status': OutbreakStatus.UNDER_EVALUATION},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    outbreak.refresh_from_db()
    assert outbreak.status == OutbreakStatus.UNDER_EVALUATION


def test_outbreak_add_action_api(login, officer_user, outbreak, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/outbreaks/{outbreak.id}/actions/',
        {'action_type': 'WATER_SAFETY', 'title': 'توزيع مياه نظيفة'},
        format='json',
    )
    assert resp.status_code == 201, resp.content


def test_outbreak_add_team_api(login, officer_user, outbreak, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/outbreaks/{outbreak.id}/teams/',
        {'name': 'فريق الاستجابة السريع', 'team_type': 'COORDINATION', 'lead': officer_user.id},
        format='json',
    )
    assert resp.status_code == 201, resp.content


def test_outbreak_detail_updates_statistics(login, officer_user, outbreak, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get(f'/api/v1/surveillance/outbreaks/{outbreak.id}/')
    assert resp.status_code == 200
    assert 'total_cases' in resp.json()['data']