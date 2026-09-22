import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment
from apps.masterdata.models import EntryPoint, Sector, State
from apps.organization.models import Sector as AdminSector
from apps.vector_control.models import (
    InventoryMovement,
    OpChemicalLine,
    VectorChemical,
    VectorControlOperation,
    VectorFocus,
    VectorInventoryItem,
    VectorLabResult,
    VectorRegistry,
    VectorReport,
    VectorSample,
    VectorSurvey,
    VectorTeam,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(api_client):
    user = User.objects.create_superuser(
        email='vectoradmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير النواقل'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def admin_sector():
    return AdminSector.objects.create(code='RS', name_ar='قطاع البحر الأحمر')


@pytest.fixture
def entry_point(admin_sector):
    sector = Sector.objects.create(code='SEC_SEA', name_ar='قطاع بحري')
    state = State.objects.create(code='ST_RS', name_ar='ولاية البحر الأحمر', sector=sector)
    return EntryPoint.objects.create(
        code='EP_PORT', name_ar='ميناء بورتسودان', kind=EntryPoint.Kind.SEAPORT,
        state=state, sector=admin_sector,
    )


@pytest.fixture
def other_entry_point(admin_sector):
    sector = Sector.objects.create(code='SEC_LAND', name_ar='قطاع بري')
    state = State.objects.create(code='ST_KAS', name_ar='ولاية كسلا', sector=sector)
    return EntryPoint.objects.create(
        code='EP_GALLABAT', name_ar='معبر القضارف', kind=EntryPoint.Kind.LAND_PORT,
        state=state, sector=admin_sector,
    )


@pytest.fixture
def vector():
    return VectorRegistry.objects.create(
        vector_type='MOSQUITO', species='Aedes aegypti', name_ar='بعوضة الزيادة'
    )


@pytest.fixture
def vector_team(admin_sector, entry_point):
    return VectorTeam.objects.create(
        code='TM-1', name_ar='فريق نواقل #1', team_type=VectorTeam.TeamType.CONTROL,
        sector=admin_sector, entry_point=entry_point,
    )


@pytest.fixture
def chemical(admin_sector):
    return VectorChemical.objects.create(
        name_ar='الملاثيون', active_ingredient='Malathion', form='EC',
        target='MOSQUITO', unit='لتر', min_stock=2,
    )


def _auth_sector_user(client, sector, role_code='VECTOR_SECTOR_MANAGER'):
    user = User.objects.create_user(
        email=f'{role_code.lower()}@nqp.gov.sd', password='StrongPass123!', full_name='مستخدم قطاع',
        sector=sector,
    )
    role = Role.objects.create(
        code=role_code, name=role_code, name_ar=role_code, default_scope='SECTOR',
    )
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=RoleAssignment.ScopeType.SECTOR,
        scope_id=sector.pk, is_active=True, assigned_by=user,
    )
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


def test_vector_registry_list(api_client, admin_user, vector):
    res = api_client.get('/api/v1/vector-control/vectors/')
    assert res.status_code == 200
    assert res.json()['status'] == 'success'


def test_report_full_flow(api_client, admin_user, entry_point, vector):
    payload = {
        'entry_point': str(entry_point.id),
        'vector': str(vector.id),
        'report_type': 'MOSQUITO',
        'severity': 'HIGH',
        'problem_description': 'تكاثر بعوض قرب المخازن',
    }
    created = api_client.post('/api/v1/vector-control/reports/', payload, format='json')
    assert created.status_code == 201, created.data
    report_id = created.data['id']
    report = VectorReport.objects.get(pk=report_id)
    assert report.report_number.startswith('RPT-')
    assert report.status == VectorReport.Status.NEW

    assessed = api_client.post(f'/api/v1/vector-control/reports/{report_id}/assess/', {'note': 'تأكيد'}, format='json')
    assert assessed.status_code == 200
    report.refresh_from_db()
    assert report.status == VectorReport.Status.ASSESSING

    focus = api_client.post(f'/api/v1/vector-control/reports/{report_id}/open_focus/', None, format='json')
    assert focus.status_code == 201, focus.data
    focus_obj = VectorFocus.objects.get(pk=focus.data['id'])
    assert focus_obj.focus_number.startswith('VF-')
    assert focus_obj.origin == VectorFocus.Origin.REPORT
    report.refresh_from_db()
    assert report.status == VectorReport.Status.ACCEPTED

    closed = api_client.post(f'/api/v1/vector-control/reports/{report_id}/close/', None, format='json')
    assert closed.status_code == 200
    report.refresh_from_db()
    assert report.status == VectorReport.Status.CLOSED


def test_report_reject(api_client, admin_user, entry_point):
    payload = {'entry_point': str(entry_point.id), 'report_type': 'RODENT', 'severity': 'LOW'}
    created = api_client.post('/api/v1/vector-control/reports/', payload, format='json')
    report_id = created.data['id']
    res = api_client.post(
        f'/api/v1/vector-control/reports/{report_id}/reject/', {'note': 'لا صحة للبلاغ'}, format='json'
    )
    assert res.status_code == 200
    report = VectorReport.objects.get(pk=report_id)
    assert report.status == VectorReport.Status.REJECTED


def test_survey_open_focus_and_approve(api_client, admin_user, entry_point, vector):
    payload = {
        'entry_point': str(entry_point.id),
        'vector': str(vector.id),
        'area': 'صالة الوصول',
        'density': 'HIGH',
        'breeding_sites': 6,
    }
    created = api_client.post('/api/v1/vector-control/surveys/', payload, format='json')
    assert created.status_code == 201, created.data
    survey = VectorSurvey.objects.get(pk=created.data['id'])
    assert survey.survey_number.startswith('VS-')
    assert survey.proposed_risk == 'HIGH'

    approved = api_client.post(f'/api/v1/vector-control/surveys/{survey.id}/approve/')
    assert approved.status_code == 200
    survey.refresh_from_db()
    assert survey.status == VectorSurvey.Status.APPROVED

    focus = api_client.post(f'/api/v1/vector-control/surveys/{survey.id}/open_focus/')
    assert focus.status_code == 201

    dup = api_client.post(f'/api/v1/vector-control/surveys/{survey.id}/open_focus/')
    assert dup.status_code == 400


def test_inspection_and_submit(api_client, admin_user, entry_point, vector_team):
    payload = {
        'entry_point': str(entry_point.id),
        'team': str(vector_team.id),
        'purpose': 'ROUTINE',
        'adult_mosquito': True,
        'larvae': True,
        'foci_count': 3,
        'findings_severity': 'HIGH',
    }
    created = api_client.post('/api/v1/vector-control/inspections/', payload, format='json')
    assert created.status_code == 201, created.data
    iid = created.data['id']
    submitted = api_client.post(f'/api/v1/vector-control/inspections/{iid}/submit/')
    assert submitted.status_code == 200
    assert submitted.data['status'] == 'SUBMITTED'


def test_sample_lab_result_and_focus_escalation(api_client, admin_user, entry_point, vector):
    focus = VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        opened_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )
    sample_payload = {
        'entry_point': str(entry_point.id),
        'focus': str(focus.id),
        'vector': str(vector.id),
        'stage': 'LARVAE',
        'specimen_count': 10,
    }
    created = api_client.post('/api/v1/vector-control/samples/', sample_payload, format='json')
    assert created.status_code == 201, created.data
    sample = VectorSample.objects.get(pk=created.data['id'])
    assert sample.sample_number.startswith('NQL-VEC-')

    received = api_client.post(f'/api/v1/vector-control/samples/{sample.id}/receive/')
    assert received.status_code == 200

    result = api_client.post(
        f'/api/v1/vector-control/samples/{sample.id}/submit_result/',
        {'result': 'POSITIVE', 'species_identified': 'Aedes aegypti'},
        format='json',
    )
    assert result.status_code == 200, result.data
    lab_result = VectorLabResult.objects.get(pk=result.data['id'])
    assert lab_result.status == VectorLabResult.Status.PENDING

    approved = api_client.post(f'/api/v1/vector-control/lab-results/{lab_result.id}/approve/')
    assert approved.status_code == 200
    focus.refresh_from_db()
    assert focus.severity == VectorFocus.Severity.CRITICAL
    sample.refresh_from_db()
    assert sample.status == VectorSample.Status.COMPLETED


