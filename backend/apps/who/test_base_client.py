"""اختبارات عميل WHO الأساسي (IHR/Events) — بدون شبكة حقيقية.

تثبت:
  • ترتيب مصدر الاعتمادادات: صريح ← settings (WHO_IHR_*) ← WHOIntegration
  • فصل IHR عن ICD-11: نقطة توكن IHR مشتقة من integration.base_url (أو WHO_IHR_TOKEN_URL)
  • عقد OAuth2 الخاص بـIHR: client_credentials بلا scope، والاعتمادادات في body لا في header
  • رفض الإرسال عند غياب كل المصادر (لا طلب ناقص، ولا تسريب سر، وسجل تدقيق FAILED)
  • بقاء WHOSyncLog مرتبطاً بـWHOIntegration (FK) في كل المسارات
"""

from unittest import mock

import pytest
from django.test import override_settings

from apps.who.clients import base_client
from apps.who.clients.base_client import WHOClient, WHOClientError
from apps.who.models import WHOSyncLog, WHOIntegration

BASE_URL = 'https://sandbox.who.example.org'
TOKEN_URL = f'{BASE_URL}/oauth2/token'
EVENT_PATH = '/api/v1/events'

DB_CLIENT_ID = 'db-client-id'
DB_SECRET = 'db-secret-placeholder'
ENV_CLIENT_ID = 'env-client-id'
ENV_SECRET = 'env-secret-placeholder'
ENV_TOKEN_URL = 'https://env-token.example.org/oauth2/token'


def _integration(auth_type='OAUTH2', client_id=DB_CLIENT_ID, secret=DB_SECRET, name='WHO IHR'):
    """نموذج غير محفوظ — يكفي لاختبارات الـconstructor والترويسة بدون قاعدة بيانات."""
    integration = WHOIntegration(
        name=name,
        environment='SANDBOX',
        base_url=BASE_URL,
        client_id=client_id,
        authentication_type=auth_type,
    )
    if secret:
        integration.set_client_secret(secret)
    return integration


def _env_settings(**overrides):
    values = {
        'WHO_IHR_CLIENT_ID': ENV_CLIENT_ID,
        'WHO_IHR_CLIENT_SECRET': ENV_SECRET,
        'WHO_IHR_TOKEN_URL': ENV_TOKEN_URL,
    }
    values.update(overrides)
    return override_settings(**values)



@pytest.fixture
def integration(db):
    """تكامل WHO محفوظ في قاعدة البيانات لاختبارات سجل التدقيق."""
    integration = WHOIntegration.objects.create(
        name='WHO IHR Sandbox',
        environment='SANDBOX',
        base_url=BASE_URL,
        client_id=DB_CLIENT_ID,
        authentication_type='OAUTH2',
    )
    integration.set_client_secret(DB_SECRET)
    integration.save(update_fields=['client_secret_encrypted'])
    return integration

def _token_response(token='ihr-access-token'):
    resp = mock.Mock(status_code=200)
    resp.json.return_value = {'access_token': token}
    return resp


def _api_response(status_code=200, body=None):
    resp = mock.Mock(status_code=status_code, text='{"ok": true}')
    resp.json.return_value = body if body is not None else {'id': 'WHO-REF-1'}
    return resp


# ===== A. بيانات اعتماد صريحة =====

def test_explicit_credentials_are_used():
    client = WHOClient(
        _integration(),
        client_id='explicit-id',
        client_secret='explicit-secret',
        token_url='https://explicit.example.org/token',
    )
    assert client.client_id == 'explicit-id'
    assert client.client_secret == 'explicit-secret'
    assert client._token_provider.token_url == 'https://explicit.example.org/token'
    assert client.is_configured is True


def test_explicit_credentials_win_over_settings_and_db():
    with _env_settings():
        client = WHOClient(
            _integration(),
            client_id='explicit-id',
            client_secret='explicit-secret',
            token_url='https://explicit.example.org/token',
        )
    assert client.client_id == 'explicit-id'
    assert client.client_secret == 'explicit-secret'
    assert client._token_provider.token_url == 'https://explicit.example.org/token'


# ===== B. بيانات الاعتماد من settings =====

def test_settings_credentials_used_when_not_passed():
    with _env_settings():
        client = WHOClient(_integration())
    assert client.client_id == ENV_CLIENT_ID
    assert client.client_secret == ENV_SECRET
    assert client._token_provider.token_url == ENV_TOKEN_URL
    assert client.is_configured is True


