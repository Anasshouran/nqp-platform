import pytest
from django.contrib.auth import get_user_model

from apps.chemistry.models import (
    ChemistryEquipment,
    ChemistryReagent,
    ChemistryTest,
    QCRecord,
)
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def traveler():
    country = Country.objects.create(code='SD', name='Sudan', name_ar='السودان')
    return Traveler.objects.create(
        passport_number='SD123456',
        first_name='أحمد',
        last_name='محمد',
        date_of_birth='1990-01-01',
        nationality=country,
    )


def test_chemistry_test_creation(traveler):
    test = ChemistryTest.objects.create(
        sample=traveler,
        product='ذرة',
        test_type=ChemistryTest.TestType.AFLATOXIN,
        result_value=1.5,
        unit='ppb',
        compliance_status='NON_COMPLIANT',
    )
    assert test.pk is not None
    assert test.status == ChemistryTest.Status.DRAFT
    assert str(test) == f'{traveler.passport_number} - أفلاتوكسين'


def test_chemistry_choices_labels():
    assert ChemistryTest.TestType.PESTICIDE.label == 'مبيدات'


def test_equipment_unique_serial(traveler):
    ChemistryEquipment.objects.create(
        name='مطياف', type='SPECTRO', serial_number='EQ-001'
    )
    with pytest.raises(Exception):
        ChemistryEquipment.objects.create(
            name='مطياف آخر', type='SPECTRO', serial_number='EQ-001'
        )


def test_reagent_creation():
    reagent = ChemistryReagent.objects.create(
        name='ميثانول', type='SOLVENT', lot_number='L-1',
        expiry_date='2027-12-31', quantity=2500,
        minimum_stock=500,
    )
    assert reagent.status == ChemistryReagent.Status.AVAILABLE
    assert str(reagent) == 'ميثانول (LOT: L-1)'


def test_qc_record_creation(traveler):
    analyst = User.objects.create_user(
        email='qc-analyst@nqp.gov.sd', password='StrongPass123!', full_name='محلل'
    )
    record = QCRecord.objects.create(
        sample=traveler,
        test_type='AFLATOXIN',
        control_sample='CS-01',
        performed_by=analyst,
    )
    assert record.status == QCRecord.QCStatus.PENDING