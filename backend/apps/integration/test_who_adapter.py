"""اختبارات محوّل WHO — إثبات أن العقد يُحترم بلا أي اتصال.

المفتاح في هذا الملف: **لا اختبار واحد يتصل بأي شيء**. كل ادعاء عن
الجاهزية أو التنفيذ يمرّ عبر نقل وهمي مُحقَن أو يُرفض قبل أي I/O.
"""

import pytest
from django.test import override_settings

from apps.integration.adapters.who import (
    ICD11_NAMESPACE,
    IHR_NAMESPACE,
    WHO_ORGANIZATION,
    ICD11Adapter,
    IHREventAdapter,
    IHREventContract,
    WHOAdapter,
    WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED,
)
from apps.integration.organizations import (
    AuditOutcome,
    AuthenticationType,
    Capability,
    EndpointContractError,
    ErrorCategory,
    IntegrationError,
    IntegrationReadiness,
    IntegrationStatus,
    OrganizationAdapter,
    OrganizationType,
)

FULL_ICD = {
    'WHO_ENABLED': True,
    'WHO_ICD_BASE_URL': 'https://id.who.int',
    'WHO_ICD_TOKEN_URL': 'https://icdaccessmanagement.who.int/connect/token',
    'WHO_ICD_CLIENT_ID': 'placeholder-client-id',
    'WHO_ICD_CLIENT_SECRET': 'placeholder-client-secret',
}
FULL_IHR = {
    'WHO_ENABLED': True,
    'WHO_IHR_BASE_URL': 'https://sandbox.invalid',
    'WHO_IHR_TOKEN_URL': 'https://sandbox.invalid/ihr/oauth2/token',
    'WHO_IHR_CLIENT_ID': 'placeholder-ihr-id',
    'WHO_IHR_CLIENT_SECRET': 'placeholder-ihr-secret',
}


class FakeTransport:
    def __init__(self, payload=None):
        self.calls = []
        self.payload = payload if payload is not None else {
            'data': {'destinationEntities': []}, 'id': 'ext-ref-1',
        }

    def send(self, request):
        self.calls.append(request)
        return self.payload


# ============================================================
# الهوية والعقد
# ============================================================


def test_who_adapter_satisfies_organization_adapter_contract():
    assert issubclass(WHOAdapter, OrganizationAdapter)
    adapter = WHOAdapter()
    assert adapter.organization is WHO_ORGANIZATION
    assert adapter.organization.organization_type is OrganizationType.UN_AGENCY
    assert adapter.organization.identifier == 'WHO'
    for method in ('get_status', 'validate_configuration', 'build_request',
                   'parse_response', 'map_error'):
        assert callable(getattr(adapter, method))


def test_who_declares_expected_capabilities():
    declared = {c.value for c in WHOAdapter.capabilities}
    assert {'ICD11', 'IHR_EVENTS', 'DISEASE_SYNC', 'EVENT_SUBMISSION'} <= declared


def test_who_identity_fingerprint_is_stable():
    assert WHO_ORGANIZATION.fingerprint == WHO_ORGANIZATION.fingerprint
    assert len(WHO_ORGANIZATION.fingerprint) == 32
    assert WHO_ORGANIZATION.metadata['contracts_confirmed'] is False


# ============================================================
# الحالة — معطّل افتراضياً، ولا READY من الإعداد
# ============================================================


def test_who_is_disabled_by_default():
    # عزل صريح: «معطّل» تُختبر بقيمة معروفة لا بقراءة ``.env`` الحقيقي،
    # وإلا فشل الاختبار لمجرد تفعيل التكامل محلياً. نُبقي اعتماديات ICD
    # كاملة كي نُثبت أن التفعيل المنطقي وحده هو ما يُرجع الحالة إلى DISABLED.
    with override_settings(**{**FULL_ICD, 'WHO_ENABLED': False}):
        report = WHOAdapter().get_status()
    assert report.organization == 'WHO'
    assert report.status is IntegrationStatus.DISABLED
    assert report.readiness.authorized is False
    assert report.readiness.connected is False
    assert report.detail['connectivity_tested'] is False
    assert report.detail['max_status_from_configuration'] == 'CONFIGURED'


