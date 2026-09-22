import pytest

from apps.surveillance.models.report import (
    DailySurveillanceReport,
    WeeklySurveillanceReport,
    ReportStatus,
    ReportLine,
)
from apps.surveillance.models.case import HealthCase

pytestmark = pytest.mark.django_db


@pytest.fixture
def daily_report(world, officer_user):
    return DailySurveillanceReport.objects.create(
        title='تقرير يومي',
        period_start='2026-09-15',
        period_end='2026-09-15',
        sector=world['sector'],
        port=world['port'],
        prepared_by=officer_user,
    )


@pytest.fixture
def case(world, officer_user):
    return HealthCase.objects.create(
        disease=world['disease'], person_name='حالة تقرير',
        port=world['port'], sector=world['sector'],
        reported_by=officer_user, source='MANUAL',
    )


# ==============================================================================
# نموذج التقرير
# ==============================================================================

def test_report_number_auto_generated(daily_report):
    assert daily_report.report_number


def test_report_review_flow(officer_user, daily_report):
    daily_report.submit(officer_user)
    daily_report.refresh_from_db()
    assert daily_report.status == ReportStatus.SUBMITTED


def test_report_submit_approve_publish(officer_user, daily_report):
    daily_report.submit(officer_user)
    daily_report.approve(officer_user)
    daily_report.refresh_from_db()
    assert daily_report.status == ReportStatus.APPROVED
    daily_report.publish(officer_user)
    daily_report.refresh_from_db()
    assert daily_report.status == ReportStatus.PUBLISHED


# ==============================================================================
# واجهات API
# ==============================================================================

def test_reports_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/reports/daily/')
    assert resp.status_code in (401, 403)


def test_create_daily_report_api(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/reports/daily/',
        {
            'title': 'تقرير يومي API',
            'period_start': '2026-09-16',
            'period_end': '2026-09-16',
            'sector': world['sector'].id,
            'port': world['port'].id,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['report_number']


def test_list_daily_reports(login, officer_user, daily_report, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/reports/daily/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_report_submit_api(login, officer_user, daily_report, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/reports/daily/{daily_report.id}/submit/',
        {},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    daily_report.refresh_from_db()
    assert daily_report.status == ReportStatus.SUBMITTED


def test_report_add_line_api(login, officer_user, daily_report, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/reports/daily/{daily_report.id}/lines/',
        {'disease': world['disease'].id, 'new_cases': 3, 'deaths': 1},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    from django.contrib.contenttypes.models import ContentType
    ct = ContentType.objects.get_for_model(daily_report)
    assert ReportLine.objects.filter(
        report_content_type=ct, report_object_id=daily_report.pk
    ).count() >= 1