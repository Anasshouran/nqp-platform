import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.laboratory.models import Disease
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.organization.models import Locality, Sector as OrgSector

pytestmark = pytest.mark.django_db

User = get_user_model()

PASSWORD = 'StrongPass123!'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def login(api_client, db):
    def _login(user):
        client = APIClient()
        resp = client.post(
            '/api/v1/auth/login/',
            {'email': user.email, 'password': PASSWORD},
            format='json',
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
        return client

    return _login


@pytest.fixture
def officer_user():
    return User.objects.create_user(
        email='surveillance@nqp.gov.sd', password=PASSWORD, full_name='مسؤول الترصد'
    )


@pytest.fixture
def world():
    """بيئة ترصد أساسية: قطاع + ولاية + منفذ + مرض."""
    ms = MasterSector.objects.create(code='SEA_SURV', name_ar='البحر الأحمر')
    state = State.objects.create(code='RS_SURV', name_ar='البحر الأحمر', sector=ms)
    port = EntryPoint.objects.create(
        code='PSD_SURV', name_ar='بورتسودان', name_en='Port Sudan', kind='SEAPORT', state=state
    )
    org_sector = OrgSector.objects.create(code='RED-SURV', name_ar='البحر الأحمر')
    locality = Locality.objects.create(
        code='BNR-SURV', name_ar='بعوض', sector=org_sector
    )
    disease = Disease.objects.create(
        icd_11_code='1C01', name_ar='كوليرا', name_en='Cholera',
        is_public_health_emergency=True, ihr_category='PHEIC',
    )
    return {
        'sector': org_sector, 'locality': locality, 'port': port,
        'master_sector': ms, 'state': state, 'disease': disease,
    }


def auth_client(user, codes=('surveillance:view', 'surveillance:add',
                             'surveillance:edit', 'surveillance:delete'), grant_permissions=None):
    """مصادقة وتسجيل عميل مع صلاحيات كاملة للترصد."""
    if grant_permissions is not None:
        grant_permissions(user, codes=list(codes))
    client = APIClient()
    resp = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': PASSWORD},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['data']['access_token']}")
    return client