def test_who_status_is_consequence_of_settings():
    with override_settings(**FULL_ICD):
        report = WHOAdapter().get_status()
    # ICD مُهيّأ لكن IHR غير مُهيّأ ⇐ الحالة العامة UNCONFIGURED
    assert report.status is IntegrationStatus.UNCONFIGURED
    assert report.detail['namespaces'][ICD11_NAMESPACE]['configured'] is True
    assert report.detail['namespaces'][IHR_NAMESPACE]['configured'] is False


def test_who_configured_never_claims_connected_or_ready():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        report = WHOAdapter().get_status()
    assert report.status is IntegrationStatus.CONFIGURED
    assert report.status is not IntegrationStatus.READY
    assert report.readiness.connected is False
    assert report.readiness.operational is False
    assert report.readiness.authorized is False
    assert report.detail['connectivity_tested'] is False


def test_who_ready_only_with_explicit_connectivity_evidence():
    readiness = IntegrationReadiness(configured=True, enabled=True).with_connectivity_evidence()
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        report = WHOAdapter(readiness=readiness).get_status()
    assert report.status is IntegrationStatus.READY
    assert report.status.value != 'CONNECTED'
    # لكن READY هنا لا تعني اتصالاً فعلياً: البوابات الأخرى ما زالت مغلقة
    assert report.readiness.operational is False


def test_who_invalid_settings_report_issues():
    with override_settings(**{**FULL_ICD, **FULL_IHR, 'WHO_ICD_BASE_URL': 'not-a-url'}):
        report = WHOAdapter().get_status()
    assert report.status is IntegrationStatus.INVALID
    assert any('WHO_ICD_BASE_URL' in i for i in report.issues)


def test_who_validate_configuration_is_local_only():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        result = WHOAdapter().validate_configuration()
    assert result.success is True
    assert result.status == 'CONFIGURED'
    assert result.response_data['readiness']['connected'] is False
    assert result.response_data['readiness']['authorized'] is False


def test_available_capabilities_are_config_dependent():
    with override_settings(WHO_ENABLED=False):
        assert WHOAdapter().available_capabilities() == ()
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        available = WHOAdapter().available_capabilities()
    assert {c.value for c in available} == {'ICD11', 'IHR_EVENTS', 'DISEASE_SYNC', 'EVENT_SUBMISSION'}


# ============================================================
# المصادقة — أسماء لا قيم
# ============================================================


def test_who_authentication_contract_is_reference_only():
    contract = WHOAdapter().authentication_contract(ICD11_NAMESPACE)
    assert contract.authentication_type is AuthenticationType.OAUTH2_CLIENT_CREDENTIALS
    assert contract.credential_references == ('WHO_ICD_CLIENT_ID', 'WHO_ICD_CLIENT_SECRET')
    described = contract.describe()
    assert 'client_secret' not in described
    assert described['token_endpoint_configured'] is False


def test_who_ihr_auth_contract_uses_explicit_token_url_only():
    with override_settings(**FULL_IHR):
        contract = WHOAdapter().authentication_contract(IHR_NAMESPACE)
    assert contract.token_endpoint == 'https://sandbox.invalid/ihr/oauth2/token'
    assert contract.missing_requirements() == ()


def test_who_ihr_auth_contract_reports_missing_token_url():
    contract = WHOAdapter().authentication_contract(IHR_NAMESPACE)
    assert contract.token_endpoint == ''
    assert any('نقطة التوكن' in m for m in contract.missing_requirements())


def test_unknown_namespace_is_refused():
    with pytest.raises(IntegrationError) as exc:
        WHOAdapter().authentication_contract('unicef')
    assert exc.value.category is ErrorCategory.CONTRACT_ERROR


# ============================================================
# نقاط النهاية — لا اشتقاق
# ============================================================


def test_who_ihr_endpoint_stays_empty_without_confirmation():
    """لا مسار افتراضي لـIHR — ولا مسار داخلي يُعاد وسمه كـWHO."""
    contract = WHOAdapter().endpoint_contract(IHR_NAMESPACE, http_method='POST')
    assert contract.resource_path == ''
    assert contract.is_fully_specified is False
    with pytest.raises(EndpointContractError):
        contract.resolve_resource()


