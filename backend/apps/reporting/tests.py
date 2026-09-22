import pytest
from django.contrib.auth import get_user_model

from apps.reporting.models import Report

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(
        email='reports@nqp.gov.sd', password='StrongPass123!', full_name='مطلّع'
    )


def test_report_creation(user):
    report = Report.objects.create(
        report_type=Report.ReportType.SCREENINGS,
        format=Report.ReportFormat.CSV,
        params={'start': '2026-01-01', 'end': '2026-01-31'},
        requested_by=user,
    )
    assert report.pk is not None
    assert report.status == Report.ReportStatus.PROCESSING
    assert str(report) == 'SCREENINGS - PROCESSING'


def test_report_formats():
    assert set(Report.ReportFormat.values) == {'PDF', 'EXCEL', 'CSV'}


def test_report_ordering(user):
    r1 = Report.objects.create(report_type=Report.ReportType.LAB, requested_by=user)
    r2 = Report.objects.create(report_type=Report.ReportType.PORT_PERFORMANCE, requested_by=user)
    ids = list(Report.objects.values_list('id', flat=True))
    assert list(ids) == [r2.id, r1.id]