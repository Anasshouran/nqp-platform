"""اختبارات صفحة «رسوم اللائحة المالية»: تجميع البنود حسب القسم وقراءة فقط."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from ..models import QuarantineFee

pytestmark = pytest.mark.django_db

User = get_user_model()

SCHEDULE_URL = '/api/v1/food/quarantine-fees/schedule/'
LIST_URL = '/api/v1/food/quarantine-fees/'


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(
        email='fees-admin@nqp.gov.sd', password='StrongPass123!', full_name='مسؤول الرسوم'
    )
    client = APIClient()
    login = client.post(
        '/api/v1/auth/login/', {'email': user.email, 'password': 'StrongPass123!'}, format='json'
    )
    token = login.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def fees(db):
    return [
        QuarantineFee.objects.create(
            code='SI-01', name_ar='فحص بدن الباخرة', category=QuarantineFee.Category.SHIP_INSPECTION,
            amount_sdg=Decimal('250.00'), amount_usd=None, currency_note='', order=1, year=2025,
        ),
        QuarantineFee.objects.create(
            code='SI-02', name_ar='شهادة صحية', category=QuarantineFee.Category.SHIP_INSPECTION,
            amount_sdg=Decimal('100.00'), amount_usd=Decimal('40.00'), currency_note='حسب التحويل',
            order=2, year=2025,
        ),
        QuarantineFee.objects.create(
            code='VAC-01', name_ar='لقاح الجدري', category=QuarantineFee.Category.VACCINATION,
            amount_sdg=Decimal('50.00'), amount_usd=None, currency_note='', order=1, year=2025,
        ),
        QuarantineFee.objects.create(
            code='OLD-01', name_ar='بندسابق', category=QuarantineFee.Category.CERTIFICATE,
            amount_sdg=Decimal('999.00'), amount_usd=None, currency_note='', order=1, year=2024,
        ),
        QuarantineFee.objects.create(
            code='OFF-01', name_ar='بند معطّل', category=QuarantineFee.Category.VIOLATION,
            amount_sdg=Decimal('70.00'), amount_usd=None, currency_note='', order=1, year=2025,
            is_active=False,
        ),
    ]


def test_schedule_groups_fees_by_category(auth_client, fees):
    response = auth_client.get(SCHEDULE_URL, {'year': 2025})

    assert response.status_code == 200
    body = response.data
    assert body['year'] == 2025
    assert body['total_fees'] == 3
    assert body['total_categories'] == 2

    keys = [category['key'] for category in body['categories']]
    assert keys == ['SHIP_INSPECTION', 'VACCINATION']
    assert body['categories'][0]['label'] == 'رسوم التفتيش الصحي للبواخر'
    assert [fee['code'] for fee in body['categories'][0]['fees']] == ['SI-01', 'SI-02']


def test_schedule_keeps_declared_category_order(auth_client, fees):
    body = auth_client.get(SCHEDULE_URL, {'year': 2025}).data

    declared = [key for key, _ in QuarantineFee.Category.choices]
    returned = [category['key'] for category in body['categories']]
    assert returned == [key for key in declared if key in returned]


def test_schedule_orders_fees_deterministically(auth_client, fees):
    QuarantineFee.objects.filter(code__in=['SI-02', 'SI-01']).update(order=0)

    body = auth_client.get(SCHEDULE_URL, {'year': 2025}).data

    codes = [fee['code'] for fee in body['categories'][0]['fees']]
    assert codes == ['SI-01', 'SI-02']


def test_schedule_excludes_other_years(auth_client, fees):
    body = auth_client.get(SCHEDULE_URL, {'year': 2024}).data

    assert body['year'] == 2024
    assert body['total_fees'] == 1
    assert body['categories'][0]['fees'][0]['code'] == 'OLD-01'


def test_schedule_excludes_inactive_fees(auth_client, fees):
    body = auth_client.get(SCHEDULE_URL, {'year': 2025}).data

    codes = [fee['code'] for category in body['categories'] for fee in category['fees']]
    assert 'OFF-01' not in codes


def test_schedule_returns_empty_categories_for_unknown_year(auth_client, fees):
    response = auth_client.get(SCHEDULE_URL, {'year': 2030})

    assert response.status_code == 200
    body = response.data
    assert body == {'year': 2030, 'total_fees': 0, 'total_categories': 0, 'categories': []}


def test_schedule_defaults_to_latest_year_with_data(auth_client, fees):
    assert auth_client.get(SCHEDULE_URL).data['year'] == 2025


def test_schedule_falls_back_to_current_year_when_no_data(auth_client):
    current_year = timezone.now().year

    assert auth_client.get(SCHEDULE_URL).data['year'] == current_year


def test_schedule_rejects_non_numeric_year(auth_client, fees):
    response = auth_client.get(SCHEDULE_URL, {'year': 'two-thousand'})

    assert response.status_code == 400
    assert 'سنة غير صالحة' in response.data['message']


def test_schedule_rejects_out_of_range_year(auth_client, fees):
    assert auth_client.get(SCHEDULE_URL, {'year': 1999}).status_code == 400


def test_schedule_requires_authentication(db):
    assert APIClient().get(SCHEDULE_URL, {'year': 2025}).status_code == 401


def test_list_endpoint_hides_inactive_fees(auth_client, fees):
    body = auth_client.get(LIST_URL, {'year': 2025}).data

    codes = [row['code'] for row in body['results']]
    assert 'OFF-01' not in codes
    assert 'SI-01' in codes


def test_fee_reference_data_is_read_only(auth_client, fees):
    assert auth_client.post(LIST_URL, {'code': 'X-1', 'name_ar': 'اختراق'}).status_code == 405
    assert auth_client.patch(f'{LIST_URL}{fees[0].id}/', {'name_ar': 'تعديل'}).status_code == 405
    assert auth_client.delete(f'{LIST_URL}{fees[0].id}/').status_code == 405
    assert QuarantineFee.objects.filter(code='SI-01').first().name_ar == 'فحص بدن الباخرة'
