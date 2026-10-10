"""اختبارات نظام صحة المعابر البرية.

تغطي: العزل (envelope)، إنشاء/قراءة النماذج، قابلية قراءة الحقول المسطّحة،
سلوك الفشل الآمن للنطاق، ومسارات المسار متعدد المستويات.
"""
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.borders_health.models import (
    BorderCertificate,
    BorderSample,
    BorderCrossing,
    BorderDailyStatistics,
    BorderEmergency,
    BorderFacility,
    BorderScreening,
    BorderShift,
    BorderStaff,
    BorderDecision,
    CargoInspection,
    Contact,
    ContactTracingCase,
    HealthDeclaration,
    IsolationCase,
    QuarantineCase,
    TravelerHealthRecord,
    Vehicle,
    VehicleInspection,
)
from apps.masterdata.models import EntryPoint
from apps.travelers.models import Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def state():
    """`State.sector` يشير إلى `masterdata.Sector` (لا `organization.Sector`)."""
    from apps.masterdata.models import Sector, State
    sector = Sector.objects.create(code='KHF', name_ar='الخرطوم')
    return State.objects.create(code='KRD', name_ar='كردفان', sector=sector)


@pytest.fixture
def entry_point_a(state):
    return EntryPoint.objects.create(
        code='BD-W', name_ar='معبر أم درمان', kind=EntryPoint.Kind.LAND_PORT, state=state,
    )


@pytest.fixture
def entry_point_b(state):
    return EntryPoint.objects.create(
        code='BD-N', name_ar='معبر اللفة', kind=EntryPoint.Kind.LAND_PORT, state=state,
    )


@pytest.fixture
def crossing_a(entry_point_a):
    return BorderCrossing.objects.create(
        entry_point=entry_point_a, neighbor_country='تشاد', operating_status='OPEN',
    )


@pytest.fixture
def crossing_b(entry_point_b):
    return BorderCrossing.objects.create(
        entry_point=entry_point_b, neighbor_country='إثيوبيا', operating_status='OPEN',
    )


@pytest.fixture
def traveler():
    """`Traveler.full_name` خاصية محسوبة من first_name + last_name (بلا setter)."""
    from apps.travelers.models import Country
    country = Country.objects.create(code='SDN', name_ar='السودان')
    return Traveler.objects.create(
        first_name='محمد', last_name='علي', date_of_birth=date(1990, 1, 1),
        passport_number='P1234567', nationality=country,
    )


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='borderadmin@nqp.gov.sd', password=PASSWORD, full_name='مدير المعابر'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD},
        format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


def _scoped_user(api_client, email, resource, scope_type, scope_id, extra=()):
    """مستخدم بصلاحيات CRUD ونطاق واحد — لاختبار العزل."""
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    role = Role.objects.create(
        code=email.upper().replace('@', '_').replace('.', '_')[:50],
        name=email, default_scope=scope_type,
    )
    for action in ('view', 'add', 'edit', 'delete', *extra):
        perm, _ = Permission.objects.get_or_create(
            code=f'{resource}:{action}',
            defaults={'name': f'{resource} {action}', 'resource': resource, 'action': action},
        )
        role.permissions.add(perm)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, is_active=True,
    )
    login = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


# ---------------------------------------------------------------------------
# التسجيل والعزل
# ---------------------------------------------------------------------------


def test_crossings_list_envelope(api_client, admin_user, crossing_a):
    res = api_client.get('/api/v1/borders-health/crossings/')
    assert res.status_code == 200
    body = res.json()
    assert body['status'] == 'success'
    assert body['data']['results'][0]['entry_point_code'] == 'BD-W'


