"""اختبارات عقد الإعدادات (configuration validation) — بلا شبكة وبلا قاعدة بيانات.

تثبت حدوداً واضحة بين ثلاث حالات:

  * DISABLED      → ``WHO_ENABLED=false`` : لا إرسال حتى مع اعتماد كامل
  * UNCONFIGURED  → مفعّل لكن الاعتماد ناقص
  * INVALID       → رابط مشوّه / مسار غير صالح
  * CONFIGURED    → مفعّل + اعتماد + إعدادات سليمة

وكذلك: لا تسريب للأسرار في أي وصف أو خطأ أو ``repr``.
"""

import json

import pytest
from django.test import override_settings

from apps.who.config import (
    SETTING_ICD_CLIENT_ID,
    SETTING_ICD_CLIENT_SECRET,
    SETTING_IHR_EVENTS_PATH,
    SETTING_IHR_STATUS_PATH,
    ConfigurationState,
    describe_configurations,
    is_http_url,
    is_valid_language,
    is_valid_relative_path,
    load_icd_configuration,
    load_ihr_configuration,
    setting,
)

FULL_ICD = {
    'WHO_ENABLED': True,
    'WHO_ICD_BASE_URL': 'https://id.who.int',
    'WHO_ICD_TOKEN_URL': 'https://icdaccessmanagement.who.int/connect/token',
    'WHO_ICD_CLIENT_ID': 'phase0-client-id',
    'WHO_ICD_CLIENT_SECRET': 'phase0-secret-placeholder',
}

FULL_IHR = {
    'WHO_ENABLED': True,
    'WHO_IHR_BASE_URL': 'https://sandbox.who.example.org',
    'WHO_IHR_TOKEN_URL': 'https://sandbox.who.example.org/ihr/oauth2/token',
    'WHO_IHR_CLIENT_ID': 'ihr-client-id',
    'WHO_IHR_CLIENT_SECRET': 'ihr-secret-placeholder',
}


# ===== أدوات تحقق نقية (بلا Django، بلا شبكة) =====

@pytest.mark.parametrize('value', ['https://id.who.int', 'http://localhost:8000', 'https://a.b/c?d=1'])
def test_valid_urls_accepted(value):
    assert is_http_url(value) is True


@pytest.mark.parametrize(
    'value',
    ['', None, 'id.who.int', 'ftp://id.who.int', 'https://', 'not-a-url', '//id.who.int'],
)
def test_malformed_urls_rejected(value):
    assert is_http_url(value) is False


@pytest.mark.parametrize('value', ['/ihr/status', '/api/v1/events'])
def test_relative_paths_accepted(value):
    assert is_valid_relative_path(value) is True


@pytest.mark.parametrize(
    'value',
    ['', 'status', 'https://who.example.org/status', '/ihr/ https://x', None],
)
def test_absolute_or_malformed_paths_rejected(value):
    assert is_valid_relative_path(value) is False


@pytest.mark.parametrize('value', ['ar', 'en', 'ar-EG', 'fr'])
def test_language_format_accepted(value):
    assert is_valid_language(value) is True


@pytest.mark.parametrize('value', ['', None, 'AR', 'arabic', 'ar-EG!', '1'])
def test_malformed_language_rejected(value):
    assert is_valid_language(value) is False


def test_setting_helper_falls_back_without_django_settings():
    import inspect
    from unittest import mock

    from apps.who import config as config_module
    from django.core.exceptions import ImproperlyConfigured

    unconfigured = mock.Mock()
    type(unconfigured).__getattr__ = mock.Mock(
        side_effect=ImproperlyConfigured('Settings are not configured.'),
    )
    with mock.patch('apps.who.config.settings', unconfigured):
        assert setting('WHO_ICD_CLIENT_SECRET', 'fallback') == 'fallback'
    assert 'setting(' in inspect.getsource(config_module.setting)


# ===== ICD-11: الحالات الأربع =====

def test_icd_state_disabled_by_default():
    # عزل صريح: «معطّل» حالة مشتقّة من القيمة، لا من غيابها في البيئة.
    # بدون override_settings كانت القراءة تلتقط ``WHO_ENABLED`` من ``.env``
    # الحقيقي، فيفشل الاختبار لمجرد تفعيل التكامل محلياً.
    with override_settings(WHO_ENABLED=False):
        config = load_icd_configuration()
    assert config.enabled is False
    assert config.state is ConfigurationState.DISABLED
    assert config.can_connect is False


def test_icd_state_unconfigured_when_enabled_without_credentials():
    with override_settings(WHO_ENABLED=True, WHO_ICD_CLIENT_ID='', WHO_ICD_CLIENT_SECRET=''):
        config = load_icd_configuration()
    assert config.state is ConfigurationState.UNCONFIGURED
    assert config.can_connect is False


