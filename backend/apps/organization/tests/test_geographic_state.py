"""Tests for GeographicState model and seed_geographic_states command.

pytest style, matching the existing tests/ directory pattern.
Runs on the pytest test DB (test_nqp_db); does NOT touch nqp_db.
"""
import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction

from apps.organization.models import GeographicState

pytestmark = pytest.mark.django_db


# ---------- Model ----------

def test_str_returns_name_ar():
    g = GeographicState.objects.create(code='SD-KH', name_ar='الخرطوم', name_en='Khartoum', order=1)
    assert str(g) == 'الخرطوم'


def test_code_unique():
    GeographicState.objects.create(code='SD-KH', name_ar='أ', name_en='A', order=1)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            GeographicState.objects.create(code='SD-KH', name_ar='ب', name_en='B', order=2)


def test_ordering_by_order_then_name_ar():
    GeographicState.objects.create(code='SD-GZ', name_ar='الجزيرة', name_en='Gezira', order=1)
    GeographicState.objects.create(code='SD-KH', name_ar='الخرطوم', name_en='Khartoum', order=2)
    assert [g.code for g in GeographicState.objects.all()] == ['SD-GZ', 'SD-KH']


def test_region_nullable():
    g = GeographicState.objects.create(code='SD-KH', name_ar='خ', name_en='K', order=1)
    assert g.region is None


def test_uuid_pk_and_timestamps():
    g = GeographicState.objects.create(code='SD-KH', name_ar='خ', name_en='K', order=1)
    assert g.id is not None
    assert g.created_at is not None
    assert g.updated_at is not None


# ---------- Seed command ----------

@pytest.fixture
def clean_geo():
    GeographicState.objects.all().delete()
    yield
    GeographicState.objects.all().delete()


def test_seed_creates_18(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.count() == 18


def test_seed_idempotent(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.count() == 18


def test_seed_conflict_raises_and_does_not_write(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    GeographicState.objects.filter(code='SD-KH').update(name_ar='X')
    with pytest.raises(CommandError):
        call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.get(code='SD-KH').name_ar == 'X'


def test_seed_dry_run_rolls_back(clean_geo):
    call_command('seed_geographic_states', '--dry-run', verbosity=0)
    assert GeographicState.objects.count() == 0


def test_seed_kordofan_codes(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    codes = set(GeographicState.objects.filter(
        code__in=['SD-KN', 'SD-KS', 'SD-GK'],
    ).values_list('code', flat=True))
    assert codes == {'SD-KN', 'SD-KS', 'SD-GK'}


def test_seed_all_codes_prefixed_SD(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    for code in GeographicState.objects.values_list('code', flat=True):
        assert code.startswith('SD-'), code


def test_seed_unique_orders(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    orders = list(GeographicState.objects.values_list('order', flat=True))
    assert len(orders) == len(set(orders))
    assert set(orders) == set(range(1, 19))


def test_seed_region_null_after_seed(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.filter(region__isnull=False).count() == 0
