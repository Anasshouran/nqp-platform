import pytest
from django.contrib.auth import get_user_model

from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.risk_engine.models import RiskAssessment, RiskSettings
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def screening():
    country = Country.objects.create(code='SD', name='Sudan', name_ar='السودان')
    traveler = Traveler.objects.create(
        passport_number='SD111222',
        first_name='فاطمة',
        last_name='نور',
        date_of_birth='1999-03-03',
        nationality=country,
    )
    officer = User.objects.create_user(
        email='risk-officer@nqp.gov.sd', password='StrongPass123!', full_name='مفتش'
    )
    ms = MasterSector.objects.create(code='SEA', name_ar='البحري')
    state = State.objects.create(code='RS', name_ar='البحر الأحمر', sector=ms)
    port = EntryPoint.objects.create(
        code='SZN', name_ar='ميناء سواكن', kind=EntryPoint.Kind.SEAPORT, state=state
    )
    return HealthScreening.objects.create(
        traveler=traveler, port=port, officer=officer, body_temperature=37.0
    )


def test_risk_settings_singleton():
    s1 = RiskSettings.get_settings()
    s2 = RiskSettings.get_settings()
    assert s1.pk == s2.pk
    assert RiskSettings.objects.count() == 1
    assert s1.yellow_threshold == 15.0
    assert s1.red_threshold == 30.0


def test_risk_assessment(screening):
    assessment = RiskAssessment.objects.create(
        screening=screening,
        risk_level=RiskAssessment.RiskLevel.GREEN,
        risk_score=5.0,
        decision_factors={'temp': 37.0},
        recommendation=RiskAssessment.Recommendation.ADMIT,
    )
    assert assessment.pk is not None
    assert screening.risk_assessment == assessment
    assert str(assessment).endswith('- GREEN')


def test_risk_assessment_one_to_one(screening):
    RiskAssessment.objects.create(
        screening=screening, risk_level='YELLOW', risk_score=20.0, recommendation='QUARANTINE'
    )
    with pytest.raises(Exception):
        RiskAssessment.objects.create(
            screening=screening, risk_level='RED', risk_score=40.0, recommendation='REFER'
        )