"""B6 — fee pricing is fail-closed in the requested currency."""
import pytest
from django.core.exceptions import ValidationError

from apps.finance.models import Currency, Fee, ServiceType
from apps.finance.services import fee_amount_for

pytestmark = pytest.mark.django_db


def _fee(**kw):
    defaults = dict(
        code='F2-T01', name_ar='اختبار', service_type=ServiceType.INSPECTION,
        effective_from='2026-01-01', amount_sdg=None, amount_usd=None,
    )
    defaults.update(kw)
    return Fee.objects.create(**defaults)


def test_sdg_only_raises_on_usd():
    f = _fee(amount_sdg=1000, amount_usd=None)
    with pytest.raises(ValidationError, match='no USD amount'):
        fee_amount_for(f, Currency.USD)


def test_sdg_only_returns_sdg():
    f = _fee(amount_sdg=1000, amount_usd=None)
    assert fee_amount_for(f, Currency.SDG) == 1000


def test_unsupported_currency():
    f = _fee(amount_sdg=1000, amount_usd=1)
    with pytest.raises(ValidationError, match='Unsupported currency'):
        fee_amount_for(f, 'EUR')