def test_operation_lifecycle_with_inventory(api_client, admin_user, entry_point, vector, vector_team, chemical):
    focus = VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        opened_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )
    item = VectorInventoryItem.objects.create(
        chemical=chemical, entry_point=entry_point, batch_number='B-100', quantity=10, unit='لتر',
        created_by=admin_user, updated_by=admin_user,
    )

    op_payload = {
        'entry_point': str(entry_point.id),
        'focus': str(focus.id),
        'vector': str(vector.id),
        'operation_type': 'LARVICIDING',
        'team': str(vector_team.id),
        'area_m2': 500,
    }
    created = api_client.post('/api/v1/vector-control/operations/', op_payload, format='json')
    assert created.status_code == 201, created.data
    op = VectorControlOperation.objects.get(pk=created.data['id'])
    assert op.op_number.startswith('WO-')
    assert op.status == VectorControlOperation.Status.DRAFT

    chem = api_client.post(
        f'/api/v1/vector-control/operations/{op.id}/chemicals/',
        {'chemical': str(chemical.id), 'quantity_used': 3, 'unit': 'لتر', 'area_covered': 400},
        format='json',
    )
    assert chem.status_code == 201, chem.data
    item.refresh_from_db()
    assert float(item.quantity) == 7.0
    assert OpChemicalLine.objects.filter(operation=op).count() == 1
    assert InventoryMovement.objects.filter(item=item, movement_type='USE').count() == 1

    step = api_client.post(f'/api/v1/vector-control/operations/{op.id}/next/')
    assert step.status_code == 200
    op.refresh_from_db()
    assert op.status == VectorControlOperation.Status.APPROVED

    step = api_client.post(f'/api/v1/vector-control/operations/{op.id}/next/')
    assert step.status_code == 200
    op.refresh_from_db()
    assert op.status == VectorControlOperation.Status.ASSIGNED

    for expected in ('IN_PROGRESS', 'COMPLETED', 'FOLLOW_UP'):
        r = api_client.post(f'/api/v1/vector-control/operations/{op.id}/next/')
        assert r.status_code == 200
        op.refresh_from_db()
        assert op.status == expected

    focus.refresh_from_db()
    assert focus.status == VectorFocus.Status.TREATMENT

    closed = api_client.post(f'/api/v1/vector-control/operations/{op.id}/close/')
    assert closed.status_code == 400  # قبل تسجيل النتيجة

    result = api_client.post(
        f'/api/v1/vector-control/operations/{op.id}/set_result/',
        {'effective': True, 'effectiveness_percent': 90},
        format='json',
    )
    assert result.status_code == 200
    op.refresh_from_db()
    assert op.effectiveness_percent == 90

    closed = api_client.post(f'/api/v1/vector-control/operations/{op.id}/close/')
    assert closed.status_code == 200


