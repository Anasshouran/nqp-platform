"""اختبارات عقد التكامل على مستوى المنظمة — بلا شبكة وبلا قاعدة بيانات.

الملف ``test_organization_contract.py`` يغطي الأساس المحايد (الهوية، الحالة،
المصادقة، نقاط النهاية، الأخطاء، التدقيق). ملف ``test_who_adapter.py`` يغطي
محوّل WHO.

كل اختبار هنا يثبت **حدوداً**، لا سلوكاً عابراً: الرفض، وعدم الاشتقاق،
وعدم التسريب. لا اختبار واحد يتصل بأي شيء.
"""

import inspect

import pytest
from django.test import override_settings

from apps.integration.organizations import (
    UNMAPPED_FIELDS,
    AuditEvent,
    AuditOutcome,
    AuthenticationContract,
    AuthenticationType,
    Capability,
    DataSharingScope,
    EndpointContract,
    EndpointContractError,
    ErrorCategory,
    IntegrationError,
    IntegrationReadiness,
    IntegrationRequest,
    IntegrationResult,
    IntegrationStatus,
    IntegrationStatusError,
    Organization,
    OrganizationAdapter,
    OrganizationType,
    RefusingTransport,
    Transport,
    contains_sensitive_text,
    derive_status,
    map_error,
    redact_text,
)

# ============================================================
#Organisation — الهوية
# ============================================================

ORG = Organization(
    identifier='WHO',
    name='World Health Organization',
    display_name='منظمة الصحة العالمية',
    organization_type=OrganizationType.UN_AGENCY,
    country='INT',
    capabilities=(Capability.ICD11, Capability.IHR_EVENTS),
)


def test_organization_identity_is_deterministic():
    """نفس المدخلات ⇐ نفس البصمة، وبصمة مختلفة للهوية المختلفة."""
    a = Organization(**{**ORG.__dict__})
    b = Organization(
        identifier='WHO',
        name='World Health Organization',
        display_name='منظمة الصحة العالمية',
        organization_type=OrganizationType.UN_AGENCY,
        country='INT',
        capabilities=(Capability.IHR_EVENTS, Capability.ICD11),  # ترتيب معكوس
    )
    assert a.fingerprint == b.fingerprint
    assert a.fingerprint == ORG.fingerprint
    # تغيير سمة هوية يغيّر البصمة
    assert Organization(**{**ORG.__dict__, 'identifier': 'IOM'}).fingerprint != ORG.fingerprint
    assert Organization(**{**ORG.__dict__, 'country': 'SD'}).fingerprint != ORG.fingerprint


def test_organization_type_is_valid():
    assert ORG.organization_type is OrganizationType.UN_AGENCY
    for expected in ('UN_AGENCY', 'INTERNATIONAL_ORGANIZATION', 'GOVERNMENT', 'NGO', 'HEALTH_PARTNER', 'OTHER'):
        assert expected in {t.value for t in OrganizationType}
    with pytest.raises(IntegrationStatusError):
        Organization(
            identifier='X', name='X', display_name='X', organization_type='UN_AGENCY',
        )


def test_capabilities_are_explicit():
    assert ORG.declares(Capability.ICD11) is True
    assert ORG.declares(Capability.WEBHOOKS) is False
    assert ORG.describe()['declared_capabilities'] == ['ICD11', 'IHR_EVENTS']


def test_organization_starts_denied_by_default():
    """الحالة المعلنة تبدأ معطّلة — لا يُفترض أي تشغيل."""
    assert ORG.status is IntegrationStatus.DISABLED
    readiness = IntegrationReadiness()
    assert (readiness.configured, readiness.enabled, readiness.authorized) == (False, False, False)
    assert (readiness.connected, readiness.operational) == (False, False)
    assert readiness.may_exchange_data is False


def test_organization_rejects_unknown_capability_and_empty_identifier():
    with pytest.raises(IntegrationStatusError):
        Organization(
            identifier='X', name='X', display_name='X',
            organization_type=OrganizationType.OTHER, capabilities=('NOT_A_CAPABILITY',),
        )
    with pytest.raises(IntegrationStatusError):
        Organization(identifier='  ', name='X', display_name='X', organization_type=OrganizationType.OTHER)


# ============================================================
# Status — التدرّج الحرج
# ============================================================


def test_disabled_unconfigured_configured_are_distinct():
    assert derive_status(enabled=False, configured=False) is IntegrationStatus.DISABLED
    assert derive_status(enabled=False, configured=True) is IntegrationStatus.DISABLED
    assert derive_status(enabled=True, configured=False) is IntegrationStatus.UNCONFIGURED
    assert derive_status(enabled=True, configured=True) is IntegrationStatus.CONFIGURED


