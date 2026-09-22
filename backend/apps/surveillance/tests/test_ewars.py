import pytest
from datetime import timedelta

from django.utils import timezone

from apps.surveillance.models.alert import AlertRule, AlertType
from apps.surveillance.models.case import HealthCase, CaseClassification, CaseWorkflowState
from apps.surveillance.models.outbreak import Outbreak, OutbreakStatus
from apps.surveillance.services.ewars_engine import EWARSEngine

pytestmark = pytest.mark.django_db


def _create_threshold_rule(world):
    return AlertRule.objects.create(
        name='قاعدة عتبة الكوليرا',
        rule_type=AlertRule.RuleType.THRESHOLD,
        disease=world['disease'],
        threshold_value=2,
        window_days=7,
        baseline_weeks=4,
        min_cases_for_alert=2,
        alert_level='LEVEL_1',
        is_active=True,
    )


def _create_single_case_rule(world):
    return AlertRule.objects.create(
        name='قاعدة حالة واحدة للكوليرا',
        rule_type=AlertRule.RuleType.SINGLE_CASE,
        disease=world['disease'],
        window_days=7,
        baseline_weeks=4,
        min_cases_for_alert=1,
        alert_level='LEVEL_1',
        is_active=True,
    )


@pytest.fixture
def cases(world, officer_user):
    today = timezone.localdate()
    created = []
    for i in range(3):
        created.append(HealthCase.objects.create(
            disease=world['disease'],
            person_name=f'حالة EWARS {i}',
            person_age=30, person_sex='M',
            port=world['port'], sector=world['sector'],
            reported_by=officer_user, source='MANUAL',
            reported_date=today - timedelta(days=i),
            case_type=CaseClassification.CONFIRMED,
        ))
    return created


# ==============================================================================
# EWARS Engine
# ==============================================================================

def test_threshold_rule_triggers_alert(world, cases):
    rule = _create_threshold_rule(world)
    today = timezone.localdate()
    alerts = EWARSEngine.evaluate_rule(rule, None, today - timedelta(days=7), today)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.alert_type == AlertType.THRESHOLD_BREACH
    assert alert.disease_id == world['disease'].id
    # ربط الحالات
    assert alert.cases.exists()


def test_threshold_rule_no_trigger_if_below(world, officer_user):
    rule = _create_threshold_rule(world)
    # حالة واحدة فقط < العتبة 2
    today = timezone.localdate()
    HealthCase.objects.create(
        disease=world['disease'], person_name='حالة واحدة',
        port=world['port'], sector=world['sector'],
        reported_by=officer_user, reported_date=today, source='MANUAL',
    )
    alerts = EWARSEngine.evaluate_rule(rule, None, today - timedelta(days=7), today)
    assert alerts == []


def test_single_case_rule_triggers(world, cases):
    rule = _create_single_case_rule(world)
    today = timezone.localdate()
    alerts = EWARSEngine.evaluate_rule(rule, None, today - timedelta(days=7), today)
    assert len(alerts) == 3
    assert all(a.alert_type in (AlertType.SINGLE_EVENT, AlertType.THRESHOLD_BREACH) for a in alerts)


def test_run_all_rules(world, cases):
    _create_threshold_rule(world)
    results = EWARSEngine.run_all_rules()
    assert results['total_rules'] >= 1
    assert results['triggered'] >= 1
    assert len(results['alerts_created']) >= 1


def test_lab_positive_alert(officer_user, world):
    HealthCase.objects.create(
        disease=world['disease'], person_name='حالة مختبر',
        port=world['port'], sector=world['sector'],
        reported_by=officer_user, source='LAB',
    )
    from apps.surveillance.models.alert import SurveillanceAlert
    alert = EWARSEngine.create_lab_positive_alert(
        HealthCase.objects.get(person_name='حالة مختبر')
    )
    assert alert is not None
    assert alert.alert_type == AlertType.LAB_POSITIVE


def test_compute_baseline_statistics(world, officer_user):
    # إنشاء حالة قديمة جداً خارج نافذة 8 أسابيع → المسار الآمن (بدون date_trunc)
    old = HealthCase.objects.create(
        disease=world['disease'], person_name='حالة قديمة',
        port=world['port'], sector=world['sector'],
        reported_by=officer_user,
        reported_date=timezone.localdate() - timedelta(days=200), source='MANUAL',
    )
    stats = EWARSEngine.compute_baseline_statistics(world['disease'])
    assert 'mean' in stats and 'threshold' in stats