"""اختبارات فحص اتصال WHO المُتحقَّق منه — بلا شبكة حقيقية وبلا اعتماد.

تغطي التسلسل المطلوب في Phase 2B:
    إعدادات ← OAuth ← طلب مصادَق ← تحقّق من الرد ← تطبيع ← تسجيل

وتثبت الانضباط الأهم:
  • ``CONFIGURED`` لا تُعرض كـ«متصل» — لا دليل بلا فحص.
  * لا طلب شبكة إطلاقاً عند غياب الاعتماد أو تعطيل ``WHO_ENABLED``.
  * لا توكن ولا سر ولا رأس ``Authorization`` في النتيجة ولا في السجل ولا في
    حمولة ``/who/integrations/status/``.
  * الفشل (مصادقة/مهلة/HTTP/رد غير صالح) يعطي ``ERROR`` لا ``READY``.
  * لا IHR ولا مزامنة أمراض — الفحص طلب واحد للقراءة فقط.
"""

from unittest import mock

import httpx
import pytest
from django.test import override_settings

from apps.who.clients.icd_client import ICD11Client
from apps.who.models import WHOSyncLog
from apps.who.services.connectivity import (
    ICD_VERIFICATION_PATH,
    ConnectivityState,
    UNVERIFIED_STATE_NAMES,
    connectivity_from_log,
    describe_connectivity,
    latest_connectivity_check,
    record_connectivity_check,
    verify_icd11_connectivity,
)

pytestmark = pytest.mark.django_db

BASE_URL = 'https://id.who.int'
TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
CLIENT_ID = 'test-client-id'
CLIENT_SECRET = 'test-client-secret'
ACCESS_TOKEN = 'test-access-token-value'
VERIFY_URL = f'{BASE_URL}{ICD_VERIFICATION_PATH}'

CONFIG = {
    'WHO_ENABLED': True,
    'WHO_ICD_BASE_URL': BASE_URL,
    'WHO_ICD_TOKEN_URL': TOKEN_URL,
    'WHO_ICD_CLIENT_ID': CLIENT_ID,
    'WHO_ICD_CLIENT_SECRET': CLIENT_SECRET,
}


def _config(**overrides):
    return override_settings(**{**CONFIG, **overrides})


# ============================================================
# أدوات تثليث الردود (بلا شبكة)
# ============================================================


def _token_ok(token=ACCESS_TOKEN):
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'access_token': token}
    return resp


def _entity_ok():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {
        '@id': f'{VERIFY_URL}?releaseId=mms',
        '@context': 'http://id.who.int/icd/context',
        'availableLanguages': ['en', 'ar'],
        'allReleases': ['mms', '2024-01'],
        'releaseId': 'mms',
    }
    return resp


def _entity_no_id():
    """200 لكن بدون ``@id`` — لا يُعدّ تحقّقاً ناجحاً."""
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'unexpected': 'shape'}
    return resp


def _entity_not_json():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.side_effect = ValueError('not json')
    return resp


def _http_error(status_code):
    request = httpx.Request('GET', VERIFY_URL)
    response = httpx.Response(status_code, request=request)
    return httpx.HTTPStatusError('boom', request=request, response=response)


# ============================================================
# 1. النجاح: OAuth + مورد ICD
# ============================================================


def test_successful_oauth_and_connectivity_is_ready():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        result = verify_icd11_connectivity()

    assert result.state is ConnectivityState.READY
    assert result.is_verified is True
    assert result.oauth_verified is True
    assert result.api_verified is True
    assert result.http_status == 200
    assert result.endpoint == VERIFY_URL
    assert result.latency_ms is not None and result.latency_ms >= 0
    assert result.checked_at is not None


def test_verification_request_uses_documented_path_and_headers():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()) as post, \
            mock.patch('httpx.get', return_value=_entity_ok()) as get:
        verify_icd11_connectivity()

    assert get.call_args.args[0] == VERIFY_URL
    headers = get.call_args.kwargs['headers']
    assert headers['API-Version'] == 'v2'
    assert headers['Accept'] == 'application/json'
    assert headers['Accept-Language'] == 'en'
    assert headers['Authorization'] == f'Bearer {ACCESS_TOKEN}'

    # نقطة التوكن الرسمية + منح client_credentials + scope الموثّق
    assert post.call_args.args[0] == TOKEN_URL
    assert post.call_args.kwargs['auth'] == (CLIENT_ID, CLIENT_SECRET)
    assert post.call_args.kwargs['data']['grant_type'] == 'client_credentials'
    assert post.call_args.kwargs['data']['scope'] == 'icdapi_access'