def test_icd_state_configured_with_full_settings():
    with override_settings(**FULL_ICD):
        config = load_icd_configuration()
    assert config.state is ConfigurationState.CONFIGURED
    assert config.can_connect is True


def test_icd_state_invalid_on_malformed_url():
    values = {**FULL_ICD, 'WHO_ICD_BASE_URL': 'id.who.int'}
    with override_settings(**values):
        config = load_icd_configuration()
    assert config.state is ConfigurationState.INVALID
    assert config.can_connect is False
    assert any('WHO_ICD_BASE_URL' in issue for issue in config.issues)


def test_icd_explicit_arguments_win_over_settings():
    with override_settings(**FULL_ICD):
        config = load_icd_configuration(
            base_url='https://sandbox.example.org',
            client_id='explicit-id',
            client_secret='explicit-secret',
        )
    assert config.base_url == 'https://sandbox.example.org'
    assert config.client_id == 'explicit-id'
    assert config.client_secret == 'explicit-secret'


def test_icd_defaults_to_official_urls_when_settings_empty():
    with override_settings(
        WHO_ICD_BASE_URL='',
        WHO_ICD_TOKEN_URL='',
        WHO_ICD_API_VERSION='',
        WHO_ICD_SCOPE='',
    ):
        config = load_icd_configuration()
    assert config.base_url == 'https://id.who.int'
    assert config.token_url == 'https://icdaccessmanagement.who.int/connect/token'
    assert config.api_version == 'v2'
    assert config.scope == 'icdapi_access'


# ===== IHR: لا افتراضيات، ومسارات غير مؤكدة =====

def test_ihr_has_no_invented_defaults():
    config = load_ihr_configuration()
    assert config.base_url == ''
    assert config.token_url == ''
    assert config.events_path == ''
    assert config.status_path == ''
    assert config.has_events_endpoint is False
    assert config.has_status_endpoint is False


def test_ihr_state_disabled_by_default():
    with override_settings(**{**FULL_IHR, 'WHO_ENABLED': False}):
        config = load_ihr_configuration()
    assert config.state is ConfigurationState.DISABLED
    assert config.can_connect is False


def test_ihr_state_configured_when_enabled_and_complete():
    with override_settings(**FULL_IHR):
        config = load_ihr_configuration()
    assert config.state is ConfigurationState.CONFIGURED
    assert config.can_connect is True


def test_ihr_token_url_is_required_and_never_derived():
    """WHO_IHR_TOKEN_URL إلزامية: الفارغة = UNCONFIGURED بلا أي اشتقاق."""
    with override_settings(**{**FULL_IHR, 'WHO_IHR_TOKEN_URL': ''}):
        config = load_ihr_configuration()
    assert config.token_url == ''
    assert config.has_token_endpoint is False
    assert config.state is ConfigurationState.UNCONFIGURED
    assert config.can_connect is False

    # لا يُبنَى أي رابط توكن من الأساس، لا في base_url ولا في token_url.
    assert f'{config.base_url}/oauth2/token' not in (config.token_url,)
    assert config.token_url != f'{FULL_IHR["WHO_IHR_BASE_URL"]}/oauth2/token'


def test_ihr_derivation_removed_from_source():
    """حارس انحراف: منطق الاشتقاق التاريخي لم يعد موجوداً في الشيفرة المنفَّذة.

    يُفحص الكود بعد حذف التعليقات (ast.unparse) حتى لا يوهم شرحٌ نصي
    بوجود منطق اشتقاق.
    """
    import ast
    import inspect
    import textwrap

    from apps.who import config as config_module
    from apps.who.clients import base_client

    def _code_only(target):
        # dedent لأن inspect.getsource لعنصر داخل class يعيد كوداً مُزاحاً،
        # و ast.unparse يُسقط التعليقات تلقائياً.
        source = textwrap.dedent(inspect.getsource(target))
        return ast.unparse(ast.parse(source))

    for target in (
        config_module.load_ihr_configuration,
        config_module.IHRConfiguration,
        base_client.OAuth2TokenProvider,
        base_client.OAuth2TokenProvider.get_token,
        base_client.WHOClient.__init__,
    ):
        code = _code_only(target)
        assert 'oauth2/token' not in code, f'اشتقاق باقٍ في {target}'
        assert "rstrip('/oauth2" not in code


