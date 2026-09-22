import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.ihr.models import IHREvent, NationalFocalPoint, RiskAssessment, SPARAssessment, SPARIndicator
from apps.laboratory.models import Disease
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.organization.models import Sector as OrgSector

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def login(api_client, db):
    def _login(user):
        client = APIClient()
        resp = client.post(
            '/api/v1/auth/login/',
            {'email': user.email, 'password': PASSWORD},
            format='json',
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
        return client

    return _login


@pytest.fixture
def officer_user():
    return User.objects.create_user(
        email='ihr@nqp.gov.sd', password=PASSWORD, full_name='مسؤول IHR'
    )


@pytest.fixture
def nfp_user():
    return User.objects.create_user(
        email='nfp@nqp.gov.sd', password=PASSWORD, full_name='نقطة الاتصال الوطنية'
    )


@pytest.fixture
def world():
    ms = MasterSector.objects.create(code='SEA_IHR', name_ar='البحري')
    state = State.objects.create(code='RS_IHR', name_ar='البحر الأحمر', sector=ms)
    port = EntryPoint.objects.create(code='PSD_IHR', name_ar='بورتسودان', kind='SEAPORT', state=state)
    org_sector = OrgSector.objects.create(code='RED-IHR', name_ar='البحر الأحمر')
    disease = Disease.objects.create(
        icd_11_code='1A0A', name_ar='كوليرا اختبار', name_en='Test Cholera', ihr_category='PHEIC',
    )
    return {'port': port, 'sector': org_sector, 'disease': disease}


def create_event(client, world):
    resp = client.post(
        '/api/v1/ihr/events/',
        {
            'event_type': 'INFECTIOUS_DISEASE',
            'title': 'تفشٍ مشتبه في المنفذ',
            'description': 'حالات إسهال مائي في المنفذ',
            'disease': world['disease'].id,
            'sector': world['sector'].id,
            'port': world['port'].id,
            'date_detected': '2026-09-01',
            'cases_suspected': 5,
            'cases_confirmed': 1,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    return resp.json()['data']


def test_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/ihr/events/')
    assert resp.status_code in (401, 403)


def test_create_ihr_event_generates_number(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['ihr_event:add', 'ihr_event:view'])
    client = login(officer_user)
    event = create_event(client, world)
    assert event['event_number'].startswith('IHR-SD-')
    assert event['status'] == 'DRAFT'
    assert event['cases_suspected'] == 5


def test_ihr_event_workflow_submit_assess_approve(login, officer_user, nfp_user, world, grant_permissions):
    grant_permissions(
        officer_user,
        codes=['ihr_event:add', 'ihr_event:view', 'ihr_event:submit', 'ihr_event:assess'],
    )
    client = login(officer_user)
    event = create_event(client, world)

    submit = client.post(f"/api/v1/ihr/events/{event['id']}/submit/", format='json')
    assert submit.status_code == 200
    assert submit.json()['data']['status'] == 'UNDER_REVIEW'

    assess = client.post(
        f"/api/v1/ihr/events/{event['id']}/assess/",
        {'hazard': 'كوليرا', 'overall_risk': 'HIGH'},
        format='json',
    )
    assert assess.status_code == 200
    assert assess.json()['data']['overall_risk'] == 'HIGH'

    event_obj = IHREvent.objects.get(id=event['id'])
    assert event_obj.status == IHREvent.Status.NATIONAL_ASSESSMENT
    assert RiskAssessment.objects.filter(event=event_obj).count() == 1

    # مسؤول ترصد (غير NFP) لا يملك صلاحية الاعتماد إطلاقاً
    reject = client.post(f"/api/v1/ihr/events/{event['id']}/approve/", format='json')
    assert reject.status_code == 403
    assert event_obj.reported_by == officer_user

    NationalFocalPoint.objects.create(
        user=nfp_user, nfp_type='PRIMARY', appointed_at='2026-01-01', is_active=True,
    )
    grant_permissions(nfp_user, codes=['ihr_event:view', 'ihr_event:approve', 'ihr_event:notify'])
    nfp_client = login(nfp_user)

    approve = nfp_client.post(f"/api/v1/ihr/events/{event['id']}/approve/", format='json')
    assert approve.status_code == 200, approve.content
    assert approve.json()['data']['status'] == 'NOTIFIABLE'


def test_who_officer_cannot_approve_separation_of_duties(login, officer_user, world, grant_permissions):
    """مسؤول تكامل WHO التقني لا يملك اعتماد سلامة عامة ولا صلاحية إخطار منظمة الصحة من وجهة IHR."""
    grant_permissions(
        officer_user,
        codes=['ihr_event:add', 'ihr_event:view'],
    )
    client = login(officer_user)
    event = create_event(client, world)

    officer = User.objects.create_user(email='who-officer@nqp.gov.sd', password=PASSWORD, full_name='مسؤول WHO')
    grant_permissions(
        officer, role_code='WHO_INTEGRATION_OFFICER',
        codes=['who_integration:view', 'who_integration:sync', 'who_integration:test', 'ihr_event:view'],
    )
    who_client = login(officer)

    assert who_client.post(f"/api/v1/ihr/events/{event['id']}/approve/", format='json').status_code == 403
    assert who_client.post(f"/api/v1/ihr/events/{event['id']}/notify-who/", format='json').status_code == 403


def test_ihr_event_notify_who_requires_notifiable(login, officer_user, world, grant_permissions):
    grant_permissions(
        officer_user,
        codes=['ihr_event:add', 'ihr_event:view', 'ihr_event:notify'],
    )
    client = login(officer_user)
    event = create_event(client, world)
    resp = client.post(f"/api/v1/ihr/events/{event['id']}/notify-who/", format='json')
    assert resp.status_code == 400


def test_ihr_event_search_and_filter(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['ihr_event:add', 'ihr_event:view'])
    client = login(officer_user)
    create_event(client, world)
    resp = client.get('/api/v1/ihr/events/?search=مشتبه')
    assert resp.status_code == 200
    assert len(resp.json()['data']['results']) == 1

    resp = client.get('/api/v1/ihr/events/?status=DRAFT')
    assert resp.status_code == 200
    assert resp.json()['data']['results'][0]['status'] == 'DRAFT'


def test_spar_indicator_seed_and_assessment(login, officer_user, grant_permissions):
    grant_permissions(officer_user, codes=['ihr_spar:view', 'ihr_spar:add'])
    client = login(officer_user)

    indicator = SPARIndicator.objects.create(
        code='C8', name_ar='نقاط الدخول', name_en='Points of Entry', order=8,
    )
    assert str(indicator) == 'C8 - نقاط الدخول'

    resp = client.post(
        '/api/v1/ihr/spar/',
        {'year': 2026, 'indicator': indicator.id, 'score': '3.20', 'gaps': 'مختبر ناقص'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert SPARAssessment.objects.count() == 1

    dup = client.post(
        '/api/v1/ihr/spar/',
        {'year': 2026, 'indicator': indicator.id, 'score': '3.50'},
        format='json',
    )
    assert dup.status_code == 400

    report = client.get('/api/v1/ihr/spar/report/2026/')
    assert report.status_code == 200
    assert report.json()['data']['assessment_count'] == 1
    assert float(report.json()['data']['overall_score']) == 3.20


def test_nfp_assign(login, officer_user, nfp_user, grant_permissions):
    grant_permissions(officer_user, codes=['ihr_nfp:view', 'ihr_nfp:assign'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/ihr/nfp/assign/',
        {'user': nfp_user.id, 'nfp_type': 'PRIMARY', 'appointed_at': '2026-01-01'},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    assert resp.json()['data']['nfp_type'] == 'PRIMARY'
    assert NationalFocalPoint.objects.filter(user=nfp_user).exists()


def test_sector_scope_restricts_events(login, world, grant_permissions):
    from apps.accounts.models import RoleAssignment

    ms_b = MasterSector.objects.create(code='KRD_IHR', name_ar='غربي')
    state_b = State.objects.create(code='KRT_IHR', name_ar='الخرطوم', sector=ms_b)
    port_b = EntryPoint.objects.create(code='KRT_IHRP', name_ar='مطار الخرطوم', kind='AIRPORT', state=state_b)
    sector_b = OrgSector.objects.create(code='KRT-IHR', name_ar='الخرطوم')

    user_a = User.objects.create_user(email='sector-a@nqp.gov.sd', password=PASSWORD, full_name='قطاع البحري')
    user_b = User.objects.create_user(email='officer-b@nqp.gov.sd', password=PASSWORD, full_name='موظف الخرطوم')

    grant_permissions(
        user_a, role_code='SECTOR_IHR_OFFICER', codes=['ihr_event:add', 'ihr_event:view'],
        scope_type=RoleAssignment.ScopeType.SECTOR, scope_id=world['sector'].id,
    )
    grant_permissions(
        user_b, role_code='POE_HEALTH_OFFICER', codes=['ihr_event:add', 'ihr_event:view'],
        scope_type=RoleAssignment.ScopeType.PORT, scope_id=port_b.id,
    )

    event_a = create_event(login(user_a), world)
    event_b = create_event(login(user_b), {**world, 'sector': sector_b, 'port': port_b})

    client_a = login(user_a)
    resp = client_a.get('/api/v1/ihr/events/')
    ids = {e['id'] for e in resp.json()['data']['results']}
    assert event_a['id'] in ids
    assert event_b['id'] not in ids

    client_b = login(user_b)
    resp = client_b.get('/api/v1/ihr/events/')
    ids = {e['id'] for e in resp.json()['data']['results']}
    assert event_b['id'] in ids
    assert event_a['id'] not in ids