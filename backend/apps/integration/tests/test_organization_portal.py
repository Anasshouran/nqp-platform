"""اختبارات بوابة تكامل المنظمات.

تغطي:
- CRUD للمنظمات على المسار المتوافق `/entities/`.
- ربط `ApiEndpoint` بالمنظمة و FK完整性.
- تشفير الاعتمادات وعدم تسريب plaintext.
- إخفاء سر الـwebhook عن الاستجابات.
- تسجيل فحص الصحة كـevidence وتحديث حالة التكامل.
- صلاحيات الأدمن على الموارد الحساسة.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.integration.models import (
    ApiEndpoint,
    EncryptedCredentialValue,
    Integration,
    IntegrationHealth,
    Organization,
    WebhookSubscription,
)

pytestmark = pytest.mark.django_db

User = get_user_model()

ENTITIES = '/api/v1/integration/entities/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='portaladmin@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مدير البوابة',
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


@pytest.fixture
def regular_user():
    return User.objects.create_user(
        email='portaluser@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم'
    )


@pytest.fixture
def organization():
    return Organization.objects.create(
        code='WHO', name_en='World Health Organization',
        name_ar='منظمة الصحة العالمية', org_type='INTERNATIONAL',
        country='CH', status='ACTIVE',
    )


@pytest.fixture
def endpoint(organization):
    return ApiEndpoint.objects.create(
        code='WHO_IHR', organization=organization,
        name_en='IHR submissions', name_ar='إرسال IHR',
        base_url='https://example.org/ihr', scope='IHR',
    )


@pytest.fixture
def integration(organization, endpoint):
    return Integration.objects.create(
        organization=organization, endpoint=endpoint,
        environment='SANDBOX', status='CONFIGURED',
    )


# ── Organization CRUD ────────────────────────────────────────────────────

def test_organization_create_returns_localized_fields(api_client, admin_user):
    res = api_client.post(ENTITIES, {
        'code': 'MOH', 'name_en': 'Ministry of Health',
        'name_ar': 'وزارة الصحة', 'org_type': 'GOVERNMENT',
        'country': 'SD', 'status': 'ACTIVE',
    }, format='json')
    assert res.status_code == 201
    assert res.data['name_ar'] == 'وزارة الصحة'
    assert res.data['name_en'] == 'Ministry of Health'


def test_organization_list_uses_legacy_entities_route(api_client, admin_user, organization):
    res = api_client.get(ENTITIES)
    assert res.status_code == 200
    assert res.data['count'] == 1
    assert res.data['results'][0]['code'] == 'WHO'


def test_organization_never_exposes_encrypted_key(api_client, admin_user, organization):
    Organization.objects.filter(pk=organization.pk).update(api_key_encrypted='CIPHERTEXT')
    res = api_client.get(ENTITIES)
    assert res.status_code == 200
    assert 'CIPHERTEXT' not in str(res.data)


def test_organization_code_must_be_unique(api_client, admin_user, organization):
    res = api_client.post(ENTITIES, {
        'code': 'WHO', 'name_en': 'Duplicate', 'name_ar': 'مكرر',
        'org_type': 'PARTNER',
    }, format='json')
    assert res.status_code == 400


def test_organization_requires_authentication(api_client, organization):
    res = api_client.get(ENTITIES)
    assert res.status_code in (401, 403)


def test_organization_filters_by_status(api_client, admin_user, organization):
    api_client.post(ENTITIES, {
        'code': 'IOM', 'name_en': 'IOM',
        'name_ar': 'المنظمة الدولية للهجرة', 'org_type': 'INTERNATIONAL',
        'status': 'PENDING',
    }, format='json')
    res = api_client.get(f'{ENTITIES}?status=ACTIVE')
    assert res.status_code == 200
    assert res.data['count'] == 1
    assert res.data['results'][0]['code'] == 'WHO'


# ── ApiEndpoint requires an organization ─────────────────────────────────

def test_api_endpoint_requires_organization():
    with pytest.raises(Exception):
        ApiEndpoint.objects.create(
            code='ORPHAN', name_en='No org', name_ar='بلا منظمة',
            base_url='https://example.org',
        )


def test_api_endpoint_links_organization(api_client, admin_user, endpoint, organization):
    res = api_client.get('/api/v1/integration/api-endpoints/')
    assert res.status_code == 200
    row = res.data['results'][0]
    assert str(row['organization']) == str(organization.id)
    assert row['organization_name'] == 'World Health Organization'


# ── Credential encryption ────────────────────────────────────────────────

def test_credential_value_is_encrypted_at_rest(api_client, admin_user, integration):
    res = api_client.post('/api/v1/integration/credentials/', {
        'integration': str(integration.id),
        'key_type': 'API_KEY', 'key_name': 'prod-key', 'value': 'super-secret-plaintext',
    }, format='json')
    assert res.status_code == 201

    stored = EncryptedCredentialValue.objects.get(id=res.data['id'])
    assert stored.encrypted_value != 'super-secret-plaintext'
    assert 'super-secret-plaintext' not in stored.encrypted_value
    assert stored.reveal() == 'super-secret-plaintext'


def test_credential_response_never_returns_value(api_client, admin_user, integration):
    created = api_client.post('/api/v1/integration/credentials/', {
        'integration': str(integration.id),
        'key_type': 'TOKEN', 'key_name': 't1', 'value': 'never-show-me',
    }, format='json')

    listed = api_client.get('/api/v1/integration/credentials/')
    fetched = api_client.get(f"/api/v1/integration/credentials/{created.data['id']}/")

    for res in (created, listed, fetched):
        body = str(res.data)
        assert 'never-show-me' not in body
        assert 'encrypted_value' not in body


def test_credential_requires_admin(api_client, regular_user, integration):
    api_client.force_authenticate(regular_user)
    res = api_client.post('/api/v1/integration/credentials/', {
        'integration': str(integration.id),
        'key_type': 'API_KEY', 'key_name': 'x', 'value': 'y',
    }, format='json')
    assert res.status_code in (401, 403)


# ── Webhook secret redaction ─────────────────────────────────────────────

def test_webhook_secret_is_write_only(api_client, admin_user, organization):
    created = api_client.post('/api/v1/integration/webhook-subscriptions/', {
        'organization': str(organization.id), 'event_type': 'border.alert',
        'endpoint_url': 'https://partner.example.org/hook',
        'secret': 'whsec-topsecret',
    }, format='json')
    assert created.status_code == 201
    assert 'secret' not in created.data

    fetched = api_client.get(
        f"/api/v1/integration/webhook-subscriptions/{created.data['id']}/"
    )
    assert 'whsec-topsecret' not in str(fetched.data)


def test_webhook_secret_stored_on_object(api_client, admin_user, organization):
    api_client.post('/api/v1/integration/webhook-subscriptions/', {
        'organization': str(organization.id), 'event_type': 'lab.result',
        'endpoint_url': 'https://partner.example.org/lab',
        'secret': 'whsec-labs',
    }, format='json')
    assert WebhookSubscription.objects.filter(secret='whsec-labs').exists()


# ── Health evidence ──────────────────────────────────────────────────────

def test_run_check_records_passed_evidence(api_client, admin_user, integration):
    res = api_client.post('/api/v1/integration/health/run_check/', {
        'integration': str(integration.id),
        'check_type': 'connectivity', 'passed': True,
        'detail': 'Handshake succeeded',
    }, format='json')
    assert res.status_code == 201
    assert res.data['data']['passed'] is True
    assert IntegrationHealth.objects.count() == 1


def test_run_check_marks_integration_verified(api_client, admin_user, integration):
    api_client.post('/api/v1/integration/health/run_check/', {
        'integration': str(integration.id), 'check_type': 'connectivity',
        'passed': True, 'detail': 'ok',
    }, format='json')
    integration.refresh_from_db()
    assert integration.status == Integration.Status.VERIFIED
    assert integration.verified_at is not None


def test_run_check_failure_does_not_verify(api_client, admin_user, integration):
    api_client.post('/api/v1/integration/health/run_check/', {
        'integration': str(integration.id), 'check_type': 'connectivity',
        'passed': False, 'detail': 'timeout',
    }, format='json')
    integration.refresh_from_db()
    assert integration.status != Integration.Status.VERIFIED


def test_run_check_redacts_secrets_in_detail(api_client, admin_user, integration):
    api_client.post('/api/v1/integration/health/run_check/', {
        'integration': str(integration.id), 'check_type': 'auth',
        'passed': False,
        'detail': 'failed with api_key=SHOULD_NOT_APPEAR',
    }, format='json')
    record = IntegrationHealth.objects.get()
    assert 'SHOULD_NOT_APPEAR' not in record.detail


def test_run_check_requires_integration_id(api_client, admin_user):
    res = api_client.post('/api/v1/integration/health/run_check/', {
        'check_type': 'connectivity', 'passed': True,
    }, format='json')
    assert res.status_code == 400


def test_run_check_rejects_unknown_integration(api_client, admin_user):
    res = api_client.post('/api/v1/integration/health/run_check/', {
        'integration': '00000000-0000-0000-0000-000000000000',
        'check_type': 'connectivity', 'passed': True,
    }, format='json')
    assert res.status_code == 400


def test_health_list_is_read_only(api_client, admin_user, integration):
    res = api_client.post('/api/v1/integration/health/', {
        'integration': str(integration.id), 'check_type': 'x', 'passed': True,
    }, format='json')
    assert res.status_code == 405


# ── Audit log is read-only ───────────────────────────────────────────────

def test_audit_logs_are_read_only(api_client, admin_user):
    assert api_client.get('/api/v1/integration/audit-logs/').status_code == 200
    res = api_client.post('/api/v1/integration/audit-logs/', {
        'action': 'tamper', 'resource_type': 'organization',
    }, format='json')
    assert res.status_code == 405


# ── Data scopes require admin ────────────────────────────────────────────

def test_data_scopes_require_admin(api_client, regular_user, organization, endpoint):
    api_client.force_authenticate(regular_user)
    res = api_client.post('/api/v1/integration/data-scopes/', {
        'organization': str(organization.id), 'endpoint': str(endpoint.id),
        'direction': 'READ', 'resource': 'traveler',
    }, format='json')
    assert res.status_code in (401, 403)