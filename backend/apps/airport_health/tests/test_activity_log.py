"""إصدار سجلات النشاط للمطارات عند نقاط الطفرة الأربع.

يختبر أن إجراءات AirportActivityLog تُصدر عند:
- إنشاء فحص مسافر (AirportScreening)
- إنشاء تفتيش طائرة (AircraftInspection)
- إنشاء سجل طاقم (CrewHealthRecord)
- إضافة/تعديل/حذف موظف مطار (AirportStaff)

لا تُختبر نقطة النهاية (S2) — فقط الإصدار عبر perform_* overrides في الـ viewsets.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.airport_health.models import (
    AirportActivityAction,
    AirportActivityLog,
    AirportStaffRole,
    AirportTerminal,
    ScreeningPoint,
)
from apps.carriers.models import Carrier, Flight
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country, Traveler

User = get_user_model()
PASSWORD = 'StrongPass123!'


def _ensure_role(code, grants, default_scope=RoleAssignment.ScopeType.GLOBAL):
    perms = []
    for resource, action in grants:
        perm, _ = Permission.objects.get_or_create(
            code=f'{resource}:{action}',
            defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code=code,
        defaults={
            'name': code,
            'name_ar': code,
            'description': 'دور اختباري لنشاط المطارات',
            'default_scope': default_scope,
        },
    )
    role.permissions.set(perms)
    return role


def _assign(user, role, *, scope_type=RoleAssignment.ScopeType.GLOBAL, scope_id=None):
    assignment, _ = RoleAssignment.objects.get_or_create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
        defaults={'assigned_by': user, 'is_active': True},
    )
    if not assignment.is_active:
        assignment.is_active = True
        assignment.save(update_fields=['is_active'])
    return assignment


@pytest.fixture
def country(db):
    return Country.objects.create(code='SD', name='السودان', name_ar='السودان')


@pytest.fixture
def port(db, country):
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _ = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _ = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return Port.objects.create(
        state=state,
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def flight(port, country):
    carrier = Carrier.objects.create(name='سودانير', iata_code='SDN', icao_code='SUD')
    return Flight.objects.create(
        flight_number='SD-101',
        carrier=carrier,
        flight_type=Flight.FlightType.AIR,
        origin_country=country,
        origin_code='KRT',
        destination_port=port,
        scheduled_arrival='2026-08-03T12:00:00Z',
        status=Flight.FlightStatus.ARRIVED,
        notes='',
    )


@pytest.fixture
def traveler(port, country):
    return Traveler.objects.create(
        first_name='أحمد',
        last_name='محمد',
        passport_number='P-AIR-1',
        date_of_birth='1990-01-15',
        nationality=country,
        registration_status='COMPLETED',
    )


@pytest.fixture
def terminal(port):
    return AirportTerminal.objects.create(
        port=port, terminal_code='T1', name_ar='صالة الوصول', name_en='Arrival Hall'
    )


@pytest.fixture
def point(terminal):
    return ScreeningPoint.objects.create(
        terminal=terminal,
        point_code='P-ARR-1',
        point_type=ScreeningPoint.PointType.ARRIVAL,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def inspector_client(api_client, port):
    """مُفتّز مطار بصلاحيات airport_health: view/add/edit."""
    user = User.objects.create_user(
        email='inspector@nqp.gov.sd', password=PASSWORD, full_name='مفتش المطار'
    )
    role = _ensure_role('AIRPORT_INSPECTOR_TEST', [('airport_health', a) for a in ('view', 'add', 'edit')])
    _assign(user, role)
    resp = api_client.post('/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    assert resp.status_code == 200, resp.content
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["data"]["access_token"]}')
    return api_client, user


@pytest.fixture
def staff_manager_client(api_client, port):
    """مدير كادر مطار بصلاحيات airport_staff: view/add/edit/delete."""
    user = User.objects.create_user(
        email='staff-manager@nqp.gov.sd', password=PASSWORD, full_name='مدير الكادر'
    )
    role = _ensure_role('AIRPORT_STAFF_MANAGER_TEST', [('airport_staff', a) for a in ('view', 'add', 'edit', 'delete')])
    _assign(user, role)
    resp = api_client.post('/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    assert resp.status_code == 200, resp.content
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["data"]["access_token"]}')
    return api_client, user


def _clear_logs():
    AirportActivityLog.objects.all().delete()


@pytest.mark.django_db
class TestActivityLogEmission:
    def test_screening_create_emits_log(self, inspector_client, port, traveler, flight, point):
        client, user = inspector_client
        _clear_logs()
        resp = client.post(
            '/api/v1/airport/screenings/',
            {
                'traveler': str(traveler.passport_number),
                'screening_point': 'P-ARR-1',
                'flight': str(flight.flight_number),
                'screening_type': 'ARRIVAL',
                'body_temperature': 39.5,
                'oxygen_saturation': 90,
                'symptoms': ['fever', 'cough'],
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        log = AirportActivityLog.objects.filter(action=AirportActivityAction.SCREENING_CREATED).first()
        assert log is not None
        assert log.target_type == 'AirportScreening'
        assert log.actor == user
        assert log.actor_name

    def test_inspection_create_emits_log(self, inspector_client, flight):
        client, user = inspector_client
        _clear_logs()
        resp = client.post(
            '/api/v1/airport/aircraft-inspections/',
            {
                'aircraft_registration': 'ST-SUA',
                'flight': str(flight.flight_number),
                'overall_status': 'PASSED',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        log = AirportActivityLog.objects.filter(action=AirportActivityAction.INSPECTION_CREATED).first()
        assert log is not None
        assert log.target_type == 'AircraftInspection'
        assert log.target_label == 'ST-SUA'
        assert log.actor == user

    def test_crew_record_create_emits_log(self, inspector_client, flight):
        client, user = inspector_client
        _clear_logs()
        resp = client.post(
            '/api/v1/airport/crew-records/',
            {
                'crew': str(user.id),
                'flight': str(flight.flight_number),
                'health_status': 'FIT',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        log = AirportActivityLog.objects.filter(action=AirportActivityAction.CREW_RECORD_CREATED).first()
        assert log is not None
        assert log.target_type == 'CrewHealthRecord'
        assert log.actor == user

    def test_staff_create_update_delete_emits_logs(self, staff_manager_client, port):
        client, user = staff_manager_client
        _clear_logs()

        # create
        resp = client.post(
            '/api/v1/airport/staff/',
            {
                'airport': str(port.id),
                'role': AirportStaffRole.DIRECTOR,
                'full_name': 'د. عبد الله محمد',
                'email': 'director@nqp.gov.sd',
                'phone': '0912345678',
                'shift': 'MORNING',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        staff_id = resp.json()['data']['id']

        # update
        resp2 = client.patch(
            f'/api/v1/airport/staff/{staff_id}/',
            {'phone': '+24999999999'},
            format='json',
        )
        assert resp2.status_code == 200, resp2.content

        # delete
        resp3 = client.delete(f'/api/v1/airport/staff/{staff_id}/')
        assert resp3.status_code == 204, resp3.content

        actions = set(AirportActivityLog.objects.values_list('action', flat=True))
        assert AirportActivityAction.STAFF_CREATED in actions
        assert AirportActivityAction.STAFF_UPDATED in actions
        assert AirportActivityAction.STAFF_DELETED in actions

    def test_activity_log_survives_actor_deletion(self, staff_manager_client, port):
        """الفاعِل يُحدّد NULL عند حذف المستخدم، مع بقاء الاسم المجمَّد."""
        from django.contrib.auth import get_user_model as _get_user_model

        U = _get_user_model()
        client, user = staff_manager_client
        _clear_logs()

        resp = client.post(
            '/api/v1/airport/staff/',
            {
                'airport': str(port.id),
                'role': AirportStaffRole.DIRECTOR,
                'full_name': 'د. سارة أحمد',
                'email': 'sara@nqp.gov.sd',
                'phone': '0911000000',
                'shift': 'MORNING',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        log = AirportActivityLog.objects.first()
        assert log is not None
        assert log.actor == user
        assert log.actor_name

        U.objects.filter(pk=user.pk).delete()
        log.refresh_from_db()
        assert log.actor is None
        assert log.actor_name == 'مدير الكادر'
