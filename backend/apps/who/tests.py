import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.ihr.models import IHREvent
from apps.laboratory.models import Disease
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.organization.models import Sector as OrgSector
from apps.who.models import DiseaseMaster, WHOSyncLog, WHOIntegration
from apps.who.services.event_service import build_event_payload

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db, grant_permissions):
    user = User.objects.create_user(
        email='who@nqp.gov.sd', password='StrongPass123!', full_name='مشرف WHO'
    )
    grant_permissions(
        user,
        codes=['who_diseases:view', 'who_integration:view', 'who_logs:view'],
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def integration():
    return WHOIntegration.objects.create(
        name='WHO Sandbox',
        environment='SANDBOX',
        base_url='https://sandbox.who.example.org',
        client_id='nqp-client',
        authentication_type='OAUTH2',
        is_active=True,
    )


@pytest.fixture
def event(integration):
    ms = MasterSector.objects.create(code='SEA_W', name_ar='البحري')
    state = State.objects.create(code='RS_W', name_ar='البحر الأحمر', sector=ms)
    port = EntryPoint.objects.create(code='PSD_W', name_ar='بورتسودان', kind='SEAPORT', state=state)
    sector = OrgSector.objects.create(code='RED-W', name_ar='البحر الأحمر')
    disease = Disease.objects.create(
        icd_11_code='1A0W', name_ar='كوليرا', name_en='Cholera', ihr_category='PHEIC',
    )
    return IHREvent.objects.create(
        event_type=IHREvent.EventType.INFECTIOUS_DISEASE,
        title='تفشٍ مشتبه',
        description='إسهال مائي حاد',
        disease=disease,
        sector=sector,
        port=port,
        date_detected='2026-09-01',
        cases_suspected=8,
        cases_confirmed=2,
        deaths=1,
        risk_level=IHREvent.RiskLevel.HIGH,
        status=IHREvent.Status.NOTIFIABLE,
    )


def test_who_integration_secret_roundtrip(integration):
    integration.set_client_secret('super-secret-value')
    integration.save(update_fields=['client_secret_encrypted'])
    integration.refresh_from_db()
    assert integration.client_secret == 'super-secret-value'
    assert 'super-secret-value' not in integration.client_secret_encrypted


def test_build_event_payload_minimum_data(event):
    payload = build_event_payload(event)
    assert payload['country'] == 'SDN'
    assert payload['disease']['icd11_code'] == '1A0W'
    assert payload['location']['point_of_entry'] == 'PSD_W'
    assert payload['cases']['confirmed'] == 2
    assert payload['source'] == 'AFYATNA'
    assert 'passport' not in payload


def test_who_sync_log_created_on_direct_request(integration):
    log = WHOSyncLog.objects.create(
        integration=integration,
        operation=WHOSyncLog.Operation.TEST_CONNECTION,
        direction=WHOSyncLog.Direction.OUTBOUND,
        status=WHOSyncLog.Status.SUCCESS,
        http_status=200,
    )
    assert log.completed_at is None
    assert str(log) == 'TEST_CONNECTION - SUCCESS'


def test_disease_master_sync(auth_client, event):
    disease = event.disease
    DiseaseMaster.objects.create(disease=disease, icd11_uri='https://icd.who.int/browse11/id/1A0W', is_notifiable=True)
    resp = auth_client.get('/api/v1/who/diseases/')
    assert resp.status_code == 200, resp.content
    assert len(resp.json()['data']['results']) == 1
    assert resp.json()['data']['results'][0]['disease_name'] == 'كوليرا'


def test_who_status_endpoint(auth_client, integration, db):
    resp = auth_client.get('/api/v1/who/integrations/status/')
    assert resp.status_code == 200
    body = resp.json()['data']
    assert body['configured'] is True
    assert body['connected'] is False
    assert body['environment'] == 'SANDBOX'


def test_who_sync_logs_endpoint(auth_client, integration, db):
    WHOSyncLog.objects.create(
        integration=integration, operation=WHOSyncLog.Operation.STATUS_CHECK,
        status=WHOSyncLog.Status.SUCCESS, http_status=200,
    )
    resp = auth_client.get('/api/v1/who/logs/?status=SUCCESS')
    assert resp.status_code == 200
    assert len(resp.json()['data']['results']) == 1


def test_nfp_role_has_no_technical_who_access(api_client, db, grant_permissions):
    """نقطة الاتصال الوطنية تُشرف وتقرّب ولا تملك أي تحكم تقني في تكامل WHO (فصل مهام)."""
    from apps.accounts.models import RoleAssignment

    user = User.objects.create_user(email='nfp-who@nqp.gov.sd', password='StrongPass123!', full_name='NFP')
    grant_permissions(
        user, role_code='IHR_NFP',
        codes=['ihr_event:view', 'ihr_event:approve', 'ihr_event:notify', 'who_logs:view'],
        scope_type=RoleAssignment.ScopeType.GLOBAL,
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")

    assert client.get('/api/v1/who/integrations/status/').status_code == 403
    assert client.post('/api/v1/who/integrations/test/').status_code == 403
    assert client.post('/api/v1/who/integrations/sync/').status_code == 403