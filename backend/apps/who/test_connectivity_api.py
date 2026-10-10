"""اختبارات نقاط حالة WHO وفحص الاتصال عبر الواجهة البرمجية.

تركّز على العقد المرئي للعميل:
  * ``GET  /who/integrations/status/`` لا يُرجع سرّاً ولا توكناً.
  * ``connected`` لا يُشتق من ``last_success_at``.
  * ``POST /who/integrations/test/`` يجري الفحص ويسجّله، ولا يلمس المزامنة
    ولا Celery ولا إرسال IHR.
"""

from unittest import mock

import httpx
import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.who.models import WHOSyncLog, WHOIntegration

pytestmark = pytest.mark.django_db

User = get_user_model()

STATUS_URL = '/api/v1/who/integrations/status/'
TEST_URL = '/api/v1/who/integrations/test/'

ACCESS_TOKEN = 'visible-access-token'
CLIENT_SECRET = 'visible-client-secret'

CONFIG = {
    'WHO_ENABLED': True,
    'WHO_ICD_BASE_URL': 'https://id.who.int',
    'WHO_ICD_TOKEN_URL': 'https://icdaccessmanagement.who.int/connect/token',
    'WHO_ICD_CLIENT_ID': 'who-client-id',
    'WHO_ICD_CLIENT_SECRET': CLIENT_SECRET,
}


def _config(**overrides):
    return override_settings(**{**CONFIG, **overrides})


def _token_ok():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'access_token': ACCESS_TOKEN}
    return resp


def _entity_ok():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'@id': 'https://id.who.int/icd/entity?releaseId=mms'}
    return resp


def _auth_error():
    request = httpx.Request('POST', CONFIG['WHO_ICD_TOKEN_URL'])
    response = httpx.Response(401, request=request)
    return httpx.HTTPStatusError('denied', request=request, response=response)


@pytest.fixture
def integration():
    return WHOIntegration.objects.create(
        name='WHO Prod', environment='PRODUCTION',
        base_url='https://id.who.int', client_id='stored-client',
        authentication_type='OAUTH2', is_active=True,
    )


@pytest.fixture
def auth(grant_permissions):
    user = User.objects.create_user(
        email='who-ops@nqp.gov.sd', password='StrongPass123!', full_name='مشغّل WHO',
    )
    grant_permissions(user, codes=[
        'who_integration:view', 'who_integration:test', 'who_logs:view',
    ])
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


def _assert_no_secrets(payload):
    blob = repr(payload)
    assert CLIENT_SECRET not in blob
    assert ACCESS_TOKEN not in blob
    assert 'who-client-id' not in blob
    assert 'Bearer' not in blob
    assert 'Authorization' not in blob
    assert 'access_token' not in blob


# ============================================================
# GET status
# ============================================================


def test_status_requires_authentication():
    assert APIClient().get(STATUS_URL).status_code in (401, 403)


def test_status_reports_configured_but_not_connected_before_any_check(auth):
    with _config():
        response = auth.get(STATUS_URL)
    assert response.status_code == 200
    data = response.data['data']
    assert data['configured'] is True
    assert data['connected'] is False
    assert data['verified'] is False
    assert data['state'] == 'CONFIGURED'
    assert data['verified_at'] is None
    _assert_no_secrets(data)


def test_status_never_claims_connected_from_last_success_at(auth, integration):
    integration.last_success_at = timezone.now()
    integration.save(update_fields=['last_success_at'])
    with _config():
        data = auth.get(STATUS_URL).data['data']
    assert data['last_success_at'] is not None
    assert data['connected'] is False
    assert data['verified'] is False


def test_status_reports_ready_after_recorded_check(auth):
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        auth.post(TEST_URL)

    with _config():
        data = auth.get(STATUS_URL).data['data']

    assert data['state'] == 'READY'
    assert data['connected'] is True
    assert data['verified'] is True
    assert data['oauth_verified'] is True
    assert data['api_verified'] is True
    assert data['verified_http_status'] == 200
    assert data['verified_endpoint'] == '/icd/entity'
    assert data['verified_at'] is not None
    _assert_no_secrets(data)