def test_configured_never_implies_connected_or_ready():
    """الضمان المركزي: إعداد كامل ⇐ CONFIGURED فقط، لا READY ولا اتصال."""
    status = derive_status(enabled=True, configured=True)
    assert status is IntegrationStatus.CONFIGURED
    assert status is not IntegrationStatus.READY
    assert status.value != 'CONNECTED'
    # لا حالة "متصل" في المفردات أصلاً
    assert 'CONNECTED' not in {s.value for s in IntegrationStatus}


def test_ready_requires_connectivity_evidence():
    """READY لا تُشتق من الإعدادات — تتطلب علماً صريحاً."""
    assert derive_status(enabled=True, configured=True, connectivity_observed=False) is IntegrationStatus.CONFIGURED
    assert derive_status(enabled=True, configured=True, connectivity_observed=True) is IntegrationStatus.READY
    readiness = IntegrationReadiness(configured=True, enabled=True)
    with_evidence = readiness.with_connectivity_evidence(operational=True)
    assert readiness.connected is False
    assert with_evidence.connectivity_observed is True
    # القرار النهائي يبقى بيد المشتق لا ببوابة readiness وحدها
    assert derive_status(enabled=True, configured=True,
                         connectivity_observed=readiness.connectivity_observed) is IntegrationStatus.CONFIGURED


def test_invalid_and_error_states():
    assert derive_status(enabled=True, configured=False, invalid=True) is IntegrationStatus.INVALID
    assert derive_status(enabled=True, configured=True,
                         error_category=ErrorCategory.TIMEOUT) is IntegrationStatus.ERROR


def test_timeout_is_never_success():
    """المهلة نتيجة فشل مصنّفة، وليست اتصالاً ولا نجاحاً."""
    result = IntegrationResult.failure('STATUS_CHECK', ErrorCategory.TIMEOUT, 'انتهت المهلة')
    assert result.success is False
    assert result.error_code is ErrorCategory.TIMEOUT


def test_authorization_gate_is_never_implied_by_configuration():
    readiness = IntegrationReadiness(configured=True, enabled=True, authorized=False)
    assert readiness.may_exchange_data is False
    authorized = IntegrationReadiness(configured=True, enabled=True, authorized=True)
    assert authorized.may_exchange_data is True
    # لكن التبديل الحقيقي يحتاج READY أيضاً
    report_status = derive_status(enabled=True, configured=True)
    assert report_status is IntegrationStatus.CONFIGURED


# ============================================================
# Authentication
# ============================================================


def test_authentication_types_cover_required_vocabulary():
    assert {t.value for t in AuthenticationType} >= {
        'NONE', 'OAUTH2_CLIENT_CREDENTIALS', 'API_KEY', 'WEBHOOK_SECRET',
    }


def test_authentication_contract_holds_references_not_values():
    contract = AuthenticationContract(
        authentication_type=AuthenticationType.OAUTH2_CLIENT_CREDENTIALS,
        credential_references=('WHO_ICD_CLIENT_ID', 'WHO_ICD_CLIENT_SECRET'),
        scopes=('icdapi_access',),
    )
    assert contract.describe()['credential_references'] == ['WHO_ICD_CLIENT_ID', 'WHO_ICD_CLIENT_SECRET']
    assert contract.requires_credentials is True
    assert contract.requires_token_endpoint is True
    # لا حقل لقيمة سرّية إطلاقاً
    assert not hasattr(contract, 'client_secret')
    assert not hasattr(contract, 'client_id')
    rendered = repr(contract)
    assert 'WHO_ICD_CLIENT_ID' not in rendered


def test_missing_token_endpoint_is_reported_not_derived():
    contract = AuthenticationContract(
        authentication_type=AuthenticationType.OAUTH2_CLIENT_CREDENTIALS,
        credential_references=('WHO_IHR_CLIENT_ID', 'WHO_IHR_CLIENT_SECRET'),
    )
    assert contract.token_endpoint == ''
    assert any('نقطة التوكن' in m for m in contract.missing_requirements())


def test_none_authentication_requires_no_credentials():
    contract = AuthenticationContract(authentication_type=AuthenticationType.NONE)
    assert contract.requires_credentials is False
    assert contract.requires_token_endpoint is False
    assert contract.missing_requirements() == ()


# ============================================================
# Endpoint — لا اشتقاق
# ============================================================