def test_crossing_flat_fields_are_readable(
    api_client, admin_user, crossing_a, state
):
    """اسم المعبر وولايته يُقرآن كنص — لا كائن ولا دالة."""
    res = api_client.get(f'/api/v1/borders-health/crossings/{crossing_a.id}/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['name_ar'] == 'معبر أم درمان'
    assert data['neighbor_state'] == 'كردفان'


def test_traveler_related_names_resolve(
    api_client, admin_user, crossing_a, traveler
):
    """`traveler.full_name` خاصية، و`passport_number` حقل — كلاهما نص."""
    TravelerHealthRecord.objects.create(
        crossing=crossing_a, traveler=traveler, direction='INBOUND',
        health_status='CLEARED', decision='CLEARED',
    )
    res = api_client.get('/api/v1/borders-health/traveler-records/')
    assert res.status_code == 200
    row = res.json()['data']['results'][0]
    assert row['traveler_name'] == 'محمد علي'
    assert row['passport_number'] == 'P1234567'
    assert row['crossing_name'] == 'معبر أم درمان'


# ---------------------------------------------------------------------------
# إنشاء عبر الـ API
# ---------------------------------------------------------------------------


def test_screening_create_sets_screened_by_from_request(
    api_client, admin_user, crossing_a, traveler
):
    res = api_client.post(
        '/api/v1/borders-health/screenings/',
        {
            'crossing': str(crossing_a.id), 'traveler': str(traveler.id),
            'body_temperature': '37.2', 'risk_level': 'GREEN', 'decision': 'CLEARED',
        },
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['screened_by_name'] == 'مدير المعابر'
    assert data['passport_number'] == 'P1234567'


def test_vehicle_inspection_create(api_client, admin_user, crossing_a):
    vehicle = Vehicle.objects.create(
        crossing=crossing_a, plate_number='SD-AB-1234', vehicle_type='BUS',
    )
    res = api_client.post(
        '/api/v1/borders-health/vehicle-inspections/',
        {'vehicle': str(vehicle.id), 'inspection_type': 'EXTERIOR', 'overall_status': 'PASSED'},
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['plate_number'] == 'SD-AB-1234'
    assert data['inspector_name'] == 'مدير المعابر'


def test_quarantine_case_generates_case_number(
    api_client, admin_user, crossing_a, traveler
):
    """رقم الحالة يُولَّد تلقائياً — فلا يقع تعارض `unique` على القيم الفارغة."""
    first = QuarantineCase.objects.create(crossing=crossing_a, traveler=traveler)
    second = QuarantineCase.objects.create(crossing=crossing_a, traveler=traveler)
    assert first.case_number
    assert first.case_number != second.case_number
    assert QuarantineCase.objects.filter(crossing=crossing_a).count() == 2


def test_crossing_status_action(api_client, admin_user, crossing_a):
    res = api_client.patch(
        f'/api/v1/borders-health/crossings/{crossing_a.id}/status/',
        {'operating_status': 'CLOSED', 'closure_reason': 'أمني'},
        format='json',
    )
    assert res.status_code == 200, res.content
    assert res.json()['data']['operating_status'] == 'CLOSED'


def test_crossing_status_action_rejects_unknown(
    api_client, admin_user, crossing_a
):
    res = api_client.patch(
        f'/api/v1/borders-health/crossings/{crossing_a.id}/status/',
        {'operating_status': 'NONSENSE'},
        format='json',
    )
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# العزل حسب النطاق — الفشل الآمن
# ---------------------------------------------------------------------------


def test_scope_limits_list_to_assigned_crossing(
    api_client, crossing_a, crossing_b, traveler
):
    _scoped_user(
        api_client, 'officer@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, crossing_a.entry_point_id,
    )
    TravelerHealthRecord.objects.create(
        crossing=crossing_a, traveler=traveler, direction='INBOUND',
    )
    TravelerHealthRecord.objects.create(
        crossing=crossing_b, traveler=traveler, direction='INBOUND',
    )
    res = api_client.get('/api/v1/borders-health/traveler-records/')
    assert res.status_code == 200
    rows = res.json()['data']['results']
    assert len(rows) == 1
    assert rows[0]['crossing_name'] == 'معبر أم درمان'


def test_scope_blocks_object_outside_assignment(
    api_client, crossing_a, crossing_b, traveler
):
    """هذا هو ما كان `MultiHopScopeFilter` سيمنعه لولا معالجته."""
    _scoped_user(
        api_client, 'officer2@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, crossing_a.entry_point_id,
    )
    outside = TravelerHealthRecord.objects.create(
        crossing=crossing_b, traveler=traveler, direction='INBOUND',
    )
    res = api_client.get(f'/api/v1/borders-health/traveler-records/{outside.id}/')
    assert res.status_code in (403, 404)
    inside = TravelerHealthRecord.objects.create(
        crossing=crossing_a, traveler=traveler, direction='INBOUND',
    )
    res_ok = api_client.get(f'/api/v1/borders-health/traveler-records/{inside.id}/')
    assert res_ok.status_code == 200, res_ok.content


def test_deep_scope_path_object_access(api_client, crossing_a, crossing_b):
    """المسار `vehicle__crossing__entry_point` علىVehicleInspection."""
    _scoped_user(
        api_client, 'insp@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, crossing_a.entry_point_id,
    )
    v_in = Vehicle.objects.create(crossing=crossing_a, plate_number='IN-1')
    v_out = Vehicle.objects.create(crossing=crossing_b, plate_number='OUT-1')
    user = User.objects.get(email='insp@nqp.gov.sd')
    ok = VehicleInspection.objects.create(
        vehicle=v_in, inspection_type='EXTERIOR', inspector=user,
    )
    bad = VehicleInspection.objects.create(
        vehicle=v_out, inspection_type='EXTERIOR', inspector=user,
    )
    assert api_client.get(
        f'/api/v1/borders-health/vehicle-inspections/{ok.id}/'
    ).status_code == 200
    assert api_client.get(
        f'/api/v1/borders-health/vehicle-inspections/{bad.id}/'
    ).status_code in (403, 404)


def test_deep_scope_path_contact(api_client, crossing_a, crossing_b, traveler):
    """المسار `tracing_case__crossing__entry_point` علىContact (ثلاثة مستويات)."""
    _scoped_user(
        api_client, 'trace@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, crossing_a.entry_point_id,
    )
    t_in = ContactTracingCase.objects.create(crossing=crossing_a, transport_mode='LAND')
    t_out = ContactTracingCase.objects.create(crossing=crossing_b, transport_mode='LAND')
    c_in = Contact.objects.create(tracing_case=t_in, full_name='داخل')
    c_out = Contact.objects.create(tracing_case=t_out, full_name='خارج')
    assert api_client.get(
        f'/api/v1/borders-health/contacts/{c_in.id}/'
    ).status_code == 200
    assert api_client.get(
        f'/api/v1/borders-health/contacts/{c_out.id}/'
    ).status_code in (403, 404)


def test_no_scope_denies_everything(api_client, crossing_a, traveler):
    """صلاحية بلا نطاق ⇒ لا صفوف (فشل آمن، لا تسريب وطني)."""
    _scoped_user(
        api_client, 'noscope@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, None,
    )
    TravelerHealthRecord.objects.create(crossing=crossing_a, traveler=traveler)
    res = api_client.get('/api/v1/borders-health/traveler-records/')
    assert res.status_code == 200
    assert res.json()['data']['results'] == []


def test_missing_permission_denies(api_client, crossing_a, traveler):
    """مستخدم بدور بلا صلاحية borders_health يُمنع كلياً."""
    user = User.objects.create_user(email='noperm@nqp.gov.sd', password=PASSWORD)
    Role.objects.create(code='NOROLE', name='NOROLE', default_scope='GLOBAL')
    RoleAssignment.objects.create(
        user=user, role=Role.objects.get(code='NOROLE'),
        scope_type=RoleAssignment.ScopeType.GLOBAL, scope_id=None, is_active=True,
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'noperm@nqp.gov.sd', 'password': PASSWORD}, format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    res = api_client.get('/api/v1/borders-health/traveler-records/')
    assert res.status_code == 403


def test_anonymous_denied(api_client, crossing_a):
    res = api_client.get('/api/v1/borders-health/crossings/')
    assert res.status_code in (401, 403)


# ---------------------------------------------------------------------------
# لوحة القيادة
# ---------------------------------------------------------------------------


def test_dashboard_overview(api_client, admin_user, crossing_a, traveler):
    TravelerHealthRecord.objects.create(
        crossing=crossing_a, traveler=traveler, direction='INBOUND', risk_level='RED',
    )
    QuarantineCase.objects.create(
        crossing=crossing_a, traveler=traveler, required_days=14,
        status=QuarantineCase.QuarantineStatus.UNDER_QUARANTINE,
    )
    res = api_client.get('/api/v1/borders-health/dashboard/overview/')
    assert res.status_code == 200, res.content
    data = res.json()['data']
    assert data['crossings'] == 1
    assert data['open_crossings'] == 1
    assert data['active_quarantine'] == 1
    assert data['suspected_cases'] == 1


def test_dashboard_performance_annotations_resolve(api_client, admin_user, crossing_a, traveler):
    """Count عبر related_names: traveler_records / vehicles__inspections / cargo_inspections."""
    Vehicle.objects.create(crossing=crossing_a, plate_number='P-1')
    VehicleInspection.objects.create(
        vehicle=Vehicle.objects.get(crossing=crossing_a),
        inspection_type='EXTERIOR', inspector=admin_user,
    )
    CargoInspection.objects.create(crossing=crossing_a, scope='CARGO')
    TravelerHealthRecord.objects.create(crossing=crossing_a, traveler=traveler)
    res = api_client.get('/api/v1/borders-health/dashboard/crossing-performance/')
    assert res.status_code == 200, res.content
    row = res.json()['data']['results'][0]
    assert row['records_count'] == 1
    assert row['vehicle_inspections_count'] == 1
    assert row['cargo_count'] == 1


def test_dashboard_traffic_trend(api_client, admin_user, crossing_a):
    BorderDailyStatistics.objects.create(
        crossing=crossing_a, stat_date=date.today(), travelers_inbound=10, travelers_outbound=5,
    )
    res = api_client.get('/api/v1/borders-health/dashboard/traffic-trend/?days=7')
    assert res.status_code == 200, res.content
    rows = res.json()['data']['results']
    assert rows[0]['inbound'] == 10
    assert rows[0]['outbound'] == 5


def test_dashboard_respects_scope(api_client, crossing_a, crossing_b, traveler):
    """اللوحة القومية لا تتجاوز نطاق المستخدم."""
    _scoped_user(
        api_client, 'dash@nqp.gov.sd', 'borders_health',
        RoleAssignment.ScopeType.PORT, crossing_a.entry_point_id,
        extra=('dashboard_view',),
    )
    TravelerHealthRecord.objects.create(crossing=crossing_a, traveler=traveler)
    TravelerHealthRecord.objects.create(crossing=crossing_b, traveler=traveler)
    res = api_client.get('/api/v1/borders-health/dashboard/overview/')
    assert res.status_code == 200, res.content
    data = res.json()['data']
    assert data['crossings'] == 1
    assert data['travelers_today'] == 1


# ---------------------------------------------------------------------------
# إجراءات النطاق (services مربوطة بالـ API)
# ---------------------------------------------------------------------------


def test_screening_create_auto_decides_from_vitals(
    api_client, admin_user, crossing_a, traveler
):
    """القرار يُحسَب من القياسات دون إرساله من العميل."""
    res = api_client.post(
        '/api/v1/borders-health/screenings/',
        {
            'crossing': str(crossing_a.id), 'traveler': str(traveler.id),
            'body_temperature': '38.7', 'document_verified': True,
        },
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['risk_level'] == 'RED'
    assert data['decision'] == 'QUARANTINED'


def test_screening_create_holds_without_documents(
    api_client, admin_user, crossing_a, traveler
):
    res = api_client.post(
        '/api/v1/borders-health/screenings/',
        {'crossing': str(crossing_a.id), 'traveler': str(traveler.id),
         'body_temperature': '36.9', 'document_verified': False},
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['risk_level'] == 'YELLOW'
    assert data['decision'] == 'HOLD'


def test_screening_reassess_action(api_client, admin_user, crossing_a, traveler):
    screening = BorderScreening.objects.create(
        crossing=crossing_a, traveler=traveler, body_temperature=36.8,
        document_verified=True, risk_level='GREEN', decision='CLEARED',
    )
    res = api_client.post(
        f'/api/v1/borders-health/screenings/{screening.id}/reassess/',
        {'body_temperature': 39.2},
        format='json',
    )
    assert res.status_code == 200, res.content
    data = res.json()['data']
    assert data['risk_level'] == 'RED'
    assert data['decision'] == 'QUARANTINED'


def test_certificate_issue_endpoint_generates_number(
    api_client, admin_user, crossing_a, traveler
):
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/',
        {
            'crossing': str(crossing_a.id), 'certificate_type': 'HEALTH_CLEARANCE',
            'traveler': str(traveler.id), 'expiry_days': 14,
        },
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['certificate_number'].startswith('BC-')
    assert data['status'] == 'ISSUED'
    assert data['issued_by_name'] == 'مدير المعابر'
    assert data['certificate_number'] in data['qr_payload']


def test_certificate_issue_requires_fields(api_client, admin_user, crossing_a):
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/', {}, format='json'
    )
    assert res.status_code == 400


def test_certificate_issue_rejects_vehicle_from_another_crossing(
    api_client, admin_user, crossing_a, crossing_b,
):
    """لا يجوز ختم شهادة بمركبة من معبر آخر — تسريب عبر حدود النطاق."""
    other_vehicle = Vehicle.objects.create(
        crossing=crossing_b, plate_number='KH-OTHER-1', vehicle_type='BUS',
    )
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/',
        {
            'crossing': str(crossing_a.id),
            'certificate_type': 'HEALTH_CLEARANCE',
            'vehicle': str(other_vehicle.id),
        },
        format='json',
    )
    assert res.status_code == 400, res.content
    assert 'vehicle' in res.json()
    assert BorderCertificate.objects.count() == 0


def test_certificate_issue_rejects_vehicle_inspection_from_another_crossing(
    api_client, admin_user, crossing_a, crossing_b,
):
    other_vehicle = Vehicle.objects.create(
        crossing=crossing_b, plate_number='KH-OTHER-2', vehicle_type='TRUCK',
    )
    other_inspection = VehicleInspection.objects.create(
        vehicle=other_vehicle, inspection_type='EXTERIOR', overall_status='COMPLIANT',
    )
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/',
        {
            'crossing': str(crossing_a.id),
            'certificate_type': 'VEHICLE_CLEARANCE',
            'vehicle_inspection': str(other_inspection.id),
        },
        format='json',
    )
    assert res.status_code == 400, res.content
    assert 'vehicle_inspection' in res.json()
    assert BorderCertificate.objects.count() == 0


def test_certificate_issue_accepts_vehicle_from_same_crossing(
    api_client, admin_user, crossing_a,
):
    vehicle = Vehicle.objects.create(
        crossing=crossing_a, plate_number='KH-SAME-1', vehicle_type='BUS',
    )
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/',
        {
            'crossing': str(crossing_a.id),
            'certificate_type': 'VEHICLE_CLEARANCE',
            'vehicle': str(vehicle.id),
        },
        format='json',
    )
    assert res.status_code == 201, res.content
    assert res.json()['data']['vehicle'] == str(vehicle.id)


def test_cargo_decide_computes_from_samples(api_client, admin_user, crossing_a):
    cargo = CargoInspection.objects.create(crossing=crossing_a, scope='FOOD')
    BorderSample.objects.create(
        crossing=crossing_a, cargo_inspection=cargo, sample_type='FOOD',
        status=BorderSample.SampleStatus.RESULT_RECEIVED, result='Positive',
    )
    res = api_client.post(
        f'/api/v1/borders-health/cargo-inspections/{cargo.id}/decide/',
        {}, format='json',
    )
    assert res.status_code == 200, res.content
    data = res.json()['data']
    assert data['decision'] == 'REJECTED'
    assert data['status'] == 'REJECTED'


def test_cargo_decide_rejects_unknown_outcome(api_client, admin_user, crossing_a):
    cargo = CargoInspection.objects.create(crossing=crossing_a, scope='FOOD')
    res = api_client.post(
        f'/api/v1/borders-health/cargo-inspections/{cargo.id}/decide/',
        {'decision': 'WHATEVER'}, format='json',
    )
    assert res.status_code == 400


def test_daily_stats_refresh_endpoint(api_client, admin_user, crossing_a, traveler):
    TravelerHealthRecord.objects.create(crossing=crossing_a, traveler=traveler)
    res = api_client.post(
        '/api/v1/borders-health/daily-statistics/refresh/',
        {'crossing': str(crossing_a.id)}, format='json',
    )
    assert res.status_code == 200, res.content
    rows = res.json()['data']['results']
    assert len(rows) == 1
    assert rows[0]['travelers_inbound'] == 1


def test_daily_stats_refresh_rejects_bad_date(api_client, admin_user, crossing_a):
    res = api_client.post(
        '/api/v1/borders-health/daily-statistics/refresh/',
        {'stat_date': 'not-a-date'}, format='json',
    )
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# أمر البذر
# ---------------------------------------------------------------------------


def test_seed_borders_health_creates_profile_per_land_port(
    api_client, admin_user, entry_point_a, entry_point_b
):
    """كل نقطة دخول برية تحصل على ملف تشغيلي ومرافق، والتشغيل متكرر آمن."""
    from django.core.management import call_command

    from apps.borders_health.models import BorderFacility

    # نقطة جوية يجب ألّا تُبذر كمعبر بري.
    EntryPoint.objects.create(
        code='EP_AIR', name_ar='مطار', kind=EntryPoint.Kind.AIRPORT, state=entry_point_a.state,
    )

    call_command('seed_borders_health', verbosity=0)

    land = EntryPoint.objects.filter(kind=EntryPoint.Kind.LAND_PORT)
    assert land.count() == 2
    assert BorderCrossing.objects.count() == 2
    for ep in land:
        crossing = ep.border_crossing
        assert crossing.operating_status == BorderCrossing.BorderStatus.OPEN
        assert BorderFacility.objects.filter(crossing=crossing).exists()

    # إعادة التشغيل لا تُنشئ تكراراً.
    before = BorderFacility.objects.count()
    call_command('seed_borders_health', verbosity=0)
    assert BorderFacility.objects.count() == before


# ---------------------------------------------------------------------------
# صلاحيات الإجراءات المخصّصة — لا يجوز أن تسقط إلى `view`
# ---------------------------------------------------------------------------


def _limited_user(api_client, email, actions, crossing):
    """مستخدم يملك صلاحيات محدّدة فقط على `borders_health`."""
    user = User.objects.create_user(email=email, password=PASSWORD, full_name=email)
    role = Role.objects.create(
        code=email.upper().replace('@', '_').replace('.', '_')[:50],
        name=email, default_scope=RoleAssignment.ScopeType.PORT,
    )
    for action in actions:
        perm, _ = Permission.objects.get_or_create(
            code=f'borders_health:{action}',
            defaults={
                'name': f'borders_health {action}',
                'resource': 'borders_health', 'action': action,
            },
        )
        role.permissions.add(perm)
    RoleAssignment.objects.create(
        user=user, role=role,
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=crossing.entry_point_id, is_active=True,
    )
    login = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}"
    )
    return user