def test_operation_rejects_insufficient_stock(api_client, admin_user, entry_point, vector_team, chemical):
    item = VectorInventoryItem.objects.create(
        chemical=chemical, entry_point=entry_point, quantity=1, unit='لتر',
        created_by=admin_user, updated_by=admin_user,
    )
    op = VectorControlOperation.objects.create(
        entry_point=entry_point, operation_type='FOGGING', team=vector_team,
        created_by=admin_user, updated_by=admin_user,
    )
    res = api_client.post(
        f'/api/v1/vector-control/operations/{op.id}/chemicals/',
        {'chemical': str(chemical.id), 'quantity_used': 500},
        format='json',
    )
    assert res.status_code == 400


def test_followup_close_controlled(api_client, admin_user, entry_point, vector_team, vector):
    focus = VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.MEDIUM,
        opened_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )
    op = VectorControlOperation.objects.create(
        entry_point=entry_point, focus=focus, status=VectorControlOperation.Status.FOLLOW_UP,
        result_effective=True, effectiveness_percent=85, team=vector_team,
        created_by=admin_user, updated_by=admin_user,
    )
    fu_payload = {'focus': str(focus.id), 'operation': str(op.id), 'findings': 'خالٍ تمامًا'}
    created = api_client.post('/api/v1/vector-control/followups/', fu_payload, format='json')
    assert created.status_code == 201, created.data
    fid = created.data['id']

    closed = api_client.post(
        f'/api/v1/vector-control/followups/{fid}/close/', {'controlled': True}, format='json'
    )
    assert closed.status_code == 200, closed.data
    op.refresh_from_db()
    assert op.status == VectorControlOperation.Status.CLOSED
    focus.refresh_from_db()
    assert focus.status == VectorFocus.Status.CLOSED


