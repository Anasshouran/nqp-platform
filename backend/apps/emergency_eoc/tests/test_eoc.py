import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port

from ..models import CrisisTeamMember, EmergencyAlert, EmergencyEvent, KillSwitch, ResponsePlan

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db):
    user = User.objects.create_user(
        email='eoc@nqp.gov.sd', password='StrongPass123!', full_name='موظف غرفة الطوارئ'
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
def port(db):
    from apps.travelers.models import Country

    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


def test_alert_created_and_closed(auth_client, port, db):
    alert = EmergencyAlert.objects.create(
        port=port,
        alert_type=EmergencyAlert.AlertType.RED_ALERT,
        description='إغلاق منفذ مؤقت',
    )
    response = auth_client.post(f'/api/v1/emergency/alerts/{alert.id}/close/')
    assert response.status_code == 200
    alert.refresh_from_db()
    assert alert.status == EmergencyAlert.AlertStatus.RESOLVED
    assert alert.resolved_at is not None


def test_kill_switch_activate_deactivate(auth_client, port):
    activate = auth_client.post(
        '/api/v1/emergency/kill-switch/activate/',
        {'port': port.id, 'reason': 'تفشي وباء'},
        format='json',
    )
    assert activate.status_code == 201

    status = auth_client.get('/api/v1/emergency/kill-switch/status/')
    assert status.status_code == 200
    assert status.json()['data']['active'] is True

    duplicate = auth_client.post(
        '/api/v1/emergency/kill-switch/activate/',
        {'port': port.id, 'reason': 'مرة أخرى'},
        format='json',
    )
    assert duplicate.status_code == 400

    deactivate = auth_client.post(
        '/api/v1/emergency/kill-switch/deactivate/',
        {'port': port.id},
        format='json',
    )
    assert deactivate.status_code == 200

    status = auth_client.get('/api/v1/emergency/kill-switch/status/')
    assert status.json()['data']['active'] is False


@pytest.fixture
def team_user(db):
    return User.objects.create_user(
        email='doctor@nqp.gov.sd', password='StrongPass123!', full_name='طبيب', phone='+249900000099'
    )


def test_event_workflow(auth_client, port, team_user, db):
    plan = ResponsePlan.objects.create(
        name='خطة احتواء تفشي',
        steps=[{'step': 1, 'action': 'عزل الحالات'}],
    )

    create = auth_client.post(
        '/api/v1/emergency/events/',
        {
            'title': 'اشتباه حمى نزفية',
            'description': 'حالة مشتبهة في المطار',
            'severity': 'HIGH',
            'location_port': port.id,
        },
        format='json',
    )
    assert create.status_code == 201
    event_id = create.json()['data']['id']
    assert create.json()['data']['event_number'].startswith('E-')

    verify = auth_client.post(
        f'/api/v1/emergency/events/{event_id}/verify/',
        {'status': 'VERIFIED'},
        format='json',
    )
    assert verify.status_code == 200
    assert verify.json()['data']['status'] == 'VERIFIED'

    plan_activate = auth_client.post(
        f'/api/v1/emergency/events/{event_id}/activate-plan/',
        {'response_plan_id': plan.id},
        format='json',
    )
    assert plan_activate.status_code == 200
    assert plan_activate.json()['data']['status'] == 'RESPONDING'

    team = auth_client.post(
        f'/api/v1/emergency/events/{event_id}/team/',
        [{'user': team_user.id, 'role': 'MEDICAL_TEAM'}],
        format='json',
    )
    assert team.status_code == 201

    close = auth_client.post(
        f'/api/v1/emergency/events/{event_id}/close/',
        {'summary': 'تم احتواء الحالة', 'lessons_learned': 'سرعة التبليغ'},
        format='json',
    )
    assert close.status_code == 200
    event = EmergencyEvent.objects.get(id=event_id)
    assert event.status == EmergencyEvent.EventStatus.CLOSED
    assert event.closed_at is not None


def test_dashboard_stats(auth_client, port, db):
    EmergencyAlert.objects.create(
        port=port, alert_type=EmergencyAlert.AlertType.OUTBREAK, description='إنذار'
    )
    response = auth_client.get('/api/v1/emergency/dashboard/')
    assert response.status_code == 200
    assert response.json()['data']['active_alerts'] == 1


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