# ===== C. بيانات اعتماد DB فارغة لا تمنع settings =====

def test_empty_db_credentials_fall_back_to_settings():
    with _env_settings():
        client = WHOClient(_integration(client_id='', secret=''))
    assert client.client_id == ENV_CLIENT_ID
    assert client.client_secret == ENV_SECRET
    assert client.is_configured is True


def test_db_credentials_used_as_last_resort_without_env():
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(_integration())
    assert client.client_id == DB_CLIENT_ID
    assert client.client_secret == DB_SECRET
    assert client._token_provider.token_url == TOKEN_URL
    assert client.is_configured is True


def test_partial_db_credentials_fall_back_to_settings():
    with _env_settings():
        client = WHOClient(_integration(client_id='', secret=DB_SECRET))
    assert client.client_id == ENV_CLIENT_ID
    assert client.client_secret == ENV_SECRET


# ===== D. غياب الاعتمادادات: لا HTTP، رسالة واضحة، لا تسريب =====

@pytest.mark.parametrize('auth_type', ['OAUTH2', 'API_KEY'])
def test_missing_credentials_raise_before_any_http_request(auth_type):
    integration = _integration(auth_type=auth_type, client_id='', secret='')
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(integration)
        assert client.is_configured is False
        with mock.patch('httpx.post') as post, mock.patch('httpx.request') as request:
            with pytest.raises(WHOClientError) as exc:
                client._headers()
    assert 'WHO_IHR_CLIENT_ID' in str(exc.value)
    post.assert_not_called()
    request.assert_not_called()


def test_settings_credentials_configure_every_auth_type():
    for auth_type in ('OAUTH2', 'API_KEY', 'NONE'):
        with _env_settings():
            client = WHOClient(_integration(auth_type=auth_type, client_id='', secret=''))
        assert client.is_configured is True


def test_missing_credentials_error_does_not_leak_secrets(caplog):
    integration = _integration(client_id='', secret='')
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(integration)
        with pytest.raises(WHOClientError) as exc:
            client._headers()
    message = str(exc.value)
    assert ENV_SECRET not in message
    assert DB_SECRET not in message
    assert ENV_SECRET not in caplog.text
    assert DB_SECRET not in caplog.text


def test_api_key_mode_uses_client_id_as_bearer_without_secret():
    integration = _integration(auth_type='API_KEY', client_id='api-key-value', secret='')
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(integration)
        headers = client._headers()
    assert client._token_provider is None
    assert headers['Authorization'] == 'Bearer api-key-value'
    assert headers['Content-Type'] == 'application/json'


def test_none_auth_type_sends_no_authorization_header():
    integration = _integration(auth_type='NONE', client_id='', secret='')
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        headers = WHOClient(integration)._headers()
    assert 'Authorization' not in headers


# ===== E. طلب التوكن (مموّه) =====

def test_token_request_keeps_ihr_oauth_contract():
    with _env_settings(WHO_IHR_TOKEN_URL=''):
        client = WHOClient(_integration())
    with mock.patch('httpx.post', return_value=_token_response()) as post:
        assert client._token_provider.get_token() == 'ihr-access-token'
    assert post.call_args.args[0] == TOKEN_URL
    kwargs = post.call_args.kwargs
    assert kwargs['data'] == {
        'grant_type': 'client_credentials',
        'client_id': ENV_CLIENT_ID,
        'client_secret': ENV_SECRET,
    }
    assert 'auth' not in kwargs
    assert 'scope' not in kwargs['data']


def test_token_request_uses_settings_token_url_when_provided():
    with _env_settings():
        client = WHOClient(_integration())
    with mock.patch('httpx.post', return_value=_token_response()) as post:
        client._token_provider.get_token()
    assert post.call_args.args[0] == ENV_TOKEN_URL


def test_token_request_uses_db_credentials_when_env_absent():
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(_integration())
    with mock.patch('httpx.post', return_value=_token_response()) as post:
        client._token_provider.get_token()
    data = post.call_args.kwargs['data']
    assert data['client_id'] == DB_CLIENT_ID
    assert data['client_secret'] == DB_SECRET


