import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.emergency_eoc.models import EmergencyAlert, HealthCase
from apps.integration.models import IntegrationLog
from apps.laboratory.models import Disease
from apps.masterdata.models import State, Sector, EntryPoint

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def client():
    client = APIClient()
    user = User.objects.create_user(
        email='ihr.officer@nqp.gov.sd', password='StrongPass123!', full_name='مسؤول IHR'
    )
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': 'StrongPass123!'}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


@pytest.fixture
def ihr_world(client):
    sector = Sector.objects.create(code='SEC_IHR', name_ar='قطاع IHR')
    state = State.objects.create(code='ST_IHR', name_ar='ولاية IHR', sector=sector)
    port = EntryPoint.objects.create(code='SDKRT_IHR', name_ar='مطار الاختبار', kind='AIRPORT', state=state)
    disease = Disease.objects.create(
        icd_11_code='RA01', name_ar='مرض اختبار', name_en='Test Disease', ihr_category='PHEIC',
    )
    return {'sector': sector, 'state': state, 'port': port, 'disease': disease}


def test_ihr_pheic_report_lists_outbreak_and_cases(client, ihr_world):
    alert = EmergencyAlert.objects.create(
        alert_type=EmergencyAlert.AlertType.OUTBREAK,
        status=EmergencyAlert.AlertStatus.NEW,
        port=ihr_world['port'],
        description='تفشٍ مشتبه في المنفذ',
    )
    HealthCase.objects.create(
        case_number='IHR-C-1',
        disease=ihr_world['disease'],
        case_type=HealthCase.CaseType.CONFIRMED,
        status=HealthCase.Status.ISOLATED,
        port=ihr_world['port'],
        reported_date=timezone.now().date(),
    )

    resp = client.get('/api/v1/integration/ihr/report/pheic/')
    assert resp.status_code == 200, resp.content
    report = resp.json()['data']['report']
    assert report['country'] == 'SDN'
    assert report['summary']['confirmed_cases'] == 1
    assert any(e['source'] == 'alert' for e in report['events'])
    case_ev = next(e for e in report['events'] if e['source'] == 'case')
    assert case_ev['disease']['icd_11_code'] == 'RA01'
    assert case_ev['location']['port_code'] == 'SDKRT_IHR'
    assert case_ev['actions_taken'] == ['Isolation of patient']


def test_ihr_pheic_spar_xml(client, ihr_world):
    HealthCase.objects.create(
        case_number='IHR-C-2',
        disease=ihr_world['disease'],
        case_type=HealthCase.CaseType.CONFIRMED,
        status=HealthCase.Status.ISOLATED,
        port=ihr_world['port'],
        reported_date=timezone.now().date(),
    )
    resp = client.get('/api/v1/integration/ihr/report/pheic/?output=xml')
    assert resp.status_code == 200, resp.content
    spar = resp.json()['data']['spar_xml']
    assert '<IHRReport xmlns="http://www.who.int/ihr/report/1.0">' in spar
    assert '<Country>SDN</Country>' in spar
    assert '<Code>RA01</Code>' in spar
    assert '<Confirmed>1</Confirmed>' in spar


def test_ihr_weekly_report_aggregates_cases(client, ihr_world):
    for i in range(3):
        HealthCase.objects.create(
            case_number=f'IHR-W-{i}',
            disease=ihr_world['disease'],
            case_type=HealthCase.CaseType.CONFIRMED,
            status=HealthCase.Status.ISOLATED,
            port=ihr_world['port'],
            reported_date=timezone.now().date(),
        )
    resp = client.get('/api/v1/integration/ihr/report/weekly/')
    assert resp.status_code == 200, resp.content
    report = resp.json()['data']['report']
    assert report['report_type'] == 'WEEKLY'
    assert report['summary']['confirmed'] == 3
    row = next(e for e in report['events'] if e['disease']['icd_11_code'] == 'RA01')
    assert row['cases']['confirmed'] == 3
    assert row['location']['port_code'] == 'SDKRT_IHR'


def test_ihr_submit_seals_and_logs(client, ihr_world):
    HealthCase.objects.create(
        case_number='IHR-S-1',
        disease=ihr_world['disease'],
        case_type=HealthCase.CaseType.PROBABLE,
        status=HealthCase.Status.ISOLATED,
        port=ihr_world['port'],
        reported_date=timezone.now().date(),
    )
    resp = client.post('/api/v1/integration/ihr/report/submit/', {
        'report_type': 'PHEIC', 'format': 'xml',
    }, format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == 'SEALED'
    assert data['report_id'].startswith('IHR-PHEIC-')
    assert 'spar_xml' in data
    assert IntegrationLog.objects.filter(
        integration_name='WHO', request_type='IHR_SUBMIT_PHEIC', status_code=201,
    ).exists()

    bad = client.post('/api/v1/integration/ihr/report/submit/', {'report_type': 'X'}, format='json')
    assert bad.status_code == 400


def test_ihr_requires_auth(ihr_world):
    anon = APIClient()
    resp = anon.get('/api/v1/integration/ihr/report/pheic/')
    assert resp.status_code in (401, 403)