def test_followup_uncontrolled_retreats(api_client, admin_user, entry_point, vector_team, vector):
    focus = VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        opened_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )
    op = VectorControlOperation.objects.create(
        entry_point=entry_point, focus=focus, status=VectorControlOperation.Status.FOLLOW_UP,
        result_effective=True, effectiveness_percent=40, team=vector_team,
        created_by=admin_user, updated_by=admin_user,
    )
    fu = api_client.post(
        '/api/v1/vector-control/followups/',
        {'focus': str(focus.id), 'operation': str(op.id), 'findings': 'لوحظ عودة البعوض'},
        format='json',
    )
    fid = fu.data['id']
    closed = api_client.post(
        f'/api/v1/vector-control/followups/{fid}/close/', {'controlled': False}, format='json'
    )
    assert closed.status_code == 200
    op.refresh_from_db()
    assert op.status == VectorControlOperation.Status.IN_PROGRESS
    focus.refresh_from_db()
    assert focus.status == VectorFocus.Status.TREATMENT


def test_sector_scoping(api_client, entry_point, other_entry_point, admin_sector, vector):
    other_user = _auth_sector_user(api_client, admin_sector)
    VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        opened_by=other_user, created_by=other_user, updated_by=other_user,
    )
    VectorFocus.objects.create(
        entry_point=other_entry_point, vector=vector, severity=VectorFocus.Severity.LOW,
        opened_by=other_user, created_by=other_user, updated_by=other_user,
    )
    res = api_client.get('/api/v1/vector-control/foci/')
    assert res.status_code == 200
    # مستخدم القطاع يرى بؤر منصبه فقط (كلاهما تابعة لنفس القطاع الإداري admin_sector)
    assert len(res.json()['data']['results']) == 2


def test_sector_scoping_isolates_other_sector(api_client, entry_point, vector):
    other = AdminSector.objects.create(code='KS', name_ar='قطاع كسلا')
    user = _auth_sector_user(api_client, other)
    VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        opened_by=user, created_by=user, updated_by=user,
    )
    res = api_client.get('/api/v1/vector-control/foci/')
    assert res.status_code == 200
    assert res.json()['data']['results'] == []


def test_dashboard_overview_and_map(api_client, admin_user, entry_point, vector):
    VectorFocus.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.CRITICAL,
        gps_latitude='18.4492', gps_longitude='37.7344',
        opened_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )
    VectorReport.objects.create(
        entry_point=entry_point, vector=vector, severity=VectorFocus.Severity.HIGH,
        reported_by=admin_user, created_by=admin_user, updated_by=admin_user,
    )

    ov = api_client.get('/api/v1/vector-control/dashboard/overview/')
    assert ov.status_code == 200
    data = ov.json()['data']
    assert data['foci_active'] == 1
    assert data['by_severity']['CRITICAL'] == 1
    assert data['reports_new'] == 1

    mp = api_client.get('/api/v1/vector-control/dashboard/map/')
    assert mp.status_code == 200
    item = mp.json()['data'][0]
    assert item['focus_number'].startswith('VF-')
    assert item['severity'] == 'CRITICAL'

    stats = api_client.get('/api/v1/vector-control/dashboard/statistics/')
    assert stats.status_code == 200


def test_inventory_movement_endpoint(api_client, admin_user, entry_point, chemical):
    item = VectorInventoryItem.objects.create(
        chemical=chemical, entry_point=entry_point, quantity=5, unit='لتر',
        created_by=admin_user, updated_by=admin_user,
    )
    res = api_client.post(
        '/api/v1/vector-control/inventory-movements/',
        {'item': str(item.id), 'movement_type': 'WITHDRAW', 'quantity': 2, 'unit': 'لتر'},
        format='json',
    )
    assert res.status_code == 201, res.data
    item.refresh_from_db()
    assert float(item.quantity) == 3.0

    low = api_client.get('/api/v1/vector-control/inventory/low_stock/')
    assert low.status_code == 200