def test_endpoint_contract_distinguishes_all_five_fields():
    contract = EndpointContract(
        base_url='https://id.who.int/',
        token_url='https://icdaccessmanagement.who.int/connect/token',
        resource_path='/icd/entity/search',
        http_method='post',
        timeout=15.0,
    )
    assert contract.base_url == 'https://id.who.int'          # الشرطة الأخيرة مُزالة
    assert contract.http_method == 'POST'
    assert contract.timeout == 15.0
    described = contract.describe()
    assert set(described) == {
        'base_url', 'token_url_configured', 'resource_path', 'http_method', 'timeout', 'fully_specified',
    }
    assert described['token_url_configured'] is True


def test_endpoint_contract_never_derives_resource_path_from_base_url():
    contract = EndpointContract(base_url='https://id.who.int', resource_path='', http_method='GET')
    assert contract.resource_path == ''
    assert contract.is_fully_specified is False
    with pytest.raises(EndpointContractError) as exc:
        contract.resolve_resource()
    assert 'لا اشتقاق' in str(exc.value) or 'لا يوجد مسار افتراضي' in str(exc.value)
    with pytest.raises(EndpointContractError):
        contract.build_url()


def test_endpoint_contract_never_derives_token_url_from_base_url():
    contract = EndpointContract(base_url='https://ihr.example.org', resource_path='/x', http_method='POST')
    assert contract.token_url == ''
    with pytest.raises(EndpointContractError) as exc:
        contract.resolve_token_endpoint()
    assert 'لا تُشتق' in str(exc.value)


def test_explicit_resource_path_is_used_verbatim():
    contract = EndpointContract(
        base_url='https://id.who.int', resource_path='/icd/entity/search', http_method='GET',
    )
    assert contract.build_url() == 'https://id.who.int/icd/entity/search'
    assert contract.resolve_resource() == '/icd/entity/search'


# ============================================================
# IntegrationRequest
# ============================================================


def _request(**kwargs):
    base = {
        'organization': 'WHO',
        'capability': Capability.ICD11,
        'operation': 'ICD11_SEARCH',
        'method': 'GET',
        'url': 'https://id.who.int/icd/entity/search',
        'auth': AuthenticationContract(
            authentication_type=AuthenticationType.OAUTH2_CLIENT_CREDENTIALS,
            credential_references=('WHO_ICD_CLIENT_ID',),
            token_endpoint='https://icdaccessmanagement.who.int/connect/token',
        ),
        'endpoint': EndpointContract(
            base_url='https://id.who.int', resource_path='/icd/entity/search', http_method='GET',
        ),
    }
    base.update(kwargs)
    return IntegrationRequest(**base)


def test_integration_request_has_no_headers_field():
    """رؤوس المصادقة لا تدخل بنية الطلب إطلاقاً."""
    assert not hasattr(IntegrationRequest, 'headers')
    assert not hasattr(IntegrationRequest, 'auth_headers')
    assert 'headers' not in _request().describe()


def test_integration_request_describe_exposes_no_secret_material():
    described = _request(json_body={'q': 'malaria'}).describe()
    assert described['body_keys'] == ['q']
    assert described['credential_references'] == ['WHO_ICD_CLIENT_ID']
    assert 'access_token' not in str(described)


# ============================================================
# Errors + Redaction
# ============================================================


def test_redaction_strips_authorization_and_secrets():
    raw = (
        "Authorization: Bearer eyJhbGciOi.SECRET.VALUE "
        "client_secret=super-secret access_token=abc123 "
        '{"api_key": "nqp_live_key"}'
    )
    assert contains_sensitive_text(raw) is True
    cleaned = redact_text(raw)
    for leak in ('super-secret', 'abc123', 'nqp_live_key', 'eyJhbGciOi.SECRET.VALUE'):
        assert leak not in cleaned
    assert '[REDACTED]' in cleaned
    assert contains_sensitive_text(cleaned) is False


def test_redaction_truncates_long_messages():
    assert len(redact_text('x' * 5000)) <= 300


@pytest.mark.parametrize('status,expected', [
    (401, ErrorCategory.AUTHENTICATION_ERROR),
    (407, ErrorCategory.AUTHENTICATION_ERROR),
    (403, ErrorCategory.AUTHORIZATION_ERROR),
    (451, ErrorCategory.AUTHORIZATION_ERROR),
    (500, ErrorCategory.HTTP_ERROR),
    (404, ErrorCategory.HTTP_ERROR),
])
def test_http_status_maps_deterministically(status, expected):
    import httpx

    request = httpx.Request('GET', 'https://example.invalid/x')
    response = httpx.Response(status, request=request)
    exc = httpx.HTTPStatusError('failed', request=request, response=response)
    assert map_error(exc) is expected