def test_only_one_get_is_sent():
    """الفحص Controlled: طلب قراءة واحد فقط — لا مزامنة ولا تعداد."""
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()) as get:
        verify_icd11_connectivity()
    assert get.call_count == 1


# ============================================================
# 2. فشل المصادقة
# ============================================================


def test_authentication_failure_is_error_and_never_ready():
    with _config(), mock.patch('httpx.post', side_effect=_http_error(401)), \
            mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()

    assert result.state is ConnectivityState.ERROR
    assert result.is_verified is False
    assert result.http_status == 401
    assert get.call_count == 0, 'لا طلب مورد بعد فشل المصادقة'


def test_auth_failure_message_does_not_quote_secret_or_token():
    with _config(), mock.patch('httpx.post', side_effect=_http_error(401)):
        result = verify_icd11_connectivity()
    assert CLIENT_SECRET not in result.message
    assert ACCESS_TOKEN not in result.message


def test_missing_access_token_in_token_response_is_error():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = {'token_type': 'Bearer'}  # بلا access_token
    with _config(), mock.patch('httpx.post', return_value=resp), \
            mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert get.call_count == 0


# ============================================================
# 3. مهلة النوع (timeout) في كل مرحلة
# ============================================================


def test_token_timeout_is_error():
    with _config(), mock.patch('httpx.post', side_effect=httpx.TimeoutException('slow')), \
            mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert result.oauth_verified is False
    assert get.call_count == 0


def test_api_timeout_is_error_but_oauth_stays_verified():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', side_effect=httpx.TimeoutException('slow')):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert result.oauth_verified is True
    assert result.api_verified is False


def test_transport_error_is_reported_without_leaking_detail():
    with _config(), mock.patch('httpx.post', side_effect=httpx.ConnectError('refused')), \
            mock.patch('httpx.get'):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert CLIENT_SECRET not in result.message


# ============================================================
# 4. خطأ HTTP على المورد
# ============================================================


@pytest.mark.parametrize('status_code', [400, 401, 403, 404, 500, 503])
def test_http_error_on_resource_is_never_ready(status_code):
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', side_effect=_http_error(status_code)):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert result.is_verified is False


def test_non_2xx_response_status_is_reported():
    resp = httpx.Response(503, request=httpx.Request('GET', VERIFY_URL))
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=resp):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert result.http_status == 503
    assert result.oauth_verified is True


# ============================================================
# 5. رد غير صالح
# ============================================================


def test_response_without_resource_id_is_error_not_ready():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_no_id()):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR
    assert result.api_verified is False
    assert result.oauth_verified is True


def test_non_json_response_is_error():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_not_json()):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR


def test_json_array_response_is_error():
    resp = mock.Mock()
    resp.status_code = 200
    resp.json.return_value = [1, 2, 3]
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=resp):
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.ERROR


# ============================================================
# 6. غياب الإعدادات — لا طلب شبكة إطلاقاً
# ============================================================


def test_missing_credentials_sends_no_request():
    with override_settings(
        WHO_ENABLED=True, WHO_ICD_BASE_URL=BASE_URL, WHO_ICD_TOKEN_URL=TOKEN_URL,
        WHO_ICD_CLIENT_ID='', WHO_ICD_CLIENT_SECRET='',
    ), mock.patch('httpx.post') as post, mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()

    assert result.state is ConnectivityState.UNCONFIGURED
    assert result.is_verified is False
    post.assert_not_called()
    get.assert_not_called()


def test_disabled_integration_sends_no_request():
    with override_settings(
        WHO_ENABLED=False, WHO_ICD_BASE_URL=BASE_URL, WHO_ICD_TOKEN_URL=TOKEN_URL,
        WHO_ICD_CLIENT_ID=CLIENT_ID, WHO_ICD_CLIENT_SECRET=CLIENT_SECRET,
    ), mock.patch('httpx.post') as post, mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()

    assert result.state is ConnectivityState.DISABLED
    assert result.is_verified is False
    post.assert_not_called()
    get.assert_not_called()


