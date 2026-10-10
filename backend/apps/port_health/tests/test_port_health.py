from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.masterdata.models import EntryPoint
from apps.port_health.models import (
    Berth,
    HealthDeclaration,
    SanitationCertificate,
    SeaPort,
    Vessel,
    VesselVisit,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='portadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير صحة الموانئ'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture(scope='session', autouse=True)
def seed_test_masterdata(django_db_setup, django_db_blocker):
    """Seed masterdata in test database for port_health tests."""
    with django_db_blocker.unblock():
        from apps.masterdata.models import EntryPoint, Sector, State
        from apps.organization.models import Sector as OrgSector
        from apps.port_health.models import SeaPort

        # Create minimal masterdata for tests
        org_sector, _ = OrgSector.objects.get_or_create(
            code='RED_SEA', defaults={'name_ar': 'قطاع البحر الأحمر', 'region': 'البحر الأحمر'}
        )
        sector, _ = Sector.objects.get_or_create(
            code='SEA', defaults={'name_ar': 'القطاع البحري', 'name_en': 'Maritime Sector'}
        )
        state, _ = State.objects.get_or_create(
            code='MD_RED_SEA', defaults={'name_ar': 'ولاية البحر الأحمر', 'sector': sector}
        )

        entry_points = {}
        for code, name_ar in [
            ('EP_PORT_SUDAN', 'ميناء بورتسودان'),
            ('EP_SUAKIN', 'ميناء الأمير عثمان دقنة – سواكن'),
            ('EP_MARSABASHAIR', 'ميناء مرسى بشاير'),
            ('EP_ELKHAIR', 'ميناء الخير'),
            ('EP_ZUBEIR', 'ميناء الزبير محمد صالح'),
        ]:
            ep, _ = EntryPoint.objects.get_or_create(
                code=code,
                defaults={
                    'name_ar': name_ar,
                    'kind': 'SEAPORT',
                    'state': state,
                    'sector': org_sector,
                    'is_active': True,
                },
            )
            entry_points[code] = ep

        # Ensure PSC SeaPort exists and is linked
        psc, _ = SeaPort.objects.get_or_create(
            code='PSC',
            defaults={
                'name_ar': 'ميناء بورتسودان',
                'name_en': 'Port Sudan Port',
                'entry_point': entry_points['EP_PORT_SUDAN'],
                'is_active': True,
            },
        )
        if psc.entry_point != entry_points['EP_PORT_SUDAN']:
            psc.entry_point = entry_points['EP_PORT_SUDAN']
            psc.save(update_fields=['entry_point'])

        # Ensure OD SeaPort exists and is linked
        od, _ = SeaPort.objects.get_or_create(
            code='OD',
            defaults={
                'name_ar': 'ميناء عثمان دقنة (سواكن)',
                'name_en': 'Osman Digna Port',
                'entry_point': entry_points['EP_SUAKIN'],
                'is_active': True,
            },
        )
        if od.entry_point != entry_points['EP_SUAKIN']:
            od.entry_point = entry_points['EP_SUAKIN']
            od.save(update_fields=['entry_point'])

        # Archive NP, SP, OSF if they exist
        for code in ['NP', 'SP', 'OSF']:
            sp = SeaPort.objects.filter(code=code).first()
            if sp and sp.is_active:
                sp.is_active = False
                sp.save(update_fields=['is_active'])

        # Create missing SeaPorts for orphan EntryPoints
        for new_code, ep_code in [('MBS', 'EP_MARSABASHAIR'), ('ELK', 'EP_ELKHAIR'), ('ZBR', 'EP_ZUBEIR')]:
            ep = entry_points[ep_code]
            SeaPort.objects.get_or_create(
                code=new_code,
                defaults={
                    'name_ar': ep.name_ar,
                    'name_en': ep.name_en or '',
                    'location': ep.location or '',
                    'is_active': ep.is_active,
                    'entry_point': ep,
                },
            )

    yield

    # هذه الصفوف تُكتب خارج معاملة الاختبار (django_db_blocker.unblock)، فمع
    # `--reuse-db` تتسرّب إلى جلسات لاحقة وتكسر اختبارات أخرى تنشئ الأكواد نفسها
    # (مثل `Sector.objects.create(code='RED_SEA')` في accounts). لذلك تُحذف عند
    # انتهاء الجلسة حتى لا يبقى الأثر خارجها.
    from apps.masterdata.models import EntryPoint, Sector, State
    from apps.organization.models import Sector as OrgSector
    from apps.port_health.models import SeaPort

    with django_db_blocker.unblock():
        for qs in (
            SeaPort.objects.filter(code__in=['PSC', 'OD', 'MBS', 'ELK', 'ZBR']),
            EntryPoint.objects.filter(
                code__in=[
                    'EP_PORT_SUDAN', 'EP_SUAKIN', 'EP_MARSABASHAIR',
                    'EP_ELKHAIR', 'EP_ZUBEIR',
                ],
            ),
            State.objects.filter(code='MD_RED_SEA'),
            Sector.objects.filter(code='SEA'),
            OrgSector.objects.filter(code='RED_SEA'),
        ):
            try:
                qs.delete()
            except ProtectedError:
                pass


@pytest.fixture
def seaport():
    """Use the existing SeaPort from migration data (PSC linked to EP_PORT_SUDAN)."""
    return SeaPort.objects.get(code='PSC')


@pytest.fixture
def vessel(seaport):
    v = Vessel.objects.create(
        vessel_name='MSV الصداقة', imo_number='IMO9301234',
        flag_state='السودان', vessel_type='COMMERCIAL', status='ARRIVED',
    )
    VesselVisit.objects.create(vessel=v, port=seaport, arrival_date=date.today(), status='ARRIVED')
    return v


def test_seaports_list(api_client, admin_user, seaport):
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert 'PSC' in codes


def test_vessels_list(api_client, admin_user, vessel):
    res = api_client.get('/api/v1/port-health/vessels/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['results'][0]['imo_number'] == 'IMO9301234'


def test_vessel_create(api_client, admin_user):
    res = api_client.post(
        '/api/v1/port-health/vessels/',
        {'vessel_name': 'نجمة البحر', 'imo_number': 'IMO9405678', 'flag_state': 'السودان', 'vessel_type': 'FISHING'},
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['vessel_name'] == 'نجمة البحر'


def test_ship_inspection_create(api_client, admin_user, vessel):
    # Phase 1D-6B: `overall_status` is server-derived from the eight zones, so
    # the client submits the zones (defaulting to COMPLIANT) and the verdict
    # comes back as PASSED. Supplying `overall_status` is now a 400.
    res = api_client.post(
        '/api/v1/port-health/ship-inspections/',
        {'vessel': str(vessel.id)},
        format='json',
    )
    assert res.status_code == 201, res.content
    data = res.json()['data']
    assert data['overall_status'] == 'PASSED'
    assert data['inspector_name'] == 'مدير صحة الموانئ'
    assert data['vessel_name'] == 'MSV الصداقة'


def test_ship_inspection_rejects_client_supplied_status(api_client, admin_user, vessel):
    """Phase 1D-6B: the verdict can never be forged by the client."""
    res = api_client.post(
        '/api/v1/port-health/ship-inspections/',
        {'vessel': str(vessel.id), 'overall_status': 'PASSED', 'kitchen_status': 'NON_COMPLIANT'},
        format='json',
    )
    assert res.status_code == 400
    assert 'overall_status' in res.json()


def test_ship_inspection_not_applicable_fails_closed(api_client, admin_user, vessel):
    """Rule 3: NOT_APPLICABLE without NON_COMPLIANT is a 400, never PASSED."""
    res = api_client.post(
        '/api/v1/port-health/ship-inspections/',
        {'vessel': str(vessel.id), 'ventilation_status': 'NOT_APPLICABLE'},
        format='json',
    )
    assert res.status_code == 400
    assert 'zones' in res.json()


def test_declaration_flow(api_client, admin_user, vessel):
    res = api_client.post(
        '/api/v1/port-health/declarations/',
        {
            'vessel': str(vessel.id), 'captain_name': 'ربان', 'declaration_date': str(date.today()),
            'illness_on_board': False, 'deaths_on_board': 0,
        },
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['status'] == 'RECEIVED'


def test_sanitation_certificate(api_client, admin_user, vessel):
    res = api_client.post(
        '/api/v1/port-health/sanitation-certificates/',
        {
            'certificate_number': 'SCC-1', 'certificate_type': 'SSCC', 'vessel': str(vessel.id),
            'issue_date': str(date.today()), 'expiry_date': str(date.today() + timedelta(days=180)),
        },
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['data']['certificate_type'] == 'SSCC'


def test_dashboard_overview(api_client, admin_user, vessel):
    res = api_client.get('/api/v1/port-health/dashboard/overview/')
    assert res.status_code == 200
    data = res.data['data']
    assert data['vessels'] >= 1
    assert data['seaports'] >= 1


def _auth(api_client, user):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


@pytest.fixture
def no_port_role():
    role, _ = Role.objects.get_or_create(
        code='NO_PORT',
        defaults={'name': 'No Port', 'name_ar': 'بدون ميناء', 'description': ''},
    )
    role.permissions.set([])
    return role


@pytest.fixture
def port_scoped_role():
    role, _ = Role.objects.get_or_create(
        code='PORT_ONLY',
        defaults={'name': 'Port Only', 'name_ar': 'ميناء فقط', 'description': ''},
    )
    view, _ = Permission.objects.get_or_create(code='port_health:view', defaults={'resource': 'port_health', 'action': 'view', 'name': 'عرض صحة الموانئ'})
    edit, _ = Permission.objects.get_or_create(code='port_health:edit', defaults={'resource': 'port_health', 'action': 'edit', 'name': 'تعديل صحة الموانئ'})
    role.permissions.set([view, edit])
    return role


def test_seaports_forbidden_without_port_perm(api_client, seaport, no_port_role):
    user = User.objects.create_user(
        email='noport@nqp.gov.sd', password='StrongPass123!', full_name='بدون صلاحية'
    )
    RoleAssignment.objects.create(user=user, role=no_port_role, scope_type='GLOBAL', is_active=True)
    _auth(api_client, user)
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 403


def test_seaports_scoped_to_port(api_client, seaport, port_scoped_role):
    # Use an existing SeaPort with a different EntryPoint
    other = SeaPort.objects.filter(is_active=True).exclude(entry_point_id=seaport.entry_point_id).first()
    user = User.objects.create_user(
        email='scoped@nqp.gov.sd', password='StrongPass123!', full_name='مفعّل الميناء'
    )
    RoleAssignment.objects.create(
        user=user, role=port_scoped_role, scope_type='PORT', scope_id=str(seaport.entry_point_id), is_active=True
    )
    _auth(api_client, user)
    res = api_client.get('/api/v1/port-health/seaports/')
    assert res.status_code == 200
    codes = [r['code'] for r in res.json()['data']['results']]
    assert codes == ['PSC']


def test_viewset_scopes_to_own_port_relation(api_client, seaport, port_scoped_role):
    """المستخدمون على منفذ واحد يجب ألا يروا أرصفة منفذ آخر."""
    other_port = SeaPort.objects.filter(is_active=True).exclude(entry_point_id=seaport.entry_point_id).first()
    mine = Berth.objects.create(port=seaport, code='B1', name_ar='رصيفي')
    theirs = Berth.objects.create(port=other_port, code='B1', name_ar='رصيفهم')
    user = User.objects.create_user(
        email='relation@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم نطاق'
    )
    RoleAssignment.objects.create(
        user=user, role=port_scoped_role, scope_type='PORT', scope_id=str(seaport.entry_point_id), is_active=True
    )
    _auth(api_client, user)
    res = api_client.get('/api/v1/port-health/berths/')
    assert res.status_code == 200
    ids = [r['id'] for r in res.json()['data']['results']]
    assert str(mine.id) in ids
    assert str(theirs.id) not in ids


def test_detail_access_uses_port_id_not_object(api_client, seaport, port_scoped_role):
    """مقارنة الكائن على مستوى الصف تتم بقيمة `port_id` لا بكائن الميناء."""
    other_port = SeaPort.objects.filter(is_active=True).exclude(entry_point_id=seaport.entry_point_id).first()
    mine = Berth.objects.create(port=seaport, code='B1', name_ar='رصيفي')
    theirs = Berth.objects.create(port=other_port, code='B1', name_ar='رصيفهم')
    user = User.objects.create_user(
        email='detail@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم تفصيل'
    )
    RoleAssignment.objects.create(
        user=user, role=port_scoped_role, scope_type='PORT', scope_id=str(seaport.entry_point_id), is_active=True
    )
    _auth(api_client, user)
    assert api_client.get(f'/api/v1/port-health/berths/{mine.id}/').status_code == 200
    assert api_client.get(f'/api/v1/port-health/berths/{theirs.id}/').status_code == 404


def test_berth_creation_requires_permission_not_only_authentication(api_client, seaport):
    """الموديول كان يقبل أي حساب مصادق؛ الآن الإضافة تحتاج `port_health:add`."""
    role, _ = Role.objects.get_or_create(
        code='VIEW_ONLY', defaults={'name': 'View Only', 'name_ar': 'عرض فقط'},
    )
    view, _ = Permission.objects.get_or_create(
        code='port_health:view',
        defaults={'resource': 'port_health', 'action': 'view', 'name': 'عرض صحة الموانئ'},
    )
    role.permissions.set([view])
    user = User.objects.create_user(
        email='viewer@nqp.gov.sd', password='StrongPass123!', full_name='مشاهد'
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='GLOBAL', is_active=True
    )
    _auth(api_client, user)
    assert api_client.get('/api/v1/port-health/berths/').status_code == 200
    res = api_client.post(
        '/api/v1/port-health/berths/',
        {'port': str(seaport.id), 'code': 'B9', 'name_ar': 'رصيف جديد'},
        format='json',
    )
    assert res.status_code == 403