def test_timeout_and_network_map_deterministically():
    import httpx

    assert map_error(httpx.ReadTimeout('slow')) is ErrorCategory.TIMEOUT
    assert map_error(TimeoutError()) is ErrorCategory.TIMEOUT
    assert map_error(httpx.ConnectError('refused')) is ErrorCategory.NETWORK_ERROR
    assert map_error(ValueError('bad json')) is ErrorCategory.INVALID_RESPONSE
    assert map_error(RuntimeError('unknown')) is ErrorCategory.CONTRACT_ERROR


def test_error_category_vocabulary_is_complete():
    assert {c.value for c in ErrorCategory} >= {
        'CONFIGURATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR',
        'TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR', 'INVALID_RESPONSE', 'CONTRACT_ERROR',
    }


def test_integration_error_redacts_message():
    exc = IntegrationError(ErrorCategory.NETWORK_ERROR, 'Authorization: Bearer leaked-token-123')
    assert 'leaked-token-123' not in str(exc)
    assert exc.category is ErrorCategory.NETWORK_ERROR


def test_integration_result_cannot_be_success_with_error():
    with pytest.raises(IntegrationError):
        IntegrationResult(
            status='X', success=True, error_code=ErrorCategory.TIMEOUT,
        )


def test_failure_without_category_defaults_deterministically():
    result = IntegrationResult(status='X', success=False)
    assert result.success is False
    assert result.error_code is ErrorCategory.CONTRACT_ERROR


def test_result_describe_carries_no_secrets():
    result = IntegrationResult.from_exception(
        IntegrationError(ErrorCategory.NETWORK_ERROR, 'client_secret=abc'),
        status='ERROR',
    )
    assert 'abc' not in str(result.describe())
    assert result.error_code is ErrorCategory.NETWORK_ERROR
    assert result.success is False


def test_extra_error_categories_override_default_mapping():
    class DomainError(Exception):
        pass

    result = IntegrationResult.from_exception(
        DomainError('x'), status='ERROR', extra_categories={DomainError: ErrorCategory.CONFIGURATION_ERROR},
    )
    assert result.error_code is ErrorCategory.CONFIGURATION_ERROR


# ============================================================
# Audit
# ============================================================


def test_audit_event_records_required_fields():
    event = AuditEvent(
        organization='WHO',
        operation='IHR_EVENT_SUBMIT',
        outcome=AuditOutcome.NOT_ATTEMPTED,
        status='UNCONFIRMED_ENDPOINT',
        correlation_id='IHR-1',
        duration_ms=12,
        error_category=ErrorCategory.CONFIGURATION_ERROR,
    )
    summary = event.sanitized_summary()
    for field in ('organization', 'operation', 'outcome', 'status',
                  'timestamp', 'correlation_id', 'duration_ms', 'error_category'):
        assert field in summary
    assert summary['error_category'] == 'CONFIGURATION_ERROR'


def test_audit_event_requires_identity_and_operation():
    with pytest.raises(ValueError):
        AuditEvent(organization='', operation='X', outcome=AuditOutcome.SUCCESS)
    with pytest.raises(ValueError):
        AuditEvent(organization='WHO', operation=' ', outcome=AuditOutcome.SUCCESS)


def test_audit_maps_onto_existing_integration_log_fields():
    """إعادة استخدام ``IntegrationLog`` القائمة بلا نموذج جديد."""
    from apps.integration.models import IntegrationLog

    event = AuditEvent(
        organization='WHO', operation='ICD11_SEARCH', outcome=AuditOutcome.SUCCESS,
        correlation_id='c-1', duration_ms=5, external_reference='e-1',
    )
    fields = event.to_integration_log_fields()
    model_fields = {f.name for f in IntegrationLog._meta.get_fields()}
    for key in fields:
        assert key in model_fields, f'{key} غير موجود في IntegrationLog'
    assert fields['integration_name'] == 'WHO'
    assert fields['request_type'] == 'ICD11_SEARCH'
    # الحقول الثلاثة غير الممثلة مُعلنة صراحةً كفجوة
    assert set(event.unmapped_fields()) <= set(UNMAPPED_FIELDS)
    assert UNMAPPED_FIELDS == ('correlation_id', 'duration_ms', 'error_category')