def test_token_is_cached_and_not_leaked(caplog):
    with _env_settings():
        client = WHOClient(_integration())
    with mock.patch('httpx.post', return_value=_token_response('secret-issued-token')) as post:
        assert client._headers()['Authorization'] == 'Bearer secret-issued-token'
        assert client._headers()['Authorization'] == 'Bearer secret-issued-token'
    assert post.call_count == 1
    assert 'secret-issued-token' not in caplog.text
    assert ENV_SECRET not in caplog.text


# ===== F. سلوك IHR/Event client + سجل التدقيق (قاعدة بيانات) =====

@pytest.mark.django_db
def test_event_post_creates_sync_log_linked_to_integration(integration):
    from apps.who.models import WHOIntegration as IntegrationModel

    integration.is_active = True
    integration.save(update_fields=['is_active'])
    with _env_settings():
        client = WHOClient(integration)
        with mock.patch('httpx.post', return_value=_token_response()), \
                mock.patch('httpx.request', return_value=_api_response()) as request:
            result = client.post(
                WHOSyncLog.Operation.EVENT_SUBMIT, EVENT_PATH, {'event': 'E1'},
                resource_type='ihr_event', local_ref='E1',
            )
    assert result['status_code'] == 200
    assert request.call_args.args == ('POST', f'{BASE_URL}{EVENT_PATH}')
    headers = request.call_args.kwargs['headers']
    assert headers['Authorization'] == 'Bearer ihr-access-token'
    log = WHOSyncLog.objects.filter(integration=integration).latest('created_at')
    assert log.status == WHOSyncLog.Status.SUCCESS
    assert log.direction == WHOSyncLog.Direction.OUTBOUND
    assert log.local_ref == 'E1'
    integration.refresh_from_db()
    assert integration.last_success_at is not None
    assert IntegrationModel.objects.count() == 1


@pytest.mark.django_db
def test_event_post_without_credentials_fails_log_and_sends_no_request(integration):
    integration.client_id = ''
    integration.set_client_secret('')
    integration.save(update_fields=['client_id', 'client_secret_encrypted'])
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        client = WHOClient(integration)
        with mock.patch('httpx.request') as request:
            with pytest.raises(WHOClientError) as exc:
                client.post(
                    WHOSyncLog.Operation.EVENT_SUBMIT, EVENT_PATH, {'event': 'E1'},
                    resource_type='ihr_event', local_ref='E1',
                )
    request.assert_not_called()
    assert 'WHO_IHR_CLIENT_ID' in str(exc.value)
    log = WHOSyncLog.objects.filter(integration=integration).latest('created_at')
    assert log.status == WHOSyncLog.Status.FAILED
    assert log.completed_at is not None
    assert ENV_SECRET not in log.error_message
    integration.refresh_from_db()
    assert integration.last_error


@pytest.mark.django_db
def test_event_post_http_error_is_logged(integration):
    with _env_settings():
        client = WHOClient(integration)
        with mock.patch('httpx.post', return_value=_token_response()), \
                mock.patch('httpx.request', return_value=_api_response(status_code=500)):
            with pytest.raises(WHOClientError) as exc:
                client.post(WHOSyncLog.Operation.EVENT_SUBMIT, EVENT_PATH, {})
    assert 'HTTP 500' in str(exc.value)
    log = WHOSyncLog.objects.filter(integration=integration).latest('created_at')
    assert log.status == WHOSyncLog.Status.FAILED
    assert log.http_status == 500


@pytest.mark.django_db
def test_test_connection_reports_failure_without_credentials(integration):
    integration.client_id = ''
    integration.set_client_secret('')
    integration.save(update_fields=['client_id', 'client_secret_encrypted'])
    with _env_settings(WHO_IHR_CLIENT_ID='', WHO_IHR_CLIENT_SECRET='', WHO_IHR_TOKEN_URL=''):
        with mock.patch('httpx.request') as request:
            result = base_client.test_connection(integration)
    request.assert_not_called()
    assert result == {'connected': False}
    assert WHOSyncLog.objects.filter(integration=integration).exists()


@pytest.mark.django_db
def test_test_connection_success_path(integration):
    with _env_settings():
        with mock.patch('httpx.post', return_value=_token_response()), \
                mock.patch('httpx.request', return_value=_api_response(body={'status': 'ok'})):
            result = base_client.test_connection(integration)
    assert result['connected'] is True
    assert result['status_code'] == 200