@pytest.mark.parametrize('actions,method,path,body,denied_on', [
    # `view` وحدها لا تكفي لإصدار شهادة.
    (['view'], 'post', '/api/v1/borders-health/certificates/issue/',
     {'certificate_type': 'HEALTH_CLEARANCE'}, 'issue'),
    # ولا لتغيير حالة معبر.
    (['view'], 'patch', None, None, 'change_status'),
    # ولا لإعادة تقييم فحص.
    (['view'], 'post', None, None, 'reassess'),
    # ولا لاتخاذ قرار شحنة.
    (['view'], 'post', None, None, 'decide'),
    # ولا لتحديث الإحصاءات.
    (['view'], 'post', '/api/v1/borders-health/daily-statistics/refresh/',
     {}, 'refresh'),
])
def test_custom_actions_reject_view_only_role(
    api_client, crossing_a, traveler, actions, method, path, body, denied_on,
):
    """regression: كان `ACTION_TO_PERMISSION.get(action, 'view')`
    يمنح دوراً يملك `view` فقط حق كل الإجراءات المخصّصة."""
    _limited_user(api_client, f'viewonly-{denied_on}@nqp.gov.sd', actions, crossing_a)

    if denied_on == 'change_status':
        res = api_client.patch(
            f'/api/v1/borders-health/crossings/{crossing_a.id}/status/',
            {'operating_status': 'CLOSED'}, format='json',
        )
    elif denied_on == 'reassess':
        screening = BorderScreening.objects.create(
            crossing=crossing_a, traveler=traveler,
            decision=BorderScreening.Decision.HOLD,
        )
        res = api_client.post(
            f'/api/v1/borders-health/screenings/{screening.id}/reassess/',
            {}, format='json',
        )
    elif denied_on == 'decide':
        cargo = CargoInspection.objects.create(crossing=crossing_a, scope='FOOD')
        res = api_client.post(
            f'/api/v1/borders-health/cargo-inspections/{cargo.id}/decide/',
            {}, format='json',
        )
    else:
        res = api_client.post(path, body, format='json')

    assert res.status_code == 403, f'{denied_on} must not be allowed for view-only: {res.content}'