def test_ihr_endpoints_require_explicit_relative_paths():
    values = {
        **FULL_IHR,
        'WHO_IHR_EVENTS_PATH': '/ihr/events',
        'WHO_IHR_STATUS_PATH': '/ihr/status',
    }
    with override_settings(**values):
        config = load_ihr_configuration()
    assert config.has_events_endpoint is True
    assert config.has_status_endpoint is True

    with override_settings(**{**values, 'WHO_IHR_EVENTS_PATH': 'https://who.example.org/events'}):
        assert load_ihr_configuration().has_events_endpoint is False


def test_ihr_malformed_path_is_reported_as_invalid_not_silently_ignored():
    """مسار مكتوب بشكل خاطئ خطأ إعداد ظاهر — لا يُهمَل بصمت."""
    with override_settings(
        **{**FULL_IHR, 'WHO_IHR_STATUS_PATH': 'not-a-path', 'WHO_IHR_EVENTS_PATH': 'events'}
    ):
        config = load_ihr_configuration()
    assert config.state is ConfigurationState.INVALID
    assert config.can_connect is False
    assert any(SETTING_IHR_STATUS_PATH in issue for issue in config.issues)
    assert any(SETTING_IHR_EVENTS_PATH in issue for issue in config.issues)
    assert config.has_status_endpoint is False
    assert config.has_events_endpoint is False


def test_ihr_state_invalid_on_malformed_base_url():
    with override_settings(**{**FULL_IHR, 'WHO_IHR_BASE_URL': 'sandbox.who.example.org'}):
        config = load_ihr_configuration()
    assert config.state is ConfigurationState.INVALID
    assert config.can_connect is False


# ===== IHR و ICD-11 منفصلان =====

def test_icd_credentials_never_satisfy_ihr():
    with override_settings(
        WHO_ENABLED=True,
        WHO_ICD_CLIENT_ID=FULL_ICD['WHO_ICD_CLIENT_ID'],
        WHO_ICD_CLIENT_SECRET=FULL_ICD['WHO_ICD_CLIENT_SECRET'],
        WHO_IHR_CLIENT_ID='',
        WHO_IHR_CLIENT_SECRET='',
    ):
        assert load_icd_configuration().has_credentials is True
        assert load_ihr_configuration().has_credentials is False


# ===== منع تسريب الأسرار =====

def test_redacted_descriptions_never_contain_secrets(caplog):
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        report = describe_configurations()
    serialized = json.dumps(report, ensure_ascii=False)
    for secret in (FULL_ICD['WHO_ICD_CLIENT_SECRET'], FULL_IHR['WHO_IHR_CLIENT_SECRET']):
        assert secret not in serialized
        assert secret not in caplog.text
    assert report['icd11']['client_secret_set'] is True
    assert report['ihr']['client_secret_set'] is True
    assert report['icd11']['client_id_set'] is True


def test_redacted_reports_never_contain_client_id_value():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        report = describe_configurations()
    serialized = json.dumps(report, ensure_ascii=False)
    assert FULL_ICD['WHO_ICD_CLIENT_ID'] not in serialized
    assert FULL_IHR['WHO_IHR_CLIENT_ID'] not in serialized


# ===== الأسماء القديمة (deprecated) =====

def test_legacy_env_names_are_surfaced_as_warning_only():
    values = {**FULL_ICD, 'WHO_LEGACY_ENV_IN_USE': ['WHO_CLIENT_ID', 'WHO_CLIENT_SECRET']}
    with override_settings(**values):
        config = load_icd_configuration()
    assert config.legacy_env_names == ('WHO_CLIENT_ID', 'WHO_CLIENT_SECRET')
    # تحذير فقط: لا يمنع التشغيل ولا يمنع صلاحية الاتصال.
    assert config.can_connect is True
    assert config.state is ConfigurationState.CONFIGURED


def test_legacy_env_names_do_not_affect_ihr():
    with override_settings(WHO_LEGACY_ENV_IN_USE=['WHO_CLIENT_ID']):
        assert load_ihr_configuration().legacy_env_names == ('WHO_CLIENT_ID',)
        assert load_ihr_configuration().has_credentials is False


# ===== الأسماء القانونية كما هي =====

def test_every_canonical_name_is_defined_in_django_settings():
    """حارس انحراف: كل اسم في العقد موجود فعلياً في nqp_backend.settings."""
    from django.conf import settings as django_settings

    from apps.who import config as config_module

    canonical = {
        getattr(config_module, name)
        for name in dir(config_module)
        if name.startswith('SETTING_')
    }
    assert canonical, 'لم يُعثر على أسماء إعدادات في العقد'
    assert all(name.startswith('WHO_') for name in canonical)
    for name in canonical:
        assert hasattr(django_settings, name), f'{name} غير معرّف في settings.py'
