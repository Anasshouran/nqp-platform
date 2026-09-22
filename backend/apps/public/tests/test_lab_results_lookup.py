import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment, ScopeType
from apps.laboratory.models import Disease, LabSample, LabSection, SampleTest

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def grant_lab_permissions(db):
    """يمنح المستخدم صلاحيات المختبر بنطاق GLOBAL."""
    def _grant(user):
        perm, _ = Permission.objects.get_or_create(
            code='lab:view',
            defaults={'name': 'عرض المختبر', 'resource': 'lab', 'action': 'view'},
        )
        role, _ = Role.objects.get_or_create(
            code='LAB_VIEWER',
            defaults={
                'name': 'LAB_VIEWER',
                'name_ar': 'مشاهد المختبر',
                'description': 'دور اختبار للمختبر',
                'default_scope': ScopeType.GLOBAL,
            },
        )
        role.permissions.add(perm)
        RoleAssignment.objects.get_or_create(
            user=user,
            role=role,
            scope_type=ScopeType.GLOBAL,
            scope_id=None,
            defaults={'is_active': True, 'assigned_by': user},
        )
        return role, Permission.objects.get(code='lab:view')

    return _grant


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, grant_lab_permissions):
    user = User.objects.create_user(
        email='lab@nqp.gov.sd', password='StrongPass123!', full_name='فني مختبر'
    )
    grant_lab_permissions(user)
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
        icd_11_code='2A20',
        name_ar='كوليرا',
        name_en='Cholera',
        is_public_health_emergency=True,
        ihr_category=Disease.IhrCategory.PHEIC,
    )


def create_and_approve_sample(auth_client, disease_code):
    created = auth_client.post(
        '/api/v1/laboratory/samples/',
        {'sample_type': 'SWAB', 'source': 'CLINIC'},
        format='json',
    )
    assert created.status_code == 201
    sample_id = created.json()['data']['sample_id']
    sample = LabSample.objects.get(id=sample_id)

    test_id = auth_client.post(
        f'/api/v1/laboratory/samples/{sample_id}/add-test/',
        {'test_name': 'فحص بيولوجي', 'disease_code': disease_code, 'method': 'زرع'},
        format='json',
    ).json()['data']['id']
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/start/')
    auth_client.patch(
        f'/api/v1/laboratory/sample-tests/{test_id}/save-result/',
        {'outcome': 'POSITIVE', 'result_value': 1.2, 'unit': 'CFU'},
        format='json',
    )
    auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/enter-result/')
    review = auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/review/')
    assert review.status_code == 200
    approved = auth_client.post(f'/api/v1/laboratory/sample-tests/{test_id}/approve/')
    assert approved.status_code == 200

    sample.refresh_from_db()
    assert sample.status == LabSample.SampleStatus.COMPLETED
    assert sample.public_result_code
    return sample


def test_lookup_by_sample_number_with_code(api_client, auth_client, disease):
    sample = create_and_approve_sample(auth_client, disease.icd_11_code)

    response = api_client.post(
        '/api/v1/public/laboratory/results/lookup/',
        {'reference': sample.sample_number, 'code': sample.public_result_code},
        format='json',
    )
    assert response.status_code == 200
    data = response.data['data']
    assert data['found'] is True
    assert data['sample']['sample_number'] == sample.sample_number
    assert data['sample']['verification_code'] == sample.public_result_code
    assert data['sample']['sample_type_label'] == 'مسحة'
    assert len(data['tests']) == 1
    assert data['tests'][0]['test_name'] == 'فحص بيولوجي'
    assert data['tests'][0]['outcome'] == 'POSITIVE'
    assert data['tests'][0]['disease_name'] == disease.name_ar


def test_lookup_by_barcode_case_insensitive(api_client, auth_client, disease):
    sample = create_and_approve_sample(auth_client, disease.icd_11_code)

    response = api_client.post(
        '/api/v1/public/laboratory/results/lookup/',
        {'reference': sample.sample_barcode.lower(), 'code': sample.public_result_code.lower()},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['data']['found'] is True


def test_lookup_wrong_code_returns_not_found(api_client, auth_client, disease):
    sample = create_and_approve_sample(auth_client, disease.icd_11_code)

    response = api_client.post(
        '/api/v1/public/laboratory/results/lookup/',
        {'reference': sample.sample_number, 'code': 'LNC-XXXXXX'},
        format='json',
    )
    assert response.status_code == 200
    data = response.data['data']
    assert data['found'] is False
    assert data['error'] == 'NOT_FOUND'


def test_unapproved_sample_is_not_public(api_client, auth_client, disease):
    created = auth_client.post(
        '/api/v1/laboratory/samples/',
        {'sample_type': 'SWAB', 'source': 'CLINIC'},
        format='json',
    )
    sample = LabSample.objects.get(id=created.json()['data']['sample_id'])
    assert not sample.public_result_code

    response = api_client.post(
        '/api/v1/public/laboratory/results/lookup/',
        {'reference': sample.sample_number, 'code': 'LNC-ABCDEF'},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['data']['found'] is False


def test_lookup_requires_params(api_client):
    response = api_client.post(
        '/api/v1/public/laboratory/results/lookup/',
        {'reference': 'NQL-2026-000001'},
        format='json',
    )
    assert response.status_code == 400