import pytest

from apps.surveillance.models.case import HealthCase, CaseWorkflowState, CaseClassification
from apps.surveillance.models.alert import SurveillanceAlert, AlertLevel, AlertType
from apps.surveillance.models.outbreak import Outbreak, OutbreakStatus
from apps.surveillance.models.contact import ContactTrace, ContactStatus
from apps.surveillance.models.event import HealthEvent, HealthEventType

pytestmark = pytest.mark.django_db


@pytest.fixture
def dashboard_data(world, officer_user):
    HealthCase.objects.create(
        disease=world['disease'],
        person_name='حالة 1',
        person_age=20, person_sex='F',
        port=world['port'], sector=world['sector'],
        case_type=CaseClassification.CONFIRMED,
        workflow_state=CaseWorkflowState.CONFIRMED,
        reported_by=officer_user, reported_date='2026-09-15', source='MANUAL',
    )
    HealthCase.objects.create(
        disease=world['disease'],
        person_name='حالة 2',
        person_age=30, person_sex='M',
        port=world['port'], sector=world['sector'],
        reported_by=officer_user, reported_date='2026-09-15', source='MANUAL',
    )
    SurveillanceAlert.objects.create(
        alert_type=AlertType.THRESHOLD_BREACH, level=AlertLevel.LEVEL_1,
        title='إنذار 1', description='وصف', disease=world['disease'],
        sector=world['sector'], port=world['port'],
    )
    Outbreak.objects.create(
        disease=world['disease'], name='تفشي 1', status=OutbreakStatus.ACTIVE_RESPONSE,
        sector=world['sector'], port=world['port'],
    )
    case = HealthCase.objects.get(person_name='حالة 2')
    ContactTrace.objects.create(
        index_case=case, person_name='مخالط 1', port=world['port'],
        sector=world['sector'], status=ContactStatus.UNDER_MONITORING,
    )


def test_dashboard_stats(login, officer_user, dashboard_data, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/dashboard/stats/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['total_cases'] >= 2
    assert data['confirmed_cases'] >= 1
    assert data['active_alerts'] >= 1
    assert data['active_outbreaks'] >= 1
    assert data['under_monitoring_contacts'] >= 1
    assert 'cases_by_disease' in data
    assert 'cases_by_sector' in data
    assert 'level_counts' in data


def test_dashboard_timeline(login, officer_user, dashboard_data, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/dashboard/timeline/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert 'cases_last_14_days' in data
    assert 'alerts_last_14_days' in data