def test_certificate_issue_allowed_with_certificate_issue_permission(
    api_client, crossing_a,
):
    _limited_user(
        api_client, 'issuer@nqp.gov.sd',
        ['view', 'certificate_issue'], crossing_a,
    )
    res = api_client.post(
        '/api/v1/borders-health/certificates/issue/',
        {'crossing': str(crossing_a.id), 'certificate_type': 'HEALTH_CLEARANCE'},
        format='json',
    )
    assert res.status_code == 201, res.content
    assert res.json()['data']['certificate_number'].startswith('BC-')


def test_crossing_status_change_allowed_with_edit_permission(api_client, crossing_a):
    _limited_user(api_client, 'editor@nqp.gov.sd', ['view', 'edit'], crossing_a)
    res = api_client.patch(
        f'/api/v1/borders-health/crossings/{crossing_a.id}/status/',
        {'operating_status': 'RESTRICTED', 'closure_reason': 'أمني'},
        format='json',
    )
    assert res.status_code == 200, res.content
    assert res.json()['data']['operating_status'] == 'RESTRICTED'


def test_dashboard_overview_allowed_with_dashboard_view(api_client, crossing_a):
    _limited_user(api_client, 'dash@nqp.gov.sd', ['view', 'dashboard_view'], crossing_a)
    res = api_client.get('/api/v1/borders-health/dashboard/overview/')
    assert res.status_code == 200, res.content
