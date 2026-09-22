"""اختبارات صندوق الإشعارات (قراءة / علامة القراءة / الجرس)."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.notifications.models import NotificationLog

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(api_client):
    u = User.objects.create_user(
        email='inbox@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم الإشعارات'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': u.email, 'password': 'StrongPass123!'},
        format='json',
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return u


@pytest.fixture
def inbox(user):
    for i in range(3):
        NotificationLog.objects.create(
            user=user,
            channel='in_app',
            recipient=user.email,
            subject=f'تنبيه {i + 1}',
            body='نص التنبيه',
            status=NotificationLog.NotificationStatus.SENT,
        )
    NotificationLog.objects.create(
        user=user,
        channel='in_app',
        recipient=user.email,
        subject='مقروء',
        body='مقروء بالفعل',
        status=NotificationLog.NotificationStatus.SENT,
        is_read=True,
    )
    return user


def test_list_returns_only_mine(api_client, inbox):
    other = User.objects.create_user(
        email='other@nqp.gov.sd', password='StrongPass123!', full_name='آخر'
    )
    NotificationLog.objects.create(
        user=other,
        channel='in_app',
        recipient=other.email,
        subject='خاص بآخر',
        status=NotificationLog.NotificationStatus.SENT,
    )
    res = api_client.get('/api/v1/notifications/')
    assert res.status_code == 200
    data = res.data['data']
    assert len(data) == 4
    assert all(str(n['user']) == str(inbox.id) for n in data)
    assert 'is_read' in data[0]
    assert 'read_at' in data[0]
    assert 'created_at' in data[0]


def test_list_filter_unread(api_client, inbox):
    res = api_client.get('/api/v1/notifications/', {'unread': 'true'})
    assert res.status_code == 200
    data = res.data['data']
    assert len(data) == 3
    assert all(n['is_read'] is False for n in data)


def test_list_limit(api_client, inbox):
    res = api_client.get('/api/v1/notifications/', {'limit': '2'})
    assert res.status_code == 200
    assert len(res.data['data']) == 2


def test_unread_count(api_client, inbox):
    res = api_client.get('/api/v1/notifications/unread-count/')
    assert res.status_code == 200
    assert res.data['data'] == {'unread_count': 3}


def test_mark_one_read(api_client, inbox):
    target = NotificationLog.objects.filter(user=inbox, is_read=False).first()
    res = api_client.post(f'/api/v1/notifications/{target.id}/read/')
    assert res.status_code == 200
    assert res.data['data']['is_read'] is True
    assert res.data['data']['read_at'] is not None
    target.refresh_from_db()
    assert target.is_read is True


def test_mark_read_other_users_forbidden(api_client, inbox):
    other = User.objects.create_user(
        email='other2@nqp.gov.sd', password='StrongPass123!', full_name='آخر'
    )
    foreign = NotificationLog.objects.create(
        user=other,
        channel='in_app',
        recipient=other.email,
        subject='خاص بآخر',
        status=NotificationLog.NotificationStatus.SENT,
    )
    res = api_client.post(f'/api/v1/notifications/{foreign.id}/read/')
    assert res.status_code == 404


def test_mark_all_read(api_client, inbox):
    res = api_client.post('/api/v1/notifications/read-all/')
    assert res.status_code == 200
    assert res.data['data'] == {'marked': 3}
    assert not NotificationLog.objects.filter(user=inbox, is_read=False).exists()


def test_unauthenticated_denied(api_client):
    api_client.credentials()
    assert api_client.get('/api/v1/notifications/').status_code == 401
    assert api_client.get('/api/v1/notifications/unread-count/').status_code == 401