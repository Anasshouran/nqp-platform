"""اختبارات ICD11Client — بدون شبكة ولا قاعدة بيانات.

تثبت إصلاح shadowing بين خاصية `_token_cache` ودالة `_token()`،
وسلوك الـ cache، وسلامة search()، وعدم تسريب بيانات الاعتماد.
"""

from unittest import mock

import httpx
import pytest

from apps.who.clients.icd_client import ICD11Client

BASE_URL = 'https://icd.who.int/icdapi'
TOKEN_URL = f'{BASE_URL}/oauth2/token'
SEARCH_URL = f'{BASE_URL}/v2/search'


def _client(secret='leak-guard-secret-123'):
    return ICD11Client(base_url=BASE_URL, client_id='who-client', client_secret=secret)


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
            {'id': 'http://id.who.int/icd/entity/AB1.00', 'title': 'Cholera'},
        ]
    }
    return resp


def test_token_method_is_callable():
    assert callable(ICD11Client._token)


def test_token_cache_reuses_single_request():
    client = _client()
    with mock.patch('httpx.post', return_value=_ok_token_response('cache-token')) as post:
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
    assert get.call_args.kwargs['headers']['Authorization'] == 'Bearer access-token-abc'
    assert post.call_count == 1


def test_search_and_entity_share_cached_token():
    client = _client()
    entity_resp = mock.Mock()
    entity_resp.status_code = 200
    entity_resp.json.return_value = {'id': 'http://id.who.int/icd/entity/AB1.00', 'title': 'كوليرا'}
    with mock.patch('httpx.post', return_value=_ok_token_response()) as post, \
            mock.patch('httpx.get', side_effect=[_ok_search_response(), entity_resp]) as get:
        client.search('Cholera', language='en')
        client.entity('http://id.who.int/icd/entity/AB1.00', language='ar')
    assert post.call_count == 1
    assert get.call_count == 2
    for call in get.call_args_list:
        assert call.kwargs['headers']['Authorization'] == 'Bearer access-token-abc'


def test_failed_token_request_does_not_leak_credentials(caplog):
    secret = 'leak-guard-secret-123'
    client = _client(secret=secret)
    request = httpx.Request('POST', TOKEN_URL)
    response = httpx.Response(401, request=request)
    with mock.patch(
        'httpx.post',
        side_effect=httpx.HTTPStatusError('unauthorized', request=request, response=response),
    ), pytest.raises(httpx.HTTPStatusError) as exc:
        client._token()
    assert secret not in caplog.text
    assert secret not in str(exc.value)


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
    assert post.call_count == 1
