import pytest
from django.contrib.auth import get_user_model

from apps.food_surveillance.models import (
    CorrectiveAction,
    FoodAlert,
    FoodEstablishment,
    FoodRecall,
    NonConformity,
)
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def entry_point():
    ms = MasterSector.objects.create(code='SEA', name_ar='البحري')
    state = State.objects.create(code='RS', name_ar='البحر الأحمر', sector=ms)
    return EntryPoint.objects.create(
        code='PSD', name_ar='بورتسودان', name_en='Port Sudan',
        kind=EntryPoint.Kind.SEAPORT, state=state,
    )


@pytest.fixture
def user():
    return User.objects.create_user(
        email='surv@nqp.gov.sd', password='StrongPass123!', full_name='موظف ترصد'
    )


def test_food_alert_auto_number(user):
    alert = FoodAlert.objects.create(
        title='زيادة أفلاتوكسين', reason=FoodAlert.AlertReason.LAB_TREND,
        risk_level='HIGH', raised_by=user,
    )
    assert alert.alert_number == f'SURV-ALERT-{alert.pk}'
    assert alert.status == FoodAlert.AlertStatus.NEW


def test_food_establishment(entry_point):
    est = FoodEstablishment.objects.create(
        name_ar='مصنع النيل للأغذية', establishment_type=FoodEstablishment.EstablishmentType.FACTORY,
        port=entry_point, region='البحر الأحمر',
    )
    assert est.pk is not None
    assert str(est) == 'مصنع النيل للأغذية'


def test_non_conformity_auto_number(user):
    nc = NonConformity.objects.create(
        source=NonConformity.NonConformitySource.IMPORT,
        product='قمح', reported_by=user,
    )
    assert nc.nc_number == f'NC-{nc.pk}'
    assert nc.status == NonConformity.NonConformityStatus.OPEN


def test_non_conformity_corrective_action(user):
    nc = NonConformity.objects.create(product='ذرة', reported_by=user)
    action = CorrectiveAction.objects.create(non_conformity=nc, action='سحب الشحنة', responsible='إدارة الفسح')
    assert action.status == CorrectiveAction.CorrectiveActionStatus.PLANNED
    assert str(action) == f'{nc.nc_number} - سحب الشحنة'


def test_food_recall_auto_number(user):
    recall = FoodRecall.objects.create(
        product='زبدة فول سوداني', recall_type=FoodRecall.RecallType.RECALL, decided_by=user
    )
    assert recall.recall_number == f'RCL-{recall.pk}'
    assert recall.status == FoodRecall.RecallStatus.DECIDED