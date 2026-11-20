"""B6/vaccination — a missing USD quarantine-fee price is an error, not zero."""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.finance.models import Currency
from apps.finance.services import create_vaccination_invoice
from apps.food_quarantine.models import QuarantineFee

pytestmark = pytest.mark.django_db


def test_usd_requires_amount():
    user = get_user_model().objects.create_user(
        email='f2-vaccination@test.sd', password='Str0ngPass!23',
        full_name='F2 vaccination tester', is_staff=True, is_superuser=True,
    )
    QuarantineFee.objects.create(
        category=QuarantineFee.Category.VACCINATION,
        name_ar='لقاح اختبار',
        amount_sdg='1000',
        amount_usd=None,
        year=timezone.localdate().year,
        is_active=True,
    )

    with pytest.raises(ValidationError, match='USD price required'):
        create_vaccination_invoice(certificate=None, user=user, currency=Currency.USD)