def test_status_reports_error_after_failed_check(auth):
    with _config(), mock.patch('httpx.post', side_effect=_auth_error()):
        auth.post(TEST_URL)

    with _config():
        data = auth.get(STATUS_URL).data['data']

    assert data['state'] == 'ERROR'
    assert data['connected'] is False
    assert data['verified'] is False
    assert data['verified_http_status'] == 401
    _assert_no_secrets(data)


def test_status_never_exposes_ihr_as_verified(auth):
    with _config():
        data = auth.get(STATUS_URL).data['data']
    assert data['ihr_state'] in {'DISABLED', 'UNCONFIGURED', 'INVALID', 'CONFIGURED'}
    assert 'ihr_verified' not in data
    assert 'ihr_http_status' not in data


# ============================================================
# POST test
# ============================================================


def test_test_requires_authentication():
    assert APIClient().post(TEST_URL).status_code in (401, 403)


def test_test_returns_ready_payload_and_records_once(auth):
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()) as get:
        response = auth.post(TEST_URL)

    assert response.status_code == 200
    data = response.data['data']
    assert data['state'] == 'READY'
    assert data['verified'] is True
    assert data['oauth_verified'] is True
    assert data['api_verified'] is True
    assert get.call_count == 1
    assert WHOSyncLog.objects.filter(operation=WHOSyncLog.Operation.STATUS_CHECK).count() == 1
    _assert_no_secrets(data)


def test_test_returns_error_payload_on_auth_failure(auth):
    with _config(), mock.patch('httpx.post', side_effect=_auth_error()):
        response = auth.post(TEST_URL)

    data = response.data['data']
    assert data['state'] == 'ERROR'
    assert data['verified'] is False
    assert data['message']
    assert WHOSyncLog.objects.filter(status=WHOSyncLog.Status.FAILED).count() == 1
    _assert_no_secrets(data)


def test_test_does_not_dispatch_celery_or_sync(auth):
    """الفحص Controlled: لا ``.delay()`` ولا مزامنة ولا إرسال حدث."""
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()), \
            mock.patch('apps.who.tasks.sync_who_diseases') as sync_task, \
            mock.patch('apps.who.tasks.submit_ihr_event') as submit_task, \
            mock.patch('apps.who.services.disease_service.sync_diseases_from_icd11') as sync_svc:
        auth.post(TEST_URL)

    sync_task.delay.assert_not_called()
    submit_task.assert_not_called()
    sync_svc.assert_not_called()


def test_test_writes_no_whosuccess_timestamp(auth, integration):
    """فحص الاتصال ليس مزامنة: لا يحرّك ``last_success_at``."""
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        auth.post(TEST_URL)

    integration.refresh_from_db()
    assert integration.last_success_at is None
    assert integration.last_sync_at is None


def test_test_when_disabled_makes_no_request(auth):
    with override_settings(**{**CONFIG, 'WHO_ENABLED': False}), \
            mock.patch('httpx.post') as post, mock.patch('httpx.get') as get:
        data = auth.post(TEST_URL).data['data']

    assert data['state'] == 'DISABLED'
    assert data['verified'] is False
    post.assert_not_called()
    get.assert_not_called()


def test_test_works_without_a_stored_integration_row(auth):
    """الإعدادات من البيئة كافية — لا شرط لوجود سجل ``WHOIntegration``."""
    assert WHOIntegration.objects.count() == 0
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        data = auth.post(TEST_URL).data['data']
    assert data['state'] == 'READY'


def test_logs_endpoint_does_not_leak_recorded_token(auth):
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        auth.post(TEST_URL)

    logs = auth.get('/api/v1/who/logs/', {'operation': 'STATUS_CHECK'})
    assert logs.status_code == 200
    _assert_no_secrets(logs.data)
