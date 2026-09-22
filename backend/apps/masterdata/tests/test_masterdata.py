"""اختبارات البيانات الأساسية (masterdata) — حماية سجل منافذ الدخول الموحد.

السلسلة الهرمية: Sector ← State ← EntryPoint (← Terminal) ← Station ← Section ← SectionMember
القطاع الإداري المرجعي: organization.Sector (بعد توحيد السجلات الثلاثة).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    EntryPoint,
    Section,
    SectionMember,
    Sector,
    State,
    Station,
    Terminal,
)
from apps.organization.models import Sector as OrgSector

pytestmark = pytest.mark.django_db

BASE = '/api/v1/master-data'


# ---------------- أدوات مساعدة ----------------


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin(db):
    User = get_user_model()
    return User.objects.create_user(
        email='masteradmin@nqp.sd',
        full_name='مدير البيانات',
        password='Test@1234',
        is_staff=True,
    )


@pytest.fixture
def staff_client(api_client, admin):
    api_client.force_authenticate(admin)
    return api_client


@pytest.fixture
def org_sector(db):
    return OrgSector.objects.create(code='SEC_RED', name_ar='قطاع البحر الأحمر')


@pytest.fixture
def sector(db):
    return Sector.objects.create(code='SEC_SEA', name_ar='القطاع البحري', order=1)


@pytest.fixture
def state(sector):
    return State.objects.create(
        code='ST_RS', name_ar='ولاية البحر الأحمر', sector=sector
    )


@pytest.fixture
def entry_point(state, org_sector):
    return EntryPoint.objects.create(
        code='SDPOR',
        name_ar='ميناء بورسودان',
        kind=EntryPoint.Kind.SEAPORT,
        state=state,
        sector=org_sector,
    )


# ---------------- الصلاحيات ----------------


def test_anonymous_denied(api_client):
    assert api_client.get(f'{BASE}/sectors/').status_code == 401


def test_non_staff_denied(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(
        email='plain@nqp.sd', full_name='عادي', password='Test@1234'
    )
    api_client.force_authenticate(user)
    assert api_client.get(f'{BASE}/sectors/').status_code == 403


# ---------------- القطاعات (أنواع الحجر) ----------------


def test_sector_crud_cycle(staff_client):
    res = staff_client.post(
        f'{BASE}/sectors/',
        {'code': 'SEC_AIR', 'name_ar': 'القطاع الجوي', 'name_en': 'Air'},
        format='json',
    )
    assert res.status_code == 201
    sid = res.data['data']['id']

    res = staff_client.patch(f'{BASE}/sectors/{sid}/', {'order': 5}, format='json')
    assert res.status_code == 200 and res.data['data']['order'] == 5

    res = staff_client.delete(f'{BASE}/sectors/{sid}/')
    assert res.status_code in (200, 204)
    assert not Sector.objects.filter(pk=sid).exists()


def test_sector_code_unique(staff_client, sector):
    res = staff_client.post(
        f'{BASE}/sectors/', {'code': 'SEC_SEA', 'name_ar': 'مكرر'}, format='json'
    )
    assert res.status_code == 400


# ---------------- الولايات والمنافذ ----------------


def test_state_create_and_filter(staff_client, sector):
    st = State.objects.create(code='ST_KS', name_ar='كسلا', sector=sector)
    res = staff_client.get(f'{BASE}/states/?sector={sector.pk}')
    ids = [item['id'] for item in res.data['results']]
    assert str(st.id) in ids


def test_entry_point_kind_choices(staff_client, state):
    res = staff_client.post(
        f'{BASE}/entry-points/',
        {'code': 'X1', 'name_ar': 'منفذ', 'kind': 'BOAT', 'state': str(state.id)},
        format='json',
    )
    assert res.status_code == 400


def test_entry_point_linked_to_organization_sector(entry_point, org_sector):
    """العقد الجوهري بعد التوحيد: EntryPoint.sector يشير لـ organization.Sector."""
    assert entry_point.sector_id == org_sector.id
    assert entry_point.sector.__class__ is OrgSector
    assert entry_point in org_sector.entry_points.all()


def test_entry_point_filter_by_kind(staff_client, entry_point, state):
    EntryPoint.objects.create(
        code='SDAIR', name_ar='مطار الخرطوم', kind=EntryPoint.Kind.AIRPORT, state=state
    )
    res = staff_client.get(f'{BASE}/entry-points/?kind=SEAPORT')
    codes = [item['code'] for item in res.data['results']]
    assert 'SDPOR' in codes and 'SDAIR' not in codes


# ---------------- سلسلة المنشأة → المحطة → القسم → العضو ----------------


def test_full_hierarchy_chain(staff_client, admin, entry_point, org_sector):
    term = Terminal.objects.create(
        code='TERM_S', name_ar='الطرفية الجنوبية', entry_point=entry_point
    )
    station = Station.objects.create(
        code='STA_S', name_ar='محطة الحجر', terminal=term
    )
    section = Section.objects.create(
        code='SECN_F', name_ar='قسم رقابة الأغذية', station=station
    )
    member = SectionMember.objects.create(
        user=admin, section=section, role_label='كاتب القسم'
    )

    assert term.entry_point == entry_point
    assert station.terminal == term
    assert section.station == station
    assert member.section == section
    assert member.user == admin


def test_station_direct_on_entry_point(entry_point):
    station = Station.objects.create(
        code='STA_D', name_ar='محطة مباشرة', entry_point=entry_point
    )
    assert station.entry_point == entry_point


# ---------------- شجرة البيانات ----------------


def test_tree_returns_full_chain(staff_client, sector, state, entry_point, org_sector):
    term = Terminal.objects.create(
        code='TERM_T', name_ar='طرفية الشجرة', entry_point=entry_point
    )
    station = Station.objects.create(code='STA_T', name_ar='محطة الشجرة', terminal=term)
    Section.objects.create(code='SECN_T', name_ar='قسم الشجرة', station=station)

    res = staff_client.get(f'{BASE}/tree/tree/')
    assert res.status_code == 200
    node = next(s for s in res.data['data'] if s['id'] == str(sector.id))
    st_node = next(st for st in node['states'] if st['id'] == str(state.id))
    ep_node = next(e for e in st_node['entry_points'] if e['id'] == str(entry_point.id))
    assert ep_node['terminals'][0]['name_ar'] == 'طرفية الشجرة'
    # المحطة عبر الطرفية تظهر داخل عقدة الطرفية
    term_stations = ep_node['terminals'][0]['stations']
    assert term_stations[0]['name_ar'] == 'محطة الشجرة'
    assert term_stations[0]['sections'][0]['name_ar'] == 'قسم الشجرة'
