import pytest

from apps.surveillance.models.event import (
    HealthEvent,
    HealthEventType,
    HealthEventStatus,
    EventSource,
    EventReport,
)
from apps.surveillance.models.outbreak import Outbreak, OutbreakStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def event(world, officer_user):
    return HealthEvent.objects.create(
        event_type=HealthEventType.CLUSTER,
        title='تجمع حالات إسهال في بورتسودان',
        description='بلاغ عن تجمع أمراض في نقطة الدخول',
        sector=world['sector'],
        locality=world['locality'],
        port=world['port'],
        reported_by=officer_user,
        source=EventSource.HEALTH_WORKER,
        public_health_risk='HIGH',
        event_date='2026-09-14',
    )


# ==============================================================================
# نموذج الحدث الصحي
# ==============================================================================

def test_event_number_auto_generated(event):
    assert event.event_number


def test_event_verify_event(officer_user, event):
    assert event.status == HealthEventStatus.REPORTED
    event.verify(officer_user)
    event.refresh_from_db()
    assert event.status == HealthEventStatus.VERIFIED
    assert event.verified_at is not None


# ==============================================================================
# واجهات API
# ==============================================================================

def test_events_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/events/')
    assert resp.status_code in (401, 403)


def test_create_event_api(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/events/',
        {
            'event_type': HealthEventType.CLUSTER,
            'title': 'تجمع في السوق',
            'description': 'حالات إسهال وسط العاملات في السوق',
            'sector': world['sector'].id,
            'port': world['port'].id,
            'suspected_disease': world['disease'].id,
            'source': EventSource.HEALTH_WORKER,
            'priority': 'HIGH',
            'event_date': '2026-09-15',
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['event_number']


def test_list_events(login, officer_user, event, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/events/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_event_verify_api(login, officer_user, event, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/events/{event.id}/verify/',
        {},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    event.refresh_from_db()
    assert event.status == HealthEventStatus.VERIFIED


def test_event_add_report_api(login, officer_user, event, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/events/{event.id}/reports/',
        {'event': event.id, 'report_type': 'FOLLOW_UP', 'title': 'تقرير متابعة', 'content': 'لا توجد مستجدات'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert EventReport.objects.filter(event=event).count() == 1


def test_event_mark_investigating_api(login, officer_user, event, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/events/{event.id}/mark-investigating/',
        {},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    event.refresh_from_db()
    assert event.status == HealthEventStatus.INVESTIGATING


def test_event_patch(login, officer_user, event, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.patch(
        f'/api/v1/surveillance/events/{event.id}/',
        {'priority': 'URGENT'},
        format='json',
    )
    assert resp.status_code == 200
    event.refresh_from_db()
    assert event.priority == 'URGENT'