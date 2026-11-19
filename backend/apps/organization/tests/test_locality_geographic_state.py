"""Tests for the derived Locality.geographic_state property (B-4b).

The property is a read-time derivation from Sector.state_ids → State.geographic_state.
No DB field, no migration.
"""
import pytest

from apps.masterdata.models import Sector as MdSector
from apps.masterdata.models import State
from apps.organization.models import GeographicState, Locality, Sector

pytestmark = pytest.mark.django_db


@pytest.fixture
def org_sector(db):
    return Sector.objects.create(code='SEC_B4B_TEST', name_ar='قطاع اختبار')


@pytest.fixture
def md_sector(db):
    # State.sector is a required FK (apps/masterdata/models.py:33-35).
    return MdSector.objects.create(code='MDSEC_B4B_TEST', name_ar='نوع قطاع اختبار')


@pytest.fixture
def clean_localities(org_sector):
    Locality.objects.filter(code__startswith='LOC_B4B').delete()
    yield
    Locality.objects.filter(code__startswith='LOC_B4B').delete()


def _state(code, geo_code, md_sector):
    geo = GeographicState.objects.filter(code=geo_code).first()
    assert geo is not None, f'GeographicState {geo_code} missing (0013 not applied?)'
    return State.objects.create(
        code=code, name_ar=code, sector=md_sector, geographic_state=geo
    )


# ---------- no sector ----------

def test_no_sector_returns_none(clean_localities):
    # Locality.sector is NOT nullable (models.py:80-82), so an unsaved
    # instance is used to exercise the `sector_id` guard without an
    # IntegrityError. The guard makes no DB query.
    loc = Locality(code='LOC_B4B_NOSEC', name_ar='بلا قطاع')
    assert loc.sector_id is None
    assert loc.geographic_state is None


# ---------- sector with no linked states ----------

def test_sector_without_states_returns_none(clean_localities, org_sector):
    loc = Locality.objects.create(code='LOC_B4B_EMPTY', name_ar='قطاع فارغ', sector=org_sector)
    assert loc.geographic_state is None


# ---------- single linked state ----------

def test_single_state_linked_returns_geo(clean_localities, org_sector, md_sector):
    s = _state('B4B_ONE', 'SD-KH', md_sector)
    org_sector.state_ids.add(s)
    loc = Locality.objects.create(code='LOC_B4B_ONE', name_ar='حالة واحدة', sector=org_sector)
    assert loc.geographic_state is not None
    assert loc.geographic_state.code == 'SD-KH'


# ---------- multiple states, same geo (real-world Red Sea case) ----------

def test_multiple_states_same_geo_returns_it(clean_localities, org_sector, md_sector):
    s1 = _state('B4B_RED_A', 'SD-RS', md_sector)
    s2 = _state('B4B_RED_B', 'SD-RS', md_sector)
    s3 = _state('B4B_RED_C', 'SD-RS', md_sector)
    org_sector.state_ids.add(s1, s2, s3)
    loc = Locality.objects.create(code='LOC_B4B_RED', name_ar='البحر الأحمر', sector=org_sector)
    assert loc.geographic_state is not None
    assert loc.geographic_state.code == 'SD-RS'


# ---------- multiple states, conflict ----------

def test_multiple_states_conflict_returns_none(clean_localities, org_sector, md_sector):
    s1 = _state('B4B_CFL_A', 'SD-KH', md_sector)
    s2 = _state('B4B_CFL_B', 'SD-RS', md_sector)
    org_sector.state_ids.add(s1, s2)
    loc = Locality.objects.create(code='LOC_B4B_CFL', name_ar='تعارض', sector=org_sector)
    assert loc.geographic_state is None


# ---------- all states unlinked ----------

def test_all_states_unlinked_returns_none(clean_localities, org_sector, md_sector):
    s1 = State.objects.create(
        code='B4B_NUL_A', name_ar='أ', sector=md_sector, geographic_state=None
    )
    s2 = State.objects.create(
        code='B4B_NUL_B', name_ar='ب', sector=md_sector, geographic_state=None
    )
    org_sector.state_ids.add(s1, s2)
    loc = Locality.objects.create(code='LOC_B4B_NUL', name_ar='كلها غير مرتبطة', sector=org_sector)
    assert loc.geographic_state is None


# ---------- mixed linked/unlinked (lenient semantics) ----------

def test_some_linked_returns_common(clean_localities, org_sector, md_sector):
    s1 = _state('B4B_MIX_A', 'SD-KH', md_sector)
    s2 = State.objects.create(
        code='B4B_MIX_B', name_ar='ب', sector=md_sector, geographic_state=None
    )
    org_sector.state_ids.add(s1, s2)
    loc = Locality.objects.create(code='LOC_B4B_MIX', name_ar='مختلط', sector=org_sector)
    # lenient: unlinked State treated as "unknown", not "conflicting"
    assert loc.geographic_state is not None
    assert loc.geographic_state.code == 'SD-KH'
