import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.emergency_eoc.models import EmergencyAlert

from ..models import (
    CriticalResultNotification,
    Disease,
    LabResult,
    LabSample,
    LabSection,
    SampleMovement,
    SampleTest,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db):
    user = User.objects.create_user(
        email='lab@nqp.gov.sd', password='StrongPass123!', full_name='فني مختبر'
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
def disease(db):
    return Disease.objects.create(
        icd_11_code='1C51',
        name_ar='الحمى النزفية',
        name_en='Viral Hemorrhagic Fever',
        is_public_health_emergency=True,
        ihr_category=Disease.IhrCategory.PHEIC,
    )


@pytest.fixture
def molecular_section(db):
    return LabSection.objects.create(
        code='NQL-MOL', name_ar='الأحياء الجزيئية', name_en='Molecular', kind='MOLECULAR'
    )


def create_sample(auth_client, **extra):
    payload = {'sample_type': 'SWAB', 'source': 'CLINIC'}
    payload.update(extra)
    response = auth_client.post('/api/v1/laboratory/samples/', payload, format='json')
    assert response.status_code == 201
    return response.json()['data']['sample_id']


def run_test_to_approve(auth_client, sample_id, disease_code, outcome='POSITIVE'):
    test_id = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/add-test/',
        {'test_name': 'فحص جزيئي', 'disease_code': disease_code, 'method': 'RT-PCR'},
        format='json',
    ).json()['data']['id']
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/start/')
    auth_client.patch(
        f'/api/v1/laboratory/sample-tests/{test_id}/save-result/',
        {'outcome': outcome, 'result_value': 38.5, 'unit': 'CT'},
        format='json',
    )
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/enter-result/')
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/review/')
    approved = auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/approve/')
    assert approved.status_code == 200
    return test_id


def test_create_disease_and_case_definition(auth_client):
    response = auth_client.post(
        '/api/v1/laboratory/diseases/',
        {
            'icd_11_code': '1C1A',
            'name_ar': 'كوليرا',
            'name_en': 'Cholera',
            'ihr_category': 'TARGETED_ERADICATION',
            'symptoms': ['إسهال', 'جفاف'],
        },
        format='json',
    )
    assert response.status_code == 201
    disease_id = response.json()['data']['id']

    response = auth_client.post(
        f'/api/v1/laboratory/diseases/{disease_id}/case-definitions/',
        {
            'case_type': 'CONFIRMED',
            'clinical_criteria': {'fever': True, 'rash': True},
        },
        format='json',
    )
    assert response.status_code == 201
    assert response.json()['data']['version'] == 1


def test_sample_numbering_and_reception_queue(auth_client):
    first = create_sample(auth_client)
    second = create_sample(auth_client)

    s1 = LabSample.objects.get(id=first)
    s2 = LabSample.objects.get(id=second)
    assert s1.sample_number.startswith('NQL-2026-')
    assert s1.sample_number != s2.sample_number

    queue = auth_client.get('/api/v1/laboratory/samples/reception/')
    assert queue.status_code == 200
    numbers = {row['sample_number'] for row in queue.json()['data']['results']}
    assert s1.sample_number in numbers


def test_reception_accept_requires_checklist(molecular_section, auth_client):
    sample_id = create_sample(auth_client)
    accepted = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/accept/',
        {'reception_checklist': {'label_ok': True, 'qty_ok': True}, 'reception_note': 'سليمة'},
        format='json',
    )
    assert accepted.status_code == 200
    sample = LabSample.objects.get(id=sample_id)
    assert sample.reception_status == LabSample.ReceptionStatus.ACCEPTED
    assert sample.status == LabSample.SampleStatus.ACCEPTED
    assert sample.movements.filter(action=SampleMovement.Action.ACCEPTED).exists()

    sample_id = create_sample(auth_client)
    rejected = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/reject/',
        {'rejection_reason': 'عينة غير كافية'},
        format='json',
    )
    assert rejected.status_code == 200
    sample = LabSample.objects.get(id=sample_id)
    assert sample.reception_status == LabSample.ReceptionStatus.REJECTED
    assert sample.status == LabSample.SampleStatus.REJECTED