def test_who_endpoint_does_not_fall_back_to_internal_platform_path():
    contract = WHOAdapter().endpoint_contract(IHR_NAMESPACE, http_method='POST')
    with pytest.raises(EndpointContractError):
        contract.build_url()
    # must not contain any /api/v1 platform path
    assert '/api/v1' not in contract.resource_path


def test_who_ihr_endpoint_uses_explicit_setting_when_provided():
    with override_settings(WHO_IHR_EVENTS_PATH='/confirmed/official/path', WHO_IHR_BASE_URL='https://sandbox.invalid'):
        contract = WHOAdapter().endpoint_contract(IHR_NAMESPACE, http_method='POST')
    assert contract.resource_path == '/confirmed/official/path'
    assert contract.build_url() == 'https://sandbox.invalid/confirmed/official/path'


def test_who_icd_endpoint_requires_explicit_resource_path():
    contract = WHOAdapter().endpoint_contract(ICD11_NAMESPACE)
    assert contract.resource_path == ''
    assert contract.is_fully_specified is False


# ============================================================
# ICD-11 — قابل للاستعلام ومُحقَن
# ============================================================


def test_icd11_adapter_is_mockable_and_offline():
    transport = FakeTransport()
    with override_settings(**FULL_ICD):
        adapter = WHOAdapter(transport=transport)
        result = adapter.icd11().search('malaria', language='en')
    assert result.success is True
    assert len(transport.calls) == 1
    request = transport.calls[0]
    assert request.method == 'GET'
    assert request.url == 'https://id.who.int/icd/entity/search'
    assert request.query['q'] == 'malaria'
    assert request.query['lang'] == 'en'
    assert request.auth.authentication_type is AuthenticationType.OAUTH2_CLIENT_CREDENTIALS


def test_icd11_lookup_builds_path_from_given_id():
    transport = FakeTransport()
    with override_settings(**FULL_ICD):
        result = WHOAdapter(transport=transport).icd11().lookup('RA01')
    assert result.success is True
    assert transport.calls[0].url == 'https://id.who.int/icd/entity/RA01'


def test_icd11_without_injected_transport_refuses_without_network():
    with override_settings(**FULL_ICD):
        result = WHOAdapter().icd11().search('malaria')
    assert result.success is False
    assert result.error_code is ErrorCategory.CONFIGURATION_ERROR
    assert 'transport is not injected' in result.error_message


def test_icd11_rejects_invalid_language_before_any_request():
    """انتهاك تعاقدي يرفع استثناءً — ولا يُلمس النقل إطلاقاً."""
    transport = FakeTransport()
    with override_settings(**FULL_ICD):
        with pytest.raises(IntegrationError) as exc:
            WHOAdapter(transport=transport).icd11().search('malaria', language='FR')
    assert exc.value.category is ErrorCategory.CONTRACT_ERROR
    assert transport.calls == []


def test_icd11_rejects_empty_query():
    transport = FakeTransport()
    with override_settings(**FULL_ICD):
        with pytest.raises(IntegrationError) as exc:
            WHOAdapter(transport=transport).icd11().search('   ')
    assert exc.value.category is ErrorCategory.CONTRACT_ERROR
    assert transport.calls == []


def test_icd11_availability_is_config_dependent():
    with override_settings(WHO_ENABLED=False):
        assert WHOAdapter().icd11().available is False
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        assert WHOAdapter().icd11().available is True


# ============================================================
# IHR — البناء منفصل عن النقل
# ============================================================


def test_ihr_event_contract_is_built_from_nqp_payload_without_db():
    payload = {
        'event_id': 'IHR-1',
        'event_type': 'OUTBREAK',
        'date_detected': '2026-01-15',
        'risk_level': 'HIGH',
        'status': 'OPEN',
        'cases': {'suspected': 1, 'probable': 2, 'confirmed': 3, 'deaths': 0},
        'location': {'point_of_entry': 'SDKRT', 'sector': 'الخرطوم'},
        'disease': {'icd11_code': 'RA01'},
        'source': 'AFYATNA',
    }
    event = IHREventContract.from_nqp_payload(payload)
    assert event.event_id == 'IHR-1'
    assert event.location['point_of_entry'] == 'SDKRT'
    assert event.public_health_action['cases_confirmed'] == 3
    assert event.external_schema_confirmed is False


