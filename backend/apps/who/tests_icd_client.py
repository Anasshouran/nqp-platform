"""اختبارات ICD11Client — بدون شبكة ولا قاعدة بيانات.

تثبت الانضباط لوثائق WHO ICD-API (إصدار 2):
  • نقطة إصدار التوكن الرسمية https://icdaccessmanagement.who.int/connect/token
  • مصادقة HTTP Basic (client_id/client_secret) — دون إرسالهما في الجسم
  • grant_type = client_credentials مع scope = icdapi_access
  • فصل نقطة التوكن عن قاعدة ICD API (https://id.who.int)
  • رأس API-Version: v2 على كل طلبات API
  • سلوك الـ cache وعدم تسريب السّر أو access_token
"""

from unittest import mock

import httpx
import pytest

from apps.who.clients.icd_client import ICD11Client

BASE_URL = 'https://id.who.int'
TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
SEARCH_URL = f'{BASE_URL}/icd/entity/search'
ENTITY_URI = 'https://id.who.int/icd/entity/257068234'
CLIENT_ID = 'who-client'
SECRET = 'leak-guard-secret-123'


def _client(secret=SECRET):
    return ICD11Client(
        base_url=BASE_URL,
        client_id=CLIENT_ID,
        client_secret=secret,
        token_url=TOKEN_URL,
    )


def _ok_token_response(token='access-token-abc'):
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'access_token': token}
    return resp


def _ok_search_response(entities=None):
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {
        'destinationEntities': entities or [
            {'id': ENTITY_URI, 'title': 'Cholera'},
        ]
    }
    return resp


def _ok_entity_response():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'id': ENTITY_URI, 'title': 'كوليرا'}
    return resp


def test_token_method_is_callable():
    assert callable(ICD11Client._token)


def test_token_request_uses_official_token_endpoint():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post:
        token = client._token()
    assert token == 'access-token-abc'
    post.assert_called_once()
    assert post.call_args.args[0] == TOKEN_URL


def test_token_request_uses_http_basic_auth_only():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post:
        client._token()
    kwargs = post.call_args.kwargs
    assert kwargs['auth'] == (CLIENT_ID, SECRET)
    secret = client.client_secret
    assert secret not in kwargs.get('data', {}).values()
    assert 'client_id' not in kwargs.get('data', {})
    assert 'client_secret' not in kwargs.get('data', {})
    assert 'client_id' not in kwargs.get('params', {})


def test_token_request_uses_client_credentials_grant():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post:
        client._token()
    assert post.call_args.kwargs['data']['grant_type'] == 'client_credentials'


def test_token_request_sends_icdapi_access_scope():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post:
        client._token()
    assert post.call_args.kwargs['data']['scope'] == 'icdapi_access'


def test_token_cache_reuses_single_request():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response('cache-token')) as post:
        assert client._token() == 'cache-token'
        assert client._token() == 'cache-token'
        assert client._token() == 'cache-token'
        assert post.call_count == 1
    assert client._token_cache == 'cache-token'


def test_search_does_not_raise_type_error_from_shadowing():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post, \
            mock.patch('httpx.get', return_value=_ok_search_response()) as get:
        results = client.search('Cholera', language='en')
    assert results[0]['title'] == 'Cholera'
    assert get.call_args.args[0] == SEARCH_URL
    assert get.call_args.kwargs['params'] == {'q': 'Cholera'}
    assert get.call_args.kwargs['headers']['Authorization'] == 'Bearer access-token-abc'
    assert post.call_count == 1


def test_search_uses_api_v2_accept_language_headers():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()), \
            mock.patch('httpx.get', return_value=_ok_search_response()) as get:
        client.search('Cholera', language='ar')
    headers = get.call_args.kwargs['headers']
    assert headers['API-Version'] == 'v2'
    assert headers['Accept-Language'] == 'ar'
    assert headers['Accept'] == 'application/json'


def test_entity_uses_entity_uri_as_endpoint():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post, \
            mock.patch('httpx.get', return_value=_ok_entity_response()) as get:
        client.entity(ENTITY_URI, language='ar')
    assert get.call_args.args[0] == ENTITY_URI
    assert get.call_args.kwargs['headers']['API-Version'] == 'v2'
    assert get.call_args.kwargs['headers']['Accept-Language'] == 'ar'
    assert get.call_args.kwargs['headers']['Authorization'] == 'Bearer access-token-abc'
    assert post.call_count == 1


def test_entity_builds_path_for_non_uri_identifier():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()), \
            mock.patch('httpx.get', return_value=_ok_entity_response()) as get:
        client.entity('AB1.00', language='en')
    assert get.call_args.args[0] == f'{BASE_URL}/icd/entity/AB1.00'


def test_search_and_entity_share_cached_token():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post, \
            mock.patch(
                'httpx.get',
                side_effect=[_ok_search_response(), _ok_entity_response()],
            ) as get:
        client.search('Cholera', language='en')
        client.entity(ENTITY_URI, language='ar')
    assert post.call_count == 1
    assert get.call_count == 2
    for call in get.call_args_list:
        assert call.kwargs['headers']['Authorization'] == 'Bearer access-token-abc'
        assert call.kwargs['headers']['API-Version'] == 'v2'


def test_failed_token_request_does_not_leak_credentials(caplog):
    client = _client()
    request = httpx.Request('POST', TOKEN_URL)
    response = httpx.Response(401, request=request)
    with mock.patch(
        'httpx.post',
        side_effect=httpx.HTTPStatusError('unauthorized', request=request, response=response),
    ), pytest.raises(httpx.HTTPStatusError) as exc:
        client._token()
    assert client.client_secret not in caplog.text
    assert client.client_secret not in str(exc.value)


def test_search_failure_does_not_leak_access_token(caplog):
    client = _client()
    request = httpx.Request('GET', SEARCH_URL)
    response = httpx.Response(500, request=request)
    with mock.patch('httpx.post', return_value=_ok_token_response('leaked-token-xyz')) as post, \
            mock.patch(
                'httpx.get',
                side_effect=httpx.HTTPStatusError('boom', request=request, response=response),
            ), pytest.raises(httpx.HTTPStatusError) as exc:
        client.search('Cholera')
    assert 'leaked-token-xyz' not in caplog.text
    assert 'leaked-token-xyz' not in str(exc.value)
    assert post.call_count == 1