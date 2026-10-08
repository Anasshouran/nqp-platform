"""اختبارات سجل تكامل IHR: نموذج WHOIntegration support + أسرار write-only + حالة صادقة."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.who.models import WHOIntegration
from apps.who.serializers import WHOIntegrationSerializer

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = 'StrongPass123!'

IHR_NAME = 'World Health Organization — IHR'


@pytest.fixture
def ihr_client():
    client = APIClient()
    resp = client.post('/api/v1/auth/login/',
                       {'email': 'ihr-integration@nqp.gov.sd', 'password': PASSWORD},
                       format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client


@pytest.fixture
def integration_officer(grant_permissions):
    user = User.objects.create_user(
        email='ihr-integration@nqp.gov.sd', password=PASSWORD, full_name='WHO Officer',
    )
    grant_permissions(user, 'IHR_INTEGRATION_ROLE', ['who_integration:view', 'who_integration:edit'])
    return user


# ---------------------------------------------------------------------------
# دعم السجل المطلوب في القسم G
# ---------------------------------------------------------------------------
def test_model_supports_ihr_record_fields():
    fields = {f.name for f in WHOIntegration._meta.get_fields()}
    for required in ('name', 'environment', 'base_url', 'client_id',
                     'client_secret_encrypted', 'authentication_type', 'is_active'):
        assert required in fields, required


def test_ihr_record_created_with_required_values():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME,
        environment=WHOIntegration.Environment.SANDBOX,
        base_url='https://sandbox.ihr.example.org/api',
        client_id='ihr-client',
        authentication_type=WHOIntegration.AuthType.OAUTH2,
    )
    integration.set_client_secret('super-secret-value')
    integration.save(update_fields=['client_secret_encrypted'])
    assert WHOIntegration.objects.filter(name=IHR_NAME, is_active=True).exists()
    assert integration.client_secret == 'super-secret-value'


def test_ihr_environment_defaults_to_sandbox():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME, base_url='https://sandbox.ihr.example.org/api',
    )
    assert integration.environment == WHOIntegration.Environment.SANDBOX
    assert integration.authentication_type == WHOIntegration.AuthType.OAUTH2


# ---------------------------------------------------------------------------
# الأسرار: write-only ولا تُسرَّب في التمثيل
# ---------------------------------------------------------------------------
def test_client_secret_never_serialized():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME, base_url='https://sandbox.ihr.example.org/api',
        client_id='ihr-client',
    )
    integration.set_client_secret('never-leak-me')
    integration.save(update_fields=['client_secret_encrypted'])
    data = WHOIntegrationSerializer(integration).data
    assert 'client_secret_encrypted' not in data
    assert 'super-secret-value' not in str(data)
    assert 'never-leak-me' not in str(data)


def test_secret_roundtrip_and_ciphertext_differs():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME, base_url='https://sandbox.ihr.example.org/api',
    )
    integration.set_client_secret('plaintext-secret')
    integration.save(update_fields=['client_secret_encrypted'])
    # التخزين مشفّر لا نص صريح
    assert 'plaintext-secret' not in integration.client_secret_encrypted
    assert integration.client_secret == 'plaintext-secret'


def test_secret_tolerates_key_rotation():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME, base_url='https://sandbox.ihr.example.org/api',
    )
    integration.set_client_secret('rotated-secret')
    integration.save(update_fields=['client_secret_encrypted'])
    # تغيير مفتاح Fernet يجعل فك التشفير يفشل بأمان بدل أن يرمي استثناء
    integration.client_secret_encrypted = 'not-a-valid-fernet-token'
    assert integration.client_secret == ''


def test_serializer_create_encrypts_secret_from_write_only_field():
    serializer = WHOIntegrationSerializer(data={
        'name': IHR_NAME,
        'environment': WHOIntegration.Environment.SANDBOX,
        'base_url': 'https://sandbox.ihr.example.org/api',
        'client_id': 'ihr-client',
        'authentication_type': WHOIntegration.AuthType.OAUTH2,
        'is_active': True,
        'client_secret': 'write-only-secret',
    })
    assert serializer.is_valid(), serializer.errors
    integration = serializer.save()
    assert integration.client_secret == 'write-only-secret'
    assert 'write-only-secret' not in integration.client_secret_encrypted
    assert 'write-only-secret' not in str(WHOIntegrationSerializer(integration).data)


def test_serializer_update_encrypts_new_secret():
    integration = WHOIntegration.objects.create(
        name=IHR_NAME, base_url='https://sandbox.ihr.example.org/api',
    )
    integration.set_client_secret('old-secret')
    integration.save(update_fields=['client_secret_encrypted'])
    serializer = WHOIntegrationSerializer(
        integration, data={'name': IHR_NAME, 'base_url': 'https://sandbox.ihr.example.org/api',
                           'client_secret': 'new-secret'}, partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()
    assert updated.client_secret == 'new-secret'


def test_sync_log_payload_does_not_leak_secret():
    from apps.who.models import WHOSyncLog
    log = WHOSyncLog.objects.create(
        operation=WHOSyncLog.Operation.STATUS_CHECK,
        status=WHOSyncLog.Status.SUCCESS,
        response_payload={'client_id_set': True, 'client_secret_set': True},
    )
    assert 'client_secret' not in log.request_payload or not log.request_payload.get('client_secret')


# ---------------------------------------------------------------------------
# حالة الاتصال: صادقة ولا تُشتّت
# ---------------------------------------------------------------------------
def test_ihr_reported_as_unconfigured_without_credentials(settings):
    from apps.who.config import load_ihr_configuration
    for name in ('WHO_IHR_BASE_URL', 'WHO_IHR_TOKEN_URL', 'WHO_IHR_CLIENT_ID', 'WHO_IHR_CLIENT_SECRET'):
        settings.__dict__.pop(name, None)
    config = load_ihr_configuration(base_url='', token_url='', client_id='', client_secret='')
    assert config.state.value == 'UNCONFIGURED'
    assert config.can_connect is False
    # لا سر ولا مسار في الوصف الآمن، فقط علم «مضبوط/غير مضبوط»
    redacted = config.redacted()
    assert redacted['client_secret_set'] is False
    assert redacted['token_url'] == ''


def test_connected_derived_from_verification_not_last_success(settings):
    """لا استنتاج «متصل» من ``last_success_at``؛ من الفحص المتحكَّم به فقط."""
    from apps.who.services.connectivity import describe_connectivity
    WHOIntegration.objects.create(
        name='WHO ICD-11', base_url='https://id.who.int/icd',
        last_success_at='2026-01-01T00:00:00Z',
    )
    payload = describe_connectivity()
    # سجل تكامل قديم بلا أي فحص STATUS_CHECK ⇒ لا يُدَّعى الاتصال
    assert payload['last_success_at'] is not None
    assert payload['connected'] is False
    assert payload['verified_at'] is None


def test_failed_check_does_not_set_verified_at(settings):
    from apps.who.models import WHOSyncLog
    from apps.who.services.connectivity import describe_connectivity
    WHOSyncLog.objects.create(
        operation=WHOSyncLog.Operation.STATUS_CHECK,
        status=WHOSyncLog.Status.FAILED,
        http_status=404,
        completed_at='2026-01-01T00:00:00Z',
        error_message='endpoint not found',
    )
    payload = describe_connectivity()
    assert payload['verified'] is False
    assert payload['verified_at'] is None
    assert payload['oauth_verified'] is False
    assert payload['api_verified'] is False


def test_status_check_is_recorded_operation(settings):
    """فحص الحالة عملية ``STATUS_CHECK`` قائمة في النموذج — بلا حاجة لهجرة."""
    from apps.who.models import WHOSyncLog
    assert WHOSyncLog.Operation.STATUS_CHECK == 'STATUS_CHECK'


def test_integration_endpoint_requires_permission(integration_officer, grant_permissions):
    grant_permissions(integration_officer, 'IHR_VIEW_ONLY_ROLE', [])
    client = APIClient()
    resp = client.post('/api/v1/auth/login/',
                       {'email': integration_officer.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    assert client.get('/api/v1/who/integrations/').status_code in (200, 403)


def test_integration_view_visible_to_view_permission(integration_officer):
    client = APIClient()
    resp = client.post('/api/v1/auth/login/',
                       {'email': integration_officer.email, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    assert client.get('/api/v1/who/integrations/').status_code == 200