def test_audit_payload_never_contains_secret_material():
    event = AuditEvent(
        organization='WHO', operation='X', outcome=AuditOutcome.FAILED,
        detail={'note': 'Authorization: Bearer leaked-token-999', 'ok': 'fine'},
    )
    fields = event.to_integration_log_fields()
    assert 'leaked-token-999' not in str(fields)
    assert '[REDACTED]' in fields['request_payload']['detail']['note']


def test_audit_outcome_vocabulary():
    assert {o.value for o in AuditOutcome} == {
        'SUCCESS', 'FAILED', 'REFUSED', 'NOT_ATTEMPTED',
    }


# ============================================================
# Data sharing scope
# ============================================================


def test_data_sharing_scope_has_no_patient_level_member():
    """لا مشاركة على مستوى المريض في هذا التعداد."""
    values = {s.value for s in DataSharingScope}
    assert values == {
        'DISEASE_REFERENCE', 'EPIDEMIOLOGICAL_SUMMARY', 'IHR_EVENT',
        'LABORATORY_SUMMARY', 'ENTRY_POINT_EVENT',
    }
    for forbidden in ('PATIENT', 'CASE', 'PERSON', 'IDENTIFIABLE', 'RECORD'):
        assert not any(forbidden in v for v in values)


# ============================================================
# Transport
# ============================================================


class RecordingTransport:
    """نقل وهمي يسجّل الطلبات ويعيد حمولة ثابتة — لا شبكة."""

    def __init__(self, payload=None):
        self.calls = []
        self.payload = payload if payload is not None else {'data': {'ok': True}, 'id': 'ext-1'}

    def send(self, request):
        self.calls.append(request)
        return self.payload


class ExplodingTransport:
    def send(self, request):
        raise RuntimeError('transport must not be called')


def test_transport_protocol_is_structural():
    assert isinstance(RecordingTransport(), Transport)
    assert isinstance(RefusingTransport(), Transport)


def test_refusing_transport_refuses_instead_of_calling_out():
    with pytest.raises(IntegrationError) as exc:
        RefusingTransport().send(_request())
    assert exc.value.category is ErrorCategory.CONFIGURATION_ERROR
    assert 'transport is not injected' in str(exc.value)


# ============================================================
# Foundation purity — the base layer must not know WHO
# ============================================================

_FOUNDATION_MODULES = (
    'apps.integration.organizations.contract',
    'apps.integration.organizations.endpoints',
    'apps.integration.organizations.results',
    'apps.integration.organizations.audit',
    'apps.integration.organizations.adapter',
)


@pytest.mark.parametrize('module_name', _FOUNDATION_MODULES)
def test_foundation_does_not_import_who_or_django_models(module_name):
    """الأساس مستقل: لا WHO ولا models — وإلا لم يكن قابلاً لإعادة الاستخدام.

    الفحص على **الاستيرادات الحقيقية** لا على وجود الكلمة في النص، لأن
    الكلمة ترد في التعليقاتProject. أي استيراد ``apps.who`` أو ``models``
    في طبقة الأساس يجعلها مربوطة بمنظمة واحدة أو بقاعدة البيانات.
    """
    import ast
    import importlib

    module = importlib.import_module(module_name)
    tree = ast.parse(inspect.getsource(module))

    imported = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            base = node.module or ''
            imported.append(base)
            imported.extend(f'{base}.{a.name}' for a in node.names)

    for name in imported:
        assert not name.startswith('apps.who'), f'الأساس يستورد WHO: {name}'
        assert name != 'apps', 'الأساس لا يستورد حزمة apps'
        assert not name.endswith('models'), f'الأساس يستورد النماذج: {name}'
        assert not name.startswith('django.db'), f'الأساس يستورد django.db: {name}'

    # الاستيراد الفعلي يجب أن ينجح بلا Django apps محمّلة
    assert module.__name__ == module_name


def test_foundation_imports_httpx_lazily():
    """httpx لا يُستورد عند استيراد الأساس — ربط خفيف ومسؤولية المحوّل."""
    import subprocess
    import sys

    code = (
        'import sys;'
        'sys.path.insert(0, ".");'
        'import apps.integration.organizations as o;'
        'assert o.IntegrationStatus.CONFIGURED;'
        'print("ok")'
    )
    proc = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr[-800:]


def test_foundation_package_imports_without_who_app():
    """حزمة الأساس تُستورد بلا أي اعتماد على محوّل WHO."""
    import apps.integration.organizations as foundation

    assert foundation.IntegrationStatus.CONFIGURED.value == 'CONFIGURED'
    assert 'WHO' not in {o for o in foundation.__all__ if o == 'WHOAdapter'}
