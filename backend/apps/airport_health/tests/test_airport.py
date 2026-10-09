import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.airport_health.models import (
    AircraftInspection,
    AirportScreening,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)
from apps.airport_health.tests.conftest import (
    assign_airport_inspector,
    assign_carrier_rep,
)
from apps.accounts.models import RoleAssignment
from apps.carriers.models import Carrier, Flight
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'

AIRPORT_URLS = [
    '/api/v1/airport/ports/',
    '/api/v1/airport/terminals/',
    '/api/v1/airport/screening-points/',
    '/api/v1/airport/screenings/',
    '/api/v1/airport/aircraft-inspections/',
    '/api/v1/airport/crew-records/',
    '/api/v1/airport/dashboard/',
]


@pytest.fixture(autouse=True)
def country_sd(db):
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def officer(api_client):
    user = User.objects.create_user(
        email='airport@nqp.gov.sd', password=PASSWORD, full_name='مفتش المطار'
    )
    assign_airport_inspector(user)
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def port(db):
    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def flight(port):
    carrier = Carrier.objects.create(name='سودانير', iata_code='SDN', icao_code='SUD')
    return Flight.objects.create(
        flight_number='SD-101',
        carrier=carrier,
        flight_type=Flight.FlightType.AIR,
        origin_country=Country.objects.get(code='SD'),
        origin_code='KRT',
        destination_port=port,
        scheduled_arrival='2026-08-03T12:00:00Z',
        status=Flight.FlightStatus.ARRIVED,
        notes='',
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
def traveler(port):
    return Traveler.objects.create(
        first_name='أحمد',
        last_name='محمد',
        passport_number='P-AIR-1',
        date_of_birth='1990-01-15',
        nationality=Country.objects.get(code='SD'),
        registration_status='COMPLETED',
    )


def test_list_screenings_and_filter_by_risk(api_client, officer, traveler, point, flight):
    AirportScreening.objects.create(
        traveler=traveler,
        screening_point=point,
        flight=flight,
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        body_temperature=39.2,
        oxygen_saturation=96,
        symptoms=['fever'],
        risk_level=AirportScreening.RiskLevel.RED,
        status=AirportScreening.ScreeningStatus.REFERRED,
        screened_by=officer,
    )
    response = api_client.get('/api/v1/airport/screenings/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    row = payload['results'][0]
    assert row['traveler_name'] == 'أحمد محمد'
    assert row['flight_number'] == 'SD-101'
    assert row['risk_level'] == 'RED'

    filtered = api_client.get('/api/v1/airport/screenings/?risk_level=RED')
    assert filtered.json()['data']['count'] == 1
    filtered = api_client.get('/api/v1/airport/screenings/?risk_level=GREEN')
    assert filtered.json()['data']['count'] == 0


def test_create_screening_computes_risk(api_client, officer, traveler, point, flight):
    response = api_client.post(
        '/api/v1/airport/screenings/',
        {
            'traveler': 'P-AIR-1',
            'screening_point': 'P-ARR-1',
            'flight': 'SD-101',
            'screening_type': 'ARRIVAL',
            'body_temperature': 39.5,
            'oxygen_saturation': 90,
            'symptoms': ['fever', 'cough'],
        },
        format='json',
    )
    assert response.status_code == 201
    data = response.json()['data']
    assert data['risk_level'] == 'RED'


def test_list_inspections_and_filter(api_client, officer, flight):
    AircraftInspection.objects.create(
        aircraft_registration='ST-SUA',
        flight=flight,
        inspector=officer,
        overall_status=AircraftInspection.OverallStatus.PASSED,
    )
    response = api_client.get('/api/v1/airport/aircraft-inspections/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    assert payload['results'][0]['flight_number'] == 'SD-101'
    assert payload['results'][0]['inspector_name'] == 'مفتش المطار'

    filtered = api_client.get('/api/v1/airport/aircraft-inspections/?overall_status=FAILED')
    assert filtered.json()['data']['count'] == 0


def test_list_crew_records(api_client, officer, flight):
    CrewHealthRecord.objects.create(
        crew=officer,
        flight=flight,
        health_status=CrewHealthRecord.HealthStatus.FIT,
    )
    response = api_client.get('/api/v1/airport/crew-records/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    assert payload['results'][0]['crew_name'] == 'مفتش المطار'
    assert payload['results'][0]['flight_number'] == 'SD-101'


def test_list_terminals_and_points(api_client, officer, terminal, point):
    terminals = api_client.get('/api/v1/airport/terminals/')
    assert terminals.json()['data']['count'] == 1
    assert terminals.json()['data']['results'][0]['port_name'] == 'مطار الخرطوم'

    points = api_client.get('/api/v1/airport/screening-points/?point_type=ARRIVAL')
    assert points.json()['data']['count'] == 1


def test_dashboard_kpis_upcoming_flights_and_suspected(api_client, officer, traveler, point, flight):
    from datetime import timedelta

    from django.utils import timezone as tz

    # رحلة اليوم: منتصف ليل UTC دائمًا ضمن تاريخ اليوم وقبل وقت التشغيل (عدا ثوانٍ ما بعد منتصف الليل مباشرة)
    today_flight = Flight.objects.create(
        flight_number='SD-202',
        carrier=flight.carrier,
        flight_type=Flight.FlightType.AIR,
        origin_country=Country.objects.get(code='SD'),
        origin_code='KRT',
        destination_port=flight.destination_port,
        scheduled_arrival=tz.now().replace(hour=0, minute=5, second=0, microsecond=0),
        status=Flight.FlightStatus.ARRIVED,
    )
    # رحلة الغد: مستقبلية دائمًا → تظهر أول قائمة الرحلات القادمة
    tomorrow_flight = Flight.objects.create(
        flight_number='SD-303',
        carrier=flight.carrier,
        flight_type=Flight.FlightType.AIR,
        origin_country=Country.objects.get(code='SD'),
        origin_code='DXB',
        destination_port=flight.destination_port,
        scheduled_arrival=tz.now().replace(hour=12, minute=0, second=0, microsecond=0) + timedelta(days=1),
        status=Flight.FlightStatus.IN_TRANSIT,
    )
    AirportScreening.objects.create(
        traveler=traveler,
        screening_point=point,
        flight=today_flight,
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        body_temperature=39.2,
        risk_level=AirportScreening.RiskLevel.RED,
        status=AirportScreening.ScreeningStatus.PENDING,
        screened_by=officer,
    )
    response = api_client.get('/api/v1/airport/dashboard/')
    assert response.status_code == 200
    data = response.json()['data']

    assert data['kpis']['flights_today'] == 1
    assert data['kpis']['pending_screenings'] == 1
    assert data['kpis']['suspected_cases'] >= 1
    assert data['kpis']['completed_today'] == 0

    assert data['upcoming_flights'][0]['flight_number'] == 'SD-303'

    assert any(s['traveler_name'] == 'أحمد محمد' for s in data['suspected'])
    assert any(t['title'].startswith('فحص رحلة') for t in data['tasks'])

    assert data['report']['flights'] == 1
    assert data['report']['screened'] == 1


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state


# ---------------------------------------------------------------------------
# C5: بيانات صحة المطارات (فحوصات المسافرين + صحة الطاقم) كانت خلف
# `IsAuthenticated` فقط، فقرأها أي حساب مصادق — بما فيه ممثل شركة نقل.
# ---------------------------------------------------------------------------


@pytest.fixture
def other_port(db):
    return Port.objects.create(
        state=_ep_state(),
        code='SDPST',
        name_ar='مطار بورتسودان',
        name_en='Port Sudan Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def other_point(other_port):
    terminal = AirportTerminal.objects.create(
        port=other_port,
        terminal_code='T2',
        name_ar='صالة المغادرة',
        name_en='Departure Hall',
    )
    return ScreeningPoint.objects.create(
        terminal=terminal,
        point_code='P-DEP-1',
        point_type=ScreeningPoint.PointType.DEPARTURE,
    )


@pytest.fixture
def other_traveler(db):
    return Traveler.objects.create(
        first_name='سارة',
        last_name='علي',
        passport_number='P-AIR-2',
        date_of_birth='1988-03-10',
        nationality=Country.objects.get(code='SD'),
        registration_status='COMPLETED',
    )


@pytest.fixture
def port_scoped_officer(login_client, port):
    def assign(user):
        assign_airport_inspector(
            user, scope_type=RoleAssignment.ScopeType.PORT, scope_id=port.id
        )

    return login_client('port-scoped@nqp.gov.sd', assign=assign)


@pytest.mark.parametrize('url', AIRPORT_URLS)
def test_carrier_rep_cannot_read_airport_health(login_client, url):
    """ممثل شركة النقل لا يملك `airport_health:*` — تُرفض كل نقاط النهاية."""
    client, _user = login_client('carrier-rep@nqp.gov.sd', assign=assign_carrier_rep)
    assert client.get(url).status_code == 403, url


@pytest.mark.parametrize('url', AIRPORT_URLS)
def test_authenticated_user_without_roles_cannot_read_airport_health(login_client, url):
    """حساب مصادق بلا أي دور ليس بديلاً عن الصلاحية الدقيقة."""
    client, _user = login_client('plain-user@nqp.gov.sd')
    assert client.get(url).status_code == 403, url


@pytest.mark.parametrize('url', AIRPORT_URLS)
def test_anonymous_cannot_read_airport_health(api_client, url):
    assert api_client.get(url).status_code in (401, 403), url


def test_carrier_rep_cannot_create_screening(login_client, traveler, point):
    client, _user = login_client('carrier-write@nqp.gov.sd', assign=assign_carrier_rep)
    response = client.post(
        '/api/v1/airport/screenings/',
        {'traveler': traveler.passport_number, 'screening_point': point.point_code,
         'screening_type': 'ARRIVAL'},
        format='json',
    )
    assert response.status_code == 403
    assert not AirportScreening.objects.exists()


def test_carrier_rep_cannot_read_crew_health_record(login_client, officer, flight):
    record = CrewHealthRecord.objects.create(
        crew=officer, flight=flight, health_status=CrewHealthRecord.HealthStatus.UNFIT,
        temperature=39.1,
    )
    client, _user = login_client('carrier-crew@nqp.gov.sd', assign=assign_carrier_rep)
    assert client.get('/api/v1/airport/crew-records/').status_code == 403
    assert client.get(f'/api/v1/airport/crew-records/{record.id}/').status_code == 403


def test_port_scoped_officer_sees_only_own_port(
    port_scoped_officer, officer, traveler, point, flight, other_traveler, other_point
):
    client, _user = port_scoped_officer
    own = AirportScreening.objects.create(
        traveler=traveler,
        screening_point=point,
        flight=flight,
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        risk_level=AirportScreening.RiskLevel.RED,
        screened_by=officer,
    )
    foreign = AirportScreening.objects.create(
        traveler=other_traveler,
        screening_point=other_point,
        screening_type=AirportScreening.ScreeningType.DEPARTURE,
        risk_level=AirportScreening.RiskLevel.RED,
        screened_by=officer,
    )
    response = client.get('/api/v1/airport/screenings/')
    assert response.status_code == 200
    assert {row['id'] for row in response.json()['data']['results']} == {str(own.id)}
    assert client.get(f'/api/v1/airport/screenings/{foreign.id}/').status_code == 404


def test_port_scoped_officer_list_is_scoped_per_view(
    port_scoped_officer, officer, terminal, point, flight
):
    client, _user = port_scoped_officer
    assert client.get('/api/v1/airport/terminals/').json()['data']['count'] == 1
    assert client.get('/api/v1/airport/screening-points/').json()['data']['count'] == 1
    assert client.get('/api/v1/airport/screenings/').json()['data']['count'] == 0
    assert client.get('/api/v1/airport/aircraft-inspections/').json()['data']['count'] == 0
    assert client.get('/api/v1/airport/crew-records/').json()['data']['count'] == 0
    assert client.get('/api/v1/airport/ports/').json()['data']['count'] == 1


def test_port_scoped_officer_cannot_write_into_other_port(
    port_scoped_officer, other_traveler, other_point
):
    client, user = port_scoped_officer
    response = client.post(
        '/api/v1/airport/screenings/',
        {'traveler': other_traveler.passport_number,
         'screening_point': other_point.point_code,
         'screening_type': 'ARRIVAL'},
        format='json',
    )
    assert response.status_code == 403
    assert not AirportScreening.objects.filter(screened_by=user).exists()


def test_port_scoped_officer_can_write_into_own_port(
    port_scoped_officer, traveler, point
):
    client, user = port_scoped_officer
    response = client.post(
        '/api/v1/airport/screenings/',
        {'traveler': traveler.passport_number,
         'screening_point': point.point_code,
         'screening_type': 'ARRIVAL',
         'body_temperature': 37.0},
        format='json',
    )
    assert response.status_code == 201, response.content
    assert AirportScreening.objects.filter(screened_by=user).count() == 1


def test_officer_with_station_scope_sees_nothing(
    login_client, officer, traveler, point, flight
):
    """فشل آمن: نطاق لا يُترجم إلى منافذ (STATION) ⇒ لا صفوف.

    دور `AIRPORT_INSPECTOR` المبذور بنطاق `STATION`؛ ما لم يُربط Stations
    بمنافذها فلاtslو مرئي — ويُفضَّل ذلك على كشف كل المطارات.
    """
    AirportScreening.objects.create(
        traveler=traveler, screening_point=point, flight=flight,
        screening_type=AirportScreening.ScreeningType.ARRIVAL, screened_by=officer,
    )

    def assign(user):
        assign_airport_inspector(
            user, scope_type=RoleAssignment.ScopeType.STATION, scope_id=uuid.uuid4()
        )

    client, _user = login_client('station-scope@nqp.gov.sd', assign=assign)
    assert client.get('/api/v1/airport/screenings/').json()['data']['count'] == 0
    assert client.get('/api/v1/airport/crew-records/').json()['data']['count'] == 0


def test_scoped_dashboard_excludes_other_ports(
    port_scoped_officer, officer, traveler, point, flight, other_traveler, other_point
):
    from django.utils import timezone as tz

    foreign_flight = Flight.objects.create(
        flight_number='SD-909',
        carrier=flight.carrier,
        flight_type=Flight.FlightType.AIR,
        origin_country=Country.objects.get(code='SD'),
        origin_code='DXB',
        destination_port=other_point.terminal.port,
        scheduled_arrival=tz.now(),
        status=Flight.FlightStatus.ARRIVED,
    )
    AirportScreening.objects.create(
        traveler=other_traveler, screening_point=other_point, flight=foreign_flight,
        screening_type=AirportScreening.ScreeningType.ARRIVAL,
        risk_level=AirportScreening.RiskLevel.RED, screened_by=officer,
    )
    client, _user = port_scoped_officer
    data = client.get('/api/v1/airport/dashboard/').json()['data']
    assert data['kpis']['flights_today'] == 0
    assert data['kpis']['screened_today'] == 0
    assert data['kpis']['suspected_cases'] == 0
    assert data['upcoming_flights'] == []

