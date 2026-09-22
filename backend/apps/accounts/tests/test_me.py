import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='me_user@nqp.gov.sd',
        password=PASSWORD,
        full_name='مستخدم تجريبي',
        phone='+249900000111',
    )


def _auth_client(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD},
        format='json',
    )
    assert login.status_code == 200
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def test_me_requires_auth(api_client):
    assert api_client.get('/api/v1/me/').status_code == 401
    assert api_client.get('/api/v1/me/sessions/').status_code == 401
    assert api_client.get('/api/v1/me/activity/').status_code == 401


def test_me_returns_current_user(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/me/')
    assert response.status_code == 200
    assert response.data['data']['email'] == user.email


def test_me_organization_returns_list(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/me/organization/')
    assert response.status_code == 200
    assert isinstance(response.data['data'], list)


def test_me_sessions_lists_active_session(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/me/sessions/')
    assert response.status_code == 200
    sessions = response.data['data']
    assert len(sessions) >= 1
    assert all({'id', 'last_activity', 'is_active', 'device_info', 'ip_address'} <= set(s) for s in sessions)


def test_me_activity_returns_entries(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/me/activity/')
    assert response.status_code == 200
    entries = response.data['data']
    assert entries, 'يجب أن يحتوي النشاط على إنشاء الحساب وتسجيل الدخول'
    assert {'date', 'time', 'action', 'description'} <= set(entries[0])


def test_me_profile_patch_updates_flat_fields(api_client, user):
    _auth_client(api_client, user)
    response = api_client.patch(
        '/api/v1/me/profile/',
        {'phone': '+249111111111', 'profile': {'full_name_ar': 'مستخدم محدّث'}},
        format='json',
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.phone == '+249111111111'
    assert user.profile.full_name_ar == 'مستخدم محدّث'


def test_me_notifications_settings_patch(api_client, user):
    _auth_client(api_client, user)
    response = api_client.get('/api/v1/me/notifications/settings/')
    assert response.status_code == 200
    assert any(s['key'] == 'notify_email' for s in response.data['data'])
    response = api_client.patch(
        '/api/v1/me/notifications/settings/',
        {'notify_sms': True, 'notify_email': False},
        format='json',
    )
    assert response.status_code == 200
    values = {s['key']: s['value'] for s in response.data['data']}
    assert values['notify_sms'] is True
    assert values['notify_email'] is False


def test_me_preferences_patch(api_client, user):
    _auth_client(api_client, user)
    response = api_client.patch(
        '/api/v1/me/preferences/',
        {'language': 'en'},
        format='json',
    )
    assert response.status_code == 200
    data = response.data['data']
    assert data['language'] == 'en'
    assert data['direction'] == 'LTR'


def test_me_session_delete_revokes(api_client, user):
    _auth_client(api_client, user)
    sessions = api_client.get('/api/v1/me/sessions/').data['data']
    session_id = sessions[0]['id']
    response = api_client.delete(f'/api/v1/me/sessions/{session_id}/')
    assert response.status_code == 204
    sessions = api_client.get('/api/v1/me/sessions/').data['data']
    assert sessions[0]['id'] == session_id
    assert sessions[0]['is_active'] is False
    # الحذف المتكرر يُرجع 404 لأن الجلسة سودت بالفعل
    assert api_client.delete(f'/api/v1/me/sessions/{session_id}/').status_code == 404


def test_me_session_delete_unknown_returns_404(api_client, user):
    _auth_client(api_client, user)
    assert api_client.delete('/api/v1/me/sessions/999999/').status_code == 404