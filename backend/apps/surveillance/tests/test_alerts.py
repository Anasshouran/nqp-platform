import pytest

from apps.surveillance.models.alert import (
    AlertLevel,
    AlertStatus,
    AlertType,
    AlertEvaluationStatus,
    SurveillanceAlert,
    AlertRule,
)
from apps.surveillance.models.event import HealthEvent, HealthEventType
from apps.surveillance.models.outbreak import Outbreak, OutbreakStatus
from apps.surveillance.models.case import HealthCase, CaseWorkflowState

pytestmark = pytest.mark.django_db


@pytest.fixture
def alert(world, officer_user):
    return SurveillanceAlert.objects.create(
        alert_type=AlertType.THRESHOLD_BREACH,
        level=AlertLevel.LEVEL_1,
        title='ارتفاع حالات الكوليرا في بورتسودان',
        description='تجاوز عدد الحالات العتبة الإحصائية',
        disease=world['disease'],
        sector=world['sector'],
        port=world['port'],
        notification_sent=False,
    )


@pytest.fixture
def alert_rule(world):
    return AlertRule.objects.create(
        name='قاعدة الكوليرا الشهري',
        description='كشف تجاوز العتبة الشهرية',
        rule_type='THRESHOLD',
        disease=world['disease'],
        is_global=True,
        threshold_value=2,
        window_days=7,
        alert_level=AlertLevel.LEVEL_1,
        is_active=True,
    )


# ==============================================================================
# نموذج الإنذار
# ==============================================================================

def test_alert_number_auto_generated(alert):
    assert alert.alert_number


def test_alert_rule_auto_generated(alert_rule):
    assert alert_rule.name


def test_alert_acknowledge_sets_status(officer_user, alert):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.acknowledge(alert, officer_user, 'تم الإقرار')
    alert.refresh_from_db()
    assert alert.status == AlertStatus.ACKNOWLEDGED
    assert alert.acknowledged_at is not None
    # تقييم تلقائي
    from apps.surveillance.models.alert import AlertEvaluation
    assert AlertEvaluation.objects.filter(alert=alert).exists()


def test_alert_acknowledge_invalid_state(officer_user, alert):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.acknowledge(alert, officer_user)
    # الإقرار الثاني يجب أن يفشل
    with pytest.raises(ValueError):
        AlertWorkflowService.acknowledge(alert, officer_user)


def test_alert_evaluate_accept(officer_user, alert):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.acknowledge(alert, officer_user)
    AlertWorkflowService.evaluate(
        alert, officer_user, 'ACCEPT', 'HIGH', 'تحقيق ميداني مطلوب', ['خطة استجابة']
    )
    alert.refresh_from_db()
    assert alert.evaluation_status == AlertEvaluationStatus.ACCEPTED
    assert alert.status == AlertStatus.INVESTIGATING
    assert alert.risk_assessment['risk_level'] == 'HIGH'


def test_alert_evaluate_reject(officer_user, alert):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.acknowledge(alert, officer_user)
    AlertWorkflowService.evaluate(alert, officer_user, 'REJECT', 'LOW', 'بيانات خاطئة')
    alert.refresh_from_db()
    assert alert.evaluation_status == AlertEvaluationStatus.REJECTED
    assert alert.status == AlertStatus.FALSE_ALARM


def test_alert_close(officer_user, alert):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.close(alert, officer_user, 'تمت معالجة الوضع')
    alert.refresh_from_db()
    assert alert.status == AlertStatus.CLOSED
    assert alert.resolved_by_id == officer_user.id


def test_alert_escalate_to_outbreak(officer_user, alert, world):
    from apps.surveillance.services.workflows import OutbreakWorkflowService
    outbreak = OutbreakWorkflowService.create_from_alert(
        alert, officer_user, {'name': 'تفشي الكوليرا', 'severity': 'LEVEL_2'}
    )
    alert.refresh_from_db()
    assert alert.status == AlertStatus.ESCALATED
    assert alert.evaluation_status == AlertEvaluationStatus.ESCALATED_TO_OUTBREAK
    assert outbreak.disease_id == alert.disease_id
    assert outbreak.status == OutbreakStatus.CONFIRMED
    assert outbreak.origin_alert_id == alert.id
    assert outbreak.lead_epidemiologist_id == officer_user.id


# ==============================================================================
# واجهات API
# ==============================================================================

def test_alerts_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/alerts/')
    assert resp.status_code in (401, 403)


def test_list_alerts(login, officer_user, alert, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/alerts/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_alert_acknowledge_api(login, officer_user, alert, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/alerts/{alert.id}/acknowledge/',
        {'note': 'تم الإقرار'},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    alert.refresh_from_db()
    assert alert.status == AlertStatus.ACKNOWLEDGED


def test_alert_evaluate_api(login, officer_user, alert, world, grant_permissions):
    from apps.surveillance.services.workflows import AlertWorkflowService
    AlertWorkflowService.acknowledge(alert, officer_user)
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/alerts/{alert.id}/evaluate/',
        {
            'decision': 'ACCEPT',
            'risk_level': 'MODERATE',
            'justification': 'تحقيق مطلوب',
            'recommended_actions': ['line1'],
        },
        format='json',
    )
    assert resp.status_code == 200, resp.content
    alert.refresh_from_db()
    assert alert.evaluation_status == AlertEvaluationStatus.ACCEPTED


def test_alert_close_api(login, officer_user, alert, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/alerts/{alert.id}/close/',
        {'reason': 'انتهى الوضع'},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    alert.refresh_from_db()
    assert alert.status == AlertStatus.CLOSED


def test_alert_escalate_api(login, officer_user, alert, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/alerts/{alert.id}/escalate/',
        {'name': 'تفشي الكوليرا API', 'severity': 'LEVEL_2'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == OutbreakStatus.CONFIRMED


def test_alert_rules_list(login, officer_user, alert_rule, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/alert-rules/')
    assert resp.status_code == 200


def test_alert_rule_create(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/alert-rules/',
        {
            'name': 'قاعدة جديدة',
            'rule_type': 'THRESHOLD',
            'disease': world['disease'].id,
            'threshold_value': 5,
            'window_days': 7,
            'is_global': True,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['is_system'] is False