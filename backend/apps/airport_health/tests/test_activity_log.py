"""إصدار سجلات النشاط للمطارات عند نقاط الطفرة الأربع + نقطة النهاية.

يختبر أن إجراءات AirportActivityLog تُصدر عند:
- إنشاء فحص مسافر (AirportScreening)
- إنشاء تفتيش طائرة (AircraftInspection)
- إنشاء سجل طاقم (CrewHealthRecord)
- إضافة/تعديل/حذف موظف مطار (AirportStaff)

وأن نقطة النهاية GET /api/v1/airport/activity-log/ تعمل (المصادقة، التفويض،
النطاق المنفذ، حمل حقل المطار في الاستجابة).
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
    """مدير كادر مطار بصلاحيات airport_staff + airport_health:view."""
    user = User.objects.create_user(
        email='staff-manager@nqp.gov.sd', password=PASSWORD, full_name='مدير الكادر'
    )
    role = _ensure_role(
        'AIRPORT_STAFF_MANAGER_TEST',
        [('airport_staff', a) for a in ('view', 'add', 'edit', 'delete')]
        + [('airport_health', 'view')],
    )
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


@pytest.mark.django_db
class TestActivityLogAPI:
    def test_endpoint_requires_auth(self, api_client):
        r = api_client.get('/api/v1/airport/activity-log/')
        assert r.status_code == 401

    def test_user_without_airport_health_perm_cannot_access(self, api_client):
        user = User.objects.create_user(
            email='traveler@nqp.gov.sd', password=PASSWORD, full_name='مسافر'
        )
        _assign(user, _ensure_role('TRAVELER_TEST', []))
        resp = api_client.post(
            '/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json'
        )
        assert resp.status_code == 200, resp.content
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["data"]["access_token"]}')
        r = api_client.get('/api/v1/airport/activity-log/')
        assert r.status_code == 403, r.content

    def test_staff_manager_lists_scoped_entries(self, api_client, port):
        """مدير بم_scope_PORT يرى فقط Entrées لمطار نطاقه."""
        # مدير كادر بصلاحيات airport_staff + airport_health:view، range_PORT على المطار الأول
        user = User.objects.create_user(
            email='staff-manager-scoped@nqp.gov.sd', password=PASSWORD, full_name='مدير الكادر المحدد'
        )
        role = _ensure_role(
            'AIRPORT_STAFF_MANAGER_SCOPED_TEST',
            [('airport_staff', a) for a in ('view', 'add', 'edit', 'delete')]
            + [('airport_health', 'view')],
        )
        _assign(
            user, role,
            scope_type=RoleAssignment.ScopeType.PORT,
            scope_id=port.id,
        )
        resp = api_client.post(
            '/api/v1/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json'
        )
        assert resp.status_code == 200, resp.content
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["data"]["access_token"]}')

        # مطار ثاني خارج نطاق المدير
        from apps.masterdata.models import Sector as MSector, State as MState

        sector_b, _ = MSector.objects.get_or_create(
            code='SEC_T2', defaults={'name_ar': 'قطاع الاختبار 2'}
        )
        state_b, _ = MState.objects.get_or_create(
            code='ST_T2',
            defaults={'name_ar': 'ولاية الاختبار 2', 'sector': sector_b},
        )
        port_b = Port.objects.create(
            state=state_b,
            code='SDKRT2',
            name_ar='مطار ب',
            name_en='Airport B',
            kind=Port.Kind.AIRPORT,
        )

        # Entrées مباشرة على المطارين
        AirportActivityLog.objects.create(
            actor=user,
            actor_name='مدير الكادر المحدد',
            action=AirportActivityAction.STAFF_CREATED,
            description='إضافة موظف — اختبار أ',
            target_type='AirportStaff',
            target_id='00000000-0000-0000-0000-000000000001',
            target_label='اختبار أ',
            airport=port,
        )
        AirportActivityLog.objects.create(
            actor=user,
            actor_name='مدير الكادر المحدد',
            action=AirportActivityAction.STAFF_CREATED,
            description='إضافة موظف — اختبار ب',
            target_type='AirportStaff',
            target_id='00000000-0000-0000-0000-000000000002',
            target_label='اختبار ب',
            airport=port_b,
        )

        r = api_client.get('/api/v1/airport/activity-log/')
        assert r.status_code == 200, r.content
        results = r.json()['data']['results']
        assert len(results) == 1
        assert results[0]['airport'] == str(port.id)
        assert results[0]['airport_name'] == 'مطار الخرطوم'

    def test_emitted_log_carries_airport(self, staff_manager_client, port):
        client, _user = staff_manager_client
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
        staff_id = resp.json()['data']['id']

        r = client.get('/api/v1/airport/activity-log/')
        assert r.status_code == 200, r.content
        results = r.json()['data']['results']
        entry = next((e for e in results if e['target_id'] == staff_id), None)
        assert entry is not None, 'المدخل المنبعث غير موجود'
        assert entry['airport'] == str(port.id)
        assert entry['airport_name'] == 'مطار الخرطوم'

    def test_screening_log_airport_resolved_via_terminal(
        self, inspector_client, port, traveler, flight, point
    ):
        client, _user = inspector_client
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
        log = (
            AirportActivityLog.objects.filter(action=AirportActivityAction.SCREENING_CREATED)
            .order_by('-created_at')
            .first()
        )
        assert log is not None
        assert log.airport_id == point.terminal.port.id
        assert log.airport_id == port.id
