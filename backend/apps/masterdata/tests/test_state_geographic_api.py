"""عقد الـAPI لربط masterdata.State بالولاية الجغرافية (واجهة /app/master-data).

يغطي:
1. endpoint الولايات الجغرافية يُرجع الـ18Canonical rows.
2. StateSerializer يعرض geographic_state + geographic_state_name.
3. شجرة master-data تُضمّن الحقلين في كل عقدة ولاية.
4. PATCH يحدّث الربط ويُمكّن إزالته (null).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import Sector, State
from apps.organization.models import GeographicState

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(db):
    user = get_user_model().objects.create_user(
        email='geoapi@nqp.sd',
        full_name='مدير الربط الجغرافي',
        password='Test@1234',
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def geo_kh(db):
    # 0013 يبذر الـ18 ولاية في كل قاعدة مُهاجَرة؛ نضمنها هنا لأن اختبارات
    # transaction=True في مكان آخر قد تُفرغ test DB بين جلسات --reuse-db.
    from apps.organization.management.commands.seed_geographic_states import STATES

    for code, name_ar, name_en, order in STATES:
        GeographicState.objects.get_or_create(
            code=code,
            defaults={'name_ar': name_ar, 'name_en': name_en, 'order': order, 'is_active': True},
        )
    return GeographicState.objects.get(code='SD-KH')


@pytest.fixture
def state_geo(admin_client, geo_kh):
    sector = Sector.objects.create(code='SEC_GEO_API', name_ar='قطاع اختبار الربط')
    return State.objects.create(
        code='MD_GEO_API', name_ar='ولاية اختبار الربط', sector=sector,
        geographic_state=geo_kh,
    )


def rows(response):
    """يدعم شكل paginated와non-paginated (DRF response.data قبل الـrenderer)."""
    data = response.data
    if isinstance(data, dict):
        if 'results' in data:
            return data['results']
        if 'data' in data:
            inner = data['data']
            return inner['results'] if isinstance(inner, dict) and 'results' in inner else inner
    return data


def test_geographic_states_endpoint_returns_canonical_rows(admin_client, geo_kh):
    """1) GET /organization/geographic-states/ → 18 ولاية كانونية."""
    res = admin_client.get('/api/v1/organization/geographic-states/', {'page_size': 100})
    assert res.status_code == 200
    result = rows(res)
    assert len(result) == 18
    assert any(r['code'] == 'SD-KH' and r['name_ar'] == 'الخرطوم' for r in result)


def test_state_serializer_exposes_geographic_state(admin_client, state_geo, geo_kh):
    """2) StateSerializer يعرض المعرّف والاسم العربي للولاية الجغرافية."""
    res = admin_client.get('/api/v1/master-data/states/', {'search': 'MD_GEO_API'})
    assert res.status_code == 200
    row = next(r for r in rows(res) if r['id'] == str(state_geo.id))
    assert str(row['geographic_state']) == str(geo_kh.id)
    assert row['geographic_state_name'] == 'الخرطوم'


def test_tree_state_node_exposes_geographic_state(admin_client, state_geo, geo_kh):
    """3) عقدة الولاية في شجرة master-data تحمل الحقلين."""
    res = admin_client.get('/api/v1/master-data/tree/tree/')
    assert res.status_code == 200
    sector = next(s for s in res.data['data'] if s['code'] == 'SEC_GEO_API')
    st = next(s for s in sector['states'] if s['id'] == str(state_geo.id))
    assert st['geographic_state'] == str(geo_kh.id)
    assert st['geographic_state_name'] == 'الخرطوم'


def test_patch_can_set_and_clear_geographic_state(admin_client, state_geo, geo_kh):
    """4) تحديث الربط وإزالته (null) عبر PATCH — ما يرسله النموذج."""
    other = GeographicState.objects.get(code='SD-RS')
    url = f'/api/v1/master-data/states/{state_geo.id}/'

    res = admin_client.patch(url, {'geographic_state': str(other.id)}, format='json')
    assert res.status_code == 200
    state_geo.refresh_from_db()
    assert state_geo.geographic_state == other

    res = admin_client.patch(url, {'geographic_state': None}, format='json')
    assert res.status_code == 200
    state_geo.refresh_from_db()
    assert state_geo.geographic_state is None
