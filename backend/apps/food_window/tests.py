import pytest
from django.contrib.auth import get_user_model

from apps.food_window.models import ServiceWindow, WindowCommodity
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def entry_point():
    ms = MasterSector.objects.create(code='AIR', name_ar='الجوي')
    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=ms)
    return EntryPoint.objects.create(
        code='KRT', name_ar='مطار الخرطوم', kind=EntryPoint.Kind.AIRPORT, state=state
    )


def test_service_window(entry_point):
    window = ServiceWindow.objects.create(
        code='FSH-1', name_ar='نافذة الفسح', station=entry_point,
    )
    assert window.pk is not None
    assert window.window_type == ServiceWindow.WindowType.SINGLE
    assert str(window) == f'نافذة الفسح ({entry_point})'


def test_window_commodity(entry_point):
    window = ServiceWindow.objects.create(code='FSH-2', name_ar='نافذة الفسح 2', station=entry_point)
    commodity = WindowCommodity.objects.create(
        window=window, code='WHEAT', name_ar='قمح', name_en='Wheat'
    )
    assert commodity.pk is not None
    assert commodity in window.commodities.all()
    assert str(commodity) == 'قمح'


def test_commodity_window_related_name(entry_point):
    window = ServiceWindow.objects.create(code='FSH-3', name_ar='نافذة الفسح 3', station=entry_point)
    WindowCommodity.objects.create(window=window, code='MAIZE', name_ar='ذرة')
    assert window.commodities.count() == 1