def test_ihr_external_payload_is_blocked_until_official_contract():
    """لا حمولة خارجية قبل تأكيد مخطط WHO — الرمي مقصود."""
    event = IHREventContract.from_nqp_payload({'event_id': 'X'})
    with pytest.raises(NotImplementedError):
        event.to_external_payload()
    assert WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED is False


def test_ihr_submission_is_refused():
    transport = FakeTransport()
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        adapter = WHOAdapter(transport=transport)
        with pytest.raises(IntegrationError) as exc:
            adapter.ihr_events().submit(IHREventContract.from_nqp_payload({'event_id': 'X'}))
    assert exc.value.category is ErrorCategory.CONFIGURATION_ERROR
    assert 'غير مؤكد' in str(exc.value) or 'غير مكتمل' in str(exc.value)
    # لم يُرسل أي طلب
    assert transport.calls == []


def test_ihr_audit_preview_writes_nothing():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        adapter = WHOAdapter()
        event = adapter.ihr_events().build_event({'event_id': 'IHR-9', 'event_type': 'OUTBREAK'})
        preview = adapter.ihr_events().audit_preview(event)
    assert preview.outcome is AuditOutcome.NOT_ATTEMPTED
    assert preview.operation == 'IHR_EVENT_SUBMIT'
    assert preview.correlation_id == 'IHR-9'
    assert set(preview.to_integration_log_fields()) == {
        'integration_name', 'request_type', 'request_payload', 'response_payload', 'status_code',
    }


# ============================================================
# التنفيذ الموحّد
# ============================================================


def test_execute_normalizes_transport_error():
    class BrokenTransport:
        def send(self, request):
            raise TimeoutError('slow')

    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        adapter = WHOAdapter(transport=BrokenTransport())
        request = adapter.build_request(
            Capability.ICD11, 'X',
            endpoint=adapter.endpoint_contract(ICD11_NAMESPACE, resource_path='/icd/entity/search'),
        )
        result = adapter.execute(request)
    assert result.success is False
    assert result.error_code is ErrorCategory.TIMEOUT


def test_execute_never_returns_success_on_timeout():
    class TimingOutTransport:
        def send(self, request):
            raise TimeoutError('slow')

    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        adapter = WHOAdapter(transport=TimingOutTransport())
        result = adapter.icd11().search('malaria')
    assert result.success is False
    assert result.error_code is ErrorCategory.TIMEOUT


def test_adapter_rejects_undeclared_capability():
    with pytest.raises(IntegrationError) as exc:
        WHOAdapter()._assert_declared(Capability.WEBHOOKS)
    assert exc.value.category is ErrorCategory.CONTRACT_ERROR


def test_build_request_requires_explicit_endpoint():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        with pytest.raises(IntegrationError) as exc:
            WHOAdapter().build_request(Capability.IHR_EVENTS, 'SUBMIT')
    assert exc.value.category is ErrorCategory.CONFIGURATION_ERROR
    assert 'لا يُبنى أي مسار افتراضي' in str(exc.value)


# ============================================================
# الأمان
# ============================================================


def test_who_status_output_contains_no_secret_values():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        report = WHOAdapter().get_status()
        rendered = str(report.describe())
        contract = WHOAdapter().authentication_contract(ICD11_NAMESPACE)
    for secret in ('placeholder-client-id', 'placeholder-client-secret',
                   'placeholder-ihr-id', 'placeholder-ihr-secret'):
        assert secret not in rendered
    assert 'WHO_ICD_CLIENT_ID' in str(contract.describe())  # الاسم مسموح، القيمة لا


def test_who_repr_never_leaks():
    with override_settings(**{**FULL_ICD, **FULL_IHR}):
        rendered = repr(WHOAdapter())
    assert 'placeholder' not in rendered
    assert 'WHO' in rendered