def test_assign_and_full_result_workflow(molecular_section, auth_client, disease):
    sample_id = create_sample(auth_client)
    assign = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/assign/',
        {'section': str(molecular_section.id)},
        format='json',
    )
    assert assign.status_code == 200
    assert auth_client.get(f'/api/v1/laboratory/samples/{sample_id}/').json()['data']['section_name'] == 'الأحياء الجزيئية'

    test_id = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/add-test/',
        {'test_name': 'كشف', 'disease_code': disease.icd_11_code, 'method': 'PCR'},
        format='json',
    ).json()['data']['id']

    test = SampleTest.objects.get(id=test_id)
    assert test.status == SampleTest.Status.PENDING
    assert test.test_name == 'كشف'

    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/start/')
    test.refresh_from_db()
    assert test.status == SampleTest.Status.IN_PROGRESS

    auth_client.patch(
        f'/api/v1/laboratory/sample-tests/{test_id}/save-result/',
        {'outcome': 'POSITIVE', 'result_value': 30.0, 'unit': 'CT'},
        format='json',
    )
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/enter-result/')
    test.refresh_from_db()
    assert test.status == SampleTest.Status.SUBMITTED
    assert test.entered_by is not None

    returned = auth_client.post(
        f'/api/v1/laboratory/sample-tests/{test_id}/return-result/',
        {'reason': 'راجع القيمة'},
        format='json',
    )
    assert returned.status_code == 200
    test.refresh_from_db()
    assert test.status == SampleTest.Status.DRAFT

    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/enter-result/')
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/review/')
    approved = auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/approve/')
    assert approved.status_code == 200
    test.refresh_from_db()
    assert test.status == SampleTest.Status.COMPLETED
    assert test.is_critical is True

    revised = auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/revise/')
    assert revised.status_code == 200
    test.refresh_from_db()
    assert test.version == 2
    assert test.status == SampleTest.Status.SUBMITTED


def test_positive_pheic_creates_alert_and_backfill(auth_client, disease):
    sample_id = create_sample(auth_client)
    run_test_to_approve(auth_client, sample_id, disease.icd_11_code, 'POSITIVE')

    sample = LabSample.objects.get(id=sample_id)
    assert sample.status == LabSample.SampleStatus.COMPLETED
    assert LabResult.objects.filter(sample=sample, approval_status='APPROVED').exists()
    assert SampleTest.objects.filter(sample=sample, lab_result__isnull=False).exists()

    alert = EmergencyAlert.objects.filter(
        alert_type=EmergencyAlert.AlertType.OUTBREAK
    ).first()
    assert alert is not None

    assert CriticalResultNotification.objects.filter(
        test__sample=sample, acknowledged_at__isnull=True
    ).exists()


def test_negative_result_creates_no_alert(auth_client, disease):
    sample_id = create_sample(auth_client)
    run_test_to_approve(auth_client, sample_id, disease.icd_11_code, 'NEGATIVE')
    assert not EmergencyAlert.objects.exists()


def test_worklist_filtering_and_dashboard(auth_client, disease):
    sample_id = create_sample(auth_client)
    test_id = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/add-test/',
        {'test_name': 'فحص', 'disease_code': disease.icd_11_code},
        format='json',
    ).json()['data']['id']

    worklist = auth_client.get('/api/v1/laboratory/sample-tests/worklist/')
    assert worklist.status_code == 200
    ids = {row['id'] for row in worklist.json()['data']['results']}
    assert test_id in ids

    dashboard = auth_client.get('/api/v1/laboratory/samples/dashboard/')
    assert dashboard.status_code == 200
    assert dashboard.json()['data']['totals']['samples'] >= 1

    reports = auth_client.get('/api/v1/laboratory/samples/reports/')
    assert reports.status_code == 200
    assert 'by_section' in reports.json()['data']
    assert 'by_disease' in reports.json()['data']