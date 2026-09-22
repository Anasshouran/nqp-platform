import pytest

from apps.surveillance.models.specimen import (
    Specimen,
    SpecimenStatus,
    SpecimenType,
    SpecimenPriority,
    SpecimenMovement,
    SpecimenLabResult,
)
from apps.surveillance.models.case import HealthCase
from apps.surveillance.services.workflows import SpecimenWorkflowService

pytestmark = pytest.mark.django_db


@pytest.fixture
def case(world, officer_user):
    return HealthCase.objects.create(
        disease=world['disease'],
        person_name='حالة عينات',
        person_age=40,
        person_sex='M',
        port=world['port'],
        sector=world['sector'],
        reported_by=officer_user,
        source='MANUAL',
    )


@pytest.fixture
def specimen(world, officer_user, case):
    return Specimen.objects.create(
        case=case,
        specimen_type=SpecimenType.BLOOD,
        priority=SpecimenPriority.ROUTINE,
        status=SpecimenStatus.ORDERED,
    )


# ==============================================================================
# نموذج العينة وسير العمل
# ==============================================================================

def test_specimen_number_auto_generated(specimen):
    assert specimen.specimen_number


def test_specimen_transition_chain(specimen, officer_user):
    SpecimenWorkflowService.transition(specimen, SpecimenStatus.COLLECTED, officer_user)
    specimen.refresh_from_db()
    assert specimen.status == SpecimenStatus.COLLECTED
    assert specimen.collected_at is not None
    assert specimen.collected_by_id == officer_user.id

    SpecimenWorkflowService.transition(specimen, SpecimenStatus.RECEIVED, officer_user)
    specimen.refresh_from_db()
    assert specimen.status == SpecimenStatus.RECEIVED
    assert specimen.received_at is not None
    # سجل الحركة
    assert SpecimenMovement.objects.filter(specimen=specimen).count() == 2


def test_specimen_invalid_transition(specimen, officer_user):
    with pytest.raises(ValueError):
        SpecimenWorkflowService.transition(specimen, SpecimenStatus.RESULT_READY, officer_user)


# ==============================================================================
# واجهات API
# ==============================================================================

def test_specimens_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/specimens/')
    assert resp.status_code in (401, 403)


def test_create_specimen_api(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/specimens/',
        {
            'case': case.id,
            'specimen_type': SpecimenType.BLOOD,
            'priority': SpecimenPriority.URGENT,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['specimen_number']


def test_list_specimens(login, officer_user, specimen, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/specimens/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_specimen_transition_api(login, officer_user, specimen, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/specimens/{specimen.id}/transition/',
        {'new_status': SpecimenStatus.COLLECTED},
        format='json',
    )
    assert resp.status_code == 200, resp.content
    specimen.refresh_from_db()
    assert specimen.status == SpecimenStatus.COLLECTED


def test_specimen_add_result_api(login, officer_user, specimen, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/specimens/{specimen.id}/result/',
        {
            'disease': world['disease'].id,
            'test_name': 'مزرعة براز',
            'test_method': 'CULTURE',
            'result_qualitative': 'POSITIVE',
            'interpretation': 'إيجابية للمكورات',
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert SpecimenLabResult.objects.filter(specimen=specimen).count() == 1