def test_invalid_base_url_is_invalid_not_ready():
    with override_settings(
        WHO_ENABLED=True, WHO_ICD_BASE_URL='not-a-url', WHO_ICD_TOKEN_URL=TOKEN_URL,
        WHO_ICD_CLIENT_ID=CLIENT_ID, WHO_ICD_CLIENT_SECRET=CLIENT_SECRET,
    ), mock.patch('httpx.post') as post, mock.patch('httpx.get') as get:
        result = verify_icd11_connectivity()
    assert result.state is ConnectivityState.INVALID
    post.assert_not_called()
    get.assert_not_called()


# ============================================================
# 7. عدم تسرّب الأسرار والتوكنات
# ============================================================


def test_ready_result_carries_no_token_or_secret():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        result = verify_icd11_connectivity()

    blob = repr(result.as_payload())
    assert ACCESS_TOKEN not in blob
    assert CLIENT_SECRET not in blob
    assert CLIENT_ID not in blob
    assert 'Authorization' not in blob
    assert 'Bearer' not in blob


def test_recorded_log_stores_no_token_secret_or_payload():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        result = verify_icd11_connectivity()
    log = record_connectivity_check(result)

    assert log.operation == WHOSyncLog.Operation.STATUS_CHECK
    assert log.status == WHOSyncLog.Status.SUCCESS
    assert log.http_status == 200
    assert log.request_payload == {}
    assert log.completed_at is not None

    blob = repr(log.response_payload)
    assert ACCESS_TOKEN not in blob
    assert CLIENT_SECRET not in blob
    assert CLIENT_ID not in blob
    # لا حمولة WHO: فقط بيانات وصفية
    assert set(log.response_payload) == {
        'state', 'oauth_verified', 'api_verified', 'http_status',
        'latency_ms', 'api_version', 'endpoint_path',
    }
    assert 'availableLanguages' not in blob
    assert '@context' not in blob


def test_failed_check_is_recorded_as_failed_with_safe_message():
    with _config(), mock.patch('httpx.post', side_effect=_http_error(401)):
        result = verify_icd11_connectivity()
    log = record_connectivity_check(result)

    assert log.status == WHOSyncLog.Status.FAILED
    assert CLIENT_SECRET not in log.error_message
    assert ACCESS_TOKEN not in log.error_message


def test_status_payload_never_contains_credentials():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        record_connectivity_check(verify_icd11_connectivity())
        payload = describe_connectivity()

    blob = repr(payload)
    assert ACCESS_TOKEN not in blob
    assert CLIENT_SECRET not in blob
    assert CLIENT_ID not in blob
    assert 'Bearer' not in blob
    assert 'Authorization' not in blob


# ============================================================
# 8. التسجيل والقراءة — الحالة لا تُستنتج من|last_success_at|
# ============================================================


def test_status_is_configured_before_any_check():
    with _config():
        payload = describe_connectivity()
    assert payload['state'] == ConnectivityState.CONFIGURED.value
    assert payload['configured'] is True
    assert payload['connected'] is False
    assert payload['verified'] is False
    assert payload['verified_at'] is None


def test_configured_is_not_a_verified_state():
    assert ConnectivityState.CONFIGURED.value in UNVERIFIED_STATE_NAMES
    assert ConnectivityState.READY.value not in UNVERIFIED_STATE_NAMES
    assert ConnectivityState.CONFIGURED.is_verified is False


def test_status_reflects_recorded_ready_check():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        record_connectivity_check(verify_icd11_connectivity())
        payload = describe_connectivity()

    assert payload['state'] == ConnectivityState.READY.value
    assert payload['connected'] is True
    assert payload['verified'] is True
    assert payload['oauth_verified'] is True
    assert payload['api_verified'] is True
    assert payload['verified_http_status'] == 200
    assert payload['verified_at'] is not None


def test_status_reflects_recorded_error_check():
    with _config(), mock.patch('httpx.post', side_effect=_http_error(401)):
        record_connectivity_check(verify_icd11_connectivity())
        payload = describe_connectivity()

    assert payload['state'] == ConnectivityState.ERROR.value
    assert payload['connected'] is False
    assert payload['verified'] is False
    assert payload['verified_http_status'] == 401


