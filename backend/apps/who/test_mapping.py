"""اختبارات WHOICDMapping — النموذج والخدمة والقيد والحوكمة القراءة-الآمنة."""

import pytest
from decimal import Decimal
from django.db import IntegrityError, migrations, transaction
from django.db.migrations.loader import MigrationLoader

from apps.laboratory.models import Disease
from apps.who.models import WHOICDMapping
from apps.who.services.mapping_service import create_mapping_proposal

pytestmark = pytest.mark.django_db


@pytest.fixture
def disease():
    return Disease.objects.create(
        icd_11_code='1A00',
        name_ar='كوليرا',
        name_en='Cholera',
        description='عدوى بكتيرية حادة.',
        ihr_category=Disease.IhrCategory.SURVEILLANCE_ONLY,
        is_active=True,
    )


def test_who_icd_mapping_creation(disease):
    mapping = WHOICDMapping.objects.create(
        disease=disease,
        who_release='2026-01',
        foundation_uri='https://id.who.int/icd/entity/257068234',
        mms_uri='https://id.who.int/icd/release/11/2026-01/mms/1A00',
        icd_11_code='1A00',
        title_en='Cholera',
        title_ar='كوليرا',
    )
    assert mapping.pk is not None
    assert mapping.created_at is not None
    assert mapping.updated_at is not None
    assert mapping.is_current is True
    assert mapping.mapping_status == WHOICDMapping.MappingStatus.PENDING
    assert mapping.confidence is None


def test_who_icd_mapping_disease_relationship(disease):
    mapping = create_mapping_proposal(disease, '2026-01')
    assert mapping.disease == disease
    assert disease.who_icd_mappings.count() == 1
    disease.delete()
    assert WHOICDMapping.objects.filter(id=mapping.id).count() == 0


def test_current_mapping_uniqueness_enforced(disease):
    create_mapping_proposal(disease, '2026-01', is_current=True)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            WHOICDMapping.objects.create(disease=disease, who_release='2026-01', is_current=True)


def test_multiple_historical_mappings_keep_single_current(disease):
    first = create_mapping_proposal(disease, '2026-01', icd_11_code='1D2Z', is_current=True)
    second = create_mapping_proposal(disease, '2026-01', icd_11_code='1C81', is_current=True)
    qs = WHOICDMapping.objects.filter(disease=disease, who_release='2026-01')
    assert qs.count() == 2
    assert qs.filter(is_current=True).count() == 1
    first.refresh_from_db()
    second.refresh_from_db()
    assert first.is_current is False
    assert second.is_current is True


def test_service_persists_proposal_fields(disease):
    mapping = create_mapping_proposal(
        disease,
        '2026-01',
        foundation_uri='https://id.who.int/icd/entity/257068234',
        mms_uri='https://id.who.int/icd/release/11/2026-01/mms/1A00',
        icd_11_code='1A00',
        title_en='Cholera',
        title_ar='كوليرا',
        match_type=WHOICDMapping.MatchType.EXACT,
        confidence='0.9876',
        source_query='Cholera',
        mapping_status=WHOICDMapping.MappingStatus.PROPOSED,
        notes='اقتراح آلي.',
    )
    mapping.refresh_from_db()
    assert mapping.match_type == WHOICDMapping.MatchType.EXACT
    assert mapping.confidence == Decimal('0.9876')
    assert mapping.source_query == 'Cholera'
    assert mapping.mapping_status == WHOICDMapping.MappingStatus.PROPOSED
    assert mapping.notes == 'اقتراح آلي.'
    assert mapping.reviewed_by is None
    assert mapping.reviewed_at is None


def test_service_never_auto_approves(disease):
    mapping = create_mapping_proposal(disease, '2026-01')
    mapping.refresh_from_db()
    assert mapping.mapping_status == WHOICDMapping.MappingStatus.PENDING


def test_existing_disease_records_unchanged(disease):
    snapshot = {
        'icd_11_code': disease.icd_11_code,
        'name_ar': disease.name_ar,
        'name_en': disease.name_en,
        'description': disease.description,
        'ihr_category': disease.ihr_category,
        'is_active': disease.is_active,
    }
    create_mapping_proposal(disease, '2026-01', icd_11_code='1D2Z', title_en='Other')
    create_mapping_proposal(disease, '2026-01', icd_11_code='1C81', title_en='Yet another')
    refreshed = Disease.objects.get(id=disease.id)
    for field, value in snapshot.items():
        assert getattr(refreshed, field) == value
        assert getattr(disease, field) == value


def test_mapping_migration_makes_no_external_calls():
    loader = MigrationLoader(None, ignore_no_migrations=True)
    latest_who = sorted(name for app, name in loader.disk_migrations if app == 'who')[-1]
    migration = loader.disk_migrations[('who', latest_who)]
    assert latest_who.startswith('0002')
    assert not any(isinstance(op, migrations.RunPython) for op in migration.operations)


@pytest.mark.parametrize(
    ('uri', 'release'),
    [
        ('https://id.who.int/icd/release/11/2026-01/mms/unspecified', '2026-01'),
        ('https://id.who.int/icd/entity/unspecified', '2026-02'),
    ],
)
def test_mms_uri_with_unspecified_is_accepted(disease, uri, release):
    mapping = WHOICDMapping.objects.create(
        disease=disease,
        who_release=release,
        mms_uri=uri,
        is_current=False,
    )
    mapping.refresh_from_db()
    assert mapping.mms_uri == uri


@pytest.mark.parametrize('code', ['1D2Z', '1C81', '1E30', '1B93.Z'])
def test_icd_codes_accepted(disease, code):
    mapping = WHOICDMapping.objects.create(
        disease=disease,
        who_release='2026-01',
        icd_11_code=code,
        is_current=False,
    )
    mapping.refresh_from_db()
    assert mapping.icd_11_code == code