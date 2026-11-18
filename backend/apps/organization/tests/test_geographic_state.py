"""Tests for GeographicState model and seed_geographic_states command.

NOTE (post-B-2a): migration 0013_seed_geographic_states now creates the 18
canonical rows in every migrated DB. Tests must therefore:
- use a non-canonical 'SD-T' prefix for test-created rows
- never touch canonical SD-* codes in cleanup
- restore canonical rows explicitly if a test mutates them
"""
import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction

from apps.organization.models import GeographicState

pytestmark = pytest.mark.django_db

TEST_PREFIX = 'SD-T'


@pytest.fixture
def clean_geo():
    """Delete test-created rows only; canonical SD-* rows (from 0013) stay."""
    GeographicState.objects.filter(code__startswith=TEST_PREFIX).delete()
    yield
    GeographicState.objects.filter(code__startswith=TEST_PREFIX).delete()


# ---------- Model ----------

def test_str_returns_name_ar(clean_geo):
    g = GeographicState.objects.create(
        code='SD-T01', name_ar='الخرطوم', name_en='Khartoum', order=9001,
    )
    assert str(g) == 'الخرطوم'


def test_code_unique(clean_geo):
    GeographicState.objects.create(code='SD-T01', name_ar='أ', name_en='A', order=9001)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            GeographicState.objects.create(code='SD-T01', name_ar='ب', name_en='B', order=9002)


def test_ordering_by_order_then_name_ar(clean_geo):
    GeographicState.objects.create(code='SD-T02', name_ar='الجزيرة', name_en='Gezira', order=9001)
    GeographicState.objects.create(code='SD-T01', name_ar='الخرطوم', name_en='Khartoum', order=9002)
    qs = GeographicState.objects.filter(code__startswith=TEST_PREFIX)
    assert [g.code for g in qs] == ['SD-T02', 'SD-T01']


def test_region_nullable(clean_geo):
    g = GeographicState.objects.create(code='SD-T01', name_ar='خ', name_en='K', order=9001)
    assert g.region is None


def test_uuid_pk_and_timestamps(clean_geo):
    g = GeographicState.objects.create(code='SD-T01', name_ar='خ', name_en='K', order=9001)
    assert g.id is not None
    assert g.created_at is not None
    assert g.updated_at is not None


# ---------- Seed migration (new, explicit) ----------

def test_seed_migration_created_18_canonical_rows():
    """0013_seed_geographic_states must materialize the 18 canonical rows."""
    assert GeographicState.objects.filter(code__startswith='SD-').exclude(
        code__startswith=TEST_PREFIX
    ).count() == 18
    canonical = set(GeographicState.objects.values_list('code', flat=True))
    assert {'SD-KH', 'SD-KN', 'SD-KS', 'SD-GK', 'SD-DE'} <= canonical


# ---------- Seed command ----------

def test_seed_creates_18(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.filter(code__startswith='SD-').exclude(
        code__startswith=TEST_PREFIX
    ).count() == 18


def test_seed_idempotent(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.filter(code__startswith='SD-').exclude(
        code__startswith=TEST_PREFIX
    ).count() == 18


def test_seed_conflict_raises_and_does_not_write(clean_geo):
    """Mutating a canonical row must trigger CommandError; canonical restored in finally."""
    try:
        GeographicState.objects.filter(code='SD-KH').update(name_ar='X')
        with pytest.raises(CommandError):
            call_command('seed_geographic_states', verbosity=0)
        # seed must NOT overwrite the mutated value
        assert GeographicState.objects.get(code='SD-KH').name_ar == 'X'
    finally:
        # Restore canonical row for downstream tests / --reuse-db
        GeographicState.objects.filter(code='SD-KH').update(
            name_ar='الخرطوم', name_en='Khartoum', order=1,
        )


def test_seed_dry_run_rolls_back(clean_geo):
    """--dry-run creates nothing new (relative, not absolute == 0)."""
    before = GeographicState.objects.filter(code__startswith='SD-').exclude(
        code__startswith=TEST_PREFIX
    ).count()
    call_command('seed_geographic_states', '--dry-run', verbosity=0)
    after = GeographicState.objects.filter(code__startswith='SD-').exclude(
        code__startswith=TEST_PREFIX
    ).count()
    assert before == after == 18


def test_seed_kordofan_codes(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    codes = set(GeographicState.objects.filter(
        code__in=['SD-KN', 'SD-KS', 'SD-GK'],
    ).values_list('code', flat=True))
    assert codes == {'SD-KN', 'SD-KS', 'SD-GK'}


def test_seed_all_codes_prefixed_SD(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    for code in GeographicState.objects.filter(
        code__startswith='SD-'
    ).exclude(code__startswith=TEST_PREFIX).values_list('code', flat=True):
        assert code.startswith('SD-'), code


def test_seed_unique_orders(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    orders = list(GeographicState.objects.filter(
        code__startswith='SD-'
    ).exclude(code__startswith=TEST_PREFIX).values_list('order', flat=True))
    assert len(orders) == len(set(orders))
    assert set(orders) == set(range(1, 19))


def test_seed_region_null_after_seed(clean_geo):
    call_command('seed_geographic_states', verbosity=0)
    assert GeographicState.objects.filter(region__isnull=False).count() == 0
