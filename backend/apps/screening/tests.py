import pytest
from django.contrib.auth import get_user_model

from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def traveler():
    country = Country.objects.create(code='SD', name='Sudan', name_ar='السودان')
    return Traveler.objects.create(
        passport_number='SD654321',
        first_name='علي',
        last_name='حسن',
        date_of_birth='1985-05-05',
        nationality=country,
    )


@pytest.fixture
def entry_point():
    ms = MasterSector.objects.create(code='AIR', name_ar='الجوي')
    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=ms)
    return EntryPoint.objects.create(
        code='KRT', name_ar='مطار الخرطوم', kind=EntryPoint.Kind.AIRPORT, state=state
    )


@pytest.fixture
def officer():
    return User.objects.create_user(
        email='screening@nqp.gov.sd', password='StrongPass123!', full_name='مفتش صحة'
    )


def test_health_screening(traveler, entry_point, officer):
    screening = HealthScreening.objects.create(
        traveler=traveler,
        port=entry_point,
        officer=officer,
        body_temperature=38.5,
        oxygen_saturation=95,
        observed_symptoms=['COUGH', 'FATIGUE'],
        officer_notes='فحص عادي',
    )
    assert screening.pk is not None
    assert screening.observed_symptoms == ['COUGH', 'FATIGUE']
    assert str(screening).startswith(str(traveler.id))


def test_screening_related_names(traveler, entry_point, officer):
    HealthScreening.objects.create(traveler=traveler, port=entry_point, officer=officer)
    assert traveler.screenings.count() == 1
    assert officer.screenings.count() == 1