def test_last_success_at_alone_does_not_imply_connected():
    """الدرع الأساسي: نجاح مزامنة قديم ليس دليل اتصال حالي."""
    from apps.who.models import WHOIntegration

    integration = WHOIntegration.objects.create(
        name='legacy-sync', base_url=BASE_URL, is_active=True,
    )
    from django.utils import timezone
    integration.last_success_at = timezone.now()
    integration.save(update_fields=['last_success_at'])

    with _config():
        payload = describe_connectivity()

    assert integration.last_success_at is not None
    assert payload['last_success_at'] is not None
    assert payload['connected'] is False
    assert payload['verified'] is False


def test_latest_check_is_read_in_newest_first_order():
    with _config():
        older = record_connectivity_check(_synthetic('CONFIGURED'))
        newer = record_connectivity_check(_synthetic('ERROR'))
    assert latest_connectivity_check().id == newer.id
    assert connectivity_from_log(older).state is ConnectivityState.CONFIGURED
    assert connectivity_from_log(newer).state is ConnectivityState.ERROR


def _synthetic(state_value):
    from datetime import timedelta

    from django.utils import timezone

    from apps.who.services.connectivity import WHOConnectivityResult

    return WHOConnectivityResult(
        state=ConnectivityState(state_value),
        message='synthetic',
        checked_at=timezone.now() + timedelta(seconds=1),
    )


def test_unreadable_stored_state_does_not_claim_verified():
    log = WHOSyncLog.objects.create(
        operation=WHOSyncLog.Operation.STATUS_CHECK,
        direction=WHOSyncLog.Direction.OUTBOUND,
        response_payload={'state': 'SOMETHING_ELSE'},
        status=WHOSyncLog.Status.SUCCESS,
    )
    result = connectivity_from_log(log)
    assert result.is_verified is False
    assert result.state is ConnectivityState.CONFIGURED


def test_missing_log_yields_no_verification():
    assert latest_connectivity_check() is None
    assert connectivity_from_log(None) is None


# ============================================================
# 9. IHR يبقى غير مُرسِل وغير مُتحقَّق
# ============================================================


def test_ihr_state_reported_without_claiming_verification():
    with _config():
        payload = describe_connectivity()
    assert payload['ihr_state'] in {'DISABLED', 'UNCONFIGURED', 'INVALID', 'CONFIGURED'}
    assert 'ihr_verified' not in payload
    assert 'ihr_http_status' not in payload


def test_ihr_status_path_is_never_invented():
    from apps.who.config import load_ihr_configuration

    with override_settings(WHO_IHR_BASE_URL='', WHO_IHR_TOKEN_URL='', WHO_IHR_STATUS_PATH=''):
        config = load_ihr_configuration()
    assert config.status_path == ''
    assert config.has_status_endpoint is False


# ============================================================
# 10. العزل: الفحص لا يلمس المزامنة ولا الإرسال
# ============================================================


def test_check_does_not_touch_disease_sync_or_event_submission():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()), \
            mock.patch('apps.who.services.disease_service.sync_diseases_from_icd11') as sync, \
            mock.patch('apps.who.services.event_service.submit_event_to_who') as submit:
        record_connectivity_check(verify_icd11_connectivity())
    sync.assert_not_called()
    submit.assert_not_called()


def test_check_writes_exactly_one_status_check_log():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        record_connectivity_check(verify_icd11_connectivity())
    assert WHOSyncLog.objects.filter(operation=WHOSyncLog.Operation.STATUS_CHECK).count() == 1


def test_verify_function_performs_no_database_write():
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        verify_icd11_connectivity()
    assert WHOSyncLog.objects.count() == 0


def test_client_injection_is_honoured():
    """حقن عميل يسمح بالتثليث دون لمس الإعدادات.

    يُبنى العميل **داخل** سياق الإعدادات: ``ICD11Client`` يقرأ
    ``WHO_ENABLED`` وقت البناء، وقراءته خارجه تعطي عميلاً معطّلاً.
    """
    with _config(), mock.patch('httpx.post', return_value=_token_ok()), \
            mock.patch('httpx.get', return_value=_entity_ok()):
        client = ICD11Client(
            base_url=BASE_URL, client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET, token_url=TOKEN_URL,
        )
        result = verify_icd11_connectivity(client=client)
    assert result.state is ConnectivityState.READY
    assert result.endpoint == VERIFY_URL
