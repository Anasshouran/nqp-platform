import pytest

from apps.surveillance.models.case import HealthCase, CaseWorkflowState, CaseClassification, CaseStatusLog
from apps.surveillance.models.event import HealthEvent, HealthEventType
from apps.surveillance.services.workflows import CaseWorkflowService
from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


@pytest.fixture
def case(world, officer_user):
    health_case = HealthCase.objects.create(
        disease=world['disease'],
        person_name='عبير التجاني',
        person_age=34,
        person_sex='F',
        nationality='سودانية',
        port=world['port'],
        sector=world['sector'],
        locality=world['locality'],
        reported_by=officer_user,
        assigned_to=officer_user,
        onset_date='2026-09-10',
        reported_date='2026-09-12',
        source='MANUAL',
    )
    return health_case


# ==============================================================================
# نموذج الحالة وسير العمل (وحدة)
# ==============================================================================

def test_case_number_auto_generated(case):
    assert case.case_number


def test_workflow_valid_transitions(officer_user, case):
    CaseWorkflowService.transition(case, CaseWorkflowState.UNDER_INVESTIGATION, officer_user)
    case.refresh_from_db()
    assert case.workflow_state == CaseWorkflowState.UNDER_INVESTIGATION
    assert case.status == 'UNDER_INVESTIGATION'


def test_workflow_confirmed_sets_confirmation_date_and_alert(officer_user, case, world):
    CaseWorkflowService.transition(case, CaseWorkflowState.UNDER_INVESTIGATION, officer_user)
    CaseWorkflowService.transition(case, CaseWorkflowState.CONFIRMED, officer_user)
    case.refresh_from_db()
    assert case.confirmation_date is not None
    assert case.status == 'UNDER_TREATMENT'
    # مرض وبائي → يجب توليد إنذار EWARS
    from apps.surveillance.models.alert import SurveillanceAlert
    assert SurveillanceAlert.objects.filter(disease=case.disease).exists()


def test_workflow_invalid_transition_rejected(officer_user, case):
    combos = [
        (CaseWorkflowState.AWAITING_LAB, CaseWorkflowState.OPEN),
        (CaseWorkflowState.UNDER_INVESTIGATION, CaseWorkflowState.UNDER_INVESTIGATION),
    ]
    for current, target in combos:
        case.workflow_state = current
        case.save()
        with pytest.raises(ValueError):
            CaseWorkflowService.transition(case, target, officer_user)


def test_workflow_closes_contacts(officer_user, case, world):
    from apps.surveillance.models.contact import ContactTrace, ContactStatus
    contact = ContactTrace.objects.create(
        index_case=case, person_name='محمد', port=world['port'], sector=world['sector'],
        status=ContactStatus.UNDER_MONITORING,
    )
    CaseWorkflowService.transition(case, CaseWorkflowState.UNDER_INVESTIGATION, officer_user)
    CaseWorkflowService.transition(case, CaseWorkflowState.CLOSED, officer_user)
    contact.refresh_from_db()
    assert contact.status == ContactStatus.COMPLETED


def test_status_log_created_on_transition(officer_user, case):
    CaseWorkflowService.transition(case, CaseWorkflowState.UNDER_INVESTIGATION, officer_user)
    log = CaseStatusLog.objects.filter(case=case).first()
    assert log is not None
    assert log.old_value == CaseWorkflowState.OPEN
    assert log.new_value == CaseWorkflowState.UNDER_INVESTIGATION
    assert log.changed_by_id == officer_user.id


# ==============================================================================
# واجهات API
# ==============================================================================

def test_cases_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/cases/')
    assert resp.status_code in (401, 403)


def test_create_case_via_api(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    case_type = CaseClassification.SUSPECTED
    resp = client.post(
        '/api/v1/surveillance/cases/',
        {
            'disease': world['disease'].id,
            'case_type': case_type,
            'person_name': 'حالات اختبار API',
            'person_age': 28,
            'person_sex': 'M',
            'port': world['port'].id,
            'sector': world['sector'].id,
            'locality': world['locality'].id,
            'onset_date': '2026-09-11',
            'source': 'CLINIC',
            'symptoms': [
                {'symptom_code': 'DIARRHEA', 'symptom_name_ar': 'إسهال', 'is_primary': True}
            ],
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['case_number']
    assert data['disease_name'] == world['disease'].name_ar
    assert data['reported_by'] == str(officer_user.id)


def test_list_cases(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/cases/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_case_search(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/cases/', {'search': 'عبير'})
    assert resp.json()['data']['count'] >= 1
    resp = client.get('/api/v1/surveillance/cases/', {'search': 'غيرموجود'})
    assert resp.json()['data']['count'] == 0


def test_case_detail_contains_nested(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get(f'/api/v1/surveillance/cases/{case.id}/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['disease_name']
    assert 'symptoms' in data
    assert data['age_band'] == '15-44'


def test_case_api_transition(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/cases/{case.id}/transition/',
        {'new_state': CaseWorkflowState.UNDER_INVESTIGATION},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    case.refresh_from_db()
    assert case.workflow_state == CaseWorkflowState.UNDER_INVESTIGATION


def test_case_api_invalid_transition(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/cases/{case.id}/transition/',
        {'new_state': CaseWorkflowState.CONFIRMED},  # لا يمكن الانتقال مباشرة من OPEN
        format='json',
    )
    assert resp.status_code == 400
    assert resp.json()['status'] == 'error'


def test_case_add_symptom(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/cases/{case.id}/symptoms/',
        {'symptom_code': 'FEVER', 'symptom_name_ar': 'حمى', 'severity': 'HIGH', 'is_primary': True},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert case.case_symptoms.count() == 1


def test_case_add_exposure(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/cases/{case.id}/exposures/',
        {'exposure_type': 'CONTACT_CASE', 'description': 'مخالطة عائلية', 'location': 'منزل'},
        format='json',
    )
    assert resp.status_code == 201, resp.content


def test_case_add_travel(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/cases/{case.id}/travel/',
        {'country': 'السودان', 'arrival_date': '2026-09-08', 'transport_mode': 'AIR'},
        format='json',
    )
    assert resp.status_code == 201, resp.content


def test_case_history(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    # انفذ انتقالاً أولاً لتسجيله
    client.post(
        f'/api/v1/surveillance/cases/{case.id}/transition/',
        {'new_state': CaseWorkflowState.UNDER_INVESTIGATION}, format='json',
    )
    resp = client.get(f'/api/v1/surveillance/cases/{case.id}/history/')
    assert resp.status_code == 200
    assert len(resp.json()['data']) >= 1


def test_case_partial_update(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.patch(
        f'/api/v1/surveillance/cases/{case.id}/',
        {'person_age': 40},
        format='json',
    )
    assert resp.status_code == 200
    case.refresh_from_db()
    assert case.person_age == 40


def test_case_create_requires_person_or_traveler(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/cases/',
        {'disease': world['disease'].id},
        format='json',
    )
    assert resp.status_code == 400


def test_case_linked_to_event(login, officer_user, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    event = HealthEvent.objects.create(
        event_type=HealthEventType.CLUSTER,
        title='تجمع حالات في المنفذ',
        description='بلاغ عن تجمع أمراض في نقطة الدخول',
        sector=world['sector'],
        port=world['port'],
        reported_by=officer_user,
        event_date='2026-09-14',
    )
    resp = client.post(
        '/api/v1/surveillance/cases/',
        {
            'disease': world['disease'].id,
            'person_name': 'حالة مرتبطة بحدث',
            'port': world['port'].id,
            'sector': world['sector'].id,
            'event': event.id,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['event'] == str(event.id)